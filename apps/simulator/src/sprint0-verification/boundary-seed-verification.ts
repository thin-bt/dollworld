import type { InitialWorldConfig } from "@shared-world/simulation-core";
import type { BoundarySeedRunCheck, BoundarySeedVerification } from "./completion-report.js";
import { compareSameSeedRuns } from "./determinism-verification.js";
import { executeSprint0Run, type Sprint0RunArtifacts } from "./execute-run.js";
import { verifyFixedSevenFilesOnDisk } from "./fixed-seven-files.js";
import { verifyRunInvariants, type InvariantIssue } from "./invariant-verification.js";

export type BoundarySeedVerificationResult = {
  passed: boolean;
  results: BoundarySeedVerification[];
  issues: InvariantIssue[];
};

/**
 * Verify one boundary seed: both runs must independently satisfy invariants,
 * validation, termination, and the on-disk fixed 7 files, and the two runs must
 * match. Two identically broken runs must not pass on determinism alone.
 */
export function verifyBoundarySeedPair(input: {
  seed: number;
  config: InitialWorldConfig;
  first: Sprint0RunArtifacts;
  second: Sprint0RunArtifacts;
}): { result: BoundarySeedVerification; issues: InvariantIssue[] } {
  const issues: InvariantIssue[] = [];
  const comparison = compareSameSeedRuns(input.first, input.second);
  const runChecks: BoundarySeedRunCheck[] = [];

  for (const [label, artifacts] of [
    ["first", input.first],
    ["second", input.second],
  ] as const) {
    const runInvariants = verifyRunInvariants(artifacts, input.config);
    const disk = verifyFixedSevenFilesOnDisk(artifacts.runDirectory);
    const check: BoundarySeedRunCheck = {
      run: label,
      invariantsPassed: runInvariants.passed,
      validationPassed: artifacts.validationReport.overallPassed,
      terminationPassed: artifacts.runMetadata.termination.kind === "completed",
      sevenFilesPassed: disk.passed,
    };
    runChecks.push(check);

    if (!runInvariants.passed) {
      issues.push(...runInvariants.issues);
    }
    if (!disk.passed) {
      issues.push(...disk.issues);
    }
    if (!check.validationPassed || !check.terminationPassed) {
      issues.push({
        name: "boundarySeed.runOutput",
        targetIds: [String(input.seed)],
        reason: `boundary seed ${String(input.seed)} ${label} run: validationPassed=${String(check.validationPassed)} terminationPassed=${String(check.terminationPassed)}`,
        severity: "error",
        canContinue: false,
      });
    }
  }

  const runsPassed = runChecks.every(
    (check) =>
      check.invariantsPassed &&
      check.validationPassed &&
      check.terminationPassed &&
      check.sevenFilesPassed,
  );

  return {
    result: {
      seed: input.seed,
      determinismPassed: comparison.passed,
      differenceCount: comparison.differences.length,
      runs: runChecks,
      passed: comparison.passed && runsPassed,
    },
    issues,
  };
}

/**
 * Execute and verify every boundary seed twice under identical conditions.
 */
export function verifyBoundarySeeds(input: {
  repoRoot: string;
  outputRoot: string;
  config: InitialWorldConfig;
  seeds: readonly number[];
  years: number;
}): BoundarySeedVerificationResult {
  const results: BoundarySeedVerification[] = [];
  const issues: InvariantIssue[] = [];

  for (const seed of input.seeds) {
    const first = executeSprint0Run({
      repoRoot: input.repoRoot,
      outputRoot: input.outputRoot,
      config: input.config,
      seed,
      years: input.years,
    });
    const second = executeSprint0Run({
      repoRoot: input.repoRoot,
      outputRoot: input.outputRoot,
      config: input.config,
      seed,
      years: input.years,
    });
    const verified = verifyBoundarySeedPair({ seed, config: input.config, first, second });
    results.push(verified.result);
    issues.push(...verified.issues);
  }

  return {
    passed: results.every((result) => result.passed),
    results,
    issues,
  };
}
