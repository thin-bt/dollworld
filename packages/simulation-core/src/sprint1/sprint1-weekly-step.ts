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
import { createSeededRng } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { isWorldYearEndWeek, type WorldDate } from "../world-date.js";
import { runWorldOneWeek } from "../world-engine/engine.js";
import { WorldEngineError } from "../world-engine/errors.js";
import { cloneRuntimeState } from "../world-engine/processor-runtime.js";
import { cloneWorldEngineState } from "../world-engine/clone.js";
import type { WorldProcessor } from "../world-engine/types.js";
import { WORLD_YEAR_START_PROCESSOR_ID } from "./active-year-start-processor-manifest.js";
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
import {
  replaceWorldYearStartRuntimeState,
  runWorldYearStartPhase,
  sealWorldYearStartReceiptHashes,
} from "./year-start-phase.js";
import { validateWorldYearStartRuntimeState } from "./world-year-start-runtime-state.js";
import { validateTrainingProcessorRuntimeState } from "./training-processor-runtime-state.js";
import { processOriginalTechniqueLifecycleWeek } from "../sprint3/process-original-technique-lifecycle-week.js";
import { processOriginalTechniqueLossWeek } from "../sprint3/process-original-technique-loss-week.js";
import { applyExplicitWeeklyTeachOutcomesToWorldState } from "../sprint3/apply-explicit-weekly-teach-outcomes-to-world-state.js";
import { processExplicitWeeklyTeachWeek } from "../sprint3/process-explicit-weekly-teach-week.js";
import { processTechniqueTeachingSelectionWeek } from "../sprint3/process-technique-teaching-selection-week.js";
import { processSprint3EnrollmentIntakeBoundary } from "../sprint3/process-sprint3-enrollment-intake-boundary.js";
import {
  materializeLiveEnrollmentQueueBoundaries,
  materializeLiveExplicitWeeklyTeachQueueRecords,
} from "../sprint3/materialize-live-mentorship-entrypoint-queues.js";
import { refreshQualifiedMasterFlagsInWorldState } from "../sprint3/refresh-qualified-master-flags-in-world-state.js";
import { resolveLiveCompetitiveRecordsForQualification } from "../sprint3/resolve-live-competitive-records-for-qualification.js";
import type { CompetitiveRecordsByPersonId } from "../sprint3/derive-master-qualification-record.js";
import type { Sprint3Config } from "../sprint3/types.js";

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
  /**
   * Optional hook immediately before the year-start phase mutates the draft
   * (still on the committed world-year end week). Used by year-end statistics
   * capture. Throws are converted to ValidationResult failure.
   */
  onBeforeYearStartPhase?: (worldState: Sprint1RunRuntimeState["worldState"]) => void;
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

function applySprint3QualifiedMasterRefresh(
  working: { worldState: Sprint1RunRuntimeState["worldState"] },
  sprint3Config: Sprint3Config | undefined,
  competitiveRecordsByPersonId: CompetitiveRecordsByPersonId | undefined,
): ValidationResult<void> {
  if (sprint3Config === undefined) {
    return success(undefined);
  }
  const refreshed = refreshQualifiedMasterFlagsInWorldState({
    worldState: working.worldState,
    sprint3Config,
    ...(competitiveRecordsByPersonId === undefined ? {} : { competitiveRecordsByPersonId }),
  });
  if (!refreshed.ok) {
    return failure(prefixIssues(refreshed.issues, "/qualifiedMasterRefresh"));
  }
  working.worldState = refreshed.value;
  return success(undefined);
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
    ...(runtimeState.originalTechniqueLifecycleRuntime === undefined
      ? {}
      : {
          originalTechniqueLifecycleRuntime: cloneValidatedPlainJson(
            runtimeState.originalTechniqueLifecycleRuntime,
          ),
        }),
    ...(runtimeState.mentorshipEntrypointRuntime === undefined
      ? {}
      : {
          mentorshipEntrypointRuntime: cloneValidatedPlainJson(
            runtimeState.mentorshipEntrypointRuntime,
          ),
        }),
    ...(runtimeState.techniqueTeachingSelectionRuntime === undefined
      ? {}
      : {
          techniqueTeachingSelectionRuntime: cloneValidatedPlainJson(
            runtimeState.techniqueTeachingSelectionRuntime,
          ),
        }),
    ...(runtimeState.generatedTechniqueCatalogOverlay === undefined
      ? {}
      : {
          generatedTechniqueCatalogOverlay: cloneValidatedPlainJson(
            runtimeState.generatedTechniqueCatalogOverlay,
          ),
        }),
    ...(runtimeState.sprint2CompetitiveRecordRuntime === undefined
      ? {}
      : {
          sprint2CompetitiveRecordRuntime: cloneValidatedPlainJson(
            runtimeState.sprint2CompetitiveRecordRuntime,
          ),
        }),
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
  originalTechniqueLifecycleRuntime?: Sprint1RunRuntimeState["originalTechniqueLifecycleRuntime"];
  mentorshipEntrypointRuntime?: Sprint1RunRuntimeState["mentorshipEntrypointRuntime"];
  techniqueTeachingSelectionRuntime?: Sprint1RunRuntimeState["techniqueTeachingSelectionRuntime"];
  generatedTechniqueCatalogOverlay?: Sprint1RunRuntimeState["generatedTechniqueCatalogOverlay"];
  sprint2CompetitiveRecordRuntime?: Sprint1RunRuntimeState["sprint2CompetitiveRecordRuntime"];
} {
  return {
    worldState: cloneWorldEngineState(runtimeState.worldState),
    weeklyTrainingSidecars: cloneValidatedPlainJson(runtimeState.weeklyTrainingSidecars),
    processorRuntimeStates: cloneRuntimeState(runtimeState.processorRuntimeStates),
    eventAllocationState: cloneValidatedPlainJson(runtimeState.eventAllocationState),
    battleResultWeekState: cloneValidatedPlainJson(runtimeState.battleResultWeekState),
    ...(runtimeState.originalTechniqueLifecycleRuntime === undefined
      ? {}
      : {
          originalTechniqueLifecycleRuntime: cloneValidatedPlainJson(
            runtimeState.originalTechniqueLifecycleRuntime,
          ),
        }),
    ...(runtimeState.mentorshipEntrypointRuntime === undefined
      ? {}
      : {
          mentorshipEntrypointRuntime: cloneValidatedPlainJson(
            runtimeState.mentorshipEntrypointRuntime,
          ),
        }),
    ...(runtimeState.techniqueTeachingSelectionRuntime === undefined
      ? {}
      : {
          techniqueTeachingSelectionRuntime: cloneValidatedPlainJson(
            runtimeState.techniqueTeachingSelectionRuntime,
          ),
        }),
    ...(runtimeState.generatedTechniqueCatalogOverlay === undefined
      ? {}
      : {
          generatedTechniqueCatalogOverlay: cloneValidatedPlainJson(
            runtimeState.generatedTechniqueCatalogOverlay,
          ),
        }),
    ...(runtimeState.sprint2CompetitiveRecordRuntime === undefined
      ? {}
      : {
          sprint2CompetitiveRecordRuntime: cloneValidatedPlainJson(
            runtimeState.sprint2CompetitiveRecordRuntime,
          ),
        }),
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
 *
 * CAL-JAN year-boundary weeks (`isWorldYearEndWeek`):
 * 1. year-start phase advances date + enabled manifest slots (prefix events)
 * 2. weekly-training adapter on the new week
 * 3. legacy WorldEngine processors with `skipCalendarStep` (no second advance)
 *
 * Non-boundary weeks keep train-current → WorldEngine full calendar advance.
 */
function executeSprint1WeeklyTransitionDraft(
  session: Sprint1RunSession,
  provider: Sha256Provider,
  legacyProcessorsInput: readonly WorldProcessor[],
  mode: "public" | "trusted",
  onBeforeYearStartPhase?: (worldState: Sprint1RunRuntimeState["worldState"]) => void,
): ValidationResult<WeeklyTransitionExecution> {
  const previousAbsoluteWeek = session.runtimeState.worldState.worldDate.absoluteWeek;
  const oldNextSequence = session.runtimeState.eventStream.length;
  const battleResultsRef = session.runtimeState.battleResults;
  const worldCalendar = session.context.runRuleSnapshot.worldCalendar;
  let legacyProcessors: readonly WorldProcessor[] = legacyProcessorsInput;

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

  const competitiveRecordRuntime =
    working.sprint2CompetitiveRecordRuntime ?? session.runtimeState.sprint2CompetitiveRecordRuntime;
  const competitiveRecordsByPersonId = resolveLiveCompetitiveRecordsForQualification(
    competitiveRecordRuntime === undefined
      ? {}
      : { sprint2CompetitiveRecordRuntime: competitiveRecordRuntime },
  );

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

  const yearStartEvents: Sprint1EventEnvelope[] = [];
  let worldEngineSkipCalendar = false;
  let skipWeeklyAdapter = false;
  let eventStartSequence = working.eventAllocationState.nextSequence;

  const weeklySpecificEntry = (working.processorRuntimeStates.processorSpecificStates ?? []).find(
    (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
  );
  const weeklySpecificResult =
    weeklySpecificEntry !== undefined
      ? validateTrainingProcessorRuntimeState(weeklySpecificEntry.specificState)
      : undefined;
  if (weeklySpecificResult !== undefined && !weeklySpecificResult.ok) {
    return failure(
      prefixIssues(
        weeklySpecificResult.issues,
        "/processorRuntimeStates/processorSpecificStates/weekly-training",
      ),
    );
  }
  const lastProcessedAbsoluteWeek =
    weeklySpecificResult?.ok === true ? weeklySpecificResult.value.lastProcessedAbsoluteWeek : null;
  const currentAbsoluteWeek = working.worldState.worldDate.absoluteWeek;
  const alreadyProcessedCurrentWeek =
    lastProcessedAbsoluteWeek !== null && lastProcessedAbsoluteWeek === currentAbsoluteWeek;

  if (isWorldYearEndWeek(working.worldState.worldDate, worldCalendar)) {
    if (onBeforeYearStartPhase !== undefined) {
      try {
        onBeforeYearStartPhase(working.worldState);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return failure([
          {
            path: "/onBeforeYearStartPhase",
            message: `onBeforeYearStartPhase failed: ${detail}`,
            actual: detail,
            expected: "hook completes without throwing",
          },
        ]);
      }
    }

    // Invoke legacy hooks (e.g. year-end statistics capture) on the committed
    // year-end week BEFORE the year-start phase advances the date.
    for (let index = 0; index < legacyProcessors.length; index += 1) {
      const processor = legacyProcessors[index]!;
      try {
        const after = processor.process({
          state: working.worldState,
          rng: createSeededRng(working.worldState.seed),
        });
        if (after !== working.worldState) {
          return failure([
            {
              path: `/legacyProcessors/${String(index)}`,
              message: "year-end capture legacy processors must return the identical input state",
              actual: "different state object",
              expected: "same state reference",
            },
          ]);
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return failure([
          {
            path: `/legacyProcessors/${String(index)}`,
            message: `year-end capture legacy processor failed: ${detail}`,
            actual: detail,
            expected: "side-effect-only success",
          },
        ]);
      }
    }

    const specificStates = working.processorRuntimeStates.processorSpecificStates ?? [];
    const yearStartEntry = specificStates.find(
      (entry) => entry.processorId === WORLD_YEAR_START_PROCESSOR_ID,
    );
    if (yearStartEntry === undefined) {
      return failure([
        {
          path: "/processorRuntimeStates/processorSpecificStates",
          message: "missing world-year-start runtime entry for year-start phase",
        },
      ]);
    }
    const yearStartRuntimeResult = validateWorldYearStartRuntimeState(yearStartEntry.specificState);
    if (!yearStartRuntimeResult.ok) {
      return failure(
        prefixIssues(
          yearStartRuntimeResult.issues,
          "/processorRuntimeStates/processorSpecificStates/world-year-start",
        ),
      );
    }

    const preYearStartWorldState = working.worldState;
    const preYearStartProcessorRuntimeStates = working.processorRuntimeStates;
    const preYearStartEventAllocationNextSequence = eventStartSequence;
    const preYearStartEventStream =
      mode === "public" ? working.eventStream : session.runtimeState.eventStream;

    const yearStartPhase = runWorldYearStartPhase({
      worldState: working.worldState,
      worldCalendar,
      yearStartProcessorManifest: session.context.runRuleSnapshot.yearStartProcessorManifest,
      worldCalendarConfigHash: session.context.runRuleSnapshot.worldCalendarConfigHash,
      yearStartProcessorManifestHash:
        session.context.runRuleSnapshot.yearStartProcessorManifestHash,
      yearStartRuntime: yearStartRuntimeResult.value,
      simulationId: session.context.simulationId,
      startSequence: eventStartSequence,
    });
    if (!yearStartPhase.ok) {
      return failure(prefixIssues(yearStartPhase.issues, "/yearStartPhase"));
    }

    working.worldState = yearStartPhase.value.worldState;
    const yearStartQualifiedMasterRefresh = applySprint3QualifiedMasterRefresh(
      working,
      session.context.sprint3Config,
      competitiveRecordsByPersonId,
    );
    if (!yearStartQualifiedMasterRefresh.ok) {
      return failure(yearStartQualifiedMasterRefresh.issues);
    }
    eventStartSequence = yearStartPhase.value.nextSequence;
    // Year-start already advanced the date; skip a second calendar step and
    // do not re-run legacy processors (capture already ran on year-end week).
    worldEngineSkipCalendar = true;
    legacyProcessors = [];

    const promotedYearStart = promoteLegacyWorldEngineEvents(
      yearStartPhase.value.events,
      session.context.simulationId,
    );
    if (!promotedYearStart.ok) {
      return failure(promotedYearStart.issues);
    }

    const sealed = sealWorldYearStartReceiptHashes({
      provider,
      preWorldState: preYearStartWorldState,
      postWorldState: yearStartPhase.value.worldState,
      worldRngState: working.worldRngState,
      matchIdGeneratorState: working.matchIdGeneratorState,
      preEventAllocationNextSequence: preYearStartEventAllocationNextSequence,
      postEventAllocationNextSequence: yearStartPhase.value.nextSequence,
      committedEventStream: preYearStartEventStream,
      yearStartPrefixEvents: promotedYearStart.value,
      processorRuntimeStatesBeforeYearStart: preYearStartProcessorRuntimeStates,
      yearStartRuntimeWithSentinelReceipt: yearStartPhase.value.yearStartRuntime,
    });
    if (!sealed.ok) {
      return failure(prefixIssues(sealed.issues, "/yearStartReceiptSeal"));
    }

    const replaced = replaceWorldYearStartRuntimeState(
      specificStates,
      sealed.value.yearStartRuntime,
    );
    if (!replaced.ok) {
      return failure(prefixIssues(replaced.issues, "/processorRuntimeStates"));
    }
    working.processorRuntimeStates = {
      ...working.processorRuntimeStates,
      processorSpecificStates: replaced.value,
    };

    yearStartEvents.push(...promotedYearStart.value);
  } else if (alreadyProcessedCurrentWeek) {
    // After a year-start outer week that trained the new year-start week and
    // skipped WorldEngine calendar advance, the next step must advance only
    // (absoluteWeek += 1) without re-running weekly-training on the same week.
    skipWeeklyAdapter = true;
  }

  let weeklyEnvelopes: Sprint1EventEnvelope[] = [];
  let worldEngineStartSequence = eventStartSequence;

  if (!skipWeeklyAdapter) {
    const enrollmentMaterialized = materializeLiveEnrollmentQueueBoundaries({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      worldState: working.worldState,
      weeklyTrainingSidecars: working.weeklyTrainingSidecars,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      runtimeState: working.mentorshipEntrypointRuntime,
      ...(competitiveRecordsByPersonId === undefined ? {} : { competitiveRecordsByPersonId }),
    });
    if (!enrollmentMaterialized.ok) {
      return failure(
        prefixIssues(enrollmentMaterialized.issues, "/liveEnrollmentQueueMaterialization"),
      );
    }
    working.mentorshipEntrypointRuntime = enrollmentMaterialized.value;

    const enrollmentBoundary = processSprint3EnrollmentIntakeBoundary({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      weeklyTrainingSidecars: working.weeklyTrainingSidecars,
      runtimeState: working.mentorshipEntrypointRuntime,
    });
    if (!enrollmentBoundary.ok) {
      return failure(prefixIssues(enrollmentBoundary.issues, "/enrollmentIntakeBoundary"));
    }
    working.weeklyTrainingSidecars = enrollmentBoundary.value.weeklyTrainingSidecars;
    working.mentorshipEntrypointRuntime = enrollmentBoundary.value.runtimeState;

    const adapterInput: Sprint1WeeklyTrainingAdapterInput = {
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      worldState: working.worldState,
      weeklyTrainingSidecars: working.weeklyTrainingSidecars,
      sprint1Config: session.context.sprint1Config,
      techniqueCatalog: session.context.techniqueCatalog,
      processorRuntimeStates: working.processorRuntimeStates,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      ...(working.mentorshipEntrypointRuntime === undefined
        ? {}
        : { mentorshipEntrypointRuntime: working.mentorshipEntrypointRuntime }),
    };

    const adapterResult = runSprint1WeeklyTrainingAdapter(adapterInput, provider);
    if (!adapterResult.ok) {
      return failure(prefixIssues(adapterResult.issues, "/weeklyTrainingAdapter"));
    }

    working.worldState = adapterResult.value.worldState;
    working.weeklyTrainingSidecars = adapterResult.value.weeklyTrainingSidecars;
    working.processorRuntimeStates = adapterResult.value.processorRuntimeStates;

    const adapterQualifiedMasterRefresh = applySprint3QualifiedMasterRefresh(
      working,
      session.context.sprint3Config,
      competitiveRecordsByPersonId,
    );
    if (!adapterQualifiedMasterRefresh.ok) {
      return failure(adapterQualifiedMasterRefresh.issues);
    }

    const teachingSelectionWeek = processTechniqueTeachingSelectionWeek({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      worldState: working.worldState,
      weeklyTrainingSidecars: working.weeklyTrainingSidecars,
      sprint1Config: session.context.sprint1Config,
      techniqueCatalog: session.context.techniqueCatalog,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      mentorshipRuntime: working.mentorshipEntrypointRuntime,
      runtimeState: working.techniqueTeachingSelectionRuntime,
      ...(working.generatedTechniqueCatalogOverlay === undefined
        ? {}
        : { generatedTechniqueCatalogOverlay: working.generatedTechniqueCatalogOverlay }),
    });
    if (!teachingSelectionWeek.ok) {
      return failure(prefixIssues(teachingSelectionWeek.issues, "/techniqueTeachingSelectionWeek"));
    }
    working.techniqueTeachingSelectionRuntime = teachingSelectionWeek.value.runtimeState;

    const explicitTeachCompletedBefore =
      working.mentorshipEntrypointRuntime?.completedExplicitWeeklyTeachOutcomes.length ?? 0;
    const explicitTeachMaterialized = materializeLiveExplicitWeeklyTeachQueueRecords({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      worldState: working.worldState,
      weeklyTrainingSidecars: working.weeklyTrainingSidecars,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      sprint1Config: session.context.sprint1Config,
      techniqueCatalog: session.context.techniqueCatalog,
      runtimeState: working.mentorshipEntrypointRuntime,
    });
    if (!explicitTeachMaterialized.ok) {
      return failure(
        prefixIssues(explicitTeachMaterialized.issues, "/liveExplicitTeachQueueMaterialization"),
      );
    }
    working.mentorshipEntrypointRuntime = explicitTeachMaterialized.value;

    const explicitTeachWeek = processExplicitWeeklyTeachWeek({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      techniqueCatalog: session.context.techniqueCatalog,
      runtimeState: working.mentorshipEntrypointRuntime,
    });
    if (!explicitTeachWeek.ok) {
      return failure(prefixIssues(explicitTeachWeek.issues, "/explicitWeeklyTeachWeek"));
    }
    working.mentorshipEntrypointRuntime = explicitTeachWeek.value.runtimeState;

    const explicitTeachCompletedAfter =
      working.mentorshipEntrypointRuntime?.completedExplicitWeeklyTeachOutcomes.length ?? 0;
    const newExplicitTeachOutcomes =
      working.mentorshipEntrypointRuntime?.completedExplicitWeeklyTeachOutcomes.slice(
        explicitTeachCompletedBefore,
        explicitTeachCompletedAfter,
      ) ?? [];
    if (newExplicitTeachOutcomes.length > 0) {
      const explicitTeachWorldApplied = applyExplicitWeeklyTeachOutcomesToWorldState({
        worldState: working.worldState,
        absoluteWeek: working.worldState.worldDate.absoluteWeek,
        sprint1Config: session.context.sprint1Config,
        techniqueCatalog: session.context.techniqueCatalog,
        completedEntries: newExplicitTeachOutcomes,
      });
      if (!explicitTeachWorldApplied.ok) {
        return failure(
          prefixIssues(explicitTeachWorldApplied.issues, "/explicitWeeklyTeachWorldPersistence"),
        );
      }
      working.worldState = explicitTeachWorldApplied.value;
    }

    const otlWeek = processOriginalTechniqueLifecycleWeek({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      runSeed: session.context.simulationIdentity.seed,
      worldState: working.worldState,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      runtimeState: working.originalTechniqueLifecycleRuntime,
    });
    if (!otlWeek.ok) {
      return failure(prefixIssues(otlWeek.issues, "/originalTechniqueLifecycleWeek"));
    }
    working.originalTechniqueLifecycleRuntime = otlWeek.value.runtimeState;

    const otlLossWeek = processOriginalTechniqueLossWeek({
      absoluteWeek: working.worldState.worldDate.absoluteWeek,
      worldState: working.worldState,
      ...(session.context.sprint3Config === undefined
        ? {}
        : { sprint3Config: session.context.sprint3Config }),
      runtimeState: working.originalTechniqueLifecycleRuntime,
      mentorshipRuntime: working.mentorshipEntrypointRuntime,
    });
    if (!otlLossWeek.ok) {
      return failure(prefixIssues(otlLossWeek.issues, "/originalTechniqueLossWeek"));
    }
    working.originalTechniqueLifecycleRuntime = otlLossWeek.value.runtimeState;

    const weeklyAllocation = allocateWeeklyTrainingEventCandidates({
      candidates: adapterResult.value.eventCandidates,
      startSequence: eventStartSequence,
      simulationId: session.context.simulationId,
      worldDate: working.worldState.worldDate,
      sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
    });
    if (!weeklyAllocation.ok) {
      return failure(prefixIssues(weeklyAllocation.issues, "/weeklyEventAllocation"));
    }

    weeklyEnvelopes = weeklyAllocation.value.envelopes;
    worldEngineStartSequence = weeklyAllocation.value.nextSequence;
  }

  let worldEngineResult;
  try {
    worldEngineResult = runWorldOneWeek({
      state: working.worldState,
      processors: legacyProcessors,
      startSequence: worldEngineStartSequence,
      skipCalendarStep: worldEngineSkipCalendar,
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

  const worldEngineQualifiedMasterRefresh = applySprint3QualifiedMasterRefresh(
    working,
    session.context.sprint3Config,
    competitiveRecordsByPersonId,
  );
  if (!worldEngineQualifiedMasterRefresh.ok) {
    return failure(worldEngineQualifiedMasterRefresh.issues);
  }

  const promotedWorldEvents = promoteLegacyWorldEngineEvents(
    worldEngineResult.events,
    session.context.simulationId,
  );
  if (!promotedWorldEvents.ok) {
    return failure(promotedWorldEvents.issues);
  }

  const appendedEvents: Sprint1EventEnvelope[] = [
    ...yearStartEvents,
    ...weeklyEnvelopes,
    ...promotedWorldEvents.value,
  ];

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
    ...(working.originalTechniqueLifecycleRuntime === undefined
      ? {}
      : { originalTechniqueLifecycleRuntime: working.originalTechniqueLifecycleRuntime }),
    ...(working.mentorshipEntrypointRuntime === undefined
      ? {}
      : { mentorshipEntrypointRuntime: working.mentorshipEntrypointRuntime }),
    ...(working.techniqueTeachingSelectionRuntime === undefined
      ? {}
      : { techniqueTeachingSelectionRuntime: working.techniqueTeachingSelectionRuntime }),
    ...(working.generatedTechniqueCatalogOverlay === undefined
      ? {}
      : { generatedTechniqueCatalogOverlay: working.generatedTechniqueCatalogOverlay }),
    ...(working.sprint2CompetitiveRecordRuntime === undefined
      ? {}
      : { sprint2CompetitiveRecordRuntime: working.sprint2CompetitiveRecordRuntime }),
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
  onBeforeYearStartPhase?: (worldState: Sprint1RunRuntimeState["worldState"]) => void,
): ValidationResult<Sprint1RunSession> {
  const transition = executeSprint1WeeklyTransitionDraft(
    session,
    provider,
    legacyProcessors,
    "trusted",
    onBeforeYearStartPhase,
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
export function runSprint1Weeks(
  session: Sprint1RunSession,
  weeks: number,
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
  const onBeforeYearStartPhase = options.onBeforeYearStartPhase;

  if (!Number.isSafeInteger(weeks) || weeks < 0) {
    return failure([
      {
        path: "/weeks",
        message: "weeks must be a non-negative safe integer",
        actual: weeks,
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
      onBeforeYearStartPhase,
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

/**
 * G296 verification-path only: same trust boundary as {@link runSprint1Weeks} but
 * accepts a prebuilt owned event stream (e.g. disk-spilled prefix + live tail).
 */
export type RunSprint1WeeksWithOwnedStreamOptions = RunSprint1YearsOptions & {
  /** G296 verification-path only: skip O(history) start/end full session rescans when prefix is disk-spilled. */
  trustValidatedWeeklyTransitionsWithoutFinalRescan?: boolean;
};

export function runSprint1WeeksWithPrebuiltOwnedEventStream(
  session: Sprint1RunSession,
  weeks: number,
  ownedEventStream: Sprint1EventEnvelope[],
  provider: Sha256Provider,
  options: RunSprint1WeeksWithOwnedStreamOptions = {},
): ValidationResult<Sprint1RunSession> {
  const validated =
    options.trustValidatedWeeklyTransitionsWithoutFinalRescan === true
      ? success(session)
      : validateSessionAtBoundary(session, provider);
  if (!validated.ok) {
    return failure(prefixIssues(validated.issues, "/session"));
  }
  const validatedLegacyProcessors = validateLegacyProcessors(options.legacyProcessors ?? []);
  if (!validatedLegacyProcessors.ok) {
    return failure(validatedLegacyProcessors.issues);
  }
  const legacyProcessors = options.legacyProcessors ?? [];
  const onAfterValidatedWeek = options.onAfterValidatedWeek;
  const onBeforeYearStartPhase = options.onBeforeYearStartPhase;

  if (!Number.isSafeInteger(weeks) || weeks < 0) {
    return failure([
      {
        path: "/weeks",
        message: "weeks must be a non-negative safe integer",
        actual: weeks,
      },
    ]);
  }

  if (weeks === 0) {
    return success(validated.value);
  }

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
      onBeforeYearStartPhase,
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

  if (options.trustValidatedWeeklyTransitionsWithoutFinalRescan === true) {
    return success(current);
  }

  const finalValidated = validateSessionAtBoundary(current, provider);
  if (!finalValidated.ok) {
    return failure(prefixIssues(finalValidated.issues, "/finalSession"));
  }
  return success(finalValidated.value);
}

/**
 * Advance the session by `years * 48` weeks using {@link runSprint1Weeks}.
 */
export function runSprint1Years(
  session: Sprint1RunSession,
  years: number,
  provider: Sha256Provider,
  options: RunSprint1YearsOptions = {},
): ValidationResult<Sprint1RunSession> {
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

  return runSprint1Weeks(session, weeks, provider, options);
}
