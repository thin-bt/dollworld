/**
 * Stat growth remainder (08 §3.1 / S01-002).
 * Standalone VO — not persisted on Person in S01-002.
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
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const STAT_GROWTH_REMAINDER_KEYS = ["stat", "milliPoints"] as const;

export type StatGrowthRemainder = {
  stat: AbilityKey;
  milliPoints: number;
};

export type StatGrowthRemainderCollection = readonly StatGrowthRemainder[];

const ABILITY_KEY_SET: ReadonlySet<string> = new Set(ABILITY_KEYS);

export function validateStatGrowthRemainder(input: unknown): ValidationResult<StatGrowthRemainder> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "StatGrowthRemainder must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, STAT_GROWTH_REMAINDER_KEYS, "", issues);

  let stat: AbilityKey | undefined;
  if (!Object.prototype.hasOwnProperty.call(object, "stat")) {
    issues.push({
      path: "/stat",
      message: "required key is missing",
      expected: "AbilityKey",
    });
  } else {
    const statValue = object["stat"];
    if (typeof statValue !== "string" || !ABILITY_KEY_SET.has(statValue)) {
      issues.push({
        path: "/stat",
        message: "stat must be a valid AbilityKey",
        actual: statValue,
        expected: ABILITY_KEYS.join(" | "),
      });
    } else {
      stat = statValue as AbilityKey;
    }
  }

  const milliPoints = requireIntegerInRange(object, "milliPoints", "", 0, 999, issues);

  if (stat === undefined || milliPoints === undefined || issues.length > 0) {
    return failure(issues);
  }

  return success(deepFreezePlainJson({ stat, milliPoints }));
}

export function validateStatGrowthRemainderCollection(
  input: unknown,
): ValidationResult<StatGrowthRemainderCollection> {
  const issues: ValidationIssue[] = [];
  const items = snapshotDenseArrayOrFail(input, "", issues);
  if (items === undefined) {
    return failure(issues);
  }

  const parsed: StatGrowthRemainder[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const result = validateStatGrowthRemainder(items[index]);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.push({
          ...issue,
          path: `/${String(index)}${issue.path === "" ? "" : issue.path}`,
        });
      }
      continue;
    }
    parsed.push(result.value);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  if (parsed.length !== ABILITY_KEYS.length) {
    return failure([
      {
        path: "",
        message: "StatGrowthRemainderCollection must contain exactly one entry per AbilityKey",
        actual: parsed.length,
        expected: String(ABILITY_KEYS.length),
      },
    ]);
  }

  const seen = new Set<AbilityKey>();
  for (const entry of parsed) {
    if (seen.has(entry.stat)) {
      return failure([
        {
          path: "",
          message: "duplicate AbilityKey in StatGrowthRemainderCollection",
          actual: entry.stat,
          expected: "unique AbilityKey per entry",
        },
      ]);
    }
    seen.add(entry.stat);
  }

  for (const key of ABILITY_KEYS) {
    if (!seen.has(key)) {
      return failure([
        {
          path: "",
          message: "missing AbilityKey in StatGrowthRemainderCollection",
          actual: [...seen],
          expected: `include ${key}`,
        },
      ]);
    }
  }

  const ordered = ABILITY_KEYS.map((key) => {
    const entry = parsed.find((item) => item.stat === key)!;
    return { stat: entry.stat, milliPoints: entry.milliPoints };
  });

  return success(deepFreezePlainJson(ordered));
}

export function cloneStatGrowthRemainderCollection(
  input: unknown,
): ValidationResult<StatGrowthRemainderCollection> {
  const validated = validateStatGrowthRemainderCollection(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeStatGrowthRemainderCollection(
  input: unknown,
): ValidationResult<StatGrowthRemainderCollection> {
  return validateStatGrowthRemainderCollection(input);
}
