import { ParsedTransactionWithMeta } from '@solana/web3.js';
import { ParsedSwapResult, SwapAttributesJsonFriendly } from '../api/types';
import { timedLog } from '../utils/timed-log';
import { extract } from '../index';

export async function parseJupiterSwaps(
  signature: string,
  tx: ParsedTransactionWithMeta
): Promise<ParsedSwapResult> {
  if (tx.meta.err) {
    timedLog(`[${signature}]: tx failed on chain`)
    return {
      type: 'txFailedOnChain',
      signature
    }
  }

  const swap = await extract(
    signature,
    tx,
    tx.blockTime
  );

  if (!swap) {
    return {
      type: 'noSwaps',
      signature
    }
  }

  timedLog(`[${signature}]: parsed`);

  const fee = tx.meta.fee;

  const swapJsonFriendly: SwapAttributesJsonFriendly = {
    ...swap,
    inAmount: swap.inAmount.toString(),
    outAmount: swap.outAmount.toString(),
    exactInAmount: swap.exactInAmount?.toString(),
    exactOutAmount: swap.exactOutAmount?.toString(),
    feeAmount: swap.feeAmount?.toString(),
    timestamp: swap.timestamp.getTime() / 1000,
  }

  return {
    type: 'parsed',
    swaps: [swapJsonFriendly],
    signature,
    fee
  }
}