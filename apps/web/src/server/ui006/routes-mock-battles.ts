/**
 * UI-006 mock battle routes.
 *
 * API-012 POST /api/s1_5/mock-battles
 * API-013 POST /api/s1_5/mock-battles/replay
 * API-014 GET  /api/s1_5/mock-battles/latest
 *
 * The canonical world, World RNG, MatchIdGeneratorState, event allocation and
 * event stream are never mutated: only the session-scoped MockBattleSessionStore
 * and `uiRevision` change on success (§13G revision separation).
 */

import { validateSprint1RunSession, type Sprint1RunSession } from "@shared-world/simulation-core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requestHasQuery, sendApiJson } from "../api-response.js";
import {
  buildFailureEnvelope,
  buildSuccessEnvelope,
  invalidRequestEnvelope,
  serializeEnvelope,
} from "../envelope.js";
import {
  serializeFailureWithFallback,
  type EnvelopeSerializerHooks,
} from "../failure-serialize.js";
import {
  acceptRunningOperation,
  acceptedPostFailureIsUpdating,
  buildFingerprint,
  checkUiRevisionCapacity,
  completeJournalRecord,
  lookupJournalFingerprint,
  monotonicDurationMs,
  REQUEST_ID_UUID_V4,
  requestErrorReference,
} from "../mutation-pipeline.js";
import { createNodeSha256Provider } from "../presets.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "../process-keys.js";
import { parseSessionCookieHeader } from "../session-cookie.js";
import type { SessionStore } from "../session-store.js";
import {
  assertUiSessionIntegrity,
  deriveEnvelopeRevision,
  MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION,
  MOCK_BATTLE_STORE_SCHEMA_VERSION,
  type MockBattleLatestRecord,
  type MockBattleReplaySnapshot,
  type MockBattleSessionStore,
  type UiSession,
} from "../ui-session.js";
import { assertWorldUnchanged, projectIsolationSnapshot } from "./compare-world-isolation.js";
import { mapLatestToMockBattleView, validateRevisionSeparation } from "./map-mock-battle-view.js";
import {
  canonicalCloneSession,
  revalidateMockParticipants,
  runIsolatedMockBattle,
  type MockBattleExecutionHooks,
} from "./run-isolated-mock-battle.js";
import { computeLatestRecordHash, computeReplaySnapshotHash } from "./store-hashes.js";
import { readValidatedLatest } from "./store-validate.js";
import type { MockBattleMutationView, MockBattleView } from "./types.js";

export const MOCK_BATTLE_ENDPOINT = "/api/s1_5/mock-battles" as const;
export const MOCK_BATTLE_REPLAY_ENDPOINT = "/api/s1_5/mock-battles/replay" as const;

export type MockBattleRouteHooks = MockBattleExecutionHooks & {
  /** FI-050: fail success serialization before the store commit. */
  failSerializeBeforeCommit?: boolean;
  /** FI-051: fail transport after the store commit. */
  failTransportAfterCommit?: boolean;
  serializerHooks?: EnvelopeSerializerHooks;
};

export type MockBattleRouteDeps = {
  store: SessionStore;
  processKeys: ProcessSecurityContext;
  serializerHooks?: EnvelopeSerializerHooks;
  hooks?: MockBattleRouteHooks;
};

type FieldError = { field: string; code: string; message: string };

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

function sendInvalid(
  reply: FastifyReply,
  session: UiSession | null,
  message: string,
  fieldErrors?: FieldError[],
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

function sendSimpleFailure(
  reply: FastifyReply,
  session: UiSession,
  status: number,
  code:
    | "NOT_FOUND"
    | "SIMULATION_NOT_STARTED"
    | "STALE_UI_REVISION"
    | "UPDATE_IN_PROGRESS"
    | "REQUEST_ID_CONFLICT",
  message: string,
  refreshRequired: boolean,
  isUpdatingOverride?: boolean,
): void {
  const rev = deriveEnvelopeRevision(session);
  sendApiJson(
    reply,
    status,
    serializeEnvelope(
      buildFailureEnvelope({
        error: { code, message, commitState: "none" },
        uiRevision: rev.uiRevision,
        isUpdating: isUpdatingOverride ?? rev.isUpdating,
        refreshRequired,
      }),
    ),
  );
}

function internalBody(
  deps: MockBattleRouteDeps,
  uiRevision: number | null,
  isUpdating: boolean,
  errorReference: string,
): string {
  return serializeFailureWithFallback(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "内部処理に失敗しました。",
        commitState: "none",
        errorReference,
      },
      uiRevision,
      isUpdating,
      refreshRequired: false,
      fallbackErrorReference: errorReference,
    },
    deps.hooks?.serializerHooks ?? deps.serializerHooks,
  ).body;
}

function requireSession(request: FastifyRequest, reply: FastifyReply): UiSession | null {
  const session = request.uiSession;
  if (session === undefined) {
    sendSessionRequired(reply);
    return null;
  }
  return session;
}

function parseCommonPostFields(
  body: unknown,
):
  | { ok: true; requestId: string; expectedUiRevision: number; rest: Record<string, unknown> }
  | { ok: false; message: string; fieldErrors?: FieldError[] } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "JSON body must be an object" };
  }
  const row = body as Record<string, unknown>;
  if (!("requestId" in row) || !("expectedUiRevision" in row)) {
    return { ok: false, message: "requestId and expectedUiRevision are required" };
  }
  if (typeof row.requestId !== "string" || !REQUEST_ID_UUID_V4.test(row.requestId)) {
    return {
      ok: false,
      message: "requestId must be a canonical UUID v4",
      fieldErrors: [
        { field: "/requestId", code: "format", message: "requestId must be a canonical UUID v4" },
      ],
    };
  }
  if (
    typeof row.expectedUiRevision !== "number" ||
    !Number.isInteger(row.expectedUiRevision) ||
    row.expectedUiRevision < 0 ||
    !Number.isSafeInteger(row.expectedUiRevision)
  ) {
    return {
      ok: false,
      message: "expectedUiRevision must be a non-negative safe integer",
      fieldErrors: [
        {
          field: "/expectedUiRevision",
          code: "type",
          message: "expectedUiRevision must be a non-negative safe integer",
        },
      ],
    };
  }
  const rest = { ...row };
  delete rest.requestId;
  delete rest.expectedUiRevision;
  return { ok: true, requestId: row.requestId, expectedUiRevision: row.expectedUiRevision, rest };
}

function replayOrConflict(
  reply: FastifyReply,
  session: UiSession,
  requestId: string,
  fingerprint: string,
): "continue" | "done" {
  const lookup = lookupJournalFingerprint(session, requestId, fingerprint);
  if (lookup.kind === "replay") {
    sendApiJson(reply, lookup.record.httpStatus, lookup.record.responseBody);
    return "done";
  }
  if (lookup.kind === "running_same") {
    sendSimpleFailure(
      reply,
      session,
      409,
      "UPDATE_IN_PROGRESS",
      "an update is already in progress",
      true,
      true,
    );
    return "done";
  }
  if (lookup.kind === "conflict") {
    sendSimpleFailure(
      reply,
      session,
      409,
      "REQUEST_ID_CONFLICT",
      "requestId conflicts with a different operation",
      false,
    );
    return "done";
  }
  if (session.updateControl !== null) {
    sendSimpleFailure(
      reply,
      session,
      409,
      "UPDATE_IN_PROGRESS",
      "an update is already in progress",
      true,
      true,
    );
    return "done";
  }
  return "continue";
}

function completeAcceptedFailure(
  session: UiSession,
  requestId: string,
  httpStatus: number,
  body: string,
): void {
  completeJournalRecord({
    session,
    requestId,
    httpStatus,
    responseBody: body,
    committedWeeks: 0,
    completedUiRevision:
      session.requestJournal.get(requestId)?.acceptedUiRevision ?? session.uiRevision,
    replaceLastOperation: false,
  });
}

const MOCK_BATTLE_MUTATION_KEYS = [
  "acceptedUiRevision",
  "completedUiRevision",
  "replay",
  "durationMs",
  "result",
] as const;

function assertMockBattleMutationView(view: MockBattleMutationView): void {
  const keys = Object.keys(view);
  if (keys.length !== MOCK_BATTLE_MUTATION_KEYS.length) {
    throw new Error("MockBattleMutationView key count invalid");
  }
  for (const key of MOCK_BATTLE_MUTATION_KEYS) {
    if (!(key in view)) {
      throw new Error(`MockBattleMutationView missing ${key}`);
    }
  }
  if (view.completedUiRevision !== view.acceptedUiRevision + 1) {
    throw new Error("completedUiRevision must be acceptedUiRevision + 1");
  }
  if (view.result.resultUiRevision !== view.completedUiRevision) {
    throw new Error("result.resultUiRevision must equal completedUiRevision");
  }
  // A replay reuses the original snapshot revision, so equality only holds for a new battle.
  if (view.replay) {
    if (view.result.sourceWorldUiRevision > view.acceptedUiRevision) {
      throw new Error("replay sourceWorldUiRevision must not exceed acceptedUiRevision");
    }
  } else if (view.result.sourceWorldUiRevision !== view.acceptedUiRevision) {
    throw new Error("result.sourceWorldUiRevision must equal acceptedUiRevision");
  }
}

type MockOperation = {
  kind: "new";
  participantAId: string;
  participantBId: string;
};

/** Shared §13 mutation body for API-012 / API-013. */
async function runMockBattleMutation(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockBattleRouteDeps,
  mode: "new" | "replay",
): Promise<void> {
  const session = requireSession(request, reply);
  if (session === null) {
    return;
  }
  const parsedJson = request.ui001Json;
  if (parsedJson === undefined || !parsedJson.ok) {
    sendInvalid(reply, session, "JSON body is invalid");
    return;
  }
  const common = parseCommonPostFields(parsedJson.value);
  if (!common.ok) {
    sendInvalid(reply, session, common.message, common.fieldErrors);
    return;
  }
  const { requestId, expectedUiRevision, rest } = common;

  let operation: MockOperation | null = null;
  if (mode === "new") {
    const restKeys = Object.keys(rest);
    if (restKeys.length !== 2 || !("participantAId" in rest) || !("participantBId" in rest)) {
      sendInvalid(reply, session, "mock battle requires exact participantAId and participantBId");
      return;
    }
    if (typeof rest.participantAId !== "string" || rest.participantAId.length === 0) {
      sendInvalid(reply, session, "participantAId is invalid", [
        {
          field: "/participantAId",
          code: "type",
          message: "participantAId must be a non-empty string",
        },
      ]);
      return;
    }
    if (typeof rest.participantBId !== "string" || rest.participantBId.length === 0) {
      sendInvalid(reply, session, "participantBId is invalid", [
        {
          field: "/participantBId",
          code: "type",
          message: "participantBId must be a non-empty string",
        },
      ]);
      return;
    }
    if (rest.participantAId === rest.participantBId) {
      sendInvalid(reply, session, "participantAId and participantBId must differ", [
        {
          field: "/participantBId",
          code: "conflict",
          message: "participantAId and participantBId must differ",
        },
      ]);
      return;
    }
    operation = {
      kind: "new",
      participantAId: rest.participantAId,
      participantBId: rest.participantBId,
    };
  } else if (Object.keys(rest).length !== 0) {
    sendInvalid(reply, session, "replay accepts no operation-specific fields");
    return;
  }

  const endpoint = mode === "new" ? MOCK_BATTLE_ENDPOINT : MOCK_BATTLE_REPLAY_ENDPOINT;
  const fingerprint = buildFingerprint({
    endpoint,
    expectedUiRevision,
    // FIX-080: A/B is an ordered pair, so a swap is a different fingerprint.
    operationInput:
      operation === null
        ? {}
        : {
            participantAId: operation.participantAId,
            participantBId: operation.participantBId,
          },
  });
  if (replayOrConflict(reply, session, requestId, fingerprint) === "done") {
    return;
  }
  if (expectedUiRevision !== session.uiRevision) {
    sendSimpleFailure(
      reply,
      session,
      409,
      "STALE_UI_REVISION",
      "expectedUiRevision is stale",
      true,
    );
    return;
  }
  if (session.committedLifecycle !== "ready" || session.worldEngineRuntime === null) {
    sendSimpleFailure(
      reply,
      session,
      409,
      "SIMULATION_NOT_STARTED",
      "simulation has not been started",
      false,
    );
    return;
  }

  const sha256 = createNodeSha256Provider();
  const runtime: Sprint1RunSession = session.worldEngineRuntime;

  // Pre-accept 404: unknown participants / absent latest are addressed before acceptance,
  // so no operation is journaled and uiRevision stays put.
  if (operation !== null) {
    const known = new Set(
      runtime.runtimeState.worldState.persons.map((person) => person.personId as string),
    );
    if (!known.has(operation.participantAId) || !known.has(operation.participantBId)) {
      sendSimpleFailure(reply, session, 404, "NOT_FOUND", "participant was not found", false);
      return;
    }
  } else if (session.mockBattleStore.latest === null) {
    sendSimpleFailure(reply, session, 404, "NOT_FOUND", "no mock battle result to replay", false);
    return;
  }

  acceptRunningOperation({
    session,
    requestId,
    operationKind: mode === "new" ? "mock_battle" : "mock_battle_replay",
    fingerprint,
    expectedUiRevision,
    requestedWeeks: 0,
  });

  const startedAt = process.hrtime.bigint();
  const failInternal = (): void => {
    const errorReference = requestErrorReference(requestId);
    const body = internalBody(
      deps,
      expectedUiRevision,
      acceptedPostFailureIsUpdating(session),
      errorReference,
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
  };

  if (!checkUiRevisionCapacity({ acceptedUiRevision: expectedUiRevision, maxRevisionDelta: 1 })) {
    failInternal();
    return;
  }

  const validatedRuntime = validateSprint1RunSession(runtime, sha256);
  if (!validatedRuntime.ok) {
    failInternal();
    return;
  }

  // §13G isolation proof material captured from the canonical runtime before the run.
  const isolationBefore = projectIsolationSnapshot(runtime.runtimeState);

  let checkpoint: Record<string, unknown>;
  let participantAId: string;
  let participantBId: string;
  let sourceWorldUiRevision: number;
  // DB-008 revalidation result: `ineligible` must end as a canonical 422, so it is carried
  // to the run instead of short-circuiting with a synthesized ValidationResult.
  let revalidatedIneligible = false;
  if (operation !== null) {
    const eligibility = revalidateMockParticipants(
      validatedRuntime.value,
      operation.participantAId,
      operation.participantBId,
    );
    if (eligibility.kind === "corrupt" || eligibility.kind === "missing") {
      failInternal();
      return;
    }
    revalidatedIneligible = eligibility.kind === "ineligible";
    checkpoint = canonicalCloneSession(validatedRuntime.value);
    participantAId = operation.participantAId;
    participantBId = operation.participantBId;
    sourceWorldUiRevision = expectedUiRevision;
  } else {
    const latest = readValidatedLatest({ store: session.mockBattleStore, provider: sha256 });
    if (!latest.ok) {
      failInternal();
      return;
    }
    checkpoint = latest.value.record.replaySnapshot.runtimeCheckpoint;
    participantAId = latest.value.record.replaySnapshot.participantAId;
    participantBId = latest.value.record.replaySnapshot.participantBId;
    sourceWorldUiRevision = latest.value.record.replaySnapshot.sourceWorldUiRevision;
  }

  const run = runIsolatedMockBattle({
    checkpoint,
    participantAId,
    participantBId,
    provider: sha256,
    ...(deps.hooks !== undefined ? { hooks: deps.hooks } : {}),
  });

  if (run.kind === "pre_start_failure") {
    // §7A: the wire ValidationResult is the canonical pre-start result, never synthesized.
    const validation = [
      JSON.parse(
        JSON.stringify({
          ok: false,
          issues: run.issues.map((issue) => {
            const row: Record<string, unknown> = { path: issue.path, message: issue.message };
            if (issue.actual !== undefined) {
              row.actual = issue.actual;
            }
            if (issue.expected !== undefined) {
              row.expected = issue.expected;
            }
            return row;
          }),
        }),
      ) as Record<string, unknown>,
    ];
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "BATTLE_PRE_START_FAILURE",
          message: "mock battle could not start",
          commitState: "none",
          validation,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 422, body);
    sendApiJson(reply, 422, body);
    return;
  }
  if (run.kind !== "ok") {
    failInternal();
    return;
  }
  if (revalidatedIneligible) {
    // The DB-008 predicate and the canonical pre-start validation disagree.
    failInternal();
    return;
  }

  const isolation = assertWorldUnchanged(
    isolationBefore,
    projectIsolationSnapshot(session.worldEngineRuntime.runtimeState),
  );
  if (!isolation.ok) {
    failInternal();
    return;
  }

  const resultUiRevision = expectedUiRevision + 1;
  const snapshotWithoutHash = {
    schemaVersion: MOCK_BATTLE_REPLAY_SNAPSHOT_SCHEMA_VERSION,
    sourceWorldUiRevision,
    runtimeCheckpoint: checkpoint,
    participantAId,
    participantBId,
    battleKind: "mock" as const,
    participantAActionSourceIdentity: run.participantAActionSourceIdentity,
    participantBActionSourceIdentity: run.participantBActionSourceIdentity,
  };
  const replaySnapshot: MockBattleReplaySnapshot = {
    ...snapshotWithoutHash,
    replaySnapshotHash: computeReplaySnapshotHash(snapshotWithoutHash, sha256),
  };
  const record: MockBattleLatestRecord = {
    resultUiRevision,
    battleResult: run.battleResult as unknown as Record<string, unknown>,
    eventCandidates: run.eventCandidates as unknown as Record<string, unknown>[],
    replaySnapshot,
    latestRecordHash: computeLatestRecordHash(
      {
        resultUiRevision,
        battleResult: run.battleResult,
        eventCandidates: run.eventCandidates,
        replaySnapshot,
      },
      sha256,
    ),
  };

  let view: MockBattleView;
  let responseBody: string;
  try {
    const mapped = mapLatestToMockBattleView({
      resultUiRevision: record.resultUiRevision,
      battleResult: run.battleResult,
      eventCandidates: run.eventCandidates,
      replaySnapshot: {
        sourceWorldUiRevision,
        participantAId,
        participantBId,
      },
    });
    if (!mapped.ok) {
      throw new Error(mapped.reason);
    }
    view = mapped.value;
    const mutation: MockBattleMutationView = {
      acceptedUiRevision: expectedUiRevision,
      completedUiRevision: resultUiRevision,
      replay: mode === "replay",
      durationMs: monotonicDurationMs(startedAt),
      result: view,
    };
    assertMockBattleMutationView(mutation);
    if (deps.hooks?.failSerializeBeforeCommit === true) {
      throw new Error("injected serialize-before-commit fault");
    }
    responseBody = serializeEnvelope(
      buildSuccessEnvelope({
        data: mutation,
        uiRevision: resultUiRevision,
        isUpdating: false,
      }),
    );
  } catch {
    // FI-050: nothing has been written yet, so commitState stays none.
    failInternal();
    return;
  }

  const nextStore: MockBattleSessionStore = {
    schemaVersion: MOCK_BATTLE_STORE_SCHEMA_VERSION,
    latest: record,
  };
  session.mockBattleStore = nextStore;
  session.uiRevision = resultUiRevision;
  completeJournalRecord({
    session,
    requestId,
    httpStatus: 200,
    responseBody,
    committedWeeks: 0,
    completedUiRevision: resultUiRevision,
    // SPEC: lastOperation may be SimulationMutationView | MockBattleMutationView.
    replaceLastOperation: true,
  });
  assertUiSessionIntegrity(session);

  if (deps.hooks?.failTransportAfterCommit === true) {
    // FI-051: store already committed -> commitState complete.
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "complete",
          errorReference,
          committedWeeks: 0,
          completedUiRevision: resultUiRevision,
        },
        uiRevision: resultUiRevision,
        isUpdating: false,
        refreshRequired: true,
      }),
    );
    sendApiJson(reply, 500, body);
    return;
  }

  sendApiJson(reply, 200, responseBody);
}

export async function handlePostMockBattle(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockBattleRouteDeps,
): Promise<void> {
  await runMockBattleMutation(request, reply, deps, "new");
}

export async function handlePostMockBattleReplay(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockBattleRouteDeps,
): Promise<void> {
  await runMockBattleMutation(request, reply, deps, "replay");
}

export async function handleGetMockBattleLatest(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: MockBattleRouteDeps,
): Promise<void> {
  const cookieValue = parseSessionCookieHeader(request.headers.cookie);
  if (cookieValue === undefined) {
    sendSessionRequired(reply);
    return;
  }
  const row = deps.store.getStrict(cookieValue);
  if (row === "missing") {
    sendSessionRequired(reply);
    return;
  }
  if (row === "corrupt") {
    const errorReference = allocateServerErrorReference(deps.processKeys);
    sendApiJson(reply, 500, internalBody(deps, null, false, errorReference));
    return;
  }
  const session = row;

  if (requestHasQuery(request.url)) {
    sendInvalid(reply, session, "query parameters are not allowed");
    return;
  }

  // §5A fixed read: an in-flight mutation is served from its operation-start snapshot.
  const fixed =
    session.updateControl !== null
      ? session.updateControl.operationStartReadSnapshot
      : {
          committedLifecycle: session.committedLifecycle,
          uiRevision: session.uiRevision,
          mockBattleStore: session.mockBattleStore,
        };

  const rev = deriveEnvelopeRevision(session);
  const sendInternal = (): void => {
    const errorReference = allocateServerErrorReference(deps.processKeys);
    sendApiJson(reply, 500, internalBody(deps, rev.uiRevision, rev.isUpdating, errorReference));
  };

  if (fixed.committedLifecycle !== "ready") {
    sendSimpleFailure(
      reply,
      session,
      409,
      "SIMULATION_NOT_STARTED",
      "simulation has not been started",
      false,
    );
    return;
  }
  if (fixed.mockBattleStore.latest === null) {
    sendSimpleFailure(reply, session, 404, "NOT_FOUND", "no mock battle result exists", false);
    return;
  }

  try {
    const sha256 = createNodeSha256Provider();
    const latest = readValidatedLatest({ store: fixed.mockBattleStore, provider: sha256 });
    if (!latest.ok) {
      sendInternal();
      return;
    }
    const separation = validateRevisionSeparation({
      sessionUiRevision: fixed.uiRevision,
      resultUiRevision: latest.value.record.resultUiRevision,
      sourceWorldUiRevision: latest.value.record.replaySnapshot.sourceWorldUiRevision,
    });
    if (!separation.ok) {
      sendInternal();
      return;
    }
    const mapped = mapLatestToMockBattleView({
      resultUiRevision: latest.value.record.resultUiRevision,
      battleResult: latest.value.battleResult,
      eventCandidates: latest.value.eventCandidates,
      replaySnapshot: {
        sourceWorldUiRevision: latest.value.record.replaySnapshot.sourceWorldUiRevision,
        participantAId: latest.value.record.replaySnapshot.participantAId,
        participantBId: latest.value.record.replaySnapshot.participantBId,
      },
    });
    if (!mapped.ok) {
      sendInternal();
      return;
    }
    sendApiJson(
      reply,
      200,
      serializeEnvelope(
        buildSuccessEnvelope({
          data: mapped.value,
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    sendInternal();
  }
}
