import dotenv from 'dotenv';
import express from 'express';
import { Connection } from '@solana/web3.js';
import { fetchAndParseSwaps } from './fetch-and-parse-swaps';
import { isValidSolanaSignature } from './utils';

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
    const result = await fetchAndParseSwaps(connection, signature);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
