#!/bin/sh

export NODE_RPC="https://api.mainnet-beta.solana.com"
export SIGNATURE="oBUe6ar6aSMhSd2ZfezHBgMAXf3hKFLSBMr9H7RUgqxREuBAJUT6shtwYKc7kTGHcrZsNqF62jUXgnCceJXL4wo"

curl -s -X POST "$NODE_RPC" \
-H "Content-Type: application/json" \
-d '{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "getTransaction",
  "params": [
    "'"$SIGNATURE"'",
    {
      "encoding": "jsonParsed",
      "maxSupportedTransactionVersion": 0,
      "commitment": "confirmed"
    }
  ]
}' | jq '.result' | curl -s -X POST http://localhost:3000/parse-jupiter-swaps-from-transaction \
-H "Content-Type: application/json" \
-d @- | jq > output.json
