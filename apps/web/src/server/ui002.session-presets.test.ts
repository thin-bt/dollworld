import { createHmac } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "./app.js";
import { encodeBase64UrlNoPad, generateSessionTokenAscii, type CsprngBytes } from "./csprng.js";
import {
  CURSOR_API_SCHEMA_VERSION_CURRENT,
  CURSOR_API_SCHEMA_VERSION_OLD,
  signCursorPayload,
  verifyCursorCodec,
  type CursorPayload,
} from "./cursor.js";
import { MinimalFallbackFatalError, serializeFailureOrFallback } from "./envelope.js";
import { createRequestJournalStore } from "./journal.js";
import {
  createProcessSecurityContext,
  createTestProcessSecurityContext,
  ProcessKeyStartupError,
} from "./process-keys.js";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "./session-cookie.js";
import { createMemorySessionStore } from "./session-store.js";
import {
  buildCurrentUiReadSnapshot,
  createEmptyUiSession,
  type RequestJournalRecord,
  type UiSession,
} from "./ui-session.js";

const ORIGIN = "http://127.0.0.1:8787";
const HOST = "127.0.0.1:8787";
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

function fixedBytes(fill: number, length = 32): Uint8Array {
  return new Uint8Array(length).fill(fill);
}

function scriptedCsprng(script: Uint8Array[]): CsprngBytes {
  let index = 0;
  return (byteLength) => {
    const next = script[index];
    if (next === undefined) {
      throw new Error("CSPRNG script exhausted");
    }
    index += 1;
    if (next.byteLength !== byteLength) {
      throw new Error(`CSPRNG expected ${String(byteLength)} got ${String(next.byteLength)}`);
    }
    return next.slice();
  };
}

function countingCsprng(inner: CsprngBytes): { csprng: CsprngBytes; calls: () => number } {
  let calls = 0;
  return {
    csprng: (n) => {
      calls += 1;
      return inner(n);
    },
    calls: () => calls,
  };
}

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

describe("UI-002 session/presets/cursor/FI", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-001 bootstrap creates empty session with cookie CSRF and no-store", async () => {
    app = await createUiApp({ publicOrigin: ORIGIN, repoRoot: REPO_ROOT });
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const sessionId = parseSetCookieSessionId(response.headers["set-cookie"]);
    expect(sessionId).toHaveLength(43);
    const body = JSON.parse(response.body) as {
      ok: true;
      data: { sessionState: string; csrfToken: string; activeOperation: null };
      uiRevision: number;
      isUpdating: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.data.sessionState).toBe("empty");
    expect(body.data.csrfToken).toHaveLength(43);
    expect(body.data.activeOperation).toBeNull();
    expect(body.uiRevision).toBe(0);
    expect(body.isUpdating).toBe(false);
    expect(Object.keys(body.data)).toEqual(["sessionState", "csrfToken", "activeOperation"]);
  });

  it("ST-001 reuses idle session without CSPRNG and ST-002 returns sorted presets", async () => {
    const counter = countingCsprng((n) => new Uint8Array(n).fill(7));
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      csprng: counter.csprng,
      processKeys: createTestProcessSecurityContext(31),
    });
    const first = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    const sessionId = parseSetCookieSessionId(first.headers["set-cookie"]);
    const firstBody = JSON.parse(first.body) as { data: { csrfToken: string } };
    const callsAfterCreate = counter.calls();

    const second = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(second.statusCode).toBe(200);
    expect(second.headers["set-cookie"]).toBeUndefined();
    expect(counter.calls()).toBe(callsAfterCreate);
    const secondBody = JSON.parse(second.body) as { data: { csrfToken: string } };
    expect(secondBody.data.csrfToken).toBe(firstBody.data.csrfToken);

    const presets = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/presets`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(presets.statusCode).toBe(200);
    const presetsBody = JSON.parse(presets.body) as {
      data: {
        items: Array<{ presetId: string; simulationIdentitySchemaVersion: string }>;
        totalCount: number;
        nextCursor: null;
      };
    };
    expect(presetsBody.data.nextCursor).toBeNull();
    expect(presetsBody.data.totalCount).toBe(presetsBody.data.items.length);
    expect(presetsBody.data.totalCount).toBeGreaterThanOrEqual(1);
    expect(presetsBody.data.items[0]?.simulationIdentitySchemaVersion).toBe("0.5.0");
    const ids = presetsBody.data.items.map((item) => item.presetId);
    expect([...ids].sort()).toEqual(ids);
  });

  it("ST-002 requires session and rejects query", async () => {
    app = await createUiApp({ publicOrigin: ORIGIN, repoRoot: REPO_ROOT });
    const missing = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/presets`,
      headers: { host: HOST },
    });
    expect(missing.statusCode).toBe(401);
    expect(missing.headers["cache-control"]).toBe("no-store");

    const boot = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    const sessionId = parseSetCookieSessionId(boot.headers["set-cookie"]);
    const badQuery = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/presets?x=1`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(badQuery.statusCode).toBe(400);
  });

  it("FI-007 recovers from first sessionId collision", async () => {
    const occupied = generateSessionTokenAscii(() => fixedBytes(1));
    const store = createMemorySessionStore();
    store.insert(
      createEmptyUiSession({
        sessionId: occupied,
        csrfToken: generateSessionTokenAscii(() => fixedBytes(2)),
      }),
    );
    const csprng = scriptedCsprng([fixedBytes(1), fixedBytes(3), fixedBytes(4)]);
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      sessionStore: store,
      csprng,
      processKeys: createTestProcessSecurityContext(21),
    });
    const sizeBefore = store.size();
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(200);
    expect(store.size()).toBe(sizeBefore + 1);
    const newId = parseSetCookieSessionId(response.headers["set-cookie"]);
    expect(newId).not.toBe(occupied);
  });

  it("FI-008 exhausts three collisions without attempt4", async () => {
    const store = createMemorySessionStore();
    const tokens = [fixedBytes(1), fixedBytes(2), fixedBytes(3)].map((bytes) =>
      generateSessionTokenAscii(() => bytes),
    );
    for (const [index, token] of tokens.entries()) {
      store.insert(
        createEmptyUiSession({
          sessionId: token,
          csrfToken: generateSessionTokenAscii(() => fixedBytes(10 + index)),
        }),
      );
    }
    let calls = 0;
    const csprng: CsprngBytes = (n) => {
      calls += 1;
      if (calls > 3) {
        throw new Error("attempt4 must not run");
      }
      return fixedBytes(calls, n);
    };
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      sessionStore: store,
      csprng,
      processKeys: createTestProcessSecurityContext(22),
    });
    const sizeBefore = store.size();
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(500);
    expect(store.size()).toBe(sizeBefore);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(calls).toBe(3);
    const body = JSON.parse(response.body) as {
      error: { code: string; commitState: string; errorReference: string };
      uiRevision: null;
    };
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.commitState).toBe("none");
    expect(body.error.errorReference.startsWith("server:")).toBe(true);
    expect(body.uiRevision).toBeNull();
  });

  it("FI-009 fails closed on CSPRNG throw", async () => {
    const csprng: CsprngBytes = () => {
      throw new Error("csprng down");
    };
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      csprng,
      processKeys: createTestProcessSecurityContext(23),
    });
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(app.uiSessionStore.size()).toBe(0);
  });

  it("FI-010 process key startup failure", () => {
    expect(() =>
      createProcessSecurityContext(() => {
        throw new Error("no entropy");
      }),
    ).toThrow(ProcessKeyStartupError);
    expect(() => createProcessSecurityContext(() => fixedBytes(1, 8))).toThrow(
      ProcessKeyStartupError,
    );
  });

  it("FI-011 serializer/store faults leave no session row or Set-Cookie", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      sessionHooks: { failDtoSerialize: true },
    });
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers["set-cookie"]).toBeUndefined();
    expect(app.uiSessionStore.size()).toBe(0);

    await app.close();
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      sessionHooks: {
        beforeStoreInsert: () => {
          throw new Error("store insert fault");
        },
      },
    });
    const response2 = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    expect(response2.statusCode).toBe(500);
    expect(response2.headers["set-cookie"]).toBeUndefined();
    expect(app.uiSessionStore.size()).toBe(0);
  });

  it("FI-012 existing session invalid query keeps metadata and skips CSPRNG", async () => {
    const counter = countingCsprng((n) => new Uint8Array(n).fill(5));
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      csprng: counter.csprng,
      processKeys: createTestProcessSecurityContext(32),
    });
    const boot = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    const sessionId = parseSetCookieSessionId(boot.headers["set-cookie"]);
    const calls = counter.calls();
    const invalid = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session?x=1`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(invalid.statusCode).toBe(400);
    expect(counter.calls()).toBe(calls);
    const body = JSON.parse(invalid.body) as { uiRevision: number; isUpdating: boolean };
    expect(body.uiRevision).toBe(0);
    expect(body.isUpdating).toBe(false);

    const noSessionInvalid = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session?x=1`,
      headers: { host: HOST },
    });
    expect(noSessionInvalid.statusCode).toBe(400);
    const noSessionBody = JSON.parse(noSessionInvalid.body) as { uiRevision: null };
    expect(noSessionBody.uiRevision).toBeNull();
  });

  it("FI-013 CSRF mismatch rejects POST without journal work", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      enableTestProbe: true,
      exemptTestProbeFromCsrf: false,
    });
    const boot = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    const sessionId = parseSetCookieSessionId(boot.headers["set-cookie"]);
    const response = await app.inject({
      method: "POST",
      url: `${API_PREFIX}/ui001-test-probe`,
      headers: {
        host: HOST,
        origin: ORIGIN,
        "content-type": "application/json",
        cookie: `${SESSION_COOKIE_NAME}=${sessionId}`,
        [CSRF_HEADER_NAME]: generateSessionTokenAscii(() => fixedBytes(99)),
      },
      payload: { probe: true },
    });
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as { error: { code: string; commitState: string } };
    expect(body.error.code).toBe("REQUEST_FORBIDDEN");
    expect(body.error.commitState).toBe("none");
    const session = app.uiSessionStore.get(sessionId)!;
    expect(session.requestJournal.size).toBe(0);
  });

  it("FI-014 journal lookup infrastructure failure is injectable", () => {
    const journal = new Map<string, RequestJournalRecord>();
    let lookups = 0;
    const store = createRequestJournalStore(journal, {
      onLookup: () => {
        lookups += 1;
        throw new Error("journal lookup fault");
      },
    });
    expect(() => store.lookup("req-1")).toThrow("journal lookup fault");
    expect(lookups).toBe(1);
    expect(journal.size).toBe(0);
  });

  it("FI-015 journal write failure before mutation is injectable", () => {
    const journal = new Map<string, RequestJournalRecord>();
    let writes = 0;
    const store = createRequestJournalStore(journal, {
      onWrite: () => {
        writes += 1;
        throw new Error("journal write fault");
      },
    });
    expect(() =>
      store.write({
        status: "completed",
        requestId: "req-1",
        operationKind: "start",
        fingerprint: "fp",
        httpStatus: 200,
        responseBody: "{}",
        acceptedUiRevision: 0,
        committedWeeks: 0,
        completedUiRevision: 0,
        requestedWeeks: 0,
      }),
    ).toThrow("journal write fault");
    expect(writes).toBe(1);
    expect(journal.size).toBe(0);
  });

  it("FI-016 bad HMAC claiming old schema stays INVALID_REQUEST", () => {
    const keys = createTestProcessSecurityContext(11);
    const payload: CursorPayload = {
      apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_OLD,
      sessionBindingHash: "a".repeat(64),
      endpoint: "GET /api/s1_5/people",
      dataIdentity: "simulation:sim-1",
      uiRevision: 0,
      query: {
        kind: "people",
        name: null,
        state: null,
        sortKey: "personId",
        sortOrder: "asc",
        limit: 50,
      },
      nextPosition: { personId: "p1" },
    };
    const payloadSegment = encodeBase64UrlNoPad(Buffer.from(toCanonicalJson(payload), "utf8"));
    const badSig = encodeBase64UrlNoPad(fixedBytes(0));
    const result = verifyCursorCodec({
      cursor: `${payloadSegment}.${badSig}`,
      cursorHmacKey: keys.cursorHmacKey,
    });
    expect(result.kind).toBe("invalid_request");
  });

  it("FI-017 noncanonical mock-result dataIdentity is INVALID_REQUEST", () => {
    const keys = createTestProcessSecurityContext(12);
    const payload: CursorPayload = {
      apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_CURRENT,
      sessionBindingHash: "b".repeat(64),
      endpoint: "GET /api/s1_5/mock-battles/latest/log",
      dataIdentity: "mock-result:01",
      uiRevision: 0,
      query: {
        kind: "battle_log",
        sortKey: "sourceIndex",
        sortOrder: "asc",
        limit: 100,
      },
      nextPosition: { sourceIndex: 0 },
    };
    const cursor = signCursorPayload({ cursorHmacKey: keys.cursorHmacKey, payload });
    const result = verifyCursorCodec({ cursor, cursorHmacKey: keys.cursorHmacKey });
    expect(result.kind).toBe("invalid_request");
  });

  it("FI-018 corrupt UiSession returns 500 uiRevision=null without self-heal", async () => {
    app = await createUiApp({ publicOrigin: ORIGIN, repoRoot: REPO_ROOT });
    const boot = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST },
    });
    const sessionId = parseSetCookieSessionId(boot.headers["set-cookie"]);
    const original = app.uiSessionStore.get(sessionId)!;
    const tampered = {
      ...original,
      uiRevision: -1,
    } as unknown as UiSession;
    app.uiSessionStore.replaceForTest(sessionId, tampered);
    const response = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/session`,
      headers: { host: HOST, cookie: `${SESSION_COOKIE_NAME}=${sessionId}` },
    });
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as { uiRevision: null; isUpdating: boolean };
    expect(body.uiRevision).toBeNull();
    expect(body.isUpdating).toBe(false);
    expect(app.uiSessionStore.has(sessionId)).toBe(true);
    expect(response.headers["set-cookie"]).toBeUndefined();

    const snapshot = buildCurrentUiReadSnapshot(original);
    original.uiRevision = 99;
    expect(snapshot.uiRevision).toBe(0);
  });

  it("FI-019/FI-020 serializer hooks", () => {
    const fallback = serializeFailureOrFallback({
      error: {
        code: "INTERNAL_ERROR",
        message: "x",
        commitState: "none",
        errorReference: "server:test:1",
      },
      uiRevision: null,
      isUpdating: false,
      refreshRequired: false,
      failNormal: true,
      fallbackErrorReference: "server:test:fallback",
    });
    expect(fallback.usedFallback).toBe(true);
    const body = JSON.parse(fallback.body) as {
      error: { message: string; errorReference: string };
    };
    expect(body.error.message).toBe("内部処理に失敗しました。");
    expect(body.error.errorReference).toBe("server:test:fallback");

    expect(() =>
      serializeFailureOrFallback({
        error: {
          code: "INTERNAL_ERROR",
          message: "x",
          commitState: "none",
          errorReference: "server:test:1",
        },
        uiRevision: null,
        isUpdating: false,
        refreshRequired: false,
        failNormal: true,
        failMinimal: true,
        fallbackErrorReference: "server:test:fallback",
      }),
    ).toThrow(MinimalFallbackFatalError);
  });

  it("valid HMAC old schema classifies as STALE_CURSOR", () => {
    const keys = createTestProcessSecurityContext(13);
    const payload = {
      apiSchemaVersion: CURSOR_API_SCHEMA_VERSION_OLD,
      sessionBindingHash: "c".repeat(64),
      endpoint: "GET /api/s1_5/people",
      dataIdentity: "simulation:sim-1",
      uiRevision: 0,
      query: {
        kind: "people",
        name: null,
        state: null,
        sortKey: "personId",
        sortOrder: "asc",
        limit: 50,
      },
      nextPosition: { personId: "p1" },
    };
    const payloadSegment = encodeBase64UrlNoPad(Buffer.from(toCanonicalJson(payload), "utf8"));
    const signature = createHmac("sha256", Buffer.from(keys.cursorHmacKey))
      .update(payloadSegment, "ascii")
      .digest();
    const cursor = `${payloadSegment}.${encodeBase64UrlNoPad(signature)}`;
    const result = verifyCursorCodec({ cursor, cursorHmacKey: keys.cursorHmacKey });
    expect(result.kind).toBe("stale_cursor");
  });
});
