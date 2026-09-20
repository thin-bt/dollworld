/**
 * S02-008 durable year-selectable annual ranking/history facts.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION,
  ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION,
} from "./constants.js";
import {
  projectAnnualRanking,
  projectAnnualRankingForBrowser,
  type AnnualRankingDisplayFacts,
  type ProjectAnnualRankingInput,
} from "./annual-ranking.js";

export type AnnualRankingHistoryRow = {
  schemaVersion: typeof ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION;
  displayOrder: number;
  personId: AnnualRankingDisplayFacts["personId"];
  annualRank: number;
  yearlyCumulativeEarnings: number;
  currentRank: AnnualRankingDisplayFacts["currentRank"];
  tournamentAppearances: number;
  tournamentWins: number;
  officialWins: number;
  officialLosses: number;
  rowHash: string;
};

export type AnnualRankingHistoryEntry = {
  schemaVersion: typeof ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION;
  worldYear: number;
  isFinalized: boolean;
  rows: readonly AnnualRankingHistoryRow[];
  historyHash: string;
};

export type AnnualRankingHistoryStore = {
  entries: readonly AnnualRankingHistoryEntry[];
};

function buildRowHashMaterial(
  row: Omit<AnnualRankingHistoryRow, "rowHash">,
): Record<string, unknown> {
  return {
    schemaVersion: row.schemaVersion,
    displayOrder: row.displayOrder,
    personId: row.personId,
    annualRank: row.annualRank,
    yearlyCumulativeEarnings: row.yearlyCumulativeEarnings,
    currentRank: row.currentRank,
    tournamentAppearances: row.tournamentAppearances,
    tournamentWins: row.tournamentWins,
    officialWins: row.officialWins,
    officialLosses: row.officialLosses,
  };
}

function buildHistoryHashMaterial(
  entry: Omit<AnnualRankingHistoryEntry, "historyHash">,
): Record<string, unknown> {
  return {
    schemaVersion: entry.schemaVersion,
    worldYear: entry.worldYear,
    isFinalized: entry.isFinalized,
    rows: entry.rows.map((row) => ({
      schemaVersion: row.schemaVersion,
      displayOrder: row.displayOrder,
      personId: row.personId,
      annualRank: row.annualRank,
      yearlyCumulativeEarnings: row.yearlyCumulativeEarnings,
      currentRank: row.currentRank,
      tournamentAppearances: row.tournamentAppearances,
      tournamentWins: row.tournamentWins,
      officialWins: row.officialWins,
      officialLosses: row.officialLosses,
      rowHash: row.rowHash,
    })),
  };
}

export function computeAnnualRankingHistoryRowHash(
  row: Omit<AnnualRankingHistoryRow, "rowHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildRowHashMaterial(row)), "/rowHash");
}

export function computeAnnualRankingHistoryEntryHash(
  entry: Omit<AnnualRankingHistoryEntry, "historyHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildHistoryHashMaterial(entry)), "/historyHash");
}

function buildHistoryRowsFromFacts(
  facts: readonly AnnualRankingDisplayFacts[],
  provider: Sha256Provider,
): ValidationResult<readonly AnnualRankingHistoryRow[]> {
  const rows: AnnualRankingHistoryRow[] = [];
  for (const fact of facts) {
    const withoutHash = {
      schemaVersion: ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION,
      displayOrder: fact.displayOrder,
      personId: fact.personId,
      annualRank: fact.annualRank,
      yearlyCumulativeEarnings: fact.yearlyCumulativeEarnings,
      currentRank: fact.currentRank,
      tournamentAppearances: fact.tournamentAppearances,
      tournamentWins: fact.tournamentWins,
      officialWins: fact.officialWins,
      officialLosses: fact.officialLosses,
    } satisfies Omit<AnnualRankingHistoryRow, "rowHash">;
    const rowHash = computeAnnualRankingHistoryRowHash(withoutHash, provider);
    if (!rowHash.ok) {
      return rowHash;
    }
    rows.push(
      deepFreezePlainJson({
        ...withoutHash,
        rowHash: rowHash.value,
      }),
    );
  }
  return success(deepFreezePlainJson(rows));
}

export function createEmptyAnnualRankingHistoryStore(): AnnualRankingHistoryStore {
  return deepFreezePlainJson({ entries: [] });
}

export function findAnnualRankingHistoryEntry(
  store: AnnualRankingHistoryStore,
  worldYear: number,
): AnnualRankingHistoryEntry | undefined {
  return store.entries.find((entry) => entry.worldYear === worldYear);
}

export type UpsertAnnualRankingHistoryInput = ProjectAnnualRankingInput & {
  isFinalized?: boolean;
};

export type UpsertAnnualRankingHistoryOutput =
  | { kind: "committed"; store: AnnualRankingHistoryStore; entry: AnnualRankingHistoryEntry }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

export function upsertAnnualRankingHistoryEntry(
  store: AnnualRankingHistoryStore,
  input: UpsertAnnualRankingHistoryInput,
  provider: Sha256Provider,
): UpsertAnnualRankingHistoryOutput {
  const existing = findAnnualRankingHistoryEntry(store, input.worldYear);
  if (existing !== undefined && existing.isFinalized) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/entries",
          message: "closed-year annual ranking history is immutable",
          actual: input.worldYear,
        },
      ],
    };
  }

  const projected = projectAnnualRanking(input);
  if (!projected.ok) {
    return { kind: "validation_failure", issues: projected.issues };
  }

  const rows = buildHistoryRowsFromFacts(projected.value, provider);
  if (!rows.ok) {
    return { kind: "validation_failure", issues: rows.issues };
  }

  const withoutHash = {
    schemaVersion: ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION,
    worldYear: input.worldYear,
    isFinalized: input.isFinalized ?? false,
    rows: rows.value,
  } satisfies Omit<AnnualRankingHistoryEntry, "historyHash">;

  const historyHash = computeAnnualRankingHistoryEntryHash(withoutHash, provider);
  if (!historyHash.ok) {
    return { kind: "validation_failure", issues: historyHash.issues };
  }

  const entry = deepFreezePlainJson({
    ...withoutHash,
    historyHash: historyHash.value,
  });

  const nextEntries = store.entries.filter((candidate) => candidate.worldYear !== input.worldYear);
  const nextStore = deepFreezePlainJson({
    entries: [...nextEntries, entry],
  });

  return {
    kind: "committed",
    store: nextStore,
    entry,
  };
}

export type FinalizeClosedYearHistoryOutput =
  | { kind: "finalized"; store: AnnualRankingHistoryStore; entry: AnnualRankingHistoryEntry }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

export function finalizeClosedYearHistory(
  store: AnnualRankingHistoryStore,
  worldYear: number,
  provider: Sha256Provider,
): FinalizeClosedYearHistoryOutput {
  const existing = findAnnualRankingHistoryEntry(store, worldYear);
  if (existing === undefined) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/entries",
          message: "cannot finalize missing annual ranking history entry",
          actual: worldYear,
        },
      ],
    };
  }
  if (existing.isFinalized) {
    return { kind: "finalized", store, entry: existing };
  }

  const withoutHash = {
    schemaVersion: existing.schemaVersion,
    worldYear: existing.worldYear,
    isFinalized: true,
    rows: existing.rows,
  } satisfies Omit<AnnualRankingHistoryEntry, "historyHash">;

  const historyHash = computeAnnualRankingHistoryEntryHash(withoutHash, provider);
  if (!historyHash.ok) {
    return { kind: "validation_failure", issues: historyHash.issues };
  }

  const entry = deepFreezePlainJson({
    ...withoutHash,
    historyHash: historyHash.value,
  });

  const nextStore = deepFreezePlainJson({
    entries: store.entries.map((candidate) =>
      candidate.worldYear === worldYear ? entry : candidate,
    ),
  });

  return { kind: "finalized", store: nextStore, entry };
}

export function toAnnualRankingDisplayFacts(
  entry: AnnualRankingHistoryEntry,
): readonly AnnualRankingDisplayFacts[] {
  return projectAnnualRankingForBrowser(
    entry.rows.map((row) => ({
      worldYear: entry.worldYear,
      personId: row.personId,
      annualRank: row.annualRank,
      yearlyCumulativeEarnings: row.yearlyCumulativeEarnings,
      currentRank: row.currentRank,
      tournamentAppearances: row.tournamentAppearances,
      tournamentWins: row.tournamentWins,
      officialWins: row.officialWins,
      officialLosses: row.officialLosses,
      displayOrder: row.displayOrder,
    })),
  );
}

export function validateAnnualRankingHistoryEntry(
  entry: AnnualRankingHistoryEntry,
  provider: Sha256Provider,
): ValidationResult<AnnualRankingHistoryEntry> {
  const issues: ValidationIssue[] = [];
  if (entry.schemaVersion !== ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "annual ranking history entry schemaVersion mismatch",
      actual: entry.schemaVersion,
      expected: ANNUAL_RANKING_HISTORY_ENTRY_SCHEMA_VERSION,
    });
  }

  for (let i = 0; i < entry.rows.length; i += 1) {
    const row = entry.rows[i]!;
    if (row.schemaVersion !== ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION) {
      issues.push({
        path: `/rows/${String(i)}/schemaVersion`,
        message: "annual ranking history row schemaVersion mismatch",
        actual: row.schemaVersion,
        expected: ANNUAL_RANKING_HISTORY_ROW_SCHEMA_VERSION,
      });
    }
    const { rowHash, ...withoutHash } = row;
    const expectedRowHash = computeAnnualRankingHistoryRowHash(withoutHash, provider);
    if (!expectedRowHash.ok) {
      return expectedRowHash;
    }
    if (expectedRowHash.value !== rowHash) {
      issues.push({
        path: `/rows/${String(i)}/rowHash`,
        message: "annual ranking history row hash mismatch",
        actual: rowHash,
        expected: expectedRowHash.value,
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const { historyHash, ...withoutHash } = entry;
  const expectedHistoryHash = computeAnnualRankingHistoryEntryHash(withoutHash, provider);
  if (!expectedHistoryHash.ok) {
    return expectedHistoryHash;
  }
  if (expectedHistoryHash.value !== historyHash) {
    return failure([
      {
        path: "/historyHash",
        message: "annual ranking history entry hash mismatch",
        actual: historyHash,
        expected: expectedHistoryHash.value,
      },
    ]);
  }

  return success(entry);
}
