/**
 * Build a consumed (IDLE) lane inbox after a terminal result.
 */

/**
 * @param {object} input
 * @param {string} input.lane A|B2
 * @param {string} input.taskKey
 * @param {string} input.terminal e.g. READY / FOO_READY
 * @param {string} input.updatedAt
 * @param {string} [input.resultPath]
 * @param {string} [input.commitSha]
 * @param {Record<string, string>} [input.previous]
 */
export function buildConsumedInboxMarkdown(input) {
  const {
    lane,
    taskKey,
    terminal,
    updatedAt,
    resultPath = `_handoff-artifacts/results/${taskKey}/result.md`,
    commitSha = "",
    previous = {},
  } = input;

  const title = lane === "B2" ? "# Cursor B2 Inbox" : "# Cursor A Inbox";
  const lines = [
    title,
    "state: IDLE",
    `lane: ${lane}`,
    "task-key: (none)",
    "mode: (none)",
    `updatedAt: ${updatedAt}`,
    `last-consumed-task-key: ${taskKey}`,
    `last-terminal: ${terminal}`,
    `last-result-path: ${resultPath}`,
    "control-authority: GitHub",
    `required-repository: ${previous["required-repository"] ?? previous["canonical-repository"] ?? "thin-bt/dollworld"}`,
    `required-branch: ${previous["required-branch"] ?? previous["canonical-branch"] ?? "master"}`,
  ];
  if (commitSha) {
    lines.push(`last-commit-sha: ${commitSha}`);
  }
  if (previous.sprint) {
    lines.push(`sprint: ${previous.sprint}`);
  }
  lines.push(
    "pickup-requirements:",
    "- fresh-read GitHub canonical instruction",
    "- claim ACTIVE before changes",
    "- publish terminal result to GitHub canonical result path",
    "",
  );
  return lines.join("\n");
}

/**
 * @param {Record<string, string>} active
 * @param {string} taskKey
 */
export function activeHasTerminalForTask(active, taskKey) {
  const completed =
    active.lastCompletedTask ??
    active["last-completed-task"] ??
    active["last-completed-task-key"] ??
    "";
  if (completed !== taskKey) {
    return false;
  }
  const state = active.state ?? "";
  if (state !== "IDLE" && state !== "READY" && state !== "COMPLETE") {
    return false;
  }
  const terminal = `${active.terminal ?? ""} ${active["last-terminal"] ?? ""} ${active["recovery-terminal"] ?? ""}`;
  return /\bREADY\b|\bCOMPLETE\b|\bFIX_REQUIRED\b|\bBLOCKED\b/.test(terminal);
}

/**
 * @param {Record<string, string>} active
 */
export function readActiveTerminal(active) {
  const candidates = [
    active["last-terminal"],
    active.lastTerminal,
    active["recovery-terminal"],
    active.terminal,
  ]
    .map((v) => String(v ?? "").trim())
    .filter((v) => v.length > 0);
  if (candidates.length === 0) {
    return "";
  }
  // Prefer the most specific terminal string.
  candidates.sort((a, b) => b.length - a.length);
  return candidates[0];
}
