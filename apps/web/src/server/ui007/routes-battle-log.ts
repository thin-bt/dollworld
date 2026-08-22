/**
 * UI-007 API-015 GET /api/s1_5/mock-battles/latest/log
 *
 * Read-only consume of UI-006 latest.battleResult.detailedLog.actionLogs.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import { buildFailureEnvelope, buildSuccessEnvelope, serializeEnvelope } from "../envelope.js";
import { createNodeSha256Provider } from "../presets.js";
import type { ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import { deriveEnvelopeRevision, type UiSession } from "../ui-session.js";
import {
  sendInternal,
  sendInvalid,
  sendNotStarted,
  sendSessionRequired,
  sendStaleCursor,
  type ListGetHooks,
} from "../ui004/list-get-common.js";
import { readValidatedLatest } from "../ui006/store-validate.js";
import { bindBattleLogCursor, signBattleLogNextCursor } from "./bind-cursor.js";
import { extractActionLogs } from "./extract-action-logs.js";
import { mapBattleLogListDataView } from "./map-battle-log-list.js";
import { projectBattleLogRevisions } from "./mock-result-data-identity.js";
import { buildBattleLogPage } from "./page-battle-log.js";
import { isBattleLogNextPosition, parseBattleLogQuery } from "./parse-query.js";
import type { BattleLogNextPosition } from "./types.js";

export const BATTLE_LOG_ENDPOINT = "GET /api/s1_5/mock-battles/latest/log" as const;

export type BattleLogRouteHooks = ListGetHooks & {
  /**
   * After readValidatedLatest succeeds, replace actionLogs used for paging.
   * FIX-008: large/boundary pages without inventing a full BattleResult replay.
   * Store hashes remain valid because the store is not mutated.
   */
  overrideActionLogsAfterRead?: unknown[];
  /** FI-057: corrupt one actionLogs item after validated latest read (never skip). */
  corruptActionLogIndex?: number;
};

export type BattleLogRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  hooks?: BattleLogRouteHooks;
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: BattleLogRouteDeps,
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

function fixBattleLogRead(session: UiSession): {
  committedLifecycle: UiSession["committedLifecycle"];
  uiRevision: number;
  mockBattleStore: UiSession["mockBattleStore"];
} {
  if (session.updateControl !== null) {
    const snap = session.updateControl.operationStartReadSnapshot;
    return {
      committedLifecycle: snap.committedLifecycle,
      uiRevision: snap.uiRevision,
      mockBattleStore: snap.mockBattleStore,
    };
  }
  return {
    committedLifecycle: session.committedLifecycle,
    uiRevision: session.uiRevision,
    mockBattleStore: session.mockBattleStore,
  };
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
          message: "no mock battle result exists",
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
        refreshRequired: false,
      }),
    ),
  );
}

function storeResultUiRevision(store: UiSession["mockBattleStore"]): number | null {
  if (store.latest === null) {
    return null;
  }
  const rev = store.latest.resultUiRevision;
  if (typeof rev !== "number" || !Number.isSafeInteger(rev) || rev < 0) {
    return null;
  }
  return rev;
}

export async function handleGetBattleLog(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: BattleLogRouteDeps,
): Promise<void> {
  // 1. Session required 401
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }

  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return;
  }

  // 2. Query parse errors 400
  const parsed = parseBattleLogQuery(request.url);
  if (!parsed.ok) {
    sendInvalid(reply, session, parsed.message, parsed.fieldErrors);
    return;
  }

  const fixed = fixBattleLogRead(session);

  // 3. SIMULATION_NOT_STARTED 409
  if (fixed.committedLifecycle !== "ready") {
    sendNotStarted(reply, session);
    return;
  }

  const resultUiRevisionForBind = storeResultUiRevision(fixed.mockBattleStore);

  // 4. Cursor bind (STALE before resource 404 when latest=null)
  const bound = bindBattleLogCursor({
    cursorRaw: parsed.cursorRaw,
    endpoint: BATTLE_LOG_ENDPOINT,
    effectiveQuery: parsed.query,
    sessionCookie: cookieValue,
    processKeys: deps.processKeys,
    fixed: {
      uiRevision: fixed.uiRevision,
      resultUiRevision: resultUiRevisionForBind,
    },
    isValidNextPosition: isBattleLogNextPosition,
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

  // 5. Cursorless + latest=null => 404
  if (fixed.mockBattleStore.latest === null) {
    sendNotFound(reply, session);
    return;
  }

  try {
    if (deps.hooks?.forceSourceCorruption === true) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    // 6. Current binding + corrupt latest/log => 500
    const sha256 = createNodeSha256Provider();
    const latest = readValidatedLatest({ store: fixed.mockBattleStore, provider: sha256 });
    if (!latest.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const resultUiRevision = latest.value.record.resultUiRevision;
    const revisionGate = projectBattleLogRevisions({
      sessionUiRevision: fixed.uiRevision,
      resultUiRevision,
    });
    if (!revisionGate.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    const extracted = extractActionLogs(latest.value.battleResult.detailedLog);
    if (!extracted.ok) {
      sendInternal(reply, deps.processKeys, session, deps.hooks);
      return;
    }

    let actionLogs: readonly unknown[] = extracted.value.actionLogs;
    if (deps.hooks?.overrideActionLogsAfterRead !== undefined) {
      actionLogs = deps.hooks.overrideActionLogsAfterRead;
    }
    if (deps.hooks?.corruptActionLogIndex !== undefined) {
      const idx = deps.hooks.corruptActionLogIndex;
      const copy = actionLogs.map((item) => structuredClone(item));
      const target = copy[idx];
      if (target !== undefined && typeof target === "object" && target !== null) {
        (target as Record<string, unknown>).actionSequence = "corrupt";
        copy[idx] = target;
      } else {
        copy[idx] = { corrupt: true };
      }
      actionLogs = copy;
    }

    const pageResult = buildBattleLogPage({
      actionLogs,
      query: parsed.query,
      cursorNextPosition:
        bound.kind === "ok" ? (bound.nextPosition as BattleLogNextPosition) : null,
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
      nextCursor = signBattleLogNextCursor({
        processKeys: deps.processKeys,
        sessionCookie: cookieValue,
        endpoint: BATTLE_LOG_ENDPOINT,
        resultUiRevision,
        uiRevision: fixed.uiRevision,
        query: parsed.query,
        nextPosition: pageResult.value.nextPosition,
      });
    }

    const wrapped = mapBattleLogListDataView({
      items: pageResult.value.items,
      totalCount: pageResult.value.totalCount,
      nextCursor,
      resultUiRevision,
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
