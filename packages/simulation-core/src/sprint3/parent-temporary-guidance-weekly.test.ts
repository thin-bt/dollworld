import { describe, expect, it } from "vitest";
import {
  computeTechniqueCatalogHash,
  createInitialTrainingProcessorRuntimeState,
  createSeededRng,
  getDefaultSprint1Config,
  processWeeklyTrainingWeek,
  validateTechniqueCatalog,
} from "../index.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  createSprint3Balance050ConfigInput,
  createSprint3Balance060ConfigInput,
} from "./sprint3-config-defaults.js";
import { evaluateEnrollmentAssignment as evaluateEnrollmentAssignmentDirect } from "./evaluate-enrollment-assignment.js";
import {
  isWeeklyTrainingParentTemporaryGuidanceEnabled,
  selectParentTemporaryGuidanceTeacherFactor,
  selectWeeklyTrainingTeacherFactorBasisPoints,
  validateWeeklyTrainingSprint3ConfigBinding,
} from "./resolve-weekly-parent-temporary-guidance.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import type { EnrollmentAssignmentRecord, EnrollmentMasterCandidate } from "./types.js";
import type { WeeklyTrainingPersonRecord } from "../sprint1/weekly-training-types.js";

const provider = createNodeSha256Provider();
const sprint1Config = getDefaultSprint1Config();

function expectOk<T>(result: { ok: boolean; value?: T; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.value as T;
}

function minimalWeeklyRecord(
  overrides: Partial<WeeklyTrainingPersonRecord> = {},
): WeeklyTrainingPersonRecord {
  return {
    person: {
      personId: "child-1",
      name: { familyName: "Test", givenName: "Child" },
      sex: "male",
      currentAge: 10,
      lifeStatus: "living",
      careerStatus: "trainee",
      familyStatus: "member",
      lineageId: "lineage-a",
      familyId: "family-a",
      abilities: {
        strength: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        agility: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        technique: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        spirit: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        stamina: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
      },
      aptitudes: {
        striking: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        grappling: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        internal: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        external: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
        mobility: { surfaceValue: 50, growthPotential: 50, remainderMilliPoints: 0 },
      },
    } as WeeklyTrainingPersonRecord["person"],
    growthProfile: "normal",
    growthPotential: {
      strength: 50,
      agility: 50,
      technique: 50,
      spirit: 50,
      stamina: 50,
    },
    statGrowthRemainders: {
      strength: 0,
      agility: 0,
      technique: 0,
      spirit: 0,
      stamina: 0,
    },
    temporaryCondition: {
      fatigue: 0,
      injury: 0,
      condition: 100,
      confidence: 50,
      currentMental: 100,
      maximumMental: 100,
    },
    motivationFactor: 10000,
    plannerContext: { weeklyActionKind: "train_stat" },
    statTargetContext: { targetStat: "strength" },
    techniqueTargetContexts: [],
    teacherFactorKey: "averageMaster",
    discipleCount: 0,
    ...overrides,
  };
}

describe("S03-006 parent temporary guidance weekly binding", () => {
  it("PTG-001 sprint3-balance-0.6.0 validates with parent guidance weekly flag", () => {
    expect(validateSprint3Config(createSprint3Balance060ConfigInput(), provider).ok).toBe(true);
  });

  it("PTG-002 fail-closed when parent guidance weekly flag enabled on 0.5.0", () => {
    const input = createSprint3Balance050ConfigInput();
    input.mentorshipFeatures = {
      ...input.mentorshipFeatures,
      weeklyTrainingParentTemporaryGuidanceEnabled: true,
    };
    expect(validateSprint3Config(input, provider).ok).toBe(false);
  });

  it("PTG-003 selectParentTemporaryGuidanceTeacherFactor reads config ten-thousandths", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    const factor = expectOk(
      selectParentTemporaryGuidanceTeacherFactor(config.teachingEfficiency),
    );
    expect(factor).toBe(7500);
  });

  it("PTG-004 formal master mentorship keeps Sprint1 teacherFactorKey path", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    const record = minimalWeeklyRecord({
      mentorshipRelationKind: "formal_master_disciple",
      teacherFactorKey: "eraLeadingInstructor",
    });
    const factor = expectOk(
      selectWeeklyTrainingTeacherFactorBasisPoints(record, sprint1Config, sprint3),
    );
    expect(factor).toBe(sprint1Config.growth.teacherFactors.eraLeadingInstructor);
  });

  it("PTG-005 without sprint3Config weekly teacher factor is unchanged Sprint1 path", () => {
    const record = minimalWeeklyRecord({ teacherFactorKey: "averageMaster" });
    const factor = expectOk(selectWeeklyTrainingTeacherFactorBasisPoints(record, sprint1Config));
    expect(factor).toBe(sprint1Config.growth.teacherFactors.averageMaster);
  });

  it("PTG-006 parent_temporary_guidance applies config factor not formal teacher key", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    const record = minimalWeeklyRecord({
      mentorshipRelationKind: "parent_temporary_guidance",
      teacherFactorKey: "eraLeadingInstructor",
    });
    const factor = expectOk(
      selectWeeklyTrainingTeacherFactorBasisPoints(record, sprint1Config, sprint3),
    );
    expect(factor).toBe(7500);
    expect(factor).not.toBe(sprint1Config.growth.teacherFactors.eraLeadingInstructor);
  });

  it("PTG-007 rejects invalid sprint3Config binding at weekly processor input", () => {
    expect(validateWeeklyTrainingSprint3ConfigBinding({ bad: true }).ok).toBe(false);
  });

  it("PTG-008 fail-closed when parent guidance disallowed in enrollment config", () => {
    const sprint3Base = expectOk(
      validateSprint3Config(createSprint3Balance060ConfigInput(), provider),
    );
    const sprint3 = {
      ...sprint3Base,
      enrollment: { ...sprint3Base.enrollment, parentTemporaryGuidanceAllowed: false },
    };
    const record = minimalWeeklyRecord({ mentorshipRelationKind: "parent_temporary_guidance" });
    expect(
      selectWeeklyTrainingTeacherFactorBasisPoints(record, sprint1Config, sprint3).ok,
    ).toBe(false);
  });

  it("PTG-009 processWeeklyTrainingWeek accepts optional sprint3-balance-0.6.0 config", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    expect(isWeeklyTrainingParentTemporaryGuidanceEnabled(sprint3)).toBe(true);
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

  it("PTG-010 later formal enrollment is not blocked by temporary guidance fallback id", () => {
    const sprint3 = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    const qualifiedParent: EnrollmentMasterCandidate = {
      masterPersonId: "parent-a",
      isBiologicalParent: true,
      qualificationRecord: {
        careerStatus: "retired",
        lifeStatus: "living",
        retirementRank: "C",
        highestRank: "C",
        officialWins: 0,
        limitedOfficialWins: 0,
        tournamentTitles: 0,
      },
      parentChildCompatibilityScore: 0,
      lineageAptitudeScore: 0,
      schoolFitScore: 0,
      teachingEfficiencyScore: 0,
      intakeAcceptance: "accept",
    };
    const record: EnrollmentAssignmentRecord = {
      childPersonId: "child-1",
      childAge: 8,
      activeSpecialReasons: [],
      masterCandidates: [qualifiedParent],
      temporaryGuidanceParentPersonId: "parent-a",
    };
    const outcome = evaluateEnrollmentAssignmentDirect(sprint3, record);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.value.kind).toBe("parent_master_assigned");
    expect(outcome.value.mentorshipRelationKind).toBe("parent_master_disciple");
    const factorA = expectOk(
      selectParentTemporaryGuidanceTeacherFactor(sprint3.teachingEfficiency),
    );
    const factorB = expectOk(
      selectParentTemporaryGuidanceTeacherFactor(sprint3.teachingEfficiency),
    );
    expect(factorA).toBe(factorB);
  });
});
