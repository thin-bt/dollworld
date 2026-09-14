import { describe, expect, it } from "vitest";
import type { StoredBattleResultRecord, TournamentBracketDefinition } from "@shared-world/simulation-core";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";

function bracket(): TournamentBracketDefinition {
  return {
    schemaVersion: "0.1.0",
    tournamentId: "tournament_test" as never,
    participantListHash: "a".repeat(64),
    orderedPersonIds: ["person_a", "person_b", "person_c"] as never,
    scheduleLifecycleIdentityHash: "b".repeat(64),
    formatKind: "round_robin",
    roundRobinPairs: [
      { pairIndex: 0, personIdA: "person_a" as never, personIdB: "person_b" as never },
      { pairIndex: 1, personIdA: "person_a" as never, personIdB: "person_c" as never },
      { pairIndex: 2, personIdA: "person_b" as never, personIdB: "person_c" as never },
    ],
    groupMemberships: [],
    groupRoundRobinPairs: [],
    knockoutSlots: [],
    policyIdentities: {
      formatSelection: { policyVersion: "test", configVersion: "test" },
      knockoutSeedBye: { policyVersion: "test", configVersion: "test" },
      standingsTieBreak: { policyVersion: "test", configVersion: "test" },
    },
    bracketDefinitionHash: "c".repeat(64),
  } as TournamentBracketDefinition;
}

function record(input: {
  matchId: string;
  participantAId: string;
  participantBId: string;
  winnerPersonId: string;
  loserPersonId: string;
}): StoredBattleResultRecord {
  return {
    tournamentId: "tournament_test",
    matchId: input.matchId,
    participantAId: input.participantAId,
    participantBId: input.participantBId,
    winnerPersonId: input.winnerPersonId,
    loserPersonId: input.loserPersonId,
    resultKind: "completed",
  } as unknown as StoredBattleResultRecord;
}

describe("projectRoundRobinProgress", () => {
  it("projects all bracket pairs, factual records, history and next pair without inventing tie-break order", () => {
    const projected = projectRoundRobinProgress({
      bracketDefinition: bracket(),
      storedRecords: [
        record({
          matchId: "match_1",
          participantAId: "person_a",
          participantBId: "person_b",
          winnerPersonId: "person_a",
          loserPersonId: "person_b",
        }),
        record({
          matchId: "match_2",
          participantAId: "person_a",
          participantBId: "person_c",
          winnerPersonId: "person_c",
          loserPersonId: "person_a",
        }),
      ],
    });

    expect(projected.participantIds).toEqual(["person_a", "person_b", "person_c"]);
    expect(projected.matchesTotal).toBe(3);
    expect(projected.matchesCompleted).toBe(2);
    expect(projected.nextPairIndex).toBe(2);
    expect(projected.history.map((row) => row.matchId)).toEqual(["match_1", "match_2", null]);
    expect(projected.matrix).toEqual([
      {
        personId: "person_a",
        wins: 1,
        losses: 1,
        played: 2,
        cells: [
          { opponentPersonId: "person_b", pairIndex: 0, matchId: "match_1", outcome: "win" },
          { opponentPersonId: "person_c", pairIndex: 1, matchId: "match_2", outcome: "loss" },
        ],
      },
      {
        personId: "person_b",
        wins: 0,
        losses: 1,
        played: 1,
        cells: [
          { opponentPersonId: "person_a", pairIndex: 0, matchId: "match_1", outcome: "loss" },
          { opponentPersonId: "person_c", pairIndex: 2, matchId: null, outcome: "pending" },
        ],
      },
      {
        personId: "person_c",
        wins: 1,
        losses: 0,
        played: 1,
        cells: [
          { opponentPersonId: "person_a", pairIndex: 1, matchId: "match_2", outcome: "win" },
          { opponentPersonId: "person_b", pairIndex: 2, matchId: null, outcome: "pending" },
        ],
      },
    ]);
  });
});
