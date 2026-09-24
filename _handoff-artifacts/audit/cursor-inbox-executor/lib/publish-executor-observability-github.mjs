import { access, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { laneControlPaths } from "./lane-control.mjs";

const execFileAsync = promisify(execFile);

/**
 * GitHub-readable executor observability (diagnostic; not Inbox authority).
 * Role1 / PM may treat these as fresh Active + heartbeat evidence.
 */
export const EXECUTOR_OBSERVABILITY_FILES = {
  A: {
    activeCanonical: "CURSOR_A_ACTIVE_TASK.md",
    heartbeatCanonical: "CURSOR_A_EXECUTOR_HEARTBEAT.md",
    activeMirror: "CURSOR_ACTIVE_TASK.md",
    heartbeatMirror: "CURSOR_A_EXECUTOR_HEARTBEAT.md",
  },
  B2: {
    activeCanonical: "CURSOR_B2_ACTIVE_TASK.md",
    heartbeatCanonical: "CURSOR_B2_EXECUTOR_HEARTBEAT.md",
    activeMirror: "CURSOR_B2_ACTIVE_TASK.md",
    heartbeatMirror: "CURSOR_B2_EXECUTOR_HEARTBEAT.md",
  },
};

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

/**
 * @param {string[]} args
 * @param {string} cwd
 */
async function git(args, cwd) {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd,
    timeout: 120_000,
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  });
  return { stdout: String(stdout ?? ""), stderr: String(stderr ?? "") };
}

/**
 * @param {string} lane
 * @param {string} auditDir
 */
export function executorObservabilityPaths(lane, auditDir) {
  const key = lane.toUpperCase() === "B2" ? "B2" : "A";
  const files = EXECUTOR_OBSERVABILITY_FILES[key];
  const paths = laneControlPaths(key, auditDir);
  const controlDir = path.join(paths.handoffRoot, "control");
  return {
    lane: key,
    controlDir,
    activeMirrorPath: path.join(auditDir, files.activeMirror),
    heartbeatMirrorPath: path.join(auditDir, files.heartbeatMirror),
    activeCanonicalPath: path.join(controlDir, files.activeCanonical),
    heartbeatCanonicalPath: path.join(controlDir, files.heartbeatCanonical),
    activeCanonicalRel: `_handoff-artifacts/control/${files.activeCanonical}`,
    heartbeatCanonicalRel: `_handoff-artifacts/control/${files.heartbeatCanonical}`,
  };
}

/**
 * Copy audit Active + heartbeat into local control/ (GitHub path shape).
 * Does not push.
 *
 * @param {object} input
 * @param {string} input.lane
 * @param {string} input.auditDir
 */
export async function mirrorExecutorObservabilityLocal(input) {
  const { lane, auditDir } = input;
  const p = executorObservabilityPaths(lane, auditDir);
  await mkdir(p.controlDir, { recursive: true });

  /** @type {string[]} */
  const mirrored = [];
  if (await fileExists(p.activeMirrorPath)) {
    await copyFile(p.activeMirrorPath, p.activeCanonicalPath);
    mirrored.push(p.activeCanonicalRel);
  }
  if (await fileExists(p.heartbeatMirrorPath)) {
    await copyFile(p.heartbeatMirrorPath, p.heartbeatCanonicalPath);
    mirrored.push(p.heartbeatCanonicalRel);
  }
  return { ok: true, mirrored, paths: p };
}

/**
 * Push Active + heartbeat snapshots to origin/master under control/.
 * Uses a throwaway worktree; cleans up with fs.rm + `git worktree prune`
 * (no `git worktree remove` / shell rm).
 *
 * @param {object} input
 * @param {string} input.lane
 * @param {string} input.auditDir
 * @param {string} input.repoRoot
 * @param {string} [input.reason]
 * @param {boolean} [input.dryRun]
 * @param {(args: string[], cwd: string) => Promise<{ stdout: string, stderr: string }>} [input.gitExec]
 */
export async function publishExecutorObservabilityToGitHub(input) {
  const {
    lane,
    auditDir,
    repoRoot,
    reason = "executor-state",
    dryRun = false,
    gitExec = git,
  } = input;

  const local = await mirrorExecutorObservabilityLocal({ lane, auditDir });
  const p = local.paths;

  if (!(await fileExists(p.activeCanonicalPath)) && !(await fileExists(p.heartbeatCanonicalPath))) {
    return { ok: false, reason: "NO_OBSERVABILITY_FILES", pushed: false };
  }

  if (dryRun) {
    return {
      ok: true,
      reason: "DRY_RUN",
      pushed: false,
      files: local.mirrored,
    };
  }

  const tmp = await mkdtemp(path.join(os.tmpdir(), "dollworld-exec-obs-"));
  try {
    await gitExec(["fetch", "origin", "master"], repoRoot);
    await gitExec(["worktree", "add", "--detach", tmp, "origin/master"], repoRoot);

    /** @type {string[]} */
    const toAdd = [];
    if (await fileExists(p.activeCanonicalPath)) {
      const dest = path.join(tmp, p.activeCanonicalRel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, await readFile(p.activeCanonicalPath, "utf8"), "utf8");
      toAdd.push(p.activeCanonicalRel);
    }
    if (await fileExists(p.heartbeatCanonicalPath)) {
      const dest = path.join(tmp, p.heartbeatCanonicalRel);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, await readFile(p.heartbeatCanonicalPath, "utf8"), "utf8");
      toAdd.push(p.heartbeatCanonicalRel);
    }

    if (toAdd.length === 0) {
      return { ok: false, reason: "NO_OBSERVABILITY_FILES", pushed: false };
    }

    await gitExec(["add", "--", ...toAdd], tmp);
    const status = await gitExec(["status", "--porcelain"], tmp);
    if (!status.stdout.trim()) {
      return { ok: true, reason: "ALREADY_PUBLISHED", pushed: false, files: toAdd };
    }

    const laneKey = p.lane;
    const msg = `control: publish ${laneKey} executor observability (${reason})`;
    await gitExec(
      ["-c", "user.email=cursor-executor@local", "-c", "user.name=cursor-inbox-executor", "commit", "-m", msg],
      tmp,
    );
    await gitExec(["push", "origin", "HEAD:master"], tmp);
    const rev = await gitExec(["rev-parse", "HEAD"], tmp);

    return {
      ok: true,
      reason: "PUBLISHED",
      pushed: true,
      commitSha: rev.stdout.trim(),
      files: toAdd,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: "PUBLISH_FAILED", pushed: false, error: message };
  } finally {
    try {
      await rm(tmp, { recursive: true, force: true });
    } catch {
      // ignore
    }
    try {
      await gitExec(["worktree", "prune"], repoRoot);
    } catch {
      // ignore
    }
  }
}
