/**
 * Raw URL query → BattleLogQuery (API-015).
 * Allowed keys: limit, cursor only. Default limit 100. Enum 100 | 200.
 */

import type { BattleLogLimit, BattleLogQuery } from "./types.js";

export type FieldError = { field: string; code: string; message: string };

export type ParseQueryFailure = {
  ok: false;
  message: string;
  fieldErrors?: FieldError[];
};

export type BattleLogParseSuccess = {
  ok: true;
  query: BattleLogQuery;
  cursorRaw: string | null;
};

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

function parseLimit(
  raw: string | undefined,
): { ok: true; value: BattleLogLimit } | ParseQueryFailure {
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
  return { ok: true, value: Number(raw) as BattleLogLimit };
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

export function isBattleLogNextPosition(value: unknown): value is { sourceIndex: number } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "sourceIndex") {
    return false;
  }
  const sourceIndex = (value as { sourceIndex: unknown }).sourceIndex;
  return typeof sourceIndex === "number" && Number.isSafeInteger(sourceIndex) && sourceIndex >= 0;
}

export function parseBattleLogQuery(url: string): BattleLogParseSuccess | ParseQueryFailure {
  const collected = collectParams(extractSearchString(url));
  if (!collected.ok) {
    return collected;
  }
  const allowed = new Set(["limit", "cursor"]);
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

  const limitResult = parseLimit(collected.map.get("limit"));
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
      kind: "battle_log",
      sortKey: "sourceIndex",
      sortOrder: "asc",
      limit: limitResult.value,
    },
    cursorRaw: cursorResult.value,
  };
}
