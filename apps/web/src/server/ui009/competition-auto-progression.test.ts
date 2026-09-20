/**
 * Sprint2 autonomous tournament progression via ordinary simulation/week step.
 */
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
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

async function bootstrapSession(
  app: UiApp,
  seed = 42,
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

type CompetitionSnapshot = {
  lifecyclePhase: string;
  matchesCompleted: number;
  championDisplayName: string | null;
  finalResultSummary: unknown;
  rankingRows: unknown[];
  roundRobinProgress: {
    matchesCompleted: number;
    matchesTotal: number;
    history: unknown[];
  } | null;
};

function expectNotFalseFinishedCompetition(competition: CompetitionSnapshot): void {
  const progress = competition.roundRobinProgress;
  if (
    progress !== null &&
    progress.matchesTotal > 0 &&
    progress.matchesCompleted < progress.matchesTotal
  ) {
    expect(competition.lifecyclePhase).not.toBe("finished");
    expect(competition.championDisplayName).toBeNull();
  }
  if (progress !== null && progress.matchesTotal === 0 && progress.matchesCompleted === 0) {
    expect(competition.lifecyclePhase).not.toBe("finished");
    expect(competition.championDisplayName).toBeNull();
    expect(competition.rankingRows.length).toBe(0);
  }
}

function expectCoherentFinishedCompetition(competition: CompetitionSnapshot): void {
  expect(competition.lifecyclePhase).toBe("finished");
  expect(competition.championDisplayName).not.toBeNull();
  expect(competition.finalResultSummary).not.toBeNull();
  expect(competition.rankingRows.length).toBeGreaterThan(0);
  expect(competition.matchesCompleted).toBeGreaterThan(0);
  const progress = competition.roundRobinProgress;
  if (progress !== null && progress.matchesTotal > 0) {
    expect(progress.matchesCompleted).toBe(progress.matchesTotal);
    expect(progress.history).toHaveLength(progress.matchesTotal);
  }
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

async function competitionStepUntilFinished(
  app: UiApp,
  cookie: string,
  csrf: string,
): Promise<void> {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const getRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    expect(getRes.statusCode).toBe(200);
    const envelope = JSON.parse(getRes.body) as Envelope;
    const competition = envelope.data as CompetitionSnapshot;
    if (competition.lifecyclePhase === "finished") {
      expectCoherentFinishedCompetition(competition);
      return;
    }
    const stepRes = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/competition/step`,
      headers: {
        host: HOST,
        cookie,
        [CSRF_HEADER_NAME]: csrf,
        "content-type": "application/json",
        origin: ORIGIN,
      },
      payload: { requestId: randomUUID(), expectedUiRevision: envelope.uiRevision },
    });
    expect(stepRes.statusCode).toBe(200);
  }
  throw new Error("competition did not reach finished within step budget");
}

describe("UI009 simulation-integrated auto tournament progression", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("manual browser progression then next simulation week keeps terminal competition and records step", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(911),
    });
    const { cookie, csrf } = await bootstrapSession(app);
    await competitionStepUntilFinished(app, cookie, csrf);

    const competitionAtWeek = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const competitionBody = JSON.parse(competitionAtWeek.body) as Envelope;
    expect(competitionBody.ok).toBe(true);
    const competition = competitionBody.data as CompetitionSnapshot;
    expectCoherentFinishedCompetition(competition);
    const matchesCompleted = competition.roundRobinProgress!.matchesCompleted;

    const simulationGetBeforeStep = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/simulation`,
      headers: { host: HOST, cookie },
    });
    const simulationRevision = (JSON.parse(simulationGetBeforeStep.body) as Envelope).uiRevision;
    const nextWeek = await simulationStep(app, cookie, csrf, simulationRevision, 1);
    expect(nextWeek.ok).toBe(true);

    const competitionAfter = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const afterBody = JSON.parse(competitionAfter.body) as Envelope;
    const after = afterBody.data as typeof competition;
    expect(after.lifecyclePhase).toBe("finished");
    expect(after.roundRobinProgress?.matchesCompleted).toBe(matchesCompleted);

    const simulationGet = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/simulation`,
      headers: { host: HOST, cookie },
    });
    expect(simulationGet.statusCode).toBe(200);
    const simulationBody = JSON.parse(simulationGet.body) as Envelope;
    expect(
      (simulationBody.data as { lastOperation: { operation: string } }).lastOperation.operation,
    ).toBe("step");
  }, 120_000);

  it("GET competition immediately after simulation start never exposes false-finished round-robin", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(913),
    });
    const { cookie, sessionId } = await bootstrapSession(app);
    const row = app.uiSessionStore.get(sessionId)!;
    const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(worldDate.year)!;
    const weeksUntilTournament = slot.absoluteWeek - worldDate.absoluteWeek;

    const competitionAtStart = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    expect(competitionAtStart.statusCode).toBe(200);
    const competition = (JSON.parse(competitionAtStart.body) as Envelope)
      .data as CompetitionSnapshot;

    expectNotFalseFinishedCompetition(competition);
    if (weeksUntilTournament === 0) {
      expect(competition.lifecyclePhase).not.toBe("finished");
      expect(competition.championDisplayName).toBeNull();
    } else {
      expect(competition.lifecyclePhase).toBe("idle");
      expect(competition.championDisplayName).toBeNull();
    }
  }, 120_000);

  it("simulation start on tournament week leaves manual competition-step path reachable", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(914),
    });
    const { cookie, csrf, sessionId } = await bootstrapSession(app);
    const row = app.uiSessionStore.get(sessionId)!;
    const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(worldDate.year)!;
    const weeksUntilTournament = slot.absoluteWeek - worldDate.absoluteWeek;
    if (weeksUntilTournament !== 0) {
      return;
    }

    const atStart = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const atStartData = (JSON.parse(atStart.body) as Envelope).data as CompetitionSnapshot;
    expect(atStartData.lifecyclePhase).not.toBe("finished");

    await competitionStepUntilFinished(app, cookie, csrf);
  }, 120_000);

  it("manual competition step after auto finish is idempotent", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(912),
    });
    const { cookie, csrf, sessionId } = await bootstrapSession(app);
    const row = app.uiSessionStore.get(sessionId)!;
    const startYear = row.worldEngineRuntime!.runtimeState.worldState.worldDate.year;
    const slot = findUi009PlayableScheduleSlot(startYear)!;
    const weeksUntil =
      slot.absoluteWeek - row.worldEngineRuntime!.runtimeState.worldState.worldDate.absoluteWeek;
    if (weeksUntil > 0) {
      await simulationStep(app, cookie, csrf, 1, weeksUntil);
    } else {
      await competitionStepUntilFinished(app, cookie, csrf);
    }

    const before = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const beforeData = JSON.parse(before.body).data as {
      lifecyclePhase: string;
      roundRobinProgress: { matchesCompleted: number } | null;
    };
    expect(beforeData.lifecyclePhase).toBe("finished");

    const compRevision = (JSON.parse(before.body) as Envelope).uiRevision;
    const manual = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/competition/step`,
      headers: {
        host: HOST,
        cookie,
        [CSRF_HEADER_NAME]: csrf,
        "content-type": "application/json",
        origin: ORIGIN,
      },
      payload: { requestId: randomUUID(), expectedUiRevision: compRevision },
    });
    expect(manual.statusCode).toBe(200);
    const manualData = JSON.parse(manual.body).data as {
      competition: {
        lifecyclePhase: string;
        roundRobinProgress: { matchesCompleted: number } | null;
      };
    };
    expect(manualData.competition.lifecyclePhase).toBe("finished");
    expect(manualData.competition.roundRobinProgress?.matchesCompleted).toBe(
      beforeData.roundRobinProgress?.matchesCompleted,
    );
  }, 120_000);
});
