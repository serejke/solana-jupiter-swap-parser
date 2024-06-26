import { extract, SwapAttributes } from './index';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { timedLog } from './timed-log';

export type SwapAttributesJsonFriendly = Omit<
  SwapAttributes,
  'inAmount' | 'outAmount' | 'exactInAmount' | 'exactOutAmount' | 'feeAmount' | 'timestamp'
> & {
  inAmount: string,
  outAmount: string,
  exactInAmount: string,
  exactOutAmount: string,
  feeAmount: string,
  timestamp: number,
  fee: number
}

export type ParsedSwapResult = { signature: string } & ({
  type: 'parsed',
  swaps: SwapAttributesJsonFriendly[]
} | {
  type: 'rpcError',
  error: string
} | {
  type: 'txNotFound',
} | {
  type: 'txFailedOnChain',
} | {
  type: 'noSwaps'
})

export async function fetchAndParseSwaps(
  connection: Connection,
  signature: string
): Promise<ParsedSwapResult> {
  const prefix = `Parsing swap for ${signature}`;
  timedLog(`${prefix}: starting`)
  let tx: ParsedTransactionWithMeta;
  try {
    tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });
  } catch (error) {
    const errorMessage = error.toString() ?? '';
    timedLog(`${prefix}: RPC error ${errorMessage}`);
    return {
      type: 'rpcError',
      signature,
      error: errorMessage,
    };
  }
  timedLog(`${prefix}: received the RPC response`)

  if (!tx) {
    timedLog(`${prefix}: tx not found`)
    return {
      type: 'txNotFound',
      signature
    }
  }

  if (tx.meta.err) {
    timedLog(`${prefix}: tx failed on chain`)
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

  timedLog(`${prefix}: parsed`);

  const fee = tx.meta.fee;

  const swapJsonFriendly: SwapAttributesJsonFriendly = {
    ...swap,
    inAmount: swap.inAmount.toString(),
    outAmount: swap.outAmount.toString(),
    exactInAmount: swap.exactInAmount?.toString(),
    exactOutAmount: swap.exactOutAmount?.toString(),
    feeAmount: swap.feeAmount?.toString(),
    timestamp: swap.timestamp.getTime() / 1000,
    fee: fee
  }

  return {
    type: 'parsed',
    swaps: [swapJsonFriendly],
    signature
  }
}