import { describe, expect, it } from "vitest";
import {
  presentTechniqueView,
  techniquePresentationDescription,
  techniquePrimaryLabel,
} from "./technique-presentation.js";

describe("technique presentation (FIX14 followup)", () => {
  it("maps built-in ids to Japanese primary labels without exposing raw TechniqueId", () => {
    expect(techniquePrimaryLabel("technique_sword_basic")).toBe("基本剣技");
    expect(techniquePrimaryLabel("technique_magic_basic")).toBe("基本魔法");
    expect(techniquePrimaryLabel("technique_alpha")).toBe("基本格闘");
    expect(techniquePrimaryLabel("technique_alpha")).not.toContain("technique_");
  });

  it("falls back by category when id is unknown", () => {
    expect(techniquePrimaryLabel("unknown_tech", "magic")).toBe("基本魔法");
    expect(techniquePrimaryLabel("unknown_tech")).toBe("技");
  });

  it("builds concise description from category and usable ranges only", () => {
    expect(techniquePresentationDescription("magic", ["middle", "long"])).toBe(
      "魔法の基本技。中距離・遠距離で使用可能。",
    );
    expect(techniquePresentationDescription("sword", ["close", "middle"])).toBe(
      "剣技の基本技。近距離・中距離で使用可能。",
    );
    expect(techniquePresentationDescription("unarmed", ["contact", "close"])).toBe(
      "格闘の基本技。密着・近距離で使用可能。",
    );
  });

  it("presents magic basic view with category, range, cost, mastery, and acquired badge fields", () => {
    const presented = presentTechniqueView({
      techniqueId: "technique_magic_basic",
      learnedState: "acquired",
      masteryHundredths: 2000,
      definition: {
        category: "magic",
        mentalCost: 8,
        usableRanges: ["middle", "long"],
        name: "technique_magic_basic",
      },
    });
    expect(presented.primaryLabel).toBe("基本魔法");
    expect(presented.categoryLabel).toBe("魔法");
    expect(presented.description).toBe("魔法の基本技。中距離・遠距離で使用可能。");
    expect(presented.usableRangesLabel).toBe("中距離・遠距離");
    expect(presented.mentalCostLabel).toBe("8");
    expect(presented.masteryLabel).toBe("20");
    expect(presented.learnedStateLabel).toBe("習得済");
  });

  it("presents sword basic view similarly", () => {
    const presented = presentTechniqueView({
      techniqueId: "technique_sword_basic",
      learnedState: "acquired",
      masteryHundredths: 2000,
      definition: {
        category: "sword",
        mentalCost: 5,
        usableRanges: ["close", "middle"],
      },
    });
    expect(presented.primaryLabel).toBe("基本剣技");
    expect(presented.categoryLabel).toBe("剣技");
    expect(presented.usableRangesLabel).toBe("近距離・中距離");
    expect(presented.mentalCostLabel).toBe("5");
    expect(presented.learnedStateLabel).toBe("習得済");
  });
});
