/**
 * Weekly target selection: training ability, learning technique, practice technique
 * (10 mini-spec §6.1 / §6.2 / §6.2.1 / §6.3, 09 §7, §8.1).
 *
 * Candidate building never consumes RNG. Tie resolution consumes exactly one
 * `nextInt` call, and only when two or more candidates share the highest score
 * (10 §8). Candidate arrays are always normalized to the fixed AbilityKey order or
 * to ascending TechniqueId before the tie draw.
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey, AbilityScores, AptitudeScores } from "../abilities.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import type { TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import { mathematicalFloor } from "./multiply-basis-points.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";
import {
  evaluateTechniqueAcquisitionConditions,
  deriveLearningTargetStatus,
} from "./technique-acquisition.js";
import type { TechniqueLearnerContext } from "./technique-acquisition.js";
import type { TechniqueCatalog } from "./technique-catalog.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { LearningTargetDerivedStatus } from "./technique-enums.js";
import { deriveRequiredStatsFactor } from "./technique-required-stats-factor.js";
import { teacherCanTeach } from "./technique-teacher.js";
import type { PersonTechniqueState, Sprint1Config } from "./types.js";
import { resolveStyleMatch, resolveTeacherPriority } from "./weekly-training-types.js";
import type {
  TechniqueTargetContext,
  WeeklyTrainingPersonRecord,
} from "./weekly-training-types.js";

/** Minimal RNG surface (07 mini-spec `nextInt`). */
export type WeeklyTargetRng = {
  nextInt(minInclusive: number, maxExclusive: number): number;
};

export type StatTargetCandidate = {
  ability: AbilityKey;
  scoreHundredths: number;
};

export type StatTargetSelection = {
  targetStat: AbilityKey;
  scoreHundredths: number;
  candidates: readonly StatTargetCandidate[];
  rngCalls: number;
};

export type LearningTargetCandidate = {
  techniqueId: TechniqueId;
  scoreHundredths: number;
  derivedStatus: LearningTargetDerivedStatus;
};

export type LearningTargetSelection = {
  targetTechniqueId: TechniqueId;
  scoreHundredths: number;
  derivedStatus: LearningTargetDerivedStatus;
  candidates: readonly LearningTargetCandidate[];
  /** True when the persisted `learningFocusTechniqueId` was still an active candidate. */
  focusMaintained: boolean;
  /** True when a persisted focus was dropped because it is no longer an active candidate. */
  focusReleased: boolean;
  rngCalls: number;
};

export type PracticeTargetCandidate = {
  techniqueId: TechniqueId;
  scoreHundredths: number;
};

export type PracticeTargetSelection = {
  targetTechniqueId: TechniqueId;
  scoreHundredths: number;
  candidates: readonly PracticeTargetCandidate[];
  rngCalls: number;
};

type PersonParts = {
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  sprint1State: Sprint1PersonState;
};

function readPersonParts(record: WeeklyTrainingPersonRecord): ValidationResult<PersonParts> {
  const person: Person | undefined = record?.person;
  if (person === undefined || person === null || typeof person !== "object") {
    return failure([
      {
        path: "/person",
        message: "personRecord.person must be a validated Person",
        actual: person,
        expected: "Person",
      },
    ]);
  }
  const sprint1State = person.sprint1State;
  if (sprint1State === undefined || sprint1State === null) {
    return failure([
      {
        path: "/person/sprint1State",
        message: "sprint1State is required for target selection (08 §6.2)",
        expected: "Sprint1PersonState",
      },
    ]);
  }
  return success({
    abilities: person.abilities,
    aptitudes: person.aptitudes,
    sprint1State,
  });
}

function techniqueStateById(
  state: Sprint1PersonState,
  techniqueId: TechniqueId,
): PersonTechniqueState | undefined {
  return state.techniqueStates.find((entry) => entry.techniqueId === techniqueId);
}

function contextById(
  contexts: readonly TechniqueTargetContext[],
  techniqueId: TechniqueId,
): TechniqueTargetContext | undefined {
  return contexts.find((entry) => entry.techniqueId === techniqueId);
}

/**
 * Resolve the highest-scoring candidate. Ties are normalized to the caller's fixed
 * order (AbilityKey order or ascending TechniqueId) and broken with exactly one
 * `nextInt(0, tied.length)` call.
 */
function resolveHighestScore<T extends { scoreHundredths: number }>(
  candidates: readonly T[],
  rng: WeeklyTargetRng,
): { winner: T; rngCalls: number } {
  let best = candidates[0]!.scoreHundredths;
  for (const candidate of candidates) {
    if (candidate.scoreHundredths > best) {
      best = candidate.scoreHundredths;
    }
  }
  const tied = candidates.filter((candidate) => candidate.scoreHundredths === best);
  if (tied.length === 1) {
    return { winner: tied[0]!, rngCalls: 0 };
  }
  return { winner: tied[rng.nextInt(0, tied.length)]!, rngCalls: 1 };
}

/* ------------------------------------------------------------------ 6.1 stat */

export type StatTargetScoreInput = {
  currentValue: number;
  growthPotential: number;
  relatedAptitude: number;
  teacherRecommendation: number;
};

/** 10 §6.1 `StatTargetScoreHundredths` using the normalized `statTargetWeights`. */
export function computeStatTargetScoreHundredths(
  input: StatTargetScoreInput,
  config: Sprint1Config,
): ValidationResult<number> {
  const issues: ValidationIssue[] = [];
  const bounded: readonly [keyof StatTargetScoreInput, number][] = [
    ["currentValue", input.currentValue],
    ["growthPotential", input.growthPotential],
    ["relatedAptitude", input.relatedAptitude],
    ["teacherRecommendation", input.teacherRecommendation],
  ];
  for (const [key, value] of bounded) {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
      issues.push({
        path: `/${key}`,
        message: "stat target score inputs must be integers within 0..100",
        actual: value,
        expected: "0..100",
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const weights = config.weeklyPlanner.statTargetWeights;
  const numerator =
    (100 - input.currentValue) * weights.remainingCapacity +
    input.growthPotential * weights.growthPotential +
    input.relatedAptitude * weights.relatedAptitude +
    input.teacherRecommendation * weights.teacherRecommendation;
  return success(mathematicalFloor(numerator, 100));
}

/**
 * 08 §5.2 / §11: a surface value already at 100 cannot grow, so it is not a
 * trainable candidate. An empty result is the `no_trainable_stat` fallback.
 */
export function buildTrainingStatCandidates(
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
): ValidationResult<readonly StatTargetCandidate[]> {
  const parts = readPersonParts(record);
  if (!parts.ok) {
    return failure(parts.issues);
  }

  const candidates: StatTargetCandidate[] = [];
  for (const ability of ABILITY_KEYS) {
    const currentValue = parts.value.abilities[ability].surfaceValue;
    if (currentValue >= 100) {
      continue;
    }
    const context = record.statTargetContext.byAbility[ability];
    const score = computeStatTargetScoreHundredths(
      {
        currentValue,
        growthPotential: record.growthPotential[ability],
        relatedAptitude: context.relatedAptitude,
        teacherRecommendation: context.teacherRecommendation,
      },
      config,
    );
    if (!score.ok) {
      return failure(
        score.issues.map((issue) => ({
          ...issue,
          path: `/statTargetContext/${ability}${issue.path}`,
        })),
      );
    }
    candidates.push({ ability, scoreHundredths: score.value });
  }
  return success(candidates);
}

/** Returns `null` when there is no trainable ability (10 §12 `no_trainable_stat`). */
export function selectTrainingStatTarget(
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
  rng: WeeklyTargetRng,
  prebuiltCandidates?: readonly StatTargetCandidate[],
): ValidationResult<StatTargetSelection | null> {
  const candidatesResult =
    prebuiltCandidates !== undefined
      ? success(prebuiltCandidates)
      : buildTrainingStatCandidates(record, config);
  if (!candidatesResult.ok) {
    return failure(candidatesResult.issues);
  }
  const candidates = candidatesResult.value;
  if (candidates.length === 0) {
    return success(null);
  }
  const { winner, rngCalls } = resolveHighestScore(candidates, rng);
  return success({
    targetStat: winner.ability,
    scoreHundredths: winner.scoreHundredths,
    candidates,
    rngCalls,
  });
}

/* -------------------------------------------------------------- 6.2 learning */

export type LearningTargetScoreInput = {
  domainAptitude: number;
  requiredStatsFactorBasisPoints: number;
  learningProgressTenths: number;
  learningProgressRequired: number;
  teacherCanTeach: boolean;
  styleMatch: number;
};

const TIER_ACCESSIBILITY_PIVOT = 500;

/** 10 §6.2 `LearningTargetScoreHundredths` (golden fixture: 7320). */
export function computeLearningTargetScoreHundredths(
  input: LearningTargetScoreInput,
  config: Sprint1Config,
): ValidationResult<number> {
  const issues: ValidationIssue[] = [];

  if (
    !Number.isInteger(input.domainAptitude) ||
    input.domainAptitude < 0 ||
    input.domainAptitude > 100
  ) {
    issues.push({
      path: "/domainAptitude",
      message: "domainAptitude must be an integer within 0..100",
      actual: input.domainAptitude,
      expected: "0..100",
    });
  }
  if (!Number.isInteger(input.styleMatch) || input.styleMatch < 0 || input.styleMatch > 100) {
    issues.push({
      path: "/styleMatch",
      message: "styleMatch must be an integer within 0..100",
      actual: input.styleMatch,
      expected: "0..100",
    });
  }
  if (
    !Number.isInteger(input.requiredStatsFactorBasisPoints) ||
    input.requiredStatsFactorBasisPoints < 7000 ||
    input.requiredStatsFactorBasisPoints > 12000
  ) {
    issues.push({
      path: "/requiredStatsFactorBasisPoints",
      message: "requiredStatsFactorBasisPoints must be an integer within 7000..12000",
      actual: input.requiredStatsFactorBasisPoints,
      expected: "7000..12000",
    });
  }
  if (
    !Number.isInteger(input.learningProgressRequired) ||
    input.learningProgressRequired < 1 ||
    input.learningProgressRequired > 10000
  ) {
    issues.push({
      path: "/learningProgressRequired",
      message:
        "learningProgressRequired must be an integer within 1..10000; zero division is never patched (10 §6.2)",
      actual: input.learningProgressRequired,
      expected: "1..10000",
    });
  }
  if (typeof input.teacherCanTeach !== "boolean") {
    issues.push({
      path: "/teacherCanTeach",
      message: "teacherCanTeach must be a boolean derived from the weekStart snapshot (09 §8.1)",
      actual: input.teacherCanTeach,
      expected: "boolean",
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const progressCapTenths = input.learningProgressRequired * 10;
  if (
    !Number.isInteger(input.learningProgressTenths) ||
    input.learningProgressTenths < 0 ||
    input.learningProgressTenths > progressCapTenths
  ) {
    return failure([
      {
        path: "/learningProgressTenths",
        message:
          "learningProgressTenths must be within 0..learningProgressRequired * 10; out-of-range input is rejected, never clamped (10 §6.2)",
        actual: input.learningProgressTenths,
        expected: `0..${String(progressCapTenths)}`,
      },
    ]);
  }

  const weights = config.weeklyPlanner.learningTargetWeights;
  const aptitudeContributionHundredths = input.domainAptitude * weights.aptitude;
  const requiredStatsContributionHundredths = Math.floor(
    (input.requiredStatsFactorBasisPoints * weights.requiredStats * 100) / 12000,
  );
  const progressContributionHundredths = Math.floor(
    (input.learningProgressTenths * weights.currentProgress * 100) / progressCapTenths,
  );
  const teacherContributionHundredths = input.teacherCanTeach
    ? weights.teacherAvailability * 100
    : 0;
  const styleContributionHundredths = input.styleMatch * weights.styleMatch;
  const tierAccessibilityBasisPoints = Math.min(
    10000,
    Math.max(
      0,
      mathematicalFloor(
        (TIER_ACCESSIBILITY_PIVOT - input.learningProgressRequired) * 10000,
        TIER_ACCESSIBILITY_PIVOT,
      ),
    ),
  );
  const tierContributionHundredths = Math.floor(
    (tierAccessibilityBasisPoints * weights.tierAccessibility) / 100,
  );

  return success(
    aptitudeContributionHundredths +
      requiredStatsContributionHundredths +
      progressContributionHundredths +
      teacherContributionHundredths +
      styleContributionHundredths +
      tierContributionHundredths,
  );
}

/**
 * 10 §6.2 candidate conditions: catalog definition present, not yet acquired,
 * `teacherCanTeach = true` (no Sprint 1 self-study), derived status other than
 * `blocked_at_cap`, and required aptitude met (09 §7: an unmet requiredAptitude
 * cannot change during Sprint 1, so such a technique is permanently blocked).
 *
 * A definition with no `TechniqueTargetContext` has no `teacherCanTeachContext` and
 * therefore cannot be proven teachable; it is not a candidate.
 */
export function buildLearningTechniqueCandidates(
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  config: Sprint1Config,
): ValidationResult<readonly LearningTargetCandidate[]> {
  const parts = readPersonParts(record);
  if (!parts.ok) {
    return failure(parts.issues);
  }
  const learner: TechniqueLearnerContext = {
    abilities: parts.value.abilities,
    aptitudes: parts.value.aptitudes,
    techniqueStates: parts.value.sprint1State.techniqueStates,
  };

  const candidates: LearningTargetCandidate[] = [];
  for (const definition of catalog.definitions) {
    const state = techniqueStateById(parts.value.sprint1State, definition.techniqueId);
    if (state !== undefined && state.acquiredAbsoluteWeek !== null) {
      continue;
    }
    const context = contextById(record.techniqueTargetContexts, definition.techniqueId);
    if (context === undefined) {
      continue;
    }

    const canTeach = teacherCanTeach(definition, context.teacherCanTeachContext);
    if (!canTeach.ok) {
      return failure(
        canTeach.issues.map((issue) => ({
          ...issue,
          path: `/techniqueTargetContexts/${definition.techniqueId}${issue.path}`,
        })),
      );
    }
    if (!canTeach.value) {
      continue;
    }

    const conditions = evaluateTechniqueAcquisitionConditions(definition, learner);
    if (!conditions.ok) {
      return failure(conditions.issues);
    }
    if (!conditions.value.requiredAptitudeMet) {
      continue;
    }

    const status = deriveLearningTargetStatus(definition, state ?? null, learner);
    if (!status.ok) {
      return failure(status.issues);
    }
    if (status.value === "blocked_at_cap") {
      continue;
    }

    const requiredStatsFactor = deriveRequiredStatsFactor(definition, parts.value.abilities);
    if (!requiredStatsFactor.ok) {
      return failure(requiredStatsFactor.issues);
    }

    const score = computeLearningTargetScoreHundredths(
      {
        domainAptitude: parts.value.aptitudes[definition.category].surfaceValue,
        requiredStatsFactorBasisPoints: requiredStatsFactor.value,
        learningProgressTenths: state?.learningProgressTenths ?? 0,
        learningProgressRequired: definition.learningProgressRequired,
        teacherCanTeach: true,
        styleMatch: resolveStyleMatch(context),
      },
      config,
    );
    if (!score.ok) {
      return failure(
        score.issues.map((issue) => ({
          ...issue,
          path: `/techniqueTargetContexts/${definition.techniqueId}${issue.path}`,
        })),
      );
    }

    candidates.push({
      techniqueId: definition.techniqueId,
      scoreHundredths: score.value,
      derivedStatus: status.value,
    });
  }

  candidates.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));
  return success(candidates);
}

export type WeeklyLearningFocusNormalization = {
  learningFocusTechniqueId: TechniqueId | null;
  released: boolean;
};

/**
 * 10 §6.2 focus lifecycle, evaluated once per person at week start and independently
 * of the action that is selected afterwards: a stored `learningFocusTechniqueId` is
 * kept only while it still satisfies the candidate conditions (catalog definition
 * present, not yet acquired, `teacherCanTeach = true`, required aptitude met, derived
 * status other than `blocked_at_cap`). Otherwise the focus is released to `null`, so a
 * lost knowledge source or a `blocked_at_cap` transition clears the focus even when
 * the week is spent on `train_stat`, `practice_technique`, or `rest`.
 *
 * Consumes no RNG and emits no event. A focus whose TechniqueId is absent from the
 * catalog is invalid *input* (rejected by the S01-003 semantic validator) and is
 * reported as a failure here rather than silently released.
 */
export function normalizeWeeklyLearningFocus(
  sprint1State: Sprint1PersonState,
  catalog: TechniqueCatalog,
  techniqueTargetContexts: readonly TechniqueTargetContext[],
  abilities: AbilityScores,
  aptitudes: AptitudeScores,
): ValidationResult<WeeklyLearningFocusNormalization> {
  const focusId = sprint1State.learningFocusTechniqueId;
  if (focusId === null) {
    return success({ learningFocusTechniqueId: null, released: false });
  }

  const definition = catalog.definitions.find((entry) => entry.techniqueId === focusId);
  if (definition === undefined) {
    return failure([
      {
        path: "/person/sprint1State/learningFocusTechniqueId",
        message:
          "learningFocusTechniqueId must exist in the TechniqueCatalog; a dangling focus is invalid input, never a silent release (09 §6.1, 10 §6.2)",
        actual: focusId,
        expected: "TechniqueId present in catalog.definitions",
      },
    ]);
  }

  const released: WeeklyLearningFocusNormalization = {
    learningFocusTechniqueId: null,
    released: true,
  };

  const state = techniqueStateById(sprint1State, focusId) ?? null;
  if (state !== null && state.acquiredAbsoluteWeek !== null) {
    return success(released);
  }

  const context = contextById(techniqueTargetContexts, focusId);
  if (context === undefined) {
    return success(released);
  }
  const canTeach = teacherCanTeach(definition, context.teacherCanTeachContext);
  if (!canTeach.ok) {
    return failure(
      canTeach.issues.map((issue) => ({
        ...issue,
        path: `/techniqueTargetContexts/${definition.techniqueId}${issue.path}`,
      })),
    );
  }
  if (!canTeach.value) {
    return success(released);
  }

  const learner: TechniqueLearnerContext = {
    abilities,
    aptitudes,
    techniqueStates: sprint1State.techniqueStates,
  };
  const conditions = evaluateTechniqueAcquisitionConditions(definition, learner);
  if (!conditions.ok) {
    return failure(conditions.issues);
  }
  if (!conditions.value.requiredAptitudeMet) {
    return success(released);
  }

  const status = deriveLearningTargetStatus(definition, state, learner);
  if (!status.ok) {
    return failure(status.issues);
  }
  if (status.value === "blocked_at_cap") {
    return success(released);
  }

  return success({ learningFocusTechniqueId: focusId, released: false });
}

/**
 * 10 §6.2 focus rule: an existing `learningFocusTechniqueId` is kept while it stays
 * an active candidate (no RNG, no re-scoring). Otherwise the focus is released and a
 * fresh selection runs over the normalized candidate list.
 *
 * Returns `null` when there is no candidate (`no_learning_candidate`).
 */
export function selectLearningTechniqueTarget(
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  config: Sprint1Config,
  rng: WeeklyTargetRng,
  prebuiltCandidates?: readonly LearningTargetCandidate[],
): ValidationResult<LearningTargetSelection | null> {
  const parts = readPersonParts(record);
  if (!parts.ok) {
    return failure(parts.issues);
  }
  const candidatesResult =
    prebuiltCandidates !== undefined
      ? success(prebuiltCandidates)
      : buildLearningTechniqueCandidates(record, catalog, config);
  if (!candidatesResult.ok) {
    return failure(candidatesResult.issues);
  }
  const candidates = candidatesResult.value;

  const focusId = parts.value.sprint1State.learningFocusTechniqueId;
  if (candidates.length === 0) {
    return success(null);
  }

  if (focusId !== null) {
    const maintained = candidates.find((candidate) => candidate.techniqueId === focusId);
    if (maintained !== undefined) {
      return success({
        targetTechniqueId: maintained.techniqueId,
        scoreHundredths: maintained.scoreHundredths,
        derivedStatus: maintained.derivedStatus,
        candidates,
        focusMaintained: true,
        focusReleased: false,
        rngCalls: 0,
      });
    }
  }

  const { winner, rngCalls } = resolveHighestScore(candidates, rng);
  return success({
    targetTechniqueId: winner.techniqueId,
    scoreHundredths: winner.scoreHundredths,
    derivedStatus: winner.derivedStatus,
    candidates,
    focusMaintained: false,
    focusReleased: focusId !== null,
    rngCalls,
  });
}

/* -------------------------------------------------------------- 6.3 practice */

export type PracticeTargetScoreInput = {
  masteryHundredths: number;
  recentPracticeNeed: number;
  teacherPriority: number;
  styleMatch: number;
};

const RECENT_PRACTICE_NEED_WEEKS = 12;

/** 10 §6.3 `recentPracticeNeed`; a future `lastPracticedAbsoluteWeek` is unrecoverable. */
export function computeRecentPracticeNeed(
  currentAbsoluteWeek: number,
  lastPracticedAbsoluteWeek: number | null,
): ValidationResult<number> {
  if (lastPracticedAbsoluteWeek === null) {
    return success(100);
  }
  if (lastPracticedAbsoluteWeek > currentAbsoluteWeek) {
    return failure([
      {
        path: "/lastPracticedAbsoluteWeek",
        message: "lastPracticedAbsoluteWeek must not be in the future (10 §6.3)",
        actual: lastPracticedAbsoluteWeek,
        expected: `<= ${String(currentAbsoluteWeek)}`,
      },
    ]);
  }
  const elapsed = currentAbsoluteWeek - lastPracticedAbsoluteWeek;
  return success(
    Math.min(100, Math.max(0, Math.floor((elapsed * 100) / RECENT_PRACTICE_NEED_WEEKS))),
  );
}

/** 10 §6.3 `PracticeTargetScoreHundredths` (golden fixture: 5050). */
export function computePracticeTargetScoreHundredths(
  input: PracticeTargetScoreInput,
  config: Sprint1Config,
): ValidationResult<number> {
  const issues: ValidationIssue[] = [];
  if (
    !Number.isInteger(input.masteryHundredths) ||
    input.masteryHundredths < 0 ||
    input.masteryHundredths > 10000
  ) {
    issues.push({
      path: "/masteryHundredths",
      message: "masteryHundredths must be an integer within 0..10000",
      actual: input.masteryHundredths,
      expected: "0..10000",
    });
  }
  const bounded: readonly [string, number][] = [
    ["recentPracticeNeed", input.recentPracticeNeed],
    ["teacherPriority", input.teacherPriority],
    ["styleMatch", input.styleMatch],
  ];
  for (const [key, value] of bounded) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
      issues.push({
        path: `/${key}`,
        message: "practice target score inputs must be integers within 0..100",
        actual: value,
        expected: "0..100",
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const weights = config.weeklyPlanner.practiceTargetWeights;
  return success(
    Math.floor(((10000 - input.masteryHundredths) * weights.masteryNeed) / 100) +
      input.recentPracticeNeed * weights.recentPracticeNeed +
      input.teacherPriority * weights.teacherPriority +
      input.styleMatch * weights.styleMatch,
  );
}

/** 10 §6.3: only acquired techniques that still resolve to a catalog definition. */
export function buildPracticeTechniqueCandidates(
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  config: Sprint1Config,
  currentAbsoluteWeek: number,
): ValidationResult<readonly PracticeTargetCandidate[]> {
  const parts = readPersonParts(record);
  if (!parts.ok) {
    return failure(parts.issues);
  }
  const definitionsById = new Map<string, TechniqueDefinition>();
  for (const definition of catalog.definitions) {
    definitionsById.set(definition.techniqueId, definition);
  }

  const candidates: PracticeTargetCandidate[] = [];
  for (const state of parts.value.sprint1State.techniqueStates) {
    if (state.acquiredAbsoluteWeek === null) {
      continue;
    }
    if (!definitionsById.has(state.techniqueId)) {
      return failure([
        {
          path: `/person/sprint1State/techniqueStates/${state.techniqueId}`,
          message: "acquired technique is missing from the TechniqueCatalog (10 §12)",
          actual: state.techniqueId,
          expected: "TechniqueId present in catalog.definitions",
        },
      ]);
    }
    const need = computeRecentPracticeNeed(currentAbsoluteWeek, state.lastPracticedAbsoluteWeek);
    if (!need.ok) {
      return failure(
        need.issues.map((issue) => ({
          ...issue,
          path: `/person/sprint1State/techniqueStates/${state.techniqueId}${issue.path}`,
        })),
      );
    }
    const context = contextById(record.techniqueTargetContexts, state.techniqueId);
    const score = computePracticeTargetScoreHundredths(
      {
        masteryHundredths: state.masteryHundredths,
        recentPracticeNeed: need.value,
        teacherPriority: resolveTeacherPriority(context),
        styleMatch: resolveStyleMatch(context),
      },
      config,
    );
    if (!score.ok) {
      return failure(score.issues);
    }
    candidates.push({ techniqueId: state.techniqueId, scoreHundredths: score.value });
  }

  candidates.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));
  return success(candidates);
}

/** Returns `null` when there is no acquired technique (`no_practice_candidate`). */
export function selectPracticeTechniqueTarget(
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  config: Sprint1Config,
  currentAbsoluteWeek: number,
  rng: WeeklyTargetRng,
  prebuiltCandidates?: readonly PracticeTargetCandidate[],
): ValidationResult<PracticeTargetSelection | null> {
  const candidatesResult =
    prebuiltCandidates !== undefined
      ? success(prebuiltCandidates)
      : buildPracticeTechniqueCandidates(record, catalog, config, currentAbsoluteWeek);
  if (!candidatesResult.ok) {
    return failure(candidatesResult.issues);
  }
  const candidates = candidatesResult.value;
  if (candidates.length === 0) {
    return success(null);
  }
  const { winner, rngCalls } = resolveHighestScore(candidates, rng);
  return success({
    targetTechniqueId: winner.techniqueId,
    scoreHundredths: winner.scoreHundredths,
    candidates,
    rngCalls,
  });
}

/**
 * 09 §9.2: the accompanying normal-training mastery target is the acquired technique
 * with the lowest display mastery whose `primaryStats` include the trained ability.
 * Ties resolve by ascending TechniqueId and never consume RNG.
 */
export function selectNormalTrainingMasteryTarget(
  record: WeeklyTrainingPersonRecord,
  catalog: TechniqueCatalog,
  targetStat: AbilityKey,
): ValidationResult<PersonTechniqueState | null> {
  const parts = readPersonParts(record);
  if (!parts.ok) {
    return failure(parts.issues);
  }
  const definitionsById = new Map<string, TechniqueDefinition>();
  for (const definition of catalog.definitions) {
    definitionsById.set(definition.techniqueId, definition);
  }

  let selected: PersonTechniqueState | null = null;
  for (const state of parts.value.sprint1State.techniqueStates) {
    if (state.acquiredAbsoluteWeek === null) {
      continue;
    }
    const definition = definitionsById.get(state.techniqueId);
    if (definition === undefined) {
      return failure([
        {
          path: `/person/sprint1State/techniqueStates/${state.techniqueId}`,
          message: "acquired technique is missing from the TechniqueCatalog (10 §12)",
          actual: state.techniqueId,
          expected: "TechniqueId present in catalog.definitions",
        },
      ]);
    }
    if (!definition.primaryStats.includes(targetStat)) {
      continue;
    }
    if (
      selected === null ||
      state.masteryHundredths < selected.masteryHundredths ||
      (state.masteryHundredths === selected.masteryHundredths &&
        compareUnicodeCodePoints(state.techniqueId, selected.techniqueId) < 0)
    ) {
      selected = state;
    }
  }
  return success(selected);
}

/** Basis-points conversion of a 0..100 adapter input onto a config factor range (14 §5). */
export function normalizedInputToFactorBasisPoints(
  value: number,
  range: { min: BasisPoints; max: BasisPoints },
): number {
  return range.min + Math.floor((value * (range.max - range.min)) / 100);
}
