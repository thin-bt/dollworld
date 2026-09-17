/**
 * @param {Record<string, string>} active
 * @param {number} staleMinutes
 */
export function isStaleActive(active, staleMinutes = 30) {
  const startedAt = active.startedAt ?? "";
  if (startedAt.length === 0) {
    return false;
  }
  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) {
    return false;
  }
  return Date.now() - started >= staleMinutes * 60_000;
}

/**
 * Active IDLE after READY/COMPLETE for the same Inbox task-key must not re-invoke.
 * That is WRONG_TASK_REINVOKE / stale PREPARED re-verify, not a fresh claim.
 *
 * @param {Record<string, string>} inbox
 * @param {Record<string, string>} active
 */
export function isAlreadyCompleteSameTask(inbox, active) {
  const inboxKey = inbox["task-key"] ?? "";
  if (inboxKey.length === 0) {
    return false;
  }
  const activeState = active.state ?? "";
  if (
    activeState !== "IDLE" &&
    activeState !== "COMPLETE" &&
    activeState !== "READY"
  ) {
    return false;
  }
  const completedKey =
    active.lastCompletedTask ??
    active["task-key"] ??
    active["last-task-key"] ??
    "";
  if (completedKey !== inboxKey) {
    return false;
  }
  const terminal = `${active.terminal ?? ""} ${active["recovery-terminal"] ?? ""}`;
  return /\bREADY\b|\bCOMPLETE\b|\bFIX_REQUIRED\b|\bBLOCKED\b/.test(terminal);
}

/**
 * @param {Record<string, string>} inbox
 * @param {Record<string, string>} active
 * @param {{ staleMinutes?: number }} [opts]
 * @returns {{ invoke: boolean, reason: string }}
 */
export function evaluatePickup(inbox, active, opts = {}) {
  const staleMinutes = opts.staleMinutes ?? 30;
  const inboxState = inbox.state ?? "";
  const inboxKey = inbox["task-key"] ?? "";
  const activeState = active.state ?? "";
  const activeKey = active["task-key"] ?? "";

  const sameTaskActive =
    activeState === "ACTIVE" &&
    activeKey.length > 0 &&
    inboxKey.length > 0 &&
    activeKey === inboxKey;

  const recoveryRequested =
    inbox["runtime-status"]?.includes("RECOVERY") ||
    inbox["recovery-request"] !== undefined;

  // CURSOR-RECOVERY-001: stale/interrupted same-task ACTIVE must resume, not noop forever.
  if (
    sameTaskActive &&
    (inboxState === "PREPARED" ||
      recoveryRequested ||
      isStaleActive(active, staleMinutes))
  ) {
    return { invoke: true, reason: "RECOVERY_SAME_TASK_ACTIVE" };
  }

  if (inboxState !== "PREPARED") {
    return { invoke: false, reason: `INBOX_${inboxState || "UNKNOWN"}` };
  }

  if (inboxKey.length === 0) {
    return { invoke: false, reason: "INBOX_TASK_KEY_MISSING" };
  }

  // Stale PREPARED pointing at an already-terminal same task must not loop.
  if (isAlreadyCompleteSameTask(inbox, active)) {
    return { invoke: false, reason: "ALREADY_COMPLETE_SAME_TASK" };
  }

  if (activeState.length === 0 || activeState === "IDLE") {
    return { invoke: true, reason: "ACTIVE_IDLE" };
  }

  if (activeKey.length > 0 && activeKey !== inboxKey) {
    return { invoke: true, reason: "ACTIVE_DIFFERENT_TASK" };
  }

  if (
    (activeState === "COMPLETE" || activeState === "READY") &&
    activeKey !== inboxKey
  ) {
    return { invoke: true, reason: "ACTIVE_TERMINAL_DIFFERENT_TASK" };
  }

  return { invoke: false, reason: "PICKUP_CONDITION_NOT_MET" };
}

/**
 * @param {{ reason: string }} pickup
 * @param {Record<string, string>} active
 */
export function isRecoveryPickup(pickup, active) {
  if (!pickup.reason.startsWith("RECOVERY_")) {
    return false;
  }
  return (active.state ?? "") === "ACTIVE";
}

/**
 * @param {string | undefined} lastInvokedTaskKey
 * @param {string | undefined} lastInvokedAt
 * @param {string} inboxKey
 * @param {number} cooldownMinutes
 * @returns {boolean}
 */
export function isInCooldown(
  lastInvokedTaskKey,
  lastInvokedAt,
  inboxKey,
  cooldownMinutes,
) {
  if (lastInvokedTaskKey !== inboxKey || !lastInvokedAt) {
    return false;
  }
  const invokedAt = Date.parse(lastInvokedAt);
  if (Number.isNaN(invokedAt)) {
    return false;
  }
  const elapsedMs = Date.now() - invokedAt;
  return elapsedMs < cooldownMinutes * 60_000;
}
