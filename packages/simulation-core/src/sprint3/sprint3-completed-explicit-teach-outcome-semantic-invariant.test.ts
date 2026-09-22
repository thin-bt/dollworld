import { describe, expect, it } from "vitest";
import { validateTechniqueDefinition, type TechniqueDefinition } from "../index.js";
import { asPersonId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { evaluateExplicitWeeklyTeachAction } from "./evaluate-explicit-weekly-teach.js";
import { createSprint3Balance070ConfigInput } from "./sprint3-config-defaults.js";
import {
  cloneMentorshipEntrypointRuntimeState,
  createInitialSprint3MentorshipEntrypointRuntimeState,
  validateSprint3MentorshipEntrypointRuntimeState,
} from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { ExplicitWeeklyTeachActionRecord } from "./types.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";

const MASTER_ID = asPersonId("master_teach_semantic_invariant");
const CHILD_ID = asPersonId("child_teach_semantic_invariant");
const provider = createNodeSha256Provider();

function validDiscipleOutcome(): Record<string, unknown> {
  return {
    disciplePersonId: CHILD_ID,
    techniqueId: "technique_alpha",
    decision: "accepted",
    compositeScore: 42.5,
    reasons: ["teach_accepted"],
  };
}

function runtimeWithCompletedTeachOutcome(
  outcome: Record<string, unknown>,
): Record<string, unknown> {
  const base = createInitialSprint3MentorshipEntrypointRuntimeState();
  return {
    ...base,
    completedExplicitWeeklyTeachOutcomes: [
      {
        absoluteWeek: 10,
        masterPersonId: MASTER_ID,
        outcome,
      },
    ],
  };
}

function inactiveKindWithContradictoryPayload(
  kind: "invalid_master_action" | "master_not_pipeline_eligible",
): Record<string, unknown> {
  return {
    kind,
    weeklyTeachSlotLimit: 9,
    discipleOutcomes: [validDiscipleOutcome()],
    reasons: ["contradictory_persisted_payload"],
  };
}

function definitionFor(id: string): TechniqueDefinition {
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
  const result = validateTechniqueDefinition(raw);
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected valid technique definition");
  }
  return result.value;
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
    discipleRequests: [],
    ...overrides,
  };
}

describe("Sprint3 completed explicit teach outcome semantic invariant", () => {
  it.each(["invalid_master_action", "master_not_pipeline_eligible"] as const)(
    "rejects %s with non-zero weeklyTeachSlotLimit",
    (kind) => {
      const outcome = inactiveKindWithContradictoryPayload(kind);
      outcome.discipleOutcomes = [];
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithCompletedTeachOutcome(outcome),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/completedExplicitWeeklyTeachOutcomes/0/outcome/weeklyTeachSlotLimit",
            message: `${kind} requires weeklyTeachSlotLimit 0`,
            actual: 9,
          }),
        ]),
      );
    },
  );

  it.each(["invalid_master_action", "master_not_pipeline_eligible"] as const)(
    "rejects %s carrying discipleOutcomes",
    (kind) => {
      const outcome = inactiveKindWithContradictoryPayload(kind);
      outcome.weeklyTeachSlotLimit = 0;
      const result = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithCompletedTeachOutcome(outcome),
      );
      expect(result.ok).toBe(false);
      if (result.ok) {
        throw new Error("expected validation failure");
      }
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: "/completedExplicitWeeklyTeachOutcomes/0/outcome/discipleOutcomes",
            message: `${kind} must not include discipleOutcomes`,
          }),
        ]),
      );
    },
  );

  it("accepts legacy feature_disabled structurally valid shape (no current producer path)", () => {
    const result = validateSprint3MentorshipEntrypointRuntimeState(
      runtimeWithCompletedTeachOutcome({
        kind: "feature_disabled",
        weeklyTeachSlotLimit: 0,
        discipleOutcomes: [],
        reasons: ["legacy_enum_member_only"],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
  });

  it("round-trips producer outcomes from evaluateExplicitWeeklyTeachAction", () => {
    const configResult = validateSprint3Config(createSprint3Balance070ConfigInput(), provider);
    expect(configResult.ok).toBe(true);
    if (!configResult.ok) {
      throw new Error("expected valid sprint3 config");
    }
    const config = configResult.value;
    const definitions = new Map([["technique_alpha", definitionFor("technique_alpha")]]);

    const invalidAction = evaluateExplicitWeeklyTeachAction(
      config,
      teachRecord({ selectedWeeklyAction: "train_stat" }),
      definitions,
    );
    expect(invalidAction.ok).toBe(true);
    if (!invalidAction.ok) {
      throw new Error(JSON.stringify(invalidAction.issues));
    }

    const ineligible = evaluateExplicitWeeklyTeachAction(
      config,
      teachRecord({ masterWeeklyPipelineEligible: false }),
      definitions,
    );
    expect(ineligible.ok).toBe(true);
    if (!ineligible.ok) {
      throw new Error(JSON.stringify(ineligible.issues));
    }

    for (const producerOutcome of [invalidAction.value, ineligible.value]) {
      const validated = validateSprint3MentorshipEntrypointRuntimeState(
        runtimeWithCompletedTeachOutcome(producerOutcome as Record<string, unknown>),
      );
      expect(validated.ok).toBe(true);
      if (!validated.ok) {
        throw new Error(JSON.stringify(validated.issues));
      }
      const cloned = cloneMentorshipEntrypointRuntimeState(validated.value);
      const roundTrip = validateSprint3MentorshipEntrypointRuntimeState(cloned);
      expect(roundTrip.ok).toBe(true);
      if (!roundTrip.ok) {
        throw new Error(JSON.stringify(roundTrip.issues));
      }
    }
  });
});
