/**
 * S03-007 explicit weekly `teach` action: allocation, refusal, and acceptance (pure processor).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { LearningTier } from "../sprint1/technique-enums.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { teacherCanTeach } from "../sprint1/technique-teacher.js";
import {
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
} from "./constants.js";
import type {
  ExplicitWeeklyTeachActionOutcome,
  ExplicitWeeklyTeachActionRecord,
  MentorshipRelationKind,
  Sprint3Config,
  Sprint3WeeklyTeachActionConfig,
  WeeklyTeachDiscipleOutcome,
  WeeklyTeachDiscipleRequest,
  WeeklyTeachEvaluationInputScores,
  WeeklyTeachEvaluationWeights,
  WeeklyTeachTierThresholds,
} from "./types.js";

function clampInteger(value: number, minInclusive: number, maxInclusive: number): number {
  return Math.min(maxInclusive, Math.max(minInclusive, value));
}

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

export function isExplicitWeeklyTeachActionEnabled(config: Sprint3Config): boolean {
  return (
    config.configVersion === SPRINT3_CONFIG_VERSION_WEEKLY_TEACH &&
    config.mentorshipFeatures.explicitWeeklyTeachActionEnabled === true &&
    config.weeklyTeachAction !== undefined
  );
}

function resolveWeeklyTeachPolicy(
  config: Sprint3Config,
  issues: ValidationIssue[],
): Sprint3WeeklyTeachActionConfig | undefined {
  if (!isExplicitWeeklyTeachActionEnabled(config)) {
    issues.push({
      path: "/mentorshipFeatures/explicitWeeklyTeachActionEnabled",
      message: "explicit weekly teach action is not enabled for this configVersion",
      actual: config.mentorshipFeatures.explicitWeeklyTeachActionEnabled,
      expected: `true on ${SPRINT3_CONFIG_VERSION_WEEKLY_TEACH}`,
    });
    return undefined;
  }
  const policy = config.weeklyTeachAction;
  if (policy === undefined) {
    issues.push({
      path: "/weeklyTeachAction",
      message: "weeklyTeachAction policy is required when explicit weekly teach is enabled",
      actual: undefined,
      expected: WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
    });
    return undefined;
  }
  if (policy.evaluationPolicyVersion !== WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT) {
    issues.push({
      path: "/weeklyTeachAction/evaluationPolicyVersion",
      message: "unsupported weeklyTeachAction evaluation policy",
      actual: policy.evaluationPolicyVersion,
      expected: WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
    });
    return undefined;
  }
  return policy;
}

export function computeWeeklyTeachingAllocationSlots(
  policy: Sprint3WeeklyTeachActionConfig,
  teachingAbilityScore: number,
): number {
  const formula = policy.allocationFormula;
  const bonus =
    Math.floor(teachingAbilityScore / 10) * formula.teachingAbilityBonusPerTenPoints;
  const raw = formula.baseWeeklyTeachSlots + bonus;
  return clampInteger(raw, formula.minimumWeeklyTeachSlots, formula.maximumWeeklyTeachSlots);
}

function weightedContribution(score: number, maxPoints: number): number {
  return Math.floor((score * maxPoints) / 100);
}

export function computeWeeklyTeachCompositeScore(
  weights: WeeklyTeachEvaluationWeights,
  inputs: WeeklyTeachEvaluationInputScores,
): number {
  const positive =
    weightedContribution(inputs.styleMatchScore, weights.styleMatchMaxPoints) +
    weightedContribution(inputs.requirementsMetScore, weights.requirementsMetMaxPoints) +
    weightedContribution(inputs.trustAndCompatibilityScore, weights.trustAndCompatibilityMaxPoints) +
    weightedContribution(inputs.tacticalNeedScore, weights.tacticalNeedMaxPoints) +
    weightedContribution(inputs.successionPriorityScore, weights.successionPriorityMaxPoints);
  const penalty = weightedContribution(
    inputs.secrecyAndLoyaltyPenalty,
    weights.secrecyAndLoyaltyPenaltyMaxPoints,
  );
  return positive - penalty;
}

function tierThresholdsFor(
  policy: Sprint3WeeklyTeachActionConfig,
  tier: LearningTier,
): WeeklyTeachTierThresholds {
  return policy.tierThresholds[tier];
}

function isParentTemporaryGuidanceTierBlocked(
  kind: MentorshipRelationKind,
  tier: LearningTier,
): boolean {
  return kind === "parent_temporary_guidance" && tier !== "basic";
}

export function evaluateWeeklyTeachRefusal(
  policy: Sprint3WeeklyTeachActionConfig,
  definition: TechniqueDefinition,
  request: WeeklyTeachDiscipleRequest,
): ValidationResult<WeeklyTeachDiscipleOutcome> {
  const reasons: string[] = [];
  const canTeach = teacherCanTeach(definition, request.teacherCanTeachContext);
  if (!canTeach.ok) {
    return canTeach;
  }
  if (!canTeach.value) {
    pushReason(reasons, "static_teacher_can_teach_false");
    return success({
      disciplePersonId: request.disciplePersonId,
      techniqueId: request.techniqueId,
      decision: "refused",
      reasons,
    });
  }
  if (request.discipleHasIncompletePriorFocus === true) {
    pushReason(reasons, "incomplete_prior_focus_priority");
    return success({
      disciplePersonId: request.disciplePersonId,
      techniqueId: request.techniqueId,
      decision: "refused",
      reasons,
    });
  }
  if (isParentTemporaryGuidanceTierBlocked(request.mentorshipRelationKind, request.learningTier)) {
    pushReason(reasons, "parent_temporary_guidance_tier_cap");
    return success({
      disciplePersonId: request.disciplePersonId,
      techniqueId: request.techniqueId,
      decision: "refused",
      reasons,
    });
  }
  const compositeScore = computeWeeklyTeachCompositeScore(
    policy.evaluationWeights,
    request.evaluationInputs,
  );
  const tierThresholds = tierThresholdsFor(policy, request.learningTier);
  if (compositeScore < tierThresholds.minimumCompositeScore) {
    pushReason(reasons, "composite_below_tier_threshold");
    return success({
      disciplePersonId: request.disciplePersonId,
      techniqueId: request.techniqueId,
      decision: "refused",
      compositeScore,
      reasons,
    });
  }
  const trustMinimum = tierThresholds.minimumTrustScore;
  if (
    trustMinimum !== undefined &&
    request.evaluationInputs.trustAndCompatibilityScore < trustMinimum
  ) {
    pushReason(reasons, "trust_below_tier_threshold");
    return success({
      disciplePersonId: request.disciplePersonId,
      techniqueId: request.techniqueId,
      decision: "refused",
      compositeScore,
      reasons,
    });
  }
  const masteryMinimum = tierThresholds.minimumMasterMasteryHundredths;
  const masterState = request.teacherCanTeachContext.masterTechniqueState;
  if (masteryMinimum !== undefined) {
    const mastery = masterState?.masteryHundredths ?? 0;
    if (mastery < masteryMinimum) {
      pushReason(reasons, "master_mastery_below_tier_threshold");
      return success({
        disciplePersonId: request.disciplePersonId,
        techniqueId: request.techniqueId,
        decision: "refused",
        compositeScore,
        reasons,
      });
    }
  }
  pushReason(reasons, "teach_accepted");
  return success({
    disciplePersonId: request.disciplePersonId,
    techniqueId: request.techniqueId,
    decision: "accepted",
    compositeScore,
    reasons,
  });
}

export function evaluateExplicitWeeklyTeachAction(
  config: Sprint3Config,
  record: ExplicitWeeklyTeachActionRecord,
  techniqueDefinitionsById: ReadonlyMap<string, TechniqueDefinition>,
): ValidationResult<ExplicitWeeklyTeachActionOutcome> {
  const issues: ValidationIssue[] = [];
  const policy = resolveWeeklyTeachPolicy(config, issues);
  if (policy === undefined || issues.length > 0) {
    return failure(issues);
  }
  if (record.selectedWeeklyAction !== "teach") {
    return success({
      kind: "invalid_master_action",
      weeklyTeachSlotLimit: 0,
      discipleOutcomes: [],
      reasons: ["master_did_not_select_teach_action"],
    });
  }
  if (!record.masterWeeklyPipelineEligible) {
    return success({
      kind: "master_not_pipeline_eligible",
      weeklyTeachSlotLimit: 0,
      discipleOutcomes: [],
      reasons: ["master_not_weekly_pipeline_eligible"],
    });
  }
  const slotLimit = computeWeeklyTeachingAllocationSlots(policy, record.teachingAbilityScore);
  const discipleOutcomes: WeeklyTeachDiscipleOutcome[] = [];
  let acceptedCount = 0;
  for (const request of record.discipleRequests) {
    if (acceptedCount >= slotLimit) {
      discipleOutcomes.push({
        disciplePersonId: request.disciplePersonId,
        techniqueId: request.techniqueId,
        decision: "skipped_allocation",
        reasons: ["allocation_slots_exhausted"],
      });
      continue;
    }
    const definition = techniqueDefinitionsById.get(request.techniqueId);
    if (definition === undefined) {
      return failure([
        {
          path: "/discipleRequests",
          message: "techniqueId is missing from techniqueDefinitionsById",
          actual: request.techniqueId,
          expected: "known TechniqueDefinition",
        },
      ]);
    }
    if (definition.techniqueId !== request.techniqueId) {
      return failure([
        {
          path: "/discipleRequests",
          message: "techniqueDefinitionsById key must match TechniqueDefinition.techniqueId",
          actual: request.techniqueId,
          expected: definition.techniqueId,
        },
      ]);
    }
    const refusal = evaluateWeeklyTeachRefusal(policy, definition, request);
    if (!refusal.ok) {
      return refusal;
    }
    discipleOutcomes.push(refusal.value);
    if (refusal.value.decision === "accepted") {
      acceptedCount += 1;
    }
  }
  return success({
    kind: "teach_week_completed",
    weeklyTeachSlotLimit: slotLimit,
    discipleOutcomes,
    reasons: ["explicit_weekly_teach_processed"],
  });
}
