# Express server to parse Solana Jupiter V6 Swaps

Original repository https://github.com/jup-ag/instruction-parser.

Express server with endpoints
- `GET http://localhost:3000/parse-jupiter-swaps?signature=4KHPmpbkv28HfhzR1gM1szgtpqg2CLhQo4eo1tD8qctWE4ULYw7fPKuNWPwJjszdq3qin526dC3iYBhcYbragwou`
- `POST http://localhost:3000/parse-jupiter-swaps-from-transaction`

Returning the following output
```json
{
  "type": "parsed",
  "swaps": [
    {
      "transferAuthority": "2N9io9YyWirVHGddTSos7a5Z2Fa9hWcnngVXctZ8Gedo",
      "lastAccount": "2N9io9YyWirVHGddTSos7a5Z2Fa9hWcnngVXctZ8Gedo",
      "instruction": "route",
      "owner": "2N9io9YyWirVHGddTSos7a5Z2Fa9hWcnngVXctZ8Gedo",
      "programId": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
      "signature": "4KHPmpbkv28HfhzR1gM1szgtpqg2CLhQo4eo1tD8qctWE4ULYw7fPKuNWPwJjszdq3qin526dC3iYBhcYbragwou",
      "timestamp": 1718975806,
      "legCount": 1,
      "inAmount": "10000000",
      "inMint": "So11111111111111111111111111111111111111112",
      "outAmount": "1449869193",
      "outMint": "KnekM3v5WsqvJ6NdZLPvEBeueBMH8iNfWBcHi8r1KGA",
      "exactOutAmount": "1450457633",
      "swapData": [
        {
          "amm": "Raydium",
          "inMint": "So11111111111111111111111111111111111111112",
          "inAmount": "10000000",
          "outMint": "KnekM3v5WsqvJ6NdZLPvEBeueBMH8iNfWBcHi8r1KGA",
          "outAmount": "1449869193"
        }
      ]
    }
  ],
  "fee": 755000,
  "signature": "4KHPmpbkv28HfhzR1gM1szgtpqg2CLhQo4eo1tD8qctWE4ULYw7fPKuNWPwJjszdq3qin526dC3iYBhcYbragwou"
}
```

### Errors
In case the signature cannot be parsed into Jupiter swaps, there are different errors (all with HTTP 200 return code).

#### RPC Error
```json
{
  "type": "rpcError",
  "error": "error messages"
}
```

#### Transaction is not found
```json
{
  "type": "txNotFound"
}
```

#### The Transaction is found in a block, but it failed to execute
```json
{
  "type": "txFailedOnChain"
}
```

#### The Transaction does not have any swaps
```json
{
  "type": "noSwaps"
}
```

### How to start
```shell
yarn build

yarn start-server
```

### Docker
```shell
docker build -t jupiter-swap-parser .

docker run -p 3000:3000 -e NODE_URL="https://api.mainnet-beta.solana.com" jupiter-swap-parser
```