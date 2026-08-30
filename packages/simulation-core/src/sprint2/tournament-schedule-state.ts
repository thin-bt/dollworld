/**
 * Tournament schedule state: ID allocation commit, lifecycle transitions, rollback discipline.
 */
import type { WorldCalendarConfig } from "../config/types.js";
import type { TournamentId } from "../ids.js";
import { calendarMonthFromOffset, createWorldDate } from "../world-date.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { TOURNAMENT_SCHEDULE_STATE_SCHEMA_VERSION } from "./constants.js";
import {
  classifyChampionshipCycleYear,
  generateSchedulePlan,
} from "./tournament-schedule-plan.js";
import {
  reserveNextTournamentId,
  validateTournamentIdGeneratorState,
} from "./tournament-id-registry.js";
import type {
  PlannedScheduleSlot,
  Sprint2Config,
  TournamentIdGeneratorState,
  TournamentScheduleEntry,
  TournamentScheduleState,
} from "./types.js";

export type CommitSchedulePlanResult =
  | {
      kind: "success";
      scheduleState: TournamentScheduleState;
      generatorState: TournamentIdGeneratorState;
      issues: readonly ValidationIssue[];
    }
  | {
      kind: "failure";
      scheduleState: null;
      generatorState: null;
      issues: readonly ValidationIssue[];
    };

const TERMINAL_LIFECYCLE_STATES = new Set(["merged", "cancelled"]);

function isActiveLifecycle(state: TournamentScheduleEntry["lifecycleState"]): boolean {
  return state === "planned" || state === "scheduled" || state === "postponed";
}

function buildEntry(
  slot: PlannedScheduleSlot,
  tournamentId: TournamentId,
  scheduleOrdinal: number,
  worldYear: number,
  calendarConfig: WorldCalendarConfig,
  championshipCycleClassification: ReturnType<typeof classifyChampionshipCycleYear>,
): TournamentScheduleEntry {
  const month = calendarMonthFromOffset(slot.monthOffset, calendarConfig);
  const worldDate = createWorldDate(
    { year: worldYear, month, weekOfMonth: slot.weekOfMonth },
    calendarConfig,
  );
  const entry: TournamentScheduleEntry = {
    tournamentId,
    scheduleOrdinal,
    seriesKey: slot.seriesKey,
    kind: slot.kind,
    worldYear,
    month: worldDate.month,
    weekOfMonth: worldDate.weekOfMonth,
    absoluteWeek: worldDate.absoluteWeek,
    lifecycleState: "scheduled",
    mergeSourceIds: [],
    championshipCycleClassification,
  };
  if (slot.targetRank !== undefined) {
    entry.targetRank = slot.targetRank;
  }
  if (slot.domain !== undefined) {
    entry.domain = slot.domain;
  }
  return entry;
}

export function commitSchedulePlan(
  config: Sprint2Config,
  calendarConfig: WorldCalendarConfig,
  worldYear: number,
  generatorStateInput: unknown,
): CommitSchedulePlanResult {
  const generatorValidated = validateTournamentIdGeneratorState(generatorStateInput);
  if (!generatorValidated.ok) {
    return {
      kind: "failure",
      scheduleState: null,
      generatorState: null,
      issues: generatorValidated.issues,
    };
  }

  const planResult = generateSchedulePlan(config, calendarConfig, worldYear);
  if (!planResult.ok) {
    return {
      kind: "failure",
      scheduleState: null,
      generatorState: null,
      issues: planResult.issues,
    };
  }

  const championshipClassification = classifyChampionshipCycleYear(worldYear, config.championship);
  const entries: TournamentScheduleEntry[] = [];
  let currentGenerator = generatorValidated.value;

  for (let ordinal = 0; ordinal < planResult.value.length; ordinal += 1) {
    const slot = planResult.value[ordinal]!;
    const reserved = reserveNextTournamentId(currentGenerator);
    if (reserved.kind === "failure") {
      return {
        kind: "failure",
        scheduleState: null,
        generatorState: null,
        issues: reserved.issues,
      };
    }
    currentGenerator = reserved.nextState;
    entries.push(
      buildEntry(
        slot,
        reserved.tournamentId,
        ordinal,
        worldYear,
        calendarConfig,
        championshipClassification,
      ),
    );
  }

  return {
    kind: "success",
    scheduleState: {
      schemaVersion: TOURNAMENT_SCHEDULE_STATE_SCHEMA_VERSION,
      worldYear,
      entries,
    },
    generatorState: currentGenerator,
    issues: [],
  };
}

function findEntryIndex(
  entries: readonly TournamentScheduleEntry[],
  tournamentId: TournamentId,
): number {
  return entries.findIndex((entry) => entry.tournamentId === tournamentId);
}

function findNextSameSeriesSlotIndex(
  entries: readonly TournamentScheduleEntry[],
  sourceIndex: number,
): number | undefined {
  const source = entries[sourceIndex]!;
  for (let index = sourceIndex + 1; index < entries.length; index += 1) {
    const candidate = entries[index]!;
    if (candidate.seriesKey !== source.seriesKey) {
      continue;
    }
    if (candidate.worldYear !== source.worldYear) {
      continue;
    }
    if (!isActiveLifecycle(candidate.lifecycleState)) {
      continue;
    }
    return index;
  }
  return undefined;
}

function cloneEntries(entries: readonly TournamentScheduleEntry[]): TournamentScheduleEntry[] {
  return entries.map((entry) => ({
    ...entry,
    mergeSourceIds: [...entry.mergeSourceIds],
  }));
}

export function applyFailureToStart(
  scheduleState: TournamentScheduleState,
  tournamentId: TournamentId,
): ValidationResult<TournamentScheduleState> {
  const sourceIndex = findEntryIndex(scheduleState.entries, tournamentId);
  if (sourceIndex < 0) {
    return failure([
      {
        path: "/tournamentId",
        message: "tournamentId not found in schedule state",
        actual: tournamentId,
        expected: "existing TournamentId",
      },
    ]);
  }

  const entries = cloneEntries(scheduleState.entries);
  const source = entries[sourceIndex]!;

  if (!isActiveLifecycle(source.lifecycleState)) {
    return failure([
      {
        path: `/entries/${String(sourceIndex)}/lifecycleState`,
        message: "cannot apply failure-to-start from terminal lifecycle state",
        actual: source.lifecycleState,
        expected: "planned|scheduled|postponed",
      },
    ]);
  }

  const targetIndex = findNextSameSeriesSlotIndex(entries, sourceIndex);
  if (targetIndex === undefined) {
    entries[sourceIndex] = {
      ...source,
      lifecycleState: "cancelled",
    };
    return success({
      ...scheduleState,
      entries,
    });
  }

  const target = entries[targetIndex]!;
  if (TERMINAL_LIFECYCLE_STATES.has(target.lifecycleState)) {
    return failure([
      {
        path: `/entries/${String(targetIndex)}/lifecycleState`,
        message: "merge target is terminal and cannot absorb postponed source",
        actual: target.lifecycleState,
        expected: "active lifecycle",
      },
    ]);
  }

  if (target.mergeSourceIds.includes(source.tournamentId)) {
    return failure([
      {
        path: `/entries/${String(targetIndex)}/mergeSourceIds`,
        message: "double absorption rejected: source already merged into target",
        actual: target.mergeSourceIds,
        expected: "unique merge source",
      },
    ]);
  }

  if (source.mergeTargetId !== undefined) {
    return failure([
      {
        path: `/entries/${String(sourceIndex)}/mergeTargetId`,
        message: "source already has merge target",
        actual: source.mergeTargetId,
        expected: "undefined",
      },
    ]);
  }

  entries[sourceIndex] = {
    ...source,
    lifecycleState: "merged",
    mergeTargetId: target.tournamentId,
  };
  entries[targetIndex] = {
    ...target,
    lifecycleState: "postponed",
    mergeSourceIds: [...target.mergeSourceIds, source.tournamentId],
  };

  return success({
    ...scheduleState,
    entries,
  });
}

export function rejectInvalidScheduleTransition(
  scheduleState: TournamentScheduleState,
  tournamentId: TournamentId,
): ValidationResult<null> {
  const index = findEntryIndex(scheduleState.entries, tournamentId);
  if (index < 0) {
    return failure([
      {
        path: "/tournamentId",
        message: "tournamentId not found",
        actual: tournamentId,
        expected: "existing TournamentId",
      },
    ]);
  }
  const entry = scheduleState.entries[index]!;
  if (TERMINAL_LIFECYCLE_STATES.has(entry.lifecycleState)) {
    return failure([
      {
        path: `/entries/${String(index)}/lifecycleState`,
        message: "invalid transition from terminal state",
        actual: entry.lifecycleState,
        expected: "non-terminal",
      },
    ]);
  }
  return success(null);
}
