/**
 * S03-008 persisted live technique teaching-selection snapshots (Sprint1RunRuntimeState).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asPersonId, type PersonId } from "../ids.js";
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
import { TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID } from "./constants.js";
import type { TechniqueTeachingSelectionOutcome } from "./types.js";

export const TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION = "0.1.0" as const;

export const TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "processorId",
  "pairSnapshots",
] as const;

export const TECHNIQUE_TEACHING_SELECTION_PAIR_SNAPSHOT_KEYS = [
  "masterPersonId",
  "disciplePersonId",
  "evaluatedAbsoluteWeek",
  "matchedTriggers",
  "outcome",
] as const;

export type TechniqueTeachingSelectionPairSnapshot = {
  masterPersonId: PersonId;
  disciplePersonId: PersonId;
  evaluatedAbsoluteWeek: number;
  matchedTriggers: readonly string[];
  outcome: TechniqueTeachingSelectionOutcome;
};

export type TechniqueTeachingSelectionRuntimeState = {
  schemaVersion: typeof TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION;
  processorId: typeof TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID;
  pairSnapshots: readonly TechniqueTeachingSelectionPairSnapshot[];
};

export function createInitialTechniqueTeachingSelectionRuntimeState(): TechniqueTeachingSelectionRuntimeState {
  return deepFreezePlainJson({
    schemaVersion: TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION,
    processorId: TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID,
    pairSnapshots: [],
  });
}

function validateOutcome(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueTeachingSelectionOutcome | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  const kind = object["kind"];
  if (kind !== "feature_disabled" && kind !== "selection_completed") {
    issues.push({
      path: `${path}/kind`,
      message: "unsupported technique teaching selection outcome kind",
      actual: kind,
    });
    return undefined;
  }
  const rankedCandidates = snapshotDenseArrayOrFail(
    object["rankedCandidates"],
    `${path}/rankedCandidates`,
    issues,
  );
  const excludedCandidates = snapshotDenseArrayOrFail(
    object["excludedCandidates"],
    `${path}/excludedCandidates`,
    issues,
  );
  const reasons = snapshotDenseArrayOrFail(object["reasons"], `${path}/reasons`, issues);
  if (rankedCandidates === undefined || excludedCandidates === undefined || reasons === undefined) {
    return undefined;
  }
  return deepFreezePlainJson({
    kind,
    rankedCandidates: cloneValidatedPlainJson(rankedCandidates),
    excludedCandidates: cloneValidatedPlainJson(excludedCandidates),
    reasons: cloneValidatedPlainJson(reasons),
  }) as TechniqueTeachingSelectionOutcome;
}

function validatePairSnapshot(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): TechniqueTeachingSelectionPairSnapshot | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, TECHNIQUE_TEACHING_SELECTION_PAIR_SNAPSHOT_KEYS, path, issues);

  const masterRaw = object["masterPersonId"];
  const discipleRaw = object["disciplePersonId"];
  if (typeof masterRaw !== "string" || masterRaw.length === 0) {
    issues.push({
      path: `${path}/masterPersonId`,
      message: "masterPersonId must be a non-empty string",
      actual: masterRaw,
    });
    return undefined;
  }
  if (typeof discipleRaw !== "string" || discipleRaw.length === 0) {
    issues.push({
      path: `${path}/disciplePersonId`,
      message: "disciplePersonId must be a non-empty string",
      actual: discipleRaw,
    });
    return undefined;
  }
  const evaluatedAbsoluteWeek = requireSafeIntegerAtLeast(
    object,
    "evaluatedAbsoluteWeek",
    path,
    0,
    issues,
  );
  const matchedTriggers = snapshotDenseArrayOrFail(
    object["matchedTriggers"],
    `${path}/matchedTriggers`,
    issues,
  );
  const outcome = validateOutcome(object["outcome"], `${path}/outcome`, issues);
  if (
    evaluatedAbsoluteWeek === undefined ||
    matchedTriggers === undefined ||
    outcome === undefined
  ) {
    return undefined;
  }
  return {
    masterPersonId: asPersonId(masterRaw),
    disciplePersonId: asPersonId(discipleRaw),
    evaluatedAbsoluteWeek,
    matchedTriggers: cloneValidatedPlainJson(matchedTriggers) as readonly string[],
    outcome,
  };
}

export function validateTechniqueTeachingSelectionRuntimeState(
  input: unknown,
): ValidationResult<TechniqueTeachingSelectionRuntimeState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_KEYS, "", issues);

  const schemaVersion = object["schemaVersion"];
  if (schemaVersion !== TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "unsupported techniqueTeachingSelectionRuntime schemaVersion",
      actual: schemaVersion,
      expected: TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION,
    });
  }
  const processorId = object["processorId"];
  if (processorId !== TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID) {
    issues.push({
      path: "/processorId",
      message: "processorId must match technique teaching selection runtime contract",
      actual: processorId,
      expected: TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID,
    });
  }

  const snapshots: TechniqueTeachingSelectionPairSnapshot[] = [];
  const rawSnapshots = snapshotDenseArrayOrFail(object["pairSnapshots"], "/pairSnapshots", issues);
  if (rawSnapshots !== undefined) {
    for (let index = 0; index < rawSnapshots.length; index += 1) {
      const entry = validatePairSnapshot(
        rawSnapshots[index],
        `/pairSnapshots/${String(index)}`,
        issues,
      );
      if (entry !== undefined) {
        snapshots.push(entry);
      }
    }
  }

  if (issues.length > 0 || rawSnapshots === undefined) {
    return failure(issues);
  }

  snapshots.sort((left, right) => {
    const masterCompare = compareUnicodeCodePoints(left.masterPersonId, right.masterPersonId);
    if (masterCompare !== 0) {
      return masterCompare;
    }
    return compareUnicodeCodePoints(left.disciplePersonId, right.disciplePersonId);
  });

  return success(
    deepFreezePlainJson({
      schemaVersion: TECHNIQUE_TEACHING_SELECTION_RUNTIME_STATE_SCHEMA_VERSION,
      processorId: TECHNIQUE_TEACHING_SELECTION_PROCESSOR_ID,
      pairSnapshots: snapshots,
    }) as TechniqueTeachingSelectionRuntimeState,
  );
}

export function lookupTechniqueTeachingSelectionPairSnapshot(
  runtime: TechniqueTeachingSelectionRuntimeState | undefined,
  masterPersonId: PersonId,
  disciplePersonId: PersonId,
): TechniqueTeachingSelectionPairSnapshot | undefined {
  if (runtime === undefined) {
    return undefined;
  }
  return runtime.pairSnapshots.find(
    (entry) =>
      entry.masterPersonId === masterPersonId && entry.disciplePersonId === disciplePersonId,
  );
}

export function upsertTechniqueTeachingSelectionPairSnapshot(
  runtime: TechniqueTeachingSelectionRuntimeState,
  snapshot: TechniqueTeachingSelectionPairSnapshot,
): TechniqueTeachingSelectionRuntimeState {
  const next = runtime.pairSnapshots.filter(
    (entry) =>
      !(
        entry.masterPersonId === snapshot.masterPersonId &&
        entry.disciplePersonId === snapshot.disciplePersonId
      ),
  );
  next.push(snapshot);
  next.sort((left, right) => {
    const masterCompare = compareUnicodeCodePoints(left.masterPersonId, right.masterPersonId);
    if (masterCompare !== 0) {
      return masterCompare;
    }
    return compareUnicodeCodePoints(left.disciplePersonId, right.disciplePersonId);
  });
  return deepFreezePlainJson({
    ...runtime,
    pairSnapshots: next,
  }) as TechniqueTeachingSelectionRuntimeState;
}
