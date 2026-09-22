/** UI-009 Sprint2 competition progression wire types (session-scoped, isolated from canonical world). */

export const COMPETITION_VIEW_SCHEMA_VERSION = "0.1.0" as const;

export const COMPETITION_VIEW_KEYS = [
  "schemaVersion",
  "lifecyclePhase",
  "tournamentId",
  "tournamentDisplayName",
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
  "knockoutBracket",
  "bracketFormatKind",
  "scheduleOverview",
  "wireframeObservation",
] as const;

export type CompetitionParticipantLinkView = {
  displayName: string;
  personId: string;
  currentRankLabel?: string | null;
  ageLabel?: string | null;
  officialRecordLabel?: string | null;
};

export type CompetitionScheduleEntryView = {
  selectionKey: string;
  matrixRowKey: string;
  tournamentDisplayName: string;
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
  currentWorldYear: number;
  isViewingCurrentWorldYear: boolean;
  prevViewYear: number | null;
  nextViewYear: number | null;
  worldTimeLabel: string;
  currentAbsoluteWeek: number;
  currentWeekColumn: number;
  matrixRowOrder: readonly string[];
  entries: readonly CompetitionScheduleEntryView[];
  playableSelectionKey: string | null;
  activeSelectionKey: string | null;
};

export type CompetitionLifecyclePhase =
  "idle" | "awaiting_match" | "round_robin_complete" | "finished";

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
  tournamentAppearances: number;
  officialWins: number;
  officialLosses: number;
  officialRecordLabel: string;
};

export type TournamentHistorySummaryView = {
  seriesKey: string;
  seriesDisplayLabel: string;
  tournamentDisplayName: string;
  tournamentId: string;
  worldYear: number;
  timingLabel: string;
  rankOrCategoryLabel: string;
  kindLabel: string;
  winnerPersonId: string;
  winnerDisplayName: string;
  participantCount: number;
};

export type TournamentSeriesHistoryEditionView = {
  tournamentId: string;
  worldYear: number;
  timingLabel: string;
  winnerDisplayName: string;
  winnerPersonId: string;
  participantCount: number;
};

export type TournamentSeriesHistoryGroupView = {
  seriesKey: string;
  seriesDisplayLabel: string;
  editions: readonly TournamentSeriesHistoryEditionView[];
};

export type AnnualRankingYearOptionView = {
  worldYear: number;
  label: string;
  isCurrentWorldYear: boolean;
  hasData: boolean;
};

export type PromotionResultSummaryView = {
  promotionResultHash: string;
  personId: string;
  personDisplayName: string;
  previousRank: string;
  newRank: string;
  sourceTournamentId: string;
};

export type PersonRankHistoryEntryView = {
  personId: string;
  personDisplayName: string;
  previousRank: string;
  newRank: string;
  sourceTournamentId: string;
  worldYear: number;
  timingLabel: string;
};

export type CompetitionWireframeObservationView = {
  tournamentSeriesHistory: readonly TournamentSeriesHistoryGroupView[];
  promotionResults: readonly PromotionResultSummaryView[];
  personRankHistory: readonly PersonRankHistoryEntryView[];
  annualRankingYearOptions: readonly AnnualRankingYearOptionView[];
  selectedRankingYear: number;
};

export type CompetitionPreStartPreviewView = {
  tournamentDisplayName: string;
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

export type KnockoutBracketMatchRowView = {
  roundIndex: number;
  slotId: string;
  participantAId: string | null;
  participantBId: string | null;
  participantADisplayName: string;
  participantBDisplayName: string;
  matchId: string | null;
  winnerPersonId: string | null;
  status: "pending" | "ready" | "completed";
};

export type KnockoutBracketProgressView = {
  formatKind: string;
  matchesTotal: number;
  matchesCompleted: number;
  rounds: readonly {
    roundIndex: number;
    label: string;
    matches: readonly KnockoutBracketMatchRowView[];
  }[];
};

export type CompetitionProgressView = {
  schemaVersion: typeof COMPETITION_VIEW_SCHEMA_VERSION;
  lifecyclePhase: CompetitionLifecyclePhase;
  tournamentId: string | null;
  tournamentDisplayName: string | null;
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
  knockoutBracket: KnockoutBracketProgressView | null;
  bracketFormatKind: string | null;
  scheduleOverview: CompetitionScheduleOverviewView;
  wireframeObservation: CompetitionWireframeObservationView;
};

export type CompetitionStepDataView = {
  competition: CompetitionProgressView;
  stepKind: "initialized" | "match_played" | "already_finished" | "noop";
};
