import {
  applyAgeBasedCareerUpdates,
  isLivingPerson,
  withRecalculatedAge,
  type PersonCareerTransition,
} from "./age-status.js";
import type { Person } from "./domain.js";
import type { PersonId } from "./ids.js";
import {
  advanceOneWeek,
  createInitialWorldDate,
  isAprilWeek1,
  isMarchWeek4,
  validateWorldDate,
  type WorldDate,
} from "./world-date.js";

export type WorldCalendarState = {
  worldDate: WorldDate;
  persons: readonly Person[];
};

export type PersonAgedTransition = {
  kind: "person_aged";
  personId: PersonId;
  previousAge: number;
  nextAge: number;
  birthYear: number;
  worldYear: number;
};

export type YearStatsFinalizedTransition = {
  kind: "year_stats_finalized";
  worldYear: number;
};

export type YearStartedTransition = {
  kind: "year_started";
  worldYear: number;
};

export type WorldCalendarTransition =
  | YearStatsFinalizedTransition
  | YearStartedTransition
  | PersonAgedTransition
  | PersonCareerTransition;

export type StepOneWeekResult = {
  state: WorldCalendarState;
  transitions: WorldCalendarTransition[];
};

export type YearStartResult = {
  persons: Person[];
  transitions: WorldCalendarTransition[];
};

/**
 * Initial snapshot: world year 1, April week 1, year-start already applied.
 * Does not age persons and does not emit year_started for year 1.
 */
export function createInitialWorldCalendarState(
  persons: readonly Person[] = [],
): WorldCalendarState {
  return {
    worldDate: createInitialWorldDate(),
    persons: [...persons],
  };
}

/**
 * Apply April week-1 year-start processing for `targetWorldYear`.
 * Age is recalculated as `targetWorldYear - birthYear` (idempotent for the same year).
 */
export function applyYearStart(
  persons: readonly Person[],
  targetWorldYear: number,
): YearStartResult {
  if (!Number.isSafeInteger(targetWorldYear) || targetWorldYear < 1) {
    throw new Error(`targetWorldYear must be a safe integer >= 1 (got ${String(targetWorldYear)})`);
  }

  const transitions: WorldCalendarTransition[] = [];
  const nextPersons: Person[] = persons.map((person) => {
    if (!isLivingPerson(person)) {
      return person;
    }
    if (person.participationStatus !== "active") {
      return person;
    }
    if (person.birthYear >= targetWorldYear) {
      return person;
    }

    const previousAge = person.currentAge;
    const aged = withRecalculatedAge(person, targetWorldYear);
    if (aged.currentAge !== previousAge) {
      transitions.push({
        kind: "person_aged",
        personId: aged.personId,
        previousAge,
        nextAge: aged.currentAge,
        birthYear: aged.birthYear,
        worldYear: targetWorldYear,
      });
    }

    const career = applyAgeBasedCareerUpdates(aged);
    transitions.push(...career.transitions);
    return career.person;
  });

  return { persons: nextPersons, transitions };
}

/**
 * Advance one world week: end current week → advance date → year-start if April week 1.
 */
export function stepOneWeek(state: WorldCalendarState): StepOneWeekResult {
  validateWorldDate(state.worldDate);
  const transitions: WorldCalendarTransition[] = [];

  if (isMarchWeek4(state.worldDate)) {
    transitions.push({
      kind: "year_stats_finalized",
      worldYear: state.worldDate.year,
    });
  }

  const nextDate = advanceOneWeek(state.worldDate);
  let nextPersons: Person[] = [...state.persons];

  if (isAprilWeek1(nextDate)) {
    transitions.push({
      kind: "year_started",
      worldYear: nextDate.year,
    });
    const yearStart = applyYearStart(state.persons, nextDate.year);
    nextPersons = yearStart.persons;
    transitions.push(...yearStart.transitions);
  }

  return {
    state: {
      worldDate: nextDate,
      persons: nextPersons,
    },
    transitions,
  };
}

export function stepWeeks(state: WorldCalendarState, weeks: number): StepOneWeekResult {
  if (!Number.isSafeInteger(weeks) || weeks < 0) {
    throw new Error(`weeks must be a non-negative safe integer (got ${String(weeks)})`);
  }

  let current = state;
  const allTransitions: WorldCalendarTransition[] = [];
  for (let i = 0; i < weeks; i += 1) {
    const stepped = stepOneWeek(current);
    current = stepped.state;
    allTransitions.push(...stepped.transitions);
  }
  return { state: current, transitions: allTransitions };
}
