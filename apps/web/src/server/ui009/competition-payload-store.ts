import type {
  DetailedLogPayloadEntry,
  DetailedLogPayloadStore,
} from "@shared-world/simulation-core";

export type PersistedDetailedLogPayloadStore = {
  readonly schemaVersion: DetailedLogPayloadStore["schemaVersion"];
  readonly entries: readonly DetailedLogPayloadEntry[];
};

/** Convert the Map-backed Sprint2 store into JSON-safe session state. */
export function persistDetailedLogPayloadStore(
  store: DetailedLogPayloadStore,
): PersistedDetailedLogPayloadStore {
  return {
    schemaVersion: store.schemaVersion,
    entries: [...store.entries.values()]
      .map((entry) => ({ ...entry }))
      .sort((a, b) =>
        a.detailedLogHash < b.detailedLogHash ? -1 : a.detailedLogHash > b.detailedLogHash ? 1 : 0,
      ),
  };
}

/** Restore the Map-backed store required by executeTournamentBattleAtomic. */
export function restoreDetailedLogPayloadStore(
  persisted: Record<string, unknown>,
): DetailedLogPayloadStore | null {
  if (typeof persisted.schemaVersion !== "string" || !Array.isArray(persisted.entries)) {
    return null;
  }
  const entries = new Map<string, DetailedLogPayloadEntry>();
  for (const raw of persisted.entries) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
      return null;
    }
    const row = raw as Record<string, unknown>;
    if (
      typeof row.detailedLogHash !== "string" ||
      typeof row.canonicalUtf8Bytes !== "string" ||
      row.detailedLogHash.length === 0
    ) {
      return null;
    }
    if (entries.has(row.detailedLogHash)) {
      return null;
    }
    entries.set(row.detailedLogHash, {
      detailedLogHash: row.detailedLogHash,
      canonicalUtf8Bytes: row.canonicalUtf8Bytes,
    });
  }
  return {
    schemaVersion: persisted.schemaVersion as DetailedLogPayloadStore["schemaVersion"],
    entries,
  };
}
