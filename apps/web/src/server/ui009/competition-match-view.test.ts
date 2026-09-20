import { describe, expect, it } from "vitest";
import { createNodeSha256Provider } from "../presets.js";
import { mapCompetitionMatchDetailView } from "./competition-match-view.js";
import type { CompetitionPersistedState } from "./competition-store.js";
import type { StoredBattleResultRecord } from "@shared-world/simulation-core";

function stubState(record: StoredBattleResultRecord): CompetitionPersistedState {
  return {
    schemaVersion: "0.1.0",
    phase: "awaiting_match",
    tournamentId: "t1",
    tournamentKind: "normal",
    targetRank: "F",
    participantAId: record.participantAId,
    participantBId: record.participantBId,
    bracketDefinitionHash: "h",
    structuralSourceIdentityHash: "h",
    scheduleLifecycleIdentityHash: "h",
    scheduleLifecycleIdentity: {},
    participantListHash: "h",
    bracketDefinition: {},
    bracketRuntimeState: {},
    isolatedSession: { runtimeState: { worldState: { persons: [] } } },
    payloadStore: {},
    storedRecords: [record as unknown as Record<string, unknown>],
    slotBindings: [],
    matchesCompleted: 1,
    lastMatch: null,
    competitiveRecordByPersonId: {},
    earningsLedger: {},
    finalResult: null,
    worldYear: 21,
    rankingDisplayFacts: [],
    tournamentHistorySummaries: [],
    annualRankingHistoryStore: {},
    promotionResultSummaries: [],
    personRankHistoryBundles: [],
  };
}

describe("mapCompetitionMatchDetailView unavailable reasons", () => {
  it("marks pruned records as unavailable without projecting logs", () => {
    const provider = createNodeSha256Provider();
    const record = {
      matchId: "m-pruned",
      participantAId: "p-a",
      participantBId: "p-b",
      winnerPersonId: "p-a",
      loserPersonId: "p-b",
      resultKind: "decision",
      detailedLogRetentionStatus: "pruned",
      detailedLogHash: "hash-1",
    } as unknown as StoredBattleResultRecord;
    const mapped = mapCompetitionMatchDetailView({
      state: stubState(record),
      matchId: "m-pruned",
      provider,
    });
    expect(mapped.kind).toBe("found");
    if (mapped.kind !== "found") {
      return;
    }
    expect(mapped.view.detailedLogAvailable).toBe(false);
    expect(mapped.view.detailedLogUnavailableReason).toBe("pruned");
    expect(mapped.view.logItems).toHaveLength(0);
    expect(mapped.view.turnOrderLogs).toHaveLength(0);
  });
});
