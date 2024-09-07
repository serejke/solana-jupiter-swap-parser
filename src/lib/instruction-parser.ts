import { BorshCoder } from "@coral-xyz/anchor";
import { IDL } from "../idl/jupiter";
import { RoutePlan } from "../types";
import {
  ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath
} from '../transaction/instruction-stack-trace-path';
import { JUPITER_V6_PROGRAM_ID } from '../constants';

export class InstructionParser {
  private readonly coder: BorshCoder;

  constructor() {
    this.coder = new BorshCoder(IDL);
  }

  isRoutingInstruction(
      instruction: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath
  ): boolean {
    if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
      return false;
    }
    if (!("data" in instruction)) return false; // Guard in case it is a parsed decoded instruction
    const ix = this.coder.instruction.decode(instruction.data, "base58");
    return ix && this.isRouting(ix.name);
  }

  isAnyNonEventJupiterInstruction(
      instruction: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath
  ): boolean {
    if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
      return false;
    }
    const parentProgramId = instruction.instructionStackTracePath.getParentProgramId();
    return parentProgramId === undefined || !parentProgramId.equals(JUPITER_V6_PROGRAM_ID);
  }



  getInstructionNameAndTransferAuthorityAndLastAccount(
    instructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[]
  ) {
    for (const instruction of instructions) {
      if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
        continue;
      }
      if (!("data" in instruction)) return; // Guard in case it is a parsed decoded instruction

      const ix = this.coder.instruction.decode(instruction.data, "base58");

      if (this.isRouting(ix.name)) {
        const instructionName = ix.name;
        const transferAuthority =
          instruction.accounts[
            this.getTransferAuthorityIndex(instructionName)
          ].toString();
        const lastAccount =
          instruction.accounts[instruction.accounts.length - 1].toString();

        return [ix.name, transferAuthority, lastAccount];
      }
    }

    return [];
  }

  getTransferAuthorityIndex(instructionName: string) {
    switch (instructionName) {
      case "route":
      case "exactOutRoute":
      case "routeWithTokenLedger":
        return 1;
      case "sharedAccountsRoute":
      case "sharedAccountsRouteWithTokenLedger":
      case "sharedAccountsExactOutRoute":
        return 2;
    }
  }

  // Extract the position of the initial and final swap from the swap array.
  getInitialAndFinalSwapPositions(instructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[]) {
    for (const instruction of instructions) {
      if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
        continue;
      }
      if (!("data" in instruction)) continue;

      const ix = this.coder.instruction.decode(instruction.data, "base58");
      // This will happen because now event is also an CPI instruction.
      if (!ix) {
        continue;
      }

      if (this.isRouting(ix.name)) {
        const routePlan = (ix.data as any).routePlan as RoutePlan;
        const inputIndex = 0;
        const outputIndex = routePlan.length;

        const initialPositions: number[] = [];
        for (let j = 0; j < routePlan.length; j++) {
          if (routePlan[j].inputIndex === inputIndex) {
            initialPositions.push(j);
          }
        }

        const finalPositions: number[] = [];
        for (let j = 0; j < routePlan.length; j++) {
          if (routePlan[j].outputIndex === outputIndex) {
            finalPositions.push(j);
          }
        }

        if (
          finalPositions.length === 0 &&
          this.isCircular((ix.data as any).routePlan)
        ) {
          for (let j = 0; j < (ix.data as any).routePlan.length; j++) {
            if ((ix.data as any).routePlan[j].outputIndex === 0) {
              finalPositions.push(j);
            }
          }
        }

        return [initialPositions, finalPositions];
      }
    }
  }

  getExactOutAmount(instructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[]) {
    for (const instruction of instructions) {
      if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
        continue;
      }
      if (!("data" in instruction)) continue; // Guard in case it is a parsed decoded instruction, should be impossible

      const ix = this.coder.instruction.decode(instruction.data, "base58");

      if (ix && this.isExactIn(ix.name)) {
        return (ix.data as any).quotedOutAmount.toString();
      }
    }

    return;
  }

  getExactInAmount(instructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[]) {
    for (const instruction of instructions) {
      if (!instruction.programId.equals(JUPITER_V6_PROGRAM_ID)) {
        continue;
      }
      if (!("data" in instruction)) continue; // Guard in case it is a parsed decoded instruction, should be impossible

      const ix = this.coder.instruction.decode(instruction.data, "base58");

      if (ix && this.isExactOut(ix.name)) {
        return (ix.data as any).quotedInAmount.toString();
      }
    }

    return;
  }

  isExactIn(name: string) {
    return (
      name === "route" ||
      name === "routeWithTokenLedger" ||
      name === "sharedAccountsRoute" ||
      name === "sharedAccountsRouteWithTokenLedger"
    );
  }

  isExactOut(name: string) {
    return name === "sharedAccountsExactOutRoute" || name === "exactOutRoute";
  }

  isRouting(name: string) {
    return (
      name === "route" ||
      name === "routeWithTokenLedger" ||
      name === "sharedAccountsRoute" ||
      name === "sharedAccountsRouteWithTokenLedger" ||
      name === "sharedAccountsExactOutRoute" ||
      name === "exactOutRoute"
    );
  }

  isCircular(routePlan: RoutePlan) {
    if (!routePlan || routePlan.length === 0) {
      return false; // Empty or null array is not circular
    }

    const indexMap = new Map(
      routePlan.map((obj) => [obj.inputIndex, obj.outputIndex])
    );
    let visited = new Set();
    let currentIndex = routePlan[0].inputIndex; // Start from the first object's inputIndex

    while (true) {
      if (visited.has(currentIndex)) {
        return currentIndex === routePlan[0].inputIndex;
      }

      visited.add(currentIndex);

      if (!indexMap.has(currentIndex)) {
        return false; // No further mapping, not circular
      }

      currentIndex = indexMap.get(currentIndex);
    }
  }
}
