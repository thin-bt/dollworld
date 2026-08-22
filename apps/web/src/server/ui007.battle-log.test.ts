/**
 * UI-007 API-015 GET /api/s1_5/mock-battles/latest/log
 */

import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  asPersonId,
  createEmptyBattleActionLogShell,
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  toCanonicalJson,
  type Person,
  type SeededRngState,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type CreateUiAppOptions, type UiApp } from "./app.js";
import {
  CURSOR_API_SCHEMA_VERSION_CURRENT,
  signCursorPayload,
  verifyCursorCodec,
} from "./cursor.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import {
  computeSessionBindingHash,
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
} from "./session-cookie.js";
import { MOCK_BATTLE_VIEW_KEYS } from "./ui006/types.js";
import { computeLatestRecordHash } from "./ui006/store-hashes.js";
import { createNodeSha256Provider } from "./presets.js";
import type { MockBattleLatestRecord, UiSession } from "./ui-session.js";
import { BATTLE_LOG_ENDPOINT } from "./ui007/routes-battle-log.js";
import { BATTLE_LOG_ITEM_VIEW_KEYS, BATTLE_LOG_LIST_DATA_KEYS } from "./ui007/types.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const BATTLE_WORLD_YEAR = 21;

type Envelope = {
  ok: boolean;
  data?: Record<string, unknown>;
  error?: Record<string, unknown>;
  uiRevision: number | null;
  isUpdating: boolean;
  refreshRequired?: boolean;
};

function parseSetCookieSessionId(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = /^dollworld_s15_session=([A-Za-z0-9_-]{43});/.exec(header as string);
  if (match === null) {
    throw new Error("session cookie missing");
  }
  return match[1] as string;
}

function body(raw: string): Envelope {
  return JSON.parse(raw) as Envelope;
}

function normalizeCareerStatusForAge(person: Person, currentAge: number): Person {
  if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
    return person;
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

  const base = {
    ...person,
    currentAge,
    careerStatus,
    qualifiedMaster: careerStatus === "retired" ? person.qualifiedMaster : false,
  };

  if (careerStatus === "active_competitor") {
    const { retirementRank: _drop, ...withoutRetirement } = base as Person & {
      retirementRank?: string;
    };
    void _drop;
    return {
      ...withoutRetirement,
      careerStatus: "active_competitor",
      currentRank: person.careerStatus === "active_competitor" ? person.currentRank : "C",
      highestRank: person.careerStatus === "active_competitor" ? person.highestRank : "B",
      qualifiedMaster: false,
    } as Person;
  }

  if (careerStatus === "retired") {
    const { currentRank: _drop, ...withoutCurrent } = base as Person & { currentRank?: string };
    void _drop;
    return {
      ...withoutCurrent,
      careerStatus: "retired",
      retirementRank: person.careerStatus === "retired" ? person.retirementRank : "C",
      highestRank: person.careerStatus === "retired" ? person.highestRank : "B",
    } as Person;
  }

  const {
    currentRank: _a,
    highestRank: _b,
    retirementRank: _c,
    ...minimal
  } = base as Person & {
    currentRank?: string;
    highestRank?: string;
    retirementRank?: string;
  };
  void _a;
  void _b;
  void _c;
  return minimal as Person;
}

function prepareBattleReadyRuntime(runtime: Sprint1RunSession): {
  session: Sprint1RunSession;
  personA: string;
  personB: string;
} {
  const worldDate = createWorldDate(
    { year: BATTLE_WORLD_YEAR, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const living = runtime.runtimeState.worldState.persons.filter(
    (person) => person.lifeStatus === "living" && person.currentAge !== null,
  );
  const personA = living[0]?.personId as string;
  const personB = living[1]?.personId as string;
  const child = living[2]?.personId as string;
  if (personA === undefined || personB === undefined || child === undefined) {
    throw new Error("preset does not provide three living persons");
  }
  const forcedBirthYear = new Map<string, number>([
    [personA, BATTLE_WORLD_YEAR - 20],
    [personB, BATTLE_WORLD_YEAR - 18],
    [child, BATTLE_WORLD_YEAR - 5],
  ]);

  const persons = runtime.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living" || person.currentAge === null) {
      return person;
    }
    const birthYear = forcedBirthYear.get(person.personId as string) ?? person.birthYear;
    const currentAge = BATTLE_WORLD_YEAR - birthYear;
    return normalizeCareerStatusForAge(
      { ...person, birthYear, participationStatus: "active" } as Person,
      currentAge,
    );
  });

  const session: Sprint1RunSession = {
    ...runtime,
    runtimeState: {
      ...runtime.runtimeState,
      worldState: {
        ...runtime.runtimeState.worldState,
        worldDate,
        persons,
      },
      battleResultWeekState: {
        ...runtime.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
  return { session, personA, personB };
}

type Harness = {
  app: UiApp;
  sessionId: string;
  csrfToken: string;
  uiSession: UiSession;
  personA: string;
  personB: string;
};

async function boot(options: Partial<CreateUiAppOptions> = {}): Promise<UiApp> {
  return createUiApp({
    publicOrigin: ORIGIN,
    repoRoot: REPO_ROOT,
    processKeys: createTestProcessSecurityContext(912),
    ...options,
  });
}

async function openSession(app: UiApp): Promise<{ sessionId: string; csrfToken: string }> {
  const response = await app.inject({
    method: "GET",
    url: `${API_PREFIX}/session`,
    headers: { host: HOST },
  });
  const sessionId = parseSetCookieSessionId(response.headers["set-cookie"]);
  const csrfToken = (body(response.body).data as { csrfToken: string }).csrfToken;
  return { sessionId, csrfToken };
}

function postHeaders(sessionId: string, csrfToken: string): Record<string, string> {
  return {
    host: HOST,
    origin: ORIGIN,
    "content-type": "application/json",
    cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
    [CSRF_HEADER_NAME]: csrfToken,
  };
}

async function startSimulation(app: UiApp, sessionId: string, csrfToken: string): Promise<void> {
  const response = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/simulation/start`,
    headers: postHeaders(sessionId, csrfToken),
    payload: {
      requestId: randomUUID(),
      expectedUiRevision: 0,
      presetId: DEFAULT_SPRINT1_PRESET_ID,
      seed: 42,
    },
  });
  if (response.statusCode !== 200) {
    throw new Error(`start failed: ${response.body}`);
  }
}

async function harness(options: Partial<CreateUiAppOptions> = {}): Promise<Harness> {
  const app = await boot(options);
  const { sessionId, csrfToken } = await openSession(app);
  await startSimulation(app, sessionId, csrfToken);
  const uiSession = app.uiSessionStore.getStrict(sessionId) as UiSession;
  const prepared = prepareBattleReadyRuntime(uiSession.worldEngineRuntime as Sprint1RunSession);
  uiSession.worldEngineRuntime = prepared.session;
  return {
    app,
    sessionId,
    csrfToken,
    uiSession,
    personA: prepared.personA,
    personB: prepared.personB,
  };
}

async function postMockBattle(h: Harness, expectedUiRevision: number) {
  return h.app.inject({
    method: "POST",
    url: `${API_PREFIX}/mock-battles`,
    headers: postHeaders(h.sessionId, h.csrfToken),
    payload: {
      requestId: randomUUID(),
      expectedUiRevision,
      participantAId: h.personA,
      participantBId: h.personB,
    },
  });
}

async function getLog(h: Harness, query = "") {
  return h.app.inject({
    method: "GET",
    url: `${API_PREFIX}/mock-battles/latest/log${query}`,
    headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${h.sessionId}` },
  });
}

async function getLatest(h: Harness) {
  return h.app.inject({
    method: "GET",
    url: `${API_PREFIX}/mock-battles/latest`,
    headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${h.sessionId}` },
  });
}

const RNG: SeededRngState = {
  algorithmVersion: "xoshiro128ss-v1",
  s0: 1,
  s1: 2,
  s2: 3,
  s3: 4,
};

function makeValidActionLog(actionSequence: number): unknown {
  const shell = createEmptyBattleActionLogShell({
    actionSequence,
    turnNumber: Math.floor(actionSequence / 2) + 1,
    actorSide: actionSequence % 2 === 0 ? "sideA" : "sideB",
    actorPersonId: asPersonId("person-a"),
    requestedAction: { kind: "basic_defense" },
    resolvedAction: { kind: "basic_defense" },
    replacementReason: null,
    rangeBefore: "close",
    rangeAfter: "close",
    actorDurabilityBefore: 100,
    actorDurabilityAfter: 100,
    actorMentalBefore: 100,
    actorMentalAfter: 100,
    guardingBefore: false,
    guardingAfter: true,
    evadingBefore: false,
    evadingAfter: false,
    inBattleConsumptionBefore: 0,
    inBattleConsumptionDelta: 0,
    inBattleConsumptionAfter: 0,
    passiveActionCountDelta: 0,
    invalidActionCountDelta: 0,
    nextHitModifierBefore: 0,
    nextHitModifierAfter: 0,
    nextActivationModifierBefore: 0,
    nextActivationModifierAfter: 0,
    surrenderedAfter: false,
    unableToContinueAfter: false,
    canActAfter: true,
    rngStateBefore: RNG,
    rngStateAfter: RNG,
  });
  return JSON.parse(JSON.stringify(shell));
}

function makeFix025Log(): unknown {
  const shell = createEmptyBattleActionLogShell({
    actionSequence: 0,
    turnNumber: 1,
    actorSide: "sideA",
    actorPersonId: asPersonId("person-a"),
    requestedAction: { kind: "use_technique", techniqueId: "tech-requested" as never },
    resolvedAction: { kind: "use_technique", techniqueId: "tech-resolved" as never },
    replacementReason: "unknown_technique",
    rangeBefore: "close",
    rangeAfter: "close",
    actorDurabilityBefore: 100,
    actorDurabilityAfter: 100,
    actorMentalBefore: 100,
    actorMentalAfter: 100,
    guardingBefore: false,
    guardingAfter: false,
    evadingBefore: false,
    evadingAfter: false,
    inBattleConsumptionBefore: 0,
    inBattleConsumptionDelta: 0,
    inBattleConsumptionAfter: 0,
    passiveActionCountDelta: 0,
    invalidActionCountDelta: 1,
    nextHitModifierBefore: 0,
    nextHitModifierAfter: 0,
    nextActivationModifierBefore: 0,
    nextActivationModifierAfter: 0,
    surrenderedAfter: false,
    unableToContinueAfter: false,
    canActAfter: true,
    rngStateBefore: RNG,
    rngStateAfter: RNG,
  });
  const log = JSON.parse(JSON.stringify(shell)) as Record<string, unknown>;
  log.activationChance = 50;
  log.activationRoll = 99;
  log.activationSucceeded = false;
  log.activationFailureReason = "activation_failed";
  return log;
}

describe("UI-007 API-015 battle log", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-015: 401 without session before other failures", async () => {
    app = await boot();
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/latest/log?limit=50`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(401);
    expect(body(response.body).error?.code).toBe("SESSION_REQUIRED");
  });

  it("ST-015: 400 invalid query (limit=50) before lifecycle", async () => {
    const h = await harness();
    app = h.app;
    const response = await getLog(h, "?limit=50");
    expect(response.statusCode).toBe(400);
    expect(body(response.body).error?.code).toBe("INVALID_REQUEST");
  });

  it("ST-015: 409 SIMULATION_NOT_STARTED when lifecycle empty", async () => {
    app = await boot();
    const { sessionId } = await openSession(app);
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/latest/log`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(response.statusCode).toBe(409);
    expect(body(response.body).error?.code).toBe("SIMULATION_NOT_STARTED");
  });

  it("actionLogs-only totalCount (FIX-024) + exact40/exact4 + resultUiRevision", async () => {
    const h = await harness();
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const response = await getLog(h);
    expect(response.statusCode).toBe(200);
    const env = body(response.body);
    expect(env.ok).toBe(true);
    const data = env.data as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual([...BATTLE_LOG_LIST_DATA_KEYS].sort());
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    const br = record.battleResult as {
      detailedLog: { actionLogs: unknown[]; turnOrderLogs: unknown[] };
    };
    expect(data.totalCount).toBe(br.detailedLog.actionLogs.length);
    expect(data.totalCount).not.toBe(br.detailedLog.turnOrderLogs.length);
    expect(data.resultUiRevision).toBe(record.resultUiRevision);
    const items = data.items as Record<string, unknown>[];
    expect(items.length).toBeGreaterThan(0);
    expect(Object.keys(items[0]!).sort()).toEqual([...BATTLE_LOG_ITEM_VIEW_KEYS].sort());
    expect("actionKind" in items[0]!).toBe(false);
    expect("rngDisplay" in items[0]!).toBe(false);
    expect("reasonText" in items[0]!).toBe(false);
    expect(items[0]!.sequenceInBattle).toBe(1);
    // DB-014: pass-through source strings (no invented enumization in projection)
    expect(
      typeof items[0]!.replacementReason === "string" || items[0]!.replacementReason === null,
    ).toBe(true);
    expect(typeof items[0]!.evadeDirection === "string" || items[0]!.evadeDirection === null).toBe(
      true,
    );
    expect(
      typeof items[0]!.activationFailureReason === "string" ||
        items[0]!.activationFailureReason === null,
    ).toBe(true);
  });

  it("FIX-025 requested≠resolved techniqueId via overrideActionLogsAfterRead", async () => {
    const h = await harness({
      battleLogHooks: { overrideActionLogsAfterRead: [makeFix025Log()] },
    });
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const response = await getLog(h);
    expect(response.statusCode).toBe(200);
    const item = (body(response.body).data as { items: Record<string, unknown>[] }).items[0]!;
    expect(item.techniqueId).toBe("tech-resolved");
    expect(item.requestedAction).toEqual({
      kind: "use_technique",
      techniqueId: "tech-requested",
    });
    expect(item.resolvedAction).toEqual({
      kind: "use_technique",
      techniqueId: "tech-resolved",
    });
    expect(item.replacementReason).toBe("unknown_technique");
  });

  it("FIX-008 paging boundaries via overrideActionLogsAfterRead (store hashes stay valid)", async () => {
    const hooks: NonNullable<CreateUiAppOptions["battleLogHooks"]> = {};
    const h = await harness({ battleLogHooks: hooks });
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);

    const cases: Array<{ n: number; limit: 100 | 200; expected: number; hasNext: boolean }> = [
      { n: 0, limit: 100, expected: 0, hasNext: false },
      { n: 100, limit: 100, expected: 100, hasNext: false },
      { n: 101, limit: 100, expected: 100, hasNext: true },
      { n: 200, limit: 200, expected: 200, hasNext: false },
      { n: 201, limit: 200, expected: 200, hasNext: true },
    ];
    for (const c of cases) {
      hooks.overrideActionLogsAfterRead = Array.from({ length: c.n }, (_, i) =>
        makeValidActionLog(i),
      );
      const response = await getLog(h, `?limit=${c.limit}`);
      expect(response.statusCode, `n=${c.n}`).toBe(200);
      const data = body(response.body).data as {
        items: unknown[];
        totalCount: number;
        nextCursor: string | null;
      };
      expect(data.totalCount).toBe(c.n);
      expect(data.items).toHaveLength(c.expected);
      expect(data.nextCursor !== null).toBe(c.hasNext);
    }
  }, 30_000);

  it("FI-057: corrupt actionLogs item => 500, no skip", async () => {
    const h = await harness({
      battleLogHooks: { corruptActionLogIndex: 0 },
    });
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const response = await getLog(h);
    expect(response.statusCode).toBe(500);
    expect(body(response.body).error?.code).toBe("INTERNAL_ERROR");
  });

  it("FI-057 store tamper (hash reseal with corrupt log) => 500", async () => {
    const h = await harness();
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    const br = structuredClone(record.battleResult) as {
      detailedLog: { actionLogs: Record<string, unknown>[]; turnOrderLogs: unknown[] };
      [key: string]: unknown;
    };
    br.detailedLog.actionLogs[0] = { ...br.detailedLog.actionLogs[0]!, actionSequence: "bad" };
    const provider = createNodeSha256Provider();
    const resealed: MockBattleLatestRecord = {
      ...record,
      battleResult: br,
      latestRecordHash: computeLatestRecordHash(
        {
          resultUiRevision: record.resultUiRevision,
          battleResult: br,
          eventCandidates: record.eventCandidates,
          replaySnapshot: record.replaySnapshot,
        },
        provider,
      ),
    };
    h.uiSession.mockBattleStore = { schemaVersion: "0.2.0", latest: resealed };
    const response = await getLog(h);
    expect(response.statusCode).toBe(500);
    expect(body(response.body).error?.code).toBe("INTERNAL_ERROR");
  });

  it("FI-058/FI-061: old cursor after step => 409; cursorless 200 with envelope > result", async () => {
    const h = await harness();
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const before = body((await getLog(h, "?limit=100")).body);
    const resultUiRevision = (before.data as { resultUiRevision: number }).resultUiRevision;
    const nextCursor = (before.data as { nextCursor: string | null }).nextCursor;
    // Force a nextCursor by using override if natural log is short
    let cursor = nextCursor;
    if (cursor === null) {
      const logs = Array.from({ length: 101 }, (_, i) => makeValidActionLog(i));
      await h.app.close();
      const h2 = await harness({
        battleLogHooks: { overrideActionLogsAfterRead: logs },
      });
      app = h2.app;
      expect((await postMockBattle(h2, 1)).statusCode).toBe(200);
      const page1 = body((await getLog(h2, "?limit=100")).body);
      cursor = (page1.data as { nextCursor: string }).nextCursor;
      const resultRev = (page1.data as { resultUiRevision: number }).resultUiRevision;
      const step = await h2.app.inject({
        method: "POST",
        url: `${API_PREFIX}/simulation/step`,
        headers: postHeaders(h2.sessionId, h2.csrfToken),
        payload: { requestId: randomUUID(), expectedUiRevision: 2, weeks: 1 },
      });
      expect(step.statusCode).toBe(200);
      const stale = await getLog(h2, `?limit=100&cursor=${encodeURIComponent(cursor)}`);
      expect(stale.statusCode).toBe(409);
      expect(body(stale.body).error?.code).toBe("STALE_CURSOR");
      const fresh = await getLog(h2, "?limit=100");
      expect(fresh.statusCode).toBe(200);
      const freshEnv = body(fresh.body);
      expect((freshEnv.data as { resultUiRevision: number }).resultUiRevision).toBe(resultRev);
      expect(freshEnv.uiRevision!).toBeGreaterThan(
        (freshEnv.data as { resultUiRevision: number }).resultUiRevision,
      );
      return;
    }

    const step = await h.app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: postHeaders(h.sessionId, h.csrfToken),
      payload: { requestId: randomUUID(), expectedUiRevision: 2, weeks: 1 },
    });
    expect(step.statusCode).toBe(200);
    const stale = await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor)}`);
    expect(stale.statusCode).toBe(409);
    const fresh = await getLog(h);
    expect(fresh.statusCode).toBe(200);
    const freshEnv = body(fresh.body);
    expect((freshEnv.data as { resultUiRevision: number }).resultUiRevision).toBe(resultUiRevision);
    expect(freshEnv.uiRevision!).toBeGreaterThan(resultUiRevision);
  });

  it("FI-059: dataIdentity result mismatch => 409", async () => {
    const h = await harness();
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    const forged = signCursorPayload({
      cursorHmacKey: h.app.uiProcessKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(
          h.app.uiProcessKeys.sessionBindingKey,
          h.sessionId,
        ),
        endpoint: BATTLE_LOG_ENDPOINT,
        dataIdentity: `mock-result:${record.resultUiRevision + 99}`,
        uiRevision: h.uiSession.uiRevision,
        query: {
          kind: "battle_log",
          sortKey: "sourceIndex",
          sortOrder: "asc",
          limit: 100,
        },
        nextPosition: { sourceIndex: 0 },
      },
    });
    const response = await getLog(h, `?limit=100&cursor=${encodeURIComponent(forged)}`);
    expect(response.statusCode).toBe(409);
    expect(body(response.body).error?.code).toBe("STALE_CURSOR");
  });

  it("FI-060: reset then old cursor => 409; cursorless => 404", async () => {
    const h = await harness({
      battleLogHooks: {
        overrideActionLogsAfterRead: Array.from({ length: 101 }, (_, i) => makeValidActionLog(i)),
      },
    });
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const page1 = body((await getLog(h, "?limit=100")).body);
    const cursor = (page1.data as { nextCursor: string }).nextCursor;
    const reset = await h.app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/reset`,
      headers: postHeaders(h.sessionId, h.csrfToken),
      payload: { requestId: randomUUID(), expectedUiRevision: 2 },
    });
    expect(reset.statusCode).toBe(200);
    expect(h.uiSession.mockBattleStore.latest).toBeNull();
    const stale = await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor)}`);
    expect(stale.statusCode).toBe(409);
    expect(body(stale.body).error?.code).toBe("STALE_CURSOR");
    const missing = await getLog(h);
    expect(missing.statusCode).toBe(404);
    expect(body(missing.body).error?.code).toBe("NOT_FOUND");
  });

  it("SCN-012 full chain", async () => {
    const h = await harness({
      battleLogHooks: {
        overrideActionLogsAfterRead: Array.from({ length: 101 }, (_, i) => makeValidActionLog(i)),
      },
    });
    app = h.app;
    // mock
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const page1 = body((await getLog(h, "?limit=100")).body);
    const cursor1 = (page1.data as { nextCursor: string }).nextCursor;
    const resultRev1 = (page1.data as { resultUiRevision: number }).resultUiRevision;
    expect(cursor1).toBeTruthy();

    // step -> stale cursor; cursorless ok
    expect(
      (
        await h.app.inject({
          method: "POST",
          url: `${API_PREFIX}/simulation/step`,
          headers: postHeaders(h.sessionId, h.csrfToken),
          payload: { requestId: randomUUID(), expectedUiRevision: 2, weeks: 1 },
        })
      ).statusCode,
    ).toBe(200);
    expect((await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor1)}`)).statusCode).toBe(
      409,
    );
    const afterStep = body((await getLog(h, "?limit=100")).body);
    expect(afterStep.ok).toBe(true);
    expect((afterStep.data as { resultUiRevision: number }).resultUiRevision).toBe(resultRev1);

    // replay -> new result revision; old cursor stale
    const replay = await h.app.inject({
      method: "POST",
      url: `${API_PREFIX}/mock-battles/replay`,
      headers: postHeaders(h.sessionId, h.csrfToken),
      payload: { requestId: randomUUID(), expectedUiRevision: 3 },
    });
    expect(replay.statusCode).toBe(200);
    expect((await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor1)}`)).statusCode).toBe(
      409,
    );
    const afterReplay = body((await getLog(h, "?limit=100")).body);
    const cursor2 = (afterReplay.data as { nextCursor: string }).nextCursor;
    expect(cursor2).toBeTruthy();

    // reset -> stale then 404
    expect(
      (
        await h.app.inject({
          method: "POST",
          url: `${API_PREFIX}/simulation/reset`,
          headers: postHeaders(h.sessionId, h.csrfToken),
          payload: { requestId: randomUUID(), expectedUiRevision: 4 },
        })
      ).statusCode,
    ).toBe(200);
    expect((await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor2)}`)).statusCode).toBe(
      409,
    );
    expect((await getLog(h)).statusCode).toBe(404);
  });

  it("BRIDGE-097: MockBattleView exact34 / no raw detailedLog (latest GET regression)", async () => {
    const h = await harness();
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);
    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(200);
    const data = body(latest.body).data as Record<string, unknown>;
    expect(Object.keys(data).sort()).toEqual([...MOCK_BATTLE_VIEW_KEYS].sort());
    expect("detailedLog" in data).toBe(false);
    expect("battleResult" in data).toBe(false);
  });

  it("consumerEvidence: PAGE-007/008/009 + TX/BRIDGE BattleLog branches", async () => {
    const h = await harness({
      battleLogHooks: {
        overrideActionLogsAfterRead: Array.from({ length: 101 }, (_, i) => makeValidActionLog(i)),
      },
    });
    app = h.app;
    expect((await postMockBattle(h, 1)).statusCode).toBe(200);

    // PAGE-007: totalCount before page slice
    const page1 = body((await getLog(h, "?limit=100")).body);
    expect((page1.data as { totalCount: number }).totalCount).toBe(101);
    expect((page1.data as { items: unknown[] }).items).toHaveLength(100);
    const cursor = (page1.data as { nextCursor: string }).nextCursor;

    // PAGE-008: exclusive next; page2 last item
    const page2 = body((await getLog(h, `?limit=100&cursor=${encodeURIComponent(cursor)}`)).body);
    expect((page2.data as { items: { sequenceInBattle: number }[] }).items).toHaveLength(1);
    expect(
      (page2.data as { items: { sequenceInBattle: number }[] }).items[0]!.sequenceInBattle,
    ).toBe(101);
    expect((page2.data as { nextCursor: null }).nextCursor).toBeNull();

    // PAGE-009 / BRIDGE-067/107: wrong kind prefix => 400; stale identity => 409
    const wrongPrefix = signCursorPayload({
      cursorHmacKey: h.app.uiProcessKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(
          h.app.uiProcessKeys.sessionBindingKey,
          h.sessionId,
        ),
        endpoint: BATTLE_LOG_ENDPOINT,
        dataIdentity: `simulation:not-a-result`,
        uiRevision: h.uiSession.uiRevision,
        query: {
          kind: "battle_log",
          sortKey: "sourceIndex",
          sortOrder: "asc",
          limit: 100,
        },
        nextPosition: { sourceIndex: 0 },
      },
    });
    // codec rejects battle_log + non mock-result: as invalid_request (400)
    const badPrefix = await getLog(h, `?limit=100&cursor=${encodeURIComponent(wrongPrefix)}`);
    expect(badPrefix.statusCode).toBe(400);

    const wrongQuery = signCursorPayload({
      cursorHmacKey: h.app.uiProcessKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(
          h.app.uiProcessKeys.sessionBindingKey,
          h.sessionId,
        ),
        endpoint: BATTLE_LOG_ENDPOINT,
        dataIdentity: `mock-result:${(page1.data as { resultUiRevision: number }).resultUiRevision}`,
        uiRevision: h.uiSession.uiRevision,
        query: {
          kind: "battle_log",
          sortKey: "sourceIndex",
          sortOrder: "asc",
          limit: 200,
        },
        nextPosition: { sourceIndex: 0 },
      },
    });
    // TX-041/043: same kind different effective query => 409
    const staleQuery = await getLog(h, `?limit=100&cursor=${encodeURIComponent(wrongQuery)}`);
    expect(staleQuery.statusCode).toBe(409);

    // TX-055/058/078: signed nextCursor authenticates and continues
    const verified = verifyCursorCodec({
      cursor,
      cursorHmacKey: h.app.uiProcessKeys.cursorHmacKey,
    });
    expect(verified.kind).toBe("ok");
    if (verified.kind === "ok") {
      expect(verified.payload.dataIdentity.startsWith("mock-result:")).toBe(true);
      expect(verified.payload.endpoint).toBe(BATTLE_LOG_ENDPOINT);
      expect(verified.payload.query.kind).toBe("battle_log");
      expect(toCanonicalJson(verified.payload.nextPosition)).toBe(
        toCanonicalJson({ sourceIndex: 99 }),
      );
    }
  });
});
