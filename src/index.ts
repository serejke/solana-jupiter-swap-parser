import { BN, Event, Program, Provider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { InstructionParser } from "./lib/instruction-parser";
import { getEvents } from "./lib/get-events";
import { AMM_TYPES, JUPITER_V6_PROGRAM_ID } from "./constants";
import { FeeEvent, SwapEvent, TransactionWithMeta } from "./types";
import { IDL, Jupiter } from "./idl/jupiter";

export { getTokenMap } from "./lib/utils";
export { TransactionWithMeta };

export const program = new Program<Jupiter>(
  IDL,
  JUPITER_V6_PROGRAM_ID,
  {} as Provider
);

export type SwapAttributes = {
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

// TODO: currently, this only parses the first swap instruction from a transaction, but in fact there may be multiple swaps,
//  Example transaction: https://solscan.io/tx/QzA6iW9wJvnWSFx1AB5imT6W5HBEfTXsrmAfk7JV5h13JLKtYeEyiuAQSvveJweewWEB26WfKULN7zE131J4RaY
export async function extract(
  signature: string,
  tx: TransactionWithMeta,
  blockTime?: number
): Promise<SwapAttributes | undefined> {
  const programId = JUPITER_V6_PROGRAM_ID;

  const logMessages = tx.meta.logMessages;
  if (!logMessages) {
    throw new Error("Missing log messages...");
  }

  const parser = new InstructionParser(programId);
  const events = getEvents(program, tx);

  const swapEvents = reduceEventData<SwapEvent>(events, "SwapEvent");
  const feeEvent = reduceEventData<FeeEvent>(events, "FeeEvent")[0];

  if (swapEvents.length === 0) {
    // Not a swap event, for example: https://solscan.io/tx/5ZSozCHmAFmANaqyjRj614zxQY8HDXKyfAs2aAVjZaadS4DbDwVq8cTbxmM5m5VzDcfhysTSqZgKGV1j2A2Hqz1V
    return;
  }

  const swapData = await parseSwapEvents(swapEvents);
  const instructions = parser.getInstructions(tx);
  const [initialPositions, finalPositions] =
    parser.getInitialAndFinalSwapPositions(instructions);

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
    parser.getInstructionNameAndTransferAuthorityAndLastAccount(instructions);

  swap.transferAuthority = transferAuthority;
  swap.lastAccount = lastAccount;
  swap.instruction = instructionName;
  swap.owner = tx.transaction.message.accountKeys[0].pubkey.toBase58();
  swap.programId = programId.toBase58();
  swap.signature = signature;
  swap.timestamp = new Date(new Date((blockTime ?? 0) * 1000).toISOString());
  swap.legCount = swapEvents.length;

  swap.inAmount = inAmount;
  swap.inMint = inMint;

  swap.outAmount = outAmount;
  swap.outMint = outMint;

  const exactOutAmount = parser.getExactOutAmount(instructions);
  if (exactOutAmount) {
    swap.exactOutAmount = BigInt(exactOutAmount);
  }

  const exactInAmount = parser.getExactInAmount(instructions);
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

async function parseSwapEvents(
  swapEvents: SwapEvent[]
) {
  return await Promise.all(
    swapEvents.map((swapEvent) =>
      extractSwapData(swapEvent)
    )
  );
}

async function extractSwapData(
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