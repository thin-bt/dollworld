/**
 * Sprint1 weekly-training transactional adapter (S1-SPEC-0.1.20 / S01-008).
 * Runs outside legacy WorldProcessor registration; wraps processWeeklyTrainingWeek.
 */
import type { PersonId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import type { ProcessorRuntimeState } from "../world-engine/types.js";
import { clonePerson, cloneWorldEngineStateUnchecked } from "../world-engine/clone.js";
import { validateWorldEngineState } from "../world-engine/validate-state.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import { buildWeeklyTrainingPersonRecords } from "./sprint1-person-sidecar-records.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import { processWeeklyTrainingWeek } from "./process-weekly-training-week.js";
import type {
  Sprint1WeeklyTrainingAdapterInput,
  Sprint1WeeklyTrainingAdapterOutput,
} from "./sprint1-run-session.js";
import {
  validateTrainingProcessorRuntimeState,
  type TrainingProcessorRuntimeState,
} from "./training-processor-runtime-state.js";
import {
  validateWeeklyTrainingSidecarState,
  type WeeklyTrainingSidecarState,
} from "./weekly-training-sidecar-state.js";
import type { WeeklyTrainingPersonRecord } from "./weekly-training-types.js";

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function issueFromThrownError(path: string, error: unknown): ValidationIssue {
  return {
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}

type WeeklyTrainingProcessorRuntimeParts = {
  rngState: SeededRngState;
  specificState: TrainingProcessorRuntimeState;
};

function extractWeeklyTrainingProcessorRuntime(
  processorRuntimeStates: ProcessorRuntimeState,
): ValidationResult<WeeklyTrainingProcessorRuntimeParts> {
  const rngMatches = processorRuntimeStates.rngStates.filter(
    (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
  );
  if (rngMatches.length !== 1) {
    return failure([
      {
        path: "/processorRuntimeStates/rngStates",
        message: "exactly one weekly-training RNG entry is required",
        actual: rngMatches.length,
        expected: "1",
      },
    ]);
  }

  const specificEntries = processorRuntimeStates.processorSpecificStates ?? [];
  const specificMatches = specificEntries.filter(
    (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
  );
  if (specificMatches.length !== 1) {
    return failure([
      {
        path: "/processorRuntimeStates/processorSpecificStates",
        message: "exactly one weekly-training specificState entry is required",
        actual: specificMatches.length,
        expected: "1",
      },
    ]);
  }

  const specificStateResult = validateTrainingProcessorRuntimeState(
    specificMatches[0]!.specificState,
  );
  if (!specificStateResult.ok) {
    return failure(
      prefixIssues(specificStateResult.issues, "/processorRuntimeStates/processorSpecificStates/0"),
    );
  }

  return success({
    rngState: cloneValidatedPlainJson(rngMatches[0]!.state),
    specificState: specificStateResult.value,
  });
}

function updateWeeklyTrainingProcessorRuntime(
  processorRuntimeStates: ProcessorRuntimeState,
  rngState: SeededRngState,
  specificState: TrainingProcessorRuntimeState,
): ValidationResult<ProcessorRuntimeState> {
  const validatedSpecific = validateTrainingProcessorRuntimeState(specificState);
  if (!validatedSpecific.ok) {
    return failure(prefixIssues(validatedSpecific.issues, "/processorRuntimeStates"));
  }

  let rngUpdated = false;
  const rngStates = processorRuntimeStates.rngStates.map((entry) => {
    if (entry.processorId !== WEEKLY_TRAINING_PROCESSOR_ID) {
      return entry;
    }
    rngUpdated = true;
    return {
      processorId: entry.processorId,
      state: cloneValidatedPlainJson(rngState),
    };
  });
  if (!rngUpdated) {
    return failure([
      {
        path: "/processorRuntimeStates/rngStates",
        message: "weekly-training RNG entry is missing",
        expected: WEEKLY_TRAINING_PROCESSOR_ID,
      },
    ]);
  }

  const specificEntries = processorRuntimeStates.processorSpecificStates ?? [];
  let specificUpdated = false;
  const processorSpecificStates = specificEntries.map((entry) => {
    if (entry.processorId !== WEEKLY_TRAINING_PROCESSOR_ID) {
      return entry;
    }
    specificUpdated = true;
    return {
      processorId: entry.processorId,
      specificState: cloneValidatedPlainJson(validatedSpecific.value),
    };
  });
  if (!specificUpdated) {
    return failure([
      {
        path: "/processorRuntimeStates/processorSpecificStates",
        message: "weekly-training specificState entry is missing",
        expected: WEEKLY_TRAINING_PROCESSOR_ID,
      },
    ]);
  }

  return success(
    deepFreezePlainJson({
      processorOrder: [...processorRuntimeStates.processorOrder],
      rngStates,
      processorSpecificStates,
    }),
  );
}

function applyWeeklyTrainingPersonRecords(
  worldState: WorldEngineState,
  sidecars: WeeklyTrainingSidecarState,
  personRecords: readonly WeeklyTrainingPersonRecord[],
): ValidationResult<{
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
}> {
  const recordByPersonId = new Map<PersonId, WeeklyTrainingPersonRecord>();
  for (const record of personRecords) {
    recordByPersonId.set(record.person.personId, record);
  }

  const updatedPersons = worldState.persons.map((person) => {
    const record = recordByPersonId.get(person.personId);
    return record === undefined ? clonePerson(person) : clonePerson(record.person);
  });

  let updatedWorld: WorldEngineState;
  try {
    updatedWorld = {
      ...cloneWorldEngineStateUnchecked(worldState),
      persons: updatedPersons,
    };
    validateWorldEngineState(updatedWorld);
  } catch (error) {
    return failure([issueFromThrownError("/worldState", error)]);
  }

  const updatedEntries = sidecars.entries.map((entry) => {
    const record = recordByPersonId.get(entry.personId);
    if (record === undefined) {
      return cloneValidatedPlainJson(entry);
    }
    return cloneValidatedPlainJson({
      personId: entry.personId,
      growthProfile: record.growthProfile,
      growthPotential: record.growthPotential,
      statGrowthRemainders: record.statGrowthRemainders,
      temporaryCondition: record.temporaryCondition,
      motivationFactor: record.motivationFactor,
      plannerContext: record.plannerContext,
      statTargetContext: record.statTargetContext,
      techniqueTargetContexts: record.techniqueTargetContexts,
      teacherFactorKey: record.teacherFactorKey,
      discipleCount: record.discipleCount,
    });
  });

  const sidecarResult = validateWeeklyTrainingSidecarState({
    schemaVersion: sidecars.schemaVersion,
    entries: updatedEntries,
  });
  if (!sidecarResult.ok) {
    return failure(prefixIssues(sidecarResult.issues, "/weeklyTrainingSidecars"));
  }

  return success({
    worldState: updatedWorld,
    weeklyTrainingSidecars: sidecarResult.value,
  });
}

/**
 * Run weekly-training once on a transaction-local draft; does not mutate adapter input.
 */
export function runSprint1WeeklyTrainingAdapter(
  input: Sprint1WeeklyTrainingAdapterInput,
  provider: Sha256Provider,
): ValidationResult<Sprint1WeeklyTrainingAdapterOutput> {
  const runtimeParts = extractWeeklyTrainingProcessorRuntime(input.processorRuntimeStates);
  if (!runtimeParts.ok) {
    return failure(runtimeParts.issues);
  }

  const personRecordsResult = buildWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    input.mentorshipEntrypointRuntime,
  );
  if (!personRecordsResult.ok) {
    return failure(personRecordsResult.issues);
  }

  const weekResult = processWeeklyTrainingWeek(
    {
      absoluteWeek: input.absoluteWeek,
      personRecords: personRecordsResult.value,
      config: input.sprint1Config,
      catalog: input.techniqueCatalog,
      runtimeState: runtimeParts.value.specificState,
      rngState: runtimeParts.value.rngState,
      ...(input.sprint3Config === undefined ? {} : { sprint3Config: input.sprint3Config }),
    },
    { sha256Provider: provider },
  );
  if (!weekResult.ok) {
    return failure(prefixIssues(weekResult.issues, "/processWeeklyTrainingWeek"));
  }

  const applied = applyWeeklyTrainingPersonRecords(
    input.worldState,
    input.weeklyTrainingSidecars,
    weekResult.value.personRecords,
  );
  if (!applied.ok) {
    return failure(applied.issues);
  }

  const processorRuntimeStates = updateWeeklyTrainingProcessorRuntime(
    input.processorRuntimeStates,
    weekResult.value.rngState,
    weekResult.value.runtimeState,
  );
  if (!processorRuntimeStates.ok) {
    return failure(processorRuntimeStates.issues);
  }

  return success(
    deepFreezePlainJson({
      worldState: applied.value.worldState,
      weeklyTrainingSidecars: applied.value.weeklyTrainingSidecars,
      processorRuntimeStates: processorRuntimeStates.value,
      eventCandidates: weekResult.value.eventCandidates,
    }),
  );
}
