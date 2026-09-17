import path from "node:path";
import { parseControlFile } from "./parse-control.mjs";

/** @type {Record<string, { inboxMirror: string, inboxCanonical: string, activeMirror: string }>} */
export const LANE_CONTROL_FILES = {
  A: {
    inboxMirror: "CURSOR_INBOX.md",
    inboxCanonical: "CURSOR_A_INBOX.md",
    activeMirror: "CURSOR_ACTIVE_TASK.md",
  },
  B2: {
    inboxMirror: "CURSOR_B2_INBOX.md",
    inboxCanonical: "CURSOR_B2_INBOX.md",
    activeMirror: "CURSOR_B2_ACTIVE_TASK.md",
  },
};

/**
 * @param {string} lane
 * @param {string} auditDir
 */
export function laneControlPaths(lane, auditDir) {
  const key = lane.toUpperCase();
  const files = LANE_CONTROL_FILES[key];
  if (!files) {
    throw new Error(`Unknown lane: ${lane}`);
  }
  const handoffRoot = path.resolve(auditDir, "..");
  return {
    lane: key,
    handoffRoot,
    inboxMirrorPath: path.join(auditDir, files.inboxMirror),
    inboxCanonicalPath: path.join(handoffRoot, "control", files.inboxCanonical),
    activeMirrorPath: path.join(auditDir, files.activeMirror),
  };
}

/**
 * Merge GitHub canonical inbox with audit mirror. Missing canonical never blocks pickup.
 *
 * @param {string} lane
 * @param {string} auditDir
 * @returns {Promise<{ fields: Record<string, string>, source: string, inboxPathForPrompt: string }>}
 */
export async function readLaneInbox(lane, auditDir) {
  const paths = laneControlPaths(lane, auditDir);
  const [canonical, mirror] = await Promise.all([
    parseControlFile(paths.inboxCanonicalPath),
    parseControlFile(paths.inboxMirrorPath),
  ]);

  const canonicalState = canonical.state ?? "";
  const mirrorState = mirror.state ?? "";
  const canonicalKey = canonical["task-key"] ?? "";
  const mirrorKey = mirror["task-key"] ?? "";

  const canonicalAuthoritative =
    canonicalState.length > 0 &&
    (canonical["control-authority"] === "GitHub" ||
      canonicalState === "PREPARED" ||
      (canonicalKey.length > 0 && mirrorState !== "PREPARED"));

  if (canonicalAuthoritative) {
    return {
      fields: { ...mirror, ...canonical },
      source: "github-canonical",
      inboxPathForPrompt: paths.inboxCanonicalPath,
    };
  }

  if (mirrorState.length > 0 || mirrorKey.length > 0) {
    return {
      fields: { ...canonical, ...mirror },
      source: mirrorState.length > 0 ? "audit-mirror" : "canonical-fallback",
      inboxPathForPrompt: paths.inboxMirrorPath,
    };
  }

  if (canonicalState.length > 0 || canonicalKey.length > 0) {
    return {
      fields: canonical,
      source: "github-canonical-only",
      inboxPathForPrompt: paths.inboxCanonicalPath,
    };
  }

  return {
    fields: {},
    source: "empty",
    inboxPathForPrompt: paths.inboxMirrorPath,
  };
}

/**
 * Active lock remains on audit mirror (Cursor-owned execution fact).
 *
 * @param {string} lane
 * @param {string} auditDir
 */
export async function readLaneActive(lane, auditDir) {
  const paths = laneControlPaths(lane, auditDir);
  const fields = await parseControlFile(paths.activeMirrorPath);
  return { fields, activePath: paths.activeMirrorPath };
}
