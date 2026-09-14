/** Player-facing Japanese labels for competition wire views (no raw domain tokens). */

const TOURNAMENT_KIND_LABELS: Record<string, string> = {
  normal: "通常大会",
  open: "オープン大会",
  limited: "限定大会",
  promotion: "昇格大会",
};

const RANK_LABELS: Record<string, string> = {
  F: "Fランク",
  E: "Eランク",
  D: "Dランク",
  C: "Cランク",
  B: "Bランク",
  A: "Aランク",
  S: "Sランク",
};

export function tournamentKindPlayerLabel(kind: string | null): string | null {
  if (kind === null || kind.length === 0) {
    return null;
  }
  return TOURNAMENT_KIND_LABELS[kind] ?? "公式大会";
}

export function rankBandPlayerLabel(rank: string | null): string | null {
  if (rank === null || rank.length === 0) {
    return null;
  }
  return RANK_LABELS[rank] ?? `${rank}ランク`;
}

export function formatYenForPlayer(amount: number): string {
  return `${amount.toLocaleString("ja-JP")}G`;
}

export function officialRecordPlayerLabel(wins: number, losses: number): string {
  return `${wins}勝${losses}敗`;
}

const DOMAIN_LABELS: Record<string, string> = {
  unarmed: "格闘",
  sword: "剣技",
  magic: "魔法",
};

export function limitedDomainPlayerLabel(domain: string | null | undefined): string | null {
  if (domain === null || domain === undefined || domain.length === 0) {
    return null;
  }
  return DOMAIN_LABELS[domain] ?? "限定";
}

export function tournamentLifecyclePlayerLabel(state: string): string {
  const labels: Record<string, string> = {
    planned: "予定",
    scheduled: "開催予定",
    postponed: "延期",
    merged: "統合済み",
    cancelled: "中止",
  };
  return labels[state] ?? "予定";
}

export function worldTimePlayerLabel(year: number, month: number, weekOfMonth: number): string {
  return `世界${year}年 ${month}月 第${weekOfMonth}週`;
}

export function tournamentTimingPlayerLabel(month: number, weekOfMonth: number): string {
  return `${month}月 第${weekOfMonth}週`;
}
