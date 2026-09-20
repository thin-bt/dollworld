import { describe, expect, it } from "vitest";
import { ABILITY_KEYS, APTITUDE_KEYS, type AbilityKey, type AptitudeKey } from "../abilities.js";
import {
  validateTechniqueDefinition,
  type AbilityScores,
  type AptitudeScores,
  type PersonTechniqueState,
  type StatValueTriple,
  type TeacherCanTeachContext,
  type TechniqueDefinition,
} from "../index.js";
import { asTechniqueId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { computeWeeklyTeachCompositeScore } from "./evaluate-explicit-weekly-teach.js";
import {
  evaluateTeachingSelectionReEvaluationDue,
  evaluateTechniqueTeachingSelection,
  isTechniqueTeachingSelectionEnabled,
  rankTeachableTechniqueCandidates,
} from "./evaluate-technique-teaching-selection.js";
import {
  createSprint3Balance070ConfigInput,
  createSprint3Balance080ConfigInput,
} from "./sprint3-config-defaults.js";
import type { TechniqueTeachingSelectionRecord } from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const provider = createNodeSha256Provider();

function statTriple(surfaceValue: number): StatValueTriple {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function buildAbilities(overrides: Partial<Record<AbilityKey, number>> = {}): AbilityScores {
  const result = {} as Record<AbilityKey, StatValueTriple>;
  for (const key of ABILITY_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AbilityScores;
}

function buildAptitudes(overrides: Partial<Record<AptitudeKey, number>> = {}): AptitudeScores {
  const result = {} as Record<AptitudeKey, StatValueTriple>;
  for (const key of APTITUDE_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AptitudeScores;
}

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

function teacherContext(
  techniqueId: string,
  overrides: Partial<TeacherCanTeachContext> = {},
): TeacherCanTeachContext {
  return {
    activeMentorshipExists: true,
    masterLifeStatus: "living",
    masterParticipationStatus: "active",
    masterCareerStatus: "active_competitor",
    masterTechniqueState: techniqueState(techniqueId, { masteryHundredths: 9000 }),
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
    learningTier,
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

function learnerContext(
  techniqueStates: readonly PersonTechniqueState[] = [],
  overrides: {
    abilities?: Partial<Record<AbilityKey, number>>;
    aptitudes?: Partial<Record<AptitudeKey, number>>;
  } = {},
): TechniqueTeachingSelectionRecord["discipleLearnerContext"] {
  return {
    abilities: buildAbilities(overrides.abilities),
    aptitudes: buildAptitudes(overrides.aptitudes),
    techniqueStates,
  };
}

function selectionRecord(
  overrides: Partial<TechniqueTeachingSelectionRecord> = {},
): TechniqueTeachingSelectionRecord {
  return {
    masterPersonId: "master-1",
    disciplePersonId: "disciple-1",
    mentorshipRelationKind: "formal_master_disciple",
    discipleLearnerContext: learnerContext(),
    candidates: [],
    ...overrides,
  };
}

describe("S03-008 technique teaching selection", () => {
  it("TS-001 sprint3-balance-0.8.0 validates and enables feature gate", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    expect(isTechniqueTeachingSelectionEnabled(config)).toBe(true);
    expect(config.teachingSelection?.reEvaluationTriggers.fourWeekCadenceWeeks).toBe(4);
  });

  it("TS-002 fail-closed when teaching selection is disabled (0.7.0)", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance070ConfigInput(), provider));
    expect(isTechniqueTeachingSelectionEnabled(config)).toBe(false);
    const outcome = expectOk(
      evaluateTechniqueTeachingSelection(
        config,
        selectionRecord(),
        new Map<string, TechniqueDefinition>(),
      ),
    );
    expect(outcome.kind).toBe("feature_disabled");
  });

  it("TS-003 excludes candidates when static teacherCanTeach is false", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const definition = definitionFor("technique_alpha");
    const outcome = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          candidates: [
            {
              techniqueId: "technique_alpha",
              teacherCanTeachContext: teacherContext("technique_alpha", {
                activeMentorshipExists: false,
              }),
              evaluationInputs: highScores(),
            },
          ],
        }),
        new Map([["technique_alpha", definition]]),
      ),
    );
    expect(outcome.rankedCandidates).toHaveLength(0);
    expect(outcome.excludedCandidates[0]?.reasons).toContain("static_teacher_can_teach_false");
  });

  it("TS-004 excludes candidates when disciple prerequisites are unmet", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const definition = definitionFor("technique_beta", {
      prerequisiteTechniqueIds: ["technique_prereq"],
    });
    const outcome = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          discipleLearnerContext: learnerContext(),
          candidates: [
            {
              techniqueId: "technique_beta",
              teacherCanTeachContext: teacherContext("technique_beta"),
              evaluationInputs: highScores(),
            },
          ],
        }),
        new Map([["technique_beta", definition]]),
      ),
    );
    expect(outcome.excludedCandidates[0]?.reasons).toContain("disciple_prerequisites_unmet");
  });

  it("TS-005 applies basic tier composite threshold boundary at 30", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const policy = config.teachingSelection!;
    const weights = policy.evaluationWeights;
    const belowInputs = {
      styleMatchScore: 39,
      requirementsMetScore: 100,
      trustAndCompatibilityScore: 0,
      tacticalNeedScore: 0,
      successionPriorityScore: 0,
      secrecyAndLoyaltyPenalty: 0,
    };
    expect(computeWeeklyTeachCompositeScore(weights, belowInputs)).toBe(29);
    const atInputs = { ...belowInputs, styleMatchScore: 40 };
    expect(computeWeeklyTeachCompositeScore(weights, atInputs)).toBe(30);
    const definition = definitionFor("technique_basic", { learningTier: "basic" });
    const below = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          candidates: [
            {
              techniqueId: "technique_basic",
              teacherCanTeachContext: teacherContext("technique_basic"),
              evaluationInputs: belowInputs,
            },
          ],
        }),
        new Map([["technique_basic", definition]]),
      ),
    );
    expect(below.excludedCandidates[0]?.reasons).toContain("composite_below_tier_threshold");
    const at = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          candidates: [
            {
              techniqueId: "technique_basic",
              teacherCanTeachContext: teacherContext("technique_basic"),
              evaluationInputs: atInputs,
            },
          ],
        }),
        new Map([["technique_basic", definition]]),
      ),
    );
    expect(at.rankedCandidates).toHaveLength(1);
  });

  it("TS-006 parent temporary guidance caps non-basic tiers", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const definition = definitionFor("technique_standard", { learningTier: "standard" });
    const outcome = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          mentorshipRelationKind: "parent_temporary_guidance",
          candidates: [
            {
              techniqueId: "technique_standard",
              teacherCanTeachContext: teacherContext("technique_standard"),
              evaluationInputs: highScores(),
            },
          ],
        }),
        new Map([["technique_standard", definition]]),
      ),
    );
    expect(outcome.excludedCandidates[0]?.reasons).toContain("parent_temporary_guidance_tier_cap");
  });

  it("TS-007 ranks deterministically by score desc then techniqueId asc", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const defA = definitionFor("technique_a", { learningTier: "basic" });
    const defB = definitionFor("technique_b", { learningTier: "basic" });
    const defC = definitionFor("technique_c", { learningTier: "basic" });
    const tieScore = highScores();
    const outcome = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          candidates: [
            {
              techniqueId: "technique_c",
              teacherCanTeachContext: teacherContext("technique_c"),
              evaluationInputs: tieScore,
            },
            {
              techniqueId: "technique_a",
              teacherCanTeachContext: teacherContext("technique_a"),
              evaluationInputs: tieScore,
            },
            {
              techniqueId: "technique_b",
              teacherCanTeachContext: teacherContext("technique_b"),
              evaluationInputs: { ...tieScore, styleMatchScore: 50 },
            },
          ],
        }),
        new Map([
          ["technique_a", defA],
          ["technique_b", defB],
          ["technique_c", defC],
        ]),
      ),
    );
    expect(outcome.rankedCandidates.map((entry) => entry.techniqueId)).toEqual([
      "technique_a",
      "technique_c",
      "technique_b",
    ]);
  });

  it("TS-008 applies secrecy penalty up to configured maximum", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const weights = config.teachingSelection!.evaluationWeights;
    const maxPenalty = computeWeeklyTeachCompositeScore(weights, {
      ...highScores(),
      secrecyAndLoyaltyPenalty: 100,
    });
    const highPositive = computeWeeklyTeachCompositeScore(weights, highScores());
    expect(highPositive - maxPenalty).toBe(40);
    expect(maxPenalty).toBe(60);
  });

  it("TS-009 re-evaluation triggers fire for cadence, enrollment, and acquisition complete", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const policy = config.teachingSelection!;
    expect(
      evaluateTeachingSelectionReEvaluationDue(policy, {
        weeksSinceLastTeachingSelectionEvaluation: 4,
        newEnrollmentThisEvaluation: false,
        currentTechniqueAcquisitionCompleted: false,
      }).matchedTriggers,
    ).toContain("four_week_cadence");
    expect(
      evaluateTeachingSelectionReEvaluationDue(policy, {
        weeksSinceLastTeachingSelectionEvaluation: 0,
        newEnrollmentThisEvaluation: true,
        currentTechniqueAcquisitionCompleted: false,
      }).matchedTriggers,
    ).toContain("new_enrollment");
    expect(
      evaluateTeachingSelectionReEvaluationDue(policy, {
        weeksSinceLastTeachingSelectionEvaluation: 0,
        newEnrollmentThisEvaluation: false,
        currentTechniqueAcquisitionCompleted: true,
      }).matchedTriggers,
    ).toContain("current_technique_acquisition_complete");
  });

  it("TS-010 advanced tier requires trust and master mastery thresholds", () => {
    const config = expectOk(validateSprint3Config(createSprint3Balance080ConfigInput(), provider));
    const definition = definitionFor("technique_advanced", { learningTier: "advanced" });
    const lowTrust = expectOk(
      rankTeachableTechniqueCandidates(
        config,
        selectionRecord({
          candidates: [
            {
              techniqueId: "technique_advanced",
              teacherCanTeachContext: teacherContext("technique_advanced", {
                masterTechniqueState: techniqueState("technique_advanced", {
                  masteryHundredths: 7500,
                }),
              }),
              evaluationInputs: {
                ...highScores(),
                trustAndCompatibilityScore: 39,
              },
            },
          ],
        }),
        new Map([["technique_advanced", definition]]),
      ),
    );
    expect(lowTrust.excludedCandidates[0]?.reasons).toContain("trust_below_tier_threshold");
  });
});
