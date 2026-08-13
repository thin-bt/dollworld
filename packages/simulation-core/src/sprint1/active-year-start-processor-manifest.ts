/**
 * ActiveYearStartProcessorManifest 0.1.0 (CAL-JAN-SYNC 0.2.4 §2.4).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { S1_SPEC_VERSION } from "./constants.js";

export const ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION = "0.1.0" as const;

/** Canonical owner processorId for WorldYearStartRuntimeState (CAL-JAN 0.2.6). */
export const WORLD_YEAR_START_PROCESSOR_ID = "world-year-start" as const;

export const YEAR_START_PROCESSOR_SLOTS = [
  "previous_year_finalize",
  "mass_aging",
  "age_qualification",
  "founder_activation",
  "marriage",
  "childbirth",
  "family",
  "annual_reset",
  "retention",
  "annual_schedule",
] as const;

export type YearStartProcessorSlot = (typeof YEAR_START_PROCESSOR_SLOTS)[number];

export type YearStartImplementationStatus = "enabled" | "not_implemented";

export type ActiveYearStartProcessorManifestEntry = {
  processorId: string;
  slot: YearStartProcessorSlot;
  implementationStatus: YearStartImplementationStatus;
  orderWithinSlot: number;
  processorVersion?: string;
  sourceSpecId: string;
  sourceSpecVersion: string;
};

export type ActiveYearStartProcessorManifest = {
  schemaVersion: typeof ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION;
  specVersion: string;
  entries: readonly ActiveYearStartProcessorManifestEntry[];
};

export const ACTIVE_YEAR_START_PROCESSOR_MANIFEST_KEYS = [
  "schemaVersion",
  "specVersion",
  "entries",
] as const;

const ENTRY_KEYS_ENABLED = [
  "processorId",
  "slot",
  "implementationStatus",
  "orderWithinSlot",
  "processorVersion",
  "sourceSpecId",
  "sourceSpecVersion",
] as const;

const ENTRY_KEYS_NOT_IMPLEMENTED = [
  "processorId",
  "slot",
  "implementationStatus",
  "orderWithinSlot",
  "sourceSpecId",
  "sourceSpecVersion",
] as const;

const PROCESSOR_ID_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const ASCII_VERSION_PATTERN = /^[\x20-\x7E]{1,100}$/;

const SLOT_INDEX = new Map<YearStartProcessorSlot, number>(
  YEAR_START_PROCESSOR_SLOTS.map((slot, index) => [slot, index]),
);

/**
 * Default Sprint1 manifest: enabled annual effects that exist today;
 * future processors are not_implemented with zero side effects.
 */
export function createDefaultActiveYearStartProcessorManifest(): ActiveYearStartProcessorManifest {
  return deepFreezePlainJson({
    schemaVersion: ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION,
    specVersion: S1_SPEC_VERSION,
    entries: [
      {
        processorId: "previous-year-finalize",
        slot: "previous_year_finalize",
        implementationStatus: "enabled",
        orderWithinSlot: 1,
        processorVersion: "0.1.0",
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "mass-aging",
        slot: "mass_aging",
        implementationStatus: "enabled",
        orderWithinSlot: 1,
        processorVersion: "0.1.0",
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "age-qualification",
        slot: "age_qualification",
        implementationStatus: "enabled",
        orderWithinSlot: 1,
        processorVersion: "0.1.0",
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "founder-activation",
        slot: "founder_activation",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "marriage",
        slot: "marriage",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "childbirth",
        slot: "childbirth",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "family",
        slot: "family",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "annual-reset",
        slot: "annual_reset",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "retention",
        slot: "retention",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
      {
        processorId: "annual-schedule",
        slot: "annual_schedule",
        implementationStatus: "not_implemented",
        orderWithinSlot: 1,
        sourceSpecId: "CAL-JAN-SYNC",
        sourceSpecVersion: "0.2.4",
      },
    ],
  });
}

export function validateActiveYearStartProcessorManifest(
  input: unknown,
): ValidationResult<ActiveYearStartProcessorManifest> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, ACTIVE_YEAR_START_PROCESSOR_MANIFEST_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION,
    issues,
  );
  const specVersion = requireNonEmptyAscii(object, "specVersion", "", issues);

  const entriesRaw = snapshotDenseArrayOrFail(object["entries"], "/entries", issues);
  if (entriesRaw === undefined) {
    return failure(issues);
  }
  if (entriesRaw.length === 0) {
    issues.push({
      path: "/entries",
      message: "entries must be a non-empty array",
      actual: entriesRaw.length,
      expected: "length >= 1",
    });
    return failure(issues);
  }

  const entries: ActiveYearStartProcessorManifestEntry[] = [];
  const seenProcessorIds = new Set<string>();
  const orderBySlot = new Map<YearStartProcessorSlot, Set<number>>();
  let previousSlotIndex = -1;

  for (let index = 0; index < entriesRaw.length; index += 1) {
    const path = `/entries/${String(index)}`;
    const entryObject = snapshotPlainObjectOrFail(entriesRaw[index], path, issues);
    if (entryObject === undefined) {
      continue;
    }
    assertNoAccessors(entryObject, path, issues);

    const implementationStatus = entryObject["implementationStatus"];
    if (implementationStatus !== "enabled" && implementationStatus !== "not_implemented") {
      issues.push({
        path: `${path}/implementationStatus`,
        message: "implementationStatus must be enabled or not_implemented",
        actual: implementationStatus,
        expected: "enabled | not_implemented",
      });
      continue;
    }

    const allowedKeys =
      implementationStatus === "enabled" ? ENTRY_KEYS_ENABLED : ENTRY_KEYS_NOT_IMPLEMENTED;
    rejectUnknownKeys(entryObject, allowedKeys, path, issues);

    if (
      implementationStatus === "not_implemented" &&
      Object.prototype.hasOwnProperty.call(entryObject, "processorVersion")
    ) {
      issues.push({
        path: `${path}/processorVersion`,
        message: "processorVersion is forbidden when implementationStatus is not_implemented",
        actual: entryObject["processorVersion"],
        expected: "absent",
      });
    }

    const processorId = requireProcessorId(entryObject, path, issues);
    const slot = requireSlot(entryObject, path, issues);
    const orderWithinSlot = requireSafeIntegerAtLeast(
      entryObject,
      "orderWithinSlot",
      path,
      1,
      issues,
    );
    const sourceSpecId = requireNonEmptyAscii(entryObject, "sourceSpecId", path, issues);
    const sourceSpecVersion = requireNonEmptyAscii(entryObject, "sourceSpecVersion", path, issues);

    let processorVersion: string | undefined;
    if (implementationStatus === "enabled") {
      processorVersion = requireNonEmptyAscii(entryObject, "processorVersion", path, issues);
    }

    if (
      processorId === undefined ||
      slot === undefined ||
      orderWithinSlot === undefined ||
      sourceSpecId === undefined ||
      sourceSpecVersion === undefined ||
      (implementationStatus === "enabled" && processorVersion === undefined)
    ) {
      continue;
    }

    if (seenProcessorIds.has(processorId)) {
      issues.push({
        path: `${path}/processorId`,
        message: "processorId must be unique within the manifest",
        actual: processorId,
        expected: "unique processorId",
      });
    }
    seenProcessorIds.add(processorId);

    const slotOrders = orderBySlot.get(slot) ?? new Set<number>();
    if (slotOrders.has(orderWithinSlot)) {
      issues.push({
        path: `${path}/orderWithinSlot`,
        message: "orderWithinSlot must be unique within the same slot",
        actual: orderWithinSlot,
        expected: "unique per slot",
      });
    }
    slotOrders.add(orderWithinSlot);
    orderBySlot.set(slot, slotOrders);

    const slotIndex = SLOT_INDEX.get(slot)!;
    if (slotIndex < previousSlotIndex) {
      issues.push({
        path: `${path}/slot`,
        message: "entries must appear in canonical slot order",
        actual: slot,
        expected: "slot order matching YEAR_START_PROCESSOR_SLOTS",
      });
    }
    previousSlotIndex = slotIndex;

    const entry: ActiveYearStartProcessorManifestEntry = {
      processorId,
      slot,
      implementationStatus,
      orderWithinSlot,
      sourceSpecId,
      sourceSpecVersion,
      ...(processorVersion !== undefined ? { processorVersion } : {}),
    };
    entries.push(entry);
  }

  // Within each slot, orderWithinSlot must be ascending in array order.
  const lastOrderBySlot = new Map<YearStartProcessorSlot, number>();
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index]!;
    const last = lastOrderBySlot.get(entry.slot);
    if (last !== undefined && entry.orderWithinSlot < last) {
      issues.push({
        path: `/entries/${String(index)}/orderWithinSlot`,
        message: "orderWithinSlot must be ascending within the same slot",
        actual: entry.orderWithinSlot,
        expected: `>= ${String(last)}`,
      });
    }
    lastOrderBySlot.set(entry.slot, entry.orderWithinSlot);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  if (schemaVersion === undefined || specVersion === undefined) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: ACTIVE_YEAR_START_PROCESSOR_MANIFEST_SCHEMA_VERSION,
      specVersion,
      entries,
    }),
  );
}

export function computeActiveYearStartProcessorManifestHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateActiveYearStartProcessorManifest(input);
  if (!validated.ok) {
    return validated;
  }
  return safeHashUtf8(provider, toCanonicalJson(validated.value), "/yearStartProcessorManifest");
}

function requireProcessorId(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = object["processorId"];
  if (typeof value !== "string" || value.length < 1 || value.length > 100) {
    issues.push({
      path: `${path}/processorId`,
      message: "processorId must be 1..100 ASCII characters matching the processorId pattern",
      actual: value,
      expected: PROCESSOR_ID_PATTERN.source,
    });
    return undefined;
  }
  if (!PROCESSOR_ID_PATTERN.test(value)) {
    issues.push({
      path: `${path}/processorId`,
      message: "processorId must match [a-z][a-z0-9]*(?:[._-][a-z0-9]+)*",
      actual: value,
      expected: PROCESSOR_ID_PATTERN.source,
    });
    return undefined;
  }
  return value;
}

function requireSlot(
  object: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): YearStartProcessorSlot | undefined {
  const value = object["slot"];
  if (typeof value !== "string" || !SLOT_INDEX.has(value as YearStartProcessorSlot)) {
    issues.push({
      path: `${path}/slot`,
      message: "slot must be a known YearStartProcessorSlot",
      actual: value,
      expected: YEAR_START_PROCESSOR_SLOTS.join(" | "),
    });
    return undefined;
  }
  return value as YearStartProcessorSlot;
}

function requireNonEmptyAscii(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = object[key];
  if (typeof value !== "string" || !ASCII_VERSION_PATTERN.test(value) || value.trim() !== value) {
    issues.push({
      path: path === "" ? `/${key}` : `${path}/${key}`,
      message: `${key} must be 1..100 non-empty ASCII without leading/trailing whitespace`,
      actual: value,
      expected: "1..100 ASCII",
    });
    return undefined;
  }
  return value;
}
