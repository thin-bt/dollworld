import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Sprint0CompletionReport } from "../sprint0-verification/completion-report.js";
import { SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION } from "../sprint0-verification/constants.js";
import { runVerifySprint0Command } from "./command-gates.js";
import {
  SPRINT0_COMPLETION_REPORT_RELATIVE,
  SPRINT0_PERFORMANCE_WARNING_CODE,
} from "./constants.js";
import type { Sprint0RegressionSection, VerificationIssue } from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reuse Sprint0 completion-report wire shape without redefining performanceWarnings.
 */
export function readAndValidateSprint0CompletionReport(
  reportPath: string,
): { ok: true; report: Sprint0CompletionReport } | { ok: false; message: string } {
  if (!existsSync(reportPath)) {
    return { ok: false, message: `missing Sprint0 completion report at ${reportPath}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(reportPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Sprint0 report JSON parse failed: ${detail}` };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, message: "Sprint0 report is not an object" };
  }
  if (parsed["schemaVersion"] !== SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION) {
    return {
      ok: false,
      message: `unexpected Sprint0 schemaVersion: ${String(parsed["schemaVersion"])}`,
    };
  }
  if (typeof parsed["overallPassed"] !== "boolean") {
    return { ok: false, message: "Sprint0 report missing overallPassed" };
  }
  if (
    typeof parsed["functionalFailureCount"] !== "number" ||
    !Number.isSafeInteger(parsed["functionalFailureCount"])
  ) {
    return { ok: false, message: "Sprint0 report missing functionalFailureCount" };
  }
  if (typeof parsed["warningCount"] !== "number" || !Number.isSafeInteger(parsed["warningCount"])) {
    return { ok: false, message: "Sprint0 report missing warningCount" };
  }
  if (!Array.isArray(parsed["performanceWarnings"])) {
    return { ok: false, message: "Sprint0 report missing performanceWarnings array" };
  }
  if (!parsed["performanceWarnings"].every((entry) => typeof entry === "string")) {
    return { ok: false, message: "Sprint0 performanceWarnings must be string[]" };
  }
  if (parsed["warningCount"] !== parsed["performanceWarnings"].length) {
    return {
      ok: false,
      message: `Sprint0 warningCount (${String(parsed["warningCount"])}) !== performanceWarnings.length (${String(parsed["performanceWarnings"].length)})`,
    };
  }
  return { ok: true, report: parsed as unknown as Sprint0CompletionReport };
}

export type Sprint0RegressionResult = {
  section: Sprint0RegressionSection;
  failures: VerificationIssue[];
  warnings: VerificationIssue[];
};

export function verifySprint0Regression(repoRoot: string): Sprint0RegressionResult {
  const failures: VerificationIssue[] = [];
  const warnings: VerificationIssue[] = [];
  const command = runVerifySprint0Command(repoRoot);
  failures.push(...command.failures);

  const reportPath = join(repoRoot, SPRINT0_COMPLETION_REPORT_RELATIVE);
  const read = readAndValidateSprint0CompletionReport(reportPath);
  if (!read.ok) {
    failures.push({
      code: "SPRINT1_SPRINT0_REPORT_INVALID",
      message: read.message,
      scope: "sprint0Regression",
    });
    return {
      section: {
        status: "failed",
        exitCode: command.result.exitCode,
        overallPassed: null,
        functionalFailureCount: null,
        warningCount: null,
        performanceWarnings: [],
        detail: read.message,
      },
      failures,
      warnings,
    };
  }

  const report = read.report;
  if (!report.overallPassed || report.functionalFailureCount !== 0) {
    failures.push({
      code: "SPRINT1_SPRINT0_FUNCTIONAL",
      message: `Sprint0 overallPassed=${String(report.overallPassed)} functionalFailureCount=${String(report.functionalFailureCount)}`,
      scope: "sprint0Regression",
    });
  }

  for (const message of report.performanceWarnings) {
    warnings.push({
      code: SPRINT0_PERFORMANCE_WARNING_CODE,
      message,
      scope: "sprint0Regression/performance",
    });
  }

  return {
    section: {
      status: failures.length === 0 ? "passed" : "failed",
      exitCode: command.result.exitCode,
      overallPassed: report.overallPassed,
      functionalFailureCount: report.functionalFailureCount,
      warningCount: report.warningCount,
      performanceWarnings: [...report.performanceWarnings],
      detail:
        failures.length === 0
          ? "Sprint0 regression passed (warnings imported if any)"
          : failures.map((item) => item.message).join("; "),
    },
    failures,
    warnings,
  };
}
