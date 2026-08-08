/**
 * BattleActionsSource validators (DefaultBattleStrategySource | ScriptedActionSource)
 * (12 §2 / S01-006).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateBattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireNonEmptyTrimmedString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const DEFAULT_BATTLE_STRATEGY_SOURCE_KEYS = ["identity"] as const;
export const SCRIPTED_ACTION_SOURCE_KEYS = ["identity", "canonicalScript"] as const;

export type DefaultBattleStrategySource = {
  identity: Extract<BattleActionSourceIdentity, { kind: "default_strategy" }>;
};

export type ScriptedActionSource = {
  identity: Extract<BattleActionSourceIdentity, { kind: "scripted_actions" }>;
  canonicalScript: string;
};

export type BattleActionsSource = DefaultBattleStrategySource | ScriptedActionSource;

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

export function validateDefaultBattleStrategySource(
  input: unknown,
): ValidationResult<DefaultBattleStrategySource> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "DefaultBattleStrategySource must be a plain object",
              actual: input,
              expected: "{ identity }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, DEFAULT_BATTLE_STRATEGY_SOURCE_KEYS, "", issues);
  const identity = validateBattleActionSourceIdentity(object["identity"]);
  if (!identity.ok) {
    return failure(prefix(identity.issues, "/identity"));
  }
  if (identity.value.kind !== "default_strategy") {
    return failure([
      {
        path: "/identity/kind",
        message: "DefaultBattleStrategySource requires identity.kind=default_strategy",
        actual: identity.value.kind,
        expected: "default_strategy",
      },
    ]);
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(deepFreezePlainJson({ identity: identity.value }));
}

export function validateScriptedActionSource(
  input: unknown,
): ValidationResult<ScriptedActionSource> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "ScriptedActionSource must be a plain object",
              actual: input,
              expected: "{ identity, canonicalScript }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SCRIPTED_ACTION_SOURCE_KEYS, "", issues);
  const identity = validateBattleActionSourceIdentity(object["identity"]);
  if (!identity.ok) {
    issues.push(...prefix(identity.issues, "/identity"));
  } else if (identity.value.kind !== "scripted_actions") {
    issues.push({
      path: "/identity/kind",
      message: "ScriptedActionSource requires identity.kind=scripted_actions",
      actual: identity.value.kind,
      expected: "scripted_actions",
    });
  }
  const canonicalScript = requireNonEmptyTrimmedString(object, "canonicalScript", "", issues);
  if (
    !identity.ok ||
    identity.value.kind !== "scripted_actions" ||
    canonicalScript === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }
  return success(
    deepFreezePlainJson({
      identity: identity.value,
      canonicalScript,
    }),
  );
}

/**
 * Hostile-input ActionsSource validator. Rejects callbacks / non-plain objects /
 * unknown kinds. Does not parse the script body (Phase B / resolve does).
 */
export function validateBattleActionsSource(input: unknown): ValidationResult<BattleActionsSource> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleActionsSource must be a plain object",
              actual: input,
              expected: "DefaultBattleStrategySource | ScriptedActionSource",
            },
          ],
    );
  }
  if (!hasOwn(object, "identity")) {
    return failure([
      {
        path: "/identity",
        message: "required key is missing",
        expected: "BattleActionSourceIdentity",
      },
    ]);
  }
  const identity = validateBattleActionSourceIdentity(object["identity"]);
  if (!identity.ok) {
    return failure(prefix(identity.issues, "/identity"));
  }
  if (identity.value.kind === "default_strategy") {
    return validateDefaultBattleStrategySource(input);
  }
  return validateScriptedActionSource(input);
}
