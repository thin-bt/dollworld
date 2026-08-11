import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  completionReportToJsonFile,
  validateSprint1CompletionReport,
} from "./completion-report.js";
import type { Sprint1CompletionReport } from "./types.js";

/**
 * Remove any existing completion report so a previous overallPassed=true cannot linger.
 */
export function invalidateCompletionReport(reportPath: string): void {
  if (existsSync(reportPath)) {
    unlinkSync(reportPath);
  }
}

/**
 * Write completion report via temp file + fsync + atomic rename, then read-back validate.
 */
export function writeCompletionReportAtomic(
  reportPath: string,
  report: Sprint1CompletionReport,
): Sprint1CompletionReport {
  const directory = dirname(reportPath);
  mkdirSync(directory, { recursive: true });
  const tempPath = join(
    directory,
    `.tmp-${process.pid}-${String(Date.now())}-sprint1-completion-report.json`,
  );
  const payload = completionReportToJsonFile(report);
  const fd = openSync(tempPath, "w");
  try {
    writeSync(fd, payload, undefined, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  if (existsSync(reportPath)) {
    unlinkSync(reportPath);
  }
  renameSync(tempPath, reportPath);

  const readBack = readFileSync(reportPath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(readBack);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`sprint1 completion report read-back JSON parse failed: ${detail}`, {
      cause: error,
    });
  }
  const validated = validateSprint1CompletionReport(parsed);
  if (!validated.ok) {
    throw new Error(
      `sprint1 completion report read-back validation failed: ${JSON.stringify(validated.issues)}`,
    );
  }
  return validated.value;
}
