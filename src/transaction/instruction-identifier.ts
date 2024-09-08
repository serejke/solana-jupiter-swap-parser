import {InstructionStackTracePath} from "./instruction-stack-trace-path";

/**
 * Returns a unique instruction identifier like `#5 (JUP6L)` that shows the index of the instruction in the transaction call stack.
 * It allows to distinguish between several similar instructions (two swaps) in one transaction.
  */
export function getInstructionIdentifierWithProgramIds(instructionStackTracePath: InstructionStackTracePath): string {
  return instructionStackTracePath.getInstructionIdentifier() +
    " (" + instructionStackTracePath.copyPath().map((p) => p.programId.toBase58().substring(0, 5)).join(".") + ")";
}