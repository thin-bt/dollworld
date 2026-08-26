import { describe, expect, it } from "vitest";
import {
  abilityValueClassName,
  abilityValueTier,
  abilityValueToneLabel,
} from "./ability-value-presentation.js";
import { trainingHistoryItemLabel } from "./display-labels.js";

describe("abilityValueTier (UA-032)", () => {
  it("classifies thresholds without inventing mid-range noise", () => {
    expect(abilityValueTier(90)).toBe("peak");
    expect(abilityValueTier(89)).toBe("strong");
    expect(abilityValueTier(70)).toBe("strong");
    expect(abilityValueTier(69)).toBe("mid");
    expect(abilityValueTier(31)).toBe("mid");
    expect(abilityValueTier(30)).toBe("weak");
    expect(abilityValueTier(11)).toBe("weak");
    expect(abilityValueTier(10)).toBe("critical");
    expect(abilityValueTier(0)).toBe("critical");
  });

  it("maps Role3 boundary representatives 95/75/30/5 to peak/strong/weak/critical", () => {
    expect(abilityValueTier(95)).toBe("peak");
    expect(abilityValueTier(75)).toBe("strong");
    expect(abilityValueTier(30)).toBe("weak");
    expect(abilityValueTier(5)).toBe("critical");
    expect(abilityValueClassName(95)).toContain("dw-ability-value--peak");
    expect(abilityValueClassName(75)).toContain("dw-ability-value--strong");
    expect(abilityValueClassName(30)).toContain("dw-ability-value--weak");
    expect(abilityValueClassName(5)).toContain("dw-ability-value--critical");
    expect(abilityValueToneLabel(abilityValueTier(95))).toBe("突出");
    expect(abilityValueToneLabel(abilityValueTier(75))).toBe("得意");
    expect(abilityValueToneLabel(abilityValueTier(30))).toBe("苦手");
    expect(abilityValueToneLabel(abilityValueTier(5))).toBe("弱点");
  });

  it("exposes combined class and non-color tone labels", () => {
    expect(abilityValueClassName(95)).toContain("dw-ability-value--peak");
    expect(abilityValueToneLabel("peak")).toBe("突出");
    expect(abilityValueToneLabel("strong")).toBe("得意");
    expect(abilityValueToneLabel("weak")).toBe("苦手");
    expect(abilityValueToneLabel("critical")).toBe("弱点");
    expect(abilityValueToneLabel("mid")).toBeNull();
  });
});

describe("trainingHistoryItemLabel (UA-030)", () => {
  it("renders source-bound before/after/amount for train_stat", () => {
    expect(
      trainingHistoryItemLabel({
        trainingKind: "train_stat",
        targetStat: "stamina",
        statChanges: [{ stat: "stamina", before: 40, after: 43, amount: 3 }],
      }),
    ).toBe("体力の修行：体力 +3（40→43）");
  });

  it("does not invent a delta when statChanges are absent", () => {
    expect(
      trainingHistoryItemLabel({
        trainingKind: "train_stat",
        targetStat: "strength",
      }),
    ).toBe("筋力の修行");
  });
});
