import {
  cloneWorldEngineState,
  runWorldOneWeek,
  runWorldWeeks,
  type EventEnvelope,
  type ProcessorRuntimeState,
  type WorldEngineState,
  type WorldProcessor,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
} from "@shared-world/simulation-core";
import { evaluateReferenceIntegrity } from "./world-integrity.js";
import { aggregateYearlyStatisticsRow, type YearlyStatisticsRow } from "./yearly-statistics.js";
import type { ReferenceIntegrityResult } from "./types.js";

const WEEKS_TO_MARCH_WEEK4 = 47;
const YEAR_END_CAPTURE_PROCESSOR_ID = "simulator/year-end-state-capture";

export type YearEndCapture = {
  worldYear: number;
  state: WorldEngineState;
  integrity: ReferenceIntegrityResult;
  row: YearlyStatisticsRow;
};

export type SimulationWithYearlyResult = {
  finalState: WorldEngineState;
  events: EventEnvelope[];
  yearEnds: YearEndCapture[];
  nextSequence: number;
  weeksExecuted: number;
  finalIntegrity: ReferenceIntegrityResult;
  /** Final processor RNG states after the last week (includes year-end capture processor). */
  processorRuntimeState: ProcessorRuntimeState;
};

type YearEndCaptureSink = {
  snapshots: WorldEngineState[];
};

/**
 * Trailing processor: on the configured world-year end week, snapshot state
 * after prior processors and before calendar year-start. Returns the input
 * state unchanged.
 */
export function createYearEndCaptureProcessor(sink: YearEndCaptureSink): WorldProcessor {
  return {
    processorId: YEAR_END_CAPTURE_PROCESSOR_ID,
    process({ state }) {
      if (isWorldYearEndWeek(state.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG)) {
        // Clone for statistics snapshot; never mutate the live week draft.
        sink.snapshots.push(cloneWorldEngineState(state));
      }
      return state;
    },
  };
}

function countEventsForYear(events: readonly EventEnvelope[], worldYear: number): number {
  let count = 0;
  for (const event of events) {
    if (event.worldDate.year === worldYear) {
      count += 1;
    }
  }
  return count;
}

/**
 * Run N world years, capturing year-end state after week-48 processors and
 * before next-year year-start (via YearStatsFinalizedNotice + capture processor).
 */
export function runSimulationWithYearlyCapture(input: {
  initialState: WorldEngineState;
  years: number;
  startSequence: number;
  processors?: readonly WorldProcessor[];
  /** Events already queued for output (e.g. initial-world generation). */
  priorEvents?: readonly EventEnvelope[];
}): SimulationWithYearlyResult {
  if (!Number.isSafeInteger(input.years) || input.years < 1) {
    throw new Error("years must be a positive safe integer");
  }

  const userProcessors = input.processors ?? [];
  const priorEvents = input.priorEvents ?? [];
  const captureSink: YearEndCaptureSink = { snapshots: [] };
  const processors: WorldProcessor[] = [
    ...userProcessors,
    createYearEndCaptureProcessor(captureSink),
  ];

  let state = input.initialState;
  let sequence = input.startSequence;
  let runtime: ProcessorRuntimeState | undefined;
  const allEvents: EventEnvelope[] = [];
  const yearEnds: YearEndCapture[] = [];
  let weeksExecuted = 0;
  /** Events dated after the current open year; counted in a later thisYear. */
  let carryEvents: EventEnvelope[] = [...priorEvents];

  for (let i = 0; i < input.years; i += 1) {
    captureSink.snapshots = [];

    const toMarchInput = {
      state,
      processors,
      weeks: WEEKS_TO_MARCH_WEEK4,
      startSequence: sequence,
      ...(runtime !== undefined ? { processorRuntimeState: runtime } : {}),
    };
    const toMarch = runWorldWeeks(toMarchInput);
    state = toMarch.state;
    sequence = toMarch.nextSequence;
    runtime = toMarch.processorRuntimeState;
    allEvents.push(...toMarch.events);
    weeksExecuted += toMarch.weeksExecuted;
    carryEvents = [...carryEvents, ...toMarch.events];

    const lastWeekInput = {
      state,
      processors,
      startSequence: sequence,
      ...(runtime !== undefined ? { processorRuntimeState: runtime } : {}),
    };
    const lastWeek = runWorldOneWeek(lastWeekInput);
    state = lastWeek.state;
    sequence = lastWeek.nextSequence;
    runtime = lastWeek.processorRuntimeState;
    allEvents.push(...lastWeek.events);
    weeksExecuted += lastWeek.weeksExecuted;
    carryEvents = [...carryEvents, ...lastWeek.events];

    const notice = lastWeek.yearStatsFinalizedNotices[0];
    if (notice === undefined || lastWeek.yearStatsFinalizedNotices.length !== 1) {
      throw new Error(
        `expected exactly one YearStatsFinalizedNotice on year-end week, got ${String(lastWeek.yearStatsFinalizedNotices.length)}`,
      );
    }
    const worldYear = notice.worldYear;
    if (captureSink.snapshots.length !== 1) {
      throw new Error(
        `year-end capture processor expected 1 snapshot for worldYear=${String(worldYear)}, got ${String(captureSink.snapshots.length)}`,
      );
    }
    const yearEndState = captureSink.snapshots[0]!;
    // Capture is taken on the year-end week; YearStatsFinalizedNotice.worldDate is
    // the following configured year-start week (CAL-JAN 0.2.4).
    if (yearEndState.worldDate.year !== worldYear) {
      throw new Error(
        `captured year-end state worldYear ${String(yearEndState.worldDate.year)} does not match notice.worldYear ${String(worldYear)}`,
      );
    }
    if (!isWorldYearEndWeek(yearEndState.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG)) {
      throw new Error("captured year-end state must be on the configured world-year end week");
    }
    if (
      notice.worldDate.year !== worldYear + 1 ||
      !isWorldYearStartWeek(notice.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG)
    ) {
      throw new Error("YearStatsFinalizedNotice.worldDate must be the next world-year start week");
    }

    const eventCountThisYear = countEventsForYear(carryEvents, worldYear);
    const remaining: EventEnvelope[] = [];
    for (const event of carryEvents) {
      if (event.worldDate.year > worldYear) {
        remaining.push(event);
      } else if (event.worldDate.year < worldYear) {
        throw new Error(
          `event sequence/worldYear mismatch: leftover event year ${String(event.worldDate.year)} before open year ${String(worldYear)}`,
        );
      }
    }
    carryEvents = remaining;

    const eventCountCumulative = priorEvents.length + allEvents.length;

    const integrity = evaluateReferenceIntegrity(yearEndState);
    const row = aggregateYearlyStatisticsRow({
      yearEndState,
      integrity,
      eventCountThisYear,
      eventCountCumulative,
    });

    yearEnds.push({
      worldYear,
      state: yearEndState,
      integrity,
      row,
    });
  }

  if (runtime === undefined) {
    throw new Error("processorRuntimeState was not produced by yearly simulation");
  }

  return {
    finalState: state,
    events: allEvents,
    yearEnds,
    nextSequence: sequence,
    weeksExecuted,
    finalIntegrity: evaluateReferenceIntegrity(state),
    processorRuntimeState: runtime,
  };
}
