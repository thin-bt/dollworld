import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SPRINT1_COMPLETION_REPORT_FILE_NAME } from "./constants.js";
import { invalidateCompletionReport } from "./report-io.js";
import { runSprint1Verification } from "./run-verification.js";

export type VerifySprint1CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * CLI entry for `npm run verify:sprint1`.
 * Official Sprint1 verifier never creates, moves, or deletes repository tags.
 * Does not recursively invoke verify:sprint1.
 */
export function runVerifySprint1Cli(repoRoot: string): VerifySprint1CliResult {
  const reportDir = join(repoRoot, "output", "sprint1-verification");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, SPRINT1_COMPLETION_REPORT_FILE_NAME);
  invalidateCompletionReport(reportPath);

  try {
    const result = runSprint1Verification({
      repoRoot,
      reportPath,
    });
    const lines = [
      "sprint1 verification completed",
      `overallPassed=${String(result.report.overallPassed)}`,
      `functionalFailureCount=${String(result.report.functionalFailureCount)}`,
      `warningCount=${String(result.report.warningCount)}`,
      `reportPath=${result.reportPath}`,
      `gitCommit=${result.report.gitCommit}`,
      `workingTreeDirty=${String(result.report.workingTreeDirty)}`,
      `sameSeed=${result.report.sameSeed.status}`,
      `differentSeed=${result.report.differentSeed.status}`,
      `integratedScenario=${result.report.integratedScenario.status}`,
      `identityAndCanonical=${result.report.identityAndCanonical.status}`,
      `fixedSeven=${result.report.fixedSeven.status}`,
      `sprint0Regression=${result.report.sprint0Regression.status}`,
      `npmCheck=${String(result.report.check.npmCheck.passed)}`,
      `wikiCheck=${String(result.report.check.wikiCheck.passed)}`,
      `diffCheck=${String(result.report.check.diffCheck.passed)}`,
    ];
    for (const boundary of result.report.boundarySeeds) {
      lines.push(`boundarySeed=${String(boundary.seed)} status=${boundary.status}`);
    }
    for (const profile of result.report.yearProfiles) {
      lines.push(`yearProfile=${String(profile.years)} status=${profile.status}`);
    }
    for (const profile of result.report.performanceProfiles) {
      lines.push(
        `performance=targetLiving${String(profile.targetLivingPopulation)} status=${profile.status} years=${String(profile.years)} elapsedSeconds=${String(profile.elapsedSeconds)} living=${String(profile.actualLivingPopulation)} totalPersons=${String(profile.totalPersonCount)} events=${String(profile.eventCount)}`,
      );
    }
    if (result.report.warnings.length > 0) {
      lines.push("warnings:");
      for (const warning of result.report.warnings) {
        lines.push(`- [${warning.code}] ${warning.scope}: ${warning.message}`);
      }
    }
    if (result.report.failures.length > 0) {
      lines.push("failures:");
      for (const failure of result.report.failures) {
        lines.push(`- [${failure.code}] ${failure.scope}: ${failure.message}`);
      }
    }
    return {
      exitCode: result.report.overallPassed ? 0 : 1,
      stdout: `${lines.join("\n")}\n`,
      stderr: "",
    };
  } catch (error) {
    invalidateCompletionReport(reportPath);
    const message = error instanceof Error ? error.message : String(error);
    return {
      exitCode: 1,
      stdout: "",
      stderr: `sprint1 verification failed: ${message}\n`,
    };
  }
}
