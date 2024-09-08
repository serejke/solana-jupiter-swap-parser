import { Connection } from "@solana/web3.js";
import { Command } from "commander";
import { extract } from ".";
import * as fs from "node:fs";
import * as path from "node:path";

const program = new Command();

// Existing lookup-tx command (unchanged)
program
  .command("lookup-tx")
  .requiredOption("-s, --signature <signature>")
  .requiredOption("-r, --rpc <rpc>")
  .addHelpText(
    "beforeAll",
    "Look up a Jupiter v6 swap transaction and extract its information"
  )
  .action(async ({ signature, rpc }) => {
    const connection = new Connection(rpc); // Use your own RPC endpoint here.
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (tx.meta?.err) {
      console.log("Failed transaction", tx.meta.err);
    }

    const result = await extract(signature, tx, tx.blockTime);

    console.log(result);
  });

// Updated "real-test" command
program
  .command("real-test-compare")
  .requiredOption("-r, --rpc <rpc>", "RPC endpoint")
  .requiredOption("-d, --results-dir <resultsDir>", "Directory to save results")
  .requiredOption("-p, --previous-results-dir <previousResultsDir>", "Directory with previous result signatures")
  .addHelpText(
    "beforeAll",
    "Process transactions from previous result files, extract information, and save to JSON files"
  )
  .action(async ({ rpc, resultsDir, previousResultsDir }) => {
    // Make sure JSON.stringify works with BigInt
    BigInt.prototype["toJSON"] = function () {
      return this.toString();
    };

    const BATCH_SIZE = 30; // Number of transactions to process in each batch

    const connection = new Connection(rpc);

    // Ensure the results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    // List all <signature>.json files from the previous results directory
    const signatureFiles = fs.readdirSync(previousResultsDir).filter(file => file.endsWith('.json'));

    if (signatureFiles.length === 0) {
      console.error("No signature files found in the previous-results-dir");
      return;
    }

    const signatures = signatureFiles.map(file => path.basename(file, '.json'));

    // Process the transactions in batches
    for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
      const batch = signatures.slice(i, i + BATCH_SIZE);
      const startTime = performance.now();

      await Promise.all(
        batch.map(async (signature) => {
          try {
            const tx = await connection.getParsedTransaction(signature, {
              maxSupportedTransactionVersion: 0,
            });

            if (!tx || tx.meta?.err) {
              console.log(`Skipping failed or missing transaction: ${signature}`);
              return;
            }

            // Call the extract function
            const result = await extract(signature, tx, tx.blockTime);

            // Save the result to a JSON file
            const resultFilePath = path.join(resultsDir, `${signature}.json`);
            fs.writeFileSync(resultFilePath, JSON.stringify(result, null, 2));

            console.log(`Saved result for ${signature}`);
          } catch (err) {
            console.error(`Error processing transaction ${signature}:`, err);
          }
        })
      );

      const elapsed = performance.now() - startTime;
      const toSleep = Math.max(0, 1000 - elapsed);
      await new Promise((resolve) => setTimeout(resolve, toSleep));
    }

    console.log("Batch processing complete");
  });

program.parse();
