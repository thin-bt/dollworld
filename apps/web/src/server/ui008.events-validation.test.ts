/**
 * UI-008 API-009/010 events + validation-results integration tests.
 */

import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type CreateUiAppOptions, type UiApp } from "./app.js";
import { CURSOR_API_SCHEMA_VERSION_CURRENT, signCursorPayload } from "./cursor.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import {
  computeSessionBindingHash,
  CSRF_HEADER_NAME,
  SESSION_COOKIE_NAME,
} from "./session-cookie.js";
import { EVENTS_ENDPOINT } from "./ui008/routes-events.js";
import { VALIDATION_RESULTS_ENDPOINT } from "./ui008/routes-validation.js";
import { EVENT_ENVELOPE_TOP_LEVEL_KEYS, VALIDATION_RESULT_VIEW_ITEM_KEYS } from "./ui008/types.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

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

async function bootSession(app: UiApp): Promise<{ sessionId: string; csrfToken: string }> {
  const response = await app.inject({
    method: "GET",
    url: `${API_PREFIX}/session`,
    headers: { host: HOST },
  });
  expect(response.statusCode).toBe(200);
  const sessionId = parseSetCookieSessionId(response.headers["set-cookie"]);
  const parsed = body(response.body);
  return { sessionId, csrfToken: (parsed.data as { csrfToken: string }).csrfToken };
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
  return body(start.body).uiRevision as number;
}

async function readyApp(hooks?: {
  eventsHooks?: CreateUiAppOptions["eventsHooks"];
  validationHooks?: CreateUiAppOptions["validationHooks"];
}): Promise<{
  app: UiApp;
  sessionId: string;
  csrfToken: string;
  uiRevision: number;
  processKeys: ReturnType<typeof createTestProcessSecurityContext>;
}> {
  const processKeys = createTestProcessSecurityContext(88);
  const app = await createUiApp({
    publicOrigin: ORIGIN,
    repoRoot: REPO_ROOT,
    processKeys,
    ...(hooks?.eventsHooks !== undefined ? { eventsHooks: hooks.eventsHooks } : {}),
    ...(hooks?.validationHooks !== undefined ? { validationHooks: hooks.validationHooks } : {}),
  });
  const { sessionId, csrfToken } = await bootSession(app);
  const uiRevision = await startReady(app, sessionId, csrfToken);
  return { app, sessionId, csrfToken, uiRevision, processKeys };
}

describe("UI-008 events + validation-results", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-009: events exact11 items + exact3 data; empty filter 200", async () => {
    const h = await readyApp();
    app = h.app;

    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(200);
    const env = body(res.body);
    expect(env.ok).toBe(true);
    expect(Object.keys(env.data!).sort()).toEqual(["items", "nextCursor", "totalCount"]);
    const items = env.data!.items as Record<string, unknown>[];
    expect(items.length).toBeGreaterThan(0);
    expect(env.data!.totalCount as number).toBe(items.length);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([...EVENT_ENVELOPE_TOP_LEVEL_KEYS].sort());
      expect(Object.keys(item)).toHaveLength(11);
    }

    const miss = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?eventType=does.not.exist.anywhere`,
      headers: getHeaders(h.sessionId),
    });
    expect(miss.statusCode).toBe(200);
    const missBody = body(miss.body);
    expect(missBody.data!.totalCount).toBe(0);
    expect(missBody.data!.items).toEqual([]);
  });

  it("ST-010: validation exact5/2/3 success/failure mapping", async () => {
    const seededItems = [
      { validationOccurrence: 1, result: { ok: true } },
      {
        validationOccurrence: 2,
        result: {
          ok: false,
          issues: [
            { path: "/a", message: "bad", actual: 1, expected: "2" },
            { path: "/b", message: "also" },
          ],
        },
      },
    ];
    const h = await readyApp({
      validationHooks: { overrideStoreItems: seededItems },
    });
    app = h.app;

    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(200);
    const env = body(res.body);
    expect(Object.keys(env.data!).sort()).toEqual(["items", "nextCursor", "totalCount"]);
    const items = env.data!.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(Object.keys(items[0]!)).toEqual([...VALIDATION_RESULT_VIEW_ITEM_KEYS]);
    expect(items[0]!.status).toBe("success");
    expect(items[0]!.issueCount).toBe(0);
    expect(items[0]!.issues).toEqual([]);
    expect(items[1]!.status).toBe("failure");
    expect(items[1]!.issueCount).toBe(2);
    const issues = items[1]!.issues as { path: string; message: string }[];
    expect(Object.keys(issues[0]!).sort()).toEqual(["message", "path"]);
    expect((items[1]!.result as { issues: unknown[] }).issues[0]).toEqual({
      path: "/a",
      message: "bad",
      actual: 1,
      expected: "2",
    });
    expect("code" in items[1]!).toBe(false);
  });

  it("FI-063: personId filter uses entities.personIds only (payload spoof)", async () => {
    const processKeys = createTestProcessSecurityContext(88);
    const boot = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys,
    });
    const { sessionId, csrfToken } = await bootSession(boot);
    await startReady(boot, sessionId, csrfToken);
    const session = boot.uiSessionStore.getStrict(sessionId);
    if (session === "missing" || session === "corrupt" || session.worldEngineRuntime === null) {
      throw new Error("session not ready");
    }
    const spoofId = "person_999998";
    const spoofedStream = session.worldEngineRuntime.runtimeState.eventStream.map((ev, i) => {
      const row = structuredClone(ev) as {
        entities: { personIds: string[] };
        payload: Record<string, unknown>;
      };
      if (i === 0) {
        row.payload = { ...row.payload, personId: spoofId };
        row.entities = {
          ...row.entities,
          personIds: row.entities.personIds.filter((id) => id !== spoofId),
        };
      }
      return row;
    });
    await boot.close();

    const h = await readyApp({
      eventsHooks: { overrideEventStream: spoofedStream as unknown[] },
    });
    app = h.app;

    const spoofed = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?personId=${spoofId}`,
      headers: getHeaders(h.sessionId),
    });
    expect(spoofed.statusCode).toBe(200);
    expect(body(spoofed.body).data!.totalCount).toBe(0);
  });

  it("eventGroup training / technique_learning; mastery excluded; conflict 400", async () => {
    const h = await readyApp();
    app = h.app;

    const training = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?eventGroup=training`,
      headers: getHeaders(h.sessionId),
    });
    expect(training.statusCode).toBe(200);
    const trainingItems = body(training.body).data!.items as { eventType: string }[];
    for (const item of trainingItems) {
      expect(item.eventType.startsWith("training.")).toBe(true);
    }

    const tech = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?eventGroup=technique_learning`,
      headers: getHeaders(h.sessionId),
    });
    expect(tech.statusCode).toBe(200);
    const techItems = body(tech.body).data!.items as { eventType: string }[];
    for (const item of techItems) {
      expect(
        item.eventType === "technique.learning_progressed" ||
          item.eventType === "technique.acquired",
      ).toBe(true);
      expect(item.eventType).not.toBe("technique.mastery_increased");
    }

    const conflict = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?eventType=training.rest_applied&eventGroup=training`,
      headers: getHeaders(h.sessionId),
    });
    expect(conflict.statusCode).toBe(400);
    const err = body(conflict.body);
    expect(err.error!.code).toBe("INVALID_REQUEST");
    expect(err.error!.commitState).toBe("none");
    const fieldErrors = err.error!.fieldErrors as { field: string; code: string }[];
    expect(fieldErrors.some((f) => f.code === "conflicting_fields")).toBe(true);
  });

  it("MIG-014: validation ?code= rejected as INVALID_REQUEST", async () => {
    const h = await readyApp();
    app = h.app;
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results?code=X`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(400);
    expect(body(res.body).error!.code).toBe("INVALID_REQUEST");
    expect(body(res.body).error!.commitState).toBe("none");
  });

  it("FI-062: corrupt event → 500 never skip", async () => {
    const h = await readyApp({ eventsHooks: { corruptEventIndex: 0 } });
    app = h.app;
    const before = h.app.uiSessionStore.getStrict(h.sessionId);
    if (before === "missing" || before === "corrupt") {
      throw new Error("session missing");
    }
    const beforeLen = before.worldEngineRuntime!.runtimeState.eventStream.length;
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(500);
    expect(body(res.body).error!.code).toBe("INTERNAL_ERROR");
    expect(body(res.body).error!.commitState).toBe("none");
    const after = h.app.uiSessionStore.getStrict(h.sessionId);
    if (after !== "missing" && after !== "corrupt") {
      expect(after.worldEngineRuntime!.runtimeState.eventStream.length).toBe(beforeLen);
    }
  });

  it("FI-064: occurrence gap → 500 no renumber", async () => {
    const h = await readyApp({ validationHooks: { forceOccurrenceGap: true } });
    app = h.app;
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(500);
    expect(body(res.body).error!.code).toBe("INTERNAL_ERROR");
    expect(body(res.body).error!.commitState).toBe("none");
  });

  it("FI-065: corrupt issue → 500", async () => {
    const h = await readyApp({
      validationHooks: { corruptIssueAtOccurrence: 1 },
    });
    app = h.app;
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });
    expect(res.statusCode).toBe(500);
    expect(body(res.body).error!.code).toBe("INTERNAL_ERROR");
  });

  it("FI-066 / SCN-011: reset old events+validation cursors → 409; journal preserved", async () => {
    const h = await readyApp({
      validationHooks: {
        overrideStoreItems: [
          { validationOccurrence: 1, result: { ok: true } },
          {
            validationOccurrence: 2,
            result: { ok: false, issues: [{ path: "/x", message: "m" }] },
          },
        ],
      },
    });
    app = h.app;

    const eventsPage = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?limit=100`,
      headers: getHeaders(h.sessionId),
    });
    expect(eventsPage.statusCode).toBe(200);
    const eventsData = body(eventsPage.body).data as { items: { sequence: number }[] };
    const session = h.app.uiSessionStore.getStrict(h.sessionId);
    if (session === "missing" || session === "corrupt") {
      throw new Error("session missing");
    }
    const simulationId = session.worldEngineRuntime!.context.simulationId;
    const eventsQuery = {
      kind: "events" as const,
      year: null,
      month: null,
      week: null,
      personId: null,
      eventType: null,
      eventGroup: null,
      sortKey: "sequence" as const,
      sortOrder: "desc" as const,
      limit: 100 as const,
    };
    const eventsCursor = signCursorPayload({
      cursorHmacKey: h.processKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(h.processKeys.sessionBindingKey, h.sessionId),
        endpoint: EVENTS_ENDPOINT,
        dataIdentity: `simulation:${simulationId}`,
        uiRevision: h.uiRevision,
        query: eventsQuery,
        nextPosition: { sequence: eventsData.items[0]?.sequence ?? 0 },
      },
    });

    const valPage = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });
    expect(valPage.statusCode).toBe(200);
    const valItems = body(valPage.body).data!.items as { validationOccurrence: number }[];
    expect(valItems.length).toBeGreaterThan(0);
    const validationQuery = {
      kind: "validation" as const,
      status: null,
      sortKey: "validationOccurrence" as const,
      sortOrder: "asc" as const,
      limit: 100 as const,
    };
    const validationCursor = signCursorPayload({
      cursorHmacKey: h.processKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(h.processKeys.sessionBindingKey, h.sessionId),
        endpoint: VALIDATION_RESULTS_ENDPOINT,
        dataIdentity: `validation:${simulationId}`,
        uiRevision: h.uiRevision,
        query: validationQuery,
        nextPosition: { validationOccurrence: valItems[0]!.validationOccurrence },
      },
    });

    const stepRequestId = randomUUID();
    const step = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: authHeaders(h.sessionId, h.csrfToken),
      payload: {
        requestId: stepRequestId,
        expectedUiRevision: h.uiRevision,
        weeks: 1,
      },
    });
    expect(step.statusCode).toBe(200);
    const stepBody = step.body;
    const afterStepRev = body(stepBody).uiRevision as number;

    const reset = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/reset`,
      headers: authHeaders(h.sessionId, h.csrfToken),
      payload: {
        requestId: randomUUID(),
        expectedUiRevision: afterStepRev,
      },
    });
    expect(reset.statusCode).toBe(200);

    const staleEvents = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?cursor=${encodeURIComponent(eventsCursor)}`,
      headers: getHeaders(h.sessionId),
    });
    expect(staleEvents.statusCode).toBe(409);
    expect(body(staleEvents.body).error!.code).toBe("STALE_CURSOR");
    expect(body(staleEvents.body).error!.commitState).toBe("none");

    const staleVal = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results?cursor=${encodeURIComponent(validationCursor)}`,
      headers: getHeaders(h.sessionId),
    });
    expect(staleVal.statusCode).toBe(409);
    expect(body(staleVal.body).error!.code).toBe("STALE_CURSOR");

    const replay = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/step`,
      headers: authHeaders(h.sessionId, h.csrfToken),
      payload: {
        requestId: stepRequestId,
        expectedUiRevision: h.uiRevision,
        weeks: 1,
      },
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.body).toBe(stepBody);

    const afterResetVal = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });
    expect(afterResetVal.statusCode).toBe(200);
  });

  it("ready-start old cursor → 409 STALE (PAGE-012)", async () => {
    const processKeys = createTestProcessSecurityContext(91);
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys,
    });
    const { sessionId, csrfToken } = await bootSession(app);
    const rev1 = await startReady(app, sessionId, csrfToken);
    const session = app.uiSessionStore.getStrict(sessionId);
    if (session === "missing" || session === "corrupt") {
      throw new Error("session missing");
    }
    const simulationId = session.worldEngineRuntime!.context.simulationId;
    const cursor = signCursorPayload({
      cursorHmacKey: processKeys.cursorHmacKey,
      payload: {
        apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
        sessionBindingHash: computeSessionBindingHash(processKeys.sessionBindingKey, sessionId),
        endpoint: EVENTS_ENDPOINT,
        dataIdentity: `simulation:${simulationId}`,
        uiRevision: rev1,
        query: {
          kind: "events",
          year: null,
          month: null,
          week: null,
          personId: null,
          eventType: null,
          eventGroup: null,
          sortKey: "sequence",
          sortOrder: "desc",
          limit: 100,
        },
        nextPosition: { sequence: 0 },
      },
    });

    const reset = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/simulation/reset`,
      headers: authHeaders(sessionId, csrfToken),
      payload: {
        requestId: randomUUID(),
        expectedUiRevision: rev1,
      },
    });
    expect(reset.statusCode).toBe(200);

    const stale = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events?cursor=${encodeURIComponent(cursor)}`,
      headers: getHeaders(sessionId),
    });
    expect(stale.statusCode).toBe(409);
    expect(body(stale.body).error!.code).toBe("STALE_CURSOR");
  });

  it("GET does not mutate world / validation store", async () => {
    const h = await readyApp();
    app = h.app;
    const before = h.app.uiSessionStore.getStrict(h.sessionId);
    if (before === "missing" || before === "corrupt") {
      throw new Error("bad session");
    }
    const beforeEvents = before.worldEngineRuntime!.runtimeState.eventStream.length;
    const beforeVal = before.committedValidationStore!.items.length;
    const beforeCanon = toCanonicalJson({
      events: before.worldEngineRuntime!.runtimeState.eventStream,
      val: before.committedValidationStore,
      rev: before.uiRevision,
    });

    await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events`,
      headers: getHeaders(h.sessionId),
    });
    await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(h.sessionId),
    });

    const after = h.app.uiSessionStore.getStrict(h.sessionId);
    if (after === "missing" || after === "corrupt") {
      throw new Error("bad session after");
    }
    expect(after.worldEngineRuntime!.runtimeState.eventStream.length).toBe(beforeEvents);
    expect(after.committedValidationStore!.items.length).toBe(beforeVal);
    expect(
      toCanonicalJson({
        events: after.worldEngineRuntime!.runtimeState.eventStream,
        val: after.committedValidationStore,
        rev: after.uiRevision,
      }),
    ).toBe(beforeCanon);
  });

  it("session required 401; not started 409; commitState none on failures", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(92),
    });
    const noSession = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/events`,
      headers: { host: HOST },
    });
    expect(noSession.statusCode).toBe(401);
    expect(body(noSession.body).error!.commitState).toBe("none");

    const { sessionId } = await bootSession(app);
    const notStarted = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/validation-results`,
      headers: getHeaders(sessionId),
    });
    expect(notStarted.statusCode).toBe(409);
    expect(body(notStarted.body).error!.code).toBe("SIMULATION_NOT_STARTED");
    expect(body(notStarted.body).error!.commitState).toBe("none");
  });
});
