/**
 * API-007 GET /api/s1_5/people
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
} from "./list-get-common.js";
import { isPeopleNextPosition, parsePeopleQuery } from "./parse-query.js";
import { buildPeoplePage } from "./people/page-people.js";
import { buildPeopleSource } from "./source-from-runtime.js";

export const PEOPLE_ENDPOINT = "GET /api/s1_5/people" as const;

export type PeopleRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: ListGetHooks;
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: PeopleRouteDeps,
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

export async function handleGetPeople(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: PeopleRouteDeps,
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

  // §5A.3 query syntax before snapshot/lifecycle/cursor
  const parsed = parsePeopleQuery(request.url);
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
    endpoint: PEOPLE_ENDPOINT,
    expectedKind: "people",
    effectiveQuery: parsed.query,
    sessionCookie: cookieValue,
    processKeys: deps.processKeys,
    fixed,
    isValidNextPosition: (value) => isPeopleNextPosition(value, parsed.query.sortKey),
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
    const source = buildPeopleSource(fixed.worldEngineRuntime);
    if (!source.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const pageResult = buildPeoplePage(
      source.people,
      parsed.query,
      bound.kind === "ok"
        ? (bound.nextPosition as { personId: string } | { value: number; personId: string })
        : null,
    );
    if (pageResult.kind === "stale_cursor") {
      sendStaleCursor(reply, session);
      return;
    }

    const items = pageResult.page.items.map((row) => {
      const view = source.itemsById.get(row.personId);
      if (view === undefined) {
        throw new Error("projected PersonListItemView missing");
      }
      return view;
    });

    let nextCursor: string | null = null;
    if (pageResult.page.nextPosition !== null) {
      nextCursor = signNextCursor({
        processKeys: deps.processKeys,
        sessionCookie: cookieValue,
        endpoint: PEOPLE_ENDPOINT,
        simulationId: fixed.simulationId,
        uiRevision: fixed.uiRevision,
        query: parsed.query,
        nextPosition: pageResult.page.nextPosition,
      });
    }

    const data = {
      items,
      totalCount: pageResult.page.totalCount,
      nextCursor,
    };

    deps.hooks?.throwAfterProjection?.();

    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      200,
      serializeEnvelope(
        buildSuccessEnvelope({
          data,
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
  }
}
