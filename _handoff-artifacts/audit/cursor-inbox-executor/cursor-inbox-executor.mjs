import { access, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { writeExecutorHeartbeat } from "./lib/heartbeat.mjs";
import { parseControlFile } from "./lib/parse-control.mjs";
import { readLaneActive, readLaneInbox, laneControlPaths } from "./lib/lane-control.mjs";
import { fetchGitHubFileText, parseControlText } from "./lib/github-remote.mjs";
import { selectAuthoritativeInbox } from "./lib/authoritative-inbox.mjs";
import { ensureInstructionAvailable } from "./lib/ensure-instruction.mjs";
import { evaluatePickup, isInCooldown, isRecoveryPickup } from "./lib/pickup.mjs";
import { publishTerminalToGitHub } from "./lib/publish-terminal-github.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const auditDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(auditDir, "../..");
const execFileAsync = promisify(execFile);

/** @type {Record<string, { lane: string, inbox: string, active: string, heartbeat: string, buildPrompt: (ctx: object) => string }>} */
const LANES = {
  A: {
    lane: "A",
    inbox: "CURSOR_INBOX.md",
    active: "CURSOR_ACTIVE_TASK.md",
    heartbeat: "CURSOR_A_EXECUTOR_HEARTBEAT.md",
    buildPrompt: ({ inboxPath, activePath, instructionPath, taskKey, pickupReason }) => {
      const recovery =
        pickupReason === "RECOVERY_SAME_TASK_ACTIVE"
          ? [
              "",
              "RECOVERY (CURSOR-RECOVERY-001): Active already holds this same task-key.",
              "Do NOT noop because Active is ACTIVE. Reconcile instruction, worktree, evidence, and result state.",
              "If safely resumable, resume and finish. If outputs exist, verify and close Active to IDLE.",
              "If unsafe, keep blocked with exact material condition; do not clear lock silently.",
            ]
          : [];
      return [
        "Cursor A autonomous pickup (SDK executor).",
        `Inbox: ${inboxPath}`,
        `Active: ${activePath}`,
        `task-key: ${taskKey}`,
        `pickup: ${pickupReason}`,
        `Canonical instruction: ${instructionPath}`,
        "",
        "Execute now without waiting for user confirmation:",
        "1) Read Inbox and Active.",
        "2) If Inbox is PREPARED and pickup is valid, read the canonical instruction file and EXECUTE the task.",
        "3) Write ACTIVE lock before implementation per CURSOR-START-001.",
        "4) Complete required checks/evidence and write final result to _handoff-artifacts/results/<task-key>/result.md; return Active to IDLE when done.",
        "5) Never read or rewrite Cursor B2 control files.",
        "6) If authority/blocker prevents work, STOP with exact blocker; do not invent work.",
        "7) Executor will consume GitHub Inbox to IDLE and push result.md after your terminal; still write the local result file first.",
        ...recovery,
      ].join("\n");
    },
  },
  B2: {
    lane: "B2",
    inbox: "CURSOR_B2_INBOX.md",
    active: "CURSOR_B2_ACTIVE_TASK.md",
    heartbeat: "CURSOR_B2_EXECUTOR_HEARTBEAT.md",
    buildPrompt: ({ inboxPath, activePath, instructionPath, taskKey, pickupReason }) => {
      const recovery =
        pickupReason === "RECOVERY_SAME_TASK_ACTIVE"
          ? [
              "",
              "RECOVERY (CURSOR-RECOVERY-001): Active already holds this same task-key.",
              "Do NOT noop because Active is ACTIVE. Reconcile instruction, worktree, evidence, and result state.",
              "If safely resumable, resume and finish. If outputs exist, verify and close Active to IDLE.",
              "If unsafe, keep blocked with exact material condition; do not clear lock silently.",
            ]
          : [];
      return [
        "Cursor B2 autonomous pickup (SDK executor).",
        `Inbox: ${inboxPath}`,
        `Active: ${activePath}`,
        `task-key: ${taskKey}`,
        `pickup: ${pickupReason}`,
        `Canonical instruction: ${instructionPath}`,
        "",
        "Execute now without waiting for user confirmation:",
        "1) Read CURSOR_B2_INBOX.md and CURSOR_B2_ACTIVE_TASK.md first.",
        "2) If PREPARED with a valid task, read the canonical instruction and EXECUTE as Cursor B2.",
        "3) Write ACTIVE lock before implementation.",
        "4) Never read or rewrite Cursor A control files (CURSOR_INBOX.md / CURSOR_ACTIVE_TASK.md).",
        "5) Apply CURSOR-B2-001 bounded verification recovery. Do not continue a same-case retry ladder after its allowed bounded retry is exhausted; finalize the exact verification outcome instead.",
        "6) If SETUP_PENDING / IDLE / NO_SAFE_PARALLEL_TASK / no executable work, report briefly only.",
        "7) Write terminal result to _handoff-artifacts/results/<task-key>/result.md; executor will consume GitHub Inbox to IDLE and push it.",
        ...recovery,
      ].join("\n");
    },
  },
};

/**
 * @param {Date} [date]
 */
function formatJst(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}+09:00`;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ lanes: string[], once: boolean, cooldownMinutes: number, invokeTimeoutMinutes: number }} */
  const opts = {
    lanes: ["A", "B2"],
    once: true,
    cooldownMinutes: 30,
    invokeTimeoutMinutes: 45,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--lane" && argv[i + 1]) {
      opts.lanes = [argv[i + 1].toUpperCase()];
      i += 1;
    } else if (arg === "--lanes" && argv[i + 1]) {
      opts.lanes = argv[i + 1].split(",").map((v) => v.trim().toUpperCase());
      i += 1;
    } else if (arg === "--daemon") {
      opts.once = false;
    } else if (arg === "--cooldown-minutes" && argv[i + 1]) {
      opts.cooldownMinutes = Number(argv[i + 1]);
      i += 1;
    } else if (arg === "--invoke-timeout-minutes" && argv[i + 1]) {
      opts.invokeTimeoutMinutes = Number(argv[i + 1]);
      i += 1;
    }
  }
  return opts;
}

/**
 * @param {string} filePath
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getTaskProgressInfo(instructionPath) {
  try {
    const taskDir = path.dirname(instructionPath);
    const candidates = [
      path.join(taskDir, "wip-status.txt"),
      path.join(taskDir, "cursor-report.txt"),
      path.join(taskDir, "cursor-result.txt"),
    ];
    let newest = null;
    for (const candidate of candidates) {
      try {
        const st = await stat(candidate);
        if (!newest || st.mtimeMs > newest.mtimeMs) newest = { file: candidate, mtimeMs: st.mtimeMs };
      } catch {}
    }
    if (!newest) return { lastProgressAt: "", progressAgeSeconds: "", progressSource: "" };
    return {
      lastProgressAt: formatJst(new Date(newest.mtimeMs)),
      progressAgeSeconds: Math.max(0, Math.floor((Date.now() - newest.mtimeMs) / 1000)),
      progressSource: path.basename(newest.file),
    };
  } catch {
    return { lastProgressAt: "", progressAgeSeconds: "", progressSource: "" };
  }
}

async function getDirectChildPid(parentPid) {
  if (process.platform !== "win32") return "";
  try {
    const command = `$p=Get-CimInstance Win32_Process -Filter "ParentProcessId=${parentPid}" | Select-Object -First 1 -ExpandProperty ProcessId; if ($p) { Write-Output $p }`;
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", command], { windowsHide: true, timeout: 5000 });
    const pid = String(stdout ?? "").trim();
    return /^\d+$/.test(pid) ? pid : "";
  } catch {
    return "";
  }
}

/**
 * @param {string} laneKey
 * @param {number} cooldownMinutes
 * @param {number} invokeTimeoutMinutes
 */
async function pollLane(laneKey, cooldownMinutes, invokeTimeoutMinutes) {
  const config = LANES[laneKey];
  if (!config) {
    throw new Error(`Unknown lane: ${laneKey}`);
  }

  const heartbeatPath = path.join(auditDir, config.heartbeat);
  const controlPaths = laneControlPaths(laneKey, auditDir);

  // Always attempt GitHub canonical inbox first. Stale local PREPARED must not
  // shadow a newer remote PREPARED/task-key (SPRINT2-CONTROL-PLANE-PICKUP-REPAIR).
  const localInboxRead = await readLaneInbox(laneKey, auditDir);
  const remoteControlPath =
    controlPaths.lane === "A" ? "CURSOR_A_INBOX.md" : "CURSOR_B2_INBOX.md";
  const remoteText = await fetchGitHubFileText({
    repoPath: `_handoff-artifacts/control/${remoteControlPath}`,
  });
  const remoteFields = remoteText ? parseControlText(remoteText) : null;
  let inboxRead = selectAuthoritativeInbox({
    localRead: localInboxRead,
    remoteFields,
    canonicalPath: controlPaths.inboxCanonicalPath,
  });
  if (inboxRead.source === "github-remote" && remoteText) {
    try {
      await mkdir(path.dirname(controlPaths.inboxCanonicalPath), {
        recursive: true,
      });
      await writeFile(controlPaths.inboxCanonicalPath, remoteText, "utf8");
    } catch {
      // Mirror write is best-effort; remote fields already drive pickup.
    }
  }

  const inbox = inboxRead.fields;
  const inboxPath = inboxRead.inboxPathForPrompt;
  const activeRead = await readLaneActive(laneKey, auditDir);
  const active = activeRead.fields;
  const activePath = activeRead.activePath;
  const prior = await parseControlFile(heartbeatPath);

  const pickup = evaluatePickup(inbox, active);
  const inboxKey = inbox["task-key"] ?? "";

  if (!pickup.invoke) {
    await writeExecutorHeartbeat({
      lane: config.lane,
      filePath: heartbeatPath,
      status: "IDLE",
      pollResult: `NOOP_${pickup.reason}`,
      lastInvokedTaskKey: prior.lastInvokedTaskKey ?? "",
      lastInvokedAt: prior.lastInvokedAt ?? "",
      lastAgentRunId: prior.lastAgentRunId ?? "",
      lastError: "",
      pid: process.pid,
    });
    return {
      lane: laneKey,
      action: "noop",
      reason: pickup.reason,
    };
  }

  if (
    !isRecoveryPickup(pickup, active) &&
    isInCooldown(
      prior.lastInvokedTaskKey,
      prior.lastInvokedAt,
      inboxKey,
      cooldownMinutes,
    )
  ) {
    await writeExecutorHeartbeat({
      lane: config.lane,
      filePath: heartbeatPath,
      status: "IDLE",
      pollResult: "NOOP_COOLDOWN",
      lastInvokedTaskKey: prior.lastInvokedTaskKey ?? inboxKey,
      lastInvokedAt: prior.lastInvokedAt ?? "",
      lastAgentRunId: prior.lastAgentRunId ?? "",
      lastError: "",
      pid: process.pid,
    });
    return {
      lane: laneKey,
      action: "noop",
      reason: "COOLDOWN",
    };
  }

  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    await writeExecutorHeartbeat({
      lane: config.lane,
      filePath: heartbeatPath,
      status: "UNAVAILABLE",
      pollResult: "SKIPPED_NO_API_KEY",
      lastInvokedTaskKey: prior.lastInvokedTaskKey ?? "",
      lastInvokedAt: prior.lastInvokedAt ?? "",
      lastAgentRunId: prior.lastAgentRunId ?? "",
      lastError: "CURSOR_API_KEY is not set",
      pid: process.pid,
    });
    return {
      lane: laneKey,
      action: "skipped",
      reason: "NO_API_KEY",
    };
  }

  let ensured = await ensureInstructionAvailable({ inbox, auditDir });
  let instructionPath = ensured.instructionPath;
  if (!instructionPath || !(await fileExists(instructionPath))) {
    try {
      const { attemptLocalMirrorRecovery, createLocalSyncFetch } = await import(
        "../cursor-publication/lib/local-mirror-recovery.mjs"
      );
      const recovery = await attemptLocalMirrorRecovery({
        lane: config.lane,
        auditDir,
        fetchDriveInstruction: createLocalSyncFetch(auditDir),
      });
      if (recovery.recovered) {
        ensured = await ensureInstructionAvailable({ inbox, auditDir });
        instructionPath = ensured.instructionPath;
      }
    } catch {
      // recovery module optional at bootstrap; fail closed below
    }
  }

  if (!instructionPath || !(await fileExists(instructionPath))) {
    await writeExecutorHeartbeat({
      lane: config.lane,
      filePath: heartbeatPath,
      status: "BLOCKED",
      pollResult: "INSTRUCTION_MISSING",
      // Do not stamp lastInvokedAt — this is not an Agent invoke and must not
      // start cooldown that blocks pickup after path repair.
      lastInvokedTaskKey: prior.lastInvokedTaskKey ?? "",
      lastInvokedAt: prior.lastInvokedAt ?? "",
      lastAgentRunId: prior.lastAgentRunId ?? "",
      lastError: `Instruction not found: ${instructionPath ?? "(unresolved)"}`,
      pid: process.pid,
    });
    await writeExecutorAlert(auditDir, {
      severity: "HIGH",
      code: "INSTRUCTION_MISSING",
      taskKey: inboxKey,
      detail: `Lane ${config.lane}: PREPARED but canonical instruction missing at ${instructionPath ?? "(unresolved)"} (ensure source=${ensured.source}). Pickup cannot start.`,
      action:
        "Ensure GitHub has _handoff-artifacts/tasks/<task-key>/instruction.md (or instruction-path). Local/Drive prepopulation is no longer required when GitHub is reachable.",
    });
    return {
      lane: laneKey,
      action: "blocked",
      reason: "INSTRUCTION_MISSING",
    };
  }

  const invokedAt = formatJst();
  const invokingResult = pickup.reason.startsWith("RECOVERY_")
    ? "RECOVERY_INVOKING"
    : "INVOKING";
  await writeExecutorHeartbeat({
    lane: config.lane,
    filePath: heartbeatPath,
    status: invokingResult,
    pollResult: invokingResult,
    lastInvokedTaskKey: inboxKey,
    lastInvokedAt: invokedAt,
    lastAgentRunId: "",
    lastError: "",
    pid: process.pid,
  });

  const prompt = config.buildPrompt({
    inboxPath,
    activePath,
    instructionPath,
    taskKey: inboxKey,
    pickupReason: pickup.reason,
  });

  const isRecovery = pickup.reason.startsWith("RECOVERY_");
  let agentRunId = "";
  let pollResult = isRecovery ? "RECOVERY_INVOKED" : "INVOKED";
  let lastError = "";

  let invokeHeartbeatTimer = null;
  const invokeStartedMs = Date.now();
  try {
    const { Agent } = await import("@cursor/sdk");
    const timeoutMs = Math.max(1, invokeTimeoutMinutes) * 60_000;

    // Keep authoritative SDK heartbeat fresh while Agent.prompt is still running.
    // A single pre-invoke INVO​KING stamp cannot distinguish a healthy long run
    // from a hung executor. This timer is liveness evidence only; it never changes
    // pickup/assignment authority.
    invokeHeartbeatTimer = setInterval(() => {
      const mem = process.memoryUsage();
      void Promise.all([getTaskProgressInfo(instructionPath), getDirectChildPid(process.pid)]).then(([progress, childPid]) =>
        writeExecutorHeartbeat({
          lane: config.lane,
          filePath: heartbeatPath,
          status: invokingResult,
          pollResult: invokingResult,
          lastInvokedTaskKey: inboxKey,
          lastInvokedAt: invokedAt,
          lastAgentRunId: agentRunId,
          lastError: "",
          pid: process.pid,
          phase: "AGENT_PROMPT_RUNNING",
          activeTaskKey: inboxKey,
          elapsedSeconds: Math.floor((Date.now() - invokeStartedMs) / 1000),
          processAlive: true,
          memoryRssMb: Math.round(mem.rss / 1024 / 1024),
          childPid,
          childObserved: Boolean(childPid),
          ...progress,
        }),
      ).catch(() => {});
    }, 60_000);

    const result = await Promise.race([
      Agent.prompt(prompt, {
        apiKey,
        model: { id: "composer-2.5" },
        local: { cwd: repoRoot },
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`AGENT_TIMEOUT after ${invokeTimeoutMinutes}m`));
        }, timeoutMs);
      }),
    ]);
    agentRunId = result.id ?? "";
    if (result.status === "error") {
      pollResult = isRecovery ? "RECOVERY_INVOKED_RUN_ERROR" : "INVOKED_RUN_ERROR";
      lastError = `Agent run error: ${agentRunId}`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("AGENT_TIMEOUT")) {
      pollResult = isRecovery ? "RECOVERY_INVOKED_TIMEOUT" : "INVOKED_TIMEOUT";
      lastError = msg;
    } else {
      pollResult = isRecovery ? "RECOVERY_INVOKED_STARTUP_ERROR" : "INVOKED_STARTUP_ERROR";
      lastError = msg;
    }
  } finally {
    if (invokeHeartbeatTimer) clearInterval(invokeHeartbeatTimer);
  }

  const terminalOk =
    pollResult === "INVOKED" || pollResult === "RECOVERY_INVOKED";

  /** @type {object | null} */
  let githubPublish = null;
  if (terminalOk) {
    // Agent may finish writing result/Active slightly after prompt resolves.
    for (let i = 0; i < 8; i += 1) {
      githubPublish = await publishTerminalToGitHub({
        lane: config.lane,
        taskKey: inboxKey,
        auditDir,
        repoRoot,
        updatedAt: formatJst(),
      });
      if (githubPublish.ok || githubPublish.reason === "NO_RESULT_FILE") {
        if (githubPublish.ok) break;
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      break;
    }
    if (githubPublish && !githubPublish.ok) {
      lastError = [
        lastError,
        `githubPublish:${githubPublish.reason}${githubPublish.error ? `:${githubPublish.error}` : ""}`,
      ]
        .filter(Boolean)
        .join(" | ");
    }
  }

  await writeExecutorHeartbeat({
    lane: config.lane,
    filePath: heartbeatPath,
    status: terminalOk ? "IDLE" : "ERROR",
    pollResult:
      terminalOk && githubPublish?.pushed
        ? `${pollResult}_GITHUB_PUBLISHED`
        : terminalOk && githubPublish?.ok
          ? `${pollResult}_GITHUB_${githubPublish.reason}`
          : pollResult,
    lastInvokedTaskKey: inboxKey,
    lastInvokedAt: invokedAt,
    lastAgentRunId: agentRunId,
    lastError,
    pid: process.pid,
  });

  return {
    lane: laneKey,
    action: isRecovery ? "recovery" : "invoked",
    taskKey: inboxKey,
    agentRunId,
    pollResult,
    error: lastError,
    githubPublish,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  // Poll lanes in parallel so a hung A invoke cannot starve B2 PREPARED pickup
  // (CURSOR_TICK_LOOP_STALL / sequential A→B2 starvation).
  const settled = await Promise.allSettled(
    opts.lanes.map((laneKey) =>
      pollLane(laneKey, opts.cooldownMinutes, opts.invokeTimeoutMinutes),
    ),
  );

  /** @type {object[]} */
  const results = [];
  for (let i = 0; i < settled.length; i += 1) {
    const item = settled[i];
    if (item.status === "fulfilled") {
      results.push(item.value);
    } else {
      results.push({
        lane: opts.lanes[i],
        action: "error",
        reason: "LANE_POLL_REJECTED",
        error: item.reason instanceof Error ? item.reason.message : String(item.reason),
      });
    }
  }

  console.log(
    JSON.stringify({
      at: formatJst(),
      mode: opts.once ? "once" : "daemon-tick",
      results,
    }),
  );

  const blockedMissing = results.some((r) => r.reason === "INSTRUCTION_MISSING");
  if (!blockedMissing) {
    const anyInvoke = results.some(
      (r) => r.action === "invoked" || r.action === "recovery",
    );
    if (anyInvoke || results.every((r) => r.action === "noop")) {
      // Clear alert only when no lane is blocked on missing instruction.
      // Keep alert if any lane still reports INSTRUCTION_MISSING.
      await clearExecutorAlert(auditDir);
    }
  }

  const timedOut = results.some(
    (r) =>
      r.pollResult === "INVOKED_TIMEOUT" ||
      r.pollResult === "RECOVERY_INVOKED_TIMEOUT",
  );
  if (timedOut) {
    // Force exit so a hung Agent.prompt cannot block the daemon forever.
    process.exit(3);
  }
}

await main();
