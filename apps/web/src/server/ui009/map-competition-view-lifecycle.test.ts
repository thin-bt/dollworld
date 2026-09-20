import { describe, expect, it } from "vitest";
import { mapCompetitionProgressView } from "./map-competition-view.js";
import {
  COMPETITION_STORE_SCHEMA_VERSION,
  type CompetitionPersistedState,
  type CompetitionSessionStore,
} from "./competition-store.js";

function falseFinishedRoundRobinStore(): CompetitionSessionStore {
  const state = {
    schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
    phase: "finished",
    tournamentId: "t-false-finished",
    tournamentKind: "normal",
    targetRank: "F",
    participantAId: "person-a",
    participantBId: "person-b",
    bracketDefinitionHash: "hash-bracket",
    structuralSourceIdentityHash: "hash-structural",
    scheduleLifecycleIdentityHash: "hash-schedule",
    scheduleLifecycleIdentity: {},
    participantListHash: "hash-participants",
    bracketDefinition: {
      formatKind: "round_robin",
      tournamentId: "t-false-finished",
      orderedPersonIds: ["person-a", "person-b"],
      roundRobinPairs: [{ pairIndex: 0, personIdA: "person-a", personIdB: "person-b" }],
    },
    bracketRuntimeState: {},
    isolatedSession: { runtimeState: { worldState: { persons: [] } } },
    payloadStore: {},
    storedRecords: [],
    slotBindings: [],
    matchesCompleted: 0,
    lastMatch: {
      matchId: "m1",
      winnerPersonId: "person-a",
      loserPersonId: "person-b",
    },
    competitiveRecordByPersonId: {},
    earningsLedger: {},
    finalResult: { winnerPersonId: "person-a", resultHash: "result-hash" },
    worldYear: 1,
    rankingDisplayFacts: [{ personId: "person-a", displayOrder: 1 }],
  } as unknown as CompetitionPersistedState;
  return { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state };
}

describe("mapCompetitionProgressView lifecycle coherence", () => {
  it("does not expose round-robin finished/champion when progress matrix is empty", () => {
    const view = mapCompetitionProgressView(falseFinishedRoundRobinStore(), [], null);
    expect(view.lifecyclePhase).toBe("awaiting_match");
    expect(view.championDisplayName).toBeNull();
    expect(view.finalResultSummary).toBeNull();
    expect(view.roundRobinProgress).not.toBeNull();
    expect(view.roundRobinProgress!.matchesTotal).toBe(1);
    expect(view.roundRobinProgress!.matchesCompleted).toBe(0);
    expect(view.roundRobinProgress!.history).toHaveLength(1);
  });

  it("does not expose knockout-finished mapping when round-robin projection is 0/0", () => {
    const state = {
      schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
      phase: "finished",
      tournamentId: "t-knockout-false-finished",
      tournamentKind: "normal",
      targetRank: "F",
      participantAId: "person-a",
      participantBId: "person-b",
      bracketDefinitionHash: "hash-bracket",
      structuralSourceIdentityHash: "hash-structural",
      scheduleLifecycleIdentityHash: "hash-schedule",
      scheduleLifecycleIdentity: {},
      participantListHash: "hash-participants",
      bracketDefinition: {
        formatKind: "knockout",
        tournamentId: "t-knockout-false-finished",
        orderedPersonIds: ["person-a", "person-b", "person-c", "person-d", "person-e", "person-f"],
        roundRobinPairs: [],
        knockoutSlots: [],
      },
      bracketRuntimeState: {},
      isolatedSession: { runtimeState: { worldState: { persons: [] } } },
      payloadStore: {},
      storedRecords: [],
      slotBindings: [],
      matchesCompleted: 1,
      lastMatch: {
        matchId: "m1",
        winnerPersonId: "person-a",
        loserPersonId: "person-b",
      },
      competitiveRecordByPersonId: {},
      earningsLedger: {},
      finalResult: { winnerPersonId: "person-a", resultHash: "result-hash" },
      worldYear: 1,
      rankingDisplayFacts: [{ personId: "person-a", displayOrder: 1 }],
    } as unknown as CompetitionPersistedState;
    const view = mapCompetitionProgressView(
      { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state },
      [],
      null,
    );
    expect(view.lifecyclePhase).toBe("awaiting_match");
    expect(view.championDisplayName).toBeNull();
    expect(view.roundRobinProgress!.matchesTotal).toBe(0);
  });
});
