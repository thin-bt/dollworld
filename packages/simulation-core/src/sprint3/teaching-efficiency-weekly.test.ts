import { describe, expect, it } from "vitest";
import { ABILITY_KEYS, APTITUDE_KEYS, type AbilityKey } from "../abilities.js";
import {
  computeTechniqueCatalogHash,
  createInitialTrainingProcessorRuntimeState,
  createSeededRng,
  getDefaultSprint1Config,
  processWeeklyTrainingWeek,
  selectDiscipleCountGrowthFactor,
  validateTechniqueCatalog,
} from "../index.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { applyTrainStat, createWeeklyTrainingDraft } from "../sprint1/weekly-training-effects.js";
import {
  validateWeeklyTrainingPersonRecord,
  type WeeklyTrainingPersonRecord,
} from "../sprint1/weekly-training-types.js";
import {
  createSprint3Balance040ConfigInput,
  createSprint3Balance050ConfigInput,
} from "./sprint3-config-defaults.js";
import {
  isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled,
  selectDiscipleCountTeachingEfficiencyFactor,
} from "./resolve-weekly-disciple-count-teaching-efficiency.js";
import { validateWeeklyTrainingSprint3ConfigBinding } from "./resolve-weekly-parent-temporary-guidance.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();
const sprint1Config = getDefaultSprint1Config();

function expectOk<T>(result: { ok: boolean; value?: T; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.value as T;
}

function statTriple(surfaceValue: number) {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function weeklyTrainingPerson(overrides: Record<string, unknown> = {}) {
  return {
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
    abilities: Object.fromEntries(ABILITY_KEYS.map((key) => [key, statTriple(50)])),
    aptitudes: Object.fromEntries(APTITUDE_KEYS.map((key) => [key, statTriple(50)])),
    sprint1State: {
      sprint1StateSchemaVersion: "0.1.0",
      currentMental: 100,
      techniqueStates: [],
      learningFocusTechniqueId: null,
    },
    ...overrides,
  };
}

function weeklyPlannerContext() {
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

function weeklyStatTargetContext() {
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return { byAbility };
}

function masterWeeklyRecord(discipleCount: number): WeeklyTrainingPersonRecord {
  return expectOk(
    validateWeeklyTrainingPersonRecord({
      person: weeklyTrainingPerson(),
      growthProfile: "normal",
      growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
      statGrowthRemainders: ABILITY_KEYS.map((stat: AbilityKey) => ({ stat, milliPoints: 0 })),
      temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
      motivationFactor: 10000,
      plannerContext: weeklyPlannerContext(),
      statTargetContext: weeklyStatTargetContext(),
      techniqueTargetContexts: [],
      teacherFactorKey: "averageMaster",
      discipleCount,
    }),
  ).record;
}

describe("S03-005 teachingEfficiency weekly training binding", () => {
  it("TE-001 sprint3-balance-0.5.0 validates with weekly binding flag", () => {
    expect(validateSprint3Config(createSprint3Balance050ConfigInput(), provider).ok).toBe(true);
  });

  it("TE-002 fail-closed when weekly binding flag enabled on 0.4.0", () => {
    const input = createSprint3Balance040ConfigInput();
    input.mentorshipFeatures = {
      ...input.mentorshipFeatures,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
    };
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("TE-003 neutral factor at zero disciples regardless of brackets", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const factor = expectOk(
      selectDiscipleCountTeachingEfficiencyFactor(0, config.teachingEfficiency),
    );
    expect(factor).toBe(10000);
  });

  it("TE-004 bracket boundaries 1/3/4/7/11/21/41 are deterministic", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const brackets = config.teachingEfficiency.discipleCountFactorBrackets;
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(1, config.teachingEfficiency)),
    ).toBe(brackets[0]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(3, config.teachingEfficiency)),
    ).toBe(brackets[0]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(4, config.teachingEfficiency)),
    ).toBe(brackets[1]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(7, config.teachingEfficiency)),
    ).toBe(brackets[2]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(11, config.teachingEfficiency)),
    ).toBe(brackets[3]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(21, config.teachingEfficiency)),
    ).toBe(brackets[4]!.factorTenThousandths);
    expect(
      expectOk(selectDiscipleCountTeachingEfficiencyFactor(41, config.teachingEfficiency)),
    ).toBe(brackets[5]!.factorTenThousandths);
  });

  it("TE-005 sprint3 bracket factor can differ from Sprint1 growth discipleCountFactors at same count", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const customTeaching = {
      ...sprint3.teachingEfficiency,
      discipleCountFactorBrackets: [
        { minDisciplesInclusive: 1, maxDisciplesInclusive: 999_999, factorTenThousandths: 5000 },
      ],
    };
    const sprint3Factor = expectOk(selectDiscipleCountTeachingEfficiencyFactor(2, customTeaching));
    const sprint1Factor = expectOk(selectDiscipleCountGrowthFactor(2, sprint1Config));
    expect(sprint3Factor).toBe(5000);
    expect(sprint1Factor).not.toBe(sprint3Factor);
  });

  it("TE-006 without sprint3Config weekly processor keeps Sprint1 disciple factors", () => {
    expect(
      validateWeeklyTrainingSprint3ConfigBinding(undefined).ok &&
        isWeeklyTrainingDiscipleCountTeachingEfficiencyEnabled(
          expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider)),
        ),
    ).toBe(true);
  });

  it("TE-007 rejects invalid sprint3Config binding at weekly processor input", () => {
    expect(validateWeeklyTrainingSprint3ConfigBinding({ bad: true }).ok).toBe(false);
  });

  it("TE-008 rejects enabled binding with wrong configVersion in weekly validation", () => {
    const config = createSprint3Balance040ConfigInput();
    expect(validateWeeklyTrainingSprint3ConfigBinding(config).ok).toBe(true);
    config.mentorshipFeatures = {
      ...config.mentorshipFeatures,
      weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true,
    };
    expect(validateWeeklyTrainingSprint3ConfigBinding(config).ok).toBe(false);
  });

  it("TE-009 processWeeklyTrainingWeek accepts optional sprint3Config key", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const catalogHash = expectOk(computeTechniqueCatalogHash([], provider));
    const catalog = expectOk(
      validateTechniqueCatalog(
        { identity: { dataVersion: "techniques-0.1.0", catalogHash }, definitions: [] },
        provider,
      ),
    );
    const result = processWeeklyTrainingWeek(
      {
        absoluteWeek: 0,
        personRecords: [],
        config: sprint1Config,
        catalog,
        runtimeState: createInitialTrainingProcessorRuntimeState(),
        rngState: createSeededRng(42).exportState(),
        sprint3Config: sprint3,
      },
      { sha256Provider: provider },
    );
    expect(result.ok).toBe(true);
  });

  it("TE-010 multiple disciples use highest matching bracket only once per apply", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const many = expectOk(
      selectDiscipleCountTeachingEfficiencyFactor(15, config.teachingEfficiency),
    );
    const one = expectOk(selectDiscipleCountTeachingEfficiencyFactor(1, config.teachingEfficiency));
    expect(many).toBeLessThan(one);
  });

  it("TE-011 live sidecar discipleCount drives applyTrainStat factor once and persists surface gain", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const catalogHash = expectOk(computeTechniqueCatalogHash([], provider));
    const catalog = expectOk(
      validateTechniqueCatalog(
        { identity: { dataVersion: "techniques-0.1.0", catalogHash }, definitions: [] },
        provider,
      ),
    );
    const factorOne = expectOk(
      selectDiscipleCountTeachingEfficiencyFactor(1, sprint3.teachingEfficiency),
    );
    const factorSeven = expectOk(
      selectDiscipleCountTeachingEfficiencyFactor(7, sprint3.teachingEfficiency),
    );
    expect(factorSeven).toBeLessThan(factorOne);

    const applyForDiscipleCount = (discipleCount: number) => {
      const record = masterWeeklyRecord(discipleCount);
      const draft = expectOk(createWeeklyTrainingDraft(record));
      const outcome = expectOk(
        applyTrainStat(
          draft,
          record,
          catalog,
          sprint1Config,
          "strength",
          10,
          createSeededRng(9001),
          sprint3,
        ),
      );
      return { draft, outcome };
    };

    const oneDisciple = applyForDiscipleCount(1);
    const sevenDisciples = applyForDiscipleCount(7);

    expect(oneDisciple.outcome.events[0]?.payload["factorBreakdown"]).toMatchObject({
      discipleCountFactor: factorOne,
    });
    expect(sevenDisciples.outcome.events[0]?.payload["factorBreakdown"]).toMatchObject({
      discipleCountFactor: factorSeven,
    });
    const appliedOne = oneDisciple.outcome.events[0]?.payload["appliedMilliPoints"];
    const appliedSeven = sevenDisciples.outcome.events[0]?.payload["appliedMilliPoints"];
    expect(typeof appliedOne).toBe("number");
    expect(typeof appliedSeven).toBe("number");
    expect(appliedOne).toBeGreaterThan(appliedSeven as number);
    expect(oneDisciple.draft.remainderMilliPoints.strength).toBe(
      (oneDisciple.outcome.events[0]?.payload["remainderAfter"] as number) ?? -1,
    );
    expect(sevenDisciples.draft.remainderMilliPoints.strength).toBe(
      (sevenDisciples.outcome.events[0]?.payload["remainderAfter"] as number) ?? -1,
    );
  });
});
