/**
 * BattleTurnOrderLog / BattleActionLog validators and empty ActionLog factory
 * (12 §20 / S01-006). Unused ActionLog keys are explicit `null` (all 63 keys).
 */
import { asPersonId } from "../ids.js";
import type { PersonId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  EVADE_DIRECTIONS,
  invalidActionCountDeltaForReplacementReason,
  validateBattleAction,
  validateBattleActionReplacementReason,
  validateResolvedBattleAction,
} from "./battle-action.js";
import type {
  BattleAction,
  BattleActionReplacementReason,
  EvadeDirection,
  ResolvedBattleAction,
} from "./battle-action.js";
import { isBattleSide } from "./battle-enums.js";
import type { BattleSide } from "./battle-enums.js";
import { compareBattleActionsCanonical } from "./battle-strategy-scoring.js";
import { UINT32_MAXIMUM } from "./battle-state.js";
import { clampInteger } from "./battle-turn-math.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireBoolean,
  requireInteger,
  requireIntegerInRange,
  requireNonEmptyTrimmedString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { BATTLE_RANGES } from "./types.js";
import type { BattleRange } from "./types.js";
import { seededRngStatesEqual, validateSeededRngState } from "./validate-seeded-rng-state.js";

export const BATTLE_TURN_ORDER_LOG_KEYS = [
  "turnNumber",
  "sideAPriority",
  "sideBPriority",
  "sideAActionOrderScore",
  "sideBActionOrderScore",
  "rngStateBeforeOrder",
  "sideAOrderRoll",
  "sideBOrderRoll",
  "tieBreakRoll",
  "resolvedFirstSide",
  "rngStateAfterOrder",
] as const;

export type BattleTurnOrderLog = {
  turnNumber: number;
  sideAPriority: number;
  sideBPriority: number;
  sideAActionOrderScore: number | null;
  sideBActionOrderScore: number | null;
  rngStateBeforeOrder: SeededRngState;
  sideAOrderRoll: number | null;
  sideBOrderRoll: number | null;
  tieBreakRoll: number | null;
  resolvedFirstSide: BattleSide;
  rngStateAfterOrder: SeededRngState;
};

/** Exact 63 ActionLog keys (12 §20). */
export const BATTLE_ACTION_LOG_KEYS = [
  "actionSequence",
  "turnNumber",
  "actorSide",
  "actorPersonId",
  "strategySeed",
  "strategyCandidateScores",
  "strategyTieBreakUsed",
  "requestedAction",
  "resolvedAction",
  "replacementReason",
  "priority",
  "actionOrderScore",
  "rangeBefore",
  "rangeAfter",
  "rangeShiftApplied",
  "rangeShiftBlockChance",
  "rangeShiftBlockRoll",
  "movementChance",
  "movementRoll",
  "evadeDirection",
  "actorDurabilityBefore",
  "actorDurabilityAfter",
  "actorMentalBefore",
  "actorMentalAfter",
  "targetDurabilityBefore",
  "targetDurabilityAfter",
  "targetMentalBefore",
  "targetMentalAfter",
  "guardingBefore",
  "guardingAfter",
  "evadingBefore",
  "evadingAfter",
  "activationChance",
  "activationRoll",
  "activationSucceeded",
  "activationFailureReason",
  "hitChance",
  "hitRoll",
  "hit",
  "damageVariance",
  "damage",
  "focusBaseRecovery",
  "focusAppliedRecovery",
  "injuryChance",
  "injuryRoll",
  "majorInjuryChance",
  "majorInjuryRoll",
  "injuryResult",
  "inBattleConsumptionBefore",
  "inBattleConsumptionDelta",
  "inBattleConsumptionAfter",
  "passiveActionCountDelta",
  "invalidActionCountDelta",
  "advantageTurnAwardedTo",
  "nextHitModifierBefore",
  "nextHitModifierAfter",
  "nextActivationModifierBefore",
  "nextActivationModifierAfter",
  "surrenderedAfter",
  "unableToContinueAfter",
  "canActAfter",
  "rngStateBefore",
  "rngStateAfter",
] as const;

const STRATEGY_CANDIDATE_SCORE_KEYS = ["action", "score"] as const;
const ACTION_PRIORITIES = [2, 1, 0, -1] as const;
const INJURY_RESULT_LOG_VALUES = ["none", "minor", "major"] as const;
/** Upper bound from 14 `injury.maximumPercent` type contract (validator has no config). */
const INJURY_CHANCE_MAXIMUM_PERCENT = 95;

export type StrategyCandidateScoreEntry = {
  action: BattleAction;
  score: number;
};

export type InjuryResultLog = (typeof INJURY_RESULT_LOG_VALUES)[number];

export type BattleActionLog = {
  actionSequence: number;
  turnNumber: number;
  actorSide: BattleSide;
  actorPersonId: PersonId;
  strategySeed: number | null;
  strategyCandidateScores: readonly StrategyCandidateScoreEntry[] | null;
  strategyTieBreakUsed: boolean | null;
  /** Requested BattleAction only — `no_action` is ResolvedBattleAction-exclusive (12 §3). */
  requestedAction: BattleAction;
  resolvedAction: ResolvedBattleAction;
  replacementReason: BattleActionReplacementReason | null;
  priority: number | null;
  actionOrderScore: number | null;
  rangeBefore: BattleRange;
  rangeAfter: BattleRange;
  rangeShiftApplied: boolean | null;
  rangeShiftBlockChance: number | null;
  rangeShiftBlockRoll: number | null;
  movementChance: number | null;
  movementRoll: number | null;
  evadeDirection: EvadeDirection | null;
  actorDurabilityBefore: number;
  actorDurabilityAfter: number;
  actorMentalBefore: number;
  actorMentalAfter: number;
  targetDurabilityBefore: number | null;
  targetDurabilityAfter: number | null;
  targetMentalBefore: number | null;
  targetMentalAfter: number | null;
  guardingBefore: boolean;
  guardingAfter: boolean;
  evadingBefore: boolean;
  evadingAfter: boolean;
  activationChance: number | null;
  activationRoll: number | null;
  activationSucceeded: boolean | null;
  activationFailureReason: string | null;
  hitChance: number | null;
  hitRoll: number | null;
  hit: boolean | null;
  damageVariance: number | null;
  damage: number | null;
  focusBaseRecovery: number | null;
  focusAppliedRecovery: number | null;
  injuryChance: number | null;
  injuryRoll: number | null;
  majorInjuryChance: number | null;
  majorInjuryRoll: number | null;
  injuryResult: InjuryResultLog | null;
  inBattleConsumptionBefore: number;
  inBattleConsumptionDelta: number;
  inBattleConsumptionAfter: number;
  passiveActionCountDelta: number;
  invalidActionCountDelta: 0 | 1;
  advantageTurnAwardedTo: BattleSide | null;
  nextHitModifierBefore: number;
  nextHitModifierAfter: number;
  nextActivationModifierBefore: number;
  nextActivationModifierAfter: number;
  surrenderedAfter: boolean;
  unableToContinueAfter: boolean;
  canActAfter: boolean;
  rngStateBefore: SeededRngState;
  rngStateAfter: SeededRngState;
};

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

function requireNullableSafeInteger(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): number | null | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: "safe integer | null",
    });
    return undefined;
  }
  const value = object[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || Object.is(value, -0)) {
    issues.push({
      path: `/${key}`,
      message: "value must be a safe integer or null",
      actual: value,
      expected: "safe integer | null",
    });
    return undefined;
  }
  return value;
}

function requireNullableSafeIntegerInRange(
  object: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
  issues: ValidationIssue[],
): number | null | undefined {
  const value = requireNullableSafeInteger(object, key, issues);
  if (value === undefined || value === null) {
    return value;
  }
  if (value < minimum || value > maximum) {
    issues.push({
      path: `/${key}`,
      message: `value must be a safe integer within ${String(minimum)}..${String(maximum)} or null`,
      actual: value,
      expected: `${String(minimum)}..${String(maximum)} | null`,
    });
    return undefined;
  }
  return value;
}

function requireNullableNonNegativeSafeInteger(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): number | null | undefined {
  return requireNullableSafeIntegerInRange(object, key, 0, Number.MAX_SAFE_INTEGER, issues);
}

function requireNullableBoolean(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): boolean | null | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: "boolean | null",
    });
    return undefined;
  }
  const value = object[key];
  if (value === null) {
    return null;
  }
  if (typeof value !== "boolean") {
    issues.push({
      path: `/${key}`,
      message: "value must be a boolean or null",
      actual: value,
      expected: "boolean | null",
    });
    return undefined;
  }
  return value;
}

function requireBattleRangeField(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): BattleRange | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: BATTLE_RANGES.join(" | "),
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !(BATTLE_RANGES as readonly string[]).includes(value)) {
    issues.push({
      path: `/${key}`,
      message: "value must be a BattleRange",
      actual: value,
      expected: BATTLE_RANGES.join(" | "),
    });
    return undefined;
  }
  return value as BattleRange;
}

function requireRngStateField(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): SeededRngState | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: "SeededRngState",
    });
    return undefined;
  }
  const result = validateSeededRngState(object[key]);
  if (!result.ok) {
    issues.push(...prefix(result.issues, `/${key}`));
    return undefined;
  }
  return result.value;
}

function requirePairedNullableSafeIntegers(
  object: Record<string, unknown>,
  leftKey: string,
  rightKey: string,
  leftRange: { minimum: number; maximum: number } | undefined,
  rightRange: { minimum: number; maximum: number } | undefined,
  issues: ValidationIssue[],
): { left: number | null; right: number | null } | undefined {
  const left =
    leftRange === undefined
      ? requireNullableSafeInteger(object, leftKey, issues)
      : requireNullableSafeIntegerInRange(
          object,
          leftKey,
          leftRange.minimum,
          leftRange.maximum,
          issues,
        );
  const right =
    rightRange === undefined
      ? requireNullableSafeInteger(object, rightKey, issues)
      : requireNullableSafeIntegerInRange(
          object,
          rightKey,
          rightRange.minimum,
          rightRange.maximum,
          issues,
        );
  if (left === undefined || right === undefined) {
    return undefined;
  }
  if ((left === null) !== (right === null)) {
    issues.push({
      path: `/${leftKey}`,
      message: `${leftKey} and ${rightKey} must both be null or both be non-null`,
      actual: { [leftKey]: left, [rightKey]: right },
      expected: "paired null correlation",
    });
    return undefined;
  }
  return { left, right };
}

function validateStrategyCandidateScores(
  value: unknown,
  issues: ValidationIssue[],
): readonly StrategyCandidateScoreEntry[] | null | undefined {
  if (value === null) {
    return null;
  }
  const items = snapshotDenseArrayOrFail(value, "/strategyCandidateScores", issues);
  if (items === undefined) {
    return undefined;
  }
  const entries: StrategyCandidateScoreEntry[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const path = `/strategyCandidateScores/${String(index)}`;
    const entryObject = snapshotPlainObjectOrFail(items[index], path, issues);
    if (entryObject === undefined) {
      ok = false;
      continue;
    }
    const structuralIssueCount = issues.length;
    assertNoAccessors(entryObject, path, issues);
    rejectUnknownKeys(entryObject, STRATEGY_CANDIDATE_SCORE_KEYS, path, issues);
    for (const key of STRATEGY_CANDIDATE_SCORE_KEYS) {
      if (!hasOwn(entryObject, key)) {
        issues.push({
          path: `${path}/${key}`,
          message: "required key is missing",
          expected: "present key",
        });
      }
    }
    if (issues.length > structuralIssueCount) {
      ok = false;
    }
    if (!hasOwn(entryObject, "action") || !hasOwn(entryObject, "score")) {
      ok = false;
      continue;
    }

    // Strategy candidates are BattleAction only — no_action / Resolved-only rejected.
    const asBattle = validateBattleAction(entryObject["action"]);
    let action: BattleAction | undefined;
    if (asBattle.ok) {
      action = asBattle.value;
    } else {
      issues.push(...prefix(asBattle.issues, `${path}/action`));
      ok = false;
    }

    const scoreRaw = entryObject["score"];
    if (
      typeof scoreRaw !== "number" ||
      !Number.isSafeInteger(scoreRaw) ||
      Object.is(scoreRaw, -0)
    ) {
      issues.push({
        path: `${path}/score`,
        message: "score must be a safe integer",
        actual: scoreRaw,
        expected: "safe integer",
      });
      ok = false;
      continue;
    }
    if (action === undefined) {
      continue;
    }
    entries.push({ action, score: scoreRaw });
  }

  if (!ok) {
    return undefined;
  }

  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index]!;
    if (index > 0) {
      const previous = entries[index - 1]!;
      const cmp = compareBattleActionsCanonical(previous.action, current.action);
      if (cmp === 0) {
        issues.push({
          path: `/strategyCandidateScores/${String(index)}/action`,
          message: "duplicate strategy candidate action is not allowed",
          actual: current.action,
        });
        ok = false;
      } else if (cmp > 0) {
        issues.push({
          path: `/strategyCandidateScores/${String(index)}/action`,
          message: "strategyCandidateScores must be in canonical BattleAction order",
          actual: current.action,
          expected: "strict ascending canonical order",
        });
        ok = false;
      }
    }
  }
  return ok ? entries : undefined;
}

export function validateBattleTurnOrderLog(input: unknown): ValidationResult<BattleTurnOrderLog> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleTurnOrderLog must be a plain object",
              actual: input,
              expected: "BattleTurnOrderLog",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_TURN_ORDER_LOG_KEYS, "", issues);

  const turnNumber = requireIntegerInRange(
    object,
    "turnNumber",
    "",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  if (
    turnNumber !== undefined &&
    (typeof object["turnNumber"] !== "number" ||
      !Number.isSafeInteger(object["turnNumber"]) ||
      Object.is(object["turnNumber"], -0))
  ) {
    issues.push({
      path: "/turnNumber",
      message: "turnNumber must be a safe integer",
      actual: object["turnNumber"],
      expected: "safe integer >= 1",
    });
  }

  let sideAPriority: number | undefined;
  let sideBPriority: number | undefined;
  if (!hasOwn(object, "sideAPriority")) {
    issues.push({
      path: "/sideAPriority",
      message: "required key is missing",
      expected: "2 | 1 | 0 | -1",
    });
  } else if (
    typeof object["sideAPriority"] === "number" &&
    (ACTION_PRIORITIES as readonly number[]).includes(object["sideAPriority"]) &&
    !Object.is(object["sideAPriority"], -0)
  ) {
    sideAPriority = object["sideAPriority"];
  } else {
    issues.push({
      path: "/sideAPriority",
      message: "sideAPriority must be 2 | 1 | 0 | -1",
      actual: object["sideAPriority"],
      expected: "2 | 1 | 0 | -1",
    });
  }
  if (!hasOwn(object, "sideBPriority")) {
    issues.push({
      path: "/sideBPriority",
      message: "required key is missing",
      expected: "2 | 1 | 0 | -1",
    });
  } else if (
    typeof object["sideBPriority"] === "number" &&
    (ACTION_PRIORITIES as readonly number[]).includes(object["sideBPriority"]) &&
    !Object.is(object["sideBPriority"], -0)
  ) {
    sideBPriority = object["sideBPriority"];
  } else {
    issues.push({
      path: "/sideBPriority",
      message: "sideBPriority must be 2 | 1 | 0 | -1",
      actual: object["sideBPriority"],
      expected: "2 | 1 | 0 | -1",
    });
  }

  const sideAActionOrderScore = requireNullableSafeInteger(object, "sideAActionOrderScore", issues);
  const sideBActionOrderScore = requireNullableSafeInteger(object, "sideBActionOrderScore", issues);
  const sideAOrderRoll = requireNullableSafeInteger(object, "sideAOrderRoll", issues);
  const sideBOrderRoll = requireNullableSafeInteger(object, "sideBOrderRoll", issues);
  const tieBreakRoll = requireNullableSafeInteger(object, "tieBreakRoll", issues);
  const rngStateBeforeOrder = requireRngStateField(object, "rngStateBeforeOrder", issues);
  const rngStateAfterOrder = requireRngStateField(object, "rngStateAfterOrder", issues);

  let resolvedFirstSide: BattleSide | undefined;
  if (!hasOwn(object, "resolvedFirstSide") || !isBattleSide(object["resolvedFirstSide"])) {
    issues.push({
      path: "/resolvedFirstSide",
      message: "resolvedFirstSide must be sideA | sideB",
      actual: object["resolvedFirstSide"],
      expected: "sideA | sideB",
    });
  } else {
    resolvedFirstSide = object["resolvedFirstSide"];
  }

  if (
    sideAPriority !== undefined &&
    sideBPriority !== undefined &&
    sideAActionOrderScore !== undefined &&
    sideBActionOrderScore !== undefined &&
    sideAOrderRoll !== undefined &&
    sideBOrderRoll !== undefined &&
    tieBreakRoll !== undefined &&
    rngStateBeforeOrder !== undefined &&
    rngStateAfterOrder !== undefined &&
    resolvedFirstSide !== undefined
  ) {
    if (sideAPriority !== sideBPriority) {
      if (
        sideAActionOrderScore !== null ||
        sideBActionOrderScore !== null ||
        sideAOrderRoll !== null ||
        sideBOrderRoll !== null ||
        tieBreakRoll !== null
      ) {
        issues.push({
          path: "/sideAActionOrderScore",
          message:
            "when priorities differ, ActionOrderScore/orderRoll/tieBreakRoll must all be null",
          actual: {
            sideAActionOrderScore,
            sideBActionOrderScore,
            sideAOrderRoll,
            sideBOrderRoll,
            tieBreakRoll,
          },
        });
      }
      if (!seededRngStatesEqual(rngStateBeforeOrder, rngStateAfterOrder)) {
        issues.push({
          path: "/rngStateAfterOrder",
          message: "when priorities differ, rngStateBeforeOrder must equal rngStateAfterOrder",
        });
      }
      const expectedFirst: BattleSide = sideAPriority > sideBPriority ? "sideA" : "sideB";
      if (resolvedFirstSide !== expectedFirst) {
        issues.push({
          path: "/resolvedFirstSide",
          message: "resolvedFirstSide must be the higher-priority side",
          actual: resolvedFirstSide,
          expected: expectedFirst,
        });
      }
    } else {
      if (
        sideAActionOrderScore === null ||
        sideBActionOrderScore === null ||
        sideAOrderRoll === null ||
        sideBOrderRoll === null
      ) {
        issues.push({
          path: "/sideAOrderRoll",
          message:
            "when priorities are equal, both ActionOrderScores and both orderRolls must be non-null",
          actual: {
            sideAActionOrderScore,
            sideBActionOrderScore,
            sideAOrderRoll,
            sideBOrderRoll,
          },
        });
      } else if (sideAActionOrderScore !== sideBActionOrderScore) {
        if (tieBreakRoll !== null) {
          issues.push({
            path: "/tieBreakRoll",
            message: "tieBreakRoll must be null when ActionOrderScores differ",
            actual: tieBreakRoll,
          });
        }
        const expectedFirst: BattleSide =
          sideAActionOrderScore > sideBActionOrderScore ? "sideA" : "sideB";
        if (resolvedFirstSide !== expectedFirst) {
          issues.push({
            path: "/resolvedFirstSide",
            message: "resolvedFirstSide must be the higher ActionOrderScore side",
            actual: resolvedFirstSide,
            expected: expectedFirst,
          });
        }
      } else {
        if (tieBreakRoll !== 0 && tieBreakRoll !== 1) {
          issues.push({
            path: "/tieBreakRoll",
            message: "tieBreakRoll must be 0 | 1 when ActionOrderScores are equal",
            actual: tieBreakRoll,
            expected: "0 | 1",
          });
        } else {
          const expectedFirst: BattleSide = tieBreakRoll === 0 ? "sideA" : "sideB";
          if (resolvedFirstSide !== expectedFirst) {
            issues.push({
              path: "/resolvedFirstSide",
              message: "resolvedFirstSide must follow tieBreakRoll (0=sideA, 1=sideB)",
              actual: resolvedFirstSide,
              expected: expectedFirst,
            });
          }
        }
      }
    }
  }

  if (
    turnNumber === undefined ||
    sideAPriority === undefined ||
    sideBPriority === undefined ||
    sideAActionOrderScore === undefined ||
    sideBActionOrderScore === undefined ||
    sideAOrderRoll === undefined ||
    sideBOrderRoll === undefined ||
    tieBreakRoll === undefined ||
    rngStateBeforeOrder === undefined ||
    rngStateAfterOrder === undefined ||
    resolvedFirstSide === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      turnNumber,
      sideAPriority,
      sideBPriority,
      sideAActionOrderScore,
      sideBActionOrderScore,
      rngStateBeforeOrder,
      sideAOrderRoll,
      sideBOrderRoll,
      tieBreakRoll,
      resolvedFirstSide,
      rngStateAfterOrder,
    }),
  );
}

/**
 * Creates an ActionLog shell with every key present; numeric/state fields filled by
 * the caller. Unexecuted effect fields default to null.
 */
export function createEmptyBattleActionLogShell(partial: {
  actionSequence: number;
  turnNumber: number;
  actorSide: BattleSide;
  actorPersonId: PersonId;
  requestedAction: BattleAction;
  resolvedAction: ResolvedBattleAction;
  replacementReason: BattleActionReplacementReason | null;
  rangeBefore: BattleRange;
  rangeAfter: BattleRange;
  actorDurabilityBefore: number;
  actorDurabilityAfter: number;
  actorMentalBefore: number;
  actorMentalAfter: number;
  guardingBefore: boolean;
  guardingAfter: boolean;
  evadingBefore: boolean;
  evadingAfter: boolean;
  inBattleConsumptionBefore: number;
  inBattleConsumptionDelta: number;
  inBattleConsumptionAfter: number;
  passiveActionCountDelta: number;
  invalidActionCountDelta: 0 | 1;
  nextHitModifierBefore: number;
  nextHitModifierAfter: number;
  nextActivationModifierBefore: number;
  nextActivationModifierAfter: number;
  surrenderedAfter: boolean;
  unableToContinueAfter: boolean;
  canActAfter: boolean;
  rngStateBefore: SeededRngState;
  rngStateAfter: SeededRngState;
}): BattleActionLog {
  return deepFreezePlainJson({
    actionSequence: partial.actionSequence,
    turnNumber: partial.turnNumber,
    actorSide: partial.actorSide,
    actorPersonId: partial.actorPersonId,
    strategySeed: null,
    strategyCandidateScores: null,
    strategyTieBreakUsed: null,
    requestedAction: partial.requestedAction,
    resolvedAction: partial.resolvedAction,
    replacementReason: partial.replacementReason,
    priority: null,
    actionOrderScore: null,
    rangeBefore: partial.rangeBefore,
    rangeAfter: partial.rangeAfter,
    rangeShiftApplied: null,
    rangeShiftBlockChance: null,
    rangeShiftBlockRoll: null,
    movementChance: null,
    movementRoll: null,
    evadeDirection: null,
    actorDurabilityBefore: partial.actorDurabilityBefore,
    actorDurabilityAfter: partial.actorDurabilityAfter,
    actorMentalBefore: partial.actorMentalBefore,
    actorMentalAfter: partial.actorMentalAfter,
    targetDurabilityBefore: null,
    targetDurabilityAfter: null,
    targetMentalBefore: null,
    targetMentalAfter: null,
    guardingBefore: partial.guardingBefore,
    guardingAfter: partial.guardingAfter,
    evadingBefore: partial.evadingBefore,
    evadingAfter: partial.evadingAfter,
    activationChance: null,
    activationRoll: null,
    activationSucceeded: null,
    activationFailureReason: null,
    hitChance: null,
    hitRoll: null,
    hit: null,
    damageVariance: null,
    damage: null,
    focusBaseRecovery: null,
    focusAppliedRecovery: null,
    injuryChance: null,
    injuryRoll: null,
    majorInjuryChance: null,
    majorInjuryRoll: null,
    injuryResult: null,
    inBattleConsumptionBefore: partial.inBattleConsumptionBefore,
    inBattleConsumptionDelta: partial.inBattleConsumptionDelta,
    inBattleConsumptionAfter: partial.inBattleConsumptionAfter,
    passiveActionCountDelta: partial.passiveActionCountDelta,
    invalidActionCountDelta: partial.invalidActionCountDelta,
    advantageTurnAwardedTo: null,
    nextHitModifierBefore: partial.nextHitModifierBefore,
    nextHitModifierAfter: partial.nextHitModifierAfter,
    nextActivationModifierBefore: partial.nextActivationModifierBefore,
    nextActivationModifierAfter: partial.nextActivationModifierAfter,
    surrenderedAfter: partial.surrenderedAfter,
    unableToContinueAfter: partial.unableToContinueAfter,
    canActAfter: partial.canActAfter,
    rngStateBefore: partial.rngStateBefore,
    rngStateAfter: partial.rngStateAfter,
  });
}

export function validateBattleActionLog(input: unknown): ValidationResult<BattleActionLog> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleActionLog must be a plain object",
              actual: input,
              expected: "BattleActionLog",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_ACTION_LOG_KEYS, "", issues);

  for (const key of BATTLE_ACTION_LOG_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({
        path: `/${key}`,
        message: "required ActionLog key is missing (null unused values must still be present)",
        expected: "present key",
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  // --- identity ---
  const actionSequence = requireSafeIntegerAtLeast(object, "actionSequence", "", 0, issues);
  const turnNumber = requireIntegerInRange(
    object,
    "turnNumber",
    "",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  // requireIntegerInRange uses Number.isInteger; tighten to safe integer (BattleState-style upper).
  if (
    turnNumber !== undefined &&
    (typeof object["turnNumber"] !== "number" ||
      !Number.isSafeInteger(object["turnNumber"]) ||
      Object.is(object["turnNumber"], -0))
  ) {
    issues.push({
      path: "/turnNumber",
      message: "turnNumber must be a safe integer",
      actual: object["turnNumber"],
      expected: "safe integer >= 1",
    });
  }

  let actorSide: BattleSide | undefined;
  if (!isBattleSide(object["actorSide"])) {
    issues.push({
      path: "/actorSide",
      message: "actorSide must be sideA | sideB",
      actual: object["actorSide"],
      expected: "sideA | sideB",
    });
  } else {
    actorSide = object["actorSide"];
  }

  const actorPersonIdText = requireNonEmptyTrimmedString(object, "actorPersonId", "", issues);
  const actorPersonId = actorPersonIdText === undefined ? undefined : asPersonId(actorPersonIdText);

  // --- strategy ---
  const strategySeed = requireNullableSafeIntegerInRange(
    object,
    "strategySeed",
    0,
    UINT32_MAXIMUM,
    issues,
  );
  const strategyCandidateScores = validateStrategyCandidateScores(
    object["strategyCandidateScores"],
    issues,
  );
  const strategyTieBreakUsed = requireNullableBoolean(object, "strategyTieBreakUsed", issues);

  // --- requested / resolved / replacement (0.1.14 / fix5-fix2: requested is BattleAction only) ---
  const requested = validateBattleAction(object["requestedAction"]);
  let requestedAction: BattleAction | undefined;
  if (!requested.ok) {
    issues.push(...prefix(requested.issues, "/requestedAction"));
  } else {
    requestedAction = requested.value;
  }

  const resolved = validateResolvedBattleAction(object["resolvedAction"]);
  let resolvedAction: ResolvedBattleAction | undefined;
  if (!resolved.ok) {
    issues.push(...prefix(resolved.issues, "/resolvedAction"));
  } else {
    resolvedAction = resolved.value;
  }

  const replacement = validateBattleActionReplacementReason(object["replacementReason"]);
  let replacementReason: BattleActionReplacementReason | null | undefined;
  if (!replacement.ok) {
    issues.push(...prefix(replacement.issues, "/replacementReason"));
  } else {
    replacementReason = replacement.value;
  }

  // --- order ---
  let priority: number | null | undefined;
  if (!hasOwn(object, "priority")) {
    issues.push({
      path: "/priority",
      message: "required key is missing",
      expected: "2 | 1 | 0 | -1 | null",
    });
  } else if (object["priority"] === null) {
    priority = null;
  } else if (
    typeof object["priority"] === "number" &&
    (ACTION_PRIORITIES as readonly number[]).includes(object["priority"]) &&
    !Object.is(object["priority"], -0)
  ) {
    priority = object["priority"];
  } else {
    issues.push({
      path: "/priority",
      message: "priority must be 2 | 1 | 0 | -1 | null",
      actual: object["priority"],
      expected: "2 | 1 | 0 | -1 | null",
    });
  }
  const actionOrderScore = requireNullableSafeInteger(object, "actionOrderScore", issues);

  // --- range / movement ---
  const rangeBefore = requireBattleRangeField(object, "rangeBefore", issues);
  const rangeAfter = requireBattleRangeField(object, "rangeAfter", issues);
  const rangeShiftApplied = requireNullableBoolean(object, "rangeShiftApplied", issues);
  const rangeShiftBlock = requirePairedNullableSafeIntegers(
    object,
    "rangeShiftBlockChance",
    "rangeShiftBlockRoll",
    { minimum: 0, maximum: 100 },
    { minimum: 1, maximum: 100 },
    issues,
  );
  const movement = requirePairedNullableSafeIntegers(
    object,
    "movementChance",
    "movementRoll",
    { minimum: 0, maximum: 100 },
    undefined,
    issues,
  );

  let evadeDirection: EvadeDirection | null | undefined;
  if (!hasOwn(object, "evadeDirection")) {
    issues.push({
      path: "/evadeDirection",
      message: "required key is missing",
      expected: `${EVADE_DIRECTIONS.join(" | ")} | null`,
    });
  } else if (object["evadeDirection"] === null) {
    evadeDirection = null;
  } else if (
    typeof object["evadeDirection"] === "string" &&
    (EVADE_DIRECTIONS as readonly string[]).includes(object["evadeDirection"])
  ) {
    evadeDirection = object["evadeDirection"] as EvadeDirection;
  } else {
    issues.push({
      path: "/evadeDirection",
      message: "evadeDirection must be an EvadeDirection or null",
      actual: object["evadeDirection"],
      expected: `${EVADE_DIRECTIONS.join(" | ")} | null`,
    });
  }

  // --- durability / mental ---
  const actorDurabilityBefore = requireSafeIntegerAtLeast(
    object,
    "actorDurabilityBefore",
    "",
    0,
    issues,
  );
  const actorDurabilityAfter = requireSafeIntegerAtLeast(
    object,
    "actorDurabilityAfter",
    "",
    0,
    issues,
  );
  const actorMentalBefore = requireSafeIntegerAtLeast(object, "actorMentalBefore", "", 0, issues);
  const actorMentalAfter = requireSafeIntegerAtLeast(object, "actorMentalAfter", "", 0, issues);
  const targetDurabilityBefore = requireNullableNonNegativeSafeInteger(
    object,
    "targetDurabilityBefore",
    issues,
  );
  const targetDurabilityAfter = requireNullableNonNegativeSafeInteger(
    object,
    "targetDurabilityAfter",
    issues,
  );
  const targetMentalBefore = requireNullableNonNegativeSafeInteger(
    object,
    "targetMentalBefore",
    issues,
  );
  const targetMentalAfter = requireNullableNonNegativeSafeInteger(
    object,
    "targetMentalAfter",
    issues,
  );

  // --- flags ---
  const guardingBefore = requireBoolean(object, "guardingBefore", "", issues);
  const guardingAfter = requireBoolean(object, "guardingAfter", "", issues);
  const evadingBefore = requireBoolean(object, "evadingBefore", "", issues);
  const evadingAfter = requireBoolean(object, "evadingAfter", "", issues);
  const surrenderedAfter = requireBoolean(object, "surrenderedAfter", "", issues);
  const unableToContinueAfter = requireBoolean(object, "unableToContinueAfter", "", issues);
  const canActAfter = requireBoolean(object, "canActAfter", "", issues);

  // --- activation (all null or all non-null) ---
  const activationChance = requireNullableSafeIntegerInRange(
    object,
    "activationChance",
    5,
    100,
    issues,
  );
  const activationRoll = requireNullableSafeIntegerInRange(
    object,
    "activationRoll",
    1,
    100,
    issues,
  );
  const activationSucceeded = requireNullableBoolean(object, "activationSucceeded", issues);
  if (
    activationChance !== undefined &&
    activationRoll !== undefined &&
    activationSucceeded !== undefined
  ) {
    const nullCount =
      (activationChance === null ? 1 : 0) +
      (activationRoll === null ? 1 : 0) +
      (activationSucceeded === null ? 1 : 0);
    if (nullCount !== 0 && nullCount !== 3) {
      issues.push({
        path: "/activationChance",
        message:
          "activationChance, activationRoll, and activationSucceeded must all be null or all non-null",
        actual: {
          activationChance,
          activationRoll,
          activationSucceeded,
        },
        expected: "paired null correlation (triple)",
      });
    }
  }

  let activationFailureReason: string | null | undefined;
  if (!hasOwn(object, "activationFailureReason")) {
    issues.push({
      path: "/activationFailureReason",
      message: "required key is missing",
      expected: "non-empty trimmed string | null",
    });
  } else if (object["activationFailureReason"] === null) {
    activationFailureReason = null;
  } else if (typeof object["activationFailureReason"] !== "string") {
    issues.push({
      path: "/activationFailureReason",
      message: "activationFailureReason must be a non-empty trimmed string or null",
      actual: object["activationFailureReason"],
      expected: "non-empty trimmed string | null",
    });
  } else {
    const reasonText = object["activationFailureReason"];
    if (reasonText.length === 0 || reasonText !== reasonText.trim()) {
      issues.push({
        path: "/activationFailureReason",
        message: "activationFailureReason must be non-empty and trimmed when present",
        actual: reasonText,
        expected: "non-empty trimmed string | null",
      });
    } else {
      activationFailureReason = reasonText;
    }
  }
  if (activationSucceeded !== undefined && activationFailureReason !== undefined) {
    if (activationSucceeded === false && activationFailureReason === null) {
      issues.push({
        path: "/activationFailureReason",
        message: "activationFailureReason must be non-null when activationSucceeded is false",
        actual: null,
        expected: "non-empty trimmed string",
      });
    }
    if (activationSucceeded !== false && activationFailureReason !== null) {
      issues.push({
        path: "/activationFailureReason",
        message:
          "activationFailureReason must be null when activationSucceeded is true or activation was not attempted",
        actual: activationFailureReason,
        expected: "null",
      });
    }
  }

  // --- hit (all null or all non-null) ---
  const hitChance = requireNullableSafeIntegerInRange(object, "hitChance", 5, 95, issues);
  const hitRoll = requireNullableSafeIntegerInRange(object, "hitRoll", 1, 100, issues);
  const hit = requireNullableBoolean(object, "hit", issues);
  if (hitChance !== undefined && hitRoll !== undefined && hit !== undefined) {
    const nullCount =
      (hitChance === null ? 1 : 0) + (hitRoll === null ? 1 : 0) + (hit === null ? 1 : 0);
    if (nullCount !== 0 && nullCount !== 3) {
      issues.push({
        path: "/hitChance",
        message: "hitChance, hitRoll, and hit must all be null or all non-null",
        actual: { hitChance, hitRoll, hit },
        expected: "paired null correlation (triple)",
      });
    }
  }

  // --- damage ---
  const damageVariance = requireNullableNonNegativeSafeInteger(object, "damageVariance", issues);
  const damage = requireNullableNonNegativeSafeInteger(object, "damage", issues);

  // --- focus ---
  const focusPair = requirePairedNullableSafeIntegers(
    object,
    "focusBaseRecovery",
    "focusAppliedRecovery",
    { minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    { minimum: 0, maximum: Number.MAX_SAFE_INTEGER },
    issues,
  );
  if (
    focusPair !== undefined &&
    focusPair.left !== null &&
    resolvedAction !== undefined &&
    resolvedAction.kind !== "focus_mind"
  ) {
    issues.push({
      path: "/focusBaseRecovery",
      message: "focus recovery fields may be non-null only when resolvedAction.kind is focus_mind",
      actual: { kind: resolvedAction.kind, focusBaseRecovery: focusPair.left },
      expected: "null when resolvedAction is not focus_mind",
    });
  }

  // --- injury ---
  const injuryChance = requireNullableSafeIntegerInRange(
    object,
    "injuryChance",
    0,
    INJURY_CHANCE_MAXIMUM_PERCENT,
    issues,
  );
  const injuryRoll = requireNullableSafeIntegerInRange(object, "injuryRoll", 1, 100, issues);
  const majorInjury = requirePairedNullableSafeIntegers(
    object,
    "majorInjuryChance",
    "majorInjuryRoll",
    { minimum: 0, maximum: 100 },
    { minimum: 1, maximum: 100 },
    issues,
  );

  let injuryResult: InjuryResultLog | null | undefined;
  if (!hasOwn(object, "injuryResult")) {
    issues.push({
      path: "/injuryResult",
      message: "required key is missing",
      expected: "none | minor | major | null",
    });
  } else if (object["injuryResult"] === null) {
    injuryResult = null;
  } else if (
    typeof object["injuryResult"] === "string" &&
    (INJURY_RESULT_LOG_VALUES as readonly string[]).includes(object["injuryResult"])
  ) {
    injuryResult = object["injuryResult"] as InjuryResultLog;
  } else {
    issues.push({
      path: "/injuryResult",
      message: "injuryResult must be none | minor | major | null",
      actual: object["injuryResult"],
      expected: "none | minor | major | null",
    });
  }
  if (majorInjury !== undefined && injuryResult !== undefined) {
    const majorAllowed = injuryResult === "minor" || injuryResult === "major";
    if (majorInjury.left !== null && !majorAllowed) {
      issues.push({
        path: "/majorInjuryChance",
        message:
          "majorInjuryChance/majorInjuryRoll may be non-null only when injuryResult is minor or major",
        actual: { injuryResult, majorInjuryChance: majorInjury.left },
        expected: "null unless injuryResult is minor | major",
      });
    }
  }

  // --- consumption ---
  const inBattleConsumptionBefore = requireIntegerInRange(
    object,
    "inBattleConsumptionBefore",
    "",
    0,
    100,
    issues,
  );
  let consumptionDelta: number | undefined;
  if (!hasOwn(object, "inBattleConsumptionDelta")) {
    issues.push({
      path: "/inBattleConsumptionDelta",
      message: "required key is missing",
      expected: "safe integer",
    });
  } else {
    const deltaRaw = object["inBattleConsumptionDelta"];
    if (
      typeof deltaRaw !== "number" ||
      !Number.isSafeInteger(deltaRaw) ||
      Object.is(deltaRaw, -0)
    ) {
      issues.push({
        path: "/inBattleConsumptionDelta",
        message: "inBattleConsumptionDelta must be a safe integer",
        actual: deltaRaw,
        expected: "safe integer",
      });
    } else {
      consumptionDelta = deltaRaw;
    }
  }
  const inBattleConsumptionAfter = requireIntegerInRange(
    object,
    "inBattleConsumptionAfter",
    "",
    0,
    100,
    issues,
  );
  if (
    inBattleConsumptionBefore !== undefined &&
    consumptionDelta !== undefined &&
    inBattleConsumptionAfter !== undefined
  ) {
    const expectedAfter = clampInteger(inBattleConsumptionBefore + consumptionDelta, 0, 100);
    if (inBattleConsumptionAfter !== expectedAfter) {
      issues.push({
        path: "/inBattleConsumptionAfter",
        message:
          "inBattleConsumptionAfter must equal clamp(0, 100, inBattleConsumptionBefore + inBattleConsumptionDelta)",
        actual: inBattleConsumptionAfter,
        expected: String(expectedAfter),
      });
    }
  }

  // --- counters ---
  const passiveActionCountDelta = requireIntegerInRange(
    object,
    "passiveActionCountDelta",
    "",
    0,
    1,
    issues,
  );
  const invalidActionCountDeltaRaw = requireIntegerInRange(
    object,
    "invalidActionCountDelta",
    "",
    0,
    1,
    issues,
  );
  let invalidActionCountDelta: 0 | 1 | undefined;
  if (invalidActionCountDeltaRaw === 0 || invalidActionCountDeltaRaw === 1) {
    invalidActionCountDelta = invalidActionCountDeltaRaw;
    if (replacementReason !== undefined && replacementReason !== null) {
      const expectedDelta = invalidActionCountDeltaForReplacementReason(replacementReason);
      if (invalidActionCountDelta !== expectedDelta) {
        issues.push({
          path: "/invalidActionCountDelta",
          message:
            "invalidActionCountDelta must match invalidActionCountDeltaForReplacementReason(replacementReason)",
          actual: invalidActionCountDelta,
          expected: String(expectedDelta),
        });
      }
    }
  }

  // --- advantage ---
  let advantageTurnAwardedTo: BattleSide | null | undefined;
  if (!hasOwn(object, "advantageTurnAwardedTo")) {
    issues.push({
      path: "/advantageTurnAwardedTo",
      message: "required key is missing",
      expected: "sideA | sideB | null",
    });
  } else if (object["advantageTurnAwardedTo"] === null) {
    advantageTurnAwardedTo = null;
  } else if (isBattleSide(object["advantageTurnAwardedTo"])) {
    advantageTurnAwardedTo = object["advantageTurnAwardedTo"];
  } else {
    issues.push({
      path: "/advantageTurnAwardedTo",
      message: "advantageTurnAwardedTo must be sideA | sideB | null",
      actual: object["advantageTurnAwardedTo"],
      expected: "sideA | sideB | null",
    });
  }

  // --- next modifiers ---
  const nextHitModifierBefore = requireInteger(object, "nextHitModifierBefore", "", issues);
  const nextHitModifierAfter = requireInteger(object, "nextHitModifierAfter", "", issues);
  const nextActivationModifierBefore = requireInteger(
    object,
    "nextActivationModifierBefore",
    "",
    issues,
  );
  const nextActivationModifierAfter = requireInteger(
    object,
    "nextActivationModifierAfter",
    "",
    issues,
  );

  // --- rng ---
  const rngStateBefore = requireRngStateField(object, "rngStateBefore", issues);
  const rngStateAfter = requireRngStateField(object, "rngStateAfter", issues);

  // --- semantic correlations (resolvedAction-driven) ---
  if (
    resolvedAction !== undefined &&
    movement !== undefined &&
    activationChance !== undefined &&
    activationRoll !== undefined &&
    activationSucceeded !== undefined &&
    activationFailureReason !== undefined &&
    hitChance !== undefined &&
    hitRoll !== undefined &&
    hit !== undefined &&
    damageVariance !== undefined &&
    damage !== undefined &&
    injuryChance !== undefined &&
    injuryRoll !== undefined &&
    majorInjury !== undefined &&
    injuryResult !== undefined &&
    focusPair !== undefined &&
    evadeDirection !== undefined
  ) {
    const isMovement = resolvedAction.kind === "approach" || resolvedAction.kind === "retreat";
    if (isMovement) {
      if (movement.left === null || movement.right === null) {
        issues.push({
          path: "/movementChance",
          message: "approach/retreat ActionLog requires non-null movementChance and movementRoll",
          actual: { movementChance: movement.left, movementRoll: movement.right },
        });
      }
    } else if (movement.left !== null || movement.right !== null) {
      issues.push({
        path: "/movementChance",
        message: "non-movement ActionLog requires movementChance and movementRoll to be null",
        actual: { movementChance: movement.left, movementRoll: movement.right },
      });
    }

    if (resolvedAction.kind === "use_technique") {
      if (activationChance === null || activationRoll === null || activationSucceeded === null) {
        issues.push({
          path: "/activationChance",
          message:
            "use_technique requires non-null activationChance, activationRoll, and activationSucceeded",
        });
      }
    } else if (
      activationChance !== null ||
      activationRoll !== null ||
      activationSucceeded !== null ||
      activationFailureReason !== null
    ) {
      issues.push({
        path: "/activationChance",
        message: "non-use_technique ActionLog requires all activation fields to be null",
      });
    }

    if (activationSucceeded === false) {
      if (activationFailureReason === null) {
        issues.push({
          path: "/activationFailureReason",
          message: "activationFailureReason must be non-null when activationSucceeded is false",
        });
      }
      if (
        hitChance !== null ||
        hitRoll !== null ||
        hit !== null ||
        damageVariance !== null ||
        damage !== null ||
        injuryChance !== null ||
        injuryRoll !== null ||
        majorInjury.left !== null ||
        majorInjury.right !== null ||
        injuryResult !== null
      ) {
        issues.push({
          path: "/hitChance",
          message:
            "activation failure requires hit/damage/injury fields to be null (no subsequent RNG)",
        });
      }
    }
    if (activationSucceeded === true && activationFailureReason !== null) {
      issues.push({
        path: "/activationFailureReason",
        message: "activationFailureReason must be null when activationSucceeded is true",
      });
    }

    const hitJudged =
      resolvedAction.kind === "basic_attack" ||
      (resolvedAction.kind === "use_technique" && activationSucceeded === true);
    if (hitJudged) {
      if (hitChance === null || hitRoll === null || hit === null) {
        issues.push({
          path: "/hitChance",
          message: "hit judgment requires non-null hitChance, hitRoll, and hit",
        });
      }
    } else if (hitChance !== null || hitRoll !== null || hit !== null) {
      issues.push({
        path: "/hitChance",
        message: "when hit judgment is not performed, hitChance/hitRoll/hit must be null",
      });
    }

    if (hit === true) {
      if (damageVariance === null || damage === null) {
        issues.push({
          path: "/damage",
          message: "hit=true requires non-null damageVariance and damage",
        });
      }
      if (injuryChance === null || injuryResult === null) {
        issues.push({
          path: "/injuryChance",
          message: "hit=true requires non-null injuryChance and injuryResult",
        });
      } else if (injuryChance === 0) {
        if (
          injuryRoll !== null ||
          injuryResult !== "none" ||
          majorInjury.left !== null ||
          majorInjury.right !== null
        ) {
          issues.push({
            path: "/injuryRoll",
            message:
              "injuryChance=0 requires injuryRoll=null, injuryResult=none, and major fields null",
          });
        }
      } else {
        if (injuryRoll === null) {
          issues.push({
            path: "/injuryRoll",
            message: "injuryChance>0 requires non-null injuryRoll",
          });
        }
        if (injuryResult === "none") {
          if (majorInjury.left !== null || majorInjury.right !== null) {
            issues.push({
              path: "/majorInjuryChance",
              message: "injuryResult=none requires majorInjuryChance/Roll to be null",
            });
          }
        } else if (injuryResult === "minor" || injuryResult === "major") {
          if (majorInjury.left === null || majorInjury.right === null) {
            issues.push({
              path: "/majorInjuryChance",
              message:
                "injuryResult minor|major requires non-null majorInjuryChance and majorInjuryRoll",
            });
          }
        }
      }
    } else {
      if (damageVariance !== null || damage !== null) {
        issues.push({
          path: "/damage",
          message: "hit!=true requires damageVariance and damage to be null",
        });
      }
      if (
        injuryChance !== null ||
        injuryRoll !== null ||
        majorInjury.left !== null ||
        majorInjury.right !== null ||
        injuryResult !== null
      ) {
        issues.push({
          path: "/injuryChance",
          message: "hit!=true requires all injury fields to be null",
        });
      }
    }

    if (resolvedAction.kind === "focus_mind") {
      if (focusPair.left === null || focusPair.right === null) {
        issues.push({
          path: "/focusBaseRecovery",
          message: "focus_mind requires non-null focusBaseRecovery and focusAppliedRecovery",
        });
      }
    } else if (focusPair.left !== null || focusPair.right !== null) {
      issues.push({
        path: "/focusBaseRecovery",
        message: "non-focus_mind ActionLog requires focus recovery fields to be null",
      });
    }

    if (resolvedAction.kind === "evade") {
      if (evadeDirection !== resolvedAction.direction) {
        issues.push({
          path: "/evadeDirection",
          message: "evadeDirection must equal resolvedAction.direction",
          actual: evadeDirection,
          expected: resolvedAction.direction,
        });
      }
    } else if (evadeDirection !== null) {
      issues.push({
        path: "/evadeDirection",
        message: "evadeDirection must be null unless resolvedAction is evade",
        actual: evadeDirection,
      });
    }
  }

  if (
    actionSequence === undefined ||
    turnNumber === undefined ||
    !Number.isSafeInteger(object["turnNumber"]) ||
    actorSide === undefined ||
    actorPersonId === undefined ||
    strategySeed === undefined ||
    strategyCandidateScores === undefined ||
    strategyTieBreakUsed === undefined ||
    requestedAction === undefined ||
    resolvedAction === undefined ||
    replacementReason === undefined ||
    priority === undefined ||
    actionOrderScore === undefined ||
    rangeBefore === undefined ||
    rangeAfter === undefined ||
    rangeShiftApplied === undefined ||
    rangeShiftBlock === undefined ||
    movement === undefined ||
    evadeDirection === undefined ||
    actorDurabilityBefore === undefined ||
    actorDurabilityAfter === undefined ||
    actorMentalBefore === undefined ||
    actorMentalAfter === undefined ||
    targetDurabilityBefore === undefined ||
    targetDurabilityAfter === undefined ||
    targetMentalBefore === undefined ||
    targetMentalAfter === undefined ||
    guardingBefore === undefined ||
    guardingAfter === undefined ||
    evadingBefore === undefined ||
    evadingAfter === undefined ||
    activationChance === undefined ||
    activationRoll === undefined ||
    activationSucceeded === undefined ||
    activationFailureReason === undefined ||
    hitChance === undefined ||
    hitRoll === undefined ||
    hit === undefined ||
    damageVariance === undefined ||
    damage === undefined ||
    focusPair === undefined ||
    injuryChance === undefined ||
    injuryRoll === undefined ||
    majorInjury === undefined ||
    injuryResult === undefined ||
    inBattleConsumptionBefore === undefined ||
    consumptionDelta === undefined ||
    inBattleConsumptionAfter === undefined ||
    passiveActionCountDelta === undefined ||
    invalidActionCountDelta === undefined ||
    advantageTurnAwardedTo === undefined ||
    nextHitModifierBefore === undefined ||
    nextHitModifierAfter === undefined ||
    nextActivationModifierBefore === undefined ||
    nextActivationModifierAfter === undefined ||
    surrenderedAfter === undefined ||
    unableToContinueAfter === undefined ||
    canActAfter === undefined ||
    rngStateBefore === undefined ||
    rngStateAfter === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const validated: BattleActionLog = {
    actionSequence,
    turnNumber,
    actorSide,
    actorPersonId,
    strategySeed,
    strategyCandidateScores,
    strategyTieBreakUsed,
    requestedAction,
    resolvedAction,
    replacementReason,
    priority,
    actionOrderScore,
    rangeBefore,
    rangeAfter,
    rangeShiftApplied,
    rangeShiftBlockChance: rangeShiftBlock.left,
    rangeShiftBlockRoll: rangeShiftBlock.right,
    movementChance: movement.left,
    movementRoll: movement.right,
    evadeDirection,
    actorDurabilityBefore,
    actorDurabilityAfter,
    actorMentalBefore,
    actorMentalAfter,
    targetDurabilityBefore,
    targetDurabilityAfter,
    targetMentalBefore,
    targetMentalAfter,
    guardingBefore,
    guardingAfter,
    evadingBefore,
    evadingAfter,
    activationChance,
    activationRoll,
    activationSucceeded,
    activationFailureReason,
    hitChance,
    hitRoll,
    hit,
    damageVariance,
    damage,
    focusBaseRecovery: focusPair.left,
    focusAppliedRecovery: focusPair.right,
    injuryChance,
    injuryRoll,
    majorInjuryChance: majorInjury.left,
    majorInjuryRoll: majorInjury.right,
    injuryResult,
    inBattleConsumptionBefore,
    inBattleConsumptionDelta: consumptionDelta,
    inBattleConsumptionAfter,
    passiveActionCountDelta,
    invalidActionCountDelta,
    advantageTurnAwardedTo,
    nextHitModifierBefore,
    nextHitModifierAfter,
    nextActivationModifierBefore,
    nextActivationModifierAfter,
    surrenderedAfter,
    unableToContinueAfter,
    canActAfter,
    rngStateBefore,
    rngStateAfter,
  };

  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated)));
}
