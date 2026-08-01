import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SPRINT0_COMPLETION_REPORT_FILE_NAME } from "./constants.js";
import { invalidateCompletionReport } from "./report-io.js";
import { runSprint0Verification } from "./run-verification.js";

export type VerifySprint0CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

/**
 * CLI entry for `npm run verify:sprint0`.
 *
 * Runs the shared Sprint 0 verification suite in-process (not Vitest).
 * Writes the completion report under `output/sprint0-verification/` (gitignored).
 * Intermediate run directories use a temporary directory and are removed afterward.
 *
 * Previous completion reports are invalidated at start so a stale overallPassed=true
 * cannot survive a failed run.
 */
export function runVerifySprint0Cli(repoRoot: string): VerifySprint0CliResult {
  const reportDir = join(repoRoot, "output", "sprint0-verification");
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, SPRINT0_COMPLETION_REPORT_FILE_NAME);
  invalidateCompletionReport(reportPath);

  const workRoot = mkdtempSync(join(tmpdir(), "dollworld-sprint0-verify-"));
  try {
    const result = runSprint0Verification({
      repoRoot,
      workRoot,
      reportPath,
    });
    const lines = [
      "sprint0 verification completed",
      `overallPassed=${String(result.report.overallPassed)}`,
      `functionalFailureCount=${String(result.report.functionalFailureCount)}`,
      `warningCount=${String(result.report.warningCount)}`,
      `reportPath=${result.reportPath}`,
      `sameSeed=${result.report.sameSeedComparison.status}`,
      `sameSeedRuns=${result.report.sameSeedComparison.runs
        .map(
          (run) =>
            `${run.run}[inv=${String(run.invariantsPassed)},val=${String(run.validationPassed)},term=${String(run.terminationPassed)},files=${String(run.sevenFilesPassed)}]`,
        )
        .join(" ")}`,
      `differentSeed=${result.report.differentSeedComparison.status}`,
      `boundarySeedVerification=${result.report.boundarySeedDeterminism.status}`,
      `invariants=${result.report.invariants.status}`,
      `commitId=${result.report.commitId ?? "unknown"}`,
      `workingTreeDirty=${String(result.report.workingTreeDirty)}`,
    ];
    for (const boundary of result.report.boundarySeedDeterminism.results) {
      lines.push(
        `boundarySeed=${String(boundary.seed)} determinism=${boundary.determinismStatus} runs=${boundary.runs
          .map(
            (run) =>
              `${run.run}[inv=${String(run.invariantsPassed)},val=${String(run.validationPassed)},term=${String(run.terminationPassed)},files=${String(run.sevenFilesPassed)}]`,
          )
          .join(" ")}`,
      );
    }
    for (const profile of result.report.yearProfiles) {
      lines.push(
        `years=${String(profile.years)} weeks=${String(profile.weeksExecuted)} csvRows=${String(profile.csvRows)} avgMsPerYear=${String(profile.averageMillisecondsPerYear)} ok=${String(profile.invariantsPassed && profile.sevenFilesPassed)}`,
      );
    }
    for (const profile of result.report.populationProfiles) {
      lines.push(
        `population=${String(profile.population)} seconds=${String(profile.actualSeconds)} avgMsPerYear=${String(profile.averageMillisecondsPerYear)} maxRssKb=${String(profile.maxRssKilobytes)} exceeded=${String(profile.exceeded)} measureOnly=${String(profile.measureOnly)}`,
      );
    }
    if (result.report.performanceWarnings.length > 0) {
      lines.push("performanceWarnings:");
      for (const warning of result.report.performanceWarnings) {
        lines.push(`- ${warning}`);
      }
    }
    if (result.report.notPerformed.length > 0) {
      lines.push("notPerformed:");
      for (const item of result.report.notPerformed) {
        lines.push(`- ${item}`);
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
      stderr: `sprint0 verification failed: ${message}\n`,
    };
  } finally {
    rmSync(workRoot, { recursive: true, force: true });
  }
}
