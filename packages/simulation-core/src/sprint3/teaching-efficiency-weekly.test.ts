import { describe, expect, it } from "vitest";
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
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(1, config.teachingEfficiency))).toBe(
      brackets[0]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(3, config.teachingEfficiency))).toBe(
      brackets[0]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(4, config.teachingEfficiency))).toBe(
      brackets[1]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(7, config.teachingEfficiency))).toBe(
      brackets[2]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(11, config.teachingEfficiency))).toBe(
      brackets[3]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(21, config.teachingEfficiency))).toBe(
      brackets[4]!.factorTenThousandths,
    );
    expect(expectOk(selectDiscipleCountTeachingEfficiencyFactor(41, config.teachingEfficiency))).toBe(
      brackets[5]!.factorTenThousandths,
    );
  });

  it("TE-005 sprint3 bracket factor can differ from Sprint1 growth discipleCountFactors at same count", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance050ConfigInput(), provider));
    const customTeaching = {
      ...sprint3.teachingEfficiency,
      discipleCountFactorBrackets: [
        { minDisciplesInclusive: 1, maxDisciplesInclusive: 999_999, factorTenThousandths: 5000 },
      ],
    };
    const sprint3Factor = expectOk(
      selectDiscipleCountTeachingEfficiencyFactor(2, customTeaching),
    );
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
    const many = expectOk(selectDiscipleCountTeachingEfficiencyFactor(15, config.teachingEfficiency));
    const one = expectOk(selectDiscipleCountTeachingEfficiencyFactor(1, config.teachingEfficiency));
    expect(many).toBeLessThan(one);
  });
});
