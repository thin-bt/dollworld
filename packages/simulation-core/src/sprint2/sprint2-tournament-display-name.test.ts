import { describe, expect, it } from "vitest";
import { DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import { buildSeriesKey } from "./tournament-schedule-plan.js";
import { commitSchedulePlan } from "./tournament-schedule-state.js";
import { buildTournamentScheduleReadModel } from "./tournament-schedule-read-model.js";
import { createInitialTournamentIdGeneratorState } from "./tournament-id-registry.js";
import { resolveTournamentDisplayName } from "./tournament-display-name.js";
import type { Sprint2Config } from "./types.js";

function tinyScheduleConfig(): Sprint2Config {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "sprint2-display-name-test",
    schedule: {
      normalMonthOffsetsByRank: {
        F: [0, 6],
        E: [0],
        D: [0],
        C: [2, 8],
        B: [4],
      },
      openMonthOffsets: [2, 8],
      limitedMonthOffsets: {
        unarmed: [0, 6],
        sword: [3],
        magic: [9],
      },
      promotionMonthOffsets: [5, 11],
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 2,
        promotion: 3,
      },
    },
  };
}

describe("resolveTournamentDisplayName", () => {
  it("maps canonical seriesKey to stable player-facing names", () => {
    expect(resolveTournamentDisplayName(buildSeriesKey("normal", "F"))).toBe("春風杯");
    expect(resolveTournamentDisplayName(buildSeriesKey("promotion"))).toBe("公式昇格戦");
    expect(resolveTournamentDisplayName(buildSeriesKey("limited", undefined, "magic"))).toBe(
      "紅蓮魔術祭",
    );
  });

  it("yields identical names for the same schedule slot across committed world years", () => {
    const config = tinyScheduleConfig();
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const year1 = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(year1.kind).toBe("success");
    if (year1.kind !== "success") {
      return;
    }
    const year2 = commitSchedulePlan(
      config,
      DEFAULT_WORLD_CALENDAR_CONFIG,
      2,
      year1.generatorState,
    );
    expect(year2.kind).toBe("success");
    if (year2.kind !== "success") {
      return;
    }
    const schedule1 = buildTournamentScheduleReadModel(year1.scheduleState);
    const schedule2 = buildTournamentScheduleReadModel(year2.scheduleState);
    const fRank1 = schedule1.find((entry) => entry.kind === "normal" && entry.targetRank === "F");
    const fRank2 = schedule2.find((entry) => entry.kind === "normal" && entry.targetRank === "F");
    expect(fRank1).toBeDefined();
    expect(fRank2).toBeDefined();
    expect(fRank1!.seriesKey).toBe(fRank2!.seriesKey);
    expect(resolveTournamentDisplayName(fRank1!.seriesKey)).toBe(
      resolveTournamentDisplayName(fRank2!.seriesKey),
    );
    expect(fRank1!.tournamentId).not.toBe(fRank2!.tournamentId);
  });
});
