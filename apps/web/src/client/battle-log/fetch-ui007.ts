/**
 * UI-007 battle-log client binding — API-015 only.
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import type { FetchLike } from "../session-client.js";
import {
  BATTLE_LOG_ITEM_VIEW_KEYS,
  BATTLE_LOG_LIST_DATA_KEYS,
  type BattleLogItemView,
  type BattleLogListData,
} from "./ui007-views.js";

export type BattleLogLoadResult =
  | {
      kind: "success";
      data: BattleLogListData;
      uiRevision: number;
      httpStatus: number;
    }
  | { kind: "failure"; httpStatus: number; code: string | null; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}

function isBattleLogItem(value: unknown): value is BattleLogItemView {
  return isRecord(value) && hasExactKeys(value, BATTLE_LOG_ITEM_VIEW_KEYS);
}

function parseList(data: unknown): BattleLogListData | null {
  if (!isRecord(data) || !hasExactKeys(data, BATTLE_LOG_LIST_DATA_KEYS)) {
    return null;
  }
  if (!Array.isArray(data.items) || typeof data.totalCount !== "number") {
    return null;
  }
  if (data.nextCursor !== null && typeof data.nextCursor !== "string") {
    return null;
  }
  if (typeof data.resultUiRevision !== "number") {
    return null;
  }
  if (!data.items.every(isBattleLogItem)) {
    return null;
  }
  return {
    items: data.items,
    totalCount: data.totalCount,
    nextCursor: data.nextCursor,
    resultUiRevision: data.resultUiRevision,
  };
}

export async function loadBattleLogPage(input: {
  cursor?: string | null;
  limit?: 100 | 200;
  fetchImpl?: FetchLike;
}): Promise<BattleLogLoadResult> {
  const params = new URLSearchParams();
  params.set("limit", String(input.limit ?? 100));
  if (input.cursor !== undefined && input.cursor !== null) {
    params.set("cursor", input.cursor);
  }
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/mock-battles/latest/log?${params.toString()}`, {
      method: "GET",
      credentials: "same-origin",
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
  const page = parseList(decoded.envelope.data);
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
