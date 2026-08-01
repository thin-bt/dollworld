import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  RNG_ALGORITHM_VERSION,
  S0_SPEC_VERSION,
  SIMULATION_SPEC_VERSION,
} from "@shared-world/simulation-core";
import { tryGetGitCommitId } from "../output/git-commit.js";
import {
  SPRINT0_ALTERNATE_SEED,
  SPRINT0_BOUNDARY_SEEDS,
  SPRINT0_COMPLETION_REPORT_FILE_NAME,
  SPRINT0_PRIMARY_SEED,
} from "./constants.js";
import { verifyBoundarySeeds } from "./boundary-seed-verification.js";
import {
  buildSprint0CompletionReport,
  buildYearProfile,
  type Sprint0CompletionReport,
  type YearProfileResult,
  type PopulationPerformanceResult,
} from "./completion-report.js";
import { compareDifferentSeedRuns, compareSameSeedRuns } from "./determinism-verification.js";
import { executeSprint0Run } from "./execute-run.js";
import { verifyFixedSevenFilesOnDisk } from "./fixed-seven-files.js";
import { tryGetWorkingTreeDirty } from "./git-working-tree.js";
import { verifyRunInvariants, type InvariantIssue } from "./invariant-verification.js";
import { writeCompletionReportAtomic } from "./report-io.js";
import { runIsolatedPopulationPerformance } from "./run-population-performance.js";
import { buildScaledPopulationConfig, loadBaselineConfig } from "./scaled-config.js";

export type Sprint0VerificationSuiteResult = {
  report: Sprint0CompletionReport;
  reportPath: string;
};

export type RunSprint0VerificationInput = {
  repoRoot: string;
  /** Parent directory for temporary run outputs. */
  workRoot: string;
  /** Optional absolute path for the completion report JSON. Defaults under workRoot. */
  reportPath?: string;
};

/**
 * Full Sprint 0 verification suite used by `npm run verify:sprint0`.
 * Population performance profiles are measured in isolated child processes.
 * Callers receive the completion report summary only (not full run artifacts).
 */
export function runSprint0Verification(
  input: RunSprint0VerificationInput,
): Sprint0VerificationSuiteResult {
  const outputRoot = join(input.workRoot, "runs");
  mkdirSync(outputRoot, { recursive: true });
  const baseline = loadBaselineConfig(input.repoRoot);

  const years10 = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_PRIMARY_SEED,
    years: 10,
  });
  const years50 = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_PRIMARY_SEED,
    years: 50,
  });
  const years100a = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_PRIMARY_SEED,
    years: 100,
  });
  const years100b = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_PRIMARY_SEED,
    years: 100,
  });
  const years300 = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_PRIMARY_SEED,
    years: 300,
  });
  const altSeed10 = executeSprint0Run({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seed: SPRINT0_ALTERNATE_SEED,
    years: 10,
  });

  const sameSeed = compareSameSeedRuns(years100a, years100b);
  const differentSeed = compareDifferentSeedRuns(years10, altSeed10);

  const boundarySeedDeterminism = verifyBoundarySeeds({
    repoRoot: input.repoRoot,
    outputRoot,
    config: baseline,
    seeds: SPRINT0_BOUNDARY_SEEDS,
    years: 1,
  });

  const invariantTargets = [years10, years50, years100a, years300, altSeed10];
  const invariantByLabel = new Map<string, ReturnType<typeof verifyRunInvariants>>();
  const invariantIssues: InvariantIssue[] = [...boundarySeedDeterminism.issues];
  for (const target of invariantTargets) {
    const label = `${String(target.years)}y-${String(target.config.population.totalLiving)}p-${String(target.seed)}`;
    const result = verifyRunInvariants(target, target.config);
    invariantByLabel.set(label, result);
    if (!result.passed) {
      invariantIssues.push(...result.issues);
    }
  }

  const yearProfiles: YearProfileResult[] = [
    buildYearProfile(
      years10,
      invariantByLabel.get(
        `10y-${String(baseline.population.totalLiving)}p-${String(years10.seed)}`,
      )?.passed === true,
    ),
    buildYearProfile(
      years50,
      invariantByLabel.get(
        `50y-${String(baseline.population.totalLiving)}p-${String(years50.seed)}`,
      )?.passed === true,
    ),
    buildYearProfile(
      years100a,
      invariantByLabel.get(
        `100y-${String(baseline.population.totalLiving)}p-${String(years100a.seed)}`,
      )?.passed === true,
    ),
    buildYearProfile(
      years300,
      invariantByLabel.get(
        `300y-${String(baseline.population.totalLiving)}p-${String(years300.seed)}`,
      )?.passed === true,
    ),
  ];

  // Drop references to large year-run artifacts before spawning population workers.
  // Population RSS is measured in fresh child processes regardless.
  const nameDataVersion = years100a.initialSnapshot.nameDataVersion;
  const sevenFilesFromYearRuns = invariantTargets.every((a) => {
    const disk = verifyFixedSevenFilesOnDisk(a.runDirectory);
    return (
      a.validationReport.overallPassed &&
      a.runMetadata.termination.kind === "completed" &&
      disk.passed
    );
  });

  const config2000 = buildScaledPopulationConfig(baseline, 2000);
  const config5000 = buildScaledPopulationConfig(baseline, 5000);

  const pop600 = runIsolatedPopulationPerformance({
    repoRoot: input.repoRoot,
    seed: SPRINT0_PRIMARY_SEED,
    years: 100,
    population: 600,
    config: baseline,
    warningSeconds: baseline.performanceTargets.warningSecondsFor600People100Years,
    measureOnly: false,
  });
  const pop2000 = runIsolatedPopulationPerformance({
    repoRoot: input.repoRoot,
    seed: SPRINT0_PRIMARY_SEED,
    years: 100,
    population: 2000,
    config: config2000,
    warningSeconds: baseline.performanceTargets.warningSecondsFor2000People100Years,
    measureOnly: false,
  });
  const pop5000 = runIsolatedPopulationPerformance({
    repoRoot: input.repoRoot,
    seed: SPRINT0_PRIMARY_SEED,
    years: 100,
    population: 5000,
    config: config5000,
    warningSeconds: null,
    measureOnly: true,
  });

  for (const isolated of [pop600, pop2000, pop5000]) {
    if (!isolated.invariantsPassed) {
      invariantIssues.push({
        name: "population.invariants",
        targetIds: [],
        reason: `population ${String(isolated.profile.population)} invariants failed in isolated worker`,
        severity: "error" as const,
        canContinue: false,
      });
    }
  }

  const invariants = {
    passed: invariantIssues.length === 0,
    issues: invariantIssues,
  };

  const populationProfiles: PopulationPerformanceResult[] = [
    pop600.profile,
    pop2000.profile,
    pop5000.profile,
  ];

  const sevenFilesOk =
    sevenFilesFromYearRuns &&
    pop600.sevenFilesPassed &&
    pop2000.sevenFilesPassed &&
    pop5000.sevenFilesPassed;
  const validationSamplesOk =
    sevenFilesOk &&
    pop600.validationOverallPassed &&
    pop2000.validationOverallPassed &&
    pop5000.validationOverallPassed;

  const report = buildSprint0CompletionReport({
    generatedAt: new Date(),
    commitId: tryGetGitCommitId(input.repoRoot),
    workingTreeDirty: tryGetWorkingTreeDirty(input.repoRoot),
    simulationSpecVersion: SIMULATION_SPEC_VERSION,
    miniSpecVersion: S0_SPEC_VERSION,
    configSchemaVersion: baseline.schemaVersion,
    nameDataVersion,
    rngAlgorithm: RNG_ALGORITHM_VERSION,
    primarySeed: SPRINT0_PRIMARY_SEED,
    alternateSeed: SPRINT0_ALTERNATE_SEED,
    boundarySeeds: SPRINT0_BOUNDARY_SEEDS,
    sameSeed,
    differentSeed,
    boundarySeedDeterminism,
    invariants,
    yearProfiles,
    populationProfiles,
    sevenFilesOk,
    validationSamplesOk,
    notPerformed: [
      "boundary-seed long-horizon performance profiles (0 / 4294967295) — not performed; short same-seed determinism plus invariant/validation/termination/seven-file checks for boundary seeds are performed",
      "per-year-profile isolated max RSS (10 / 50 / 100 / 300 years) — not performed; those runs share the suite process, so yearProfiles[].maxRssKilobytes is null (maxRssMeasurementScope=not_measured_per_run). Population profiles are measured in isolated child processes.",
    ],
  });

  const reportPath = input.reportPath ?? join(input.workRoot, SPRINT0_COMPLETION_REPORT_FILE_NAME);
  writeCompletionReportAtomic(reportPath, report);

  return {
    report,
    reportPath,
  };
}

export function cleanupSprint0WorkRoot(workRoot: string): void {
  rmSync(workRoot, { recursive: true, force: true });
}
