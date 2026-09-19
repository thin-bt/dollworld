/**
 * UI-009 Sprint2 competition progression routes.
 * GET  /api/s1_5/competition
 * POST /api/s1_5/competition/step
 */
import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson } from "../api-response.js";
import {
  buildFailureEnvelope,
  buildSuccessEnvelope,
  invalidRequestEnvelope,
  serializeEnvelope,
} from "../envelope.js";
import {
  acceptRunningOperation,
  completeJournalRecord,
  lookupJournalFingerprint,
  monotonicDurationMs,
  REQUEST_ID_UUID_V4,
} from "../mutation-pipeline.js";
import { createNodeSha256Provider } from "../presets.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import {
  assertUiSessionIntegrity,
  deriveEnvelopeRevision,
  type UiSession,
} from "../ui-session.js";
import { fixReadSnapshot } from "../ui004/list-get-common.js";
import { assertWorldUnchanged, projectIsolationSnapshot } from "../ui006/compare-world-isolation.js";
import { finalizeRoundRobinCompetitionStore } from "./competition-round-robin-finalize.js";
import { rankingFactsForStore, runCompetitionProgressionStep } from "./competition-engine.js";
import { getCompetitionStore, setCompetitionStore } from "./competition-session-registry.js";
import { buildStepDataView, mapCompetitionProgressView } from "./map-competition-view.js";
import { mapCompetitionMatchDetailView } from "./competition-match-view.js";

export const COMPETITION_GET_ENDPOINT = "GET /api/s1_5/competition" as const;
export const COMPETITION_STEP_ENDPOINT = "POST /api/s1_5/competition/step" as const;
export const COMPETITION_MATCH_GET_ENDPOINT = "GET /api/s1_5/competition/matches/:matchId" as const;

export type CompetitionRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
};

function loadSession(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: CompetitionRouteDeps,
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
    const errorReference = allocateServerErrorReference(deps.processKeys);
    sendApiJson(
      reply,
      500,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "INTERNAL_ERROR",
            message: "内部処理に失敗しました。",
            commitState: "none",
            errorReference,
          },
          uiRevision: null,
          isUpdating: false,
          refreshRequired: false,
        }),
      ),
    );
    return null;
  }
  return row;
}

function sendSessionRequired(reply: FastifyReply): void {
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

function requireReadySession(session: UiSession, reply: FastifyReply): boolean {
  if (session.committedLifecycle !== "ready" || session.worldEngineRuntime === null) {
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
    return false;
  }
  return true;
}

export async function handleGetCompetitionMatch(
  request: FastifyRequest<{ Params: { matchId: string } }>,
  reply: FastifyReply,
  deps: CompetitionRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }
  if (!requireReadySession(session, reply)) {
    return;
  }
  const matchId = request.params.matchId;
  if (typeof matchId !== "string" || matchId.length === 0) {
    sendApiJson(
      reply,
      400,
      serializeEnvelope(
        invalidRequestEnvelope({
          message: "matchId is required",
          uiRevision: deriveEnvelopeRevision(session).uiRevision,
          isUpdating: deriveEnvelopeRevision(session).isUpdating,
        }),
      ),
    );
    return;
  }
  fixReadSnapshot(session);
  const store = getCompetitionStore(session.sessionId);
  if (store.state === null) {
    sendApiJson(
      reply,
      404,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "NOT_FOUND",
            message: "competition match not found",
            commitState: "none",
          },
          uiRevision: deriveEnvelopeRevision(session).uiRevision,
          isUpdating: deriveEnvelopeRevision(session).isUpdating,
          refreshRequired: false,
        }),
      ),
    );
    return;
  }
  const mapped = mapCompetitionMatchDetailView({
    state: store.state,
    matchId,
    provider: createNodeSha256Provider(),
  });
  if (mapped.kind !== "found") {
    sendApiJson(
      reply,
      mapped.kind === "not_found" ? 404 : 500,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: mapped.kind === "not_found" ? "NOT_FOUND" : "INTERNAL_ERROR",
            message:
              mapped.kind === "log_projection_failed"
                ? mapped.message
                : "competition match not found",
            commitState: "none",
          },
          uiRevision: deriveEnvelopeRevision(session).uiRevision,
          isUpdating: deriveEnvelopeRevision(session).isUpdating,
          refreshRequired: false,
        }),
      ),
    );
    return;
  }
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    200,
    serializeEnvelope(
      buildSuccessEnvelope({
        data: mapped.view,
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
      }),
    ),
  );
}

function parseOptionalWorldYear(value: unknown): number | undefined {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function competitionViewOptions(request: FastifyRequest): {
  scheduleViewYear?: number;
  rankingViewYear?: number;
} {
  const query = request.query as { scheduleYear?: unknown; rankingYear?: unknown };
  const scheduleViewYear = parseOptionalWorldYear(query.scheduleYear);
  const rankingViewYear = parseOptionalWorldYear(query.rankingYear);
  const mapped: { scheduleViewYear?: number; rankingViewYear?: number } = {};
  if (scheduleViewYear !== undefined) {
    mapped.scheduleViewYear = scheduleViewYear;
  }
  if (rankingViewYear !== undefined) {
    mapped.rankingViewYear = rankingViewYear;
  }
  return mapped;
}

export async function handleGetCompetition(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: CompetitionRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }
  if (!requireReadySession(session, reply)) {
    return;
  }
  fixReadSnapshot(session);
  const store = getCompetitionStore(session.sessionId);
  const view = mapCompetitionProgressView(
    store,
    rankingFactsForStore(store),
    session.worldEngineRuntime!,
    competitionViewOptions(request),
  );
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    200,
    serializeEnvelope(
      buildSuccessEnvelope({
        data: view,
        uiRevision: rev.uiRevision,
        isUpdating: rev.isUpdating,
      }),
    ),
  );
}

function parseStepBody(body: unknown):
  | { ok: true; requestId: string; expectedUiRevision: number }
  | { ok: false; message: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "JSON body must be an object" };
  }
  const row = body as Record<string, unknown>;
  if (typeof row.requestId !== "string" || !REQUEST_ID_UUID_V4.test(row.requestId)) {
    return { ok: false, message: "requestId must be a canonical UUID v4" };
  }
  if (
    typeof row.expectedUiRevision !== "number" ||
    !Number.isInteger(row.expectedUiRevision) ||
    row.expectedUiRevision < 0
  ) {
    return { ok: false, message: "expectedUiRevision must be a non-negative integer" };
  }
  return { ok: true, requestId: row.requestId, expectedUiRevision: row.expectedUiRevision };
}

export async function handlePostCompetitionStep(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: CompetitionRouteDeps,
): Promise<void> {
  const session = loadSession(request, reply, deps);
  if (session === null) {
    return;
  }
  if (!requireReadySession(session, reply)) {
    return;
  }

  const parsed = parseStepBody(request.ui001Json?.ok === true ? request.ui001Json.value : undefined);
  if (!parsed.ok) {
    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      400,
      serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
          message: parsed.message,
        }),
      ),
    );
    return;
  }

  const { requestId, expectedUiRevision } = parsed;
  if (expectedUiRevision !== session.uiRevision) {
    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      409,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "STALE_UI_REVISION",
            message: "expectedUiRevision is stale",
            commitState: "none",
          },
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
          refreshRequired: true,
        }),
      ),
    );
    return;
  }

  const fingerprint = `competition_step:${requestId}`;
  const journal = lookupJournalFingerprint(session, requestId, fingerprint);
  if (journal.kind === "replay") {
    sendApiJson(reply, journal.record.httpStatus, journal.record.responseBody);
    return;
  }
  if (journal.kind === "conflict") {
    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      409,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "REQUEST_ID_CONFLICT",
            message: "requestId conflicts with a different operation",
            commitState: "none",
          },
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
          refreshRequired: false,
        }),
      ),
    );
    return;
  }
  if (journal.kind === "running_same" || session.updateControl !== null) {
    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      409,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "UPDATE_IN_PROGRESS",
            message: "an update is already in progress",
            commitState: "none",
          },
          uiRevision: rev.uiRevision,
          isUpdating: true,
          refreshRequired: true,
        }),
      ),
    );
    return;
  }

  const startedAt = process.hrtime.bigint();
  acceptRunningOperation({
    session,
    requestId,
    operationKind: "competition_step",
    fingerprint,
    expectedUiRevision,
    requestedWeeks: 0,
  });

  const worldBefore = projectIsolationSnapshot(session.worldEngineRuntime!.runtimeState);
  const provider = createNodeSha256Provider();
  const competitionStore = getCompetitionStore(session.sessionId);
  const outcome = runCompetitionProgressionStep(
    competitionStore,
    session.worldEngineRuntime!,
    provider,
  );

  if (outcome.kind === "insufficient_participants") {
    const rev = deriveEnvelopeRevision(session);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "DOMAIN_VALIDATION_FAILED",
          message: outcome.message,
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: true,
        refreshRequired: false,
      }),
    );
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 409,
      responseBody: body,
      committedWeeks: 0,
      completedUiRevision: expectedUiRevision,
      replaceLastOperation: false,
    });
    sendApiJson(reply, 409, body);
    return;
  }

  if (outcome.kind === "domain_failure" || outcome.kind === "corrupt") {
    const rev = deriveEnvelopeRevision(session);
    const failureError =
      outcome.kind === "domain_failure"
        ? {
            code: "DOMAIN_VALIDATION_FAILED" as const,
            message: "competition progression failed",
            commitState: "none" as const,
            validation: outcome.issues.map((issue) => ({ ...issue })),
          }
        : {
            code: "DOMAIN_VALIDATION_FAILED" as const,
            message: "competition progression failed",
            commitState: "none" as const,
          };
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: failureError,
        uiRevision: rev.uiRevision,
        isUpdating: true,
        refreshRequired: false,
      }),
    );
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 422,
      responseBody: body,
      committedWeeks: 0,
      completedUiRevision: expectedUiRevision,
      replaceLastOperation: false,
    });
    sendApiJson(reply, 422, body);
    return;
  }

  const worldAfter = projectIsolationSnapshot(session.worldEngineRuntime!.runtimeState);
  const isolation = assertWorldUnchanged(worldBefore, worldAfter);
  if (!isolation.ok) {
    const rev = deriveEnvelopeRevision(session);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "canonical world isolation violated",
          commitState: "none",
        },
        uiRevision: rev.uiRevision,
        isUpdating: true,
        refreshRequired: false,
      }),
    );
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 500,
      responseBody: body,
      committedWeeks: 0,
      completedUiRevision: expectedUiRevision,
      replaceLastOperation: false,
    });
    sendApiJson(reply, 500, body);
    return;
  }

  let committedStorePayload = outcome.store;
  if (committedStorePayload.state?.phase === "round_robin_complete") {
    const finalized = finalizeRoundRobinCompetitionStore(committedStorePayload, provider);
    if (finalized.kind === "domain_failure") {
      const rev = deriveEnvelopeRevision(session);
      const body = serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "DOMAIN_VALIDATION_FAILED",
            message: "competition finalization failed",
            commitState: "none",
            validation: finalized.issues.map((issue) => ({ ...issue })),
          },
          uiRevision: rev.uiRevision,
          isUpdating: true,
          refreshRequired: false,
        }),
      );
      completeJournalRecord({
        session,
        requestId,
        httpStatus: 422,
        responseBody: body,
        committedWeeks: 0,
        completedUiRevision: expectedUiRevision,
        replaceLastOperation: false,
      });
      sendApiJson(reply, 422, body);
      return;
    }
    if (finalized.kind === "ok") {
      committedStorePayload = finalized.store;
    }
  }

  const resultUiRevision = expectedUiRevision + 1;
  setCompetitionStore(session.sessionId, committedStorePayload);
  session.uiRevision = resultUiRevision;
  const committedStore = getCompetitionStore(session.sessionId);
  const stepKind =
    committedStore.state?.phase === "finished" ? ("already_finished" as const) : outcome.stepKind;
  const data = buildStepDataView(
    committedStore,
    rankingFactsForStore(committedStore),
    stepKind,
    session.worldEngineRuntime!,
  );
  const responseBody = serializeEnvelope(
    buildSuccessEnvelope({
      data: {
        ...data,
        durationMs: monotonicDurationMs(startedAt),
        acceptedUiRevision: expectedUiRevision,
        completedUiRevision: resultUiRevision,
      },
      uiRevision: resultUiRevision,
      isUpdating: false,
    }),
  );
  completeJournalRecord({
    session,
    requestId,
    httpStatus: 200,
    responseBody,
    committedWeeks: 0,
    completedUiRevision: resultUiRevision,
    replaceLastOperation: false,
  });
  assertUiSessionIntegrity(session);
  sendApiJson(reply, 200, responseBody);
}
