/**
 * Weekly effect application (08 mini-spec §5 / §6.4, 09 §8 / §9, 10 §6.2.1 / §11.1).
 *
 * Every function here mutates only the caller-owned draft. Input records, the
 * weekStart snapshot, and the Sprint1Config are never written to, so a hard failure
 * anywhere in the week leaves the caller's inputs untouched (10 §10).
 *
 * Effect RNG is consumed exactly once for `train_stat`, `progressing`
 * `learn_technique`, and `practice_technique` — even when the resulting delta is 0 —
 * and never for `acquirable` `learn_technique`, `rest`, or `inactive` (10 §8).
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AptitudeScores, AbilityKey, StatValueTriple } from "../abilities.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId, TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";
import {
  selectAgeGrowthFactor,
  selectCurrentValueGrowthFactor,
  selectDiscipleCountGrowthFactor,
  selectFatigueGrowthFactor,
  selectTeacherGrowthFactor,
} from "./growth-factor-selectors.js";
import {
  isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
  selectDiscipleCountTeachingEfficiencyFactor,
} from "../sprint3/resolve-weekly-disciple-count-teaching-efficiency.js";
import type { Sprint3Config } from "../sprint3/types.js";
import { deriveInjuryStage, selectInjuryGrowthFactor } from "./injury-stage.js";
import { deriveMaxMental } from "./max-mental.js";
import { drawInclusiveBasisPoints, multiplyBasisPointsFloor } from "./multiply-basis-points.js";
import { deepFreezePlainJson } from "./plain-data.js";
import { evaluateTechniqueAcquisitionConditions } from "./technique-acquisition.js";
import type { TechniqueLearnerContext } from "./technique-acquisition.js";
import type { TechniqueCatalog } from "./technique-catalog.js";
import {
  deriveInitialMasteryHundredths,
  selectMasteryCurrentValueFactor,
} from "./technique-mastery.js";
import { deriveRequiredStatsFactor } from "./technique-required-stats-factor.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { PersonTechniqueState, Sprint1Config } from "./types.js";
import { WEEKLY_ACTION_CONFIG_KEY } from "./weekly-actions.js";
import type { WeeklyForcedRestReason } from "./weekly-actions.js";
import {
  normalizedInputToFactorBasisPoints,
  selectNormalTrainingMasteryTarget,
} from "./weekly-target-selection.js";
import {
  resolveCompatibility,
  resolveLearningTrait,
  resolveTeachingAbility,
} from "./weekly-training-types.js";
import type {
  TechniqueTargetContext,
  WeeklyTrainingEventCandidate,
  WeeklyTrainingPersonRecord,
} from "./weekly-training-types.js";

export const WEEKLY_TRAINING_EVENT_TYPES = {
  actionSelected: "training.action_selected",
  statGrowthApplied: "training.stat_growth_applied",
  conditionUpdated: "training.condition_updated",
  forcedRestApplied: "training.forced_rest_applied",
  restApplied: "training.rest_applied",
  learningProgressed: "technique.learning_progressed",
  techniqueAcquired: "technique.acquired",
  masteryIncreased: "technique.mastery_increased",
} as const;

/** Fixed unit labels for technique progress / mastery event payloads (10 §11). */
export type TechniqueProgressUnit = "tenths" | "hundredths";

export const TECHNIQUE_LEARNING_PROGRESS_UNIT = "tenths" as const satisfies TechniqueProgressUnit;
export const TECHNIQUE_MASTERY_PROGRESS_UNIT =
  "hundredths" as const satisfies TechniqueProgressUnit;

const MASTERY_MAXIMUM_HUNDREDTHS = 10000;
const MILLI_POINTS_PER_SURFACE_POINT = 1000;

export type WeeklyEffectRng = {
  nextInt(minInclusive: number, maxExclusive: number): number;
};

/** Per-person accumulation added to `TrainingProcessorRuntimeState` on success (10 §9). */
export type WeeklyEffectTotals = {
  statGainMilliPoints: number;
  learningProgressGainTenths: number;
  masteryGainHundredths: number;
};

export type WeeklyEffectOutcome = {
  events: readonly WeeklyTrainingEventCandidate[];
  rngCalls: number;
  totals: WeeklyEffectTotals;
};

/** Mutable per-person working copy; nothing outside this object is ever written. */
export type WeeklyTrainingDraft = {
  personId: PersonId;
  abilities: Record<AbilityKey, StatValueTriple>;
  remainderMilliPoints: Record<AbilityKey, number>;
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
  currentMental: number;
  maximumMental: number;
  techniqueStates: PersonTechniqueState[];
  learningFocusTechniqueId: TechniqueId | null;
};

type ConditionSnapshot = {
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
  currentMental: number;
};

function emptyTotals(): WeeklyEffectTotals {
  return { statGainMilliPoints: 0, learningProgressGainTenths: 0, masteryGainHundredths: 0 };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function snapshotCondition(draft: WeeklyTrainingDraft): ConditionSnapshot {
  return {
    fatigue: draft.fatigue,
    injury: draft.injury,
    condition: draft.condition,
    confidence: draft.confidence,
    currentMental: draft.currentMental,
  };
}

function buildEvent(
  eventType: string,
  personId: PersonId,
  absoluteWeek: number,
  payload: Record<string, unknown>,
): WeeklyTrainingEventCandidate {
  return deepFreezePlainJson({ eventType, personId, absoluteWeek, payload });
}

function conditionDeltaPayload(
  before: ConditionSnapshot,
  after: ConditionSnapshot,
): Record<string, unknown> {
  return {
    fatigue: {
      before: before.fatigue,
      after: after.fatigue,
      delta: after.fatigue - before.fatigue,
    },
    injury: { before: before.injury, after: after.injury, delta: after.injury - before.injury },
    condition: {
      before: before.condition,
      after: after.condition,
      delta: after.condition - before.condition,
    },
    confidence: {
      before: before.confidence,
      after: after.confidence,
      delta: after.confidence - before.confidence,
    },
    currentMental: {
      before: before.currentMental,
      after: after.currentMental,
      delta: after.currentMental - before.currentMental,
    },
  };
}

/**
 * Build the mutable draft from a validated record. `sprint1State` is mandatory:
 * a missing state is rejected before the week starts and never back-filled (08 §6.2).
 */
export function createWeeklyTrainingDraft(
  record: WeeklyTrainingPersonRecord,
): ValidationResult<WeeklyTrainingDraft> {
  const person = record.person as unknown as Record<string, unknown>;
  const sprint1State = person["sprint1State"] as
    | {
        currentMental: number;
        techniqueStates: readonly PersonTechniqueState[];
        learningFocusTechniqueId: TechniqueId | null;
      }
    | undefined;
  if (sprint1State === undefined || sprint1State === null) {
    return failure([
      {
        path: "/person/sprint1State",
        message: "sprint1State is required before applying weekly effects (08 §6.2)",
        expected: "Sprint1PersonState",
      },
    ]);
  }

  const abilitiesSource = person["abilities"] as Record<AbilityKey, StatValueTriple>;
  const maximumMental = deriveMaxMental(abilitiesSource.spirit.surfaceValue);
  if (!maximumMental.ok) {
    return failure(maximumMental.issues);
  }

  const abilities = {} as Record<AbilityKey, StatValueTriple>;
  const remainderMilliPoints = {} as Record<AbilityKey, number>;
  for (const key of ABILITY_KEYS) {
    const entry = abilitiesSource[key];
    abilities[key] = {
      surfaceValue: entry.surfaceValue,
      expressedGeneticValue: entry.expressedGeneticValue,
      latentGeneticValue: entry.latentGeneticValue,
    };
    remainderMilliPoints[key] = 0;
  }
  for (const entry of record.statGrowthRemainders) {
    remainderMilliPoints[entry.stat] = entry.milliPoints;
  }

  return success({
    personId: person["personId"] as PersonId,
    abilities,
    remainderMilliPoints,
    fatigue: record.temporaryCondition.fatigue,
    injury: record.temporaryCondition.injury,
    condition: record.temporaryCondition.condition,
    confidence: record.temporaryCondition.confidence,
    currentMental: sprint1State.currentMental,
    maximumMental: maximumMental.value,
    techniqueStates: sprint1State.techniqueStates.map((state) => ({ ...state })),
    learningFocusTechniqueId: sprint1State.learningFocusTechniqueId,
  });
}

function findDraftTechniqueState(
  draft: WeeklyTrainingDraft,
  techniqueId: TechniqueId,
): PersonTechniqueState | undefined {
  return draft.techniqueStates.find((state) => state.techniqueId === techniqueId);
}

/** 10 §7 step 8: materialize a real `PersonTechniqueState` when the focus is new. */
function ensureDraftTechniqueState(
  draft: WeeklyTrainingDraft,
  techniqueId: TechniqueId,
): PersonTechniqueState {
  const existing = findDraftTechniqueState(draft, techniqueId);
  if (existing !== undefined) {
    return existing;
  }
  const created: PersonTechniqueState = {
    techniqueId,
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
  };
  draft.techniqueStates.push(created);
  draft.techniqueStates.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));
  return findDraftTechniqueState(draft, techniqueId)!;
}

/** 08 §5.1.1 growth-potential factor in basis points. */
export function computeGrowthPotentialFactorBasisPoints(
  growthPotential: number,
  config: Sprint1Config,
): ValidationResult<number> {
  if (!Number.isInteger(growthPotential) || growthPotential < 0 || growthPotential > 100) {
    return failure([
      {
        path: "/growthPotential",
        message: "growthPotential must be an integer within 0..100",
        actual: growthPotential,
        expected: "0..100",
      },
    ]);
  }
  const minimum = config.growth.potentialMinimumFactor;
  const maximum = config.growth.potentialMaximumFactor;
  return success(minimum + Math.floor((growthPotential * (maximum - minimum)) / 100));
}

/**
 * 14 §5: `discipleCountFactor` is neutral (1.00) when the learner has no formal
 * master; `growth.discipleCountFactors` starts at a count of 1.
 */
function selectDiscipleCountFactorOrNeutral(
  discipleCount: number,
  config: Sprint1Config,
  sprint3Config?: Sprint3Config,
): ValidationResult<number> {
  if (discipleCount === 0) {
    return success(BASIS_POINTS_SCALE);
  }
  if (
    sprint3Config !== undefined &&
    isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled(sprint3Config)
  ) {
    return selectDiscipleCountTeachingEfficiencyFactor(
      discipleCount,
      sprint3Config.teachingEfficiency,
    );
  }
  const factor = selectDiscipleCountGrowthFactor(discipleCount, config);
  if (!factor.ok) {
    return failure(factor.issues);
  }
  return success(factor.value);
}

function selectFatigueAndInjuryFactors(
  draft: WeeklyTrainingDraft,
  config: Sprint1Config,
): ValidationResult<{ fatigueFactor: number; injuryFactor: number }> {
  const fatigueFactor = selectFatigueGrowthFactor(draft.fatigue, config);
  if (!fatigueFactor.ok) {
    return failure(fatigueFactor.issues);
  }
  const stage = deriveInjuryStage(draft.injury, config);
  if (!stage.ok) {
    return failure(stage.issues);
  }
  return success({
    fatigueFactor: fatigueFactor.value,
    injuryFactor: selectInjuryGrowthFactor(stage.value, config),
  });
}

function readCurrentAge(record: WeeklyTrainingPersonRecord): ValidationResult<number> {
  const person = record.person as unknown as Record<string, unknown>;
  const age = person["currentAge"];
  if (typeof age !== "number" || !Number.isSafeInteger(age) || age < 0) {
    return failure([
      {
        path: "/person/currentAge",
        message: "currentAge is required to select the growth age factor (08 §4)",
        actual: age,
        expected: "safe integer >= 0",
      },
    ]);
  }
  return success(age);
}

function applyFatigueDelta(draft: WeeklyTrainingDraft, delta: number): void {
  draft.fatigue = clamp(draft.fatigue + delta, 0, 100);
}

function applyMasteryGain(state: PersonTechniqueState, gain: number): number {
  const before = state.masteryHundredths;
  state.masteryHundredths = Math.min(MASTERY_MAXIMUM_HUNDREDTHS, before + gain);
  return state.masteryHundredths - before;
}

/* --------------------------------------------------------------- train_stat */

/**
 * 08 §5: nine basis-points factors, a single final floor, milliPoints carry-over,
 * and the accompanying 09 §9.2 normal-training mastery gain (no extra RNG).
 */
export function applyTrainStat(
  draft: WeeklyTrainingDraft,
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  config: Sprint1Config,
  targetStat: AbilityKey,
  absoluteWeek: number,
  rng: WeeklyEffectRng,
  sprint3Config?: Sprint3Config,
): ValidationResult<WeeklyEffectOutcome> {
  const conditionBefore = snapshotCondition(draft);
  const totals = emptyTotals();
  const events: WeeklyTrainingEventCandidate[] = [];

  const age = readCurrentAge(record);
  if (!age.ok) {
    return failure(age.issues);
  }
  const growthPotentialFactor = computeGrowthPotentialFactorBasisPoints(
    record.growthPotential[targetStat],
    config,
  );
  if (!growthPotentialFactor.ok) {
    return failure(growthPotentialFactor.issues);
  }
  const ageFactor = selectAgeGrowthFactor(record.growthProfile, age.value, config);
  if (!ageFactor.ok) {
    return failure(ageFactor.issues);
  }
  const surfaceBefore = draft.abilities[targetStat].surfaceValue;
  const currentValueFactor = selectCurrentValueGrowthFactor(surfaceBefore, config);
  if (!currentValueFactor.ok) {
    return failure(currentValueFactor.issues);
  }
  const teacherFactor = selectTeacherGrowthFactor(record.teacherFactorKey, config);
  if (!teacherFactor.ok) {
    return failure(teacherFactor.issues);
  }
  const discipleCountFactor = selectDiscipleCountFactorOrNeutral(
    record.discipleCount,
    config,
    sprint3Config,
  );
  if (!discipleCountFactor.ok) {
    return failure(discipleCountFactor.issues);
  }
  const conditionFactors = selectFatigueAndInjuryFactors(draft, config);
  if (!conditionFactors.ok) {
    return failure(conditionFactors.issues);
  }

  const rngFactor = drawInclusiveBasisPoints(
    rng,
    config.growth.rngMinimumFactor,
    config.growth.rngMaximumFactor,
  );

  const factorBreakdown = {
    growthPotentialFactor: growthPotentialFactor.value,
    ageFactor: ageFactor.value,
    currentValueFactor: currentValueFactor.value,
    teacherFactor: teacherFactor.value,
    discipleCountFactor: discipleCountFactor.value,
    fatigueFactor: conditionFactors.value.fatigueFactor,
    injuryFactor: conditionFactors.value.injuryFactor,
    motivationFactor: record.motivationFactor,
    rngFactor,
  };

  const gain = multiplyBasisPointsFloor(config.growth.baseMilliPointsPerTraining, [
    factorBreakdown.growthPotentialFactor,
    factorBreakdown.ageFactor,
    factorBreakdown.currentValueFactor,
    factorBreakdown.teacherFactor,
    factorBreakdown.discipleCountFactor,
    factorBreakdown.fatigueFactor,
    factorBreakdown.injuryFactor,
    factorBreakdown.motivationFactor,
    factorBreakdown.rngFactor,
  ]);
  if (!gain.ok) {
    return failure(gain.issues);
  }

  const remainderBefore = draft.remainderMilliPoints[targetStat];
  const accumulated = remainderBefore + gain.value;
  const surfaceGain = Math.min(
    Math.floor(accumulated / MILLI_POINTS_PER_SURFACE_POINT),
    100 - surfaceBefore,
  );
  const remainderAfter = accumulated % MILLI_POINTS_PER_SURFACE_POINT;
  draft.abilities[targetStat] = {
    ...draft.abilities[targetStat],
    surfaceValue: surfaceBefore + surfaceGain,
  };
  draft.remainderMilliPoints[targetStat] = remainderAfter;
  totals.statGainMilliPoints = gain.value;

  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.statGrowthApplied, draft.personId, absoluteWeek, {
      reason: "weekly_train_stat",
      rngUsage: "growth_factor",
      targetStat,
      before: surfaceBefore,
      after: draft.abilities[targetStat].surfaceValue,
      remainderBefore,
      remainderAfter,
      appliedMilliPoints: gain.value,
      factorBreakdown,
    }),
  );

  const masteryTarget = selectNormalTrainingMasteryTarget(record, catalog, targetStat);
  if (!masteryTarget.ok) {
    return failure(masteryTarget.issues);
  }
  if (masteryTarget.value !== null) {
    const state = findDraftTechniqueState(draft, masteryTarget.value.techniqueId);
    if (state === undefined) {
      return failure([
        {
          path: "/person/sprint1State/techniqueStates",
          message: "normal-training mastery target is missing from the draft technique states",
          actual: masteryTarget.value.techniqueId,
          expected: "existing PersonTechniqueState",
        },
      ]);
    }
    const currentValueMasteryFactor = selectMasteryCurrentValueFactor(
      state.masteryHundredths,
      config,
    );
    if (!currentValueMasteryFactor.ok) {
      return failure(currentValueMasteryFactor.issues);
    }
    const masteryGain = multiplyBasisPointsFloor(
      config.techniqueLearning.masteryGainHundredths.normalTraining,
      [currentValueMasteryFactor.value],
    );
    if (!masteryGain.ok) {
      return failure(masteryGain.issues);
    }
    const masteryBefore = state.masteryHundredths;
    const applied = applyMasteryGain(state, masteryGain.value);
    totals.masteryGainHundredths += applied;
    events.push(
      buildEvent(WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased, draft.personId, absoluteWeek, {
        reason: "normal_training",
        rngUsage: null,
        techniqueId: state.techniqueId,
        before: masteryBefore,
        after: state.masteryHundredths,
        delta: applied,
        unit: TECHNIQUE_MASTERY_PROGRESS_UNIT,
        factorBreakdown: { masteryCurrentValueFactor: currentValueMasteryFactor.value },
      }),
    );
  }

  applyFatigueDelta(draft, config.temporaryCondition.weeklyFatigueDelta.trainStat);
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated, draft.personId, absoluteWeek, {
      reason: `weekly_${WEEKLY_ACTION_CONFIG_KEY.train_stat}`,
      rngUsage: null,
      ...conditionDeltaPayload(conditionBefore, snapshotCondition(draft)),
    }),
  );

  return success({ events, rngCalls: 1, totals });
}

/* ---------------------------------------------------------- learn_technique */

function buildLearnerContext(
  record: WeeklyTrainingPersonRecord,
  draft: WeeklyTrainingDraft,
): TechniqueLearnerContext {
  const person = record.person as unknown as Record<string, unknown>;
  return {
    abilities: draft.abilities,
    aptitudes: person["aptitudes"] as AptitudeScores,
    techniqueStates: draft.techniqueStates,
  };
}

function acquireTechnique(
  draft: WeeklyTrainingDraft,
  state: PersonTechniqueState,
  definition: TechniqueDefinition,
  config: Sprint1Config,
  absoluteWeek: number,
  totals: WeeklyEffectTotals,
  events: WeeklyTrainingEventCandidate[],
): ValidationResult<null> {
  const initialMastery = deriveInitialMasteryHundredths(definition.learningTier, config);
  if (!initialMastery.ok) {
    return failure(initialMastery.issues);
  }
  state.acquiredAbsoluteWeek = absoluteWeek;
  state.masteryHundredths = initialMastery.value;
  draft.learningFocusTechniqueId = null;
  totals.masteryGainHundredths += initialMastery.value;
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.techniqueAcquired, draft.personId, absoluteWeek, {
      reason: "weekly_learn_technique",
      rngUsage: null,
      techniqueId: definition.techniqueId,
      learningTier: definition.learningTier,
      acquiredAbsoluteWeek: absoluteWeek,
      initialMasteryHundredths: initialMastery.value,
    }),
  );
  return success(null);
}

/**
 * 10 §6.2.1: an `acquirable` technique is completed in place — no progress event,
 * no effect RNG, tier-based initial mastery, and the learning focus is cleared.
 */
export function applyLearnTechniqueAcquirable(
  draft: WeeklyTrainingDraft,
  definition: TechniqueDefinition,
  config: Sprint1Config,
  absoluteWeek: number,
): ValidationResult<WeeklyEffectOutcome> {
  const conditionBefore = snapshotCondition(draft);
  const totals = emptyTotals();
  const events: WeeklyTrainingEventCandidate[] = [];

  const state = ensureDraftTechniqueState(draft, definition.techniqueId);
  const acquired = acquireTechnique(draft, state, definition, config, absoluteWeek, totals, events);
  if (!acquired.ok) {
    return failure(acquired.issues);
  }

  applyFatigueDelta(draft, config.temporaryCondition.weeklyFatigueDelta.learnTechnique);
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated, draft.personId, absoluteWeek, {
      reason: `weekly_${WEEKLY_ACTION_CONFIG_KEY.learn_technique}`,
      rngUsage: null,
      ...conditionDeltaPayload(conditionBefore, snapshotCondition(draft)),
    }),
  );

  return success({ events, rngCalls: 0, totals });
}

/**
 * 09 §8 / 14 §5: nine basis-points factors with a single final floor, capped at
 * `learningProgressRequired * 10` only after a valid apply, then either acquisition
 * or a `blocked_at_cap` focus release.
 */
export function applyLearnTechniqueProgressing(
  draft: WeeklyTrainingDraft,
  record: WeeklyTrainingPersonRecord,
  definition: TechniqueDefinition,
  context: TechniqueTargetContext | undefined,
  config: Sprint1Config,
  absoluteWeek: number,
  rng: WeeklyEffectRng,
  sprint3Config?: Sprint3Config,
): ValidationResult<WeeklyEffectOutcome> {
  const conditionBefore = snapshotCondition(draft);
  const totals = emptyTotals();
  const events: WeeklyTrainingEventCandidate[] = [];

  const person = record.person as unknown as Record<string, unknown>;
  const aptitudes = person["aptitudes"] as AptitudeScores;
  const learning = config.techniqueLearning;

  const aptitudeFactor = normalizedInputToFactorBasisPoints(
    aptitudes[definition.category].surfaceValue,
    learning.aptitudeFactorRange,
  );
  const requiredStatsFactor = deriveRequiredStatsFactor(definition, draft.abilities);
  if (!requiredStatsFactor.ok) {
    return failure(requiredStatsFactor.issues);
  }
  const clampedRequiredStatsFactor = clamp(
    requiredStatsFactor.value,
    learning.requiredStatsFactorRange.min,
    learning.requiredStatsFactorRange.max,
  );
  const learningTraitFactor = normalizedInputToFactorBasisPoints(
    resolveLearningTrait(context),
    learning.learningTraitFactorRange,
  );
  const teacherTransmissionFactor = normalizedInputToFactorBasisPoints(
    resolveTeachingAbility(context),
    learning.teacherTransmissionFactorRange,
  );
  const compatibilityFactor = normalizedInputToFactorBasisPoints(
    resolveCompatibility(context),
    learning.compatibilityFactorRange,
  );
  const discipleCountFactor = selectDiscipleCountFactorOrNeutral(
    record.discipleCount,
    config,
    sprint3Config,
  );
  if (!discipleCountFactor.ok) {
    return failure(discipleCountFactor.issues);
  }
  const conditionFactors = selectFatigueAndInjuryFactors(draft, config);
  if (!conditionFactors.ok) {
    return failure(conditionFactors.issues);
  }

  const rngFactor = drawInclusiveBasisPoints(
    rng,
    learning.rngFactorRange.min,
    learning.rngFactorRange.max,
  );

  const factorBreakdown = {
    aptitudeFactor,
    requiredStatsFactor: clampedRequiredStatsFactor,
    learningTraitFactor,
    teacherTransmissionFactor,
    compatibilityFactor,
    discipleCountFactor: discipleCountFactor.value,
    fatigueFactor: conditionFactors.value.fatigueFactor,
    injuryFactor: conditionFactors.value.injuryFactor,
    rngFactor,
    learningTrait: resolveLearningTrait(context),
    teachingAbility: resolveTeachingAbility(context),
    compatibility: resolveCompatibility(context),
  };

  const progressGain = multiplyBasisPointsFloor(learning.baseWeeklyProgressTenths, [
    aptitudeFactor,
    clampedRequiredStatsFactor,
    learningTraitFactor,
    teacherTransmissionFactor,
    compatibilityFactor,
    discipleCountFactor.value,
    conditionFactors.value.fatigueFactor,
    conditionFactors.value.injuryFactor,
    rngFactor,
  ]);
  if (!progressGain.ok) {
    return failure(progressGain.issues);
  }

  const state = ensureDraftTechniqueState(draft, definition.techniqueId);
  const progressCapTenths = definition.learningProgressRequired * 10;
  const progressBefore = state.learningProgressTenths;
  const progressAfter = Math.min(progressCapTenths, progressBefore + progressGain.value);
  state.learningProgressTenths = progressAfter;
  totals.learningProgressGainTenths = progressAfter - progressBefore;

  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.learningProgressed, draft.personId, absoluteWeek, {
      reason: "weekly_learn_technique",
      rngUsage: "learning_progress_factor",
      techniqueId: definition.techniqueId,
      before: progressBefore,
      after: progressAfter,
      delta: progressAfter - progressBefore,
      unit: TECHNIQUE_LEARNING_PROGRESS_UNIT,
      progressCapTenths,
      factorBreakdown,
    }),
  );

  if (progressAfter >= progressCapTenths) {
    const conditions = evaluateTechniqueAcquisitionConditions(
      definition,
      buildLearnerContext(record, draft),
    );
    if (!conditions.ok) {
      return failure(conditions.issues);
    }
    if (conditions.value.allConditionsMet) {
      const acquired = acquireTechnique(
        draft,
        state,
        definition,
        config,
        absoluteWeek,
        totals,
        events,
      );
      if (!acquired.ok) {
        return failure(acquired.issues);
      }
    } else {
      // 09 §7: at the cap without all conditions met the technique is
      // `blocked_at_cap`, so the focus is released for next week's re-selection.
      draft.learningFocusTechniqueId = null;
    }
  } else {
    draft.learningFocusTechniqueId = definition.techniqueId;
  }

  applyFatigueDelta(draft, config.temporaryCondition.weeklyFatigueDelta.learnTechnique);
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated, draft.personId, absoluteWeek, {
      reason: `weekly_${WEEKLY_ACTION_CONFIG_KEY.learn_technique}`,
      rngUsage: null,
      ...conditionDeltaPayload(conditionBefore, snapshotCondition(draft)),
    }),
  );

  return success({ events, rngCalls: 1, totals });
}

/* ------------------------------------------------------- practice_technique */

/** 09 §9.1: dedicated practice consumes one effect RNG even when the delta is 0. */
export function applyPractice(
  draft: WeeklyTrainingDraft,
  config: Sprint1Config,
  techniqueId: TechniqueId,
  absoluteWeek: number,
  rng: WeeklyEffectRng,
): ValidationResult<WeeklyEffectOutcome> {
  const conditionBefore = snapshotCondition(draft);
  const totals = emptyTotals();
  const events: WeeklyTrainingEventCandidate[] = [];

  const state = findDraftTechniqueState(draft, techniqueId);
  if (state === undefined || state.acquiredAbsoluteWeek === null) {
    return failure([
      {
        path: "/targetTechniqueId",
        message: "practice target must be an acquired PersonTechniqueState",
        actual: techniqueId,
        expected: "acquired technique",
      },
    ]);
  }

  const currentValueFactor = selectMasteryCurrentValueFactor(state.masteryHundredths, config);
  if (!currentValueFactor.ok) {
    return failure(currentValueFactor.issues);
  }
  const rngFactor = drawInclusiveBasisPoints(
    rng,
    config.techniqueLearning.masteryPracticeRngFactorRange.min,
    config.techniqueLearning.masteryPracticeRngFactorRange.max,
  );
  const gain = multiplyBasisPointsFloor(
    config.techniqueLearning.masteryGainHundredths.dedicatedPractice,
    [currentValueFactor.value, rngFactor],
  );
  if (!gain.ok) {
    return failure(gain.issues);
  }

  const masteryBefore = state.masteryHundredths;
  const applied = applyMasteryGain(state, gain.value);
  state.lastPracticedAbsoluteWeek = absoluteWeek;
  totals.masteryGainHundredths = applied;

  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.masteryIncreased, draft.personId, absoluteWeek, {
      reason: "dedicated_practice",
      rngUsage: "mastery_practice_factor",
      techniqueId,
      before: masteryBefore,
      after: state.masteryHundredths,
      delta: applied,
      unit: TECHNIQUE_MASTERY_PROGRESS_UNIT,
      factorBreakdown: {
        masteryCurrentValueFactor: currentValueFactor.value,
        masteryPracticeRngFactor: rngFactor,
      },
    }),
  );

  applyFatigueDelta(draft, config.temporaryCondition.weeklyFatigueDelta.practiceTechnique);
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.conditionUpdated, draft.personId, absoluteWeek, {
      reason: `weekly_${WEEKLY_ACTION_CONFIG_KEY.practice_technique}`,
      rngUsage: null,
      ...conditionDeltaPayload(conditionBefore, snapshotCondition(draft)),
    }),
  );

  return success({ events, rngCalls: 1, totals });
}

/* --------------------------------------------------------------------- rest */

/**
 * 08 §6.4: rest recovers fatigue, injury, condition, and `currentMental`. Confidence
 * is only changed by battle results and stays untouched. No RNG (10 §8).
 */
export function applyRest(
  draft: WeeklyTrainingDraft,
  config: Sprint1Config,
  absoluteWeek: number,
  forcedReason: WeeklyForcedRestReason | null,
): ValidationResult<WeeklyEffectOutcome> {
  const conditionBefore = snapshotCondition(draft);
  const events: WeeklyTrainingEventCandidate[] = [];

  if (forcedReason !== null) {
    events.push(
      buildEvent(WEEKLY_TRAINING_EVENT_TYPES.forcedRestApplied, draft.personId, absoluteWeek, {
        reason: "weekly_forced_rest",
        rngUsage: null,
        forcedReason,
      }),
    );
  }

  const temporary = config.temporaryCondition;
  applyFatigueDelta(draft, temporary.weeklyFatigueDelta.rest);
  draft.injury = clamp(draft.injury - temporary.restInjuryRecovery, 0, 100);
  draft.condition = clamp(draft.condition + temporary.restConditionDelta, -20, 20);
  draft.currentMental = clamp(
    draft.currentMental + temporary.restMentalRecovery,
    0,
    draft.maximumMental,
  );

  const after = snapshotCondition(draft);
  events.push(
    buildEvent(WEEKLY_TRAINING_EVENT_TYPES.restApplied, draft.personId, absoluteWeek, {
      reason: forcedReason === null ? "weekly_rest" : "weekly_forced_rest",
      rngUsage: null,
      fatigue: {
        before: conditionBefore.fatigue,
        after: after.fatigue,
        delta: after.fatigue - conditionBefore.fatigue,
      },
      injury: {
        before: conditionBefore.injury,
        after: after.injury,
        delta: after.injury - conditionBefore.injury,
      },
      condition: {
        before: conditionBefore.condition,
        after: after.condition,
        delta: after.condition - conditionBefore.condition,
      },
      currentMental: {
        before: conditionBefore.currentMental,
        after: after.currentMental,
        delta: after.currentMental - conditionBefore.currentMental,
      },
    }),
  );

  return success({ events, rngCalls: 0, totals: emptyTotals() });
}

/** Rebuild the canonical `StatGrowthRemainderCollection` order from a draft. */
export function draftRemainderCollection(
  draft: WeeklyTrainingDraft,
): readonly { stat: AbilityKey; milliPoints: number }[] {
  return ABILITY_KEYS.map((stat) => ({ stat, milliPoints: draft.remainderMilliPoints[stat] }));
}
