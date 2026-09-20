/**
 * S03-004 deterministic per-master intake limit / accept-reject-defer state machine.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
  MASTER_INTAKE_EVALUATION_POLICY_DEFERRED,
} from "./constants.js";
import type {
  MasterIntakeEvaluationOutcome,
  MasterIntakeEvaluationRecord,
  MasterIntakeLimitFormula,
  Sprint3Config,
  Sprint3MasterIntakeConfig,
} from "./types.js";

function resolveIntakePolicy(
  config: Sprint3Config,
  issues: ValidationIssue[],
): Sprint3MasterIntakeConfig | undefined {
  const masterIntake = config.masterIntake;
  if (masterIntake === undefined) {
    issues.push({
      path: "/masterIntake",
      message: "master intake policy is not configured for this configVersion",
      actual: undefined,
      expected: MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
    });
    return undefined;
  }
  if (masterIntake.evaluationPolicyVersion === MASTER_INTAKE_EVALUATION_POLICY_DEFERRED) {
    issues.push({
      path: "/masterIntake/evaluationPolicyVersion",
      message: "master intake autonomous limit policy is deferred for this configVersion",
      actual: masterIntake.evaluationPolicyVersion,
      expected: MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
    });
    return undefined;
  }
  return masterIntake;
}

function clampInteger(value: number, minInclusive: number, maxInclusive: number): number {
  return Math.min(maxInclusive, Math.max(minInclusive, value));
}

export function computeAutonomousMaxDisciples(
  formula: MasterIntakeLimitFormula,
  record: MasterIntakeEvaluationRecord,
): number {
  const teachingBonus =
    Math.floor(record.teachingAbilityScore / 10) * formula.teachingAbilityBonusPerTenPoints;
  const massBonus =
    Math.floor(record.massDiscipleToleranceScore / 10) *
    formula.massDiscipleToleranceBonusPerTenPoints;
  const successorPenalty =
    Math.floor(record.successorOrientationScore / 10) *
    formula.successorOrientationPenaltyPerTenPoints;
  const raw = formula.baseAutonomousMaxDisciples + teachingBonus + massBonus - successorPenalty;
  return clampInteger(
    raw,
    formula.minimumAutonomousMaxDisciples,
    formula.maximumAutonomousMaxDisciples,
  );
}

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

export function evaluateMasterIntakeDecision(
  config: Sprint3Config,
  record: MasterIntakeEvaluationRecord,
): ValidationResult<MasterIntakeEvaluationOutcome> {
  const issues: ValidationIssue[] = [];
  const policy = resolveIntakePolicy(config, issues);
  if (policy === undefined || issues.length > 0) {
    return failure(issues);
  }

  if (policy.evaluationPolicyVersion !== MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT) {
    return failure([
      {
        path: "/masterIntake/evaluationPolicyVersion",
        message: "unsupported master intake evaluation policy",
        actual: policy.evaluationPolicyVersion,
        expected: MASTER_INTAKE_EVALUATION_POLICY_AUTONOMOUS_LIMIT,
      },
    ]);
  }

  const scoreIssues: ValidationIssue[] = [];
  for (const [key, path] of [
    ["teachingAbilityScore", "/teachingAbilityScore"],
    ["successorOrientationScore", "/successorOrientationScore"],
    ["massDiscipleToleranceScore", "/massDiscipleToleranceScore"],
  ] as const) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      scoreIssues.push({
        path,
        message: "score must be a finite number from 0 to 100 inclusive",
        actual: value,
        expected: "0..100",
      });
    }
  }
  if (
    typeof record.currentFormalDiscipleCount !== "number" ||
    !Number.isFinite(record.currentFormalDiscipleCount) ||
    !Number.isInteger(record.currentFormalDiscipleCount) ||
    record.currentFormalDiscipleCount < 0
  ) {
    scoreIssues.push({
      path: "/currentFormalDiscipleCount",
      message: "currentFormalDiscipleCount must be a non-negative safe integer",
      actual: record.currentFormalDiscipleCount,
      expected: "non-negative integer",
    });
  }
  if (scoreIssues.length > 0) {
    return failure(scoreIssues);
  }

  const autonomousMaxDisciples = computeAutonomousMaxDisciples(policy.limitFormula, record);
  const reasons: string[] = [];

  if (record.currentFormalDiscipleCount < autonomousMaxDisciples) {
    pushReason(reasons, "under_autonomous_limit");
    return success({
      acceptance: "accept",
      autonomousMaxDisciples,
      reasons,
    });
  }

  const applicant = record.applicant;
  if (applicant !== undefined) {
    const aptitude = applicant.lineageAptitudeScore;
    if (
      typeof aptitude === "number" &&
      Number.isFinite(aptitude) &&
      aptitude >= policy.deferApplicantAptitudeThreshold
    ) {
      pushReason(reasons, "at_autonomous_limit_high_aptitude_defer");
      return success({
        acceptance: "defer",
        autonomousMaxDisciples,
        reasons,
      });
    }
  }

  pushReason(reasons, "at_or_over_autonomous_limit_reject");
  return success({
    acceptance: "reject",
    autonomousMaxDisciples,
    reasons,
  });
}
