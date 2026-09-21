/**
 * S03-024 production entrypoint closure for original-technique loss persistence.
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
  createSprint1RunSession,
  generateInitialWorld,
  runSprint1WeeklyStep,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  type InitialWorldConfig,
  type Person,
  type Sprint1RunSession,
  type ValidationResult,
} from "../index.js";
import { asTechniqueId } from "../ids.js";
import { cloneBaselineConfig } from "../test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "../test-fixtures/name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "../test-fixtures/sprint2-identity.fixture.js";
import { createInitialSprint1PersonState } from "../sprint1/sprint1-person-state.js";
import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  validateOriginalTechniqueLifecycleRuntimeState,
} from "./original-technique-lifecycle-runtime-state.js";
import { createSprint3Balance090ConfigInput } from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import { createInitialSprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { OriginalTechniqueFoundingHistoryRecord } from "./types.js";
import {
  createEmptyGeneratedTechniqueCatalogOverlay,
  validateGeneratedTechniqueCatalogOverlay,
} from "./generated-technique-catalog-overlay.js";
import { createSeededRng } from "../rng.js";

const provider = createNodeSha256Provider();
const OTL_PRODUCTION_TECHNIQUE_ID = "tech_otl_production_boundary";

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s03-024-otl-loss-v1",
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

function sidecarEntry(personId: string): Record<string, unknown> {
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
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: 0,
    };
  }
  return {
    personId,
    growthProfile: "normal",
    growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
    statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    motivationFactor: 10000,
    plannerContext: { byAction },
    statTargetContext: { byAbility },
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
  const alpha = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const otl = expectOk(
    validateTechniqueDefinition(techniqueDefinition(OTL_PRODUCTION_TECHNIQUE_ID)),
  );
  const catalogHash = expectOk(computeTechniqueCatalogHash([alpha, otl], provider));
  return {
    schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
    sprint1Config: createDefaultSprint1ConfigInput(),
    techniqueCatalog: {
      identity: { dataVersion: "techniques-0.1.0", catalogHash },
      definitions: [alpha, otl],
    },
    initialWeeklyTrainingSidecar: sidecar,
  };
}

function buildFreshSession(seed: number): Sprint1RunSession {
  const config = expectOk(validateInitialWorldConfig(createSmallConfig()));
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
          sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
        },
        provider,
      ),
      provider,
    ),
  );
  return created.session;
}

function foundingHistory(
  newTechniqueId: string,
  founderPersonId: string,
): OriginalTechniqueFoundingHistoryRecord {
  return {
    eventKind: "original_technique_founded",
    founderPersonId,
    newTechniqueId,
    sourceTechniqueIds: ["technique_alpha"],
    researchValueAtFounding: 550,
    developmentReason: "test",
    researchTier: "full_original_technique",
    worldWeekIndex: 0,
  };
}

function personDeceasedWithTechnique(person: Person, techniqueId: string): Person {
  const baseSprint1 = person.sprint1State ?? expectOk(createInitialSprint1PersonState(50));
  const withTechnique = {
    ...baseSprint1,
    techniqueStates: [
      {
        techniqueId: asTechniqueId(techniqueId),
        learningProgressTenths: 1000,
        masteryHundredths: 1000,
        successfulUseCount: 0,
        attemptedUseCount: 0,
        lastPracticedAbsoluteWeek: null,
        acquiredAbsoluteWeek: 0,
      },
    ],
  };
  const ageAtDeath =
    person.lifeStatus === "living" && person.currentAge !== null ? person.currentAge : 25;
  const deathYear = person.birthYear + ageAtDeath;
  const {
    participationStatus: _participationStatus,
    currentAge: _currentAge,
    currentRank: _currentRank,
    ...withoutLivingFields
  } = person as Person & { participationStatus?: string; currentAge?: number | null };
  void _participationStatus;
  void _currentAge;
  void _currentRank;
  return {
    ...withoutLivingFields,
    lifeStatus: "deceased",
    deathYear,
    ageAtDeath,
    sprint1State: withTechnique,
  } as Person;
}

function bindOtlLossProductionSession(
  seed: number,
  options: { includeCatalogOverlay?: boolean } = {},
): Sprint1RunSession {
  const base = buildFreshSession(seed);
  const founder = base.runtimeState.worldState.persons[0];
  if (founder === undefined) {
    throw new Error("expected founder person");
  }
  const founderId = founder.personId;
  const sprint3Config = expectOk(
    validateSprint3Config(createSprint3Balance090ConfigInput(), provider),
  );
  const otlRuntime = expectOk(
    validateOriginalTechniqueLifecycleRuntimeState({
      ...createInitialOriginalTechniqueLifecycleRuntimeState(seed),
      foundingHistories: [foundingHistory(OTL_PRODUCTION_TECHNIQUE_ID, founderId)],
    }),
  );
  const deceasedFounder = personDeceasedWithTechnique(founder, OTL_PRODUCTION_TECHNIQUE_ID);
  const persons = base.runtimeState.worldState.persons.map((person) =>
    person.personId === founderId ? deceasedFounder : person,
  );
  const overlayDef = expectOk(
    validateTechniqueDefinition(techniqueDefinition(OTL_PRODUCTION_TECHNIQUE_ID)),
  );
  const overlay =
    options.includeCatalogOverlay === true
      ? expectOk(
          validateGeneratedTechniqueCatalogOverlay({
            ...createEmptyGeneratedTechniqueCatalogOverlay(),
            definitions: [overlayDef],
          }),
        )
      : undefined;

  return {
    ...base,
    context: {
      ...base.context,
      sprint3Config,
    },
    runtimeState: {
      ...base.runtimeState,
      worldState: {
        ...base.runtimeState.worldState,
        persons,
      },
      originalTechniqueLifecycleRuntime: otlRuntime,
      mentorshipEntrypointRuntime: createInitialSprint3MentorshipEntrypointRuntimeState(),
      ...(overlay === undefined ? {} : { generatedTechniqueCatalogOverlay: overlay }),
    },
  };
}

describe("S03-024 runSprint1WeeklyStep original-technique loss closure", () => {
  it("OTL-L008 production weekly step persists extinction loss in runtime", () => {
    const session = bindOtlLossProductionSession(9024);
    const founderPersonId = session.runtimeState.worldState.persons[0]!.personId;
    const lossEvaluationWeek = session.runtimeState.worldState.worldDate.absoluteWeek;
    const stepped = expectOk(runSprint1WeeklyStep(session, provider));
    const lossHistories = stepped.runtimeState.originalTechniqueLifecycleRuntime?.lossHistories;
    expect(stepped.runtimeState.worldState.worldDate.absoluteWeek).toBe(lossEvaluationWeek + 1);
    expect(lossHistories).toEqual([
      {
        eventKind: "original_technique_lost",
        techniqueId: OTL_PRODUCTION_TECHNIQUE_ID,
        founderPersonId,
        worldWeekIndex: lossEvaluationWeek,
        reasons: ["technique_extinct_no_living_practitioners_or_successors"],
      },
    ]);
  });

  it("OTL-L009 second production weekly step does not re-emit loss", () => {
    const session = bindOtlLossProductionSession(9025);
    const once = expectOk(runSprint1WeeklyStep(session, provider));
    const twice = expectOk(runSprint1WeeklyStep(once, provider));
    expect(twice.runtimeState.originalTechniqueLifecycleRuntime?.lossHistories.length).toBe(1);
  });

  it("OTL-L010 loss records history without removing generated catalog overlay definition", () => {
    const session = bindOtlLossProductionSession(9026, { includeCatalogOverlay: true });
    const overlayBefore = session.runtimeState.generatedTechniqueCatalogOverlay?.definitions.length;
    expect(overlayBefore).toBe(1);
    const stepped = expectOk(runSprint1WeeklyStep(session, provider));
    expect(stepped.runtimeState.originalTechniqueLifecycleRuntime?.lossHistories.length).toBe(1);
    expect(stepped.runtimeState.generatedTechniqueCatalogOverlay?.definitions).toHaveLength(1);
    expect(stepped.runtimeState.generatedTechniqueCatalogOverlay?.definitions[0]?.techniqueId).toBe(
      OTL_PRODUCTION_TECHNIQUE_ID,
    );
  });
});
