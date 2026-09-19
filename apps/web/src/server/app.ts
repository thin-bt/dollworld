import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import {
  API_PREFIX,
  RAW_BODY_LIMIT_BYTES,
  REQUEST_TARGET_LIMIT_BYTES,
  defaultPublicOrigin,
} from "../shared/ui001-contracts.js";
import { applyApiNoStore, isS15ApiUrl, sendApiJson } from "./api-response.js";
import { nodeCsprngBytes, type CsprngBytes } from "./csprng.js";
import {
  EnvelopeConstructionError,
  buildFailureEnvelope,
  buildSuccessEnvelope,
  invalidRequestEnvelope,
  requestForbiddenEnvelope,
  serializeEnvelope,
} from "./envelope.js";
import { serializeFailureWithFallback, type EnvelopeSerializerHooks } from "./failure-serialize.js";
import { isAllowedHost, isAllowedOrigin, isStateChangingMethod } from "./host-origin.js";
import { parseJsonBody, type JsonBodyResult } from "./json-body.js";
import { loadDefaultFrozenPresetRegistry, type FrozenPresetRegistry } from "./presets.js";
import {
  allocateServerErrorReference,
  createProcessSecurityContext,
  type ProcessSecurityContext,
} from "./process-keys.js";
import { handleGetPresets } from "./routes-presets.js";
import { handleGetSession, type SessionRouteDeps } from "./routes-session.js";
import {
  handleGetSimulation,
  handlePostSimulationReset,
  handlePostSimulationStart,
  handlePostSimulationStep,
  type SimulationRouteHooks,
} from "./routes-simulation.js";
import { handleGetMockBattleCandidates } from "./ui004/routes-mock-candidates.js";
import { handleGetPeople } from "./ui004/routes-people.js";
import type { ListGetHooks } from "./ui004/list-get-common.js";
import { handleGetPersonDetail, type PersonDetailRouteDeps } from "./ui005/routes-person-detail.js";
import {
  handleGetMockBattleLatest,
  handlePostMockBattle,
  handlePostMockBattleReplay,
  type MockBattleRouteHooks,
} from "./ui006/routes-mock-battles.js";
import { handleGetBattleLog, type BattleLogRouteDeps } from "./ui007/routes-battle-log.js";
import { handleGetEvents, type EventsRouteDeps } from "./ui008/routes-events.js";
import { handleGetValidationResults, type ValidationRouteDeps } from "./ui008/routes-validation.js";
import {
  handleGetCompetition,
  handleGetCompetitionMatch,
  handlePostCompetitionStep,
  type CompetitionRouteDeps,
} from "./ui009/routes-competition.js";
import { CSRF_HEADER_NAME, csrfTokensEqual, parseSessionCookieHeader } from "./session-cookie.js";
import { createMemorySessionStore, type SessionStore } from "./session-store.js";
import type { UiSession } from "./ui-session.js";
import { deriveEnvelopeRevision } from "./ui-session.js";

export type CreateUiAppOptions = {
  publicOrigin?: string;
  staticRoot?: string;
  enableTestProbe?: boolean;
  /** When false, skips loading Sprint1 fixtures (tests must supply presetRegistry). */
  loadDefaultPresets?: boolean;
  repoRoot?: string;
  processKeys?: ProcessSecurityContext;
  sessionStore?: SessionStore;
  csprng?: CsprngBytes;
  presetRegistry?: FrozenPresetRegistry;
  serializerHooks?: EnvelopeSerializerHooks;
  sessionHooks?: SessionRouteDeps["hooks"];
  simulationHooks?: SimulationRouteHooks;
  /** UI-004 people / mock-candidates GET hooks (FI-038 etc.). */
  listGetHooks?: ListGetHooks;
  /** UI-005 PersonDetail GET hooks (FI-039..046 etc.). */
  personDetailHooks?: PersonDetailRouteDeps["hooks"];
  /** UI-006 mock battle hooks (FI-047..056 etc.). */
  mockBattleHooks?: MockBattleRouteHooks;
  /** UI-007 battle-log GET hooks (FI-057 etc.). */
  battleLogHooks?: BattleLogRouteDeps["hooks"];
  /** UI-008 events GET hooks (FI-062 etc.). */
  eventsHooks?: EventsRouteDeps["hooks"];
  /** UI-008 validation-results GET hooks (FI-064/065 etc.). */
  validationHooks?: ValidationRouteDeps["hooks"];
  /** When true (default for enableTestProbe), test probe skips CSRF so UI-001 Host/Origin tests stay focused. */
  exemptTestProbeFromCsrf?: boolean;
};

export type UiApp = FastifyInstance & {
  ui001RegisteredApiPaths: string[];
  uiProcessKeys: ProcessSecurityContext;
  uiSessionStore: SessionStore;
  uiPresetRegistry: FrozenPresetRegistry;
};

declare module "fastify" {
  interface FastifyRequest {
    ui001Json?: JsonBodyResult;
    uiSession?: UiSession;
  }
}

function sendJson(reply: FastifyReply, status: number, body: string): void {
  sendApiJson(reply, status, body);
}

function requestTargetBytes(request: FastifyRequest): number {
  const rawUrl = request.raw.url ?? request.url;
  return Buffer.byteLength(rawUrl, "utf8");
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function safeStaticPath(root: string, requestPath: string): string | undefined {
  const relative = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const normalized = normalize(relative);
  if (normalized.startsWith("..") || normalized.split(sep).includes("..")) {
    return undefined;
  }
  const resolved = resolve(root, normalized);
  const rootResolved = resolve(root);
  if (resolved !== rootResolved && !resolved.startsWith(rootResolved + sep)) {
    return undefined;
  }
  return resolved;
}

function defaultRepoRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "..", "..", "..");
}

export async function createUiApp(options: CreateUiAppOptions = {}): Promise<UiApp> {
  const publicOrigin = options.publicOrigin ?? defaultPublicOrigin();
  const hostOriginConfig = { publicOrigin };
  const csprng = options.csprng ?? nodeCsprngBytes;
  const processKeys = options.processKeys ?? createProcessSecurityContext(csprng);
  const sessionStore = options.sessionStore ?? createMemorySessionStore();
  const repoRoot = options.repoRoot ?? defaultRepoRoot();
  const loadDefault = options.loadDefaultPresets !== false;
  const presetRegistry =
    options.presetRegistry ?? (loadDefault ? loadDefaultFrozenPresetRegistry(repoRoot) : undefined);
  if (presetRegistry === undefined) {
    throw new Error("presetRegistry is required when loadDefaultPresets is false");
  }

  const registeredApiPaths: string[] = [];
  const app = Fastify({
    logger: false,
    bodyLimit: RAW_BODY_LIMIT_BYTES,
  }) as unknown as UiApp;
  app.ui001RegisteredApiPaths = registeredApiPaths;
  app.uiProcessKeys = processKeys;
  app.uiSessionStore = sessionStore;
  app.uiPresetRegistry = presetRegistry;

  const jsonParser = (
    request: FastifyRequest,
    body: Buffer,
    done: (err: null, result: unknown) => void,
  ) => {
    request.ui001Json = parseJsonBody(body, request.headers["content-type"]);
    done(null, null);
  };
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer", bodyLimit: RAW_BODY_LIMIT_BYTES },
    jsonParser,
  );
  app.addContentTypeParser(
    "application/json; charset=utf-8",
    { parseAs: "buffer", bodyLimit: RAW_BODY_LIMIT_BYTES },
    jsonParser,
  );

  app.addHook("onRequest", async (request, reply) => {
    if (isS15ApiUrl(request.url)) {
      applyApiNoStore(reply);
    }
    if (requestTargetBytes(request) > REQUEST_TARGET_LIMIT_BYTES) {
      const body = serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision: null,
          isUpdating: false,
          message: "request target exceeds the allowed size",
        }),
      );
      sendJson(reply, 400, body);
      return;
    }
    if (!isAllowedHost(request.headers.host, hostOriginConfig)) {
      const body = serializeEnvelope(
        requestForbiddenEnvelope({
          uiRevision: null,
          isUpdating: false,
        }),
      );
      sendJson(reply, 403, body);
    }
  });

  app.addHook("preHandler", async (request, reply) => {
    if (reply.sent) {
      return;
    }
    if (!isStateChangingMethod(request.method)) {
      return;
    }

    const probePath = `${API_PREFIX}/ui001-test-probe`;
    const exemptCsrf =
      options.enableTestProbe === true &&
      options.exemptTestProbeFromCsrf !== false &&
      request.url.split("?")[0] === probePath;

    // SCN-004 / 0.1.14: for state-changing /api/s1_5, resolve session BEFORE Origin/CSRF
    // so Origin failure can return integer uiRevision/isUpdating from deriveEnvelopeRevision.
    // Host failure (onRequest) stays uiRevision=null.
    if (!exemptCsrf && isS15ApiUrl(request.url)) {
      const cookieValue = parseSessionCookieHeader(request.headers.cookie);
      if (cookieValue === undefined) {
        // Continue to Origin with null revision metadata when session is absent.
      } else {
        const row = sessionStore.getStrict(cookieValue);
        if (row === "missing") {
          // leave uiSession unset
        } else if (row === "corrupt") {
          const errorReference = allocateServerErrorReference(processKeys);
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
            options.serializerHooks,
          );
          sendJson(reply, 500, serialized.body);
          return;
        } else {
          request.uiSession = row;
        }
      }
    }

    if (!isAllowedOrigin(request.headers.origin, hostOriginConfig)) {
      const rev =
        request.uiSession !== undefined
          ? deriveEnvelopeRevision(request.uiSession)
          : { uiRevision: null as number | null, isUpdating: false };
      const body = serializeEnvelope(
        requestForbiddenEnvelope({
          uiRevision: rev.uiRevision,
          isUpdating: rev.isUpdating,
        }),
      );
      sendJson(reply, 403, body);
      return;
    }

    if (!exemptCsrf && isS15ApiUrl(request.url)) {
      if (request.uiSession === undefined) {
        sendJson(
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
      const row = request.uiSession;
      const csrfHeader = request.headers[CSRF_HEADER_NAME];
      const csrfValue = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;
      if (typeof csrfValue !== "string" || !csrfTokensEqual(row.csrfToken, csrfValue)) {
        const rev = deriveEnvelopeRevision(row);
        sendJson(
          reply,
          403,
          serializeEnvelope(
            buildFailureEnvelope({
              error: {
                code: "REQUEST_FORBIDDEN",
                message: "CSRF token is invalid",
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
    }

    const parsed = request.ui001Json;
    if (parsed === undefined) {
      const body = serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision: null,
          isUpdating: false,
          message: "JSON content type is required",
        }),
      );
      sendJson(reply, 400, body);
      return;
    }
    if (!parsed.ok) {
      const uiRevision =
        request.uiSession !== undefined
          ? deriveEnvelopeRevision(request.uiSession).uiRevision
          : null;
      const isUpdating =
        request.uiSession !== undefined
          ? deriveEnvelopeRevision(request.uiSession).isUpdating
          : false;
      const body = serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision,
          isUpdating,
          message: "JSON body is invalid",
        }),
      );
      sendJson(reply, 400, body);
    }
  });

  const sessionPath = `${API_PREFIX}/session`;
  const presetsPath = `${API_PREFIX}/presets`;
  const simulationPath = `${API_PREFIX}/simulation`;
  const simulationStartPath = `${API_PREFIX}/simulation/start`;
  const simulationStepPath = `${API_PREFIX}/simulation/step`;
  const simulationResetPath = `${API_PREFIX}/simulation/reset`;
  const peoplePath = `${API_PREFIX}/people`;
  const personDetailPath = `${API_PREFIX}/people/:personId`;
  const mockCandidatesPath = `${API_PREFIX}/mock-battles/candidates`;
  const mockBattlesPath = `${API_PREFIX}/mock-battles`;
  const mockBattlesReplayPath = `${API_PREFIX}/mock-battles/replay`;
  const mockBattlesLatestPath = `${API_PREFIX}/mock-battles/latest`;
  const mockBattlesLatestLogPath = `${API_PREFIX}/mock-battles/latest/log`;
  const eventsPath = `${API_PREFIX}/events`;
  const validationResultsPath = `${API_PREFIX}/validation-results`;
  const competitionPath = `${API_PREFIX}/competition`;
  const competitionStepPath = `${API_PREFIX}/competition/step`;
  const competitionMatchPath = `${API_PREFIX}/competition/matches/:matchId`;
  registeredApiPaths.push(
    sessionPath,
    presetsPath,
    simulationPath,
    simulationStartPath,
    simulationStepPath,
    simulationResetPath,
    peoplePath,
    personDetailPath,
    mockCandidatesPath,
    mockBattlesPath,
    mockBattlesReplayPath,
    mockBattlesLatestPath,
    mockBattlesLatestLogPath,
    eventsPath,
    validationResultsPath,
    competitionPath,
    competitionStepPath,
    competitionMatchPath,
  );

  app.get(sessionPath, async (request, reply) => {
    const deps: SessionRouteDeps = {
      store: sessionStore,
      processKeys,
      csprng,
      publicOrigin,
    };
    if (options.serializerHooks !== undefined) {
      deps.serializerHooks = options.serializerHooks;
    }
    if (options.sessionHooks !== undefined) {
      deps.hooks = options.sessionHooks;
    }
    await handleGetSession(request, reply, deps);
  });

  app.get(presetsPath, async (request, reply) => {
    const deps = {
      store: sessionStore,
      registry: presetRegistry,
      processKeys,
      ...(options.serializerHooks !== undefined
        ? { serializerHooks: options.serializerHooks }
        : {}),
    };
    await handleGetPresets(request, reply, deps);
  });

  const simulationDeps = () => ({
    store: sessionStore,
    registry: presetRegistry,
    processKeys,
    ...(options.serializerHooks !== undefined ? { serializerHooks: options.serializerHooks } : {}),
    ...(options.simulationHooks !== undefined ? { hooks: options.simulationHooks } : {}),
  });

  app.get(simulationPath, async (request, reply) => {
    await handleGetSimulation(request, reply, simulationDeps());
  });
  app.post(simulationStartPath, async (request, reply) => {
    await handlePostSimulationStart(request, reply, simulationDeps());
  });
  app.post(simulationStepPath, async (request, reply) => {
    await handlePostSimulationStep(request, reply, simulationDeps());
  });
  app.post(simulationResetPath, async (request, reply) => {
    await handlePostSimulationReset(request, reply, simulationDeps());
  });

  const listDeps = () => ({
    store: sessionStore,
    processKeys,
    ...(options.listGetHooks !== undefined ? { hooks: options.listGetHooks } : {}),
  });

  app.get(peoplePath, async (request, reply) => {
    await handleGetPeople(request, reply, listDeps());
  });
  app.get(personDetailPath, async (request, reply) => {
    await handleGetPersonDetail(request as Parameters<typeof handleGetPersonDetail>[0], reply, {
      store: sessionStore,
      processKeys,
      ...(options.personDetailHooks !== undefined ? { hooks: options.personDetailHooks } : {}),
    });
  });
  app.get(mockCandidatesPath, async (request, reply) => {
    await handleGetMockBattleCandidates(request, reply, listDeps());
  });

  const mockBattleDeps = () => ({
    store: sessionStore,
    processKeys,
    ...(options.serializerHooks !== undefined ? { serializerHooks: options.serializerHooks } : {}),
    ...(options.mockBattleHooks !== undefined ? { hooks: options.mockBattleHooks } : {}),
  });

  app.post(mockBattlesPath, async (request, reply) => {
    await handlePostMockBattle(request, reply, mockBattleDeps());
  });
  app.post(mockBattlesReplayPath, async (request, reply) => {
    await handlePostMockBattleReplay(request, reply, mockBattleDeps());
  });
  app.get(mockBattlesLatestPath, async (request, reply) => {
    await handleGetMockBattleLatest(request, reply, mockBattleDeps());
  });

  const battleLogDeps = () => ({
    store: sessionStore,
    processKeys,
    ...(options.battleLogHooks !== undefined ? { hooks: options.battleLogHooks } : {}),
  });

  app.get(mockBattlesLatestLogPath, async (request, reply) => {
    await handleGetBattleLog(request, reply, battleLogDeps());
  });

  const eventsDeps = () => ({
    store: sessionStore,
    processKeys,
    ...(options.eventsHooks !== undefined ? { hooks: options.eventsHooks } : {}),
  });
  const validationDeps = () => ({
    store: sessionStore,
    processKeys,
    ...(options.validationHooks !== undefined ? { hooks: options.validationHooks } : {}),
  });

  app.get(eventsPath, async (request, reply) => {
    await handleGetEvents(request, reply, eventsDeps());
  });
  app.get(validationResultsPath, async (request, reply) => {
    await handleGetValidationResults(request, reply, validationDeps());
  });

  const competitionDeps = (): CompetitionRouteDeps => ({
    store: sessionStore,
    processKeys,
  });
  app.get(competitionPath, async (request, reply) => {
    await handleGetCompetition(request, reply, competitionDeps());
  });
  app.get(competitionMatchPath, async (request, reply) => {
    await handleGetCompetitionMatch(
      request as FastifyRequest<{ Params: { matchId: string } }>,
      reply,
      competitionDeps(),
    );
  });
  app.post(competitionStepPath, async (request, reply) => {
    await handlePostCompetitionStep(request, reply, competitionDeps());
  });

  if (options.enableTestProbe === true) {
    const probePath = `${API_PREFIX}/ui001-test-probe`;
    registeredApiPaths.push(probePath);
    app.post(probePath, async (request, reply) => {
      try {
        const envelope = buildSuccessEnvelope({
          data: { probe: true },
          uiRevision: request.uiSession?.uiRevision ?? 0,
          isUpdating:
            request.uiSession !== undefined ? request.uiSession.updateControl !== null : false,
        });
        sendJson(reply, 200, serializeEnvelope(envelope));
      } catch (error) {
        if (error instanceof EnvelopeConstructionError) {
          const errorReference = allocateServerErrorReference(processKeys);
          const fallback = serializeFailureWithFallback({
            error: {
              code: "INTERNAL_ERROR",
              message: "probe response construction failed",
              commitState: "none",
              errorReference,
            },
            uiRevision: null,
            isUpdating: false,
            refreshRequired: false,
            fallbackErrorReference: errorReference,
          });
          sendJson(reply, 500, fallback.body);
          return;
        }
        throw error;
      }
    });
  }

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      if (isS15ApiUrl(request.url)) {
        applyApiNoStore(reply);
      }
      const body = serializeEnvelope(
        invalidRequestEnvelope({
          uiRevision: null,
          isUpdating: false,
          message: "no API route is registered",
        }),
      );
      sendJson(reply, 404, body);
      return;
    }
    if (options.staticRoot !== undefined) {
      const filePath = safeStaticPath(options.staticRoot, "/index.html");
      if (filePath !== undefined && existsSync(filePath) && statSync(filePath).isFile()) {
        void reply.type("text/html; charset=utf-8").send(readFileSync(filePath));
        return;
      }
    }
    void reply.status(404).send("Not Found");
  });

  if (options.staticRoot !== undefined) {
    app.get("/*", async (request, reply) => {
      if (request.url.startsWith("/api/")) {
        if (isS15ApiUrl(request.url)) {
          applyApiNoStore(reply);
        }
        const body = serializeEnvelope(
          invalidRequestEnvelope({
            uiRevision: null,
            isUpdating: false,
            message: "no API route is registered",
          }),
        );
        sendJson(reply, 404, body);
        return;
      }
      const filePath = safeStaticPath(options.staticRoot ?? "", request.url.split("?")[0] ?? "/");
      if (filePath === undefined || !existsSync(filePath) || !statSync(filePath).isFile()) {
        const indexPath = safeStaticPath(options.staticRoot ?? "", "/index.html");
        if (indexPath !== undefined && existsSync(indexPath)) {
          return reply.type("text/html; charset=utf-8").send(readFileSync(indexPath));
        }
        return reply.status(404).send("Not Found");
      }
      const type = MIME[extname(filePath)] ?? "application/octet-stream";
      return reply.type(type).send(readFileSync(filePath));
    });
  }

  return app;
}

export async function listenUiApp(
  app: UiApp,
  bind: { host: string; port: number },
): Promise<string> {
  return app.listen({ host: bind.host, port: bind.port });
}

export function resolveRepoRootFromWebPackage(): string {
  return defaultRepoRoot();
}
