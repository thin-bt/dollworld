/**
 * Prefer live GitHub remote inbox over stale local PREPARED/task-key.
 * Remote is authoritative whenever it has a non-empty state.
 * Local/Drive mirrors remain fallback only when GitHub fetch is unavailable/invalid.
 */

/**
 * @param {Record<string, string> | null | undefined} fields
 */
export function isValidRemoteInbox(fields) {
  if (!fields) {
    return false;
  }
  return (fields.state ?? "").trim().length > 0;
}

/**
 * @param {object} input
 * @param {{ fields: Record<string, string>, source: string, inboxPathForPrompt: string }} input.localRead
 * @param {Record<string, string> | null | undefined} input.remoteFields
 * @param {string} input.canonicalPath path used in Agent prompts when remote wins
 */
export function selectAuthoritativeInbox(input) {
  const { localRead, remoteFields, canonicalPath } = input;
  if (isValidRemoteInbox(remoteFields)) {
    return {
      // Remote keys overwrite stale local PREPARED/task-key; local-only keys may remain as hints.
      fields: { ...localRead.fields, ...remoteFields },
      source: "github-remote",
      inboxPathForPrompt: canonicalPath,
    };
  }
  return localRead;
}