import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";

function formatJst(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`;
}

/**
 * Loud human-visible alert so PREPARED stalls are not silent.
 * File: _handoff-artifacts/audit/CURSOR_EXECUTOR_ALERT.md
 *
 * @param {string} auditDir
 * @param {object} input
 * @param {string} input.severity
 * @param {string} input.code
 * @param {string} input.detail
 * @param {string} [input.taskKey]
 * @param {string} [input.action]
 */
export async function writeExecutorAlert(
  auditDir,
  { severity, code, detail, taskKey = "", action = "" },
) {
  const filePath = path.join(auditDir, "CURSOR_EXECUTOR_ALERT.md");
  const now = formatJst();
  const body = [
    "# Cursor SDK executor ALERT",
    `# 人が気づく用 — heartbeat の深い所だけでなく、まずこのファイルを見てください`,
    `status: ALERT`,
    `severity: ${severity}`,
    `code: ${code}`,
    `detectedAt: ${now}`,
    `lane: ${taskKey ? "(see task-key)" : ""}`,
    `task-key: ${taskKey}`,
    `detail: ${detail}`,
    `action: ${action}`,
    "watch: CURSOR_EXECUTOR_ALERT.md + CURSOR_A_EXECUTOR_HEARTBEAT.md + CURSOR_B2_EXECUTOR_HEARTBEAT.md + CURSOR_EXECUTOR_DAEMON_HEARTBEAT.md",
  ].join("\n");
  await writeFile(filePath, `${body}\n`, "utf8");
  console.error(`EXECUTOR_ALERT ${severity} ${code} ${detail}`);
}

/**
 * @param {string} auditDir
 */
export async function clearExecutorAlert(auditDir) {
  const filePath = path.join(auditDir, "CURSOR_EXECUTOR_ALERT.md");
  try {
    await unlink(filePath);
  } catch {
    // absent is fine
  }
}
