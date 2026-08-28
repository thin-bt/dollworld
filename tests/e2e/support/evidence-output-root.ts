import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Explicit override for manual/audit runs that need repo-local or custom evidence roots. */
export const EVIDENCE_OUTPUT_ROOT_ENV = "DOLLWORLD_EVIDENCE_OUTPUT_ROOT";

/** Repo-relative prefix used by Sprint 1.5 E2E evidence specs. */
export const REPO_LOCAL_EVIDENCE_PREFIX = "_handoff-artifacts/audit/current";

const MODULE_DIR = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = resolve(MODULE_DIR, "../../..");

function normalizeRepoRelativePath(repoLocalRelativePath: string): string {
  return repoLocalRelativePath.replace(/\\/g, "/");
}

function taskSuffixFromRepoLocalPath(normalized: string): string {
  const prefixed = `${REPO_LOCAL_EVIDENCE_PREFIX}/`;
  if (normalized.startsWith(prefixed)) {
    return normalized.slice(prefixed.length);
  }
  if (normalized === REPO_LOCAL_EVIDENCE_PREFIX) {
    return "";
  }
  return normalized;
}

function defaultExternalEvidenceRoot(): string {
  return join(tmpdir(), "dollworld-e2e-evidence");
}

export function resolveEvidenceOutputRoot(): string {
  const explicit = process.env[EVIDENCE_OUTPUT_ROOT_ENV]?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return resolve(explicit);
  }
  return defaultExternalEvidenceRoot();
}

/**
 * Maps a repo-local evidence path to the effective runtime output directory.
 * Default automated verification writes under the OS temp evidence root.
 * Set `DOLLWORLD_EVIDENCE_OUTPUT_ROOT` to the repository root for repo-local audit runs.
 */
export function resolveE2eEvidenceDir(repoLocalRelativePath: string): string {
  const normalized = normalizeRepoRelativePath(repoLocalRelativePath);
  const outputRoot = resolveEvidenceOutputRoot();

  if (resolve(outputRoot) === resolve(REPO_ROOT)) {
    return join(REPO_ROOT, normalized);
  }

  return join(outputRoot, taskSuffixFromRepoLocalPath(normalized));
}

export function isRepoLocalEvidenceOutputEnabled(): boolean {
  const explicit = process.env[EVIDENCE_OUTPUT_ROOT_ENV]?.trim();
  if (explicit === undefined || explicit.length === 0) {
    return false;
  }
  const resolved = resolve(isAbsolute(explicit) ? explicit : join(REPO_ROOT, explicit));
  const repoRoot = resolve(REPO_ROOT);
  return resolved === repoRoot || resolved.startsWith(join(repoRoot, "_handoff-artifacts"));
}

export function repoRootForEvidenceTests(): string {
  return REPO_ROOT;
}
