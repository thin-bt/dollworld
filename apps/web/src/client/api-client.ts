import {
  API_SCHEMA_VERSION,
  type ApiFailureEnvelope,
  type ApiSuccessEnvelope,
} from "../shared/ui001-contracts.js";

export type ClientDecodeResult =
  | { kind: "success"; envelope: ApiSuccessEnvelope<unknown> }
  | { kind: "failure"; envelope: ApiFailureEnvelope }
  | { kind: "transport_error"; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  if (keys.length !== expected.length) {
    return false;
  }
  return expected.every((key) => keys.includes(key));
}

export function decodeApiResponse(rawBody: string): ClientDecodeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody) as unknown;
  } catch {
    return { kind: "transport_error", reason: "malformed_json" };
  }
  if (!isRecord(parsed)) {
    return { kind: "transport_error", reason: "not_object" };
  }
  if (parsed.apiSchemaVersion !== API_SCHEMA_VERSION) {
    return { kind: "transport_error", reason: "schema_version" };
  }
  if (parsed.ok === true) {
    if (!exactKeys(parsed, ["apiSchemaVersion", "ok", "data", "uiRevision", "isUpdating"])) {
      return { kind: "transport_error", reason: "success_shape" };
    }
    if (typeof parsed.uiRevision !== "number" || typeof parsed.isUpdating !== "boolean") {
      return { kind: "transport_error", reason: "success_types" };
    }
    return { kind: "success", envelope: parsed as ApiSuccessEnvelope<unknown> };
  }
  if (parsed.ok === false) {
    if (
      !exactKeys(parsed, [
        "apiSchemaVersion",
        "ok",
        "error",
        "uiRevision",
        "isUpdating",
        "refreshRequired",
      ])
    ) {
      return { kind: "transport_error", reason: "failure_shape" };
    }
    if (!isRecord(parsed.error) || typeof parsed.refreshRequired !== "boolean") {
      return { kind: "transport_error", reason: "failure_types" };
    }
    return { kind: "failure", envelope: parsed as ApiFailureEnvelope };
  }
  return { kind: "transport_error", reason: "ok_flag" };
}
