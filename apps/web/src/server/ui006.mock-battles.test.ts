/**
 * UI-006 API-012 / API-013 / API-014 (S1.5-SPEC-0.1.15 §13).
 *
 * The accepted `sprint1-tiny` preset generates historical persons with birthYear <= 0
 * at world year 1, which the canonical `CreateBattleRequest` validator rejects. Battle
 * readiness is therefore established with the same normalization fixture that
 * simulation-core's own commit-battle suite uses, applied to the live session runtime.
 */

import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BattleExecutionAbortError,
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  toCanonicalJson,
  type Person,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type CreateUiAppOptions, type UiApp } from "./app.js";
import { createNodeSha256Provider, DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "./session-cookie.js";
import { MOCK_BATTLE_VIEW_KEYS } from "./ui006/types.js";
import { computeLatestRecordHash, computeReplaySnapshotHash } from "./ui006/store-hashes.js";
import { replaySnapshotHashInput } from "./ui006/store-validate.js";
import type { MockBattleLatestRecord, UiSession } from "./ui-session.js";

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

/** Mirrors simulation-core's commit-battle fixture normalization. */
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

type Prepared = { session: Sprint1RunSession; personA: string; personB: string; child: string };

/**
 * Advance the world year and give the first three living persons deterministic ages so
 * two are battle-eligible and one is a `child` (permanently ineligible for mock battles).
 */
function prepareBattleReadyRuntime(runtime: Sprint1RunSession): Prepared {
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
  return { session, personA, personB, child };
}

type Harness = {
  app: UiApp;
  sessionId: string;
  csrfToken: string;
  uiSession: UiSession;
  personA: string;
  personB: string;
  child: string;
};

async function boot(options: Partial<CreateUiAppOptions> = {}): Promise<UiApp> {
  return createUiApp({
    publicOrigin: ORIGIN,
    repoRoot: REPO_ROOT,
    processKeys: createTestProcessSecurityContext(911),
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
    child: prepared.child,
  };
}

async function postMockBattle(
  h: Harness,
  input: {
    expectedUiRevision: number;
    participantAId?: string;
    participantBId?: string;
    requestId?: string;
    extra?: Record<string, unknown>;
  },
) {
  const payload: Record<string, unknown> = {
    requestId: input.requestId ?? randomUUID(),
    expectedUiRevision: input.expectedUiRevision,
    ...(input.participantAId !== undefined ? { participantAId: input.participantAId } : {}),
    ...(input.participantBId !== undefined ? { participantBId: input.participantBId } : {}),
    ...input.extra,
  };
  return h.app.inject({
    method: "POST",
    url: `${API_PREFIX}/mock-battles`,
    headers: postHeaders(h.sessionId, h.csrfToken),
    payload,
  });
}

async function postReplay(h: Harness, expectedUiRevision: number, requestId = randomUUID()) {
  return h.app.inject({
    method: "POST",
    url: `${API_PREFIX}/mock-battles/replay`,
    headers: postHeaders(h.sessionId, h.csrfToken),
    payload: { requestId, expectedUiRevision },
  });
}

async function getLatest(h: Harness) {
  return h.app.inject({
    method: "GET",
    url: `${API_PREFIX}/mock-battles/latest`,
    headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${h.sessionId}` },
  });
}

/** §13G isolation projection over the canonical runtime. */
function canonicalWorldJson(session: UiSession): string {
  const runtime = session.worldEngineRuntime as Sprint1RunSession;
  return toCanonicalJson({
    worldState: runtime.runtimeState.worldState,
    worldRngState: runtime.runtimeState.worldRngState,
    matchIdGeneratorState: runtime.runtimeState.matchIdGeneratorState,
    eventStream: runtime.runtimeState.eventStream,
    battleResults: runtime.runtimeState.battleResults,
    battleResultWeekState: runtime.runtimeState.battleResultWeekState,
  });
}

/** Re-seal a hand-corrupted latest record so only the targeted invariant is broken. */
function reseal(record: MockBattleLatestRecord): MockBattleLatestRecord {
  const provider = createNodeSha256Provider();
  const replaySnapshot = {
    ...record.replaySnapshot,
    replaySnapshotHash: computeReplaySnapshotHash(
      replaySnapshotHashInput(record.replaySnapshot),
      provider,
    ),
  };
  return {
    ...record,
    replaySnapshot,
    latestRecordHash: computeLatestRecordHash(
      {
        resultUiRevision: record.resultUiRevision,
        battleResult: record.battleResult,
        eventCandidates: record.eventCandidates,
        replaySnapshot,
      },
      provider,
    ),
  };
}

describe("UI-006 mock battles", () => {
  let app: UiApp | undefined;
  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-012: runs an isolated mock battle without touching the canonical world", async () => {
    const h = await harness();
    app = h.app;
    const before = canonicalWorldJson(h.uiSession);

    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(response.statusCode).toBe(200);
    const envelope = body(response.body);
    expect(envelope.ok).toBe(true);
    expect(envelope.isUpdating).toBe(false);
    const data = envelope.data as {
      acceptedUiRevision: number;
      completedUiRevision: number;
      replay: boolean;
      durationMs: number;
      result: Record<string, unknown>;
    };
    expect(Object.keys(data).sort()).toEqual(
      ["acceptedUiRevision", "completedUiRevision", "durationMs", "replay", "result"].sort(),
    );
    expect(data.acceptedUiRevision).toBe(1);
    expect(data.completedUiRevision).toBe(2);
    expect(data.replay).toBe(false);

    const view = data.result;
    expect(Object.keys(view).sort()).toEqual([...MOCK_BATTLE_VIEW_KEYS].sort());
    expect(view.battleKind).toBe("mock");
    expect(view.battleResultSchemaVersion).toBe("0.5.0");
    expect(view.replayAvailable).toBe(true);
    expect(view.participantAPersonId).toBe(h.personA);
    expect(view.participantBPersonId).toBe(h.personB);
    expect(view.resultUiRevision).toBe(2);
    expect(view.sourceWorldUiRevision).toBe(1);
    expect(view.sourceWorldDate).toEqual({ year: BATTLE_WORLD_YEAR, month: 4, week: 1 });
    expect((view.eventCandidates as { eventType: string }[]).map((e) => e.eventType)).toEqual([
      "battle.started",
      "battle.finished",
    ]);
    expect(view).not.toHaveProperty("judgeDecision");

    // ACC-024/038: canonical world, RNG, MatchId, events all unchanged.
    expect(canonicalWorldJson(h.uiSession)).toBe(before);
    expect(h.uiSession.uiRevision).toBe(2);
    expect(h.uiSession.mockBattleStore.latest?.resultUiRevision).toBe(2);

    // lastOperation must surface MockBattleMutationView via GET /simulation.
    const sim = await h.app.inject({
      method: "GET",
      url: `${API_PREFIX}/simulation`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${h.sessionId}` },
    });
    expect(sim.statusCode).toBe(200);
    const simData = body(sim.body).data as { lastOperation: Record<string, unknown> };
    expect(simData.lastOperation).toMatchObject({
      acceptedUiRevision: 1,
      completedUiRevision: 2,
      replay: false,
    });
    expect(simData.lastOperation).toHaveProperty("result");
    expect(simData.lastOperation).not.toHaveProperty("operation");
  }, 20_000);

  it("ST-014: GET latest mirrors the stored result and keeps revision separation", async () => {
    const h = await harness();
    app = h.app;
    const created = body(
      (
        await postMockBattle(h, {
          expectedUiRevision: 1,
          participantAId: h.personA,
          participantBId: h.personB,
        })
      ).body,
    );

    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(200);
    const envelope = body(latest.body);
    expect(envelope.uiRevision).toBe(2);
    expect(envelope.data).toEqual((created.data as { result: Record<string, unknown> }).result);
  });

  it("ST-013: replay reproduces the identical battle from the stored snapshot", async () => {
    const h = await harness();
    app = h.app;
    const first = body(
      (
        await postMockBattle(h, {
          expectedUiRevision: 1,
          participantAId: h.personA,
          participantBId: h.personB,
        })
      ).body,
    ).data as { result: Record<string, unknown> };

    const replayResponse = await postReplay(h, 2);
    expect(replayResponse.statusCode).toBe(200);
    const replayData = body(replayResponse.body).data as {
      replay: boolean;
      acceptedUiRevision: number;
      completedUiRevision: number;
      result: Record<string, unknown>;
    };
    expect(replayData.replay).toBe(true);
    expect(replayData.acceptedUiRevision).toBe(2);
    expect(replayData.completedUiRevision).toBe(3);

    // Only the revision fields may differ between an original and its replay.
    const stripRevisions = (view: Record<string, unknown>) => {
      const { resultUiRevision: _drop, ...rest } = view;
      void _drop;
      return rest;
    };
    expect(stripRevisions(replayData.result)).toEqual(stripRevisions(first.result));
    expect(replayData.result.sourceWorldUiRevision).toBe(1);
    expect(replayData.result.resultUiRevision).toBe(3);
  });

  it("SCN: a later world step keeps the older mock result readable", async () => {
    const h = await harness();
    app = h.app;
    await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    const step = await h.app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: postHeaders(h.sessionId, h.csrfToken),
      payload: { requestId: randomUUID(), expectedUiRevision: 2, weeks: 1 },
    });
    expect(step.statusCode).toBe(200);

    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(200);
    const view = body(latest.body).data as Record<string, unknown>;
    expect(view.resultUiRevision).toBe(2);
    expect(view.sourceWorldUiRevision).toBe(1);
    expect(body(latest.body).uiRevision).toBe(3);
  });

  it("returns 404 before any mock battle and 409 before start", async () => {
    const freshApp = await boot();
    app = freshApp;
    const { sessionId } = await openSession(freshApp);
    const notStarted = await freshApp.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/latest`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(notStarted.statusCode).toBe(409);
    expect(body(notStarted.body).error?.code).toBe("SIMULATION_NOT_STARTED");

    const h = await harness();
    await app.close();
    app = h.app;
    const empty = await getLatest(h);
    expect(empty.statusCode).toBe(404);
    expect(body(empty.body).error?.code).toBe("NOT_FOUND");

    const noReplay = await postReplay(h, 1);
    expect(noReplay.statusCode).toBe(404);
    expect(h.uiSession.uiRevision).toBe(1);
  });

  it("FI-047: same participant A==B is 400 before journal/RNG", async () => {
    const h = await harness();
    app = h.app;
    const same = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personA,
    });
    expect(same.statusCode).toBe(400);
    expect(body(same.body).error?.code).toBe("INVALID_REQUEST");
    expect(h.uiSession.uiRevision).toBe(1);
    expect(h.uiSession.requestJournal.size).toBe(1);
    expect(h.uiSession.mockBattleStore.latest).toBeNull();
  });

  it("rejects malformed participant requests with 400", async () => {
    const h = await harness();
    app = h.app;
    const extra = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
      extra: { battleKind: "official" },
    });
    expect(extra.statusCode).toBe(400);

    const missing = await postMockBattle(h, { expectedUiRevision: 1 });
    expect(missing.statusCode).toBe(400);
    expect(h.uiSession.uiRevision).toBe(1);
  });

  it("returns 404 for unknown participants without accepting the operation", async () => {
    const h = await harness();
    app = h.app;
    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: "person_999999",
    });
    expect(response.statusCode).toBe(404);
    expect(body(response.body).error?.code).toBe("NOT_FOUND");
    expect(h.uiSession.uiRevision).toBe(1);
    expect(h.uiSession.requestJournal.size).toBe(1);
  });

  it("FI-048: ineligible participants surface 422 BATTLE_PRE_START_FAILURE", async () => {
    const h = await harness();
    app = h.app;
    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.child,
    });
    expect(response.statusCode).toBe(422);
    const envelope = body(response.body);
    expect(envelope.error?.code).toBe("BATTLE_PRE_START_FAILURE");
    expect(envelope.error?.commitState).toBe("none");
    expect(envelope.isUpdating).toBe(true);
    const validation = envelope.error?.validation as { ok: boolean; issues: unknown[] }[];
    expect(validation).toHaveLength(1);
    expect(validation[0]?.ok).toBe(false);
    expect(Array.isArray(validation[0]?.issues)).toBe(true);
    expect(h.uiSession.uiRevision).toBe(1);
    expect(h.uiSession.mockBattleStore.latest).toBeNull();
  });

  it("replays the journal for a repeated requestId and conflicts on a changed pair", async () => {
    const h = await harness();
    app = h.app;
    const requestId = randomUUID();
    const first = await postMockBattle(h, {
      requestId,
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(first.statusCode).toBe(200);
    const replayed = await postMockBattle(h, {
      requestId,
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(replayed.statusCode).toBe(200);
    expect(replayed.body).toBe(first.body);
    expect(h.uiSession.uiRevision).toBe(2);

    // FIX-080: a swapped ordered pair under the same requestId is a different operation.
    const swapped = await postMockBattle(h, {
      requestId,
      expectedUiRevision: 1,
      participantAId: h.personB,
      participantBId: h.personA,
    });
    expect(swapped.statusCode).toBe(409);
    expect(body(swapped.body).error?.code).toBe("REQUEST_ID_CONFLICT");
  });

  it("rejects a stale expectedUiRevision with 409", async () => {
    const h = await harness();
    app = h.app;
    await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    const stale = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(stale.statusCode).toBe(409);
    expect(body(stale.body).error?.code).toBe("STALE_UI_REVISION");
  });

  it("FI-049: a post-start execution abort is 500 commitState=none", async () => {
    const h = await harness({
      mockBattleHooks: {
        throwOnBattleExecution: () => {
          throw new BattleExecutionAbortError({
            failureKind: "dependency_failure",
            stage: "build_commit_plan",
            issues: [{ path: "/injected", message: "injected abort" }],
          });
        },
      },
    });
    app = h.app;
    const before = canonicalWorldJson(h.uiSession);
    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(response.statusCode).toBe(500);
    const envelope = body(response.body);
    expect(envelope.error?.code).toBe("INTERNAL_ERROR");
    expect(envelope.error?.commitState).toBe("none");
    expect(envelope.isUpdating).toBe(true);
    expect(h.uiSession.uiRevision).toBe(1);
    expect(h.uiSession.mockBattleStore.latest).toBeNull();
    expect(canonicalWorldJson(h.uiSession)).toBe(before);
  });

  it("FI-050: a serialization failure before commit leaves the store untouched", async () => {
    const h = await harness({ mockBattleHooks: { failSerializeBeforeCommit: true } });
    app = h.app;
    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(response.statusCode).toBe(500);
    expect(body(response.body).error?.commitState).toBe("none");
    expect(body(response.body).isUpdating).toBe(true);
    expect(h.uiSession.uiRevision).toBe(1);
    expect(h.uiSession.mockBattleStore.latest).toBeNull();

    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(404);
  });

  it("FI-051: a transport failure after commit reports commitState=complete", async () => {
    const h = await harness({ mockBattleHooks: { failTransportAfterCommit: true } });
    app = h.app;
    const response = await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    expect(response.statusCode).toBe(500);
    const envelope = body(response.body);
    expect(envelope.error?.commitState).toBe("complete");
    expect(envelope.error?.completedUiRevision).toBe(2);
    expect(envelope.refreshRequired).toBe(true);
    expect(h.uiSession.uiRevision).toBe(2);

    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(200);
  });

  it("FI-052: corrupted replay checkpoint fails GET/replay with 500 (no self-heal)", async () => {
    const h = await harness();
    app = h.app;
    await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    const brokenCheckpoint = {
      ...(record.replaySnapshot.runtimeCheckpoint as Record<string, unknown>),
      schemaVersion: "tampered",
    };
    h.uiSession.mockBattleStore = {
      schemaVersion: "0.2.0",
      latest: reseal({
        ...record,
        replaySnapshot: {
          ...record.replaySnapshot,
          runtimeCheckpoint: brokenCheckpoint,
        },
      }),
    };
    expect((await getLatest(h)).statusCode).toBe(500);
    const replay = await postReplay(h, 2);
    expect(replay.statusCode).toBe(500);
    expect(body(replay.body).error?.commitState).toBe("none");
    expect(h.uiSession.uiRevision).toBe(2);
  });

  it("FI-053: replay after world advance still exact from saved checkpoint", async () => {
    const h = await harness();
    app = h.app;
    const first = body(
      (
        await postMockBattle(h, {
          expectedUiRevision: 1,
          participantAId: h.personA,
          participantBId: h.personB,
        })
      ).body,
    ).data as { result: Record<string, unknown> };

    const step = await h.app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: postHeaders(h.sessionId, h.csrfToken),
      payload: { requestId: randomUUID(), expectedUiRevision: 2, weeks: 1 },
    });
    expect(step.statusCode).toBe(200);

    const replayResponse = await postReplay(h, 3);
    expect(replayResponse.statusCode).toBe(200);
    const replayData = body(replayResponse.body).data as {
      result: Record<string, unknown>;
    };
    const strip = (view: Record<string, unknown>) => {
      const { resultUiRevision: _drop, ...rest } = view;
      void _drop;
      return rest;
    };
    expect(strip(replayData.result)).toEqual(strip(first.result));
    expect(replayData.result.sourceWorldUiRevision).toBe(1);
  });

  it("FI-054: tampered latestRecordHash fails GET latest with 500", async () => {
    const h = await harness();
    app = h.app;
    await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    h.uiSession.mockBattleStore = {
      schemaVersion: "0.2.0",
      latest: { ...record, latestRecordHash: "0".repeat(64) },
    };
    const latest = await getLatest(h);
    expect(latest.statusCode).toBe(500);
    expect(body(latest.body).error?.code).toBe("INTERNAL_ERROR");
  });

  it("FI-055: A/B swap tamper on stored result fails GET latest with 500", async () => {
    const h = await harness();
    app = h.app;
    await postMockBattle(h, {
      expectedUiRevision: 1,
      participantAId: h.personA,
      participantBId: h.personB,
    });
    const record = h.uiSession.mockBattleStore.latest as MockBattleLatestRecord;
    const br = record.battleResult as Record<string, unknown>;
    h.uiSession.mockBattleStore = {
      schemaVersion: "0.2.0",
      latest: reseal({
        ...record,
        battleResult: {
          ...br,
          participantAId: br.participantBId,
          participantBId: br.participantAId,
        },
      }),
    };
    expect((await getLatest(h)).statusCode).toBe(500);
  });

  it("FI-056: repeated new mock on unchanged world is exact for battle identity fields", async () => {
    const h = await harness();
    app = h.app;
    const first = body(
      (
        await postMockBattle(h, {
          expectedUiRevision: 1,
          participantAId: h.personA,
          participantBId: h.personB,
        })
      ).body,
    ).data as { result: Record<string, unknown> };

    const second = body(
      (
        await postMockBattle(h, {
          expectedUiRevision: 2,
          participantAId: h.personA,
          participantBId: h.personB,
        })
      ).body,
    ).data as { result: Record<string, unknown> };

    expect(second.result.matchId).toBe(first.result.matchId);
    expect(second.result.battleSeed).toBe(first.result.battleSeed);
    expect(second.result.finalRngState).toEqual(first.result.finalRngState);
    expect(second.result.eventCandidates).toEqual(first.result.eventCandidates);
    expect(second.result.resultUiRevision).toBe(3);
    expect(second.result.sourceWorldUiRevision).toBe(2);
  });

  it("rejects query parameters on GET latest with 400", async () => {
    const h = await harness();
    app = h.app;
    const response = await h.app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/latest?x=1`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${h.sessionId}` },
    });
    expect(response.statusCode).toBe(400);
    expect(body(response.body).error?.code).toBe("INVALID_REQUEST");
  });

  it("ACC-165/BRIDGE-115: accepted 422/500 isUpdating=true; success false; replay preserves bytes after lock release", async () => {
    const hSuccess = await harness();
    app = hSuccess.app;
    const success = await postMockBattle(hSuccess, {
      expectedUiRevision: 1,
      participantAId: hSuccess.personA,
      participantBId: hSuccess.personB,
    });
    expect(success.statusCode).toBe(200);
    expect(body(success.body).isUpdating).toBe(false);
    await hSuccess.app.close();
    app = undefined;

    const h422 = await harness();
    app = h422.app;
    const requestId422 = randomUUID();
    const fail422 = await postMockBattle(h422, {
      requestId: requestId422,
      expectedUiRevision: 1,
      participantAId: h422.personA,
      participantBId: h422.child,
    });
    expect(fail422.statusCode).toBe(422);
    expect(body(fail422.body).isUpdating).toBe(true);
    expect(h422.uiSession.updateControl).toBeNull();
    const replay422 = await postMockBattle(h422, {
      requestId: requestId422,
      expectedUiRevision: 1,
      participantAId: h422.personA,
      participantBId: h422.child,
    });
    expect(replay422.statusCode).toBe(422);
    expect(replay422.body).toBe(fail422.body);
    expect(body(replay422.body).isUpdating).toBe(true);
    await h422.app.close();
    app = undefined;

    const h500 = await harness({
      mockBattleHooks: {
        throwOnBattleExecution: () => {
          throw new BattleExecutionAbortError({
            failureKind: "dependency_failure",
            stage: "build_commit_plan",
            issues: [{ path: "/injected", message: "injected abort" }],
          });
        },
      },
    });
    app = h500.app;
    const fail500 = await postMockBattle(h500, {
      expectedUiRevision: 1,
      participantAId: h500.personA,
      participantBId: h500.personB,
    });
    expect(fail500.statusCode).toBe(500);
    expect(body(fail500.body).isUpdating).toBe(true);
  });
});
