import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSprint1RunSession, createDefaultSprint2IdentityBindings, SIMULATION_IDENTITY_SCHEMA_VERSION } from "@shared-world/simulation-core";
import { createNodeSha256Provider, loadSprint1AcceptedPresetMaterials } from "./presets.js";

const REPO_ROOT = resolve(process.cwd());

function buildCreateInput(
  materials: ReturnType<typeof loadSprint1AcceptedPresetMaterials>,
  seed: number,
  sha256: ReturnType<typeof createNodeSha256Provider>,
): unknown {
  const payload: Record<string, unknown> = {
    seed,
    config: materials.config,
    nameData: materials.nameData,
    sprint1CliInput: materials.sprint1CliInputForCreate,
  };
  if (SIMULATION_IDENTITY_SCHEMA_VERSION === "0.6.0") {
    const bindings = createDefaultSprint2IdentityBindings(sha256);
    if (!bindings.ok) {
      throw new Error(JSON.stringify(bindings.issues));
    }
    payload.sprint2IdentityBindings = bindings.value;
  }
  return payload;
}

describe("FIX14 production preset createSprint1RunSession", () => {
  it.each([7, 42, 1, 99])("seed %s succeeds", (seed) => {
    const materials = loadSprint1AcceptedPresetMaterials(REPO_ROOT);
    const sha256 = createNodeSha256Provider();
    const result = createSprint1RunSession(buildCreateInput(materials, seed, sha256), sha256);
    if (!result.ok) {
      expect.fail(JSON.stringify(result.issues));
    }
  });
});
