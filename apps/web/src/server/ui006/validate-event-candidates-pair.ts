/**
 * eventCandidates exact pair/order validation (§13D / FIX-049).
 * EventId / simulationId / global sequence assignment stays with the canonical
 * Event Stream append layer; mock candidates are kept pre-allocation.
 */

import {
  BATTLE_FINISHED_EVENT_TYPE,
  BATTLE_STARTED_EVENT_TYPE,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import type { BattleResultSource, EventCandidateSource } from "./types.js";

export function validateEventCandidatesPair(
  candidates: readonly EventCandidateSource[],
): PureResult<readonly [EventCandidateSource, EventCandidateSource]> {
  if (!Array.isArray(candidates) || candidates.length !== 2) {
    return fail(`eventCandidates.length must be 2, got ${String(candidates?.length)}`);
  }
  const [first, second] = candidates;
  if (first === undefined || second === undefined) {
    return fail("eventCandidates entries missing");
  }
  if (first.eventType !== BATTLE_STARTED_EVENT_TYPE) {
    return fail(`eventCandidates[0] must be ${BATTLE_STARTED_EVENT_TYPE}`);
  }
  if (second.eventType !== BATTLE_FINISHED_EVENT_TYPE) {
    return fail(`eventCandidates[1] must be ${BATTLE_FINISHED_EVENT_TYPE}`);
  }
  return ok([first, second] as const);
}

/**
 * Cross-reference candidates to BattleResult for A/B, matchId, battleKind, battleSeed
 * and every currently overlapping field (§13D.5).
 */
export function crossRefEventCandidatesToResult(input: {
  candidates: readonly [EventCandidateSource, EventCandidateSource];
  battleResult: BattleResultSource;
}): PureResult<true> {
  const [started, finished] = input.candidates;
  const br = input.battleResult;

  for (const cand of [started, finished]) {
    const personIds = cand.entities?.personIds;
    if (
      personIds === undefined ||
      personIds.length !== 2 ||
      personIds[0] !== br.participantAId ||
      personIds[1] !== br.participantBId
    ) {
      return fail("eventCandidates entities.personIds must equal [A, B]");
    }
    if (cand.payload.participantAId !== br.participantAId) {
      return fail("candidate payload.participantAId mismatch");
    }
    if (cand.payload.participantBId !== br.participantBId) {
      return fail("candidate payload.participantBId mismatch");
    }
    if (cand.payload.matchId !== br.matchId) {
      return fail("candidate payload.matchId mismatch");
    }
    if (cand.payload.battleKind !== br.battleKind) {
      return fail("candidate payload.battleKind mismatch");
    }
  }

  const startedSeed = started.payload.battleSeed;
  const finishedSeed = finished.payload.battleSeed;
  const finalSeed = br.finalState.battleSeed;
  if (startedSeed !== finalSeed || finishedSeed !== finalSeed) {
    return fail("battleSeed mismatch across started/finished/finalState");
  }

  if (finished.payload.resultKind !== br.resultKind) {
    return fail("finished.resultKind mismatch");
  }
  if (finished.payload.endReason !== br.endReason) {
    return fail("finished.endReason mismatch");
  }
  if (finished.payload.winnerPersonId !== br.winnerPersonId) {
    return fail("finished.winnerPersonId mismatch");
  }
  if (finished.payload.loserPersonId !== br.loserPersonId) {
    return fail("finished.loserPersonId mismatch");
  }
  if (finished.payload.turnsExecuted !== br.turnsExecuted) {
    return fail("finished.turnsExecuted mismatch");
  }

  const hashes = started.payload.participantSnapshotHashes as
    { sideA?: string; sideB?: string } | undefined;
  const aHash = br.finalState.participantA as { sourceSnapshotHash?: string } | undefined;
  const bHash = br.finalState.participantB as { sourceSnapshotHash?: string } | undefined;
  if (hashes?.sideA !== aHash?.sourceSnapshotHash || hashes?.sideB !== bHash?.sourceSnapshotHash) {
    return fail("started participantSnapshotHashes.sideA|B mismatch finalState hashes");
  }

  return ok(true);
}
