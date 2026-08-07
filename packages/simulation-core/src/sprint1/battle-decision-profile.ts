/**
 * `BattleDecisionProfile` and the `battle-profile-adapter-0.1.0` contract
 * (11 mini-spec §4.4 / §4.5 / S01-005).
 *
 * Sprint 0's `Person` has no personality or injury-proneness fields, and 11 §4.5
 * forbids guessing them from names, ids, ability values, array order, or RNG.
 * The adapter therefore uses an upstream-supplied, already-normalized 0..100
 * value only when it is explicitly present, and falls back to the neutral 50 for
 * every missing axis. Changing this mapping requires bumping
 * `BATTLE_PROFILE_ADAPTER_VERSION` (and therefore SimulationIdentity).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { BATTLE_PROFILE_ADAPTER_VERSION } from "./constants.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

/** 11 §4.4: 50 is the neutral value for every normalized battle profile axis. */
export const BATTLE_PROFILE_NEUTRAL_VALUE = 50;

export const BATTLE_DECISION_PROFILE_KEYS = [
  "aggression",
  "caution",
  "riskTolerance",
  "perseverance",
] as const;

export const BATTLE_PROFILE_ADAPTER_INPUT_KEYS = [
  "battleDecisionProfile",
  "injuryProneness",
] as const;

export type BattleDecisionProfile = {
  aggression: number;
  caution: number;
  riskTolerance: number;
  perseverance: number;
};

export type AdaptedBattleProfile = {
  adapterVersion: typeof BATTLE_PROFILE_ADAPTER_VERSION;
  battleDecisionProfile: BattleDecisionProfile;
  injuryProneness: number;
};

export function createNeutralBattleDecisionProfile(): BattleDecisionProfile {
  return {
    aggression: BATTLE_PROFILE_NEUTRAL_VALUE,
    caution: BATTLE_PROFILE_NEUTRAL_VALUE,
    riskTolerance: BATTLE_PROFILE_NEUTRAL_VALUE,
    perseverance: BATTLE_PROFILE_NEUTRAL_VALUE,
  };
}

export function validateBattleDecisionProfile(
  input: unknown,
): ValidationResult<BattleDecisionProfile> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleDecisionProfile must be a plain object",
              actual: input,
              expected: "BattleDecisionProfile",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_DECISION_PROFILE_KEYS, "", issues);

  const aggression = requireIntegerInRange(object, "aggression", "", 0, 100, issues);
  const caution = requireIntegerInRange(object, "caution", "", 0, 100, issues);
  const riskTolerance = requireIntegerInRange(object, "riskTolerance", "", 0, 100, issues);
  const perseverance = requireIntegerInRange(object, "perseverance", "", 0, 100, issues);

  if (
    aggression === undefined ||
    caution === undefined ||
    riskTolerance === undefined ||
    perseverance === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(deepFreezePlainJson({ aggression, caution, riskTolerance, perseverance }));
}

export function cloneBattleDecisionProfile(
  input: unknown,
): ValidationResult<BattleDecisionProfile> {
  const validated = validateBattleDecisionProfile(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeBattleDecisionProfile(
  input: unknown,
): ValidationResult<BattleDecisionProfile> {
  return validateBattleDecisionProfile(input);
}

/**
 * `battle-profile-adapter-0.1.0` (11 §4.5).
 *
 * `input` may be `undefined` / `null` (no upstream normalized values at all), or
 * a plain object carrying an explicit `battleDecisionProfile` and/or
 * `injuryProneness`. Absent or `null` axes become the neutral 50; present values
 * must already be validated 0..100 integers and are used unchanged. The result
 * is identical for the same person snapshot, adapter version, and config.
 */
export function adaptBattleProfile(input?: unknown): ValidationResult<AdaptedBattleProfile> {
  if (input === undefined || input === null) {
    return success(
      deepFreezePlainJson({
        adapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
        battleDecisionProfile: createNeutralBattleDecisionProfile(),
        injuryProneness: BATTLE_PROFILE_NEUTRAL_VALUE,
      }),
    );
  }

  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "battle profile adapter input must be a plain object, null, or undefined",
              actual: input,
              expected: "{ battleDecisionProfile?, injuryProneness? }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_PROFILE_ADAPTER_INPUT_KEYS, "", issues);

  let battleDecisionProfile = createNeutralBattleDecisionProfile();
  const rawProfile = hasOwn(object, "battleDecisionProfile")
    ? object["battleDecisionProfile"]
    : null;
  if (rawProfile !== null && rawProfile !== undefined) {
    const parsed = validateBattleDecisionProfile(rawProfile);
    if (!parsed.ok) {
      for (const issue of parsed.issues) {
        issues.push({ ...issue, path: `/battleDecisionProfile${issue.path}` });
      }
    } else {
      battleDecisionProfile = parsed.value;
    }
  }

  let injuryProneness = BATTLE_PROFILE_NEUTRAL_VALUE;
  const rawInjuryProneness = hasOwn(object, "injuryProneness") ? object["injuryProneness"] : null;
  if (rawInjuryProneness !== null && rawInjuryProneness !== undefined) {
    const parsed = requireIntegerInRange(object, "injuryProneness", "", 0, 100, issues);
    if (parsed !== undefined) {
      injuryProneness = parsed;
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      adapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
      battleDecisionProfile: cloneValidatedPlainJson(battleDecisionProfile),
      injuryProneness,
    }),
  );
}
