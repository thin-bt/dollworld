import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DEFAULT_GITHUB_REPO = "thin-bt/dollworld";
export const DEFAULT_GITHUB_BRANCH = "master";

/**
 * Best-effort fetch of a repo file from GitHub. Never throws; returns null on any failure.
 *
 * @param {object} input
 * @param {string} input.repoPath repo-relative path using forward slashes
 * @param {string} [input.repository]
 * @param {string} [input.ref]
 */
export async function fetchGitHubFileText(input) {
  const repository = input.repository ?? DEFAULT_GITHUB_REPO;
  const ref = input.ref ?? DEFAULT_GITHUB_BRANCH;
  const repoPath = input.repoPath.replace(/\\/g, "/");

  try {
    const { stdout } = await execFileAsync(
      "gh",
      ["api", `repos/${repository}/contents/${repoPath}?ref=${ref}`, "--jq", ".content"],
      { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const b64 = String(stdout ?? "").trim();
    if (b64.length === 0) {
      return null;
    }
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["show", `${ref}:${repoPath}`],
        { timeout: 10_000, maxBuffer: 2 * 1024 * 1024 },
      );
      const text = String(stdout ?? "");
      return text.length > 0 ? text : null;
    } catch {
      return null;
    }
  }
}

/**
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseControlText(text) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (match) {
      fields[match[1]] = match[2].trim();
    }
  }
  return fields;
}
