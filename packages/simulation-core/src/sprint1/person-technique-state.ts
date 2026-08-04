/**
 * PersonTechniqueState structural validation (09 mini-spec §6 storage shape / S01-001).
 * Structural only: catalog membership, learningProgressRequired, and mastery/learning
 * semantics belong to S01-003 and must not be checked here.
 */
import { asTechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { PersonTechniqueState } from "./types.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerAtLeast,
  requireIntegerInRange,
  requireNonEmptyTrimmedString,
  requireNullableIntegerAtLeast,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const PERSON_TECHNIQUE_STATE_KEYS = [
  "techniqueId",
  "learningProgressTenths",
  "masteryHundredths",
  "successfulUseCount",
  "attemptedUseCount",
  "lastPracticedAbsoluteWeek",
  "acquiredAbsoluteWeek",
] as const;

export function validatePersonTechniqueState(
  input: unknown,
): ValidationResult<PersonTechniqueState> {
  const issues: ValidationIssue[] = [];

  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "PersonTechniqueState must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }

  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, PERSON_TECHNIQUE_STATE_KEYS, "", issues);

  const techniqueIdRaw = requireNonEmptyTrimmedString(object, "techniqueId", "", issues);
  const learningProgressTenths = requireIntegerAtLeast(
    object,
    "learningProgressTenths",
    "",
    0,
    issues,
  );
  const masteryHundredths = requireIntegerInRange(
    object,
    "masteryHundredths",
    "",
    0,
    10000,
    issues,
  );
  const successfulUseCount = requireIntegerAtLeast(object, "successfulUseCount", "", 0, issues);
  const attemptedUseCount = requireIntegerAtLeast(object, "attemptedUseCount", "", 0, issues);
  const lastPracticedAbsoluteWeek = requireNullableIntegerAtLeast(
    object,
    "lastPracticedAbsoluteWeek",
    "",
    0,
    issues,
  );
  const acquiredAbsoluteWeek = requireNullableIntegerAtLeast(
    object,
    "acquiredAbsoluteWeek",
    "",
    0,
    issues,
  );

  if (
    techniqueIdRaw === undefined ||
    learningProgressTenths === undefined ||
    masteryHundredths === undefined ||
    successfulUseCount === undefined ||
    attemptedUseCount === undefined ||
    lastPracticedAbsoluteWeek === undefined ||
    acquiredAbsoluteWeek === undefined
  ) {
    return failure(issues);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const value: PersonTechniqueState = {
    techniqueId: asTechniqueId(techniqueIdRaw),
    learningProgressTenths,
    masteryHundredths,
    successfulUseCount,
    attemptedUseCount,
    lastPracticedAbsoluteWeek,
    acquiredAbsoluteWeek,
  };

  return success(deepFreezePlainJson(value));
}

/**
 * Public clone: validate unknown input, then independently clone and deep-freeze.
 * Does not run getters / setters / toJSON; never normalizes invalid inputs to success.
 */
export function clonePersonTechniqueState(input: unknown): ValidationResult<PersonTechniqueState> {
  const validated = validatePersonTechniqueState(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

/**
 * Public freeze: validate unknown input and return the deep-frozen rebuilt value.
 */
export function freezePersonTechniqueState(input: unknown): ValidationResult<PersonTechniqueState> {
  return validatePersonTechniqueState(input);
}
