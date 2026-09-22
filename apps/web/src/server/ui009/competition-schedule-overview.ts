/**
 * Annual tournament schedule overview for player-facing competition UI (canonical Sprint2 schedule).
 */
import {
  buildTournamentScheduleReadModel,
  commitSchedulePlan,
  createDefaultSprint2ConfigInput,
  createInitialTournamentIdGeneratorState,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  resolveTournamentDisplayName,
  type Sprint1RunSession,
  type TournamentScheduleReadModelEntry,
} from "@shared-world/simulation-core";
import {
  isUi009ScheduleSlotCompleted,
  listUi009PlayableScheduleSlots,
} from "./competition-schedule-slot.js";
import {
  tournamentKindPlayerLabel,
  tournamentLifecyclePlayerLabel,
  tournamentTimingPlayerLabel,
  worldTimePlayerLabel,
} from "./competition-player-labels.js";
import { rankOrCategoryLabelFromScheduleEntry } from "./competition-schedule-overview-labels.js";
import { enrichParticipantLinks } from "./competition-wireframe-observation.js";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import type {
  CompetitionParticipantLinkView,
  CompetitionScheduleEntryView,
  CompetitionScheduleOverviewView,
} from "./types.js";

const MATRIX_ROW_ORDER = [
  "F",
  "E",
  "D",
  "C",
  "B",
  "OPEN",
  "unarmed",
  "sword",
  "magic",
  "PROMO",
] as const;

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

function lifecycleLabelForScheduleEntry(
  entry: TournamentScheduleReadModelEntry,
  persisted: CompetitionPersistedState | null,
  storeForCompletion: CompetitionSessionStore | null,
  isPast: boolean,
): string {
  const integrationSlot = listUi009PlayableScheduleSlots(entry.worldYear).find((slot) =>
    entryMatchesSlot(entry, slot),
  );
  const completedByIntegration =
    integrationSlot !== undefined &&
    storeForCompletion !== null &&
    isUi009ScheduleSlotCompleted(storeForCompletion, integrationSlot);
  const completedByHistory =
    persisted !== null &&
    (persisted.tournamentHistorySummaries ?? []).some(
      (row) =>
        (row as { tournamentId?: string }).tournamentId === entry.tournamentId &&
        (row as { worldYear?: number }).worldYear === entry.worldYear,
    );
  if (
    completedByIntegration ||
    completedByHistory ||
    (isPast && persisted?.tournamentId === entry.tournamentId)
  ) {
    return "終了";
  }
  return tournamentLifecyclePlayerLabel(entry.lifecycleState);
}

export function buildCompetitionScheduleOverview(
  session: Sprint1RunSession,
  persisted: CompetitionPersistedState | null,
  participantRosterForPlayable: readonly CompetitionParticipantLinkView[],
  participantRosterForActive: readonly CompetitionParticipantLinkView[],
  options?: {
    viewWorldYear?: number;
    rosterSession?: Sprint1RunSession;
    completionStore?: CompetitionSessionStore | null;
  },
): CompetitionScheduleOverviewView {
  const rosterSession = options?.rosterSession ?? session;
  const worldDate = session.runtimeState.worldState.worldDate;
  const currentWorldYear = worldDate.year;
  const viewingWorldYear = clampViewYear(
    options?.viewWorldYear ?? currentWorldYear,
    currentWorldYear,
  );
  const schedule = buildAnnualSchedule(viewingWorldYear);
  const integrationSlots =
    viewingWorldYear === currentWorldYear ? listUi009PlayableScheduleSlots(currentWorldYear) : [];
  const completionStore =
    options?.completionStore ??
    (persisted === null ? null : { schemaVersion: "0.1.0" as const, state: persisted });
  const activeTournamentId = persisted?.tournamentId ?? null;
  const focusPlayableIntegrationSlot =
    persisted === null && viewingWorldYear === currentWorldYear
      ? (integrationSlots.find(
          (slot) =>
            completionStore === null || !isUi009ScheduleSlotCompleted(completionStore, slot),
        ) ?? null)
      : null;

  let playableSelectionKey: string | null = null;
  let activeSelectionKey: string | null = null;

  const entries: CompetitionScheduleEntryView[] = schedule.map((entry) => {
    const selectionKey = selectionKeyFor(entry);
    const isPast =
      viewingWorldYear < currentWorldYear ||
      (viewingWorldYear === currentWorldYear && entry.absoluteWeek < worldDate.absoluteWeek);
    const isCurrentWeek =
      viewingWorldYear === currentWorldYear && entry.absoluteWeek === worldDate.absoluteWeek;
    const integrationSlot = integrationSlots.find((slot) => entryMatchesSlot(entry, slot));
    const integrationCompleted =
      integrationSlot !== undefined &&
      completionStore !== null &&
      isUi009ScheduleSlotCompleted(completionStore, integrationSlot);
    const isPlayable =
      viewingWorldYear === currentWorldYear &&
      integrationSlot !== undefined &&
      !integrationCompleted &&
      (focusPlayableIntegrationSlot === null ||
        entryMatchesSlot(entry, focusPlayableIntegrationSlot)) &&
      (persisted === null || persisted.tournamentId === entry.tournamentId);
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
      tournamentDisplayName: resolveTournamentDisplayName(entry.seriesKey),
      month: entry.month,
      weekOfMonth: entry.weekOfMonth,
      absoluteWeek: entry.absoluteWeek,
      kindLabel: tournamentKindPlayerLabel(entry.kind) ?? "大会",
      rankOrCategoryLabel: rankOrCategoryLabelFromScheduleEntry(entry),
      lifecycleStateLabel: lifecycleLabelForScheduleEntry(
        entry,
        persisted,
        completionStore,
        isPast,
      ),
      timingLabel: tournamentTimingPlayerLabel(entry.month, entry.weekOfMonth),
      temporalState,
      isPlayable,
      isActiveCompetition,
      participantLinks,
      participantCountLabel: participantLinks.length > 0 ? `${participantLinks.length}名` : null,
    };
  });

  return {
    worldYear: viewingWorldYear,
    currentWorldYear,
    isViewingCurrentWorldYear: viewingWorldYear === currentWorldYear,
    prevViewYear:
      viewingWorldYear > Math.max(0, currentWorldYear - 1) ? viewingWorldYear - 1 : null,
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
