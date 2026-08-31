/**
 * S02-007 immutable committed A→S qualification history.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type { WorldDate } from "../world-date.js";
import { S_QUALIFICATION_HISTORY_ENTRY_SCHEMA_VERSION } from "./constants.js";

export type SQualificationHistoryEntry = {
  schemaVersion: typeof S_QUALIFICATION_HISTORY_ENTRY_SCHEMA_VERSION;
  personId: PersonId;
  worldDate: WorldDate;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourceFinalResultHash: string;
  entryHash: string;
};

export type SQualificationHistory = {
  entries: readonly SQualificationHistoryEntry[];
};

export type BuildSQualificationHistoryEntryInput = {
  personId: PersonId;
  worldDate: WorldDate;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourceFinalResultHash: string;
};

export type ValidateSQualificationHistorySource = {
  tournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourceFinalResultHash: string;
};

function buildEntryHashMaterial(
  entry: Omit<SQualificationHistoryEntry, "entryHash">,
): Record<string, unknown> {
  return {
    schemaVersion: entry.schemaVersion,
    personId: entry.personId,
    worldDate: entry.worldDate,
    sourceTournamentId: entry.sourceTournamentId,
    sourceQualificationReferenceHash: entry.sourceQualificationReferenceHash,
    sourceFinalResultHash: entry.sourceFinalResultHash,
  };
}

export function computeSQualificationHistoryEntryHash(
  entry: Omit<SQualificationHistoryEntry, "entryHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildEntryHashMaterial(entry)), "/entryHash");
}

export function buildSQualificationHistoryEntry(
  input: BuildSQualificationHistoryEntryInput,
  provider: Sha256Provider,
): ValidationResult<SQualificationHistoryEntry> {
  const withoutHash = {
    schemaVersion: S_QUALIFICATION_HISTORY_ENTRY_SCHEMA_VERSION,
    personId: input.personId,
    worldDate: input.worldDate,
    sourceTournamentId: input.sourceTournamentId,
    sourceQualificationReferenceHash: input.sourceQualificationReferenceHash,
    sourceFinalResultHash: input.sourceFinalResultHash,
  } satisfies Omit<SQualificationHistoryEntry, "entryHash">;

  const hash = computeSQualificationHistoryEntryHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      entryHash: hash.value,
    }),
  );
}

export function validateSQualificationHistorySource(
  input: BuildSQualificationHistoryEntryInput,
  source: ValidateSQualificationHistorySource,
): ValidationResult<BuildSQualificationHistoryEntryInput> {
  const issues: ValidationIssue[] = [];
  if (input.sourceTournamentId !== source.tournamentId) {
    issues.push({
      path: "/sourceTournamentId",
      message: "stale or mismatched qualification source tournamentId",
      actual: input.sourceTournamentId,
      expected: source.tournamentId,
    });
  }
  if (input.sourceQualificationReferenceHash !== source.sourceQualificationReferenceHash) {
    issues.push({
      path: "/sourceQualificationReferenceHash",
      message: "stale or mismatched qualification reference hash",
      actual: input.sourceQualificationReferenceHash,
      expected: source.sourceQualificationReferenceHash,
    });
  }
  if (input.sourceFinalResultHash !== source.sourceFinalResultHash) {
    issues.push({
      path: "/sourceFinalResultHash",
      message: "stale or mismatched final result hash",
      actual: input.sourceFinalResultHash,
      expected: source.sourceFinalResultHash,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(input);
}

export type CommitSQualificationHistoryEntryOutput =
  | { kind: "committed"; history: SQualificationHistory; entry: SQualificationHistoryEntry }
  | { kind: "idempotent_replay"; history: SQualificationHistory; entry: SQualificationHistoryEntry }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

export function commitSQualificationHistoryEntry(
  history: SQualificationHistory,
  input: BuildSQualificationHistoryEntryInput,
  source: ValidateSQualificationHistorySource,
  provider: Sha256Provider,
): CommitSQualificationHistoryEntryOutput {
  const sourceValidation = validateSQualificationHistorySource(input, source);
  if (!sourceValidation.ok) {
    return { kind: "validation_failure", issues: sourceValidation.issues };
  }

  const built = buildSQualificationHistoryEntry(input, provider);
  if (!built.ok) {
    return { kind: "validation_failure", issues: built.issues };
  }

  const duplicate = history.entries.find((e) => e.entryHash === built.value.entryHash);
  if (duplicate !== undefined) {
    return { kind: "idempotent_replay", history, entry: duplicate };
  }

  const conflicting = history.entries.find(
    (e) =>
      e.personId === built.value.personId &&
      e.sourceTournamentId === built.value.sourceTournamentId &&
      e.entryHash !== built.value.entryHash,
  );
  if (conflicting !== undefined) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/entries",
          message: "conflicting S qualification history entry for same person and tournament",
          actual: built.value.entryHash,
        },
      ],
    };
  }

  const nextHistory = deepFreezePlainJson({
    entries: [...history.entries, built.value],
  });

  return {
    kind: "committed",
    history: nextHistory,
    entry: built.value,
  };
}

export function createEmptySQualificationHistory(): SQualificationHistory {
  return deepFreezePlainJson({ entries: [] });
}
