import { describe, expect, it } from "vitest";
import { DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { WorldCalendarConfig } from "../config/types.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import {
  classifyChampionshipCycleYear,
  generateSchedulePlan,
  validateSchedulePlanInputs,
} from "./tournament-schedule-plan.js";
import {
  applyFailureToStart,
  commitSchedulePlan,
  rejectInvalidScheduleTransition,
} from "./tournament-schedule-state.js";
import { buildTournamentScheduleReadModel } from "./tournament-schedule-read-model.js";
import {
  createInitialTournamentIdGeneratorState,
  formatTournamentIdFromSequence,
  reserveNextTournamentId,
  validateTournamentId,
} from "./tournament-id-registry.js";
import type { Sprint2Config } from "./types.js";

function tinyScheduleConfig(overrides?: Partial<Sprint2Config["schedule"]>): Sprint2Config {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "sprint2-schedule-test",
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
      ...overrides,
    },
  };
}

describe("S02-002 TournamentId allocator", () => {
  it("allocates deterministic opaque IDs separate from MatchId namespace", () => {
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const first = reserveNextTournamentId(initial.value);
    const second = reserveNextTournamentId(
      first.kind === "success" ? first.nextState : initial.value,
    );
    expect(first.kind).toBe("success");
    expect(second.kind).toBe("success");
    if (first.kind !== "success" || second.kind !== "success") {
      return;
    }
    expect(first.tournamentId).toBe("tournament_000000000001");
    expect(second.tournamentId).toBe("tournament_000000000002");
    expect(first.tournamentId.startsWith("match_")).toBe(false);
    expect(validateTournamentId(first.tournamentId).ok).toBe(true);
  });

  it("does not mutate generator state on reserve failure path", () => {
    const exhausted = createInitialTournamentIdGeneratorState();
    expect(exhausted.ok).toBe(true);
    if (!exhausted.ok) {
      return;
    }
    const tampered = {
      ...exhausted.value,
      nextSequence: 1_000_000_000_000,
    };
    const reserved = reserveNextTournamentId(tampered);
    expect(reserved.kind).toBe("failure");
    expect(reserved.tournamentId).toBeNull();
    expect(reserved.nextState).toBeNull();
  });

  it("rejects semantic encoding in TournamentId text", () => {
    expect(formatTournamentIdFromSequence(42)).toBe("tournament_000000000042");
    expect(validateTournamentId("tournament_F_rank_2026").ok).toBe(false);
  });
});

describe("S02-002 schedule plan", () => {
  it("generates same-input repeatable schedule order with continuous scheduleOrdinal", () => {
    const config = tinyScheduleConfig();
    const planA = generateSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1);
    const planB = generateSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1);
    expect(planA.ok && planB.ok).toBe(true);
    if (!planA.ok || !planB.ok) {
      return;
    }
    expect(planA.value).toEqual(planB.value);
    expect(planA.value.length).toBeGreaterThan(0);
    for (let index = 1; index < planA.value.length; index += 1) {
      const prev = planA.value[index - 1]!;
      const current = planA.value[index]!;
      if (prev.monthOffset === current.monthOffset) {
        expect(prev.weekOfMonth <= current.weekOfMonth).toBe(true);
      } else {
        expect(prev.monthOffset < current.monthOffset).toBe(true);
      }
    }
  });

  it("respects configurable cadence seam rather than hard-coded draft counts", () => {
    const sparse = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [0],
        E: [0],
        D: [0],
        C: [6],
        B: [6],
      },
      openMonthOffsets: [3],
      limitedMonthOffsets: {
        unarmed: [0],
        sword: [0],
        magic: [0],
      },
      promotionMonthOffsets: [9],
    });
    const plan = generateSchedulePlan(sparse, DEFAULT_WORLD_CALENDAR_CONFIG, 1);
    expect(plan.ok).toBe(true);
    if (!plan.ok) {
      return;
    }
    expect(plan.value.filter((slot) => slot.kind === "open").length).toBe(1);
    expect(plan.value.filter((slot) => slot.kind === "promotion").length).toBe(1);
    expect(plan.value.filter((slot) => slot.kind === "limited").length).toBe(3);
  });

  it("rejects invalid configured schedule inputs before commit", () => {
    const config = tinyScheduleConfig({
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 5,
        promotion: 3,
      },
    });
    const validated = validateSchedulePlanInputs(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1);
    expect(validated.ok).toBe(false);
  });

  it("classifies championship cycle default 4 and alternate configured cycle", () => {
    const config = createDefaultSprint2ConfigInput();
    expect(classifyChampionshipCycleYear(1, config.championship)).toBe("championship_year");
    expect(classifyChampionshipCycleYear(2, config.championship)).toBe("non_championship_year");
    expect(classifyChampionshipCycleYear(5, config.championship)).toBe("championship_year");

    const yearly = {
      ...config.championship,
      championshipCycleYears: 1 as const,
      cycleOriginWorldYear: 1,
    };
    expect(classifyChampionshipCycleYear(3, yearly)).toBe("championship_year");
  });
});

describe("S02-002 schedule commit and rollback", () => {
  it("commits schedule with monotonic TournamentIds and ordinal assignment", () => {
    const config = tinyScheduleConfig();
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    expect(committed.generatorState.nextSequence).toBe(
      initial.value.nextSequence + committed.scheduleState.entries.length,
    );
    committed.scheduleState.entries.forEach((entry, index) => {
      expect(entry.scheduleOrdinal).toBe(index);
      expect(entry.lifecycleState).toBe("scheduled");
    });
  });

  it("does not leak allocator advancement when plan validation fails", () => {
    const config = tinyScheduleConfig({
      weekByKind: {
        normal: 1,
        open: 1,
        limited: 0,
        promotion: 3,
      },
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("failure");
    if (committed.kind !== "failure") {
      return;
    }
    expect(committed.generatorState).toBeNull();
    expect(committed.scheduleState).toBeNull();
  });
});

describe("S02-002 postpone merge cancel", () => {
  it("postpones and merges into next same-series slot preserving source TournamentId", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [0, 6],
        E: [0],
        D: [0],
        C: [0],
        B: [0],
      },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const fSlots = committed.scheduleState.entries.filter(
      (entry) => entry.kind === "normal" && entry.targetRank === "F",
    );
    expect(fSlots.length).toBe(2);
    const source = fSlots[0]!;
    const target = fSlots[1]!;
    const transitioned = applyFailureToStart(committed.scheduleState, source.tournamentId);
    expect(transitioned.ok).toBe(true);
    if (!transitioned.ok) {
      return;
    }
    const mergedSource = transitioned.value.entries.find(
      (entry) => entry.tournamentId === source.tournamentId,
    );
    const mergeTarget = transitioned.value.entries.find(
      (entry) => entry.tournamentId === target.tournamentId,
    );
    expect(mergedSource?.lifecycleState).toBe("merged");
    expect(mergedSource?.mergeTargetId).toBe(target.tournamentId);
    expect(mergedSource?.tournamentId).toBe(source.tournamentId);
    expect(mergeTarget?.mergeSourceIds).toContain(source.tournamentId);
  });

  it("cancels when no later same-year same-series slot exists", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [11],
        E: [0],
        D: [0],
        C: [0],
        B: [0],
      },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const lastF = committed.scheduleState.entries.find(
      (entry) => entry.kind === "normal" && entry.targetRank === "F",
    );
    expect(lastF).toBeDefined();
    if (!lastF) {
      return;
    }
    const cancelled = applyFailureToStart(committed.scheduleState, lastF.tournamentId);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok) {
      return;
    }
    const updated = cancelled.value.entries.find(
      (entry) => entry.tournamentId === lastF.tournamentId,
    );
    expect(updated?.lifecycleState).toBe("cancelled");
    expect(updated?.mergeTargetId).toBeUndefined();
  });

  it("rejects invalid transition from terminal merged state", () => {
    const config = tinyScheduleConfig({
      normalMonthOffsetsByRank: {
        F: [0, 6],
        E: [0],
        D: [0],
        C: [0],
        B: [0],
      },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
    });
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const fSlots = committed.scheduleState.entries.filter(
      (entry) => entry.kind === "normal" && entry.targetRank === "F",
    );
    const firstFSlot = fSlots[0]!;
    const merged = applyFailureToStart(committed.scheduleState, firstFSlot.tournamentId);
    expect(merged.ok).toBe(true);
    if (!merged.ok) {
      return;
    }
    const second = applyFailureToStart(merged.value, firstFSlot.tournamentId);
    expect(second.ok).toBe(false);
    expect(rejectInvalidScheduleTransition(merged.value, firstFSlot.tournamentId).ok).toBe(false);
  });

  it("does not carry unresolved tournaments across world years in schedule generation", () => {
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
    expect(year2.scheduleState.worldYear).toBe(2);
    expect(year2.scheduleState.entries.every((entry) => entry.worldYear === 2)).toBe(true);
    expect(year2.scheduleState.entries[0]!.tournamentId).not.toBe(
      year1.scheduleState.entries[0]!.tournamentId,
    );
  });
});

describe("S02-002 schedule read-model", () => {
  it("exposes UI-required fields in deterministic order", () => {
    const config = tinyScheduleConfig();
    const initial = createInitialTournamentIdGeneratorState();
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
    expect(committed.kind).toBe("success");
    if (committed.kind !== "success") {
      return;
    }
    const readModel = buildTournamentScheduleReadModel(committed.scheduleState);
    expect(readModel.length).toBe(committed.scheduleState.entries.length);
    for (let index = 0; index < readModel.length; index += 1) {
      const entry = readModel[index]!;
      expect(entry.scheduleOrdinal).toBe(index);
      expect(entry.tournamentId).toMatch(/^tournament_[0-9]{12}$/);
      expect(entry.worldYear).toBe(1);
      expect(entry.month).toBeGreaterThanOrEqual(1);
      expect(entry.weekOfMonth).toBeGreaterThanOrEqual(1);
      expect(entry.lifecycleState).toBe("scheduled");
      expect(entry.championshipCycleClassification).toBe("championship_year");
    }
  });

  it("preserves startMonth 1 and 4 calendar compatibility", () => {
    const config = tinyScheduleConfig();
    const janConfig = DEFAULT_WORLD_CALENDAR_CONFIG;
    const aprilConfig: WorldCalendarConfig = {
      monthsPerWorldYear: 12,
      weeksPerMonth: 4,
      worldYearStartMonth: 4,
      worldYearStartWeek: 1,
    };
    const jan = generateSchedulePlan(config, janConfig, 1);
    const apr = generateSchedulePlan(config, aprilConfig, 1);
    expect(jan.ok && apr.ok).toBe(true);
    if (!jan.ok || !apr.ok) {
      return;
    }
    expect(jan.value.length).toBe(apr.value.length);
  });
});

describe("S02-002 import boundary", () => {
  it("Sprint2 tournament schedule modules are not imported by Sprint1 production code", async () => {
    const { readdir, readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const sprint1Dir = join(process.cwd(), "packages/simulation-core/src/sprint1");
    const forbidden = [
      "tournament-schedule-plan",
      "tournament-schedule-state",
      "tournament-schedule-read-model",
    ];
    async function walk(dir: string): Promise<void> {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(full);
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
          const content = await readFile(full, "utf8");
          for (const fragment of forbidden) {
            expect(content.includes(fragment), `${full} must not import ${fragment}`).toBe(false);
          }
        }
      }
    }
    await walk(sprint1Dir);
  });
});
