import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateInitialWorldConfig,
  validateSprint1CliInput,
  type InitialWorldConfig,
  type Sha256Provider,
  type Sprint1CliInput,
} from "@shared-world/simulation-core";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { SPRINT1_FIXTURE_CONFIG_RELATIVE, SPRINT1_FIXTURE_INPUT_RELATIVE } from "./constants.js";

export type TinySprint1Fixtures = {
  config: InitialWorldConfig;
  configRaw: unknown;
  sprint1CliInput: Sprint1CliInput;
  sprint1CliInputRaw: unknown;
  configRelativePath: typeof SPRINT1_FIXTURE_CONFIG_RELATIVE;
  sprint1InputRelativePath: typeof SPRINT1_FIXTURE_INPUT_RELATIVE;
};

export function loadTinySprint1Fixtures(
  repoRoot: string,
  sha256Provider: Sha256Provider = createNodeSha256Provider(),
): TinySprint1Fixtures {
  const configRaw = JSON.parse(
    readFileSync(join(repoRoot, SPRINT1_FIXTURE_CONFIG_RELATIVE), "utf8"),
  ) as unknown;
  const configResult = validateInitialWorldConfig(configRaw);
  if (!configResult.ok) {
    throw new Error(`tiny config validation failed: ${JSON.stringify(configResult.issues)}`);
  }

  const sprint1CliInputRaw = JSON.parse(
    readFileSync(join(repoRoot, SPRINT1_FIXTURE_INPUT_RELATIVE), "utf8"),
  ) as unknown;
  const inputResult = validateSprint1CliInput(sprint1CliInputRaw, sha256Provider);
  if (!inputResult.ok) {
    throw new Error(`tiny sprint1-input validation failed: ${JSON.stringify(inputResult.issues)}`);
  }

  return {
    config: configResult.value,
    configRaw,
    sprint1CliInput: inputResult.value,
    sprint1CliInputRaw,
    configRelativePath: SPRINT1_FIXTURE_CONFIG_RELATIVE,
    sprint1InputRelativePath: SPRINT1_FIXTURE_INPUT_RELATIVE,
  };
}
