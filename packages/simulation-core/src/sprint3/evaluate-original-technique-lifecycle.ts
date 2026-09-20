/**
 * S03-008 original-technique research/generation/loss lifecycle (pure processor).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
} from "./constants.js";
import type {
  OriginalTechniqueFoundingHistoryRecord,
  OriginalTechniqueGenerationOutcome,
  OriginalTechniqueGenerationPolicy,
  OriginalTechniqueGenerationRecord,
  OriginalTechniqueLossEvaluationRecord,
  OriginalTechniqueLossOutcome,
  OriginalTechniqueResearchTier,
  OriginalTechniqueResearchThresholds,
  Sprint3Config,
  Sprint3OriginalTechniqueLifecycleConfig,
} from "./types.js";

/** Minimal RNG surface (`nextInt` inclusive on both ends). */
export type OriginalTechniqueGenerationRng = {
  nextInt(minInclusive: number, maxInclusive: number): number;
};

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

function clampInteger(value: number, minInclusive: number, maxInclusive: number): number {
  return Math.min(maxInclusive, Math.max(minInclusive, value));
}

export function isOriginalTechniqueLifecycleEnabled(config: Sprint3Config): boolean {
  return (
    config.configVersion === SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE &&
    config.mentorshipFeatures.originalTechniqueLifecycleEnabled === true &&
    config.originalTechniqueLifecycle !== undefined
  );
}

function resolveOriginalTechniqueLifecyclePolicy(
  config: Sprint3Config,
  issues: ValidationIssue[],
): Sprint3OriginalTechniqueLifecycleConfig | undefined {
  if (!isOriginalTechniqueLifecycleEnabled(config)) {
    issues.push({
      path: "/mentorshipFeatures/originalTechniqueLifecycleEnabled",
      message: "original technique lifecycle is not enabled for this configVersion",
      actual: config.mentorshipFeatures.originalTechniqueLifecycleEnabled,
      expected: `true on ${SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE}`,
    });
    return undefined;
  }
  const policy = config.originalTechniqueLifecycle;
  if (policy === undefined) {
    issues.push({
      path: "/originalTechniqueLifecycle",
      message: "originalTechniqueLifecycle policy is required when lifecycle is enabled",
      actual: undefined,
      expected: ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
    });
    return undefined;
  }
  if (policy.evaluationPolicyVersion !== ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY) {
    issues.push({
      path: "/originalTechniqueLifecycle/evaluationPolicyVersion",
      message: "unsupported originalTechniqueLifecycle evaluation policy",
      actual: policy.evaluationPolicyVersion,
      expected: ORIGINAL_TECHNIQUE_LIFECYCLE_EVALUATION_POLICY,
    });
    return undefined;
  }
  return policy;
}

export function classifyOriginalTechniqueResearchTier(
  researchValue: number,
  thresholds: OriginalTechniqueResearchThresholds,
): OriginalTechniqueResearchTier | undefined {
  if (researchValue >= thresholds.fullOriginalTechnique) {
    return "full_original_technique";
  }
  if (researchValue >= thresholds.compositeTechnique) {
    return "composite_technique";
  }
  if (researchValue >= thresholds.derivedTechnique) {
    return "derived_technique";
  }
  return undefined;
}

export function computeOriginalTechniqueGenerationSuccessPercentTenThousandths(
  generation: OriginalTechniqueGenerationPolicy,
  successPercentAdjustmentPoints: number,
): number {
  const clampedAdjustment = clampInteger(
    successPercentAdjustmentPoints,
    -generation.maximumNegativeSuccessAdjustmentPoints,
    generation.maximumPositiveSuccessAdjustmentPoints,
  );
  const rawPercent = generation.baseSuccessPercent + clampedAdjustment;
  const boundedPercent = clampInteger(
    rawPercent,
    generation.minimumSuccessPercent,
    generation.maximumSuccessPercent,
  );
  return boundedPercent * 100;
}

export function rollOriginalTechniqueGenerationSuccess(
  successPercentTenThousandths: number,
  rng: OriginalTechniqueGenerationRng,
): boolean {
  const roll = rng.nextInt(0, 9999);
  return roll < successPercentTenThousandths;
}

export function computeFailedGenerationRetainedResearchValue(
  researchValue: number,
  failureResearchRetentionPercent: number,
): number {
  return Math.floor((researchValue * failureResearchRetentionPercent) / 100);
}

export function buildOriginalTechniqueFoundingHistoryRecord(input: {
  founderPersonId: string;
  newTechniqueId: string;
  sourceTechniqueIds: readonly string[];
  researchValueAtFounding: number;
  developmentReason: string;
  researchTier: OriginalTechniqueResearchTier;
  worldWeekIndex: number;
  firstUseMatchId?: string;
}): OriginalTechniqueFoundingHistoryRecord {
  return {
    eventKind: "original_technique_founded",
    founderPersonId: input.founderPersonId,
    newTechniqueId: input.newTechniqueId,
    sourceTechniqueIds: [...input.sourceTechniqueIds],
    researchValueAtFounding: input.researchValueAtFounding,
    developmentReason: input.developmentReason,
    researchTier: input.researchTier,
    worldWeekIndex: input.worldWeekIndex,
    ...(input.firstUseMatchId === undefined ? {} : { firstUseMatchId: input.firstUseMatchId }),
  };
}

export function evaluateOriginalTechniqueLoss(
  record: OriginalTechniqueLossEvaluationRecord,
): OriginalTechniqueLossOutcome {
  const reasons: string[] = [];
  if (record.livingPractitionerCount > 0) {
    pushReason(reasons, "living_practitioners_remain");
    return { isLost: false, reasons };
  }
  if (
    record.registeredSuccessorPersonIds.length > 0 &&
    record.livingSuccessorPractitionerCount > 0
  ) {
    pushReason(reasons, "living_successor_practitioners_remain");
    return { isLost: false, reasons };
  }
  pushReason(reasons, "technique_extinct_no_living_practitioners_or_successors");
  return { isLost: true, reasons };
}

export function evaluateOriginalTechniqueGenerationAttempt(
  config: Sprint3Config,
  record: OriginalTechniqueGenerationRecord,
  rng: OriginalTechniqueGenerationRng,
): ValidationResult<OriginalTechniqueGenerationOutcome> {
  const issues: ValidationIssue[] = [];
  const policy = resolveOriginalTechniqueLifecyclePolicy(config, issues);
  if (policy === undefined || issues.length > 0) {
    return failure(issues);
  }

  const reasons: string[] = [];
  if (record.cooldownWeeksRemaining > 0) {
    pushReason(reasons, "generation_cooldown_active");
    return success({
      kind: "cooldown_active",
      cooldownWeeksRemaining: record.cooldownWeeksRemaining,
      reasons,
    });
  }

  const researchTier = classifyOriginalTechniqueResearchTier(
    record.researchValue,
    policy.researchThresholds,
  );
  if (researchTier === undefined) {
    pushReason(reasons, "research_below_minimum_threshold");
    return success({
      kind: "below_research_threshold",
      reasons,
    });
  }

  const successPercentTenThousandths = computeOriginalTechniqueGenerationSuccessPercentTenThousandths(
    policy.generation,
    record.modifiers.successPercentAdjustmentPoints,
  );
  const generationSucceeded = rollOriginalTechniqueGenerationSuccess(
    successPercentTenThousandths,
    rng,
  );

  if (!generationSucceeded) {
    pushReason(reasons, "generation_roll_failed");
    const retainedResearchValue = computeFailedGenerationRetainedResearchValue(
      record.researchValue,
      policy.generation.failureResearchRetentionPercent,
    );
    return success({
      kind: "generation_failed",
      researchTier,
      successPercentTenThousandths,
      retainedResearchValue,
      cooldownWeeksRemaining: policy.generation.regenerationCooldownWeeks,
      reasons,
    });
  }

  pushReason(reasons, "generation_roll_succeeded");
  const foundingHistory = buildOriginalTechniqueFoundingHistoryRecord({
    founderPersonId: record.founderPersonId,
    newTechniqueId: record.proposedNewTechniqueId,
    sourceTechniqueIds: record.sourceTechniqueIds,
    researchValueAtFounding: record.researchValue,
    developmentReason: record.developmentReason,
    researchTier,
    worldWeekIndex: record.worldWeekIndex,
    ...(record.firstUseMatchId === undefined
      ? {}
      : { firstUseMatchId: record.firstUseMatchId }),
  });

  return success({
    kind: "generation_succeeded",
    researchTier,
    successPercentTenThousandths,
    initialMasteryHundredths: policy.generation.initialMasteryHundredthsMinimum,
    foundingHistory,
    reasons,
  });
}

export function disabledOriginalTechniqueGenerationOutcome(): OriginalTechniqueGenerationOutcome {
  return {
    kind: "feature_disabled",
    reasons: ["original_technique_lifecycle_disabled"],
  };
}
