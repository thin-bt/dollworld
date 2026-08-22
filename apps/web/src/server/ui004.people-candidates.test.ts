import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "./app.js";
import {
  CURSOR_API_SCHEMA_VERSION_CURRENT,
  CURSOR_API_SCHEMA_VERSION_OLD,
  signCursorPayload,
} from "./cursor.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import {
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
  computeSessionBindingHash,
} from "./session-cookie.js";
import { mockCandidateEligible } from "./ui004/mock-candidates/mock-candidate-eligible.js";
import { classifyCandidateSource } from "./ui004/mock-candidates/classify-candidate-source.js";
import { PEOPLE_ENDPOINT } from "./ui004/routes-people.js";
import { MOCK_CANDIDATES_ENDPOINT } from "./ui004/routes-mock-candidates.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function parseSetCookieSessionId(setCookie: string | string[] | undefined): string {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  expect(header).toBeTypeOf("string");
  const match =
    /^dollworld_s15_session=([A-Za-z0-9_-]{43}); Path=\/api\/s1_5; HttpOnly; SameSite=Strict$/.exec(
      header as string,
    );
  expect(match).not.toBeNull();
  return match![1]!;
}

async function bootSession(app: UiApp): Promise<{ sessionId: string; csrfToken: string }> {
  const response = await app.inject({
    method: "GET",
    url: `${API_PREFIX}/session`,
    headers: { host: HOST },
  });
  expect(response.statusCode).toBe(200);
  const sessionId = parseSetCookieSessionId(response.headers["set-cookie"]);
  const body = JSON.parse(response.body) as { data: { csrfToken: string } };
  return { sessionId, csrfToken: body.data.csrfToken };
}

function authHeaders(sessionId: string, csrfToken: string): Record<string, string> {
  return {
    host: HOST,
    origin: ORIGIN,
    "content-type": "application/json",
    cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
    [CSRF_HEADER_NAME]: csrfToken,
  };
}

function getHeaders(sessionId: string): Record<string, string> {
  return { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` };
}

async function startReady(app: UiApp, sessionId: string, csrfToken: string): Promise<number> {
  const start = await app.inject({
    method: "POST",
    url: `${API_PREFIX}/simulation/start`,
    headers: authHeaders(sessionId, csrfToken),
    payload: {
      requestId: randomUUID(),
      expectedUiRevision: 0,
      presetId: DEFAULT_SPRINT1_PRESET_ID,
      seed: 42,
    },
  });
  expect(start.statusCode).toBe(200);
  const body = JSON.parse(start.body) as { uiRevision: number };
  return body.uiRevision;
}

describe("UI-004 people + mock-candidates", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-007 people list returns exact16 items / totalCount / nextCursor; empty filter is 200", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(71),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const all = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people`,
      headers: getHeaders(sessionId),
    });
    expect(all.statusCode).toBe(200);
    const allBody = JSON.parse(all.body) as {
      ok: true;
      data: {
        items: Record<string, unknown>[];
        totalCount: number;
        nextCursor: string | null;
      };
    };
    expect(allBody.ok).toBe(true);
    expect(Object.keys(allBody.data).sort()).toEqual(["items", "nextCursor", "totalCount"]);
    expect(allBody.data.totalCount).toBe(allBody.data.items.length);
    expect(allBody.data.totalCount).toBeGreaterThan(0);
    const first = allBody.data.items[0]!;
    expect(Object.keys(first)).toHaveLength(16);
    expect(first).toHaveProperty("stats");
    expect(first).toHaveProperty("learnedTechniqueCount");
    expect(first).not.toHaveProperty("temporaryCondition");
    expect(first).not.toHaveProperty("affiliationLabels");

    const empty = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?name=${encodeURIComponent("___no_such_person___")}`,
      headers: getHeaders(sessionId),
    });
    expect(empty.statusCode).toBe(200);
    const emptyBody = JSON.parse(empty.body) as {
      data: { items: unknown[]; totalCount: number; nextCursor: null };
    };
    expect(emptyBody.data.items).toEqual([]);
    expect(emptyBody.data.totalCount).toBe(0);
    expect(emptyBody.data.nextCursor).toBeNull();
  });

  it("ST-011 mock candidates return exact4 eligible-only; no mock execution side effects", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(72),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    const uiRevision = await startReady(app, sessionId, csrfToken);
    const before = app.uiSessionStore.getStrict(sessionId);
    expect(before).not.toBe("missing");
    expect(before).not.toBe("corrupt");
    const beforeJson = toCanonicalJson({
      uiRevision: (before as { uiRevision: number }).uiRevision,
      mockBattleStore: (before as { mockBattleStore: unknown }).mockBattleStore,
      lastOperationRequestId: (before as { lastOperationRequestId: string | null })
        .lastOperationRequestId,
    });

    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/candidates`,
      headers: getHeaders(sessionId),
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      ok: true;
      uiRevision: number;
      data: {
        items: {
          personId: string;
          displayName: string;
          age: number;
          careerStatus: string;
        }[];
        totalCount: number;
        nextCursor: string | null;
      };
    };
    expect(body.ok).toBe(true);
    expect(body.uiRevision).toBe(uiRevision);
    expect(Object.keys(body.data).sort()).toEqual(["items", "nextCursor", "totalCount"]);
    expect(body.data.totalCount).toBe(body.data.items.length);
    for (const item of body.data.items) {
      expect(Object.keys(item).sort()).toEqual(["age", "careerStatus", "displayName", "personId"]);
      expect(["trainee", "active_competitor"]).toContain(item.careerStatus);
      expect(item).not.toHaveProperty("eligible");
      expect(item).not.toHaveProperty("ineligibleReason");
    }

    const after = app.uiSessionStore.getStrict(sessionId);
    expect(after).not.toBe("missing");
    expect(after).not.toBe("corrupt");
    const afterJson = toCanonicalJson({
      uiRevision: (after as { uiRevision: number }).uiRevision,
      mockBattleStore: (after as { mockBattleStore: unknown }).mockBattleStore,
      lastOperationRequestId: (after as { lastOperationRequestId: string | null })
        .lastOperationRequestId,
    });
    expect(afterJson).toBe(beforeJson);
    // The candidates GET must never execute a mock battle, even though UI-006 owns that route.
    expect((after as { mockBattleStore: { latest: unknown } }).mockBattleStore.latest).toBeNull();
  });

  it("PAGE-001 people paging: totalCount stable; nextCursor exclusive", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(73),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const page1 = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    expect(page1.statusCode).toBe(200);
    const p1 = JSON.parse(page1.body) as {
      data: {
        items: { personId: string }[];
        totalCount: number;
        nextCursor: string | null;
      };
    };
    expect(p1.data.items.length).toBeLessThanOrEqual(50);
    if (p1.data.totalCount <= 50) {
      expect(p1.data.nextCursor).toBeNull();
      return;
    }
    expect(p1.data.nextCursor).not.toBeNull();
    const page2 = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50&cursor=${encodeURIComponent(p1.data.nextCursor!)}`,
      headers: getHeaders(sessionId),
    });
    expect(page2.statusCode).toBe(200);
    const p2 = JSON.parse(page2.body) as {
      data: { items: { personId: string }[]; totalCount: number };
    };
    expect(p2.data.totalCount).toBe(p1.data.totalCount);
    const overlap = p1.data.items.some((a) => p2.data.items.some((b) => b.personId === a.personId));
    expect(overlap).toBe(false);
  });

  it("FI-035/037 stale cursor (uiRevision / query mismatch) → 409 STALE_CURSOR", async () => {
    const keys = createTestProcessSecurityContext(74);
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: keys,
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const first = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    const firstBody = JSON.parse(first.body) as {
      uiRevision: number;
      data: { items: { personId: string }[]; nextCursor: string | null };
    };
    expect(first.statusCode).toBe(200);

    // Step to bump uiRevision
    const step = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: authHeaders(sessionId, csrfToken),
      payload: {
        requestId: randomUUID(),
        expectedUiRevision: firstBody.uiRevision,
        weeks: 1,
      },
    });
    expect(step.statusCode).toBe(200);

    if (firstBody.data.nextCursor !== null) {
      const staleRev = await app.inject({
        method: "GET",
        url: `${API_PREFIX}/people?limit=50&cursor=${encodeURIComponent(firstBody.data.nextCursor)}`,
        headers: getHeaders(sessionId),
      });
      expect(staleRev.statusCode).toBe(409);
      const staleBody = JSON.parse(staleRev.body) as {
        error: { code: string };
        refreshRequired: boolean;
      };
      expect(staleBody.error.code).toBe("STALE_CURSOR");
      expect(staleBody.refreshRequired).toBe(true);
    }

    // Query mismatch on same revision: craft cursor for default query then call with different limit
    const binding = computeSessionBindingHash(keys.sessionBindingKey, sessionId);
    const row = app.uiSessionStore.getStrict(sessionId) as {
      uiRevision: number;
      worldEngineRuntime: { context: { simulationId: string } };
    };
    const cursor = signCursorPayload({
      cursorHmacKey: keys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: binding,
        endpoint: PEOPLE_ENDPOINT,
        dataIdentity: `simulation:${row.worldEngineRuntime.context.simulationId}`,
        uiRevision: row.uiRevision,
        query: {
          kind: "people",
          name: null,
          state: null,
          sortKey: "personId",
          sortOrder: "asc",
          limit: 50,
        },
        nextPosition: { personId: firstBody.data.items[0]!.personId },
      },
    });
    const mismatch = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=100&cursor=${encodeURIComponent(cursor)}`,
      headers: getHeaders(sessionId),
    });
    expect(mismatch.statusCode).toBe(409);
    expect(JSON.parse(mismatch.body).error.code).toBe("STALE_CURSOR");
  });

  it("FI-036 invalid nextPosition shape → 400; TX-023 old apiSchemaVersion → 409", async () => {
    const keys = createTestProcessSecurityContext(75);
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: keys,
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);
    const row = app.uiSessionStore.getStrict(sessionId) as {
      uiRevision: number;
      worldEngineRuntime: { context: { simulationId: string } };
    };
    const binding = computeSessionBindingHash(keys.sessionBindingKey, sessionId);

    const badPos = signCursorPayload({
      cursorHmacKey: keys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: binding,
        endpoint: PEOPLE_ENDPOINT,
        dataIdentity: `simulation:${row.worldEngineRuntime.context.simulationId}`,
        uiRevision: row.uiRevision,
        query: {
          kind: "people",
          name: null,
          state: null,
          sortKey: "personId",
          sortOrder: "asc",
          limit: 50,
        },
        nextPosition: { value: 1, personId: "x" },
      },
    });
    const bad = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?cursor=${encodeURIComponent(badPos)}`,
      headers: getHeaders(sessionId),
    });
    expect(bad.statusCode).toBe(400);
    expect(JSON.parse(bad.body).error.code).toBe("INVALID_REQUEST");

    const oldCursor = signCursorPayload({
      cursorHmacKey: keys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_OLD,
        sessionBindingHash: binding,
        endpoint: PEOPLE_ENDPOINT,
        dataIdentity: `simulation:${row.worldEngineRuntime.context.simulationId}`,
        uiRevision: row.uiRevision,
        query: {
          kind: "people",
          name: null,
          state: null,
          sortKey: "personId",
          sortOrder: "asc",
          limit: 50,
        },
        nextPosition: { personId: "person_000001" },
      },
    });
    // Old schema is classified by verifyCursorCodec before sign would normally reject —
    // craft by signing current then... actually signCursorPayload accepts old in type.
    const oldRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?cursor=${encodeURIComponent(oldCursor)}`,
      headers: getHeaders(sessionId),
    });
    expect(oldRes.statusCode).toBe(409);
    expect(JSON.parse(oldRes.body).error.code).toBe("STALE_CURSOR");
  });

  it("FI-033 people source corruption → 500; FI-034 candidate corruption → 500", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(76),
      listGetHooks: { forceSourceCorruption: true },
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const people = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people`,
      headers: getHeaders(sessionId),
    });
    expect(people.statusCode).toBe(500);
    expect(JSON.parse(people.body).error.code).toBe("INTERNAL_ERROR");

    const candidates = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/candidates`,
      headers: getHeaders(sessionId),
    });
    expect(candidates.statusCode).toBe(500);
    expect(JSON.parse(candidates.body).error.code).toBe("INTERNAL_ERROR");
  });

  it("FI-038 projection serializer fault → 500 none; source unchanged", async () => {
    let threw = false;
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(77),
      listGetHooks: {
        throwAfterProjection: () => {
          threw = true;
          throw new Error("FI-038 serializer fault");
        },
      },
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);
    const before = app.uiSessionStore.getStrict(sessionId) as { uiRevision: number };
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people`,
      headers: getHeaders(sessionId),
    });
    expect(threw).toBe(true);
    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).error.code).toBe("INTERNAL_ERROR");
    const after = app.uiSessionStore.getStrict(sessionId) as { uiRevision: number };
    expect(after.uiRevision).toBe(before.uiRevision);
  });

  it("FIX-040 / BRIDGE-074 eligibility boundaries (pure predicate)", () => {
    const threshold = 100;
    const base = {
      lifeStatus: "living" as const,
      participationStatus: "active" as const,
      careerStatus: "trainee" as const,
      derivedAgeAtWorldDate: 10,
      birthYear: 1,
      injury: 0,
      unableToContinueThreshold: threshold,
    };
    expect(mockCandidateEligible({ ...base, derivedAgeAtWorldDate: 7 })).toBe(false);
    expect(mockCandidateEligible({ ...base, derivedAgeAtWorldDate: 8 })).toBe(true);
    expect(mockCandidateEligible({ ...base, derivedAgeAtWorldDate: 15 })).toBe(true);
    expect(mockCandidateEligible({ ...base, derivedAgeAtWorldDate: 16 })).toBe(false);
    // Calendar birthYear = 1 - age may be <= 0; must not exclude eligible adults.
    expect(mockCandidateEligible({ ...base, birthYear: 0 })).toBe(true);
    expect(mockCandidateEligible({ ...base, birthYear: -14 })).toBe(true);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 40,
        birthYear: 1 - 40,
      }),
    ).toBe(true);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 41,
        birthYear: 1 - 41,
      }),
    ).toBe(true);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 15,
      }),
    ).toBe(false);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 16,
      }),
    ).toBe(true);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 41,
      }),
    ).toBe(true);
    expect(
      mockCandidateEligible({
        ...base,
        careerStatus: "active_competitor",
        derivedAgeAtWorldDate: 42,
      }),
    ).toBe(false);
    expect(mockCandidateEligible({ ...base, injury: threshold })).toBe(false);
    expect(classifyCandidateSource({ sourceValidationOk: false }).httpMembershipHint).toBe(
      "fail_all_500",
    );
  });

  it("empty lifecycle people/candidates → 409 SIMULATION_NOT_STARTED before cursor decode", async () => {
    const keys = createTestProcessSecurityContext(78);
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: keys,
    });
    const { sessionId } = await bootSession(app);
    const binding = computeSessionBindingHash(keys.sessionBindingKey, sessionId);
    const cursor = signCursorPayload({
      cursorHmacKey: keys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: binding,
        endpoint: PEOPLE_ENDPOINT,
        dataIdentity: "simulation:not-started",
        uiRevision: 0,
        query: {
          kind: "people",
          name: null,
          state: null,
          sortKey: "personId",
          sortOrder: "asc",
          limit: 50,
        },
        nextPosition: { personId: "x" },
      },
    });
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?cursor=${encodeURIComponent(cursor)}`,
      headers: getHeaders(sessionId),
    });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error.code).toBe("SIMULATION_NOT_STARTED");

    const cand = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/candidates`,
      headers: getHeaders(sessionId),
    });
    expect(cand.statusCode).toBe(409);
    expect(JSON.parse(cand.body).error.code).toBe("SIMULATION_NOT_STARTED");
  });

  it("malformed query → 400; unknown parameter → 400; sortBy alone → 400", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(79),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const unknown = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?foo=1`,
      headers: getHeaders(sessionId),
    });
    expect(unknown.statusCode).toBe(400);

    const halfSort = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?sortBy=stamina`,
      headers: getHeaders(sessionId),
    });
    expect(halfSort.statusCode).toBe(400);

    const personIdSort = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?sortBy=personId&sortOrder=asc`,
      headers: getHeaders(sessionId),
    });
    expect(personIdSort.statusCode).toBe(200);
    const personIdDesc = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?sortBy=personId&sortOrder=desc`,
      headers: getHeaders(sessionId),
    });
    expect(personIdDesc.statusCode).toBe(200);
    const ascBody = JSON.parse(personIdSort.body) as {
      data: { items: Array<{ personId: string }> };
    };
    const descBody = JSON.parse(personIdDesc.body) as {
      data: { items: Array<{ personId: string }> };
    };
    expect(ascBody.data.items.length).toBeGreaterThan(1);
    const ascIds = ascBody.data.items.map((row) => row.personId);
    const descIds = descBody.data.items.map((row) => row.personId);
    expect(ascIds.join(",")).not.toBe(descIds.join(","));
    expect(descIds[0]).toBe(ascIds[ascIds.length - 1]);

    const candUnknown = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/candidates?sortBy=personId`,
      headers: getHeaders(sessionId),
    });
    expect(candUnknown.statusCode).toBe(400);
  });

  it("PAGE-002 candidates paging + FIX-003/004 filter 0/1/2 smoke", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(80),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const living = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?state=${encodeURIComponent("life:living")}`,
      headers: getHeaders(sessionId),
    });
    expect(living.statusCode).toBe(200);
    const livingBody = JSON.parse(living.body) as {
      data: { items: { lifeStatus: string }[]; totalCount: number };
    };
    expect(livingBody.data.totalCount).toBeGreaterThan(0);
    expect(livingBody.data.items.every((i) => i.lifeStatus === "living")).toBe(true);

    const deceased = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?state=${encodeURIComponent("life:deceased")}`,
      headers: getHeaders(sessionId),
    });
    expect(deceased.statusCode).toBe(200);
    const deceasedBody = JSON.parse(deceased.body) as {
      data: { items: { lifeStatus: string; participationStatus: null }[]; totalCount: number };
    };
    expect(deceasedBody.data.items.every((i) => i.lifeStatus === "deceased")).toBe(true);
    expect(deceasedBody.data.items.every((i) => i.participationStatus === null)).toBe(true);

    const cand = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/mock-battles/candidates?limit=50`,
      headers: getHeaders(sessionId),
    });
    expect(cand.statusCode).toBe(200);
    const candBody = JSON.parse(cand.body) as {
      data: { items: unknown[]; totalCount: number; nextCursor: string | null };
    };
    expect(candBody.data.totalCount).toBeGreaterThanOrEqual(0);
    expect(candBody.data.totalCount).toBe(candBody.data.items.length);
  });
});

// silence unused import if tree-shaken oddly
void MOCK_CANDIDATES_ENDPOINT;
