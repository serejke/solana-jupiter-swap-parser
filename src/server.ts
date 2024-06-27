import dotenv from 'dotenv';
import express from 'express';
import { Connection, ParsedTransactionWithMeta } from '@solana/web3.js';
import { fetchAndParseSwaps } from './logic/fetch-and-parse-swaps';
import { parseJupiterSwaps } from './logic/parse-jupiter-swaps';
import { isValidSolanaSignature } from './utils/signature-utils';
import { parsedTransactionBody } from './api/parsed-transaction-body';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const nodeUrl = process.env.NODE_URL;
if (!nodeUrl) {
  console.error('NODE_URL env is not set');
  process.exit(1);
}
const connection = new Connection(nodeUrl);

app.get('/parse-jupiter-swaps', async (req, res) => {
  const { signature } = req.query;

  if (typeof signature !== 'string') {
    res.status(400).json({ error: 'Invalid signature parameter' });
    return;
  }

  if (!isValidSolanaSignature(signature)) {
    res.status(400).json({ error: 'Invalid Solana transaction signature' });
    return;
  }

  try {
    const result = await fetchAndParseSwaps(signature, connection);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/parse-jupiter-swaps-from-transaction', async (req, res) => {
  const transaction: ParsedTransactionWithMeta = parsedTransactionBody(req.body);

  const signature = transaction.transaction.signatures[0];
  try {
    const result = await parseJupiterSwaps(signature, transaction);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
