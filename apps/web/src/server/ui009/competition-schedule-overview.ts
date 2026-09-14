/**
 * Annual tournament schedule overview for player-facing competition UI (canonical Sprint2 schedule).
 */
import {
  buildTournamentScheduleReadModel,
  commitSchedulePlan,
  createDefaultSprint2ConfigInput,
  createInitialTournamentIdGeneratorState,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type Sprint1RunSession,
  type TournamentScheduleReadModelEntry,
} from "@shared-world/simulation-core";
import { tinyScheduleConfig } from "./competition-engine-schedule-config.js";
import {
  limitedDomainPlayerLabel,
  rankBandPlayerLabel,
  tournamentKindPlayerLabel,
  tournamentLifecyclePlayerLabel,
  tournamentTimingPlayerLabel,
  worldTimePlayerLabel,
} from "./competition-player-labels.js";
import type { CompetitionPersistedState } from "./competition-store.js";
import type {
  CompetitionParticipantLinkView,
  CompetitionScheduleEntryView,
  CompetitionScheduleOverviewView,
} from "./types.js";

const MATRIX_ROW_ORDER = ["F", "E", "D", "C", "B", "OPEN", "unarmed", "sword", "magic", "PROMO"] as const;

function scheduleRowKey(entry: TournamentScheduleReadModelEntry): string {
  if (entry.kind === "normal" && entry.targetRank !== undefined) {
    return entry.targetRank;
  }
  if (entry.kind === "open") {
    return "OPEN";
  }
  if (entry.kind === "promotion") {
    return "PROMO";
  }
  if (entry.kind === "limited" && entry.domain !== undefined) {
    return entry.domain;
  }
  return entry.kind;
}

function rankOrCategoryLabel(entry: TournamentScheduleReadModelEntry): string {
  if (entry.kind === "normal") {
    return rankBandPlayerLabel(entry.targetRank ?? null) ?? "通常";
  }
  if (entry.kind === "open") {
    return "A・Sオープン";
  }
  if (entry.kind === "promotion") {
    return "昇格戦";
  }
  if (entry.kind === "limited") {
    const domain = limitedDomainPlayerLabel(entry.domain);
    return domain !== null ? `${domain}限定` : "限定大会";
  }
  return tournamentKindPlayerLabel(entry.kind) ?? "大会";
}

function buildAnnualSchedule(worldYear: number): readonly TournamentScheduleReadModelEntry[] {
  const config = createDefaultSprint2ConfigInput();
  const generator = createInitialTournamentIdGeneratorState();
  if (!generator.ok) {
    return [];
  }
  const committed = commitSchedulePlan(
    config,
    DEFAULT_WORLD_CALENDAR_CONFIG,
    worldYear,
    generator.value,
  );
  if (committed.kind !== "success") {
    return [];
  }
  return buildTournamentScheduleReadModel(committed.scheduleState);
}

function findUi009PlayableSlot(worldYear: number): TournamentScheduleReadModelEntry | null {
  const config = tinyScheduleConfig();
  const generator = createInitialTournamentIdGeneratorState();
  if (!generator.ok) {
    return null;
  }
  const committed = commitSchedulePlan(
    config,
    DEFAULT_WORLD_CALENDAR_CONFIG,
    worldYear,
    generator.value,
  );
  if (committed.kind !== "success") {
    return null;
  }
  const schedule = buildTournamentScheduleReadModel(committed.scheduleState);
  return schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F") ?? null;
}

function entryMatchesSlot(
  entry: TournamentScheduleReadModelEntry,
  slot: TournamentScheduleReadModelEntry,
): boolean {
  return (
    entry.kind === slot.kind &&
    entry.targetRank === slot.targetRank &&
    entry.domain === slot.domain &&
    entry.month === slot.month &&
    entry.weekOfMonth === slot.weekOfMonth
  );
}

function selectionKeyFor(entry: TournamentScheduleReadModelEntry): string {
  return String(entry.scheduleOrdinal);
}

export function buildCompetitionScheduleOverview(
  session: Sprint1RunSession,
  persisted: CompetitionPersistedState | null,
  participantRosterForPlayable: readonly CompetitionParticipantLinkView[],
  participantRosterForActive: readonly CompetitionParticipantLinkView[],
): CompetitionScheduleOverviewView {
  const worldDate = session.runtimeState.worldState.worldDate;
  const worldYear = worldDate.year;
  const schedule = buildAnnualSchedule(worldYear);
  const playableSlot = persisted === null ? findUi009PlayableSlot(worldYear) : null;
  const activeTournamentId = persisted?.tournamentId ?? null;

  let playableSelectionKey: string | null = null;
  let activeSelectionKey: string | null = null;

  const entries: CompetitionScheduleEntryView[] = schedule.map((entry) => {
    const selectionKey = selectionKeyFor(entry);
    const isPast = entry.absoluteWeek < worldDate.absoluteWeek;
    const isCurrentWeek = entry.absoluteWeek === worldDate.absoluteWeek;
    const isPlayable =
      playableSlot !== null && entryMatchesSlot(entry, playableSlot) && persisted === null;
    const isActiveCompetition = activeTournamentId !== null && entry.tournamentId === activeTournamentId;

    if (isPlayable) {
      playableSelectionKey = selectionKey;
    }
    if (isActiveCompetition) {
      activeSelectionKey = selectionKey;
    }

    let participantLinks: readonly CompetitionParticipantLinkView[] = [];
    if (isPlayable) {
      participantLinks = participantRosterForPlayable;
    } else if (isActiveCompetition) {
      participantLinks = participantRosterForActive;
    }

    const temporalState = isPast ? "past" : isCurrentWeek ? "current" : "future";

    return {
      selectionKey,
      matrixRowKey: scheduleRowKey(entry),
      month: entry.month,
      weekOfMonth: entry.weekOfMonth,
      absoluteWeek: entry.absoluteWeek,
      kindLabel: tournamentKindPlayerLabel(entry.kind) ?? "大会",
      rankOrCategoryLabel: rankOrCategoryLabel(entry),
      lifecycleStateLabel: tournamentLifecyclePlayerLabel(entry.lifecycleState),
      timingLabel: tournamentTimingPlayerLabel(entry.month, entry.weekOfMonth),
      temporalState,
      isPlayable,
      isActiveCompetition,
      participantLinks,
      participantCountLabel:
        participantLinks.length > 0 ? `${participantLinks.length}名` : null,
    };
  });

  return {
    worldYear,
    worldTimeLabel: worldTimePlayerLabel(worldDate.year, worldDate.month, worldDate.weekOfMonth),
    currentAbsoluteWeek: worldDate.absoluteWeek,
    currentWeekColumn: (worldDate.month - 1) * 4 + worldDate.weekOfMonth,
    matrixRowOrder: MATRIX_ROW_ORDER,
    entries,
    playableSelectionKey,
    activeSelectionKey,
  };
}
