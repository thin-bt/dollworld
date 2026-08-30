/**
 * Deterministic annual tournament schedule plan from governed Sprint2Config inputs.
 */
import type { WorldCalendarConfig } from "../config/types.js";
import {
  calendarMonthFromOffset,
  createWorldDate,
  type WeekOfMonth,
} from "../world-date.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  COMPETITION_DOMAIN_KEYS,
  NORMAL_RANK_KEYS,
  TOURNAMENT_KINDS,
  type ChampionshipCycleClassification,
} from "./constants.js";
import type {
  PlannedScheduleSlot,
  Sprint2Config,
  TournamentKind,
  TournamentSeriesKey,
} from "./types.js";

const KIND_ORDER: readonly TournamentKind[] = TOURNAMENT_KINDS;

export function buildSeriesKey(
  kind: TournamentKind,
  targetRank?: (typeof NORMAL_RANK_KEYS)[number],
  domain?: (typeof COMPETITION_DOMAIN_KEYS)[number],
): TournamentSeriesKey {
  if (kind === "normal") {
    return `normal:${targetRank ?? "?"}`;
  }
  if (kind === "limited") {
    return `limited:${domain ?? "?"}`;
  }
  return kind;
}

export function classifyChampionshipCycleYear(
  worldYear: number,
  championship: Sprint2Config["championship"],
): ChampionshipCycleClassification {
  const { championshipCycleYears, cycleOriginWorldYear } = championship;
  if (worldYear < cycleOriginWorldYear) {
    return "non_championship_year";
  }
  const offset = worldYear - cycleOriginWorldYear;
  if (offset % championshipCycleYears === 0) {
    return "championship_year";
  }
  return "non_championship_year";
}

function assertWeekOfMonth(value: number, path: string, issues: ValidationIssue[]): WeekOfMonth | undefined {
  if (!Number.isSafeInteger(value) || value < 1 || value > 4) {
    issues.push({
      path,
      message: "weekOfMonth must be an integer 1..4",
      actual: value,
      expected: "1..4",
    });
    return undefined;
  }
  return value as WeekOfMonth;
}

function collectPlannedSlots(config: Sprint2Config): PlannedScheduleSlot[] {
  const schedule = config.schedule;
  const slots: PlannedScheduleSlot[] = [];

  for (const rank of NORMAL_RANK_KEYS) {
    for (const monthOffset of schedule.normalMonthOffsetsByRank[rank]) {
      slots.push({
        seriesKey: buildSeriesKey("normal", rank),
        kind: "normal",
        targetRank: rank,
        monthOffset,
        weekOfMonth: schedule.weekByKind.normal as WeekOfMonth,
      });
    }
  }

  for (const monthOffset of schedule.openMonthOffsets) {
    slots.push({
      seriesKey: buildSeriesKey("open"),
      kind: "open",
      monthOffset,
      weekOfMonth: schedule.weekByKind.open as WeekOfMonth,
    });
  }

  for (const domain of COMPETITION_DOMAIN_KEYS) {
    for (const monthOffset of schedule.limitedMonthOffsets[domain]) {
      slots.push({
        seriesKey: buildSeriesKey("limited", undefined, domain),
        kind: "limited",
        domain,
        monthOffset,
        weekOfMonth: schedule.weekByKind.limited as WeekOfMonth,
      });
    }
  }

  for (const monthOffset of schedule.promotionMonthOffsets) {
    slots.push({
      seriesKey: buildSeriesKey("promotion"),
      kind: "promotion",
      monthOffset,
      weekOfMonth: schedule.weekByKind.promotion as WeekOfMonth,
    });
  }

  return slots;
}

function comparePlannedSlots(a: PlannedScheduleSlot, b: PlannedScheduleSlot): number {
  if (a.monthOffset !== b.monthOffset) {
    return a.monthOffset - b.monthOffset;
  }
  if (a.weekOfMonth !== b.weekOfMonth) {
    return a.weekOfMonth - b.weekOfMonth;
  }
  const kindDiff = KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind);
  if (kindDiff !== 0) {
    return kindDiff;
  }
  if (a.kind === "limited" && b.kind === "limited") {
    return COMPETITION_DOMAIN_KEYS.indexOf(a.domain!) - COMPETITION_DOMAIN_KEYS.indexOf(b.domain!);
  }
  if (a.kind === "normal" && b.kind === "normal") {
    return NORMAL_RANK_KEYS.indexOf(a.targetRank!) - NORMAL_RANK_KEYS.indexOf(b.targetRank!);
  }
  return 0;
}

export function validateSchedulePlanInputs(
  config: Sprint2Config,
  calendarConfig: WorldCalendarConfig,
  worldYear: number,
): ValidationResult<readonly PlannedScheduleSlot[]> {
  const issues: ValidationIssue[] = [];

  if (!Number.isSafeInteger(worldYear) || worldYear < 1) {
    issues.push({
      path: "/worldYear",
      message: "worldYear must be a safe integer >= 1",
      actual: worldYear,
      expected: ">= 1",
    });
  }

  const weekByKind = config.schedule.weekByKind;
  assertWeekOfMonth(weekByKind.normal, "/schedule/weekByKind/normal", issues);
  assertWeekOfMonth(weekByKind.open, "/schedule/weekByKind/open", issues);
  assertWeekOfMonth(weekByKind.limited, "/schedule/weekByKind/limited", issues);
  assertWeekOfMonth(weekByKind.promotion, "/schedule/weekByKind/promotion", issues);

  const slots = collectPlannedSlots(config);
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index]!;
    if (slot.monthOffset < 0 || slot.monthOffset > 11) {
      issues.push({
        path: `/slots/${String(index)}/monthOffset`,
        message: "monthOffset must be 0..11",
        actual: slot.monthOffset,
        expected: "0..11",
      });
    }
    try {
      const month = calendarMonthFromOffset(slot.monthOffset, calendarConfig);
      createWorldDate(
        { year: worldYear, month, weekOfMonth: slot.weekOfMonth },
        calendarConfig,
      );
    } catch (error) {
      issues.push({
        path: `/slots/${String(index)}`,
        message: `slot resolves to invalid world date: ${error instanceof Error ? error.message : String(error)}`,
        actual: slot,
        expected: "valid WorldDate",
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const sorted = [...slots].sort(comparePlannedSlots);
  return success(sorted);
}

export function generateSchedulePlan(
  config: Sprint2Config,
  calendarConfig: WorldCalendarConfig,
  worldYear: number,
): ValidationResult<readonly PlannedScheduleSlot[]> {
  return validateSchedulePlanInputs(config, calendarConfig, worldYear);
}
