import { ParsedInstruction, ParsedTransactionWithMeta, PartiallyDecodedInstruction, PublicKey } from '@solana/web3.js';
import {getSignature} from "../utils/signature-utils";

export class InstructionStackTracePath {
  constructor(
    private readonly path: InstructionStackTracePathElement[]
  ) {
    if (path.length === 0) {
      throw new Error("Path cannot be empty");
    }
  }

  getTopLevelProgramId() {
    return this.path[0].programId
  }

  getTopLevelInstructionIndex(): number {
    return this.path[0].index;
  }

  getProgramId(): PublicKey {
    return this.path[this.path.length - 1].programId;
  }

  getParentProgramId(): PublicKey | undefined {
    return this.path.length > 1 ? this.path[this.path.length - 2].programId : undefined;
  }

  getStackDepth(): number {
    return this.path.length;
  }

  copyPath(): InstructionStackTracePathElement[] {
    return this.path.map((path) => ({
      programId: path.programId,
      index: path.index
    }))
  }

  createNextSibling(programId: PublicKey) {
    const siblingPath = this.copyPath();
    siblingPath[siblingPath.length - 1].programId = programId;
    siblingPath[siblingPath.length - 1].index++;
    return new InstructionStackTracePath(siblingPath);
  }

  createChild(programId: PublicKey, index: number) {
    return new InstructionStackTracePath([...this.copyPath(), { programId, index }])
  }

  equals(other: InstructionStackTracePath) {
    if (this.path.length !== other.path.length) {
      return false;
    }
    for (let index = 0; index < this.path.length; index++) {
      const pe = this.path[index];
      const otherPe = other.path[index];
      if (pe.index !== otherPe.index) {
        return false;
      }
      if (!pe.programId.equals(otherPe.programId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * #3.4.5 means top level instruction number 3 calls an inner instruction 4 that calls an inner instruction number 5.
   *
   * Instruction numbers are +1 to the index in the array, and they match the numbers on explorers.
   */
  getInstructionIdentifier(): string {
    return "#" + this.path.map((p) => (p.index + 1)).join(".");
  }

  toString(): string {
    if (this.path.length === 1) {
      return `#${this.getTopLevelInstructionIndex() + 1} (${this.getTopLevelProgramId().toBase58()})`;
    }
    return this.path
      .map((p) => `#${p.index + 1} (${p.programId.toBase58()})`)
      .join(" -> ");
  }
}

export type InstructionStackTracePathElement = {
  programId: PublicKey,
  index: number
};

export type ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath =
  ParsedInstructionWithStackTracePath | PartiallyDecodedInstructionWithStackTracePath;

export type ParsedInstructionWithStackTracePath =
  { instructionStackTracePath: InstructionStackTracePath }
  & ParsedInstruction;

export type PartiallyDecodedInstructionWithStackTracePath =
  { instructionStackTracePath: InstructionStackTracePath }
  & PartiallyDecodedInstruction;

/**
 * The standard Solana JSON RPC does not mention the "stackHeight" field but in fact it is present in all RPC responses.
 */
function getInstructionStackHeight(signature: string, innerInstruction: ParsedInstruction | PartiallyDecodedInstruction) {
  const stackHeight = (innerInstruction as any).stackHeight;
  if (stackHeight === undefined) {
    throw new Error(`Parsed instruction of transaction ${signature} does not have 'stackHeight' field`);
  }
  return stackHeight as number;
}

/**
 * Flattens all top level instructions and all inner instructions into a single array,
 * and preserves the `InstructionStackTracePath` for each instruction to identify its
 * location in the transaction stack trace.
 */
export function flattenInstructionsWithStackTracePaths(transaction: ParsedTransactionWithMeta): ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[] {
  const signature = getSignature(transaction);
  const parsedInstructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[] = [];

  const topLevelInstructions = transaction.transaction.message.instructions;
  for (const [topLevelInstructionIndex, topLevelInstruction] of topLevelInstructions.entries()) {
    const topLevelProgramId = topLevelInstruction.programId;

    // Add the top level instruction itself.
    parsedInstructions.push({
      ...topLevelInstruction,
      instructionStackTracePath: new InstructionStackTracePath([
        {
          programId: topLevelProgramId,
          index: topLevelInstructionIndex
        }
      ])
    })

    const allInnerInstructionsOfThisTopLevelInstruction = (transaction.meta.innerInstructions ?? [])
      .filter((inner) => inner.index === topLevelInstructionIndex)
      .flatMap((inner) => inner.instructions);

    const stack: (InstructionStackTracePathElement & { nextChildIndex: number })[] = [];
    stack.push({ programId: topLevelProgramId, index: topLevelInstructionIndex, nextChildIndex: 0 })

    for (const innerInstruction of allInnerInstructionsOfThisTopLevelInstruction) {
      const stackHeight = getInstructionStackHeight(signature, innerInstruction);
      if (stackHeight <= 1) {
        throw new Error( `Transaction ${signature}: Invalid inner instruction stack height ${stackHeight}`);
      }
      if (stackHeight > stack.length + 1) {
        throw new Error(`Transaction ${signature}: Invalid stack height jump from ${stack.length} to ${stackHeight}`);
      }
      while (stack.length >= stackHeight) {
        stack.pop();
      }

      let innerInstructionIndex = 0;
      if (stack.length > 0) {
        innerInstructionIndex = stack[stack.length - 1].nextChildIndex++
      }
      stack.push({ programId: innerInstruction.programId, index: innerInstructionIndex, nextChildIndex: 0 });
      parsedInstructions.push({
        ...innerInstruction,
        instructionStackTracePath: new InstructionStackTracePath(stack.map(({ index, programId }) => ({
          programId,
          index
        })))
      });
    }
  }

  return parsedInstructions;
}