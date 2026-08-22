/**
 * Post-FIX15 structural hotpath regression: pipeline scales with eligible population;
 * candidate arrays are not rebuilt inside select*Target when prebuilt by processPerson.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  computeTechniqueCatalogHash,
  createInitialTrainingProcessorRuntimeState,
  createSeededRng,
  getDefaultSprint1Config,
  processWeeklyTrainingWeek,
  validateTechniqueCatalog,
  validateWeeklyTrainingPersonRecord,
  type Sha256Provider,
  type TechniqueCatalog,
  type ValidationResult,
  type WeeklyTrainingResult,
} from "./index.js";
import * as weeklyTargetSelection from "./sprint1/weekly-target-selection.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider: Sha256Provider = createNodeSha256Provider();
const dependencies = { sha256Provider };
const config = getDefaultSprint1Config();

function expectOkValue<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected ValidationResult success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function statTriple(surfaceValue: number): Record<string, number> {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function abilities(): Record<string, unknown> {
  return Object.fromEntries(ABILITY_KEYS.map((key) => [key, statTriple(50)]));
}

function aptitudes(): Record<string, unknown> {
  return Object.fromEntries(APTITUDE_KEYS.map((key) => [key, statTriple(50)]));
}

function definition(id: string): Record<string, unknown> {
  return {
    techniqueId: id,
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: id,
    category: "unarmed",
    primaryStats: ["strength", "skill"],
    requiredAptitude: 10,
    requiredStats: { strength: 20 },
    prerequisiteTechniqueMastery: [],
    mentalCost: 5,
    difficulty: 30,
    learningTier: "standard",
    consumptionClass: "small",
    learningProgressRequired: 180,
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
    usableRanges: ["contact", "close"],
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

function buildCatalog(ids: string[]): TechniqueCatalog {
  const definitions = ids.map((id) => definition(id));
  const hash = expectOkValue(computeTechniqueCatalogHash(definitions, sha256Provider));
  return expectOkValue(
    validateTechniqueCatalog(
      { identity: { dataVersion: "techniques-0.1.0", catalogHash: hash }, definitions },
      sha256Provider,
    ),
  );
}

function plannerContext() {
  const zero = {
    personality: 0,
    developmentNeed: 0,
    recentResult: 0,
    teacherAdvice: 0,
    schedule: 0,
  };
  return {
    byAction: {
      train_stat: zero,
      learn_technique: zero,
      practice_technique: zero,
      rest: zero,
    },
  };
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

const DEFAULT_SPRINT1_STATE: Record<string, unknown> = {
  sprint1StateSchemaVersion: "0.1.0",
  currentMental: 100,
  techniqueStates: [],
  learningFocusTechniqueId: null,
};

function person(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    personId: "person_0000000000000001",
    givenName: "Ai",
    familyName: "Doll",
    displayName: "Doll Ai",
    nameDataVersion: "names-0.1.0",
    sex: "female",
    birthYear: 1,
    familyId: "family_0000000000000001",
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "trainee",
    currentAge: 20,
    qualifiedMaster: false,
    abilities: abilities(),
    aptitudes: aptitudes(),
    sprint1State: { ...DEFAULT_SPRINT1_STATE },
  };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete merged[key];
      continue;
    }
    merged[key] =
      key === "sprint1State"
        ? { ...DEFAULT_SPRINT1_STATE, ...(value as Record<string, unknown>) }
        : value;
  }
  return merged;
}

function record(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    person: person(),
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
    ...overrides,
  };
}

function rngState(seed = 42): unknown {
  return createSeededRng(seed).exportState();
}

function weekInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    absoluteWeek: 10,
    personRecords: [record()],
    config,
    catalog: buildCatalog(["technique_alpha"]),
    runtimeState: createInitialTrainingProcessorRuntimeState(),
    rngState: rngState(),
    ...overrides,
  };
}

function actionSelectedCount(result: WeeklyTrainingResult): number {
  return result.eventCandidates.filter((e) => e.eventType === "training.action_selected").length;
}

describe("weekly hotpath structural regression", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds each candidate list once per eligible person (candidate_rebuild_count=0)", () => {
    const trainSpy = vi.spyOn(weeklyTargetSelection, "buildTrainingStatCandidates");
    const learnSpy = vi.spyOn(weeklyTargetSelection, "buildLearningTechniqueCandidates");
    const practiceSpy = vi.spyOn(weeklyTargetSelection, "buildPracticeTechniqueCandidates");

    const eligible = record({ person: person({ personId: "person_0000000000000001" }) });
    const retired = record({
      person: person({
        personId: "person_0000000000000002",
        careerStatus: "retired",
        currentAge: 45,
        highestRank: "S",
        retirementRank: "A",
        qualifiedMaster: true,
      }),
    });
    const child = record({
      person: person({
        personId: "person_0000000000000003",
        careerStatus: "child",
        currentAge: 6,
      }),
    });

    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [eligible, retired, child] }),
        dependencies,
      ),
    );

    expect(trainSpy).toHaveBeenCalledTimes(1);
    expect(learnSpy).toHaveBeenCalledTimes(1);
    expect(practiceSpy).toHaveBeenCalledTimes(1);
    expect(actionSelectedCount(result)).toBe(1);
    expect(result.runtimeState.processedPersonCount).toBe(1);
  });

  it("selectTrainingStatTarget with prebuilt candidates matches full rebuild", () => {
    const validated = expectOkValue(validateWeeklyTrainingPersonRecord(record()));
    const rng = { nextInt: () => 0 };
    const prebuilt = expectOkValue(
      weeklyTargetSelection.buildTrainingStatCandidates(validated.record, config),
    );
    expect(
      weeklyTargetSelection.selectTrainingStatTarget(validated.record, config, rng, prebuilt),
    ).toEqual(weeklyTargetSelection.selectTrainingStatTarget(validated.record, config, rng));
  });

  it("action work scales with eligible population not total population", () => {
    const eligibleA = record({ person: person({ personId: "person_0000000000000001" }) });
    const eligibleB = record({
      person: person({
        personId: "person_0000000000000002",
        careerStatus: "active_competitor",
        currentRank: "F",
        highestRank: "F",
      }),
    });
    const retired = record({
      person: person({
        personId: "person_0000000000000003",
        careerStatus: "retired",
        currentAge: 45,
        highestRank: "S",
        retirementRank: "A",
        qualifiedMaster: true,
      }),
    });

    const result = expectOkValue(
      processWeeklyTrainingWeek(
        weekInput({ personRecords: [eligibleA, eligibleB, retired] }),
        dependencies,
      ),
    );

    expect(actionSelectedCount(result)).toBe(2);
    expect(result.runtimeState.processedPersonCount).toBe(2);
    expect(
      result.eventCandidates.filter((e) => e.personId === "person_0000000000000003"),
    ).toHaveLength(0);
  });
});
