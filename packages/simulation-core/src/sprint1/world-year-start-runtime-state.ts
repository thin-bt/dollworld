/**
 * WorldYearStartRuntimeState / Receipt / TransactionAggregate 0.1.0
 * (CAL-JAN-SYNC 0.2.4 §2.4).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";

export const WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION = "0.1.0" as const;
export const WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION = "0.1.0" as const;
export const WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION = "0.1.0" as const;

const HEX64_PATTERN = /^[0-9a-f]{64}$/;

export type WorldYearStartReceipt = {
  schemaVersion: typeof WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION;
  simulationId: SimulationId;
  worldYear: number;
  worldDate: WorldDate;
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
  previousWorldYear: number;
  preTransactionAggregateHash: string;
  preTransactionRngStateHash: string;
  postTransactionAggregateHash: string;
  postTransactionRngStateHash: string;
  firstEventSequence: number;
  eventCount: number;
};

export type WorldYearStartRuntimeState = {
  schemaVersion: typeof WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION;
  lastCompletedWorldYearStart: number;
  receipts: readonly WorldYearStartReceipt[];
};

export type WorldYearStartTransactionAggregate = {
  schemaVersion: typeof WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION;
  worldStateHash: string;
  worldRngStateHash: string;
  idGeneratorStatesHash: string;
  eventAllocationStateHash: string;
  eventStreamHash: string;
  processorRuntimeStateHash: string;
};

export const WORLD_YEAR_START_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "lastCompletedWorldYearStart",
  "receipts",
] as const;

export const WORLD_YEAR_START_RECEIPT_KEYS = [
  "schemaVersion",
  "simulationId",
  "worldYear",
  "worldDate",
  "worldCalendarConfigHash",
  "yearStartProcessorManifestHash",
  "previousWorldYear",
  "preTransactionAggregateHash",
  "preTransactionRngStateHash",
  "postTransactionAggregateHash",
  "postTransactionRngStateHash",
  "firstEventSequence",
  "eventCount",
] as const;

export const WORLD_YEAR_START_TRANSACTION_AGGREGATE_KEYS = [
  "schemaVersion",
  "worldStateHash",
  "worldRngStateHash",
  "idGeneratorStatesHash",
  "eventAllocationStateHash",
  "eventStreamHash",
  "processorRuntimeStateHash",
] as const;

const WORLD_DATE_KEYS = ["year", "month", "weekOfMonth", "absoluteWeek"] as const;

export function createInitialWorldYearStartRuntimeState(): WorldYearStartRuntimeState {
  return deepFreezePlainJson({
    schemaVersion: WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
    lastCompletedWorldYearStart: 1,
    receipts: [],
  });
}

export function validateWorldYearStartReceipt(
  input: unknown,
): ValidationResult<WorldYearStartReceipt> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WORLD_YEAR_START_RECEIPT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION,
    issues,
  );
  const simulationId = requireSimulationId(object, "simulationId", "", issues);
  const worldYear = requireSafeIntegerAtLeast(object, "worldYear", "", 2, issues);
  const worldDate = parseWorldDateField(object["worldDate"], "/worldDate", issues);
  const worldCalendarConfigHash = requireHex64(object, "worldCalendarConfigHash", "", issues);
  const yearStartProcessorManifestHash = requireHex64(
    object,
    "yearStartProcessorManifestHash",
    "",
    issues,
  );
  const previousWorldYear = requireSafeIntegerAtLeast(object, "previousWorldYear", "", 1, issues);
  const preTransactionAggregateHash = requireHex64(
    object,
    "preTransactionAggregateHash",
    "",
    issues,
  );
  const preTransactionRngStateHash = requireHex64(object, "preTransactionRngStateHash", "", issues);
  const postTransactionAggregateHash = requireHex64(
    object,
    "postTransactionAggregateHash",
    "",
    issues,
  );
  const postTransactionRngStateHash = requireHex64(
    object,
    "postTransactionRngStateHash",
    "",
    issues,
  );
  const firstEventSequence = requireSafeIntegerAtLeast(object, "firstEventSequence", "", 0, issues);
  const eventCount = requireSafeIntegerAtLeast(object, "eventCount", "", 1, issues);

  if (
    worldYear !== undefined &&
    previousWorldYear !== undefined &&
    previousWorldYear !== worldYear - 1
  ) {
    issues.push({
      path: "/previousWorldYear",
      message: "previousWorldYear must equal worldYear - 1",
      actual: previousWorldYear,
      expected: String(worldYear - 1),
    });
  }

  if (
    firstEventSequence !== undefined &&
    eventCount !== undefined &&
    !Number.isSafeInteger(firstEventSequence + eventCount)
  ) {
    issues.push({
      path: "/eventCount",
      message: "firstEventSequence + eventCount must be a safe integer",
      actual: firstEventSequence + eventCount,
      expected: "safe integer",
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: schemaVersion!,
      simulationId: simulationId!,
      worldYear: worldYear!,
      worldDate: worldDate!,
      worldCalendarConfigHash: worldCalendarConfigHash!,
      yearStartProcessorManifestHash: yearStartProcessorManifestHash!,
      previousWorldYear: previousWorldYear!,
      preTransactionAggregateHash: preTransactionAggregateHash!,
      preTransactionRngStateHash: preTransactionRngStateHash!,
      postTransactionAggregateHash: postTransactionAggregateHash!,
      postTransactionRngStateHash: postTransactionRngStateHash!,
      firstEventSequence: firstEventSequence!,
      eventCount: eventCount!,
    }),
  );
}

export function validateWorldYearStartRuntimeState(
  input: unknown,
): ValidationResult<WorldYearStartRuntimeState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WORLD_YEAR_START_RUNTIME_STATE_KEYS, "", issues);

  requireLiteralString(
    object,
    "schemaVersion",
    "",
    WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
    issues,
  );
  const lastCompleted = requireSafeIntegerAtLeast(
    object,
    "lastCompletedWorldYearStart",
    "",
    1,
    issues,
  );
  const receiptsRaw = snapshotDenseArrayOrFail(object["receipts"], "/receipts", issues);
  if (receiptsRaw === undefined || lastCompleted === undefined) {
    return failure(issues);
  }

  const receipts: WorldYearStartReceipt[] = [];
  for (let index = 0; index < receiptsRaw.length; index += 1) {
    const result = validateWorldYearStartReceipt(receiptsRaw[index]);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.push({
          ...issue,
          path:
            issue.path === ""
              ? `/receipts/${String(index)}`
              : `/receipts/${String(index)}${issue.path}`,
        });
      }
      continue;
    }
    receipts.push(result.value);
  }

  if (lastCompleted === 1) {
    if (receipts.length !== 0) {
      issues.push({
        path: "/receipts",
        message: "initial world year-start runtime must have empty receipts",
        actual: receipts.length,
        expected: "0",
      });
    }
  } else if (receipts.length !== lastCompleted - 1) {
    issues.push({
      path: "/receipts",
      message: "receipts length must equal lastCompletedWorldYearStart - 1",
      actual: receipts.length,
      expected: String(lastCompleted - 1),
    });
  }

  for (let index = 0; index < receipts.length; index += 1) {
    const expectedYear = index + 2;
    if (receipts[index]!.worldYear !== expectedYear) {
      issues.push({
        path: `/receipts/${String(index)}/worldYear`,
        message: "receipts must be contiguous worldYear ascending from 2",
        actual: receipts[index]!.worldYear,
        expected: String(expectedYear),
      });
    }
    if (index > 0 && receipts[index]!.worldYear <= receipts[index - 1]!.worldYear) {
      issues.push({
        path: `/receipts/${String(index)}/worldYear`,
        message: "receipts must be strictly ascending by worldYear",
        actual: receipts[index]!.worldYear,
        expected: `> ${String(receipts[index - 1]!.worldYear)}`,
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
      lastCompletedWorldYearStart: lastCompleted,
      receipts,
    }),
  );
}

export function cloneWorldYearStartRuntimeState(
  input: unknown,
): ValidationResult<WorldYearStartRuntimeState> {
  const validated = validateWorldYearStartRuntimeState(input);
  if (!validated.ok) {
    return validated;
  }
  return success(cloneValidatedPlainJson(validated.value));
}

export function validateWorldYearStartTransactionAggregate(
  input: unknown,
): ValidationResult<WorldYearStartTransactionAggregate> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WORLD_YEAR_START_TRANSACTION_AGGREGATE_KEYS, "", issues);

  requireLiteralString(
    object,
    "schemaVersion",
    "",
    WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION,
    issues,
  );
  const worldStateHash = requireHex64(object, "worldStateHash", "", issues);
  const worldRngStateHash = requireHex64(object, "worldRngStateHash", "", issues);
  const idGeneratorStatesHash = requireHex64(object, "idGeneratorStatesHash", "", issues);
  const eventAllocationStateHash = requireHex64(object, "eventAllocationStateHash", "", issues);
  const eventStreamHash = requireHex64(object, "eventStreamHash", "", issues);
  const processorRuntimeStateHash = requireHex64(object, "processorRuntimeStateHash", "", issues);

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION,
      worldStateHash: worldStateHash!,
      worldRngStateHash: worldRngStateHash!,
      idGeneratorStatesHash: idGeneratorStatesHash!,
      eventAllocationStateHash: eventAllocationStateHash!,
      eventStreamHash: eventStreamHash!,
      processorRuntimeStateHash: processorRuntimeStateHash!,
    }),
  );
}

export function computeWorldYearStartTransactionAggregateHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateWorldYearStartTransactionAggregate(input);
  if (!validated.ok) {
    return validated;
  }
  return safeHashUtf8(
    provider,
    toCanonicalJson(validated.value),
    "/worldYearStartTransactionAggregate",
  );
}

function parseWorldDateField(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WorldDate | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, WORLD_DATE_KEYS, path, issues);
  const year = requireSafeIntegerAtLeast(object, "year", path, 1, issues);
  const month = requireSafeIntegerAtLeast(object, "month", path, 1, issues);
  const weekOfMonth = requireSafeIntegerAtLeast(object, "weekOfMonth", path, 1, issues);
  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", path, 0, issues);
  if (
    year === undefined ||
    month === undefined ||
    weekOfMonth === undefined ||
    absoluteWeek === undefined
  ) {
    return undefined;
  }
  if (month > 12) {
    issues.push({
      path: `${path}/month`,
      message: "month must be 1..12",
      actual: month,
      expected: "1..12",
    });
    return undefined;
  }
  if (weekOfMonth > 4) {
    issues.push({
      path: `${path}/weekOfMonth`,
      message: "weekOfMonth must be 1..4",
      actual: weekOfMonth,
      expected: "1..4",
    });
    return undefined;
  }
  return {
    year,
    month: month as WorldDate["month"],
    weekOfMonth: weekOfMonth as WorldDate["weekOfMonth"],
    absoluteWeek,
  };
}

function requireHex64(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = object[key];
  if (typeof value !== "string" || !HEX64_PATTERN.test(value)) {
    issues.push({
      path: path === "" ? `/${key}` : `${path}/${key}`,
      message: `${key} must be a lowercase 64-digit hex string`,
      actual: value,
      expected: "^[0-9a-f]{64}$",
    });
    return undefined;
  }
  return value;
}

function requireSimulationId(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): SimulationId | undefined {
  const value = object[key];
  if (typeof value !== "string" || !/^simulation_[0-9a-f]{16}$/.test(value)) {
    issues.push({
      path: path === "" ? `/${key}` : `${path}/${key}`,
      message: `${key} must be a SimulationId`,
      actual: value,
      expected: "simulation_<16 hex>",
    });
    return undefined;
  }
  return value as SimulationId;
}
