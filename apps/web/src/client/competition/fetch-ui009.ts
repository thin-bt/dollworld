import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { CLIENT_CSRF_HEADER_NAME, type FetchLike } from "../session-client.js";
import type { CompetitionProgressView, CompetitionStepDataView } from "./ui009-views.js";

type ApiEnvelope<T> =
  | { ok: true; data: T; uiRevision: number }
  | { ok: false; error: { code: string; message: string }; uiRevision: number | null };

export async function loadCompetitionState(options?: {
  fetchImpl?: FetchLike;
}): Promise<
  | { kind: "success"; data: CompetitionProgressView; uiRevision: number }
  | { kind: "failure"; code: string | null; message: string }
> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const response = await fetchImpl(`${API_PREFIX}/competition`, { credentials: "include" });
  const json = (await response.json()) as ApiEnvelope<CompetitionProgressView>;
  if (!json.ok) {
    return {
      kind: "failure",
      code: json.error.code,
      message: json.error.message,
    };
  }
  return { kind: "success", data: json.data, uiRevision: json.uiRevision };
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
  const response = await fetchImpl(`${API_PREFIX}/competition/step`, {
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
  const json = (await response.json()) as ApiEnvelope<
    CompetitionStepDataView & {
      durationMs: number;
      acceptedUiRevision: number;
      completedUiRevision: number;
    }
  >;
  if (!json.ok) {
    return {
      kind: "failure",
      code: json.error.code,
      message: json.error.message,
    };
  }
  return { kind: "success", data: json.data, uiRevision: json.uiRevision };
}
