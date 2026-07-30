import { describe, expect, it } from "vitest";
import {
  advanceOneWeek,
  advanceWeeks,
  createInitialWorldDate,
  createWorldDate,
  fromAbsoluteWeek,
  isSameWorldDate,
  toAbsoluteWeek,
  validateWorldDate,
  type WeekOfMonth,
  type WorldMonth,
} from "./index.js";

describe("WorldDate", () => {
  it("uses absoluteWeek=0 for world year 1 April week 1", () => {
    const date = createInitialWorldDate();
    expect(date).toEqual({ year: 1, month: 4, weekOfMonth: 1, absoluteWeek: 0 });
    expect(toAbsoluteWeek(1, 4, 1)).toBe(0);
  });

  it("advances April week 4 to May week 1", () => {
    const april4 = createWorldDate({ year: 1, month: 4, weekOfMonth: 4 });
    expect(advanceOneWeek(april4)).toEqual({
      year: 1,
      month: 5,
      weekOfMonth: 1,
      absoluteWeek: 4,
    });
  });

  it("advances March week 4 to next year April week 1", () => {
    const march4 = createWorldDate({ year: 1, month: 3, weekOfMonth: 4 });
    expect(march4.absoluteWeek).toBe(47);
    expect(advanceOneWeek(march4)).toEqual({
      year: 2,
      month: 4,
      weekOfMonth: 1,
      absoluteWeek: 48,
    });
  });

  it("reaches the same month/week next year after 48 steps", () => {
    let date = createInitialWorldDate();
    for (let i = 0; i < 48; i += 1) {
      date = advanceOneWeek(date);
    }
    expect(date).toEqual({ year: 2, month: 4, weekOfMonth: 1, absoluteWeek: 48 });
  });

  it("round-trips WorldDate and absoluteWeek", () => {
    for (let absoluteWeek = 0; absoluteWeek < 96; absoluteWeek += 1) {
      const date = fromAbsoluteWeek(absoluteWeek);
      validateWorldDate(date);
      expect(toAbsoluteWeek(date.year, date.month, date.weekOfMonth)).toBe(absoluteWeek);
      expect(fromAbsoluteWeek(date.absoluteWeek)).toEqual(date);
    }
  });

  it("rejects invalid year, month, weekOfMonth, and absoluteWeek", () => {
    expect(() => createWorldDate({ year: 0, month: 4, weekOfMonth: 1 })).toThrow(/year/);
    expect(() => createWorldDate({ year: 1.5, month: 4, weekOfMonth: 1 })).toThrow(/year/);
    expect(() => createWorldDate({ year: 1, month: 13, weekOfMonth: 1 })).toThrow(/month/);
    expect(() => createWorldDate({ year: 1, month: 0, weekOfMonth: 1 })).toThrow(/month/);
    expect(() => createWorldDate({ year: 1, month: 4, weekOfMonth: 5 })).toThrow(/weekOfMonth/);
    expect(() => createWorldDate({ year: 1, month: 4, weekOfMonth: 0 })).toThrow(/weekOfMonth/);
    expect(() => fromAbsoluteWeek(-1)).toThrow(/absoluteWeek/);
    expect(() => fromAbsoluteWeek(1.5)).toThrow(/absoluteWeek/);
    expect(() => fromAbsoluteWeek(Number.MAX_SAFE_INTEGER + 1)).toThrow(/absoluteWeek/);
  });

  it("rejects invalid toAbsoluteWeek inputs at runtime", () => {
    expect(() => toAbsoluteWeek(1, 13 as WorldMonth, 1)).toThrow(/month/);
    expect(() => toAbsoluteWeek(1, 4, 5 as WeekOfMonth)).toThrow(/weekOfMonth/);
    expect(() => toAbsoluteWeek(0, 4, 1)).toThrow(/year/);
    expect(() => toAbsoluteWeek(1.5, 4, 1)).toThrow(/year/);
    expect(() => toAbsoluteWeek(Number.MAX_SAFE_INTEGER + 1, 4, 1)).toThrow(/year/);

    const unsafeYear = Math.floor(Number.MAX_SAFE_INTEGER / 48) + 2;
    expect(() => toAbsoluteWeek(unsafeYear, 4, 1)).toThrow(/absoluteWeek/);
    expect(() => createWorldDate({ year: unsafeYear, month: 4, weekOfMonth: 1 })).toThrow(
      /absoluteWeek/,
    );
  });

  it("round-trips near the maximum safe absoluteWeek", () => {
    const maxSafeYearForAprilWeek1 = Math.floor(Number.MAX_SAFE_INTEGER / 48) + 1;
    const date = createWorldDate({ year: maxSafeYearForAprilWeek1, month: 4, weekOfMonth: 1 });
    expect(Number.isSafeInteger(date.absoluteWeek)).toBe(true);
    expect(fromAbsoluteWeek(date.absoluteWeek)).toEqual(date);
    expect(toAbsoluteWeek(date.year, date.month, date.weekOfMonth)).toBe(date.absoluteWeek);
  });

  it("rejects inconsistent WorldDate fields", () => {
    expect(() => validateWorldDate({ year: 1, month: 4, weekOfMonth: 1, absoluteWeek: 1 })).toThrow(
      /inconsistent/,
    );
    expect(() => validateWorldDate({ year: 2, month: 4, weekOfMonth: 1, absoluteWeek: 0 })).toThrow(
      /inconsistent/,
    );
  });

  it("rejects negative, non-integer, and unsafe advance week counts", () => {
    const date = createInitialWorldDate();
    expect(() => advanceWeeks(date, -1)).toThrow(/weeks/);
    expect(() => advanceWeeks(date, 1.5)).toThrow(/weeks/);
    expect(() => advanceWeeks(date, Number.MAX_SAFE_INTEGER + 1)).toThrow(/weeks/);
  });

  it("compares equal dates via absoluteWeek", () => {
    const a = createWorldDate({ year: 3, month: 7, weekOfMonth: 2 });
    const b = fromAbsoluteWeek(a.absoluteWeek);
    expect(isSameWorldDate(a, b)).toBe(true);
    expect(isSameWorldDate(a, advanceOneWeek(a))).toBe(false);
  });
});
