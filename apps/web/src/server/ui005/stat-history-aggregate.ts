/**
 * statHistory aggregation (BRIDGE-062, TX-032/074).
 * Future owner: UI-005. Full-run chain; last48/lastWeek windowed deltas.
 * Never degrade to null object on failure.
 */

import {
  ABILITY_KEYS,
  WEEKLY_TRAINING_PROCESSOR_ID,
  type AbilityKey,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import type { StatHistoryEntry, StatHistoryView, StatSetView } from "./types.js";

export type StatGrowthEventSource = {
  sequence: number;
  eventType: string;
  sourceProcessor: string;
  absoluteWeek: number;
  personIds: readonly string[];
  payload: {
    targetStat: string;
    before: number;
    after: number;
  };
};

function collectStatEvents(
  personId: string,
  W: number,
  events: readonly StatGrowthEventSource[],
): PureResult<StatGrowthEventSource[]> {
  const collected: StatGrowthEventSource[] = [];
  for (const event of events) {
    if (event.eventType !== "training.stat_growth_applied") {
      continue;
    }
    if (!event.personIds.includes(personId)) {
      continue;
    }
    if (event.sourceProcessor !== WEEKLY_TRAINING_PROCESSOR_ID) {
      return fail("stat_growth_applied with foreign sourceProcessor");
    }
    if (event.absoluteWeek < 0 || event.absoluteWeek > W) {
      return fail("stat_growth_applied week out of range");
    }
    const { targetStat, before, after } = event.payload;
    if (!(ABILITY_KEYS as readonly string[]).includes(targetStat)) {
      return fail("invalid targetStat");
    }
    if (!Number.isInteger(before) || !Number.isInteger(after) || before < 0 || after < 0) {
      return fail("before/after must be non-negative integers");
    }
    if (after < before) {
      return fail("negative delta");
    }
    collected.push(event);
  }
  collected.sort((a, b) => a.sequence - b.sequence);
  return ok(collected);
}

function buildEntry(
  events: readonly StatGrowthEventSource[],
  current: number,
  W: number,
): PureResult<StatHistoryEntry> {
  const windowStart = Math.max(0, W - 47);
  if (events.length === 0) {
    return ok({
      initial: current,
      current,
      last48WeeksDelta: 0,
      lastWeekDelta: 0,
    });
  }
  const initial = events[0]!.payload.before;
  for (let i = 0; i < events.length - 1; i += 1) {
    if (events[i]!.payload.after !== events[i + 1]!.payload.before) {
      return fail("adjacent before/after chain mismatch");
    }
  }
  const last = events[events.length - 1]!;
  if (last.payload.after !== current) {
    return fail("final after !== current surfaceValue");
  }
  let sumAll = 0;
  let d48 = 0;
  let dWeek = 0;
  for (const event of events) {
    const delta = event.payload.after - event.payload.before;
    sumAll += delta;
    if (event.absoluteWeek >= windowStart && event.absoluteWeek <= W) {
      d48 += delta;
    }
    if (event.absoluteWeek === W) {
      dWeek += delta;
    }
  }
  if (initial + sumAll !== current) {
    return fail("initial + sum deltas !== current");
  }
  return ok({
    initial,
    current,
    last48WeeksDelta: d48,
    lastWeekDelta: dWeek,
  });
}

export function aggregateStatHistory(input: {
  personId: string;
  currentAbsoluteWeek: number;
  currentStats: StatSetView;
  events: readonly StatGrowthEventSource[];
}): PureResult<StatHistoryView> {
  const W = input.currentAbsoluteWeek;
  const collected = collectStatEvents(input.personId, W, input.events);
  if (!collected.ok) {
    return collected;
  }

  const view = {} as StatHistoryView;
  for (const stat of ABILITY_KEYS) {
    const forStat = collected.value.filter((e) => e.payload.targetStat === stat);
    const entry = buildEntry(forStat, input.currentStats[stat as AbilityKey], W);
    if (!entry.ok) {
      return entry;
    }
    view[stat as AbilityKey] = entry.value;
  }
  return ok(view);
}
