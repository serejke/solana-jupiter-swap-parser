import { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';

/**
 * This code parses all instances of serialized public key strings in the transaction structure
 * and creates the `PublicKey` objects.
 */
export function parsedTransactionBody(_body: any): ParsedTransactionWithMeta {
  const body: ParsedTransactionWithMeta = _body

  const message = body.transaction?.message;

  if (message) {
    const addressTableLookups = message.addressTableLookups;
    if (addressTableLookups) {
      for (const addressTableLookup of addressTableLookups) {
        addressTableLookup.accountKey = new PublicKey(addressTableLookup.accountKey)
      }
    }

    const accountKeys = message.accountKeys;
    if (accountKeys) {
      for (const accountKey of accountKeys) {
        accountKey.pubkey = new PublicKey(accountKey.pubkey);
      }
    }

    const instructions = message.instructions;
    if (instructions) {
      parseInstructions(instructions);
    }
  }

  const meta = body.meta;
  if (meta) {
    const innerInstructions = meta.innerInstructions;
    if (innerInstructions) {
      for (const innerInstruction of innerInstructions) {
        const instructions = innerInstruction.instructions;
        parseInstructions(instructions);
      }
    }

    const loadedAddresses = meta.loadedAddresses;
    if (loadedAddresses) {
      for (let i = 0; i < loadedAddresses.readonly.length; i++) {
        loadedAddresses.readonly[i] = new PublicKey(loadedAddresses.readonly[i]);
      }

      for (let i = 0; i < loadedAddresses.writable.length; i++) {
        loadedAddresses.writable[i] = new PublicKey(loadedAddresses.writable[i]);
      }
    }
  }

  return body;
}

function parseInstructions(instructions: (ParsedInstruction | PartiallyDecodedInstruction)[]) {
  for (const instruction of instructions) {
    instruction.programId = new PublicKey(instruction.programId);

    if ("accounts" in instruction && instruction.accounts) {
      for (let i = 0; i < instruction.accounts.length; i++) {
        instruction.accounts[i] = new PublicKey(instruction.accounts[i]);
      }
    }
  }
}
