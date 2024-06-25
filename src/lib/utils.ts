import Decimal from "decimal.js";
import got from "got";
import { BN } from "@coral-xyz/anchor";
import { TokenInfo } from "@solana/spl-token-registry";

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
