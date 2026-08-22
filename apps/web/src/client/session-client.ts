/**
 * UI-002 session bootstrap — shared by Shell and DEV-VIEWER.
 * GET /api/s1_5/session establishes the HttpOnly session cookie (credentials: same-origin).
 */

import {
  API_PREFIX,
  SESSION_DISPLAY_STATES,
  type SessionDisplayState,
} from "../shared/ui001-contracts.js";
import { decodeApiResponse } from "./api-client.js";

/** Wire CSRF header name (SPEC: X-Dollworld-CSRF). */
export const CLIENT_CSRF_HEADER_NAME = "x-dollworld-csrf" as const;

/** Accepted default preset used by UI-003 start tests / registry. */
export const CLIENT_DEFAULT_PRESET_ID = "sprint1-tiny-accepted" as const;

/**
 * Default start seed for empty-session bootstrap.
 * Seed 42 has no age-0 living persons; BattleParticipantSnapshot requires birthYear >= 1,
 * which only age-0 persons at world year 1 satisfy (birthYear = 1 - age). Seed 47 provides
 * multiple age-0 persons so a later accepted year advance can yield mock-capable trainees.
 */
export const CLIENT_DEFAULT_START_SEED = 47 as const;

/** One world year in accepted CAL-JAN weeks (POST /simulation/step upper bound is 480). */
export const CLIENT_MOCK_READY_YEAR_WEEKS = 48 as const;

/**
 * Accepted years to advance so age-0 persons reach trainee eligibility (age 8)
 * while retaining birthYear >= 1.
 */
export const CLIENT_MOCK_READY_YEARS = 8 as const;

/** Total weeks for mock-ready advance (8 × 48). Prefer advanceSimulationForMockReady. */
export const CLIENT_DEFAULT_MOCK_READY_WEEKS = (CLIENT_MOCK_READY_YEAR_WEEKS *
  CLIENT_MOCK_READY_YEARS) as 384;

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    credentials?: RequestCredentials;
    headers?: Record<string, string>;
    body?: string;
  },
) => Promise<{ status: number; text: () => Promise<string> }>;

export type UiSessionSuccess = {
  kind: "success";
  sessionState: SessionDisplayState;
  csrfToken: string;
  uiRevision: number;
};

export type UiSessionFailure = {
  kind: "failure";
  httpStatus: number;
  code: string | null;
  message: string;
};

export type UiSessionResult = UiSessionSuccess | UiSessionFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Canonical session initialization (UI-002). Sets session cookie via Set-Cookie on response.
 * Does not synthesize cookies. Preserves API error codes from the envelope.
 */
export async function loadUiSession(input?: { fetchImpl?: FetchLike }): Promise<UiSessionResult> {
  const fetchImpl = input?.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/session`, {
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
  const data = decoded.envelope.data;
  if (!isRecord(data)) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "session_shape",
    };
  }
  if (
    typeof data.sessionState !== "string" ||
    !(SESSION_DISPLAY_STATES as readonly string[]).includes(data.sessionState) ||
    typeof data.csrfToken !== "string" ||
    data.csrfToken.length === 0
  ) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "session_shape",
    };
  }
  return {
    kind: "success",
    sessionState: data.sessionState as SessionDisplayState,
    csrfToken: data.csrfToken,
    uiRevision: decoded.envelope.uiRevision,
  };
}

/**
 * If session is empty, start the accepted default simulation (seed 47 tiny preset).
 * Does not advance weeks — mock-battle readiness is applied lazily via
 * advanceSimulationForMockReady (384 weeks is too slow for every first page load).
 */
export async function ensureReadySimulation(input: {
  csrfToken: string;
  expectedUiRevision: number;
  fetchImpl?: FetchLike;
  requestId?: string;
  presetId?: string;
  seed?: number;
}): Promise<UiSessionResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const requestId = input.requestId ?? crypto.randomUUID();
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/simulation/start`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        [CLIENT_CSRF_HEADER_NAME]: input.csrfToken,
      },
      body: JSON.stringify({
        requestId,
        expectedUiRevision: input.expectedUiRevision,
        presetId: input.presetId ?? CLIENT_DEFAULT_PRESET_ID,
        seed: input.seed ?? CLIENT_DEFAULT_START_SEED,
      }),
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

  return loadUiSession({ fetchImpl });
}

/**
 * Advance the ready simulation by CLIENT_MOCK_READY_YEARS accepted years (48 weeks each)
 * so birthYear >= 1 persons can become mock-eligible trainees. Uses POST /simulation/step only.
 * Concurrent StrictMode bootstraps share this lock; skipIfReady avoids a second 384-week run
 * after the first bootstrap already produced eligible candidates.
 */
let mockReadyAdvanceChain: Promise<void> = Promise.resolve();

export async function advanceSimulationForMockReady(input: {
  fetchImpl?: FetchLike;
  onYearProgress?: (yearIndex: number, yearCount: number) => void;
  skipIfReady?: () => Promise<boolean>;
}): Promise<UiSessionResult> {
  let release: () => void = () => undefined;
  const previous = mockReadyAdvanceChain;
  mockReadyAdvanceChain = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    if (input.skipIfReady !== undefined && (await input.skipIfReady())) {
      return await loadUiSession(
        input.fetchImpl !== undefined ? { fetchImpl: input.fetchImpl } : {},
      );
    }
    return await advanceSimulationForMockReadyUnlocked(input);
  } finally {
    release();
  }
}

async function advanceSimulationForMockReadyUnlocked(input: {
  fetchImpl?: FetchLike;
  onYearProgress?: (yearIndex: number, yearCount: number) => void;
}): Promise<UiSessionResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  for (let year = 0; year < CLIENT_MOCK_READY_YEARS; year += 1) {
    input.onYearProgress?.(year + 1, CLIENT_MOCK_READY_YEARS);
    const session = await loadUiSession({ fetchImpl });
    if (session.kind !== "success") {
      return session;
    }
    let stepResponse: { status: number; text: () => Promise<string> };
    try {
      stepResponse = await fetchImpl(`${API_PREFIX}/simulation/step`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          [CLIENT_CSRF_HEADER_NAME]: session.csrfToken,
        },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          expectedUiRevision: session.uiRevision,
          weeks: CLIENT_MOCK_READY_YEAR_WEEKS,
        }),
      });
    } catch {
      return { kind: "failure", httpStatus: 0, code: null, message: "transport_error" };
    }
    const stepText = await stepResponse.text();
    const stepDecoded = decodeApiResponse(stepText);
    if (stepDecoded.kind === "transport_error") {
      return {
        kind: "failure",
        httpStatus: stepResponse.status,
        code: null,
        message: stepDecoded.reason,
      };
    }
    if (stepDecoded.kind === "failure") {
      return {
        kind: "failure",
        httpStatus: stepResponse.status,
        code: stepDecoded.envelope.error.code,
        message: stepDecoded.envelope.error.message,
      };
    }
  }
  return loadUiSession({ fetchImpl });
}
