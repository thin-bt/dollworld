export type CompetitionLifecyclePhase =
  "idle" | "awaiting_match" | "round_robin_complete" | "finished";

export type CompetitionPreStartPreview = {
  tournamentDisplayName: string;
  tournamentKindLabel: string;
  targetRankLabel: string;
  participantDisplayNames: readonly string[];
};

export type CompetitionLastMatchPlayerLabels = {
  winnerDisplayName: string;
  loserDisplayName: string;
};

export type CompetitionParticipantStatSet = {
  stamina: number;
  strength: number;
  skill: number;
  speed: number;
  spirit: number;
  magic: number;
};

export type CompetitionParticipantAptitudeSet = {
  unarmed: number;
  sword: number;
  magic: number;
};

export type CompetitionParticipantLink = {
  displayName: string;
  personId: string;
  currentRankLabel?: string | null;
  ageLabel?: string | null;
  officialRecordLabel?: string | null;
  stats?: CompetitionParticipantStatSet | null;
  aptitudes?: CompetitionParticipantAptitudeSet | null;
};

export type CompetitionScheduleEntry = {
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
  participantLinks: readonly CompetitionParticipantLink[];
  participantCountLabel: string | null;
};

export type CompetitionScheduleOverview = {
  worldYear: number;
  currentWorldYear: number;
  isViewingCurrentWorldYear: boolean;
  prevViewYear: number | null;
  nextViewYear: number | null;
  worldTimeLabel: string;
  currentAbsoluteWeek: number;
  currentWeekColumn: number;
  matrixRowOrder: readonly string[];
  entries: readonly CompetitionScheduleEntry[];
  playableSelectionKey: string | null;
  activeSelectionKey: string | null;
};

export type CompetitionRoundRobinHistoryRow = {
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

export type CompetitionRoundRobinMatrixCell = {
  opponentPersonId: string;
  opponentDisplayName: string;
  pairIndex: number;
  matchId: string | null;
  outcome: "pending" | "win" | "loss";
};

export type CompetitionRoundRobinMatrixRow = {
  personId: string;
  displayName: string;
  wins: number;
  losses: number;
  played: number;
  cells: readonly CompetitionRoundRobinMatrixCell[];
};

export type CompetitionRoundRobinProgress = {
  participantIds: readonly string[];
  matchesTotal: number;
  matchesCompleted: number;
  nextPairIndex: number | null;
  history: readonly CompetitionRoundRobinHistoryRow[];
  matrix: readonly CompetitionRoundRobinMatrixRow[];
};

export type KnockoutBracketMatchRow = {
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

export type KnockoutBracketProgress = {
  formatKind: string;
  matchesTotal: number;
  matchesCompleted: number;
  rounds: readonly {
    roundIndex: number;
    label: string;
    matches: readonly KnockoutBracketMatchRow[];
  }[];
};

export type TournamentSeriesHistoryGroup = {
  seriesKey: string;
  seriesDisplayLabel: string;
  editions: readonly {
    tournamentId: string;
    worldYear: number;
    timingLabel: string;
    winnerDisplayName: string;
    winnerPersonId: string;
    participantCount: number;
  }[];
};

export type CompetitionWireframeObservation = {
  tournamentSeriesHistory: readonly TournamentSeriesHistoryGroup[];
  promotionResults: readonly {
    promotionResultHash: string;
    personId: string;
    personDisplayName: string;
    previousRank: string;
    newRank: string;
    sourceTournamentId: string;
  }[];
  personRankHistory: readonly {
    personId: string;
    personDisplayName: string;
    previousRank: string;
    newRank: string;
    sourceTournamentId: string;
    worldYear: number;
    timingLabel: string;
  }[];
  annualRankingYearOptions: readonly {
    worldYear: number;
    label: string;
    isCurrentWorldYear: boolean;
    hasData: boolean;
  }[];
  selectedRankingYear: number;
};

export type CompetitionProgressView = {
  schemaVersion: string;
  lifecyclePhase: CompetitionLifecyclePhase;
  tournamentId: string | null;
  tournamentDisplayName: string | null;
  tournamentKind: string | null;
  targetRank: string | null;
  participantIds: readonly string[];
  matchesCompleted: number;
  lastMatch: {
    matchId: string;
    winnerPersonId: string;
    loserPersonId: string;
  } | null;
  finalResultSummary: {
    winnerPersonId: string;
    resultHash: string;
  } | null;
  rankingRows: readonly {
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
  }[];
  tournamentKindLabel: string | null;
  targetRankLabel: string | null;
  participantDisplayNames: readonly string[];
  preStartPreview: CompetitionPreStartPreview | null;
  lastMatchPlayerLabels: CompetitionLastMatchPlayerLabels | null;
  championDisplayName: string | null;
  roundRobinProgress: CompetitionRoundRobinProgress | null;
  knockoutBracket: KnockoutBracketProgress | null;
  bracketFormatKind: string | null;
  scheduleOverview: CompetitionScheduleOverview;
  wireframeObservation: CompetitionWireframeObservation;
};

export type CompetitionMatchDetailUnavailableReason =
  "not_retained" | "pruned" | "missing_payload" | null;

export type CompetitionTurnOrderLogView = Record<string, unknown>;

export type CompetitionMatchDetailView = {
  matchId: string;
  participantAId: string;
  participantBId: string;
  participantADisplayName: string;
  participantBDisplayName: string;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  winnerDisplayName: string | null;
  loserDisplayName: string | null;
  resultKind: string;
  tournamentId: string | null;
  detailedLogAvailable: boolean;
  detailedLogUnavailableReason: CompetitionMatchDetailUnavailableReason;
  detailedLogActionCount: number;
  turnOrderLogs: readonly CompetitionTurnOrderLogView[];
  logItems: readonly Record<string, unknown>[];
  battleLogSummary: CompetitionBattleLogSummaryView | null;
};

export type CompetitionBattleLogSummaryView = {
  matchId: string;
  simulationId: string;
  participantAPersonId: string;
  participantBPersonId: string;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  resultKind: string;
  endReason: string;
  logTotalCount: number;
  finalState: Record<string, unknown>;
  judgeScore: null;
};

export type CompetitionStepDataView = {
  competition: CompetitionProgressView;
  stepKind: "initialized" | "match_played" | "already_finished" | "noop";
};
