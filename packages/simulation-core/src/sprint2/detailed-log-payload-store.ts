/**
 * S02-009 immutable detailed-log payload identity/storage (canonical JSON + SHA-256).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleDetailedLog } from "../sprint1/battle-state.js";
import { validateBattleDetailedLog } from "../sprint1/battle-state.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION } from "./constants.js";

export type DetailedLogPayloadEntry = {
  detailedLogHash: string;
  canonicalUtf8Bytes: string;
};

export type DetailedLogPayloadStore = {
  schemaVersion: typeof DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION;
  entries: ReadonlyMap<string, DetailedLogPayloadEntry>;
};

export type PutDetailedLogPayloadOutcome =
  | { kind: "inserted" }
  | { kind: "already_present" }
  | { kind: "integrity_failure"; issues: readonly ValidationIssue[] };

export function createEmptyDetailedLogPayloadStore(): DetailedLogPayloadStore {
  return {
    schemaVersion: DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
    entries: new Map(),
  };
}

export function computeDetailedLogPayloadBytes(
  detailedLog: BattleDetailedLog,
): ValidationResult<string> {
  const validated = validateBattleDetailedLog(detailedLog);
  if (!validated.ok) {
    return validated;
  }
  return success(toCanonicalJson(validated.value));
}

export function computeDetailedLogPayloadHash(
  detailedLog: BattleDetailedLog,
  provider: Sha256Provider,
): ValidationResult<string> {
  const bytes = computeDetailedLogPayloadBytes(detailedLog);
  if (!bytes.ok) {
    return bytes;
  }
  return safeHashUtf8(provider, bytes.value, "/detailedLogHash");
}

export function getDetailedLogPayloadBytes(
  store: DetailedLogPayloadStore,
  detailedLogHash: string,
): string | undefined {
  return store.entries.get(detailedLogHash)?.canonicalUtf8Bytes;
}

export function putDetailedLogPayloadIfAbsent(
  store: DetailedLogPayloadStore,
  detailedLog: BattleDetailedLog,
  provider: Sha256Provider,
): ValidationResult<{ store: DetailedLogPayloadStore; outcome: PutDetailedLogPayloadOutcome }> {
  const bytesResult = computeDetailedLogPayloadBytes(detailedLog);
  if (!bytesResult.ok) {
    return bytesResult;
  }
  const hashResult = safeHashUtf8(provider, bytesResult.value, "/detailedLogHash");
  if (!hashResult.ok) {
    return hashResult;
  }
  const detailedLogHash = hashResult.value;
  const existing = store.entries.get(detailedLogHash);
  if (existing !== undefined) {
    if (existing.canonicalUtf8Bytes !== bytesResult.value) {
      return success({
        store,
        outcome: {
          kind: "integrity_failure",
          issues: [
            {
              path: "/detailedLogHash",
              message: "detailed log payload hash collision with mismatched canonical bytes",
              actual: detailedLogHash,
              expected: "identical canonical UTF-8 bytes for existing hash",
            },
          ],
        },
      });
    }
    return success({ store, outcome: { kind: "already_present" } });
  }
  const nextEntries = new Map(store.entries);
  nextEntries.set(detailedLogHash, {
    detailedLogHash,
    canonicalUtf8Bytes: bytesResult.value,
  });
  return success({
    store: {
      schemaVersion: DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
      entries: nextEntries,
    },
    outcome: { kind: "inserted" },
  });
}

export function countRetainedPayloadReferences(
  detailedLogHash: string,
  records: readonly { detailedLogHash: string; detailedLogRetentionStatus: string }[],
): number {
  let count = 0;
  for (const record of records) {
    if (
      record.detailedLogHash === detailedLogHash &&
      record.detailedLogRetentionStatus === "retained"
    ) {
      count += 1;
    }
  }
  return count;
}

export function deleteDetailedLogPayloadEntries(
  store: DetailedLogPayloadStore,
  hashes: readonly string[],
): DetailedLogPayloadStore {
  if (hashes.length === 0) {
    return store;
  }
  const nextEntries = new Map(store.entries);
  for (const hash of hashes) {
    nextEntries.delete(hash);
  }
  return {
    schemaVersion: DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
    entries: nextEntries,
  };
}
