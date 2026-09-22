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
  MENTORSHIP_RELATION_KINDS,
  isMentorshipRelationKind,
  type EnrollmentAssignmentOutcome,
  type EnrollmentAssignmentRecord,
  type ExplicitWeeklyTeachActionOutcome,
  type ExplicitWeeklyTeachActionRecord,
  type MasterIntakeEvaluationOutcome,
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
  const enrollmentOutcomeKind = object["enrollmentOutcomeKind"];
  if (typeof enrollmentOutcomeKind !== "string") {
    issues.push({
      path: `${path}/enrollmentOutcomeKind`,
      message: "enrollmentOutcomeKind must be a string",
      actual: enrollmentOutcomeKind,
    });
    return undefined;
  }

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

  return {
    childPersonId: asPersonId(childPersonIdRaw),
    ...(selectedMasterPersonId === undefined ? {} : { selectedMasterPersonId }),
    ...(mentorshipRelationKind === undefined ? {} : { mentorshipRelationKind }),
    enrollmentOutcomeKind: enrollmentOutcomeKind as EnrollmentAssignmentOutcome["kind"],
    assignedAbsoluteWeek,
  };
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

  const completedEnrollmentOutcomes = snapshotDenseArrayOrFail(
    object["completedEnrollmentOutcomes"],
    "/completedEnrollmentOutcomes",
    issues,
  );
  const completedMasterIntakeOutcomes = snapshotDenseArrayOrFail(
    object["completedMasterIntakeOutcomes"],
    "/completedMasterIntakeOutcomes",
    issues,
  );
  const completedExplicitWeeklyTeachOutcomes = snapshotDenseArrayOrFail(
    object["completedExplicitWeeklyTeachOutcomes"],
    "/completedExplicitWeeklyTeachOutcomes",
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
    completedEnrollmentOutcomes: cloneValidatedPlainJson(completedEnrollmentOutcomes),
    completedMasterIntakeOutcomes: cloneValidatedPlainJson(completedMasterIntakeOutcomes),
    completedExplicitWeeklyTeachOutcomes: cloneValidatedPlainJson(
      completedExplicitWeeklyTeachOutcomes,
    ),
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
