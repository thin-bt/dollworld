/**
 * S02-010 detailed-log checkpoint manifest (S02-009 payload membership).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION } from "./constants.js";
import type { DetailedLogPayloadStore } from "./detailed-log-payload-store.js";
import type { StoredBattleResultRecord } from "./stored-battle-result.js";

export type DetailedBattleLogCheckpointManifestEntry = {
  detailedLogHash: string;
  logicalPath: string;
};

export type DetailedBattleLogCheckpointManifest = {
  schemaVersion: typeof DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION;
  entries: readonly DetailedBattleLogCheckpointManifestEntry[];
  manifestHash: string;
};

const HASH_PATH_PATTERN = /^detailed-logs\/payloads\/[0-9a-f]{2}\/[0-9a-f]{64}\.json$/;

export function buildDetailedLogLogicalPath(detailedLogHash: string): ValidationResult<string> {
  if (!/^[0-9a-f]{64}$/.test(detailedLogHash)) {
    return failure([
      {
        path: "/detailedLogHash",
        message: "detailedLogHash must be lowercase hex SHA-256",
        actual: detailedLogHash,
      },
    ]);
  }
  return success(`detailed-logs/payloads/${detailedLogHash.slice(0, 2)}/${detailedLogHash}.json`);
}

export function validateDetailedLogLogicalPath(pathValue: string): ValidationResult<string> {
  if (pathValue.includes("..") || pathValue.includes("\\")) {
    return failure([
      {
        path: "/logicalPath",
        message: "logical path must not contain traversal segments",
        actual: pathValue,
      },
    ]);
  }
  if (pathValue !== pathValue.toLowerCase()) {
    return failure([
      {
        path: "/logicalPath",
        message: "logical path must be lowercase",
        actual: pathValue,
      },
    ]);
  }
  if (!HASH_PATH_PATTERN.test(pathValue)) {
    return failure([
      {
        path: "/logicalPath",
        message: "logical path must match canonical detailed-log payload layout",
        actual: pathValue,
        expected: "detailed-logs/payloads/{hh}/{hash}.json",
      },
    ]);
  }
  return success(pathValue);
}

export function buildDetailedBattleLogCheckpointManifest(
  retainedRecords: readonly StoredBattleResultRecord[],
  provider: Sha256Provider,
): ValidationResult<DetailedBattleLogCheckpointManifest> {
  const retainedHashes = new Set<string>();
  for (const record of retainedRecords) {
    if (record.detailedLogRetentionStatus === "retained") {
      retainedHashes.add(record.detailedLogHash);
    }
  }
  const sortedHashes = [...retainedHashes].sort((a, b) => a.localeCompare(b));
  const entries: DetailedBattleLogCheckpointManifestEntry[] = [];
  for (const detailedLogHash of sortedHashes) {
    const logicalPath = buildDetailedLogLogicalPath(detailedLogHash);
    if (!logicalPath.ok) {
      return logicalPath;
    }
    entries.push({
      detailedLogHash,
      logicalPath: logicalPath.value,
    });
  }
  const manifestHash = safeHashUtf8(
    provider,
    toCanonicalJson({
      schemaVersion: DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION,
      entries,
    }),
    "/manifestHash",
  );
  if (!manifestHash.ok) {
    return manifestHash;
  }
  return success(
    deepFreezePlainJson({
      schemaVersion: DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION,
      entries,
      manifestHash: manifestHash.value,
    }),
  );
}

export function validateDetailedBattleLogCheckpointManifest(
  manifest: unknown,
  provider: Sha256Provider,
): ValidationResult<DetailedBattleLogCheckpointManifest> {
  const issues: ValidationIssue[] = [];
  if (typeof manifest !== "object" || manifest === null) {
    return failure([{ path: "", message: "manifest must be an object", actual: manifest }]);
  }
  const object = manifest as Record<string, unknown>;
  if (object.schemaVersion !== DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "unsupported manifest schema version",
      actual: object.schemaVersion,
    });
  }
  if (!Array.isArray(object.entries)) {
    issues.push({ path: "/entries", message: "entries must be an array", actual: object.entries });
    return failure(issues);
  }
  const entries: DetailedBattleLogCheckpointManifestEntry[] = [];
  const seenHashes = new Set<string>();
  for (let index = 0; index < object.entries.length; index += 1) {
    const entry = object.entries[index] as Record<string, unknown>;
    const detailedLogHash = entry.detailedLogHash;
    const logicalPath = entry.logicalPath;
    if (typeof detailedLogHash !== "string" || !/^[0-9a-f]{64}$/.test(detailedLogHash)) {
      issues.push({
        path: `/entries/${String(index)}/detailedLogHash`,
        message: "invalid detailedLogHash",
        actual: detailedLogHash,
      });
      continue;
    }
    if (seenHashes.has(detailedLogHash)) {
      issues.push({
        path: `/entries/${String(index)}/detailedLogHash`,
        message: "duplicate manifest entry",
        actual: detailedLogHash,
      });
    }
    seenHashes.add(detailedLogHash);
    const pathResult = validateDetailedLogLogicalPath(String(logicalPath));
    if (!pathResult.ok) {
      issues.push(
        ...pathResult.issues.map((issue) => ({
          ...issue,
          path: `/entries/${String(index)}${issue.path}`,
        })),
      );
      continue;
    }
    const expectedPath = buildDetailedLogLogicalPath(detailedLogHash);
    if (expectedPath.ok && expectedPath.value !== pathResult.value) {
      issues.push({
        path: `/entries/${String(index)}/logicalPath`,
        message: "logical path does not match hash",
        actual: pathResult.value,
        expected: expectedPath.value,
      });
    }
    entries.push({ detailedLogHash, logicalPath: pathResult.value });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  const manifestHash = safeHashUtf8(
    provider,
    toCanonicalJson({
      schemaVersion: DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION,
      entries,
    }),
    "/manifestHash",
  );
  if (!manifestHash.ok) {
    return manifestHash;
  }
  if (object.manifestHash !== manifestHash.value) {
    return failure([
      {
        path: "/manifestHash",
        message: "manifest hash mismatch",
        actual: object.manifestHash,
        expected: manifestHash.value,
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      schemaVersion: DETAILED_BATTLE_LOG_CHECKPOINT_MANIFEST_SCHEMA_VERSION,
      entries,
      manifestHash: manifestHash.value,
    }),
  );
}

export function assertManifestMatchesRetainedRecords(
  manifest: DetailedBattleLogCheckpointManifest,
  retainedRecords: readonly StoredBattleResultRecord[],
): ValidationResult<true> {
  const retainedHashes = new Set<string>();
  for (const record of retainedRecords) {
    if (record.detailedLogRetentionStatus === "retained") {
      retainedHashes.add(record.detailedLogHash);
    }
  }
  const manifestHashes = new Set(manifest.entries.map((entry) => entry.detailedLogHash));
  if (retainedHashes.size !== manifestHashes.size) {
    return failure([
      {
        path: "/entries",
        message: "manifest entry count must match retained payload count",
        actual: String(manifestHashes.size),
        expected: String(retainedHashes.size),
      },
    ]);
  }
  for (const hash of retainedHashes) {
    if (!manifestHashes.has(hash)) {
      return failure([
        {
          path: "/entries",
          message: "manifest missing retained payload entry",
          actual: hash,
        },
      ]);
    }
  }
  for (const hash of manifestHashes) {
    if (!retainedHashes.has(hash)) {
      return failure([
        {
          path: "/entries",
          message: "manifest contains extra payload entry",
          actual: hash,
        },
      ]);
    }
  }
  return success(true);
}

export function assertManifestMatchesPayloadStore(
  manifest: DetailedBattleLogCheckpointManifest,
  payloadStore: DetailedLogPayloadStore,
): ValidationResult<true> {
  const storeHashes = new Set(payloadStore.entries.keys());
  const manifestHashes = new Set(manifest.entries.map((entry) => entry.detailedLogHash));
  if (storeHashes.size !== manifestHashes.size) {
    return failure([
      {
        path: "/entries",
        message: "manifest must match payload store membership exactly",
        actual: String(manifestHashes.size),
        expected: String(storeHashes.size),
      },
    ]);
  }
  for (const hash of storeHashes) {
    if (!manifestHashes.has(hash)) {
      return failure([
        {
          path: "/entries",
          message: "manifest missing payload store entry",
          actual: hash,
        },
      ]);
    }
  }
  return success(true);
}
