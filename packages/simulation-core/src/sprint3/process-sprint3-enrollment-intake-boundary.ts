/**
 * S03-012 world step 4 adapter: S03-004 intake decisions + S03-003 enrollment assignment persistence.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { WeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import {
  evaluateEnrollmentAssignment,
  isEnrollmentAssignmentAiEnabled,
} from "./evaluate-enrollment-assignment.js";
import { evaluateMasterIntakeDecision } from "./evaluate-master-intake.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  type Sprint3CompletedEnrollmentOutcomeEntry,
  type Sprint3CompletedMasterIntakeOutcomeEntry,
  type Sprint3MentorshipAssignmentEntry,
  type Sprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type {
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  MasterIntakeAcceptance,
  Sprint3Config,
} from "./types.js";

export type ProcessSprint3EnrollmentIntakeBoundaryInput = {
  absoluteWeek: number;
  sprint3Config?: Sprint3Config;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

export type ProcessSprint3EnrollmentIntakeBoundaryResult = {
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

function discipleCountForMaster(
  sidecars: WeeklyTrainingSidecarState,
  masterPersonId: string,
): number {
  const entry = sidecars.entries.find((candidate) => candidate.personId === masterPersonId);
  return entry?.discipleCount ?? 0;
}

function applyMasterDiscipleIncrement(
  sidecars: WeeklyTrainingSidecarState,
  masterPersonId: PersonId,
): ValidationResult<WeeklyTrainingSidecarState> {
  const updatedEntries = sidecars.entries.map((entry) => {
    if (entry.personId !== masterPersonId) {
      return cloneValidatedPlainJson(entry);
    }
    return cloneValidatedPlainJson({
      ...entry,
      discipleCount: entry.discipleCount + 1,
    });
  });
  return validateWeeklyTrainingSidecarState({
    schemaVersion: sidecars.schemaVersion,
    entries: updatedEntries,
  });
}

function resolveIntakeAcceptanceForCandidate(
  config: Sprint3Config,
  record: EnrollmentAssignmentRecord,
  candidate: EnrollmentMasterCandidate,
  sidecars: WeeklyTrainingSidecarState,
  absoluteWeek: number,
  intakeLog: Sprint3CompletedMasterIntakeOutcomeEntry[],
  issues: ValidationIssue[],
): MasterIntakeAcceptance | undefined {
  if (config.masterIntake === undefined) {
    return candidate.intakeAcceptance;
  }
  const intakeRecord = {
    masterPersonId: candidate.masterPersonId,
    currentFormalDiscipleCount: discipleCountForMaster(sidecars, candidate.masterPersonId),
    teachingAbilityScore: candidate.teachingEfficiencyScore,
    successorOrientationScore: 0,
    massDiscipleToleranceScore: 0,
    applicant: {
      childPersonId: record.childPersonId,
      lineageAptitudeScore: candidate.lineageAptitudeScore,
      parentChildCompatibilityScore: candidate.parentChildCompatibilityScore,
    },
  };
  const intakeOutcome = evaluateMasterIntakeDecision(config, intakeRecord);
  if (!intakeOutcome.ok) {
    issues.push({
      path: "/masterIntake",
      message: "evaluateMasterIntakeDecision failed for enrollment candidate",
      actual: intakeOutcome.issues,
    });
    return undefined;
  }
  intakeLog.push({
    absoluteWeek,
    masterPersonId: candidate.masterPersonId as PersonId,
    childPersonId: record.childPersonId as PersonId,
    outcome: intakeOutcome.value,
  });
  return intakeOutcome.value.acceptance;
}

function replaceMentorshipAssignment(
  entries: readonly Sprint3MentorshipAssignmentEntry[],
  next: Sprint3MentorshipAssignmentEntry,
): Sprint3MentorshipAssignmentEntry[] {
  const without = entries.filter((entry) => entry.childPersonId !== next.childPersonId);
  const merged = [...without, next];
  merged.sort((left, right) => compareUnicodeCodePoints(left.childPersonId, right.childPersonId));
  return merged;
}

/**
 * Drain pending enrollment boundary records, evaluate intake + assignment, persist sidecar/runtime.
 */
export function processSprint3EnrollmentIntakeBoundary(
  input: ProcessSprint3EnrollmentIntakeBoundaryInput,
): ValidationResult<ProcessSprint3EnrollmentIntakeBoundaryResult> {
  if (
    input.sprint3Config === undefined ||
    !isEnrollmentAssignmentAiEnabled(input.sprint3Config) ||
    input.runtimeState === undefined
  ) {
    return success({
      weeklyTrainingSidecars: input.weeklyTrainingSidecars,
      runtimeState: input.runtimeState,
    });
  }

  if (input.runtimeState.pendingEnrollmentBoundaries.length === 0) {
    return success({
      weeklyTrainingSidecars: input.weeklyTrainingSidecars,
      runtimeState: input.runtimeState,
    });
  }

  let sidecars = input.weeklyTrainingSidecars;
  let runtime = cloneValidatedPlainJson(input.runtimeState);
  const validatedRuntime = validateSprint3MentorshipEntrypointRuntimeState(runtime);
  if (!validatedRuntime.ok) {
    return failure(
      validatedRuntime.issues.map((issue) => ({
        ...issue,
        path: `/mentorshipEntrypointRuntime${issue.path}`,
      })),
    );
  }
  runtime = validatedRuntime.value;

  const enrollmentOutcomes: Sprint3CompletedEnrollmentOutcomeEntry[] = [
    ...runtime.completedEnrollmentOutcomes,
  ];
  const intakeOutcomes: Sprint3CompletedMasterIntakeOutcomeEntry[] = [
    ...runtime.completedMasterIntakeOutcomes,
  ];
  let mentorshipAssignments = [...runtime.mentorshipByChildPersonId];
  const issues: ValidationIssue[] = [];

  for (const pending of input.runtimeState.pendingEnrollmentBoundaries) {
    const candidatesWithIntake: EnrollmentMasterCandidate[] = [];
    for (const candidate of pending.masterCandidates) {
      const acceptance = resolveIntakeAcceptanceForCandidate(
        input.sprint3Config,
        pending,
        candidate,
        sidecars,
        input.absoluteWeek,
        intakeOutcomes,
        issues,
      );
      if (acceptance === undefined) {
        return failure(issues);
      }
      candidatesWithIntake.push({
        ...candidate,
        intakeAcceptance: acceptance,
      });
    }

    const recordWithIntake: EnrollmentAssignmentRecord = {
      ...pending,
      masterCandidates: candidatesWithIntake,
    };
    const assignment = evaluateEnrollmentAssignment(input.sprint3Config, recordWithIntake);
    if (!assignment.ok) {
      return failure(
        assignment.issues.map((issue) => ({
          ...issue,
          path: `/enrollmentAssignment${issue.path}`,
        })),
      );
    }

    enrollmentOutcomes.push({
      absoluteWeek: input.absoluteWeek,
      childPersonId: pending.childPersonId as PersonId,
      outcome: assignment.value,
    });

    const outcome = assignment.value;
    if (
      (outcome.kind === "parent_master_assigned" || outcome.kind === "formal_master_assigned") &&
      outcome.selectedMasterPersonId !== undefined
    ) {
      const incremented = applyMasterDiscipleIncrement(
        sidecars,
        outcome.selectedMasterPersonId as PersonId,
      );
      if (!incremented.ok) {
        return failure(
          incremented.issues.map((issue) => ({
            ...issue,
            path: `/weeklyTrainingSidecars${issue.path}`,
          })),
        );
      }
      sidecars = incremented.value;
      mentorshipAssignments = replaceMentorshipAssignment(mentorshipAssignments, {
        childPersonId: pending.childPersonId as PersonId,
        selectedMasterPersonId: outcome.selectedMasterPersonId as PersonId,
        ...(outcome.mentorshipRelationKind === undefined
          ? {}
          : { mentorshipRelationKind: outcome.mentorshipRelationKind }),
        enrollmentOutcomeKind: outcome.kind,
        assignedAbsoluteWeek: input.absoluteWeek,
      });
    } else if (outcome.kind === "parent_temporary_guidance" && outcome.selectedMasterPersonId) {
      mentorshipAssignments = replaceMentorshipAssignment(mentorshipAssignments, {
        childPersonId: pending.childPersonId as PersonId,
        selectedMasterPersonId: outcome.selectedMasterPersonId as PersonId,
        ...(outcome.mentorshipRelationKind === undefined
          ? {}
          : { mentorshipRelationKind: outcome.mentorshipRelationKind }),
        enrollmentOutcomeKind: outcome.kind,
        assignedAbsoluteWeek: input.absoluteWeek,
      });
    } else {
      mentorshipAssignments = replaceMentorshipAssignment(mentorshipAssignments, {
        childPersonId: pending.childPersonId as PersonId,
        enrollmentOutcomeKind: outcome.kind,
        assignedAbsoluteWeek: input.absoluteWeek,
      });
    }
  }

  const nextRuntime = deepFreezePlainJson({
    ...runtime,
    pendingEnrollmentBoundaries: [],
    mentorshipByChildPersonId: mentorshipAssignments,
    completedEnrollmentOutcomes: enrollmentOutcomes,
    completedMasterIntakeOutcomes: intakeOutcomes,
    lastProcessedEnrollmentAbsoluteWeek: input.absoluteWeek,
  });
  const validatedNext = validateSprint3MentorshipEntrypointRuntimeState(nextRuntime);
  if (!validatedNext.ok) {
    return failure(
      validatedNext.issues.map((issue) => ({
        ...issue,
        path: `/mentorshipEntrypointRuntime${issue.path}`,
      })),
    );
  }

  return success({
    weeklyTrainingSidecars: sidecars,
    runtimeState: validatedNext.value,
  });
}

export function ensureMentorshipEntrypointRuntimeState(
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined,
): Sprint3MentorshipEntrypointRuntimeState {
  return runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState();
}
