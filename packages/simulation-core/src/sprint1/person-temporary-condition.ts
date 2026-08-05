/**
 * Person temporary condition value object (08 §3 / §6.1 / S01-002).
 * Standalone validated VO — not persisted on Person in S01-002 (WorldState wiring → S01-008).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const PERSON_TEMPORARY_CONDITION_KEYS = [
  "fatigue",
  "injury",
  "condition",
  "confidence",
] as const;

export type PersonTemporaryCondition = {
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
};

export function validatePersonTemporaryCondition(
  input: unknown,
): ValidationResult<PersonTemporaryCondition> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "PersonTemporaryCondition must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, PERSON_TEMPORARY_CONDITION_KEYS, "", issues);

  const fatigue = requireIntegerInRange(object, "fatigue", "", 0, 100, issues);
  const injury = requireIntegerInRange(object, "injury", "", 0, 100, issues);
  const condition = requireIntegerInRange(object, "condition", "", -20, 20, issues);
  const confidence = requireIntegerInRange(object, "confidence", "", -20, 20, issues);

  if (
    fatigue === undefined ||
    injury === undefined ||
    condition === undefined ||
    confidence === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      fatigue,
      injury,
      condition,
      confidence,
    }),
  );
}

export function clonePersonTemporaryCondition(
  input: unknown,
): ValidationResult<PersonTemporaryCondition> {
  const validated = validatePersonTemporaryCondition(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezePersonTemporaryCondition(
  input: unknown,
): ValidationResult<PersonTemporaryCondition> {
  return validatePersonTemporaryCondition(input);
}
