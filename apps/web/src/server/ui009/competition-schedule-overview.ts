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
  tournamentKindPlayerLabel,
  tournamentLifecyclePlayerLabel,
  tournamentTimingPlayerLabel,
  worldTimePlayerLabel,
} from "./competition-player-labels.js";
import { rankOrCategoryLabelFromScheduleEntry } from "./competition-schedule-overview-labels.js";
import { enrichParticipantLinks } from "./competition-wireframe-observation.js";
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

export { buildAnnualSchedule };

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

function clampViewYear(viewYear: number, currentWorldYear: number): number {
  const minViewYear = Math.max(0, currentWorldYear - 1);
  const maxViewYear = currentWorldYear + 1;
  return Math.min(maxViewYear, Math.max(minViewYear, viewYear));
}

export function buildCompetitionScheduleOverview(
  session: Sprint1RunSession,
  persisted: CompetitionPersistedState | null,
  participantRosterForPlayable: readonly CompetitionParticipantLinkView[],
  participantRosterForActive: readonly CompetitionParticipantLinkView[],
  options?: { viewWorldYear?: number; rosterSession?: Sprint1RunSession },
): CompetitionScheduleOverviewView {
  const rosterSession = options?.rosterSession ?? session;
  const worldDate = session.runtimeState.worldState.worldDate;
  const currentWorldYear = worldDate.year;
  const viewingWorldYear = clampViewYear(options?.viewWorldYear ?? currentWorldYear, currentWorldYear);
  const schedule = buildAnnualSchedule(viewingWorldYear);
  const playableSlot =
    persisted === null && viewingWorldYear === currentWorldYear
      ? findUi009PlayableSlot(currentWorldYear)
      : null;
  const activeTournamentId = persisted?.tournamentId ?? null;

  let playableSelectionKey: string | null = null;
  let activeSelectionKey: string | null = null;

  const entries: CompetitionScheduleEntryView[] = schedule.map((entry) => {
    const selectionKey = selectionKeyFor(entry);
    const isPast =
      viewingWorldYear < currentWorldYear ||
      (viewingWorldYear === currentWorldYear && entry.absoluteWeek < worldDate.absoluteWeek);
    const isCurrentWeek =
      viewingWorldYear === currentWorldYear && entry.absoluteWeek === worldDate.absoluteWeek;
    const isPlayable =
      viewingWorldYear === currentWorldYear &&
      playableSlot !== null &&
      entryMatchesSlot(entry, playableSlot) &&
      persisted === null;
    const isActiveCompetition =
      viewingWorldYear === currentWorldYear &&
      activeTournamentId !== null &&
      entry.tournamentId === activeTournamentId;

    if (isPlayable) {
      playableSelectionKey = selectionKey;
    }
    if (isActiveCompetition) {
      activeSelectionKey = selectionKey;
    }

    let participantLinks: readonly CompetitionParticipantLinkView[] = [];
    if (isPlayable) {
      participantLinks = enrichParticipantLinks(rosterSession, participantRosterForPlayable);
    } else if (isActiveCompetition) {
      participantLinks = enrichParticipantLinks(
        rosterSession,
        participantRosterForActive,
        persisted?.competitiveRecordByPersonId,
      );
    }

    const temporalState = isPast ? "past" : isCurrentWeek ? "current" : "future";

    return {
      selectionKey,
      matrixRowKey: scheduleRowKey(entry),
      month: entry.month,
      weekOfMonth: entry.weekOfMonth,
      absoluteWeek: entry.absoluteWeek,
      kindLabel: tournamentKindPlayerLabel(entry.kind) ?? "大会",
      rankOrCategoryLabel: rankOrCategoryLabelFromScheduleEntry(entry),
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
    worldYear: viewingWorldYear,
    currentWorldYear,
    isViewingCurrentWorldYear: viewingWorldYear === currentWorldYear,
    prevViewYear: viewingWorldYear > Math.max(0, currentWorldYear - 1) ? viewingWorldYear - 1 : null,
    nextViewYear: viewingWorldYear < currentWorldYear + 1 ? viewingWorldYear + 1 : null,
    worldTimeLabel: worldTimePlayerLabel(worldDate.year, worldDate.month, worldDate.weekOfMonth),
    currentAbsoluteWeek: worldDate.absoluteWeek,
    currentWeekColumn: (worldDate.month - 1) * 4 + worldDate.weekOfMonth,
    matrixRowOrder: MATRIX_ROW_ORDER,
    entries,
    playableSelectionKey,
    activeSelectionKey,
  };
}
