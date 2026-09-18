import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { resolveInstructionPath } from "./parse-control.mjs";
import { fetchGitHubFileText } from "./github-remote.mjs";

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
 * Map inbox fields to a GitHub repo-relative instruction path.
 *
 * @param {Record<string, string>} inbox
 * @returns {string | null}
 */
export function githubInstructionRepoPath(inbox) {
  const taskKey = (inbox["task-key"] ?? "").trim();
  const explicit =
    inbox["instruction-path"] ??
    inbox["instruction_path"] ??
    inbox["canonical-instruction-path"] ??
    "";
  const normalized = String(explicit).replace(/\\/g, "/").trim();

  if (normalized.length > 0) {
    if (normalized.startsWith("_handoff-artifacts/")) {
      return normalized;
    }
    if (normalized.startsWith("tasks/") && taskKey.length > 0) {
      return `_handoff-artifacts/${normalized}`;
    }
    if (path.posix.basename(normalized) === "instruction.md" && normalized.includes("/tasks/")) {
      const idx = normalized.indexOf("tasks/");
      return `_handoff-artifacts/${normalized.slice(idx)}`;
    }
  }

  if (taskKey.length > 0 && taskKey !== "(none)") {
    return `_handoff-artifacts/tasks/${taskKey}/instruction.md`;
  }
  return null;
}

/**
 * Prefer an existing local instruction; otherwise fetch from GitHub and materialize.
 *
 * @param {object} input
 * @param {Record<string, string>} input.inbox
 * @param {string} input.auditDir
 * @param {(args: { repoPath: string, repository?: string, ref?: string }) => Promise<string | null>} [input.fetchText]
 * @returns {Promise<{ instructionPath: string | null, source: string }>}
 */
export async function ensureInstructionAvailable(input) {
  const {
    inbox,
    auditDir,
    fetchText = fetchGitHubFileText,
  } = input;
  const handoffRoot = path.resolve(auditDir, "..");

  const localPath = await resolveInstructionPath(inbox, auditDir);
  if (localPath && (await fileExists(localPath))) {
    return { instructionPath: localPath, source: "local" };
  }

  const repoPath = githubInstructionRepoPath(inbox);
  if (!repoPath) {
    return { instructionPath: localPath, source: "missing" };
  }

  const repository =
    inbox["required-repository"] ??
    inbox["canonical-repository"] ??
    undefined;
  const ref =
    inbox["required-branch"] ??
    inbox["canonical-branch"] ??
    undefined;

  const text = await fetchText({
    repoPath,
    ...(repository ? { repository } : {}),
    ...(ref ? { ref } : {}),
  });
  if (!text || text.trim().length === 0) {
    return { instructionPath: localPath, source: "missing" };
  }

  const taskKey = (inbox["task-key"] ?? "").trim();
  /** @type {string} */
  let dest;
  if (taskKey.length > 0 && taskKey !== "(none)") {
    dest = path.join(handoffRoot, "tasks", taskKey, "instruction.md");
  } else if (inbox["instruction-path"]) {
    const rel = String(inbox["instruction-path"]).replace(/\\/g, "/");
    dest = rel.startsWith("_handoff-artifacts/")
      ? path.join(path.resolve(auditDir, "../.."), rel)
      : path.join(handoffRoot, rel);
  } else {
    dest = path.join(handoffRoot, repoPath.replace(/^_handoff-artifacts\//, ""));
  }

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, text, "utf8");
  return { instructionPath: dest, source: "github-materialized" };
}
