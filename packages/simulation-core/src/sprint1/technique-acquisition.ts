/**
 * Technique acquisition condition evaluation and learning-target derived status
 * (09 mini-spec §4.5, §6.1, §7, §12 / S01-003). Pure functions over an already
 * validated TechniqueDefinition plus a learner's abilities/aptitudes/technique
 * states — no catalog membership checks here (see ./technique-person-semantics.ts)
 * and no RNG / weekly progress math (deferred to a later Sprint 1 task).
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey, AbilityScores, AptitudeScores } from "../abilities.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { LearningTargetDerivedStatus } from "./technique-enums.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { PersonTechniqueState } from "./types.js";

export type TechniqueAcquisitionConditionResult = {
  requiredAptitudeMet: boolean;
  unmetRequiredStats: readonly AbilityKey[];
  missingPrerequisiteTechniqueIds: readonly TechniqueId[];
  unmetPrerequisiteMastery: readonly TechniqueId[];
  allConditionsMet: boolean;
};

export type TechniqueLearnerContext = {
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  techniqueStates: readonly PersonTechniqueState[];
};

/**
 * Read `container[key].surfaceValue` defensively: never throws even if `container`
 * is not the expected shape (broken learner input is a ValidationResult failure,
 * never a silent `false`).
 */
function readSurfaceValue(
  container: unknown,
  key: string,
  label: string,
  issues: ValidationIssue[],
): number | undefined {
  const record = container === null || typeof container !== "object" ? undefined : container;
  const entry = record === undefined ? undefined : (record as Record<string, unknown>)[key];
  if (typeof entry !== "object" || entry === null) {
    issues.push({
      path: `/${label}/${key}`,
      message: `${label}.${key} entry is missing or not an object`,
      actual: entry,
      expected: "StatValueTriple",
    });
    return undefined;
  }
  const surfaceValue = (entry as Record<string, unknown>)["surfaceValue"];
  if (typeof surfaceValue !== "number" || !Number.isInteger(surfaceValue)) {
    issues.push({
      path: `/${label}/${key}/surfaceValue`,
      message: "surfaceValue must be an integer",
      actual: surfaceValue,
      expected: "integer",
    });
    return undefined;
  }
  return surfaceValue;
}

function readTechniqueStateMap(
  techniqueStates: readonly PersonTechniqueState[],
  issues: ValidationIssue[],
): Map<TechniqueId, PersonTechniqueState> | undefined {
  if (!Array.isArray(techniqueStates)) {
    issues.push({
      path: "/techniqueStates",
      message: "techniqueStates must be an array",
      actual: techniqueStates,
      expected: "array",
    });
    return undefined;
  }

  const map = new Map<TechniqueId, PersonTechniqueState>();
  let ok = true;
  for (let index = 0; index < techniqueStates.length; index += 1) {
    const state: unknown = techniqueStates[index];
    if (
      typeof state !== "object" ||
      state === null ||
      typeof (state as Record<string, unknown>)["techniqueId"] !== "string"
    ) {
      issues.push({
        path: `/techniqueStates/${String(index)}`,
        message: "each techniqueStates entry must be a PersonTechniqueState object",
        actual: state,
        expected: "PersonTechniqueState",
      });
      ok = false;
      continue;
    }
    const typedState = state as PersonTechniqueState;
    map.set(typedState.techniqueId, typedState);
  }
  return ok ? map : undefined;
}

/**
 * 09 §12 usable-condition set (excluding range / mental / fatigue-injury, which are
 * battle-time concerns): requiredAptitude, requiredStats, prerequisiteTechniqueIds
 * acquisition, and prerequisiteTechniqueMastery thresholds.
 */
export function evaluateTechniqueAcquisitionConditions(
  definition: TechniqueDefinition,
  learner: TechniqueLearnerContext,
): ValidationResult<TechniqueAcquisitionConditionResult> {
  const issues: ValidationIssue[] = [];

  const categoryAptitude = readSurfaceValue(
    learner.aptitudes,
    definition.category,
    "aptitudes",
    issues,
  );

  const unmetRequiredStats: AbilityKey[] = [];
  let requiredStatsOk = true;
  for (const key of ABILITY_KEYS) {
    const required = definition.requiredStats[key];
    if (required === undefined) {
      continue;
    }
    const current = readSurfaceValue(learner.abilities, key, "abilities", issues);
    if (current === undefined) {
      requiredStatsOk = false;
      continue;
    }
    if (current < required) {
      unmetRequiredStats.push(key);
    }
  }

  const stateById = readTechniqueStateMap(learner.techniqueStates, issues);

  if (categoryAptitude === undefined || stateById === undefined || !requiredStatsOk) {
    return failure(issues);
  }

  const missingPrerequisiteTechniqueIds = definition.prerequisiteTechniqueIds
    .filter((prerequisiteId) => {
      const state = stateById.get(prerequisiteId);
      return state === undefined || state.acquiredAbsoluteWeek === null;
    })
    .sort(compareUnicodeCodePoints);

  const unmetPrerequisiteMastery = definition.prerequisiteTechniqueMastery
    .filter((requirement) => {
      const state = stateById.get(requirement.techniqueId);
      const masteryHundredths = state === undefined ? 0 : state.masteryHundredths;
      return masteryHundredths < requirement.requiredMastery * 100;
    })
    .map((requirement) => requirement.techniqueId)
    .sort(compareUnicodeCodePoints);

  const requiredAptitudeMet = categoryAptitude >= definition.requiredAptitude;
  const allConditionsMet =
    requiredAptitudeMet &&
    unmetRequiredStats.length === 0 &&
    missingPrerequisiteTechniqueIds.length === 0 &&
    unmetPrerequisiteMastery.length === 0;

  return success({
    requiredAptitudeMet,
    unmetRequiredStats,
    missingPrerequisiteTechniqueIds,
    unmetPrerequisiteMastery,
    allConditionsMet,
  });
}

/**
 * 09 §7 LearningTargetDerivedStatus: `progressing` while below the cap, otherwise
 * `acquirable` (all conditions met) or `blocked_at_cap` (one or more unmet). `state
 * === null` is the §6.1 virtual zero state for a not-yet-held technique: treated as
 * `learningProgressTenths = 0` here and never materialized as a PersonTechniqueState.
 *
 * When `state` is non-null it must refer to the same `techniqueId` as `definition`,
 * and `learningProgressTenths` must be an integer in `0..learningProgressRequired*10`
 * inclusive. Over-cap progress is a ValidationResult failure (never rounded into
 * `acquirable` / `blocked_at_cap`).
 */
export function deriveLearningTargetStatus(
  definition: TechniqueDefinition,
  state: PersonTechniqueState | null,
  learner: TechniqueLearnerContext,
): ValidationResult<LearningTargetDerivedStatus> {
  let learningProgressTenths: number;
  if (state === null) {
    learningProgressTenths = 0;
  } else if (typeof state !== "object" || state === null) {
    return failure([
      {
        path: "/state",
        message: "state must be a PersonTechniqueState object or null",
        actual: state,
        expected: "PersonTechniqueState | null",
      },
    ]);
  } else {
    const stateRecord = state as Record<string, unknown>;
    const stateTechniqueId = stateRecord["techniqueId"];
    if (typeof stateTechniqueId !== "string" || stateTechniqueId !== definition.techniqueId) {
      return failure([
        {
          path: "/state/techniqueId",
          message: "state.techniqueId must equal definition.techniqueId",
          actual: stateTechniqueId,
          expected: definition.techniqueId,
        },
      ]);
    }

    const progressRaw = stateRecord["learningProgressTenths"];
    if (typeof progressRaw !== "number" || !Number.isInteger(progressRaw)) {
      return failure([
        {
          path: "/state/learningProgressTenths",
          message: "state.learningProgressTenths must be an integer when state is provided",
          actual: progressRaw,
          expected: "integer",
        },
      ]);
    }

    const requiredTenths = definition.learningProgressRequired * 10;
    if (progressRaw < 0 || progressRaw > requiredTenths) {
      return failure([
        {
          path: "/state/learningProgressTenths",
          message: "learningProgressTenths must be within 0..learningProgressRequired * 10",
          actual: progressRaw,
          expected: `0..${String(requiredTenths)}`,
        },
      ]);
    }
    learningProgressTenths = progressRaw;
  }

  const conditionsResult = evaluateTechniqueAcquisitionConditions(definition, learner);
  if (!conditionsResult.ok) {
    return failure(conditionsResult.issues);
  }

  const requiredTenths = definition.learningProgressRequired * 10;
  if (learningProgressTenths < requiredTenths) {
    return success("progressing");
  }
  return success(conditionsResult.value.allConditionsMet ? "acquirable" : "blocked_at_cap");
}
