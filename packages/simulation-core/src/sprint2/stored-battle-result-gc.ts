/**
 * S02-009 shared-payload-safe detailed-log GC eligibility/planning/execution.
 */
import {
  countRetainedPayloadReferences,
  deleteDetailedLogPayloadEntries,
  type DetailedLogPayloadStore,
} from "./detailed-log-payload-store.js";
import type { StoredBattleResultRecord } from "./stored-battle-result.js";

export type DetailedLogPayloadGcPlan = {
  eligibleHashes: readonly string[];
};

export type DetailedLogPayloadGcExecutor = {
  deletePayload: (detailedLogHash: string) => { ok: true } | { ok: false; error: string };
};

export type DetailedLogPayloadGcExecutionResult =
  | {
      kind: "success";
      store: DetailedLogPayloadStore;
      deletedHashes: readonly string[];
    }
  | {
      kind: "failure";
      store: DetailedLogPayloadStore;
      failedHash: string;
      error: string;
      deletedHashes: readonly string[];
    };

export function planDetailedLogPayloadGc(
  records: readonly StoredBattleResultRecord[],
  payloadStore: DetailedLogPayloadStore,
): DetailedLogPayloadGcPlan {
  const eligible: string[] = [];
  for (const hash of payloadStore.entries.keys()) {
    if (countRetainedPayloadReferences(hash, records) === 0) {
      eligible.push(hash);
    }
  }
  return { eligibleHashes: Object.freeze(eligible) };
}

export function executeDetailedLogPayloadGc(
  plan: DetailedLogPayloadGcPlan,
  store: DetailedLogPayloadStore,
  executor: DetailedLogPayloadGcExecutor = defaultGcExecutor,
): DetailedLogPayloadGcExecutionResult {
  const deleted: string[] = [];
  let currentStore = store;
  for (const hash of plan.eligibleHashes) {
    const outcome = executor.deletePayload(hash);
    if (!outcome.ok) {
      return {
        kind: "failure",
        store: currentStore,
        failedHash: hash,
        error: outcome.error,
        deletedHashes: Object.freeze(deleted),
      };
    }
    deleted.push(hash);
    currentStore = deleteDetailedLogPayloadEntries(currentStore, [hash]);
  }
  return {
    kind: "success",
    store: currentStore,
    deletedHashes: Object.freeze(deleted),
  };
}

const defaultGcExecutor: DetailedLogPayloadGcExecutor = {
  deletePayload: () => ({ ok: true }),
};

export function retainedOwnerCountForPayload(
  detailedLogHash: string,
  records: readonly StoredBattleResultRecord[],
): number {
  return countRetainedPayloadReferences(detailedLogHash, records);
}

export function logicalPruneSurvivesGcFailure(
  recordsBefore: readonly StoredBattleResultRecord[],
  recordsAfter: readonly StoredBattleResultRecord[],
): boolean {
  if (recordsBefore.length !== recordsAfter.length) {
    return false;
  }
  for (let index = 0; index < recordsBefore.length; index += 1) {
    const before = recordsBefore[index]!;
    const after = recordsAfter[index]!;
    if (before.matchId !== after.matchId) {
      return false;
    }
    if (before.detailedLogRetentionStatus !== after.detailedLogRetentionStatus) {
      return false;
    }
    if (before.storedRecordHash !== after.storedRecordHash) {
      return false;
    }
  }
  return true;
}
