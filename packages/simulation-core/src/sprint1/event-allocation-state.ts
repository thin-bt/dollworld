/**
 * EventAllocationState — Sprint 1 global event sequence allocator (S1-SPEC-0.1.20).
 *
 * WorldEngine today exposes bare `startSequence` / `nextSequence` numbers on
 * `WorldEngineRunResult` (`packages/simulation-core/src/world-engine/types.ts`);
 * there is no pre-existing named Event allocation runtime type to reuse.
 * This schema is the Sprint1RunRuntimeState field contract for S01-008.
 *
 * EventId remains a pure function of sequence (03 mini-spec). No separate
 * mutable EventId generator state is introduced.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { EVENT_ALLOCATION_STATE_SCHEMA_VERSION } from "./constants.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export { EVENT_ALLOCATION_STATE_SCHEMA_VERSION };

/** Canonical key order. */
export const EVENT_ALLOCATION_STATE_KEYS = ["schemaVersion", "nextSequence"] as const;

export type EventAllocationState = {
  schemaVersion: typeof EVENT_ALLOCATION_STATE_SCHEMA_VERSION;
  /**
   * Next unused global event sequence.
   * After fresh initialization promotion with initial events sequenced `0..N-1`
   * (03 / `buildInitialEvents`), this equals `promotedInitialEvents.length` (= N).
   * Matches WorldEngine callers that set `startSequence = initialEvents.length`.
   */
  nextSequence: number;
};

/**
 * Validate EventAllocationState 0.1.0.
 * Rejects unknown keys, negative nextSequence, and non-safe integers.
 */
export function validateEventAllocationState(
  input: unknown,
): ValidationResult<EventAllocationState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "EventAllocationState must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, EVENT_ALLOCATION_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
    issues,
  );
  const nextSequence = requireSafeIntegerAtLeast(object, "nextSequence", "", 0, issues);

  if (schemaVersion === undefined || nextSequence === undefined || issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
      nextSequence,
    }),
  );
}

/**
 * Build EventAllocationState whose nextSequence equals the count of promoted
 * initial events (sequences `0..N-1` ⇒ nextSequence = N).
 */
export function createEventAllocationStateAfterPromotedInitialEvents(
  promotedInitialEventCount: number,
): ValidationResult<EventAllocationState> {
  return validateEventAllocationState({
    schemaVersion: EVENT_ALLOCATION_STATE_SCHEMA_VERSION,
    nextSequence: promotedInitialEventCount,
  });
}
