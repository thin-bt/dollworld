import {
  buildTournamentScheduleReadModel,
  commitSchedulePlan,
  computeScheduleLifecycleIdentity,
  createInitialTournamentIdGeneratorState,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type ScheduleLifecycleIdentity,
  type Sha256Provider,
  type Sprint1RunSession,
  type TournamentScheduleReadModelEntry,
} from "@shared-world/simulation-core";
import { tinyScheduleConfig } from "./competition-engine-schedule-config.js";
import type { CompetitionSessionStore } from "./competition-store.js";
import { tournamentHistorySummariesFromState } from "./competition-wireframe-observation.js";

export function buildUi009IntegrationSchedule(
  worldYear: number,
): readonly TournamentScheduleReadModelEntry[] {
  const config = tinyScheduleConfig();
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

/** UI009 integration F-rank normal tournament slots for the session world year (chronological). */
export function listUi009PlayableScheduleSlots(
  worldYear: number,
): readonly TournamentScheduleReadModelEntry[] {
  return buildUi009IntegrationSchedule(worldYear)
    .filter((entry) => entry.kind === "normal" && entry.targetRank === "F")
    .sort((left, right) => left.absoluteWeek - right.absoluteWeek);
}

/** First F-rank normal slot (legacy callers). */
export function findUi009PlayableScheduleSlot(
  worldYear: number,
): TournamentScheduleReadModelEntry | null {
  return listUi009PlayableScheduleSlots(worldYear)[0] ?? null;
}

export function ui009PlayableSlotMatchesWorldWeek(
  session: Sprint1RunSession,
  slot: TournamentScheduleReadModelEntry,
): boolean {
  const worldDate = session.runtimeState.worldState.worldDate;
  return slot.absoluteWeek === worldDate.absoluteWeek && slot.worldYear === worldDate.year;
}

export function isUi009ScheduleSlotDue(
  session: Sprint1RunSession,
  slot: TournamentScheduleReadModelEntry,
): boolean {
  const worldDate = session.runtimeState.worldState.worldDate;
  if (slot.worldYear !== worldDate.year) {
    return slot.worldYear < worldDate.year;
  }
  return slot.absoluteWeek <= worldDate.absoluteWeek;
}

export function isUi009ScheduleSlotCompleted(
  store: CompetitionSessionStore,
  slot: TournamentScheduleReadModelEntry,
): boolean {
  const summaries = tournamentHistorySummariesFromState(store.state);
  if (
    summaries.some(
      (row) => row.tournamentId === slot.tournamentId && row.worldYear === slot.worldYear,
    )
  ) {
    return true;
  }
  const state = store.state;
  return (
    state !== null &&
    state.phase === "finished" &&
    state.tournamentId === slot.tournamentId &&
    state.worldYear === slot.worldYear
  );
}

export function listUi009DueUnprocessedScheduleSlots(
  session: Sprint1RunSession,
  store: CompetitionSessionStore,
): readonly TournamentScheduleReadModelEntry[] {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const historyYears = tournamentHistorySummariesFromState(store.state).map((row) => row.worldYear);
  const minYear = historyYears.length > 0 ? Math.min(worldYear, ...historyYears) : worldYear;
  const due: TournamentScheduleReadModelEntry[] = [];
  for (let year = minYear; year <= worldYear; year += 1) {
    for (const slot of listUi009PlayableScheduleSlots(year)) {
      if (isUi009ScheduleSlotDue(session, slot) && !isUi009ScheduleSlotCompleted(store, slot)) {
        due.push(slot);
      }
    }
  }
  return due.sort((left, right) => left.absoluteWeek - right.absoluteWeek);
}

export function resolveUi009PlayableScheduleLifecycleIdentity(
  slot: TournamentScheduleReadModelEntry,
  provider: Sha256Provider,
): ScheduleLifecycleIdentity | null {
  const lifecycle = computeScheduleLifecycleIdentity(slot, provider);
  return lifecycle.ok ? lifecycle.value : null;
}
