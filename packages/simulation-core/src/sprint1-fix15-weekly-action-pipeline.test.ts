/**
 * FIX15: non-actionable persons must not enter weekly action pipeline.
 */
import { describe, expect, it } from "vitest";
import {
  isFormalTrainingEligible,
  isWeeklyActionPipelineEligible,
  isWeeklyStateUpdateEligible,
} from "./sprint1/weekly-update-eligibility.js";

describe("FIX15 weekly action pipeline eligibility", () => {
  const trainable = {
    lifeStatus: "living" as const,
    participationStatus: "active" as const,
    careerStatus: "trainee" as const,
    currentAge: 20,
  };

  it("allows living trainee/active ages 8..41", () => {
    expect(isWeeklyActionPipelineEligible(trainable)).toBe(true);
    expect(
      isWeeklyActionPipelineEligible({
        ...trainable,
        careerStatus: "active_competitor",
        currentAge: 8,
      }),
    ).toBe(true);
    expect(
      isWeeklyActionPipelineEligible({
        ...trainable,
        careerStatus: "active_competitor",
        currentAge: 41,
      }),
    ).toBe(true);
  });

  it("excludes child, retired, age outside 8..41, and inactive set", () => {
    expect(
      isWeeklyActionPipelineEligible({
        ...trainable,
        careerStatus: "child",
        currentAge: 10,
      }),
    ).toBe(false);
    expect(
      isWeeklyActionPipelineEligible({
        ...trainable,
        careerStatus: "retired",
        currentAge: 45,
      }),
    ).toBe(false);
    expect(isWeeklyActionPipelineEligible({ ...trainable, currentAge: 7 })).toBe(false);
    expect(isWeeklyActionPipelineEligible({ ...trainable, currentAge: 42 })).toBe(false);
    expect(
      isWeeklyActionPipelineEligible({
        ...trainable,
        lifeStatus: "deceased",
      }),
    ).toBe(false);
    expect(
      isWeeklyStateUpdateEligible({
        ...trainable,
        participationStatus: "waiting",
      }),
    ).toBe(false);
    expect(isFormalTrainingEligible({ ...trainable, careerStatus: "child" })).toBe(false);
  });
});
