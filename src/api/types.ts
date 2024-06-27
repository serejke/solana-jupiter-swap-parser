import { SwapAttributes } from '../index';

export type SwapAttributesJsonFriendly = Omit<
  SwapAttributes,
  'inAmount' | 'outAmount' | 'exactInAmount' | 'exactOutAmount' | 'feeAmount' | 'timestamp'
> & {
  inAmount: string,
  outAmount: string,
  exactInAmount: string,
  exactOutAmount: string,
  feeAmount: string,
  timestamp: number
}

export type FetchedAndParsedSwapResult = { signature: string } & ({
  type: 'rpcError',
  error: string
} | {
  type: 'txNotFound',
} | ParsedSwapResult)

export type ParsedSwapResult = { signature: string } & ({
  type: 'parsed',
  swaps: SwapAttributesJsonFriendly[],
  fee: number
} | {
  type: 'txFailedOnChain',
} | {
  type: 'noSwaps'
})