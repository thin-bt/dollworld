/**
 * Presentation-only battle / mock-result labels (FIX7 / FIX8).
 * Maps known canonical enums/kinds; unknown values stay in Developer Info.
 */

import { aptitudeLabel } from "../presentation/display-labels.js";
import { techniquePrimaryLabel } from "../presentation/technique-presentation.js";

const RESULT_KIND_LABEL: Record<string, string> = {
  completed: "決着",
  failed: "失敗",
};

const END_REASON_LABEL: Record<string, string> = {
  knockout: "ノックアウト",
  surrender: "降伏",
  unable_to_continue: "継続不能",
  max_turns_reached: "制限ターン到達",
  judge_decision: "判定勝ち",
  resolution_error: "解決エラー",
  ko: "ノックアウト",
};

/** Canonical BattleRange → Japanese (11-battle-state). */
const RANGE_LABEL: Record<string, string> = {
  contact: "密着",
  close: "近距離",
  middle: "中距離",
  long: "遠距離",
};

const ACTION_KIND_LABEL: Record<string, string> = {
  basic_attack: "基本攻撃",
  use_technique: "技を使う",
  basic_defense: "防御",
  evade: "回避",
  approach: "近づく",
  retreat: "離れる",
  focus_mind: "精神集中",
  surrender: "降伏",
  no_action: "行動なし",
  wait: "待機",
  rest: "休む",
  move_closer: "近づく",
  move_away: "離れる",
};

const EVADE_DIRECTION_LABEL: Record<string, string> = {
  hold: "その場",
  approach_one: "一歩接近",
  retreat_one: "一歩後退",
};

const REPLACEMENT_REASON_LABEL: Record<string, string> = {
  unable_to_act: "行動不能のため中止",
  unknown_technique: "未知の技のため置換",
  unlearned_technique: "未習得の技のため置換",
  requirements_not_met: "使用条件不足のため置換",
  insufficient_mental: "精神力不足のため置換",
  opponent_ended_battle: "相手が試合を終了したため中止",
};

export function battleResultKindLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  return RESULT_KIND_LABEL[value] ?? "—";
}

export function battleEndReasonLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  return END_REASON_LABEL[value] ?? "—";
}

export function battleJudgeLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }
  return "—";
}

export function battleRangeLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  return RANGE_LABEL[value] ?? "—";
}

export function battleHitLabel(value: unknown): string {
  if (value === true) {
    return "命中";
  }
  if (value === false) {
    return "外れ";
  }
  return "—";
}

export function battlePriorityLabel(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return null;
  }
  if (value >= 2) {
    return "優先度+2（割込み）";
  }
  if (value === 1) {
    return "優先度+1（割込み）";
  }
  if (value === 0) {
    return "通常優先度";
  }
  if (value === -1) {
    return "優先度-1";
  }
  return `優先度${String(value)}`;
}

/**
 * Faithful order note from ActionLog priority only (no turnOrderLogs / rolls).
 */
export function battleOrderNote(input: {
  priority: unknown;
  isFirstInTurn: boolean;
}): string | null {
  const priorityLabel = battlePriorityLabel(input.priority);
  if (input.isFirstInTurn) {
    if (typeof input.priority === "number" && input.priority >= 1) {
      return `先手（${priorityLabel ?? "優先行動"}）`;
    }
    return "先手（通常の行動順）";
  }
  if (typeof input.priority === "number" && input.priority >= 1) {
    return `後手（${priorityLabel ?? "優先行動"}）`;
  }
  return "後手";
}

export function battleReplacementReasonLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  return REPLACEMENT_REASON_LABEL[value] ?? "—";
}

const ACTIVATION_FAILURE_LABEL: Record<string, string> = {
  activation_roll_failed: "発動判定に失敗",
};

/**
 * Localize activationFailureReason. Distinct from hit/miss.
 */
export function battleActivationFailureLabel(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "string" || value.length === 0) {
    return "—";
  }
  return ACTIVATION_FAILURE_LABEL[value] ?? value;
}

/**
 * Human explanation of technique activation outcome from canonical log fields.
 * Success condition is roll <= activationChance (percent). Does not invent values.
 */
export function formatActivationDiagnostic(input: {
  activationSucceeded: unknown;
  activationFailureReason?: unknown;
  activationChance?: unknown;
  activationRoll?: unknown;
}): string | null {
  const chance =
    typeof input.activationChance === "number" && Number.isFinite(input.activationChance)
      ? input.activationChance
      : null;
  const roll =
    typeof input.activationRoll === "number" && Number.isFinite(input.activationRoll)
      ? input.activationRoll
      : null;

  if (input.activationSucceeded === false) {
    const reasonLabel = battleActivationFailureLabel(input.activationFailureReason);
    const reasonText = reasonLabel !== "—" ? reasonLabel : "技の発動に失敗";
    if (chance !== null && roll !== null) {
      return `${reasonText}（出目 ${String(roll)} / 成功上限 ${String(chance)}%）。命中判定は行われていません`;
    }
    if (chance !== null) {
      return `${reasonText}（成功上限 ${String(chance)}%）。命中判定は行われていません`;
    }
    return `${reasonText}。命中判定は行われていません`;
  }

  if (input.activationSucceeded === true && chance !== null && roll !== null) {
    return `発動成功（出目 ${String(roll)} / 成功上限 ${String(chance)}%）`;
  }
  return null;
}

export function formatBattleAction(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    return "—";
  }
  const record = value as Record<string, unknown>;
  const kind = typeof record.kind === "string" ? record.kind : "";
  const kindLabel = ACTION_KIND_LABEL[kind] ?? null;
  if (kindLabel === null) {
    return "—";
  }
  if (kind === "basic_attack" && typeof record.profile === "string") {
    return `${kindLabel}（${aptitudeLabel(record.profile)}）`;
  }
  if (kind === "use_technique" && typeof record.techniqueId === "string") {
    return `${kindLabel}（${techniquePrimaryLabel(record.techniqueId)}）`;
  }
  if (kind === "evade" && typeof record.direction === "string") {
    const dir = EVADE_DIRECTION_LABEL[record.direction] ?? null;
    return dir !== null ? `${kindLabel}（${dir}）` : kindLabel;
  }
  return kindLabel;
}

export function mockOutcomeSentence(input: {
  winnerName: string;
  loserName: string;
  endReason: unknown;
  resultKind: unknown;
}): string {
  const end = battleEndReasonLabel(input.endReason);
  if (input.resultKind === "failed") {
    return `模擬戦は失敗しました（${end}）`;
  }
  if (end === "—") {
    return `${input.winnerName} が ${input.loserName} に勝ちました`;
  }
  return `${input.winnerName} が ${input.loserName} に勝ちました（${end}）`;
}
