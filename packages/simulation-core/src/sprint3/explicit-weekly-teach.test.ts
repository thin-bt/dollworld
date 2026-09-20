import { describe, expect, it } from "vitest";
import {
  validateTechniqueDefinition,
  type PersonTechniqueState,
  type TeacherCanTeachContext,
  type TechniqueDefinition,
} from "../index.js";
import { asTechniqueId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  computeWeeklyTeachingAllocationSlots,
  evaluateExplicitWeeklyTeachAction,
  evaluateWeeklyTeachRefusal,
  isExplicitWeeklyTeachActionEnabled,
} from "./evaluate-explicit-weekly-teach.js";
import {
  createSprint3Balance060ConfigInput,
  createSprint3Balance070ConfigInput,
} from "./sprint3-config-defaults.js";
import type { ExplicitWeeklyTeachActionRecord, WeeklyTeachDiscipleRequest } from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: boolean; value?: T }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value as T;
}

function techniqueState(
  techniqueId: string,
  overrides: Partial<PersonTechniqueState> = {},
): PersonTechniqueState {
  return {
    techniqueId: asTechniqueId(techniqueId),
    acquiredAbsoluteWeek: 1,
    masteryHundredths: 8000,
    learningProgressTenths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    ...overrides,
  };
}

function teacherContext(overrides: Partial<TeacherCanTeachContext> = {}): TeacherCanTeachContext {
  return {
    activeMentorshipExists: true,
    masterLifeStatus: "living",
    masterParticipationStatus: "active",
    masterCareerStatus: "active_competitor",
    masterTechniqueState: techniqueState("technique_alpha"),
    ...overrides,
  };
}

function definitionFor(id: string, overrides: Record<string, unknown> = {}): TechniqueDefinition {
  const learningTier = (overrides.learningTier as string | undefined) ?? "basic";
  const learningProgressRequired =
    learningTier === "basic"
      ? 100
      : learningTier === "standard"
        ? 180
        : learningTier === "advanced"
          ? 320
          : 500;
  const raw = {
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
    learningProgressRequired,
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
    ...overrides,
  };
  return expectOk(validateTechniqueDefinition(raw));
}

function highScores() {
  return {
    styleMatchScore: 100,
    requirementsMetScore: 100,
    trustAndCompatibilityScore: 100,
    tacticalNeedScore: 100,
    successionPriorityScore: 100,
    secrecyAndLoyaltyPenalty: 0,
  };
}

function discipleRequest(
  overrides: Partial<WeeklyTeachDiscipleRequest> = {},
): WeeklyTeachDiscipleRequest {
  return {
    disciplePersonId: "disciple-1",
    techniqueId: "technique_alpha",
    learningTier: "basic",
    teacherCanTeachContext: teacherContext({
      masterTechniqueState: techniqueState("technique_alpha"),
    }),
    mentorshipRelationKind: "formal_master_disciple",
    evaluationInputs: highScores(),
    ...overrides,
  };
}

function teachRecord(
  overrides: Partial<ExplicitWeeklyTeachActionRecord> = {},
): ExplicitWeeklyTeachActionRecord {
  return {
    masterPersonId: "master-1",
    masterWeeklyPipelineEligible: true,
    masterFormalDiscipleCount: 2,
    teachingAbilityScore: 50,
    selectedWeeklyAction: "teach",
    discipleRequests: [discipleRequest()],
    ...overrides,
  };
}

describe("S03-007 explicit weekly teach", () => {
  it("WT-001 sprint3-balance-0.7.0 validates and enables feature gate", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    expect(isExplicitWeeklyTeachActionEnabled(config)).toBe(true);
    expect(config.weeklyTeachAction).toBeDefined();
  });

  it("WT-002 fail-closed when explicit weekly teach is disabled (0.6.0)", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance060ConfigInput(), provider));
    expect(isExplicitWeeklyTeachActionEnabled(config)).toBe(false);
    const outcome = evaluateExplicitWeeklyTeachAction(
      config,
      teachRecord(),
      new Map([["technique_alpha", definitionFor("technique_alpha")]]),
    );
    expect(outcome.ok).toBe(false);
  });

  it("WT-003 rejects non-teach master weekly action without processing disciples", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const outcome = expectOk(
      evaluateExplicitWeeklyTeachAction(
        config,
        teachRecord({ selectedWeeklyAction: "train_stat" }),
        new Map([["technique_alpha", definitionFor("technique_alpha")]]),
      ),
    );
    expect(outcome.kind).toBe("invalid_master_action");
    expect(outcome.discipleOutcomes).toHaveLength(0);
  });

  it("WT-004 rejects pipeline-ineligible master", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const outcome = expectOk(
      evaluateExplicitWeeklyTeachAction(
        config,
        teachRecord({ masterWeeklyPipelineEligible: false }),
        new Map([["technique_alpha", definitionFor("technique_alpha")]]),
      ),
    );
    expect(outcome.kind).toBe("master_not_pipeline_eligible");
  });

  it("WT-005 computes weekly teach allocation slots from config formula", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const policy = config.weeklyTeachAction!;
    expect(computeWeeklyTeachingAllocationSlots(policy, 0)).toBe(1);
    expect(computeWeeklyTeachingAllocationSlots(policy, 50)).toBe(6);
    expect(computeWeeklyTeachingAllocationSlots(policy, 100)).toBe(6);
  });

  it("WT-006 accepts teaching when composite meets basic tier threshold", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const policy = config.weeklyTeachAction!;
    const definition = definitionFor("technique_alpha", { learningTier: "basic" });
    const outcome = expectOk(
      evaluateWeeklyTeachRefusal(policy, definition, discipleRequest({ learningTier: "basic" })),
    );
    expect(outcome.decision).toBe("accepted");
    expect(outcome.compositeScore).toBeGreaterThanOrEqual(30);
  });

  it("WT-007 refuses when composite score is below tier threshold", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const policy = config.weeklyTeachAction!;
    const definition = definitionFor("technique_alpha", { learningTier: "standard" });
    const outcome = expectOk(
      evaluateWeeklyTeachRefusal(
        policy,
        definition,
        discipleRequest({
          learningTier: "standard",
          evaluationInputs: {
            styleMatchScore: 0,
            requirementsMetScore: 0,
            trustAndCompatibilityScore: 0,
            tacticalNeedScore: 0,
            successionPriorityScore: 0,
            secrecyAndLoyaltyPenalty: 100,
          },
        }),
      ),
    );
    expect(outcome.decision).toBe("refused");
    expect(outcome.reasons).toContain("composite_below_tier_threshold");
  });

  it("WT-008 parent temporary guidance refuses non-basic tiers", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const policy = config.weeklyTeachAction!;
    const definition = definitionFor("technique_alpha", { learningTier: "standard" });
    const outcome = expectOk(
      evaluateWeeklyTeachRefusal(
        policy,
        definition,
        discipleRequest({
          learningTier: "standard",
          mentorshipRelationKind: "parent_temporary_guidance",
        }),
      ),
    );
    expect(outcome.decision).toBe("refused");
    expect(outcome.reasons).toContain("parent_temporary_guidance_tier_cap");
  });

  it("WT-009 skips disciples beyond allocation slot limit", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const definitions = new Map([
      ["technique_alpha", definitionFor("technique_alpha")],
      ["technique_beta", definitionFor("technique_beta", { techniqueId: "technique_beta" })],
    ]);
    const outcome = expectOk(
      evaluateExplicitWeeklyTeachAction(
        config,
        teachRecord({
          teachingAbilityScore: 0,
          discipleRequests: [
            discipleRequest({ disciplePersonId: "d1", techniqueId: "technique_alpha" }),
            discipleRequest({
              disciplePersonId: "d2",
              techniqueId: "technique_beta",
              teacherCanTeachContext: teacherContext({
                masterTechniqueState: techniqueState("technique_beta"),
              }),
            }),
          ],
        }),
        definitions,
      ),
    );
    expect(outcome.weeklyTeachSlotLimit).toBe(1);
    expect(outcome.discipleOutcomes[0]?.decision).toBe("accepted");
    expect(outcome.discipleOutcomes[1]?.decision).toBe("skipped_allocation");
  });

  it("WT-010 refuses when static teacherCanTeach is false", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    const policy = config.weeklyTeachAction!;
    const definition = definitionFor("technique_alpha");
    const outcome = expectOk(
      evaluateWeeklyTeachRefusal(
        policy,
        definition,
        discipleRequest({
          teacherCanTeachContext: teacherContext({ activeMentorshipExists: false }),
        }),
      ),
    );
    expect(outcome.decision).toBe("refused");
    expect(outcome.reasons).toContain("static_teacher_can_teach_false");
  });
});
