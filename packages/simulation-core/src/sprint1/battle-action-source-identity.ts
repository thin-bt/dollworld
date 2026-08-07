/**
 * `BattleActionSourceIdentity` (11 mini-spec §4.2 / S01-005).
 *
 * The action supplier is fixed as part of the battle start input so that a
 * different strategy version, strategy config, or action script always changes
 * `battleInputHash`. Both union members carry the same seven canonical keys; the
 * inactive branch's keys are explicit `null` rather than omitted, so the
 * canonical JSON of an identity is never ambiguous.
 *
 * Function references, memory addresses, and object insertion order are never
 * part of an identity (11 §4.2).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
  DEFAULT_BATTLE_STRATEGY_ID,
} from "./constants.js";
import {
  SHA256_HEX_PATTERN,
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const BATTLE_ACTION_SOURCE_KINDS = ["default_strategy", "scripted_actions"] as const;
export type BattleActionSourceKind = (typeof BATTLE_ACTION_SOURCE_KINDS)[number];

export const BATTLE_ACTION_SOURCE_IDENTITY_KEYS = [
  "schemaVersion",
  "kind",
  "strategyId",
  "strategyVersion",
  "strategyConfigHash",
  "scriptFormatVersion",
  "actionScriptHash",
] as const;

export type DefaultStrategyActionSourceIdentity = {
  schemaVersion: typeof BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION;
  kind: "default_strategy";
  strategyId: typeof DEFAULT_BATTLE_STRATEGY_ID;
  strategyVersion: string;
  strategyConfigHash: string;
  scriptFormatVersion: null;
  actionScriptHash: null;
};

export type ScriptedActionsSourceIdentity = {
  schemaVersion: typeof BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION;
  kind: "scripted_actions";
  strategyId: null;
  strategyVersion: null;
  strategyConfigHash: null;
  scriptFormatVersion: typeof BATTLE_ACTION_SCRIPT_FORMAT_VERSION;
  actionScriptHash: string;
};

export type BattleActionSourceIdentity =
  DefaultStrategyActionSourceIdentity | ScriptedActionsSourceIdentity;

function requireNullValue(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): boolean {
  if (!hasOwn(object, key)) {
    issues.push({ path: `/${key}`, message: "required key is missing", expected: "null" });
    return false;
  }
  if (object[key] !== null) {
    issues.push({
      path: `/${key}`,
      message: "key must be explicit null for this BattleActionSourceIdentity kind",
      actual: object[key],
      expected: "null",
    });
    return false;
  }
  return true;
}

function requireSha256Hex(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): string | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    issues.push({
      path: `/${key}`,
      message: "value must be a 64 lowercase hex character SHA-256 digest",
      actual: value,
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  return value;
}

export function validateBattleActionSourceIdentity(
  input: unknown,
): ValidationResult<BattleActionSourceIdentity> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleActionSourceIdentity must be a plain object",
              actual: input,
              expected: "BattleActionSourceIdentity",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_ACTION_SOURCE_IDENTITY_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
    issues,
  );

  const rawKind = object["kind"];
  if (
    typeof rawKind !== "string" ||
    !(BATTLE_ACTION_SOURCE_KINDS as readonly string[]).includes(rawKind)
  ) {
    issues.push({
      path: "/kind",
      message: "kind must be default_strategy or scripted_actions",
      actual: rawKind,
      expected: BATTLE_ACTION_SOURCE_KINDS.join(" | "),
    });
    return failure(issues);
  }

  if (rawKind === "default_strategy") {
    const strategyId = requireLiteralString(
      object,
      "strategyId",
      "",
      DEFAULT_BATTLE_STRATEGY_ID,
      issues,
    );
    const strategyVersion = requireNonEmptyTrimmedString(object, "strategyVersion", "", issues);
    const strategyConfigHash = requireSha256Hex(object, "strategyConfigHash", issues);
    const scriptFormatVersionIsNull = requireNullValue(object, "scriptFormatVersion", issues);
    const actionScriptHashIsNull = requireNullValue(object, "actionScriptHash", issues);

    if (
      schemaVersion === undefined ||
      strategyId === undefined ||
      strategyVersion === undefined ||
      strategyConfigHash === undefined ||
      !scriptFormatVersionIsNull ||
      !actionScriptHashIsNull ||
      issues.length > 0
    ) {
      return failure(issues);
    }

    return success(
      deepFreezePlainJson({
        schemaVersion,
        kind: "default_strategy" as const,
        strategyId,
        strategyVersion,
        strategyConfigHash,
        scriptFormatVersion: null,
        actionScriptHash: null,
      }),
    );
  }

  const strategyIdIsNull = requireNullValue(object, "strategyId", issues);
  const strategyVersionIsNull = requireNullValue(object, "strategyVersion", issues);
  const strategyConfigHashIsNull = requireNullValue(object, "strategyConfigHash", issues);
  const scriptFormatVersion = requireLiteralString(
    object,
    "scriptFormatVersion",
    "",
    BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
    issues,
  );
  const actionScriptHash = requireSha256Hex(object, "actionScriptHash", issues);

  if (
    schemaVersion === undefined ||
    !strategyIdIsNull ||
    !strategyVersionIsNull ||
    !strategyConfigHashIsNull ||
    scriptFormatVersion === undefined ||
    actionScriptHash === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion,
      kind: "scripted_actions" as const,
      strategyId: null,
      strategyVersion: null,
      strategyConfigHash: null,
      scriptFormatVersion,
      actionScriptHash,
    }),
  );
}

export function cloneBattleActionSourceIdentity(
  input: unknown,
): ValidationResult<BattleActionSourceIdentity> {
  const validated = validateBattleActionSourceIdentity(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeBattleActionSourceIdentity(
  input: unknown,
): ValidationResult<BattleActionSourceIdentity> {
  return validateBattleActionSourceIdentity(input);
}

/**
 * 11 §4.2: the standard WorldEngine run declares `strategyVersion` from
 * `RunRuleSnapshot.defaultBattleStrategyVersion` and `strategyConfigHash` from
 * `RunRuleSnapshot.sprint1ConfigHash` — never a private partial config hash.
 */
export function createDefaultStrategyActionSourceIdentity(input: {
  strategyVersion: string;
  strategyConfigHash: string;
}): ValidationResult<BattleActionSourceIdentity> {
  return validateBattleActionSourceIdentity({
    schemaVersion: BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
    kind: "default_strategy",
    strategyId: DEFAULT_BATTLE_STRATEGY_ID,
    strategyVersion: input.strategyVersion,
    strategyConfigHash: input.strategyConfigHash,
    scriptFormatVersion: null,
    actionScriptHash: null,
  });
}

/** Only for single-battle tests, fixture replay, and audit APIs (11 §4.2). */
export function createScriptedActionsSourceIdentity(input: {
  actionScriptHash: string;
}): ValidationResult<BattleActionSourceIdentity> {
  return validateBattleActionSourceIdentity({
    schemaVersion: BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
    kind: "scripted_actions",
    strategyId: null,
    strategyVersion: null,
    strategyConfigHash: null,
    scriptFormatVersion: BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
    actionScriptHash: input.actionScriptHash,
  });
}
