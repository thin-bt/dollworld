/**
 * UI-008 pure module unit tests.
 */

import { describe, expect, it } from "vitest";
import {
  classifyEventGroup,
  eventInGroup,
  rejectEventTypeAndGroupConflict,
} from "./events/event-group.js";
import {
  matchesPersonIdFilter,
  payloadPersonIdMustNotAffectFilter,
} from "./events/person-id-filter.js";
import { mapEventListItem } from "./events/map-event-list-item.js";
import { buildEventsPage } from "./events/filter-sort-page-events.js";
import {
  buildValidationPage,
  mapPagedListDataView,
  mapValidationViewItem,
} from "./validation/map-validation-view-item.js";
import {
  EVENT_ENVELOPE_TOP_LEVEL_KEYS,
  PAGED_LIST_DATA_KEYS,
  VALIDATION_ISSUE_VIEW_KEYS,
  VALIDATION_RESULT_VIEW_ITEM_KEYS,
  type EventListItemView,
  type EventsQuery,
  type ValidationQuery,
} from "./types.js";
import {
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  eventIdFromSequence,
  validateSprint1EventEnvelope,
  type Sprint1EventEnvelope,
} from "@shared-world/simulation-core";

function makeSprint1Event(input: {
  sequence: number;
  eventType: string;
  personIds?: string[];
  payload?: Record<string, unknown>;
  simulationId?: string;
}): Sprint1EventEnvelope {
  const simulationId = input.simulationId ?? "simulation_0123456789abcdef";
  const worldDate = createWorldDate(
    { year: 1, month: 1, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const envelope = {
    schemaVersion: "0.2.0",
    eventId: eventIdFromSequence(input.sequence),
    simulationId,
    sequence: input.sequence,
    eventType: input.eventType,
    importance: "normal",
    worldDate,
    origin: "simulation",
    sourceProcessor: "weekly-training",
    entities: {
      personIds: input.personIds ?? ["person_000001"],
      familyIds: [],
      lineageIds: [],
      relationshipIds: [],
      matchIds: [],
    },
    payload: input.payload ?? {},
  };
  const validated = validateSprint1EventEnvelope(envelope);
  if (!validated.ok) {
    throw new Error(`fixture invalid: ${JSON.stringify(validated.issues)}`);
  }
  return validated.value;
}

function asView(event: Sprint1EventEnvelope): EventListItemView {
  const mapped = mapEventListItem(event);
  if (!mapped.ok) {
    throw new Error(mapped.reason);
  }
  return mapped.value;
}

const defaultEventsQuery = (): EventsQuery => ({
  kind: "events",
  year: null,
  month: null,
  week: null,
  personId: null,
  eventType: null,
  eventGroup: null,
  sortKey: "sequence",
  sortOrder: "desc",
  limit: 100,
});

const defaultValidationQuery = (): ValidationQuery => ({
  kind: "validation",
  status: null,
  sortKey: "validationOccurrence",
  sortOrder: "asc",
  limit: 100,
});

describe("UI-008 pure: personId filter FI-063", () => {
  it("uses entities.personIds only; payload spoof ignored", () => {
    const event = asView(
      makeSprint1Event({
        sequence: 0,
        eventType: "training.action_selected",
        personIds: ["person_000002"],
        payload: { personId: "person_000001" },
      }),
    );
    expect(matchesPersonIdFilter(event, "person_000001")).toBe(false);
    expect(payloadPersonIdMustNotAffectFilter(event, "person_000001")).toBe(true);
    expect(matchesPersonIdFilter(event, "person_000002")).toBe(true);
  });
});

describe("UI-008 pure: eventGroup FIX-051", () => {
  it("training prefix / technique_learning exact two / mastery excluded", () => {
    expect(eventInGroup("training.rest_applied", "training")).toBe(true);
    expect(eventInGroup("technique.acquired", "technique_learning")).toBe(true);
    expect(eventInGroup("technique.learning_progressed", "technique_learning")).toBe(true);
    expect(eventInGroup("technique.mastery_increased", "technique_learning")).toBe(false);
    expect(classifyEventGroup("technique.mastery_increased")).toBeNull();
    expect(rejectEventTypeAndGroupConflict("training.x", "training").ok).toBe(false);
  });
});

describe("UI-008 pure: EventEnvelope exact11", () => {
  it("maps direct-wire validated envelope", () => {
    const mapped = mapEventListItem(
      makeSprint1Event({ sequence: 0, eventType: "training.action_selected" }),
    );
    expect(mapped.ok).toBe(true);
    if (mapped.ok) {
      expect(Object.keys(mapped.value)).toHaveLength(11);
      expect(Object.keys(mapped.value).sort()).toEqual([...EVENT_ENVELOPE_TOP_LEVEL_KEYS].sort());
    }
  });
});

describe("UI-008 pure: Validation mapping", () => {
  it("maps success/failure exact5/2 without invented fields", () => {
    const success = mapValidationViewItem(1, { ok: true });
    const failure = mapValidationViewItem(2, {
      ok: false,
      issues: [{ path: "/x", message: "m", actual: 1, expected: "2" }],
    });
    expect(success.ok).toBe(true);
    expect(failure.ok).toBe(true);
    if (success.ok && failure.ok) {
      expect(Object.keys(success.value)).toEqual([...VALIDATION_RESULT_VIEW_ITEM_KEYS]);
      expect(success.value.status).toBe("success");
      expect(success.value.issueCount).toBe(0);
      expect(Object.keys(failure.value.issues[0]!)).toEqual([...VALIDATION_ISSUE_VIEW_KEYS]);
      expect(failure.value.result).toEqual({
        ok: false,
        issues: [{ path: "/x", message: "m", actual: 1, expected: "2" }],
      });
      expect("code" in failure.value).toBe(false);
    }
  });

  it("FI-065 rejects corrupt issue missing path", () => {
    const bad = mapValidationViewItem(1, {
      ok: false,
      issues: [{ message: "no path" }],
    });
    expect(bad.ok).toBe(false);
  });
});

describe("UI-008 pure: paging 0/100/101", () => {
  it("pages events by sequence desc (newest first) with stable totalCount", () => {
    const events = Array.from({ length: 101 }, (_, i) =>
      asView(makeSprint1Event({ sequence: i, eventType: "training.action_selected" })),
    );
    const page1 = buildEventsPage({
      events,
      query: { ...defaultEventsQuery(), limit: 100 },
      cursorNextPosition: null,
    });
    expect(page1.ok).toBe(true);
    if (page1.ok) {
      expect(page1.value.totalCount).toBe(101);
      expect(page1.value.items).toHaveLength(100);
      expect(page1.value.items[0]!.sequence).toBe(100);
      expect(page1.value.items[99]!.sequence).toBe(1);
      expect(page1.value.nextPosition).toEqual({ sequence: 1 });
      const page2 = buildEventsPage({
        events,
        query: { ...defaultEventsQuery(), limit: 100 },
        cursorNextPosition: page1.value.nextPosition,
      });
      expect(page2.ok).toBe(true);
      if (page2.ok) {
        expect(page2.value.items).toHaveLength(1);
        expect(page2.value.items[0]!.sequence).toBe(0);
        expect(page2.value.nextPosition).toBeNull();
      }
    }

    const empty = buildEventsPage({
      events: [],
      query: defaultEventsQuery(),
      cursorNextPosition: null,
    });
    expect(empty.ok).toBe(true);
    if (empty.ok) {
      expect(empty.value.totalCount).toBe(0);
      expect(empty.value.items).toHaveLength(0);
      expect(empty.value.nextPosition).toBeNull();
    }
  });

  it("filters technique_learning without mastery", () => {
    const events = [
      asView(makeSprint1Event({ sequence: 0, eventType: "technique.acquired" })),
      asView(makeSprint1Event({ sequence: 1, eventType: "technique.mastery_increased" })),
      asView(makeSprint1Event({ sequence: 2, eventType: "training.stat_growth_applied" })),
    ];
    const page = buildEventsPage({
      events,
      query: { ...defaultEventsQuery(), eventGroup: "technique_learning" },
      cursorNextPosition: null,
    });
    expect(page.ok).toBe(true);
    if (page.ok) {
      expect(page.value.totalCount).toBe(1);
      expect(page.value.items[0]?.eventType).toBe("technique.acquired");
    }
  });
});

describe("UI-008 pure: validation page + exact3", () => {
  it("filters status and wraps exact3", () => {
    const success = mapValidationViewItem(1, { ok: true });
    const failure = mapValidationViewItem(2, {
      ok: false,
      issues: [{ path: "/a", message: "bad" }],
    });
    expect(success.ok && failure.ok).toBe(true);
    if (!success.ok || !failure.ok) {
      return;
    }
    const page = buildValidationPage({
      items: [success.value, failure.value],
      query: { ...defaultValidationQuery(), status: "failure" },
      cursorNextPosition: null,
    });
    expect(page.ok).toBe(true);
    if (page.ok) {
      expect(page.value.totalCount).toBe(1);
      const wrapped = mapPagedListDataView({
        items: page.value.items,
        totalCount: page.value.totalCount,
        nextCursor: null,
      });
      expect(wrapped.ok).toBe(true);
      if (wrapped.ok) {
        expect(Object.keys(wrapped.value)).toEqual([...PAGED_LIST_DATA_KEYS]);
      }
    }
  });
});
