/**
 * Hardened `SeededRngState` intake for the Sprint 1 weekly processor (07 mini-spec,
 * 10 §12 / S01-004).
 *
 * `importSeededRng` reads its argument through plain property access, so a hostile
 * caller could hand the processor a Proxy or an accessor-backed object and observe
 * (or change) the state between the import check and the first draw. This validator
 * snapshots the state from data descriptors only, applies the exact `SeededRngState`
 * schema — no alternative RNG schema is invented here — and rebuilds a plain object
 * for `importSeededRng`. Reflection traps become validation issues; nothing throws.
 */
import { RNG_ALGORITHM_VERSION } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireLiteralString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const SEEDED_RNG_STATE_KEYS = ["algorithmVersion", "s0", "s1", "s2", "s3"] as const;

const SEEDED_RNG_WORD_KEYS = ["s0", "s1", "s2", "s3"] as const;

/** Inclusive uint32 bound shared with `importSeededRng` (07 mini-spec). */
export const SEEDED_RNG_WORD_MAXIMUM = 4294967295;

export function seededRngStatesEqual(a: SeededRngState, b: SeededRngState): boolean {
  return (
    a.algorithmVersion === b.algorithmVersion &&
    a.s0 === b.s0 &&
    a.s1 === b.s1 &&
    a.s2 === b.s2 &&
    a.s3 === b.s3
  );
}

export function validateSeededRngState(input: unknown): ValidationResult<SeededRngState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "SeededRngState must be a plain object",
              actual: input,
              expected: "SeededRngState",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SEEDED_RNG_STATE_KEYS, "", issues);

  const algorithmVersion = requireLiteralString(
    object,
    "algorithmVersion",
    "",
    RNG_ALGORITHM_VERSION,
    issues,
  );

  const words: number[] = [];
  for (const key of SEEDED_RNG_WORD_KEYS) {
    const value = requireIntegerInRange(object, key, "", 0, SEEDED_RNG_WORD_MAXIMUM, issues);
    if (value === undefined) {
      continue;
    }
    // -0 imports as 0 through `>>> 0`; normalize so the exported state stays canonical.
    words.push(Object.is(value, -0) ? 0 : value);
  }

  if (algorithmVersion === undefined || words.length !== SEEDED_RNG_WORD_KEYS.length) {
    return failure(issues);
  }

  const [s0, s1, s2, s3] = words as [number, number, number, number];
  if (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0) {
    issues.push({
      path: "",
      message: "RNG state must not be all zero",
      actual: [s0, s1, s2, s3],
      expected: "at least one non-zero uint32 word",
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success({ algorithmVersion, s0, s1, s2, s3 });
}
