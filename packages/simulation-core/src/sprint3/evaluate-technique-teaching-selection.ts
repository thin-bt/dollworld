/**
 * S03-008 deterministic teachable-technique candidate gating, scoring, and ranking (pure processor).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { evaluateTechniqueAcquisitionConditions } from "../sprint1/technique-acquisition.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { teacherCanTeach } from "../sprint1/technique-teacher.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
  WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
} from "./constants.js";
import {
  computeWeeklyTeachCompositeScore,
  evaluateWeeklyTeachRefusal,
} from "./evaluate-explicit-weekly-teach.js";
import type {
  Sprint3Config,
  Sprint3TeachingSelectionConfig,
  Sprint3WeeklyTeachActionConfig,
  TeachingSelectionReEvaluationContext,
  TeachingSelectionReEvaluationDueResult,
  TechniqueTeachingSelectionCandidate,
  TechniqueTeachingSelectionExcludedCandidate,
  TechniqueTeachingSelectionOutcome,
  TechniqueTeachingSelectionRankedCandidate,
  TechniqueTeachingSelectionRecord,
  WeeklyTeachDiscipleRequest,
} from "./types.js";

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

const TECHNIQUE_TEACHING_SELECTION_CONFIG_VERSIONS = new Set<string>([
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
]);

export function isTechniqueTeachingSelectionEnabled(config: Sprint3Config): boolean {
  return (
    TECHNIQUE_TEACHING_SELECTION_CONFIG_VERSIONS.has(config.configVersion) &&
    config.mentorshipFeatures.techniqueTeachingSelectionEnabled === true &&
    config.teachingSelection !== undefined
  );
}

function resolveTeachingSelectionPolicy(
  config: Sprint3Config,
  issues: ValidationIssue[],
): Sprint3TeachingSelectionConfig | undefined {
  if (!isTechniqueTeachingSelectionEnabled(config)) {
    issues.push({
      path: "/mentorshipFeatures/techniqueTeachingSelectionEnabled",
      message: "technique teaching selection is not enabled for this configVersion",
      actual: config.mentorshipFeatures.techniqueTeachingSelectionEnabled,
      expected: `true on ${SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION} or ${SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE}`,
    });
    return undefined;
  }
  const policy = config.teachingSelection;
  if (policy === undefined) {
    issues.push({
      path: "/teachingSelection",
      message: "teachingSelection policy is required when technique teaching selection is enabled",
      actual: undefined,
      expected: TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
    });
    return undefined;
  }
  if (policy.evaluationPolicyVersion !== TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY) {
    issues.push({
      path: "/teachingSelection/evaluationPolicyVersion",
      message: "unsupported teachingSelection evaluation policy",
      actual: policy.evaluationPolicyVersion,
      expected: TECHNIQUE_TEACHING_SELECTION_EVALUATION_POLICY,
    });
    return undefined;
  }
  return policy;
}

function weeklyTeachPolicySliceFromSelection(
  policy: Sprint3TeachingSelectionConfig,
): Sprint3WeeklyTeachActionConfig {
  return {
    evaluationPolicyVersion: WEEKLY_TEACH_ACTION_EVALUATION_POLICY_EXPLICIT,
    evaluationWeights: policy.evaluationWeights,
    tierThresholds: policy.tierThresholds,
    allocationFormula: {
      baseWeeklyTeachSlots: 1,
      teachingAbilityBonusPerTenPoints: 0,
      minimumWeeklyTeachSlots: 1,
      maximumWeeklyTeachSlots: 1,
    },
  };
}

function discipleAlreadyAcquired(
  candidate: TechniqueTeachingSelectionCandidate,
  record: TechniqueTeachingSelectionRecord,
): boolean {
  for (const state of record.discipleLearnerContext.techniqueStates) {
    if (
      state.techniqueId === candidate.techniqueId &&
      state.acquiredAbsoluteWeek !== null
    ) {
      return true;
    }
  }
  return false;
}

function gateCandidate(
  policy: Sprint3TeachingSelectionConfig,
  record: TechniqueTeachingSelectionRecord,
  definition: TechniqueDefinition,
  candidate: TechniqueTeachingSelectionCandidate,
): ValidationResult<TechniqueTeachingSelectionExcludedCandidate | { accepted: true; compositeScore: number }> {
  const reasons: string[] = [];
  if (definition.techniqueId !== candidate.techniqueId) {
    return failure([
      {
        path: "/candidates",
        message: "TechniqueDefinition.techniqueId must match candidate techniqueId",
        actual: candidate.techniqueId,
        expected: definition.techniqueId,
      },
    ]);
  }
  if (discipleAlreadyAcquired(candidate, record)) {
    pushReason(reasons, "disciple_already_acquired");
    return success({ techniqueId: candidate.techniqueId, reasons });
  }
  const canTeach = teacherCanTeach(definition, candidate.teacherCanTeachContext);
  if (!canTeach.ok) {
    return canTeach;
  }
  if (!canTeach.value) {
    pushReason(reasons, "static_teacher_can_teach_false");
    return success({ techniqueId: candidate.techniqueId, reasons });
  }
  const acquisition = evaluateTechniqueAcquisitionConditions(
    definition,
    record.discipleLearnerContext,
  );
  if (!acquisition.ok) {
    return acquisition;
  }
  if (!acquisition.value.allConditionsMet) {
    pushReason(reasons, "disciple_prerequisites_unmet");
    return success({ techniqueId: candidate.techniqueId, reasons });
  }
  const weeklyPolicy = weeklyTeachPolicySliceFromSelection(policy);
  const refusalRequest: WeeklyTeachDiscipleRequest = {
    disciplePersonId: record.disciplePersonId,
    techniqueId: candidate.techniqueId,
    learningTier: definition.learningTier,
    teacherCanTeachContext: candidate.teacherCanTeachContext,
    mentorshipRelationKind: record.mentorshipRelationKind,
    evaluationInputs: candidate.evaluationInputs,
    ...(candidate.discipleHasIncompletePriorFocus === undefined
      ? {}
      : { discipleHasIncompletePriorFocus: candidate.discipleHasIncompletePriorFocus }),
  };
  const refusal = evaluateWeeklyTeachRefusal(weeklyPolicy, definition, refusalRequest);
  if (!refusal.ok) {
    return refusal;
  }
  if (refusal.value.decision !== "accepted") {
    for (const code of refusal.value.reasons) {
      pushReason(reasons, code);
    }
    return success({ techniqueId: candidate.techniqueId, reasons });
  }
  const compositeScore =
    refusal.value.compositeScore ??
    computeWeeklyTeachCompositeScore(policy.evaluationWeights, candidate.evaluationInputs);
  return success({ accepted: true, compositeScore });
}

export function evaluateTeachingSelectionReEvaluationDue(
  policy: Sprint3TeachingSelectionConfig,
  context: TeachingSelectionReEvaluationContext,
): TeachingSelectionReEvaluationDueResult {
  const matchedTriggers: string[] = [];
  const triggers = policy.reEvaluationTriggers;
  if (context.weeksSinceLastTeachingSelectionEvaluation >= triggers.fourWeekCadenceWeeks) {
    matchedTriggers.push("four_week_cadence");
  }
  if (triggers.triggerOnNewEnrollment && context.newEnrollmentThisEvaluation) {
    matchedTriggers.push("new_enrollment");
  }
  if (
    triggers.triggerOnCurrentTechniqueAcquisitionComplete &&
    context.currentTechniqueAcquisitionCompleted
  ) {
    matchedTriggers.push("current_technique_acquisition_complete");
  }
  return {
    due: matchedTriggers.length > 0,
    matchedTriggers,
  };
}

export function rankTeachableTechniqueCandidates(
  config: Sprint3Config,
  record: TechniqueTeachingSelectionRecord,
  techniqueDefinitionsById: ReadonlyMap<string, TechniqueDefinition>,
): ValidationResult<TechniqueTeachingSelectionOutcome> {
  const issues: ValidationIssue[] = [];
  const policy = resolveTeachingSelectionPolicy(config, issues);
  if (policy === undefined || issues.length > 0) {
    return failure(issues);
  }
  const excludedCandidates: TechniqueTeachingSelectionExcludedCandidate[] = [];
  const scored: { techniqueId: string; compositeScore: number }[] = [];
  for (const candidate of record.candidates) {
    const definition = techniqueDefinitionsById.get(candidate.techniqueId);
    if (definition === undefined) {
      return failure([
        {
          path: "/candidates",
          message: "techniqueId is missing from techniqueDefinitionsById",
          actual: candidate.techniqueId,
          expected: "known TechniqueDefinition",
        },
      ]);
    }
    const gate = gateCandidate(policy, record, definition, candidate);
    if (!gate.ok) {
      return gate;
    }
    if ("reasons" in gate.value) {
      excludedCandidates.push(gate.value);
      continue;
    }
    scored.push({
      techniqueId: candidate.techniqueId,
      compositeScore: gate.value.compositeScore,
    });
  }
  scored.sort((left, right) => {
    if (right.compositeScore !== left.compositeScore) {
      return right.compositeScore - left.compositeScore;
    }
    return compareUnicodeCodePoints(left.techniqueId, right.techniqueId);
  });
  const rankedCandidates: TechniqueTeachingSelectionRankedCandidate[] = scored.map(
    (entry, index) => ({
      techniqueId: entry.techniqueId,
      compositeScore: entry.compositeScore,
      rank: index + 1,
    }),
  );
  return success({
    kind: "selection_completed",
    rankedCandidates,
    excludedCandidates,
    reasons: ["technique_teaching_selection_ranked"],
  });
}

export function evaluateTechniqueTeachingSelection(
  config: Sprint3Config,
  record: TechniqueTeachingSelectionRecord,
  techniqueDefinitionsById: ReadonlyMap<string, TechniqueDefinition>,
): ValidationResult<TechniqueTeachingSelectionOutcome> {
  if (!isTechniqueTeachingSelectionEnabled(config)) {
    return success({
      kind: "feature_disabled",
      rankedCandidates: [],
      excludedCandidates: [],
      reasons: ["technique_teaching_selection_disabled"],
    });
  }
  return rankTeachableTechniqueCandidates(config, record, techniqueDefinitionsById);
}
