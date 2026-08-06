/**
 * Standard weekly Planner action scoring and action selection
 * (10 mini-spec §3, §5, §8; 14 mini-spec §4 / S01-004).
 *
 * Every score is an integer `scoreHundredths`. No display decimals, no
 * `Math.round`, no epsilon: signed division uses `mathematicalFloor`
 * (toward -Infinity), never JavaScript truncation.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deriveInjuryStage } from "./injury-stage.js";
import { isFormalTrainingEligible } from "./weekly-update-eligibility.js";
import { deriveMaxMental } from "./max-mental.js";
import { mathematicalFloor } from "./multiply-basis-points.js";
import type { Sprint1Config, WeeklyActionScores } from "./types.js";
import {
  WEEKLY_ACTION_BASE_SCORE_KEY,
  WEEKLY_ACTION_CONFIG_KEY,
  WEEKLY_ACTIONS,
  WEEKLY_FORCED_REST_REASONS,
  WEEKLY_REST_FALLBACK_REASONS,
  WEEKLY_SCORED_ACTIONS,
  WEEKLY_TRAINING_ACTIONS,
} from "./weekly-actions.js";
import type {
  WeeklyAction,
  WeeklyForcedRestReason,
  WeeklyRestFallbackReason,
  WeeklyScoredAction,
  WeeklyTrainingAction,
} from "./weekly-actions.js";
import type { WeeklyTrainingPersonRecord } from "./weekly-training-types.js";

export { mathematicalFloor } from "./multiply-basis-points.js";

export type WeeklyActionScoreEntry = {
  action: WeeklyScoredAction;
  scoreHundredths: number;
};

/** Which training-style actions currently have at least one valid target. */
export type WeeklyActionCandidateAvailability = {
  readonly [K in WeeklyTrainingAction]: boolean;
};

export type WeeklyActionSelection = {
  action: WeeklyAction;
  forced: boolean;
  forcedReason: WeeklyForcedRestReason | null;
  fallbackReasons: readonly WeeklyRestFallbackReason[];
  candidateActions: readonly WeeklyScoredAction[];
  candidateScores: readonly WeeklyActionScoreEntry[];
  rngCalls: number;
};

/** Person-side scalars the Planner reads, all taken from the weekStart snapshot. */
export type WeeklyPlannerPersonState = {
  careerStatus: string;
  currentAge: number | null;
  fatigue: number;
  injury: number;
  currentMental: number;
  maximumMental: number;
  isInactive: boolean;
};

function readRecordObject(
  record: WeeklyTrainingPersonRecord,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  if (record === null || typeof record !== "object") {
    issues.push({
      path: "",
      message: "personRecord must be a validated WeeklyTrainingPersonRecord",
      actual: record,
      expected: "WeeklyTrainingPersonRecord",
    });
    return undefined;
  }
  return record as unknown as Record<string, unknown>;
}

/**
 * Read the Planner scalars from an already-validated record. `maxMental <= 0` is an
 * invalid person state (10 §5) and fails instead of being patched with a default.
 */
export function readWeeklyPlannerPersonState(
  record: WeeklyTrainingPersonRecord,
): ValidationResult<WeeklyPlannerPersonState> {
  const issues: ValidationIssue[] = [];
  const object = readRecordObject(record, issues);
  if (object === undefined) {
    return failure(issues);
  }

  const person = object["person"] as Record<string, unknown> | undefined;
  const condition = object["temporaryCondition"] as { fatigue: number; injury: number } | undefined;
  if (person === null || typeof person !== "object" || condition === undefined) {
    return failure([
      {
        path: "",
        message: "personRecord must carry a person and a temporaryCondition",
        expected: "WeeklyTrainingPersonRecord",
      },
    ]);
  }

  const careerStatus = person["careerStatus"];
  if (typeof careerStatus !== "string") {
    return failure([
      {
        path: "/person/careerStatus",
        message: "careerStatus must be a string",
        actual: careerStatus,
        expected: "CareerStatus",
      },
    ]);
  }

  const rawAge = person["currentAge"];
  const currentAge = typeof rawAge === "number" && Number.isSafeInteger(rawAge) ? rawAge : null;

  const abilities = person["abilities"] as
    Record<string, { surfaceValue: number } | undefined> | undefined;
  const spiritSurfaceValue = abilities?.["spirit"]?.surfaceValue;
  const maxMentalResult = deriveMaxMental(spiritSurfaceValue as number);
  if (!maxMentalResult.ok) {
    return failure(maxMentalResult.issues);
  }
  if (maxMentalResult.value <= 0) {
    return failure([
      {
        path: "/person/abilities/spirit/surfaceValue",
        message: "maximum mental must be positive; invalid person state is never patched (10 §5)",
        actual: maxMentalResult.value,
        expected: "> 0",
      },
    ]);
  }

  const sprint1State = person["sprint1State"] as { currentMental?: unknown } | undefined;
  const currentMental = sprint1State?.currentMental;
  if (typeof currentMental !== "number" || !Number.isSafeInteger(currentMental)) {
    return failure([
      {
        path: "/person/sprint1State/currentMental",
        message: "currentMental must be a safe integer from a valid Sprint1PersonState",
        actual: currentMental,
        expected: "integer",
      },
    ]);
  }

  const lifeStatus = person["lifeStatus"];
  const participationStatus = person["participationStatus"];
  const isInactive =
    lifeStatus === "deceased" ||
    participationStatus === "waiting" ||
    participationStatus === "stopped";

  return success({
    careerStatus,
    currentAge,
    fatigue: condition.fatigue,
    injury: condition.injury,
    currentMental,
    maximumMental: maxMentalResult.value,
    isInactive,
  });
}

function selectBaseScores(
  careerStatus: string,
  config: Sprint1Config,
): ValidationResult<WeeklyActionScores> {
  const table = config.weeklyPlanner.baseScoresByCareerStatus;
  switch (careerStatus) {
    case "trainee":
      return success(table.trainee);
    case "active_competitor":
      return success(table.activeCompetitor);
    case "retired":
      return success(table.retired);
    default:
      return failure([
        {
          path: "/person/careerStatus",
          message:
            "weeklyPlanner.baseScoresByCareerStatus has no row for this careerStatus (10 §5.1)",
          actual: careerStatus,
          expected: "trainee | active_competitor | retired",
        },
      ]);
  }
}

function computeContextScoreHundredths(
  record: WeeklyTrainingPersonRecord,
  action: WeeklyScoredAction,
  config: Sprint1Config,
): number {
  const weights = config.weeklyPlanner.contextWeights;
  const context = record.plannerContext.byAction[action];
  const numerator =
    context.personality * weights.personality +
    context.developmentNeed * weights.developmentNeed +
    context.recentResult * weights.recentResult +
    context.teacherAdvice * weights.teacherAdvice +
    context.schedule * weights.schedule;
  return mathematicalFloor(numerator, 100);
}

/** 10 §5 burden penalties, already multiplied by the action-specific ratio. */
function computeBurdenPenaltyHundredths(
  action: WeeklyScoredAction,
  state: WeeklyPlannerPersonState,
  config: Sprint1Config,
): number {
  const planner = config.weeklyPlanner;
  const multipliers = planner.burdenPenaltyMultipliersByAction[WEEKLY_ACTION_CONFIG_KEY[action]];

  const baseFatiguePenalty =
    Math.floor(state.fatigue / 5) * planner.baseFatiguePenaltyPerFivePoints;
  const baseInjuryPenalty = Math.floor(state.injury / 5) * planner.baseInjuryPenaltyPerFivePoints;
  const baseMentalPenalty = Math.floor(
    ((state.maximumMental - state.currentMental) * planner.baseMentalExhaustionPenaltyMaximum) /
      state.maximumMental,
  );

  return (
    Math.floor((baseFatiguePenalty * multipliers.fatigue) / 100) +
    Math.floor((baseInjuryPenalty * multipliers.injury) / 100) +
    Math.floor((baseMentalPenalty * multipliers.mental) / 100)
  );
}

/** 10 §5 rest recovery-need bonuses. */
function computeRestBonusHundredths(
  state: WeeklyPlannerPersonState,
  config: Sprint1Config,
): number {
  const bonuses = config.weeklyPlanner.restNeedBonuses;
  const fatigueBonus = Math.min(
    bonuses.fatigueMaximum * 100,
    Math.floor((Math.floor(state.fatigue / 5) * bonuses.fatiguePerFivePoints) / 100),
  );
  const injuryBonus = Math.min(
    bonuses.injuryMaximum * 100,
    Math.floor((Math.floor(state.injury / 5) * bonuses.injuryPerFivePoints) / 100),
  );
  const mentalBonus =
    Math.floor(
      ((state.maximumMental - state.currentMental) * bonuses.mentalExhaustionMaximum) /
        state.maximumMental,
    ) * 100;
  return fatigueBonus + injuryBonus + mentalBonus;
}

/**
 * 10 §5: `TrainingActionScoreHundredths` for train / learn / practice, and
 * `RestActionScoreHundredths` for rest (no burden penalties, recovery bonuses added).
 */
export function computeActionScoreHundredths(
  action: WeeklyScoredAction,
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
): ValidationResult<number> {
  const stateResult = readWeeklyPlannerPersonState(record);
  if (!stateResult.ok) {
    return failure(stateResult.issues);
  }
  const state = stateResult.value;

  const baseScoresResult = selectBaseScores(state.careerStatus, config);
  if (!baseScoresResult.ok) {
    return failure(baseScoresResult.issues);
  }

  const baseScoreHundredths = baseScoresResult.value[WEEKLY_ACTION_BASE_SCORE_KEY[action]] * 100;
  const contextScoreHundredths = computeContextScoreHundredths(record, action, config);

  if (action === "rest") {
    return success(
      baseScoreHundredths + contextScoreHundredths + computeRestBonusHundredths(state, config),
    );
  }
  return success(
    baseScoreHundredths +
      contextScoreHundredths -
      computeBurdenPenaltyHundredths(action, state, config),
  );
}

/**
 * Score the given candidate actions, returned in the fixed `WEEKLY_ACTIONS` order.
 * Duplicates and non-scored actions (`inactive`) are rejected.
 */
export function scoreWeeklyActions(
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
  candidateActions: readonly WeeklyScoredAction[],
): ValidationResult<readonly WeeklyActionScoreEntry[]> {
  const issues: ValidationIssue[] = [];
  if (!Array.isArray(candidateActions) || candidateActions.length === 0) {
    return failure([
      {
        path: "/candidateActions",
        message: "candidateActions must be a non-empty array of scored weekly actions",
        actual: candidateActions,
        expected: WEEKLY_SCORED_ACTIONS.join(" | "),
      },
    ]);
  }

  const seen = new Set<string>();
  for (const action of candidateActions) {
    if (!(WEEKLY_SCORED_ACTIONS as readonly string[]).includes(action)) {
      issues.push({
        path: "/candidateActions",
        message: "candidateActions may only contain scored weekly actions",
        actual: action,
        expected: WEEKLY_SCORED_ACTIONS.join(" | "),
      });
      continue;
    }
    if (seen.has(action)) {
      issues.push({
        path: "/candidateActions",
        message: "candidateActions must not contain duplicates",
        actual: action,
        expected: "unique actions",
      });
      continue;
    }
    seen.add(action);
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const entries: WeeklyActionScoreEntry[] = [];
  for (const action of WEEKLY_SCORED_ACTIONS) {
    if (!seen.has(action)) {
      continue;
    }
    const score = computeActionScoreHundredths(action, record, config);
    if (!score.ok) {
      return failure(score.issues);
    }
    entries.push({ action, scoreHundredths: score.value });
  }
  return success(entries);
}

function deriveForcedRestReason(
  state: WeeklyPlannerPersonState,
  config: Sprint1Config,
): ValidationResult<WeeklyForcedRestReason | null> {
  const stage = deriveInjuryStage(state.injury, config);
  if (!stage.ok) {
    return failure(stage.issues);
  }
  if (stage.value === "severe") {
    return success(WEEKLY_FORCED_REST_REASONS[0]);
  }
  if (state.fatigue >= config.temporaryCondition.forcedRestFatigueThreshold) {
    return success(WEEKLY_FORCED_REST_REASONS[1]);
  }
  return success(null);
}

/**
 * 10 §3 / 08 formal-training eligibility: rest-only when age is outside 8..41,
 * or career is `child` / `retired`. Age 42+ reuses `isFormalTrainingEligible`.
 * Missing training targets are filtered separately via `availability`.
 * Callers must already have excluded inactive persons (deceased / waiting / stopped).
 */
function isRestOnlyWithoutTraining(state: WeeklyPlannerPersonState): boolean {
  if (state.careerStatus === "child" || state.careerStatus === "retired") {
    return true;
  }
  if (state.currentAge === null) {
    return true;
  }
  return !isFormalTrainingEligible({
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: state.careerStatus as "child" | "trainee" | "active_competitor" | "retired",
    currentAge: state.currentAge,
  });
}

function buildCandidateActions(
  state: WeeklyPlannerPersonState,
  availability: WeeklyActionCandidateAvailability,
): readonly WeeklyScoredAction[] {
  if (isRestOnlyWithoutTraining(state)) {
    return ["rest"];
  }
  const candidates: WeeklyScoredAction[] = [];
  for (const action of WEEKLY_TRAINING_ACTIONS) {
    if (availability[action]) {
      candidates.push(action);
    }
  }
  candidates.push("rest");
  return candidates;
}

function buildFallbackReasons(
  state: WeeklyPlannerPersonState,
  availability: WeeklyActionCandidateAvailability,
  candidateActions: readonly WeeklyScoredAction[],
): readonly WeeklyRestFallbackReason[] {
  // Age / career rest-only is not a missing-target fallback (10 §3.2).
  if (isRestOnlyWithoutTraining(state)) {
    return [];
  }
  const trainingEligible =
    state.careerStatus === "trainee" || state.careerStatus === "active_competitor";
  if (!trainingEligible) {
    return [];
  }
  if (candidateActions.length !== 1 || candidateActions[0] !== "rest") {
    return [];
  }
  const reasons: WeeklyRestFallbackReason[] = [];
  if (!availability.train_stat) {
    reasons.push(WEEKLY_REST_FALLBACK_REASONS[0]);
  }
  if (!availability.learn_technique) {
    reasons.push(WEEKLY_REST_FALLBACK_REASONS[1]);
  }
  if (!availability.practice_technique) {
    reasons.push(WEEKLY_REST_FALLBACK_REASONS[2]);
  }
  return reasons;
}

/**
 * 10 §3, §5, §8: decide the weekly action.
 *
 * RNG is consumed exactly once, and only when two or more candidates tie for the
 * highest score. `inactive`, forced rest, and single-candidate cases consume none.
 */
export function selectWeeklyAction(
  record: WeeklyTrainingPersonRecord,
  config: Sprint1Config,
  availability: WeeklyActionCandidateAvailability,
  rng: { nextInt(minInclusive: number, maxExclusive: number): number },
): ValidationResult<WeeklyActionSelection> {
  const stateResult = readWeeklyPlannerPersonState(record);
  if (!stateResult.ok) {
    return failure(stateResult.issues);
  }
  const state = stateResult.value;

  if (state.isInactive) {
    return success({
      action: "inactive",
      forced: false,
      forcedReason: null,
      fallbackReasons: [],
      candidateActions: [],
      candidateScores: [],
      rngCalls: 0,
    });
  }

  const forcedReasonResult = deriveForcedRestReason(state, config);
  if (!forcedReasonResult.ok) {
    return failure(forcedReasonResult.issues);
  }
  if (forcedReasonResult.value !== null) {
    return success({
      action: "rest",
      forced: true,
      forcedReason: forcedReasonResult.value,
      fallbackReasons: [],
      candidateActions: ["rest"],
      candidateScores: [],
      rngCalls: 0,
    });
  }

  const candidateActions = buildCandidateActions(state, availability);
  const fallbackReasons = buildFallbackReasons(state, availability, candidateActions);

  if (state.careerStatus === "child") {
    // 14 §4 defines no base-score row for `child`; the single rest candidate is
    // selected without scoring rather than inventing a row.
    return success({
      action: "rest",
      forced: false,
      forcedReason: null,
      fallbackReasons,
      candidateActions,
      candidateScores: [],
      rngCalls: 0,
    });
  }

  const scoresResult = scoreWeeklyActions(record, config, candidateActions);
  if (!scoresResult.ok) {
    return failure(scoresResult.issues);
  }
  const candidateScores = scoresResult.value;

  let bestScore = candidateScores[0]!.scoreHundredths;
  for (const entry of candidateScores) {
    if (entry.scoreHundredths > bestScore) {
      bestScore = entry.scoreHundredths;
    }
  }
  const tied = candidateScores
    .filter((entry) => entry.scoreHundredths === bestScore)
    .map((entry) => entry.action)
    .sort((a, b) => WEEKLY_ACTIONS.indexOf(a) - WEEKLY_ACTIONS.indexOf(b));

  let action: WeeklyScoredAction;
  let rngCalls = 0;
  if (tied.length === 1) {
    action = tied[0]!;
  } else {
    action = tied[rng.nextInt(0, tied.length)]!;
    rngCalls = 1;
  }

  return success({
    action,
    forced: false,
    forcedReason: null,
    fallbackReasons: action === "rest" ? fallbackReasons : [],
    candidateActions,
    candidateScores,
    rngCalls,
  });
}
