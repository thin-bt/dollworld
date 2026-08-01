import type { InitialWorldConfig } from "@shared-world/simulation-core";
import type { DeterminismComparisonResult } from "./determinism-verification.js";
import { compareSameSeedRuns } from "./determinism-verification.js";
import type { Sprint0RunArtifacts } from "./execute-run.js";
import { verifyFixedSevenFilesOnDisk } from "./fixed-seven-files.js";
import { verifyRunInvariants, type InvariantIssue } from "./invariant-verification.js";

export type SameSeedRunCheck = {
  run: "first" | "second";
  invariantsPassed: boolean;
  validationPassed: boolean;
  terminationPassed: boolean;
  sevenFilesPassed: boolean;
};

export type SameSeedPairVerification = {
  determinism: DeterminismComparisonResult;
  runs: [SameSeedRunCheck, SameSeedRunCheck];
  /** true when determinism matches and both runs independently pass all checks. */
  passed: boolean;
  issues: InvariantIssue[];
};

export type IndependentRunCheck = {
  invariantsPassed: boolean;
  validationPassed: boolean;
  terminationPassed: boolean;
  sevenFilesPassed: boolean;
  issues: InvariantIssue[];
};

/**
 * Independently verify one run: invariants, validation, termination, fixed 7 files.
 */
export function verifyRunIndependentChecks(
  artifacts: Sprint0RunArtifacts,
  config: InitialWorldConfig,
): IndependentRunCheck {
  const runInvariants = verifyRunInvariants(artifacts, config);
  const disk = verifyFixedSevenFilesOnDisk(artifacts.runDirectory);
  const validationPassed = artifacts.validationReport.overallPassed;
  const terminationPassed = artifacts.runMetadata.termination.kind === "completed";
  const issues: InvariantIssue[] = [];
  if (!runInvariants.passed) {
    issues.push(...runInvariants.issues);
  }
  if (!disk.passed) {
    issues.push(...disk.issues);
  }
  if (!validationPassed || !terminationPassed) {
    issues.push({
      name: "run.independentOutput",
      targetIds: [artifacts.runMetadata.runId],
      reason: `run ${artifacts.runMetadata.runId}: validationPassed=${String(validationPassed)} terminationPassed=${String(terminationPassed)}`,
      severity: "error",
      canContinue: false,
    });
  }
  return {
    invariantsPassed: runInvariants.passed,
    validationPassed,
    terminationPassed,
    sevenFilesPassed: disk.passed,
    issues,
  };
}

/**
 * Same-seed pair: determinism comparison plus independent checks on both runs.
 * Two identically broken runs still fail when independent checks fail.
 */
export function verifySameSeedPair(input: {
  config: InitialWorldConfig;
  first: Sprint0RunArtifacts;
  second: Sprint0RunArtifacts;
}): SameSeedPairVerification {
  const determinism = compareSameSeedRuns(input.first, input.second);
  const firstCheck = verifyRunIndependentChecks(input.first, input.config);
  const secondCheck = verifyRunIndependentChecks(input.second, input.config);
  const runs: [SameSeedRunCheck, SameSeedRunCheck] = [
    {
      run: "first",
      invariantsPassed: firstCheck.invariantsPassed,
      validationPassed: firstCheck.validationPassed,
      terminationPassed: firstCheck.terminationPassed,
      sevenFilesPassed: firstCheck.sevenFilesPassed,
    },
    {
      run: "second",
      invariantsPassed: secondCheck.invariantsPassed,
      validationPassed: secondCheck.validationPassed,
      terminationPassed: secondCheck.terminationPassed,
      sevenFilesPassed: secondCheck.sevenFilesPassed,
    },
  ];
  const issues = [...firstCheck.issues, ...secondCheck.issues];
  const runsPassed = runs.every(
    (check) =>
      check.invariantsPassed &&
      check.validationPassed &&
      check.terminationPassed &&
      check.sevenFilesPassed,
  );
  return {
    determinism,
    runs,
    passed: determinism.passed && runsPassed,
    issues,
  };
}
