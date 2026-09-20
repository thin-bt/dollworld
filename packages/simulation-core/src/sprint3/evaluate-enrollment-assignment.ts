/**
 * S03-003 deterministic 8-year enrollment / master-selection (docs/SPEC.md §8歳時の師匠決定).
 * Pure processor contract: no lineage or mentorship persistence mutations.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  SPRINT3_CONFIG_VERSION_ENROLLMENT,
  SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION,
  SPRINT3_CONFIG_VERSION_INTAKE,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
} from "./constants.js";
import { evaluateMasterQualificationEligibility } from "./evaluate-master-qualification.js";
import type {
  EnrollmentAssignmentKind,
  EnrollmentAssignmentOutcome,
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  EnrollmentSpecialReason,
  MentorshipRelationKind,
  Sprint3Config,
} from "./types.js";

const INTAKE_ACCEPTANCE_VALUES = ["accept", "reject", "defer"] as const;

const ENROLLMENT_ASSIGNMENT_CONFIG_VERSIONS = new Set<string>([
  SPRINT3_CONFIG_VERSION_ENROLLMENT,
  SPRINT3_CONFIG_VERSION_INTAKE,
  SPRINT3_CONFIG_VERSION_TEACHING_EFFICIENCY,
  SPRINT3_CONFIG_VERSION_PARENT_TEMPORARY_GUIDANCE,
  SPRINT3_CONFIG_VERSION_WEEKLY_TEACH,
  SPRINT3_CONFIG_VERSION_TECHNIQUE_TEACHING_SELECTION,
  SPRINT3_CONFIG_VERSION_ORIGINAL_TECHNIQUE_LIFECYCLE,
  SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION,
]);

export function isEnrollmentAssignmentAiEnabled(config: Sprint3Config): boolean {
  return (
    ENROLLMENT_ASSIGNMENT_CONFIG_VERSIONS.has(config.configVersion) &&
    config.mentorshipFeatures.enrollmentAssignmentAiEnabled === true
  );
}

function pushReason(reasons: string[], code: string): void {
  reasons.push(code);
}

function candidateTotalScore(candidate: EnrollmentMasterCandidate): number {
  return (
    candidate.parentChildCompatibilityScore +
    candidate.lineageAptitudeScore +
    candidate.schoolFitScore +
    candidate.teachingEfficiencyScore
  );
}

function compareCandidates(a: EnrollmentMasterCandidate, b: EnrollmentMasterCandidate): number {
  const scoreDelta = candidateTotalScore(b) - candidateTotalScore(a);
  if (scoreDelta !== 0) {
    return scoreDelta;
  }
  if (a.masterPersonId < b.masterPersonId) {
    return -1;
  }
  if (a.masterPersonId > b.masterPersonId) {
    return 1;
  }
  return 0;
}

function sortCandidatesDeterministic(
  candidates: EnrollmentMasterCandidate[],
): EnrollmentMasterCandidate[] {
  return [...candidates].sort(compareCandidates);
}

function allowsAlternateFormalMaster(
  activeSpecialReasons: readonly EnrollmentSpecialReason[],
  qualifiedAcceptableParents: EnrollmentMasterCandidate[],
): boolean {
  if (activeSpecialReasons.length > 0) {
    return true;
  }
  return qualifiedAcceptableParents.length === 0;
}

function assignmentKindForCandidate(
  candidate: EnrollmentMasterCandidate,
): Exclude<
  EnrollmentAssignmentKind,
  "not_at_enrollment_boundary" | "parent_temporary_guidance" | "no_eligible_or_accepted_master"
> {
  return candidate.isBiologicalParent ? "parent_master_assigned" : "formal_master_assigned";
}

function mentorshipKindForAssignmentKind(
  kind: "parent_master_assigned" | "formal_master_assigned",
): MentorshipRelationKind {
  return kind === "parent_master_assigned" ? "parent_master_disciple" : "formal_master_disciple";
}

function buildAssignedOutcome(
  candidate: EnrollmentMasterCandidate,
  reasons: string[],
): EnrollmentAssignmentOutcome {
  const kind = assignmentKindForCandidate(candidate);
  pushReason(reasons, kind);
  return Object.freeze({
    kind,
    selectedMasterPersonId: candidate.masterPersonId,
    mentorshipRelationKind: mentorshipKindForAssignmentKind(kind),
    reasons: Object.freeze(reasons),
  });
}

function validateRecordStructure(
  record: EnrollmentAssignmentRecord,
  issues: ValidationIssue[],
): boolean {
  if (typeof record.childPersonId !== "string" || record.childPersonId.length === 0) {
    issues.push({
      path: "/childPersonId",
      message: "required non-empty string is missing",
      actual: record.childPersonId,
    });
  }
  if (typeof record.childAge !== "number" || !Number.isInteger(record.childAge)) {
    issues.push({
      path: "/childAge",
      message: "childAge must be an integer",
      actual: record.childAge,
    });
  }
  if (!Array.isArray(record.masterCandidates)) {
    issues.push({
      path: "/masterCandidates",
      message: "masterCandidates must be an array",
      actual: record.masterCandidates,
    });
    return false;
  }
  const seenMasterIds = new Set<string>();
  for (let index = 0; index < record.masterCandidates.length; index += 1) {
    const candidate = record.masterCandidates[index]!;
    const basePath = `/masterCandidates/${index}`;
    if (typeof candidate.masterPersonId !== "string" || candidate.masterPersonId.length === 0) {
      issues.push({
        path: `${basePath}/masterPersonId`,
        message: "required non-empty string is missing",
        actual: candidate.masterPersonId,
      });
    } else if (seenMasterIds.has(candidate.masterPersonId)) {
      issues.push({
        path: `${basePath}/masterPersonId`,
        message: "duplicate masterPersonId in masterCandidates",
        actual: candidate.masterPersonId,
      });
    } else {
      seenMasterIds.add(candidate.masterPersonId);
    }
    if (!INTAKE_ACCEPTANCE_VALUES.includes(candidate.intakeAcceptance)) {
      issues.push({
        path: `${basePath}/intakeAcceptance`,
        message: "intakeAcceptance must be accept, reject, or defer",
        actual: candidate.intakeAcceptance,
      });
    }
    for (const scoreField of [
      "parentChildCompatibilityScore",
      "lineageAptitudeScore",
      "schoolFitScore",
      "teachingEfficiencyScore",
    ] as const) {
      const score = candidate[scoreField];
      if (typeof score !== "number" || !Number.isInteger(score)) {
        issues.push({
          path: `${basePath}/${scoreField}`,
          message: "score must be an integer",
          actual: score,
        });
      }
    }
  }
  return issues.length === 0;
}

function filterQualifiedAcceptable(
  config: Sprint3Config,
  record: EnrollmentAssignmentRecord,
  issues: ValidationIssue[],
): EnrollmentMasterCandidate[] | undefined {
  const acceptable: EnrollmentMasterCandidate[] = [];
  for (let index = 0; index < record.masterCandidates.length; index += 1) {
    const candidate = record.masterCandidates[index]!;
    if (candidate.intakeAcceptance !== "accept") {
      continue;
    }
    const qualification = evaluateMasterQualificationEligibility(
      config,
      candidate.qualificationRecord,
    );
    if (!qualification.ok) {
      issues.push({
        path: `/masterCandidates/${index}/qualificationRecord`,
        message: "master qualification evaluation failed for candidate",
        actual: qualification.issues,
      });
      return undefined;
    }
    if (qualification.value.eligible) {
      acceptable.push(candidate);
    }
  }
  return acceptable;
}

export function evaluateEnrollmentAssignment(
  config: Sprint3Config,
  record: EnrollmentAssignmentRecord,
): ValidationResult<EnrollmentAssignmentOutcome> {
  const issues: ValidationIssue[] = [];
  if (!validateRecordStructure(record, issues)) {
    return failure(issues);
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const reasons: string[] = [];
  const minAge = config.enrollment.formalEnrollmentMinAge;
  if (record.childAge !== minAge) {
    pushReason(reasons, "child_age_not_at_enrollment_boundary");
    return success(
      Object.freeze({
        kind: "not_at_enrollment_boundary" as const,
        reasons: Object.freeze(reasons),
      }),
    );
  }

  const qualifiedAcceptable = filterQualifiedAcceptable(config, record, issues);
  if (qualifiedAcceptable === undefined) {
    return failure(issues);
  }

  const qualifiedParents = qualifiedAcceptable.filter((c) => c.isBiologicalParent);
  const useAlternatePool = allowsAlternateFormalMaster(
    record.activeSpecialReasons,
    qualifiedParents,
  );
  const selectionPool = useAlternatePool ? qualifiedAcceptable : qualifiedParents;

  if (selectionPool.length > 0) {
    const winner = sortCandidatesDeterministic(selectionPool)[0]!;
    if (useAlternatePool && record.activeSpecialReasons.length > 0) {
      pushReason(reasons, "special_reason_permits_alternate_master");
    } else if (qualifiedParents.length > 1) {
      pushReason(reasons, "dual_qualified_parent_score_tiebreak");
    } else {
      pushReason(reasons, "default_parent_master_path");
    }
    return success(buildAssignedOutcome(winner, reasons));
  }

  pushReason(reasons, "no_qualified_master_with_accepted_intake");
  if (
    config.enrollment.parentTemporaryGuidanceAllowed &&
    record.temporaryGuidanceParentPersonId !== undefined &&
    record.temporaryGuidanceParentPersonId.length > 0
  ) {
    pushReason(reasons, "parent_temporary_guidance_fallback");
    return success(
      Object.freeze({
        kind: "parent_temporary_guidance" as const,
        selectedMasterPersonId: record.temporaryGuidanceParentPersonId,
        mentorshipRelationKind: "parent_temporary_guidance" as const,
        reasons: Object.freeze(reasons),
      }),
    );
  }

  return success(
    Object.freeze({
      kind: "no_eligible_or_accepted_master" as const,
      reasons: Object.freeze(reasons),
    }),
  );
}
