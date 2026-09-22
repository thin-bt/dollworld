/**
 * S03-012 persisted mentorship entrypoint runtime (enrollment / intake / explicit teach).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asPersonId, type PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID } from "./constants.js";
import {
  ENROLLMENT_ASSIGNMENT_KINDS,
  MENTORSHIP_RELATION_KINDS,
  isEnrollmentAssignmentKind,
  isMentorshipRelationKind,
  type EnrollmentAssignmentKind,
  type EnrollmentAssignmentOutcome,
  type EnrollmentAssignmentRecord,
  type ExplicitWeeklyTeachActionOutcome,
  type ExplicitWeeklyTeachActionRecord,
  type MasterIntakeEvaluationOutcome,
  type WeeklyTeachDiscipleOutcome,
  type MentorshipRelationKind,
} from "./types.js";

export const SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_SCHEMA_VERSION = "0.2.0" as const;

export const SUPPORTED_SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_SCHEMA_VERSIONS = [
  "0.1.0",
  "0.2.0",
] as const;

export const SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_KEYS = [
  "schemaVersion",
  "processorId",
  "pendingEnrollmentBoundaries",
  "pendingExplicitWeeklyTeachRecords",
  "mentorshipByChildPersonId",
  "completedEnrollmentOutcomes",
  "completedMasterIntakeOutcomes",
  "completedExplicitWeeklyTeachOutcomes",
  "lastProcessedEnrollmentAbsoluteWeek",
  "lastProcessedExplicitTeachAbsoluteWeek",
  "enrollmentParentRebellionChildPersonIds",
] as const;

export const SPRINT3_MENTORSHIP_ASSIGNMENT_ENTRY_KEYS = [
  "childPersonId",
  "selectedMasterPersonId",
  "mentorshipRelationKind",
  "enrollmentOutcomeKind",
  "assignedAbsoluteWeek",
] as const;

export const SPRINT3_COMPLETED_ENROLLMENT_OUTCOME_ENTRY_KEYS = [
  "absoluteWeek",
  "childPersonId",
  "outcome",
] as const;

export const SPRINT3_COMPLETED_MASTER_INTAKE_OUTCOME_ENTRY_KEYS = [
  "absoluteWeek",
  "masterPersonId",
  "childPersonId",
  "outcome",
] as const;

export const SPRINT3_COMPLETED_EXPLICIT_WEEKLY_TEACH_OUTCOME_ENTRY_KEYS = [
  "absoluteWeek",
  "masterPersonId",
  "outcome",
] as const;

const ENROLLMENT_ASSIGNMENT_OUTCOME_KEYS = [
  "kind",
  "selectedMasterPersonId",
  "mentorshipRelationKind",
  "reasons",
] as const;

const MASTER_INTAKE_EVALUATION_OUTCOME_KEYS = [
  "acceptance",
  "autonomousMaxDisciples",
  "reasons",
] as const;

const MASTER_INTAKE_ACCEPTANCE_VALUES = ["accept", "reject", "defer"] as const;

const EXPLICIT_WEEKLY_TEACH_ACTION_OUTCOME_KEYS = [
  "kind",
  "weeklyTeachSlotLimit",
  "discipleOutcomes",
  "reasons",
] as const;

const EXPLICIT_WEEKLY_TEACH_ACTION_OUTCOME_KINDS = [
  "feature_disabled",
  "invalid_master_action",
  "master_not_pipeline_eligible",
  "teach_week_completed",
] as const;

const WEEKLY_TEACH_DISCIPLE_OUTCOME_KEYS = [
  "disciplePersonId",
  "techniqueId",
  "decision",
  "compositeScore",
  "reasons",
] as const;

const WEEKLY_TEACH_DISCIPLE_DECISION_VALUES = [
  "accepted",
  "refused",
  "skipped_allocation",
] as const;

export type Sprint3MentorshipAssignmentEntry = {
  childPersonId: PersonId;
  selectedMasterPersonId?: PersonId;
  mentorshipRelationKind?: MentorshipRelationKind;
  enrollmentOutcomeKind: EnrollmentAssignmentOutcome["kind"];
  assignedAbsoluteWeek: number;
};

export type Sprint3CompletedEnrollmentOutcomeEntry = {
  absoluteWeek: number;
  childPersonId: PersonId;
  outcome: EnrollmentAssignmentOutcome;
};

export type Sprint3CompletedMasterIntakeOutcomeEntry = {
  absoluteWeek: number;
  masterPersonId: PersonId;
  childPersonId?: PersonId;
  outcome: MasterIntakeEvaluationOutcome;
};

export type Sprint3CompletedExplicitWeeklyTeachOutcomeEntry = {
  absoluteWeek: number;
  masterPersonId: PersonId;
  outcome: ExplicitWeeklyTeachActionOutcome;
};

export type Sprint3MentorshipEntrypointRuntimeState = {
  schemaVersion: typeof SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_SCHEMA_VERSION;
  processorId: typeof SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID;
  pendingEnrollmentBoundaries: readonly EnrollmentAssignmentRecord[];
  pendingExplicitWeeklyTeachRecords: readonly ExplicitWeeklyTeachActionRecord[];
  mentorshipByChildPersonId: readonly Sprint3MentorshipAssignmentEntry[];
  completedEnrollmentOutcomes: readonly Sprint3CompletedEnrollmentOutcomeEntry[];
  completedMasterIntakeOutcomes: readonly Sprint3CompletedMasterIntakeOutcomeEntry[];
  completedExplicitWeeklyTeachOutcomes: readonly Sprint3CompletedExplicitWeeklyTeachOutcomeEntry[];
  lastProcessedEnrollmentAbsoluteWeek: number | null;
  lastProcessedExplicitTeachAbsoluteWeek: number | null;
  /** Explicit child→parent rebellion at enrollment; no autonomous derivation. */
  enrollmentParentRebellionChildPersonIds: readonly PersonId[];
};

function parseEnrollmentParentRebellionChildPersonIds(
  raw: unknown,
  path: string,
  issues: ValidationIssue[],
): PersonId[] | undefined {
  if (!Array.isArray(raw)) {
    issues.push({
      path,
      message: "enrollmentParentRebellionChildPersonIds must be an array",
      actual: raw,
    });
    return undefined;
  }
  const ids: PersonId[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (typeof value !== "string" || value.length === 0) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "childPersonId must be a non-empty string",
        actual: value,
      });
      continue;
    }
    if (seen.has(value)) {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "duplicate childPersonId in enrollmentParentRebellionChildPersonIds",
        actual: value,
      });
      continue;
    }
    seen.add(value);
    ids.push(asPersonId(value));
  }
  ids.sort(compareUnicodeCodePoints);
  return ids;
}

export function createInitialSprint3MentorshipEntrypointRuntimeState(): Sprint3MentorshipEntrypointRuntimeState {
  return deepFreezePlainJson({
    schemaVersion: SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_SCHEMA_VERSION,
    processorId: SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID,
    pendingEnrollmentBoundaries: [],
    pendingExplicitWeeklyTeachRecords: [],
    mentorshipByChildPersonId: [],
    completedEnrollmentOutcomes: [],
    completedMasterIntakeOutcomes: [],
    completedExplicitWeeklyTeachOutcomes: [],
    lastProcessedEnrollmentAbsoluteWeek: null,
    lastProcessedExplicitTeachAbsoluteWeek: null,
    enrollmentParentRebellionChildPersonIds: [],
  });
}

function appendMentorshipAssignmentSemanticIssues(
  path: string,
  enrollmentOutcomeKind: EnrollmentAssignmentKind,
  selectedMasterPersonId: PersonId | undefined,
  mentorshipRelationKind: MentorshipRelationKind | undefined,
  issues: ValidationIssue[],
): void {
  const hasMaster = selectedMasterPersonId !== undefined;
  const hasRelation = mentorshipRelationKind !== undefined;

  switch (enrollmentOutcomeKind) {
    case "formal_master_assigned":
      if (!hasMaster) {
        issues.push({
          path: `${path}/selectedMasterPersonId`,
          message: "formal_master_assigned requires selectedMasterPersonId",
          actual: undefined,
        });
      }
      if (!hasRelation) {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: "formal_master_assigned requires mentorshipRelationKind",
          actual: undefined,
        });
      } else if (mentorshipRelationKind !== "formal_master_disciple") {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: "formal_master_assigned requires mentorshipRelationKind formal_master_disciple",
          actual: mentorshipRelationKind,
          expected: "formal_master_disciple",
        });
      }
      break;
    case "parent_master_assigned":
      if (!hasMaster) {
        issues.push({
          path: `${path}/selectedMasterPersonId`,
          message: "parent_master_assigned requires selectedMasterPersonId",
          actual: undefined,
        });
      }
      if (!hasRelation) {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: "parent_master_assigned requires mentorshipRelationKind",
          actual: undefined,
        });
      } else if (mentorshipRelationKind !== "parent_master_disciple") {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: "parent_master_assigned requires mentorshipRelationKind parent_master_disciple",
          actual: mentorshipRelationKind,
          expected: "parent_master_disciple",
        });
      }
      break;
    case "parent_temporary_guidance":
      if (!hasMaster) {
        issues.push({
          path: `${path}/selectedMasterPersonId`,
          message: "parent_temporary_guidance requires selectedMasterPersonId",
          actual: undefined,
        });
      }
      if (!hasRelation) {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: "parent_temporary_guidance requires mentorshipRelationKind",
          actual: undefined,
        });
      } else if (mentorshipRelationKind !== "parent_temporary_guidance") {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message:
            "parent_temporary_guidance requires mentorshipRelationKind parent_temporary_guidance",
          actual: mentorshipRelationKind,
          expected: "parent_temporary_guidance",
        });
      }
      break;
    case "not_at_enrollment_boundary":
    case "no_eligible_or_accepted_master":
      if (hasMaster) {
        issues.push({
          path: `${path}/selectedMasterPersonId`,
          message: `${enrollmentOutcomeKind} must not include selectedMasterPersonId`,
          actual: selectedMasterPersonId,
        });
      }
      if (hasRelation) {
        issues.push({
          path: `${path}/mentorshipRelationKind`,
          message: `${enrollmentOutcomeKind} must not include mentorshipRelationKind`,
          actual: mentorshipRelationKind,
        });
      }
      break;
    default: {
      const _exhaustive: never = enrollmentOutcomeKind;
      void _exhaustive;
    }
  }
}

function validateMentorshipAssignmentEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint3MentorshipAssignmentEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, SPRINT3_MENTORSHIP_ASSIGNMENT_ENTRY_KEYS, path, issues);

  const childPersonIdRaw = object["childPersonId"];
  if (typeof childPersonIdRaw !== "string" || childPersonIdRaw.length === 0) {
    issues.push({
      path: `${path}/childPersonId`,
      message: "childPersonId must be a non-empty string",
      actual: childPersonIdRaw,
    });
    return undefined;
  }
  const assignedAbsoluteWeek = requireSafeIntegerAtLeast(
    object,
    "assignedAbsoluteWeek",
    path,
    0,
    issues,
  );
  const enrollmentOutcomeKindRaw = object["enrollmentOutcomeKind"];
  if (typeof enrollmentOutcomeKindRaw !== "string") {
    issues.push({
      path: `${path}/enrollmentOutcomeKind`,
      message: "enrollmentOutcomeKind must be a string",
      actual: enrollmentOutcomeKindRaw,
    });
    return undefined;
  }
  if (!isEnrollmentAssignmentKind(enrollmentOutcomeKindRaw)) {
    issues.push({
      path: `${path}/enrollmentOutcomeKind`,
      message: "enrollmentOutcomeKind must be a known EnrollmentAssignmentOutcome kind",
      actual: enrollmentOutcomeKindRaw,
      expected: ENROLLMENT_ASSIGNMENT_KINDS.join(" | "),
    });
    return undefined;
  }
  const enrollmentOutcomeKind = enrollmentOutcomeKindRaw;

  let selectedMasterPersonId: PersonId | undefined;
  if (object["selectedMasterPersonId"] !== undefined) {
    const raw = object["selectedMasterPersonId"];
    if (typeof raw !== "string" || raw.length === 0) {
      issues.push({
        path: `${path}/selectedMasterPersonId`,
        message: "selectedMasterPersonId must be a non-empty string when present",
        actual: raw,
      });
    } else {
      selectedMasterPersonId = asPersonId(raw);
    }
  }

  let mentorshipRelationKind: MentorshipRelationKind | undefined;
  if (object["mentorshipRelationKind"] !== undefined) {
    const raw = object["mentorshipRelationKind"];
    if (typeof raw !== "string") {
      issues.push({
        path: `${path}/mentorshipRelationKind`,
        message: "mentorshipRelationKind must be a string when present",
        actual: raw,
      });
    } else if (!isMentorshipRelationKind(raw)) {
      issues.push({
        path: `${path}/mentorshipRelationKind`,
        message: "mentorshipRelationKind must be a known MentorshipRelationKind",
        actual: raw,
        expected: MENTORSHIP_RELATION_KINDS.join(" | "),
      });
    } else {
      mentorshipRelationKind = raw;
    }
  }

  if (assignedAbsoluteWeek === undefined) {
    return undefined;
  }

  const issueCountBeforeSemantic = issues.length;
  appendMentorshipAssignmentSemanticIssues(
    path,
    enrollmentOutcomeKind,
    selectedMasterPersonId,
    mentorshipRelationKind,
    issues,
  );
  if (issues.length > issueCountBeforeSemantic) {
    return undefined;
  }

  return {
    childPersonId: asPersonId(childPersonIdRaw),
    ...(selectedMasterPersonId === undefined ? {} : { selectedMasterPersonId }),
    ...(mentorshipRelationKind === undefined ? {} : { mentorshipRelationKind }),
    enrollmentOutcomeKind,
    assignedAbsoluteWeek,
  };
}

function validateReasonStringArray(
  raw: unknown[] | undefined,
  path: string,
  issues: ValidationIssue[],
): readonly string[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const issueCountBefore = issues.length;
  for (let index = 0; index < raw.length; index += 1) {
    if (typeof raw[index] !== "string") {
      issues.push({
        path: `${path}/${String(index)}`,
        message: "reason must be a string",
        actual: raw[index],
      });
    }
  }
  if (issues.length > issueCountBefore) {
    return undefined;
  }
  return cloneValidatedPlainJson(raw) as readonly string[];
}

function validateEnrollmentAssignmentOutcome(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): EnrollmentAssignmentOutcome | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, ENROLLMENT_ASSIGNMENT_OUTCOME_KEYS, path, issues);

  const kindRaw = object["kind"];
  if (typeof kindRaw !== "string") {
    issues.push({
      path: `${path}/kind`,
      message: "enrollment assignment outcome kind must be a string",
      actual: kindRaw,
    });
    return undefined;
  }
  if (!isEnrollmentAssignmentKind(kindRaw)) {
    issues.push({
      path: `${path}/kind`,
      message:
        "enrollment assignment outcome kind must be a known EnrollmentAssignmentOutcome kind",
      actual: kindRaw,
      expected: ENROLLMENT_ASSIGNMENT_KINDS.join(" | "),
    });
    return undefined;
  }
  const kind = kindRaw;

  let selectedMasterPersonId: PersonId | undefined;
  if (object["selectedMasterPersonId"] !== undefined) {
    const raw = object["selectedMasterPersonId"];
    if (typeof raw !== "string" || raw.length === 0) {
      issues.push({
        path: `${path}/selectedMasterPersonId`,
        message: "selectedMasterPersonId must be a non-empty string when present",
        actual: raw,
      });
    } else {
      selectedMasterPersonId = asPersonId(raw);
    }
  }

  let mentorshipRelationKind: MentorshipRelationKind | undefined;
  if (object["mentorshipRelationKind"] !== undefined) {
    const raw = object["mentorshipRelationKind"];
    if (typeof raw !== "string") {
      issues.push({
        path: `${path}/mentorshipRelationKind`,
        message: "mentorshipRelationKind must be a string when present",
        actual: raw,
      });
    } else if (!isMentorshipRelationKind(raw)) {
      issues.push({
        path: `${path}/mentorshipRelationKind`,
        message: "mentorshipRelationKind must be a known MentorshipRelationKind",
        actual: raw,
        expected: MENTORSHIP_RELATION_KINDS.join(" | "),
      });
    } else {
      mentorshipRelationKind = raw;
    }
  }

  const reasonsRaw = snapshotDenseArrayOrFail(object["reasons"], `${path}/reasons`, issues);
  const reasons = validateReasonStringArray(reasonsRaw, `${path}/reasons`, issues);
  if (reasons === undefined) {
    return undefined;
  }

  const issueCountBeforeSemantic = issues.length;
  appendMentorshipAssignmentSemanticIssues(
    path,
    kind,
    selectedMasterPersonId,
    mentorshipRelationKind,
    issues,
  );
  if (issues.length > issueCountBeforeSemantic) {
    return undefined;
  }

  return deepFreezePlainJson({
    kind,
    ...(selectedMasterPersonId === undefined ? {} : { selectedMasterPersonId }),
    ...(mentorshipRelationKind === undefined ? {} : { mentorshipRelationKind }),
    reasons,
  }) as EnrollmentAssignmentOutcome;
}

function validateMasterIntakeEvaluationOutcome(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): MasterIntakeEvaluationOutcome | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, MASTER_INTAKE_EVALUATION_OUTCOME_KEYS, path, issues);

  const acceptanceRaw = object["acceptance"];
  if (typeof acceptanceRaw !== "string") {
    issues.push({
      path: `${path}/acceptance`,
      message: "master intake acceptance must be a string",
      actual: acceptanceRaw,
    });
    return undefined;
  }
  if (!(MASTER_INTAKE_ACCEPTANCE_VALUES as readonly string[]).includes(acceptanceRaw)) {
    issues.push({
      path: `${path}/acceptance`,
      message: "master intake acceptance must be accept, reject, or defer",
      actual: acceptanceRaw,
      expected: MASTER_INTAKE_ACCEPTANCE_VALUES.join(" | "),
    });
    return undefined;
  }

  const autonomousMaxDisciples = requireSafeIntegerAtLeast(
    object,
    "autonomousMaxDisciples",
    path,
    0,
    issues,
  );
  const reasonsRaw = snapshotDenseArrayOrFail(object["reasons"], `${path}/reasons`, issues);
  const reasons = validateReasonStringArray(reasonsRaw, `${path}/reasons`, issues);
  if (autonomousMaxDisciples === undefined || reasons === undefined) {
    return undefined;
  }

  return deepFreezePlainJson({
    acceptance: acceptanceRaw,
    autonomousMaxDisciples,
    reasons,
  }) as MasterIntakeEvaluationOutcome;
}

function validateWeeklyTeachDiscipleOutcome(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyTeachDiscipleOutcome | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, WEEKLY_TEACH_DISCIPLE_OUTCOME_KEYS, path, issues);

  const disciplePersonId = object["disciplePersonId"];
  if (typeof disciplePersonId !== "string" || disciplePersonId.length === 0) {
    issues.push({
      path: `${path}/disciplePersonId`,
      message: "disciplePersonId must be a non-empty string",
      actual: disciplePersonId,
    });
    return undefined;
  }
  const techniqueId = object["techniqueId"];
  if (typeof techniqueId !== "string" || techniqueId.length === 0) {
    issues.push({
      path: `${path}/techniqueId`,
      message: "techniqueId must be a non-empty string",
      actual: techniqueId,
    });
    return undefined;
  }
  const decisionRaw = object["decision"];
  if (typeof decisionRaw !== "string") {
    issues.push({
      path: `${path}/decision`,
      message: "weekly teach disciple decision must be a string",
      actual: decisionRaw,
    });
    return undefined;
  }
  if (!(WEEKLY_TEACH_DISCIPLE_DECISION_VALUES as readonly string[]).includes(decisionRaw)) {
    issues.push({
      path: `${path}/decision`,
      message: "weekly teach disciple decision must be accepted, refused, or skipped_allocation",
      actual: decisionRaw,
      expected: WEEKLY_TEACH_DISCIPLE_DECISION_VALUES.join(" | "),
    });
    return undefined;
  }

  let compositeScore: number | undefined;
  if (object["compositeScore"] !== undefined) {
    const raw = object["compositeScore"];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      issues.push({
        path: `${path}/compositeScore`,
        message: "compositeScore must be a finite number when present",
        actual: raw,
      });
      return undefined;
    }
    compositeScore = raw;
  }

  const reasonsRaw = snapshotDenseArrayOrFail(object["reasons"], `${path}/reasons`, issues);
  const reasons = validateReasonStringArray(reasonsRaw, `${path}/reasons`, issues);
  if (reasons === undefined) {
    return undefined;
  }

  return deepFreezePlainJson({
    disciplePersonId,
    techniqueId,
    decision: decisionRaw,
    ...(compositeScore === undefined ? {} : { compositeScore }),
    reasons,
  }) as WeeklyTeachDiscipleOutcome;
}

function validateExplicitWeeklyTeachActionOutcome(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): ExplicitWeeklyTeachActionOutcome | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, EXPLICIT_WEEKLY_TEACH_ACTION_OUTCOME_KEYS, path, issues);

  const kindRaw = object["kind"];
  if (typeof kindRaw !== "string") {
    issues.push({
      path: `${path}/kind`,
      message: "explicit weekly teach outcome kind must be a string",
      actual: kindRaw,
    });
    return undefined;
  }
  if (!(EXPLICIT_WEEKLY_TEACH_ACTION_OUTCOME_KINDS as readonly string[]).includes(kindRaw)) {
    issues.push({
      path: `${path}/kind`,
      message:
        "explicit weekly teach outcome kind must be a known ExplicitWeeklyTeachActionOutcome kind",
      actual: kindRaw,
      expected: EXPLICIT_WEEKLY_TEACH_ACTION_OUTCOME_KINDS.join(" | "),
    });
    return undefined;
  }

  const weeklyTeachSlotLimit = requireSafeIntegerAtLeast(
    object,
    "weeklyTeachSlotLimit",
    path,
    0,
    issues,
  );
  const discipleOutcomesRaw = snapshotDenseArrayOrFail(
    object["discipleOutcomes"],
    `${path}/discipleOutcomes`,
    issues,
  );
  const reasonsRaw = snapshotDenseArrayOrFail(object["reasons"], `${path}/reasons`, issues);
  const reasons = validateReasonStringArray(reasonsRaw, `${path}/reasons`, issues);
  if (
    weeklyTeachSlotLimit === undefined ||
    discipleOutcomesRaw === undefined ||
    reasons === undefined
  ) {
    return undefined;
  }

  const discipleOutcomes: WeeklyTeachDiscipleOutcome[] = [];
  for (let index = 0; index < discipleOutcomesRaw.length; index += 1) {
    const entry = validateWeeklyTeachDiscipleOutcome(
      discipleOutcomesRaw[index],
      `${path}/discipleOutcomes/${String(index)}`,
      issues,
    );
    if (entry !== undefined) {
      discipleOutcomes.push(entry);
    }
  }
  if (discipleOutcomes.length !== discipleOutcomesRaw.length) {
    return undefined;
  }

  return deepFreezePlainJson({
    kind: kindRaw,
    weeklyTeachSlotLimit,
    discipleOutcomes,
    reasons,
  }) as ExplicitWeeklyTeachActionOutcome;
}

function validateCompletedEnrollmentOutcomeEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint3CompletedEnrollmentOutcomeEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, SPRINT3_COMPLETED_ENROLLMENT_OUTCOME_ENTRY_KEYS, path, issues);

  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", path, 0, issues);
  const childPersonIdRaw = object["childPersonId"];
  if (typeof childPersonIdRaw !== "string" || childPersonIdRaw.length === 0) {
    issues.push({
      path: `${path}/childPersonId`,
      message: "childPersonId must be a non-empty string",
      actual: childPersonIdRaw,
    });
    return undefined;
  }
  const outcome = validateEnrollmentAssignmentOutcome(object["outcome"], `${path}/outcome`, issues);
  if (absoluteWeek === undefined || outcome === undefined) {
    return undefined;
  }
  return {
    absoluteWeek,
    childPersonId: asPersonId(childPersonIdRaw),
    outcome,
  };
}

function validateCompletedMasterIntakeOutcomeEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint3CompletedMasterIntakeOutcomeEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, SPRINT3_COMPLETED_MASTER_INTAKE_OUTCOME_ENTRY_KEYS, path, issues);

  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", path, 0, issues);
  const masterPersonIdRaw = object["masterPersonId"];
  if (typeof masterPersonIdRaw !== "string" || masterPersonIdRaw.length === 0) {
    issues.push({
      path: `${path}/masterPersonId`,
      message: "masterPersonId must be a non-empty string",
      actual: masterPersonIdRaw,
    });
    return undefined;
  }

  let childPersonId: PersonId | undefined;
  if (object["childPersonId"] !== undefined) {
    const raw = object["childPersonId"];
    if (typeof raw !== "string" || raw.length === 0) {
      issues.push({
        path: `${path}/childPersonId`,
        message: "childPersonId must be a non-empty string when present",
        actual: raw,
      });
      return undefined;
    }
    childPersonId = asPersonId(raw);
  }

  const outcome = validateMasterIntakeEvaluationOutcome(
    object["outcome"],
    `${path}/outcome`,
    issues,
  );
  if (absoluteWeek === undefined || outcome === undefined) {
    return undefined;
  }
  return {
    absoluteWeek,
    masterPersonId: asPersonId(masterPersonIdRaw),
    ...(childPersonId === undefined ? {} : { childPersonId }),
    outcome,
  };
}

function validateCompletedExplicitWeeklyTeachOutcomeEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint3CompletedExplicitWeeklyTeachOutcomeEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(
    object,
    SPRINT3_COMPLETED_EXPLICIT_WEEKLY_TEACH_OUTCOME_ENTRY_KEYS,
    path,
    issues,
  );

  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", path, 0, issues);
  const masterPersonIdRaw = object["masterPersonId"];
  if (typeof masterPersonIdRaw !== "string" || masterPersonIdRaw.length === 0) {
    issues.push({
      path: `${path}/masterPersonId`,
      message: "masterPersonId must be a non-empty string",
      actual: masterPersonIdRaw,
    });
    return undefined;
  }
  const outcome = validateExplicitWeeklyTeachActionOutcome(
    object["outcome"],
    `${path}/outcome`,
    issues,
  );
  if (absoluteWeek === undefined || outcome === undefined) {
    return undefined;
  }
  return {
    absoluteWeek,
    masterPersonId: asPersonId(masterPersonIdRaw),
    outcome,
  };
}

function parseValidatedCompletedHistoryEntries<T>(
  raw: unknown[] | undefined,
  basePath: string,
  validateEntry: (input: unknown, path: string, issues: ValidationIssue[]) => T | undefined,
  issues: ValidationIssue[],
): T[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const entries: T[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const entry = validateEntry(raw[index], `${basePath}/${String(index)}`, issues);
    if (entry !== undefined) {
      entries.push(entry);
    }
  }
  if (entries.length !== raw.length) {
    return undefined;
  }
  return entries;
}

export function validateSprint3MentorshipEntrypointRuntimeState(
  input: unknown,
): ValidationResult<Sprint3MentorshipEntrypointRuntimeState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_KEYS, "", issues);

  const schemaVersion = object["schemaVersion"];
  if (
    typeof schemaVersion !== "string" ||
    !SUPPORTED_SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_SCHEMA_VERSIONS.includes(
      schemaVersion as (typeof SUPPORTED_SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_SCHEMA_VERSIONS)[number],
    )
  ) {
    issues.push({
      path: "/schemaVersion",
      message: "unsupported mentorship entrypoint runtime schemaVersion",
      actual: schemaVersion,
      expected: SUPPORTED_SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_SCHEMA_VERSIONS.join(" | "),
    });
  }
  const processorId = object["processorId"];
  if (processorId !== SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID) {
    issues.push({
      path: "/processorId",
      message: "processorId must match mentorship entrypoint runtime contract",
      actual: processorId,
      expected: SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID,
    });
  }

  const pendingEnrollmentBoundaries = snapshotDenseArrayOrFail(
    object["pendingEnrollmentBoundaries"],
    "/pendingEnrollmentBoundaries",
    issues,
  );
  const pendingExplicitWeeklyTeachRecords = snapshotDenseArrayOrFail(
    object["pendingExplicitWeeklyTeachRecords"],
    "/pendingExplicitWeeklyTeachRecords",
    issues,
  );

  const mentorshipEntries: Sprint3MentorshipAssignmentEntry[] = [];
  const mentorshipRaw = snapshotDenseArrayOrFail(
    object["mentorshipByChildPersonId"],
    "/mentorshipByChildPersonId",
    issues,
  );
  if (mentorshipRaw !== undefined) {
    for (let index = 0; index < mentorshipRaw.length; index += 1) {
      const entry = validateMentorshipAssignmentEntry(
        mentorshipRaw[index],
        `/mentorshipByChildPersonId/${String(index)}`,
        issues,
      );
      if (entry !== undefined) {
        mentorshipEntries.push(entry);
      }
    }
  }

  const completedEnrollmentOutcomesRaw = snapshotDenseArrayOrFail(
    object["completedEnrollmentOutcomes"],
    "/completedEnrollmentOutcomes",
    issues,
  );
  const completedMasterIntakeOutcomesRaw = snapshotDenseArrayOrFail(
    object["completedMasterIntakeOutcomes"],
    "/completedMasterIntakeOutcomes",
    issues,
  );
  const completedExplicitWeeklyTeachOutcomesRaw = snapshotDenseArrayOrFail(
    object["completedExplicitWeeklyTeachOutcomes"],
    "/completedExplicitWeeklyTeachOutcomes",
    issues,
  );

  const completedEnrollmentOutcomes = parseValidatedCompletedHistoryEntries(
    completedEnrollmentOutcomesRaw,
    "/completedEnrollmentOutcomes",
    validateCompletedEnrollmentOutcomeEntry,
    issues,
  );
  const completedMasterIntakeOutcomes = parseValidatedCompletedHistoryEntries(
    completedMasterIntakeOutcomesRaw,
    "/completedMasterIntakeOutcomes",
    validateCompletedMasterIntakeOutcomeEntry,
    issues,
  );
  const completedExplicitWeeklyTeachOutcomes = parseValidatedCompletedHistoryEntries(
    completedExplicitWeeklyTeachOutcomesRaw,
    "/completedExplicitWeeklyTeachOutcomes",
    validateCompletedExplicitWeeklyTeachOutcomeEntry,
    issues,
  );

  const lastEnrollmentWeek =
    object["lastProcessedEnrollmentAbsoluteWeek"] === null
      ? null
      : requireSafeIntegerAtLeast(object, "lastProcessedEnrollmentAbsoluteWeek", "", 0, issues);
  const lastTeachWeek =
    object["lastProcessedExplicitTeachAbsoluteWeek"] === null
      ? null
      : requireSafeIntegerAtLeast(object, "lastProcessedExplicitTeachAbsoluteWeek", "", 0, issues);

  let enrollmentParentRebellionChildPersonIds: PersonId[] = [];
  if (object["enrollmentParentRebellionChildPersonIds"] !== undefined) {
    const parsed = parseEnrollmentParentRebellionChildPersonIds(
      object["enrollmentParentRebellionChildPersonIds"],
      "/enrollmentParentRebellionChildPersonIds",
      issues,
    );
    if (parsed !== undefined) {
      enrollmentParentRebellionChildPersonIds = parsed;
    }
  }

  if (mentorshipEntries.length > 0) {
    const seenChildPersonIds = new Set<string>();
    for (let index = 0; index < mentorshipEntries.length; index += 1) {
      const childPersonId = mentorshipEntries[index]!.childPersonId;
      if (seenChildPersonIds.has(childPersonId)) {
        issues.push({
          path: `/mentorshipByChildPersonId/${String(index)}/childPersonId`,
          message: "duplicate childPersonId in mentorshipByChildPersonId",
          actual: childPersonId,
        });
      }
      seenChildPersonIds.add(childPersonId);
    }
  }

  if (
    issues.length > 0 ||
    pendingEnrollmentBoundaries === undefined ||
    pendingExplicitWeeklyTeachRecords === undefined ||
    completedEnrollmentOutcomes === undefined ||
    completedMasterIntakeOutcomes === undefined ||
    completedExplicitWeeklyTeachOutcomes === undefined
  ) {
    return failure(issues);
  }

  mentorshipEntries.sort((left, right) =>
    compareUnicodeCodePoints(left.childPersonId, right.childPersonId),
  );

  const frozen = deepFreezePlainJson({
    schemaVersion: SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_STATE_SCHEMA_VERSION,
    processorId: SPRINT3_MENTORSHIP_ENTRYPOINT_RUNTIME_PROCESSOR_ID,
    pendingEnrollmentBoundaries: cloneValidatedPlainJson(pendingEnrollmentBoundaries),
    pendingExplicitWeeklyTeachRecords: cloneValidatedPlainJson(pendingExplicitWeeklyTeachRecords),
    mentorshipByChildPersonId: mentorshipEntries,
    completedEnrollmentOutcomes,
    completedMasterIntakeOutcomes,
    completedExplicitWeeklyTeachOutcomes,
    lastProcessedEnrollmentAbsoluteWeek: lastEnrollmentWeek ?? null,
    lastProcessedExplicitTeachAbsoluteWeek: lastTeachWeek ?? null,
    enrollmentParentRebellionChildPersonIds,
  }) as Sprint3MentorshipEntrypointRuntimeState;

  return success(frozen);
}

export function lookupMentorshipRelationKindForChild(
  runtime: Sprint3MentorshipEntrypointRuntimeState | undefined,
  childPersonId: PersonId,
): MentorshipRelationKind | undefined {
  if (runtime === undefined) {
    return undefined;
  }
  const entry = runtime.mentorshipByChildPersonId.find(
    (candidate) => candidate.childPersonId === childPersonId,
  );
  return entry?.mentorshipRelationKind;
}

export function cloneMentorshipEntrypointRuntimeState(
  state: Sprint3MentorshipEntrypointRuntimeState,
): Sprint3MentorshipEntrypointRuntimeState {
  return cloneValidatedPlainJson(state);
}
