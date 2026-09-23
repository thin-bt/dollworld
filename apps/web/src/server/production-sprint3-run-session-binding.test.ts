/**
 * S03-010 production web binding: accepted Sprint3 sessions use balance-1.0.0 registration pack.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createSprint1RunSession,
  createSprint3Balance100ConfigInput,
  isGeneratedTechniqueRegistrationEnabled,
  isOriginalTechniqueLifecycleEnabled,
  isTechniqueTeachingSelectionEnabled,
  runSprint1WeeklyStep,
  SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION,
  validateSprint3Config,
} from "@shared-world/simulation-core";
import { describe, expect, it } from "vitest";
import { buildProductionCreateSprint1RunSessionInput } from "./create-sprint1-run-session-input.js";
import { createNodeSha256Provider, loadSprint1AcceptedPresetMaterials } from "./presets.js";
import {
  bindAcceptedProductionSprint3RunSession,
  createAcceptedProductionSprint3ConfigInput,
} from "./production-sprint3-run-session-binding.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

const provider = createNodeSha256Provider();

describe("S03-010 accepted production Sprint3 session binding", () => {
  it("PBA-001 accepted production config matches balance-1.0.0 registration pack", () => {
    const production = validateSprint3Config(
      createAcceptedProductionSprint3ConfigInput(),
      provider,
    );
    const balance100 = validateSprint3Config(createSprint3Balance100ConfigInput(), provider);
    expect(production.ok).toBe(true);
    expect(balance100.ok).toBe(true);
    if (!production.ok || !balance100.ok) {
      throw new Error("expected valid sprint3 config");
    }
    expect(production.value.configVersion).toBe(
      SPRINT3_CONFIG_VERSION_GENERATED_TECHNIQUE_REGISTRATION,
    );
    expect(production.value.mentorshipFeatures.generatedTechniqueRegistrationEnabled).toBe(true);
    expect(production.value.generatedTechniqueMaterialization).toEqual(
      balance100.value.generatedTechniqueMaterialization,
    );
  });

  it("PBA-002 prior Sprint3 production feature gates remain enabled", () => {
    const production = validateSprint3Config(
      createAcceptedProductionSprint3ConfigInput(),
      provider,
    );
    expect(production.ok).toBe(true);
    if (!production.ok) {
      throw new Error("expected valid sprint3 config");
    }
    const features = production.value.mentorshipFeatures;
    expect(features.explicitWeeklyTeachActionEnabled).toBe(true);
    expect(features.enrollmentAssignmentAiEnabled).toBe(true);
    expect(features.weeklyTrainingDiscipleCountTeachingEfficiencyEnabled).toBe(true);
    expect(features.weeklyTrainingParentTemporaryGuidanceEnabled).toBe(true);
    expect(features.techniqueTeachingSelectionEnabled).toBe(true);
    expect(production.value.teachingSelection).toBeDefined();
    expect(isTechniqueTeachingSelectionEnabled(production.value)).toBe(true);
    expect(isOriginalTechniqueLifecycleEnabled(production.value)).toBe(true);
  });

  it("PBA-003 accepted production config input is canonical balance-1.0.0 helper output", () => {
    expect(createAcceptedProductionSprint3ConfigInput()).toEqual(
      createSprint3Balance100ConfigInput(),
    );
  });

  function bindProductionPresetSession(seed: number) {
    const materials = loadSprint1AcceptedPresetMaterials(REPO_ROOT);
    const created = createSprint1RunSession(
      buildProductionCreateSprint1RunSessionInput(materials, seed, provider),
      provider,
    );
    if (!created.ok) {
      return created;
    }
    return bindAcceptedProductionSprint3RunSession(created.value.session, provider);
  }

  it("PBA-004 production-bound preset session keeps registration-enabled config through weekly step", () => {
    const bound = bindProductionPresetSession(11);
    expect(bound.ok).toBe(true);
    if (!bound.ok) {
      throw new Error("expected production bind success");
    }
    const sprint3Config = bound.value.context.sprint3Config;
    expect(sprint3Config).toBeDefined();
    expect(isGeneratedTechniqueRegistrationEnabled(sprint3Config!)).toBe(true);
    const stepped = runSprint1WeeklyStep(bound.value, provider);
    expect(stepped.ok).toBe(true);
    if (!stepped.ok) {
      throw new Error("expected weekly step success");
    }
    expect(isGeneratedTechniqueRegistrationEnabled(stepped.value.context.sprint3Config!)).toBe(
      true,
    );
    expect(stepped.value.runtimeState.originalTechniqueLifecycleRuntime).toBeDefined();
  });
});
