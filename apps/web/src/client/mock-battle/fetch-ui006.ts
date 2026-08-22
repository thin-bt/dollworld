/**
 * UI-006 mock battle client binding — API-012/013/014 only.
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import { CLIENT_CSRF_HEADER_NAME, type FetchLike } from "../session-client.js";
import {
  MOCK_BATTLE_MUTATION_VIEW_KEYS,
  MOCK_BATTLE_VIEW_KEYS,
  type MockBattleMutationView,
  type MockBattleView,
} from "./ui006-views.js";

export type MockBattleLoadResult =
  | {
      kind: "success";
      data: MockBattleView;
      uiRevision: number;
      httpStatus: number;
    }
  | { kind: "failure"; httpStatus: number; code: string | null; message: string };

export type MockBattleMutationResult =
  | {
      kind: "success";
      data: MockBattleMutationView;
      uiRevision: number;
      httpStatus: number;
    }
  | {
      kind: "failure";
      httpStatus: number;
      code: string | null;
      message: string;
      validation: unknown;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}

export function isMockBattleView(value: unknown): value is MockBattleView {
  return isRecord(value) && hasExactKeys(value, MOCK_BATTLE_VIEW_KEYS);
}

function isMockBattleMutationView(value: unknown): value is MockBattleMutationView {
  if (!isRecord(value) || !hasExactKeys(value, MOCK_BATTLE_MUTATION_VIEW_KEYS)) {
    return false;
  }
  return (
    typeof value.acceptedUiRevision === "number" &&
    typeof value.completedUiRevision === "number" &&
    typeof value.replay === "boolean" &&
    typeof value.durationMs === "number" &&
    isMockBattleView(value.result)
  );
}

async function decodeMutation(response: {
  status: number;
  text: () => Promise<string>;
}): Promise<MockBattleMutationResult> {
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: decoded.reason,
      validation: null,
    };
  }
  if (decoded.kind === "failure") {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: decoded.envelope.error.code,
      message: decoded.envelope.error.message,
      validation: decoded.envelope.error.validation ?? null,
    };
  }
  if (!isMockBattleMutationView(decoded.envelope.data)) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "data_shape",
      validation: null,
    };
  }
  return {
    kind: "success",
    data: decoded.envelope.data,
    uiRevision: decoded.envelope.uiRevision,
    httpStatus: response.status,
  };
}

export async function postMockBattle(input: {
  csrfToken: string;
  expectedUiRevision: number;
  participantAId: string;
  participantBId: string;
  requestId?: string;
  fetchImpl?: FetchLike;
}): Promise<MockBattleMutationResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/mock-battles`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        [CLIENT_CSRF_HEADER_NAME]: input.csrfToken,
      },
      body: JSON.stringify({
        requestId: input.requestId ?? crypto.randomUUID(),
        expectedUiRevision: input.expectedUiRevision,
        participantAId: input.participantAId,
        participantBId: input.participantBId,
      }),
    });
  } catch {
    return {
      kind: "failure",
      httpStatus: 0,
      code: null,
      message: "transport_error",
      validation: null,
    };
  }
  return decodeMutation(response);
}

export async function postMockBattleReplay(input: {
  csrfToken: string;
  expectedUiRevision: number;
  requestId?: string;
  fetchImpl?: FetchLike;
}): Promise<MockBattleMutationResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/mock-battles/replay`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        [CLIENT_CSRF_HEADER_NAME]: input.csrfToken,
      },
      body: JSON.stringify({
        requestId: input.requestId ?? crypto.randomUUID(),
        expectedUiRevision: input.expectedUiRevision,
      }),
    });
  } catch {
    return {
      kind: "failure",
      httpStatus: 0,
      code: null,
      message: "transport_error",
      validation: null,
    };
  }
  return decodeMutation(response);
}

export async function loadMockBattleLatest(input?: {
  fetchImpl?: FetchLike;
}): Promise<MockBattleLoadResult> {
  const fetchImpl = input?.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/mock-battles/latest`, {
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
  if (!isMockBattleView(decoded.envelope.data)) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "data_shape",
    };
  }
  return {
    kind: "success",
    data: decoded.envelope.data,
    uiRevision: decoded.envelope.uiRevision,
    httpStatus: response.status,
  };
}
