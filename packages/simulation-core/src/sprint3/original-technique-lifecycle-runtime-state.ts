/**
 * S03-009 persisted per-person original-technique research / cooldown runtime (Sprint1RunRuntimeState).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asPersonId, type PersonId } from "../ids.js";
import { createSeededRng, deriveSeed, type SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { validateSeededRngState } from "../sprint1/validate-seeded-rng-state.js";
import {
  ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
  ORIGINAL_TECHNIQUE_LIFECYCLE_RNG_SEED_LABEL,
} from "./constants.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";

export const ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION = "0.1.0" as const;

export const ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "processorId",
  "rngState",
  "lastProcessedAbsoluteWeek",
  "personEntries",
  "foundingHistories",
] as const;

export const ORIGINAL_TECHNIQUE_LIFECYCLE_PERSON_ENTRY_KEYS = [
  "personId",
  "researchValueTenths",
  "cooldownWeeksRemaining",
  "successfulGenerationCount",
] as const;

export type OriginalTechniqueLifecyclePersonEntry = {
  personId: PersonId;
  /** Fixed-point research value (tenths) — matches SPEC +1.0 as 10 tenths. */
  researchValueTenths: number;
  cooldownWeeksRemaining: number;
  successfulGenerationCount: number;
};

export type OriginalTechniqueLifecycleRuntimeState = {
  schemaVersion: typeof ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION;
  processorId: typeof ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID;
  rngState: SeededRngState;
  lastProcessedAbsoluteWeek: number | null;
  personEntries: readonly OriginalTechniqueLifecyclePersonEntry[];
  foundingHistories: readonly OriginalTechniqueFoundingHistoryRecord[];
};

export function researchValueFromTenths(researchValueTenths: number): number {
  return researchValueTenths / 10;
}

export function researchValueToTenths(researchValue: number): number {
  return Math.round(researchValue * 10);
}

export function createInitialOriginalTechniqueLifecycleRuntimeState(
  runSeed: number,
): OriginalTechniqueLifecycleRuntimeState {
  const derivedSeed = deriveSeed(runSeed, ORIGINAL_TECHNIQUE_LIFECYCLE_RNG_SEED_LABEL);
  return deepFreezePlainJson({
    schemaVersion: ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION,
    processorId: ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
    rngState: createSeededRng(derivedSeed).exportState(),
    lastProcessedAbsoluteWeek: null,
    personEntries: [],
    foundingHistories: [],
  });
}

function validateFoundingHistory(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): OriginalTechniqueFoundingHistoryRecord | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  if (object["eventKind"] !== "original_technique_founded") {
    issues.push({
      path: `${path}/eventKind`,
      message: "founding history eventKind must be original_technique_founded",
      actual: object["eventKind"],
      expected: "original_technique_founded",
    });
    return undefined;
  }
  if (typeof object["founderPersonId"] !== "string" || object["founderPersonId"].length === 0) {
    issues.push({
      path: `${path}/founderPersonId`,
      message: "founderPersonId must be a non-empty string",
      actual: object["founderPersonId"],
    });
    return undefined;
  }
  if (typeof object["newTechniqueId"] !== "string" || object["newTechniqueId"].length === 0) {
    issues.push({
      path: `${path}/newTechniqueId`,
      message: "newTechniqueId must be a non-empty string",
      actual: object["newTechniqueId"],
    });
    return undefined;
  }
  const sourceTechniqueIds = snapshotDenseArrayOrFail(
    object["sourceTechniqueIds"],
    `${path}/sourceTechniqueIds`,
    issues,
  );
  if (sourceTechniqueIds === undefined) {
    return undefined;
  }
  for (let index = 0; index < sourceTechniqueIds.length; index += 1) {
    if (typeof sourceTechniqueIds[index] !== "string") {
      issues.push({
        path: `${path}/sourceTechniqueIds/${String(index)}`,
        message: "sourceTechniqueId must be a string",
        actual: sourceTechniqueIds[index],
      });
    }
  }
  if (
    typeof object["researchValueAtFounding"] !== "number" ||
    !Number.isFinite(object["researchValueAtFounding"])
  ) {
    issues.push({
      path: `${path}/researchValueAtFounding`,
      message: "researchValueAtFounding must be a finite number",
      actual: object["researchValueAtFounding"],
    });
    return undefined;
  }
  if (typeof object["developmentReason"] !== "string") {
    issues.push({
      path: `${path}/developmentReason`,
      message: "developmentReason must be a string",
      actual: object["developmentReason"],
    });
    return undefined;
  }
  const researchTier = object["researchTier"];
  if (
    researchTier !== "derived_technique" &&
    researchTier !== "composite_technique" &&
    researchTier !== "full_original_technique"
  ) {
    issues.push({
      path: `${path}/researchTier`,
      message: "researchTier must be a known original-technique tier",
      actual: researchTier,
    });
    return undefined;
  }
  if (
    typeof object["worldWeekIndex"] !== "number" ||
    !Number.isSafeInteger(object["worldWeekIndex"]) ||
    object["worldWeekIndex"] < 0
  ) {
    issues.push({
      path: `${path}/worldWeekIndex`,
      message: "worldWeekIndex must be a non-negative safe integer",
      actual: object["worldWeekIndex"],
    });
    return undefined;
  }
  return deepFreezePlainJson({
    eventKind: "original_technique_founded",
    founderPersonId: object["founderPersonId"],
    newTechniqueId: object["newTechniqueId"],
    sourceTechniqueIds: sourceTechniqueIds as string[],
    researchValueAtFounding: object["researchValueAtFounding"],
    developmentReason: object["developmentReason"],
    researchTier,
    worldWeekIndex: object["worldWeekIndex"],
    ...(typeof object["firstUseMatchId"] === "string"
      ? { firstUseMatchId: object["firstUseMatchId"] }
      : {}),
  });
}

function validatePersonEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): OriginalTechniqueLifecyclePersonEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, ORIGINAL_TECHNIQUE_LIFECYCLE_PERSON_ENTRY_KEYS, path, issues);

  let personId: PersonId | undefined;
  const rawPersonId = object["personId"];
  try {
    personId = asPersonId(typeof rawPersonId === "string" ? rawPersonId : String(rawPersonId));
  } catch {
    issues.push({
      path: `${path}/personId`,
      message: "personId must be a valid PersonId",
      actual: object["personId"],
    });
    return undefined;
  }

  const researchValueTenths = requireSafeIntegerAtLeast(
    object,
    "researchValueTenths",
    path,
    0,
    issues,
  );
  const cooldownWeeksRemaining = requireSafeIntegerAtLeast(
    object,
    "cooldownWeeksRemaining",
    path,
    0,
    issues,
  );
  const successfulGenerationCount = requireSafeIntegerAtLeast(
    object,
    "successfulGenerationCount",
    path,
    0,
    issues,
  );
  if (
    personId === undefined ||
    researchValueTenths === undefined ||
    cooldownWeeksRemaining === undefined ||
    successfulGenerationCount === undefined
  ) {
    return undefined;
  }

  return {
    personId,
    researchValueTenths,
    cooldownWeeksRemaining,
    successfulGenerationCount,
  };
}

export function validateOriginalTechniqueLifecycleRuntimeState(
  input: unknown,
): ValidationResult<OriginalTechniqueLifecycleRuntimeState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_KEYS, "", issues);

  const schemaVersion = object["schemaVersion"];
  if (schemaVersion !== ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "unsupported originalTechniqueLifecycleRuntime schemaVersion",
      actual: schemaVersion,
      expected: ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION,
    });
  }
  if (object["processorId"] !== ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID) {
    issues.push({
      path: "/processorId",
      message: "processorId must match original-technique lifecycle contract",
      actual: object["processorId"],
      expected: ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
    });
  }

  const rngResult = validateSeededRngState(object["rngState"]);
  if (!rngResult.ok) {
    issues.push(...rngResult.issues.map((issue) => ({ ...issue, path: `/rngState${issue.path}` })));
  }

  const lastWeekRaw = object["lastProcessedAbsoluteWeek"];
  let lastProcessedAbsoluteWeek: number | null = null;
  if (lastWeekRaw !== null && lastWeekRaw !== undefined) {
    if (typeof lastWeekRaw !== "number" || !Number.isSafeInteger(lastWeekRaw) || lastWeekRaw < 0) {
      issues.push({
        path: "/lastProcessedAbsoluteWeek",
        message: "lastProcessedAbsoluteWeek must be null or a non-negative safe integer",
        actual: lastWeekRaw,
      });
    } else {
      lastProcessedAbsoluteWeek = lastWeekRaw;
    }
  }

  const rawEntries = snapshotDenseArrayOrFail(object["personEntries"], "/personEntries", issues);
  const personEntries: OriginalTechniqueLifecyclePersonEntry[] = [];
  if (rawEntries !== undefined) {
    for (let index = 0; index < rawEntries.length; index += 1) {
      const entry = validatePersonEntry(
        rawEntries[index],
        `/personEntries/${String(index)}`,
        issues,
      );
      if (entry !== undefined) {
        personEntries.push(entry);
      }
    }
    personEntries.sort((left, right) => compareUnicodeCodePoints(left.personId, right.personId));
    for (let index = 1; index < personEntries.length; index += 1) {
      if (personEntries[index - 1]!.personId === personEntries[index]!.personId) {
        issues.push({
          path: "/personEntries",
          message: "personEntries must not contain duplicate personId",
          actual: personEntries[index]!.personId,
        });
        break;
      }
    }
  }

  const rawHistories = snapshotDenseArrayOrFail(
    object["foundingHistories"],
    "/foundingHistories",
    issues,
  );
  const foundingHistories: OriginalTechniqueFoundingHistoryRecord[] = [];
  if (rawHistories !== undefined) {
    for (let index = 0; index < rawHistories.length; index += 1) {
      const record = validateFoundingHistory(
        rawHistories[index],
        `/foundingHistories/${String(index)}`,
        issues,
      );
      if (record !== undefined) {
        foundingHistories.push(record);
      }
    }
  }

  if (issues.length > 0 || !rngResult.ok) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: ORIGINAL_TECHNIQUE_LIFECYCLE_RUNTIME_STATE_SCHEMA_VERSION,
      processorId: ORIGINAL_TECHNIQUE_LIFECYCLE_PROCESSOR_ID,
      rngState: cloneValidatedPlainJson(rngResult.value),
      lastProcessedAbsoluteWeek,
      personEntries,
      foundingHistories,
    }),
  );
}
