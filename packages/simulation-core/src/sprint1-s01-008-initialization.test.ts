/**
 * Fresh Sprint 1 run session initialization tests (S01-008 / S1-SPEC-0.1.20).
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WEEKLY_SCORED_ACTIONS,
  assertBattleResultWeekMatchesWorldDate,
  buildWeeklyTrainingPersonRecords,
  computeConfigHash,
  computeInitialWeeklyTrainingSidecarHash,
  computeNameDataHash,
  computeSprint1ConfigHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createSeededRng,
  createSprint1RunSession,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  deriveSeed,
  generateInitialWorld,
  promoteProvisionalEventStreamToSprint1,
  promoteProvisionalWorldSnapshot,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  type InitialWorldConfig,
  type ValidationResult,
} from "./index.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  expect(result.ok).toBe(true);
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s01-008-init-v1",
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

function buildSessionInput(seed = 4242) {
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
  return {
    seed,
    config,
    nameData,
    generated,
    input: {
      seed,
      config,
      nameData,
      sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
    },
  };
}

describe("createSprint1RunSession fresh initialization", () => {
  it("initializes a tiny Sprint1RunSession through the 21-step pipeline", () => {
    const { generated, input } = buildSessionInput(4242);
    const personIds = generated.snapshot.persons.map((person) => person.personId);
    const result = expectOk(createSprint1RunSession(input, sha256Provider));

    expect(result.transactionalProcessorAdapterPipeline).toEqual(
      SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
    );
    expect(result.transactionalProcessorAdapterPipeline).toEqual([WEEKLY_TRAINING_PROCESSOR_ID]);

    expect(result.provisionalGenerationMeta.provisionalSimulationId).toBe(
      generated.snapshot.simulationId,
    );
    expect(result.provisionalGenerationMeta.initialEventCount).toBe(generated.initialEvents.length);

    expect(result.session.context.simulationId).not.toBe(
      result.provisionalGenerationMeta.provisionalSimulationId,
    );
    expect(result.session.runtimeState.worldState.simulationId).toBe(
      result.session.context.simulationId,
    );
    expect(result.initialWorldSnapshotForOutput.simulationId).toBe(
      result.session.context.simulationId,
    );
    expect(result.initialWorldSnapshotForOutput.schemaVersion).toBe("0.5.0");
    expect(result.initialWorldSnapshotForOutput.runRuleSnapshotHash).toBe(
      result.session.context.runRuleSnapshotHash,
    );
    expect(
      result.initialWorldSnapshotForOutput.initialWeeklyTrainingSidecarSnapshot.entries,
    ).toHaveLength(personIds.length);

    expect(result.session.runtimeState.eventStream).toHaveLength(generated.initialEvents.length);
    for (const event of result.session.runtimeState.eventStream) {
      expect(event.schemaVersion).toBe(SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION);
      expect(event.simulationId).toBe(result.session.context.simulationId);
      expect(event.entities.matchIds).toEqual([]);
    }

    expect(result.session.runtimeState.eventAllocationState.nextSequence).toBe(
      generated.initialEvents.length,
    );
    expect(result.session.runtimeState.battleResults).toEqual([]);
    expect(
      assertBattleResultWeekMatchesWorldDate({
        battleResultWeekState: result.session.runtimeState.battleResultWeekState,
        worldState: result.session.runtimeState.worldState,
      }).ok,
    ).toBe(true);
    expect(result.session.runtimeState.battleResultWeekState.absoluteWeek).toBe(0);
    expect(result.session.runtimeState.processorRuntimeStates.processorOrder).toEqual([
      WEEKLY_TRAINING_PROCESSOR_ID,
    ]);
    expect(result.session.runtimeState.weeklyTrainingSidecars.entries).toHaveLength(
      personIds.length,
    );
    expect(result.session.runtimeState.weeklyTrainingSidecars).not.toBe(
      result.session.context.initialWeeklyTrainingSidecarSnapshot,
    );

    for (const person of result.session.runtimeState.worldState.persons) {
      expect(person.sprint1State).toBeDefined();
    }

    const records = expectOk(
      buildWeeklyTrainingPersonRecords(
        result.session.runtimeState.worldState,
        result.session.runtimeState.weeklyTrainingSidecars,
      ),
    );
    expect(records).toHaveLength(personIds.length);
  });

  it("rejects sidecar/world person mismatch without neutral fill", () => {
    const { config, nameData, seed } = buildSessionInput(7777);
    const sidecar = buildSidecarForPersonIds([
      "person_0000000000000001",
      "person_0000000000000002",
    ]);

    const result = createSprint1RunSession(
      {
        seed,
        config,
        nameData,
        sprint1CliInput: buildSprint1CliInput(sidecar),
      },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.message.includes("exact 1:1"))).toBe(true);
  });

  it("binds sidecar hash into SimulationIdentity via initialization", () => {
    const { input, generated } = buildSessionInput(9090);
    const sidecar = buildSidecarForPersonIds(
      generated.snapshot.persons.map((person) => person.personId),
    );
    const sidecarHash = expectOk(computeInitialWeeklyTrainingSidecarHash(sidecar, sha256Provider));
    const sprint1ConfigHash = expectOk(
      computeSprint1ConfigHash(createDefaultSprint1ConfigInput(), sha256Provider),
    );

    const result = expectOk(createSprint1RunSession(input, sha256Provider));

    expect(result.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash).toBe(
      sidecarHash,
    );
    expect(result.session.context.simulationIdentity.sprint1ConfigHash).toBe(sprint1ConfigHash);
  });

  it("promotes fresh initial events without resequencing or rewriting producer data", () => {
    const { input, generated } = buildSessionInput(9191);
    const result = expectOk(createSprint1RunSession(input, sha256Provider));

    expect(result.session.runtimeState.eventStream).toHaveLength(generated.initialEvents.length);
    generated.initialEvents.forEach((provisional, index) => {
      const promoted = result.session.runtimeState.eventStream[index]!;
      expect(promoted).toMatchObject({
        sequence: provisional.sequence,
        eventId: provisional.eventId,
        worldDate: provisional.worldDate,
        eventType: provisional.eventType,
        origin: provisional.origin,
        sourceProcessor: provisional.sourceProcessor,
        payload: provisional.payload,
      });
      expect(promoted.entities).toMatchObject({
        personIds: provisional.entities.personIds,
        familyIds: provisional.entities.familyIds,
        lineageIds: provisional.entities.lineageIds,
        relationshipIds: provisional.entities.relationshipIds,
        matchIds: [],
      });
    });
  });

  it("uses independent specified RNG streams and deep-clones immutable initial sidecar", () => {
    const { input } = buildSessionInput(9292);
    const result = expectOk(createSprint1RunSession(input, sha256Provider));
    const weeklyRng = result.session.runtimeState.processorRuntimeStates.rngStates.find(
      (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
    );

    expect(result.session.runtimeState.worldRngState).toEqual(
      createSeededRng(deriveSeed(9292, SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL)).exportState(),
    );
    expect(weeklyRng?.state).toEqual(
      createSeededRng(deriveSeed(9292, WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL)).exportState(),
    );
    expect(result.session.context.initialWeeklyTrainingSidecarSnapshot).toEqual(
      result.session.runtimeState.weeklyTrainingSidecars,
    );
    expect(result.session.context.initialWeeklyTrainingSidecarSnapshot.entries[0]).not.toBe(
      result.session.runtimeState.weeklyTrainingSidecars.entries[0],
    );
    expect(Object.isFrozen(result.session.context)).toBe(true);
    expect(
      toCanonicalJson(result.initialWorldSnapshotForOutput.initialWeeklyTrainingSidecarSnapshot),
    ).toBe(toCanonicalJson(result.session.context.initialWeeklyTrainingSidecarSnapshot));
  });

  it("changes final identity when only the initial sidecar content changes", () => {
    const firstInput = buildSessionInput(9393);
    const first = expectOk(createSprint1RunSession(firstInput.input, sha256Provider));
    const personIds = firstInput.generated.snapshot.persons.map((person) => person.personId);
    const changedSidecar = buildSidecarForPersonIds(personIds);
    const firstEntry = (changedSidecar.entries as Record<string, unknown>[])[0]!;
    firstEntry.motivationFactor = 10001;
    const second = expectOk(
      createSprint1RunSession(
        {
          ...firstInput.input,
          sprint1CliInput: buildSprint1CliInput(changedSidecar),
        },
        sha256Provider,
      ),
    );

    expect(second.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash).not.toBe(
      first.session.context.simulationIdentity.initialWeeklyTrainingSidecarHash,
    );
    expect(second.session.context.simulationId).not.toBe(first.session.context.simulationId);
  });

  it("rejects a generated initial event with a different provisional simulationId", () => {
    const { input, generated } = buildSessionInput(9494);
    const result = createSprint1RunSession(input, sha256Provider, {
      generateInitialWorld: () => ({
        ...generated,
        initialEvents: generated.initialEvents.map((event, index) =>
          index === 0
            ? {
                ...event,
                simulationId: "simulation_ffffffffffffffff" as typeof event.simulationId,
              }
            : event,
        ),
      }),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((issue) => issue.path.includes("promotedEvents"))).toBe(true);
  });
});

describe("promoteProvisionalWorldSnapshot / equal provisional and final ids", () => {
  it("succeeds when provisionalSimulationId equals finalSimulationId", () => {
    const { generated } = buildSessionInput(9501);
    const sharedId = generated.snapshot.simulationId;
    const promoted = expectOk(
      promoteProvisionalWorldSnapshot({
        world: generated.snapshot,
        provisionalSimulationId: sharedId,
        finalSimulationId: sharedId,
        worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
      }),
    );
    expect(promoted.simulationId).toBe(sharedId);
    expect(promoted.worldDate).toEqual(generated.snapshot.worldDate);
    expect(promoted.persons).toEqual(generated.snapshot.persons);
  });

  it("rejects when world simulationId differs from expected provisional", () => {
    const { generated } = buildSessionInput(9502);
    const result = promoteProvisionalWorldSnapshot({
      world: {
        ...generated.snapshot,
        simulationId: "simulation_ffffffffffffffff" as typeof generated.snapshot.simulationId,
      },
      provisionalSimulationId: generated.snapshot.simulationId,
      finalSimulationId: generated.snapshot.simulationId,
      worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
    });
    expect(result.ok).toBe(false);
  });

  it("preserves sequence eventId payload and order when promoting equal-id events", () => {
    const { generated } = buildSessionInput(9503);
    const sharedId = generated.snapshot.simulationId;
    const promoted = expectOk(
      promoteProvisionalEventStreamToSprint1(generated.initialEvents, sharedId, sharedId),
    );
    expect(promoted).toHaveLength(generated.initialEvents.length);
    generated.initialEvents.forEach((provisional, index) => {
      const next = promoted[index]!;
      expect(next.sequence).toBe(provisional.sequence);
      expect(next.eventId).toBe(provisional.eventId);
      expect(next.payload).toEqual(provisional.payload);
      expect(next.eventType).toBe(provisional.eventType);
      expect(next.simulationId).toBe(sharedId);
    });
  });
});

describe("buildWeeklyTrainingPersonRecords", () => {
  it("rejects missing sidecar entry for a world person", () => {
    const { input, generated } = buildSessionInput(1111);
    const result = expectOk(createSprint1RunSession(input, sha256Provider));
    const partialSidecar = buildSidecarForPersonIds(
      generated.snapshot.persons.slice(1).map((person) => person.personId),
    );
    const records = buildWeeklyTrainingPersonRecords(
      result.session.runtimeState.worldState,
      partialSidecar,
    );
    expect(records.ok).toBe(false);
    if (records.ok) return;
    expect(records.issues.some((issue) => issue.message.includes("missing sidecar entry"))).toBe(
      true,
    );
  });
});
