/** UI-009 Sprint2 competition progression wire types (session-scoped, isolated from canonical world). */

export const COMPETITION_VIEW_SCHEMA_VERSION = "0.1.0" as const;

export const COMPETITION_VIEW_KEYS = [
  "schemaVersion",
  "lifecyclePhase",
  "tournamentId",
  "tournamentKind",
  "targetRank",
  "participantIds",
  "matchesCompleted",
  "lastMatch",
  "finalResultSummary",
  "rankingRows",
  "tournamentKindLabel",
  "targetRankLabel",
  "participantDisplayNames",
  "preStartPreview",
  "lastMatchPlayerLabels",
  "championDisplayName",
  "roundRobinProgress",
  "scheduleOverview",
] as const;

export type CompetitionParticipantLinkView = {
  displayName: string;
  personId: string;
};

export type CompetitionScheduleEntryView = {
  selectionKey: string;
  matrixRowKey: string;
  month: number;
  weekOfMonth: number;
  absoluteWeek: number;
  kindLabel: string;
  rankOrCategoryLabel: string;
  lifecycleStateLabel: string;
  timingLabel: string;
  temporalState: "past" | "current" | "future";
  isPlayable: boolean;
  isActiveCompetition: boolean;
  participantLinks: readonly CompetitionParticipantLinkView[];
  participantCountLabel: string | null;
};

export type CompetitionScheduleOverviewView = {
  worldYear: number;
  worldTimeLabel: string;
  currentAbsoluteWeek: number;
  currentWeekColumn: number;
  matrixRowOrder: readonly string[];
  entries: readonly CompetitionScheduleEntryView[];
  playableSelectionKey: string | null;
  activeSelectionKey: string | null;
};

export type CompetitionLifecyclePhase = "idle" | "awaiting_match" | "finished";

export type CompetitionMatchSummaryView = {
  matchId: string;
  winnerPersonId: string;
  loserPersonId: string;
};

export type CompetitionFinalResultSummaryView = {
  winnerPersonId: string;
  resultHash: string;
};

export type CompetitionRankingRowView = {
  personId: string;
  displayName: string;
  displayOrder: number;
  annualRank: number;
  yearlyCumulativeEarnings: number;
  yearlyCumulativeEarningsLabel: string;
  currentRank: string;
  currentRankLabel: string;
  tournamentWins: number;
  officialWins: number;
  officialLosses: number;
  officialRecordLabel: string;
};

export type CompetitionPreStartPreviewView = {
  tournamentKindLabel: string;
  targetRankLabel: string;
  participantDisplayNames: readonly string[];
};

export type CompetitionLastMatchPlayerLabels = {
  winnerDisplayName: string;
  loserDisplayName: string;
};

export type CompetitionRoundRobinHistoryRowView = {
  pairIndex: number;
  participantAId: string;
  participantBId: string;
  participantADisplayName: string;
  participantBDisplayName: string;
  matchId: string | null;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  resultKind: string | null;
};

export type CompetitionRoundRobinMatrixCellView = {
  opponentPersonId: string;
  opponentDisplayName: string;
  pairIndex: number;
  matchId: string | null;
  outcome: "pending" | "win" | "loss";
};

export type CompetitionRoundRobinMatrixRowView = {
  personId: string;
  displayName: string;
  wins: number;
  losses: number;
  played: number;
  cells: readonly CompetitionRoundRobinMatrixCellView[];
};

export type CompetitionRoundRobinProgressView = {
  participantIds: readonly string[];
  matchesTotal: number;
  matchesCompleted: number;
  nextPairIndex: number | null;
  history: readonly CompetitionRoundRobinHistoryRowView[];
  matrix: readonly CompetitionRoundRobinMatrixRowView[];
};

export type CompetitionProgressView = {
  schemaVersion: typeof COMPETITION_VIEW_SCHEMA_VERSION;
  lifecyclePhase: CompetitionLifecyclePhase;
  tournamentId: string | null;
  tournamentKind: string | null;
  targetRank: string | null;
  participantIds: readonly string[];
  matchesCompleted: number;
  lastMatch: CompetitionMatchSummaryView | null;
  finalResultSummary: CompetitionFinalResultSummaryView | null;
  rankingRows: readonly CompetitionRankingRowView[];
  tournamentKindLabel: string | null;
  targetRankLabel: string | null;
  participantDisplayNames: readonly string[];
  preStartPreview: CompetitionPreStartPreviewView | null;
  lastMatchPlayerLabels: CompetitionLastMatchPlayerLabels | null;
  championDisplayName: string | null;
  roundRobinProgress: CompetitionRoundRobinProgressView | null;
  scheduleOverview: CompetitionScheduleOverviewView;
};

export type CompetitionStepDataView = {
  competition: CompetitionProgressView;
  stepKind: "initialized" | "match_played" | "already_finished" | "noop";
};
