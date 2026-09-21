/**
 * S03-017 persisted Sprint2 competitive-record map for live Sprint1 weekly qualification wiring.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import {
  computeCompetitiveRecordHash,
  validateCompetitiveRecordShape,
  type CompetitiveRecord,
} from "../sprint2/competitive-record-update.js";
import {
  SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID,
  SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION,
} from "./constants.js";

export const SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "processorId",
  "records",
] as const;

export type Sprint2CompetitiveRecordRuntimeState = {
  schemaVersion: typeof SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION;
  processorId: typeof SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID;
  /** PersonId ascending canonical order. */
  records: readonly CompetitiveRecord[];
};

export function createEmptySprint2CompetitiveRecordRuntimeState(): Sprint2CompetitiveRecordRuntimeState {
  return deepFreezePlainJson({
    schemaVersion: SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION,
    processorId: SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID,
    records: [],
  });
}

export function validateCompetitiveRecord(
  record: unknown,
  provider: Sha256Provider,
  path = "",
): ValidationResult<CompetitiveRecord> {
  const issues: ValidationIssue[] = [];
  if (typeof record !== "object" || record === null) {
    return failure([
      {
        path,
        message: "CompetitiveRecord must be an object",
        actual: record,
      },
    ]);
  }
  const shaped = record as CompetitiveRecord;
  issues.push(
    ...validateCompetitiveRecordShape(shaped).map((issue) => ({
      ...issue,
      path: `${path}${issue.path}`,
    })),
  );
  if (issues.length > 0) {
    return failure(issues);
  }
  const { recordHash, ...withoutHash } = shaped;
  const hash = computeCompetitiveRecordHash(withoutHash, provider);
  if (!hash.ok) {
    return failure(hash.issues.map((issue) => ({ ...issue, path: `${path}${issue.path}` })));
  }
  if (hash.value !== recordHash) {
    return failure([
      {
        path: `${path}/recordHash`,
        message: "competitive record hash mismatch",
        actual: recordHash,
        expected: hash.value,
      },
    ]);
  }
  return success(deepFreezePlainJson(shaped));
}

export function validateSprint2CompetitiveRecordRuntimeState(
  input: unknown,
  provider: Sha256Provider,
  path = "",
): ValidationResult<Sprint2CompetitiveRecordRuntimeState> {
  const issues: ValidationIssue[] = [];
  const at = path === "" ? "" : path;
  const object = snapshotPlainObjectOrFail(input, at, issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: at,
              message: "Sprint2CompetitiveRecordRuntimeState must be a plain object",
              actual: input,
            },
          ],
    );
  }
  assertNoAccessors(object, at, issues);
  rejectUnknownKeys(object, SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_KEYS, at, issues);
  if (object.schemaVersion !== SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION) {
    issues.push({
      path: `${at}/schemaVersion`,
      message: "unsupported sprint2 competitive record runtime schema version",
      actual: object.schemaVersion,
      expected: SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION,
    });
  }
  if (object.processorId !== SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID) {
    issues.push({
      path: `${at}/processorId`,
      message: "unexpected sprint2 competitive record runtime processorId",
      actual: object.processorId,
      expected: SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID,
    });
  }
  const rawRecords = snapshotDenseArrayOrFail(object["records"], `${at}/records`, issues);
  const records: CompetitiveRecord[] = [];
  if (rawRecords !== undefined) {
    for (let index = 0; index < rawRecords.length; index += 1) {
      const validated = validateCompetitiveRecord(
        rawRecords[index],
        provider,
        `${at}/records/${String(index)}`,
      );
      if (validated.ok) {
        records.push(validated.value);
      } else {
        issues.push(...validated.issues);
      }
    }
  }
  for (let index = 1; index < records.length; index += 1) {
    const previousId = records[index - 1]!.personId;
    const currentId = records[index]!.personId;
    if (compareUnicodeCodePoints(previousId, currentId) >= 0) {
      issues.push({
        path: `${at}/records/${String(index)}/personId`,
        message: "competitive records must be sorted by personId ascending",
        actual: currentId,
        expected: `after ${previousId}`,
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(
    deepFreezePlainJson({
      schemaVersion: SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION,
      processorId: SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID,
      records,
    }),
  );
}

export function competitiveRecordsByPersonIdFromRuntime(
  runtime: Sprint2CompetitiveRecordRuntimeState | undefined,
): ReadonlyMap<PersonId, CompetitiveRecord> | undefined {
  if (runtime === undefined || runtime.records.length === 0) {
    return undefined;
  }
  return new Map(runtime.records.map((record) => [record.personId, record]));
}

export function buildSprint2CompetitiveRecordRuntimeStateFromRecords(
  records: readonly CompetitiveRecord[],
  provider: Sha256Provider,
): ValidationResult<Sprint2CompetitiveRecordRuntimeState> {
  const sorted = [...records].sort((left, right) =>
    compareUnicodeCodePoints(left.personId, right.personId),
  );
  const validatedRecords: CompetitiveRecord[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const validated = validateCompetitiveRecord(
      sorted[index],
      provider,
      `/records/${String(index)}`,
    );
    if (!validated.ok) {
      return validated;
    }
    validatedRecords.push(validated.value);
  }
  return validateSprint2CompetitiveRecordRuntimeState(
    {
      schemaVersion: SPRINT2_COMPETITIVE_RECORD_RUNTIME_STATE_SCHEMA_VERSION,
      processorId: SPRINT2_COMPETITIVE_RECORD_RUNTIME_PROCESSOR_ID,
      records: validatedRecords,
    },
    provider,
  );
}
