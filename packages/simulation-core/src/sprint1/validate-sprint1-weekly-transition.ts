/**
 * Transition-local validation for a trusted Sprint1 weekly step result.
 * Assumes `previous` is a fully validated session (start boundary or prior trusted week).
 * Does not rescan unchanged historical eventStream prefix or global battleResults.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateAndCloneProcessorRuntimeState } from "../world-engine/processor-runtime.js";
import { validateWorldEngineState } from "../world-engine/validate-state.js";
import { assertBattleResultsWeekSuffixInvariant } from "./battle-result-store.js";
import { validateBattleResultWeekState } from "./battle-result-week-state.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import { WORLD_YEAR_START_PROCESSOR_ID } from "./active-year-start-processor-manifest.js";
import { validateWorldYearStartRuntimeState } from "./world-year-start-runtime-state.js";
import { validateEventAllocationState } from "./event-allocation-state.js";
import {
  validateSprint1EventEnvelope,
  type Sprint1EventEnvelope,
} from "./event-envelope-sprint1.js";
import { buildWeeklyTrainingPersonRecords } from "./sprint1-person-sidecar-records.js";
import {
  assertBattleResultWeekMatchesWorldDate,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  type Sprint1RunRuntimeState,
  type Sprint1RunSession,
} from "./sprint1-run-session.js";
import { validateSprint1PersonTechniqueSemantics } from "./technique-person-semantics.js";
import { validateMatchIdGeneratorState } from "./match-id-generator.js";
import { validateTrainingProcessorRuntimeState } from "./training-processor-runtime-state.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";
import { validateWeeklyTrainingSidecarState } from "./weekly-training-sidecar-state.js";
import { validateOriginalTechniqueLifecycleRuntimeState } from "../sprint3/original-technique-lifecycle-runtime-state.js";
import { validateSprint3MentorshipEntrypointRuntimeState } from "../sprint3/sprint3-mentorship-entrypoint-runtime-state.js";

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

export type TrustedWeeklyTransitionDraft = {
  worldState: Sprint1RunRuntimeState["worldState"];
  weeklyTrainingSidecars: Sprint1RunRuntimeState["weeklyTrainingSidecars"];
  processorRuntimeStates: Sprint1RunRuntimeState["processorRuntimeStates"];
  /** Newly appended envelopes only (not the historical prefix). */
  appendedEvents: readonly Sprint1EventEnvelope[];
  eventAllocationState: Sprint1RunRuntimeState["eventAllocationState"];
  battleResultWeekState: Sprint1RunRuntimeState["battleResultWeekState"];
  originalTechniqueLifecycleRuntime?: Sprint1RunRuntimeState["originalTechniqueLifecycleRuntime"];
  mentorshipEntrypointRuntime?: Sprint1RunRuntimeState["mentorshipEntrypointRuntime"];
};

export type ValidateTrustedWeeklyTransitionOptions = {
  onEventEnvelopeValidation?: () => void;
  /**
   * Transaction-local append-only event buffer owned by runSprint1Years.
   * Must currently match previous.runtimeState.eventStream.length.
   * Validated appended events are pushed here; the historical prefix is not recopied.
   */
  ownedEventStream: Sprint1EventEnvelope[];
};

/**
 * Validates only state changed by one trusted weekly transition and assembles
 * the next session from the previous validated prefix plus the new suffix.
 */
export function validateTrustedWeeklyTransition(
  previous: Sprint1RunSession,
  draft: TrustedWeeklyTransitionDraft,
  provider: Sha256Provider,
  options: ValidateTrustedWeeklyTransitionOptions,
): ValidationResult<Sprint1RunSession> {
  const issues: ValidationIssue[] = [];
  const context = previous.context;
  const previousAbsoluteWeek = previous.runtimeState.worldState.worldDate.absoluteWeek;
  const oldNextSequence = previous.runtimeState.eventStream.length;
  const ownedEventStream = options.ownedEventStream;

  if (ownedEventStream.length !== oldNextSequence) {
    return failure([
      {
        path: "/runtimeState/eventStream",
        message: "ownedEventStream length must equal previous validated eventStream.length",
        actual: ownedEventStream.length,
        expected: String(oldNextSequence),
      },
    ]);
  }

  try {
    validateWorldEngineState(draft.worldState);
  } catch (error) {
    issues.push(issueFromThrownError("/runtimeState/worldState", error));
  }

  const worldState = draft.worldState;
  if (worldState.simulationId !== context.simulationId) {
    issues.push({
      path: "/runtimeState/worldState/simulationId",
      message: "worldState.simulationId must equal context.simulationId",
      actual: worldState.simulationId,
      expected: context.simulationId,
    });
  }
  if (worldState.seed !== context.simulationIdentity.seed) {
    issues.push({
      path: "/runtimeState/worldState/seed",
      message: "worldState.seed must equal context.simulationIdentity.seed",
      actual: worldState.seed,
      expected: String(context.simulationIdentity.seed),
    });
  }
  if (worldState.configHash !== context.simulationIdentity.initialWorldConfigHash) {
    issues.push({
      path: "/runtimeState/worldState/configHash",
      message: "worldState.configHash must equal context.simulationIdentity.initialWorldConfigHash",
      actual: worldState.configHash,
      expected: context.simulationIdentity.initialWorldConfigHash,
    });
  }
  if (worldState.worldDate.absoluteWeek !== previousAbsoluteWeek + 1) {
    issues.push({
      path: "/runtimeState/worldState/worldDate/absoluteWeek",
      message: "trusted weekly transition must advance absoluteWeek by exactly 1",
      actual: worldState.worldDate.absoluteWeek,
      expected: String(previousAbsoluteWeek + 1),
    });
  }

  const sidecarsResult = validateWeeklyTrainingSidecarState(draft.weeklyTrainingSidecars);
  if (!sidecarsResult.ok) {
    issues.push(...prefixIssues(sidecarsResult.issues, "/runtimeState/weeklyTrainingSidecars"));
  }

  for (let index = 0; index < worldState.persons.length; index += 1) {
    const person = worldState.persons[index]!;
    if (person.sprint1State === undefined) {
      issues.push({
        path: `/runtimeState/worldState/persons/${String(index)}/sprint1State`,
        message: "Sprint 1 sessions require sprint1State for every world person",
        expected: "Sprint1PersonState",
      });
      continue;
    }
    const semantics = validateSprint1PersonTechniqueSemantics(
      person.sprint1State,
      context.techniqueCatalog,
      { spiritSurfaceValue: person.abilities.spirit.surfaceValue },
      provider,
    );
    if (!semantics.ok) {
      issues.push(
        ...prefixIssues(
          semantics.issues,
          `/runtimeState/worldState/persons/${String(index)}/sprint1State`,
        ),
      );
    }
  }

  let mentorshipEntrypointRuntime:
    Sprint1RunRuntimeState["mentorshipEntrypointRuntime"] | undefined;
  if (draft.mentorshipEntrypointRuntime !== undefined) {
    const mentorshipRuntime = validateSprint3MentorshipEntrypointRuntimeState(
      draft.mentorshipEntrypointRuntime,
    );
    if (!mentorshipRuntime.ok) {
      issues.push(
        ...prefixIssues(mentorshipRuntime.issues, "/runtimeState/mentorshipEntrypointRuntime"),
      );
    } else {
      mentorshipEntrypointRuntime = mentorshipRuntime.value;
    }
  }

  if (sidecarsResult.ok) {
    const records = buildWeeklyTrainingPersonRecords(
      worldState,
      sidecarsResult.value,
      mentorshipEntrypointRuntime,
    );
    if (!records.ok) {
      issues.push(...prefixIssues(records.issues, "/runtimeState"));
    }
  }

  let processorRuntimeStates: Sprint1RunRuntimeState["processorRuntimeStates"] | undefined;
  try {
    processorRuntimeStates = validateAndCloneProcessorRuntimeState(
      draft.processorRuntimeStates,
      SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
    );
  } catch (error) {
    issues.push(issueFromThrownError("/runtimeState/processorRuntimeStates", error));
  }
  if (processorRuntimeStates !== undefined) {
    const weeklyRng = processorRuntimeStates.rngStates[0];
    const weeklySpecific = processorRuntimeStates.processorSpecificStates?.[0];
    const yearStartSpecific = processorRuntimeStates.processorSpecificStates?.[1];
    if (
      processorRuntimeStates.processorOrder.length !== 1 ||
      processorRuntimeStates.processorOrder[0] !== WEEKLY_TRAINING_PROCESSOR_ID ||
      processorRuntimeStates.rngStates.length !== 1 ||
      weeklyRng?.processorId !== WEEKLY_TRAINING_PROCESSOR_ID ||
      processorRuntimeStates.processorSpecificStates?.length !== 2 ||
      weeklySpecific?.processorId !== WEEKLY_TRAINING_PROCESSOR_ID ||
      yearStartSpecific?.processorId !== WORLD_YEAR_START_PROCESSOR_ID
    ) {
      issues.push({
        path: "/runtimeState/processorRuntimeStates",
        message:
          "Sprint 1 requires processorOrder/rngStates=[weekly-training] and processorSpecificStates=[weekly-training, world-year-start]",
        expected:
          "processorOrder/rngStates length 1 weekly-training; processorSpecificStates length 2 ordered weekly-training then world-year-start",
      });
    } else {
      const rngResult = validateSeededRngState(weeklyRng.state);
      if (!rngResult.ok) {
        issues.push(
          ...prefixIssues(
            rngResult.issues,
            "/runtimeState/processorRuntimeStates/rngStates/0/state",
          ),
        );
      }
      const specificResult = validateTrainingProcessorRuntimeState(weeklySpecific.specificState);
      if (!specificResult.ok) {
        issues.push(
          ...prefixIssues(
            specificResult.issues,
            "/runtimeState/processorRuntimeStates/processorSpecificStates/0/specificState",
          ),
        );
      }
      const yearStartResult = validateWorldYearStartRuntimeState(yearStartSpecific.specificState);
      if (!yearStartResult.ok) {
        issues.push(
          ...prefixIssues(
            yearStartResult.issues,
            "/runtimeState/processorRuntimeStates/processorSpecificStates/1/specificState",
          ),
        );
      }
    }
  }

  const validatedAppended: Sprint1EventEnvelope[] = [];
  for (let index = 0; index < draft.appendedEvents.length; index += 1) {
    options.onEventEnvelopeValidation?.();
    const event = validateSprint1EventEnvelope(draft.appendedEvents[index]);
    if (!event.ok) {
      issues.push(
        ...prefixIssues(
          event.issues,
          `/runtimeState/eventStream/${String(oldNextSequence + index)}`,
        ),
      );
      continue;
    }
    const expectedSequence = oldNextSequence + index;
    if (event.value.sequence !== expectedSequence) {
      issues.push({
        path: `/runtimeState/eventStream/${String(expectedSequence)}/sequence`,
        message: "appended event sequences must continue from previous eventStream.length",
        actual: event.value.sequence,
        expected: String(expectedSequence),
      });
    }
    if (event.value.simulationId !== context.simulationId) {
      issues.push({
        path: `/runtimeState/eventStream/${String(expectedSequence)}/simulationId`,
        message: "event simulationId must equal context.simulationId",
        actual: event.value.simulationId,
        expected: context.simulationId,
      });
    }
    validatedAppended.push(event.value);
  }

  const allocationResult = validateEventAllocationState(draft.eventAllocationState);
  if (!allocationResult.ok) {
    issues.push(...prefixIssues(allocationResult.issues, "/runtimeState/eventAllocationState"));
  } else {
    const expectedNextSequence = oldNextSequence + draft.appendedEvents.length;
    if (allocationResult.value.nextSequence !== expectedNextSequence) {
      issues.push({
        path: "/runtimeState/eventAllocationState/nextSequence",
        message:
          "eventAllocationState.nextSequence must equal previous length + appended event count",
        actual: allocationResult.value.nextSequence,
        expected: String(expectedNextSequence),
      });
    }
  }

  // Pure weekly transition must not mutate the global battleResults store.
  const battleResults = previous.runtimeState.battleResults;

  const weekStateResult = validateBattleResultWeekState(
    draft.battleResultWeekState,
    context.runRuleSnapshot,
    provider,
  );
  if (!weekStateResult.ok) {
    issues.push(...prefixIssues(weekStateResult.issues, "/runtimeState/battleResultWeekState"));
  } else {
    const weekMatch = assertBattleResultWeekMatchesWorldDate({
      battleResultWeekState: weekStateResult.value,
      worldState,
    });
    if (!weekMatch.ok) {
      issues.push(...prefixIssues(weekMatch.issues, "/runtimeState"));
    }
    const suffix = assertBattleResultsWeekSuffixInvariant({
      battleResults,
      battleResultWeekState: weekStateResult.value,
    });
    if (!suffix.ok) {
      issues.push(...prefixIssues(suffix.issues, "/runtimeState"));
    }
  }

  // Unchanged owners stay on the previous validated references.
  const worldRngResult = validateSeededRngState(previous.runtimeState.worldRngState);
  if (!worldRngResult.ok) {
    issues.push(...prefixIssues(worldRngResult.issues, "/runtimeState/worldRngState"));
  }

  const generatorResult = validateMatchIdGeneratorState(
    previous.runtimeState.matchIdGeneratorState,
  );
  if (!generatorResult.ok) {
    issues.push(...prefixIssues(generatorResult.issues, "/runtimeState/matchIdGeneratorState"));
  } else {
    if (generatorResult.value.seed !== context.simulationIdentity.seed) {
      issues.push({
        path: "/runtimeState/matchIdGeneratorState/seed",
        message: "matchIdGeneratorState.seed must equal context.simulationIdentity.seed",
        actual: generatorResult.value.seed,
        expected: String(context.simulationIdentity.seed),
      });
    }
    if (
      generatorResult.value.generatorVersion !== context.simulationIdentity.matchIdGeneratorVersion
    ) {
      issues.push({
        path: "/runtimeState/matchIdGeneratorState/generatorVersion",
        message:
          "matchIdGeneratorState.generatorVersion must equal context SimulationIdentity contract",
        actual: generatorResult.value.generatorVersion,
        expected: context.simulationIdentity.matchIdGeneratorVersion,
      });
    }
  }

  let originalTechniqueLifecycleRuntime:
    Sprint1RunRuntimeState["originalTechniqueLifecycleRuntime"] | undefined;
  if (draft.originalTechniqueLifecycleRuntime !== undefined) {
    const otlRuntime = validateOriginalTechniqueLifecycleRuntimeState(
      draft.originalTechniqueLifecycleRuntime,
    );
    if (!otlRuntime.ok) {
      issues.push(
        ...prefixIssues(otlRuntime.issues, "/runtimeState/originalTechniqueLifecycleRuntime"),
      );
    } else {
      originalTechniqueLifecycleRuntime = otlRuntime.value;
    }
  }

  if (
    draft.mentorshipEntrypointRuntime !== undefined &&
    mentorshipEntrypointRuntime === undefined
  ) {
    issues.push({
      path: "/runtimeState/mentorshipEntrypointRuntime",
      message: "mentorship entrypoint runtime failed validation",
    });
  }

  if (
    issues.length > 0 ||
    !sidecarsResult.ok ||
    processorRuntimeStates === undefined ||
    !allocationResult.ok ||
    !weekStateResult.ok ||
    !worldRngResult.ok ||
    !generatorResult.ok
  ) {
    return failure(issues);
  }

  for (const event of validatedAppended) {
    ownedEventStream.push(event);
  }

  // Intermediate trusted sessions stay unfrozen so ownedEventStream can append.
  // Final runSprint1Years boundary runs full validateSprint1RunSession (freeze).
  return success({
    context,
    runtimeState: {
      worldState,
      worldRngState: previous.runtimeState.worldRngState,
      matchIdGeneratorState: previous.runtimeState.matchIdGeneratorState,
      weeklyTrainingSidecars: sidecarsResult.value,
      processorRuntimeStates,
      eventStream: ownedEventStream,
      eventAllocationState: allocationResult.value,
      battleResults,
      battleResultWeekState: weekStateResult.value,
      ...(originalTechniqueLifecycleRuntime === undefined
        ? {}
        : { originalTechniqueLifecycleRuntime }),
      ...(mentorshipEntrypointRuntime === undefined ? {} : { mentorshipEntrypointRuntime }),
    },
  });
}
