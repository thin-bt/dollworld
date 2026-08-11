/**
 * Sprint1 outer weekly transaction (S1-SPEC-0.1.20 / S01-008).
 * Atomic: clone draft → weekly-training adapter → legacy WorldEngine week → commit.
 *
 * Public `runSprint1WeeklyStep` keeps full pre/post session validation.
 * `runSprint1Years` uses a validated-session trust boundary for the multi-week loop:
 * start full validation → trusted weekly transitions with transition-local validation →
 * final full validation. Unchanged historical event prefix / global battleResults are
 * not fully rescanned each week.
 */
import type { EventEnvelope } from "../events/types.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
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
import {
  validateTrustedWeeklyTransition,
  type TrustedWeeklyTransitionDraft,
} from "./validate-sprint1-weekly-transition.js";
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

/**
 * Narrow immutable observation after a successful trusted weekly transition.
 * Must not expose Sprint1RunSession / runtime owners / historical eventStream.
 */
export type RunSprint1ValidatedWeekObservation = {
  readonly worldDate: Readonly<WorldDate>;
  readonly eventCountCumulative: number;
  readonly appendedEvents: readonly Sprint1EventEnvelope[];
};

export type RunSprint1YearsOptions = RunSprint1WeeklyStepOptions & {
  /**
   * Optional observer after each successful trusted weekly transition.
   * Receives a frozen narrow observation only (never the trusted draft session).
   * Throws are converted to ValidationResult failure; caller session root stays unchanged.
   */
  onAfterValidatedWeek?: (observation: RunSprint1ValidatedWeekObservation) => void;
};

function buildValidatedWeekObservation(input: {
  worldDate: WorldDate;
  eventCountCumulative: number;
  appendedEvents: readonly Sprint1EventEnvelope[];
}): RunSprint1ValidatedWeekObservation {
  return deepFreezePlainJson({
    worldDate: deepFreezePlainJson({
      year: input.worldDate.year,
      month: input.worldDate.month,
      weekOfMonth: input.worldDate.weekOfMonth,
      absoluteWeek: input.worldDate.absoluteWeek,
    }),
    eventCountCumulative: input.eventCountCumulative,
    appendedEvents: deepFreezePlainJson([...input.appendedEvents]),
  });
}

function observerFailureIssues(error: unknown): ValidationIssue[] {
  const detail = error instanceof Error ? error.message : String(error);
  return [
    {
      path: "/onAfterValidatedWeek",
      message: `week observation observer failed: ${detail}`,
      actual: detail,
      expected: "observer completes without throwing",
    },
  ];
}

/**
 * Test-only seam for validating multi-week trust-boundary call counts.
 * Not exported from the package root and not part of the production contract.
 */
export type Sprint1YearsValidationHooks = {
  onFullSessionValidation?: () => void;
  onTransitionEventEnvelopeValidation?: () => void;
};

let yearsValidationHooks: Sprint1YearsValidationHooks | null = null;

/** Test-only. Pass `null` to clear. Not exported from package root. */
export function setSprint1YearsValidationHooksForTests(
  hooks: Sprint1YearsValidationHooks | null,
): void {
  yearsValidationHooks = hooks;
}

function validateSessionAtBoundary(
  session: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunSession> {
  yearsValidationHooks?.onFullSessionValidation?.();
  return validateSprint1RunSession(session, provider);
}

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

/**
 * Trusted multi-week path: clone only owners mutated by a weekly transition.
 * Do not clone historical eventStream or global battleResults (O(history) per week).
 */
function cloneTrustedWeeklyWorkingDraft(runtimeState: Sprint1RunRuntimeState): {
  worldState: Sprint1RunRuntimeState["worldState"];
  weeklyTrainingSidecars: Sprint1RunRuntimeState["weeklyTrainingSidecars"];
  processorRuntimeStates: Sprint1RunRuntimeState["processorRuntimeStates"];
  eventAllocationState: Sprint1RunRuntimeState["eventAllocationState"];
  battleResultWeekState: Sprint1RunRuntimeState["battleResultWeekState"];
} {
  return {
    worldState: cloneWorldEngineState(runtimeState.worldState),
    weeklyTrainingSidecars: cloneValidatedPlainJson(runtimeState.weeklyTrainingSidecars),
    processorRuntimeStates: cloneRuntimeState(runtimeState.processorRuntimeStates),
    eventAllocationState: cloneValidatedPlainJson(runtimeState.eventAllocationState),
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

type WeeklyTransitionExecution =
  | {
      mode: "public";
      previousAbsoluteWeek: number;
      draft: TrustedWeeklyTransitionDraft;
      publicRuntimeDraft: Sprint1RunRuntimeState;
    }
  | {
      mode: "trusted";
      previousAbsoluteWeek: number;
      draft: TrustedWeeklyTransitionDraft;
    };

/**
 * Shared weekly transition body. Caller must supply a validated session.
 */
function executeSprint1WeeklyTransitionDraft(
  session: Sprint1RunSession,
  provider: Sha256Provider,
  legacyProcessors: readonly WorldProcessor[],
  mode: "public" | "trusted",
): ValidationResult<WeeklyTransitionExecution> {
  const previousAbsoluteWeek = session.runtimeState.worldState.worldDate.absoluteWeek;
  const oldNextSequence = session.runtimeState.eventStream.length;
  const battleResultsRef = session.runtimeState.battleResults;

  const working =
    mode === "public"
      ? cloneSprint1RuntimeDraft(session.runtimeState)
      : {
          ...cloneTrustedWeeklyWorkingDraft(session.runtimeState),
          // Trusted path keeps validated historical owners by reference.
          worldRngState: session.runtimeState.worldRngState,
          matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
          eventStream: session.runtimeState.eventStream,
          battleResults: battleResultsRef,
        };

  const weekMatch = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: working.battleResultWeekState,
    worldState: working.worldState,
  });
  if (!weekMatch.ok) {
    return failure(prefixIssues(weekMatch.issues, "/runtimeState"));
  }

  const suffixBefore = assertBattleResultsWeekSuffixInvariant({
    battleResults: working.battleResults,
    battleResultWeekState: working.battleResultWeekState,
  });
  if (!suffixBefore.ok) {
    return failure(prefixIssues(suffixBefore.issues, "/runtimeState"));
  }

  const adapterInput: Sprint1WeeklyTrainingAdapterInput = {
    absoluteWeek: working.worldState.worldDate.absoluteWeek,
    worldState: working.worldState,
    weeklyTrainingSidecars: working.weeklyTrainingSidecars,
    sprint1Config: session.context.sprint1Config,
    techniqueCatalog: session.context.techniqueCatalog,
    processorRuntimeStates: working.processorRuntimeStates,
  };

  const adapterResult = runSprint1WeeklyTrainingAdapter(adapterInput, provider);
  if (!adapterResult.ok) {
    return failure(prefixIssues(adapterResult.issues, "/weeklyTrainingAdapter"));
  }

  working.worldState = adapterResult.value.worldState;
  working.weeklyTrainingSidecars = adapterResult.value.weeklyTrainingSidecars;
  working.processorRuntimeStates = adapterResult.value.processorRuntimeStates;

  const weeklyAllocation = allocateWeeklyTrainingEventCandidates({
    candidates: adapterResult.value.eventCandidates,
    startSequence: working.eventAllocationState.nextSequence,
    simulationId: session.context.simulationId,
    worldDate: working.worldState.worldDate,
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
      state: working.worldState,
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

  working.worldState = worldEngineResult.state;

  const promotedWorldEvents = promoteLegacyWorldEngineEvents(
    worldEngineResult.events,
    session.context.simulationId,
  );
  if (!promotedWorldEvents.ok) {
    return failure(promotedWorldEvents.issues);
  }

  const appendedEvents: Sprint1EventEnvelope[] = [...weeklyEnvelopes, ...promotedWorldEvents.value];

  if (worldEngineResult.nextSequence !== oldNextSequence + appendedEvents.length) {
    return failure([
      {
        path: "/eventAllocationState/nextSequence",
        message: "WorldEngine nextSequence must equal previous length + appended event count",
        actual: worldEngineResult.nextSequence,
        expected: String(oldNextSequence + appendedEvents.length),
      },
    ]);
  }

  working.eventAllocationState = deepFreezePlainJson({
    ...working.eventAllocationState,
    nextSequence: worldEngineResult.nextSequence,
  });

  if (mode === "public") {
    // Public path materializes a full cloned eventStream for post full-validation.
    working.eventStream = deepFreezePlainJson([...working.eventStream, ...appendedEvents]);
  }

  const newAbsoluteWeek = working.worldState.worldDate.absoluteWeek;
  if (newAbsoluteWeek !== previousAbsoluteWeek) {
    const resetWeek = createInitialBattleResultWeekState(newAbsoluteWeek);
    if (!resetWeek.ok) {
      return failure(prefixIssues(resetWeek.issues, "/battleResultWeekState"));
    }
    working.battleResultWeekState = resetWeek.value;
  }

  const weekMatchAfter = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: working.battleResultWeekState,
    worldState: working.worldState,
  });
  if (!weekMatchAfter.ok) {
    return failure(prefixIssues(weekMatchAfter.issues, "/runtimeState"));
  }

  const suffixAfter = assertBattleResultsWeekSuffixInvariant({
    battleResults: working.battleResults,
    battleResultWeekState: working.battleResultWeekState,
  });
  if (!suffixAfter.ok) {
    return failure(prefixIssues(suffixAfter.issues, "/runtimeState"));
  }

  const draft: TrustedWeeklyTransitionDraft = {
    worldState: working.worldState,
    weeklyTrainingSidecars: working.weeklyTrainingSidecars,
    processorRuntimeStates: working.processorRuntimeStates,
    appendedEvents,
    eventAllocationState: working.eventAllocationState,
    battleResultWeekState: working.battleResultWeekState,
  };

  if (mode === "trusted") {
    return success({
      mode: "trusted",
      previousAbsoluteWeek,
      draft,
    });
  }

  return success({
    mode: "public",
    previousAbsoluteWeek,
    draft,
    publicRuntimeDraft: working as Sprint1RunRuntimeState,
  });
}

/**
 * Internal validated weekly step for a trusted current session.
 * Not exported from the package root.
 */
function runValidatedSprint1WeeklyStep(
  session: Sprint1RunSession,
  provider: Sha256Provider,
  legacyProcessors: readonly WorldProcessor[],
  ownedEventStream: Sprint1EventEnvelope[],
): ValidationResult<Sprint1RunSession> {
  const transition = executeSprint1WeeklyTransitionDraft(
    session,
    provider,
    legacyProcessors,
    "trusted",
  );
  if (!transition.ok) {
    return transition;
  }
  return validateTrustedWeeklyTransition(session, transition.value.draft, provider, {
    ownedEventStream,
    onEventEnvelopeValidation: () => {
      yearsValidationHooks?.onTransitionEventEnvelopeValidation?.();
    },
  });
}

/**
 * Execute one Sprint1 outer weekly transaction. On failure the input session is unchanged.
 */
export function runSprint1WeeklyStep(
  session: Sprint1RunSession,
  provider: Sha256Provider,
  options: RunSprint1WeeklyStepOptions = {},
): ValidationResult<Sprint1RunSession> {
  const validatedInput = validateSessionAtBoundary(session, provider);
  if (!validatedInput.ok) {
    return failure(prefixIssues(validatedInput.issues, "/session"));
  }
  session = validatedInput.value;
  const legacyProcessors = options.legacyProcessors ?? [];
  const validatedLegacyProcessors = validateLegacyProcessors(legacyProcessors);
  if (!validatedLegacyProcessors.ok) {
    return failure(validatedLegacyProcessors.issues);
  }

  const transition = executeSprint1WeeklyTransitionDraft(
    session,
    provider,
    legacyProcessors,
    "public",
  );
  if (!transition.ok) {
    return transition;
  }
  if (transition.value.mode !== "public") {
    return failure([
      {
        path: "/weeklyTransition",
        message: "internal invariant: public weekly step expected public transition mode",
      },
    ]);
  }

  const nextSession: Sprint1RunSession = deepFreezePlainJson({
    context: session.context,
    runtimeState: deepFreezePlainJson(transition.value.publicRuntimeDraft),
  });
  const validatedNext = validateSessionAtBoundary(nextSession, provider);
  if (!validatedNext.ok) {
    return failure(prefixIssues(validatedNext.issues, "/nextSession"));
  }

  return success(validatedNext.value);
}

/**
 * Advance the session by `years * 48` weeks.
 *
 * Multi-week execution uses a validated-session trust boundary:
 * one start full validation, transition-local validation each week, one final
 * full validation. Public {@link runSprint1WeeklyStep} contract is unchanged.
 */
export function runSprint1Years(
  session: Sprint1RunSession,
  years: number,
  provider: Sha256Provider,
  options: RunSprint1YearsOptions = {},
): ValidationResult<Sprint1RunSession> {
  const validated = validateSessionAtBoundary(session, provider);
  if (!validated.ok) {
    return failure(prefixIssues(validated.issues, "/session"));
  }
  const validatedLegacyProcessors = validateLegacyProcessors(options.legacyProcessors ?? []);
  if (!validatedLegacyProcessors.ok) {
    return failure(validatedLegacyProcessors.issues);
  }
  const legacyProcessors = options.legacyProcessors ?? [];
  const onAfterValidatedWeek = options.onAfterValidatedWeek;

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

  if (weeks === 0) {
    return success(validated.value);
  }

  // One shallow copy of validated event refs; weeks append without recopies.
  const ownedEventStream: Sprint1EventEnvelope[] = [...validated.value.runtimeState.eventStream];
  let current: Sprint1RunSession = {
    context: validated.value.context,
    runtimeState: {
      ...validated.value.runtimeState,
      eventStream: ownedEventStream,
    },
  };

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const eventCountBefore = ownedEventStream.length;
    const step = runValidatedSprint1WeeklyStep(
      current,
      provider,
      legacyProcessors,
      ownedEventStream,
    );
    if (!step.ok) {
      return step;
    }
    current = step.value;
    if (onAfterValidatedWeek !== undefined) {
      const observation = buildValidatedWeekObservation({
        worldDate: current.runtimeState.worldState.worldDate,
        eventCountCumulative: ownedEventStream.length,
        appendedEvents: ownedEventStream.slice(eventCountBefore),
      });
      try {
        onAfterValidatedWeek(observation);
      } catch (error) {
        return failure(observerFailureIssues(error));
      }
    }
  }

  const finalValidated = validateSessionAtBoundary(current, provider);
  if (!finalValidated.ok) {
    return failure(prefixIssues(finalValidated.issues, "/finalSession"));
  }
  return success(finalValidated.value);
}
