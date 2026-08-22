/**
 * UI-008 API-009 GET /api/s1_5/events
 *
 * Committed Event Stream only; EventEnvelope exact11 direct wire.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import { buildSuccessEnvelope, serializeEnvelope } from "../envelope.js";
import type { ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import { deriveEnvelopeRevision, type UiSession } from "../ui-session.js";
import {
  bindListCursor,
  fixReadSnapshot,
  sendInternal,
  sendInvalid,
  sendNotStarted,
  sendSessionRequired,
  sendStaleCursor,
  signNextCursor,
  type ListGetHooks,
} from "../ui004/list-get-common.js";
import { buildEventsPage } from "./events/filter-sort-page-events.js";
import { buildEventsSourceFromStream } from "./events/source-from-runtime.js";
import { isEventsNextPosition, parseEventsQuery } from "./parse-query.js";
import type { EventsNextPosition } from "./types.js";
import { mapPagedListDataView } from "./validation/map-validation-view-item.js";

export const EVENTS_ENDPOINT = "GET /api/s1_5/events" as const;

export type EventsRouteHooks = ListGetHooks & {
  /**
   * FI-062: after reading fixed snapshot stream, corrupt one raw index before validate.
   * Invalid event must yield 500 (never skip).
   */
  corruptEventIndex?: number;
  /**
   * Test/FI helper: replace raw stream after snapshot read, before validate.
   * Does not mutate the committed session store.
   */
  overrideEventStream?: unknown[];
};

export type EventsRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: EventsRouteHooks;
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: EventsRouteDeps,
): UiSession | null {
  if (request.uiSession !== undefined) {
    return request.uiSession;
  }
  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return null;
  }
  const row = deps.store.getStrict(cookieValue);
  if (row === "missing") {
    sendSessionRequired(reply);
    return null;
  }
  if (row === "corrupt") {
    sendInternal(reply, deps.processKeys, null, deps.hooks);
    return null;
  }
  return row;
}

export async function handleGetEvents(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: EventsRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }

  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return;
  }

  // §5A: session → query → lifecycle → cursor → source
  const parsed = parseEventsQuery(request.url);
  if (!parsed.ok) {
    sendInvalid(reply, session, parsed.message, parsed.fieldErrors);
    return;
  }

  const fixed = fixReadSnapshot(session);
  if (fixed.committedLifecycle !== "ready") {
    sendNotStarted(reply, session);
    return;
  }
  if (fixed.worldEngineRuntime === null || fixed.simulationId === null) {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
    return;
  }

  const bound = bindListCursor({
    cursorRaw: parsed.cursorRaw,
    endpoint: EVENTS_ENDPOINT,
    expectedKind: "events",
    effectiveQuery: parsed.query,
    sessionCookie: cookieValue,
    processKeys: deps.processKeys,
    fixed,
    isValidNextPosition: isEventsNextPosition,
  });
  if (bound.kind === "invalid") {
    sendInvalid(reply, session, bound.message, [
      { field: "/query/cursor", code: "format", message: bound.message },
    ]);
    return;
  }
  if (bound.kind === "stale") {
    sendStaleCursor(reply, session);
    return;
  }

  try {
    if (deps.hooks?.forceSourceCorruption === true) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const rawStream = fixed.worldEngineRuntime.runtimeState.eventStream;
    let streamForValidate: readonly unknown[] = rawStream;
    if (deps.hooks?.overrideEventStream !== undefined) {
      // Test overrides may come from another run; rebind simulationId to the fixed snapshot.
      streamForValidate = deps.hooks.overrideEventStream.map((item) => {
        if (typeof item !== "object" || item === null) {
          return item;
        }
        const clone = structuredClone(item) as Record<string, unknown>;
        clone.simulationId = fixed.simulationId;
        return clone;
      });
    }
    if (deps.hooks?.corruptEventIndex !== undefined) {
      const idx = deps.hooks.corruptEventIndex;
      const copy = streamForValidate.map((item) => structuredClone(item)) as unknown[];
      const target = copy[idx];
      if (target !== undefined && typeof target === "object" && target !== null) {
        (target as Record<string, unknown>).eventType = "";
        copy[idx] = target;
      } else {
        copy[idx] = { corrupt: true };
      }
      streamForValidate = copy;
    }

    const source = buildEventsSourceFromStream({
      stream: streamForValidate,
      simulationId: fixed.simulationId,
    });
    if (!source.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const pageResult = buildEventsPage({
      events: source.value,
      query: parsed.query,
      cursorNextPosition: bound.kind === "ok" ? (bound.nextPosition as EventsNextPosition) : null,
    });
    if (!pageResult.ok) {
      if (pageResult.code === "STALE_CURSOR") {
        sendStaleCursor(reply, session);
        return;
      }
      if (pageResult.code === "INVALID_REQUEST") {
        sendInvalid(reply, session, pageResult.reason);
        return;
      }
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    let nextCursor: string | null = null;
    if (pageResult.value.nextPosition !== null) {
      nextCursor = signNextCursor({
        processKeys: deps.processKeys,
        sessionCookie: cookieValue,
        endpoint: EVENTS_ENDPOINT,
        simulationId: fixed.simulationId,
        uiRevision: fixed.uiRevision,
        query: parsed.query,
        nextPosition: pageResult.value.nextPosition,
      });
    }

    const wrapped = mapPagedListDataView({
      items: pageResult.value.items,
      totalCount: pageResult.value.totalCount,
      nextCursor,
    });
    if (!wrapped.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    deps.hooks?.throwAfterProjection?.();

    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      200,
      serializeEnvelope(
        buildSuccessEnvelope({
          data: wrapped.value,
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
  }
}
