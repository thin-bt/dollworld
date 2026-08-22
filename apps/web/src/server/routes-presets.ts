import type { FastifyReply, FastifyRequest } from "fastify";
import {
  buildFailureEnvelope,
  buildSuccessEnvelope,
  invalidRequestEnvelope,
  serializeEnvelope,
} from "./envelope.js";
import { sendApiJson } from "./api-response.js";
import type { FrozenPresetRegistry } from "./presets.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "./process-keys.js";
import { parseSessionCookieHeader } from "./session-cookie.js";
import type { SessionStore } from "./session-store.js";
import { deriveEnvelopeRevision } from "./ui-session.js";
import { serializeFailureWithFallback, type EnvelopeSerializerHooks } from "./failure-serialize.js";

export type PresetsRouteDeps = {
  store: SessionStore;
  registry: FrozenPresetRegistry;
  processKeys: ProcessSecurityContext;
  serializerHooks?: EnvelopeSerializerHooks;
};

export async function handleGetPresets(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: PresetsRouteDeps,
): Promise<void> {
  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
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
    return;
  }

  const row = deps.store.getStrict(cookieValue);
  if (row === "missing") {
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
    return;
  }
  if (row === "corrupt") {
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
        uiRevision: null,
        isUpdating: false,
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    );
    sendApiJson(reply, 500, serialized.body);
    return;
  }

  if (requestHasQueryString(request.url)) {
    const rev = deriveEnvelopeRevision(row);
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
    return;
  }

  const rev = deriveEnvelopeRevision(row);
  const data = {
    items: deps.registry.items.slice(),
    totalCount: deps.registry.items.length,
    nextCursor: null,
  };
  const envelope = buildSuccessEnvelope({
    data,
    uiRevision: rev.uiRevision,
    isUpdating: rev.isUpdating,
  });
  sendApiJson(reply, 200, serializeEnvelope(envelope));
}

function requestHasQueryString(url: string): boolean {
  const q = url.indexOf("?");
  return q >= 0 && q < url.length - 1;
}
