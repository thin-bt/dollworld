import { describe, expect, it } from "vitest";
import {
  resolveWeeklyStatGrowthProjection,
  type WeeklyStatGrowthFactorBreakdown,
} from "./weekly-stat-growth-projection.js";

const neutralFactors: WeeklyStatGrowthFactorBreakdown = {
  growthPotentialFactor: 10000,
  ageFactor: 10000,
  currentValueFactor: 10000,
  teacherFactor: 10000,
  discipleCountFactor: 10000,
  fatigueFactor: 10000,
  injuryFactor: 10000,
  motivationFactor: 10000,
  rngFactor: 10000,
};

describe("resolveWeeklyStatGrowthProjection", () => {
  it("uses the production nine-factor order with one final floor", () => {
    const result = resolveWeeklyStatGrowthProjection({
      baseMilliPointsPerTraining: 500,
      surfaceBefore: 10,
      remainderBefore: 900,
      factorBreakdown: {
        ...neutralFactors,
        growthPotentialFactor: 6500,
        ageFactor: 9000,
        currentValueFactor: 11500,
      },
    });

    expect(result).toEqual({
      ok: true,
      value: {
        appliedMilliPoints: 336,
        accumulatedMilliPoints: 1236,
        surfaceGain: 1,
        surfaceAfter: 11,
        remainderAfter: 236,
        capApplied: false,
      },
    });
  });

  it("reports a surface cap without changing the raw applied milli-points", () => {
    const result = resolveWeeklyStatGrowthProjection({
      baseMilliPointsPerTraining: 2500,
      surfaceBefore: 99,
      remainderBefore: 750,
      factorBreakdown: neutralFactors,
    });

    expect(result).toEqual({
      ok: true,
      value: {
        appliedMilliPoints: 2500,
        accumulatedMilliPoints: 3250,
        surfaceGain: 1,
        surfaceAfter: 100,
        remainderAfter: 250,
        capApplied: true,
      },
    });
  });

  it("fails closed for negative zero and out-of-domain projection inputs", () => {
    const result = resolveWeeklyStatGrowthProjection({
      baseMilliPointsPerTraining: -0,
      surfaceBefore: 101,
      remainderBefore: 1000,
      factorBreakdown: { ...neutralFactors, teacherFactor: -0 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.map((issue) => issue.path)).toEqual([
        "/baseMilliPointsPerTraining",
        "/surfaceBefore",
        "/remainderBefore",
        "/factorBreakdown/teacherFactor",
      ]);
    }
  });
});
