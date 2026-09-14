import {
  createDefaultSprint2IdentityBindings,
  type InitialWorldConfig,
  type Sha256Provider,
  type Sprint2IdentityBindings,
  type ValidatedNameData,
} from "@shared-world/simulation-core";
import type { PresetMaterials } from "./presets.js";

export type ProductionCreateSprint1RunSessionInput = {
  seed: number;
  config: InitialWorldConfig;
  nameData: ValidatedNameData;
  sprint1CliInput: unknown;
  sprint2IdentityBindings: Sprint2IdentityBindings;
};

export function buildProductionCreateSprint1RunSessionInput(
  materials: PresetMaterials,
  seed: number,
  sha256Provider: Sha256Provider,
): ProductionCreateSprint1RunSessionInput {
  const bindings = createDefaultSprint2IdentityBindings(sha256Provider);
  if (!bindings.ok) {
    throw new Error(
      `default Sprint2 identity bindings failed: ${JSON.stringify(bindings.issues)}`,
    );
  }
  return {
    seed,
    config: materials.config,
    nameData: materials.nameData,
    sprint1CliInput: materials.sprint1CliInputForCreate,
    sprint2IdentityBindings: bindings.value,
  };
}
