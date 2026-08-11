import {
  runSprint1Years,
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

/**
 * Advance a Sprint1 session by `years * 48` weeks, capturing year-end statistics
 * after legacy WorldEngine processors on March week 4 and before calendar year-start.
 *
 * Uses {@link runSprint1Years} validated-session trust boundary with
 * {@link createYearEndCaptureProcessor} as a legacyProcessors hook only
 * (weekly-training stays outside legacy WorldProcessor registration).
 * Year-end rows accumulate event counts from narrow week observations
 * (never the trusted draft Sprint1RunSession).
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

  const eventCountByYear = new Map<number, number>();
  for (const event of input.initialSession.runtimeState.eventStream) {
    const year = event.worldDate.year;
    eventCountByYear.set(year, (eventCountByYear.get(year) ?? 0) + 1);
  }

  const captureSink = {
    snapshots: [] as Sprint1RunSession["runtimeState"]["worldState"][],
  };
  const yearEnds: Sprint1YearEndCapture[] = [];
  let processedCaptures = 0;

  const yearsResult = runSprint1Years(input.initialSession, input.years, input.sha256Provider, {
    legacyProcessors: [createYearEndCaptureProcessor(captureSink)],
    onAfterValidatedWeek: (observation) => {
      for (const event of observation.appendedEvents) {
        const year = event.worldDate.year;
        eventCountByYear.set(year, (eventCountByYear.get(year) ?? 0) + 1);
      }
      if (captureSink.snapshots.length === processedCaptures) {
        return;
      }
      if (captureSink.snapshots.length !== processedCaptures + 1) {
        throw new Error(
          `expected at most one year-end snapshot per week, got ${String(captureSink.snapshots.length - processedCaptures)}`,
        );
      }
      const yearEndState = captureSink.snapshots[processedCaptures]!;
      processedCaptures += 1;
      const worldYear = yearEndState.worldDate.year;
      const eventCountThisYear = eventCountByYear.get(worldYear) ?? 0;
      const eventCountCumulative = observation.eventCountCumulative;
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
    },
  });
  if (!yearsResult.ok) {
    return yearsResult;
  }
  const session = yearsResult.value;

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
      weeksExecuted: totalWeeks,
      finalIntegrity: evaluateReferenceIntegrity(session.runtimeState.worldState),
    },
  };
}
