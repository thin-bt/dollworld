import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  createSprint3Balance080ConfigInput,
  createSprint3Balance090ConfigInput,
} from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import {
  classifyOriginalTechniqueResearchTier,
  computeFailedGenerationRetainedResearchValue,
  computeOriginalTechniqueGenerationSuccessPercentTenThousandths,
  evaluateOriginalTechniqueGenerationAttempt,
  evaluateOriginalTechniqueLoss,
  isOriginalTechniqueLifecycleEnabled,
  rollOriginalTechniqueGenerationSuccess,
} from "./evaluate-original-technique-lifecycle.js";
import { isTechniqueTeachingSelectionEnabled } from "./evaluate-technique-teaching-selection.js";

const provider = createNodeSha256Provider();

function expectOk<T>(result: { ok: true; value: T } | { ok: false }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value;
}

function baseGenerationRecord(
  overrides: Partial<Parameters<typeof evaluateOriginalTechniqueGenerationAttempt>[1]> = {},
) {
  return {
    founderPersonId: "person_001",
    researchValue: 180,
    sourceTechniqueIds: ["tech_base"],
    developmentReason: "repeated_weakness_losses",
    worldWeekIndex: 100,
    cooldownWeeksRemaining: 0,
    modifiers: { successPercentAdjustmentPoints: 0 },
    proposedNewTechniqueId: "tech_derived_001",
    ...overrides,
  };
}

describe("S03-008 original technique lifecycle", () => {
  const config = expectOk(validateSprint3Config(createSprint3Balance090ConfigInput(), provider));
  const thresholds = config.originalTechniqueLifecycle!.researchThresholds;
  const generation = config.originalTechniqueLifecycle!.generation;

  it("OTL-001 CFG-014 accepts sprint3-balance-0.9.0 lifecycle policy", () => {
    expect(isOriginalTechniqueLifecycleEnabled(config)).toBe(true);
  });

  it("OTL-002 research threshold boundaries 180/320/550", () => {
    expect(classifyOriginalTechniqueResearchTier(179.9, thresholds)).toBeUndefined();
    expect(classifyOriginalTechniqueResearchTier(180, thresholds)).toBe("derived_technique");
    expect(classifyOriginalTechniqueResearchTier(319, thresholds)).toBe("derived_technique");
    expect(classifyOriginalTechniqueResearchTier(320, thresholds)).toBe("composite_technique");
    expect(classifyOriginalTechniqueResearchTier(549, thresholds)).toBe("composite_technique");
    expect(classifyOriginalTechniqueResearchTier(550, thresholds)).toBe("full_original_technique");
  });

  it("OTL-003 success probability clamps to 20..80 percent", () => {
    expect(computeOriginalTechniqueGenerationSuccessPercentTenThousandths(generation, -100)).toBe(
      2000,
    );
    expect(computeOriginalTechniqueGenerationSuccessPercentTenThousandths(generation, 100)).toBe(
      8000,
    );
    expect(computeOriginalTechniqueGenerationSuccessPercentTenThousandths(generation, 0)).toBe(
      5000,
    );
  });

  it("OTL-004 deterministic RNG roll respects success percent", () => {
    expect(rollOriginalTechniqueGenerationSuccess(5000, { nextInt: () => 4999 })).toBe(true);
    expect(rollOriginalTechniqueGenerationSuccess(5000, { nextInt: () => 5000 })).toBe(false);
  });

  it("OTL-005 failed generation retains 80% research and applies 24-week cooldown", () => {
    expect(computeFailedGenerationRetainedResearchValue(200, 80)).toBe(160);
    const failed = expectOk(
      evaluateOriginalTechniqueGenerationAttempt(
        config,
        baseGenerationRecord({ researchValue: 200 }),
        { nextInt: () => 9999 },
      ),
    );
    expect(failed.kind).toBe("generation_failed");
    if (failed.kind === "generation_failed") {
      expect(failed.retainedResearchValue).toBe(160);
      expect(failed.cooldownWeeksRemaining).toBe(24);
    }
  });

  it("OTL-006 cooldown blocks generation attempt", () => {
    const outcome = expectOk(
      evaluateOriginalTechniqueGenerationAttempt(
        config,
        baseGenerationRecord({ cooldownWeeksRemaining: 3 }),
        { nextInt: () => 0 },
      ),
    );
    expect(outcome.kind).toBe("cooldown_active");
  });

  it("OTL-007 successful generation emits founding history record", () => {
    const outcome = expectOk(
      evaluateOriginalTechniqueGenerationAttempt(
        config,
        baseGenerationRecord({ researchValue: 550, proposedNewTechniqueId: "tech_full_001" }),
        { nextInt: () => 0 },
      ),
    );
    expect(outcome.kind).toBe("generation_succeeded");
    if (outcome.kind === "generation_succeeded") {
      expect(outcome.foundingHistory?.eventKind).toBe("original_technique_founded");
      expect(outcome.foundingHistory?.researchTier).toBe("full_original_technique");
      expect(outcome.foundingHistory?.newTechniqueId).toBe("tech_full_001");
      expect(outcome.initialMasteryHundredths).toBe(1000);
    }
  });

  it("OTL-008 technique loss when no living practitioners or successors", () => {
    expect(
      evaluateOriginalTechniqueLoss({
        techniqueId: "tech_lost",
        livingPractitionerCount: 0,
        registeredSuccessorPersonIds: [],
        livingSuccessorPractitionerCount: 0,
      }).isLost,
    ).toBe(true);
    expect(
      evaluateOriginalTechniqueLoss({
        techniqueId: "tech_alive",
        livingPractitionerCount: 1,
        registeredSuccessorPersonIds: [],
        livingSuccessorPractitionerCount: 0,
      }).isLost,
    ).toBe(false);
    expect(
      evaluateOriginalTechniqueLoss({
        techniqueId: "tech_heir",
        livingPractitionerCount: 0,
        registeredSuccessorPersonIds: ["person_heir"],
        livingSuccessorPractitionerCount: 1,
      }).isLost,
    ).toBe(false);
  });

  it("OTL-009 teaching selection remains enabled on sprint3-balance-0.9.0 (regression)", () => {
    const config080 = expectOk(
      validateSprint3Config(createSprint3Balance080ConfigInput(), provider),
    );
    expect(isTechniqueTeachingSelectionEnabled(config080)).toBe(true);
    expect(isTechniqueTeachingSelectionEnabled(config)).toBe(true);
    expect(isOriginalTechniqueLifecycleEnabled(config080)).toBe(false);
  });
});
