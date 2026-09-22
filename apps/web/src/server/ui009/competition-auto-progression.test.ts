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
import {
  findUi009PlayableScheduleSlot,
  listUi009PlayableScheduleSlots,
} from "./competition-schedule-slot.js";

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
    findUi009PlayableScheduleSlot(worldDate.year)!;

    const competitionAtStart = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    expect(competitionAtStart.statusCode).toBe(200);
    const competition = (JSON.parse(competitionAtStart.body) as Envelope)
      .data as CompetitionSnapshot;

    expectNotFalseFinishedCompetition(competition);
    expect(competition.lifecyclePhase).toBe("idle");
    expect(competition.championDisplayName).toBeNull();
  }, 120_000);

  it("tournament week finishes after the next ordinary simulation week step", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(914),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app);
    const row = app.uiSessionStore.get(sessionId)!;
    const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(worldDate.year)!;
    const weeksUntilTournament = slot.absoluteWeek - worldDate.absoluteWeek;
    if (weeksUntilTournament > 0) {
      await simulationStep(app, cookie, csrf, uiRevision, weeksUntilTournament);
    }
    const atStart = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const atStartData = (JSON.parse(atStart.body) as Envelope).data as CompetitionSnapshot;
    expect(atStartData.lifecyclePhase).toBe("idle");

    const simGet = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/simulation`,
      headers: { host: HOST, cookie },
    });
    const revision = (JSON.parse(simGet.body) as Envelope).uiRevision;
    await simulationStep(app, cookie, csrf, revision, 1);

    const afterStep = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const afterData = (JSON.parse(afterStep.body) as Envelope).data as CompetitionSnapshot;
    expectCoherentFinishedCompetition(afterData);
  }, 120_000);

  it("ordinary simulation week steps alone reach finished competition with ranking rows", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(915),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 7);
    const row = app.uiSessionStore.get(sessionId)!;
    const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(worldDate.year)!;
    const weeksUntil = slot.absoluteWeek - worldDate.absoluteWeek;
    const weeksToStep = weeksUntil > 0 ? weeksUntil : 1;
    await simulationStep(app, cookie, csrf, uiRevision, weeksToStep);
    const competitionRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    expect(competitionRes.statusCode).toBe(200);
    const competition = (JSON.parse(competitionRes.body) as Envelope).data as CompetitionSnapshot;
    expectCoherentFinishedCompetition(competition);
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

  it("ordinary week steps process successive F-rank tournaments without leaving past weeks scheduled", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(916),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 11);
    const row = app.uiSessionStore.get(sessionId)!;
    const slots = listUi009PlayableScheduleSlots(
      row.worldEngineRuntime!.runtimeState.worldState.worldDate.year,
    );
    expect(slots.length).toBeGreaterThanOrEqual(2);

    let revision = uiRevision;
    const rankingSnapshots: string[][] = [];

    for (const slot of slots) {
      const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
      const weeksUntil = slot.absoluteWeek - worldDate.absoluteWeek;
      expect(weeksUntil).toBeGreaterThanOrEqual(0);
      const weeksToStep = weeksUntil > 0 ? weeksUntil : 1;
      const stepped = await simulationStep(app, cookie, csrf, revision, weeksToStep);
      revision = stepped.uiRevision;

      const competitionRes = await app.inject({
        method: "GET",
        url: `${API_PREFIX}/competition`,
        headers: { host: HOST, cookie },
      });
      const competition = (JSON.parse(competitionRes.body) as Envelope)
        .data as CompetitionSnapshot & {
        scheduleOverview?: {
          entries: {
            absoluteWeek: number;
            lifecycleStateLabel: string;
            rankOrCategoryLabel: string;
          }[];
        };
      };
      expectCoherentFinishedCompetition(competition);
      rankingSnapshots.push(competition.rankingRows.map((row) => JSON.stringify(row)).sort());

      for (const completedSlot of slots.slice(0, slots.indexOf(slot) + 1)) {
        const scheduleEntry = (competition.scheduleOverview?.entries ?? []).find(
          (entry) =>
            entry.absoluteWeek === completedSlot.absoluteWeek &&
            entry.rankOrCategoryLabel === "Fランク",
        );
        expect(scheduleEntry?.lifecycleStateLabel).toBe("終了");
      }
    }

    expect(rankingSnapshots.length).toBe(slots.length);
    if (rankingSnapshots[0]!.join("|") !== rankingSnapshots[1]!.join("|")) {
      expect(rankingSnapshots[0]).not.toEqual(rankingSnapshots[1]);
    }
  }, 180_000);

  it("annual ranking history retains snapshots across successive tournament finalizations", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(917),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 17);
    const row = app.uiSessionStore.get(sessionId)!;
    const startYear = row.worldEngineRuntime!.runtimeState.worldState.worldDate.year;
    const slots = listUi009PlayableScheduleSlots(startYear);
    let revision = uiRevision;
    for (const slot of slots) {
      const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
      const weeksToStep = Math.max(1, slot.absoluteWeek - worldDate.absoluteWeek);
      const stepped = await simulationStep(app, cookie, csrf, revision, weeksToStep);
      revision = stepped.uiRevision;
    }

    const competitionRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition?rankingYear=${startYear}`,
      headers: { host: HOST, cookie },
    });
    const priorBody = JSON.parse(competitionRes.body) as Envelope;
    expect(priorBody.ok).toBe(true);
    const priorData = priorBody.data as {
      rankingRows: { yearlyCumulativeEarnings: number }[];
      wireframeObservation: {
        annualRankingYearOptions: { worldYear: number; hasData: boolean }[];
        tournamentSeriesHistory: { entries: unknown[] }[];
      };
    };
    expect(priorData.wireframeObservation.tournamentSeriesHistory.length).toBeGreaterThan(0);
    expect(
      priorData.wireframeObservation.annualRankingYearOptions.some(
        (option) => option.worldYear === startYear && option.hasData,
      ),
    ).toBe(true);
    expect(priorData.rankingRows.length).toBeGreaterThan(0);
  }, 180_000);

  it("after crossing into the next world year prior-year ranking remains selectable with data", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(918),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 23);
    const row = app.uiSessionStore.get(sessionId)!;
    const startYear = row.worldEngineRuntime!.runtimeState.worldState.worldDate.year;
    const slots = listUi009PlayableScheduleSlots(startYear);
    expect(slots.length).toBeGreaterThanOrEqual(2);

    let revision = uiRevision;
    for (const slot of slots) {
      const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
      const weeksToStep = Math.max(1, slot.absoluteWeek - worldDate.absoluteWeek);
      const stepped = await simulationStep(app, cookie, csrf, revision, weeksToStep);
      revision = stepped.uiRevision;
    }

    let guard = 0;
    while (
      row.worldEngineRuntime!.runtimeState.worldState.worldDate.year === startYear &&
      guard < 56
    ) {
      const stepped = await simulationStep(app, cookie, csrf, revision, 1);
      revision = stepped.uiRevision;
      guard += 1;
    }
    expect(row.worldEngineRuntime!.runtimeState.worldState.worldDate.year).toBe(startYear + 1);

    const priorRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition?rankingYear=${startYear}`,
      headers: { host: HOST, cookie },
    });
    const priorBody = JSON.parse(priorRes.body) as Envelope;
    expect(priorBody.ok).toBe(true);
    const priorData = priorBody.data as {
      rankingRows: unknown[];
      wireframeObservation: {
        annualRankingYearOptions: { worldYear: number; hasData: boolean }[];
      };
    };
    expect(priorData.rankingRows.length).toBeGreaterThan(0);
    expect(
      priorData.wireframeObservation.annualRankingYearOptions.some(
        (option) => option.worldYear === startYear && option.hasData,
      ),
    ).toBe(true);
  }, 240_000);
});
