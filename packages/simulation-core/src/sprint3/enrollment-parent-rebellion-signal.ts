/**
 * S03-029 explicit persisted enrollment parent-rebellion signal (docs/SPEC.md §8歳時の師匠決定).
 * Caller-owned facts only — no autonomous rebellion inference or generation.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  cloneMentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
  type Sprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";

export function childHasEnrollmentParentRebellionSignal(
  runtime: Sprint3MentorshipEntrypointRuntimeState | undefined,
  childPersonId: PersonId,
): boolean {
  if (runtime === undefined) {
    return false;
  }
  return runtime.enrollmentParentRebellionChildPersonIds.some((id) => id === childPersonId);
}

export function withEnrollmentParentRebellionSignalForChild(
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  childPersonId: PersonId,
): ValidationResult<Sprint3MentorshipEntrypointRuntimeState> {
  if (childHasEnrollmentParentRebellionSignal(runtime, childPersonId)) {
    return success(runtime);
  }
  const nextIds = [...runtime.enrollmentParentRebellionChildPersonIds, childPersonId].sort(
    compareUnicodeCodePoints,
  );
  return validateSprint3MentorshipEntrypointRuntimeState({
    ...cloneMentorshipEntrypointRuntimeState(runtime),
    enrollmentParentRebellionChildPersonIds: nextIds,
  });
}
