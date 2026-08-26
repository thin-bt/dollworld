import {
  createSprint1RunSession,
  createSprint1RunSessionFromRunInitializationMaterials,
  runSprint1WeeklyStep,
  validateSprint1RunSession,
  type Sprint1RunSession,
  type ValidationResult,
} from "@shared-world/simulation-core";
import type { FastifyReply, FastifyRequest } from "fastify";
import { sendApiJson, requestHasQuery } from "./api-response.js";
import { parseSessionCookieHeader } from "./session-cookie.js";
import {
  buildFailureEnvelope,
  buildSuccessEnvelope,
  invalidRequestEnvelope,
  serializeEnvelope,
} from "./envelope.js";
import { serializeFailureWithFallback, type EnvelopeSerializerHooks } from "./failure-serialize.js";
import {
  acceptRunningOperation,
  acceptedPostFailureIsUpdating,
  buildFingerprint,
  checkUiRevisionCapacity,
  completeJournalRecord,
  envelopeMeta,
  lookupJournalFingerprint,
  monotonicDurationMs,
  REQUEST_ID_UUID_V4,
  requestErrorReference,
  updateRunningWeekProgress,
  yieldEventLoop,
} from "./mutation-pipeline.js";
import { createNodeSha256Provider, type FrozenPresetRegistry } from "./presets.js";
import { allocateServerErrorReference, type ProcessSecurityContext } from "./process-keys.js";
import {
  buildReconstructionMaterialsFromRunInitializationSnapshot,
  buildRunInitializationSnapshot,
  runInitializationSnapshotsEqual,
  validateRunInitializationSnapshot,
  type RunInitializationSnapshot,
} from "./run-init.js";
import type { SessionStore } from "./session-store.js";
import {
  assertUiSessionIntegrity,
  createEmptyMockBattleStore,
  deriveEnvelopeRevision,
  type UiSession,
} from "./ui-session.js";
import {
  createValidationStoreFromInitialization,
  type ValidationStoreHooks,
  canonicalCloneValidationResult,
} from "./validation-store.js";
import {
  assertSimulationMutationView,
  buildWorldSummaryView,
  countOperationAggregates,
  toWorldDateView,
  type SimulationMutationView,
  type WorldSummaryView,
} from "./world-summary.js";

export type SimulationRouteHooks = {
  throwOnStartBuild?: () => void;
  throwOnResetBuild?: () => void;
  /** 1-based request week index within the step request. */
  throwOnStepWeek?: (requestWeekIndex: number) => void;
  failSerializeBeforeCommit?: boolean;
  failTransportAfterCommit?: boolean;
  validationStore?: ValidationStoreHooks;
  /** Replace weekly step result (domain failure injection). */
  overrideWeeklyStep?: (
    weekIndex: number,
    real: ValidationResult<Sprint1RunSession>,
  ) => ValidationResult<Sprint1RunSession>;
};

export type SimulationRouteDeps = {
  store: SessionStore;
  registry: FrozenPresetRegistry;
  processKeys: ProcessSecurityContext;
  serializerHooks?: EnvelopeSerializerHooks;
  hooks?: SimulationRouteHooks;
};

function sendInternal(
  reply: FastifyReply,
  deps: SimulationRouteDeps,
  meta: { uiRevision: number | null; isUpdating: boolean; refreshRequired?: boolean },
  error: {
    commitState: "none" | "partial" | "complete";
    errorReference: string;
    committedWeeks?: number;
    completedUiRevision?: number;
    message?: string;
  },
): void {
  const apiError: {
    code: "INTERNAL_ERROR";
    message: string;
    commitState: "none" | "partial" | "complete";
    errorReference: string;
    committedWeeks?: number;
    completedUiRevision?: number;
  } = {
    code: "INTERNAL_ERROR",
    message: error.message ?? "内部処理に失敗しました。",
    commitState: error.commitState,
    errorReference: error.errorReference,
  };
  if (error.commitState === "partial" || error.commitState === "complete") {
    if (error.committedWeeks !== undefined) {
      apiError.committedWeeks = error.committedWeeks;
    }
    if (error.completedUiRevision !== undefined) {
      apiError.completedUiRevision = error.completedUiRevision;
    }
  }
  const serialized = serializeFailureWithFallback(
    {
      error: apiError,
      uiRevision: meta.uiRevision,
      isUpdating: meta.isUpdating,
      refreshRequired: meta.refreshRequired ?? error.commitState !== "none",
      fallbackErrorReference: error.errorReference,
    },
    deps.serializerHooks,
  );
  sendApiJson(reply, 500, serialized.body);
}

function requireSession(request: FastifyRequest, reply: FastifyReply): UiSession | null {
  const session = request.uiSession;
  if (session === undefined) {
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
    return null;
  }
  return session;
}

function parseCommonPostFields(body: unknown):
  | { ok: true; requestId: string; expectedUiRevision: number; rest: Record<string, unknown> }
  | {
      ok: false;
      message: string;
      fieldErrors?: { field: string; code: string; message: string }[];
    } {
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
  return {
    ok: true,
    requestId: row.requestId,
    expectedUiRevision: row.expectedUiRevision,
    rest,
  };
}

function sendInvalid(
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
    return "done";
  }
  if (lookup.kind === "conflict") {
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
    return "done";
  }
  if (session.updateControl !== null) {
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
    return "done";
  }
  return "continue";
}

function staleRevision(reply: FastifyReply, session: UiSession): void {
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
}

function notStarted(reply: FastifyReply, session: UiSession): void {
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

function buildCreateSprint1RunSessionInput(input: {
  seed: number;
  config: import("@shared-world/simulation-core").InitialWorldConfig;
  nameData: import("@shared-world/simulation-core").ValidatedNameData;
  sprint1CliInput: unknown;
}): unknown {
  return {
    seed: input.seed,
    config: input.config,
    nameData: input.nameData,
    sprint1CliInput: input.sprint1CliInput,
  };
}

function serializeMutationSuccess(view: SimulationMutationView, deps: SimulationRouteDeps): string {
  if (deps.hooks?.failSerializeBeforeCommit === true) {
    throw new Error("injected serialize-before-commit fault");
  }
  assertSimulationMutationView(view);
  return serializeEnvelope(
    buildSuccessEnvelope({
      data: view,
      uiRevision: view.completedUiRevision,
      isUpdating: false,
    }),
  );
}

function finishTransport(
  reply: FastifyReply,
  deps: SimulationRouteDeps,
  status: number,
  body: string,
): void {
  if (deps.hooks?.failTransportAfterCommit === true) {
    throw new Error("injected transport failure after commit");
  }
  sendApiJson(reply, status, body);
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

export async function handlePostSimulationStart(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SimulationRouteDeps,
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
  const restKeys = Object.keys(rest);
  if (restKeys.length !== 2 || !("presetId" in rest) || !("seed" in rest)) {
    sendInvalid(reply, session, "start requires exact presetId and seed fields");
    return;
  }
  if (typeof rest.presetId !== "string" || rest.presetId.length === 0) {
    sendInvalid(reply, session, "presetId is invalid", [
      { field: "/presetId", code: "type", message: "presetId must be a non-empty string" },
    ]);
    return;
  }
  if (
    typeof rest.seed !== "number" ||
    !Number.isInteger(rest.seed) ||
    rest.seed < 0 ||
    rest.seed > 4294967295
  ) {
    sendInvalid(reply, session, "seed is invalid", [
      { field: "/seed", code: "range", message: "seed must be a uint32 integer" },
    ]);
    return;
  }
  const presetId = rest.presetId;
  const seed = rest.seed;
  const endpoint = "/api/s1_5/simulation/start";
  const fingerprint = buildFingerprint({
    endpoint,
    expectedUiRevision,
    operationInput: { presetId, seed },
  });
  if (replayOrConflict(reply, session, requestId, fingerprint) === "done") {
    return;
  }
  if (expectedUiRevision !== session.uiRevision) {
    staleRevision(reply, session);
    return;
  }
  if (session.committedLifecycle !== "empty" && session.committedLifecycle !== "ready") {
    notStarted(reply, session);
    return;
  }
  const materials = deps.registry.getMaterials(presetId);
  if (materials === undefined) {
    const rev = deriveEnvelopeRevision(session);
    sendApiJson(
      reply,
      404,
      serializeEnvelope(
        buildFailureEnvelope({
          error: {
            code: "NOT_FOUND",
            message: "preset was not found",
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

  acceptRunningOperation({
    session,
    requestId,
    operationKind: "start",
    fingerprint,
    expectedUiRevision,
    requestedWeeks: 0,
  });

  if (!checkUiRevisionCapacity({ acceptedUiRevision: expectedUiRevision, maxRevisionDelta: 1 })) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  const startedAt = process.hrtime.bigint();
  const sha256 = createNodeSha256Provider();
  let created: ReturnType<typeof createSprint1RunSession>;
  try {
    deps.hooks?.throwOnStartBuild?.();
    created = createSprint1RunSession(
      buildCreateSprint1RunSessionInput({
        seed,
        config: materials.config,
        nameData: materials.nameData,
        sprint1CliInput: materials.sprint1CliInputForCreate,
      }),
      sha256,
    );
  } catch {
    const errorReference = requestErrorReference(requestId);
    const body = serializeFailureWithFallback(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    ).body;
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  if (!created.ok) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeFailureWithFallback(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    ).body;
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  let runInit: RunInitializationSnapshot;
  let summary: WorldSummaryView;
  let mutation: SimulationMutationView;
  let responseBody: string;
  try {
    runInit = buildRunInitializationSnapshot({
      presetId,
      seed,
      config: materials.config,
      nameData: materials.nameData,
      session: created.value.session,
    });
    const validationStore = createValidationStoreFromInitialization({
      simulationId: created.value.session.context.simulationId,
      results: [],
      hooks: deps.hooks?.validationStore,
    });
    const counts = countOperationAggregates({
      events: created.value.session.runtimeState.eventStream,
      validationResultCount: validationStore.items.length,
    });
    summary = buildWorldSummaryView({
      runInitializationSnapshot: runInit,
      runtime: created.value.session,
    });
    mutation = {
      acceptedUiRevision: expectedUiRevision,
      completedUiRevision: expectedUiRevision + 1,
      operation: "start",
      outcome: "success",
      requestedWeeks: 0,
      committedWeeks: 0,
      failedWeek: null,
      eventCount: counts.eventCount,
      statIncreaseCount: counts.statIncreaseCount,
      techniqueLearnedCount: counts.techniqueLearnedCount,
      validationResultCount: counts.validationResultCount,
      mockBattleCount: 0,
      durationMs: monotonicDurationMs(startedAt),
      summary,
    };
    responseBody = serializeMutationSuccess(mutation, deps);

    session.committedLifecycle = "ready";
    session.uiRevision = expectedUiRevision + 1;
    session.worldEngineRuntime = created.value.session;
    session.runInitializationSnapshot = runInit;
    session.committedValidationStore = validationStore;
    session.mockBattleStore = createEmptyMockBattleStore();
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 200,
      responseBody,
      committedWeeks: 0,
      completedUiRevision: expectedUiRevision + 1,
      replaceLastOperation: true,
    });
    assertUiSessionIntegrity(session);
  } catch {
    // Roll back acceptance to previous lifecycle (session fields untouched on throw before assign).
    if (session.updateControl !== null) {
      const errorReference = requestErrorReference(requestId);
      const body = serializeFailureWithFallback(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "内部処理に失敗しました。",
            commitState: "none",
            errorReference,
          },
          uiRevision: expectedUiRevision,
          isUpdating: acceptedPostFailureIsUpdating(session),
          refreshRequired: false,
          fallbackErrorReference: errorReference,
        },
        deps.serializerHooks,
      ).body;
      completeAcceptedFailure(session, requestId, 500, body);
      sendApiJson(reply, 500, body);
      return;
    }
    throw new Error("start commit failed after mutation");
  }

  finishTransport(reply, deps, 200, responseBody);
}

export async function handlePostSimulationReset(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SimulationRouteDeps,
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
  if (Object.keys(rest).length !== 0) {
    sendInvalid(reply, session, "reset accepts no operation-specific fields");
    return;
  }
  const endpoint = "/api/s1_5/simulation/reset";
  const fingerprint = buildFingerprint({
    endpoint,
    expectedUiRevision,
    operationInput: {},
  });
  if (replayOrConflict(reply, session, requestId, fingerprint) === "done") {
    return;
  }
  if (expectedUiRevision !== session.uiRevision) {
    staleRevision(reply, session);
    return;
  }
  if (session.committedLifecycle !== "ready") {
    notStarted(reply, session);
    return;
  }

  acceptRunningOperation({
    session,
    requestId,
    operationKind: "reset",
    fingerprint,
    expectedUiRevision,
    requestedWeeks: 0,
  });

  const startedAt = process.hrtime.bigint();
  const saved = session.runInitializationSnapshot;
  const runtime = session.worldEngineRuntime;
  if (saved === null || runtime === null) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  const validatedSnap = validateRunInitializationSnapshot(saved);
  if (!validatedSnap.ok) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  if (!checkUiRevisionCapacity({ acceptedUiRevision: expectedUiRevision, maxRevisionDelta: 1 })) {
    // Still need integrity first — already validated. Capacity after integrity.
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  // ACC-158 / MIG-037: reset reconstructs only from saved RunInit 0.2.0,
  // including its initialWeeklyTrainingSidecarSnapshot payload. Never borrow
  // current runtime/context sidecar.
  const createInput = buildReconstructionMaterialsFromRunInitializationSnapshot(
    validatedSnap.value,
  );

  const sha256 = createNodeSha256Provider();
  let created: ReturnType<typeof createSprint1RunSessionFromRunInitializationMaterials>;
  try {
    deps.hooks?.throwOnResetBuild?.();
    created = createSprint1RunSessionFromRunInitializationMaterials(createInput, sha256);
  } catch {
    const errorReference = requestErrorReference(requestId);
    const body = serializeFailureWithFallback(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    ).body;
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }
  if (!created.ok) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeFailureWithFallback(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    ).body;
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  // Capacity already checked before RNG — reconstruction consumes RNG only after validation.
  let responseBody: string;
  try {
    if (!runInitializationSnapshotsEqual(validatedSnap.value, saved as RunInitializationSnapshot)) {
      throw new Error("RunInitializationSnapshot drifted");
    }
    const validationStore = createValidationStoreFromInitialization({
      simulationId: created.value.session.context.simulationId,
      results: [],
      hooks: deps.hooks?.validationStore,
    });
    const counts = countOperationAggregates({
      events: created.value.session.runtimeState.eventStream,
      validationResultCount: validationStore.items.length,
    });
    const summary = buildWorldSummaryView({
      runInitializationSnapshot: validatedSnap.value,
      runtime: created.value.session,
    });
    const mutation: SimulationMutationView = {
      acceptedUiRevision: expectedUiRevision,
      completedUiRevision: expectedUiRevision + 1,
      operation: "reset",
      outcome: "success",
      requestedWeeks: 0,
      committedWeeks: 0,
      failedWeek: null,
      eventCount: counts.eventCount,
      statIncreaseCount: counts.statIncreaseCount,
      techniqueLearnedCount: counts.techniqueLearnedCount,
      validationResultCount: counts.validationResultCount,
      mockBattleCount: 0,
      durationMs: monotonicDurationMs(startedAt),
      summary,
    };
    responseBody = serializeMutationSuccess(mutation, deps);
    session.committedLifecycle = "ready";
    session.uiRevision = expectedUiRevision + 1;
    session.worldEngineRuntime = created.value.session;
    session.runInitializationSnapshot = validatedSnap.value;
    session.committedValidationStore = validationStore;
    session.mockBattleStore = createEmptyMockBattleStore();
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 200,
      responseBody,
      committedWeeks: 0,
      completedUiRevision: expectedUiRevision + 1,
      replaceLastOperation: true,
    });
    assertUiSessionIntegrity(session);
  } catch {
    const errorReference = requestErrorReference(requestId);
    const body = serializeFailureWithFallback(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
        fallbackErrorReference: errorReference,
      },
      deps.serializerHooks,
    ).body;
    if (session.updateControl !== null) {
      completeAcceptedFailure(session, requestId, 500, body);
    }
    sendApiJson(reply, 500, body);
    return;
  }
  finishTransport(reply, deps, 200, responseBody);
}

export async function handlePostSimulationStep(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SimulationRouteDeps,
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
  if (Object.keys(rest).length !== 1 || !("weeks" in rest)) {
    sendInvalid(reply, session, "step requires exact weeks field");
    return;
  }
  if (
    typeof rest.weeks !== "number" ||
    !Number.isInteger(rest.weeks) ||
    rest.weeks < 1 ||
    rest.weeks > 480
  ) {
    sendInvalid(reply, session, "weeks must be an integer in 1..480", [
      { field: "/weeks", code: "range", message: "weeks must be an integer in 1..480" },
    ]);
    return;
  }
  const weeks = rest.weeks;
  const endpoint = "/api/s1_5/simulation/step";
  const fingerprint = buildFingerprint({
    endpoint,
    expectedUiRevision,
    operationInput: { weeks },
  });
  if (replayOrConflict(reply, session, requestId, fingerprint) === "done") {
    return;
  }
  if (expectedUiRevision !== session.uiRevision) {
    staleRevision(reply, session);
    return;
  }
  if (session.committedLifecycle !== "ready" || session.worldEngineRuntime === null) {
    notStarted(reply, session);
    return;
  }

  acceptRunningOperation({
    session,
    requestId,
    operationKind: "step",
    fingerprint,
    expectedUiRevision,
    requestedWeeks: weeks,
  });

  const startedAt = process.hrtime.bigint();
  const sha256 = createNodeSha256Provider();
  const runInit = session.runInitializationSnapshot;
  if (runInit === null || session.committedValidationStore === null) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  // Integrity of runtime
  const validated = validateSprint1RunSession(session.worldEngineRuntime, sha256);
  if (!validated.ok) {
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  if (
    !checkUiRevisionCapacity({ acceptedUiRevision: expectedUiRevision, maxRevisionDelta: weeks })
  ) {
    // FI-031: domain failure wins over capacity when first week cannot commit.
    let probe = runSprint1WeeklyStep(session.worldEngineRuntime, sha256);
    if (deps.hooks?.overrideWeeklyStep !== undefined) {
      probe = deps.hooks.overrideWeeklyStep(1, probe);
    }
    if (!probe.ok) {
      const validationCollection = [canonicalCloneValidationResult(probe)];
      if (weeks === 1) {
        const body = serializeEnvelope(
          buildFailureEnvelope({
            error: {
              code: "DOMAIN_VALIDATION_FAILED",
              message: "domain validation failed",
              commitState: "none",
              validation: validationCollection,
            },
            uiRevision: expectedUiRevision,
            isUpdating: acceptedPostFailureIsUpdating(session),
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
      const summary = buildWorldSummaryView({
        runInitializationSnapshot: runInit,
        runtime: session.worldEngineRuntime,
      });
      const mutation: SimulationMutationView = {
        acceptedUiRevision: expectedUiRevision,
        completedUiRevision: expectedUiRevision,
        operation: "step",
        outcome: "partial_failure",
        requestedWeeks: weeks,
        committedWeeks: 0,
        failedWeek: {
          requestWeekIndex: 1,
          worldDateBeforeStep: toWorldDateView(
            session.worldEngineRuntime.runtimeState.worldState.worldDate,
          ),
          validation: validationCollection,
        },
        eventCount: 0,
        statIncreaseCount: 0,
        techniqueLearnedCount: 0,
        validationResultCount: 0,
        mockBattleCount: 0,
        durationMs: monotonicDurationMs(startedAt),
        summary,
      };
      const responseBody = serializeMutationSuccess(mutation, deps);
      completeJournalRecord({
        session,
        requestId,
        httpStatus: 200,
        responseBody,
        committedWeeks: 0,
        completedUiRevision: expectedUiRevision,
        replaceLastOperation: true,
      });
      finishTransport(reply, deps, 200, responseBody);
      return;
    }
    const errorReference = requestErrorReference(requestId);
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "none",
          errorReference,
        },
        uiRevision: expectedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: false,
      }),
    );
    completeAcceptedFailure(session, requestId, 500, body);
    sendApiJson(reply, 500, body);
    return;
  }

  let current = session.worldEngineRuntime;
  const validationStore = session.committedValidationStore;
  let committedWeeks = 0;
  let totalEventCount = 0;
  let totalStatIncrease = 0;
  let totalTechniqueLearned = 0;
  const totalValidationResults = 0;

  for (let weekIndex = 1; weekIndex <= weeks; weekIndex += 1) {
    const worldDateBefore = toWorldDateView(current.runtimeState.worldState.worldDate);
    const eventOffset = current.runtimeState.eventStream.length;
    try {
      deps.hooks?.throwOnStepWeek?.(weekIndex);
    } catch {
      const errorReference = requestErrorReference(requestId);
      const commitState =
        committedWeeks === 0 ? "none" : committedWeeks < weeks ? "partial" : "complete";
      const completedUiRevision = expectedUiRevision + committedWeeks;
      const apiError: {
        code: "INTERNAL_ERROR";
        message: string;
        commitState: "none" | "partial" | "complete";
        errorReference: string;
        committedWeeks?: number;
        completedUiRevision?: number;
      } = {
        code: "INTERNAL_ERROR",
        message: "内部処理に失敗しました。",
        commitState,
        errorReference,
      };
      if (commitState !== "none") {
        apiError.committedWeeks = committedWeeks;
        apiError.completedUiRevision = completedUiRevision;
      }
      const body = serializeEnvelope(
        buildFailureEnvelope({
          error: apiError,
          uiRevision: commitState === "none" ? expectedUiRevision : completedUiRevision,
          isUpdating: acceptedPostFailureIsUpdating(session),
          refreshRequired: commitState !== "none",
        }),
      );
      completeJournalRecord({
        session,
        requestId,
        httpStatus: 500,
        responseBody: body,
        committedWeeks,
        completedUiRevision,
        replaceLastOperation: false,
      });
      sendApiJson(reply, 500, body);
      return;
    }

    let stepResult = runSprint1WeeklyStep(current, sha256);
    if (deps.hooks?.overrideWeeklyStep !== undefined) {
      stepResult = deps.hooks.overrideWeeklyStep(weekIndex, stepResult);
    }

    if (!stepResult.ok) {
      const validationCollection = [canonicalCloneValidationResult(stepResult)];
      if (weeks === 1) {
        const body = serializeEnvelope(
          buildFailureEnvelope({
            error: {
              code: "DOMAIN_VALIDATION_FAILED",
              message: "domain validation failed",
              commitState: "none",
              validation: validationCollection,
            },
            uiRevision: expectedUiRevision,
            isUpdating: acceptedPostFailureIsUpdating(session),
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
      // partial_failure including K=0
      try {
        const summary = buildWorldSummaryView({
          runInitializationSnapshot: runInit,
          runtime: current,
        });
        const mutation: SimulationMutationView = {
          acceptedUiRevision: expectedUiRevision,
          completedUiRevision: expectedUiRevision + committedWeeks,
          operation: "step",
          outcome: "partial_failure",
          requestedWeeks: weeks,
          committedWeeks,
          failedWeek: {
            requestWeekIndex: committedWeeks + 1,
            worldDateBeforeStep: worldDateBefore,
            validation: validationCollection,
          },
          eventCount: totalEventCount,
          statIncreaseCount: totalStatIncrease,
          techniqueLearnedCount: totalTechniqueLearned,
          validationResultCount: totalValidationResults,
          mockBattleCount: 0,
          durationMs: monotonicDurationMs(startedAt),
          summary,
        };
        const responseBody = serializeMutationSuccess(mutation, deps);
        completeJournalRecord({
          session,
          requestId,
          httpStatus: 200,
          responseBody,
          committedWeeks,
          completedUiRevision: expectedUiRevision + committedWeeks,
          replaceLastOperation: true,
        });
        finishTransport(reply, deps, 200, responseBody);
        return;
      } catch {
        const errorReference = requestErrorReference(requestId);
        const commitState = committedWeeks === 0 ? "none" : "partial";
        const completedUiRevision = expectedUiRevision + committedWeeks;
        const apiError: {
          code: "INTERNAL_ERROR";
          message: string;
          commitState: "none" | "partial";
          errorReference: string;
          committedWeeks?: number;
          completedUiRevision?: number;
        } = {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState,
          errorReference,
        };
        if (commitState === "partial") {
          apiError.committedWeeks = committedWeeks;
          apiError.completedUiRevision = completedUiRevision;
        }
        const body = serializeEnvelope(
          buildFailureEnvelope({
            error: apiError,
            uiRevision: commitState === "none" ? expectedUiRevision : completedUiRevision,
            isUpdating: acceptedPostFailureIsUpdating(session),
            refreshRequired: commitState !== "none",
          }),
        );
        completeJournalRecord({
          session,
          requestId,
          httpStatus: 500,
          responseBody: body,
          committedWeeks,
          completedUiRevision,
          replaceLastOperation: false,
        });
        sendApiJson(reply, 500, body);
        return;
      }
    }

    try {
      // Week-success validation append is empty (K=0); hook still fires at commit boundary (FI-032).
      deps.hooks?.validationStore?.beforeCommit?.();
    } catch {
      const errorReference = requestErrorReference(requestId);
      const commitState = committedWeeks === 0 ? "none" : "partial";
      const completedUiRevision = expectedUiRevision + committedWeeks;
      const apiError: {
        code: "INTERNAL_ERROR";
        message: string;
        commitState: "none" | "partial";
        errorReference: string;
        committedWeeks?: number;
        completedUiRevision?: number;
      } = {
        code: "INTERNAL_ERROR",
        message: "内部処理に失敗しました。",
        commitState,
        errorReference,
      };
      if (commitState === "partial") {
        apiError.committedWeeks = committedWeeks;
        apiError.completedUiRevision = completedUiRevision;
      }
      const body = serializeEnvelope(
        buildFailureEnvelope({
          error: apiError,
          uiRevision: commitState === "none" ? expectedUiRevision : completedUiRevision,
          isUpdating: acceptedPostFailureIsUpdating(session),
          refreshRequired: commitState !== "none",
        }),
      );
      completeJournalRecord({
        session,
        requestId,
        httpStatus: 500,
        responseBody: body,
        committedWeeks,
        completedUiRevision,
        replaceLastOperation: false,
      });
      sendApiJson(reply, 500, body);
      return;
    }

    const newEvents = stepResult.value.runtimeState.eventStream.slice(eventOffset);
    const counts = countOperationAggregates({
      events: newEvents,
      validationResultCount: 0,
    });
    totalEventCount += counts.eventCount;
    totalStatIncrease += counts.statIncreaseCount;
    totalTechniqueLearned += counts.techniqueLearnedCount;

    committedWeeks += 1;
    current = stepResult.value;
    session.worldEngineRuntime = current;
    session.uiRevision = expectedUiRevision + committedWeeks;
    session.committedValidationStore = validationStore;
    updateRunningWeekProgress({
      session,
      requestId,
      committedWeeks,
      completedUiRevision: expectedUiRevision + committedWeeks,
    });

    if (weekIndex < weeks) {
      await yieldEventLoop();
    }
  }

  try {
    const summary = buildWorldSummaryView({
      runInitializationSnapshot: runInit,
      runtime: current,
    });
    const mutation: SimulationMutationView = {
      acceptedUiRevision: expectedUiRevision,
      completedUiRevision: expectedUiRevision + committedWeeks,
      operation: "step",
      outcome: "success",
      requestedWeeks: weeks,
      committedWeeks,
      failedWeek: null,
      eventCount: totalEventCount,
      statIncreaseCount: totalStatIncrease,
      techniqueLearnedCount: totalTechniqueLearned,
      validationResultCount: totalValidationResults,
      mockBattleCount: 0,
      durationMs: monotonicDurationMs(startedAt),
      summary,
    };
    if (deps.hooks?.failSerializeBeforeCommit === true) {
      throw new Error("injected final serialize failure");
    }
    const responseBody = serializeMutationSuccess(mutation, deps);
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 200,
      responseBody,
      committedWeeks,
      completedUiRevision: expectedUiRevision + committedWeeks,
      replaceLastOperation: true,
    });
    finishTransport(reply, deps, 200, responseBody);
  } catch {
    // FI-028: all weeks committed, final response failure -> complete
    const errorReference = requestErrorReference(requestId);
    const completedUiRevision = expectedUiRevision + committedWeeks;
    const body = serializeEnvelope(
      buildFailureEnvelope({
        error: {
          code: "INTERNAL_ERROR",
          message: "内部処理に失敗しました。",
          commitState: "complete",
          errorReference,
          committedWeeks,
          completedUiRevision,
        },
        uiRevision: completedUiRevision,
        isUpdating: acceptedPostFailureIsUpdating(session),
        refreshRequired: true,
      }),
    );
    completeJournalRecord({
      session,
      requestId,
      httpStatus: 500,
      responseBody: body,
      committedWeeks,
      completedUiRevision,
      replaceLastOperation: false,
    });
    sendApiJson(reply, 500, body);
  }
}

export async function handleGetSimulation(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: SimulationRouteDeps,
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
    const errorReference = allocateServerErrorReference(deps.processKeys);
    sendInternal(
      reply,
      deps,
      { uiRevision: null, isUpdating: false },
      {
        commitState: "none",
        errorReference,
      },
    );
    return;
  }

  if (requestHasQuery(request.url)) {
    sendInvalid(reply, row, "query parameters are not allowed");
    return;
  }

  const read =
    row.updateControl !== null
      ? row.updateControl.operationStartReadSnapshot
      : {
          committedLifecycle: row.committedLifecycle,
          uiRevision: row.uiRevision,
          worldEngineRuntime: row.worldEngineRuntime,
          runInitializationSnapshot: row.runInitializationSnapshot,
          committedValidationStore: row.committedValidationStore,
          mockBattleStore: row.mockBattleStore,
          lastOperationRequestId: row.lastOperationRequestId,
        };

  if (read.committedLifecycle !== "ready") {
    const rev = envelopeMeta(row);
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
    return;
  }

  if (
    read.worldEngineRuntime === null ||
    read.runInitializationSnapshot === null ||
    read.lastOperationRequestId === null
  ) {
    const errorReference = allocateServerErrorReference(deps.processKeys);
    const rev = envelopeMeta(row);
    sendInternal(
      reply,
      deps,
      { uiRevision: rev.uiRevision, isUpdating: rev.isUpdating },
      {
        commitState: "none",
        errorReference,
      },
    );
    return;
  }

  try {
    const summary = buildWorldSummaryView({
      runInitializationSnapshot: read.runInitializationSnapshot as RunInitializationSnapshot,
      runtime: read.worldEngineRuntime,
    });
    const journalRecord = row.requestJournal.get(read.lastOperationRequestId);
    if (
      journalRecord === undefined ||
      journalRecord.status !== "completed" ||
      journalRecord.httpStatus !== 200
    ) {
      throw new Error("lastOperation journal missing or non-200");
    }
    const parsed = JSON.parse(journalRecord.responseBody) as {
      ok?: boolean;
      data?: unknown;
    };
    if (parsed.ok !== true || typeof parsed.data !== "object" || parsed.data === null) {
      throw new Error("lastOperation body invalid");
    }
    const data = parsed.data as Record<string, unknown>;
    const isSimulationMutation = "operation" in data && "summary" in data;
    const isMockBattleMutation =
      "acceptedUiRevision" in data &&
      "completedUiRevision" in data &&
      "replay" in data &&
      "durationMs" in data &&
      "result" in data &&
      !("operation" in data);
    if (!isSimulationMutation && !isMockBattleMutation) {
      throw new Error("lastOperation data is not a mutation view");
    }
    const rev = envelopeMeta(row);
    sendApiJson(
      reply,
      200,
      serializeEnvelope(
        buildSuccessEnvelope({
          data: { summary, lastOperation: parsed.data },
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      ),
    );
  } catch {
    const errorReference = allocateServerErrorReference(deps.processKeys);
    const rev = envelopeMeta(row);
    sendInternal(
      reply,
      deps,
      { uiRevision: rev.uiRevision, isUpdating: rev.isUpdating },
      {
        commitState: "none",
        errorReference,
      },
    );
  }
}
