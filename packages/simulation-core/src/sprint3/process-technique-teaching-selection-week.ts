/**
 * S03-022 weekly world-step: reevaluate and persist live technique teaching-selection snapshots.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { buildWeeklyTrainingPersonRecords } from "../sprint1/sprint1-person-sidecar-records.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import type { Sprint1Config } from "../sprint1/types.js";
import type { WeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import { buildTeachingSelectionRecord } from "./derive-live-explicit-weekly-teach-disciple-requests.js";
import type { GeneratedTechniqueCatalogOverlay } from "./generated-technique-catalog-overlay.js";
import { buildBattleTechniqueDefinitionCatalogMap } from "./generated-technique-battle-catalog.js";
import {
  evaluateTeachingSelectionReEvaluationDue,
  evaluateTechniqueTeachingSelection,
  isTechniqueTeachingSelectionEnabled,
} from "./evaluate-technique-teaching-selection.js";
import type { Sprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createInitialTechniqueTeachingSelectionRuntimeState,
  lookupTechniqueTeachingSelectionPairSnapshot,
  upsertTechniqueTeachingSelectionPairSnapshot,
  validateTechniqueTeachingSelectionRuntimeState,
  type TechniqueTeachingSelectionRuntimeState,
} from "./technique-teaching-selection-runtime-state.js";
import type { MentorshipRelationKind, Sprint3Config } from "./types.js";

const ACTIVE_MENTORSHIP_ENROLLMENT_KINDS = new Set([
  "formal_master_assigned",
  "parent_master_assigned",
  "parent_temporary_guidance",
]);

type LiveMasterDiscipleMentorshipPair = {
  masterPersonId: PersonId;
  disciplePersonId: PersonId;
  mentorshipRelationKind: MentorshipRelationKind;
};

function listLiveMasterDiscipleMentorshipPairs(
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState,
): readonly LiveMasterDiscipleMentorshipPair[] {
  const pairs: {
    masterPersonId: PersonId;
    disciplePersonId: PersonId;
    mentorshipRelationKind: MentorshipRelationKind;
  }[] = [];
  for (const entry of mentorshipRuntime.mentorshipByChildPersonId) {
    if (entry.selectedMasterPersonId === undefined) {
      continue;
    }
    if (!ACTIVE_MENTORSHIP_ENROLLMENT_KINDS.has(entry.enrollmentOutcomeKind)) {
      continue;
    }
    if (entry.mentorshipRelationKind === undefined) {
      continue;
    }
    pairs.push({
      masterPersonId: entry.selectedMasterPersonId,
      disciplePersonId: entry.childPersonId,
      mentorshipRelationKind: entry.mentorshipRelationKind,
    });
  }
  pairs.sort((left, right) => {
    const masterCompare = compareUnicodeCodePoints(left.masterPersonId, right.masterPersonId);
    if (masterCompare !== 0) {
      return masterCompare;
    }
    return compareUnicodeCodePoints(left.disciplePersonId, right.disciplePersonId);
  });
  return pairs;
}

function childEnrolledThisWeek(
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState,
  childPersonId: PersonId,
  absoluteWeek: number,
): boolean {
  return mentorshipRuntime.completedEnrollmentOutcomes.some(
    (entry) => entry.childPersonId === childPersonId && entry.absoluteWeek === absoluteWeek,
  );
}

function discipleAcquiredTechniqueThisWeek(
  discipleRecord: {
    person: {
      sprint1State?: { techniqueStates: readonly { acquiredAbsoluteWeek: number | null }[] };
    };
  },
  absoluteWeek: number,
): boolean {
  const states = discipleRecord.person.sprint1State?.techniqueStates ?? [];
  for (const state of states) {
    if (state.acquiredAbsoluteWeek === absoluteWeek) {
      return true;
    }
  }
  return false;
}

export type ProcessTechniqueTeachingSelectionWeekInput = {
  absoluteWeek: number;
  worldState: WorldEngineState;
  sprint3Config?: Sprint3Config;
  sprint1Config: Sprint1Config;
  techniqueCatalog: TechniqueCatalog;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState | undefined;
  runtimeState: TechniqueTeachingSelectionRuntimeState | undefined;
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay;
};

export type ProcessTechniqueTeachingSelectionWeekResult = {
  runtimeState: TechniqueTeachingSelectionRuntimeState | undefined;
};

export function processTechniqueTeachingSelectionWeek(
  input: ProcessTechniqueTeachingSelectionWeekInput,
): ValidationResult<ProcessTechniqueTeachingSelectionWeekResult> {
  if (
    input.sprint3Config === undefined ||
    !isTechniqueTeachingSelectionEnabled(input.sprint3Config) ||
    input.mentorshipRuntime === undefined
  ) {
    return success({ runtimeState: input.runtimeState });
  }

  const policy = input.sprint3Config.teachingSelection;
  if (policy === undefined) {
    return success({ runtimeState: input.runtimeState });
  }

  let runtime =
    input.runtimeState === undefined
      ? createInitialTechniqueTeachingSelectionRuntimeState()
      : cloneValidatedPlainJson(input.runtimeState);
  const validatedRuntime = validateTechniqueTeachingSelectionRuntimeState(runtime);
  if (!validatedRuntime.ok) {
    return failure(
      validatedRuntime.issues.map((issue) => ({
        ...issue,
        path: `/techniqueTeachingSelectionRuntime${issue.path}`,
      })),
    );
  }
  runtime = validatedRuntime.value;

  const recordsResult = buildWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    input.mentorshipRuntime,
  );
  if (!recordsResult.ok) {
    return failure(
      recordsResult.issues.map((issue) => ({
        ...issue,
        path: `/weeklyTrainingSidecars${issue.path}`,
      })),
    );
  }
  const recordByPersonId = new Map(
    recordsResult.value.map((record) => [record.person.personId, record]),
  );

  const mergedCatalog: TechniqueCatalog = {
    ...input.techniqueCatalog,
    definitions: [
      ...input.techniqueCatalog.definitions,
      ...(input.generatedTechniqueCatalogOverlay?.definitions ?? []),
    ],
  };
  const techniqueDefinitionsById = buildBattleTechniqueDefinitionCatalogMap(
    input.techniqueCatalog.definitions,
    input.generatedTechniqueCatalogOverlay,
  );

  for (const pair of listLiveMasterDiscipleMentorshipPairs(input.mentorshipRuntime)) {
    const prior = lookupTechniqueTeachingSelectionPairSnapshot(
      runtime,
      pair.masterPersonId,
      pair.disciplePersonId,
    );
    if (prior !== undefined && prior.evaluatedAbsoluteWeek === input.absoluteWeek) {
      continue;
    }

    const weeksSinceLastTeachingSelectionEvaluation =
      prior === undefined
        ? policy.reEvaluationTriggers.fourWeekCadenceWeeks
        : input.absoluteWeek - prior.evaluatedAbsoluteWeek;

    const discipleRecord = recordByPersonId.get(pair.disciplePersonId);
    const masterRecord = recordByPersonId.get(pair.masterPersonId);
    if (discipleRecord === undefined || masterRecord === undefined) {
      return failure([
        {
          path: "/weeklyTrainingSidecars",
          message: "missing weekly sidecar record for mentorship pair participant",
          actual: {
            masterPersonId: pair.masterPersonId,
            disciplePersonId: pair.disciplePersonId,
          },
        },
      ]);
    }

    const dueResult = evaluateTeachingSelectionReEvaluationDue(policy, {
      weeksSinceLastTeachingSelectionEvaluation,
      newEnrollmentThisEvaluation: childEnrolledThisWeek(
        input.mentorshipRuntime,
        pair.disciplePersonId,
        input.absoluteWeek,
      ),
      currentTechniqueAcquisitionCompleted: discipleAcquiredTechniqueThisWeek(
        discipleRecord,
        input.absoluteWeek,
      ),
    });
    if (!dueResult.due) {
      continue;
    }

    const record = buildTeachingSelectionRecord({
      masterPersonId: pair.masterPersonId,
      disciplePersonId: pair.disciplePersonId,
      mentorshipRelationKind: pair.mentorshipRelationKind,
      masterRecord,
      discipleRecord,
      techniqueCatalog: mergedCatalog,
      sprint1Config: input.sprint1Config,
    });
    if (!record.ok) {
      return failure(
        record.issues.map((issue) => ({
          ...issue,
          path: `/techniqueTeachingSelection${issue.path}`,
        })),
      );
    }

    const outcome = evaluateTechniqueTeachingSelection(
      input.sprint3Config,
      record.value,
      techniqueDefinitionsById,
    );
    if (!outcome.ok) {
      return failure(
        outcome.issues.map((issue) => ({
          ...issue,
          path: `/techniqueTeachingSelection${issue.path}`,
        })),
      );
    }

    runtime = upsertTechniqueTeachingSelectionPairSnapshot(runtime, {
      masterPersonId: pair.masterPersonId,
      disciplePersonId: pair.disciplePersonId,
      evaluatedAbsoluteWeek: input.absoluteWeek,
      matchedTriggers: dueResult.matchedTriggers,
      outcome: outcome.value,
    });
  }

  const validatedNext = validateTechniqueTeachingSelectionRuntimeState(
    deepFreezePlainJson(runtime),
  );
  if (!validatedNext.ok) {
    return failure(
      validatedNext.issues.map((issue) => ({
        ...issue,
        path: `/techniqueTeachingSelectionRuntime${issue.path}`,
      })),
    );
  }

  return success({ runtimeState: validatedNext.value });
}
