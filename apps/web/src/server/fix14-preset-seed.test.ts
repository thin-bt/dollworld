import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createSprint1RunSession } from "@shared-world/simulation-core";
import { buildProductionCreateSprint1RunSessionInput } from "./create-sprint1-run-session-input.js";
import { createNodeSha256Provider, loadSprint1AcceptedPresetMaterials } from "./presets.js";

const REPO_ROOT = resolve(process.cwd());

describe("FIX14 production preset createSprint1RunSession", () => {
  it.each([7, 42, 1, 99])("seed %s succeeds", (seed) => {
    const materials = loadSprint1AcceptedPresetMaterials(REPO_ROOT);
    const sha256 = createNodeSha256Provider();
    const result = createSprint1RunSession(
      buildProductionCreateSprint1RunSessionInput(materials, seed, sha256),
      sha256,
    );
    if (!result.ok) {
      expect.fail(JSON.stringify(result.issues));
    }
  });
});
