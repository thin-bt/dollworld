/**
 * Presentation-layer event grouping / technical filtering (FIX8 / FIX10 / FIX11).
 * Does not alter canonical EventEnvelope storage or API order semantics.
 *
 * Training lifecycle grouping key (deterministic):
 *   primaryActorPersonId + worldDate(year,month,week|weekOfMonth)
 *   among eventTypes in CHOICE ∪ RESULT.
 * Order-independent; FIX11 may supply boundaryContext so clusters that straddle
 * pagination windows still compose one ordinary card.
 */

import {
  eventActorLabel,
  eventResultSummary,
  eventWhatSentence,
  primaryActorPersonId,
} from "./event-display.js";
import type { EventListItemView } from "./ui008-views.js";

const TECHNICAL_EVENT_TYPES = new Set([
  "person.initialized",
  "world.initialized",
  "simulation.initialized",
  "schema.bootstrap",
]);

const TRAINING_CHOICE_TYPES = new Set(["training.action_selected"]);
const TRAINING_RESULT_TYPES = new Set([
  "training.rest_applied",
  "training.forced_rest_applied",
  "training.stat_growth_applied",
  "training.condition_updated",
  // FIX15: practice/learn outcomes must compose with the same week's action_selected.
  "technique.learning_progressed",
  "technique.acquired",
  "technique.mastery_increased",
]);

const TRAINING_LIFECYCLE_TYPES = new Set([...TRAINING_CHOICE_TYPES, ...TRAINING_RESULT_TYPES]);

/** Prefer action_selected for WHAT; then rest; then growth; then technique; then condition. */
const TRAINING_PRIMARY_RANK: Record<string, number> = {
  "training.action_selected": 0,
  "training.rest_applied": 1,
  "training.forced_rest_applied": 2,
  "training.stat_growth_applied": 3,
  "technique.learning_progressed": 4,
  "technique.acquired": 5,
  "technique.mastery_increased": 6,
  "training.condition_updated": 7,
};

export type HumanEventCard = {
  key: string;
  /** Lifecycle group key when this card is a training lifecycle; else null. */
  lifecycleKey: string | null;
  primary: EventListItemView;
  related: EventListItemView[];
  who: string;
  what: string;
  result: string;
};

export type BuildHumanEventCardsOptions = {
  /** Extra envelopes (e.g. next-page peek) used only to complete lifecycle clusters. */
  boundaryContext?: readonly EventListItemView[];
  /** Lifecycle keys already emitted on a previous page — suppress duplicates. */
  suppressLifecycleKeys?: ReadonlySet<string>;
};

function worldDateKey(item: EventListItemView): string {
  const d = item.worldDate;
  if (d === null || typeof d !== "object" || Array.isArray(d)) {
    return "";
  }
  const rec = d as Record<string, unknown>;
  return `${String(rec.year ?? "")}-${String(rec.month ?? "")}-${String(rec.week ?? rec.weekOfMonth ?? "")}`;
}

export function trainingLifecycleGroupKey(item: EventListItemView): string | null {
  if (!TRAINING_LIFECYCLE_TYPES.has(item.eventType)) {
    return null;
  }
  const personId = primaryActorPersonId(item);
  if (personId === null) {
    return null;
  }
  const dateKey = worldDateKey(item);
  if (dateKey.length === 0) {
    return null;
  }
  return `${personId}|${dateKey}`;
}

export function isTechnicalEventType(eventType: string): boolean {
  if (TECHNICAL_EVENT_TYPES.has(eventType)) {
    return true;
  }
  if (eventType.endsWith(".initialized")) {
    return true;
  }
  if (eventType.includes("bootstrap") || eventType.includes("schema.")) {
    return true;
  }
  return false;
}

export function isContentlessHumanEvent(
  item: EventListItemView,
  who: string,
  what: string,
  result: string,
): boolean {
  if (isTechnicalEventType(item.eventType)) {
    return true;
  }
  const whatTrim = what.trim();
  if (whatTrim === "記録" || whatTrim === "出来事" || whatTrim.length === 0) {
    return true;
  }
  if (whatTrim.endsWith("に関する記録") && result === "—") {
    return true;
  }
  if ((who === "—" || who.length === 0) && result === "—") {
    return true;
  }
  return false;
}

/** True when page window has result-type members but no action_selected for that key. */
export function hasIncompleteTrainingLifecycleOnPage(items: readonly EventListItemView[]): boolean {
  const hasChoice = new Map<string, boolean>();
  const hasResult = new Map<string, boolean>();
  for (const item of items) {
    if (isTechnicalEventType(item.eventType)) {
      continue;
    }
    const key = trainingLifecycleGroupKey(item);
    if (key === null) {
      continue;
    }
    if (TRAINING_CHOICE_TYPES.has(item.eventType)) {
      hasChoice.set(key, true);
    }
    if (TRAINING_RESULT_TYPES.has(item.eventType)) {
      hasResult.set(key, true);
    }
  }
  for (const [key, resultPresent] of hasResult) {
    if (resultPresent && hasChoice.get(key) !== true) {
      return true;
    }
  }
  return false;
}

function pickTrainingPrimary(cluster: readonly EventListItemView[]): EventListItemView {
  let best = cluster[0]!;
  let bestRank = TRAINING_PRIMARY_RANK[best.eventType] ?? 100;
  for (let i = 1; i < cluster.length; i += 1) {
    const candidate = cluster[i]!;
    const rank = TRAINING_PRIMARY_RANK[candidate.eventType] ?? 100;
    if (rank < bestRank) {
      best = candidate;
      bestRank = rank;
      continue;
    }
    if (rank === bestRank && candidate.sequence < best.sequence) {
      best = candidate;
    }
  }
  return best;
}

function composeTrainingResult(cluster: readonly EventListItemView[]): string {
  const parts: string[] = [];
  const ordered = [...cluster].sort((a, b) => a.sequence - b.sequence);
  for (const item of ordered) {
    if (!TRAINING_RESULT_TYPES.has(item.eventType)) {
      continue;
    }
    const summary = eventResultSummary(item);
    if (summary !== "—" && summary.length > 0) {
      parts.push(summary);
    }
  }
  if (parts.length === 0) {
    const primary = pickTrainingPrimary(cluster);
    return eventResultSummary(primary);
  }
  return parts.join(" · ");
}

function mergeByEventId(
  pageItems: readonly EventListItemView[],
  context: readonly EventListItemView[],
): EventListItemView[] {
  const byId = new Map<string, EventListItemView>();
  for (const item of pageItems) {
    byId.set(item.eventId, item);
  }
  for (const item of context) {
    if (!byId.has(item.eventId)) {
      byId.set(item.eventId, item);
    }
  }
  return [...byId.values()];
}

/**
 * Build ordinary observer cards: filter technical/contentless, group training lifecycle.
 * Unmapped cases: non-lifecycle events stay 1:1; lifecycle without person/date key stay 1:1.
 */
export function buildHumanEventCards(
  items: readonly EventListItemView[],
  personNameById: ReadonlyMap<string, string> | Record<string, string> | undefined,
  options?: BuildHumanEventCardsOptions,
): {
  cards: HumanEventCard[];
  technical: EventListItemView[];
  hiddenContentless: EventListItemView[];
  emittedLifecycleKeys: string[];
} {
  const technical: EventListItemView[] = [];
  const hiddenContentless: EventListItemView[] = [];
  const cards: HumanEventCard[] = [];
  const emittedLifecycleKeys: string[] = [];
  const consumed = new Set<string>();
  const pageIds = new Set(items.map((item) => item.eventId));
  const suppress = options?.suppressLifecycleKeys ?? new Set<string>();
  const pool = mergeByEventId(items, options?.boundaryContext ?? []);

  const lifecycleBuckets = new Map<string, EventListItemView[]>();
  for (const item of pool) {
    if (isTechnicalEventType(item.eventType)) {
      continue;
    }
    const key = trainingLifecycleGroupKey(item);
    if (key === null) {
      continue;
    }
    const bucket = lifecycleBuckets.get(key);
    if (bucket === undefined) {
      lifecycleBuckets.set(key, [item]);
    } else {
      bucket.push(item);
    }
  }

  for (const item of items) {
    if (consumed.has(item.eventId)) {
      continue;
    }
    if (isTechnicalEventType(item.eventType)) {
      technical.push(item);
      continue;
    }

    const lifecycleKey = trainingLifecycleGroupKey(item);
    if (lifecycleKey !== null) {
      const cluster = lifecycleBuckets.get(lifecycleKey) ?? [item];
      for (const member of cluster) {
        if (pageIds.has(member.eventId)) {
          consumed.add(member.eventId);
        }
      }
      if (suppress.has(lifecycleKey)) {
        for (const member of cluster) {
          if (pageIds.has(member.eventId)) {
            hiddenContentless.push(member);
          }
        }
        continue;
      }
      const primary = pickTrainingPrimary(cluster);
      const related = cluster.filter((member) => member.eventId !== primary.eventId);
      const who = eventActorLabel(primary, personNameById);
      let what = eventWhatSentence(primary, who);
      if (
        TRAINING_CHOICE_TYPES.has(primary.eventType) === false &&
        cluster.some((m) => m.eventType.includes("rest"))
      ) {
        const rest = cluster.find(
          (m) =>
            m.eventType === "training.rest_applied" ||
            m.eventType === "training.forced_rest_applied",
        );
        if (rest !== undefined) {
          what = eventWhatSentence(rest, who);
        }
      }
      const result = composeTrainingResult(cluster);
      if (isContentlessHumanEvent(primary, who, what, result) && related.length === 0) {
        hiddenContentless.push(primary);
        continue;
      }
      cards.push({
        key: primary.eventId,
        lifecycleKey,
        primary,
        related,
        who,
        what,
        result,
      });
      emittedLifecycleKeys.push(lifecycleKey);
      continue;
    }

    const who = eventActorLabel(item, personNameById);
    const what = eventWhatSentence(item, who);
    const result = eventResultSummary(item);
    if (isContentlessHumanEvent(item, who, what, result)) {
      hiddenContentless.push(item);
      continue;
    }
    cards.push({
      key: item.eventId,
      lifecycleKey: null,
      primary: item,
      related: [],
      who,
      what,
      result,
    });
  }

  return { cards, technical, hiddenContentless, emittedLifecycleKeys };
}
