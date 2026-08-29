/**
 * FIX14: fresh world (zero time advance) has mock-selectable technique holders
 * for unarmed/sword/magic plus a no-technique control (G076 catalog).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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
  generateInitialWorld,
  validateInitialWorldConfig,
  type InitialWorldConfig,
  type ValidationResult,
} from "./index.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "./test-fixtures/sprint2-identity.fixture.js";

const sha256Provider = createNodeSha256Provider();
const here = dirname(fileURLToPath(import.meta.url));
const sprint1InputPath = join(here, "../../../apps/simulator/fixtures/sprint1/sprint1-input.json");

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-fix14-coverage-v1",
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
  for (const ability of ABILITY_KEYS) {
    byAbility[ability] = { relatedAptitude: 50, teacherRecommendation: 0 };
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

describe("FIX14 initial active technique coverage", () => {
  it("seed 42 time-zero roster has unarmed/sword/magic holders + control", () => {
    const productionInput = JSON.parse(readFileSync(sprint1InputPath, "utf8")) as {
      techniqueCatalog: {
        identity: { dataVersion: string; catalogHash: string };
        definitions: unknown[];
      };
      sprint1Config?: unknown;
    };
    expect(productionInput.techniqueCatalog.identity.dataVersion).toBe("techniques-0.1.1");
    expect(productionInput.techniqueCatalog.definitions).toHaveLength(3);

    const config = expectOk(validateInitialWorldConfig(createSmallConfig()));
    const nameData = createTinyNameData(config.families.initialFamilyCount);
    const generated = generateInitialWorld({
      config,
      configHash: computeConfigHash(config, sha256Provider),
      seed: 42,
      nameData,
      nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
      rngFactory: createSeededRng,
      sha256Provider,
    });
    const personIds = generated.snapshot.persons.map((person) => person.personId);
    const hash = expectOk(
      computeTechniqueCatalogHash(productionInput.techniqueCatalog.definitions, sha256Provider),
    );
    expect(hash).toBe(productionInput.techniqueCatalog.identity.catalogHash);

    const result = expectOk(
      createSprint1RunSession(
        withDefaultSprint2BindingsForRunSessionInput(
          {
            seed: 42,
            config,
            nameData,
            sprint1CliInput: {
              schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
              sprint1Config: createDefaultSprint1ConfigInput(),
              techniqueCatalog: {
                identity: {
                  dataVersion: "techniques-0.1.1",
                  catalogHash: hash,
                },
                definitions: productionInput.techniqueCatalog.definitions,
              },
              initialWeeklyTrainingSidecar: {
                schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
                entries: [...personIds]
                  .sort((a, b) => a.localeCompare(b))
                  .map((personId) => sidecarEntry(personId)),
              },
            },
          },
          sha256Provider,
        ),
        sha256Provider,
      ),
    );

    const world = result.session.runtimeState.worldState;
    expect(world.worldDate.absoluteWeek).toBe(0);

    const holders = {
      technique_alpha: 0,
      technique_sword_basic: 0,
      technique_magic_basic: 0,
    };
    let emptyActive = 0;
    for (const person of world.persons) {
      if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
        continue;
      }
      const states = person.sprint1State?.techniqueStates ?? [];
      if (states.length === 0) {
        emptyActive += 1;
      }
      for (const state of states) {
        if (state.techniqueId in holders) {
          holders[state.techniqueId as keyof typeof holders] += 1;
          expect(state.acquiredAbsoluteWeek).toBe(0);
          expect(state.masteryHundredths).toBe(2000);
          expect(state.learningProgressTenths).toBe(1000);
        }
      }
    }

    expect(holders.technique_alpha).toBeGreaterThanOrEqual(1);
    expect(holders.technique_sword_basic).toBeGreaterThanOrEqual(1);
    expect(holders.technique_magic_basic).toBeGreaterThanOrEqual(1);
    expect(emptyActive).toBeGreaterThanOrEqual(1);
  });
});
