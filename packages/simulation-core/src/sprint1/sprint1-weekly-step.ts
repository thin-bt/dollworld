/**
 * Sprint1 outer weekly transaction (S1-SPEC-0.1.20 / S01-008).
 * Atomic: clone draft → weekly-training adapter → legacy WorldEngine week → commit.
 */
import type { EventEnvelope } from "../events/types.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { runWorldOneWeek } from "../world-engine/engine.js";
import { WorldEngineError } from "../world-engine/errors.js";
import { cloneRuntimeState } from "../world-engine/processor-runtime.js";
import { cloneWorldEngineState } from "../world-engine/clone.js";
import type { WorldProcessor } from "../world-engine/types.js";
import {
  assertBattleResultWeekMatchesWorldDate,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  type Sprint1WeeklyTrainingAdapterInput,
  type Sprint1RunSession,
  type Sprint1RunRuntimeState,
} from "./sprint1-run-session.js";
import { assertBattleResultsWeekSuffixInvariant } from "./battle-result-store.js";
import { createInitialBattleResultWeekState } from "./battle-result-week-state.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import {
  allocateWeeklyTrainingEventCandidates,
  promoteProvisionalEventToSprint1,
  type Sprint1EventEnvelope,
} from "./event-envelope-sprint1.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import { validateSprint1RunSession } from "./validate-sprint1-run-session.js";
import { runSprint1WeeklyTrainingAdapter } from "./weekly-training-adapter.js";

/** Matches world-engine WEEKS_PER_YEAR (48). */
const WEEKS_PER_YEAR = 48;

export type RunSprint1WeeklyStepOptions = {
  /**
   * Optional legacy WorldProcessor hooks passed to runWorldOneWeek only.
   * Production CLI defaults to []. Year-end statistics capture may inject
   * createYearEndCaptureProcessor without registering weekly-training. This is
   * not a Sprint1 transactional adapter registration port: Sprint1 adapter IDs
   * supplied here are rejected. Use it only for WorldEngine auxiliary hooks
   * such as year-end capture.
   */
  legacyProcessors?: readonly WorldProcessor[];
};

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function validateLegacyProcessors(processors: readonly WorldProcessor[]): ValidationResult<true> {
  for (let index = 0; index < processors.length; index += 1) {
    const processor = processors[index];
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(processor, "processorId");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return failure([
        {
          path: `/legacyProcessors/${String(index)}/processorId`,
          message: `processorId descriptor could not be inspected: ${detail}`,
          actual: detail,
          expected: "own string data property",
        },
      ]);
    }
    if (descriptor === undefined) {
      return failure([
        {
          path: `/legacyProcessors/${String(index)}/processorId`,
          message: "processorId must be an own string data property",
          actual: descriptor,
          expected: "own string data property",
        },
      ]);
    }
    const hasValue = Object.hasOwn(descriptor, "value");
    const hasAccessor = Object.hasOwn(descriptor, "get") || Object.hasOwn(descriptor, "set");
    const processorId = descriptor.value;
    if (!hasValue || hasAccessor || typeof processorId !== "string") {
      return failure([
        {
          path: `/legacyProcessors/${String(index)}/processorId`,
          message: "processorId must be an own string data property",
          actual: descriptor,
          expected: "own string data property",
        },
      ]);
    }
    if (
      SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE.some(
        (adapterId) => adapterId === processorId,
      )
    ) {
      return failure([
        {
          path: `/legacyProcessors/${String(index)}/processorId`,
          message: "Sprint1 transactional adapter IDs cannot be legacy WorldProcessor hooks",
          actual: processorId,
          expected: "non-Sprint1-adapter processorId",
        },
      ]);
    }
  }
  return success(true);
}

function cloneSprint1RuntimeDraft(runtimeState: Sprint1RunRuntimeState): Sprint1RunRuntimeState {
  return {
    worldState: cloneWorldEngineState(runtimeState.worldState),
    worldRngState: cloneValidatedPlainJson(runtimeState.worldRngState),
    matchIdGeneratorState: cloneValidatedPlainJson(runtimeState.matchIdGeneratorState),
    weeklyTrainingSidecars: cloneValidatedPlainJson(runtimeState.weeklyTrainingSidecars),
    processorRuntimeStates: cloneRuntimeState(runtimeState.processorRuntimeStates),
    eventStream: runtimeState.eventStream.map((event) => cloneValidatedPlainJson(event)),
    eventAllocationState: cloneValidatedPlainJson(runtimeState.eventAllocationState),
    battleResults: runtimeState.battleResults.map((result) => cloneValidatedPlainJson(result)),
    battleResultWeekState: cloneValidatedPlainJson(runtimeState.battleResultWeekState),
  };
}

function promoteLegacyWorldEngineEvents(
  events: readonly EventEnvelope[],
  simulationId: Sprint1RunSession["context"]["simulationId"],
): ValidationResult<Sprint1EventEnvelope[]> {
  const promoted: Sprint1EventEnvelope[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const result = promoteProvisionalEventToSprint1(events[index]!, simulationId);
    if (!result.ok) {
      return failure(
        result.issues.map((issue) => ({
          ...issue,
          path:
            issue.path === ""
              ? `/worldEngine/events/${String(index)}`
              : `/worldEngine/events/${String(index)}${issue.path}`,
        })),
      );
    }
    promoted.push(result.value);
  }
  return success(deepFreezePlainJson(promoted));
}

/**
 * Execute one Sprint1 outer weekly transaction. On failure the input session is unchanged.
 */
export function runSprint1WeeklyStep(
  session: Sprint1RunSession,
  provider: Sha256Provider,
  options: RunSprint1WeeklyStepOptions = {},
): ValidationResult<Sprint1RunSession> {
  const validatedInput = validateSprint1RunSession(session, provider);
  if (!validatedInput.ok) {
    return failure(prefixIssues(validatedInput.issues, "/session"));
  }
  session = validatedInput.value;
  const legacyProcessors = options.legacyProcessors ?? [];
  const validatedLegacyProcessors = validateLegacyProcessors(legacyProcessors);
  if (!validatedLegacyProcessors.ok) {
    return failure(validatedLegacyProcessors.issues);
  }
  const draft = cloneSprint1RuntimeDraft(session.runtimeState);
  const previousAbsoluteWeek = draft.worldState.worldDate.absoluteWeek;

  const weekMatch = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: draft.battleResultWeekState,
    worldState: draft.worldState,
  });
  if (!weekMatch.ok) {
    return failure(prefixIssues(weekMatch.issues, "/runtimeState"));
  }

  const suffixBefore = assertBattleResultsWeekSuffixInvariant({
    battleResults: draft.battleResults,
    battleResultWeekState: draft.battleResultWeekState,
  });
  if (!suffixBefore.ok) {
    return failure(prefixIssues(suffixBefore.issues, "/runtimeState"));
  }

  const adapterInput: Sprint1WeeklyTrainingAdapterInput = {
    absoluteWeek: draft.worldState.worldDate.absoluteWeek,
    worldState: draft.worldState,
    weeklyTrainingSidecars: draft.weeklyTrainingSidecars,
    sprint1Config: session.context.sprint1Config,
    techniqueCatalog: session.context.techniqueCatalog,
    processorRuntimeStates: draft.processorRuntimeStates,
  };

  const adapterResult = runSprint1WeeklyTrainingAdapter(adapterInput, provider);
  if (!adapterResult.ok) {
    return failure(prefixIssues(adapterResult.issues, "/weeklyTrainingAdapter"));
  }

  draft.worldState = adapterResult.value.worldState;
  draft.weeklyTrainingSidecars = adapterResult.value.weeklyTrainingSidecars;
  draft.processorRuntimeStates = adapterResult.value.processorRuntimeStates;

  const weeklyAllocation = allocateWeeklyTrainingEventCandidates({
    candidates: adapterResult.value.eventCandidates,
    startSequence: draft.eventAllocationState.nextSequence,
    simulationId: session.context.simulationId,
    worldDate: draft.worldState.worldDate,
    sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
  });
  if (!weeklyAllocation.ok) {
    return failure(prefixIssues(weeklyAllocation.issues, "/weeklyEventAllocation"));
  }

  const weeklyEnvelopes = weeklyAllocation.value.envelopes;
  const worldEngineStartSequence = weeklyAllocation.value.nextSequence;

  let worldEngineResult;
  try {
    worldEngineResult = runWorldOneWeek({
      state: draft.worldState,
      processors: legacyProcessors,
      startSequence: worldEngineStartSequence,
    });
  } catch (error) {
    const detail =
      error instanceof WorldEngineError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
    return failure([
      {
        path: "/worldEngine",
        message: `runWorldOneWeek failed: ${detail}`,
        actual: detail,
        expected: "WorldEngineRunResult",
      },
    ]);
  }

  draft.worldState = worldEngineResult.state;

  const promotedWorldEvents = promoteLegacyWorldEngineEvents(
    worldEngineResult.events,
    session.context.simulationId,
  );
  if (!promotedWorldEvents.ok) {
    return failure(promotedWorldEvents.issues);
  }

  draft.eventStream = deepFreezePlainJson([
    ...draft.eventStream,
    ...weeklyEnvelopes,
    ...promotedWorldEvents.value,
  ]);
  draft.eventAllocationState = deepFreezePlainJson({
    ...draft.eventAllocationState,
    nextSequence: worldEngineResult.nextSequence,
  });

  const newAbsoluteWeek = draft.worldState.worldDate.absoluteWeek;
  if (newAbsoluteWeek !== previousAbsoluteWeek) {
    const resetWeek = createInitialBattleResultWeekState(newAbsoluteWeek);
    if (!resetWeek.ok) {
      return failure(prefixIssues(resetWeek.issues, "/battleResultWeekState"));
    }
    draft.battleResultWeekState = resetWeek.value;
  }

  const weekMatchAfter = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: draft.battleResultWeekState,
    worldState: draft.worldState,
  });
  if (!weekMatchAfter.ok) {
    return failure(prefixIssues(weekMatchAfter.issues, "/runtimeState"));
  }

  const suffixAfter = assertBattleResultsWeekSuffixInvariant({
    battleResults: draft.battleResults,
    battleResultWeekState: draft.battleResultWeekState,
  });
  if (!suffixAfter.ok) {
    return failure(prefixIssues(suffixAfter.issues, "/runtimeState"));
  }

  const nextSession: Sprint1RunSession = deepFreezePlainJson({
    context: session.context,
    runtimeState: deepFreezePlainJson(draft),
  });
  const validatedNext = validateSprint1RunSession(nextSession, provider);
  if (!validatedNext.ok) {
    return failure(prefixIssues(validatedNext.issues, "/nextSession"));
  }

  return success(validatedNext.value);
}

/**
 * Advance the session by `years * 48` weeks via {@link runSprint1WeeklyStep}.
 */
export function runSprint1Years(
  session: Sprint1RunSession,
  years: number,
  provider: Sha256Provider,
  options: RunSprint1WeeklyStepOptions = {},
): ValidationResult<Sprint1RunSession> {
  const validated = validateSprint1RunSession(session, provider);
  if (!validated.ok) {
    return failure(prefixIssues(validated.issues, "/session"));
  }
  const validatedLegacyProcessors = validateLegacyProcessors(options.legacyProcessors ?? []);
  if (!validatedLegacyProcessors.ok) {
    return failure(validatedLegacyProcessors.issues);
  }
  let current = validated.value;

  if (!Number.isSafeInteger(years) || years < 0) {
    return failure([
      {
        path: "/years",
        message: "years must be a non-negative safe integer",
        actual: years,
      },
    ]);
  }

  const weeks = years * WEEKS_PER_YEAR;
  if (!Number.isSafeInteger(weeks)) {
    return failure([
      {
        path: "/years",
        message: "years * 48 must be a safe integer",
        actual: years,
        expected: "safe integer weeks",
      },
    ]);
  }

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const step = runSprint1WeeklyStep(current, provider, options);
    if (!step.ok) {
      return step;
    }
    current = step.value;
  }

  return success(current);
}
