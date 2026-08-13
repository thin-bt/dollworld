/**
 * Sprint1 outer-transaction year-start phase (CAL-JAN-SYNC 0.2.4 / 0.2.6).
 * Runs only when the committed current week is the configured world-year end week.
 * Advances absoluteWeek by exactly 1, then applies enabled manifest slots.
 *
 * Receipt aggregate hashes use the 0.2.4 sentinel method for
 * postTransactionAggregateHash (year-start phase boundary, before weekly).
 */
import type { WorldCalendarConfig } from "../config/types.js";
import { convertWorldCalendarTransitions } from "../events/from-transitions.js";
import type { EventEnvelope } from "../events/types.js";
import type { SimulationId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldCalendarTransition } from "../world-calendar.js";
import {
  advanceOneWeek,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
  validateWorldDate,
  type WorldDate,
} from "../world-date.js";
import type { ProcessorRuntimeState, WorldEngineState } from "../world-engine/types.js";
import {
  type ActiveYearStartProcessorManifest,
  WORLD_YEAR_START_PROCESSOR_ID,
} from "./active-year-start-processor-manifest.js";
import type { MatchIdGeneratorState } from "./match-id-generator.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import {
  YEAR_START_AGGREGATE_SENTINEL_HASH,
  buildWorldYearStartTransactionAggregate,
  finalizePostTransactionAggregateHash,
} from "./year-start-aggregate.js";
import {
  createDefaultYearStartProcessorRegistry,
  invokeYearStartProcessorsViaRegistry,
  type YearStartProcessorRegistry,
} from "./year-start-processor-registry.js";
import {
  WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION,
  WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
  type WorldYearStartReceipt,
  type WorldYearStartRuntimeState,
} from "./world-year-start-runtime-state.js";

/** Sentinel used only while computing postTransactionAggregateHash (0.2.4 §2.4). */
export const YEAR_START_SENTINEL_HASH = YEAR_START_AGGREGATE_SENTINEL_HASH;

export type YearStartPhaseHashContext = {
  provider: Sha256Provider;
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
  /** Committed event stream before year-start prefix events. */
  committedEventStream: readonly unknown[];
  /** processorRuntimeStates before year-start receipt append. */
  processorRuntimeStates: ProcessorRuntimeState;
};

export type YearStartPhaseInput = {
  worldState: WorldEngineState;
  worldCalendar: WorldCalendarConfig;
  yearStartProcessorManifest: ActiveYearStartProcessorManifest;
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
  yearStartRuntime: WorldYearStartRuntimeState;
  simulationId: SimulationId;
  startSequence: number;
  /** Production registry; defaults to createDefaultYearStartProcessorRegistry(). */
  yearStartProcessorRegistry?: YearStartProcessorRegistry;
  /**
   * When provided, receipt pre/post aggregate + RNG hashes are sealed for the
   * year-start phase boundary (before normal weekly processors).
   * Events used for post eventStreamHash must already be Sprint1 envelopes
   * matching the stream that will be committed (pass via seal after promote).
   */
  hashContext?: YearStartPhaseHashContext;
};

export type YearStartPhaseResult = {
  worldState: WorldEngineState;
  worldDate: WorldDate;
  events: readonly EventEnvelope[];
  yearStartRuntime: WorldYearStartRuntimeState;
  nextSequence: number;
  /** Events belonging to the year-start receipt prefix only. */
  receiptEventCount: number;
  /** Set when hashContext was supplied and sealing succeeded. */
  sealedReceipt?: WorldYearStartReceipt;
};

function mismatch(
  path: string,
  message: string,
  actual?: unknown,
  expected?: unknown,
): ValidationIssue {
  return {
    path,
    message,
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected: String(expected) } : {}),
  };
}

/**
 * Seal receipt hashes after year-start events are promoted to Sprint1 envelopes.
 * Mutates only the latest receipt inside yearStartRuntime (COW via deepFreeze).
 */
export function sealWorldYearStartReceiptHashes(input: {
  provider: Sha256Provider;
  preWorldState: WorldEngineState;
  postWorldState: WorldEngineState;
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
  preEventAllocationNextSequence: number;
  postEventAllocationNextSequence: number;
  committedEventStream: readonly unknown[];
  yearStartPrefixEvents: readonly unknown[];
  processorRuntimeStatesBeforeYearStart: ProcessorRuntimeState;
  yearStartRuntimeWithSentinelReceipt: WorldYearStartRuntimeState;
}): ValidationResult<{
  yearStartRuntime: WorldYearStartRuntimeState;
  receipt: WorldYearStartReceipt;
}> {
  const receipts = input.yearStartRuntimeWithSentinelReceipt.receipts;
  if (receipts.length < 1) {
    return failure([mismatch("/receipts", "year-start seal requires at least one draft receipt")]);
  }
  const draftReceipt = receipts[receipts.length - 1]!;
  if (draftReceipt.postTransactionAggregateHash !== YEAR_START_SENTINEL_HASH) {
    return failure([
      mismatch(
        "/receipts/-1/postTransactionAggregateHash",
        "draft receipt must use all-zero sentinel before seal",
        draftReceipt.postTransactionAggregateHash,
        YEAR_START_SENTINEL_HASH,
      ),
    ]);
  }

  const preBuilt = buildWorldYearStartTransactionAggregate(
    {
      worldState: input.preWorldState,
      worldRngState: input.worldRngState,
      matchIdGeneratorState: input.matchIdGeneratorState,
      eventAllocationNextSequence: input.preEventAllocationNextSequence,
      eventStream: input.committedEventStream,
      processorRuntimeStates: input.processorRuntimeStatesBeforeYearStart,
    },
    input.provider,
  );
  if (!preBuilt.ok) {
    return failure(
      preBuilt.issues.map((issue) => ({
        ...issue,
        path: `/preTransaction${issue.path}`,
      })),
    );
  }

  const replacedForHash = replaceWorldYearStartRuntimeState(
    input.processorRuntimeStatesBeforeYearStart.processorSpecificStates ?? [],
    input.yearStartRuntimeWithSentinelReceipt,
  );
  if (!replacedForHash.ok) {
    return replacedForHash;
  }
  const processorRuntimeStatesWithSentinel: ProcessorRuntimeState = {
    ...input.processorRuntimeStatesBeforeYearStart,
    processorSpecificStates: replacedForHash.value,
  };

  const postEventStream = [...input.committedEventStream, ...input.yearStartPrefixEvents];
  const postBuilt = finalizePostTransactionAggregateHash({
    provider: input.provider,
    worldState: input.postWorldState,
    worldRngState: input.worldRngState,
    matchIdGeneratorState: input.matchIdGeneratorState,
    eventAllocationNextSequence: input.postEventAllocationNextSequence,
    eventStreamIncludingYearStartPrefix: postEventStream,
    processorRuntimeStatesWithSentinelReceipt: processorRuntimeStatesWithSentinel,
  });
  if (!postBuilt.ok) {
    return failure(
      postBuilt.issues.map((issue) => ({
        ...issue,
        path: `/postTransaction${issue.path.startsWith("/") ? issue.path : `/${issue.path}`}`,
      })),
    );
  }

  if (preBuilt.value.worldRngStateHash !== postBuilt.value.postTransactionRngStateHash) {
    return failure([
      mismatch(
        "/postTransactionRngStateHash",
        "year-start phase must not consume World RNG; pre/post RNG hashes must match",
        postBuilt.value.postTransactionRngStateHash,
        preBuilt.value.worldRngStateHash,
      ),
    ]);
  }

  const sealedReceipt: WorldYearStartReceipt = {
    ...draftReceipt,
    preTransactionAggregateHash: preBuilt.value.aggregateHash,
    preTransactionRngStateHash: preBuilt.value.worldRngStateHash,
    postTransactionAggregateHash: postBuilt.value.postTransactionAggregateHash,
    postTransactionRngStateHash: postBuilt.value.postTransactionRngStateHash,
  };

  const yearStartRuntime: WorldYearStartRuntimeState = deepFreezePlainJson({
    schemaVersion: WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
    lastCompletedWorldYearStart:
      input.yearStartRuntimeWithSentinelReceipt.lastCompletedWorldYearStart,
    receipts: [...receipts.slice(0, -1), sealedReceipt],
  });

  return success({ yearStartRuntime, receipt: sealedReceipt });
}

/**
 * Execute the year-start phase for a draft outer weekly transaction.
 * Caller must discard the draft on any failure (no partial commit).
 *
 * When `hashContext` is omitted, receipt hash fields remain the all-zero
 * sentinel (tests / isolated phase). Production weekly-step always seals
 * after promoting year-start events to Sprint1 envelopes.
 */
export function runWorldYearStartPhase(
  input: YearStartPhaseInput,
): ValidationResult<YearStartPhaseResult> {
  const {
    worldCalendar,
    yearStartProcessorManifest,
    worldCalendarConfigHash,
    yearStartProcessorManifestHash,
    simulationId,
    startSequence,
  } = input;

  try {
    validateWorldDate(input.worldState.worldDate, worldCalendar);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([mismatch("/worldState/worldDate", `invalid worldDate: ${detail}`, detail)]);
  }

  if (!isWorldYearEndWeek(input.worldState.worldDate, worldCalendar)) {
    return failure([
      mismatch(
        "/worldState/worldDate",
        "year-start phase requires current week to be configured world-year end week",
        input.worldState.worldDate,
        "isWorldYearEndWeek",
      ),
    ]);
  }

  const previousWorldYear = input.worldState.worldDate.year;
  const nextDate = advanceOneWeek(input.worldState.worldDate, worldCalendar);
  if (!isWorldYearStartWeek(nextDate, worldCalendar) || nextDate.year < 2) {
    return failure([
      mismatch(
        "/worldDate",
        "year-start advance must land on world year >= 2 start week",
        nextDate,
      ),
    ]);
  }
  if (nextDate.year !== previousWorldYear + 1) {
    return failure([
      mismatch(
        "/worldDate/year",
        "year-start advance must increment world year by 1",
        nextDate.year,
        previousWorldYear + 1,
      ),
    ]);
  }
  if (input.yearStartRuntime.lastCompletedWorldYearStart !== previousWorldYear) {
    return failure([
      mismatch(
        "/yearStartRuntime/lastCompletedWorldYearStart",
        "lastCompletedWorldYearStart must equal the year being finalized",
        input.yearStartRuntime.lastCompletedWorldYearStart,
        previousWorldYear,
      ),
    ]);
  }

  const registry = input.yearStartProcessorRegistry ?? createDefaultYearStartProcessorRegistry();
  const invoked = invokeYearStartProcessorsViaRegistry({
    registry,
    manifest: yearStartProcessorManifest,
    previousWorldYear,
    newWorldYear: nextDate.year,
    persons: input.worldState.persons,
  });
  if (!invoked.ok) {
    return failure(invoked.issues);
  }

  const transitions: WorldCalendarTransition[] = [...invoked.value.transitions];
  const nextPersons = invoked.value.persons;

  let events: EventEnvelope[];
  try {
    events = convertWorldCalendarTransitions({
      transitions,
      simulationId,
      worldDate: nextDate,
      startSequence,
      worldCalendar,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      mismatch("/yearStartEvents", `convertWorldCalendarTransitions failed: ${detail}`, detail),
    ]);
  }

  if (events.length < 1) {
    return failure([
      mismatch("/yearStartEvents", "year-start phase must emit at least world.year_started"),
    ]);
  }

  const nextSequence = startSequence + events.length;
  if (!Number.isSafeInteger(nextSequence) || nextSequence < 0) {
    return failure([
      mismatch("/nextSequence", "nextSequence must be a non-negative safe integer", nextSequence),
    ]);
  }

  const receipt: WorldYearStartReceipt = {
    schemaVersion: WORLD_YEAR_START_RECEIPT_SCHEMA_VERSION,
    simulationId,
    worldYear: nextDate.year,
    worldDate: nextDate,
    worldCalendarConfigHash,
    yearStartProcessorManifestHash,
    previousWorldYear,
    preTransactionAggregateHash: YEAR_START_SENTINEL_HASH,
    preTransactionRngStateHash: YEAR_START_SENTINEL_HASH,
    postTransactionAggregateHash: YEAR_START_SENTINEL_HASH,
    postTransactionRngStateHash: YEAR_START_SENTINEL_HASH,
    firstEventSequence: startSequence,
    eventCount: events.length,
  };

  const yearStartRuntimeDraft: WorldYearStartRuntimeState = deepFreezePlainJson({
    schemaVersion: WORLD_YEAR_START_RUNTIME_STATE_SCHEMA_VERSION,
    lastCompletedWorldYearStart: nextDate.year,
    receipts: [...input.yearStartRuntime.receipts, receipt],
  });

  const worldState: WorldEngineState = {
    ...input.worldState,
    worldDate: { ...nextDate },
    persons: nextPersons,
  };

  if (input.hashContext === undefined) {
    return success({
      worldState,
      worldDate: nextDate,
      events,
      yearStartRuntime: yearStartRuntimeDraft,
      nextSequence,
      receiptEventCount: events.length,
    });
  }

  // hashContext present but Sprint1 promotion happens in weekly-step: leave
  // sentinel draft for sealWorldYearStartReceiptHashes after promote.
  return success({
    worldState,
    worldDate: nextDate,
    events,
    yearStartRuntime: yearStartRuntimeDraft,
    nextSequence,
    receiptEventCount: events.length,
  });
}

/**
 * Replace the world-year-start specificState entry inside processorSpecificStates.
 */
export function replaceWorldYearStartRuntimeState(
  processorSpecificStates: readonly {
    processorId: string;
    specificState: unknown;
  }[],
  yearStartRuntime: WorldYearStartRuntimeState,
): ValidationResult<
  Array<{
    processorId: string;
    specificState: unknown;
  }>
> {
  const next = processorSpecificStates.map((entry) => cloneValidatedPlainJson(entry));
  const index = next.findIndex((entry) => entry.processorId === WORLD_YEAR_START_PROCESSOR_ID);
  if (index < 0) {
    return failure([
      mismatch(
        "/processorSpecificStates",
        "missing world-year-start processorSpecificStates entry",
      ),
    ]);
  }
  next[index] = {
    processorId: WORLD_YEAR_START_PROCESSOR_ID,
    specificState: yearStartRuntime,
  };
  return success(next);
}
