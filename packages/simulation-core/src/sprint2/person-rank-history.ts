/**
 * S02-007 durable append-only person rank history.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Rank } from "../enums.js";
import { RANK_ORDER } from "../enums.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type { WorldDate } from "../world-date.js";
import {
  PERSON_RANK_HISTORY_ENTRY_SCHEMA_VERSION,
  PERSON_RANK_HISTORY_SCHEMA_VERSION,
} from "./constants.js";

export type PersonRankHistoryEntry = {
  schemaVersion: typeof PERSON_RANK_HISTORY_ENTRY_SCHEMA_VERSION;
  entryIdentityHash: string;
  personId: PersonId;
  worldDate: WorldDate;
  previousRank: Rank;
  newRank: Rank;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourcePromotionResultHash: string;
  entryHash: string;
};

export type PersonRankHistory = {
  schemaVersion: typeof PERSON_RANK_HISTORY_SCHEMA_VERSION;
  personId: PersonId;
  entries: readonly PersonRankHistoryEntry[];
};

export type BuildPersonRankHistoryEntryInput = {
  personId: PersonId;
  worldDate: WorldDate;
  previousRank: Rank;
  newRank: Rank;
  sourceTournamentId: TournamentId;
  sourceQualificationReferenceHash: string;
  sourcePromotionResultHash: string;
};

function buildEntryIdentityMaterial(
  input: BuildPersonRankHistoryEntryInput,
): Record<string, unknown> {
  return {
    personId: input.personId,
    worldDate: input.worldDate,
    previousRank: input.previousRank,
    newRank: input.newRank,
    sourceTournamentId: input.sourceTournamentId,
    sourceQualificationReferenceHash: input.sourceQualificationReferenceHash,
    sourcePromotionResultHash: input.sourcePromotionResultHash,
  };
}

function buildEntryHashMaterial(
  entry: Omit<PersonRankHistoryEntry, "entryHash">,
): Record<string, unknown> {
  return {
    schemaVersion: entry.schemaVersion,
    entryIdentityHash: entry.entryIdentityHash,
    personId: entry.personId,
    worldDate: entry.worldDate,
    previousRank: entry.previousRank,
    newRank: entry.newRank,
    sourceTournamentId: entry.sourceTournamentId,
    sourceQualificationReferenceHash: entry.sourceQualificationReferenceHash,
    sourcePromotionResultHash: entry.sourcePromotionResultHash,
  };
}

export function isExactlyOneRankStepUp(previousRank: Rank, newRank: Rank): boolean {
  const prevIndex = RANK_ORDER.indexOf(previousRank);
  const nextIndex = RANK_ORDER.indexOf(newRank);
  return prevIndex >= 0 && nextIndex === prevIndex + 1;
}

export function buildPersonRankHistoryEntry(
  input: BuildPersonRankHistoryEntryInput,
  provider: Sha256Provider,
): ValidationResult<PersonRankHistoryEntry> {
  const issues: ValidationIssue[] = [];
  if (!isExactlyOneRankStepUp(input.previousRank, input.newRank)) {
    issues.push({
      path: "/newRank",
      message: "rank transition must be exactly one step up with no skip or demotion",
      actual: `${input.previousRank}->${input.newRank}`,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const identityHash = safeHashUtf8(
    provider,
    toCanonicalJson(buildEntryIdentityMaterial(input)),
    "/entryIdentityHash",
  );
  if (!identityHash.ok) {
    return identityHash;
  }

  const withoutHash = {
    schemaVersion: PERSON_RANK_HISTORY_ENTRY_SCHEMA_VERSION,
    entryIdentityHash: identityHash.value,
    personId: input.personId,
    worldDate: input.worldDate,
    previousRank: input.previousRank,
    newRank: input.newRank,
    sourceTournamentId: input.sourceTournamentId,
    sourceQualificationReferenceHash: input.sourceQualificationReferenceHash,
    sourcePromotionResultHash: input.sourcePromotionResultHash,
  } satisfies Omit<PersonRankHistoryEntry, "entryHash">;

  const entryHash = safeHashUtf8(
    provider,
    toCanonicalJson(buildEntryHashMaterial(withoutHash)),
    "/entryHash",
  );
  if (!entryHash.ok) {
    return entryHash;
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      entryHash: entryHash.value,
    }),
  );
}

export function createEmptyPersonRankHistory(personId: PersonId): PersonRankHistory {
  return deepFreezePlainJson({
    schemaVersion: PERSON_RANK_HISTORY_SCHEMA_VERSION,
    personId,
    entries: [],
  });
}

export function validatePersonRankHistoryContinuity(
  history: PersonRankHistory,
  expectedCurrentRank: Rank,
): ValidationResult<PersonRankHistory> {
  const issues: ValidationIssue[] = [];
  if (history.schemaVersion !== PERSON_RANK_HISTORY_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "person rank history schemaVersion mismatch",
      actual: history.schemaVersion,
      expected: PERSON_RANK_HISTORY_SCHEMA_VERSION,
    });
  }

  const seenIdentities = new Set<string>();
  let runningRank = expectedCurrentRank;
  if (history.entries.length > 0) {
    runningRank = history.entries[0]!.previousRank;
  }

  for (let i = 0; i < history.entries.length; i += 1) {
    const entry = history.entries[i]!;
    const path = `/entries/${String(i)}`;
    if (entry.personId !== history.personId) {
      issues.push({
        path: `${path}/personId`,
        message: "entry personId must match history personId",
        actual: entry.personId,
        expected: history.personId,
      });
    }
    if (seenIdentities.has(entry.entryIdentityHash)) {
      issues.push({
        path: `${path}/entryIdentityHash`,
        message: "duplicate rank history entry identity",
        actual: entry.entryIdentityHash,
      });
    }
    seenIdentities.add(entry.entryIdentityHash);

    if (entry.previousRank !== runningRank) {
      issues.push({
        path: `${path}/previousRank`,
        message: "rank history continuity broken: previousRank does not chain",
        actual: entry.previousRank,
        expected: runningRank,
      });
    }
    if (!isExactlyOneRankStepUp(entry.previousRank, entry.newRank)) {
      issues.push({
        path: `${path}/newRank`,
        message: "rank history entry must be exactly one step up",
        actual: `${entry.previousRank}->${entry.newRank}`,
      });
    }
    runningRank = entry.newRank;
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(history);
}

export type AppendPersonRankHistoryEntryOutput =
  | { kind: "appended"; history: PersonRankHistory }
  | { kind: "duplicate"; history: PersonRankHistory; entry: PersonRankHistoryEntry }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

export function appendPersonRankHistoryEntry(
  history: PersonRankHistory,
  entry: PersonRankHistoryEntry,
  expectedCurrentRank: Rank,
): AppendPersonRankHistoryEntryOutput {
  if (entry.personId !== history.personId) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/personId",
          message: "entry personId must match history personId",
          actual: entry.personId,
          expected: history.personId,
        },
      ],
    };
  }

  const duplicate = history.entries.find((e) => e.entryIdentityHash === entry.entryIdentityHash);
  if (duplicate !== undefined) {
    if (
      duplicate.entryHash === entry.entryHash &&
      duplicate.sourcePromotionResultHash === entry.sourcePromotionResultHash
    ) {
      return { kind: "duplicate", history, entry: duplicate };
    }
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/entryIdentityHash",
          message: "duplicate entry identity with conflicting payload",
          actual: entry.entryIdentityHash,
        },
      ],
    };
  }

  const lastEntry =
    history.entries.length > 0 ? history.entries[history.entries.length - 1] : undefined;
  const expectedPrevious = lastEntry !== undefined ? lastEntry.newRank : expectedCurrentRank;
  if (entry.previousRank !== expectedPrevious) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/previousRank",
          message: "append would break rank history continuity",
          actual: entry.previousRank,
          expected: expectedPrevious,
        },
      ],
    };
  }

  const nextHistory = deepFreezePlainJson({
    schemaVersion: PERSON_RANK_HISTORY_SCHEMA_VERSION,
    personId: history.personId,
    entries: [...history.entries, entry],
  });

  const continuity = validatePersonRankHistoryContinuity(nextHistory, expectedCurrentRank);
  if (!continuity.ok) {
    return { kind: "validation_failure", issues: continuity.issues };
  }

  return { kind: "appended", history: nextHistory };
}
