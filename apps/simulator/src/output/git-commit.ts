import { execFileSync } from "node:child_process";

/**
 * Best-effort git commit id. Never throws; returns null when unavailable.
 * No external git library — uses the system `git` binary when present.
 */
export function tryGetGitCommitId(cwd: string): string | null {
  try {
    const output = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 5_000,
    });
    const trimmed = output.trim();
    if (/^[0-9a-f]{40}$/i.test(trimmed) || /^[0-9a-f]{64}$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
    if (trimmed.length > 0) {
      return trimmed;
    }
    return null;
  } catch {
    return null;
  }
}
