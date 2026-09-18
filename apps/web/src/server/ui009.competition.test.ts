/**
 * UI-009 Sprint2 competition progression (bounded integration).
 */
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type Person,
  type Rank,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "./app.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "./session-cookie.js";
import { resetCompetitionStore } from "./ui009/competition-session-registry.js";
import { COMPETITION_VIEW_KEYS } from "./ui009/types.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const BATTLE_WORLD_YEAR = 21;

type Envelope = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: Record<string, unknown>;
  uiRevision: number;
};

type RoundRobinProgress = {
  participantIds: string[];
  matchesTotal: number;
  matchesCompleted: number;
  nextPairIndex: number | null;
  history: unknown[];
  matrix: Array<{ personId: string; wins: number; losses: number; played: number; cells: unknown[] }>;
};

type CompetitionView = Record<string, unknown> & {
  lifecyclePhase: string;
  participantIds: string[];
  matchesCompleted: number;
  finalResultSummary: unknown | null;
  rankingRows: unknown[];
  championDisplayName: string | null;
  roundRobinProgress: RoundRobinProgress | null;
};

function parseSetCookieSessionId(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = /^dollworld_s15_session=([A-Za-z0-9_-]{43});/.exec(header as string);
  if (match === null) {
    throw new Error("session cookie missing");
  }
  return match[1] as string;
}

const VALID_RANKS = ["F", "E", "D", "C", "B", "A", "S"] as const;

function asRank(value: unknown, fallback: Rank): Rank {
  return typeof value === "string" && (VALID_RANKS as readonly string[]).includes(value)
    ? (value as Rank)
    : fallback;
}

function stripDisallowedRankFields(person: Person): Person {
  const {
    currentRank: _currentRank,
    highestRank: _highestRank,
    retirementRank: _retirementRank,
    ...withoutRankFields
  } = person as Person & {
    currentRank?: unknown;
    highestRank?: unknown;
    retirementRank?: unknown;
  };
  return withoutRankFields as Person;
}

function normalizeCareerStatusForAge(person: Person, currentAge: number): Person {
  if (person.lifeStatus !== "living") {
    return person;
  }
  if (person.participationStatus !== "active") {
    return { ...stripDisallowedRankFields(person), currentAge } as Person;
  }
  let careerStatus = person.careerStatus;
  if (currentAge <= 7) {
    careerStatus = "child";
  } else if (currentAge <= 15) {
    careerStatus = "trainee";
  } else if (currentAge >= 42) {
    careerStatus = "retired";
  } else if (careerStatus === "child" || careerStatus === "trainee") {
    careerStatus = "active_competitor";
  }
  if (careerStatus === "active_competitor") {
    const currentRank =
      person.careerStatus === "active_competitor"
        ? asRank(person.currentRank, "F")
        : "F";
    const highestRank =
      person.careerStatus === "active_competitor"
        ? asRank(person.highestRank, currentRank)
        : currentRank;
    return {
      ...person,
      currentAge,
      careerStatus: "active_competitor",
      qualifiedMaster: false,
      currentRank,
      highestRank,
    } as Person;
  }
  if (careerStatus === "retired") {
    const retirementRank =
      person.careerStatus === "active_competitor"
        ? asRank(person.currentRank, "F")
        : asRank("retirementRank" in person ? person.retirementRank : undefined, "F");
    return {
      ...stripDisallowedRankFields(person),
      currentAge,
      careerStatus: "retired",
      qualifiedMaster: false,
      highestRank: asRank("highestRank" in person ? person.highestRank : undefined, retirementRank),
      retirementRank,
    } as Person;
  }
  return {
    ...stripDisallowedRankFields(person),
    currentAge,
    careerStatus,
    qualifiedMaster: false,
  } as Person;
}

function normalizeRuntimeForCompetition(session: Sprint1RunSession): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: BATTLE_WORLD_YEAR, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living") {
      return person;
    }
    const currentAge = worldDate.year - person.birthYear;
    return normalizeCareerStatusForAge(person as Person, currentAge);
  });
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        worldDate,
        persons,
      },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
}

async function bootstrapReadySession(app: UiApp): Promise<{
  cookie: string;
  csrf: string;
  uiRevision: number;
}> {
  const sessionRes = await app.inject({ method: "GET", url: `${API_PREFIX}/session`, headers: { host: HOST } });
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
      seed: 42,
    },
  });
  if (start.statusCode !== 200) {
    throw new Error(`start failed: ${start.body}`);
  }
  const started = JSON.parse(start.body) as Envelope;
  expect(started.ok).toBe(true);
  const row = app.uiSessionStore.get(sessionId)!;
  const normalized = normalizeRuntimeForCompetition(row.worldEngineRuntime!);
  row.worldEngineRuntime = normalized;
  resetCompetitionStore(sessionId);
  return { cookie: `${SESSION_COOKIE_NAME}=${sessionId}`, csrf, uiRevision: started.uiRevision };
}

async function stepCompetition(
  app: UiApp,
  cookie: string,
  csrf: string,
  expectedUiRevision: number,
): Promise<{ envelope: Envelope; competition: CompetitionView }> {
  const step = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/competition/step`,
    headers: {
      host: HOST,
      cookie,
      [CSRF_HEADER_NAME]: csrf,
      "content-type": "application/json",
      origin: ORIGIN,
    },
    payload: { requestId: randomUUID(), expectedUiRevision },
  });
  expect(step.statusCode).toBe(200);
  const envelope = JSON.parse(step.body) as Envelope;
  expect(envelope.ok).toBe(true);
  const competition = (envelope.data as { competition: CompetitionView }).competition;
  return { envelope, competition };
}

describe("UI-009 competition progression", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it(
    "GET idle then steps every accepted round-robin pair without fabricating final standings",
    async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(909),
    });
    const { cookie, csrf, uiRevision } = await bootstrapReadySession(app);

    const idle = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    const idleBody = JSON.parse(idle.body) as Envelope;
    expect(idleBody.ok).toBe(true);
    expect((idleBody.data as { lifecyclePhase: string }).lifecyclePhase).toBe("idle");
    const idleData = idleBody.data as {
      participantIds: string[];
      preStartPreview: { participantDisplayNames: string[] } | null;
      tournamentKindLabel: string | null;
    };
    expect(idleData.preStartPreview).not.toBeNull();
    expect(idleData.participantIds.length).toBeGreaterThanOrEqual(2);
    expect(idleData.preStartPreview!.participantDisplayNames).toHaveLength(idleData.participantIds.length);
    expect(idleData.tournamentKindLabel).toBe("通常大会");
    const scheduleOverview = (idleBody.data as { scheduleOverview: { entries: unknown[]; worldTimeLabel: string } })
      .scheduleOverview;
    expect(scheduleOverview.worldTimeLabel.length).toBeGreaterThan(0);
    expect(scheduleOverview.entries.length).toBeGreaterThan(10);
    expect(
      (idleBody.data as { scheduleOverview: { playableSelectionKey: string | null } }).scheduleOverview
        .playableSelectionKey,
    ).not.toBeNull();

    let revision = uiRevision;
    let competition: CompetitionView | null = null;
    for (let guard = 0; guard < 128; guard += 1) {
      const stepped = await stepCompetition(app, cookie, csrf, revision);
      revision = stepped.envelope.uiRevision;
      competition = stepped.competition;
      for (const key of COMPETITION_VIEW_KEYS) {
        expect(competition).toHaveProperty(key);
      }
      if (competition.lifecyclePhase === "finished") {
        break;
      }
      expect(["awaiting_match", "round_robin_complete"]).toContain(competition.lifecyclePhase);
    }

    expect(competition).not.toBeNull();
    expect(competition!.lifecyclePhase).toBe("finished");
    expect(competition!.roundRobinProgress).not.toBeNull();
    const progress = competition!.roundRobinProgress!;
    const participantCount = progress.participantIds.length;
    expect(participantCount).toBeGreaterThanOrEqual(2);
    if (progress.matchesTotal > 0) {
      expect(progress.matchesTotal).toBe((participantCount * (participantCount - 1)) / 2);
      expect(progress.matchesCompleted).toBe(progress.matchesTotal);
      expect(progress.nextPairIndex).toBeNull();
      expect(progress.history).toHaveLength(progress.matchesTotal);
      expect(progress.matrix).toHaveLength(participantCount);
      expect(progress.matrix.every((row) => row.played === participantCount - 1)).toBe(true);
      expect(progress.matrix.reduce((sum, row) => sum + row.wins, 0)).toBe(progress.matchesTotal);
      expect(progress.matrix.reduce((sum, row) => sum + row.losses, 0)).toBe(progress.matchesTotal);
      expect(competition!.matchesCompleted).toBe(progress.matchesTotal);
    } else {
      expect(competition!.matchesCompleted).toBeGreaterThan(0);
    }

    expect(competition!.finalResultSummary).not.toBeNull();
    expect(competition!.rankingRows.length).toBeGreaterThan(0);
    expect(competition!.championDisplayName).not.toBeNull();
    expect(competition!.lifecyclePhase).toBe("finished");

    // Competition owns its own journal record. It must not replace the simulation
    // lastOperation pointer, because GET /simulation only accepts simulation/mock views.
    const simulation = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/simulation`,
      headers: { host: HOST, cookie },
    });
    expect(simulation.statusCode).toBe(200);
    const simulationBody = JSON.parse(simulation.body) as Envelope;
    expect(simulationBody.ok).toBe(true);
    expect((simulationBody.data as { lastOperation: { operation: string } }).lastOperation.operation).toBe("start");
  },
  120_000,
  );

  it("accepted UI009 start seed can initialize competition without runtime normalization", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(910),
    });
    const sessionRes = await app.inject({ method: "GET", url: `${API_PREFIX}/session`, headers: { host: HOST } });
    const sessionId = parseSetCookieSessionId(sessionRes.headers["set-cookie"]);
    const csrf = (JSON.parse(sessionRes.body) as Envelope).data!.csrfToken as string;
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
        seed: 42,
      },
    });
    expect(start.statusCode).toBe(200);
    const started = JSON.parse(start.body) as Envelope;
    resetCompetitionStore(sessionId);
    const stepped = await stepCompetition(
      app,
      `${SESSION_COOKIE_NAME}=${sessionId}`,
      csrf,
      started.uiRevision,
    );
    expect(stepped.competition.participantIds.length).toBeGreaterThan(2);
    expect(stepped.competition.roundRobinProgress).not.toBeNull();
    expect(["awaiting_match", "round_robin_complete", "finished"]).toContain(
      stepped.competition.lifecyclePhase,
    );
  }, 120_000);
});
