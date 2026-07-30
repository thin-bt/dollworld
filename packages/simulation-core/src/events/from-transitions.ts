import { MINIMUM_RANK } from "../enums.js";
import type { SimulationId } from "../ids.js";
import type { WorldCalendarTransition } from "../world-calendar.js";
import { isAprilWeek1, validateWorldDate, type WorldDate } from "../world-date.js";
import { assertNonNegativeSafeInteger, eventIdFromSequence } from "./event-id.js";
import { createWorldDateForYearStatsFinalized } from "./factories.js";
import {
  EVENT_ENVELOPE_SCHEMA_VERSION,
  emptyEventEntities,
  type EventEnvelope,
  type PersonDebutedPayload,
} from "./types.js";
import { validateEventEnvelope } from "./validate.js";

export type ConvertWorldCalendarTransitionsInput = {
  transitions: readonly WorldCalendarTransition[];
  simulationId: SimulationId;
  /** World date after the week step that produced these transitions. */
  worldDate: WorldDate;
  startSequence: number;
};

/**
 * Convert S00-004 calendar transitions to EventEnvelope values.
 * Preserves transition order; does not invent missing events.
 */
export function convertWorldCalendarTransitions(
  input: ConvertWorldCalendarTransitionsInput,
): EventEnvelope[] {
  assertNonNegativeSafeInteger(input.startSequence, "startSequence");
  validateWorldDate(input.worldDate);
  if (typeof input.simulationId !== "string" || input.simulationId.length === 0) {
    throw new Error("simulationId must be a non-empty string");
  }

  const transitions = input.transitions;
  if (transitions.length > 0) {
    const lastSequence = input.startSequence + transitions.length - 1;
    if (!Number.isSafeInteger(lastSequence) || lastSequence < 0) {
      throw new Error(
        `startSequence + transitions.length - 1 must be a non-negative safe integer (got ${String(lastSequence)})`,
      );
    }
  }

  const events: EventEnvelope[] = [];
  let sequence = input.startSequence;

  for (const transition of transitions) {
    assertTransitionMatchesWorldDate(transition, input.worldDate);
    const event = transitionToEvent(transition, {
      simulationId: input.simulationId,
      sequence,
      worldDate: input.worldDate,
    });
    validateEventEnvelope(event);
    events.push(event);
    sequence += 1;
  }

  return events;
}

function assertTransitionMatchesWorldDate(
  transition: WorldCalendarTransition,
  worldDate: WorldDate,
): void {
  switch (transition.kind) {
    case "year_stats_finalized": {
      const y = transition.worldYear;
      if (!Number.isSafeInteger(y) || y < 1) {
        throw new Error(
          `year_stats_finalized.worldYear must be a safe integer >= 1 (got ${String(y)})`,
        );
      }
      if (!Number.isSafeInteger(y + 1)) {
        throw new Error(
          `year_stats_finalized.worldYear + 1 must be a safe integer (got ${String(y + 1)})`,
        );
      }
      if (!isAprilWeek1(worldDate)) {
        throw new Error(
          "year_stats_finalized requires post-step worldDate to be April week 1 of the next year",
        );
      }
      if (worldDate.year !== y + 1) {
        throw new Error(
          `year_stats_finalized requires worldDate.year === worldYear + 1 (got ${String(worldDate.year)} vs ${String(y + 1)})`,
        );
      }
      break;
    }
    case "year_started":
      if (transition.worldYear < 2) {
        throw new Error(
          `year_started.worldYear must be >= 2 (got ${String(transition.worldYear)})`,
        );
      }
      if (transition.worldYear !== worldDate.year) {
        throw new Error(
          `year_started.worldYear must equal worldDate.year (got ${String(transition.worldYear)} vs ${String(worldDate.year)})`,
        );
      }
      break;
    case "person_aged":
      if (transition.worldYear !== worldDate.year) {
        throw new Error(
          `person_aged.worldYear must equal worldDate.year (got ${String(transition.worldYear)} vs ${String(worldDate.year)})`,
        );
      }
      if (transition.nextAge !== transition.worldYear - transition.birthYear) {
        throw new Error("person_aged.nextAge must equal worldYear - birthYear");
      }
      break;
    case "person_debuted":
      if (transition.rank !== MINIMUM_RANK) {
        throw new Error("person_debuted.rank must equal MINIMUM_RANK");
      }
      break;
    default:
      break;
  }
}

type TransitionContext = {
  simulationId: SimulationId;
  sequence: number;
  worldDate: WorldDate;
};

function transitionToEvent(
  transition: WorldCalendarTransition,
  ctx: TransitionContext,
): EventEnvelope {
  const base = {
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
    eventId: eventIdFromSequence(ctx.sequence),
    simulationId: ctx.simulationId,
    sequence: ctx.sequence,
    origin: "simulation" as const,
    sourceProcessor: "world-calendar",
  };

  switch (transition.kind) {
    case "year_stats_finalized": {
      const worldDate = createWorldDateForYearStatsFinalized(transition.worldYear);
      return {
        ...base,
        eventType: "world.year_stats_finalized",
        importance: "normal",
        worldDate,
        entities: emptyEventEntities(),
        payload: { worldYear: transition.worldYear },
      };
    }
    case "year_started": {
      assertAprilWeek1(ctx.worldDate);
      return {
        ...base,
        eventType: "world.year_started",
        importance: "normal",
        worldDate: ctx.worldDate,
        entities: emptyEventEntities(),
        payload: { worldYear: transition.worldYear },
      };
    }
    case "person_aged": {
      assertAprilWeek1(ctx.worldDate);
      return {
        ...base,
        eventType: "person.aged",
        importance: "minor",
        worldDate: ctx.worldDate,
        entities: {
          ...emptyEventEntities(),
          personIds: [transition.personId],
        },
        payload: {
          previousAge: transition.previousAge,
          nextAge: transition.nextAge,
          birthYear: transition.birthYear,
          worldYear: transition.worldYear,
        },
      };
    }
    case "career_status_changed": {
      assertAprilWeek1(ctx.worldDate);
      return {
        ...base,
        eventType: "person.career_status_changed",
        importance: "normal",
        worldDate: ctx.worldDate,
        entities: {
          ...emptyEventEntities(),
          personIds: [transition.personId],
        },
        payload: {
          previousCareerStatus: transition.previousCareerStatus,
          nextCareerStatus: transition.nextCareerStatus,
        },
      };
    }
    case "person_debuted": {
      assertAprilWeek1(ctx.worldDate);
      const previous = transition.previousCareerStatus;
      if (previous !== "child" && previous !== "trainee") {
        throw new Error(
          `person.debuted previousCareerStatus must be child or trainee (got ${previous})`,
        );
      }
      if (transition.rank !== MINIMUM_RANK) {
        throw new Error("person_debuted.rank must equal MINIMUM_RANK");
      }
      const payload: PersonDebutedPayload = {
        previousCareerStatus: previous,
        nextCareerStatus: "active_competitor",
        rank: transition.rank,
      };
      return {
        ...base,
        eventType: "person.debuted",
        importance: "normal",
        worldDate: ctx.worldDate,
        entities: {
          ...emptyEventEntities(),
          personIds: [transition.personId],
        },
        payload,
      };
    }
    case "person_force_retired": {
      assertAprilWeek1(ctx.worldDate);
      return {
        ...base,
        eventType: "person.force_retired",
        importance: "major",
        worldDate: ctx.worldDate,
        entities: {
          ...emptyEventEntities(),
          personIds: [transition.personId],
        },
        payload: {
          previousCareerStatus: "active_competitor",
          nextCareerStatus: "retired",
          retirementRank: transition.retirementRank,
          highestRank: transition.highestRank,
        },
      };
    }
  }
}

function assertAprilWeek1(worldDate: WorldDate): void {
  if (!isAprilWeek1(worldDate)) {
    throw new Error(
      `year-start derived events require April week 1 worldDate (got ${worldDate.year}-${worldDate.month}-W${worldDate.weekOfMonth})`,
    );
  }
}
