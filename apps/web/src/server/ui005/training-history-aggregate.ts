/**
 * TrainingHistory aggregation (BRIDGE-053/089/103, TX-024/060/074).
 * Future owner: UI-005. DB-011 sourceProcessor + DB-012 event stream read shape.
 * No instructorPersonId. No invented rest rows for inactive weeks.
 */

import {
  ABILITY_KEYS,
  WEEKLY_FORCED_REST_REASONS,
  WEEKLY_TRAINING_PROCESSOR_ID,
  compareUnicodeCodePoints,
  type AbilityKey,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import type {
  TrainingHistoryItemView,
  TrainingHistoryStatChange,
  TrainingHistoryView,
  WorldDateView,
} from "./types.js";

export type TrainingEventSource = {
  sequence: number;
  eventType: string;
  sourceProcessor: string;
  absoluteWeek: number;
  worldDate: WorldDateView;
  personIds: readonly string[];
  payload: Record<string, unknown>;
};

const TRAINING_KINDS = ["train_stat", "learn_technique", "practice_technique", "rest"] as const;

type TrainingKind = (typeof TRAINING_KINDS)[number];

function worldDateKey(d: WorldDateView): string {
  return `${d.year}-${d.month}-${d.week}`;
}

function validateTargetCorrelation(
  kind: TrainingKind,
  targetStat: unknown,
  targetTechniqueId: unknown,
): PureResult<void> {
  const statNull = targetStat === null || targetStat === undefined;
  const techNull = targetTechniqueId === null || targetTechniqueId === undefined;
  if (kind === "train_stat") {
    if (statNull || !techNull) {
      return fail("train_stat requires targetStat non-null and targetTechniqueId null");
    }
    if (!(ABILITY_KEYS as readonly string[]).includes(String(targetStat))) {
      return fail("train_stat targetStat invalid");
    }
    return ok(undefined);
  }
  if (kind === "learn_technique" || kind === "practice_technique") {
    if (!statNull || techNull || typeof targetTechniqueId !== "string") {
      return fail(`${kind} requires targetStat null and targetTechniqueId non-null`);
    }
    return ok(undefined);
  }
  if (!statNull || !techNull) {
    return fail("rest requires both targets null");
  }
  return ok(undefined);
}

function buildStatChanges(
  group: readonly TrainingEventSource[],
): PureResult<TrainingHistoryStatChange[]> {
  const applied = group.filter((e) => e.eventType === "training.stat_growth_applied");
  const byStat = new Map<AbilityKey, TrainingHistoryStatChange>();
  for (const event of applied) {
    const targetStat = event.payload.targetStat;
    const before = event.payload.before;
    const after = event.payload.after;
    if (!(ABILITY_KEYS as readonly string[]).includes(String(targetStat))) {
      return fail("stat_growth_applied invalid targetStat");
    }
    if (typeof before !== "number" || typeof after !== "number") {
      return fail("stat_growth_applied before/after must be numbers");
    }
    if (!Number.isInteger(before) || !Number.isInteger(after) || before < 0 || after < 0) {
      return fail("stat_growth_applied before/after must be non-negative integers");
    }
    if (after < before) {
      return fail("stat_growth_applied negative delta");
    }
    const stat = targetStat as AbilityKey;
    byStat.set(stat, {
      stat,
      before,
      after,
      amount: after - before,
    });
  }
  const ordered: TrainingHistoryStatChange[] = [];
  for (const key of ABILITY_KEYS) {
    const row = byStat.get(key);
    if (row !== undefined) {
      ordered.push(row);
    }
  }
  return ok(ordered);
}

function buildItem(group: readonly TrainingEventSource[]): PureResult<TrainingHistoryItemView> {
  const anchors = group.filter((e) => e.eventType === "training.action_selected");
  if (anchors.length !== 1) {
    return fail(`action_selected anchor count must be 1, got ${anchors.length}`);
  }
  const anchor = anchors[0]!;
  const action = anchor.payload.action;
  if (!(TRAINING_KINDS as readonly string[]).includes(String(action))) {
    return fail("unknown trainingKind/action");
  }
  const trainingKind = action as TrainingKind;
  const targetStat = (anchor.payload.targetStat ?? null) as AbilityKey | null;
  const targetTechniqueId = (anchor.payload.targetTechniqueId ?? null) as string | null;
  const corr = validateTargetCorrelation(trainingKind, targetStat, targetTechniqueId);
  if (!corr.ok) {
    return corr;
  }

  const forced = anchor.payload.forced === true;
  const forcedReasonRaw = anchor.payload.forcedReason ?? null;
  let forcedReason: TrainingHistoryItemView["forcedReason"] = null;
  if (forcedReasonRaw !== null) {
    if (!(WEEKLY_FORCED_REST_REASONS as readonly string[]).includes(String(forcedReasonRaw))) {
      return fail("unknown forcedReason");
    }
    forcedReason = forcedReasonRaw as TrainingHistoryItemView["forcedReason"];
  }

  const statChanges = buildStatChanges(group);
  if (!statChanges.ok) {
    return statChanges;
  }

  const learnedTechniqueIds = group
    .filter((e) => e.eventType === "technique.acquired")
    .map((e) => String(e.payload.techniqueId))
    .sort(compareUnicodeCodePoints);

  const relatedEventSequences = [...group.map((e) => e.sequence)].sort((a, b) => a - b);

  return ok({
    worldDate: anchor.worldDate,
    trainingKind,
    targetStat: trainingKind === "train_stat" ? targetStat : null,
    targetTechniqueId:
      trainingKind === "learn_technique" || trainingKind === "practice_technique"
        ? targetTechniqueId
        : null,
    forced,
    forcedReason,
    statChanges: statChanges.value,
    learningAttempted: trainingKind === "learn_technique",
    learnedTechniqueIds,
    relatedEventSequences,
  });
}

/**
 * Aggregate TrainingHistory for [max(0,W-47)..W], absoluteWeek descending.
 */
export function aggregateTrainingHistory(input: {
  personId: string;
  currentAbsoluteWeek: number;
  events: readonly TrainingEventSource[];
}): PureResult<TrainingHistoryView> {
  const W = input.currentAbsoluteWeek;
  if (!Number.isInteger(W) || W < 0) {
    return fail("invalid currentAbsoluteWeek");
  }
  const windowStart = Math.max(0, W - 47);

  const candidates = input.events.filter((event) => {
    if (event.sourceProcessor !== WEEKLY_TRAINING_PROCESSOR_ID) {
      return false;
    }
    if (!event.personIds.includes(input.personId)) {
      return false;
    }
    if (event.absoluteWeek < windowStart || event.absoluteWeek > W) {
      return false;
    }
    return true;
  });

  const groups = new Map<string, TrainingEventSource[]>();
  for (const event of candidates) {
    const key = worldDateKey(event.worldDate);
    const list = groups.get(key) ?? [];
    list.push(event);
    groups.set(key, list);
  }

  const built: { week: number; item: TrainingHistoryItemView }[] = [];
  const weeksSeen = new Set<number>();
  for (const group of groups.values()) {
    const week = group[0]!.absoluteWeek;
    if (weeksSeen.has(week)) {
      return fail("duplicate absoluteWeek groups");
    }
    weeksSeen.add(week);
    for (const event of group) {
      if (event.absoluteWeek !== week) {
        return fail("mixed absoluteWeek inside group");
      }
      if (worldDateKey(event.worldDate) !== worldDateKey(group[0]!.worldDate)) {
        return fail("mixed worldDate inside group");
      }
    }
    const item = buildItem(group);
    if (!item.ok) {
      return item;
    }
    built.push({ week, item: item.value });
  }

  built.sort((a, b) => b.week - a.week);
  return ok({ available: true, items: built.map((row) => row.item) });
}
