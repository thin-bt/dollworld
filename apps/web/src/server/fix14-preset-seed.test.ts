import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSprint1RunSession } from "@shared-world/simulation-core";
import { createNodeSha256Provider, loadSprint1AcceptedPresetMaterials } from "./presets.js";

const REPO_ROOT = resolve(process.cwd());

describe("FIX14 production preset createSprint1RunSession", () => {
  it.each([7, 42, 1, 99])("seed %s succeeds", (seed) => {
    const materials = loadSprint1AcceptedPresetMaterials(REPO_ROOT);
    const result = createSprint1RunSession(
      {
        seed,
        config: materials.config,
        nameData: materials.nameData,
        sprint1CliInput: materials.sprint1CliInputForCreate,
      },
      createNodeSha256Provider(),
    );
    if (!result.ok) {
      expect.fail(JSON.stringify(result.issues));
    }
  });
});
