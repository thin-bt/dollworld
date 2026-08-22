/**
 * UI-008 API-010 GET /api/s1_5/validation-results
 *
 * CommittedValidationViewStore only; ValidationResultViewItem exact5.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import { buildSuccessEnvelope, serializeEnvelope } from "../envelope.js";
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
  sendStaleCursor,
  type ListGetHooks,
} from "../ui004/list-get-common.js";
import type { CommittedValidationViewStore } from "../validation-store.js";
import { bindValidationCursor, signValidationNextCursor } from "./bind-cursor.js";
import { isValidationNextPosition, parseValidationQuery } from "./parse-query.js";
import type { ValidationNextPosition } from "./types.js";
import {
  buildValidationPage,
  mapPagedListDataView,
} from "./validation/map-validation-view-item.js";
import { buildValidationSource } from "./validation/source-from-store.js";

export const VALIDATION_RESULTS_ENDPOINT = "GET /api/s1_5/validation-results" as const;

export type ValidationRouteHooks = ListGetHooks & {
  /** FI-064: force occurrence gap after store read. */
  forceOccurrenceGap?: boolean;
  /** FI-065: corrupt issues at index after store read. */
  corruptIssueAtOccurrence?: number;
  /**
   * Test helper: replace store items after snapshot read (does not mutate session).
   */
  overrideStoreItems?: CommittedValidationViewStore["items"];
};

export type ValidationRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: ValidationRouteHooks;
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: ValidationRouteDeps,
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

function applyValidationFaultHooks(
  store: CommittedValidationViewStore,
  hooks: ValidationRouteHooks | undefined,
): CommittedValidationViewStore {
  if (hooks === undefined) {
    return store;
  }
  let items = (hooks.overrideStoreItems ?? store.items).map((item) => ({
    validationOccurrence: item.validationOccurrence,
    result: structuredClone(item.result),
  }));
  let nextValidationOccurrence =
    items.length === 0 ? 1 : items[items.length - 1]!.validationOccurrence + 1;

  if (hooks.forceOccurrenceGap === true) {
    if (items.length === 0) {
      items = [
        { validationOccurrence: 1, result: { ok: true } },
        { validationOccurrence: 3, result: { ok: true } },
      ];
      nextValidationOccurrence = 4;
    } else if (items.length === 1) {
      items = [
        items[0]!,
        { validationOccurrence: items[0]!.validationOccurrence + 2, result: { ok: true } },
      ];
      nextValidationOccurrence = items[1]!.validationOccurrence + 1;
    } else {
      items = items.map((item, index) =>
        index === 1 ? { ...item, validationOccurrence: item.validationOccurrence + 1 } : item,
      );
      nextValidationOccurrence = items[items.length - 1]!.validationOccurrence + 1;
    }
  }

  if (hooks.corruptIssueAtOccurrence !== undefined) {
    const target = hooks.corruptIssueAtOccurrence;
    if (items.length === 0) {
      items = [
        {
          validationOccurrence: target,
          result: { ok: false, issues: [{ message: "missing path" }] },
        },
      ];
      nextValidationOccurrence = target + 1;
    } else {
      items = items.map((item) => {
        if (item.validationOccurrence !== target) {
          return item;
        }
        const result = structuredClone(item.result);
        if (result.ok === false && Array.isArray(result.issues) && result.issues.length > 0) {
          result.issues = [{ message: "missing path" }];
        } else {
          result.ok = false;
          result.issues = [{ bad: true }];
        }
        return { ...item, result };
      });
    }
  }

  return {
    schemaVersion: store.schemaVersion,
    simulationId: store.simulationId,
    items,
    nextValidationOccurrence,
  };
}

export async function handleGetValidationResults(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: ValidationRouteDeps,
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

  const parsed = parseValidationQuery(request.url);
  if (!parsed.ok) {
    sendInvalid(reply, session, parsed.message, parsed.fieldErrors);
    return;
  }

  const fixed = fixReadSnapshot(session);
  if (fixed.committedLifecycle !== "ready") {
    sendNotStarted(reply, session);
    return;
  }
  if (fixed.simulationId === null || fixed.committedValidationStore === null) {
    sendInternal(reply, deps.processKeys, session, deps.hooks);
    return;
  }

  const bound = bindValidationCursor({
    cursorRaw: parsed.cursorRaw,
    endpoint: VALIDATION_RESULTS_ENDPOINT,
    effectiveQuery: parsed.query,
    sessionCookie: cookieValue,
    processKeys: deps.processKeys,
    fixed: {
      uiRevision: fixed.uiRevision,
      simulationId: fixed.simulationId,
    },
    isValidNextPosition: isValidationNextPosition,
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

    const storeForRead = applyValidationFaultHooks(fixed.committedValidationStore, deps.hooks);
    const source = buildValidationSource(storeForRead, fixed.simulationId);
    if (!source.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const pageResult = buildValidationPage({
      items: source.value,
      query: parsed.query,
      cursorNextPosition:
        bound.kind === "ok" ? (bound.nextPosition as ValidationNextPosition) : null,
    });
    if (!pageResult.ok) {
      if (pageResult.code === "STALE_CURSOR") {
        sendStaleCursor(reply, session);
        return;
      }
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    let nextCursor: string | null = null;
    if (pageResult.value.nextPosition !== null) {
      nextCursor = signValidationNextCursor({
        processKeys: deps.processKeys,
        sessionCookie: cookieValue,
        endpoint: VALIDATION_RESULTS_ENDPOINT,
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
