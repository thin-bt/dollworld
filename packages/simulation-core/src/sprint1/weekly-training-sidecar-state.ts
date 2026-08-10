/**
 * WeeklyTrainingSidecarState — current runtime sidecar owned by Sprint1RunRuntimeState
 * (S1-SPEC-0.1.20 / S01-008 foundation).
 *
 * Same entry shape / ordering / validation as InitialWeeklyTrainingSidecarSnapshot 0.1.0.
 * Semantic split:
 * - InitialWeeklyTrainingSidecarSnapshot: run-identity input (immutable after fresh init)
 * - WeeklyTrainingSidecarState: mutable current runtime value (transaction-rolled-back)
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  computeInitialWeeklyTrainingSidecarHash,
  validateInitialWeeklyTrainingSidecarSnapshot,
  type InitialWeeklyTrainingSidecarSnapshot,
} from "./initial-weekly-training-sidecar.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { cloneValidatedPlainJson } from "./plain-data.js";

/**
 * Current weekly training sidecar runtime state.
 * Wire schema is intentionally identical to InitialWeeklyTrainingSidecarSnapshot 0.1.0.
 */
export type WeeklyTrainingSidecarState = InitialWeeklyTrainingSidecarSnapshot;

/**
 * Validate current WeeklyTrainingSidecarState (same rules as the initial snapshot).
 */
export function validateWeeklyTrainingSidecarState(
  input: unknown,
): ValidationResult<WeeklyTrainingSidecarState> {
  return validateInitialWeeklyTrainingSidecarSnapshot(input);
}

/**
 * Fresh init: current weeklyTrainingSidecars = validated deep clone(initial).
 * Does not share object references with the immutable initial snapshot.
 */
export function createWeeklyTrainingSidecarStateFromInitial(
  initial: unknown,
): ValidationResult<WeeklyTrainingSidecarState> {
  const validated = validateInitialWeeklyTrainingSidecarSnapshot(initial);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  // Validator already rebuilt/froze a tree; clone again so caller-held initial
  // and returned current state never alias nested entries.
  return success(cloneValidatedPlainJson(validated.value));
}

/**
 * Identity hash uses the initial snapshot only. Current sidecar mutations must not
 * change this digest; this helper exists for regression tests / call-site clarity.
 */
export function computeInitialWeeklyTrainingSidecarHashFromState(
  initialSnapshot: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  return computeInitialWeeklyTrainingSidecarHash(initialSnapshot, provider);
}
