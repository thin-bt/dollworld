/**
 * Sprint3 weekly mentorship/teaching/OTL runtime vs UI009 tournament auto-progression
 * at the ordinary simulation/week step boundary (Sprint2 repair regression guard).
 */
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  type Sprint1RunSession,
  validateSprint3Config,
} from "@shared-world/simulation-core";
import { createSprint3Balance090ConfigInput } from "../../../../../packages/simulation-core/src/sprint3/sprint3-config-defaults.js";
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

function expectOk<T>(result: { ok: true; value: T } | { ok: false; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result)}`);
  }
  return result.value;
}

/** Test-only Sprint3 binding on the production web session runtime (no product surface change). */
function attachSprint3WeeklyRegressionGuard(session: Sprint1RunSession): Sprint1RunSession {
  const sprint3Config = expectOk(validateSprint3Config(createSprint3Balance090ConfigInput()));
  const seed = session.context.simulationIdentity.seed;
  return {
    ...session,
    context: {
      ...session.context,
      sprint3Config,
    },
    runtimeState: {
      ...session.runtimeState,
      mentorshipEntrypointRuntime:
        session.runtimeState.mentorshipEntrypointRuntime ??
        createInitialSprint3MentorshipEntrypointRuntimeState(),
      originalTechniqueLifecycleRuntime:
        session.runtimeState.originalTechniqueLifecycleRuntime ??
        createInitialOriginalTechniqueLifecycleRuntimeState(seed),
    },
  };
}

type Sprint3WeeklyGuardObservation = {
  absoluteWeek: number;
  eventCount: number;
  otlResearchSumTenths: number;
  otlRngState: string;
  otlFoundingCount: number;
  completedEnrollmentOutcomes: number;
  completedExplicitWeeklyTeachOutcomes: number;
};

function observeSprint3WeeklyGuard(session: Sprint1RunSession): Sprint3WeeklyGuardObservation {
  const runtime = session.runtimeState;
  const mentorship = runtime.mentorshipEntrypointRuntime;
  const otl = runtime.originalTechniqueLifecycleRuntime;
  const otlResearchSumTenths =
    otl?.personEntries.reduce((sum, entry) => sum + entry.researchValueTenths, 0) ?? 0;
  return {
    absoluteWeek: runtime.worldState.worldDate.absoluteWeek,
    eventCount: runtime.eventStream.length,
    otlResearchSumTenths,
    otlRngState: otl?.rngState ?? "",
    otlFoundingCount: otl?.foundingHistories.length ?? 0,
    completedEnrollmentOutcomes: mentorship?.completedEnrollmentOutcomes.length ?? 0,
    completedExplicitWeeklyTeachOutcomes:
      mentorship?.completedExplicitWeeklyTeachOutcomes.length ?? 0,
  };
}

function assertSprint3ProcessedExactlyOnceForStep(
  before: Sprint3WeeklyGuardObservation,
  after: Sprint3WeeklyGuardObservation,
): void {
  expect(after.absoluteWeek).toBe(before.absoluteWeek + 1);
  expect(after.eventCount).toBeGreaterThan(before.eventCount);
  const otlTouched =
    after.otlRngState !== before.otlRngState ||
    after.otlResearchSumTenths !== before.otlResearchSumTenths ||
    after.otlFoundingCount !== before.otlFoundingCount;
  expect(otlTouched).toBe(true);
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

function runtimeFromStore(app: UiApp, sessionId: string): Sprint1RunSession {
  const row = app.uiSessionStore.get(sessionId);
  if (row?.worldEngineRuntime === undefined) {
    throw new Error("missing worldEngineRuntime");
  }
  return row.worldEngineRuntime;
}

function weeksUntilPlayableTournamentWeek(session: Sprint1RunSession): number {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const slot = findUi009PlayableScheduleSlot(worldYear);
  if (slot === null) {
    return Number.MAX_SAFE_INTEGER;
  }
  return slot.absoluteWeek - session.runtimeState.worldState.worldDate.absoluteWeek;
}

/** Avoid tournament week and the immediately preceding week (auto-progression boundary). */
function isOrdinaryWeeklyGuardWeek(session: Sprint1RunSession): boolean {
  const weeksUntil = weeksUntilPlayableTournamentWeek(session);
  return weeksUntil >= 2 || weeksUntil < 0;
}

describe("Sprint3 weekly runtime vs tournament auto-progression regression guard", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("non-tournament simulation week step runs Sprint3 enrollment/teach processors exactly once", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(916),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 11);
    const row = app.uiSessionStore.get(sessionId)!;
    row.worldEngineRuntime = attachSprint3WeeklyRegressionGuard(row.worldEngineRuntime!);

    let revision = uiRevision;
    let runtime = runtimeFromStore(app, sessionId);
    for (let guard = 0; guard < 64 && !isOrdinaryWeeklyGuardWeek(runtime); guard += 1) {
      const stepped = await simulationStep(app, cookie, csrf, revision, 1);
      revision = stepped.uiRevision;
      runtime = runtimeFromStore(app, sessionId);
    }
    expect(isOrdinaryWeeklyGuardWeek(runtime)).toBe(true);

    const before = observeSprint3WeeklyGuard(runtime);
    await simulationStep(app, cookie, csrf, revision, 1);
    const after = observeSprint3WeeklyGuard(runtimeFromStore(app, sessionId));
    assertSprint3ProcessedExactlyOnceForStep(before, after);
  }, 120_000);

  it("tournament week auto-finish still runs Sprint3 weekly processors exactly once", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(917),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 7);
    const row = app.uiSessionStore.get(sessionId)!;
    row.worldEngineRuntime = attachSprint3WeeklyRegressionGuard(row.worldEngineRuntime!);

    const worldDate = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(worldDate.year)!;
    const weeksUntil = slot.absoluteWeek - worldDate.absoluteWeek;
    let revision = uiRevision;
    if (weeksUntil > 1) {
      const stepped = await simulationStep(app, cookie, csrf, revision, weeksUntil - 1);
      revision = stepped.uiRevision;
    }

    const before = observeSprint3WeeklyGuard(runtimeFromStore(app, sessionId));
    await simulationStep(app, cookie, csrf, revision, 1);
    const after = observeSprint3WeeklyGuard(runtimeFromStore(app, sessionId));
    assertSprint3ProcessedExactlyOnceForStep(before, after);

    const competitionRes = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/competition`,
      headers: { host: HOST, cookie },
    });
    expect(competitionRes.statusCode).toBe(200);
    const competition = (JSON.parse(competitionRes.body) as Envelope).data as {
      lifecyclePhase: string;
      championDisplayName: string | null;
    };
    expect(competition.lifecyclePhase).toBe("finished");
    expect(competition.championDisplayName).not.toBeNull();
  }, 120_000);

  it("repeated simulation steps with Sprint3 binding remain deterministic", async () => {
    async function runGuardedWeeks(seed: number): Promise<Sprint3WeeklyGuardObservation[]> {
      const localApp = await createUiApp({
        publicOrigin: ORIGIN,
        enableTestProbe: false,
        repoRoot: REPO_ROOT,
        processKeys: createTestProcessSecurityContext(918),
      });
      try {
        const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(localApp, seed);
        const row = localApp.uiSessionStore.get(sessionId)!;
        row.worldEngineRuntime = attachSprint3WeeklyRegressionGuard(row.worldEngineRuntime!);
        const observations: Sprint3WeeklyGuardObservation[] = [
          observeSprint3WeeklyGuard(runtimeFromStore(localApp, sessionId)),
        ];
        let revision = uiRevision;
        for (let weekIndex = 0; weekIndex < 4; weekIndex += 1) {
          const stepped = await simulationStep(localApp, cookie, csrf, revision, 1);
          revision = stepped.uiRevision;
          observations.push(observeSprint3WeeklyGuard(runtimeFromStore(localApp, sessionId)));
        }
        return observations;
      } finally {
        await localApp.close();
      }
    }

    const left = await runGuardedWeeks(918);
    const right = await runGuardedWeeks(918);
    expect(right).toEqual(left);
  }, 120_000);

  it("post-tournament week step does not duplicate Sprint3 completed-outcome counters", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      enableTestProbe: false,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(919),
    });
    const { cookie, csrf, uiRevision, sessionId } = await bootstrapSession(app, 7);
    const row = app.uiSessionStore.get(sessionId)!;
    row.worldEngineRuntime = attachSprint3WeeklyRegressionGuard(row.worldEngineRuntime!);

    const startWeek = row.worldEngineRuntime!.runtimeState.worldState.worldDate;
    const slot = findUi009PlayableScheduleSlot(startWeek.year)!;
    const weeksUntil = slot.absoluteWeek - startWeek.absoluteWeek;
    let revision = uiRevision;
    if (weeksUntil > 0) {
      const stepped = await simulationStep(app, cookie, csrf, revision, weeksUntil);
      revision = stepped.uiRevision;
    }

    const atTournamentFinish = observeSprint3WeeklyGuard(runtimeFromStore(app, sessionId));
    const steppedAfter = await simulationStep(app, cookie, csrf, revision, 1);
    const afterNextWeek = observeSprint3WeeklyGuard(runtimeFromStore(app, sessionId));

    assertSprint3ProcessedExactlyOnceForStep(atTournamentFinish, afterNextWeek);
    expect(afterNextWeek.completedEnrollmentOutcomes).toBeGreaterThanOrEqual(
      atTournamentFinish.completedEnrollmentOutcomes,
    );
    expect(afterNextWeek.completedExplicitWeeklyTeachOutcomes).toBeGreaterThanOrEqual(
      atTournamentFinish.completedExplicitWeeklyTeachOutcomes,
    );
    expect(
      afterNextWeek.completedEnrollmentOutcomes - atTournamentFinish.completedEnrollmentOutcomes,
    ).toBeLessThanOrEqual(1);
    expect(
      afterNextWeek.completedExplicitWeeklyTeachOutcomes -
        atTournamentFinish.completedExplicitWeeklyTeachOutcomes,
    ).toBeLessThanOrEqual(1);
    expect(steppedAfter.ok).toBe(true);
  }, 120_000);
});
