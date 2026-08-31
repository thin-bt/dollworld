/**
 * S02-009 retained/pruned StoredBattleResult materialization.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleDetailedLog } from "../sprint1/battle-state.js";
import { validateBattleDetailedLog } from "../sprint1/battle-state.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { computeDetailedLogPayloadBytes, getDetailedLogPayloadBytes } from "./detailed-log-payload-store.js";
import type { DetailedLogPayloadStore } from "./detailed-log-payload-store.js";
import { MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION } from "./constants.js";
import {
  validateStoredBattleResultRecord,
  validateStoredBattleResultReferences,
  type StoredBattleResultRecord,
} from "./stored-battle-result.js";

export type MaterializedBattleResultView = {
  schemaVersion: typeof MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION;
  storedRecord: StoredBattleResultRecord;
  detailedLog: BattleDetailedLog | null;
};

function parseDetailedLogFromPayloadBytes(
  bytes: string,
  detailedLogHash: string,
  provider: Sha256Provider,
): ValidationResult<BattleDetailedLog> {
  const digest = safeHashUtf8(provider, bytes, "/detailedLogHash");
  if (!digest.ok) {
    return digest;
  }
  if (digest.value !== detailedLogHash) {
    return failure([
      {
        path: "/detailedLogHash",
        message: "materialized payload hash mismatch",
        actual: digest.value,
        expected: detailedLogHash,
      },
    ]);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes) as unknown;
  } catch (error) {
    return failure([
      {
        path: "/detailedLog",
        message: "detailed log payload is not valid JSON",
        actual: error instanceof Error ? error.message : String(error),
      },
    ]);
  }
  return validateBattleDetailedLog(parsed);
}

export function materializeStoredBattleResultView(
  record: StoredBattleResultRecord,
  payloadStore: DetailedLogPayloadStore,
  provider: Sha256Provider,
): ValidationResult<MaterializedBattleResultView> {
  const validatedRecord = validateStoredBattleResultRecord(record, provider);
  if (!validatedRecord.ok) {
    return validatedRecord;
  }
  if (validatedRecord.value.detailedLogRetentionStatus === "pruned") {
    return success({
      schemaVersion: MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION,
      storedRecord: validatedRecord.value,
      detailedLog: null,
    });
  }
  const reference = validateStoredBattleResultReferences(validatedRecord.value, payloadStore);
  if (!reference.ok) {
    return reference;
  }
  const bytes = getDetailedLogPayloadBytes(payloadStore, validatedRecord.value.detailedLogHash);
  if (bytes === undefined) {
    return failure([
      {
        path: "/detailedLog",
        message: "retained materialization requires matching detailed log payload",
        actual: validatedRecord.value.detailedLogHash,
        expected: "existing payload bytes",
      },
    ]);
  }
  const detailedLog = parseDetailedLogFromPayloadBytes(
    bytes,
    validatedRecord.value.detailedLogHash,
    provider,
  );
  if (!detailedLog.ok) {
    return detailedLog;
  }
  return success({
    schemaVersion: MATERIALIZED_BATTLE_RESULT_VIEW_SCHEMA_VERSION,
    storedRecord: validatedRecord.value,
    detailedLog: detailedLog.value,
  });
}

export function rejectPrunedDetailedLogProjection(
  view: MaterializedBattleResultView,
): ValidationResult<MaterializedBattleResultView> {
  if (view.storedRecord.detailedLogRetentionStatus === "pruned" && view.detailedLog !== null) {
    return failure([
      {
        path: "/detailedLog",
        message: "pruned stored battle result must materialize with null detailedLog",
        actual: view.detailedLog,
        expected: "null",
      },
    ]);
  }
  return success(view);
}

export function verifyRetainedDetailedLogPayloadIdentity(
  detailedLog: BattleDetailedLog,
  expectedHash: string,
  provider: Sha256Provider,
): ValidationResult<string> {
  const bytes = computeDetailedLogPayloadBytes(detailedLog);
  if (!bytes.ok) {
    return bytes;
  }
  const digest = safeHashUtf8(provider, bytes.value, "/detailedLogHash");
  if (!digest.ok) {
    return digest;
  }
  if (digest.value !== expectedHash) {
    return failure([
      {
        path: "/detailedLogHash",
        message: "retained detailed log payload identity mismatch",
        actual: digest.value,
        expected: expectedHash,
      },
    ]);
  }
  return success(digest.value);
}
