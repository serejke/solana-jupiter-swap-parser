import { Event, Program, Provider } from "@coral-xyz/anchor";
import { InstructionParser } from "./lib/instruction-parser";
import { getEvents } from "./lib/get-events";
import { AMM_TYPES, JUPITER_V6_PROGRAM_ID } from "./constants";
import { FeeEvent, SwapEvent, TransactionWithMeta } from "./types";
import { IDL, Jupiter } from "./idl/jupiter";
import {
  flattenInstructionsWithStackTracePaths,
  ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath
} from './transaction/instruction-stack-trace-path';
import { ParsedTransactionWithMeta } from '@solana/web3.js';

export { getTokenMap } from "./lib/utils";
export { TransactionWithMeta };

export const program = new Program<Jupiter>(
  IDL,
  JUPITER_V6_PROGRAM_ID,
  {} as Provider
);

const parser = new InstructionParser();

export type SwapAttributes = {
  // @deprecated use transferAuthority instead
  owner: string;
  transferAuthority: string;
  programId: string;
  signature: string;
  timestamp: Date;
  legCount: number;
  inAmount: BigInt;
  inMint: string;
  outAmount: BigInt;
  outMint: string;
  instruction: string;
  exactInAmount: BigInt;
  exactOutAmount: BigInt;
  swapData: JSON;
  feeTokenPubkey?: string;
  feeAmount?: BigInt;
  feeMint?: string;
  tokenLedger?: string;
  lastAccount: string; // This can be a tracking account since we don't have a way to know we just log it the last account.
};

const reduceEventData = <T>(events: Event[], name: string) =>
  events.reduce((acc, event) => {
    if (event.name === name) {
      acc.push(event.data as T);
    }
    return acc;
  }, new Array<T>());

export async function extract(
  signature: string,
  tx: ParsedTransactionWithMeta,
  blockTime?: number
): Promise<SwapAttributes[]> {
  const logMessages = tx.meta.logMessages;
  if (!logMessages) {
    throw new Error("Missing log messages...");
  }

  const swaps: SwapAttributes[] = [];

  const instructionsWithStackTracePaths = flattenInstructionsWithStackTracePaths(signature, tx);
  for (let instructionIndex = 0; instructionIndex < instructionsWithStackTracePaths.length; ) {
    const routingInstruction = instructionsWithStackTracePaths[instructionIndex];
    if (parser.isRoutingInstruction(routingInstruction)) {
      let nextInstructionIndex = instructionIndex + 1;
      while (nextInstructionIndex < instructionsWithStackTracePaths.length) {
        const nextInstruction = instructionsWithStackTracePaths[nextInstructionIndex];
        if (parser.isAnyNonEventJupiterInstruction(nextInstruction)) {
          // Next Jupiter swap boundary.
          break;
        }
        nextInstructionIndex++;
      }
      const relevantInstructions = instructionsWithStackTracePaths.slice(instructionIndex, nextInstructionIndex);
      instructionIndex = nextInstructionIndex;

      const swapAttributes = parse(signature, tx.transaction.message.accountKeys[0].pubkey.toBase58(), relevantInstructions, blockTime);
      swaps.push(swapAttributes);
      continue;
    }
    instructionIndex++;
  }
  return swaps;
}

function parse(
    signature: string,
    transactionSigner: string,
    allRelevantInstructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[],
    blockTime?: number,
): SwapAttributes | undefined {

  const events = getEvents(program, allRelevantInstructions);

  const swapEvents = reduceEventData<SwapEvent>(events, "SwapEvent");
  const feeEvent = reduceEventData<FeeEvent>(events, "FeeEvent")[0];

  if (swapEvents.length === 0) {
    // Not a swap event, for example: https://solscan.io/tx/5ZSozCHmAFmANaqyjRj614zxQY8HDXKyfAs2aAVjZaadS4DbDwVq8cTbxmM5m5VzDcfhysTSqZgKGV1j2A2Hqz1V
    return;
  }

  const swapData = parseSwapEvents(swapEvents);
  const [initialPositions, finalPositions] =
      parser.getInitialAndFinalSwapPositions(allRelevantInstructions);

  const inMint = swapData[initialPositions[0]].inMint;
  const inSwapData = swapData.filter(
      (swap, index) => initialPositions.includes(index) && swap.inMint === inMint
  );
  const inAmount = inSwapData.reduce((acc, curr) => {
    return acc + BigInt(curr.inAmount);
  }, BigInt(0));

  const outMint = swapData[finalPositions[0]].outMint;
  const outSwapData = swapData.filter(
      (swap, index) => finalPositions.includes(index) && swap.outMint === outMint
  );
  const outAmount = outSwapData.reduce((acc, curr) => {
    return acc + BigInt(curr.outAmount);
  }, BigInt(0));

  const swap = {} as SwapAttributes;

  const [instructionName, transferAuthority, lastAccount] =
      parser.getInstructionNameAndTransferAuthorityAndLastAccount(allRelevantInstructions);

  swap.transferAuthority = transferAuthority;
  swap.lastAccount = lastAccount;
  swap.instruction = instructionName;
  swap.owner = transactionSigner;
  swap.programId = JUPITER_V6_PROGRAM_ID.toBase58();
  swap.signature = signature;
  swap.timestamp = new Date(new Date((blockTime ?? 0) * 1000).toISOString());
  swap.legCount = swapEvents.length;

  swap.inAmount = inAmount;
  swap.inMint = inMint;

  swap.outAmount = outAmount;
  swap.outMint = outMint;

  const exactOutAmount = parser.getExactOutAmount(allRelevantInstructions);
  if (exactOutAmount) {
    swap.exactOutAmount = BigInt(exactOutAmount);
  }

  const exactInAmount = parser.getExactInAmount(allRelevantInstructions);
  if (exactInAmount) {
    swap.exactInAmount = BigInt(exactInAmount);
  }

  swap.swapData = JSON.parse(JSON.stringify(swapData));

  if (feeEvent) {
    swap.feeTokenPubkey = feeEvent.account.toBase58();
    swap.feeAmount = BigInt(feeEvent.amount.toString());
    swap.feeMint = feeEvent.mint.toBase58();
  }

  return swap;
}

function parseSwapEvents(
  swapEvents: SwapEvent[]
) {
  return swapEvents.map(extractSwapData);
}

function extractSwapData(
  swapEvent: SwapEvent
) {
  const amm = AMM_TYPES[swapEvent.amm.toBase58()];

  return {
    amm,
    inMint: swapEvent.inputMint.toBase58(),
    inAmount: swapEvent.inputAmount.toString(),
    outMint: swapEvent.outputMint.toBase58(),
    outAmount: swapEvent.outputAmount.toString(),
  };
}