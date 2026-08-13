import {
  applyAgeBasedCareerUpdates,
  isLivingPerson,
  withRecalculatedAge,
  type PersonCareerTransition,
} from "./age-status.js";
import { compareUnicodeCodePoints } from "./canonical-json.js";
import type { WorldCalendarConfig } from "./config/types.js";
import type { Person } from "./domain.js";
import type { PersonId } from "./ids.js";
import {
  advanceOneWeek,
  createInitialWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
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
 * Initial snapshot: world year 1 at configured start month week 1,
 * year-start already applied. Does not age persons and does not emit
 * year_started for year 1.
 */
export function createInitialWorldCalendarState(
  persons: readonly Person[] = [],
  config: WorldCalendarConfig = DEFAULT_WORLD_CALENDAR_CONFIG,
): WorldCalendarState {
  return {
    worldDate: createInitialWorldDate(config),
    persons: [...persons],
  };
}

/**
 * Living + active + birthYear < targetWorldYear, PersonId ascending (CAL-JAN mass-aging snapshot).
 */
export function selectMassAgingTargetPersonIds(
  persons: readonly Person[],
  targetWorldYear: number,
): PersonId[] {
  if (!Number.isSafeInteger(targetWorldYear) || targetWorldYear < 1) {
    throw new Error(`targetWorldYear must be a safe integer >= 1 (got ${String(targetWorldYear)})`);
  }
  const ids: PersonId[] = [];
  for (const person of persons) {
    if (!isLivingPerson(person)) {
      continue;
    }
    if (person.participationStatus !== "active") {
      continue;
    }
    if (person.birthYear >= targetWorldYear) {
      continue;
    }
    ids.push(person.personId);
  }
  ids.sort((a, b) => compareUnicodeCodePoints(a, b));
  return ids;
}

/**
 * Apply age recalculation for an exact mass-aging PersonId snapshot only.
 */
export function applyMassAging(
  persons: readonly Person[],
  targetWorldYear: number,
  targetPersonIds: readonly PersonId[],
): YearStartResult {
  if (!Number.isSafeInteger(targetWorldYear) || targetWorldYear < 1) {
    throw new Error(`targetWorldYear must be a safe integer >= 1 (got ${String(targetWorldYear)})`);
  }
  const byId = new Map<PersonId, Person>();
  for (const person of persons) {
    byId.set(person.personId, person);
  }
  const transitions: WorldCalendarTransition[] = [];
  for (const personId of targetPersonIds) {
    const person = byId.get(personId);
    if (person === undefined || !isLivingPerson(person)) {
      throw new Error(`mass-aging snapshot personId missing or not living: ${String(personId)}`);
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
    byId.set(personId, aged);
  }
  return {
    persons: persons.map((person) => byId.get(person.personId) ?? person),
    transitions,
  };
}

/**
 * Apply 8/16/18/42 career transitions for the same mass-aging snapshot from aged state.
 */
export function applyAgeQualification(
  persons: readonly Person[],
  targetPersonIds: readonly PersonId[],
): YearStartResult {
  const byId = new Map<PersonId, Person>();
  for (const person of persons) {
    byId.set(person.personId, person);
  }
  const transitions: WorldCalendarTransition[] = [];
  for (const personId of targetPersonIds) {
    const person = byId.get(personId);
    if (person === undefined || !isLivingPerson(person)) {
      throw new Error(
        `age-qualification snapshot personId missing or not living: ${String(personId)}`,
      );
    }
    const career = applyAgeBasedCareerUpdates(person);
    transitions.push(...career.transitions);
    byId.set(personId, career.person);
  }
  return {
    persons: persons.map((person) => byId.get(person.personId) ?? person),
    transitions,
  };
}

/**
 * Apply configured year-start processing for `targetWorldYear`.
 * Composes mass-aging + age-qualification on one PersonId snapshot (legacy callers).
 * CAL-JAN registry path must invoke the two processors distinctly without double-apply.
 */
export function applyYearStart(
  persons: readonly Person[],
  targetWorldYear: number,
): YearStartResult {
  const snapshot = selectMassAgingTargetPersonIds(persons, targetWorldYear);
  const aged = applyMassAging(persons, targetWorldYear, snapshot);
  const qualified = applyAgeQualification(aged.persons, snapshot);
  return {
    persons: qualified.persons,
    transitions: [...aged.transitions, ...qualified.transitions],
  };
}

/**
 * Advance one world week: end current week → advance date → year-start if
 * configured start month week 1 (worldYear >= 2).
 *
 * `skipYearStart: true` advances the date (and still emits year_stats_finalized
 * on year-end weeks) but does not run year_started / aging — used when the
 * Sprint1 year-start phase already applied those effects.
 */
export type StepOneWeekOptions = {
  skipYearStart?: boolean;
};

export function stepOneWeek(
  state: WorldCalendarState,
  config: WorldCalendarConfig = DEFAULT_WORLD_CALENDAR_CONFIG,
  options: StepOneWeekOptions = {},
): StepOneWeekResult {
  validateWorldDate(state.worldDate, config);
  const transitions: WorldCalendarTransition[] = [];

  if (isWorldYearEndWeek(state.worldDate, config)) {
    transitions.push({
      kind: "year_stats_finalized",
      worldYear: state.worldDate.year,
    });
  }

  const nextDate = advanceOneWeek(state.worldDate, config);
  let nextPersons: Person[] = [...state.persons];

  if (!options.skipYearStart && isWorldYearStartWeek(nextDate, config) && nextDate.year >= 2) {
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

export function stepWeeks(
  state: WorldCalendarState,
  weeks: number,
  config: WorldCalendarConfig = DEFAULT_WORLD_CALENDAR_CONFIG,
): StepOneWeekResult {
  if (!Number.isSafeInteger(weeks) || weeks < 0) {
    throw new Error(`weeks must be a non-negative safe integer (got ${String(weeks)})`);
  }

  let current = state;
  const allTransitions: WorldCalendarTransition[] = [];
  for (let i = 0; i < weeks; i += 1) {
    const stepped = stepOneWeek(current, config);
    current = stepped.state;
    allTransitions.push(...stepped.transitions);
  }
  return { state: current, transitions: allTransitions };
}
