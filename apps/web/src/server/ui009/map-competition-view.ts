import type {
  AnnualRankingDisplayFacts,
  Sprint1RunSession,
  StoredBattleResultRecord,
  TournamentBracketDefinition,
} from "@shared-world/simulation-core";
import { createNodeSha256Provider } from "../presets.js";
import {
  buildIdleCompetitionPreStartPreview,
  displayNameForPersonIdInSession,
} from "./competition-engine.js";
import { plannedCompetitionParticipantIdsForPreview } from "./competition-participant-preview.js";
import {
  projectRoundRobinProgress,
  type RoundRobinMatchHistoryRow,
  type RoundRobinParticipantMatrixRow,
} from "./competition-round-robin-progress.js";
import { buildCompetitionScheduleOverview } from "./competition-schedule-overview.js";
import {
  formatYenForPlayer,
  officialRecordPlayerLabel,
  rankBandPlayerLabel,
  tournamentKindPlayerLabel,
} from "./competition-player-labels.js";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import type {
  CompetitionLifecyclePhase,
  CompetitionParticipantLinkView,
  CompetitionProgressView,
  CompetitionRankingRowView,
  CompetitionRoundRobinProgressView,
  CompetitionStepDataView,
} from "./types.js";
import { COMPETITION_VIEW_SCHEMA_VERSION } from "./types.js";

function isolatedSessionFromState(state: CompetitionPersistedState): Sprint1RunSession | null {
  const raw = state.isolatedSession;
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  return raw as unknown as Sprint1RunSession;
}

function displayNameInIsolatedState(state: CompetitionPersistedState, personId: string): string {
  const session = isolatedSessionFromState(state);
  if (session === null) {
    return "不明";
  }
  return displayNameForPersonIdInSession(session, personId);
}

function mapRankingRow(
  facts: AnnualRankingDisplayFacts,
  state: CompetitionPersistedState,
): CompetitionRankingRowView {
  const rankLabel = rankBandPlayerLabel(facts.currentRank) ?? facts.currentRank;
  return {
    personId: facts.personId,
    displayName: displayNameInIsolatedState(state, facts.personId),
    displayOrder: facts.displayOrder,
    annualRank: facts.annualRank,
    yearlyCumulativeEarnings: facts.yearlyCumulativeEarnings,
    yearlyCumulativeEarningsLabel: formatYenForPlayer(facts.yearlyCumulativeEarnings),
    currentRank: facts.currentRank,
    currentRankLabel: rankLabel,
    tournamentWins: facts.tournamentWins,
    officialWins: facts.officialWins,
    officialLosses: facts.officialLosses,
    officialRecordLabel: officialRecordPlayerLabel(facts.officialWins, facts.officialLosses),
  };
}

const EMPTY_PLAYER_FIELDS = {
  tournamentKindLabel: null,
  targetRankLabel: null,
  participantDisplayNames: [] as readonly string[],
  preStartPreview: null,
  lastMatchPlayerLabels: null,
  championDisplayName: null,
};

function participantLinksFromIds(
  state: CompetitionPersistedState | null,
  personIds: readonly string[],
): readonly CompetitionParticipantLinkView[] {
  if (state === null) {
    return [];
  }
  return personIds.map((personId) => ({
    personId,
    displayName: displayNameInIsolatedState(state, personId),
  }));
}

function plannedPreviewParticipantIds(worldSession: Sprint1RunSession): readonly string[] {
  return plannedCompetitionParticipantIdsForPreview(worldSession, createNodeSha256Provider());
}

function scheduleOverviewForSession(
  worldSession: Sprint1RunSession | null,
  store: CompetitionSessionStore,
): CompetitionProgressView["scheduleOverview"] {
  if (worldSession === null) {
    return {
      worldYear: 0,
      worldTimeLabel: "—",
      currentAbsoluteWeek: 0,
      currentWeekColumn: 0,
      matrixRowOrder: [],
      entries: [],
      playableSelectionKey: null,
      activeSelectionKey: null,
    };
  }
  const persisted = store.state;
  const playableIds = persisted === null ? plannedPreviewParticipantIds(worldSession) : [];
  const playableLinks = playableIds.map((personId) => ({
    personId,
    displayName: displayNameForPersonIdInSession(worldSession, personId),
  }));
  const activeLinks =
    persisted === null
      ? []
      : participantLinksFromIds(persisted, activeParticipantIds(persisted));
  return buildCompetitionScheduleOverview(
    worldSession,
    persisted,
    playableLinks,
    activeLinks,
  );
}

function roundRobinProgressFromState(
  state: CompetitionPersistedState,
): CompetitionRoundRobinProgressView | null {
  try {
    const projected = projectRoundRobinProgress({
      bracketDefinition: state.bracketDefinition as unknown as TournamentBracketDefinition,
      storedRecords: state.storedRecords as unknown as readonly StoredBattleResultRecord[],
    });
    const mapHistoryRow = (row: RoundRobinMatchHistoryRow) => ({
      ...row,
      participantADisplayName: displayNameInIsolatedState(state, row.participantAId),
      participantBDisplayName: displayNameInIsolatedState(state, row.participantBId),
    });
    const mapMatrixRow = (row: RoundRobinParticipantMatrixRow) => ({
      personId: row.personId,
      displayName: displayNameInIsolatedState(state, row.personId),
      wins: row.wins,
      losses: row.losses,
      played: row.played,
      cells: row.cells.map((cell) => ({
        ...cell,
        opponentDisplayName: displayNameInIsolatedState(state, cell.opponentPersonId),
      })),
    });
    return {
      participantIds: projected.participantIds,
      matchesTotal: projected.matchesTotal,
      matchesCompleted: projected.matchesCompleted,
      nextPairIndex: projected.nextPairIndex,
      history: projected.history.map(mapHistoryRow),
      matrix: projected.matrix.map(mapMatrixRow),
    };
  } catch {
    return null;
  }
}

function activeParticipantIds(state: CompetitionPersistedState): readonly string[] {
  const progress = roundRobinProgressFromState(state);
  if (progress !== null && progress.participantIds.length > 0) {
    return progress.participantIds;
  }
  return [state.participantAId, state.participantBId];
}

function lifecyclePhaseFromState(state: CompetitionPersistedState): CompetitionLifecyclePhase {
  if (state.phase === "finished") {
    return "finished";
  }
  if (state.phase === "round_robin_complete") {
    return "round_robin_complete";
  }
  return "awaiting_match";
}

export function mapCompetitionProgressView(
  store: CompetitionSessionStore,
  rankingFacts: readonly AnnualRankingDisplayFacts[],
  worldSession: Sprint1RunSession | null,
): CompetitionProgressView {
  const state = store.state;
  if (state === null) {
    const preStartPreview =
      worldSession === null ? null : buildIdleCompetitionPreStartPreview(worldSession);
    const plannedIds = worldSession === null ? [] : plannedPreviewParticipantIds(worldSession);
    const participantDisplayNames =
      worldSession === null
        ? []
        : plannedIds.map((personId) => displayNameForPersonIdInSession(worldSession, personId));
    return {
      schemaVersion: COMPETITION_VIEW_SCHEMA_VERSION,
      lifecyclePhase: "idle",
      tournamentId: null,
      tournamentKind: null,
      targetRank: null,
      participantIds: plannedIds,
      matchesCompleted: 0,
      lastMatch: null,
      finalResultSummary: null,
      rankingRows: [],
      ...EMPTY_PLAYER_FIELDS,
      preStartPreview:
        preStartPreview === null
          ? null
          : { ...preStartPreview, participantDisplayNames },
      participantDisplayNames,
      tournamentKindLabel: preStartPreview?.tournamentKindLabel ?? null,
      targetRankLabel: preStartPreview?.targetRankLabel ?? null,
      roundRobinProgress: null,
      scheduleOverview: scheduleOverviewForSession(worldSession, store),
    };
  }

  const finalResult = state.finalResult as { winnerPersonId?: string; resultHash?: string } | null;
  const roundRobinProgress = roundRobinProgressFromState(state);
  const participantIds = roundRobinProgress?.participantIds ?? [state.participantAId, state.participantBId];
  const participantDisplayNames = participantIds.map((id) =>
    displayNameInIsolatedState(state, id),
  );
  const kindLabel = tournamentKindPlayerLabel(state.tournamentKind);
  const rankLabel = rankBandPlayerLabel(state.targetRank);

  return {
    schemaVersion: COMPETITION_VIEW_SCHEMA_VERSION,
    lifecyclePhase: lifecyclePhaseFromState(state),
    tournamentId: state.tournamentId,
    tournamentKind: state.tournamentKind,
    targetRank: state.targetRank,
    participantIds,
    matchesCompleted: roundRobinProgress?.matchesCompleted ?? state.matchesCompleted,
    lastMatch:
      state.lastMatch === null
        ? null
        : {
            matchId: state.lastMatch.matchId,
            winnerPersonId: state.lastMatch.winnerPersonId,
            loserPersonId: state.lastMatch.loserPersonId,
          },
    finalResultSummary:
      finalResult?.winnerPersonId !== undefined && finalResult.resultHash !== undefined
        ? {
            winnerPersonId: finalResult.winnerPersonId,
            resultHash: finalResult.resultHash,
          }
        : null,
    rankingRows: rankingFacts.map((row) => mapRankingRow(row, state)),
    tournamentKindLabel: kindLabel,
    targetRankLabel: rankLabel,
    participantDisplayNames,
    preStartPreview: null,
    lastMatchPlayerLabels:
      state.lastMatch === null
        ? null
        : {
            winnerDisplayName: displayNameInIsolatedState(state, state.lastMatch.winnerPersonId),
            loserDisplayName: displayNameInIsolatedState(state, state.lastMatch.loserPersonId),
          },
    championDisplayName:
      finalResult?.winnerPersonId !== undefined
        ? displayNameInIsolatedState(state, finalResult.winnerPersonId)
        : null,
    roundRobinProgress,
    scheduleOverview: scheduleOverviewForSession(worldSession, store),
  };
}

export function buildStepDataView(
  store: CompetitionSessionStore,
  rankingFacts: readonly AnnualRankingDisplayFacts[],
  stepKind: CompetitionStepDataView["stepKind"],
  worldSession: Sprint1RunSession | null,
): CompetitionStepDataView {
  return {
    competition: mapCompetitionProgressView(store, rankingFacts, worldSession),
    stepKind,
  };
}

export function rankingFactsFromState(state: CompetitionPersistedState | null): readonly AnnualRankingDisplayFacts[] {
  if (state === null) {
    return [];
  }
  return state.rankingDisplayFacts as unknown as AnnualRankingDisplayFacts[];
}

/** Stored alongside persisted state after finalize (adapter-internal JSON). */
export type CompetitionPersistedStateWithRanking = CompetitionPersistedState & {
  readonly rankingDisplayFacts: readonly Record<string, unknown>[];
};
