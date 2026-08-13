import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORLD_CALENDAR_CONFIG,
  advanceOneWeek,
  advanceWeeks,
  createInitialWorldDate,
  createWorldDate,
  fromAbsoluteWeek,
  isSameWorldDate,
  isWorldYearEndWeek,
  isWorldYearStartWeek,
  toAbsoluteWeek,
  validateWorldDate,
  type WeekOfMonth,
  type WorldMonth,
} from "./index.js";

const CAL = DEFAULT_WORLD_CALENDAR_CONFIG;

describe("WorldDate (CAL-JAN default January start)", () => {
  it("uses absoluteWeek=0 for world year 1 January week 1", () => {
    const date = createInitialWorldDate(CAL);
    expect(date).toEqual({ year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 0 });
    expect(toAbsoluteWeek(1, 1, 1, CAL)).toBe(0);
    expect(isWorldYearStartWeek(date, CAL)).toBe(true);
  });

  it("advances January week 4 to February week 1", () => {
    const jan4 = createWorldDate({ year: 1, month: 1, weekOfMonth: 4 }, CAL);
    expect(advanceOneWeek(jan4, CAL)).toEqual({
      year: 1,
      month: 2,
      weekOfMonth: 1,
      absoluteWeek: 4,
    });
  });

  it("advances December week 4 to next year January week 1", () => {
    const dec4 = createWorldDate({ year: 1, month: 12, weekOfMonth: 4 }, CAL);
    expect(dec4.absoluteWeek).toBe(47);
    expect(isWorldYearEndWeek(dec4, CAL)).toBe(true);
    expect(advanceOneWeek(dec4, CAL)).toEqual({
      year: 2,
      month: 1,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
  });

  it("reaches the same month/week next year after 48 steps", () => {
    let date = createInitialWorldDate(CAL);
    for (let i = 0; i < 48; i += 1) {
      date = advanceOneWeek(date, CAL);
    }
    expect(date).toEqual({ year: 2, month: 1, weekOfMonth: 1, absoluteWeek: 48 });
  });

  it("round-trips WorldDate and absoluteWeek", () => {
    for (let absoluteWeek = 0; absoluteWeek < 96; absoluteWeek += 1) {
      const date = fromAbsoluteWeek(absoluteWeek, CAL);
      validateWorldDate(date, CAL);
      expect(toAbsoluteWeek(date.year, date.month, date.weekOfMonth, CAL)).toBe(absoluteWeek);
      expect(fromAbsoluteWeek(date.absoluteWeek, CAL)).toEqual(date);
    }
  });

  it("rejects invalid year, month, weekOfMonth, and absoluteWeek", () => {
    expect(() => createWorldDate({ year: 0, month: 1, weekOfMonth: 1 }, CAL)).toThrow(/year/);
    expect(() => createWorldDate({ year: 1.5, month: 1, weekOfMonth: 1 }, CAL)).toThrow(/year/);
    expect(() => createWorldDate({ year: 1, month: 13, weekOfMonth: 1 }, CAL)).toThrow(/month/);
    expect(() => createWorldDate({ year: 1, month: 0, weekOfMonth: 1 }, CAL)).toThrow(/month/);
    expect(() => createWorldDate({ year: 1, month: 1, weekOfMonth: 5 }, CAL)).toThrow(
      /weekOfMonth/,
    );
    expect(() => createWorldDate({ year: 1, month: 1, weekOfMonth: 0 }, CAL)).toThrow(
      /weekOfMonth/,
    );
    expect(() => fromAbsoluteWeek(-1, CAL)).toThrow(/absoluteWeek/);
    expect(() => fromAbsoluteWeek(1.5, CAL)).toThrow(/absoluteWeek/);
    expect(() => fromAbsoluteWeek(Number.MAX_SAFE_INTEGER + 1, CAL)).toThrow(/absoluteWeek/);
  });

  it("rejects invalid toAbsoluteWeek inputs at runtime", () => {
    expect(() => toAbsoluteWeek(1, 13 as WorldMonth, 1, CAL)).toThrow(/month/);
    expect(() => toAbsoluteWeek(1, 1, 5 as WeekOfMonth, CAL)).toThrow(/weekOfMonth/);
    expect(() => toAbsoluteWeek(0, 1, 1, CAL)).toThrow(/year/);
    expect(() => toAbsoluteWeek(1.5, 1, 1, CAL)).toThrow(/year/);
    expect(() => toAbsoluteWeek(Number.MAX_SAFE_INTEGER + 1, 1, 1, CAL)).toThrow(/year/);

    const unsafeYear = Math.floor(Number.MAX_SAFE_INTEGER / 48) + 2;
    expect(() => toAbsoluteWeek(unsafeYear, 1, 1, CAL)).toThrow(/absoluteWeek/);
    expect(() => createWorldDate({ year: unsafeYear, month: 1, weekOfMonth: 1 }, CAL)).toThrow(
      /absoluteWeek/,
    );
  });

  it("round-trips near the maximum safe absoluteWeek", () => {
    const maxSafeYearForJanWeek1 = Math.floor(Number.MAX_SAFE_INTEGER / 48) + 1;
    const date = createWorldDate({ year: maxSafeYearForJanWeek1, month: 1, weekOfMonth: 1 }, CAL);
    expect(Number.isSafeInteger(date.absoluteWeek)).toBe(true);
    expect(fromAbsoluteWeek(date.absoluteWeek, CAL)).toEqual(date);
    expect(toAbsoluteWeek(date.year, date.month, date.weekOfMonth, CAL)).toBe(date.absoluteWeek);
  });

  it("rejects inconsistent WorldDate fields", () => {
    expect(() =>
      validateWorldDate({ year: 1, month: 1, weekOfMonth: 1, absoluteWeek: 1 }, CAL),
    ).toThrow(/inconsistent/);
    expect(() =>
      validateWorldDate({ year: 2, month: 1, weekOfMonth: 1, absoluteWeek: 0 }, CAL),
    ).toThrow(/inconsistent/);
  });

  it("rejects negative, non-integer, and unsafe advance week counts", () => {
    const date = createInitialWorldDate(CAL);
    expect(() => advanceWeeks(date, -1, CAL)).toThrow(/weeks/);
    expect(() => advanceWeeks(date, 1.5, CAL)).toThrow(/weeks/);
    expect(() => advanceWeeks(date, Number.MAX_SAFE_INTEGER + 1, CAL)).toThrow(/weeks/);
  });

  it("compares equal dates via absoluteWeek", () => {
    const a = createWorldDate({ year: 3, month: 7, weekOfMonth: 2 }, CAL);
    const b = fromAbsoluteWeek(a.absoluteWeek, CAL);
    expect(isSameWorldDate(a, b)).toBe(true);
    expect(isSameWorldDate(a, advanceOneWeek(a, CAL))).toBe(false);
  });

  it("supports non-default start month=2 year boundary after 48 weeks", () => {
    const febStart = {
      monthsPerWorldYear: 12 as const,
      weeksPerMonth: 4 as const,
      worldYearStartMonth: 2,
      worldYearStartWeek: 1 as const,
    };
    const start = createInitialWorldDate(febStart);
    expect(start).toEqual({ year: 1, month: 2, weekOfMonth: 1, absoluteWeek: 0 });
    let date = start;
    for (let i = 0; i < 48; i += 1) {
      date = advanceOneWeek(date, febStart);
    }
    expect(date).toEqual({ year: 2, month: 2, weekOfMonth: 1, absoluteWeek: 48 });
  });
});
