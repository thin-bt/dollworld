import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSprint1RunSession } from "@shared-world/simulation-core";
import { createNodeSha256Provider, loadSprint1AcceptedPresetMaterials } from "./presets.js";

const REPO_ROOT = resolve(process.cwd());

function buildCreateInput(
  materials: ReturnType<typeof loadSprint1AcceptedPresetMaterials>,
  seed: number,
): unknown {
  return {
    seed,
    config: materials.config,
    nameData: materials.nameData,
    sprint1CliInput: materials.sprint1CliInputForCreate,
  };
}

describe("FIX14 production preset createSprint1RunSession", () => {
  it.each([7, 42, 1, 99])("seed %s succeeds", (seed) => {
    const materials = loadSprint1AcceptedPresetMaterials(REPO_ROOT);
    const sha256 = createNodeSha256Provider();
    const result = createSprint1RunSession(buildCreateInput(materials, seed), sha256);
    if (!result.ok) {
      expect.fail(JSON.stringify(result.issues));
    }
  });
});
