/**
 * Production-boundary proof: public simulation/start initializes accepted Sprint3
 * runtime without post-start test injection; weekly step executes OTL path once.
 */
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isOriginalTechniqueLifecycleEnabled,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "../app.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "../presets.js";
import { createTestProcessSecurityContext } from "../process-keys.js";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "../session-cookie.js";
import { findUi009PlayableScheduleSlot } from "./competition-schedule-slot.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

type Envelope = {
  ok: boolean;
  data?: Record<string, unknown>;
  uiRevision: number;
};

function parseSetCookieSessionId(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = /^dollworld_s15_session=([A-Za-z0-9_-]{43});/.exec(header as string);
  if (match === null) {
    throw new Error("session cookie missing");
  }
  return match[1] as string;
}

async function bootstrapOrdinarySession(
  app: UiApp,
  seed = 11,
): Promise<{
  cookie: string;
  csrf: string;
  uiRevision: number;
  sessionId: string;
}> {
  const sessionRes = await app.inject({
    method: "GET",
    url: `${API_PREFIX}/session`,
    headers: { host: HOST },
  });
  const sessionId = parseSetCookieSessionId(sessionRes.headers["set-cookie"]);
  const sessionBody = JSON.parse(sessionRes.body) as Envelope;
  const csrf = (sessionBody.data as { csrfToken: string }).csrfToken;
  const start = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/simulation/start`,
    headers: {
      host: HOST,
      cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
      [CSRF_HEADER_NAME]: csrf,
      "content-type": "application/json",
      origin: ORIGIN,
    },
    payload: {
      requestId: randomUUID(),
      expectedUiRevision: 0,
      presetId: DEFAULT_SPRINT1_PRESET_ID,
      seed,
    },
  });
  expect(start.statusCode).toBe(200);
  const started = JSON.parse(start.body) as Envelope;
  return {
    cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
    csrf,
    uiRevision: started.uiRevision,
    sessionId,
  };
}

function runtimeFromStore(app: UiApp, sessionId: string): Sprint1RunSession {
  const row = app.uiSessionStore.get(sessionId);
  const runtime = row?.worldEngineRuntime;
  if (runtime == null) {
    throw new Error("missing worldEngineRuntime");
  }
  return runtime;
}

function weeksUntilPlayableTournamentWeek(session: Sprint1RunSession): number {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const slot = findUi009PlayableScheduleSlot(worldYear);
  if (slot === null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return slot.absoluteWeek - session.runtimeState.worldState.worldDate.absoluteWeek;
}

function isOrdinaryWeeklyWeek(session: Sprint1RunSession): boolean {
  const weeksUntil = weeksUntilPlayableTournamentWeek(session);
  return weeksUntil >= 2 || weeksUntil < 0;
}

async function simulationStep(
  app: UiApp,
  cookie: string,
  csrf: string,
  expectedUiRevision: number,
  weeks: number,
): Promise<Envelope> {
  const step = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/simulation/step`,
    headers: {
      host: HOST,
      cookie,
      [CSRF_HEADER_NAME]: csrf,
      "content-type": "application/json",
      origin: ORIGIN,
    },
    payload: { requestId: randomUUID(), expectedUiRevision, weeks },
  });
  expect(step.statusCode).toBe(200);
  const envelope = JSON.parse(step.body) as Envelope;
  expect(envelope.ok).toBe(true);
  return envelope;
}

describe("Sprint3 ordinary session activation (production start boundary)", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("simulation/start binds Sprint3 config and runtime; weekly step runs OTL once without post-start injection", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(920),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapOrdinarySession(app, 11);

    const atStart = runtimeFromStore(app, sessionId);
    expect(atStart.context.sprint3Config).toBeDefined();
    expect(isOriginalTechniqueLifecycleEnabled(atStart.context.sprint3Config!)).toBe(true);
    expect(atStart.runtimeState.mentorshipEntrypointRuntime).toBeDefined();
    expect(atStart.runtimeState.originalTechniqueLifecycleRuntime).toBeDefined();

    let revision = uiRevision;
    let runtime = atStart;
    for (let guard = 0; guard < 64 && !isOrdinaryWeeklyWeek(runtime); guard += 1) {
      const stepped = await simulationStep(app, cookie, csrf, revision, 1);
      revision = stepped.uiRevision;
      runtime = runtimeFromStore(app, sessionId);
    }
    expect(isOrdinaryWeeklyWeek(runtime)).toBe(true);

    const otl = runtime.runtimeState.originalTechniqueLifecycleRuntime!;
    const beforeResearch = otl.personEntries.reduce((sum, entry) => sum + entry.researchValueTenths, 0);
    const beforeRng = JSON.stringify(otl.rngState);
    const beforeWeek = runtime.runtimeState.worldState.worldDate.absoluteWeek;
    const beforeEvents = runtime.runtimeState.eventStream.length;

    await simulationStep(app, cookie, csrf, revision, 1);
    const after = runtimeFromStore(app, sessionId);
    const afterOtl = after.runtimeState.originalTechniqueLifecycleRuntime!;

    expect(after.runtimeState.worldState.worldDate.absoluteWeek).toBe(beforeWeek + 1);
    expect(after.runtimeState.eventStream.length).toBeGreaterThan(beforeEvents);
    const otlTouched =
      JSON.stringify(afterOtl.rngState) !== beforeRng ||
      afterOtl.personEntries.reduce((sum, entry) => sum + entry.researchValueTenths, 0) !==
        beforeResearch ||
      afterOtl.foundingHistories.length !== otl.foundingHistories.length;
    expect(otlTouched).toBe(true);
  }, 120_000);
});
