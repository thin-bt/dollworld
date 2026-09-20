/**
 * S02-010 checkpoint bundle construction and validation.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { validateSprint1RunSession } from "../sprint1/validate-sprint1-run-session.js";
import {
  SPRINT2_CHECKPOINT_BUNDLE_REF_SCHEMA_VERSION,
  SPRINT2_CHECKPOINT_BUNDLE_SCHEMA_VERSION,
  SUPPORTED_CHECKPOINT_BUNDLE_SCHEMA_VERSIONS,
  DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
} from "./constants.js";
import {
  assertManifestMatchesPayloadStore,
  assertManifestMatchesRetainedRecords,
  buildDetailedBattleLogCheckpointManifest,
  validateDetailedBattleLogCheckpointManifest,
  type DetailedBattleLogCheckpointManifest,
} from "./checkpoint-manifest.js";
import {
  getDetailedLogPayloadBytes,
  type DetailedLogPayloadStore,
} from "./detailed-log-payload-store.js";
import {
  validateStoredBattleResultRecord,
  validateStoredBattleResultReferences,
} from "./stored-battle-result.js";
import type { Sprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";
import { validateWorldWeekExecutionState } from "./world-week-execution-state.js";

export type Sprint2CheckpointBundleRef = {
  schemaVersion: typeof SPRINT2_CHECKPOINT_BUNDLE_REF_SCHEMA_VERSION;
  bundleHash: string;
  manifestHash: string;
  executionStateHash: string;
};

export type Sprint2CheckpointBundle = {
  schemaVersion: typeof SPRINT2_CHECKPOINT_BUNDLE_SCHEMA_VERSION;
  sessionCanonicalJson: string;
  executionState: Sprint2CheckpointRunContext["executionState"];
  manifest: DetailedBattleLogCheckpointManifest;
  payloadStore: {
    schemaVersion: Sprint2CheckpointRunContext["payloadStore"]["schemaVersion"];
    entries: readonly { detailedLogHash: string; canonicalUtf8Bytes: string }[];
  };
  retainedRecords: Sprint2CheckpointRunContext["retainedRecords"];
  annualRankingHistoryStore: Sprint2CheckpointRunContext["annualRankingHistoryStore"];
  bundleRef: Sprint2CheckpointBundleRef;
};

function computeExecutionStateHash(
  executionState: Sprint2CheckpointRunContext["executionState"],
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(executionState), "/executionStateHash");
}

function serializePayloadStore(
  context: Sprint2CheckpointRunContext,
): Sprint2CheckpointBundle["payloadStore"] {
  const entries = [...context.payloadStore.entries.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([detailedLogHash, entry]) => ({
      detailedLogHash,
      canonicalUtf8Bytes: entry.canonicalUtf8Bytes,
    }));
  return {
    schemaVersion: context.payloadStore.schemaVersion,
    entries,
  };
}

export function buildSprint2CheckpointBundle(
  context: Sprint2CheckpointRunContext,
  provider: Sha256Provider,
): ValidationResult<Sprint2CheckpointBundle> {
  for (const record of context.retainedRecords) {
    const validatedRecord = validateStoredBattleResultRecord(record, provider);
    if (!validatedRecord.ok) {
      return validatedRecord;
    }
    const reference = validateStoredBattleResultReferences(
      validatedRecord.value,
      context.payloadStore,
    );
    if (!reference.ok) {
      return reference;
    }
    if (record.detailedLogRetentionStatus === "retained") {
      const bytes = getDetailedLogPayloadBytes(context.payloadStore, record.detailedLogHash);
      const digest = safeHashUtf8(provider, bytes ?? "", "/detailedLogHash");
      if (!digest.ok) {
        return digest;
      }
      if (digest.value !== record.detailedLogHash) {
        return failure([
          {
            path: "/payloadStore",
            message: "payload bytes hash mismatch (LOG-016 class)",
            actual: digest.value,
            expected: record.detailedLogHash,
          },
        ]);
      }
    }
  }
  const manifest = buildDetailedBattleLogCheckpointManifest(context.retainedRecords, provider);
  if (!manifest.ok) {
    return manifest;
  }
  const manifestMatch = assertManifestMatchesRetainedRecords(
    manifest.value,
    context.retainedRecords,
  );
  if (!manifestMatch.ok) {
    return manifestMatch;
  }
  const storeMatch = assertManifestMatchesPayloadStore(manifest.value, context.payloadStore);
  if (!storeMatch.ok) {
    return storeMatch;
  }
  const executionState = validateWorldWeekExecutionState(
    context.executionState,
    context.session.runtimeState.worldState.worldDate,
  );
  if (!executionState.ok) {
    return executionState;
  }
  const sessionJson = toCanonicalJson(context.session);
  const executionStateHash = computeExecutionStateHash(executionState.value, provider);
  if (!executionStateHash.ok) {
    return executionStateHash;
  }
  const payloadStore = serializePayloadStore(context);
  const bundleMaterial = {
    schemaVersion: SPRINT2_CHECKPOINT_BUNDLE_SCHEMA_VERSION,
    sessionCanonicalJson: sessionJson,
    executionState: executionState.value,
    manifest: manifest.value,
    payloadStore,
    retainedRecords: context.retainedRecords,
    annualRankingHistoryStore: context.annualRankingHistoryStore,
  };
  const bundleHash = safeHashUtf8(provider, toCanonicalJson(bundleMaterial), "/bundleHash");
  if (!bundleHash.ok) {
    return bundleHash;
  }
  const bundleRef: Sprint2CheckpointBundleRef = {
    schemaVersion: SPRINT2_CHECKPOINT_BUNDLE_REF_SCHEMA_VERSION,
    bundleHash: bundleHash.value,
    manifestHash: manifest.value.manifestHash,
    executionStateHash: executionStateHash.value,
  };
  return success(
    deepFreezePlainJson({
      ...bundleMaterial,
      bundleRef,
    }),
  );
}

export function validateSprint2CheckpointBundle(
  bundle: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint2CheckpointBundle> {
  const issues: ValidationIssue[] = [];
  if (typeof bundle !== "object" || bundle === null) {
    return failure([{ path: "", message: "bundle must be an object", actual: bundle }]);
  }
  const object = bundle as Record<string, unknown>;
  if (
    typeof object.schemaVersion !== "string" ||
    !SUPPORTED_CHECKPOINT_BUNDLE_SCHEMA_VERSIONS.includes(
      object.schemaVersion as (typeof SUPPORTED_CHECKPOINT_BUNDLE_SCHEMA_VERSIONS)[number],
    )
  ) {
    return failure([
      {
        path: "/schemaVersion",
        message: "unsupported or missing checkpoint bundle schema version",
        actual: object.schemaVersion,
        expected: SUPPORTED_CHECKPOINT_BUNDLE_SCHEMA_VERSIONS.join(","),
      },
    ]);
  }
  if (typeof object.sessionCanonicalJson !== "string") {
    issues.push({
      path: "/sessionCanonicalJson",
      message: "sessionCanonicalJson must be a string",
      actual: object.sessionCanonicalJson,
    });
  }
  let session: unknown;
  try {
    session = JSON.parse(object.sessionCanonicalJson as string);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    issues.push({
      path: "/sessionCanonicalJson",
      message: `invalid session JSON: ${detail}`,
      actual: detail,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  const validatedSession = validateSprint1RunSession(session, provider);
  if (!validatedSession.ok) {
    return failure(
      validatedSession.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/session" : `/session${issue.path}`,
      })),
    );
  }
  const executionState = validateWorldWeekExecutionState(
    object.executionState,
    validatedSession.value.runtimeState.worldState.worldDate,
  );
  if (!executionState.ok) {
    return failure(
      executionState.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/executionState" : `/executionState${issue.path}`,
      })),
    );
  }
  const manifest = validateDetailedBattleLogCheckpointManifest(object.manifest, provider);
  if (!manifest.ok) {
    return failure(
      manifest.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/manifest" : `/manifest${issue.path}`,
      })),
    );
  }
  const retainedRecords = object.retainedRecords;
  if (!Array.isArray(retainedRecords)) {
    return failure([
      {
        path: "/retainedRecords",
        message: "retainedRecords must be an array",
        actual: retainedRecords,
      },
    ]);
  }
  for (let index = 0; index < retainedRecords.length; index += 1) {
    const recordResult = validateStoredBattleResultRecord(retainedRecords[index], provider);
    if (!recordResult.ok) {
      return failure(
        recordResult.issues.map((issue) => ({
          ...issue,
          path: `/retainedRecords/${String(index)}${issue.path}`,
        })),
      );
    }
  }
  const payloadStoreObject = object.payloadStore as Record<string, unknown>;
  if (!Array.isArray(payloadStoreObject.entries)) {
    return failure([
      {
        path: "/payloadStore/entries",
        message: "payload store entries must be an array",
        actual: payloadStoreObject.entries,
      },
    ]);
  }
  const payloadEntries = new Map<string, { detailedLogHash: string; canonicalUtf8Bytes: string }>();
  for (let index = 0; index < payloadStoreObject.entries.length; index += 1) {
    const entry = payloadStoreObject.entries[index] as Record<string, unknown>;
    const hash = entry.detailedLogHash;
    const bytes = entry.canonicalUtf8Bytes;
    if (typeof hash !== "string" || typeof bytes !== "string") {
      return failure([
        {
          path: `/payloadStore/entries/${String(index)}`,
          message: "payload entry requires detailedLogHash and canonicalUtf8Bytes",
        },
      ]);
    }
    payloadEntries.set(hash, { detailedLogHash: hash, canonicalUtf8Bytes: bytes });
  }
  const rebuiltStore: DetailedLogPayloadStore = {
    schemaVersion: DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
    entries: payloadEntries,
  };
  const manifestMatch = assertManifestMatchesRetainedRecords(
    manifest.value,
    retainedRecords as Sprint2CheckpointRunContext["retainedRecords"],
  );
  if (!manifestMatch.ok) {
    return manifestMatch;
  }
  const storeMatch = assertManifestMatchesPayloadStore(manifest.value, rebuiltStore);
  if (!storeMatch.ok) {
    return storeMatch;
  }
  for (const record of retainedRecords as Sprint2CheckpointRunContext["retainedRecords"]) {
    const reference = validateStoredBattleResultReferences(record, rebuiltStore);
    if (!reference.ok) {
      return reference;
    }
    if (record.detailedLogRetentionStatus === "retained") {
      const bytes = getDetailedLogPayloadBytes(rebuiltStore, record.detailedLogHash);
      const digest = safeHashUtf8(provider, bytes ?? "", "/detailedLogHash");
      if (!digest.ok) {
        return digest;
      }
      if (digest.value !== record.detailedLogHash) {
        return failure([
          {
            path: "/payloadStore",
            message: "payload bytes hash mismatch (LOG-016 class)",
            actual: digest.value,
            expected: record.detailedLogHash,
          },
        ]);
      }
    }
  }
  const executionStateHash = computeExecutionStateHash(executionState.value, provider);
  if (!executionStateHash.ok) {
    return executionStateHash;
  }
  const bundleMaterial = {
    schemaVersion: SPRINT2_CHECKPOINT_BUNDLE_SCHEMA_VERSION,
    sessionCanonicalJson: object.sessionCanonicalJson,
    executionState: executionState.value,
    manifest: manifest.value,
    payloadStore: object.payloadStore,
    retainedRecords,
    annualRankingHistoryStore: object.annualRankingHistoryStore,
  };
  const bundleHash = safeHashUtf8(provider, toCanonicalJson(bundleMaterial), "/bundleHash");
  if (!bundleHash.ok) {
    return bundleHash;
  }
  const bundleRef = object.bundleRef as Record<string, unknown>;
  if (bundleRef.bundleHash !== bundleHash.value) {
    return failure([
      {
        path: "/bundleRef/bundleHash",
        message: "bundle hash mismatch",
        actual: bundleRef.bundleHash,
        expected: bundleHash.value,
      },
    ]);
  }
  if (bundleRef.manifestHash !== manifest.value.manifestHash) {
    return failure([
      {
        path: "/bundleRef/manifestHash",
        message: "manifest hash mismatch in bundleRef",
        actual: bundleRef.manifestHash,
        expected: manifest.value.manifestHash,
      },
    ]);
  }
  if (bundleRef.executionStateHash !== executionStateHash.value) {
    return failure([
      {
        path: "/bundleRef/executionStateHash",
        message: "execution state hash mismatch in bundleRef",
        actual: bundleRef.executionStateHash,
        expected: executionStateHash.value,
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      ...(bundleMaterial as Omit<Sprint2CheckpointBundle, "bundleRef">),
      bundleRef: {
        schemaVersion: SPRINT2_CHECKPOINT_BUNDLE_REF_SCHEMA_VERSION,
        bundleHash: bundleHash.value,
        manifestHash: manifest.value.manifestHash,
        executionStateHash: executionStateHash.value,
      },
    }),
  );
}

export function assertBundleRefMatchesBundle(
  bundle: Sprint2CheckpointBundle,
  bundleRef: Sprint2CheckpointBundleRef,
): ValidationResult<true> {
  if (bundleRef.bundleHash !== bundle.bundleRef.bundleHash) {
    return failure([
      {
        path: "/bundleRef/bundleHash",
        message: "swapped bundle reference root hash mismatch",
        actual: bundleRef.bundleHash,
        expected: bundle.bundleRef.bundleHash,
      },
    ]);
  }
  return success(true);
}
