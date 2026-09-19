import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import { CLIENT_CSRF_HEADER_NAME, type FetchLike } from "../session-client.js";
import type {
  CompetitionMatchDetailView,
  CompetitionProgressView,
  CompetitionStepDataView,
} from "./ui009-views.js";

export async function loadCompetitionState(options?: {
  fetchImpl?: FetchLike;
  scheduleYear?: number;
  rankingYear?: number;
}): Promise<
  | { kind: "success"; data: CompetitionProgressView; uiRevision: number }
  | { kind: "failure"; code: string | null; message: string }
> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  let response: { status: number; text: () => Promise<string> };
  try {
    const params = new URLSearchParams();
    if (options?.scheduleYear !== undefined) {
      params.set("scheduleYear", String(options.scheduleYear));
    }
    if (options?.rankingYear !== undefined) {
      params.set("rankingYear", String(options.rankingYear));
    }
    const query = params.toString();
    const url = query.length > 0 ? `${API_PREFIX}/competition?${query}` : `${API_PREFIX}/competition`;
    response = await fetchImpl(url, { credentials: "include" });
  } catch {
    return { kind: "failure", code: null, message: "transport_error" };
  }
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return { kind: "failure", code: null, message: decoded.reason };
  }
  if (decoded.kind === "failure") {
    return {
      kind: "failure",
      code: decoded.envelope.error.code,
      message: decoded.envelope.error.message,
    };
  }
  return {
    kind: "success",
    data: decoded.envelope.data as CompetitionProgressView,
    uiRevision: decoded.envelope.uiRevision,
  };
}

export async function postCompetitionStep(input: {
  csrfToken: string;
  expectedUiRevision: number;
  requestId: string;
  fetchImpl?: FetchLike;
}): Promise<
  | {
      kind: "success";
      data: CompetitionStepDataView & {
        durationMs: number;
        acceptedUiRevision: number;
        completedUiRevision: number;
      };
      uiRevision: number;
    }
  | { kind: "failure"; code: string | null; message: string }
> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(`${API_PREFIX}/competition/step`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
        [CLIENT_CSRF_HEADER_NAME]: input.csrfToken,
      },
      body: JSON.stringify({
        requestId: input.requestId,
        expectedUiRevision: input.expectedUiRevision,
      }),
    });
  } catch {
    return { kind: "failure", code: null, message: "transport_error" };
  }
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return { kind: "failure", code: null, message: decoded.reason };
  }
  if (decoded.kind === "failure") {
    return {
      kind: "failure",
      code: decoded.envelope.error.code,
      message: decoded.envelope.error.message,
    };
  }
  return {
    kind: "success",
    data: decoded.envelope.data as CompetitionStepDataView & {
      durationMs: number;
      acceptedUiRevision: number;
      completedUiRevision: number;
    },
    uiRevision: decoded.envelope.uiRevision,
  };
}

export async function loadCompetitionMatch(
  matchId: string,
  options?: { fetchImpl?: FetchLike },
): Promise<
  | { kind: "success"; data: CompetitionMatchDetailView; uiRevision: number }
  | { kind: "failure"; code: string | null; message: string }
> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  let response: { status: number; text: () => Promise<string> };
  try {
    response = await fetchImpl(
      `${API_PREFIX}/competition/matches/${encodeURIComponent(matchId)}`,
      { credentials: "include" },
    );
  } catch {
    return { kind: "failure", code: null, message: "transport_error" };
  }
  const text = await response.text();
  const decoded = decodeApiResponse(text);
  if (decoded.kind === "transport_error") {
    return { kind: "failure", code: null, message: decoded.reason };
  }
  if (decoded.kind === "failure") {
    return {
      kind: "failure",
      code: decoded.envelope.error.code,
      message: decoded.envelope.error.message,
    };
  }
  return {
    kind: "success",
    data: decoded.envelope.data as CompetitionMatchDetailView,
    uiRevision: decoded.envelope.uiRevision,
  };
}
