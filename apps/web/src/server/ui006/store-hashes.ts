/**
 * §13A hash helpers for MockBattle store integrity (FIX-033 / FIX-036).
 * Hash provider is injected (UI-002 Node Sha256Provider); simulation RNG unused.
 */

import { toCanonicalJson, type Sha256Provider } from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";

export function computeReplaySnapshotHash(
  replaySnapshotWithoutHash: unknown,
  provider: Sha256Provider,
): string {
  return provider.hashUtf8(toCanonicalJson(replaySnapshotWithoutHash));
}

export function computeLatestRecordHash(
  input: {
    resultUiRevision: number;
    battleResult: unknown;
    eventCandidates: unknown;
    replaySnapshot: unknown;
  },
  provider: Sha256Provider,
): string {
  return provider.hashUtf8(
    toCanonicalJson({
      resultUiRevision: input.resultUiRevision,
      battleResult: input.battleResult,
      eventCandidates: input.eventCandidates,
      replaySnapshot: input.replaySnapshot,
    }),
  );
}

export function verifyReplaySnapshotHash(input: {
  replaySnapshotWithoutHash: unknown;
  expectedHash: string;
  provider: Sha256Provider;
}): PureResult<true> {
  const actual = computeReplaySnapshotHash(input.replaySnapshotWithoutHash, input.provider);
  if (actual !== input.expectedHash) {
    return fail("replaySnapshotHash mismatch");
  }
  return ok(true);
}

export function verifyLatestRecordHash(input: {
  resultUiRevision: number;
  battleResult: unknown;
  eventCandidates: unknown;
  replaySnapshot: unknown;
  expectedHash: string;
  provider: Sha256Provider;
}): PureResult<true> {
  const actual = computeLatestRecordHash(
    {
      resultUiRevision: input.resultUiRevision,
      battleResult: input.battleResult,
      eventCandidates: input.eventCandidates,
      replaySnapshot: input.replaySnapshot,
    },
    input.provider,
  );
  if (actual !== input.expectedHash) {
    return fail("latestRecordHash mismatch");
  }
  return ok(true);
}
