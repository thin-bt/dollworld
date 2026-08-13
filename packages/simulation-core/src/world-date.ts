/**
 * World calendar date and absolute-week conversions (01 mini-spec / CAL-JAN-SYNC).
 * Uses no host Date / wall-clock APIs.
 * Month progression and year boundaries are derived from WorldCalendarConfig.
 */

import type { WorldCalendarConfig } from "./config/types.js";

export type WorldMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type WeekOfMonth = 1 | 2 | 3 | 4;

export type WorldDate = {
  year: number;
  month: WorldMonth;
  weekOfMonth: WeekOfMonth;
  absoluteWeek: number;
};

/** Default new-run calendar (CAL-JAN): year starts in January week 1. */
export const DEFAULT_WORLD_CALENDAR_CONFIG: WorldCalendarConfig = {
  monthsPerWorldYear: 12,
  weeksPerMonth: 4,
  worldYearStartMonth: 1,
  worldYearStartWeek: 1,
};

/**
 * Chronological month order within a world year, starting at config.worldYearStartMonth.
 * Default config → [1,2,3,4,5,6,7,8,9,10,11,12].
 */
export function worldMonthOrder(config: WorldCalendarConfig): readonly WorldMonth[] {
  assertWorldCalendarConfig(config);
  const order: WorldMonth[] = [];
  for (let offset = 0; offset < config.monthsPerWorldYear; offset += 1) {
    order.push(calendarMonthFromOffset(offset, config));
  }
  return order;
}

/**
 * @deprecated Use {@link worldMonthOrder} with a validated WorldCalendarConfig.
 * Kept only as the default-January order alias for migration; not April-based.
 */
export const WORLD_MONTH_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export function monthOffsetFromYearStart(month: number, config: WorldCalendarConfig): number {
  assertWorldCalendarConfig(config);
  assertSafeInteger(month, "month");
  if (!isWorldMonth(month)) {
    throw new Error(`month must be a valid calendar month 1..12 (got ${String(month)})`);
  }
  return (
    (month - config.worldYearStartMonth + config.monthsPerWorldYear) % config.monthsPerWorldYear
  );
}

export function calendarMonthFromOffset(offset: number, config: WorldCalendarConfig): WorldMonth {
  assertWorldCalendarConfig(config);
  assertSafeInteger(offset, "offset");
  if (offset < 0 || offset >= config.monthsPerWorldYear) {
    throw new Error(
      `offset must be 0..${String(config.monthsPerWorldYear - 1)} (got ${String(offset)})`,
    );
  }
  const month = ((config.worldYearStartMonth - 1 + offset) % config.monthsPerWorldYear) + 1;
  return month as WorldMonth;
}

export function weeksPerWorldYear(config: WorldCalendarConfig): number {
  assertWorldCalendarConfig(config);
  const weeks = config.monthsPerWorldYear * config.weeksPerMonth;
  assertSafeInteger(weeks, "weeksPerWorldYear");
  return weeks;
}

export function yearStartDate(worldYear: number, config: WorldCalendarConfig): WorldDate {
  assertWorldCalendarConfig(config);
  return createWorldDate(
    {
      year: worldYear,
      month: config.worldYearStartMonth,
      weekOfMonth: config.worldYearStartWeek,
    },
    config,
  );
}

export function createInitialWorldDate(config: WorldCalendarConfig): WorldDate {
  return yearStartDate(1, config);
}

export function createWorldDate(
  input: {
    year: number;
    month: number;
    weekOfMonth: number;
  },
  config: WorldCalendarConfig,
): WorldDate {
  return fromAbsoluteWeek(
    toAbsoluteWeek(input.year, input.month, input.weekOfMonth, config),
    config,
  );
}

export function validateWorldDate(date: WorldDate, config: WorldCalendarConfig): void {
  assertWorldCalendarConfig(config);
  assertSafeInteger(date.absoluteWeek, "absoluteWeek");
  if (date.absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(date.absoluteWeek)})`);
  }

  const expected = toAbsoluteWeek(date.year, date.month, date.weekOfMonth, config);
  if (date.absoluteWeek !== expected) {
    throw new Error(
      `WorldDate fields are inconsistent: absoluteWeek=${String(date.absoluteWeek)} expected ${String(expected)}`,
    );
  }

  const roundTrip = fromAbsoluteWeek(date.absoluteWeek, config);
  if (
    roundTrip.year !== date.year ||
    roundTrip.month !== date.month ||
    roundTrip.weekOfMonth !== date.weekOfMonth
  ) {
    throw new Error("WorldDate fields are inconsistent with absoluteWeek");
  }
}

export function toAbsoluteWeek(
  year: number,
  month: number,
  weekOfMonth: number,
  config: WorldCalendarConfig,
): number {
  assertWorldCalendarConfig(config);
  assertSafeInteger(year, "year");
  if (year < 1) {
    throw new Error(`year must be >= 1 (got ${String(year)})`);
  }
  assertSafeInteger(month, "month");
  if (!isWorldMonth(month)) {
    throw new Error(`month must be a valid calendar month 1..12 (got ${String(month)})`);
  }
  assertSafeInteger(weekOfMonth, "weekOfMonth");
  if (!isWeekOfMonth(weekOfMonth)) {
    throw new Error(`weekOfMonth must be 1..4 (got ${String(weekOfMonth)})`);
  }

  const monthOffset = monthOffsetFromYearStart(month, config);
  const weeksYear = weeksPerWorldYear(config);
  const yearTerm = (year - 1) * weeksYear;
  assertSafeInteger(yearTerm, "absoluteWeek");
  const monthTerm = monthOffset * config.weeksPerMonth;
  assertSafeInteger(monthTerm, "absoluteWeek");
  const absoluteWeek = yearTerm + monthTerm + (weekOfMonth - 1);
  assertSafeInteger(absoluteWeek, "absoluteWeek");
  if (absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(absoluteWeek)})`);
  }
  return absoluteWeek;
}

export function fromAbsoluteWeek(absoluteWeek: number, config: WorldCalendarConfig): WorldDate {
  assertWorldCalendarConfig(config);
  assertSafeInteger(absoluteWeek, "absoluteWeek");
  if (absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(absoluteWeek)})`);
  }

  const weeksYear = weeksPerWorldYear(config);
  const year = Math.floor(absoluteWeek / weeksYear) + 1;
  const rem = absoluteWeek % weeksYear;
  const monthOffset = Math.floor(rem / config.weeksPerMonth);
  const weekOfMonth = ((rem % config.weeksPerMonth) + 1) as WeekOfMonth;
  const month = calendarMonthFromOffset(monthOffset, config);
  return {
    year,
    month,
    weekOfMonth,
    absoluteWeek,
  };
}

export function advanceOneWeek(date: WorldDate, config: WorldCalendarConfig): WorldDate {
  validateWorldDate(date, config);
  const nextAbsolute = date.absoluteWeek + 1;
  assertSafeInteger(nextAbsolute, "absoluteWeek");
  return fromAbsoluteWeek(nextAbsolute, config);
}

export function advanceWeeks(
  date: WorldDate,
  weeks: number,
  config: WorldCalendarConfig,
): WorldDate {
  validateWorldDate(date, config);
  assertSafeInteger(weeks, "weeks");
  if (weeks < 0) {
    throw new Error(`weeks must be >= 0 (got ${String(weeks)})`);
  }
  const nextAbsolute = date.absoluteWeek + weeks;
  assertSafeInteger(nextAbsolute, "absoluteWeek");
  return fromAbsoluteWeek(nextAbsolute, config);
}

export function isSameWorldDate(a: WorldDate, b: WorldDate): boolean {
  return a.absoluteWeek === b.absoluteWeek;
}

/** True when date is the configured world-year start month week 1. */
export function isWorldYearStartWeek(date: WorldDate, config: WorldCalendarConfig): boolean {
  assertWorldCalendarConfig(config);
  return (
    date.month === config.worldYearStartMonth && date.weekOfMonth === config.worldYearStartWeek
  );
}

/**
 * True when date is the final week of a world year
 * (week 4 of the month immediately before worldYearStartMonth).
 */
export function isWorldYearEndWeek(date: WorldDate, config: WorldCalendarConfig): boolean {
  assertWorldCalendarConfig(config);
  const endMonth = previousCalendarMonth(config.worldYearStartMonth, config);
  return date.month === endMonth && date.weekOfMonth === config.weeksPerMonth;
}

function previousCalendarMonth(month: number, config: WorldCalendarConfig): WorldMonth {
  const prev = month === 1 ? config.monthsPerWorldYear : month - 1;
  return prev as WorldMonth;
}

export function assertWorldCalendarConfig(config: WorldCalendarConfig): void {
  if (
    config.monthsPerWorldYear !== 12 ||
    config.weeksPerMonth !== 4 ||
    config.worldYearStartWeek !== 1
  ) {
    throw new Error("WorldCalendarConfig fixed fields must be months=12, weeks=4, startWeek=1");
  }
  assertSafeInteger(config.worldYearStartMonth, "worldYearStartMonth");
  if (config.worldYearStartMonth < 1 || config.worldYearStartMonth > 12) {
    throw new Error(
      `worldYearStartMonth must be 1..12 (got ${String(config.worldYearStartMonth)})`,
    );
  }
}

function isWorldMonth(value: number): value is WorldMonth {
  return Number.isSafeInteger(value) && value >= 1 && value <= 12;
}

function isWeekOfMonth(value: number): value is WeekOfMonth {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function assertSafeInteger(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer (got ${String(value)})`);
  }
}
