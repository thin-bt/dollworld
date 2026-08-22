/**
 * DEV-VIEWER-002 simulation read + accepted mutation calls.
 *
 * Reuses accepted contracts only; no new API surface:
 * - GET  /api/s1_5/simulation        → data.summary (WorldSummaryView), envelope uiRevision
 * - POST /api/s1_5/simulation/step   { requestId, expectedUiRevision, weeks }
 * - POST /api/s1_5/simulation/reset  { requestId, expectedUiRevision }
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import { CLIENT_CSRF_HEADER_NAME, type FetchLike } from "../session-client.js";

/**
 * SPEC 7.1: the 1週 / 4週 / 1年 buttons all post to /simulation/step with
 * weeks = 1 / 4 / 48. The viewer never redefines the length of a year.
 */
export const STEP_WEEKS_ONE_WEEK = 1 as const;
export const STEP_WEEKS_FOUR_WEEKS = 4 as const;
export const STEP_WEEKS_ONE_YEAR = 48 as const;

export const ACCEPTED_STEP_WEEKS = [
  STEP_WEEKS_ONE_WEEK,
  STEP_WEEKS_FOUR_WEEKS,
  STEP_WEEKS_ONE_YEAR,
] as const;

export type AcceptedStepWeeks = (typeof ACCEPTED_STEP_WEEKS)[number];

export type WorldDateSummaryView = {
  year: number;
  month: number;
  week: number;
};

/** Subset of the accepted WorldSummaryView that the developer viewer displays. */
export type SimulationSummaryView = {
  simulationId: string;
  worldDate: WorldDateSummaryView;
  elapsedWeeks: number;
  personCount: number;
  worldYearStartMonth: number;
};

export type SimulationLoadResult =
  | {
      kind: "success";
      summary: SimulationSummaryView;
      uiRevision: number;
      isUpdating: boolean;
      httpStatus: number;
    }
  | { kind: "failure"; httpStatus: number; code: string | null; message: string };

export type SimulationMutationResult =
  | {
      kind: "success";
      operation: "start" | "step" | "reset";
      outcome: "success" | "partial_failure";
      requestedWeeks: number;
      committedWeeks: number;
      completedUiRevision: number;
      summary: SimulationSummaryView;
      httpStatus: number;
    }
  | {
      kind: "failure";
      httpStatus: number;
      code: string | null;
      message: string;
      commitState: string | null;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function parseWorldDate(value: unknown): WorldDateSummaryView | null {
  if (!isRecord(value)) {
    return null;
  }
  if (
    !isNonNegativeInteger(value.year) ||
    !isNonNegativeInteger(value.month) ||
    !isNonNegativeInteger(value.week)
  ) {
    return null;
  }
  return { year: value.year, month: value.month, week: value.week };
}

/** Reads only accepted WorldSummaryView fields; never invents defaults. */
export function parseSimulationSummary(value: unknown): SimulationSummaryView | null {
  if (!isRecord(value)) {
    return null;
  }
  const worldDate = parseWorldDate(value.worldDate);
  if (worldDate === null) {
    return null;
  }
  if (typeof value.simulationId !== "string" || value.simulationId.length === 0) {
    return null;
  }
  if (
    !isNonNegativeInteger(value.elapsedWeeks) ||
    !isNonNegativeInteger(value.personCount) ||
    !isNonNegativeInteger(value.worldYearStartMonth)
  ) {
    return null;
  }
  return {
    simulationId: value.simulationId,
    worldDate,
    elapsedWeeks: value.elapsedWeeks,
    personCount: value.personCount,
    worldYearStartMonth: value.worldYearStartMonth,
  };
}

function failureFromEnvelope(
  httpStatus: number,
  error: { code?: unknown; message?: unknown; commitState?: unknown },
): { httpStatus: number; code: string | null; message: string; commitState: string | null } {
  return {
    httpStatus,
    code: typeof error.code === "string" ? error.code : null,
    message: typeof error.message === "string" ? error.message : "api_error",
    commitState: typeof error.commitState === "string" ? error.commitState : null,
  };
}

export async function loadSimulation(input?: {
  fetchImpl?: FetchLike;
}): Promise<SimulationLoadResult> {
  const fetchImpl = input?.fetchImpl ?? globalThis.fetch.bind(globalThis);
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/simulation`, {
      method: "GET",
      credentials: "same-origin",
    });
  } catch {
    return { kind: "failure", httpStatus: 0, code: null, message: "transport_error" };
  }
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return { kind: "failure", httpStatus: response.status, code: null, message: decoded.reason };
  }
  if (decoded.kind === "failure") {
    const failure = failureFromEnvelope(response.status, decoded.envelope.error);
    return {
      kind: "failure",
      httpStatus: failure.httpStatus,
      code: failure.code,
      message: failure.message,
    };
  }
  const data = decoded.envelope.data;
  if (!isRecord(data)) {
    return { kind: "failure", httpStatus: response.status, code: null, message: "data_shape" };
  }
  const summary = parseSimulationSummary(data.summary);
  if (summary === null) {
    return { kind: "failure", httpStatus: response.status, code: null, message: "summary_shape" };
  }
  return {
    kind: "success",
    summary,
    uiRevision: decoded.envelope.uiRevision,
    isUpdating: decoded.envelope.isUpdating,
    httpStatus: response.status,
  };
}

async function postSimulationMutation(input: {
  path: "/simulation/step" | "/simulation/reset";
  operationInput: Record<string, number>;
  csrfToken: string;
  expectedUiRevision: number;
  requestId: string;
  fetchImpl: FetchLike;
}): Promise<SimulationMutationResult> {
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await input.fetchImpl(`${API_PREFIX}${input.path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "application/json",
        [CLIENT_CSRF_HEADER_NAME]: input.csrfToken,
      },
      body: JSON.stringify({
        requestId: input.requestId,
        expectedUiRevision: input.expectedUiRevision,
        ...input.operationInput,
      }),
    });
  } catch {
    return {
      kind: "failure",
      httpStatus: 0,
      code: null,
      message: "transport_error",
      commitState: null,
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
      commitState: null,
    };
  }
  if (decoded.kind === "failure") {
    return { kind: "failure", ...failureFromEnvelope(response.status, decoded.envelope.error) };
  }
  const data = decoded.envelope.data;
  if (!isRecord(data)) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "data_shape",
      commitState: null,
    };
  }
  const summary = parseSimulationSummary(data.summary);
  if (
    summary === null ||
    (data.operation !== "start" && data.operation !== "step" && data.operation !== "reset") ||
    (data.outcome !== "success" && data.outcome !== "partial_failure") ||
    !isNonNegativeInteger(data.requestedWeeks) ||
    !isNonNegativeInteger(data.committedWeeks) ||
    !isNonNegativeInteger(data.completedUiRevision)
  ) {
    return {
      kind: "failure",
      httpStatus: response.status,
      code: null,
      message: "mutation_shape",
      commitState: null,
    };
  }
  return {
    kind: "success",
    operation: data.operation,
    outcome: data.outcome,
    requestedWeeks: data.requestedWeeks,
    committedWeeks: data.committedWeeks,
    completedUiRevision: data.completedUiRevision,
    summary,
    httpStatus: response.status,
  };
}

export function postStep(input: {
  csrfToken: string;
  expectedUiRevision: number;
  weeks: AcceptedStepWeeks;
  requestId?: string;
  fetchImpl?: FetchLike;
}): Promise<SimulationMutationResult> {
  return postSimulationMutation({
    path: "/simulation/step",
    operationInput: { weeks: input.weeks },
    csrfToken: input.csrfToken,
    expectedUiRevision: input.expectedUiRevision,
    requestId: input.requestId ?? crypto.randomUUID(),
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
  });
}

export function postReset(input: {
  csrfToken: string;
  expectedUiRevision: number;
  requestId?: string;
  fetchImpl?: FetchLike;
}): Promise<SimulationMutationResult> {
  return postSimulationMutation({
    path: "/simulation/reset",
    operationInput: {},
    csrfToken: input.csrfToken,
    expectedUiRevision: input.expectedUiRevision,
    requestId: input.requestId ?? crypto.randomUUID(),
    fetchImpl: input.fetchImpl ?? globalThis.fetch.bind(globalThis),
  });
}

/**
 * Runs one accepted mutation and refreshes derived views only when the server
 * reports an accepted success envelope. Failures keep the API code/message.
 */
export async function runMutationWithRefresh(input: {
  mutate: () => Promise<SimulationMutationResult>;
  refresh: () => void | Promise<void>;
}): Promise<SimulationMutationResult> {
  const result = await input.mutate();
  if (result.kind === "success") {
    await input.refresh();
  }
  return result;
}

export function describeMutationResult(result: SimulationMutationResult): {
  kind: "success" | "failure";
  text: string;
} {
  if (result.kind === "failure") {
    const code = result.code !== null ? `${result.code}: ` : "";
    const commit = result.commitState !== null ? ` (commitState=${result.commitState})` : "";
    return { kind: "failure", text: `失敗 ${code}${result.message}${commit}` };
  }
  return {
    kind: "success",
    text:
      `成功 operation=${result.operation} outcome=${result.outcome}` +
      ` requestedWeeks=${String(result.requestedWeeks)}` +
      ` committedWeeks=${String(result.committedWeeks)}` +
      ` uiRevision=${String(result.completedUiRevision)}`,
  };
}
