/**
 * Growth potential scores by AbilityKey (08 §3 / S01-002).
 * Standalone VO — not persisted on Person in S01-002; no silent 50 fill.
 */
import { ABILITY_KEYS, type AbilityKey } from "../abilities.js";
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

export type GrowthPotentialScores = { readonly [K in AbilityKey]: number };

export function validateGrowthPotentialScores(
  input: unknown,
): ValidationResult<GrowthPotentialScores> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "GrowthPotentialScores must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, ABILITY_KEYS, "", issues);

  const rebuilt = {} as { [K in AbilityKey]: number };
  let ok = true;
  for (const key of ABILITY_KEYS) {
    const value = requireIntegerInRange(object, key, "", 0, 100, issues);
    if (value === undefined) {
      ok = false;
    } else {
      rebuilt[key] = value;
    }
  }

  if (!ok || issues.length > 0) {
    return failure(issues);
  }
  return success(deepFreezePlainJson(rebuilt));
}

export function cloneGrowthPotentialScores(
  input: unknown,
): ValidationResult<GrowthPotentialScores> {
  const validated = validateGrowthPotentialScores(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeGrowthPotentialScores(
  input: unknown,
): ValidationResult<GrowthPotentialScores> {
  return validateGrowthPotentialScores(input);
}
