/**
 * mock-result dataIdentity helpers (§10G / PAGE-014 / ACC-166).
 */

import { fail, ok, type PureResult } from "./result.js";

const SUFFIX_RE = /^(0|[1-9][0-9]*)$/;

export function formatMockResultDataIdentity(resultUiRevision: number): PureResult<string> {
  if (!Number.isSafeInteger(resultUiRevision) || resultUiRevision < 0) {
    return fail("resultUiRevision must be non-negative safe integer", "INVALID_REQUEST");
  }
  return ok(`mock-result:${resultUiRevision}`);
}

export function parseMockResultDataIdentity(dataIdentity: string): PureResult<number> {
  const prefix = "mock-result:";
  if (!dataIdentity.startsWith(prefix)) {
    return fail("dataIdentity must start with mock-result:", "INVALID_REQUEST");
  }
  const suffix = dataIdentity.slice(prefix.length);
  if (!SUFFIX_RE.test(suffix)) {
    return fail("dataIdentity suffix lexical invalid", "INVALID_REQUEST");
  }
  const n = Number(suffix);
  if (!Number.isSafeInteger(n) || n < 0) {
    return fail("dataIdentity suffix not non-negative safe int", "INVALID_REQUEST");
  }
  return ok(n);
}

/**
 * Envelope uiRevision vs data.resultUiRevision — equality NOT required.
 */
export function projectBattleLogRevisions(input: {
  sessionUiRevision: number;
  resultUiRevision: number;
}): PureResult<{ sessionUiRevision: number; resultUiRevision: number }> {
  if (input.resultUiRevision > input.sessionUiRevision) {
    return fail("resultUiRevision must be <= session uiRevision");
  }
  if (input.resultUiRevision < 0 || input.sessionUiRevision < 0) {
    return fail("revisions must be non-negative");
  }
  return ok({
    sessionUiRevision: input.sessionUiRevision,
    resultUiRevision: input.resultUiRevision,
  });
}
