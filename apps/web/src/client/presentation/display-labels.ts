/**
 * Pure display mappings for Sprint 1.5 presentation hierarchy (FIX2).
 * Presentation-only — does not alter DTO semantics or invent domain values.
 */

export const STAT_KEYS = ["stamina", "strength", "skill", "speed", "spirit", "magic"] as const;
export const APTITUDE_KEYS = ["unarmed", "sword", "magic"] as const;

const LIFE_STATUS: Record<string, string> = {
  living: "生存",
  deceased: "死亡",
};

const PARTICIPATION_STATUS: Record<string, string> = {
  waiting: "待機",
  active: "参加中",
  stopped: "停止",
};

const CAREER_STATUS: Record<string, string> = {
  child: "子供",
  trainee: "修行中",
  active_competitor: "現役",
  retired: "引退",
};

const SEX_LABEL: Record<"male" | "female", string> = {
  male: "男",
  female: "女",
};

export function sexLabel(sex: "male" | "female"): string {
  return SEX_LABEL[sex];
}

const STAT_LABEL: Record<string, string> = {
  stamina: "体力",
  strength: "筋力",
  skill: "技量",
  speed: "速度",
  spirit: "精神",
  magic: "魔力",
};

const APTITUDE_LABEL: Record<string, string> = {
  unarmed: "格闘",
  sword: "剣技",
  magic: "魔法",
};

const LEARNED_STATE: Record<string, string> = {
  learning: "習得中",
  acquired: "習得済",
};

const SORT_BY_LABEL: Record<string, string> = {
  personId: "識別子",
  stamina: "体力",
  strength: "筋力",
  skill: "技量",
  speed: "速度",
  spirit: "精神",
  magic: "魔力",
  unarmed: "格闘",
  sword: "剣技",
  magicAptitude: "魔法",
};

const STATE_FILTER_LABEL: Record<string, string> = {
  "": "（指定なし）",
  "life:living": "生存",
  "life:deceased": "死亡",
  "career:child": "子供",
  "career:trainee": "修行中",
  "career:active_competitor": "現役",
  "career:retired": "引退",
};

const EVENT_GROUP_LABEL: Record<string, string> = {
  "": "（指定なし）",
  training: "修行",
  technique_learning: "技習得",
};

const VALIDATION_STATUS_LABEL: Record<string, string> = {
  "": "（指定なし）",
  success: "成功",
  failure: "失敗",
};

const SESSION_STATE_LABEL: Record<string, string> = {
  empty: "未開始",
  ready: "準備完了",
  updating: "更新中",
};

export function labelFrom(map: Record<string, string>, value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return map[""] ?? "—";
  }
  return map[value] ?? value;
}

export function lifeStatusLabel(value: string): string {
  return labelFrom(LIFE_STATUS, value);
}

export function participationStatusLabel(value: string | null): string {
  if (value === null) {
    return "—";
  }
  return labelFrom(PARTICIPATION_STATUS, value);
}

export function careerStatusLabel(value: string): string {
  return labelFrom(CAREER_STATUS, value);
}

export function statLabel(key: string): string {
  return STAT_LABEL[key] ?? key;
}

export function aptitudeLabel(key: string): string {
  return APTITUDE_LABEL[key] ?? key;
}

export function learnedStateLabel(value: string): string {
  return labelFrom(LEARNED_STATE, value);
}

export function sortByLabel(value: string): string {
  return labelFrom(SORT_BY_LABEL, value);
}

export function stateFilterLabel(value: string): string {
  return labelFrom(STATE_FILTER_LABEL, value);
}

export function eventGroupLabel(value: string): string {
  return labelFrom(EVENT_GROUP_LABEL, value);
}

export function validationStatusLabel(value: string): string {
  return labelFrom(VALIDATION_STATUS_LABEL, value);
}

export function sessionStateLabel(value: string): string {
  return labelFrom(SESSION_STATE_LABEL, value);
}

export function displayNull(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return String(value);
}

export function formatWorldDate(year: number, month: number, week: number): string {
  return `${String(year)}年 ${String(month)}月 第${String(week)}週`;
}

/**
 * Presentation-only calendar label from already-authorized worldDate objects.
 * Accepts worldSummary/WorldDateView `{year,month,week}` and EventEnvelope
 * `{year,month,weekOfMonth}` without remapping semantics or inventing fields.
 */
export function formatWorldDateValue(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return "—";
  }
  const record = value as Record<string, unknown>;
  const year = record.year;
  const month = record.month;
  const week = record.weekOfMonth ?? record.week;
  if (typeof year !== "number" || typeof month !== "number" || typeof week !== "number") {
    return "—";
  }
  return formatWorldDate(year, month, week);
}

/** Ability score label for spirit surfaceValue (distinct from currentMental). */
export function spiritAbilityLabel(): string {
  return "精神";
}

/** Current mental points label (distinct from abilities.spirit). */
export function currentMentalLabel(): string {
  return "現在精神力";
}

const TRAINING_KIND_LABEL: Record<string, string> = {
  train_stat: "能力の修行",
  learn_technique: "技を覚える",
  practice_technique: "技を練る",
  rest: "休養",
};

/** Weekly training history action kind (UI-005 trainingKind). */
export function trainingKindLabel(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return TRAINING_KIND_LABEL[value] ?? value;
}

function formatStatChangeDelta(change: {
  stat?: unknown;
  before?: unknown;
  after?: unknown;
  amount?: unknown;
}): string | null {
  if (typeof change.stat !== "string" || change.stat.length === 0) {
    return null;
  }
  const label = statLabel(change.stat);
  if (
    typeof change.before === "number" &&
    typeof change.after === "number" &&
    Number.isFinite(change.before) &&
    Number.isFinite(change.after)
  ) {
    const signed =
      typeof change.amount === "number" && Number.isFinite(change.amount)
        ? change.amount
        : change.after - change.before;
    const sign = signed > 0 ? "+" : "";
    return `${label} ${sign}${String(signed)}（${String(change.before)}→${String(change.after)}）`;
  }
  if (typeof change.amount === "number" && Number.isFinite(change.amount)) {
    const sign = change.amount > 0 ? "+" : "";
    return `${label} ${sign}${String(change.amount)}`;
  }
  return null;
}

/**
 * Human line for one training-history row. Uses trainingKind + optional targetStat
 * and canonical statChanges (before/after/amount) without inventing domain facts.
 */
export function trainingHistoryItemLabel(item: {
  trainingKind?: unknown;
  targetStat?: unknown;
  statChanges?: unknown;
}): string {
  const kind = typeof item.trainingKind === "string" ? item.trainingKind : "";
  const base =
    kind === "train_stat" && typeof item.targetStat === "string" && item.targetStat.length > 0
      ? `${statLabel(item.targetStat)}の修行`
      : trainingKindLabel(kind.length > 0 ? kind : null);

  if (!Array.isArray(item.statChanges) || item.statChanges.length === 0) {
    return base;
  }
  const deltas: string[] = [];
  for (const entry of item.statChanges) {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const formatted = formatStatChangeDelta(entry as Record<string, unknown>);
    if (formatted !== null) {
      deltas.push(formatted);
    }
  }
  if (deltas.length === 0) {
    return base;
  }
  return `${base}：${deltas.join("、")}`;
}
