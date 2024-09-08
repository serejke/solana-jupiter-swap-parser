import { utils } from '@coral-xyz/anchor';
import {ParsedTransactionWithMeta} from "@solana/web3.js";

export function isValidSolanaSignature(signature: string): boolean {
  try {
    const decoded = utils.bytes.bs58.decode(signature);
    return decoded.length === 64;
  } catch (error) {
    return false;
  }
}

export function getSignature(transaction: ParsedTransactionWithMeta) {
  return transaction.transaction.signatures[0];
}