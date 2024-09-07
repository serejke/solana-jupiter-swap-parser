import { Event, Program, utils } from "@coral-xyz/anchor";
import { JUPITER_V6_PROGRAM_ID } from "../constants";
import {
  ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath
} from '../transaction/instruction-stack-trace-path';

export function getEvents(
  program: Program,
  allRelevantInstructions: ParsedInstructionOrPartiallyDecodedInstructionWithStackTracePath[]
) {
  const events: Event[] = [];

  for (const iix of allRelevantInstructions) {
    if (!iix.programId.equals(JUPITER_V6_PROGRAM_ID)) continue;
    if (!("data" in iix)) continue; // Guard in case it is a parsed decoded instruction

    const ixData = utils.bytes.bs58.decode(iix.data);
    const eventData = utils.bytes.base64.encode(ixData.subarray(8));
    const event = program.coder.events.decode(eventData);

    if (!event) continue;

    events.push(event);
  }

  return events;
}
