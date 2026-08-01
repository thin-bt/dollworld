import { execFileSync } from "node:child_process";

/**
 * Best-effort working tree dirtiness for report provenance.
 * Returns null when git is unavailable; tracked-file changes only.
 */
export function tryGetWorkingTreeDirty(cwd: string): boolean | null {
  try {
    const output = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
    return output.trim().length > 0;
  } catch {
    return null;
  }
}
