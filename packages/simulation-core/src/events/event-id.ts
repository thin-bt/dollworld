import { asEventId, type EventId } from "../ids.js";

/**
 * Deterministic eventId from sequence only (03 mini-spec).
 * sequence 0 → event_000000001
 */
export function eventIdFromSequence(sequence: number): EventId {
  assertNonNegativeSafeInteger(sequence, "sequence");
  return asEventId(`event_${String(sequence + 1).padStart(9, "0")}`);
}

export function assertEventIdMatchesSequence(eventId: string, sequence: number): void {
  const expected = eventIdFromSequence(sequence);
  if (eventId !== expected) {
    throw new Error(
      `eventId must equal ${expected} for sequence ${String(sequence)} (got ${eventId})`,
    );
  }
}

export function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer (got ${String(value)})`);
  }
}
