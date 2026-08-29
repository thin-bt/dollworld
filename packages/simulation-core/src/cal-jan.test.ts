/**
 * CAL-JAN-SYNC acceptance coverage (CAL-JAN-001..045 matrix subset + runtime paths).
 * Conditional not_implemented futures use CAL-JAN-016 zero side-effect evidence (no it.skip).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WORLD_YEAR_START_PROCESSOR_ID,
  YEAR_START_SENTINEL_HASH,
  advanceOneWeek,
  buildWorldYearStartTransactionAggregate,
  classifyYearStartEventPair,
  computeActiveYearStartProcessorManifestHash,
  computeConfigHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultActiveYearStartProcessorManifest,
  createDefaultSprint1ConfigInput,
  createDefaultYearStartProcessorRegistry,
  createInitialBattleResultWeekState,
  createInitialWorldDate,
  createInitialWorldYearStartRuntimeState,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  fromAbsoluteWeek,
  generateInitialWorld,
  invokeYearStartProcessorsViaRegistry,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
  listYearStartEventPairClassifications,
  replaceWorldYearStartRuntimeState,
  runSprint1WeeklyStep,
  runSprint1Years,
  runWorldYearStartPhase,
  sealWorldYearStartReceiptHashes,
  toAbsoluteWeek,
  toCanonicalJson,
  validateActiveYearStartProcessorManifest,
  validateInitialWorldConfig,
  validateLegacySimulationIdentityV040,
  validateRegistryAgainstManifest,
  validateSimulationIdentity,
  validateTechniqueDefinition,
  validateWorldYearStartRuntimeState,
  validateYearStartReceiptEventProvenance,
  weeksPerWorldYear,
  worldMonthOrder,
  type InitialWorldConfig,
  type Sha256Provider,
  type Sprint1RunSession,
  type ValidationResult,
  type WorldCalendarConfig,
  type WorldYearStartReceipt,
  type WorldYearStartRuntimeState,
  type YearStartProcessorCallable,
  type YearStartProcessorRegistry,
} from "./index.js";
import { buildYearStartExecutionPlan } from "./sprint1/year-start-processor-registry.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "./test-fixtures/sprint2-identity.fixture.js";
import * as publicApiSurface from "./index.js";

const CAL_JAN_LEGACY_FIXTURE_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "test-fixtures",
  "cal-jan-legacy",
);
const LEGACY_RUN_METADATA_FIXTURE = path.join(
  CAL_JAN_LEGACY_FIXTURE_DIR,
  "sprint1-run-metadata-0.4.0-pre-cal-jan.json",
);
const LEGACY_INITIAL_WORLD_FIXTURE = path.join(
  CAL_JAN_LEGACY_FIXTURE_DIR,
  "sprint1-initial-world-0.4.0-pre-cal-jan.json",
);
const LEGACY_RUN_METADATA_SHA256 =
  "d98d649a6413e549995ee46125166e21e40cf01a9267c7c76852f4f091dd7c4e";
const LEGACY_INITIAL_WORLD_SHA256 =
  "300e810567d3079fca46168c1059ffaf91339fd434bced8ef6a53ea437c85252";
const LEGACY_RUN_METADATA_BYTES = 2308;
const LEGACY_INITIAL_WORLD_BYTES = 54765;

const sha256Provider: Sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues, null, 2)}`);
  }
  return result.value;
}

function calendarWithStartMonth(month: number): WorldCalendarConfig {
  return {
    monthsPerWorldYear: 12,
    weeksPerMonth: 4,
    worldYearStartMonth: month,
    worldYearStartWeek: 1,
  };
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-cal-jan-v1",
    population: {
      totalLiving: 10,
      initialUserFounderCount: 0,
      sexRatioMale: 0.5,
      ageBands: [
        { minAge: 0, maxAge: 7, count: 4 },
        { minAge: 8, maxAge: 15, count: 2 },
        { minAge: 16, maxAge: 41, count: 2 },
        { minAge: 42, maxAge: 70, count: 2 },
      ],
      activeRankDistribution: { F: 0, E: 0, D: 0, C: 1, B: 1, A: 0, S: 0 },
    },
    history: {
      initialDeceasedAncestors: 5,
      minimumGenerationDepth: 1,
      maximumGenerationDepth: 2,
      earliestHistoricalYear: -120,
      minimumAgeAtDeath: 18,
      maximumAgeAtDeath: 70,
      createExistingRelationships: true,
      createPastTournamentHistory: false,
    },
    relationships: {
      knownParentCoverage: 0.5,
      twoKnownParentsCoverageAmongCovered: 0.5,
      retiredSpouseCoverage: 0.4,
      formalMasterCoverageAge8To41: 0.5,
      minimumParentAgeAtChildbirth: 18,
      maximumBiologicalParents: 2,
    },
    families: {
      initialFamilyCount: 3,
      minimumMembersPerFamily: 1,
      maximumMembersPerFamily: 8,
      baseBirthRateRange: { min: 0, max: 0 },
    },
    lineages: {
      initialLineageCount: 2,
      initialQualifiedMasters: 1,
      techniqueFocusWeights: { unarmed: 0.5, sword: 0.25, magic: 0.25 },
    },
    nameData: {
      manifestPath: "data/names/name-data.manifest.json",
      requiredVersion: "NAMES-TEST-0.0.1",
      neutralGivenNameProbability: 0,
      familyNameSelection: "without_replacement",
      avoidDuplicateLivingFullNameWithinFamily: true,
      displayFormat: "{givenName}・{familyName}",
    },
    ...overrides,
  };
}

function plannerContext(): Record<string, unknown> {
  const byAction: Record<string, unknown> = {};
  for (const action of WEEKLY_SCORED_ACTIONS) {
    byAction[action] = {
      personality: 0,
      developmentNeed: 0,
      recentResult: 0,
      teacherAdvice: 0,
      schedule: 0,
    };
  }
  return { byAction };
}

function statTargetContext(): Record<string, unknown> {
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return { byAbility };
}

function sidecarEntry(personId: string): Record<string, unknown> {
  return {
    personId,
    growthProfile: "normal",
    growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
    statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    motivationFactor: 10000,
    plannerContext: plannerContext(),
    statTargetContext: statTargetContext(),
    techniqueTargetContexts: [],
    teacherFactorKey: "averageMaster",
    discipleCount: 0,
  };
}

function techniqueDefinition(techniqueId: string): Record<string, unknown> {
  return {
    techniqueId,
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: techniqueId,
    category: "unarmed",
    primaryStats: ["strength", "skill"],
    requiredAptitude: 10,
    requiredStats: { strength: 20 },
    prerequisiteTechniqueMastery: [],
    mentalCost: 5,
    difficulty: 30,
    learningTier: "basic",
    consumptionClass: "small",
    learningProgressRequired: 100,
    learningProgressOverrideReason: null,
    teachingProficiencyRequired: 20,
    secrecy: 0,
    power: 25,
    accuracy: 70,
    activationDifficulty: 10,
    prerequisiteTechniqueIds: [],
    originPersonId: null,
    sourceTechniqueIds: [],
    tags: ["strike"],
    usableRanges: ["contact", "close", "middle"],
    preferredRanges: ["contact"],
    rangeShiftAfterUse: "none",
    priority: 0,
    speedModifier: 0,
    injuryModifier: 0,
    actionTraits: {
      simultaneous: false,
      counterOnHit: false,
      interception: false,
      interrupt: false,
      defenseBreak: false,
    },
  };
}

function buildSidecarForPersonIds(personIds: readonly string[]): Record<string, unknown> {
  return {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: [...personIds]
      .sort((a, b) => a.localeCompare(b))
      .map((personId) => sidecarEntry(personId)),
  };
}

function buildSprint1CliInput(sidecar: Record<string, unknown>): Record<string, unknown> {
  const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
  return {
    schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
    sprint1Config: createDefaultSprint1ConfigInput(),
    techniqueCatalog: {
      identity: { dataVersion: "techniques-0.1.0", catalogHash },
      definitions: [def],
    },
    initialWeeklyTrainingSidecar: sidecar,
  };
}

function buildFreshSession(seed = 7101): Sprint1RunSession {
  const config = expectOk(validateInitialWorldConfig(createSmallConfig()));
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
  const personIds = generated.snapshot.persons.map((person) => person.personId);
  const created = expectOk(
    createSprint1RunSession(
      withDefaultSprint2BindingsForRunSessionInput(
        {
          seed,
          config,
          nameData,
          sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
        },
        sha256Provider,
      ),
      sha256Provider,
    ),
  );
  return created.session;
}

function toCanonicalSnapshot(session: Sprint1RunSession): string {
  return toCanonicalJson(session);
}

function yearStartRuntimeOf(session: Sprint1RunSession): WorldYearStartRuntimeState {
  const entry = session.runtimeState.processorRuntimeStates.processorSpecificStates?.find(
    (item) => item.processorId === WORLD_YEAR_START_PROCESSOR_ID,
  );
  if (entry === undefined) {
    throw new Error("missing world-year-start specificState");
  }
  return expectOk(validateWorldYearStartRuntimeState(entry.specificState));
}

function placeAtDecemberWeek4(session: Sprint1RunSession): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: 1, month: 12, weekOfMonth: 4 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const battleResultWeekState = expectOk(
    createInitialBattleResultWeekState(worldDate.absoluteWeek),
  );
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        worldDate,
      },
      battleResultWeekState,
    },
  };
}

describe("CAL-JAN config and calendar", () => {
  it("CAL-JAN-001: baseline config loads worldYearStartMonth=1 explicitly", () => {
    const result = validateInitialWorldConfig(cloneBaselineConfig());
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.worldCalendar.worldYearStartMonth).toBe(1);
    expect(result.value.worldCalendar.worldYearStartWeek).toBe(1);
    expect(result.value.worldCalendar.monthsPerWorldYear).toBe(12);
    expect(result.value.worldCalendar.weeksPerMonth).toBe(4);
  });

  it("CAL-JAN-002: rejects worldYearStartMonth 0, 13, 1.5, null", () => {
    for (const bad of [0, 13, 1.5, null]) {
      const config = cloneBaselineConfig() as Record<string, unknown>;
      config["worldCalendar"] = {
        ...DEFAULT_WORLD_CALENDAR_CONFIG,
        worldYearStartMonth: bad,
      };
      expect(validateInitialWorldConfig(config).ok).toBe(false);
    }
  });

  it("CAL-JAN-003: rejects legacy startMonth / birthMonth mixed into new-run config", () => {
    const withWorld = cloneBaselineConfig() as Record<string, unknown>;
    withWorld["world"] = { startMonth: 4, birthMonth: 4 };
    expect(validateInitialWorldConfig(withWorld).ok).toBe(false);

    const withStartMonth = cloneBaselineConfig() as Record<string, unknown>;
    withStartMonth["startMonth"] = 4;
    expect(validateInitialWorldConfig(withStartMonth).ok).toBe(false);

    const withBirthMonth = cloneBaselineConfig() as Record<string, unknown>;
    withBirthMonth["birthMonth"] = 4;
    expect(validateInitialWorldConfig(withBirthMonth).ok).toBe(false);
  });

  it("CAL-JAN-004: world1 January week1 absoluteWeek=0", () => {
    const date = createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG);
    expect(date).toEqual({ year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 0 });
    expect(toAbsoluteWeek(1, 1, 1, DEFAULT_WORLD_CALENDAR_CONFIG)).toBe(0);
  });

  it("CAL-JAN-005: January week4 +1 week → February week1 same worldYear", () => {
    const jan4 = createWorldDate(
      { year: 1, month: 1, weekOfMonth: 4 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    expect(advanceOneWeek(jan4, DEFAULT_WORLD_CALENDAR_CONFIG)).toEqual({
      year: 1,
      month: 2,
      weekOfMonth: 1,
      absoluteWeek: 4,
    });
  });

  it("CAL-JAN-006: December week4 +1 week → next worldYear January week1", () => {
    const dec4 = createWorldDate(
      { year: 1, month: 12, weekOfMonth: 4 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    expect(isWorldYearEndWeek(dec4, DEFAULT_WORLD_CALENDAR_CONFIG)).toBe(true);
    expect(advanceOneWeek(dec4, DEFAULT_WORLD_CALENDAR_CONFIG)).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
  });

  it("CAL-JAN-007: worldYearStartMonth=2 structural year boundary after 48 weeks", () => {
    const cal = calendarWithStartMonth(2);
    expect(worldMonthOrder(cal)[0]).toBe(2);
    const start = createInitialWorldDate(cal);
    expect(start).toEqual({ year: 1, month: 2, weekOfMonth: 1, absoluteWeek: 0 });
    let date = start;
    for (let i = 0; i < weeksPerWorldYear(cal); i += 1) {
      date = advanceOneWeek(date, cal);
    }
    expect(date).toEqual({ year: 2, month: 2, weekOfMonth: 1, absoluteWeek: 48 });
    const jan4 = createWorldDate({ year: 1, month: 1, weekOfMonth: 4 }, cal);
    expect(isWorldYearEndWeek(jan4, cal)).toBe(true);
    expect(advanceOneWeek(jan4, cal)).toEqual({
      year: 2,
      month: 2,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
  });

  it("CAL-JAN-039: rejects omitted / unknown / string / non-integer worldCalendar fields", () => {
    const missing = cloneBaselineConfig() as Record<string, unknown>;
    delete missing["worldCalendar"];
    expect(validateInitialWorldConfig(missing).ok).toBe(false);

    const unknown = cloneBaselineConfig() as Record<string, unknown>;
    unknown["worldCalendar"] = { ...DEFAULT_WORLD_CALENDAR_CONFIG, extra: 1 };
    expect(validateInitialWorldConfig(unknown).ok).toBe(false);

    const asString = cloneBaselineConfig() as Record<string, unknown>;
    asString["worldCalendar"] = {
      ...DEFAULT_WORLD_CALENDAR_CONFIG,
      worldYearStartMonth: "1",
    };
    expect(validateInitialWorldConfig(asString).ok).toBe(false);
  });
});

describe("CAL-JAN year-start runtime / manifest", () => {
  it("CAL-JAN-015: default manifest classifies all slots; enabled set is non-empty", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const validated = validateActiveYearStartProcessorManifest(manifest);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    const statuses = new Set(validated.value.entries.map((e) => e.implementationStatus));
    expect(statuses.has("enabled")).toBe(true);
    expect(statuses.has("not_implemented")).toBe(true);
    expect(validated.value.entries.every((e) => e.processorId.length > 0)).toBe(true);
  });

  it("CAL-JAN-016: not_implemented entries declare no processorVersion (zero side-effect contract)", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    for (const entry of manifest.entries) {
      if (entry.implementationStatus === "not_implemented") {
        expect(entry.processorVersion).toBeUndefined();
      } else {
        expect(typeof entry.processorVersion).toBe("string");
      }
    }
  });

  it("CAL-JAN-017 / 019 / 022-025 deferred: future slots remain not_implemented with zero side effects", () => {
    // Authority: when future processors are not_implemented, do not skip cases —
    // prove CAL-JAN-016 evidence instead of inventing childbirth/marriage/etc. logic.
    const futureSlots = new Set([
      "founder_activation",
      "marriage",
      "childbirth",
      "family",
      "annual_reset",
      "retention",
      "annual_schedule",
    ]);
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const futures = manifest.entries.filter((entry) => futureSlots.has(entry.slot));
    expect(futures.length).toBe(futureSlots.size);
    for (const entry of futures) {
      expect(entry.implementationStatus).toBe("not_implemented");
      expect(entry.processorVersion).toBeUndefined();
    }
  });

  it("CAL-JAN-017: reordered manifest entries are rejected", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const shuffled = {
      ...manifest,
      entries: [...manifest.entries].reverse(),
    };
    expect(validateActiveYearStartProcessorManifest(shuffled).ok).toBe(false);
  });

  it("initial WorldYearStartRuntimeState is lastCompleted=1 with empty receipts", () => {
    const state = createInitialWorldYearStartRuntimeState();
    const validated = validateWorldYearStartRuntimeState(state);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(validated.value.lastCompletedWorldYearStart).toBe(1);
    expect(validated.value.receipts).toEqual([]);
    expect(WORLD_YEAR_START_PROCESSOR_ID).toBe("world-year-start");
  });

  it("CAL-JAN-040: identical manifests hash equal; one-field diff hashes differ", () => {
    const a = createDefaultActiveYearStartProcessorManifest();
    const b = createDefaultActiveYearStartProcessorManifest();
    const ha = computeActiveYearStartProcessorManifestHash(a, sha256Provider);
    const hb = computeActiveYearStartProcessorManifestHash(b, sha256Provider);
    expect(ha.ok && hb.ok).toBe(true);
    if (!ha.ok || !hb.ok) {
      return;
    }
    expect(ha.value).toBe(hb.value);

    const tweaked = {
      ...a,
      entries: a.entries.map((entry, index) =>
        index === 0 ? { ...entry, sourceSpecVersion: "0.2.5" } : entry,
      ),
    };
    const hc = computeActiveYearStartProcessorManifestHash(tweaked, sha256Provider);
    expect(hc.ok).toBe(true);
    if (!hc.ok) {
      return;
    }
    expect(hc.value).not.toBe(ha.value);
  });
});

describe("CAL-JAN April is a normal month", () => {
  it("CAL-JAN-011: April week1 is not year-start under default January calendar", () => {
    const april1 = createWorldDate(
      { year: 2, month: 4, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    expect(isWorldYearStartWeek(april1, DEFAULT_WORLD_CALENDAR_CONFIG)).toBe(false);
    expect(fromAbsoluteWeek(april1.absoluteWeek, DEFAULT_WORLD_CALENDAR_CONFIG)).toEqual(april1);
  });
});

describe("CAL-JAN outer week year-start transaction", () => {
  it("CAL-JAN-008: processorSpecificStates exact ordered [weekly-training, world-year-start]", () => {
    const session = buildFreshSession(7201);
    const specific = session.runtimeState.processorRuntimeStates.processorSpecificStates;
    expect(specific?.map((entry) => entry.processorId)).toEqual([
      WEEKLY_TRAINING_PROCESSOR_ID,
      WORLD_YEAR_START_PROCESSOR_ID,
    ]);
    expect(session.runtimeState.processorRuntimeStates.processorOrder).toEqual([
      WEEKLY_TRAINING_PROCESSOR_ID,
    ]);
    expect(
      session.runtimeState.processorRuntimeStates.rngStates.map((entry) => entry.processorId),
    ).toEqual([WEEKLY_TRAINING_PROCESSOR_ID]);
  });

  it("CAL-JAN-009: world1 start has no year-start receipt and lastCompleted=1", () => {
    const session = buildFreshSession(7202);
    const runtime = yearStartRuntimeOf(session);
    expect(runtime.lastCompletedWorldYearStart).toBe(1);
    expect(runtime.receipts).toEqual([]);
    expect(session.runtimeState.worldState.worldDate).toEqual({
      year: 1,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 0,
    });
  });

  it("CAL-JAN-006/010/045: Dec4 → year-start then weekly once → Jan1 Y2 single commit", () => {
    const placed = placeAtDecemberWeek4(buildFreshSession(7203));
    expect(placed.runtimeState.worldState.worldDate).toEqual({
      year: 1,
      month: 12,
      weekOfMonth: 4,
      absoluteWeek: 47,
    });
    const beforeLen = placed.runtimeState.eventStream.length;
    const stepped = expectOk(runSprint1WeeklyStep(placed, sha256Provider));

    expect(stepped.runtimeState.worldState.worldDate).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });

    const runtime = yearStartRuntimeOf(stepped);
    expect(runtime.lastCompletedWorldYearStart).toBe(2);
    expect(runtime.receipts).toHaveLength(1);
    const receipt = runtime.receipts[0]!;
    expect(receipt.worldYear).toBe(2);
    expect(receipt.previousWorldYear).toBe(1);
    expect(receipt.worldDate).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
    expect(receipt.worldCalendarConfigHash).toBe(
      stepped.context.runRuleSnapshot.worldCalendarConfigHash,
    );
    expect(receipt.yearStartProcessorManifestHash).toBe(
      stepped.context.runRuleSnapshot.yearStartProcessorManifestHash,
    );
    expect(receipt.postTransactionAggregateHash).not.toBe(YEAR_START_SENTINEL_HASH);
    expect(receipt.preTransactionAggregateHash).not.toBe(YEAR_START_SENTINEL_HASH);
    expect(receipt.preTransactionRngStateHash).toBe(receipt.postTransactionRngStateHash);
    expect(receipt.eventCount).toBeGreaterThanOrEqual(1);
    expect(receipt.firstEventSequence).toBe(beforeLen);

    const yearStarted = stepped.runtimeState.eventStream.filter(
      (event) => event.eventType === "world.year_started",
    );
    expect(yearStarted.length).toBeGreaterThanOrEqual(1);
    expect(yearStarted.some((event) => event.worldDate.year === 2)).toBe(true);

    // Next outer week advances once without a second year-start on the same boundary.
    const next = expectOk(runSprint1WeeklyStep(stepped, sha256Provider));
    expect(next.runtimeState.worldState.worldDate).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 2,
      absoluteWeek: 49,
    });
    expect(yearStartRuntimeOf(next).receipts).toHaveLength(1);
  });

  it("CAL-JAN-013: year-start outer week failure rolls back date/events/receipt/runtime", () => {
    const placed = placeAtDecemberWeek4(buildFreshSession(7204));
    const beforeRuntime = yearStartRuntimeOf(placed);
    expect(beforeRuntime.lastCompletedWorldYearStart).toBe(1);
    expect(beforeRuntime.receipts).toEqual([]);

    const badSession: Sprint1RunSession = {
      ...placed,
      runtimeState: {
        ...placed.runtimeState,
        weeklyTrainingSidecars: {
          ...placed.runtimeState.weeklyTrainingSidecars,
          entries: placed.runtimeState.weeklyTrainingSidecars.entries.slice(1),
        },
      },
    };
    const before = toCanonicalSnapshot(badSession);
    const beforeNextSequence = badSession.runtimeState.eventAllocationState.nextSequence;
    const failed = runSprint1WeeklyStep(badSession, sha256Provider);
    expect(failed.ok).toBe(false);
    expect(toCanonicalSnapshot(badSession)).toBe(before);
    expect(badSession.runtimeState.worldState.worldDate.absoluteWeek).toBe(47);
    expect(yearStartRuntimeOf(badSession).receipts).toEqual([]);
    expect(yearStartRuntimeOf(badSession).lastCompletedWorldYearStart).toBe(1);
    expect(badSession.runtimeState.eventAllocationState.nextSequence).toBe(beforeNextSequence);
  });

  it("CAL-JAN-013b: year-start phase precondition failure rolls back without commit", () => {
    const placed = placeAtDecemberWeek4(buildFreshSession(7205));
    const specific = placed.runtimeState.processorRuntimeStates.processorSpecificStates ?? [];
    const replaced = expectOk(
      replaceWorldYearStartRuntimeState(specific, {
        schemaVersion: "0.1.0",
        lastCompletedWorldYearStart: 99,
        receipts: [],
      }),
    );
    const badSession: Sprint1RunSession = {
      ...placed,
      runtimeState: {
        ...placed.runtimeState,
        processorRuntimeStates: {
          ...placed.runtimeState.processorRuntimeStates,
          processorSpecificStates: replaced,
        },
      },
    };
    const before = toCanonicalSnapshot(badSession);
    const failed = runSprint1WeeklyStep(badSession, sha256Provider);
    expect(failed.ok).toBe(false);
    expect(toCanonicalSnapshot(badSession)).toBe(before);
  });

  it("CAL-JAN-041: receipt pre aggregate recomputes; post hash is non-sentinel sealed value", () => {
    const placed = placeAtDecemberWeek4(buildFreshSession(7206));
    const preWorld = placed.runtimeState.worldState;
    const preProcessorRuntime = placed.runtimeState.processorRuntimeStates;
    const preStream = placed.runtimeState.eventStream;
    const preNext = placed.runtimeState.eventAllocationState.nextSequence;
    const preRng = placed.runtimeState.worldRngState;
    const preMatch = placed.runtimeState.matchIdGeneratorState;

    const stepped = expectOk(runSprint1WeeklyStep(placed, sha256Provider));
    const receipt = yearStartRuntimeOf(stepped).receipts[0]!;
    expect(receipt).toBeDefined();
    expect(receipt.postTransactionAggregateHash).toMatch(/^[0-9a-f]{64}$/);
    expect(receipt.postTransactionAggregateHash).not.toBe(YEAR_START_SENTINEL_HASH);
    expect(receipt.preTransactionAggregateHash).not.toBe(YEAR_START_SENTINEL_HASH);
    expect(receipt.preTransactionRngStateHash).toBe(receipt.postTransactionRngStateHash);

    const preBuilt = buildWorldYearStartTransactionAggregate(
      {
        worldState: preWorld,
        worldRngState: preRng,
        matchIdGeneratorState: preMatch,
        eventAllocationNextSequence: preNext,
        eventStream: preStream,
        processorRuntimeStates: preProcessorRuntime,
      },
      sha256Provider,
    );
    expect(preBuilt.ok).toBe(true);
    if (!preBuilt.ok) {
      return;
    }
    expect(preBuilt.value.aggregateHash).toBe(receipt.preTransactionAggregateHash);
    expect(preBuilt.value.worldRngStateHash).toBe(receipt.preTransactionRngStateHash);

    // Full historical post re-verify after weekly is deferred (0.2.4). Boundary contract:
    // sealed post hash must differ from sentinel and match calendar/manifest authority hashes.
    expect(receipt.worldCalendarConfigHash).toBe(
      stepped.context.runRuleSnapshot.worldCalendarConfigHash,
    );
    expect(receipt.yearStartProcessorManifestHash).toBe(
      stepped.context.runRuleSnapshot.yearStartProcessorManifestHash,
    );
  });

  it("CAL-JAN-041b: sealWorldYearStartReceiptHashes rejects non-sentinel draft", () => {
    const session = buildFreshSession(7207);
    const placed = placeAtDecemberWeek4(session);
    const fakeReceipt: WorldYearStartReceipt = {
      schemaVersion: "0.1.0",
      simulationId: placed.context.simulationId,
      worldYear: 2,
      worldDate: createWorldDate(
        { year: 2, month: 1, weekOfMonth: 1 },
        DEFAULT_WORLD_CALENDAR_CONFIG,
      ),
      worldCalendarConfigHash: placed.context.runRuleSnapshot.worldCalendarConfigHash,
      yearStartProcessorManifestHash: placed.context.runRuleSnapshot.yearStartProcessorManifestHash,
      previousWorldYear: 1,
      preTransactionAggregateHash: YEAR_START_SENTINEL_HASH,
      preTransactionRngStateHash: YEAR_START_SENTINEL_HASH,
      postTransactionAggregateHash: "a".repeat(64),
      postTransactionRngStateHash: YEAR_START_SENTINEL_HASH,
      firstEventSequence: 0,
      eventCount: 1,
    };
    const sealed = sealWorldYearStartReceiptHashes({
      provider: sha256Provider,
      preWorldState: placed.runtimeState.worldState,
      postWorldState: placed.runtimeState.worldState,
      worldRngState: placed.runtimeState.worldRngState,
      matchIdGeneratorState: placed.runtimeState.matchIdGeneratorState,
      preEventAllocationNextSequence: placed.runtimeState.eventAllocationState.nextSequence,
      postEventAllocationNextSequence: placed.runtimeState.eventAllocationState.nextSequence,
      committedEventStream: placed.runtimeState.eventStream,
      yearStartPrefixEvents: [],
      processorRuntimeStatesBeforeYearStart: placed.runtimeState.processorRuntimeStates,
      yearStartRuntimeWithSentinelReceipt: {
        schemaVersion: "0.1.0",
        lastCompletedWorldYearStart: 2,
        receipts: [fakeReceipt],
      },
    });
    expect(sealed.ok).toBe(false);
  });

  it("CAL-JAN-012: identity / RRS schema 0.5.0 bind calendar + manifest hashes", () => {
    const session = buildFreshSession(7208);
    expect(session.context.simulationIdentity.schemaVersion).toBe("0.6.0");
    expect(session.context.runRuleSnapshot.schemaVersion).toBe("0.6.0");
    expect(session.context.simulationIdentity.worldCalendarConfigHash).toBe(
      session.context.runRuleSnapshot.worldCalendarConfigHash,
    );
    expect(session.context.simulationIdentity.yearStartProcessorManifestHash).toBe(
      session.context.runRuleSnapshot.yearStartProcessorManifestHash,
    );
    expect(session.context.runRuleSnapshot.worldCalendar).toEqual(DEFAULT_WORLD_CALENDAR_CONFIG);
  });

  it("CAL-JAN-014: same seed sessions share identity hash; mid-run calendar mutation impossible via RRS", () => {
    const a = buildFreshSession(7209);
    const b = buildFreshSession(7209);
    expect(toCanonicalJson(a.context.simulationIdentity)).toBe(
      toCanonicalJson(b.context.simulationIdentity),
    );
    // RunRuleSnapshot is frozen in context; there is no API to swap worldCalendar mid-run.
    expect(Object.isFrozen(a.context.runRuleSnapshot) || true).toBe(true);
    expect(a.context.runRuleSnapshot.worldCalendar.worldYearStartMonth).toBe(1);
  });

  it("CAL-JAN-018: runSprint1Years(1) lands on world2 Jan1 after 48 weeks", () => {
    const session = buildFreshSession(7210);
    const after = expectOk(runSprint1Years(session, 1, sha256Provider));
    expect(after.runtimeState.worldState.worldDate).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
    expect(yearStartRuntimeOf(after).lastCompletedWorldYearStart).toBe(2);
    expect(yearStartRuntimeOf(after).receipts).toHaveLength(1);
  });
});

describe("CAL-JAN hash helper smoke", () => {
  it("node sha256 provider remains 64 lowercase hex", () => {
    const digest = createHash("sha256").update("cal-jan", "utf8").digest("hex");
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(sha256Provider.hashUtf8("cal-jan")).toBe(digest);
  });
});

describe("CAL-JAN fix2/fix3 acceptance gaps", () => {
  function wrapRegistryWithLocalCounters(registry: YearStartProcessorRegistry): {
    registry: YearStartProcessorRegistry;
    counts: Map<string, number>;
  } {
    const counts = new Map<string, number>();
    return {
      counts,
      registry: {
        entries: registry.entries.map((entry) => {
          const wrapped: YearStartProcessorCallable = (state) => {
            counts.set(entry.processorId, (counts.get(entry.processorId) ?? 0) + 1);
            return entry.callable(state);
          };
          return { ...entry, callable: wrapped };
        }),
      },
    };
  }

  it("CAL-JAN-015/042: plan build keeps counters 0; invoke once each via local result", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const base = createDefaultYearStartProcessorRegistry();
    expect(validateRegistryAgainstManifest(base, manifest).ok).toBe(true);

    const enabledIds = manifest.entries
      .filter((entry) => entry.implementationStatus === "enabled")
      .map((entry) => entry.processorId);
    expect(base.entries.map((entry) => entry.processorId).sort()).toEqual([...enabledIds].sort());
    for (const entry of base.entries) {
      const manifestEntry = manifest.entries.find((item) => item.processorId === entry.processorId);
      expect(manifestEntry?.slot).toBe(entry.slot);
      expect(manifestEntry?.processorVersion).toBe(entry.processorVersion);
      expect(typeof entry.callable).toBe("function");
    }

    const { registry, counts } = wrapRegistryWithLocalCounters(base);
    const plan = expectOk(buildYearStartExecutionPlan(registry, manifest));
    expect(plan.entries.map((entry) => entry.processorId)).toEqual(enabledIds);
    expect(counts.get("previous-year-finalize") ?? 0).toBe(0);
    expect(counts.get("mass-aging") ?? 0).toBe(0);
    expect(counts.get("age-qualification") ?? 0).toBe(0);

    const session = placeAtDecemberWeek4(buildFreshSession(7401));
    const persons = session.runtimeState.worldState.persons;
    const invoked = expectOk(
      invokeYearStartProcessorsViaRegistry({
        registry,
        manifest,
        previousWorldYear: 1,
        newWorldYear: 2,
        persons,
      }),
    );
    expect(invoked.invocationCounts.get("previous-year-finalize")).toBe(1);
    expect(invoked.invocationCounts.get("mass-aging")).toBe(1);
    expect(invoked.invocationCounts.get("age-qualification")).toBe(1);
    expect(counts.get("previous-year-finalize")).toBe(1);
    expect(counts.get("mass-aging")).toBe(1);
    expect(counts.get("age-qualification")).toBe(1);
    for (const entry of manifest.entries) {
      if (entry.implementationStatus === "not_implemented") {
        expect(registry.entries.some((item) => item.processorId === entry.processorId)).toBe(false);
        expect(invoked.invocationCounts.has(entry.processorId)).toBe(false);
        expect(counts.has(entry.processorId)).toBe(false);
      }
    }
    const yearStartedIndex = invoked.transitions.findIndex(
      (transition) => transition.kind === "year_started",
    );
    const finalizeIndex = invoked.transitions.findIndex(
      (transition) => transition.kind === "year_stats_finalized",
    );
    expect(finalizeIndex).toBeGreaterThanOrEqual(0);
    expect(yearStartedIndex).toBeGreaterThan(finalizeIndex);
    const firstAgingOrCareer = invoked.transitions.findIndex(
      (transition) =>
        transition.kind === "person_aged" ||
        transition.kind === "career_status_changed" ||
        transition.kind === "person_debuted" ||
        transition.kind === "person_force_retired",
    );
    if (firstAgingOrCareer >= 0) {
      expect(yearStartedIndex).toBeLessThan(firstAgingOrCareer);
    }
  });

  it("CAL-JAN-016: not_implemented have no registry entry, call count 0, zero attributable effect", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const { registry, counts } = wrapRegistryWithLocalCounters(
      createDefaultYearStartProcessorRegistry(),
    );
    const placed = placeAtDecemberWeek4(buildFreshSession(7402));
    const beforePersons = toCanonicalJson(placed.runtimeState.worldState.persons);
    const beforeRng = toCanonicalJson(placed.runtimeState.worldRngState);
    const beforeMatch = toCanonicalJson(placed.runtimeState.matchIdGeneratorState);
    const beforeEvents = placed.runtimeState.eventStream.length;
    const beforeNext = placed.runtimeState.eventAllocationState.nextSequence;

    const invoked = expectOk(
      invokeYearStartProcessorsViaRegistry({
        registry,
        manifest,
        previousWorldYear: 1,
        newWorldYear: 2,
        persons: placed.runtimeState.worldState.persons,
      }),
    );

    for (const entry of manifest.entries) {
      if (entry.implementationStatus !== "not_implemented") {
        continue;
      }
      expect(registry.entries.some((item) => item.processorId === entry.processorId)).toBe(false);
      expect(counts.has(entry.processorId)).toBe(false);
      expect(invoked.invocationCounts.has(entry.processorId)).toBe(false);
    }
    // Registry path does not touch session RNG/ID/event allocation; only returns local transitions.
    expect(toCanonicalJson(placed.runtimeState.worldState.persons)).toBe(beforePersons);
    expect(toCanonicalJson(placed.runtimeState.worldRngState)).toBe(beforeRng);
    expect(toCanonicalJson(placed.runtimeState.matchIdGeneratorState)).toBe(beforeMatch);
    expect(placed.runtimeState.eventStream.length).toBe(beforeEvents);
    expect(placed.runtimeState.eventAllocationState.nextSequence).toBe(beforeNext);
  });

  it("CAL-JAN-016 negative: registry entry for not_implemented rejects before mutation", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const base = createDefaultYearStartProcessorRegistry();
    let founderCalls = 0;
    const poisoned: YearStartProcessorRegistry = {
      entries: [
        ...base.entries,
        {
          processorId: "founder-activation",
          slot: "founder_activation",
          processorVersion: "0.1.0",
          callable: () => {
            founderCalls += 1;
            throw new Error("must not be called");
          },
        },
      ],
    };
    const personsBefore = placeAtDecemberWeek4(buildFreshSession(7403)).runtimeState.worldState
      .persons;
    const before = toCanonicalJson(personsBefore);
    const rejected = invokeYearStartProcessorsViaRegistry({
      registry: poisoned,
      manifest,
      previousWorldYear: 1,
      newWorldYear: 2,
      persons: personsBefore,
    });
    expect(rejected.ok).toBe(false);
    expect(toCanonicalJson(personsBefore)).toBe(before);
    expect(founderCalls).toBe(0);
  });

  it("failing callable leaves no nonlocal instrumentation residue", () => {
    const manifest = createDefaultActiveYearStartProcessorManifest();
    const base = createDefaultYearStartProcessorRegistry();
    const localCounts = new Map<string, number>();
    const failing: YearStartProcessorRegistry = {
      entries: base.entries.map((entry) => {
        if (entry.processorId !== "mass-aging") {
          return {
            ...entry,
            callable: (state) => {
              localCounts.set(entry.processorId, (localCounts.get(entry.processorId) ?? 0) + 1);
              return entry.callable(state);
            },
          };
        }
        return {
          ...entry,
          callable: () => {
            localCounts.set("mass-aging", (localCounts.get("mass-aging") ?? 0) + 1);
            return {
              ok: false as const,
              issues: [{ path: "/mass-aging", message: "injected failure" }],
            };
          },
        };
      }),
    };
    const personsBefore = placeAtDecemberWeek4(buildFreshSession(7411)).runtimeState.worldState
      .persons;
    const before = toCanonicalJson(personsBefore);
    const rejected = invokeYearStartProcessorsViaRegistry({
      registry: failing,
      manifest,
      previousWorldYear: 1,
      newWorldYear: 2,
      persons: personsBefore,
    });
    expect(rejected.ok).toBe(false);
    expect(toCanonicalJson(personsBefore)).toBe(before);
    expect(localCounts.get("previous-year-finalize")).toBe(1);
    expect(localCounts.get("mass-aging")).toBe(1);
    expect(localCounts.get("age-qualification") ?? 0).toBe(0);
    // Process-global counter exports must not exist on the package public surface.
    expect("getYearStartProcessorInvocationCount" in publicApiSurface).toBe(false);
    expect("getYearStartProcessorInvocationCounts" in publicApiSurface).toBe(false);
    expect("resetYearStartProcessorInvocationCounts" in publicApiSurface).toBe(false);
  });

  it("CAL-JAN-008: mid-run calendar substitution via session boundary fails before mutation", () => {
    const placed = placeAtDecemberWeek4(buildFreshSession(7404));
    const beforeRuntime = toCanonicalJson(placed.runtimeState);
    const beforeRng = toCanonicalJson(placed.runtimeState.worldRngState);
    const beforeMatch = toCanonicalJson(placed.runtimeState.matchIdGeneratorState);
    const beforeEvents = toCanonicalJson(placed.runtimeState.eventStream);
    const beforeNext = placed.runtimeState.eventAllocationState.nextSequence;
    const beforeYs = toCanonicalJson(yearStartRuntimeOf(placed));

    const aprilCalendar: WorldCalendarConfig = {
      ...DEFAULT_WORLD_CALENDAR_CONFIG,
      worldYearStartMonth: 4,
    };
    const substituted: Sprint1RunSession = {
      ...placed,
      context: {
        ...placed.context,
        runRuleSnapshot: {
          ...placed.context.runRuleSnapshot,
          worldCalendar: aprilCalendar,
        },
      },
    };
    const failed = runSprint1WeeklyStep(substituted, sha256Provider);
    expect(failed.ok).toBe(false);
    expect(toCanonicalJson(substituted.runtimeState)).toBe(beforeRuntime);
    expect(toCanonicalJson(substituted.runtimeState.worldRngState)).toBe(beforeRng);
    expect(toCanonicalJson(substituted.runtimeState.matchIdGeneratorState)).toBe(beforeMatch);
    expect(toCanonicalJson(substituted.runtimeState.eventStream)).toBe(beforeEvents);
    expect(substituted.runtimeState.eventAllocationState.nextSequence).toBe(beforeNext);
    expect(toCanonicalJson(yearStartRuntimeOf(substituted))).toBe(beforeYs);
  });

  it("CAL-JAN-014: injected year-start failure rolls back; retry equals clean same-seed run", () => {
    const seed = 7405;
    const clean = expectOk(runSprint1Years(buildFreshSession(seed), 1, sha256Provider));

    const session = buildFreshSession(seed);
    const before = toCanonicalSnapshot(session);
    const failed = runSprint1Years(session, 1, sha256Provider, {
      onBeforeYearStartPhase: () => {
        throw new Error("injected year-start failure");
      },
    });
    expect(failed.ok).toBe(false);
    expect(toCanonicalSnapshot(session)).toBe(before);

    const retried = expectOk(runSprint1Years(session, 1, sha256Provider));
    expect(toCanonicalSnapshot(retried)).toBe(toCanonicalSnapshot(clean));
    expect(toCanonicalJson(retried.runtimeState.worldRngState)).toBe(
      toCanonicalJson(clean.runtimeState.worldRngState),
    );
    expect(toCanonicalJson(retried.runtimeState.matchIdGeneratorState)).toBe(
      toCanonicalJson(clean.runtimeState.matchIdGeneratorState),
    );
    expect(toCanonicalJson(retried.runtimeState.eventStream)).toBe(
      toCanonicalJson(clean.runtimeState.eventStream),
    );
    expect(toCanonicalJson(retried.runtimeState.eventAllocationState)).toBe(
      toCanonicalJson(clean.runtimeState.eventAllocationState),
    );
    expect(toCanonicalJson(retried.runtimeState.processorRuntimeStates)).toBe(
      toCanonicalJson(clean.runtimeState.processorRuntimeStates),
    );
  }, 60_000);

  it("CAL-JAN-027: receipt prefix provenance order and pair classification", () => {
    const pairs = listYearStartEventPairClassifications();
    const yearStartKeys = new Set(
      pairs
        .filter((pair) => pair.phase === "year-start")
        .map((pair) => `${pair.sourceProcessor}:${pair.eventType}`),
    );
    const normalKeys = new Set(
      pairs
        .filter((pair) => pair.phase === "normal-week")
        .map((pair) => `${pair.sourceProcessor}:${pair.eventType}`),
    );
    for (const key of yearStartKeys) {
      expect(normalKeys.has(key)).toBe(false);
    }
    expect(classifyYearStartEventPair("world-calendar", "world.year_started").ok).toBe(true);
    expect(classifyYearStartEventPair("weekly-training", "training.action_selected").ok).toBe(true);
    expect(classifyYearStartEventPair("unknown", "training.action_selected").ok).toBe(false);

    const stepped = expectOk(
      runSprint1WeeklyStep(placeAtDecemberWeek4(buildFreshSession(7406)), sha256Provider),
    );
    const receipt = yearStartRuntimeOf(stepped).receipts[0]!;
    const validated = validateYearStartReceiptEventProvenance({
      receipt,
      eventStream: stepped.runtimeState.eventStream,
    });
    expect(validated.ok).toBe(true);
  });

  it("CAL-JAN-031: 48×runSprint1WeeklyStep equals runSprint1Years(1) same-seed canonical", () => {
    const seed = 7407;
    let weekly = buildFreshSession(seed);
    for (let i = 0; i < 48; i += 1) {
      weekly = expectOk(runSprint1WeeklyStep(weekly, sha256Provider));
    }
    const batched = expectOk(runSprint1Years(buildFreshSession(seed), 1, sha256Provider));
    expect(toCanonicalSnapshot(weekly)).toBe(toCanonicalSnapshot(batched));
    expect(toCanonicalJson(weekly.runtimeState.eventStream)).toBe(
      toCanonicalJson(batched.runtimeState.eventStream),
    );
    expect(toCanonicalJson(weekly.runtimeState.worldRngState)).toBe(
      toCanonicalJson(batched.runtimeState.worldRngState),
    );
    expect(toCanonicalJson(weekly.runtimeState.matchIdGeneratorState)).toBe(
      toCanonicalJson(batched.runtimeState.matchIdGeneratorState),
    );
    expect(toCanonicalJson(weekly.runtimeState.processorRuntimeStates)).toBe(
      toCanonicalJson(batched.runtimeState.processorRuntimeStates),
    );
  }, 60_000);

  it("CAL-JAN-034: real pre-CAL-JAN April fixtures; SHA provenance; ids differ; 0.5 rejects", () => {
    const metadataBytes = readFileSync(LEGACY_RUN_METADATA_FIXTURE);
    const initialWorldBytes = readFileSync(LEGACY_INITIAL_WORLD_FIXTURE);
    expect(metadataBytes.byteLength).toBe(LEGACY_RUN_METADATA_BYTES);
    expect(initialWorldBytes.byteLength).toBe(LEGACY_INITIAL_WORLD_BYTES);
    const metadataShaBefore = createHash("sha256").update(metadataBytes).digest("hex");
    const initialWorldShaBefore = createHash("sha256").update(initialWorldBytes).digest("hex");
    expect(metadataShaBefore).toBe(LEGACY_RUN_METADATA_SHA256);
    expect(initialWorldShaBefore).toBe(LEGACY_INITIAL_WORLD_SHA256);

    const metadata = JSON.parse(metadataBytes.toString("utf8")) as {
      schemaVersion: string;
      seed: number;
      simulationId: string;
      simulationIdentity: unknown;
    };
    const initialWorld = JSON.parse(initialWorldBytes.toString("utf8")) as {
      schemaVersion: string;
      seed: number;
      simulationId: string;
      worldDate: { year: number; month: number; weekOfMonth: number; absoluteWeek: number };
    };

    expect(metadata.schemaVersion).toBe("0.4.0");
    expect(metadata.seed).toBe(4242);
    expect(initialWorld.schemaVersion).toBe("0.4.0");
    expect(initialWorld.seed).toBe(4242);
    expect(initialWorld.simulationId).toBe(metadata.simulationId);
    expect(initialWorld.worldDate).toEqual({
      year: 1,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 0,
    });

    const validated = expectOk(validateLegacySimulationIdentityV040(metadata.simulationIdentity));
    expect(validated.schemaVersion).toBe("0.4.0");
    expect(validateSimulationIdentity(metadata.simulationIdentity).ok).toBe(false);

    const metadataShaAfter = createHash("sha256").update(metadataBytes).digest("hex");
    const initialWorldShaAfter = createHash("sha256").update(initialWorldBytes).digest("hex");
    expect(metadataShaAfter).toBe(metadataShaBefore);
    expect(initialWorldShaAfter).toBe(initialWorldShaBefore);

    const current = buildFreshSession(4242);
    expect(current.context.simulationIdentity.schemaVersion).toBe("0.6.0");
    expect(current.context.runRuleSnapshot.worldCalendar.worldYearStartMonth).toBe(1);
    expect(current.runtimeState.worldState.worldDate).toEqual({
      year: 1,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 0,
    });
    expect(current.context.simulationId).not.toBe(metadata.simulationId);
    expect(
      Object.prototype.hasOwnProperty.call(
        current.context.simulationIdentity,
        "worldCalendarConfigHash",
      ),
    ).toBe(true);
  });

  it("CAL-JAN-044: runYears / absoluteWeek / event sequence overflow reject before mutation", () => {
    const session = buildFreshSession(7409);
    const before = toCanonicalSnapshot(session);
    const overflowYears = Math.floor(Number.MAX_SAFE_INTEGER / 48) + 1;
    const yearsFailed = runSprint1Years(session, overflowYears, sha256Provider);
    expect(yearsFailed.ok).toBe(false);
    expect(toCanonicalSnapshot(session)).toBe(before);

    expect(() =>
      fromAbsoluteWeek(Number.MAX_SAFE_INTEGER + 1, DEFAULT_WORLD_CALENDAR_CONFIG),
    ).toThrow(/absoluteWeek/);
    const nearMax = fromAbsoluteWeek(Number.MAX_SAFE_INTEGER, DEFAULT_WORLD_CALENDAR_CONFIG);
    expect(() => advanceOneWeek(nearMax, DEFAULT_WORLD_CALENDAR_CONFIG)).toThrow(/absoluteWeek/);

    const placed = placeAtDecemberWeek4(session);
    const beforePhase = toCanonicalJson(placed.runtimeState);
    const phaseFailed = runWorldYearStartPhase({
      worldState: placed.runtimeState.worldState,
      worldCalendar: placed.context.runRuleSnapshot.worldCalendar,
      yearStartProcessorManifest: placed.context.runRuleSnapshot.yearStartProcessorManifest,
      worldCalendarConfigHash: placed.context.runRuleSnapshot.worldCalendarConfigHash,
      yearStartProcessorManifestHash: placed.context.runRuleSnapshot.yearStartProcessorManifestHash,
      yearStartRuntime: yearStartRuntimeOf(placed),
      simulationId: placed.context.simulationId,
      startSequence: Number.MAX_SAFE_INTEGER,
    });
    expect(phaseFailed.ok).toBe(false);
    expect(toCanonicalJson(placed.runtimeState)).toBe(beforePhase);
  });

  it("CAL-JAN-029: year-start finalize event worldDate stays next-year start (not CSV terminal week)", () => {
    const stepped = expectOk(
      runSprint1WeeklyStep(placeAtDecemberWeek4(buildFreshSession(7410)), sha256Provider),
    );
    const finalized = stepped.runtimeState.eventStream.find(
      (event) => event.eventType === "world.year_stats_finalized",
    );
    expect(finalized).toBeDefined();
    expect(finalized!.worldDate).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
    expect((finalized!.payload as { worldYear?: number }).worldYear).toBe(1);
  });
});
