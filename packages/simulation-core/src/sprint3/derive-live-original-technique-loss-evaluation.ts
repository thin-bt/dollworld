/**
 * S03-020 live derivation: world/person technique + mentorship successor state → loss evaluation input.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import type { WorldEngineState } from "../world-engine/types.js";
import type { Sprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type {
  OriginalTechniqueFoundingHistoryRecord,
  OriginalTechniqueLossEvaluationRecord,
  OriginalTechniqueLossHistoryRecord,
} from "./types.js";

const REGISTERED_SUCCESSOR_ENROLLMENT_KINDS = new Set([
  "formal_master_assigned",
  "parent_master_assigned",
]);

function personKnowsTechnique(person: Person, techniqueId: string): boolean {
  const states = person.sprint1State?.techniqueStates;
  if (states === undefined) {
    return false;
  }
  for (const entry of states) {
    if (entry !== undefined && entry.techniqueId === techniqueId) {
      return true;
    }
  }
  return false;
}

function isLivingPerson(person: Person): boolean {
  return person.lifeStatus === "living";
}

export function countLivingPractitionersForTechnique(
  worldState: WorldEngineState,
  techniqueId: string,
): number {
  let count = 0;
  for (const person of worldState.persons) {
    if (isLivingPerson(person) && personKnowsTechnique(person, techniqueId)) {
      count += 1;
    }
  }
  return count;
}

export function resolveRegisteredSuccessorPersonIds(input: {
  founderPersonId: string;
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState | undefined;
}): readonly string[] {
  if (input.mentorshipRuntime === undefined) {
    return [];
  }
  const successorIds: string[] = [];
  for (const entry of input.mentorshipRuntime.mentorshipByChildPersonId) {
    if (entry.selectedMasterPersonId !== input.founderPersonId) {
      continue;
    }
    if (!REGISTERED_SUCCESSOR_ENROLLMENT_KINDS.has(entry.enrollmentOutcomeKind)) {
      continue;
    }
    successorIds.push(entry.childPersonId);
  }
  successorIds.sort(compareUnicodeCodePoints);
  const unique: string[] = [];
  for (const personId of successorIds) {
    if (unique.length === 0 || unique[unique.length - 1] !== personId) {
      unique.push(personId);
    }
  }
  return unique;
}

export function countLivingSuccessorPractitioners(input: {
  worldState: WorldEngineState;
  techniqueId: string;
  registeredSuccessorPersonIds: readonly string[];
}): number {
  let count = 0;
  for (const successorPersonId of input.registeredSuccessorPersonIds) {
    const person = input.worldState.persons.find(
      (candidate) => candidate.personId === successorPersonId,
    );
    if (person === undefined) {
      continue;
    }
    if (isLivingPerson(person) && personKnowsTechnique(person, input.techniqueId)) {
      count += 1;
    }
  }
  return count;
}

export function listTrackedOriginalTechniqueIds(input: {
  foundingHistories: readonly OriginalTechniqueFoundingHistoryRecord[];
  lossHistories: readonly OriginalTechniqueLossHistoryRecord[];
}): readonly string[] {
  const lost = new Set(input.lossHistories.map((record) => record.techniqueId));
  const techniqueIds = new Set<string>();
  for (const history of input.foundingHistories) {
    if (!lost.has(history.newTechniqueId)) {
      techniqueIds.add(history.newTechniqueId);
    }
  }
  return [...techniqueIds].sort(compareUnicodeCodePoints);
}

export function buildOriginalTechniqueLossEvaluationRecord(input: {
  techniqueId: string;
  founderPersonId: string;
  worldState: WorldEngineState;
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState | undefined;
}): OriginalTechniqueLossEvaluationRecord {
  const registeredSuccessorPersonIds = resolveRegisteredSuccessorPersonIds({
    founderPersonId: input.founderPersonId,
    mentorshipRuntime: input.mentorshipRuntime,
  });
  return {
    techniqueId: input.techniqueId,
    livingPractitionerCount: countLivingPractitionersForTechnique(
      input.worldState,
      input.techniqueId,
    ),
    registeredSuccessorPersonIds,
    livingSuccessorPractitionerCount: countLivingSuccessorPractitioners({
      worldState: input.worldState,
      techniqueId: input.techniqueId,
      registeredSuccessorPersonIds,
    }),
  };
}
