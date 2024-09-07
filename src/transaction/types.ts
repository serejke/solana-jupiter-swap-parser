import { InstructionStackTracePath } from './instruction-stack-trace-path';
import { PublicKey } from '@solana/web3.js';

export type ProgramInstructionLogs = {
  stackTracePath: InstructionStackTracePath;
  invokeResult?: string;
  logs: ProgramInstructionLog[];
};

export type ProgramInstructionLog =
  | { type: 'success' }
  | { type: 'invokeResult', result: string }
  | { type: 'raw'; log: string }
  | { type: 'invocation'; programId: PublicKey }
  | { type: 'error'; message: string }
  | { type: 'log'; message: string }
  | { type: 'data'; data: string }
  | { type: 'consumedUnits'; units: number; total: number }
  | { type: 'insufficientLamports' }