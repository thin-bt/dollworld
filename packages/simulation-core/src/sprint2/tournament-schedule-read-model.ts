/**
 * Observation schedule read-model for downstream tournament schedule UI (S02-002 handoff).
 */
import type {
  TournamentScheduleEntry,
  TournamentScheduleReadModelEntry,
  TournamentScheduleState,
} from "./types.js";

export function toScheduleReadModelEntry(
  entry: TournamentScheduleEntry,
): TournamentScheduleReadModelEntry {
  const readModel: TournamentScheduleReadModelEntry = {
    tournamentId: entry.tournamentId,
    seriesKey: entry.seriesKey,
    worldYear: entry.worldYear,
    month: entry.month,
    weekOfMonth: entry.weekOfMonth,
    absoluteWeek: entry.absoluteWeek,
    kind: entry.kind,
    lifecycleState: entry.lifecycleState,
    mergeSourceIds: entry.mergeSourceIds,
    scheduleOrdinal: entry.scheduleOrdinal,
    championshipCycleClassification: entry.championshipCycleClassification,
  };
  if (entry.targetRank !== undefined) {
    readModel.targetRank = entry.targetRank;
  }
  if (entry.domain !== undefined) {
    readModel.domain = entry.domain;
  }
  if (entry.mergeTargetId !== undefined) {
    readModel.mergeTargetId = entry.mergeTargetId;
  }
  return readModel;
}

export function buildTournamentScheduleReadModel(
  scheduleState: TournamentScheduleState,
): readonly TournamentScheduleReadModelEntry[] {
  return scheduleState.entries
    .map(toScheduleReadModelEntry)
    .sort((a, b) => a.scheduleOrdinal - b.scheduleOrdinal);
}
