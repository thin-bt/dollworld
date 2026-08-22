/**
 * UI-006 MockBattle wire/view shapes (S1.5-SPEC-0.1.15 §13B/§13C/§13E).
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

export type MockBattleViewKey = (typeof MOCK_BATTLE_VIEW_KEYS)[number];

export const MOCK_BATTLE_MUTATION_VIEW_KEYS = [
  "acceptedUiRevision",
  "completedUiRevision",
  "replay",
  "durationMs",
  "result",
] as const;

export type WorldDateView = { year: number; month: number; week: number };

export type OrderedParticipantPair = {
  participantAId: string;
  participantBId: string;
  sideA: string;
  sideB: string;
};

export type FailureView = {
  code: string;
  severity: string;
  targetIds: string[];
  reason: string;
  canContinue: boolean;
};

export type MockBattleView = {
  resultUiRevision: number;
  sourceWorldUiRevision: number;
  battleResultSchemaVersion: "0.5.0";
  matchId: string;
  simulationId: string;
  battleKind: "mock";
  participantAPersonId: string;
  participantBPersonId: string;
  participantAActionSourceIdentity: unknown;
  participantBActionSourceIdentity: unknown;
  participantSourceSnapshotHashes: {
    participantA: string;
    participantB: string;
  };
  sourceWorldDate: WorldDateView;
  battleSeed: number;
  resultKind: "completed" | "failed";
  winnerPersonId: string | null;
  loserPersonId: string | null;
  endReason: string;
  endReasonIsJudgeDecision: boolean;
  judgementApplied: boolean;
  judgeScore: unknown;
  turnsExecuted: number;
  battleInputHash: string;
  runRuleSnapshotHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  finalState: Record<string, unknown>;
  finalRngState: unknown;
  failure: FailureView | null;
  eventCandidates: unknown[];
  validation: unknown;
  logTotalCount: number;
  replayAvailable: true;
};

export type MockBattleMutationView = {
  acceptedUiRevision: number;
  completedUiRevision: number;
  replay: boolean;
  durationMs: number;
  result: MockBattleView;
};

export type EventCandidateSource = {
  eventType: string;
  payload: Record<string, unknown>;
  entities?: { personIds?: string[]; matchIds?: string[] };
  [key: string]: unknown;
};

export type BattleResultSource = {
  schemaVersion: string;
  matchId: string;
  simulationId: string;
  battleKind: string;
  participantAId: string;
  participantBId: string;
  participantAActionSourceIdentity: unknown;
  participantBActionSourceIdentity: unknown;
  worldDate: { year: number; month: number; weekOfMonth: number };
  resultKind: "completed" | "failed";
  winnerPersonId: string | null;
  loserPersonId: string | null;
  endReason: string;
  judgeScore: unknown;
  turnsExecuted: number;
  battleInputHash: string;
  runRuleSnapshotHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  finalState: Record<string, unknown>;
  finalRngState: unknown;
  validation: unknown;
  detailedLog: { actionLogs: unknown[] };
};

export type ReplaySnapshotSource = {
  sourceWorldUiRevision: number;
  participantAId: string;
  participantBId: string;
  [key: string]: unknown;
};

export type MockBattleLatestRecordSource = {
  resultUiRevision: number;
  battleResult: BattleResultSource;
  eventCandidates: readonly [EventCandidateSource, EventCandidateSource] | EventCandidateSource[];
  replaySnapshot: ReplaySnapshotSource;
  replaySnapshotHash?: string;
  latestRecordHash?: string;
};
