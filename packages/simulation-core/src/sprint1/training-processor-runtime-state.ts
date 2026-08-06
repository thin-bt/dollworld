/**
 * `TrainingProcessorRuntimeState` (10 mini-spec §9, version registry in 14 §1.2 /
 * S01-004).
 *
 * All counters and totals are cumulative from processor start: a successful week
 * adds `previousValue + currentWeekValue` and never overwrites. `inactive` persons
 * are excluded from `actionCounts` and from `processedPersonCount`, so there is no
 * `inactive` key here.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireNullableIntegerAtLeast,
  requireSafeIntegerAtLeast,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";

export const TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION = "0.1.0" as const;

/** Canonical key order per 10 §9. */
export const TRAINING_PROCESSOR_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "lastProcessedAbsoluteWeek",
  "processedPersonCount",
  "actionCounts",
  "totalStatGainMilliPoints",
  "totalLearningProgressGainTenths",
  "totalMasteryGainHundredths",
  "forcedRestCount",
] as const;

/** `inactive` is intentionally absent (10 §9). */
export const TRAINING_PROCESSOR_ACTION_COUNT_KEYS = [
  "train_stat",
  "learn_technique",
  "practice_technique",
  "rest",
] as const;
export type TrainingProcessorActionCountKey = (typeof TRAINING_PROCESSOR_ACTION_COUNT_KEYS)[number];

export type TrainingProcessorActionCounts = {
  readonly [K in TrainingProcessorActionCountKey]: number;
};

export type TrainingProcessorRuntimeState = {
  schemaVersion: typeof TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION;
  lastProcessedAbsoluteWeek: number | null;
  processedPersonCount: number;
  actionCounts: TrainingProcessorActionCounts;
  totalStatGainMilliPoints: number;
  totalLearningProgressGainTenths: number;
  totalMasteryGainHundredths: number;
  forcedRestCount: number;
};

export function createInitialTrainingProcessorRuntimeState(): TrainingProcessorRuntimeState {
  return deepFreezePlainJson({
    schemaVersion: TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
    lastProcessedAbsoluteWeek: null,
    processedPersonCount: 0,
    actionCounts: {
      train_stat: 0,
      learn_technique: 0,
      practice_technique: 0,
      rest: 0,
    },
    totalStatGainMilliPoints: 0,
    totalLearningProgressGainTenths: 0,
    totalMasteryGainHundredths: 0,
    forcedRestCount: 0,
  });
}

function parseActionCounts(
  value: unknown,
  issues: ValidationIssue[],
): TrainingProcessorActionCounts | undefined {
  const object = snapshotPlainObjectOrFail(value, "/actionCounts", issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, "/actionCounts", issues);
  rejectUnknownKeys(object, TRAINING_PROCESSOR_ACTION_COUNT_KEYS, "/actionCounts", issues);

  const rebuilt = {} as { [K in TrainingProcessorActionCountKey]: number };
  let ok = true;
  for (const key of TRAINING_PROCESSOR_ACTION_COUNT_KEYS) {
    const count = requireSafeIntegerAtLeast(object, key, "/actionCounts", 0, issues);
    if (count === undefined) {
      ok = false;
      continue;
    }
    rebuilt[key] = count;
  }
  return ok ? rebuilt : undefined;
}

export function validateTrainingProcessorRuntimeState(
  input: unknown,
): ValidationResult<TrainingProcessorRuntimeState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TrainingProcessorRuntimeState must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TRAINING_PROCESSOR_RUNTIME_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
    issues,
  );
  const lastProcessedAbsoluteWeek = requireNullableIntegerAtLeast(
    object,
    "lastProcessedAbsoluteWeek",
    "",
    0,
    issues,
  );
  const processedPersonCount = requireSafeIntegerAtLeast(
    object,
    "processedPersonCount",
    "",
    0,
    issues,
  );
  const actionCounts = parseActionCounts(object["actionCounts"], issues);
  const totalStatGainMilliPoints = requireSafeIntegerAtLeast(
    object,
    "totalStatGainMilliPoints",
    "",
    0,
    issues,
  );
  const totalLearningProgressGainTenths = requireSafeIntegerAtLeast(
    object,
    "totalLearningProgressGainTenths",
    "",
    0,
    issues,
  );
  const totalMasteryGainHundredths = requireSafeIntegerAtLeast(
    object,
    "totalMasteryGainHundredths",
    "",
    0,
    issues,
  );
  const forcedRestCount = requireSafeIntegerAtLeast(object, "forcedRestCount", "", 0, issues);

  if (
    schemaVersion === undefined ||
    lastProcessedAbsoluteWeek === undefined ||
    processedPersonCount === undefined ||
    actionCounts === undefined ||
    totalStatGainMilliPoints === undefined ||
    totalLearningProgressGainTenths === undefined ||
    totalMasteryGainHundredths === undefined ||
    forcedRestCount === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const actionCountSum =
    actionCounts.train_stat +
    actionCounts.learn_technique +
    actionCounts.practice_technique +
    actionCounts.rest;
  if (processedPersonCount !== actionCountSum) {
    return failure([
      {
        path: "/processedPersonCount",
        message: "processedPersonCount must equal the sum of the four actionCounts (10 §9)",
        actual: processedPersonCount,
        expected: String(actionCountSum),
      },
    ]);
  }

  if (forcedRestCount > actionCounts.rest) {
    return failure([
      {
        path: "/forcedRestCount",
        message: "forcedRestCount must not exceed the cumulative rest count (10 §9)",
        actual: forcedRestCount,
        expected: `<= ${String(actionCounts.rest)}`,
      },
    ]);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: TRAINING_PROCESSOR_RUNTIME_STATE_SCHEMA_VERSION,
      lastProcessedAbsoluteWeek,
      processedPersonCount,
      actionCounts,
      totalStatGainMilliPoints,
      totalLearningProgressGainTenths,
      totalMasteryGainHundredths,
      forcedRestCount,
    }),
  );
}

export function cloneTrainingProcessorRuntimeState(
  input: unknown,
): ValidationResult<TrainingProcessorRuntimeState> {
  const validated = validateTrainingProcessorRuntimeState(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeTrainingProcessorRuntimeState(
  input: unknown,
): ValidationResult<TrainingProcessorRuntimeState> {
  return validateTrainingProcessorRuntimeState(input);
}
