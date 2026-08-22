/**
 * Events filter + §10C page (PAGE-003 / PAGE-007).
 * Observer default: sequence descending (newest first). Source stream remains ascending.
 */

import { pageExclusiveSlice } from "../../ui004/shared/page-boundary.js";
import { fail, ok, type PureResult } from "../result.js";
import type { EventListItemView, EventsNextPosition, EventsQuery } from "../types.js";
import { eventInGroup, rejectEventTypeAndGroupConflict } from "./event-group.js";
import { matchesPersonIdFilter } from "./person-id-filter.js";

export type EventsPageResult = {
  items: EventListItemView[];
  totalCount: number;
  nextPosition: EventsNextPosition | null;
};

export function filterEvents(
  events: readonly EventListItemView[],
  query: EventsQuery,
): PureResult<EventListItemView[]> {
  const conflict = rejectEventTypeAndGroupConflict(query.eventType, query.eventGroup);
  if (!conflict.ok) {
    return conflict;
  }
  const filtered = events.filter((event) => {
    if (query.year !== null && event.worldDate.year !== query.year) {
      return false;
    }
    if (query.month !== null && event.worldDate.month !== query.month) {
      return false;
    }
    if (query.week !== null && event.worldDate.weekOfMonth !== query.week) {
      return false;
    }
    if (!matchesPersonIdFilter(event, query.personId)) {
      return false;
    }
    if (query.eventType !== null && event.eventType !== query.eventType) {
      return false;
    }
    if (query.eventGroup !== null && !eventInGroup(event.eventType, query.eventGroup)) {
      return false;
    }
    return true;
  });
  return ok(filtered);
}

export function buildEventsPage(input: {
  events: readonly EventListItemView[];
  query: EventsQuery;
  cursorNextPosition: EventsNextPosition | null;
}): PureResult<EventsPageResult> {
  const filtered = filterEvents(input.events, input.query);
  if (!filtered.ok) {
    return filtered;
  }
  for (let i = 1; i < filtered.value.length; i += 1) {
    if (filtered.value[i]!.sequence < filtered.value[i - 1]!.sequence) {
      return fail("event stream sequence not ascending");
    }
  }

  // Observer display order: sequence desc (newest first). Storage order unchanged.
  const sortedForDisplay =
    input.query.sortOrder === "desc" ? [...filtered.value].reverse() : [...filtered.value];

  let startIndex = 0;
  if (input.cursorNextPosition !== null) {
    const idx = sortedForDisplay.findIndex(
      (e) => e.sequence === input.cursorNextPosition!.sequence,
    );
    if (idx < 0) {
      return fail("cursor sequence not found", "STALE_CURSOR");
    }
    startIndex = idx + 1;
  }

  const sliced = pageExclusiveSlice({
    sortedFiltered: sortedForDisplay,
    limit: input.query.limit,
    startIndex,
  });

  const last = sliced.items[sliced.items.length - 1];
  return ok({
    items: [...sliced.items],
    totalCount: sliced.totalCount,
    nextPosition: sliced.hasNext && last !== undefined ? { sequence: last.sequence } : null,
  });
}
