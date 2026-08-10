/**
 * One-shot fixture generator for Sprint 1 CLI tests.
 * Usage: node apps/simulator/scripts/generate-sprint1-fixtures.mjs
 */
/* eslint-env node */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const fixtureDir = join(repoRoot, "apps/simulator/fixtures/sprint1");
const seed = 4242;

const { createDefaultSprint1ConfigInput } = await import(
  pathToFileURL(join(repoRoot, "packages/simulation-core/dist/sprint1/sprint1-config-defaults.js"))
    .href
);
const {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  computeConfigHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createSeededRng,
  generateInitialWorld,
  validateInitialWorldConfig,
  validateSprint1CliInput,
  validateTechniqueDefinition,
} = await import(pathToFileURL(join(repoRoot, "packages/simulation-core/dist/index.js")).href);
const { validateNameData } = await import(
  pathToFileURL(join(repoRoot, "packages/simulation-core/dist/names/validate-name-data.js")).href
);

const sha256Provider = {
  hashUtf8(text) {
    return createHash("sha256").update(text, "utf8").digest("hex");
  },
};

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8"));
}

function expectOk(result) {
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.value;
}

const baseline = readJson("config/initial-world.config.json");
const tinyConfig = {
  ...baseline,
  profileId: "tiny-sprint1-cli-v1",
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
};

const config = expectOk(validateInitialWorldConfig(tinyConfig));
const nameData = expectOk(
  validateNameData({
    manifest: readJson("data/names/name-data.manifest.json"),
    familyNames: readJson("data/names/family-names.json"),
    maleGivenNames: readJson("data/names/male-given-names.json"),
    femaleGivenNames: readJson("data/names/female-given-names.json"),
    neutralGivenNames: readJson("data/names/neutral-given-names.json"),
    requiredVersion: config.nameData.requiredVersion,
    initialFamilyCount: config.families.initialFamilyCount,
    sha256Provider,
  }),
);

const generated = generateInitialWorld({
  config,
  configHash: computeConfigHash(config, sha256Provider),
  seed,
  nameData,
  nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
  rngFactory: createSeededRng,
  sha256Provider,
});

const personIds = generated.snapshot.persons
  .map((person) => person.personId)
  .sort((a, b) => a.localeCompare(b));

function plannerContext() {
  const byAction = {};
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

function statTargetContext() {
  const byAbility = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return { byAbility };
}

function sidecarEntry(personId) {
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

function techniqueDefinition(techniqueId) {
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

const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));

const sprint1Input = {
  schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  sprint1Config: createDefaultSprint1ConfigInput(),
  techniqueCatalog: {
    identity: { dataVersion: "techniques-0.1.0", catalogHash },
    definitions: [def],
  },
  initialWeeklyTrainingSidecar: {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: personIds.map((personId) => sidecarEntry(personId)),
  },
};

expectOk(validateSprint1CliInput(sprint1Input, sha256Provider));
expectOk(validateSprint1CliInput(JSON.parse(JSON.stringify(sprint1Input)), sha256Provider));

mkdirSync(fixtureDir, { recursive: true });
writeFileSync(
  join(fixtureDir, "tiny-initial-world.config.json"),
  `${JSON.stringify(config, null, 2)}\n`,
  "utf8",
);
writeFileSync(
  join(fixtureDir, "sprint1-input.json"),
  `${JSON.stringify(sprint1Input, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote fixtures for seed=${String(seed)} with ${String(personIds.length)} personIds`);
console.log(personIds.join(", "));
