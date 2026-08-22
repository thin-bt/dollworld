/**
 * createSprint1RunSessionFromRunInitializationMaterials — normalized RunInit reconstruction.
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  computeConfigHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createSeededRng,
  createSprint1RunSession,
  createSprint1RunSessionFromRunInitializationMaterials,
  generateInitialWorld,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateNormalizedSprint1Config,
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
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-runinit-reconstruct-v1",
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
      teacherRecommendation: 50,
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

function buildSidecarForPersonIds(personIds: readonly string[]): Record<string, unknown> {
  return {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: [...personIds]
      .sort((a, b) => a.localeCompare(b))
      .map((personId) => sidecarEntry(personId)),
  };
}

function buildSprint1CliInput(sidecar: Record<string, unknown>): Record<string, unknown> {
  const def = expectOk(
    validateTechniqueDefinition({
      techniqueId: "technique_alpha",
      schemaVersion: "0.1.0",
      dataVersion: "techniques-0.1.0",
      name: "technique_alpha",
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
    }),
  );
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
    input: {
      seed,
      config,
      nameData,
      sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
    },
  };
}

describe("createSprint1RunSessionFromRunInitializationMaterials", () => {
  it("reconstructs with stable identity/rule hashes matching fresh create", () => {
    const { input } = buildSessionInput(5151);
    const fresh = expectOk(createSprint1RunSession(input, sha256Provider));
    const reconstructed = expectOk(
      createSprint1RunSessionFromRunInitializationMaterials(
        {
          seed: input.seed,
          config: input.config,
          nameData: input.nameData,
          simulationIdentity: fresh.session.context.simulationIdentity,
          simulationIdentityHash: fresh.session.context.simulationIdentityHash,
          runRuleSnapshot: fresh.session.context.runRuleSnapshot,
          runRuleSnapshotHash: fresh.session.context.runRuleSnapshotHash,
          initialWeeklyTrainingSidecarSnapshot:
            fresh.session.context.initialWeeklyTrainingSidecarSnapshot,
        },
        sha256Provider,
      ),
    );

    expect(reconstructed.session.context.simulationIdentityHash).toBe(
      fresh.session.context.simulationIdentityHash,
    );
    expect(reconstructed.session.context.runRuleSnapshotHash).toBe(
      fresh.session.context.runRuleSnapshotHash,
    );
    expect(toCanonicalJson(reconstructed.session.context.simulationIdentity)).toBe(
      toCanonicalJson(fresh.session.context.simulationIdentity),
    );
    expect(toCanonicalJson(reconstructed.session.context.runRuleSnapshot)).toBe(
      toCanonicalJson(fresh.session.context.runRuleSnapshot),
    );
    expect(toCanonicalJson(reconstructed.session.runtimeState.worldState)).toBe(
      toCanonicalJson(fresh.session.runtimeState.worldState),
    );
  });

  it("consumes already-normalized sprint1Config without display-unit re-scaling", () => {
    const { input } = buildSessionInput(6161);
    const fresh = expectOk(createSprint1RunSession(input, sha256Provider));
    const normalized = expectOk(
      validateNormalizedSprint1Config(fresh.session.context.runRuleSnapshot.sprint1Config),
    );
    // Basis-point sensitive: display 0.65 becomes 6500; second scaling would explode.
    expect(normalized.growth.potentialMinimumFactor).toBe(6500);

    const again = expectOk(
      createSprint1RunSessionFromRunInitializationMaterials(
        {
          seed: input.seed,
          config: input.config,
          nameData: input.nameData,
          simulationIdentity: fresh.session.context.simulationIdentity,
          simulationIdentityHash: fresh.session.context.simulationIdentityHash,
          runRuleSnapshot: fresh.session.context.runRuleSnapshot,
          runRuleSnapshotHash: fresh.session.context.runRuleSnapshotHash,
          initialWeeklyTrainingSidecarSnapshot:
            fresh.session.context.initialWeeklyTrainingSidecarSnapshot,
        },
        sha256Provider,
      ),
    );
    expect(again.session.context.simulationIdentityHash).toBe(
      fresh.session.context.simulationIdentityHash,
    );
    expect(again.session.context.runRuleSnapshot.sprint1ConfigHash).toBe(
      fresh.session.context.runRuleSnapshot.sprint1ConfigHash,
    );
  });

  it("fails closed on tampered RunRuleSnapshot before session publish", () => {
    const { input } = buildSessionInput(7171);
    const fresh = expectOk(createSprint1RunSession(input, sha256Provider));
    const tampered = JSON.parse(toCanonicalJson(fresh.session.context.runRuleSnapshot)) as Record<
      string,
      unknown
    >;
    tampered["sprint1ConfigHash"] = "0".repeat(64);

    const result = createSprint1RunSessionFromRunInitializationMaterials(
      {
        seed: input.seed,
        config: input.config,
        nameData: input.nameData,
        simulationIdentity: fresh.session.context.simulationIdentity,
        simulationIdentityHash: fresh.session.context.simulationIdentityHash,
        runRuleSnapshot: tampered,
        runRuleSnapshotHash: fresh.session.context.runRuleSnapshotHash,
        initialWeeklyTrainingSidecarSnapshot:
          fresh.session.context.initialWeeklyTrainingSidecarSnapshot,
      },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("fails closed on tampered SimulationIdentity before session publish", () => {
    const { input } = buildSessionInput(8181);
    const fresh = expectOk(createSprint1RunSession(input, sha256Provider));
    const tampered = JSON.parse(
      toCanonicalJson(fresh.session.context.simulationIdentity),
    ) as Record<string, unknown>;
    tampered["sprint1ConfigHash"] = "a".repeat(64);

    const result = createSprint1RunSessionFromRunInitializationMaterials(
      {
        seed: input.seed,
        config: input.config,
        nameData: input.nameData,
        simulationIdentity: tampered,
        simulationIdentityHash: fresh.session.context.simulationIdentityHash,
        runRuleSnapshot: fresh.session.context.runRuleSnapshot,
        runRuleSnapshotHash: fresh.session.context.runRuleSnapshotHash,
        initialWeeklyTrainingSidecarSnapshot:
          fresh.session.context.initialWeeklyTrainingSidecarSnapshot,
      },
      sha256Provider,
    );
    expect(result.ok).toBe(false);
  });

  it("retry after failed reconstruct equals clean reconstruction", () => {
    const { input } = buildSessionInput(9191);
    const fresh = expectOk(createSprint1RunSession(input, sha256Provider));
    const materials = {
      seed: input.seed,
      config: input.config,
      nameData: input.nameData,
      simulationIdentity: fresh.session.context.simulationIdentity,
      simulationIdentityHash: fresh.session.context.simulationIdentityHash,
      runRuleSnapshot: fresh.session.context.runRuleSnapshot,
      runRuleSnapshotHash: fresh.session.context.runRuleSnapshotHash,
      initialWeeklyTrainingSidecarSnapshot:
        fresh.session.context.initialWeeklyTrainingSidecarSnapshot,
    };
    const bad = createSprint1RunSessionFromRunInitializationMaterials(
      { ...materials, runRuleSnapshotHash: "b".repeat(64) },
      sha256Provider,
    );
    expect(bad.ok).toBe(false);
    const retry = expectOk(
      createSprint1RunSessionFromRunInitializationMaterials(materials, sha256Provider),
    );
    const clean = expectOk(
      createSprint1RunSessionFromRunInitializationMaterials(materials, sha256Provider),
    );
    expect(toCanonicalJson(retry.session)).toBe(toCanonicalJson(clean.session));
  });
});
