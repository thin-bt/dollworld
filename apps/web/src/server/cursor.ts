import { createHmac, timingSafeEqual } from "node:crypto";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { decodeBase64UrlNoPad, encodeBase64UrlNoPad } from "./csprng.js";

export const CURSOR_API_SCHEMA_VERSION_CURRENT = "0.2.0" as const;
export const CURSOR_API_SCHEMA_VERSION_OLD = "0.1.0" as const;
export const CURSOR_MAX_ASCII_BYTES = 2048 as const;

export type CanonicalGetQuery =
  | {
      kind: "people";
      name: string | null;
      state: string | null;
      sortKey: string;
      sortOrder: "asc" | "desc";
      limit: 50 | 100 | 200;
    }
  | {
      kind: "mock_candidates";
      name: string | null;
      sortKey: "personId";
      sortOrder: "asc";
      limit: 50 | 100 | 200;
    }
  | {
      kind: "events";
      year: number | null;
      month: number | null;
      week: number | null;
      personId: string | null;
      eventType: string | null;
      eventGroup: "training" | "technique_learning" | null;
      sortKey: "sequence";
      sortOrder: "desc";
      limit: 100 | 200;
    }
  | {
      kind: "validation";
      status: "success" | "failure" | null;
      sortKey: "validationOccurrence";
      sortOrder: "asc";
      limit: 100 | 200;
    }
  | {
      kind: "battle_log";
      sortKey: "sourceIndex";
      sortOrder: "asc";
      limit: 100 | 200;
    };

export type CursorPayload = {
  apiSchemaVersion: typeof CURSOR_API_SCHEMA_VERSION_CURRENT | typeof CURSOR_API_SCHEMA_VERSION_OLD;
  sessionBindingHash: string;
  endpoint: string;
  dataIdentity: string;
  uiRevision: number;
  query: CanonicalGetQuery;
  nextPosition: unknown;
};

export type CursorAuthFailure =
  { kind: "invalid_request"; reason: string } | { kind: "stale_cursor"; reason: string };

export type CursorVerifySuccess = {
  kind: "ok";
  payload: CursorPayload;
  payloadSegmentAscii: string;
};

const DATA_IDENTITY_PREFIX: Record<CanonicalGetQuery["kind"], string> = {
  people: "simulation:",
  mock_candidates: "simulation:",
  events: "simulation:",
  validation: "validation:",
  battle_log: "mock-result:",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" && value !== null && Object.getPrototypeOf(value) === Object.prototype
  );
}

function hmacSha256(key: Uint8Array, messageAscii: string): Buffer {
  return createHmac("sha256", Buffer.from(key)).update(messageAscii, "ascii").digest();
}

export function signCursorPayload(input: {
  cursorHmacKey: Uint8Array;
  payload: CursorPayload;
}): string {
  const payloadJson = toCanonicalJson(input.payload);
  const payloadSegmentAscii = encodeBase64UrlNoPad(Buffer.from(payloadJson, "utf8"));
  const signature = hmacSha256(input.cursorHmacKey, payloadSegmentAscii);
  const signatureSegmentAscii = encodeBase64UrlNoPad(signature);
  const cursor = `${payloadSegmentAscii}.${signatureSegmentAscii}`;
  if (Buffer.byteLength(cursor, "ascii") > CURSOR_MAX_ASCII_BYTES) {
    throw new Error("cursor exceeds ASCII byte limit");
  }
  return cursor;
}

function classifyDataIdentitySuffix(
  kind: CanonicalGetQuery["kind"],
  dataIdentity: string,
): "ok" | "invalid" {
  const prefix = DATA_IDENTITY_PREFIX[kind];
  if (!dataIdentity.startsWith(prefix)) {
    return "invalid";
  }
  const suffix = dataIdentity.slice(prefix.length);
  if (kind === "battle_log") {
    if (!/^(0|[1-9][0-9]*)$/.test(suffix)) {
      return "invalid";
    }
    const value = Number(suffix);
    if (!Number.isSafeInteger(value) || value < 0) {
      return "invalid";
    }
    return "ok";
  }
  if (suffix.length === 0) {
    return "invalid";
  }
  return "ok";
}

function parseCursorPayloadObject(value: unknown): CursorPayload | { error: "malformed" | "old" } {
  if (!isPlainObject(value)) {
    return { error: "malformed" };
  }
  const keys = Object.keys(value);
  const expected = [
    "apiSchemaVersion",
    "sessionBindingHash",
    "endpoint",
    "dataIdentity",
    "uiRevision",
    "query",
    "nextPosition",
  ];
  if (keys.length !== expected.length || !expected.every((k) => keys.includes(k))) {
    return { error: "malformed" };
  }
  if (value.apiSchemaVersion === CURSOR_API_SCHEMA_VERSION_OLD) {
    return { error: "old" };
  }
  if (value.apiSchemaVersion !== CURSOR_API_SCHEMA_VERSION_CURRENT) {
    return { error: "malformed" };
  }
  if (
    typeof value.sessionBindingHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(value.sessionBindingHash)
  ) {
    return { error: "malformed" };
  }
  if (typeof value.endpoint !== "string" || value.endpoint.length === 0) {
    return { error: "malformed" };
  }
  if (typeof value.dataIdentity !== "string" || value.dataIdentity.length === 0) {
    return { error: "malformed" };
  }
  if (
    typeof value.uiRevision !== "number" ||
    !Number.isInteger(value.uiRevision) ||
    value.uiRevision < 0 ||
    !Number.isSafeInteger(value.uiRevision)
  ) {
    return { error: "malformed" };
  }
  if (!isPlainObject(value.query) || typeof value.query.kind !== "string") {
    return { error: "malformed" };
  }
  return {
    apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
    sessionBindingHash: value.sessionBindingHash,
    endpoint: value.endpoint,
    dataIdentity: value.dataIdentity,
    uiRevision: value.uiRevision,
    query: value.query as CanonicalGetQuery,
    nextPosition: value.nextPosition,
  };
}

/**
 * Cursor HMAC/auth precedence unit (10G.4). Endpoint binding steps 11–16 are
 * supplied by callers when an endpoint exists; this codec covers steps 1–10.
 */
export function verifyCursorCodec(input: {
  cursor: string;
  cursorHmacKey: Uint8Array;
}): CursorVerifySuccess | CursorAuthFailure {
  if (Buffer.byteLength(input.cursor, "utf8") !== input.cursor.length) {
    return { kind: "invalid_request", reason: "non_ascii" };
  }
  if (input.cursor.length > CURSOR_MAX_ASCII_BYTES) {
    return { kind: "invalid_request", reason: "too_long" };
  }
  const segments = input.cursor.split(".");
  if (segments.length !== 2 || segments[0] === "" || segments[1] === "") {
    return { kind: "invalid_request", reason: "segment_count" };
  }
  const payloadSegmentAscii = segments[0]!;
  const signatureSegmentAscii = segments[1]!;
  const signatureBytes = decodeBase64UrlNoPad(signatureSegmentAscii);
  if (signatureBytes === undefined || signatureBytes.byteLength !== 32) {
    return { kind: "invalid_request", reason: "signature_encoding" };
  }
  if (decodeBase64UrlNoPad(payloadSegmentAscii) === undefined) {
    return { kind: "invalid_request", reason: "payload_encoding" };
  }
  const expected = hmacSha256(input.cursorHmacKey, payloadSegmentAscii);
  if (
    expected.byteLength !== signatureBytes.byteLength ||
    !timingSafeEqual(expected, Buffer.from(signatureBytes))
  ) {
    return { kind: "invalid_request", reason: "hmac" };
  }
  const payloadBytes = decodeBase64UrlNoPad(payloadSegmentAscii);
  if (payloadBytes === undefined) {
    return { kind: "invalid_request", reason: "payload_decode" };
  }
  if (encodeBase64UrlNoPad(payloadBytes) !== payloadSegmentAscii) {
    return { kind: "invalid_request", reason: "noncanonical_b64" };
  }
  let payloadText: string;
  try {
    payloadText = Buffer.from(payloadBytes).toString("utf8");
  } catch {
    return { kind: "invalid_request", reason: "utf8" };
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(payloadText) as unknown;
  } catch {
    return { kind: "invalid_request", reason: "json" };
  }
  let canonical: string;
  try {
    canonical = toCanonicalJson(parsedJson);
  } catch {
    return { kind: "invalid_request", reason: "canonical" };
  }
  if (canonical !== payloadText) {
    return { kind: "invalid_request", reason: "noncanonical_json" };
  }
  const payloadOrError = parseCursorPayloadObject(parsedJson);
  if ("error" in payloadOrError) {
    if (payloadOrError.error === "old") {
      return { kind: "stale_cursor", reason: "old_schema" };
    }
    return { kind: "invalid_request", reason: "schema" };
  }
  const prefixOk = classifyDataIdentitySuffix(
    payloadOrError.query.kind,
    payloadOrError.dataIdentity,
  );
  if (prefixOk === "invalid") {
    return { kind: "invalid_request", reason: "data_identity" };
  }
  return {
    kind: "ok",
    payload: payloadOrError,
    payloadSegmentAscii,
  };
}
