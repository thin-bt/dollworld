/**
 * Client mirror of UI-006 MockBattleView 0.2.0 exact34 + MutationView exact5.
 */

export const MOCK_BATTLE_VIEW_KEYS = [
  "resultUiRevision",
  "sourceWorldUiRevision",
  "battleResultSchemaVersion",
  "matchId",
  "simulationId",
  "battleKind",
  "participantAPersonId",
  "participantBPersonId",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "participantSourceSnapshotHashes",
  "sourceWorldDate",
  "battleSeed",
  "resultKind",
  "winnerPersonId",
  "loserPersonId",
  "endReason",
  "endReasonIsJudgeDecision",
  "judgementApplied",
  "judgeScore",
  "turnsExecuted",
  "battleInputHash",
  "runRuleSnapshotHash",
  "sprint1ConfigVersion",
  "sprint1ConfigHash",
  "techniqueCatalogDataVersion",
  "techniqueCatalogHash",
  "finalState",
  "finalRngState",
  "failure",
  "eventCandidates",
  "validation",
  "logTotalCount",
  "replayAvailable",
] as const;

export const MOCK_BATTLE_MUTATION_VIEW_KEYS = [
  "acceptedUiRevision",
  "completedUiRevision",
  "replay",
  "durationMs",
  "result",
] as const;

export type MockBattleView = Record<(typeof MOCK_BATTLE_VIEW_KEYS)[number], unknown>;

export type MockBattleMutationView = {
  acceptedUiRevision: number;
  completedUiRevision: number;
  replay: boolean;
  durationMs: number;
  result: MockBattleView;
};
