import {
  cloneWorldEngineState,
  runSprint1Years,
  type Sha256Provider,
  type Sprint1EventEnvelope,
  type Sprint1RunSession,
  type ValidationResult,
} from "@shared-world/simulation-core";
import type { YearEndCapture } from "./run-simulation-yearly.js";
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
 * on the configured world-year end week immediately before the year-start phase.
 *
 * Uses {@link runSprint1Years} validated-session trust boundary with
 * `onBeforeYearStartPhase` (not legacy WorldProcessor registration) so capture
 * runs while the draft is still on the year-end week.
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

  const pendingYearEnds: Sprint1YearEndCapture[] = [];
  const yearEnds: Sprint1YearEndCapture[] = [];

  const yearsResult = runSprint1Years(input.initialSession, input.years, input.sha256Provider, {
    onBeforeYearStartPhase: (worldState) => {
      const yearEndState = cloneWorldEngineState(worldState);
      const worldYear = yearEndState.worldDate.year;
      const integrity = evaluateReferenceIntegrity(yearEndState);
      pendingYearEnds.push({
        worldYear,
        state: yearEndState,
        integrity,
        // row filled after the week commits with cumulative event counts
        row: aggregateYearlyStatisticsRow({
          yearEndState,
          integrity,
          eventCountThisYear: 0,
          eventCountCumulative: 0,
        }),
      });
    },
    onAfterValidatedWeek: (observation) => {
      for (const event of observation.appendedEvents) {
        const year = event.worldDate.year;
        eventCountByYear.set(year, (eventCountByYear.get(year) ?? 0) + 1);
      }
      if (pendingYearEnds.length === 0) {
        return;
      }
      if (pendingYearEnds.length !== 1) {
        throw new Error(
          `expected at most one pending year-end capture per week, got ${String(pendingYearEnds.length)}`,
        );
      }
      const pending = pendingYearEnds.pop()!;
      const eventCountThisYear = eventCountByYear.get(pending.worldYear) ?? 0;
      const eventCountCumulative = observation.eventCountCumulative;
      const row: YearlyStatisticsRow = aggregateYearlyStatisticsRow({
        yearEndState: pending.state,
        integrity: pending.integrity,
        eventCountThisYear,
        eventCountCumulative,
      });
      yearEnds.push({
        worldYear: pending.worldYear,
        state: pending.state,
        integrity: pending.integrity,
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
