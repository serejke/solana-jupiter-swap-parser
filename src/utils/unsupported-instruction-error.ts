export class UnsupportedInstructionError extends Error {
  constructor(message: string) {
    super(message);
  }
}