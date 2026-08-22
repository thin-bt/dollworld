/**
 * Raw URL query → EventsQuery / ValidationQuery materialization (API-009 / API-010).
 */

import { PERSON_ID_LEXICAL } from "../ui005/build-person-detail.js";
import { rejectEventTypeAndGroupConflict } from "./events/event-group.js";
import type { EventGroup, EventsQuery, PageLimit, ValidationQuery } from "./types.js";

export type FieldError = { field: string; code: string; message: string };

export type ParseQueryFailure = {
  ok: false;
  message: string;
  fieldErrors?: FieldError[];
};

export type EventsParseSuccess = {
  ok: true;
  query: EventsQuery;
  cursorRaw: string | null;
};

export type ValidationParseSuccess = {
  ok: true;
  query: ValidationQuery;
  cursorRaw: string | null;
};

const EVENT_LIMITS = new Set([100, 200]);

function collectParams(search: string): { ok: true; map: Map<string, string> } | ParseQueryFailure {
  const map = new Map<string, string>();
  if (search.length === 0) {
    return { ok: true, map };
  }
  const parts = search.split("&");
  for (const part of parts) {
    if (part.length === 0) {
      continue;
    }
    const eq = part.indexOf("=");
    const rawKey = eq < 0 ? part : part.slice(0, eq);
    const rawValue = eq < 0 ? "" : part.slice(eq + 1);
    let key: string;
    let value: string;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, " "));
      value = decodeURIComponent(rawValue.replace(/\+/g, " "));
    } catch {
      return {
        ok: false,
        message: "query encoding is invalid",
        fieldErrors: [{ field: "/query", code: "format", message: "query encoding is invalid" }],
      };
    }
    if (map.has(key)) {
      return {
        ok: false,
        message: `duplicate query parameter: ${key}`,
        fieldErrors: [
          {
            field: `/query/${key}`,
            code: "duplicate",
            message: `duplicate query parameter: ${key}`,
          },
        ],
      };
    }
    map.set(key, value);
  }
  return { ok: true, map };
}

function extractSearchString(url: string): string {
  const q = url.indexOf("?");
  if (q < 0 || q === url.length - 1) {
    return "";
  }
  const hash = url.indexOf("#", q + 1);
  return hash < 0 ? url.slice(q + 1) : url.slice(q + 1, hash);
}

function parseCursorRaw(
  raw: string | undefined,
): { ok: true; value: string | null } | ParseQueryFailure {
  if (raw === undefined) {
    return { ok: true, value: null };
  }
  if (raw.length === 0 || raw.length > 2048) {
    return {
      ok: false,
      message: "cursor length is invalid",
      fieldErrors: [{ field: "/query/cursor", code: "range", message: "cursor length is invalid" }],
    };
  }
  for (let i = 0; i < raw.length; i += 1) {
    if (raw.charCodeAt(i) > 0x7f) {
      return {
        ok: false,
        message: "cursor must be ASCII",
        fieldErrors: [{ field: "/query/cursor", code: "format", message: "cursor must be ASCII" }],
      };
    }
  }
  return { ok: true, value: raw };
}

function parseEventLimit(
  raw: string | undefined,
): { ok: true; value: PageLimit } | ParseQueryFailure {
  if (raw === undefined) {
    return { ok: true, value: 100 };
  }
  if (!/^(100|200)$/.test(raw)) {
    return {
      ok: false,
      message: "limit must be 100 or 200",
      fieldErrors: [{ field: "/query/limit", code: "enum", message: "limit must be 100 or 200" }],
    };
  }
  const value = Number(raw) as PageLimit;
  if (!EVENT_LIMITS.has(value)) {
    return {
      ok: false,
      message: "limit must be 100 or 200",
      fieldErrors: [{ field: "/query/limit", code: "enum", message: "limit must be 100 or 200" }],
    };
  }
  return { ok: true, value };
}

function parsePositiveSafeInt(
  raw: string | undefined,
  field: string,
  min: number,
  max: number | null,
): { ok: true; value: number | null } | ParseQueryFailure {
  if (raw === undefined) {
    return { ok: true, value: null };
  }
  if (!/^[1-9][0-9]*$/.test(raw)) {
    return {
      ok: false,
      message: `${field} must be a positive safe integer`,
      fieldErrors: [
        {
          field: `/query/${field}`,
          code: "format",
          message: `${field} must be a positive safe integer`,
        },
      ],
    };
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || (max !== null && value > max)) {
    return {
      ok: false,
      message: `${field} is out of range`,
      fieldErrors: [
        { field: `/query/${field}`, code: "range", message: `${field} is out of range` },
      ],
    };
  }
  return { ok: true, value };
}

function isAscii1to100(value: string): boolean {
  if (value.length < 1 || value.length > 100) {
    return false;
  }
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 0x7f) {
      return false;
    }
  }
  return true;
}

export function isEventsNextPosition(value: unknown): value is { sequence: number } {
  if (
    typeof value !== "object" ||
    value === null ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "sequence") {
    return false;
  }
  const sequence = (value as { sequence: unknown }).sequence;
  return typeof sequence === "number" && Number.isSafeInteger(sequence) && sequence >= 0;
}

export function isValidationNextPosition(
  value: unknown,
): value is { validationOccurrence: number } {
  if (
    typeof value !== "object" ||
    value === null ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "validationOccurrence") {
    return false;
  }
  const occurrence = (value as { validationOccurrence: unknown }).validationOccurrence;
  return typeof occurrence === "number" && Number.isSafeInteger(occurrence) && occurrence >= 1;
}

export function parseEventsQuery(url: string): EventsParseSuccess | ParseQueryFailure {
  const collected = collectParams(extractSearchString(url));
  if (!collected.ok) {
    return collected;
  }
  const allowed = new Set([
    "year",
    "month",
    "week",
    "personId",
    "eventType",
    "eventGroup",
    "limit",
    "cursor",
  ]);
  for (const key of collected.map.keys()) {
    if (!allowed.has(key)) {
      return {
        ok: false,
        message: `unknown query parameter: ${key}`,
        fieldErrors: [
          {
            field: `/query/${key}`,
            code: "unknown",
            message: `unknown query parameter: ${key}`,
          },
        ],
      };
    }
  }

  const year = parsePositiveSafeInt(collected.map.get("year"), "year", 1, null);
  if (!year.ok) {
    return year;
  }
  const month = parsePositiveSafeInt(collected.map.get("month"), "month", 1, 12);
  if (!month.ok) {
    return month;
  }
  const week = parsePositiveSafeInt(collected.map.get("week"), "week", 1, 4);
  if (!week.ok) {
    return week;
  }

  let personId: string | null = null;
  const personRaw = collected.map.get("personId");
  if (personRaw !== undefined) {
    if (!PERSON_ID_LEXICAL.test(personRaw)) {
      return {
        ok: false,
        message: "personId must match PersonId lexical form",
        fieldErrors: [
          {
            field: "/query/personId",
            code: "format",
            message: "personId must match PersonId lexical form",
          },
        ],
      };
    }
    personId = personRaw;
  }

  let eventType: string | null = null;
  const eventTypeRaw = collected.map.get("eventType");
  if (eventTypeRaw !== undefined) {
    if (!isAscii1to100(eventTypeRaw)) {
      return {
        ok: false,
        message: "eventType must be 1..100 ASCII characters",
        fieldErrors: [
          {
            field: "/query/eventType",
            code: "format",
            message: "eventType must be 1..100 ASCII characters",
          },
        ],
      };
    }
    eventType = eventTypeRaw;
  }

  let eventGroup: EventGroup | null = null;
  const groupRaw = collected.map.get("eventGroup");
  if (groupRaw !== undefined) {
    if (groupRaw !== "training" && groupRaw !== "technique_learning") {
      return {
        ok: false,
        message: "eventGroup must be training or technique_learning",
        fieldErrors: [
          {
            field: "/query/eventGroup",
            code: "enum",
            message: "eventGroup must be training or technique_learning",
          },
        ],
      };
    }
    eventGroup = groupRaw;
  }

  const conflict = rejectEventTypeAndGroupConflict(eventType, eventGroup);
  if (!conflict.ok) {
    return {
      ok: false,
      message: conflict.reason,
      fieldErrors: [
        {
          field: "/query/eventType",
          code: "conflicting_fields",
          message: "eventType and eventGroup cannot both be set",
        },
        {
          field: "/query/eventGroup",
          code: "conflicting_fields",
          message: "eventType and eventGroup cannot both be set",
        },
      ],
    };
  }

  const limit = parseEventLimit(collected.map.get("limit"));
  if (!limit.ok) {
    return limit;
  }
  const cursor = parseCursorRaw(collected.map.get("cursor"));
  if (!cursor.ok) {
    return cursor;
  }

  return {
    ok: true,
    query: {
      kind: "events",
      year: year.value,
      month: month.value,
      week: week.value,
      personId,
      eventType,
      eventGroup,
      sortKey: "sequence",
      sortOrder: "desc",
      limit: limit.value,
    },
    cursorRaw: cursor.value,
  };
}

export function parseValidationQuery(url: string): ValidationParseSuccess | ParseQueryFailure {
  const collected = collectParams(extractSearchString(url));
  if (!collected.ok) {
    return collected;
  }
  const allowed = new Set(["status", "limit", "cursor"]);
  for (const key of collected.map.keys()) {
    if (!allowed.has(key)) {
      // MIG-014 / ACC-102: old `code` query is unknown / INVALID_REQUEST
      return {
        ok: false,
        message: `unknown query parameter: ${key}`,
        fieldErrors: [
          {
            field: `/query/${key}`,
            code: "unknown",
            message: `unknown query parameter: ${key}`,
          },
        ],
      };
    }
  }

  let status: ValidationQuery["status"] = null;
  const statusRaw = collected.map.get("status");
  if (statusRaw !== undefined) {
    if (statusRaw !== "success" && statusRaw !== "failure") {
      return {
        ok: false,
        message: "status must be success or failure",
        fieldErrors: [
          {
            field: "/query/status",
            code: "enum",
            message: "status must be success or failure",
          },
        ],
      };
    }
    status = statusRaw;
  }

  const limit = parseEventLimit(collected.map.get("limit"));
  if (!limit.ok) {
    return limit;
  }
  const cursor = parseCursorRaw(collected.map.get("cursor"));
  if (!cursor.ok) {
    return cursor;
  }

  return {
    ok: true,
    query: {
      kind: "validation",
      status,
      sortKey: "validationOccurrence",
      sortOrder: "asc",
      limit: limit.value,
    },
    cursorRaw: cursor.value,
  };
}
