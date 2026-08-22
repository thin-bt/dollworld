/**
 * Battle-log cursor bind/sign (BRIDGE-116 / TX-087 / ACC-166).
 * dataIdentity = mock-result:<resultUiRevision>; payload.uiRevision = session snapshot.
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
import {
  formatMockResultDataIdentity,
  parseMockResultDataIdentity,
} from "./mock-result-data-identity.js";
import type { BattleLogQuery } from "./types.js";

export type BattleLogCursorBindResult =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "stale" }
  | { kind: "ok"; nextPosition: unknown; payload: CursorPayload };

export type BattleLogFixedRead = {
  uiRevision: number;
  resultUiRevision: number | null;
};

export function bindBattleLogCursor(input: {
  cursorRaw: string | null;
  endpoint: string;
  effectiveQuery: BattleLogQuery;
  sessionCookie: string;
  processKeys: ProcessSecurityContext;
  fixed: BattleLogFixedRead;
  isValidNextPosition: (value: unknown) => boolean;
}): BattleLogCursorBindResult {
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
  if (payload.query.kind !== "battle_log") {
    return { kind: "invalid", message: "cursor query.kind binding is invalid" };
  }
  if (!payload.dataIdentity.startsWith("mock-result:")) {
    return { kind: "invalid", message: "cursor dataIdentity prefix is invalid" };
  }
  const identityParsed = parseMockResultDataIdentity(payload.dataIdentity);
  if (!identityParsed.ok) {
    return { kind: "invalid", message: "cursor dataIdentity suffix is invalid" };
  }

  if (payload.sessionBindingHash !== expectedBinding) {
    return { kind: "stale" };
  }

  // PAGE-013 / FI-060: authenticated cursor vs cleared latest => STALE before 404.
  if (input.fixed.resultUiRevision === null) {
    return { kind: "stale" };
  }
  if (identityParsed.value !== input.fixed.resultUiRevision) {
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

export function signBattleLogNextCursor(input: {
  processKeys: ProcessSecurityContext;
  sessionCookie: string;
  endpoint: string;
  resultUiRevision: number;
  uiRevision: number;
  query: BattleLogQuery;
  nextPosition: unknown;
}): string {
  const identity = formatMockResultDataIdentity(input.resultUiRevision);
  if (!identity.ok) {
    throw new Error(identity.reason);
  }
  const payload: CursorPayload = {
    apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
    sessionBindingHash: computeSessionBindingHash(
      input.processKeys.sessionBindingKey,
      input.sessionCookie,
    ),
    endpoint: input.endpoint,
    dataIdentity: identity.value,
    uiRevision: input.uiRevision,
    query: input.query,
    nextPosition: input.nextPosition,
  };
  return signCursorPayload({
    cursorHmacKey: input.processKeys.cursorHmacKey,
    payload,
  });
}
