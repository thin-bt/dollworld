import type { InitialWorldConfig } from "@shared-world/simulation-core";
import {
  buildPopulationPerformanceResultFromArtifacts,
  type PopulationPerformanceResult,
} from "./completion-report.js";
import { executeSprint0Run } from "./execute-run.js";
import { verifyRunInvariants } from "./invariant-verification.js";

export type PopulationPerformanceWorkerInput = {
  repoRoot: string;
  outputRoot: string;
  seed: number;
  years: number;
  population: number;
  config: InitialWorldConfig;
  warningSeconds: number | null;
  measureOnly: boolean;
};

export type PopulationPerformanceWorkerOutput = {
  profile: PopulationPerformanceResult;
  invariantsPassed: boolean;
  sevenFilesPassed: boolean;
  validationOverallPassed: boolean;
  terminationKind: string;
  nameDataVersion: string;
};

/**
 * Run a single population performance profile in the current process.
 * Intended to be invoked from an isolated child process so maxRSS is not
 * contaminated by prior long-horizon suite artifacts.
 */
export function runPopulationPerformanceProfile(
  input: PopulationPerformanceWorkerInput,
): PopulationPerformanceWorkerOutput {
  const artifacts = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot: input.outputRoot,
    config: input.config,
    seed: input.seed,
    years: input.years,
  });
  const invariants = verifyRunInvariants(artifacts, input.config);
  const profile = buildPopulationPerformanceResultFromArtifacts({
    population: input.population,
    artifacts,
    warningSeconds: input.warningSeconds,
    measureOnly: input.measureOnly,
  });
  return {
    profile,
    invariantsPassed: invariants.passed,
    sevenFilesPassed:
      artifacts.validationReport.overallPassed &&
      artifacts.runMetadata.termination.kind === "completed" &&
      invariants.passed,
    validationOverallPassed: artifacts.validationReport.overallPassed,
    terminationKind: artifacts.runMetadata.termination.kind,
    nameDataVersion: artifacts.initialSnapshot.nameDataVersion,
  };
}
