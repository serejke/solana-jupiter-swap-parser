import { utils } from '@coral-xyz/anchor';

export function isValidSolanaSignature(signature: string): boolean {
  try {
    const decoded = utils.bytes.bs58.decode(signature);
    return decoded.length === 64;
  } catch (error) {
    return false;
  }
}