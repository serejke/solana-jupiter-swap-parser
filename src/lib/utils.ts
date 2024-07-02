import Decimal from "decimal.js";
import got from "got";
import { BN } from "@coral-xyz/anchor";
import { TokenInfo } from "@solana/spl-token-registry";
import { ParsedInstruction } from "@solana/web3.js";
import { PartialInstruction, Swap } from "../types";
import {
  AMM_TYPES,
  SWAP_DIRECTION_ARGS,
  STACK_HEIGHT,
  TRANSFER_INSTRUCTION_TYPES,
} from "../constants";
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

// Caches for Price API
export class DecimalUtil {
  public static fromBigInt(input: BigInt, shift = 0): Decimal {
    return new Decimal(input.toString()).div(new Decimal(10).pow(shift));
  }

  public static fromBN(input: BN, shift = 0): Decimal {
    return new Decimal(input.toString()).div(new Decimal(10).pow(shift));
  }
}

export async function getTokenMap(): Promise<Map<string, TokenInfo>> {
  const tokenMap = new Map();

  const tokenList = await got("https://cache.jup.ag/tokens").json<
    Array<TokenInfo>
  >();
  tokenList.forEach((item) => {
    tokenMap.set(item.address, item);
  });

  const unknownTokenList = await got(
    "https://cache.jup.ag/unknown-tokens"
  ).json<Array<TokenInfo>>();
  unknownTokenList.forEach((item) => {
    tokenMap.set(item.address, item);
  });

  return tokenMap;
}

export function isSwapInstruction(
  instruction: ParsedInstruction | PartialInstruction
) {
  return (
    instruction.programId.toBase58() in AMM_TYPES &&
    (instruction as any).stackHeight === STACK_HEIGHT.SWAP
  );
}

export function isTransferInstruction(instruction: ParsedInstruction) {
  if (
    instruction.programId.equals(TOKEN_PROGRAM_ID) ||
    instruction.programId.equals(TOKEN_2022_PROGRAM_ID)
  ) {
    const ixType = instruction.parsed.type;
    const ixstackHeight = (instruction as any).stackHeight;
    if (
      TRANSFER_INSTRUCTION_TYPES.has(ixType) &&
      ixstackHeight >= STACK_HEIGHT.TOKEN_TRANSFER // Greater than is added to handle cases where token transfers happen in deposit and withdraw functions
    )
      return ixType;
  }
  return null;
}

export function isFeeInstruction(
  instruction: ParsedInstruction,
  feeAccount: string,
  destination: string
) {
  const ixType = instruction.parsed.type;
  const stackHeight = (instruction as any).stackHeight;
  return (
    (ixType === "transfer" || ixType === "transferChecked") &&
    stackHeight === STACK_HEIGHT.FEE &&
    feeAccount === destination
  );
}

export function getSwapDirection(amm: string, swap: Swap) {
  if (SWAP_DIRECTION_ARGS.SIDE.includes(amm))
    return !Object.values(swap)[0]["side"]["bid"];

  if (SWAP_DIRECTION_ARGS.A_TO_B.includes(amm))
    return Object.values(swap)[0]["aToB"];

  if (SWAP_DIRECTION_ARGS.X_TO_Y.includes(amm)) {
    return Object.values(swap)[0]["xToY"];
  }

  if (SWAP_DIRECTION_ARGS.QUANTITY_IS_COLLATERAL.includes(amm)) {
    return Object.values(swap)[0]["quantityIsCollateral"];
  }

  return true;
}
