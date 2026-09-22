import {
  resolveTournamentDisplayName,
  type AnnualRankingDisplayFacts,
  type Sprint1RunSession,
  type StoredBattleResultRecord,
  type TournamentBracketDefinition,
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
import {
  buildAnnualSchedule,
  buildCompetitionScheduleOverview,
} from "./competition-schedule-overview.js";
import {
  annualRankingHistoryStoreFromState,
  buildAnnualRankingYearOptions,
  findScheduleEntryForTournament,
  groupTournamentSeriesHistory,
  personRankHistoryEntriesFromState,
  promotionSummariesFromState,
  tournamentHistorySummariesFromState,
} from "./competition-wireframe-observation.js";
import { projectKnockoutBracketProgressView } from "./competition-knockout-bracket-view.js";
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
    tournamentAppearances: facts.tournamentAppearances,
    officialWins: facts.officialWins,
    officialLosses: facts.officialLosses,
    officialRecordLabel: officialRecordPlayerLabel(facts.officialWins, facts.officialLosses),
  };
}

function emptyScheduleOverview(): CompetitionProgressView["scheduleOverview"] {
  return {
    worldYear: 0,
    currentWorldYear: 0,
    isViewingCurrentWorldYear: true,
    prevViewYear: null,
    nextViewYear: null,
    worldTimeLabel: "—",
    currentAbsoluteWeek: 0,
    currentWeekColumn: 0,
    matrixRowOrder: [],
    entries: [],
    playableSelectionKey: null,
    activeSelectionKey: null,
  };
}

function rankingRowsForSelectedYear(input: {
  state: CompetitionPersistedState | null;
  rankingFacts: readonly AnnualRankingDisplayFacts[];
  selectedRankingYear: number;
  currentWorldYear: number;
}): CompetitionProgressView["rankingRows"] {
  const { state, rankingFacts, selectedRankingYear, currentWorldYear } = input;
  if (state === null || selectedRankingYear === currentWorldYear) {
    if (state === null) {
      return [];
    }
    return rankingFacts.map((row) => mapRankingRow(row, state));
  }
  const historyStore = annualRankingHistoryStoreFromState(state);
  const entry = historyStore.entries.find((row) => row.worldYear === selectedRankingYear);
  if (entry === undefined) {
    return [];
  }
  return entry.rows.map((row: (typeof entry.rows)[number]) => {
    const rankLabel = rankBandPlayerLabel(row.currentRank) ?? row.currentRank;
    return {
      personId: row.personId,
      displayName: displayNameInIsolatedState(state, row.personId),
      displayOrder: row.displayOrder,
      annualRank: row.annualRank,
      yearlyCumulativeEarnings: row.yearlyCumulativeEarnings,
      yearlyCumulativeEarningsLabel: formatYenForPlayer(row.yearlyCumulativeEarnings),
      currentRank: row.currentRank,
      currentRankLabel: rankLabel,
      tournamentWins: row.tournamentWins,
      tournamentAppearances: row.tournamentAppearances,
      officialWins: row.officialWins,
      officialLosses: row.officialLosses,
      officialRecordLabel: officialRecordPlayerLabel(row.officialWins, row.officialLosses),
    };
  });
}

function buildWireframeObservation(input: {
  store: CompetitionSessionStore;
  participantIds: readonly string[];
  rankingFacts: readonly AnnualRankingDisplayFacts[];
  currentWorldYear: number;
  selectedRankingYear: number;
}): CompetitionProgressView["wireframeObservation"] {
  const state = input.store.state;
  const summaries = tournamentHistorySummariesFromState(state);
  const historyStore = annualRankingHistoryStoreFromState(state);
  return {
    tournamentSeriesHistory: groupTournamentSeriesHistory(summaries),
    promotionResults: promotionSummariesFromState(state),
    personRankHistory: personRankHistoryEntriesFromState(state, input.participantIds),
    annualRankingYearOptions: buildAnnualRankingYearOptions(
      historyStore,
      input.currentWorldYear,
      input.rankingFacts,
    ),
    selectedRankingYear: input.selectedRankingYear,
  };
}

function tournamentDisplayNameForPersistedState(state: CompetitionPersistedState): string | null {
  const entry = findScheduleEntryForTournament(
    state.tournamentId,
    state.worldYear,
    buildAnnualSchedule,
  );
  if (entry !== null) {
    return resolveTournamentDisplayName(entry.seriesKey);
  }
  return null;
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
  options?: { viewWorldYear?: number },
): CompetitionProgressView["scheduleOverview"] {
  if (worldSession === null) {
    return emptyScheduleOverview();
  }
  const persisted = store.state;
  const rosterSession =
    persisted !== null ? (persisted.isolatedSession as unknown as Sprint1RunSession) : worldSession;
  const playableIds = persisted === null ? plannedPreviewParticipantIds(worldSession) : [];
  const playableLinks = playableIds.map((personId) => ({
    personId,
    displayName: displayNameForPersonIdInSession(worldSession, personId),
  }));
  const activeLinks =
    persisted === null ? [] : participantLinksFromIds(persisted, activeParticipantIds(persisted));
  const scheduleOptions: { viewWorldYear?: number; rosterSession: Sprint1RunSession } = {
    rosterSession,
  };
  if (options?.viewWorldYear !== undefined) {
    scheduleOptions.viewWorldYear = options.viewWorldYear;
  }
  return buildCompetitionScheduleOverview(
    worldSession,
    persisted,
    playableLinks,
    activeLinks,
    scheduleOptions,
  );
}

function knockoutBracketFromState(
  state: CompetitionPersistedState,
): ReturnType<typeof projectKnockoutBracketProgressView> {
  try {
    return projectKnockoutBracketProgressView({
      bracketDefinition: state.bracketDefinition as unknown as TournamentBracketDefinition,
      bracketRuntimeState:
        state.bracketRuntimeState as unknown as import("@shared-world/simulation-core").BracketRuntimeSlotState,
      storedRecords: state.storedRecords as unknown as readonly StoredBattleResultRecord[],
      slotBindings: (state.slotBindings ??
        []) as unknown as import("@shared-world/simulation-core").TournamentSlotMatchBinding[],
      displayNameForPersonId: (personId) => displayNameInIsolatedState(state, personId),
    });
  } catch {
    return null;
  }
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

function bracketFormatKind(state: CompetitionPersistedState): string | null {
  const formatKind = (state.bracketDefinition as { formatKind?: unknown } | undefined)?.formatKind;
  return typeof formatKind === "string" ? formatKind : null;
}

function roundRobinCompletionCoherent(
  roundRobinProgress: CompetitionRoundRobinProgressView | null,
): boolean {
  if (roundRobinProgress === null) {
    return false;
  }
  if (roundRobinProgress.matchesTotal <= 0) {
    return false;
  }
  return roundRobinProgress.matchesCompleted >= roundRobinProgress.matchesTotal;
}

function tournamentCompletionCoherent(
  state: CompetitionPersistedState,
  roundRobinProgress: CompetitionRoundRobinProgressView | null,
): boolean {
  if (
    roundRobinProgress !== null &&
    roundRobinProgress.matchesTotal === 0 &&
    roundRobinProgress.matchesCompleted === 0
  ) {
    return false;
  }
  if (bracketFormatKind(state) === "round_robin") {
    return roundRobinCompletionCoherent(roundRobinProgress);
  }
  return state.matchesCompleted > 0 && state.lastMatch !== null;
}

/**
 * Maps persisted phase to player-facing lifecycle. Terminal "finished" requires factual
 * match completion so the step CTA is not hidden by a false terminal mapping.
 */
function effectiveLifecyclePhase(
  state: CompetitionPersistedState,
  roundRobinProgress: CompetitionRoundRobinProgressView | null,
): CompetitionLifecyclePhase {
  const stored = lifecyclePhaseFromState(state);
  if (stored !== "finished") {
    return stored;
  }
  if (tournamentCompletionCoherent(state, roundRobinProgress)) {
    return "finished";
  }
  return "awaiting_match";
}

export type MapCompetitionProgressOptions = {
  scheduleViewYear?: number;
  rankingViewYear?: number;
};

export function mapCompetitionProgressView(
  store: CompetitionSessionStore,
  rankingFacts: readonly AnnualRankingDisplayFacts[],
  worldSession: Sprint1RunSession | null,
  options?: MapCompetitionProgressOptions,
): CompetitionProgressView {
  const currentWorldYear =
    worldSession?.runtimeState.worldState.worldDate.year ??
    store.state?.worldYear ??
    new Date().getFullYear();
  const selectedRankingYear = options?.rankingViewYear ?? currentWorldYear;
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
      tournamentDisplayName: preStartPreview?.tournamentDisplayName ?? null,
      tournamentKind: null,
      targetRank: null,
      participantIds: plannedIds,
      matchesCompleted: 0,
      lastMatch: null,
      finalResultSummary: null,
      rankingRows: [],
      ...EMPTY_PLAYER_FIELDS,
      preStartPreview:
        preStartPreview === null ? null : { ...preStartPreview, participantDisplayNames },
      participantDisplayNames,
      tournamentKindLabel: preStartPreview?.tournamentKindLabel ?? null,
      targetRankLabel: preStartPreview?.targetRankLabel ?? null,
      roundRobinProgress: null,
      knockoutBracket: null,
      bracketFormatKind: null,
      scheduleOverview: scheduleOverviewForSession(
        worldSession,
        store,
        options?.scheduleViewYear !== undefined
          ? { viewWorldYear: options.scheduleViewYear }
          : undefined,
      ),
      wireframeObservation: buildWireframeObservation({
        store,
        participantIds: plannedIds,
        rankingFacts,
        currentWorldYear,
        selectedRankingYear,
      }),
    };
  }

  const finalResult = state.finalResult as { winnerPersonId?: string; resultHash?: string } | null;
  const roundRobinProgress = roundRobinProgressFromState(state);
  const knockoutBracket = knockoutBracketFromState(state);
  const lifecyclePhase = effectiveLifecyclePhase(state, roundRobinProgress);
  const presentAsFinished = lifecyclePhase === "finished";
  const participantIds = roundRobinProgress?.participantIds ?? [
    state.participantAId,
    state.participantBId,
  ];
  const participantDisplayNames = participantIds.map((id) => displayNameInIsolatedState(state, id));
  const kindLabel = tournamentKindPlayerLabel(state.tournamentKind);
  const rankLabel = rankBandPlayerLabel(state.targetRank);

  return {
    schemaVersion: COMPETITION_VIEW_SCHEMA_VERSION,
    lifecyclePhase,
    tournamentId: state.tournamentId,
    tournamentDisplayName: tournamentDisplayNameForPersistedState(state),
    tournamentKind: state.tournamentKind,
    targetRank: state.targetRank,
    participantIds,
    matchesCompleted:
      roundRobinProgress !== null && roundRobinProgress.matchesTotal > 0
        ? roundRobinProgress.matchesCompleted
        : state.matchesCompleted,
    lastMatch:
      state.lastMatch === null
        ? null
        : {
            matchId: state.lastMatch.matchId,
            winnerPersonId: state.lastMatch.winnerPersonId,
            loserPersonId: state.lastMatch.loserPersonId,
          },
    finalResultSummary:
      presentAsFinished &&
      finalResult?.winnerPersonId !== undefined &&
      finalResult.resultHash !== undefined
        ? {
            winnerPersonId: finalResult.winnerPersonId,
            resultHash: finalResult.resultHash,
          }
        : null,
    rankingRows: rankingRowsForSelectedYear({
      state,
      rankingFacts,
      selectedRankingYear,
      currentWorldYear,
    }),
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
      presentAsFinished && finalResult?.winnerPersonId !== undefined
        ? displayNameInIsolatedState(state, finalResult.winnerPersonId)
        : null,
    roundRobinProgress,
    knockoutBracket,
    bracketFormatKind: bracketFormatKind(state),
    scheduleOverview: scheduleOverviewForSession(
      worldSession,
      store,
      options?.scheduleViewYear !== undefined
        ? { viewWorldYear: options.scheduleViewYear }
        : undefined,
    ),
    wireframeObservation: buildWireframeObservation({
      store,
      participantIds,
      rankingFacts,
      currentWorldYear,
      selectedRankingYear,
    }),
  };
}

export function buildStepDataView(
  store: CompetitionSessionStore,
  rankingFacts: readonly AnnualRankingDisplayFacts[],
  stepKind: CompetitionStepDataView["stepKind"],
  worldSession: Sprint1RunSession | null,
  options?: MapCompetitionProgressOptions,
): CompetitionStepDataView {
  return {
    competition: mapCompetitionProgressView(store, rankingFacts, worldSession, options),
    stepKind,
  };
}

export { buildAnnualSchedule };

export function rankingFactsFromState(
  state: CompetitionPersistedState | null,
): readonly AnnualRankingDisplayFacts[] {
  if (state === null) {
    return [];
  }
  return state.rankingDisplayFacts as unknown as AnnualRankingDisplayFacts[];
}

/** Stored alongside persisted state after finalize (adapter-internal JSON). */
export type CompetitionPersistedStateWithRanking = CompetitionPersistedState & {
  readonly rankingDisplayFacts: readonly Record<string, unknown>[];
};
