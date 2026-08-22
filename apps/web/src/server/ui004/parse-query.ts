/**
 * Raw URL query → CanonicalGetQuery materialization for API-007 / API-011.
 */

import {
  PEOPLE_SORT_KEYS,
  type MockCandidatesQuery,
  type PageLimit,
  type PeopleQuery,
  type PeopleSortKey,
  type PersonStateFilter,
} from "./types/queries.js";
import { isPersonStateFilter } from "./people/filter-people.js";

export type FieldError = { field: string; code: string; message: string };

export type ParseQueryFailure = {
  ok: false;
  message: string;
  fieldErrors?: FieldError[];
};

export type PeopleParseSuccess = {
  ok: true;
  query: PeopleQuery;
  cursorRaw: string | null;
};

export type CandidatesParseSuccess = {
  ok: true;
  query: MockCandidatesQuery;
  cursorRaw: string | null;
};

const PAGE_LIMITS = new Set([50, 100, 200]);
const EXPLICIT_PEOPLE_SORT_BY = new Set([
  "personId",
  "stamina",
  "strength",
  "skill",
  "speed",
  "spirit",
  "magic",
  "unarmed",
  "sword",
  "magicAptitude",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function countCodePoints(text: string): number {
  return [...text].length;
}

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

function parseLimit(
  raw: string | undefined,
  field: string,
): { ok: true; value: PageLimit } | ParseQueryFailure {
  if (raw === undefined) {
    return { ok: true, value: 50 };
  }
  if (!/^(50|100|200)$/.test(raw)) {
    return {
      ok: false,
      message: "limit must be 50, 100, or 200",
      fieldErrors: [{ field, code: "enum", message: "limit must be 50, 100, or 200" }],
    };
  }
  const value = Number(raw) as PageLimit;
  if (!PAGE_LIMITS.has(value)) {
    return {
      ok: false,
      message: "limit must be 50, 100, or 200",
      fieldErrors: [{ field, code: "enum", message: "limit must be 50, 100, or 200" }],
    };
  }
  return { ok: true, value };
}

function parseName(
  raw: string | undefined,
): { ok: true; value: string | null } | ParseQueryFailure {
  if (raw === undefined) {
    return { ok: true, value: null };
  }
  const points = countCodePoints(raw);
  if (points < 1 || points > 100) {
    return {
      ok: false,
      message: "name must be 1..100 Unicode code points",
      fieldErrors: [
        {
          field: "/query/name",
          code: "range",
          message: "name must be 1..100 Unicode code points",
        },
      ],
    };
  }
  return { ok: true, value: raw };
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
    const code = raw.charCodeAt(i);
    if (code > 0x7f) {
      return {
        ok: false,
        message: "cursor must be ASCII",
        fieldErrors: [{ field: "/query/cursor", code: "format", message: "cursor must be ASCII" }],
      };
    }
  }
  return { ok: true, value: raw };
}

/**
 * Extract search string after `?` (excluding leading `?`).
 */
export function extractSearchString(url: string): string {
  const q = url.indexOf("?");
  if (q < 0 || q === url.length - 1) {
    return "";
  }
  const hash = url.indexOf("#", q + 1);
  return hash < 0 ? url.slice(q + 1) : url.slice(q + 1, hash);
}

export function parsePeopleQuery(url: string): PeopleParseSuccess | ParseQueryFailure {
  const collected = collectParams(extractSearchString(url));
  if (!collected.ok) {
    return collected;
  }
  const allowed = new Set(["name", "state", "sortBy", "sortOrder", "limit", "cursor"]);
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

  const nameResult = parseName(collected.map.get("name"));
  if (!nameResult.ok) {
    return nameResult;
  }

  let state: PersonStateFilter | null = null;
  const stateRaw = collected.map.get("state");
  if (stateRaw !== undefined) {
    if (!isPersonStateFilter(stateRaw)) {
      return {
        ok: false,
        message: "state is not a valid PersonStateFilter",
        fieldErrors: [
          {
            field: "/query/state",
            code: "enum",
            message: "state is not a valid PersonStateFilter",
          },
        ],
      };
    }
    state = stateRaw as PersonStateFilter;
  }

  const hasSortBy = collected.map.has("sortBy");
  const hasSortOrder = collected.map.has("sortOrder");
  if (hasSortBy !== hasSortOrder) {
    return {
      ok: false,
      message: "sortBy and sortOrder must both be present or both omitted",
      fieldErrors: [
        {
          field: "/query/sortBy",
          code: "conflicting_fields",
          message: "sortBy and sortOrder must both be present or both omitted",
        },
      ],
    };
  }

  let sortKey: PeopleSortKey = "personId";
  let sortOrder: "asc" | "desc" = "asc";
  if (hasSortBy && hasSortOrder) {
    const sortBy = collected.map.get("sortBy")!;
    const order = collected.map.get("sortOrder")!;
    if (!EXPLICIT_PEOPLE_SORT_BY.has(sortBy)) {
      return {
        ok: false,
        message: "sortBy is invalid",
        fieldErrors: [{ field: "/query/sortBy", code: "enum", message: "sortBy is invalid" }],
      };
    }
    if (order !== "asc" && order !== "desc") {
      return {
        ok: false,
        message: "sortOrder must be asc or desc",
        fieldErrors: [
          { field: "/query/sortOrder", code: "enum", message: "sortOrder must be asc or desc" },
        ],
      };
    }
    sortKey = sortBy as PeopleSortKey;
    sortOrder = order;
  }

  const limitResult = parseLimit(collected.map.get("limit"), "/query/limit");
  if (!limitResult.ok) {
    return limitResult;
  }
  const cursorResult = parseCursorRaw(collected.map.get("cursor"));
  if (!cursorResult.ok) {
    return cursorResult;
  }

  // Ensure PEOPLE_SORT_KEYS stays the authority for materialized keys.
  if (!(PEOPLE_SORT_KEYS as readonly string[]).includes(sortKey)) {
    return {
      ok: false,
      message: "sortBy is invalid",
      fieldErrors: [{ field: "/query/sortBy", code: "enum", message: "sortBy is invalid" }],
    };
  }

  return {
    ok: true,
    query: {
      kind: "people",
      name: nameResult.value,
      state,
      sortKey,
      sortOrder,
      limit: limitResult.value,
    },
    cursorRaw: cursorResult.value,
  };
}

export function parseMockCandidatesQuery(url: string): CandidatesParseSuccess | ParseQueryFailure {
  const collected = collectParams(extractSearchString(url));
  if (!collected.ok) {
    return collected;
  }
  const allowed = new Set(["name", "limit", "cursor"]);
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

  const nameResult = parseName(collected.map.get("name"));
  if (!nameResult.ok) {
    return nameResult;
  }
  const limitResult = parseLimit(collected.map.get("limit"), "/query/limit");
  if (!limitResult.ok) {
    return limitResult;
  }
  const cursorResult = parseCursorRaw(collected.map.get("cursor"));
  if (!cursorResult.ok) {
    return cursorResult;
  }

  return {
    ok: true,
    query: {
      kind: "mock_candidates",
      name: nameResult.value,
      sortKey: "personId",
      sortOrder: "asc",
      limit: limitResult.value,
    },
    cursorRaw: cursorResult.value,
  };
}

export function isPeopleNextPosition(
  value: unknown,
  sortKey: PeopleSortKey,
): value is { personId: string } | { value: number; personId: string } {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (sortKey === "personId") {
    return (
      keys.length === 1 &&
      keys[0] === "personId" &&
      typeof value.personId === "string" &&
      value.personId.length > 0
    );
  }
  return (
    keys.length === 2 &&
    keys.includes("value") &&
    keys.includes("personId") &&
    typeof value.personId === "string" &&
    value.personId.length > 0 &&
    typeof value.value === "number" &&
    Number.isInteger(value.value) &&
    Number.isSafeInteger(value.value)
  );
}

export function isCandidatesNextPosition(value: unknown): value is { personId: string } {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length === 1 &&
    keys[0] === "personId" &&
    typeof value.personId === "string" &&
    value.personId.length > 0
  );
}
