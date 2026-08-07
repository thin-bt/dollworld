/**
 * `battle-action-script-0.1.0` structure, canonical string, and turn/side lookup
 * (11 / 12 mini-specs / S1-SPEC-0.1.14). Structure validators only.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateBattleAction } from "./battle-action.js";
import type { BattleAction } from "./battle-action.js";
import { BATTLE_ACTION_SCRIPT_FORMAT_VERSION } from "./constants.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireLiteralString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";

export const BATTLE_ACTION_SCRIPT_KEYS = ["scriptFormatVersion", "turns"] as const;
export const BATTLE_ACTION_SCRIPT_TURN_KEYS = ["turnNumber", "sideA", "sideB"] as const;

/** Fixed Sprint 1 maxTurns=20 all-basic_defense fixture (S1-SPEC-0.1.14). */
export const FIXED_BASIC_DEFENSE_ACTION_SCRIPT_BYTE_LENGTH = 1733 as const;
export const FIXED_BASIC_DEFENSE_ACTION_SCRIPT_SHA256 =
  "67abb9d717f4ae6a21650d16e9b7da3e166fdfc1d89616f6342e258595e7cf6f" as const;

export type BattleActionScriptTurn = {
  turnNumber: number;
  sideA: BattleAction;
  sideB: BattleAction;
};

export type BattleActionScript = {
  scriptFormatVersion: typeof BATTLE_ACTION_SCRIPT_FORMAT_VERSION;
  turns: readonly BattleActionScriptTurn[];
};

export type ScriptedActionSource = {
  identity: {
    kind: "scripted_actions";
    scriptFormatVersion: typeof BATTLE_ACTION_SCRIPT_FORMAT_VERSION;
    actionScriptHash: string;
  };
  canonicalScript: string;
};

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

function validateBattleActionScriptTurn(
  input: unknown,
  expectedTurnNumber: number,
  pathPrefix: string,
): ValidationResult<BattleActionScriptTurn> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    if (issues.length === 0) {
      issues.push({
        path: "",
        message: "BattleActionScriptTurn must be a plain object",
        actual: input,
        expected: "{ turnNumber, sideA, sideB }",
      });
    }
    return failure(prefix(issues, pathPrefix));
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_ACTION_SCRIPT_TURN_KEYS, "", issues);
  const turnNumber = requireIntegerInRange(
    object,
    "turnNumber",
    "",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  const sideA = validateBattleAction(object["sideA"]);
  if (!sideA.ok) {
    issues.push(...prefix(sideA.issues, "/sideA"));
  }
  const sideB = validateBattleAction(object["sideB"]);
  if (!sideB.ok) {
    issues.push(...prefix(sideB.issues, "/sideB"));
  }
  if (turnNumber === undefined || !sideA.ok || !sideB.ok || issues.length > 0) {
    return failure(prefix(issues, pathPrefix));
  }
  if (turnNumber !== expectedTurnNumber) {
    return failure([
      {
        path: `${pathPrefix}/turnNumber`,
        message: "turnNumber must equal the 1-based contiguous index in turns",
        actual: turnNumber,
        expected: String(expectedTurnNumber),
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      turnNumber,
      sideA: sideA.value,
      sideB: sideB.value,
    }),
  );
}

/**
 * Structural BattleActionScript validation for a declared expectedMaxTurns.
 * Does not hash; does not interpret beyond structure.
 */
export function validateBattleActionScript(
  input: unknown,
  expectedMaxTurns: number,
): ValidationResult<BattleActionScript> {
  const issues: ValidationIssue[] = [];
  if (!Number.isInteger(expectedMaxTurns) || expectedMaxTurns < 1) {
    return failure([
      {
        path: "/expectedMaxTurns",
        message: "expectedMaxTurns must be a positive integer",
        actual: expectedMaxTurns,
        expected: "integer >= 1",
      },
    ]);
  }
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    if (issues.length === 0) {
      issues.push({
        path: "",
        message: "BattleActionScript must be a plain object",
        actual: input,
        expected: "BattleActionScript",
      });
    }
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_ACTION_SCRIPT_KEYS, "", issues);
  const scriptFormatVersion = requireLiteralString(
    object,
    "scriptFormatVersion",
    "",
    BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
    issues,
  );
  const rawTurns = snapshotDenseArrayOrFail(object["turns"], "/turns", issues);
  if (scriptFormatVersion === undefined || rawTurns === undefined || issues.length > 0) {
    return failure(issues);
  }
  if (rawTurns.length !== expectedMaxTurns) {
    return failure([
      {
        path: "/turns",
        message:
          "turns.length must equal expectedMaxTurns (RunRuleSnapshot.sprint1Config.battle.maxTurns)",
        actual: rawTurns.length,
        expected: String(expectedMaxTurns),
      },
    ]);
  }

  const turns: BattleActionScriptTurn[] = [];
  for (let index = 0; index < rawTurns.length; index += 1) {
    const expectedTurnNumber = index + 1;
    const turn = validateBattleActionScriptTurn(
      rawTurns[index],
      expectedTurnNumber,
      `/turns/${String(index)}`,
    );
    if (!turn.ok) {
      issues.push(...turn.issues);
      continue;
    }
    turns.push(turn.value);
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(
    deepFreezePlainJson({
      scriptFormatVersion,
      turns,
    }),
  );
}

export function battleActionScriptToCanonicalScript(script: BattleActionScript): string {
  return toCanonicalJson(script);
}

export function computeActionScriptHash(
  canonicalScript: string,
  provider: Sha256Provider,
): ValidationResult<string> {
  if (typeof canonicalScript !== "string" || canonicalScript.length === 0) {
    return failure([
      {
        path: "/canonicalScript",
        message: "canonicalScript must be a non-empty UTF-8 JSON string",
        actual: canonicalScript,
        expected: "non-empty string",
      },
    ]);
  }
  return safeHashUtf8(provider, canonicalScript, "/actionScriptHash");
}

/**
 * Parse + validate + re-canonicalize a ScriptedActionSource.canonicalScript string.
 * Requires re-canonical string to equal the input (rejects whitespace / key-order / pretty JSON).
 */
export function validateCanonicalBattleActionScriptString(
  canonicalScript: unknown,
  expectedMaxTurns: number,
): ValidationResult<{ script: BattleActionScript; canonicalScript: string }> {
  if (typeof canonicalScript !== "string" || canonicalScript.length === 0) {
    return failure([
      {
        path: "/canonicalScript",
        message: "canonicalScript must be a non-empty string",
        actual: canonicalScript,
        expected: "non-empty UTF-8 JSON string",
      },
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(canonicalScript);
  } catch (error) {
    return failure([
      {
        path: "/canonicalScript",
        message: error instanceof Error ? error.message : "canonicalScript is not valid JSON",
        expected: "JSON object BattleActionScript",
      },
    ]);
  }
  const script = validateBattleActionScript(parsed, expectedMaxTurns);
  if (!script.ok) {
    return failure(script.issues);
  }
  const recomputed = battleActionScriptToCanonicalScript(script.value);
  if (recomputed !== canonicalScript) {
    return failure([
      {
        path: "/canonicalScript",
        message:
          "canonicalScript must equal toCanonicalJson(validated BattleActionScript) exactly (no whitespace, key-order, or pretty JSON drift)",
        expected: "byte-identical canonical JSON string",
      },
    ]);
  }
  return success({ script: script.value, canonicalScript: recomputed });
}

export function getBattleActionFromScript(
  script: BattleActionScript,
  turnNumber: number,
  side: "sideA" | "sideB",
): ValidationResult<BattleAction> {
  if (!Number.isInteger(turnNumber) || turnNumber < 1 || turnNumber > script.turns.length) {
    return failure([
      {
        path: "/turnNumber",
        message: "turnNumber must be in 1..turns.length",
        actual: turnNumber,
        expected: `integer 1..${String(script.turns.length)}`,
      },
    ]);
  }
  const entry = script.turns[turnNumber - 1];
  if (entry === undefined || entry.turnNumber !== turnNumber) {
    return failure([
      {
        path: `/turns/${String(turnNumber - 1)}/turnNumber`,
        message: "script turn entry is missing or turnNumber does not match prepared turn",
        actual: entry?.turnNumber,
        expected: String(turnNumber),
      },
    ]);
  }
  return success(side === "sideA" ? entry.sideA : entry.sideB);
}

/**
 * Build the fixed all-basic_defense Sprint 1 fixture (maxTurns=20).
 * Production tests assert the published byte length and SHA; do not derive expected hash in asserts.
 */
export function buildFixedBasicDefenseBattleActionScript(
  maxTurns: number = 20,
): BattleActionScript {
  const turns: BattleActionScriptTurn[] = [];
  for (let turnNumber = 1; turnNumber <= maxTurns; turnNumber += 1) {
    turns.push({
      turnNumber,
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    });
  }
  return deepFreezePlainJson({
    scriptFormatVersion: BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
    turns,
  });
}
