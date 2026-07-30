/**
 * World calendar date and absolute-week conversions (01 mini-spec).
 * Uses no host Date / wall-clock APIs.
 */

export const WORLD_MONTH_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3] as const;

export type WorldMonth = (typeof WORLD_MONTH_ORDER)[number];
export type WeekOfMonth = 1 | 2 | 3 | 4;

export type WorldDate = {
  year: number;
  month: WorldMonth;
  weekOfMonth: WeekOfMonth;
  absoluteWeek: number;
};

const WEEKS_PER_YEAR = 48;
const WEEKS_PER_MONTH = 4;

export function createInitialWorldDate(): WorldDate {
  return createWorldDate({ year: 1, month: 4, weekOfMonth: 1 });
}

export function createWorldDate(input: {
  year: number;
  month: number;
  weekOfMonth: number;
}): WorldDate {
  return fromAbsoluteWeek(toAbsoluteWeek(input.year, input.month, input.weekOfMonth));
}

export function validateWorldDate(date: WorldDate): void {
  assertSafeInteger(date.absoluteWeek, "absoluteWeek");
  if (date.absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(date.absoluteWeek)})`);
  }

  const expected = toAbsoluteWeek(date.year, date.month, date.weekOfMonth);
  if (date.absoluteWeek !== expected) {
    throw new Error(
      `WorldDate fields are inconsistent: absoluteWeek=${String(date.absoluteWeek)} expected ${String(expected)}`,
    );
  }

  const roundTrip = fromAbsoluteWeek(date.absoluteWeek);
  if (
    roundTrip.year !== date.year ||
    roundTrip.month !== date.month ||
    roundTrip.weekOfMonth !== date.weekOfMonth
  ) {
    throw new Error("WorldDate fields are inconsistent with absoluteWeek");
  }
}

export function toAbsoluteWeek(year: number, month: number, weekOfMonth: number): number {
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

  const monthIndex = WORLD_MONTH_ORDER.indexOf(month);
  const absoluteWeek =
    (year - 1) * WEEKS_PER_YEAR + monthIndex * WEEKS_PER_MONTH + (weekOfMonth - 1);
  assertSafeInteger(absoluteWeek, "absoluteWeek");
  if (absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(absoluteWeek)})`);
  }
  return absoluteWeek;
}

export function fromAbsoluteWeek(absoluteWeek: number): WorldDate {
  assertSafeInteger(absoluteWeek, "absoluteWeek");
  if (absoluteWeek < 0) {
    throw new Error(`absoluteWeek must be >= 0 (got ${String(absoluteWeek)})`);
  }

  const year = Math.floor(absoluteWeek / WEEKS_PER_YEAR) + 1;
  const rem = absoluteWeek % WEEKS_PER_YEAR;
  const monthIndex = Math.floor(rem / WEEKS_PER_MONTH);
  const weekOfMonth = ((rem % WEEKS_PER_MONTH) + 1) as WeekOfMonth;
  const month = WORLD_MONTH_ORDER[monthIndex]!;
  return {
    year,
    month,
    weekOfMonth,
    absoluteWeek,
  };
}

export function advanceOneWeek(date: WorldDate): WorldDate {
  validateWorldDate(date);
  return fromAbsoluteWeek(date.absoluteWeek + 1);
}

export function advanceWeeks(date: WorldDate, weeks: number): WorldDate {
  validateWorldDate(date);
  assertSafeInteger(weeks, "weeks");
  if (weeks < 0) {
    throw new Error(`weeks must be >= 0 (got ${String(weeks)})`);
  }
  const nextAbsolute = date.absoluteWeek + weeks;
  assertSafeInteger(nextAbsolute, "absoluteWeek");
  return fromAbsoluteWeek(nextAbsolute);
}

export function isSameWorldDate(a: WorldDate, b: WorldDate): boolean {
  validateWorldDate(a);
  validateWorldDate(b);
  return a.absoluteWeek === b.absoluteWeek;
}

export function isMarchWeek4(date: WorldDate): boolean {
  return date.month === 3 && date.weekOfMonth === 4;
}

export function isAprilWeek1(date: WorldDate): boolean {
  return date.month === 4 && date.weekOfMonth === 1;
}

function isWorldMonth(value: number): value is WorldMonth {
  return (WORLD_MONTH_ORDER as readonly number[]).includes(value);
}

function isWeekOfMonth(value: number): value is WeekOfMonth {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

function assertSafeInteger(value: number, name: string): void {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new Error(`${name} must be a safe integer (got ${String(value)})`);
  }
}
