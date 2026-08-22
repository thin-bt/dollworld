/**
 * People list name / PersonStateFilter primitives (PAGE-001 / FIX-003).
 * Future production owner: UI-004 API-007.
 */

import type { CareerStatus, LifeStatus, ParticipationStatus } from "@shared-world/simulation-core";
import type { PersonStateFilter } from "../types/queries.js";
import { PERSON_STATE_FILTERS } from "../types/queries.js";

export type PeopleFilterPerson = {
  personId: string;
  displayName: string;
  lifeStatus: LifeStatus;
  /** Absent / irrelevant for deceased; participation filters never match deceased. */
  participationStatus?: ParticipationStatus;
  careerStatus: CareerStatus;
};

export function isPersonStateFilter(value: string): value is PersonStateFilter {
  return (PERSON_STATE_FILTERS as readonly string[]).includes(value);
}

/**
 * Case-sensitive literal substring on displayName.
 * No trim / Unicode normalize / case fold (SPEC people name rule).
 */
export function matchesPeopleNameFilter(displayName: string, name: string | null): boolean {
  if (name === null) {
    return true;
  }
  return displayName.includes(name);
}

export function matchesPersonStateFilter(
  person: PeopleFilterPerson,
  state: PersonStateFilter | null,
): boolean {
  if (state === null) {
    return true;
  }
  const colon = state.indexOf(":");
  const prefix = state.slice(0, colon);
  const value = state.slice(colon + 1);

  if (prefix === "life") {
    return person.lifeStatus === value;
  }
  if (prefix === "participation") {
    if (person.lifeStatus === "deceased") {
      return false;
    }
    return person.participationStatus === value;
  }
  if (prefix === "career") {
    return person.careerStatus === value;
  }
  return false;
}

export function filterPeople(
  people: readonly PeopleFilterPerson[],
  options: { name: string | null; state: PersonStateFilter | null },
): PeopleFilterPerson[] {
  return people.filter(
    (person) =>
      matchesPeopleNameFilter(person.displayName, options.name) &&
      matchesPersonStateFilter(person, options.state),
  );
}
