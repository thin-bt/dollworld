/**
 * Shared §5A GET helpers for people / mock-candidates list endpoints.
 */

import { toCanonicalJson } from "@shared-world/simulation-core";
import type { FastifyReply } from "fastify";
import { sendApiJson } from "../api-response.js";
import {
  CURSOR_API_SCHEMA_VERSION_CURRENT,
  signCursorPayload,
  verifyCursorCodec,
  type CanonicalGetQuery,
  type CursorPayload,
} from "../cursor.js";
import { buildFailureEnvelope, invalidRequestEnvelope, serializeEnvelope } from "../envelope.js";
import {
  serializeFailureWithFallback,
  type EnvelopeSerializerHooks,
} from "../failure-serialize.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "../process-keys.js";
import { computeSessionBindingHash } from "../session-cookie.js";
import { deriveEnvelopeRevision, type UiSession } from "../ui-session.js";

export type ListGetHooks = {
  /** FI-038: throw after items are built, before envelope serialize. */
  throwAfterProjection?: () => void;
  /** FI-033/034: force canonical source corruption path (500). */
  forceSourceCorruption?: boolean;
  serializerHooks?: EnvelopeSerializerHooks;
};

export type FixedReadSnapshot = {
  committedLifecycle: UiSession["committedLifecycle"];
  uiRevision: number;
  worldEngineRuntime: UiSession["worldEngineRuntime"];
  runInitializationSnapshot: UiSession["runInitializationSnapshot"];
  committedValidationStore: UiSession["committedValidationStore"];
  simulationId: string | null;
};

export function fixReadSnapshot(session: UiSession): FixedReadSnapshot {
  const base =
    session.updateControl !== null
      ? session.updateControl.operationStartReadSnapshot
      : {
          committedLifecycle: session.committedLifecycle,
          uiRevision: session.uiRevision,
          worldEngineRuntime: session.worldEngineRuntime,
          runInitializationSnapshot: session.runInitializationSnapshot,
          committedValidationStore: session.committedValidationStore,
        };
  const simulationId =
    base.worldEngineRuntime !== null ? base.worldEngineRuntime.context.simulationId : null;
  return {
    committedLifecycle: base.committedLifecycle,
    uiRevision: base.uiRevision,
    worldEngineRuntime: base.worldEngineRuntime,
    runInitializationSnapshot: base.runInitializationSnapshot,
    committedValidationStore: base.committedValidationStore,
    simulationId,
  };
}

export function sendSessionRequired(reply: FastifyReply): void {
  sendApiJson(
    reply,
    401,
    serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "SESSION_REQUIRED",
          message: "session cookie is required",
          commitState: "none",
        },
        uiRevision: null,
        isUpdating: false,
        refreshRequired: false,
      }),
    ),
  );
}

export function sendInvalid(
  reply: FastifyReply,
  session: UiSession | null,
  message: string,
  fieldErrors?: { field: string; code: string; message: string }[],
): void {
  const rev =
    session !== null
      ? deriveEnvelopeRevision(session)
      : { uiRevision: null as number | null, isUpdating: false };
  if (fieldErrors !== undefined && fieldErrors.length > 0) {
    sendApiJson(
      reply,
      400,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "INVALID_REQUEST",
            message,
            commitState: "none",
            fieldErrors,
          },
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
          refreshRequired: false,
        }),
      ),
    );
    return;
  }
  sendApiJson(
    reply,
    400,
    serializeEnvelope(
      invalidRequestEnvelope({
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
        message,
      }),
    ),
  );
}

export function sendStaleCursor(reply: FastifyReply, session: UiSession): void {
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    409,
    serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "STALE_CURSOR",
          message: "cursor is stale",
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
        refreshRequired: true,
      }),
    ),
  );
}

export function sendNotStarted(reply: FastifyReply, session: UiSession): void {
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    409,
    serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "SIMULATION_NOT_STARTED",
          message: "simulation has not been started",
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
        refreshRequired: false,
      }),
    ),
  );
}

export function sendInternal(
  reply: FastifyReply,
  processKeys: ProcessSecurityContext,
  session: UiSession | null,
  hooks: ListGetHooks | undefined,
  message?: string,
): void {
  const rev =
    session !== null
      ? deriveEnvelopeRevision(session)
      : { uiRevision: null as number | null, isUpdating: false };
  const errorReference = allocateServerErrorReference(processKeys);
  const serialized = serializeFailureWithFallback(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: message ?? "内部処理に失敗しました。",
        commitState: "none",
        errorReference,
      },
      uiRevision: rev.uiRevision,
      isUpdating: rev.isUpdating,
      refreshRequired: false,
      fallbackErrorReference: errorReference,
    },
    hooks?.serializerHooks,
  );
  sendApiJson(reply, 500, serialized.body);
}

export type CursorBindResult =
  | { kind: "none" }
  | { kind: "invalid"; message: string }
  | { kind: "stale" }
  | { kind: "ok"; nextPosition: unknown; payload: CursorPayload };

/**
 * §10G.4 steps 1–16 for people / mock_candidates after lifecycle is ready.
 */
export function bindListCursor(input: {
  cursorRaw: string | null;
  endpoint: string;
  expectedKind: CanonicalGetQuery["kind"];
  effectiveQuery: CanonicalGetQuery;
  sessionCookie: string;
  processKeys: ProcessSecurityContext;
  fixed: FixedReadSnapshot;
  isValidNextPosition: (value: unknown) => boolean;
}): CursorBindResult {
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

  // endpoint / kind / dataIdentity prefix compatibility → 400 when impossible
  if (payload.endpoint !== input.endpoint) {
    return { kind: "invalid", message: "cursor endpoint binding is invalid" };
  }
  if (payload.query.kind !== input.expectedKind) {
    return { kind: "invalid", message: "cursor query.kind binding is invalid" };
  }
  if (!payload.dataIdentity.startsWith("simulation:")) {
    return { kind: "invalid", message: "cursor dataIdentity prefix is invalid" };
  }
  if (payload.dataIdentity.slice("simulation:".length).length === 0) {
    return { kind: "invalid", message: "cursor dataIdentity suffix is invalid" };
  }

  if (payload.sessionBindingHash !== expectedBinding) {
    return { kind: "stale" };
  }
  if (input.fixed.simulationId === null) {
    return { kind: "stale" };
  }
  const expectedDataIdentity = `simulation:${input.fixed.simulationId}`;
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

export function signNextCursor(input: {
  processKeys: ProcessSecurityContext;
  sessionCookie: string;
  endpoint: string;
  simulationId: string;
  uiRevision: number;
  query: CanonicalGetQuery;
  nextPosition: unknown;
}): string {
  const payload: CursorPayload = {
    apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
    sessionBindingHash: computeSessionBindingHash(
      input.processKeys.sessionBindingKey,
      input.sessionCookie,
    ),
    endpoint: input.endpoint,
    dataIdentity: `simulation:${input.simulationId}`,
    uiRevision: input.uiRevision,
    query: input.query,
    nextPosition: input.nextPosition,
  };
  return signCursorPayload({
    cursorHmacKey: input.processKeys.cursorHmacKey,
    payload,
  });
}
