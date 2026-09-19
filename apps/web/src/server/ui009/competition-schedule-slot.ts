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

/** UI009 integration F-rank normal tournament slot for the session world year. */
export function findUi009PlayableScheduleSlot(
  worldYear: number,
): TournamentScheduleReadModelEntry | null {
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

export function ui009PlayableSlotMatchesWorldWeek(
  session: Sprint1RunSession,
  slot: TournamentScheduleReadModelEntry,
): boolean {
  const worldDate = session.runtimeState.worldState.worldDate;
  return slot.absoluteWeek === worldDate.absoluteWeek && slot.worldYear === worldDate.year;
}

export function resolveUi009PlayableScheduleLifecycleIdentity(
  slot: TournamentScheduleReadModelEntry,
  provider: Sha256Provider,
): ScheduleLifecycleIdentity | null {
  const lifecycle = computeScheduleLifecycleIdentity(slot, provider);
  return lifecycle.ok ? lifecycle.value : null;
}
