import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { parseJupiterSwaps } from './parse-jupiter-swaps';
import { FetchedAndParsedSwapResult, ParsedSwapResult } from '../api/types';
import { timedLog } from '../utils/timed-log';

export async function fetchAndParseSwaps(
  signature: string,
  connection: Connection
): Promise<FetchedAndParsedSwapResult> {
  const prefix = `Processing ${signature}`;
  timedLog(`${prefix}: fetching the swap`)
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

  return await parseJupiterSwaps(signature, tx);
}