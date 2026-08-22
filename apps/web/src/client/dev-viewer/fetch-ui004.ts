/**
 * UI-004 list GETs — decodeApiResponse + same-origin credentials.
 * People query passes accepted API-007 filters/sort to the server (no local domain recompute).
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import type {
  MockBattleCandidateView,
  PageableListData,
  PersonListItemView,
} from "./ui004-views.js";
import { MOCK_CANDIDATE_KEYS, PERSON_LIST_ITEM_KEYS } from "./ui004-views.js";

export type ListLoadSuccess<T> = {
  kind: "success";
  data: PageableListData<T>;
  uiRevision: number;
  httpStatus: number;
};

export type ListLoadFailure = {
  kind: "failure";
  httpStatus: number;
  code: string | null;
  message: string;
};

export type ListLoadResult<T> = ListLoadSuccess<T> | ListLoadFailure;

export type FetchLike = (
  input: string,
  init?: { method?: string; credentials?: RequestCredentials },
) => Promise<{ status: number; text: () => Promise<string> }>;

/** Accepted API-007 people query controls (server owns filter/sort meaning). */
export type PeopleListQuery = {
  name?: string | null;
  state?: string | null;
  sortBy?: string | null;
  sortOrder?: "asc" | "desc" | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}

function parsePageable<T>(
  data: unknown,
  itemGuard: (item: unknown) => item is T,
): PageableListData<T> | null {
  if (!isRecord(data)) {
    return null;
  }
  if (!hasExactKeys(data, ["items", "totalCount", "nextCursor"])) {
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

function isPersonListItem(value: unknown): value is PersonListItemView {
  return isRecord(value) && hasExactKeys(value, PERSON_LIST_ITEM_KEYS);
}

function isMockCandidate(value: unknown): value is MockBattleCandidateView {
  return isRecord(value) && hasExactKeys(value, MOCK_CANDIDATE_KEYS);
}

async function getListPage<T>(input: {
  path: string;
  cursor: string | null;
  limit: 50 | 100 | 200;
  itemGuard: (item: unknown) => item is T;
  fetchImpl: FetchLike;
  extraParams?: Record<string, string>;
}): Promise<ListLoadResult<T>> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit));
  if (input.cursor !== null) {
    params.set("cursor", input.cursor);
  }
  if (input.extraParams !== undefined) {
    for (const [key, value] of Object.entries(input.extraParams)) {
      params.set(key, value);
    }
  }
  const url = `${API_PREFIX}${input.path}?${params.toString()}`;
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await input.fetchImpl(url, { method: "GET", credentials: "same-origin" });
  } catch {
    return {
      kind: "failure",
      httpStatus: 0,
      code: null,
      message: "transport_error",
    };
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

function peopleExtraParams(query: PeopleListQuery | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (query === undefined) {
    return out;
  }
  if (query.name !== undefined && query.name !== null && query.name.length > 0) {
    out.name = query.name;
  }
  if (query.state !== undefined && query.state !== null && query.state.length > 0) {
    out.state = query.state;
  }
  const sortBy = query.sortBy ?? null;
  const sortOrder = query.sortOrder ?? null;
  if (sortBy !== null && sortBy.length > 0 && sortOrder !== null) {
    out.sortBy = sortBy;
    out.sortOrder = sortOrder;
  }
  return out;
}

export function loadPeoplePage(input: {
  cursor: string | null;
  limit?: 50 | 100 | 200;
  query?: PeopleListQuery;
  fetchImpl?: FetchLike;
}): Promise<ListLoadResult<PersonListItemView>> {
  return getListPage({
    path: "/people",
    cursor: input.cursor,
    limit: input.limit ?? 50,
    itemGuard: isPersonListItem,
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
    extraParams: peopleExtraParams(input.query),
  });
}

export function loadMockCandidatesPage(input: {
  cursor: string | null;
  limit?: 50 | 100 | 200;
  fetchImpl?: FetchLike;
}): Promise<ListLoadResult<MockBattleCandidateView>> {
  return getListPage({
    path: "/mock-battles/candidates",
    cursor: input.cursor,
    limit: input.limit ?? 50,
    itemGuard: isMockCandidate,
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
  });
}

export function personDetailPath(personId: string): string {
  return `/people/${encodeURIComponent(personId)}`;
}
