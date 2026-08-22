/**
 * People filter → sort → §10C page pipeline (PAGE-001).
 * Future production owner: UI-004 API-007.
 */

import { filterPeople } from "./filter-people.js";
import type { PeopleFilterPerson } from "./filter-people.js";
import {
  findPeopleExclusiveStartIndex,
  peopleNextPositionFromItem,
  sortPeople,
} from "./sort-people.js";
import type { PeopleSortPerson } from "./sort-people.js";
import { pageExclusiveSlice } from "../shared/page-boundary.js";
import type { PageResult, PeopleNextPosition, PeopleQuery } from "../types/queries.js";

export type PeopleListPerson = PeopleFilterPerson & PeopleSortPerson;

export function buildPeoplePage(
  source: readonly PeopleListPerson[],
  query: PeopleQuery,
  cursorNextPosition: PeopleNextPosition | null,
):
  | { kind: "page"; page: PageResult<PeopleListPerson, PeopleNextPosition> }
  | { kind: "stale_cursor" } {
  const filtered = filterPeople(source, {
    name: query.name,
    state: query.state,
  }) as PeopleListPerson[];
  const sorted = sortPeople(filtered, query.sortKey, query.sortOrder) as PeopleListPerson[];

  let startIndex = 0;
  if (cursorNextPosition !== null) {
    startIndex = findPeopleExclusiveStartIndex(
      sorted,
      query.sortKey,
      query.sortOrder,
      cursorNextPosition,
    );
    if (startIndex < 0) {
      return { kind: "stale_cursor" };
    }
  }

  const paged = pageExclusiveSlice({
    sortedFiltered: sorted,
    limit: query.limit,
    startIndex,
  });

  const last = paged.items[paged.items.length - 1];
  const nextPosition =
    paged.hasNext && last !== undefined ? peopleNextPositionFromItem(last, query.sortKey) : null;

  return {
    kind: "page",
    page: {
      items: paged.items,
      totalCount: paged.totalCount,
      nextPosition,
    },
  };
}
