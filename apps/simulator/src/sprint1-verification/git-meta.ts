import { execFileSync } from "node:child_process";

/**
 * Resolve exact HEAD. Official Sprint1 verifier requires HEAD; null fallback is forbidden.
 */
export function resolveRequiredGitCommit(repoRoot: string): string {
  try {
    const output = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    }).trim();
    if (!/^[0-9a-f]{40}$/i.test(output)) {
      throw new Error(`git rev-parse HEAD returned unexpected value: ${output}`);
    }
    return output.toLowerCase();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to resolve git HEAD (harness failure): ${detail}`, { cause: error });
  }
}

/**
 * Working tree dirtiness including untracked (except ignored paths such as output/).
 * Dirty alone is not a functional failure during S01-009 acceptance.
 */
export function isWorkingTreeDirty(repoRoot: string): boolean {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 10_000,
    });
    return output.trim().length > 0;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to inspect git working tree: ${detail}`, { cause: error });
  }
}

/**
 * Confirm HEAD is unchanged since verification start.
 */
export function assertGitCommitUnchanged(repoRoot: string, expectedCommit: string): void {
  const current = resolveRequiredGitCommit(repoRoot);
  if (current !== expectedCommit) {
    throw new Error(
      `git HEAD changed during verification: expected ${expectedCommit}, got ${current}`,
    );
  }
}
