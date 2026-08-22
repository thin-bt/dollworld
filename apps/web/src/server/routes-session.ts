import type { FastifyReply, FastifyRequest } from "fastify";
import {
  invalidRequestEnvelope,
  serializeEnvelope,
  serializeFailureOrFallback,
} from "./envelope.js";
import { serializeFailureWithFallback, type EnvelopeSerializerHooks } from "./failure-serialize.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "./process-keys.js";
import { sendApiJson } from "./api-response.js";
import {
  buildSessionSetCookieHeader,
  generateCsrfTokenAscii,
  generateUniqueSessionId,
  parseSessionCookieHeader,
} from "./session-cookie.js";
import type { SessionStore } from "./session-store.js";
import {
  assertUiSessionIntegrity,
  buildSessionDataView,
  createEmptyUiSession,
  deriveEnvelopeRevision,
  UiSessionIntegrityError,
  type UiSession,
} from "./ui-session.js";
import type { CsprngBytes } from "./csprng.js";
import { buildSuccessEnvelope } from "./envelope.js";

export type SessionRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  csprng: CsprngBytes;
  publicOrigin: string;
  serializerHooks?: EnvelopeSerializerHooks;
  hooks?: {
    beforeStoreInsert?: (session: UiSession) => void;
    afterPrebuild?: () => void;
    failSetCookieBuilder?: boolean;
    failDtoSerialize?: boolean;
  };
};

export type SessionBootstrapMetrics = {
  csprngCalls: number;
  newSessionCreated: boolean;
  attempts: number;
};

function sendInternalError(
  reply: FastifyReply,
  deps: SessionRouteDeps,
  meta: { uiRevision: number | null; isUpdating: boolean },
): void {
  let errorReference: string;
  try {
    errorReference = allocateServerErrorReference(deps.processKeys);
  } catch {
    throw new Error("errorReference allocation failed");
  }
  const serialized = serializeFailureWithFallback(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "内部処理に失敗しました。",
        commitState: "none",
        errorReference,
      },
      uiRevision: meta.uiRevision,
      isUpdating: meta.isUpdating,
      refreshRequired: false,
      fallbackErrorReference: errorReference,
    },
    deps.serializerHooks,
  );
  sendApiJson(reply, 500, serialized.body);
}

export async function handleGetSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SessionRouteDeps,
): Promise<SessionBootstrapMetrics> {
  const metrics: SessionBootstrapMetrics = {
    csprngCalls: 0,
    newSessionCreated: false,
    attempts: 0,
  };
  const trackedCsprng: CsprngBytes = (n) => {
    metrics.csprngCalls += 1;
    return deps.csprng(n);
  };

  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  let existing: UiSession | null = null;
  if (cookieValue !== undefined) {
    const row = deps.store.getStrict(cookieValue);
    if (row === "corrupt") {
      sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
      return metrics;
    }
    if (row !== "missing") {
      existing = row;
    }
  }

  if (requestHasQueryString(request.url)) {
    if (existing !== null) {
      const rev = deriveEnvelopeRevision(existing);
      sendApiJson(
        reply,
        400,
        serializeEnvelope(
          invalidRequestEnvelope({
            uiRevision: rev.uiRevision,
            isUpdating: rev.isUpdating,
            message: "query parameters are not allowed",
          }),
        ),
      );
      return metrics;
    }
    sendApiJson(
      reply,
      400,
      serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision: null,
          isUpdating: false,
          message: "query parameters are not allowed",
        }),
      ),
    );
    return metrics;
  }

  if (existing !== null) {
    try {
      const data = buildSessionDataView(existing);
      const rev = deriveEnvelopeRevision(existing);
      const envelope = buildSuccessEnvelope({
        data,
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
      });
      sendApiJson(reply, 200, serializeEnvelope(envelope));
      return metrics;
    } catch {
      sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
      return metrics;
    }
  }

  const unique = generateUniqueSessionId({
    csprng: trackedCsprng,
    hasSessionId: (id) => deps.store.has(id),
  });
  metrics.attempts = unique.attempts;
  if (!unique.ok) {
    sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
    return metrics;
  }

  let csrfToken: string;
  try {
    csrfToken = generateCsrfTokenAscii(trackedCsprng);
  } catch {
    sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
    return metrics;
  }

  const draft = createEmptyUiSession({ sessionId: unique.sessionId, csrfToken });
  try {
    assertUiSessionIntegrity(draft);
  } catch (error) {
    if (error instanceof UiSessionIntegrityError) {
      sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
      return metrics;
    }
    throw error;
  }

  let body: string;
  let setCookie: string;
  try {
    if (deps.hooks?.failDtoSerialize === true) {
      throw new Error("injected DTO serialize fault");
    }
    const data = buildSessionDataView(draft);
    const envelope = buildSuccessEnvelope({
      data,
      uiRevision: 0,
      isUpdating: false,
    });
    body = serializeEnvelope(envelope);
    if (deps.hooks?.failSetCookieBuilder === true) {
      throw new Error("injected Set-Cookie builder fault");
    }
    const secure = deps.publicOrigin.startsWith("https:");
    setCookie = buildSessionSetCookieHeader({ sessionId: draft.sessionId, secure });
    deps.hooks?.afterPrebuild?.();
  } catch {
    sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
    return metrics;
  }

  try {
    deps.hooks?.beforeStoreInsert?.(draft);
    deps.store.insert(draft);
  } catch {
    sendInternalError(reply, deps, { uiRevision: null, isUpdating: false });
    return metrics;
  }

  metrics.newSessionCreated = true;
  void reply.header("set-cookie", setCookie);
  sendApiJson(reply, 200, body);
  return metrics;
}

function requestHasQueryString(url: string): boolean {
  const q = url.indexOf("?");
  return q >= 0 && q < url.length - 1;
}

/** Re-export for tests that still import serializeFailureOrFallback path. */
export { serializeFailureOrFallback };
