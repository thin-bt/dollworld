import { describe, expect, it } from "vitest";
import {
  validateTechniqueCatalog,
  validateTechniqueDefinition,
  type TechniqueDefinition,
} from "../index.js";
import { asPersonId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { ABILITY_KEYS } from "../abilities.js";
import { computeTechniqueCatalogHash } from "../sprint1/technique-catalog.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { WEEKLY_SCORED_ACTIONS } from "../sprint1/weekly-actions.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { runSprint1WeeklyStep } from "../sprint1/sprint1-weekly-step.js";
import { processExplicitWeeklyTeachWeek } from "./process-explicit-weekly-teach-week.js";
import { processSprint3EnrollmentIntakeBoundary } from "./process-sprint3-enrollment-intake-boundary.js";
import {
  createInitialSprint3MentorshipEntrypointRuntimeState,
  lookupMentorshipRelationKindForChild,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import {
  createSprint3Balance040ConfigInput,
  createSprint3Balance070ConfigInput,
} from "./sprint3-config-defaults.js";
import type {
  EnrollmentAssignmentRecord,
  EnrollmentMasterCandidate,
  ExplicitWeeklyTeachActionRecord,
  MasterQualificationEvaluationRecord,
} from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: true; value: T } | { ok: false; issues?: unknown }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result)}`);
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

function sidecarEntry(personId: string, discipleCount = 0): Record<string, unknown> {
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
    discipleCount,
  };
}

const CHILD_ID = asPersonId("child_enrollment_001");
const PARENT_ID = asPersonId("parent_master_001");
const MASTER_B_ID = asPersonId("master_reassignment_b");

function validatedSidecar() {
  return expectOk(
    validateWeeklyTrainingSidecarState({
      schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
      entries: [sidecarEntry(CHILD_ID), sidecarEntry(PARENT_ID)],
    }),
  );
}

function qualifiedMasterRecord(): MasterQualificationEvaluationRecord {
  return {
    careerStatus: "retired",
    lifeStatus: "living",
    retirementRank: "C",
    highestRank: "C",
    officialWins: 0,
    limitedOfficialWins: 0,
    tournamentTitles: 0,
  };
}

function masterCandidate(
  overrides: Partial<EnrollmentMasterCandidate> & Pick<EnrollmentMasterCandidate, "masterPersonId">,
): EnrollmentMasterCandidate {
  return {
    isBiologicalParent: true,
    qualificationRecord: qualifiedMasterRecord(),
    parentChildCompatibilityScore: 80,
    lineageAptitudeScore: 70,
    schoolFitScore: 60,
    teachingEfficiencyScore: 50,
    intakeAcceptance: "accept",
    ...overrides,
  };
}

function definitionFor(id: string): TechniqueDefinition {
  return expectOk(
    validateTechniqueDefinition({
      techniqueId: id,
      schemaVersion: "0.1.0",
      dataVersion: "techniques-0.1.0",
      name: "Test Technique",
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
}

describe("S03-012 mentorship entrypoint runtime wiring", () => {
  const sprint3Enrollment = expectOk(
    validateSprint3Config(createSprint3Balance040ConfigInput(), provider),
  );
  const sprint3Teach = expectOk(
    validateSprint3Config(createSprint3Balance070ConfigInput(), provider),
  );

  it("MER-001 enrollment boundary invokes evaluateMasterIntakeDecision + evaluateEnrollmentAssignment and persists sidecar/runtime", () => {
    const pending: EnrollmentAssignmentRecord = {
      childPersonId: CHILD_ID,
      childAge: 8,
      activeSpecialReasons: [],
      masterCandidates: [masterCandidate({ masterPersonId: PARENT_ID, isBiologicalParent: true })],
    };
    const runtime = {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      pendingEnrollmentBoundaries: [pending],
    };
    const result = expectOk(
      processSprint3EnrollmentIntakeBoundary({
        absoluteWeek: 384,
        sprint3Config: sprint3Enrollment,
        weeklyTrainingSidecars: validatedSidecar(),
        runtimeState: runtime,
      }),
    );
    expect(result.runtimeState!.completedEnrollmentOutcomes).toHaveLength(1);
    expect(result.runtimeState!.completedEnrollmentOutcomes[0]?.outcome.kind).toBe(
      "parent_master_assigned",
    );
    expect(result.runtimeState!.completedMasterIntakeOutcomes.length).toBeGreaterThan(0);
    const parentEntry = result.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === PARENT_ID,
    );
    expect(parentEntry?.discipleCount).toBe(1);
    expect(lookupMentorshipRelationKindForChild(result.runtimeState, CHILD_ID)).toBe(
      "parent_master_disciple",
    );
  });

  it("MER-002 explicit weekly teach week invokes evaluateExplicitWeeklyTeachAction and persists outcome", () => {
    const teachRecord: ExplicitWeeklyTeachActionRecord = {
      masterPersonId: "master-1",
      masterWeeklyPipelineEligible: true,
      masterFormalDiscipleCount: 1,
      teachingAbilityScore: 50,
      selectedWeeklyAction: "teach",
      discipleRequests: [],
    };
    const runtime = {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      pendingExplicitWeeklyTeachRecords: [teachRecord],
    };
    const definition = definitionFor("technique_alpha");
    const catalogHash = expectOk(computeTechniqueCatalogHash([definition], provider));
    const catalogResult = validateTechniqueCatalog(
      {
        identity: { dataVersion: "techniques-0.1.0", catalogHash },
        definitions: [definition],
      },
      provider,
    );
    if (!catalogResult.ok) {
      throw new Error(`catalog: ${JSON.stringify(catalogResult.issues)}`);
    }
    const catalog = catalogResult.value;
    const result = processExplicitWeeklyTeachWeek({
      absoluteWeek: 12,
      sprint3Config: sprint3Teach,
      techniqueCatalog: catalog,
      runtimeState: runtime,
    });
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    expect(result.value.runtimeState!.completedExplicitWeeklyTeachOutcomes).toHaveLength(1);
    expect(result.value.runtimeState!.completedExplicitWeeklyTeachOutcomes[0]?.outcome.kind).toBe(
      "teach_week_completed",
    );
    expect(result.value.runtimeState!.pendingExplicitWeeklyTeachRecords).toHaveLength(0);
  });

  it("MER-003 lookupMentorshipRelationKindForChild reads persisted assignment", () => {
    const runtime = {
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      mentorshipByChildPersonId: [
        {
          childPersonId: CHILD_ID,
          selectedMasterPersonId: PARENT_ID,
          mentorshipRelationKind: "parent_master_disciple" as const,
          enrollmentOutcomeKind: "parent_master_assigned" as const,
          assignedAbsoluteWeek: 384,
        },
      ],
    };
    expect(lookupMentorshipRelationKindForChild(runtime, CHILD_ID)).toBe("parent_master_disciple");
  });

  it("MER-004 runSprint1WeeklyStep import graph includes entrypoint processors", () => {
    expect(typeof runSprint1WeeklyStep).toBe("function");
    expect(typeof processSprint3EnrollmentIntakeBoundary).toBe("function");
    expect(typeof processExplicitWeeklyTeachWeek).toBe("function");
  });

  it("MER-005 S03-061 rejects duplicate childPersonId in mentorshipByChildPersonId", () => {
    const invalid = validateSprint3MentorshipEntrypointRuntimeState({
      ...createInitialSprint3MentorshipEntrypointRuntimeState(),
      mentorshipByChildPersonId: [
        {
          childPersonId: CHILD_ID,
          selectedMasterPersonId: PARENT_ID,
          mentorshipRelationKind: "formal_master_disciple",
          enrollmentOutcomeKind: "formal_master_assigned",
          assignedAbsoluteWeek: 1,
        },
        {
          childPersonId: CHILD_ID,
          selectedMasterPersonId: MASTER_B_ID,
          mentorshipRelationKind: "formal_master_disciple",
          enrollmentOutcomeKind: "formal_master_assigned",
          assignedAbsoluteWeek: 2,
        },
      ],
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) {
      return;
    }
    expect(
      invalid.issues.some((issue) =>
        issue.message.includes("duplicate childPersonId in mentorshipByChildPersonId"),
      ),
    ).toBe(true);
  });
});
