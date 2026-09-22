import { describe, expect, it } from "vitest";
import {
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  type Sprint1RunSession,
} from "@shared-world/simulation-core";
import { buildCompetitionScheduleOverview } from "./competition-schedule-overview.js";

function minimalSession(worldYear: number): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: worldYear, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  return {
    runtimeState: {
      worldState: {
        worldDate,
        persons: [],
      },
    },
  } as unknown as Sprint1RunSession;
}

describe("competition schedule tournament display name projection", () => {
  it("projects deterministic tournamentDisplayName on every schedule entry", () => {
    const overview = buildCompetitionScheduleOverview(minimalSession(21), null, [], []);
    expect(overview.entries.length).toBeGreaterThan(0);
    for (const entry of overview.entries) {
      expect(entry.tournamentDisplayName.length).toBeGreaterThan(0);
      expect(entry.tournamentDisplayName).not.toMatch(/^tournament_/);
    }
    const fRank = overview.entries.find((row) => row.matrixRowKey === "F");
    expect(fRank?.tournamentDisplayName).toBe("春風杯");
  });
});
