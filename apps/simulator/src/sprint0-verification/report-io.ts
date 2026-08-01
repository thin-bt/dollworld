import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { completionReportToJsonFile, type Sprint0CompletionReport } from "./completion-report.js";

/**
 * Remove any existing completion report so a previous overallPassed=true cannot linger.
 */
export function invalidateCompletionReport(reportPath: string): void {
  if (existsSync(reportPath)) {
    unlinkSync(reportPath);
  }
}

/**
 * Write completion report via temp file + fsync + atomic rename.
 */
export function writeCompletionReportAtomic(
  reportPath: string,
  report: Sprint0CompletionReport,
): void {
  const directory = dirname(reportPath);
  mkdirSync(directory, { recursive: true });
  const tempPath = join(
    directory,
    `.tmp-${process.pid}-${String(Date.now())}-sprint0-completion-report.json`,
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
}
