/**
 * API-008 GET /api/s1_5/people/:personId
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import { buildFailureEnvelope, buildSuccessEnvelope, serializeEnvelope } from "../envelope.js";
import type { ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import { deriveEnvelopeRevision, type UiSession } from "../ui-session.js";
import {
  fixReadSnapshot,
  sendInternal,
  sendInvalid,
  sendNotStarted,
  sendSessionRequired,
  type ListGetHooks,
} from "../ui004/list-get-common.js";
import { buildPersonDetailView, PERSON_ID_LEXICAL } from "./build-person-detail.js";

export type PersonDetailRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: ListGetHooks & {
    /** FI hooks: force specific failure paths */
    forceDetailCorruption?: boolean;
  };
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: PersonDetailRouteDeps,
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

function sendNotFound(reply: FastifyReply, session: UiSession): void {
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    404,
    serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "NOT_FOUND",
          message: "person not found",
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
        refreshRequired: false,
      }),
    ),
  );
}

function requestHasExtraQuery(url: string): boolean {
  const q = url.indexOf("?");
  return q >= 0 && q < url.length - 1;
}

export async function handleGetPersonDetail(
  request: FastifyRequest<{ Params: { personId: string } }>,
  reply: FastifyReply,
  deps: PersonDetailRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }

  // §5A.3 path/query syntax before snapshot
  if (requestHasExtraQuery(request.url)) {
    sendInvalid(reply, session, "query parameters are not allowed");
    return;
  }

  let personIdRaw = request.params.personId;
  try {
    personIdRaw = decodeURIComponent(personIdRaw);
  } catch {
    sendInvalid(reply, session, "personId encoding is invalid", [
      { field: "/path/personId", code: "format", message: "personId encoding is invalid" },
    ]);
    return;
  }
  if (personIdRaw.includes("/") || personIdRaw.includes("\0")) {
    sendInvalid(reply, session, "personId is lexically invalid", [
      { field: "/path/personId", code: "format", message: "personId is lexically invalid" },
    ]);
    return;
  }
  for (let i = 0; i < personIdRaw.length; i += 1) {
    const code = personIdRaw.charCodeAt(i);
    if (code < 0x20) {
      sendInvalid(reply, session, "personId is lexically invalid", [
        { field: "/path/personId", code: "format", message: "personId is lexically invalid" },
      ]);
      return;
    }
  }
  if (!PERSON_ID_LEXICAL.test(personIdRaw)) {
    sendInvalid(reply, session, "personId is lexically invalid", [
      { field: "/path/personId", code: "format", message: "personId is lexically invalid" },
    ]);
    return;
  }

  const fixed = fixReadSnapshot(session);
  if (fixed.committedLifecycle !== "ready") {
    sendNotStarted(reply, session);
    return;
  }
  if (fixed.worldEngineRuntime === null) {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
    return;
  }

  try {
    if (deps.hooks?.forceDetailCorruption === true) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const built = buildPersonDetailView({
      session: fixed.worldEngineRuntime,
      personId: personIdRaw,
    });
    if (!built.ok) {
      if ("code" in built && built.code === "NOT_FOUND") {
        sendNotFound(reply, session);
        return;
      }
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
          data: built.value,
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
  }
}
