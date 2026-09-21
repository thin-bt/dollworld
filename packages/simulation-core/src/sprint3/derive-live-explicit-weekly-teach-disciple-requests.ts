/**
 * S03-021 live derivation: mentorship + sidecars → explicit weekly teach disciple requests.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { buildWeeklyTrainingPersonRecords } from "../sprint1/sprint1-person-sidecar-records.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import { evaluateTechniqueAcquisitionConditions } from "../sprint1/technique-acquisition.js";
import { deriveRequiredStatsFactor } from "../sprint1/technique-required-stats-factor.js";
import type { Sprint1Config } from "../sprint1/types.js";
import type { WeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import {
  buildLearningTechniqueCandidates,
  computeLearningTargetScoreHundredths,
} from "../sprint1/weekly-target-selection.js";
import {
  resolveStyleMatch,
  type TechniqueTargetContext,
  type WeeklyTrainingPersonRecord,
} from "../sprint1/weekly-training-types.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  evaluateTechniqueTeachingSelection,
  isTechniqueTeachingSelectionEnabled,
} from "./evaluate-technique-teaching-selection.js";
import type { Sprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type {
  MentorshipRelationKind,
  Sprint3Config,
  TechniqueTeachingSelectionCandidate,
  TechniqueTeachingSelectionRecord,
  WeeklyTeachDiscipleRequest,
  WeeklyTeachEvaluationInputScores,
} from "./types.js";

const ACTIVE_MENTORSHIP_ENROLLMENT_KINDS = new Set([
  "formal_master_assigned",
  "parent_master_assigned",
]);

function listDisciplesForMaster(
  runtime: Sprint3MentorshipEntrypointRuntimeState,
  masterPersonId: PersonId,
): readonly { disciplePersonId: PersonId; mentorshipRelationKind: MentorshipRelationKind }[] {
  const pairs: {
    disciplePersonId: PersonId;
    mentorshipRelationKind: MentorshipRelationKind;
  }[] = [];
  for (const entry of runtime.mentorshipByChildPersonId) {
    if (entry.selectedMasterPersonId !== masterPersonId) {
      continue;
    }
    if (!ACTIVE_MENTORSHIP_ENROLLMENT_KINDS.has(entry.enrollmentOutcomeKind)) {
      continue;
    }
    if (entry.mentorshipRelationKind === undefined) {
      continue;
    }
    pairs.push({
      disciplePersonId: entry.childPersonId,
      mentorshipRelationKind: entry.mentorshipRelationKind,
    });
  }
  pairs.sort((left, right) =>
    compareUnicodeCodePoints(left.disciplePersonId, right.disciplePersonId),
  );
  return pairs;
}

function techniqueStateById(
  record: WeeklyTrainingPersonRecord,
  techniqueId: string,
): { acquiredAbsoluteWeek: number | null; learningProgressTenths: number } | undefined {
  const states = record.person.sprint1State?.techniqueStates;
  if (states === undefined) {
    return undefined;
  }
  for (const state of states) {
    if (state.techniqueId === techniqueId) {
      return state;
    }
  }
  return undefined;
}

function masterHasAcquiredTechnique(
  masterRecord: WeeklyTrainingPersonRecord,
  techniqueId: string,
): boolean {
  const state = techniqueStateById(masterRecord, techniqueId);
  return state !== undefined && state.acquiredAbsoluteWeek !== null;
}

function contextById(
  contexts: readonly TechniqueTargetContext[],
  techniqueId: string,
): TechniqueTargetContext | undefined {
  return contexts.find((entry) => entry.techniqueId === techniqueId);
}

function scoreHundredthsToPercent(scoreHundredths: number): number {
  return Math.max(0, Math.min(100, Math.floor(scoreHundredths / 100)));
}

function deriveEvaluationInputs(input: {
  definition: TechniqueDefinition;
  context: TechniqueTargetContext;
  discipleRecord: WeeklyTrainingPersonRecord;
  sprint1Config: Sprint1Config;
}): ValidationResult<WeeklyTeachEvaluationInputScores> {
  const person = input.discipleRecord.person;
  const sprint1State = person.sprint1State;
  if (sprint1State === undefined) {
    return failure([
      {
        path: "/disciple/sprint1State",
        message: "disciple sprint1State is required for explicit teach score derivation",
      },
    ]);
  }
  const learner = {
    abilities: person.abilities,
    aptitudes: person.aptitudes,
    techniqueStates: sprint1State.techniqueStates,
  };
  const acquisition = evaluateTechniqueAcquisitionConditions(input.definition, learner);
  if (!acquisition.ok) {
    return acquisition;
  }
  const requiredStatsFactor = deriveRequiredStatsFactor(input.definition, person.abilities);
  if (!requiredStatsFactor.ok) {
    return requiredStatsFactor;
  }
  const state = techniqueStateById(input.discipleRecord, input.definition.techniqueId);
  const learningScore = computeLearningTargetScoreHundredths(
    {
      domainAptitude: person.aptitudes[input.definition.category].surfaceValue,
      requiredStatsFactorBasisPoints: requiredStatsFactor.value,
      learningProgressTenths: state?.learningProgressTenths ?? 0,
      learningProgressRequired: input.definition.learningProgressRequired,
      teacherCanTeach: true,
      styleMatch: resolveStyleMatch(input.context),
    },
    input.sprint1Config,
  );
  if (!learningScore.ok) {
    return learningScore;
  }
  const learningPercent = scoreHundredthsToPercent(learningScore.value);
  return success({
    styleMatchScore: resolveStyleMatch(input.context),
    requirementsMetScore: acquisition.value.allConditionsMet ? 100 : 0,
    trustAndCompatibilityScore: learningPercent,
    tacticalNeedScore: learningPercent,
    successionPriorityScore: learningPercent,
    secrecyAndLoyaltyPenalty: 0,
  });
}

function discipleHasIncompletePriorFocus(discipleRecord: WeeklyTrainingPersonRecord): boolean {
  const focusId = discipleRecord.person.sprint1State?.learningFocusTechniqueId;
  if (focusId === null || focusId === undefined) {
    return false;
  }
  const state = techniqueStateById(discipleRecord, focusId);
  return state === undefined || state.acquiredAbsoluteWeek === null;
}

function buildTeachingSelectionRecord(input: {
  masterPersonId: PersonId;
  disciplePersonId: PersonId;
  mentorshipRelationKind: MentorshipRelationKind;
  masterRecord: WeeklyTrainingPersonRecord;
  discipleRecord: WeeklyTrainingPersonRecord;
  techniqueCatalog: TechniqueCatalog;
  sprint1Config: Sprint1Config;
}): ValidationResult<TechniqueTeachingSelectionRecord> {
  const person = input.discipleRecord.person;
  const sprint1State = person.sprint1State;
  if (sprint1State === undefined) {
    return failure([
      {
        path: "/disciple/sprint1State",
        message: "disciple sprint1State is required for explicit teach selection record",
      },
    ]);
  }

  const learningCandidates = buildLearningTechniqueCandidates(
    input.discipleRecord,
    input.techniqueCatalog,
    input.sprint1Config,
  );
  if (!learningCandidates.ok) {
    return learningCandidates;
  }

  const candidates: TechniqueTeachingSelectionCandidate[] = [];
  const incompleteFocus = discipleHasIncompletePriorFocus(input.discipleRecord);

  for (const learningCandidate of learningCandidates.value) {
    const techniqueId = learningCandidate.techniqueId;
    if (!masterHasAcquiredTechnique(input.masterRecord, techniqueId)) {
      continue;
    }
    const context = contextById(input.discipleRecord.techniqueTargetContexts, techniqueId);
    if (context === undefined) {
      continue;
    }
    const definition = input.techniqueCatalog.definitions.find(
      (entry) => entry.techniqueId === techniqueId,
    );
    if (definition === undefined) {
      continue;
    }
    const evaluationInputs = deriveEvaluationInputs({
      definition,
      context,
      discipleRecord: input.discipleRecord,
      sprint1Config: input.sprint1Config,
    });
    if (!evaluationInputs.ok) {
      return evaluationInputs;
    }
    candidates.push({
      techniqueId,
      teacherCanTeachContext: context.teacherCanTeachContext,
      evaluationInputs: evaluationInputs.value,
      ...(incompleteFocus ? { discipleHasIncompletePriorFocus: true } : {}),
    });
  }

  candidates.sort((left, right) => compareUnicodeCodePoints(left.techniqueId, right.techniqueId));

  return success({
    masterPersonId: input.masterPersonId,
    disciplePersonId: input.disciplePersonId,
    mentorshipRelationKind: input.mentorshipRelationKind,
    discipleLearnerContext: {
      abilities: person.abilities,
      aptitudes: person.aptitudes,
      techniqueStates: sprint1State.techniqueStates,
    },
    candidates,
  });
}

function pickTechniqueIdForDisciple(input: {
  sprint3Config: Sprint3Config;
  selectionRecord: TechniqueTeachingSelectionRecord;
  techniqueDefinitionsById: ReadonlyMap<string, TechniqueDefinition>;
}): string | undefined {
  if (isTechniqueTeachingSelectionEnabled(input.sprint3Config)) {
    const selection = evaluateTechniqueTeachingSelection(
      input.sprint3Config,
      input.selectionRecord,
      input.techniqueDefinitionsById,
    );
    if (!selection.ok || selection.value.rankedCandidates.length === 0) {
      return undefined;
    }
    const sorted = [...selection.value.rankedCandidates].sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }
      return compareUnicodeCodePoints(left.techniqueId, right.techniqueId);
    });
    return sorted[0]?.techniqueId;
  }

  let best: { techniqueId: string; score: number } | undefined;
  for (const candidate of input.selectionRecord.candidates) {
    const score = candidate.evaluationInputs.styleMatchScore;
    if (
      best === undefined ||
      score > best.score ||
      (score === best.score &&
        compareUnicodeCodePoints(candidate.techniqueId, best.techniqueId) < 0)
    ) {
      best = { techniqueId: candidate.techniqueId, score };
    }
  }
  return best?.techniqueId;
}

export function deriveLiveExplicitWeeklyTeachDiscipleRequests(input: {
  masterPersonId: PersonId;
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState;
  sprint3Config: Sprint3Config;
  sprint1Config: Sprint1Config;
  techniqueCatalog: TechniqueCatalog;
}): ValidationResult<readonly WeeklyTeachDiscipleRequest[]> {
  const recordsResult = buildWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    input.mentorshipRuntime,
  );
  if (!recordsResult.ok) {
    return failure(recordsResult.issues);
  }
  const recordByPersonId = new Map(
    recordsResult.value.map((record) => [record.person.personId, record]),
  );
  const masterRecord = recordByPersonId.get(input.masterPersonId);
  if (masterRecord === undefined) {
    return success([]);
  }

  const techniqueDefinitionsById = new Map<string, TechniqueDefinition>();
  for (const definition of input.techniqueCatalog.definitions) {
    techniqueDefinitionsById.set(definition.techniqueId, definition);
  }

  const requests: WeeklyTeachDiscipleRequest[] = [];
  for (const pair of listDisciplesForMaster(input.mentorshipRuntime, input.masterPersonId)) {
    const discipleRecord = recordByPersonId.get(pair.disciplePersonId);
    if (discipleRecord === undefined) {
      continue;
    }
    const selectionRecord = buildTeachingSelectionRecord({
      masterPersonId: input.masterPersonId,
      disciplePersonId: pair.disciplePersonId,
      mentorshipRelationKind: pair.mentorshipRelationKind,
      masterRecord,
      discipleRecord,
      techniqueCatalog: input.techniqueCatalog,
      sprint1Config: input.sprint1Config,
    });
    if (!selectionRecord.ok) {
      return selectionRecord;
    }
    const techniqueId = pickTechniqueIdForDisciple({
      sprint3Config: input.sprint3Config,
      selectionRecord: selectionRecord.value,
      techniqueDefinitionsById,
    });
    if (techniqueId === undefined) {
      continue;
    }
    const context = contextById(discipleRecord.techniqueTargetContexts, techniqueId);
    const definition = techniqueDefinitionsById.get(techniqueId);
    if (context === undefined || definition === undefined) {
      continue;
    }
    const evaluationInputs = deriveEvaluationInputs({
      definition,
      context,
      discipleRecord,
      sprint1Config: input.sprint1Config,
    });
    if (!evaluationInputs.ok) {
      return evaluationInputs;
    }
    requests.push({
      disciplePersonId: pair.disciplePersonId,
      techniqueId,
      learningTier: definition.learningTier,
      teacherCanTeachContext: context.teacherCanTeachContext,
      mentorshipRelationKind: pair.mentorshipRelationKind,
      evaluationInputs: evaluationInputs.value,
      ...(discipleHasIncompletePriorFocus(discipleRecord)
        ? { discipleHasIncompletePriorFocus: true }
        : {}),
    });
  }

  requests.sort((left, right) => {
    const discipleCompare = compareUnicodeCodePoints(left.disciplePersonId, right.disciplePersonId);
    if (discipleCompare !== 0) {
      return discipleCompare;
    }
    return compareUnicodeCodePoints(left.techniqueId, right.techniqueId);
  });
  return success(requests);
}
