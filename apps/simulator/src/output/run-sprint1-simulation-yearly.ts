import {
  runSprint1WeeklyStep,
  type Sha256Provider,
  type Sprint1EventEnvelope,
  type Sprint1RunSession,
  type ValidationResult,
} from "@shared-world/simulation-core";
import { createYearEndCaptureProcessor, type YearEndCapture } from "./run-simulation-yearly.js";
import { aggregateYearlyStatisticsRow, type YearlyStatisticsRow } from "./yearly-statistics.js";
import { evaluateReferenceIntegrity } from "./world-integrity.js";
import type { ReferenceIntegrityResult } from "./types.js";

const WEEKS_PER_YEAR = 48;

export type Sprint1YearEndCapture = YearEndCapture;

export type Sprint1SimulationWithYearlyResult = {
  finalSession: Sprint1RunSession;
  events: readonly Sprint1EventEnvelope[];
  yearEnds: Sprint1YearEndCapture[];
  weeksExecuted: number;
  finalIntegrity: ReferenceIntegrityResult;
};

function countEventsForYear(events: readonly Sprint1EventEnvelope[], worldYear: number): number {
  let count = 0;
  for (const event of events) {
    if (event.worldDate.year === worldYear) {
      count += 1;
    }
  }
  return count;
}

/**
 * Advance a Sprint1 session by `years * 48` weeks, capturing year-end statistics
 * after legacy WorldEngine processors on March week 4 and before calendar year-start.
 *
 * Injects {@link createYearEndCaptureProcessor} via runSprint1WeeklyStep legacyProcessors
 * only (weekly-training stays outside legacy WorldProcessor registration).
 */
export function runSprint1SimulationWithYearlyCapture(input: {
  initialSession: Sprint1RunSession;
  years: number;
  sha256Provider: Sha256Provider;
}): Sprint1SimulationWithYearlyResult {
  const stepped = runSprint1SimulationWithYearlyCaptureResult(input);
  if (!stepped.ok) {
    throw new Error(`Sprint1 yearly simulation failed: ${JSON.stringify(stepped.issues)}`);
  }
  return stepped.value;
}

export function runSprint1SimulationWithYearlyCaptureResult(input: {
  initialSession: Sprint1RunSession;
  years: number;
  sha256Provider: Sha256Provider;
}): ValidationResult<Sprint1SimulationWithYearlyResult> {
  if (!Number.isSafeInteger(input.years) || input.years < 1) {
    return {
      ok: false,
      issues: [
        {
          path: "/years",
          message: "years must be a positive safe integer",
          actual: input.years,
        },
      ],
    };
  }

  const totalWeeks = input.years * WEEKS_PER_YEAR;
  if (!Number.isSafeInteger(totalWeeks)) {
    return {
      ok: false,
      issues: [
        {
          path: "/years",
          message: "years * 48 must be a safe integer",
          actual: input.years,
        },
      ],
    };
  }

  let session = input.initialSession;
  const yearEnds: Sprint1YearEndCapture[] = [];
  let weeksExecuted = 0;

  for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex += 1) {
    const captureSink = { snapshots: [] as Sprint1RunSession["runtimeState"]["worldState"][] };
    const step = runSprint1WeeklyStep(session, input.sha256Provider, {
      legacyProcessors: [createYearEndCaptureProcessor(captureSink)],
    });
    if (!step.ok) {
      return step;
    }
    session = step.value;
    weeksExecuted += 1;

    if (captureSink.snapshots.length === 0) {
      continue;
    }
    if (captureSink.snapshots.length !== 1) {
      return {
        ok: false,
        issues: [
          {
            path: "/yearEndCapture",
            message: `expected at most one year-end snapshot per week, got ${String(captureSink.snapshots.length)}`,
            actual: captureSink.snapshots.length,
            expected: "0 or 1",
          },
        ],
      };
    }

    const yearEndState = captureSink.snapshots[0]!;
    const worldYear = yearEndState.worldDate.year;
    const allEvents = session.runtimeState.eventStream;
    const eventCountThisYear = countEventsForYear(allEvents, worldYear);
    const eventCountCumulative = allEvents.length;
    const integrity = evaluateReferenceIntegrity(yearEndState);
    const row: YearlyStatisticsRow = aggregateYearlyStatisticsRow({
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

  if (yearEnds.length !== input.years) {
    return {
      ok: false,
      issues: [
        {
          path: "/yearEnds",
          message: `expected ${String(input.years)} year-end captures, got ${String(yearEnds.length)}`,
          actual: yearEnds.length,
          expected: String(input.years),
        },
      ],
    };
  }

  return {
    ok: true,
    value: {
      finalSession: session,
      events: session.runtimeState.eventStream,
      yearEnds,
      weeksExecuted,
      finalIntegrity: evaluateReferenceIntegrity(session.runtimeState.worldState),
    },
  };
}
