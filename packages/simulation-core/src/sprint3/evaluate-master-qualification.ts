/**
 * S03-002 deterministic 師匠資格 evaluation (post-retirement eligibility boundary).
 */
import { RANK_ORDER, type Rank } from "../enums.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED,
  MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
} from "./constants.js";
import type {
  MasterQualificationEvaluationOutcome,
  MasterQualificationEvaluationRecord,
  MasterQualificationEligibilityThresholds,
  Sprint3Config,
  Sprint3MasterQualificationConfig,
} from "./types.js";

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function resolveThresholds(
  masterQualification: Sprint3MasterQualificationConfig,
  issues: ValidationIssue[],
): MasterQualificationEligibilityThresholds | undefined {
  if (
    masterQualification.evaluationPolicyVersion === MASTER_QUALIFICATION_EVALUATION_POLICY_DEFERRED
  ) {
    issues.push({
      path: "/masterQualification/evaluationPolicyVersion",
      message: "master qualification thresholds are not configured for deferred evaluation policy",
      actual: masterQualification.evaluationPolicyVersion,
      expected: MASTER_QUALIFICATION_EVALUATION_POLICY_RANK_AND_RECORDS,
    });
    return undefined;
  }
  return masterQualification.eligibilityThresholds;
}

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

export function evaluateMasterQualificationEligibility(
  config: Sprint3Config,
  record: MasterQualificationEvaluationRecord,
): ValidationResult<MasterQualificationEvaluationOutcome> {
  const issues: ValidationIssue[] = [];
  const thresholds = resolveThresholds(config.masterQualification, issues);
  if (thresholds === undefined || issues.length > 0) {
    return failure(issues);
  }

  const reasons: string[] = [];

  if (record.lifeStatus !== "living") {
    pushReason(reasons, "life_status_not_living");
  }

  if (record.careerStatus !== "retired") {
    pushReason(reasons, "career_status_not_retired");
  }

  if (record.retirementRank === undefined) {
    pushReason(reasons, "retirement_rank_missing");
  } else if (rankIndex(record.retirementRank) < rankIndex(thresholds.minimumRetirementRank)) {
    pushReason(reasons, "retirement_rank_below_minimum");
  }

  if (record.officialWins < thresholds.minimumOfficialWins) {
    pushReason(reasons, "official_wins_below_minimum");
  }

  if (record.limitedOfficialWins < thresholds.minimumLimitedOfficialWins) {
    pushReason(reasons, "limited_official_wins_below_minimum");
  }

  if (record.tournamentTitles < thresholds.minimumTournamentTitles) {
    pushReason(reasons, "tournament_titles_below_minimum");
  }

  const eligible = reasons.length === 0;
  return success(Object.freeze({ eligible, reasons: Object.freeze(reasons) }));
}
