import { access } from "node:fs/promises";
import path from "node:path";
import { readFile } from "node:fs/promises";

/**
 * @param {string} filePath
 * @returns {Promise<Record<string, string>>}
 */
export async function parseControlFile(filePath) {
  /** @type {Record<string, string>} */
  const fields = {};
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return fields;
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }
    const match = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }
    fields[match[1]] = match[2].trim();
  }
  return fields;
}

/**
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
async function exists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve Inbox instruction-path against audit/handoff/repo roots.
 * Inbox often publishes Drive-relative paths like:
 *   audit/current/<task-key>/gpt-to-cursor-instruction.txt
 * which live under `_handoff-artifacts/audit/...`.
 *
 * @param {Record<string, string>} inbox
 * @param {string} auditDir absolute path to `_handoff-artifacts/audit`
 * @returns {Promise<string | null>}
 */
export async function resolveInstructionPath(inbox, auditDir) {
  const handoffRoot = path.resolve(auditDir, "..");
  const repoRoot = path.resolve(auditDir, "../..");
  const taskKey = inbox["task-key"] ?? "";

  const explicit =
    inbox["instruction-path"] ??
    inbox["instruction_path"] ??
    inbox["Detail instruction"] ??
    inbox["detail-instruction"];

  /** @type {string[]} */
  const candidates = [];

  if (explicit && explicit.length > 0) {
    const normalized = explicit.replace(/\\/g, "/");
    if (path.isAbsolute(explicit)) {
      candidates.push(explicit);
    } else {
      candidates.push(path.resolve(auditDir, explicit));
      candidates.push(path.resolve(handoffRoot, explicit));
      candidates.push(path.resolve(repoRoot, explicit));
      // Common PM form: audit/current/<task>/gpt-to-cursor-instruction.txt
      if (normalized.startsWith("audit/")) {
        candidates.push(path.resolve(handoffRoot, normalized));
        candidates.push(
          path.resolve(auditDir, normalized.slice("audit/".length)),
        );
      }
      if (normalized.startsWith("current/")) {
        candidates.push(path.resolve(auditDir, normalized));
      }
    }
  }

  if (taskKey.length > 0) {
    candidates.push(
      path.join(handoffRoot, "tasks", taskKey, "instruction.md"),
    );
    candidates.push(
      path.join(auditDir, "current", taskKey, "gpt-to-cursor-instruction.txt"),
    );
  }

  const seen = new Set();
  for (const candidate of candidates) {
    const abs = path.resolve(candidate);
    if (seen.has(abs)) {
      continue;
    }
    seen.add(abs);
    if (await exists(abs)) {
      return abs;
    }
  }

  // Prefer the canonical task-key location in error messages when possible.
  if (taskKey.length > 0) {
    return path.join(
      auditDir,
      "current",
      taskKey,
      "gpt-to-cursor-instruction.txt",
    );
  }
  if (explicit && explicit.length > 0) {
    return path.isAbsolute(explicit)
      ? explicit
      : path.resolve(handoffRoot, explicit);
  }
  return null;
}
