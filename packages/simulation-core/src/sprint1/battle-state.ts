/**
 * `BattleState`, `BattleDetailedLog`, `BattleFailureInfo` and the `battleInputHash`
 * contract (11 mini-spec §9 / §13 / §16, 12 §20 / S01-005).
 *
 * S01-005 only produces `ready` and `in_progress` states, so the detailed log is
 * always empty here; the per-turn log entry schemas arrive with turn resolution
 * (12 §20 / S01-006).
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asMatchId, asSimulationId } from "../ids.js";
import type { MatchId, SimulationId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateWorldDate } from "../world-date.js";
import type { WorldDate } from "../world-date.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import { validateBattleActionSourceIdentity } from "./battle-action-source-identity.js";
import {
  BATTLE_STATUSES,
  BATTLE_TERMINAL_REASONS,
  isBattleKind,
  isBattleStatus,
  isBattleTerminalReason,
} from "./battle-enums.js";
import type { BattleKind, BattleStatus, BattleTerminalReason } from "./battle-enums.js";
import {
  preflightBattleParticipantSnapshotStructure,
  verifyBattleParticipantSnapshotHash,
} from "./battle-participant.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import {
  preflightBattleRulesSnapshotRefStructure,
  verifyBattleRulesSnapshotRefHash,
} from "./battle-rules-snapshot-ref.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import type { BattleRulesSnapshotRef } from "./battle-rules-snapshot-ref.js";
import { BATTLE_STATE_SCHEMA_VERSION } from "./constants.js";
import {
  SHA256_HEX_PATTERN,
  assertNoAccessors,
  childPath,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireInteger,
  requireIntegerInRange,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { BATTLE_RANGES } from "./types.js";
import type { BattleRange } from "./types.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";

export const UINT32_MAXIMUM = 4294967295;

/** 12 §20. Empty in every state S01-005 can build. */
export const BATTLE_DETAILED_LOG_KEYS = ["turnOrderLogs", "actionLogs"] as const;

export type BattleDetailedLog = {
  turnOrderLogs: readonly unknown[];
  actionLogs: readonly unknown[];
};

export function createEmptyBattleDetailedLog(): BattleDetailedLog {
  return deepFreezePlainJson({ turnOrderLogs: [], actionLogs: [] });
}

export function validateBattleDetailedLog(input: unknown): ValidationResult<BattleDetailedLog> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleDetailedLog must be a plain object",
              actual: input,
              expected: "BattleDetailedLog",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_DETAILED_LOG_KEYS, "", issues);

  for (const key of BATTLE_DETAILED_LOG_KEYS) {
    const path = childPath("", key);
    const items = snapshotDenseArrayOrFail(object[key], path, issues);
    if (items === undefined) {
      continue;
    }
    if (items.length !== 0) {
      issues.push({
        path,
        message: "S01-005 only builds ready / in_progress states, whose detailed log is empty",
        actual: items.length,
        expected: "0",
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(createEmptyBattleDetailedLog());
}

export const BATTLE_FAILURE_INFO_KEYS = [
  "code",
  "severity",
  "targetIds",
  "reason",
  "canContinue",
] as const;

/**
 * 11 §9 / §14. The spec fixes the field set but not a `severity` or `code`
 * vocabulary, so both stay non-empty strings here rather than inventing an enum.
 */
export type BattleFailureInfo = {
  code: string;
  severity: string;
  targetIds: readonly string[];
  reason: string;
  canContinue: boolean;
};

export function validateBattleFailureInfo(input: unknown): ValidationResult<BattleFailureInfo> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleFailureInfo must be a plain object",
              actual: input,
              expected: "BattleFailureInfo",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_FAILURE_INFO_KEYS, "", issues);

  const code = requireNonEmptyTrimmedString(object, "code", "", issues);
  const severity = requireNonEmptyTrimmedString(object, "severity", "", issues);
  const reason = requireNonEmptyTrimmedString(object, "reason", "", issues);

  let canContinue: boolean | undefined;
  if (!hasOwn(object, "canContinue")) {
    issues.push({ path: "/canContinue", message: "required key is missing", expected: "boolean" });
  } else if (typeof object["canContinue"] !== "boolean") {
    issues.push({
      path: "/canContinue",
      message: "canContinue must be a boolean",
      actual: object["canContinue"],
      expected: "boolean",
    });
  } else {
    canContinue = object["canContinue"];
  }

  const rawTargetIds = snapshotDenseArrayOrFail(object["targetIds"], "/targetIds", issues);
  const targetIds: string[] = [];
  if (rawTargetIds !== undefined) {
    for (let index = 0; index < rawTargetIds.length; index += 1) {
      const item = rawTargetIds[index];
      if (typeof item !== "string" || item.length === 0) {
        issues.push({
          path: `/targetIds/${String(index)}`,
          message: "targetIds entries must be non-empty strings",
          actual: item,
          expected: "non-empty string",
        });
        continue;
      }
      targetIds.push(item);
    }
  }

  if (
    code === undefined ||
    severity === undefined ||
    reason === undefined ||
    canContinue === undefined ||
    rawTargetIds === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(deepFreezePlainJson({ code, severity, targetIds, reason, canContinue }));
}

/** 11 §13, in the fixed order the spec lists. */
export const BATTLE_INPUT_HASH_KEYS = [
  "matchId",
  "simulationId",
  "worldDate",
  "battleKind",
  "initialRange",
  "participantASourceSnapshotHash",
  "participantBSourceSnapshotHash",
  "battleRulesRefHash",
  "runRuleSnapshotHash",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "battleSeed",
] as const;

export type BattleInputHashInput = {
  matchId: MatchId;
  simulationId: SimulationId;
  worldDate: WorldDate;
  battleKind: BattleKind;
  initialRange: BattleRange;
  participantASourceSnapshotHash: string;
  participantBSourceSnapshotHash: string;
  battleRulesRefHash: string;
  runRuleSnapshotHash: string;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  battleSeed: number;
};

export function computeBattleInputHash(
  hashInput: BattleInputHashInput,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/battleInputHash");
}

export const BATTLE_STATE_KEYS = [
  "schemaVersion",
  "matchId",
  "simulationId",
  "battleKind",
  "worldDate",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "sprint1ConfigVersion",
  "battleRulesSnapshotRef",
  "battleRulesRefHash",
  "runRuleSnapshotHash",
  "battleInputHash",
  "battleSeed",
  "rngState",
  "maxTurns",
  "turnNumber",
  "initialRange",
  "range",
  "participantA",
  "participantB",
  "status",
  "terminalReason",
  "failure",
  "actionSequence",
  "detailedLog",
] as const;

export type BattleState = {
  schemaVersion: typeof BATTLE_STATE_SCHEMA_VERSION;
  matchId: MatchId;
  simulationId: SimulationId;
  battleKind: BattleKind;
  worldDate: WorldDate;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  sprint1ConfigVersion: string;
  battleRulesSnapshotRef: BattleRulesSnapshotRef;
  battleRulesRefHash: string;
  runRuleSnapshotHash: string;
  battleInputHash: string;
  battleSeed: number;
  rngState: SeededRngState;
  maxTurns: number;
  turnNumber: number;
  initialRange: BattleRange;
  range: BattleRange;
  participantA: BattleParticipantSnapshot;
  participantB: BattleParticipantSnapshot;
  status: BattleStatus;
  terminalReason: BattleTerminalReason | null;
  failure: BattleFailureInfo | null;
  actionSequence: number;
  detailedLog: BattleDetailedLog;
};

export const WORLD_DATE_KEYS = ["year", "month", "weekOfMonth", "absoluteWeek"] as const;

export function parseWorldDate(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WorldDate | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, WORLD_DATE_KEYS, path, issues);

  const year = requireIntegerInRange(object, "year", path, 1, Number.MAX_SAFE_INTEGER, issues);
  const month = requireInteger(object, "month", path, issues);
  const weekOfMonth = requireInteger(object, "weekOfMonth", path, issues);
  const absoluteWeek = requireIntegerInRange(
    object,
    "absoluteWeek",
    path,
    0,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  if (
    year === undefined ||
    month === undefined ||
    weekOfMonth === undefined ||
    absoluteWeek === undefined
  ) {
    return undefined;
  }

  const candidate = { year, month, weekOfMonth, absoluteWeek } as WorldDate;
  try {
    validateWorldDate(candidate);
  } catch (error) {
    issues.push({
      path,
      message: error instanceof Error ? error.message : "worldDate is not a valid world date",
      actual: candidate,
      expected: "WorldDate",
    });
    return undefined;
  }
  return candidate;
}

function requireHashHex(
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

function requireBattleRange(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): BattleRange | undefined {
  const path = `/${key}`;
  if (!hasOwn(object, key)) {
    issues.push({
      path,
      message: "required key is missing",
      expected: BATTLE_RANGES.join(" | "),
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !(BATTLE_RANGES as readonly string[]).includes(value)) {
    issues.push({
      path,
      message: `${key} must be one of the fixed BattleRange values`,
      actual: value,
      expected: BATTLE_RANGES.join(" | "),
    });
    return undefined;
  }
  return value as BattleRange;
}

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

/**
 * Full structural + invariant validation of a `BattleState` (11 §16). Recomputes
 * `battleRulesRefHash` and `battleInputHash` from the state's own contents, so a
 * tampered field is rejected instead of trusted.
 */
export function validateBattleState(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  const preflight = preflightBattleStateStructure(input);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }
  return verifyBattleStateHashes(preflight.value, provider);
}

/**
 * Structure / status invariants only — nested digests are format-checked, never
 * recomputed (S01-005 Phase 1).
 */
export function preflightBattleStateStructure(input: unknown): ValidationResult<BattleState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleState must be a plain object",
              actual: input,
              expected: "BattleState",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    BATTLE_STATE_SCHEMA_VERSION,
    issues,
  );
  const matchIdText = requireNonEmptyTrimmedString(object, "matchId", "", issues);
  const simulationIdText = requireNonEmptyTrimmedString(object, "simulationId", "", issues);
  const sprint1ConfigVersion = requireNonEmptyTrimmedString(
    object,
    "sprint1ConfigVersion",
    "",
    issues,
  );
  const runRuleSnapshotHash = requireHashHex(object, "runRuleSnapshotHash", issues);
  const battleRulesRefHash = requireHashHex(object, "battleRulesRefHash", issues);
  const battleInputHash = requireHashHex(object, "battleInputHash", issues);
  const battleSeed = requireIntegerInRange(object, "battleSeed", "", 0, UINT32_MAXIMUM, issues);
  const maxTurns = requireIntegerInRange(
    object,
    "maxTurns",
    "",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  const turnNumber = requireIntegerInRange(
    object,
    "turnNumber",
    "",
    0,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  const actionSequence = requireIntegerInRange(
    object,
    "actionSequence",
    "",
    0,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  const initialRange = requireBattleRange(object, "initialRange", issues);
  const range = requireBattleRange(object, "range", issues);
  const worldDate = parseWorldDate(object["worldDate"], "/worldDate", issues);

  let battleKind: BattleKind | undefined;
  if (!isBattleKind(object["battleKind"])) {
    issues.push({
      path: "/battleKind",
      message: "battleKind must be one of the fixed BattleKind values",
      actual: object["battleKind"],
      expected: "official | mock",
    });
  } else {
    battleKind = object["battleKind"];
  }

  let status: BattleStatus | undefined;
  if (!isBattleStatus(object["status"])) {
    issues.push({
      path: "/status",
      message: "status must be one of the fixed BattleStatus values",
      actual: object["status"],
      expected: BATTLE_STATUSES.join(" | "),
    });
  } else {
    status = object["status"];
  }

  let terminalReason: BattleTerminalReason | null | undefined;
  if (!hasOwn(object, "terminalReason")) {
    issues.push({
      path: "/terminalReason",
      message: "required key is missing",
      expected: `${BATTLE_TERMINAL_REASONS.join(" | ")} | null`,
    });
  } else if (object["terminalReason"] === null) {
    terminalReason = null;
  } else if (isBattleTerminalReason(object["terminalReason"])) {
    terminalReason = object["terminalReason"];
  } else {
    issues.push({
      path: "/terminalReason",
      message: "terminalReason must be a BattleTerminalReason or null",
      actual: object["terminalReason"],
      expected: `${BATTLE_TERMINAL_REASONS.join(" | ")} | null`,
    });
  }

  let battleFailure: BattleFailureInfo | null | undefined;
  if (!hasOwn(object, "failure")) {
    issues.push({
      path: "/failure",
      message: "required key is missing",
      expected: "BattleFailureInfo | null",
    });
  } else if (object["failure"] === null) {
    battleFailure = null;
  } else {
    const result = validateBattleFailureInfo(object["failure"]);
    if (result.ok) {
      battleFailure = result.value;
    } else {
      issues.push(...prefix(result.issues, "/failure"));
    }
  }

  const sourceIdentities: Partial<
    Record<
      "participantAActionSourceIdentity" | "participantBActionSourceIdentity",
      BattleActionSourceIdentity
    >
  > = {};
  for (const key of [
    "participantAActionSourceIdentity",
    "participantBActionSourceIdentity",
  ] as const) {
    const result = validateBattleActionSourceIdentity(object[key]);
    if (result.ok) {
      sourceIdentities[key] = result.value;
    } else {
      issues.push(...prefix(result.issues, `/${key}`));
    }
  }

  let rngState: SeededRngState | undefined;
  const rngResult = validateSeededRngState(object["rngState"]);
  if (rngResult.ok) {
    rngState = rngResult.value;
  } else {
    issues.push(...prefix(rngResult.issues, "/rngState"));
  }

  let battleRulesSnapshotRef: BattleRulesSnapshotRef | undefined;
  const refResult = preflightBattleRulesSnapshotRefStructure(object["battleRulesSnapshotRef"]);
  if (refResult.ok) {
    battleRulesSnapshotRef = refResult.value;
  } else {
    issues.push(...prefix(refResult.issues, "/battleRulesSnapshotRef"));
  }

  let participantA: BattleParticipantSnapshot | undefined;
  let participantB: BattleParticipantSnapshot | undefined;
  const participantAResult = preflightBattleParticipantSnapshotStructure(
    object["participantA"],
    "sideA",
  );
  if (participantAResult.ok) {
    participantA = participantAResult.value;
  } else {
    issues.push(...prefix(participantAResult.issues, "/participantA"));
  }
  const participantBResult = preflightBattleParticipantSnapshotStructure(
    object["participantB"],
    "sideB",
  );
  if (participantBResult.ok) {
    participantB = participantBResult.value;
  } else {
    issues.push(...prefix(participantBResult.issues, "/participantB"));
  }

  let detailedLog: BattleDetailedLog | undefined;
  const logResult = validateBattleDetailedLog(object["detailedLog"]);
  if (logResult.ok) {
    detailedLog = logResult.value;
  } else {
    issues.push(...prefix(logResult.issues, "/detailedLog"));
  }

  if (
    schemaVersion === undefined ||
    matchIdText === undefined ||
    simulationIdText === undefined ||
    sprint1ConfigVersion === undefined ||
    runRuleSnapshotHash === undefined ||
    battleRulesRefHash === undefined ||
    battleInputHash === undefined ||
    battleSeed === undefined ||
    maxTurns === undefined ||
    turnNumber === undefined ||
    actionSequence === undefined ||
    initialRange === undefined ||
    range === undefined ||
    worldDate === undefined ||
    battleKind === undefined ||
    status === undefined ||
    terminalReason === undefined ||
    battleFailure === undefined ||
    rngState === undefined ||
    battleRulesSnapshotRef === undefined ||
    participantA === undefined ||
    participantB === undefined ||
    detailedLog === undefined ||
    sourceIdentities.participantAActionSourceIdentity === undefined ||
    sourceIdentities.participantBActionSourceIdentity === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (participantA.personId === participantB.personId) {
    issues.push({
      path: "/participantB/personId",
      message: "the two battle participants must be different persons",
      actual: participantB.personId,
      expected: `!= ${participantA.personId}`,
    });
  }

  if (battleRulesRefHash !== battleRulesSnapshotRef.battleRulesRefHash) {
    issues.push({
      path: "/battleRulesRefHash",
      message: "battleRulesRefHash must equal battleRulesSnapshotRef.battleRulesRefHash",
      actual: battleRulesRefHash,
      expected: battleRulesSnapshotRef.battleRulesRefHash,
    });
  }
  if (runRuleSnapshotHash !== battleRulesSnapshotRef.runRuleSnapshotHash) {
    issues.push({
      path: "/runRuleSnapshotHash",
      message: "runRuleSnapshotHash must equal battleRulesSnapshotRef.runRuleSnapshotHash",
      actual: runRuleSnapshotHash,
      expected: battleRulesSnapshotRef.runRuleSnapshotHash,
    });
  }
  if (sprint1ConfigVersion !== battleRulesSnapshotRef.sprint1ConfigVersion) {
    issues.push({
      path: "/sprint1ConfigVersion",
      message: "sprint1ConfigVersion must equal battleRulesSnapshotRef.sprint1ConfigVersion",
      actual: sprint1ConfigVersion,
      expected: battleRulesSnapshotRef.sprint1ConfigVersion,
    });
  }

  switch (status) {
    case "ready":
    case "in_progress":
      if (terminalReason !== null) {
        issues.push({
          path: "/terminalReason",
          message: `terminalReason must be null while status is ${status}`,
          actual: terminalReason,
          expected: "null",
        });
      }
      if (battleFailure !== null) {
        issues.push({
          path: "/failure",
          message: `failure must be null while status is ${status}`,
          actual: battleFailure,
          expected: "null",
        });
      }
      break;
    case "completed":
      if (terminalReason === null) {
        issues.push({
          path: "/terminalReason",
          message: "a completed battle requires a terminalReason",
          actual: null,
          expected: BATTLE_TERMINAL_REASONS.join(" | "),
        });
      }
      if (battleFailure !== null) {
        issues.push({
          path: "/failure",
          message: "a completed battle must not carry a failure",
          actual: battleFailure,
          expected: "null",
        });
      }
      break;
    case "failed":
      if (terminalReason !== null) {
        issues.push({
          path: "/terminalReason",
          message: "a failed battle must not carry a terminalReason",
          actual: terminalReason,
          expected: "null",
        });
      }
      if (battleFailure === null) {
        issues.push({
          path: "/failure",
          message: "a failed battle requires a BattleFailureInfo",
          actual: null,
          expected: "BattleFailureInfo",
        });
      }
      break;
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion,
      matchId: asMatchId(matchIdText),
      simulationId: asSimulationId(simulationIdText),
      battleKind,
      worldDate,
      participantAActionSourceIdentity: sourceIdentities.participantAActionSourceIdentity,
      participantBActionSourceIdentity: sourceIdentities.participantBActionSourceIdentity,
      sprint1ConfigVersion,
      battleRulesSnapshotRef,
      battleRulesRefHash,
      runRuleSnapshotHash,
      battleInputHash,
      battleSeed,
      rngState,
      maxTurns,
      turnNumber,
      initialRange,
      range,
      participantA,
      participantB,
      status,
      terminalReason,
      failure: battleFailure,
      actionSequence,
      detailedLog,
    }),
  );
}

/**
 * Hash verification only — nested ref / participant / battleInput digests after
 * structure preflight succeeded (S01-005 Phase 2).
 */
export function verifyBattleStateHashes(
  state: BattleState,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  const battleRulesSnapshotRef = verifyBattleRulesSnapshotRefHash(
    state.battleRulesSnapshotRef,
    provider,
  );
  if (!battleRulesSnapshotRef.ok) {
    return failure(prefix(battleRulesSnapshotRef.issues, "/battleRulesSnapshotRef"));
  }

  const participantA = verifyBattleParticipantSnapshotHash(state.participantA, provider);
  if (!participantA.ok) {
    return failure(prefix(participantA.issues, "/participantA"));
  }
  const participantB = verifyBattleParticipantSnapshotHash(state.participantB, provider);
  if (!participantB.ok) {
    return failure(prefix(participantB.issues, "/participantB"));
  }

  const expectedBattleInputHash = computeBattleInputHash(
    {
      matchId: state.matchId,
      simulationId: state.simulationId,
      worldDate: state.worldDate,
      battleKind: state.battleKind,
      initialRange: state.initialRange,
      participantASourceSnapshotHash: participantA.value.sourceSnapshotHash,
      participantBSourceSnapshotHash: participantB.value.sourceSnapshotHash,
      battleRulesRefHash: state.battleRulesRefHash,
      runRuleSnapshotHash: state.runRuleSnapshotHash,
      participantAActionSourceIdentity: state.participantAActionSourceIdentity,
      participantBActionSourceIdentity: state.participantBActionSourceIdentity,
      battleSeed: state.battleSeed,
    },
    provider,
  );
  if (!expectedBattleInputHash.ok) {
    return failure(expectedBattleInputHash.issues);
  }
  if (expectedBattleInputHash.value !== state.battleInputHash) {
    return failure([
      {
        path: "/battleInputHash",
        message: "battleInputHash must equal SHA-256 of the canonical battle input material",
        actual: state.battleInputHash,
        expected: expectedBattleInputHash.value,
      },
    ]);
  }

  return success(state);
}

const INITIAL_BATTLE_MAX_TURNS = 20;

function checkParticipantInitialRuntimeFields(
  participant: BattleParticipantSnapshot,
  pathPrefix: string,
  issues: ValidationIssue[],
): void {
  const flagExpectations: Array<[keyof BattleParticipantSnapshot, boolean]> = [
    ["guarding", false],
    ["evading", false],
    ["canAct", true],
    ["surrendered", false],
    ["unableToContinue", false],
  ];
  for (const [key, expected] of flagExpectations) {
    if (participant[key] !== expected) {
      issues.push({
        path: `${pathPrefix}/${key}`,
        message: `initial battle participant ${key} must be ${String(expected)}`,
        actual: participant[key],
        expected: String(expected),
      });
    }
  }

  const zeroKeys = [
    "nextHitModifier",
    "nextActivationModifier",
    "damageDealt",
    "damageReceived",
    "attemptedHits",
    "successfulHits",
    "successfulDefenses",
    "successfulEvasions",
    "successfulCounters",
    "passiveActionCount",
    "invalidActionCount",
    "advantageTurnCount",
    "inBattleConsumption",
  ] as const;
  for (const key of zeroKeys) {
    if (participant[key] !== 0) {
      issues.push({
        path: `${pathPrefix}/${key}`,
        message: `initial battle participant ${key} must be 0`,
        actual: participant[key],
        expected: "0",
      });
    }
  }

  if (participant.maxDurability !== participant.baseMaxDurability) {
    issues.push({
      path: `${pathPrefix}/maxDurability`,
      message: "initial battle participant maxDurability must equal baseMaxDurability",
      actual: participant.maxDurability,
      expected: String(participant.baseMaxDurability),
    });
  }
}

function validateInitialBattleStateCommon(
  state: BattleState,
  expectedStatus: "ready" | "in_progress",
): ValidationResult<BattleState> {
  const issues: ValidationIssue[] = [];

  if (state.status !== expectedStatus) {
    issues.push({
      path: "/status",
      message: `status must be ${expectedStatus}`,
      actual: state.status,
      expected: expectedStatus,
    });
  }
  if (state.terminalReason !== null) {
    issues.push({
      path: "/terminalReason",
      message: "terminalReason must be null for an initial battle state",
      actual: state.terminalReason,
      expected: "null",
    });
  }
  if (state.failure !== null) {
    issues.push({
      path: "/failure",
      message: "failure must be null for an initial battle state",
      actual: state.failure,
      expected: "null",
    });
  }
  if (state.maxTurns !== INITIAL_BATTLE_MAX_TURNS) {
    issues.push({
      path: "/maxTurns",
      message: `maxTurns must be ${String(INITIAL_BATTLE_MAX_TURNS)} for an initial battle state`,
      actual: state.maxTurns,
      expected: String(INITIAL_BATTLE_MAX_TURNS),
    });
  }
  if (state.turnNumber !== 0) {
    issues.push({
      path: "/turnNumber",
      message: "turnNumber must be 0 for an initial battle state",
      actual: state.turnNumber,
      expected: "0",
    });
  }
  if (state.actionSequence !== 0) {
    issues.push({
      path: "/actionSequence",
      message: "actionSequence must be 0 for an initial battle state",
      actual: state.actionSequence,
      expected: "0",
    });
  }
  if (state.range !== state.initialRange) {
    issues.push({
      path: "/range",
      message: "range must equal initialRange for an initial battle state",
      actual: state.range,
      expected: state.initialRange,
    });
  }
  if (state.detailedLog.turnOrderLogs.length !== 0 || state.detailedLog.actionLogs.length !== 0) {
    issues.push({
      path: "/detailedLog",
      message: "detailedLog must be empty for an initial battle state",
      actual: {
        turnOrderLogs: state.detailedLog.turnOrderLogs.length,
        actionLogs: state.detailedLog.actionLogs.length,
      },
      expected: "empty turnOrderLogs and actionLogs",
    });
  }

  checkParticipantInitialRuntimeFields(state.participantA, "/participantA", issues);
  checkParticipantInitialRuntimeFields(state.participantB, "/participantB", issues);

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(state);
}

/** Package-root-hidden: ready state immediately after createBattleState. */
export function validateInitialReadyBattleState(state: BattleState): ValidationResult<BattleState> {
  return validateInitialBattleStateCommon(state, "ready");
}

/** Package-root-hidden: in_progress state immediately after beginBattle. */
export function validateBegunBattleState(state: BattleState): ValidationResult<BattleState> {
  return validateInitialBattleStateCommon(state, "in_progress");
}

export function cloneBattleState(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  const validated = validateBattleState(input, provider);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeBattleState(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  return validateBattleState(input, provider);
}
