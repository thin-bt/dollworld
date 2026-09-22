import {
  buildSeriesKey,
  resolveTournamentDisplayName,
  computeCurrentAge,
  type AnnualRankingDisplayFacts,
  type AnnualRankingHistoryStore,
  type CompetitiveRecord,
  type PersonId,
  type Sha256Provider,
  type Sprint1RunSession,
  type TournamentScheduleReadModelEntry,
  upsertAnnualRankingHistoryEntry,
} from "@shared-world/simulation-core";
import { projectPersonStatsAndAptitudes } from "../ui004/project-person.js";
import { createNodeSha256Provider } from "../presets.js";
import { displayNameForPersonIdInSession } from "./competition-engine.js";
import {
  rankBandPlayerLabel,
  tournamentKindPlayerLabel,
  tournamentTimingPlayerLabel,
} from "./competition-player-labels.js";
import type { CompetitionPersistedState } from "./competition-store.js";
import type {
  AnnualRankingYearOptionView,
  CompetitionParticipantLinkView,
  PersonRankHistoryEntryView,
  PromotionResultSummaryView,
  TournamentHistorySummaryView,
  TournamentSeriesHistoryGroupView,
} from "./types.js";

export const EMPTY_OBSERVATION_PERSISTENCE = {
  tournamentHistorySummaries: [] as readonly Record<string, unknown>[],
  annualRankingHistoryStore: { entries: [] } as Record<string, unknown>,
  promotionResultSummaries: [] as readonly Record<string, unknown>[],
  personRankHistoryBundles: [] as readonly Record<string, unknown>[],
};

function provider(): Sha256Provider {
  return createNodeSha256Provider();
}

export function enrichParticipantLinks(
  session: Sprint1RunSession,
  links: readonly CompetitionParticipantLinkView[],
  competitiveRecordByPersonId?: Record<string, Record<string, unknown>>,
): readonly CompetitionParticipantLinkView[] {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  return links.map((link) => {
    const person = session.runtimeState.worldState.persons.find(
      (row) => row.personId === link.personId,
    );
    const record = competitiveRecordByPersonId?.[link.personId] as CompetitiveRecord | undefined;
    const age = person !== undefined ? computeCurrentAge(worldYear, person.birthYear) : null;
    const officialWins = record?.officialWins ?? 0;
    const officialLosses = record?.officialLosses ?? 0;
    const rank = person?.currentRank ?? record?.currentRank ?? null;
    const projected = person !== undefined ? projectPersonStatsAndAptitudes(person) : null;
    return {
      ...link,
      currentRankLabel: rankBandPlayerLabel(typeof rank === "string" ? rank : null),
      ageLabel: age === null ? null : `${age}歳`,
      officialRecordLabel: `${officialWins}勝${officialLosses}敗`,
      stats: projected?.stats ?? null,
      aptitudes: projected?.aptitudes ?? null,
    };
  });
}

export function tournamentHistorySummariesFromState(
  state: CompetitionPersistedState | null,
): readonly TournamentHistorySummaryView[] {
  if (state === null) {
    return [];
  }
  return (state.tournamentHistorySummaries ?? []) as unknown as TournamentHistorySummaryView[];
}

export function annualRankingHistoryStoreFromState(
  state: CompetitionPersistedState | null,
): AnnualRankingHistoryStore {
  if (state === null) {
    return { entries: [] };
  }
  const raw = state.annualRankingHistoryStore;
  if (
    typeof raw !== "object" ||
    raw === null ||
    !Array.isArray((raw as AnnualRankingHistoryStore).entries)
  ) {
    return { entries: [] };
  }
  return raw as unknown as AnnualRankingHistoryStore;
}

export function promotionSummariesFromState(
  state: CompetitionPersistedState | null,
): readonly PromotionResultSummaryView[] {
  if (state === null) {
    return [];
  }
  return (state.promotionResultSummaries ?? []) as unknown as PromotionResultSummaryView[];
}

export function personRankHistoryEntriesFromState(
  state: CompetitionPersistedState | null,
  participantIds: readonly string[],
): readonly PersonRankHistoryEntryView[] {
  if (state === null) {
    return [];
  }
  const session = state.isolatedSession as unknown as Sprint1RunSession;
  const bundles = (state.personRankHistoryBundles ?? []) as unknown as {
    personId: string;
    entries: readonly PersonRankHistoryEntryView[];
  }[];
  const allowed = new Set(participantIds);
  const rows: PersonRankHistoryEntryView[] = [];
  for (const bundle of bundles) {
    if (!allowed.has(bundle.personId)) {
      continue;
    }
    for (const entry of bundle.entries) {
      rows.push({
        ...entry,
        personDisplayName: displayNameForPersonIdInSession(session, entry.personId),
      });
    }
  }
  return rows;
}

export function groupTournamentSeriesHistory(
  summaries: readonly TournamentHistorySummaryView[],
): readonly TournamentSeriesHistoryGroupView[] {
  const groups = new Map<string, TournamentSeriesHistoryGroupView>();
  for (const summary of summaries) {
    const existing = groups.get(summary.seriesKey);
    const edition = {
      tournamentId: summary.tournamentId,
      worldYear: summary.worldYear,
      timingLabel: summary.timingLabel,
      winnerDisplayName: summary.winnerDisplayName,
      winnerPersonId: summary.winnerPersonId,
      participantCount: summary.participantCount,
    };
    if (existing === undefined) {
      groups.set(summary.seriesKey, {
        seriesKey: summary.seriesKey,
        seriesDisplayLabel: summary.seriesDisplayLabel,
        editions: [edition],
      });
    } else {
      groups.set(summary.seriesKey, {
        ...existing,
        editions: [...existing.editions, edition],
      });
    }
  }
  return [...groups.values()];
}

export function buildAnnualRankingYearOptions(
  historyStore: AnnualRankingHistoryStore,
  currentWorldYear: number,
  currentFacts: readonly AnnualRankingDisplayFacts[],
): readonly AnnualRankingYearOptionView[] {
  const years = new Set<number>();
  years.add(currentWorldYear);
  for (const entry of historyStore.entries) {
    years.add(entry.worldYear);
  }
  const minYear = Math.max(1, currentWorldYear - 1);
  const maxYear = currentWorldYear + 1;
  const options: AnnualRankingYearOptionView[] = [];
  for (let year = minYear; year <= maxYear; year += 1) {
    const historyEntry = historyStore.entries.find((entry) => entry.worldYear === year);
    const hasData =
      year === currentWorldYear
        ? currentFacts.length > 0
        : historyEntry !== undefined && historyEntry.rows.length > 0;
    options.push({
      worldYear: year,
      label: year === currentWorldYear ? `${year}年（現在）` : `${year}年`,
      isCurrentWorldYear: year === currentWorldYear,
      hasData,
    });
  }
  return options;
}

export function findScheduleEntryForTournament(
  tournamentId: string,
  worldYear: number,
  buildSchedule: (worldYear: number) => readonly TournamentScheduleReadModelEntry[],
): TournamentScheduleReadModelEntry | null {
  const schedule = buildSchedule(worldYear);
  return schedule.find((entry) => entry.tournamentId === tournamentId) ?? null;
}

export function buildTournamentHistorySummaryOnFinalize(input: {
  state: CompetitionPersistedState;
  winnerPersonId: PersonId;
  participantCount: number;
  scheduleEntry: TournamentScheduleReadModelEntry | null;
}): TournamentHistorySummaryView {
  const session = input.state.isolatedSession as unknown as Sprint1RunSession;
  const entry = input.scheduleEntry;
  const kind = input.state.tournamentKind;
  const targetRank = input.state.targetRank;
  const seriesKey =
    kind === "normal"
      ? buildSeriesKey("normal", targetRank as never)
      : kind === "open"
        ? buildSeriesKey("open")
        : kind === "promotion"
          ? buildSeriesKey("promotion")
          : buildSeriesKey("limited", undefined, entry?.domain);
  const seriesDisplayLabel = resolveTournamentDisplayName(seriesKey);
  const timingLabel =
    entry !== null
      ? tournamentTimingPlayerLabel(entry.month, entry.weekOfMonth)
      : tournamentTimingPlayerLabel(1, 1);
  return {
    seriesKey,
    seriesDisplayLabel,
    tournamentDisplayName: seriesDisplayLabel,
    tournamentId: input.state.tournamentId,
    worldYear: input.state.worldYear,
    timingLabel,
    rankOrCategoryLabel: entry?.targetRank ?? targetRank,
    kindLabel: tournamentKindPlayerLabel(kind) ?? "大会",
    winnerPersonId: input.winnerPersonId,
    winnerDisplayName: displayNameForPersonIdInSession(session, input.winnerPersonId),
    participantCount: input.participantCount,
  };
}

export function appendTournamentHistorySummary(
  prior: readonly Record<string, unknown>[],
  summary: TournamentHistorySummaryView,
): readonly Record<string, unknown>[] {
  const exists = prior.some(
    (row) =>
      (row as { tournamentId?: string }).tournamentId === summary.tournamentId &&
      (row as { worldYear?: number }).worldYear === summary.worldYear,
  );
  if (exists) {
    return prior;
  }
  return [...prior, summary as unknown as Record<string, unknown>];
}

export function upsertAnnualRankingHistoryForFinalize(
  store: AnnualRankingHistoryStore,
  input: {
    worldYear: number;
    ledger: import("@shared-world/simulation-core").AnnualEarningsLedger;
    competitiveRecords: Map<PersonId, CompetitiveRecord>;
  },
  shaProvider: Sha256Provider = provider(),
): AnnualRankingHistoryStore {
  const result = upsertAnnualRankingHistoryEntry(
    store,
    {
      worldYear: input.worldYear,
      ledger: input.ledger,
      competitiveRecords: input.competitiveRecords,
      isFinalized: true,
    },
    shaProvider,
  );
  if (result.kind !== "committed") {
    return store;
  }
  return result.store;
}
