import { describe, expect, it } from "vitest";
import { eventResultSummary } from "./event-display.js";
import type { EventListItemView } from "./ui008-views.js";

function actionSelected(techniqueId: string): EventListItemView {
  return {
    schemaVersion: "0.5.0",
    eventId: "evt_test_001",
    simulationId: "simulation_x",
    sequence: 1,
    eventType: "training.action_selected",
    importance: "normal",
    worldDate: { year: 1, month: 1, week: 1 },
    origin: { kind: "processor" },
    sourceProcessor: "training",
    payload: { action: "practice_technique", targetTechniqueId: techniqueId },
    entities: { personIds: ["person_000001"] },
  };
}

describe("eventResultSummary UA-016", () => {
  it("training.action_selected does not expose raw technique_* in result summary", () => {
    const summary = eventResultSummary(actionSelected("technique_sword_basic"));
    expect(summary).not.toMatch(/technique_/);
    expect(summary).toContain("基本剣技");
    expect(summary).toMatch(/技:/);
  });

  it("maps technique_magic_basic to 基本魔法", () => {
    const summary = eventResultSummary(actionSelected("technique_magic_basic"));
    expect(summary).toContain("基本魔法");
    expect(summary).not.toContain("technique_magic_basic");
  });
});
