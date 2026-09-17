import { writeFile } from "node:fs/promises";

function formatJst(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`;
}

/**
 * @param {object} input
 * @param {string} input.lane
 * @param {string} input.filePath
 * @param {string} input.status
 * @param {string} input.pollResult
 * @param {string} [input.lastInvokedTaskKey]
 * @param {string} [input.lastInvokedAt]
 * @param {string} [input.lastAgentRunId]
 * @param {string} [input.lastError]
 * @param {number} input.pid
 * @param {string} [input.phase]
 * @param {string} [input.activeTaskKey]
 * @param {number|string} [input.elapsedSeconds]
 * @param {boolean|string} [input.processAlive]
 * @param {number|string} [input.memoryRssMb]
 * @param {number|string} [input.childPid]
 * @param {boolean|string} [input.childObserved]
 * @param {string} [input.lastProgressAt]
 * @param {number|string} [input.progressAgeSeconds]
 * @param {string} [input.progressSource]
 */
export async function writeExecutorHeartbeat({
  lane,
  filePath,
  status,
  pollResult,
  lastInvokedTaskKey = "",
  lastInvokedAt = "",
  lastAgentRunId = "",
  lastError = "",
  pid,
  phase = "",
  activeTaskKey = "",
  elapsedSeconds = "",
  processAlive = "",
  memoryRssMb = "",
  childPid = "",
  childObserved = "",
  lastProgressAt = "",
  progressAgeSeconds = "",
  progressSource = "",
}) {
  const now = formatJst();
  const body = [
    `# Cursor ${lane} SDK executor heartbeat`,
    "executor: cursor-sdk-local",
    `status: ${status}`,
    "pollInterval: 5m",
    `lastPollAt: ${now}`,
    `lastPollResult: ${pollResult}`,
    `lastInvokedTaskKey: ${lastInvokedTaskKey}`,
    `lastInvokedAt: ${lastInvokedAt}`,
    `lastAgentRunId: ${lastAgentRunId}`,
    `lastError: ${lastError}`,
    `pid: ${pid}`,
    `phase: ${phase}`,
    `activeTaskKey: ${activeTaskKey}`,
    `elapsedSeconds: ${elapsedSeconds}`,
    `processAlive: ${processAlive}`,
    `memoryRssMb: ${memoryRssMb}`,
    `childPid: ${childPid}`,
    `childObserved: ${childObserved}`,
    `lastProgressAt: ${lastProgressAt}`,
    `progressAgeSeconds: ${progressAgeSeconds}`,
    `progressSource: ${progressSource}`,
    "note: File poll only unless PREPARED pickup. LLM invoked only on pickup (CURSOR-PICKUP-001).",
  ].join("\n");
  await writeFile(filePath, `${body}\n`, "utf8");
}
