/**
 * BattleAction / ResolvedBattleAction shapes and replacement reasons
 * (12 mini-spec / S1-SPEC-0.1.14 turn input contracts).
 *
 * Structure validators only — no turn Resolver, no DefaultBattleStrategy.
 */
import { asTechniqueId } from "../ids.js";
import type { TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireNonEmptyTrimmedString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const BATTLE_ACTION_REPLACEMENT_REASONS = [
  "unknown_technique",
  "unlearned_technique",
  "requirements_not_met",
  "insufficient_mental",
  "unusable_range",
  "unable_to_act",
  "opponent_ended_battle",
] as const;

export type BattleActionReplacementReason = (typeof BATTLE_ACTION_REPLACEMENT_REASONS)[number];

/** Reasons that increment invalidActionCountDelta by 1. */
export const INVALID_ACTION_COUNT_REPLACEMENT_REASONS = [
  "unknown_technique",
  "unlearned_technique",
  "requirements_not_met",
  "insufficient_mental",
  "unusable_range",
  "unable_to_act",
] as const;

export const BASIC_ATTACK_PROFILES = ["unarmed", "sword", "magic"] as const;
export type BattleBasicAttackProfile = (typeof BASIC_ATTACK_PROFILES)[number];

export const EVADE_DIRECTIONS = ["hold", "approach_one", "retreat_one"] as const;
export type EvadeDirection = (typeof EVADE_DIRECTIONS)[number];

export const BATTLE_ACTION_KINDS = [
  "use_technique",
  "basic_attack",
  "basic_defense",
  "evade",
  "approach",
  "retreat",
  "focus_mind",
  "surrender",
] as const;

export type BattleActionKind = (typeof BATTLE_ACTION_KINDS)[number];

export type UseTechniqueAction = { kind: "use_technique"; techniqueId: TechniqueId };
export type BasicAttackAction = { kind: "basic_attack"; profile: BattleBasicAttackProfile };
export type BasicDefenseAction = { kind: "basic_defense" };
export type EvadeAction = { kind: "evade"; direction: EvadeDirection };
export type ApproachAction = { kind: "approach" };
export type RetreatAction = { kind: "retreat" };
export type FocusMindAction = { kind: "focus_mind" };
export type SurrenderAction = { kind: "surrender" };

export type BattleAction =
  | UseTechniqueAction
  | BasicAttackAction
  | BasicDefenseAction
  | EvadeAction
  | ApproachAction
  | RetreatAction
  | FocusMindAction
  | SurrenderAction;

export type NoActionResolved = { kind: "no_action" };
export type ResolvedBattleAction = BattleAction | NoActionResolved;

export function isBattleActionReplacementReason(
  value: unknown,
): value is BattleActionReplacementReason {
  return (
    typeof value === "string" &&
    (BATTLE_ACTION_REPLACEMENT_REASONS as readonly string[]).includes(value)
  );
}

export function invalidActionCountDeltaForReplacementReason(
  reason: BattleActionReplacementReason | null,
): 0 | 1 {
  if (reason === null) {
    return 0;
  }
  if (reason === "opponent_ended_battle") {
    return 0;
  }
  if ((INVALID_ACTION_COUNT_REPLACEMENT_REASONS as readonly string[]).includes(reason)) {
    return 1;
  }
  return 0;
}

function requireEnumLiteral<T extends string>(
  object: Record<string, unknown>,
  key: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    issues.push({
      path: `/${key}`,
      message: `value must be one of the fixed ${key} values`,
      actual: value,
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  return value as T;
}

/**
 * Validates a requested BattleAction (script / strategy / log requestedAction).
 * `no_action` is rejected here — it is ResolvedBattleAction-only.
 */
export function validateBattleAction(input: unknown): ValidationResult<BattleAction> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleAction must be a plain object",
              actual: input,
              expected: "BattleAction",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  if (!hasOwn(object, "kind") || typeof object["kind"] !== "string") {
    issues.push({
      path: "/kind",
      message: "kind must be a BattleAction kind string",
      actual: object["kind"],
      expected: BATTLE_ACTION_KINDS.join(" | "),
    });
    return failure(issues);
  }
  const kind = object["kind"];
  if (kind === "no_action") {
    return failure([
      {
        path: "/kind",
        message:
          "no_action is ResolvedBattleAction-only and cannot appear as a requested BattleAction",
        actual: kind,
        expected: BATTLE_ACTION_KINDS.join(" | "),
      },
    ]);
  }
  if (!(BATTLE_ACTION_KINDS as readonly string[]).includes(kind)) {
    issues.push({
      path: "/kind",
      message: "kind must be one of the fixed BattleAction kinds",
      actual: kind,
      expected: BATTLE_ACTION_KINDS.join(" | "),
    });
    return failure(issues);
  }

  switch (kind as BattleActionKind) {
    case "use_technique": {
      rejectUnknownKeys(object, ["kind", "techniqueId"] as const, "", issues);
      const techniqueIdText = requireNonEmptyTrimmedString(object, "techniqueId", "", issues);
      if (techniqueIdText === undefined || issues.length > 0) {
        return failure(issues);
      }
      return success(
        deepFreezePlainJson({ kind: "use_technique", techniqueId: asTechniqueId(techniqueIdText) }),
      );
    }
    case "basic_attack": {
      rejectUnknownKeys(object, ["kind", "profile"] as const, "", issues);
      const profile = requireEnumLiteral(object, "profile", BASIC_ATTACK_PROFILES, issues);
      if (profile === undefined || issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "basic_attack", profile }));
    }
    case "evade": {
      rejectUnknownKeys(object, ["kind", "direction"] as const, "", issues);
      const direction = requireEnumLiteral(object, "direction", EVADE_DIRECTIONS, issues);
      if (direction === undefined || issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "evade", direction }));
    }
    case "basic_defense": {
      rejectUnknownKeys(object, ["kind"] as const, "", issues);
      if (issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "basic_defense" }));
    }
    case "approach": {
      rejectUnknownKeys(object, ["kind"] as const, "", issues);
      if (issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "approach" }));
    }
    case "retreat": {
      rejectUnknownKeys(object, ["kind"] as const, "", issues);
      if (issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "retreat" }));
    }
    case "focus_mind": {
      rejectUnknownKeys(object, ["kind"] as const, "", issues);
      if (issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "focus_mind" }));
    }
    case "surrender": {
      rejectUnknownKeys(object, ["kind"] as const, "", issues);
      if (issues.length > 0) {
        return failure(issues);
      }
      return success(deepFreezePlainJson({ kind: "surrender" }));
    }
  }
}

/**
 * Validates ResolvedBattleAction including `no_action`.
 */
export function validateResolvedBattleAction(
  input: unknown,
): ValidationResult<ResolvedBattleAction> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "ResolvedBattleAction must be a plain object",
              actual: input,
              expected: "ResolvedBattleAction",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  if (hasOwn(object, "kind") && object["kind"] === "no_action") {
    rejectUnknownKeys(object, ["kind"] as const, "", issues);
    if (issues.length > 0) {
      return failure(issues);
    }
    return success(deepFreezePlainJson({ kind: "no_action" }));
  }
  return validateBattleAction(input);
}

export function validateBattleActionReplacementReason(
  input: unknown,
): ValidationResult<BattleActionReplacementReason | null> {
  if (input === null) {
    return success(null);
  }
  if (input === "") {
    return failure([
      {
        path: "",
        message:
          "replacementReason must not be an empty string; use null when there is no replacement",
        actual: input,
        expected: `${BATTLE_ACTION_REPLACEMENT_REASONS.join(" | ")} | null`,
      },
    ]);
  }
  if (!isBattleActionReplacementReason(input)) {
    return failure([
      {
        path: "",
        message:
          "replacementReason must be one of the fixed BattleActionReplacementReason values or null",
        actual: input,
        expected: `${BATTLE_ACTION_REPLACEMENT_REASONS.join(" | ")} | null`,
      },
    ]);
  }
  return success(input);
}
