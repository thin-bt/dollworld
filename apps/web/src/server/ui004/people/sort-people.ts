/**
 * People stable sort (PAGE-001).
 * Future production owner: UI-004 API-007.
 *
 * Ability/aptitude numeric path assumes Person.abilities[k].surfaceValue and
 * Person.aptitudes.magic.surfaceValue for query key magicAptitude.
 * UI-000-DISPLAY-MAP was not present in-repo at prebuild time — integration must re-verify paths.
 */

import { compareUnicodeCodePoints } from "@shared-world/simulation-core";
import type { PeopleSortKey } from "../types/queries.js";
import type { PeopleNextPosition } from "../types/queries.js";

export type PeopleSortPerson = {
  personId: string;
  abilities: Record<string, { surfaceValue: number }>;
  aptitudes: Record<string, { surfaceValue: number }>;
};

const ABILITY_SORT_KEYS = new Set(["stamina", "strength", "skill", "speed", "spirit", "magic"]);

const APTITUDE_SORT_KEYS: Record<string, string> = {
  unarmed: "unarmed",
  sword: "sword",
  magicAptitude: "magic",
};

export function readPeopleSortValue(
  person: PeopleSortPerson,
  sortKey: PeopleSortKey,
): number | null {
  if (sortKey === "personId") {
    return null;
  }
  if (ABILITY_SORT_KEYS.has(sortKey)) {
    return person.abilities[sortKey]?.surfaceValue ?? null;
  }
  const aptitudeKey = APTITUDE_SORT_KEYS[sortKey];
  if (aptitudeKey !== undefined) {
    return person.aptitudes[aptitudeKey]?.surfaceValue ?? null;
  }
  return null;
}

function compareNumber(a: number, b: number, order: "asc" | "desc"): number {
  if (a === b) {
    return 0;
  }
  const primary = a < b ? -1 : 1;
  return order === "asc" ? primary : -primary;
}

/**
 * Stable sort: primary key by sortKey/order; tie-break always personId asc (Unicode code point).
 */
export function comparePeopleForSort(
  a: PeopleSortPerson,
  b: PeopleSortPerson,
  sortKey: PeopleSortKey,
  sortOrder: "asc" | "desc",
): number {
  if (sortKey === "personId") {
    const primary = compareUnicodeCodePoints(a.personId, b.personId);
    return sortOrder === "asc" ? primary : -primary;
  }
  const av = readPeopleSortValue(a, sortKey);
  const bv = readPeopleSortValue(b, sortKey);
  if (av !== null && bv !== null) {
    const primary = compareNumber(av, bv, sortOrder);
    if (primary !== 0) {
      return primary;
    }
  }
  // Tie-break: personId ascending (deterministic, technical).
  return compareUnicodeCodePoints(a.personId, b.personId);
}

export function sortPeople(
  people: readonly PeopleSortPerson[],
  sortKey: PeopleSortKey,
  sortOrder: "asc" | "desc",
): PeopleSortPerson[] {
  return [...people].sort((a, b) => comparePeopleForSort(a, b, sortKey, sortOrder));
}

export function peopleNextPositionFromItem(
  item: PeopleSortPerson,
  sortKey: PeopleSortKey,
): PeopleNextPosition {
  if (sortKey === "personId") {
    return { personId: item.personId };
  }
  const value = readPeopleSortValue(item, sortKey);
  if (value === null) {
    return { personId: item.personId };
  }
  return { value, personId: item.personId };
}

/**
 * Exclusive start: first item strictly after cursor nextPosition in the already-sorted list.
 * Returns -1 if cursor position cannot be located (STALE_CURSOR at route layer).
 * Does not skip/clip unknown positions (FI-036).
 */
export function findPeopleExclusiveStartIndex(
  sorted: readonly PeopleSortPerson[],
  _sortKey: PeopleSortKey,
  _sortOrder: "asc" | "desc",
  nextPosition: PeopleNextPosition,
): number {
  for (let i = 0; i < sorted.length; i += 1) {
    const item = sorted[i]!;
    if (isPeopleCursorItem(item, _sortKey, nextPosition)) {
      return i + 1;
    }
  }
  return -1;
}

function isPeopleCursorItem(
  item: PeopleSortPerson,
  sortKey: PeopleSortKey,
  nextPosition: PeopleNextPosition,
): boolean {
  if (item.personId !== nextPosition.personId) {
    return false;
  }
  if (!("value" in nextPosition) || sortKey === "personId") {
    return true;
  }
  return readPeopleSortValue(item, sortKey) === nextPosition.value;
}
