/**
 * Presentation-only event card labels (FIX6 / FIX7).
 * Uses existing eventType / payload / personIds — does not invent game facts.
 */

import { statLabel } from "../presentation/display-labels.js";
import { techniquePrimaryLabel } from "../presentation/technique-presentation.js";
import type { EventListItemView } from "./ui008-views.js";

const EVENT_TYPE_SUMMARY: Record<string, string> = {
  "training.action_selected": "修行の行動を選んだ",
  "training.rest_applied": "休息した",
  "training.forced_rest_applied": "強制休息した",
  "training.stat_growth_applied": "能力が成長した",
  "training.condition_updated": "コンディションが更新された",
  training_completed: "修行の記録",
  "technique.learning_progressed": "技の習得が進んだ",
  "technique.acquired": "技を習得した",
  "technique.mastery_increased": "技の熟練度が上がった",
};

const TRAINING_ACTION_LABEL: Record<string, string> = {
  train_stat: "能力を鍛える",
  learn_technique: "技を覚える",
  practice_technique: "技を練る",
  rest: "休む",
};

function payloadRecord(item: EventListItemView): Record<string, unknown> {
  const payload = item.payload;
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  return payload as Record<string, unknown>;
}

export function primaryActorPersonId(item: EventListItemView): string | null {
  const ids = item.entities?.personIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    return null;
  }
  const first = ids[0];
  return typeof first === "string" && first.length > 0 ? first : null;
}

export function eventActorLabel(
  item: EventListItemView,
  personNameById: ReadonlyMap<string, string> | Record<string, string> | undefined,
): string {
  const personId = primaryActorPersonId(item);
  if (personId === null) {
    return "—";
  }
  if (personNameById instanceof Map) {
    return personNameById.get(personId) ?? personId;
  }
  if (personNameById !== undefined && Object.hasOwn(personNameById, personId)) {
    const named = (personNameById as Record<string, string>)[personId];
    if (typeof named === "string") {
      return named;
    }
  }
  return personId;
}

export function eventTypeSummaryLabel(eventType: string): string {
  return EVENT_TYPE_SUMMARY[eventType] ?? "記録";
}

export function isMappedEventType(eventType: string): boolean {
  return Object.hasOwn(EVENT_TYPE_SUMMARY, eventType);
}

function trainingActionLabel(action: unknown): string | null {
  if (typeof action !== "string" || action.length === 0) {
    return null;
  }
  return TRAINING_ACTION_LABEL[action] ?? action;
}

function formatDeltaPair(label: string, before: unknown, after: unknown): string | null {
  if (typeof before !== "number" || typeof after !== "number") {
    return null;
  }
  return `${label} ${String(before)}→${String(after)}`;
}

/**
 * Primary human sentence: WHO + WHAT, derived only from canonical type/payload.
 */
export function eventWhatSentence(item: EventListItemView, who: string): string {
  const payload = payloadRecord(item);
  const type = item.eventType;
  const named = who.length > 0 && who !== "—" ? who : null;

  if (type === "training.action_selected") {
    const action = typeof payload.action === "string" ? payload.action : "";
    if (action === "rest") {
      return named !== null ? `${named}は今週の修行を休んだ` : "今週の修行を休んだ";
    }
    if (action === "train_stat") {
      const stat =
        typeof payload.targetStat === "string" && payload.targetStat.length > 0
          ? statLabel(payload.targetStat)
          : null;
      if (named !== null && stat !== null) {
        return `${named}が${stat}の修行を行った`;
      }
      return named !== null ? `${named}が修行を行った` : "修行を行った";
    }
    if (action === "learn_technique") {
      return named !== null ? `${named}が技の習得に取り組んだ` : "技の習得に取り組んだ";
    }
    if (action === "practice_technique") {
      return named !== null ? `${named}が技の練成を行った` : "技の練成を行った";
    }
    return named !== null ? `${named}が修行の行動を選んだ` : "修行の行動を選んだ";
  }

  if (type === "training.rest_applied") {
    return named !== null ? `${named}は今週の修行を休んだ` : "今週の修行を休んだ";
  }

  if (type === "training.forced_rest_applied") {
    return named !== null ? `${named}は強制休息した` : "強制休息した";
  }

  if (type === "training.stat_growth_applied") {
    const stat =
      typeof payload.targetStat === "string" && payload.targetStat.length > 0
        ? statLabel(payload.targetStat)
        : null;
    if (named !== null && stat !== null) {
      return `${named}の${stat}が成長した`;
    }
    return named !== null ? `${named}の能力が成長した` : "能力が成長した";
  }

  if (type === "training.condition_updated") {
    return named !== null ? `${named}のコンディションが更新された` : "コンディションが更新された";
  }

  if (type === "training_completed") {
    return named !== null ? `${named}の修行記録` : "修行の記録";
  }

  if (type === "technique.learning_progressed") {
    return named !== null ? `${named}の技の習得が進んだ` : "技の習得が進んだ";
  }

  if (type === "technique.acquired") {
    const tech =
      typeof payload.techniqueId === "string" && payload.techniqueId.length > 0
        ? techniquePrimaryLabel(payload.techniqueId)
        : null;
    if (named !== null && tech !== null) {
      return `${named}が${tech}を習得した`;
    }
    return named !== null ? `${named}が技を習得した` : "技を習得した";
  }

  if (type === "technique.mastery_increased") {
    return named !== null ? `${named}の技の熟練度が上がった` : "技の熟練度が上がった";
  }

  // Unmapped: conservative label; raw eventType stays in Developer Info.
  return named !== null ? `${named}に関する記録` : "記録";
}

export function eventResultSummary(item: EventListItemView): string {
  const payload = payloadRecord(item);
  const type = item.eventType;

  if (type === "training.action_selected") {
    const action = trainingActionLabel(payload.action);
    const parts: string[] = [];
    if (action !== null) {
      parts.push(action);
    }
    if (typeof payload.targetStat === "string" && payload.targetStat.length > 0) {
      parts.push(`対象: ${statLabel(payload.targetStat)}`);
    }
    if (typeof payload.targetTechniqueId === "string" && payload.targetTechniqueId.length > 0) {
      parts.push(`技: ${techniquePrimaryLabel(payload.targetTechniqueId)}`);
    }
    if (payload.forced === true) {
      parts.push("強制");
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (type === "training.rest_applied" || type === "training.forced_rest_applied") {
    const parts: string[] = [];
    if (typeof payload.reason === "string" && payload.reason.length > 0) {
      parts.push(payload.reason === "weekly_forced_rest" ? "強制休息" : "週間休息");
    }
    const fatigue = payload.fatigue;
    if (fatigue !== null && typeof fatigue === "object" && !Array.isArray(fatigue)) {
      const f = fatigue as Record<string, unknown>;
      const line = formatDeltaPair("疲労", f.before, f.after);
      if (line !== null) parts.push(line);
    }
    const condition = payload.condition;
    if (condition !== null && typeof condition === "object" && !Array.isArray(condition)) {
      const c = condition as Record<string, unknown>;
      const line = formatDeltaPair("調子", c.before, c.after);
      if (line !== null) parts.push(line);
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (type === "training.stat_growth_applied") {
    const parts: string[] = [];
    if (typeof payload.targetStat === "string") {
      parts.push(statLabel(payload.targetStat));
    }
    const line = formatDeltaPair("値", payload.before, payload.after);
    if (line !== null) parts.push(line);
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (type === "training.condition_updated") {
    const parts: string[] = [];
    const fatigue = payload.fatigue;
    if (fatigue !== null && typeof fatigue === "object" && !Array.isArray(fatigue)) {
      const f = fatigue as Record<string, unknown>;
      const line = formatDeltaPair("疲労", f.before, f.after);
      if (line !== null) parts.push(line);
    }
    const condition = payload.condition;
    if (condition !== null && typeof condition === "object" && !Array.isArray(condition)) {
      const c = condition as Record<string, unknown>;
      const line = formatDeltaPair("調子", c.before, c.after);
      if (line !== null) parts.push(line);
    }
    const confidence = payload.confidence;
    if (confidence !== null && typeof confidence === "object" && !Array.isArray(confidence)) {
      const c = confidence as Record<string, unknown>;
      const line = formatDeltaPair("自信", c.before, c.after);
      if (line !== null) parts.push(line);
    }
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (type === "technique.learning_progressed" || type === "technique.mastery_increased") {
    const parts: string[] = [];
    if (typeof payload.techniqueId === "string") {
      parts.push(techniquePrimaryLabel(payload.techniqueId));
    }
    const line = formatDeltaPair("進捗", payload.before, payload.after);
    if (line !== null) parts.push(line);
    return parts.length > 0 ? parts.join(" · ") : "—";
  }

  if (type === "technique.acquired") {
    if (typeof payload.techniqueId === "string" && payload.techniqueId.length > 0) {
      return techniquePrimaryLabel(payload.techniqueId);
    }
    return "—";
  }

  return "—";
}
