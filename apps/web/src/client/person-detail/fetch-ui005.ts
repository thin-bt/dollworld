/**
 * UI-005 PersonDetail GET binding — accepted endpoint only.
 */

import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import type { FetchLike } from "../dev-viewer/fetch-ui004.js";
import { PERSON_DETAIL_VIEW_KEYS, type PersonDetailView } from "./ui005-views.js";

export type PersonDetailLoadSuccess = {
  kind: "success";
  data: PersonDetailView;
  uiRevision: number;
  httpStatus: number;
};

export type PersonDetailLoadFailure = {
  kind: "failure";
  httpStatus: number;
  code: string | null;
  message: string;
};

export type PersonDetailLoadResult = PersonDetailLoadSuccess | PersonDetailLoadFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}

function isPersonDetailView(value: unknown): value is PersonDetailView {
  return isRecord(value) && hasExactKeys(value, PERSON_DETAIL_VIEW_KEYS);
}

export function loadPersonDetail(input: {
  personId: string;
  fetchImpl?: FetchLike;
}): Promise<PersonDetailLoadResult> {
  const url = `${API_PREFIX}/people/${encodeURIComponent(input.personId)}`;
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  return (async () => {
    let response: { status: number; text: () => Promise<string> };
    try {
      response = await fetchImpl(url, { method: "GET", credentials: "same-origin" });
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
    if (!isPersonDetailView(decoded.envelope.data)) {
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
  })();
}
