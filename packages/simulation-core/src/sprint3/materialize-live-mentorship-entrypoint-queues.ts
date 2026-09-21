/**
 * S03-013 live-world materialization for mentorship entrypoint pending queues.
 * Preserves queue-fed replay: prepopulated pending* arrays are kept; live boundaries append only when absent.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { APTITUDE_KEYS } from "../abilities.js";
import type { Person } from "../domain.js";
import type { PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { buildWeeklyTrainingPersonRecords } from "../sprint1/sprint1-person-sidecar-records.js";
import type { WeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import type { WeeklyTrainingPersonRecord } from "../sprint1/weekly-training-types.js";
import { isWeeklyActionPipelineEligible } from "../sprint1/weekly-update-eligibility.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { CompetitiveRecord } from "../sprint2/competitive-record-update.js";
import {
  competitiveRecordForPerson,
  deriveMasterQualificationEvaluationRecordFromPerson,
  isPersonMasterQualificationEligible,
} from "./derive-master-qualification-record.js";
import { isEnrollmentAssignmentAiEnabled } from "./evaluate-enrollment-assignment.js";
import { deriveLiveExplicitWeeklyTeachDiscipleRequests } from "./derive-live-explicit-weekly-teach-disciple-requests.js";
import { isExplicitWeeklyTeachActionEnabled } from "./evaluate-explicit-weekly-teach.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import type { Sprint1Config } from "../sprint1/types.js";
import { evaluateMasterIntakeDecision } from "./evaluate-master-intake.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
  type Sprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type {
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  ExplicitWeeklyTeachActionRecord,
  MasterIntakeAcceptance,
  Sprint3Config,
} from "./types.js";

export type MaterializeLiveEnrollmentQueueInput = {
  absoluteWeek: number;
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  sprint3Config?: Sprint3Config;
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
  competitiveRecordsByPersonId?: ReadonlyMap<PersonId, CompetitiveRecord>;
};

export type MaterializeLiveExplicitTeachQueueInput = {
  absoluteWeek: number;
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  sprint3Config?: Sprint3Config;
  sprint1Config?: Sprint1Config;
  techniqueCatalog?: TechniqueCatalog;
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

function meanSurfaceAptitude(person: Person): number {
  let sum = 0;
  for (const key of APTITUDE_KEYS) {
    sum += person.aptitudes[key].surfaceValue;
  }
  return Math.floor(sum / APTITUDE_KEYS.length);
}

function meanGrowthPotential(record: WeeklyTrainingPersonRecord): number {
  const values = Object.values(record.growthPotential);
  let sum = 0;
  for (const entry of values) {
    sum += entry;
  }
  return Math.floor(sum / values.length);
}

function buildMasterCandidate(
  masterPerson: Person,
  childPerson: Person,
  isBiologicalParent: boolean,
  masterRecord: WeeklyTrainingPersonRecord | undefined,
  competitiveRecordsByPersonId: ReadonlyMap<PersonId, CompetitiveRecord> | undefined,
): EnrollmentMasterCandidate {
  const childAptitude = meanSurfaceAptitude(childPerson);
  const masterAptitude = meanSurfaceAptitude(masterPerson);
  const compatibility = Math.max(0, Math.min(100, 100 - Math.abs(childAptitude - masterAptitude)));
  const lineageAptitude =
    masterPerson.lineageId !== undefined &&
    childPerson.lineageId !== undefined &&
    masterPerson.lineageId === childPerson.lineageId
      ? childAptitude
      : Math.max(0, childAptitude - 10);
  const teachingEfficiencyScore =
    masterRecord === undefined ? masterAptitude : meanGrowthPotential(masterRecord);
  return {
    masterPersonId: masterPerson.personId,
    isBiologicalParent,
    qualificationRecord: (() => {
      const competitiveRecord = competitiveRecordForPerson(
        masterPerson.personId,
        competitiveRecordsByPersonId,
      );
      return deriveMasterQualificationEvaluationRecordFromPerson({
        person: masterPerson,
        ...(competitiveRecord === undefined ? {} : { competitiveRecord }),
      });
    })(),
    parentChildCompatibilityScore: compatibility,
    lineageAptitudeScore: lineageAptitude,
    schoolFitScore: lineageAptitude,
    teachingEfficiencyScore,
    intakeAcceptance: "accept" as MasterIntakeAcceptance,
  };
}

function discipleCountForMaster(
  sidecars: WeeklyTrainingSidecarState,
  masterPersonId: string,
): number {
  const entry = sidecars.entries.find((candidate) => candidate.personId === masterPersonId);
  return entry?.discipleCount ?? 0;
}

function resolveLiveMaterializedIntakeAcceptance(
  config: Sprint3Config,
  childPersonId: PersonId,
  candidate: EnrollmentMasterCandidate,
  sidecars: WeeklyTrainingSidecarState,
): ValidationResult<MasterIntakeAcceptance> {
  if (config.masterIntake === undefined) {
    return success("accept");
  }
  const intakeOutcome = evaluateMasterIntakeDecision(config, {
    masterPersonId: candidate.masterPersonId,
    currentFormalDiscipleCount: discipleCountForMaster(sidecars, candidate.masterPersonId),
    teachingAbilityScore: candidate.teachingEfficiencyScore,
    successorOrientationScore: 0,
    massDiscipleToleranceScore: 0,
    applicant: {
      childPersonId,
      lineageAptitudeScore: candidate.lineageAptitudeScore,
      parentChildCompatibilityScore: candidate.parentChildCompatibilityScore,
    },
  });
  if (!intakeOutcome.ok) {
    return failure(intakeOutcome.issues);
  }
  return success(intakeOutcome.value.acceptance);
}

function isLivingParticipatingPerson(person: Person): boolean {
  if (person.lifeStatus !== "living") {
    return false;
  }
  if (person.participationStatus === "waiting" || person.participationStatus === "stopped") {
    return false;
  }
  return true;
}

function parentIdsForChild(worldState: WorldEngineState, childPersonId: PersonId): Set<PersonId> {
  const ids = new Set<PersonId>();
  for (const relationship of worldState.relationships) {
    if (relationship.kind === "parent_child" && relationship.childId === childPersonId) {
      ids.add(relationship.parentId);
    }
  }
  return ids;
}

function eligibleNonParentFormalMastersForChild(
  worldState: WorldEngineState,
  childPersonId: PersonId,
  sprint3Config: Sprint3Config,
  competitiveRecordsByPersonId: ReadonlyMap<PersonId, CompetitiveRecord> | undefined,
): Person[] {
  const parentIds = parentIdsForChild(worldState, childPersonId);
  const masters: Person[] = [];
  for (const person of worldState.persons) {
    if (person.personId === childPersonId) {
      continue;
    }
    if (parentIds.has(person.personId)) {
      continue;
    }
    if (!isLivingParticipatingPerson(person)) {
      continue;
    }
    if (
      !isPersonMasterQualificationEligible(
        sprint3Config,
        person,
        competitiveRecordForPerson(person.personId, competitiveRecordsByPersonId),
      )
    ) {
      continue;
    }
    masters.push(person);
  }
  masters.sort((left, right) => compareUnicodeCodePoints(left.personId, right.personId));
  return masters;
}

function livingParentsForChild(worldState: WorldEngineState, childPersonId: PersonId): Person[] {
  const parents: Person[] = [];
  for (const relationship of worldState.relationships) {
    if (relationship.kind !== "parent_child" || relationship.childId !== childPersonId) {
      continue;
    }
    const parent = worldState.persons.find((person) => person.personId === relationship.parentId);
    if (parent === undefined || parent.lifeStatus !== "living") {
      continue;
    }
    if (parent.participationStatus === "waiting" || parent.participationStatus === "stopped") {
      continue;
    }
    parents.push(parent);
  }
  parents.sort((left, right) => compareUnicodeCodePoints(left.personId, right.personId));
  return parents;
}

function isEnrollmentBoundaryChild(person: Person, formalEnrollmentMinAge: number): boolean {
  if (person.lifeStatus !== "living") {
    return false;
  }
  if (person.participationStatus === "waiting" || person.participationStatus === "stopped") {
    return false;
  }
  if (typeof person.currentAge !== "number" || person.currentAge !== formalEnrollmentMinAge) {
    return false;
  }
  return person.careerStatus === "child" || person.careerStatus === "trainee";
}

function childAlreadyEnrolled(
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  childPersonId: PersonId,
): boolean {
  return runtime.completedEnrollmentOutcomes.some((entry) => entry.childPersonId === childPersonId);
}

function childPendingEnrollment(
  pending: readonly EnrollmentAssignmentRecord[],
  childPersonId: PersonId,
): boolean {
  return pending.some((record) => record.childPersonId === childPersonId);
}

function masterPendingExplicitTeach(
  pending: readonly ExplicitWeeklyTeachActionRecord[],
  masterPersonId: string,
): boolean {
  return pending.some((record) => record.masterPersonId === masterPersonId);
}

function masterCompletedExplicitTeachThisWeek(
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  masterPersonId: string,
  absoluteWeek: number,
): boolean {
  return runtime.completedExplicitWeeklyTeachOutcomes.some(
    (entry) => entry.masterPersonId === masterPersonId && entry.absoluteWeek === absoluteWeek,
  );
}

function masterHasAssignedDisciple(
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  masterPersonId: PersonId,
): boolean {
  return runtime.mentorshipByChildPersonId.some(
    (entry) => entry.selectedMasterPersonId === masterPersonId,
  );
}

function resolveExplicitWeeklyTeachActionSelected(
  record: WeeklyTrainingPersonRecord,
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  input: MaterializeLiveExplicitTeachQueueInput,
): ValidationResult<ExplicitWeeklyTeachActionRecord | undefined> {
  const person = record.person;
  if (person.lifeStatus !== "living") {
    return success(undefined);
  }
  if (record.discipleCount < 1) {
    return success(undefined);
  }
  if (!masterHasAssignedDisciple(runtime, person.personId)) {
    return success(undefined);
  }
  const pipelineEligible = isWeeklyActionPipelineEligible({
    lifeStatus: person.lifeStatus,
    careerStatus: person.careerStatus,
    participationStatus: person.participationStatus,
    currentAge: person.currentAge,
  });
  if (!pipelineEligible) {
    return success(undefined);
  }
  let discipleRequests: ExplicitWeeklyTeachActionRecord["discipleRequests"] = [];
  if (
    input.sprint3Config !== undefined &&
    input.sprint1Config !== undefined &&
    input.techniqueCatalog !== undefined
  ) {
    const derived = deriveLiveExplicitWeeklyTeachDiscipleRequests({
      masterPersonId: person.personId,
      worldState: input.worldState,
      weeklyTrainingSidecars: input.weeklyTrainingSidecars,
      mentorshipRuntime: runtime,
      sprint3Config: input.sprint3Config,
      sprint1Config: input.sprint1Config,
      techniqueCatalog: input.techniqueCatalog,
    });
    if (!derived.ok) {
      return derived;
    }
    discipleRequests = derived.value;
  }
  return success({
    masterPersonId: person.personId,
    masterWeeklyPipelineEligible: true,
    masterFormalDiscipleCount: record.discipleCount,
    teachingAbilityScore: meanGrowthPotential(record),
    selectedWeeklyAction: "teach",
    discipleRequests,
  });
}

/**
 * Append live enrollment boundaries for children at formalEnrollmentMinAge when not already pending/completed.
 */
export function materializeLiveEnrollmentQueueBoundaries(
  input: MaterializeLiveEnrollmentQueueInput,
): ValidationResult<Sprint3MentorshipEntrypointRuntimeState> {
  if (input.sprint3Config === undefined || !isEnrollmentAssignmentAiEnabled(input.sprint3Config)) {
    return success(input.runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState());
  }

  const recordsResult = buildWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    input.runtimeState,
  );
  if (!recordsResult.ok) {
    return failure(recordsResult.issues);
  }
  const recordByPersonId = new Map(
    recordsResult.value.map((record) => [record.person.personId, record]),
  );

  let runtime = cloneValidatedPlainJson(
    input.runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState(),
  );
  const validatedBase = validateSprint3MentorshipEntrypointRuntimeState(runtime);
  if (!validatedBase.ok) {
    return failure(validatedBase.issues);
  }
  runtime = validatedBase.value;

  const formalEnrollmentMinAge = input.sprint3Config.enrollment.formalEnrollmentMinAge;
  const pending = [...runtime.pendingEnrollmentBoundaries];
  const materialized: EnrollmentAssignmentRecord[] = [];

  const children = input.worldState.persons
    .filter((person) => isEnrollmentBoundaryChild(person, formalEnrollmentMinAge))
    .sort((left, right) => compareUnicodeCodePoints(left.personId, right.personId));

  for (const child of children) {
    if (childAlreadyEnrolled(runtime, child.personId)) {
      continue;
    }
    if (childPendingEnrollment(pending, child.personId)) {
      continue;
    }
    const parents = livingParentsForChild(input.worldState, child.personId);
    const parentIdSet = parentIdsForChild(input.worldState, child.personId);
    const nonParentMasters = eligibleNonParentFormalMastersForChild(
      input.worldState,
      child.personId,
      input.sprint3Config,
      input.competitiveRecordsByPersonId,
    );
    const masterCandidates: EnrollmentMasterCandidate[] = [];
    for (const masterPerson of [...parents, ...nonParentMasters]) {
      const isBiologicalParent = parentIdSet.has(masterPerson.personId);
      const baseCandidate = buildMasterCandidate(
        masterPerson,
        child,
        isBiologicalParent,
        recordByPersonId.get(masterPerson.personId),
        input.competitiveRecordsByPersonId,
      );
      const intakeResult = resolveLiveMaterializedIntakeAcceptance(
        input.sprint3Config,
        child.personId,
        baseCandidate,
        input.weeklyTrainingSidecars,
      );
      if (!intakeResult.ok) {
        return failure(intakeResult.issues);
      }
      masterCandidates.push({
        ...baseCandidate,
        intakeAcceptance: intakeResult.value,
      });
    }
    masterCandidates.sort((left, right) =>
      compareUnicodeCodePoints(left.masterPersonId, right.masterPersonId),
    );
    const temporaryGuidanceParentPersonId = parents[0]?.personId;
    const childAge = child.currentAge;
    if (typeof childAge !== "number") {
      continue;
    }
    materialized.push({
      childPersonId: child.personId,
      childAge,
      activeSpecialReasons: [],
      masterCandidates,
      ...(temporaryGuidanceParentPersonId === undefined ? {} : { temporaryGuidanceParentPersonId }),
    });
  }

  if (materialized.length === 0) {
    return success(runtime);
  }

  const nextRuntime = deepFreezePlainJson({
    ...runtime,
    pendingEnrollmentBoundaries: [...pending, ...materialized],
  });
  const validatedNext = validateSprint3MentorshipEntrypointRuntimeState(nextRuntime);
  if (!validatedNext.ok) {
    return failure(validatedNext.issues);
  }
  return success(validatedNext.value);
}

/**
 * Append live explicit-teach records after weekly adapter when master boundary selects teach.
 */
export function materializeLiveExplicitWeeklyTeachQueueRecords(
  input: MaterializeLiveExplicitTeachQueueInput,
): ValidationResult<Sprint3MentorshipEntrypointRuntimeState> {
  if (
    input.sprint3Config === undefined ||
    !isExplicitWeeklyTeachActionEnabled(input.sprint3Config)
  ) {
    return success(input.runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState());
  }

  const recordsResult = buildWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    input.runtimeState,
  );
  if (!recordsResult.ok) {
    return failure(recordsResult.issues);
  }

  let runtime = cloneValidatedPlainJson(
    input.runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState(),
  );
  const validatedBase = validateSprint3MentorshipEntrypointRuntimeState(runtime);
  if (!validatedBase.ok) {
    return failure(validatedBase.issues);
  }
  runtime = validatedBase.value;

  const pending = [...runtime.pendingExplicitWeeklyTeachRecords];
  const materialized: ExplicitWeeklyTeachActionRecord[] = [];

  for (const record of recordsResult.value) {
    if (
      masterPendingExplicitTeach(pending, record.person.personId) ||
      masterPendingExplicitTeach(materialized, record.person.personId)
    ) {
      continue;
    }
    if (masterCompletedExplicitTeachThisWeek(runtime, record.person.personId, input.absoluteWeek)) {
      continue;
    }
    const boundary = resolveExplicitWeeklyTeachActionSelected(record, runtime, input);
    if (!boundary.ok) {
      return failure(
        boundary.issues.map((issue) => ({
          ...issue,
          path: `/liveExplicitTeachQueueMaterialization${issue.path}`,
        })),
      );
    }
    if (boundary.value === undefined) {
      continue;
    }
    materialized.push(boundary.value);
  }

  if (materialized.length === 0) {
    return success(runtime);
  }

  const nextRuntime = deepFreezePlainJson({
    ...runtime,
    pendingExplicitWeeklyTeachRecords: [...pending, ...materialized],
  });
  const validatedNext = validateSprint3MentorshipEntrypointRuntimeState(nextRuntime);
  if (!validatedNext.ok) {
    return failure(validatedNext.issues);
  }
  return success(validatedNext.value);
}
