/**
 * S02-010 checkpoint/resume test session fixture.
 */
import {
  ABILITY_KEYS,
  computeConfigHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createSeededRng,
  createSprint1RunSession,
  generateInitialWorld,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  type Sprint1RunSession,
  type ValidationResult,
} from "../index.js";
import { cloneBaselineConfig } from "./baseline-config.fixture.js";
import { createNodeSha256Provider, createTinyNameData } from "./name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "./sprint2-identity.fixture.js";
import type { InitialWorldConfig } from "../config/types.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { createInitialSprint2CheckpointRunContext } from "../sprint2/sprint2-checkpoint-context.js";
import type { Sprint2CheckpointRunContext } from "../sprint2/sprint2-checkpoint-context.js";

export function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues, null, 2)}`);
  }
  return result.value;
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

function buildSprint1CliInput(
  sidecar: Record<string, unknown>,
  provider: Sha256Provider,
): Record<string, unknown> {
  const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const catalogHash = expectOk(computeTechniqueCatalogHash([def], provider));
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

export function createSmallCheckpointTestConfig(
  overrides: Partial<InitialWorldConfig> = {},
): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s02-010-v1",
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

export function buildFreshSprint1SessionForCheckpoint(
  seed = 91001,
  provider: Sha256Provider = createNodeSha256Provider(),
): Sprint1RunSession {
  const config = expectOk(validateInitialWorldConfig(createSmallCheckpointTestConfig()));
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, provider),
    rngFactory: createSeededRng,
    sha256Provider: provider,
  });
  const personIds = generated.snapshot.persons.map((person) => person.personId);
  const created = expectOk(
    createSprint1RunSession(
      withDefaultSprint2BindingsForRunSessionInput(
        {
          seed,
          config,
          nameData,
          sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds), provider),
        },
        provider,
      ),
      provider,
    ),
  );
  return created.session;
}

export function buildFreshCheckpointRunContext(
  seed = 91001,
  provider: Sha256Provider = createNodeSha256Provider(),
): Sprint2CheckpointRunContext {
  const session = buildFreshSprint1SessionForCheckpoint(seed, provider);
  return expectOk(createInitialSprint2CheckpointRunContext(session, provider));
}
