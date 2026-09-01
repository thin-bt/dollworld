/**
 * S02-008 closing-year earnings snapshot seam for year-boundary durability.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { PREVIOUS_WORLD_YEAR_EARNINGS_SNAPSHOT_SCHEMA_VERSION } from "./constants.js";
import type { AnnualRankingHistoryEntry } from "./annual-ranking-history.js";

export type PreviousWorldYearEarningsSnapshot = {
  schemaVersion: typeof PREVIOUS_WORLD_YEAR_EARNINGS_SNAPSHOT_SCHEMA_VERSION;
  closingYear: number;
  sourceHistoryEntryHash: string;
  snapshotHash: string;
};

function buildSnapshotHashMaterial(
  snapshot: Omit<PreviousWorldYearEarningsSnapshot, "snapshotHash">,
): Record<string, unknown> {
  return {
    schemaVersion: snapshot.schemaVersion,
    closingYear: snapshot.closingYear,
    sourceHistoryEntryHash: snapshot.sourceHistoryEntryHash,
  };
}

export function computePreviousWorldYearEarningsSnapshotHash(
  snapshot: Omit<PreviousWorldYearEarningsSnapshot, "snapshotHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildSnapshotHashMaterial(snapshot)), "/snapshotHash");
}

export function buildPreviousWorldYearEarningsSnapshot(
  closingYear: number,
  historyEntry: AnnualRankingHistoryEntry,
  provider: Sha256Provider,
): ValidationResult<PreviousWorldYearEarningsSnapshot> {
  if (!historyEntry.isFinalized) {
    return failure([
      {
        path: "/isFinalized",
        message: "previous world year snapshot requires finalized annual ranking history",
        actual: historyEntry.isFinalized,
        expected: "true",
      },
    ]);
  }
  if (historyEntry.worldYear !== closingYear) {
    return failure([
      {
        path: "/worldYear",
        message: "history entry worldYear must match closingYear",
        actual: historyEntry.worldYear,
        expected: String(closingYear),
      },
    ]);
  }

  const withoutHash = {
    schemaVersion: PREVIOUS_WORLD_YEAR_EARNINGS_SNAPSHOT_SCHEMA_VERSION,
    closingYear,
    sourceHistoryEntryHash: historyEntry.historyHash,
  } satisfies Omit<PreviousWorldYearEarningsSnapshot, "snapshotHash">;

  const snapshotHash = computePreviousWorldYearEarningsSnapshotHash(withoutHash, provider);
  if (!snapshotHash.ok) {
    return snapshotHash;
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      snapshotHash: snapshotHash.value,
    }),
  );
}
