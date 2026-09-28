import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { decodeApiResponse } from "../api-client.js";
import type { FetchLike } from "../dev-viewer/fetch-ui004.js";

export type PersonIdentity = { personId: string; displayName: string };
export type PersonIdentityBatchResult =
  | { kind: "success"; items: PersonIdentity[]; uiRevision: number; httpStatus: number }
  | { kind: "failure"; httpStatus: number; code: string | null; message: string };

function isIdentity(value: unknown): value is PersonIdentity {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    Object.keys(row).length === 2 &&
    typeof row.personId === "string" &&
    typeof row.displayName === "string"
  );
}

export function loadPersonIdentities(input: {
  personIds: readonly string[];
  uiRevision: number;
  fetchImpl?: FetchLike;
}): Promise<PersonIdentityBatchResult> {
  const params = new URLSearchParams();
  params.set("ids", input.personIds.join(","));
  params.set("uiRevision", String(input.uiRevision));
  const url = `${API_PREFIX}/people/identities?${params.toString()}`;
  const fetchImpl = input.fetchImpl ?? globalThis.fetch.bind(globalThis);
  return (async () => {
    let response: { status: number; text: () => Promise<string> };
    try {
      response = await fetchImpl(url, { method: "GET", credentials: "same-origin" });
    } catch {
      return { kind: "failure", httpStatus: 0, code: null, message: "transport_error" };
    }
    const decoded = decodeApiResponse(await response.text());
    if (decoded.kind === "transport_error") {
      return { kind: "failure", httpStatus: response.status, code: null, message: decoded.reason };
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
    if (
      typeof data !== "object" ||
      data === null ||
      Array.isArray(data) ||
      Object.keys(data).length !== 1 ||
      !Array.isArray((data as { items?: unknown }).items) ||
      !(data as { items: unknown[] }).items.every(isIdentity)
    ) {
      return { kind: "failure", httpStatus: response.status, code: null, message: "data_shape" };
    }
    return {
      kind: "success",
      items: (data as { items: PersonIdentity[] }).items,
      uiRevision: decoded.envelope.uiRevision,
      httpStatus: response.status,
    };
  })();
}
