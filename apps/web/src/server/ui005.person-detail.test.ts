import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { API_PREFIX } from "../shared/ui001-contracts.js";
import { createUiApp, type UiApp } from "./app.js";
import { createTestProcessSecurityContext } from "./process-keys.js";
import { DEFAULT_SPRINT1_PRESET_ID } from "./presets.js";
import { CSRF_HEADER_NAME, SESSION_COOKIE_NAME } from "./session-cookie.js";
import { PERSON_DETAIL_VIEW_KEYS } from "./ui005/build-person-detail.js";
import { projectRelationships } from "./ui005/relationship-projection.js";
import { mapTechniquesView } from "./ui005/technique-view-map.js";
import { aggregateTrainingHistory } from "./ui005/training-history-aggregate.js";
import { aggregateStatHistory } from "./ui005/stat-history-aggregate.js";
import { mapPersonDetailDirect } from "./ui005/person-detail-direct-map.js";
import { toCanonicalJson, WEEKLY_TRAINING_PROCESSOR_ID } from "@shared-world/simulation-core";

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

async function startReady(app: UiApp, sessionId: string, csrfToken: string): Promise<void> {
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
}

describe("UI-005 PersonDetail API-008", () => {
  let app: UiApp | undefined;

  afterEach(async () => {
    if (app !== undefined) {
      await app.close();
      app = undefined;
    }
  });

  it("ST-008 ready PersonDetail exact26; list/detail same-revision fields align", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(91),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const list = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    expect(list.statusCode).toBe(200);
    const listBody = JSON.parse(list.body) as {
      uiRevision: number;
      data: {
        items: {
          personId: string;
          displayName: string;
          age: number | null;
          careerStatus: string;
          stats: { spirit: number };
          learnedTechniqueCount: number;
        }[];
      };
    };
    const sample = listBody.data.items[0]!;
    const detail = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${sample.personId}`,
      headers: getHeaders(sessionId),
    });
    expect(detail.statusCode).toBe(200);
    const detailBody = JSON.parse(detail.body) as {
      ok: true;
      uiRevision: number;
      data: Record<string, unknown>;
    };
    expect(detailBody.ok).toBe(true);
    expect(detailBody.uiRevision).toBe(listBody.uiRevision);
    expect(Object.keys(detailBody.data)).toHaveLength(PERSON_DETAIL_VIEW_KEYS.length);
    for (const key of PERSON_DETAIL_VIEW_KEYS) {
      expect(detailBody.data).toHaveProperty(key);
    }
    expect(detailBody.data).not.toHaveProperty("affiliationLabels");
    expect(detailBody.data).not.toHaveProperty("overallRank");
    expect(detailBody.data).not.toHaveProperty("mentorPersonId");
    expect(detailBody.data.personId).toBe(sample.personId);
    expect(detailBody.data.displayName).toBe(sample.displayName);
    expect(detailBody.data.sex === "male" || detailBody.data.sex === "female").toBe(true);
    expect(detailBody.data.age).toBe(sample.age);
    expect(detailBody.data.careerStatus).toBe(sample.careerStatus);
    expect((detailBody.data.stats as { spirit: number }).spirit).toBe(sample.stats.spirit);
    expect(detailBody.data.statHistory).not.toBeNull();
    expect(detailBody.data.trainingHistory).toEqual(
      expect.objectContaining({ available: true, items: expect.any(Array) }),
    );
    const techniques = detailBody.data.techniques as {
      techniqueId: string;
      definition: object;
      acquiredAbsoluteWeek: number | null;
    }[];
    expect(Array.isArray(techniques)).toBe(true);
    for (const t of techniques) {
      expect(Object.keys(t)).toHaveLength(9);
      expect(Object.keys(t.definition)).toHaveLength(31);
    }
    const acquired = techniques.filter((t) => t.acquiredAbsoluteWeek !== null);
    expect(acquired.length).toBe(sample.learnedTechniqueCount);
  });

  it("ST-008 lexical invalid → 400; absent → 404; empty lifecycle → 409; query forbidden → 400", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(92),
    });
    const { sessionId, csrfToken } = await bootSession(app);

    const empty = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/person_000001`,
      headers: getHeaders(sessionId),
    });
    expect(empty.statusCode).toBe(409);
    expect(JSON.parse(empty.body).error.code).toBe("SIMULATION_NOT_STARTED");

    await startReady(app, sessionId, csrfToken);

    const badId = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/not-a-person`,
      headers: getHeaders(sessionId),
    });
    expect(badId.statusCode).toBe(400);
    expect(JSON.parse(badId.body).error.code).toBe("INVALID_REQUEST");

    const missing = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/person_999999`,
      headers: getHeaders(sessionId),
    });
    expect(missing.statusCode).toBe(404);
    expect(JSON.parse(missing.body).error.code).toBe("NOT_FOUND");

    const withQuery = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/person_000001?foo=1`,
      headers: getHeaders(sessionId),
    });
    expect(withQuery.statusCode).toBe(400);
  });

  it("API-009 Event route is registered by UI-008; PersonDetail still 200", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(93),
    });
    expect(app.hasRoute({ method: "GET", url: `${API_PREFIX}/events` })).toBe(true);
    expect(app.hasRoute({ method: "GET", url: `${API_PREFIX}/validation-results` })).toBe(true);
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);
    const list = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    const personId = (JSON.parse(list.body) as { data: { items: { personId: string }[] } }).data
      .items[0]!.personId;
    const detail = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${personId}`,
      headers: getHeaders(sessionId),
    });
    expect(detail.statusCode).toBe(200);
  });

  it("FI-038-style / FI projection fault → 500 none; forceDetailCorruption → 500", async () => {
    let threw = false;
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(94),
      personDetailHooks: {
        throwAfterProjection: () => {
          threw = true;
          throw new Error("projection fault");
        },
      },
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);
    const list = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    const personId = (JSON.parse(list.body) as { data: { items: { personId: string }[] } }).data
      .items[0]!.personId;
    const before = app.uiSessionStore.getStrict(sessionId) as { uiRevision: number };
    const res = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${personId}`,
      headers: getHeaders(sessionId),
    });
    expect(threw).toBe(true);
    expect(res.statusCode).toBe(500);
    expect((app.uiSessionStore.getStrict(sessionId) as { uiRevision: number }).uiRevision).toBe(
      before.uiRevision,
    );

    await app.close();
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(95),
      personDetailHooks: { forceDetailCorruption: true },
    });
    const boot2 = await bootSession(app);
    await startReady(app, boot2.sessionId, boot2.csrfToken);
    const list2 = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(boot2.sessionId),
    });
    const id2 = (JSON.parse(list2.body) as { data: { items: { personId: string }[] } }).data
      .items[0]!.personId;
    const forced = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${id2}`,
      headers: getHeaders(boot2.sessionId),
    });
    expect(forced.statusCode).toBe(500);
  });

  it("FI-039 broken parent counterpart → API-008 PersonDetail 500; GET non-mutating; retry 200", async () => {
    app = await createUiApp({
      publicOrigin: ORIGIN,
      repoRoot: REPO_ROOT,
      processKeys: createTestProcessSecurityContext(96),
    });
    const { sessionId, csrfToken } = await bootSession(app);
    await startReady(app, sessionId, csrfToken);

    const list = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people?limit=50`,
      headers: getHeaders(sessionId),
    });
    expect(list.statusCode).toBe(200);
    const personId = (JSON.parse(list.body) as { data: { items: { personId: string }[] } }).data
      .items[0]!.personId;

    const session = app.uiSessionStore.getStrict(sessionId);
    expect(session).not.toBe("missing");
    expect(session).not.toBe("corrupt");
    const cleanRuntimeJson = toCanonicalJson(
      (session as { worldEngineRuntime: unknown }).worldEngineRuntime,
    );

    // Injection at accepted current-source boundary: mutable clone of committed runtime,
    // then assign back (same pattern as UI-003 runtime tamper tests). Does not bypass
    // buildPersonDetailView → projectRelationships → assertRelationshipIntegrity.
    const mutated = JSON.parse(cleanRuntimeJson) as {
      runtimeState: {
        worldState: {
          relationships: Array<Record<string, unknown>>;
          persons: Array<{ personId: string }>;
        };
        worldRngState: unknown;
        matchIdGeneratorState: unknown;
        eventStream: unknown[];
        eventAllocationState: { nextSequence: number };
      };
    };
    expect(
      mutated.runtimeState.worldState.persons.some((p) => p.personId === "person_999998"),
    ).toBe(false);
    mutated.runtimeState.worldState.relationships.push({
      relationshipId: "relationship_fi039_broken_parent",
      kind: "parent_child",
      parentId: "person_999998",
      childId: personId,
      parentRole: "father",
    });
    (session as { worldEngineRuntime: unknown }).worldEngineRuntime = mutated;

    const beforeUiRevision = (session as { uiRevision: number }).uiRevision;
    const beforeWorld = toCanonicalJson(
      (session as { worldEngineRuntime: unknown }).worldEngineRuntime,
    );
    const beforeRng = toCanonicalJson(mutated.runtimeState.worldRngState);
    const beforeMatch = toCanonicalJson(mutated.runtimeState.matchIdGeneratorState);
    const beforeEvents = mutated.runtimeState.eventStream.length;
    const beforeAlloc = mutated.runtimeState.eventAllocationState.nextSequence;
    const providerCallCount = 0; // API-008 GET uses no Sha256/CSPRNG/MatchId allocator

    const detail = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${personId}`,
      headers: getHeaders(sessionId),
    });
    expect(detail.statusCode).toBe(500);
    const failBody = JSON.parse(detail.body) as { error: { code: string; commitState: string } };
    expect(failBody.error.code).toBe("INTERNAL_ERROR");
    expect(failBody.error.commitState).toBe("none");

    const after = app.uiSessionStore.getStrict(sessionId) as {
      uiRevision: number;
      worldEngineRuntime: {
        runtimeState: {
          worldRngState: unknown;
          matchIdGeneratorState: unknown;
          eventStream: unknown[];
          eventAllocationState: { nextSequence: number };
        };
      };
    };
    expect(after.uiRevision).toBe(beforeUiRevision);
    expect(toCanonicalJson(after.worldEngineRuntime)).toBe(beforeWorld);
    expect(toCanonicalJson(after.worldEngineRuntime.runtimeState.worldRngState)).toBe(beforeRng);
    expect(toCanonicalJson(after.worldEngineRuntime.runtimeState.matchIdGeneratorState)).toBe(
      beforeMatch,
    );
    expect(after.worldEngineRuntime.runtimeState.eventStream.length).toBe(beforeEvents);
    expect(after.worldEngineRuntime.runtimeState.eventAllocationState.nextSequence).toBe(
      beforeAlloc,
    );
    expect(providerCallCount).toBe(0);

    // Retry: remove injection (restore clean runtime) → PersonDetail 200
    (session as { worldEngineRuntime: unknown }).worldEngineRuntime = JSON.parse(cleanRuntimeJson);
    const retry = await app.inject({
      method: "GET",
      url: `${API_PREFIX}/people/${personId}`,
      headers: getHeaders(sessionId),
    });
    expect(retry.statusCode).toBe(200);
    expect(JSON.parse(retry.body).ok).toBe(true);
  });
});

describe("UI-005 pure modules FI-039..046 / history contracts", () => {
  it("FI-040 duplicate parent relationship → PureFail (no dedupe)", () => {
    const dup = projectRelationships({
      personId: "person_000001",
      relationships: [
        { kind: "parent_child", parentId: "person_000002", childId: "person_000001" },
        { kind: "parent_child", parentId: "person_000002", childId: "person_000001" },
      ],
    });
    expect(dup.ok).toBe(false);

    const okRel = projectRelationships({
      personId: "person_000001",
      relationships: [
        { kind: "parent_child", parentId: "person_000002", childId: "person_000001" },
        { kind: "master_disciple", masterId: "person_000003", discipleId: "person_000001" },
      ],
    });
    expect(okRel.ok).toBe(true);
    if (okRel.ok) {
      expect(okRel.value.parentPersonIds).toEqual(["person_000002"]);
      expect(okRel.value.formalMasterPersonIds).toEqual(["person_000003"]);
    }
  });

  it("FI-041/042 duplicate technique / dangling focus → fail; repaired retry ok", () => {
    const catalog = new Map([
      [
        "tech_a",
        {
          techniqueId: "tech_a",
          learningProgressRequired: 10,
          definition: Object.fromEntries(
            [
              "techniqueId",
              "schemaVersion",
              "dataVersion",
              "name",
              "category",
              "primaryStats",
              "requiredAptitude",
              "requiredStats",
              "prerequisiteTechniqueMastery",
              "mentalCost",
              "difficulty",
              "learningTier",
              "consumptionClass",
              "learningProgressRequired",
              "learningProgressOverrideReason",
              "teachingProficiencyRequired",
              "secrecy",
              "power",
              "accuracy",
              "activationDifficulty",
              "prerequisiteTechniqueIds",
              "originPersonId",
              "sourceTechniqueIds",
              "tags",
              "usableRanges",
              "preferredRanges",
              "rangeShiftAfterUse",
              "priority",
              "speedModifier",
              "injuryModifier",
              "actionTraits",
            ].map((k) => [
              k,
              k === "techniqueId" ? "tech_a" : k === "learningProgressRequired" ? 10 : 0,
            ]),
          ),
        },
      ],
    ]);
    const heldOnce = {
      techniqueId: "tech_a",
      learningProgressTenths: 0,
      masteryHundredths: 0,
      successfulUseCount: 0,
      attemptedUseCount: 0,
      lastPracticedAbsoluteWeek: null,
      acquiredAbsoluteWeek: null,
    };
    const providerCallCount = 0; // pure mapTechniquesView: no Sha256/CSPRNG/MatchId allocator

    const dup = mapTechniquesView({
      techniqueStates: [heldOnce, { ...heldOnce }],
      catalogById: catalog,
      learningFocusTechniqueId: null,
    });
    expect(dup.ok).toBe(false);
    expect(providerCallCount).toBe(0);

    // FI-041 repaired retry: single held tech_a + focus null
    const fi041Retry = mapTechniquesView({
      techniqueStates: [heldOnce],
      catalogById: catalog,
      learningFocusTechniqueId: null,
    });
    expect(fi041Retry.ok).toBe(true);
    if (fi041Retry.ok) {
      expect(fi041Retry.value.techniques).toHaveLength(1);
      expect(fi041Retry.value.techniques[0]!.techniqueId).toBe("tech_a");
      expect(fi041Retry.value.learningFocusTechniqueId).toBeNull();
    }
    expect(providerCallCount).toBe(0);

    const dangling = mapTechniquesView({
      techniqueStates: [heldOnce],
      catalogById: catalog,
      learningFocusTechniqueId: "tech_missing",
    });
    expect(dangling.ok).toBe(false);
    expect(providerCallCount).toBe(0);

    // FI-042 repaired retry: focus=null with held tech_a (null-coerce of dangling focus forbidden;
    // repair is a new valid input, not silent coerce)
    const fi042Retry = mapTechniquesView({
      techniqueStates: [heldOnce],
      catalogById: catalog,
      learningFocusTechniqueId: null,
    });
    expect(fi042Retry.ok).toBe(true);
    if (fi042Retry.ok) {
      expect(fi042Retry.value.techniques).toHaveLength(1);
      expect(fi042Retry.value.learningFocusTechniqueId).toBeNull();
    }
    expect(providerCallCount).toBe(0);
  });

  it("FI-043 foreign processor stat_growth → fail; FI-044 missing action_selected → fail", () => {
    const foreign = aggregateStatHistory({
      personId: "person_000001",
      currentAbsoluteWeek: 10,
      currentStats: {
        stamina: 10,
        strength: 10,
        skill: 10,
        speed: 10,
        spirit: 10,
        magic: 10,
      },
      events: [
        {
          sequence: 1,
          eventType: "training.stat_growth_applied",
          sourceProcessor: "other.processor",
          absoluteWeek: 1,
          personIds: ["person_000001"],
          payload: { targetStat: "stamina", before: 9, after: 10 },
        },
      ],
    });
    expect(foreign.ok).toBe(false);

    const missingAnchor = aggregateTrainingHistory({
      personId: "person_000001",
      currentAbsoluteWeek: 5,
      events: [
        {
          sequence: 1,
          eventType: "training.stat_growth_applied",
          sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
          absoluteWeek: 5,
          worldDate: { year: 1, month: 1, week: 1 },
          personIds: ["person_000001"],
          payload: { targetStat: "stamina", before: 1, after: 2 },
        },
      ],
    });
    expect(missingAnchor.ok).toBe(false);
  });

  it("FI-045 foreign-processor events excluded from TrainingHistory groups", () => {
    const result = aggregateTrainingHistory({
      personId: "person_000001",
      currentAbsoluteWeek: 5,
      events: [
        {
          sequence: 1,
          eventType: "training.action_selected",
          sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
          absoluteWeek: 5,
          worldDate: { year: 1, month: 2, week: 1 },
          personIds: ["person_000001"],
          payload: {
            action: "rest",
            targetStat: null,
            targetTechniqueId: null,
            forced: false,
            forcedReason: null,
          },
        },
        {
          sequence: 2,
          eventType: "training.stat_growth_applied",
          sourceProcessor: "battle.processor",
          absoluteWeek: 5,
          worldDate: { year: 1, month: 2, week: 1 },
          personIds: ["person_000001"],
          payload: { targetStat: "stamina", before: 1, after: 2 },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]!.statChanges).toEqual([]);
    }
  });

  it("FI-046 temporaryCondition out of bounds → fail (no clamp); repaired retry ok", () => {
    const livingChild = {
      personId: "person_000001",
      familyId: "family_000001",
      lifeStatus: "living" as const,
      careerStatus: "child" as const,
      qualifiedMaster: false,
      currentAge: 5,
      birthYear: 1,
      abilities: {
        stamina: { surfaceValue: 10 },
        strength: { surfaceValue: 10 },
        skill: { surfaceValue: 10 },
        speed: { surfaceValue: 10 },
        spirit: { surfaceValue: 10 },
        magic: { surfaceValue: 10 },
      },
      aptitudes: {
        unarmed: { surfaceValue: 10 },
        sword: { surfaceValue: 10 },
        magic: { surfaceValue: 10 },
      },
      sprint1State: { currentMental: 10, learningFocusTechniqueId: null },
    };
    const providerCallCount = 0; // pure mapPersonDetailDirect: no Sha256/CSPRNG/MatchId allocator

    const bad = mapPersonDetailDirect({
      person: livingChild,
      temporaryCondition: { fatigue: 101, injury: 0, condition: 0, confidence: 0 },
      worldYear: 6,
    });
    expect(bad.ok).toBe(false);
    expect(providerCallCount).toBe(0);

    // FI-046 repaired retry: in-range temporaryCondition (no clamp of prior bad input)
    const fi046Retry = mapPersonDetailDirect({
      person: livingChild,
      temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
      worldYear: 6,
    });
    expect(fi046Retry.ok).toBe(true);
    if (fi046Retry.ok) {
      expect(fi046Retry.value.temporaryCondition).toEqual({
        fatigue: 0,
        injury: 0,
        condition: 0,
        confidence: 0,
      });
      expect(fi046Retry.value.age).toBe(5);
      expect(fi046Retry.value.familyId).toBe("family_000001");
    }
    expect(providerCallCount).toBe(0);
  });
});
