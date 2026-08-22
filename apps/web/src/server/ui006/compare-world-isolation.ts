/**
 * Before/after canonical-world isolation comparison (§13G/§13H).
 * Compares supplied snapshots only; it never runs battles.
 */

import { toCanonicalJson } from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";

export const ISOLATION_COMPARE_KEYS = [
  "worldState",
  "worldRngState",
  "matchIdGeneratorState",
  "eventAllocationState",
  "eventStream",
  "processorRuntimeStates",
  "battleResultWeekState",
  "battleResults",
] as const;

export type IsolationSnapshot = Partial<Record<(typeof ISOLATION_COMPARE_KEYS)[number], unknown>>;

export type IsolationCompareResult = { unchanged: true } | { unchanged: false; path: string };

export function compareCanonicalWorldIsolation(
  before: IsolationSnapshot,
  after: IsolationSnapshot,
): PureResult<IsolationCompareResult> {
  for (const key of ISOLATION_COMPARE_KEYS) {
    const hasBefore = Object.prototype.hasOwnProperty.call(before, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(after, key);
    if (hasBefore !== hasAfter) {
      return ok({ unchanged: false, path: key });
    }
    if (!hasBefore) {
      continue;
    }
    if (toCanonicalJson(before[key]) !== toCanonicalJson(after[key])) {
      return ok({ unchanged: false, path: key });
    }
  }
  return ok({ unchanged: true });
}

export function assertWorldUnchanged(
  before: IsolationSnapshot,
  after: IsolationSnapshot,
): PureResult<true> {
  const compared = compareCanonicalWorldIsolation(before, after);
  if (!compared.ok) {
    return compared;
  }
  if (!compared.value.unchanged) {
    return fail(`canonical world isolation broken at ${compared.value.path}`);
  }
  return ok(true);
}

/** Extract the isolation-comparable projection from a Sprint1RunSession runtime state. */
export function projectIsolationSnapshot(runtimeState: unknown): IsolationSnapshot {
  if (typeof runtimeState !== "object" || runtimeState === null) {
    return {};
  }
  const row = runtimeState as Record<string, unknown>;
  const out: IsolationSnapshot = {};
  for (const key of ISOLATION_COMPARE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      out[key] = row[key];
    }
  }
  return out;
}
