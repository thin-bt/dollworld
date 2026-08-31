/**
 * S02-009 StoredBattleResult logical record / durable identity (Sprint2-owned).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { MatchId, PersonId, SimulationId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
import type { BattleResult, BattleResultKind } from "../sprint1/battle-result-types.js";
import { validateBattleResult } from "../sprint1/validate-battle-result.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  computeDetailedLogPayloadHash,
  getDetailedLogPayloadBytes,
  putDetailedLogPayloadIfAbsent,
  type DetailedLogPayloadStore,
  type PutDetailedLogPayloadOutcome,
} from "./detailed-log-payload-store.js";
import {
  DETAILED_LOG_RETENTION_STATUSES,
  IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION,
  IMPORTANT_BATTLE_REASONS,
  STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
  type DetailedLogRetentionStatus,
  type ImportantBattleReason,
} from "./constants.js";

export type ImportantBattleMarker = {
  schemaVersion: typeof IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION;
  reasons: readonly ImportantBattleReason[];
  reasonProofHashesByReason: Readonly<Partial<Record<ImportantBattleReason, string>>>;
  markerHash: string;
};

export type StoredBattleResultRecord = {
  schemaVersion: typeof STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION;
  simulationId: SimulationId;
  matchId: MatchId;
  resultWorldDate: WorldDate;
  participantAId: PersonId;
  participantBId: PersonId;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  resultKind: BattleResultKind;
  tournamentId?: TournamentId;
  competitionRuleHash: string;
  detailedLogHash: string;
  detailedLogRetentionStatus: DetailedLogRetentionStatus;
  importantBattleMarker?: ImportantBattleMarker;
  battleResultHash: string;
  storedRecordHash: string;
};

export type PublishStoredBattleResultInput = {
  battleResult: BattleResult;
  runRuleSnapshot: unknown;
  competitionRuleHash: string;
  tournamentId?: TournamentId;
  importantBattleMarker?: ImportantBattleMarker;
};

export type PublishStoredBattleResultResult =
  | {
      kind: "published";
      record: StoredBattleResultRecord;
      payloadStore: DetailedLogPayloadStore;
      payloadOutcome: PutDetailedLogPayloadOutcome;
    }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] }
  | { kind: "payload_integrity_failure"; issues: readonly ValidationIssue[] };

function buildBattleResultHashMaterial(
  battleResult: BattleResult,
  detailedLogHash: string,
): Record<string, unknown> {
  return {
    schemaVersion: battleResult.schemaVersion,
    matchId: battleResult.matchId,
    simulationId: battleResult.simulationId,
    worldDate: battleResult.worldDate,
    battleKind: battleResult.battleKind,
    participantAId: battleResult.participantAId,
    participantBId: battleResult.participantBId,
    participantAActionSourceIdentity: battleResult.participantAActionSourceIdentity,
    participantBActionSourceIdentity: battleResult.participantBActionSourceIdentity,
    winnerPersonId: battleResult.winnerPersonId,
    loserPersonId: battleResult.loserPersonId,
    resultKind: battleResult.resultKind,
    endReason: battleResult.endReason,
    turnsExecuted: battleResult.turnsExecuted,
    battleRulesRefHash: battleResult.battleRulesRefHash,
    runRuleSnapshotHash: battleResult.runRuleSnapshotHash,
    battleInputHash: battleResult.battleInputHash,
    sprint1ConfigVersion: battleResult.sprint1ConfigVersion,
    sprint1ConfigHash: battleResult.sprint1ConfigHash,
    techniqueCatalogDataVersion: battleResult.techniqueCatalogDataVersion,
    techniqueCatalogHash: battleResult.techniqueCatalogHash,
    postProcessContext: battleResult.postProcessContext,
    postProcessContextHash: battleResult.postProcessContextHash,
    finalState: battleResult.finalState,
    judgeScore: battleResult.judgeScore,
    summaryLog: battleResult.summaryLog,
    summaryLogHash: battleResult.summaryLogHash,
    detailedLogHash,
    developmentEffects: battleResult.developmentEffects,
    finalRngState: battleResult.finalRngState,
    finalStateHash: battleResult.finalStateHash,
    validation: battleResult.validation,
  };
}

export function computeBattleResultHash(
  battleResult: BattleResult,
  detailedLogHash: string,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildBattleResultHashMaterial(battleResult, detailedLogHash)),
    "/battleResultHash",
  );
}

function buildStoredRecordHashMaterial(
  record: Omit<StoredBattleResultRecord, "storedRecordHash">,
): Record<string, unknown> {
  const material: Record<string, unknown> = {
    schemaVersion: record.schemaVersion,
    simulationId: record.simulationId,
    matchId: record.matchId,
    resultWorldDate: record.resultWorldDate,
    participantAId: record.participantAId,
    participantBId: record.participantBId,
    winnerPersonId: record.winnerPersonId,
    loserPersonId: record.loserPersonId,
    resultKind: record.resultKind,
    competitionRuleHash: record.competitionRuleHash,
    detailedLogHash: record.detailedLogHash,
    detailedLogRetentionStatus: record.detailedLogRetentionStatus,
    battleResultHash: record.battleResultHash,
  };
  if (record.tournamentId !== undefined) {
    material.tournamentId = record.tournamentId;
  }
  if (record.importantBattleMarker !== undefined) {
    material.importantBattleMarker = record.importantBattleMarker;
  }
  return material;
}

export function computeStoredRecordHash(
  record: Omit<StoredBattleResultRecord, "storedRecordHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildStoredRecordHashMaterial(record)),
    "/storedRecordHash",
  );
}

export function validateImportantBattleMarker(
  marker: ImportantBattleMarker,
  provider: Sha256Provider,
): ValidationResult<ImportantBattleMarker> {
  const issues: ValidationIssue[] = [];
  if (marker.schemaVersion !== IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION) {
    issues.push({
      path: "/importantBattleMarker/schemaVersion",
      message: "important battle marker schemaVersion mismatch",
      actual: marker.schemaVersion,
      expected: IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION,
    });
  }
  if (!Array.isArray(marker.reasons) || marker.reasons.length === 0) {
    issues.push({
      path: "/importantBattleMarker/reasons",
      message: "important battle marker requires at least one reason",
      expected: "non-empty reasons array",
    });
  } else {
    const seen = new Set<string>();
    for (let index = 0; index < marker.reasons.length; index += 1) {
      const reason = marker.reasons[index]!;
      if (!(IMPORTANT_BATTLE_REASONS as readonly string[]).includes(reason)) {
        issues.push({
          path: `/importantBattleMarker/reasons/${String(index)}`,
          message: "unknown important battle reason",
          actual: reason,
          expected: IMPORTANT_BATTLE_REASONS.join("|"),
        });
      }
      if (seen.has(reason)) {
        issues.push({
          path: `/importantBattleMarker/reasons/${String(index)}`,
          message: "duplicate important battle reason",
          actual: reason,
        });
      }
      seen.add(reason);
      const proof = marker.reasonProofHashesByReason[reason as ImportantBattleReason];
      if (typeof proof !== "string" || !/^[0-9a-f]{64}$/.test(proof)) {
        issues.push({
          path: `/importantBattleMarker/reasonProofHashesByReason/${reason}`,
          message: "missing or invalid proof hash for important battle reason",
          actual: proof,
          expected: "64-char lowercase hex SHA-256 digest",
        });
      }
    }
    for (let index = 1; index < marker.reasons.length; index += 1) {
      const previous = marker.reasons[index - 1]!;
      const current = marker.reasons[index]!;
      if (IMPORTANT_BATTLE_REASONS.indexOf(previous) > IMPORTANT_BATTLE_REASONS.indexOf(current)) {
        issues.push({
          path: "/importantBattleMarker/reasons",
          message: "important battle reasons must follow canonical fixed order",
          actual: marker.reasons,
          expected: IMPORTANT_BATTLE_REASONS.join(","),
        });
        break;
      }
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  const expectedHash = safeHashUtf8(
    provider,
    toCanonicalJson({
      schemaVersion: marker.schemaVersion,
      reasons: marker.reasons,
      reasonProofHashesByReason: marker.reasonProofHashesByReason,
    }),
    "/importantBattleMarker/markerHash",
  );
  if (!expectedHash.ok) {
    return expectedHash;
  }
  if (marker.markerHash !== expectedHash.value) {
    return failure([
      {
        path: "/importantBattleMarker/markerHash",
        message: "important battle marker hash mismatch",
        actual: marker.markerHash,
        expected: expectedHash.value,
      },
    ]);
  }
  return success(deepFreezePlainJson(marker));
}

export function buildImportantBattleMarker(
  reasons: readonly ImportantBattleReason[],
  reasonProofHashesByReason: Readonly<Partial<Record<ImportantBattleReason, string>>>,
  provider: Sha256Provider,
): ValidationResult<ImportantBattleMarker> {
  const marker: ImportantBattleMarker = {
    schemaVersion: IMPORTANT_BATTLE_MARKER_SCHEMA_VERSION,
    reasons,
    reasonProofHashesByReason,
    markerHash: "",
  };
  const hash = safeHashUtf8(
    provider,
    toCanonicalJson({
      schemaVersion: marker.schemaVersion,
      reasons: marker.reasons,
      reasonProofHashesByReason: marker.reasonProofHashesByReason,
    }),
    "/importantBattleMarker/markerHash",
  );
  if (!hash.ok) {
    return hash;
  }
  marker.markerHash = hash.value;
  return validateImportantBattleMarker(marker, provider);
}

export function validateStoredBattleResultRecord(
  record: StoredBattleResultRecord,
  provider: Sha256Provider,
): ValidationResult<StoredBattleResultRecord> {
  const issues: ValidationIssue[] = [];
  if (record.schemaVersion !== STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "stored battle result record schemaVersion mismatch",
      actual: record.schemaVersion,
      expected: STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
    });
  }
  if (!(DETAILED_LOG_RETENTION_STATUSES as readonly string[]).includes(record.detailedLogRetentionStatus)) {
    issues.push({
      path: "/detailedLogRetentionStatus",
      message: "invalid detailed log retention status",
      actual: record.detailedLogRetentionStatus,
      expected: DETAILED_LOG_RETENTION_STATUSES.join("|"),
    });
  }
  if (record.importantBattleMarker !== undefined) {
    const marker = validateImportantBattleMarker(record.importantBattleMarker, provider);
    if (!marker.ok) {
      issues.push(...marker.issues);
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  const { storedRecordHash, ...withoutHash } = record;
  const expected = computeStoredRecordHash(withoutHash, provider);
  if (!expected.ok) {
    return expected;
  }
  if (storedRecordHash !== expected.value) {
    return failure([
      {
        path: "/storedRecordHash",
        message: "stored battle result record hash tamper detected",
        actual: storedRecordHash,
        expected: expected.value,
      },
    ]);
  }
  return success(deepFreezePlainJson(record));
}

export function validateStoredBattleResultReferences(
  record: StoredBattleResultRecord,
  payloadStore: DetailedLogPayloadStore,
): ValidationResult<StoredBattleResultRecord> {
  if (record.detailedLogRetentionStatus !== "retained") {
    return success(record);
  }
  const bytes = getDetailedLogPayloadBytes(payloadStore, record.detailedLogHash);
  if (bytes === undefined) {
    return failure([
      {
        path: "/detailedLogHash",
        message: "retained stored battle result references missing detailed log payload",
        actual: record.detailedLogHash,
        expected: "existing payload entry",
      },
    ]);
  }
  return success(record);
}

export function publishStoredBattleResult(
  input: PublishStoredBattleResultInput,
  payloadStore: DetailedLogPayloadStore,
  provider: Sha256Provider,
): PublishStoredBattleResultResult {
  const battleValidation = validateBattleResult(
    input.battleResult,
    input.runRuleSnapshot,
    provider,
  );
  if (!battleValidation.ok) {
    return { kind: "validation_failure", issues: battleValidation.issues };
  }
  const battleResult = battleValidation.value;
  if (input.importantBattleMarker !== undefined) {
    const markerValidation = validateImportantBattleMarker(input.importantBattleMarker, provider);
    if (!markerValidation.ok) {
      return { kind: "validation_failure", issues: markerValidation.issues };
    }
  }
  const detailedLogHash = computeDetailedLogPayloadHash(battleResult.detailedLog, provider);
  if (!detailedLogHash.ok) {
    return { kind: "validation_failure", issues: detailedLogHash.issues };
  }
  const putResult = putDetailedLogPayloadIfAbsent(payloadStore, battleResult.detailedLog, provider);
  if (!putResult.ok) {
    return { kind: "validation_failure", issues: putResult.issues };
  }
  if (putResult.value.outcome.kind === "integrity_failure") {
    return {
      kind: "payload_integrity_failure",
      issues: putResult.value.outcome.issues,
    };
  }
  const battleResultHash = computeBattleResultHash(
    battleResult,
    detailedLogHash.value,
    provider,
  );
  if (!battleResultHash.ok) {
    return { kind: "validation_failure", issues: battleResultHash.issues };
  }
  const withoutStoredHash: Omit<StoredBattleResultRecord, "storedRecordHash"> = {
    schemaVersion: STORED_BATTLE_RESULT_RECORD_SCHEMA_VERSION,
    simulationId: battleResult.simulationId,
    matchId: battleResult.matchId,
    resultWorldDate: battleResult.worldDate,
    participantAId: battleResult.participantAId,
    participantBId: battleResult.participantBId,
    winnerPersonId: battleResult.winnerPersonId,
    loserPersonId: battleResult.loserPersonId,
    resultKind: battleResult.resultKind,
    competitionRuleHash: input.competitionRuleHash,
    detailedLogHash: detailedLogHash.value,
    detailedLogRetentionStatus: "retained",
    battleResultHash: battleResultHash.value,
    ...(input.tournamentId !== undefined ? { tournamentId: input.tournamentId } : {}),
    ...(input.importantBattleMarker !== undefined
      ? { importantBattleMarker: input.importantBattleMarker }
      : {}),
  };
  const storedRecordHash = computeStoredRecordHash(withoutStoredHash, provider);
  if (!storedRecordHash.ok) {
    return { kind: "validation_failure", issues: storedRecordHash.issues };
  }
  const record: StoredBattleResultRecord = {
    ...withoutStoredHash,
    storedRecordHash: storedRecordHash.value,
  };
  const validated = validateStoredBattleResultRecord(record, provider);
  if (!validated.ok) {
    return { kind: "validation_failure", issues: validated.issues };
  }
  return {
    kind: "published",
    record: validated.value,
    payloadStore: putResult.value.store,
    payloadOutcome: putResult.value.outcome,
  };
}

export function withStoredBattleResultRetentionStatus(
  record: StoredBattleResultRecord,
  status: DetailedLogRetentionStatus,
  provider: Sha256Provider,
): ValidationResult<StoredBattleResultRecord> {
  if (!(DETAILED_LOG_RETENTION_STATUSES as readonly string[]).includes(status)) {
    return failure([
      {
        path: "/detailedLogRetentionStatus",
        message: "invalid detailed log retention status",
        actual: status,
        expected: DETAILED_LOG_RETENTION_STATUSES.join("|"),
      },
    ]);
  }
  const { storedRecordHash: _previous, ...withoutHash } = record;
  const nextWithoutHash: Omit<StoredBattleResultRecord, "storedRecordHash"> = {
    ...withoutHash,
    detailedLogRetentionStatus: status,
  };
  const nextHash = computeStoredRecordHash(nextWithoutHash, provider);
  if (!nextHash.ok) {
    return nextHash;
  }
  return validateStoredBattleResultRecord(
    {
      ...nextWithoutHash,
      storedRecordHash: nextHash.value,
    },
    provider,
  );
}

export function rejectRetroactiveImportantBattleMarker(
  existing: StoredBattleResultRecord,
  proposed: ImportantBattleMarker | undefined,
): ValidationResult<void> {
  if (existing.importantBattleMarker !== undefined) {
    if (
      proposed !== undefined &&
      toCanonicalJson(proposed) !== toCanonicalJson(existing.importantBattleMarker)
    ) {
      return failure([
        {
          path: "/importantBattleMarker",
          message: "important battle marker mutation is forbidden after initial publication",
          actual: proposed,
          expected: "unchanged marker",
        },
      ]);
    }
    return success(undefined);
  }
  if (proposed !== undefined) {
    return failure([
      {
        path: "/importantBattleMarker",
        message: "retroactive important battle marker assignment is forbidden",
        actual: proposed,
        expected: "marker at initial publication only",
      },
    ]);
  }
  return success(undefined);
}
