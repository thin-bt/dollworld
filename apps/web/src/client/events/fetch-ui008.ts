/**
 * UI-008 events / validation-results client binding — API-009 / API-010 only.
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import type { FetchLike } from "../session-client.js";
import {
  EVENT_ENVELOPE_TOP_LEVEL_KEYS,
  VALIDATION_ISSUE_VIEW_KEYS,
  VALIDATION_RESULT_VIEW_ITEM_KEYS,
  type EventListItemView,
  type EventsListQuery,
  type ValidationListQuery,
  type ValidationResultViewItem,
} from "./ui008-views.js";

export type PagedLoadSuccess<T> = {
  kind: "success";
  data: { items: T[]; totalCount: number; nextCursor: string | null };
  uiRevision: number;
  httpStatus: number;
};

export type PagedLoadFailure = {
  kind: "failure";
  httpStatus: number;
  code: string | null;
  message: string;
};

export type PagedLoadResult<T> = PagedLoadSuccess<T> | PagedLoadFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}

function isEventItem(value: unknown): value is EventListItemView {
  return isRecord(value) && hasExactKeys(value, EVENT_ENVELOPE_TOP_LEVEL_KEYS);
}

function isValidationIssue(value: unknown): boolean {
  return isRecord(value) && hasExactKeys(value, VALIDATION_ISSUE_VIEW_KEYS);
}

function isValidationItem(value: unknown): value is ValidationResultViewItem {
  if (!isRecord(value) || !hasExactKeys(value, VALIDATION_RESULT_VIEW_ITEM_KEYS)) {
    return false;
  }
  if (!Array.isArray(value.issues) || !value.issues.every(isValidationIssue)) {
    return false;
  }
  return value.status === "success" || value.status === "failure";
}

function parsePageable<T>(
  data: unknown,
  itemGuard: (item: unknown) => item is T,
): { items: T[]; totalCount: number; nextCursor: string | null } | null {
  if (!isRecord(data) || !hasExactKeys(data, ["items", "totalCount", "nextCursor"])) {
    return null;
  }
  if (!Array.isArray(data.items) || typeof data.totalCount !== "number") {
    return null;
  }
  if (data.nextCursor !== null && typeof data.nextCursor !== "string") {
    return null;
  }
  if (!data.items.every(itemGuard)) {
    return null;
  }
  return {
    items: data.items,
    totalCount: data.totalCount,
    nextCursor: data.nextCursor,
  };
}

async function getPaged<T>(input: {
  path: string;
  cursor: string | null;
  limit: 100 | 200;
  extra: Record<string, string>;
  itemGuard: (item: unknown) => item is T;
  fetchImpl: FetchLike;
}): Promise<PagedLoadResult<T>> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit));
  if (input.cursor !== null) {
    params.set("cursor", input.cursor);
  }
  for (const [key, value] of Object.entries(input.extra)) {
    params.set(key, value);
  }
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await input.fetchImpl(`${API_PREFIX}${input.path}?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });
  } catch {
    return { kind: "failure", httpStatus: 0, code: null, message: "transport_error" };
  }
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: decoded.reason,
    };
  }
  if (decoded.kind === "failure") {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: decoded.envelope.error.code,
      message: decoded.envelope.error.message,
    };
  }
  const page = parsePageable(decoded.envelope.data, input.itemGuard);
  if (page === null) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "data_shape",
    };
  }
  return {
    kind: "success",
    data: page,
    uiRevision: decoded.envelope.uiRevision,
    httpStatus: response.status,
  };
}

function eventsExtra(query: EventsListQuery | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (query === undefined) {
    return out;
  }
  if (query.personId) {
    out.personId = query.personId;
  }
  if (query.eventGroup) {
    out.eventGroup = query.eventGroup;
  }
  if (query.eventType) {
    out.eventType = query.eventType;
  }
  if (query.year !== undefined && query.year !== null) {
    out.year = String(query.year);
  }
  if (query.month !== undefined && query.month !== null) {
    out.month = String(query.month);
  }
  if (query.week !== undefined && query.week !== null) {
    out.week = String(query.week);
  }
  return out;
}

export function loadEventsPage(input: {
  cursor: string | null;
  limit?: 100 | 200;
  query?: EventsListQuery;
  fetchImpl?: FetchLike;
}): Promise<PagedLoadResult<EventListItemView>> {
  return getPaged({
    path: "/events",
    cursor: input.cursor,
    limit: input.limit ?? 100,
    extra: eventsExtra(input.query),
    itemGuard: isEventItem,
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
  });
}

export function loadValidationResultsPage(input: {
  cursor: string | null;
  limit?: 100 | 200;
  query?: ValidationListQuery;
  fetchImpl?: FetchLike;
}): Promise<PagedLoadResult<ValidationResultViewItem>> {
  const extra: Record<string, string> = {};
  if (input.query?.status) {
    extra.status = input.query.status;
  }
  return getPaged({
    path: "/validation-results",
    cursor: input.cursor,
    limit: input.limit ?? 100,
    extra,
    itemGuard: isValidationItem,
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
  });
}
