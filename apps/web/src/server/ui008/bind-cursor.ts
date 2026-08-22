/**
 * Validation cursor bind/sign (BRIDGE-087 / PAGE-009 / ACC-137).
 * dataIdentity = validation:<simulationId>
 */

import { toCanonicalJson } from "@shared-world/simulation-core";
import {
  CURSOR_API_SCHEMA_VERSION_CURRENT,
  signCursorPayload,
  verifyCursorCodec,
  type CursorPayload,
} from "../cursor.js";
import type { ProcessSecurityContext } from "../process-keys.js";
import { computeSessionBindingHash } from "../session-cookie.js";
import type { ValidationQuery } from "./types.js";

export type ValidationCursorBindResult =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "stale" }
  | { kind: "ok"; nextPosition: unknown; payload: CursorPayload };

export type ValidationFixedRead = {
  uiRevision: number;
  simulationId: string | null;
};

export function formatValidationDataIdentity(simulationId: string): string {
  return `validation:${simulationId}`;
}

export function bindValidationCursor(input: {
  cursorRaw: string | null;
  endpoint: string;
  effectiveQuery: ValidationQuery;
  sessionCookie: string;
  processKeys: ProcessSecurityContext;
  fixed: ValidationFixedRead;
  isValidNextPosition: (value: unknown) => boolean;
}): ValidationCursorBindResult {
  if (input.cursorRaw === null) {
    return { kind: "none" };
  }

  const verified = verifyCursorCodec({
    cursor: input.cursorRaw,
    cursorHmacKey: input.processKeys.cursorHmacKey,
  });
  if (verified.kind === "invalid_request") {
    return { kind: "invalid", message: `cursor is invalid (${verified.reason})` };
  }
  if (verified.kind === "stale_cursor") {
    return { kind: "stale" };
  }

  const payload = verified.payload;
  const expectedBinding = computeSessionBindingHash(
    input.processKeys.sessionBindingKey,
    input.sessionCookie,
  );

  if (payload.endpoint !== input.endpoint) {
    return { kind: "invalid", message: "cursor endpoint binding is invalid" };
  }
  if (payload.query.kind !== "validation") {
    return { kind: "invalid", message: "cursor query.kind binding is invalid" };
  }
  if (!payload.dataIdentity.startsWith("validation:")) {
    return { kind: "invalid", message: "cursor dataIdentity prefix is invalid" };
  }
  if (payload.dataIdentity.slice("validation:".length).length === 0) {
    return { kind: "invalid", message: "cursor dataIdentity suffix is invalid" };
  }

  if (payload.sessionBindingHash !== expectedBinding) {
    return { kind: "stale" };
  }
  if (input.fixed.simulationId === null) {
    return { kind: "stale" };
  }
  const expectedDataIdentity = formatValidationDataIdentity(input.fixed.simulationId);
  if (payload.dataIdentity !== expectedDataIdentity) {
    return { kind: "stale" };
  }
  if (payload.uiRevision !== input.fixed.uiRevision) {
    return { kind: "stale" };
  }

  let effectiveCanonical: string;
  let payloadQueryCanonical: string;
  try {
    effectiveCanonical = toCanonicalJson(input.effectiveQuery);
    payloadQueryCanonical = toCanonicalJson(payload.query);
  } catch {
    return { kind: "invalid", message: "cursor query canonicalization failed" };
  }
  if (effectiveCanonical !== payloadQueryCanonical) {
    return { kind: "stale" };
  }

  if (!input.isValidNextPosition(payload.nextPosition)) {
    return { kind: "invalid", message: "cursor nextPosition is invalid" };
  }

  return { kind: "ok", nextPosition: payload.nextPosition, payload };
}

export function signValidationNextCursor(input: {
  processKeys: ProcessSecurityContext;
  sessionCookie: string;
  endpoint: string;
  simulationId: string;
  uiRevision: number;
  query: ValidationQuery;
  nextPosition: unknown;
}): string {
  const payload: CursorPayload = {
    apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
    sessionBindingHash: computeSessionBindingHash(
      input.processKeys.sessionBindingKey,
      input.sessionCookie,
    ),
    endpoint: input.endpoint,
    dataIdentity: formatValidationDataIdentity(input.simulationId),
    uiRevision: input.uiRevision,
    query: input.query,
    nextPosition: input.nextPosition,
  };
  return signCursorPayload({
    cursorHmacKey: input.processKeys.cursorHmacKey,
    payload,
  });
}
