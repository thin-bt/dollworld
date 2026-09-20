/**
 * S03-012 weekly adapter: invoke S03-007 explicit teach processor and persist outcomes.
 */
import { asPersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import type { TechniqueDefinition } from "../sprint1/technique-definition.js";
import {
  evaluateExplicitWeeklyTeachAction,
  isExplicitWeeklyTeachActionEnabled,
} from "./evaluate-explicit-weekly-teach.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  type Sprint3CompletedExplicitWeeklyTeachOutcomeEntry,
  type Sprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { Sprint3Config } from "./types.js";

export type ProcessExplicitWeeklyTeachWeekInput = {
  absoluteWeek: number;
  sprint3Config?: Sprint3Config;
  techniqueCatalog: TechniqueCatalog;
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

export type ProcessExplicitWeeklyTeachWeekResult = {
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

function buildTechniqueDefinitionMap(catalog: TechniqueCatalog): Map<string, TechniqueDefinition> {
  const map = new Map<string, TechniqueDefinition>();
  for (const definition of catalog.definitions) {
    map.set(definition.techniqueId, definition);
  }
  return map;
}

/**
 * Drain pending explicit weekly teach records for the current week.
 */
export function processExplicitWeeklyTeachWeek(
  input: ProcessExplicitWeeklyTeachWeekInput,
): ValidationResult<ProcessExplicitWeeklyTeachWeekResult> {
  if (
    input.sprint3Config === undefined ||
    !isExplicitWeeklyTeachActionEnabled(input.sprint3Config) ||
    input.runtimeState === undefined
  ) {
    return success({ runtimeState: input.runtimeState });
  }

  if (input.runtimeState.pendingExplicitWeeklyTeachRecords.length === 0) {
    return success({ runtimeState: input.runtimeState });
  }

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

  const techniqueDefinitionsById = buildTechniqueDefinitionMap(input.techniqueCatalog);
  const completed: Sprint3CompletedExplicitWeeklyTeachOutcomeEntry[] = [
    ...runtime.completedExplicitWeeklyTeachOutcomes,
  ];

  for (const pending of input.runtimeState.pendingExplicitWeeklyTeachRecords) {
    const outcome = evaluateExplicitWeeklyTeachAction(
      input.sprint3Config,
      pending,
      techniqueDefinitionsById,
    );
    if (!outcome.ok) {
      return failure(
        outcome.issues.map((issue) => ({
          ...issue,
          path: `/explicitWeeklyTeach${issue.path}`,
        })),
      );
    }
    completed.push({
      absoluteWeek: input.absoluteWeek,
      masterPersonId: asPersonId(pending.masterPersonId),
      outcome: outcome.value,
    });
  }

  const nextRuntime = deepFreezePlainJson({
    ...runtime,
    pendingExplicitWeeklyTeachRecords: [],
    completedExplicitWeeklyTeachOutcomes: completed,
    lastProcessedExplicitTeachAbsoluteWeek: input.absoluteWeek,
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

  return success({ runtimeState: validatedNext.value });
}

export function ensureMentorshipEntrypointRuntimeStateForTeach(
  runtimeState: Sprint3MentorshipEntrypointRuntimeState | undefined,
): Sprint3MentorshipEntrypointRuntimeState {
  return runtimeState ?? createInitialSprint3MentorshipEntrypointRuntimeState();
}
