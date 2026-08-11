import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  buildBlockedBoundarySeeds,
  buildBlockedCheck,
  buildBlockedDifferentSeed,
  buildBlockedFixedSeven,
  buildBlockedIdentity,
  buildBlockedIntegrated,
  buildBlockedPerformance,
  buildBlockedSameSeed,
  buildBlockedSprint0,
  buildBlockedYearProfiles,
  buildSprint1CompletionReport,
} from "./completion-report.js";
import { runDiffCheck, runNpmCheck, runWikiCheck } from "./command-gates.js";
import {
  SPRINT1_COMPLETION_REPORT_FILE_NAME,
  SPRINT1_VERIFICATION_OUTPUT_DIR,
  SPRINT1_VERIFICATION_RUNS_DIR,
} from "./constants.js";
import { verifyFixedSevenArtifacts } from "./fixed-seven.js";
import {
  assertGitCommitUnchanged,
  isWorkingTreeDirty,
  resolveRequiredGitCommit,
} from "./git-meta.js";
import { verifyIdentityAndCanonical } from "./identity-canonical.js";
import { verifyIntegratedScenario } from "./integrated-scenario.js";
import { invalidateCompletionReport, writeCompletionReportAtomic } from "./report-io.js";
import { verifySprint1Performance } from "./run-population-performance.js";
import { verifySeedAndYearMatrix } from "./seed-matrix.js";
import { verifySprint0Regression } from "./sprint0-regression.js";
import type {
  CheckSection,
  RunArtifactRef,
  Sprint1CompletionReport,
  VerificationIssue,
} from "./types.js";

export type Sprint1VerificationSuiteResult = {
  report: Sprint1CompletionReport;
  reportPath: string;
};

export type RunSprint1VerificationInput = {
  repoRoot: string;
  reportPath?: string;
};

function cleanupVerificationOwnedArtifacts(repoRoot: string, reportPath: string): void {
  invalidateCompletionReport(reportPath);
  const runsDir = join(repoRoot, SPRINT1_VERIFICATION_RUNS_DIR);
  if (existsSync(runsDir)) {
    rmSync(runsDir, { recursive: true, force: true });
  }
  mkdirSync(runsDir, { recursive: true });
}

function collectRunFixedSeven(runsRoot: string): {
  dirs: string[];
  refs: RunArtifactRef[];
} {
  const dirs: string[] = [];
  const refs: RunArtifactRef[] = [];
  if (!existsSync(runsRoot)) {
    return { dirs, refs };
  }
  for (const runKeyEntry of readdirSync(runsRoot)) {
    const runKeyPath = join(runsRoot, runKeyEntry);
    if (!statSync(runKeyPath).isDirectory()) continue;
    for (const runIdEntry of readdirSync(runKeyPath)) {
      const runDir = join(runKeyPath, runIdEntry);
      if (!statSync(runDir).isDirectory()) continue;
      if (existsSync(join(runDir, "run-metadata.json"))) {
        dirs.push(runDir);
        refs.push({
          runKey: runKeyEntry,
          relativeRunDirectory: `runs/${runKeyEntry}/${runIdEntry}`,
        });
      }
    }
  }
  return { dirs, refs };
}

/**
 * Full Sprint 1 verification suite used by `npm run verify:sprint1`.
 */
export function runSprint1Verification(
  input: RunSprint1VerificationInput,
): Sprint1VerificationSuiteResult {
  const reportDir = join(input.repoRoot, SPRINT1_VERIFICATION_OUTPUT_DIR);
  mkdirSync(reportDir, { recursive: true });
  const reportPath = input.reportPath ?? join(reportDir, SPRINT1_COMPLETION_REPORT_FILE_NAME);

  cleanupVerificationOwnedArtifacts(input.repoRoot, reportPath);

  const gitCommit = resolveRequiredGitCommit(input.repoRoot);
  const workingTreeDirty = isWorkingTreeDirty(input.repoRoot);
  const failures: VerificationIssue[] = [];
  const warnings: VerificationIssue[] = [];
  const runsRoot = join(input.repoRoot, SPRINT1_VERIFICATION_RUNS_DIR);

  let sameSeed: Sprint1CompletionReport["sameSeed"] | undefined;
  let differentSeed: Sprint1CompletionReport["differentSeed"] | undefined;
  let boundarySeeds: Sprint1CompletionReport["boundarySeeds"] | undefined;
  let yearProfiles: Sprint1CompletionReport["yearProfiles"] | undefined;
  let integratedScenario: Sprint1CompletionReport["integratedScenario"] | undefined;
  let identityAndCanonical: Sprint1CompletionReport["identityAndCanonical"] | undefined;
  let fixedSeven: Sprint1CompletionReport["fixedSeven"] | undefined;
  let performanceProfiles: Sprint1CompletionReport["performanceProfiles"] | undefined;
  let sprint0Regression: Sprint1CompletionReport["sprint0Regression"] | undefined;
  let check: CheckSection | undefined;

  try {
    const matrix = verifySeedAndYearMatrix({
      repoRoot: input.repoRoot,
      runsRoot,
    });
    sameSeed = matrix.sameSeed;
    differentSeed = matrix.differentSeed;
    boundarySeeds = matrix.boundarySeeds;
    yearProfiles = matrix.yearProfiles;
    failures.push(...matrix.failures);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_MATRIX_HARNESS",
      message,
      scope: "sameSeed",
    });
    sameSeed = buildBlockedSameSeed(message);
    differentSeed = buildBlockedDifferentSeed(message);
    boundarySeeds = buildBlockedBoundarySeeds(message);
    yearProfiles = buildBlockedYearProfiles(message);
  }

  try {
    const integrated = verifyIntegratedScenario({
      repoRoot: input.repoRoot,
      runsRoot,
    });
    integratedScenario = integrated.section;
    failures.push(...integrated.failures);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_INTEGRATED_HARNESS",
      message,
      scope: "integratedScenario",
    });
    integratedScenario = buildBlockedIntegrated(message);
  }

  try {
    const performance = verifySprint1Performance(input.repoRoot);
    performanceProfiles = performance.profiles;
    failures.push(...performance.failures);
    warnings.push(...performance.warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_PERFORMANCE_HARNESS",
      message,
      scope: "performance",
    });
    performanceProfiles = buildBlockedPerformance(message);
  }

  try {
    const identity = verifyIdentityAndCanonical(input.repoRoot);
    identityAndCanonical = identity.section;
    failures.push(...identity.failures);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_IDENTITY_HARNESS",
      message,
      scope: "identityAndCanonical",
    });
    identityAndCanonical = buildBlockedIdentity(message);
  }

  try {
    const collected = collectRunFixedSeven(runsRoot);
    const fixed = verifyFixedSevenArtifacts({
      absoluteRunDirectories: collected.dirs,
      refs: collected.refs,
    });
    fixedSeven = fixed.section;
    failures.push(...fixed.failures);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_FIXED7_HARNESS",
      message,
      scope: "fixedSeven",
    });
    fixedSeven = buildBlockedFixedSeven(message);
  }

  try {
    const npmCheck = runNpmCheck(input.repoRoot);
    failures.push(...npmCheck.failures);
    const wikiCheck = runWikiCheck(input.repoRoot);
    failures.push(...wikiCheck.failures);
    const diffCheck = runDiffCheck(input.repoRoot);
    failures.push(...diffCheck.failures);
    check = {
      npmCheck: npmCheck.result,
      wikiCheck: wikiCheck.result,
      diffCheck: diffCheck.result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_CHECK_HARNESS",
      message,
      scope: "check",
    });
    check = buildBlockedCheck(message);
  }

  try {
    const sprint0 = verifySprint0Regression(input.repoRoot);
    sprint0Regression = sprint0.section;
    failures.push(...sprint0.failures);
    warnings.push(...sprint0.warnings);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failures.push({
      code: "SPRINT1_SPRINT0_HARNESS",
      message,
      scope: "sprint0Regression",
    });
    sprint0Regression = buildBlockedSprint0(message);
  }

  assertGitCommitUnchanged(input.repoRoot, gitCommit);

  if (
    sameSeed === undefined ||
    differentSeed === undefined ||
    boundarySeeds === undefined ||
    yearProfiles === undefined ||
    integratedScenario === undefined ||
    identityAndCanonical === undefined ||
    fixedSeven === undefined ||
    performanceProfiles === undefined ||
    sprint0Regression === undefined ||
    check === undefined
  ) {
    throw new Error("sprint1 verification harness left a required report section undefined");
  }

  const report = buildSprint1CompletionReport({
    generatedAtUtc: new Date().toISOString(),
    gitCommit,
    workingTreeDirty,
    failures,
    warnings,
    sameSeed,
    differentSeed,
    boundarySeeds,
    yearProfiles,
    integratedScenario,
    identityAndCanonical,
    fixedSeven,
    performanceProfiles,
    sprint0Regression,
    check,
  });

  const written = writeCompletionReportAtomic(reportPath, report);
  return { report: written, reportPath };
}
