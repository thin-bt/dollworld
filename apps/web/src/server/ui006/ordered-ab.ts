/**
 * Ordered participant A/B projection (§13F / FIX-080).
 * A/B is an ordered pair; swapping is a different request, never normalized.
 */

import { fail, ok, type PureResult } from "./result.js";
import type { OrderedParticipantPair } from "./types.js";

export function projectOrderedParticipants(
  participantAId: string,
  participantBId: string,
): PureResult<OrderedParticipantPair> {
  if (participantAId === participantBId) {
    return fail("participantAId and participantBId must differ", "INVALID_REQUEST", [
      "/participantAId",
      "/participantBId",
    ]);
  }
  return ok({
    participantAId,
    participantBId,
    sideA: participantAId,
    sideB: participantBId,
  });
}

/**
 * Cross-check A/B order across result / snapshot / eventCandidates.
 */
export function validateAbOrderAcrossArtifacts(input: {
  participantAId: string;
  participantBId: string;
  battleResultParticipantAId: string;
  battleResultParticipantBId: string;
  replaySnapshotParticipantAId: string;
  replaySnapshotParticipantBId: string;
  eventCandidatePersonIds: readonly string[];
}): PureResult<{ actorSideOf: (personId: string) => "sideA" | "sideB" | null }> {
  const pair = projectOrderedParticipants(input.participantAId, input.participantBId);
  if (!pair.ok) {
    return pair;
  }
  if (
    input.battleResultParticipantAId !== input.participantAId ||
    input.battleResultParticipantBId !== input.participantBId
  ) {
    return fail("BattleResult A/B order mismatch");
  }
  if (
    input.replaySnapshotParticipantAId !== input.participantAId ||
    input.replaySnapshotParticipantBId !== input.participantBId
  ) {
    return fail("ReplaySnapshot A/B order mismatch");
  }
  if (
    input.eventCandidatePersonIds.length !== 2 ||
    input.eventCandidatePersonIds[0] !== input.participantAId ||
    input.eventCandidatePersonIds[1] !== input.participantBId
  ) {
    return fail("eventCandidates entities.personIds must be [A, B] in order");
  }
  return ok({
    actorSideOf: (personId: string) => {
      if (personId === input.participantAId) {
        return "sideA";
      }
      if (personId === input.participantBId) {
        return "sideB";
      }
      return null;
    },
  });
}

/** FIX-080: swapped A/B is a different ordered pair / fingerprint. */
export function orderedPairsEqual(a: OrderedParticipantPair, b: OrderedParticipantPair): boolean {
  return a.participantAId === b.participantAId && a.participantBId === b.participantBId;
}
