import { describe, expect, it } from "vitest";
import { asPersonId } from "../ids.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import { INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION } from "../sprint1/constants.js";
import { validateSprint1Config } from "../sprint1/validate-sprint1-config.js";
import { createDefaultSprint1ConfigInput } from "../sprint1/sprint1-config-defaults.js";
import { validateWeeklyTrainingSidecarState } from "../sprint1/weekly-training-sidecar-state.js";
import { createSprint3Balance090ConfigInput } from "./sprint3-config-defaults.js";
import { validateSprint3Config } from "./validate-sprint3-config.js";
import { processTechniqueTeachingSelectionWeek } from "./process-technique-teaching-selection-week.js";
import { lookupTechniqueTeachingSelectionPairSnapshot } from "./technique-teaching-selection-runtime-state.js";
import { evaluateTeachingSelectionReEvaluationDue } from "./evaluate-technique-teaching-selection.js";
import { sidecarEntry, teachWorld } from "./live-explicit-weekly-teach-wiring.test.js";
import { validateTechniqueDefinition } from "../sprint1/technique-definition.js";

const provider = createNodeSha256Provider();
const MASTER_ID = asPersonId("master_live_teach_wiring");
const DISCIPLE_ID = asPersonId("disciple_live_teach_wiring");

function expectOk<T>(result: { ok: boolean; value?: T }): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected success");
  }
  return result.value as T;
}

describe("S03-022 live technique teaching-selection wiring", () => {
  it("TTS-L001 weekly processor persists ranked selection snapshot", () => {
    const { world, runtime } = teachWorld("formal_master_disciple");
    const sidecars = expectOk(
      validateWeeklyTrainingSidecarState({
        schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
        entries: [sidecarEntry(DISCIPLE_ID), sidecarEntry(MASTER_ID, 1)],
      }),
    );
    const sprint3Config = expectOk(
      validateSprint3Config(createSprint3Balance090ConfigInput(), provider),
    );
    const sprint1Config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    const definition = expectOk(
      validateTechniqueDefinition({
        techniqueId: "technique_alpha",
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
      }),
    );
    const catalog = {
      identity: { dataVersion: "techniques-0.1.0", catalogHash: "0".repeat(64) },
      definitions: [definition],
    };

    const processed = expectOk(
      processTechniqueTeachingSelectionWeek({
        absoluteWeek: 4,
        worldState: world,
        weeklyTrainingSidecars: sidecars,
        sprint3Config,
        sprint1Config,
        techniqueCatalog: catalog,
        mentorshipRuntime: runtime,
        runtimeState: undefined,
      }),
    );
    const snapshot = lookupTechniqueTeachingSelectionPairSnapshot(
      processed.runtimeState,
      MASTER_ID,
      DISCIPLE_ID,
    );
    expect(snapshot?.outcome.kind).toBe("selection_completed");
  });

  it("TTS-L004 reevaluation not-due vs due triggers", () => {
    const sprint3Config = expectOk(
      validateSprint3Config(createSprint3Balance090ConfigInput(), provider),
    );
    const policy = sprint3Config.teachingSelection!;
    expect(
      evaluateTeachingSelectionReEvaluationDue(policy, {
        weeksSinceLastTeachingSelectionEvaluation: 0,
        newEnrollmentThisEvaluation: false,
        currentTechniqueAcquisitionCompleted: false,
      }).due,
    ).toBe(false);
    expect(
      evaluateTeachingSelectionReEvaluationDue(policy, {
        weeksSinceLastTeachingSelectionEvaluation: 4,
        newEnrollmentThisEvaluation: false,
        currentTechniqueAcquisitionCompleted: false,
      }).due,
    ).toBe(true);
  });
});
