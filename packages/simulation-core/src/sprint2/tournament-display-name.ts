/**
 * Deterministic player-facing tournament display names from canonical seriesKey (WF-14 / §14.5).
 * UI must not invent names; TournamentId remains internal identity only.
 */
import type { TournamentSeriesKey } from "./types.js";

/** Stable display names keyed by canonical schedule seriesKey (same key across world years). */
const DISPLAY_NAME_BY_SERIES_KEY: Readonly<Record<TournamentSeriesKey, string>> = {
  "normal:F": "春風杯",
  "normal:E": "銀月杯",
  "normal:D": "王都武闘祭",
  "normal:C": "蒼天剣技杯",
  "normal:B": "紅蓮武闘杯",
  open: "天頂オープン",
  promotion: "公式昇格戦",
  "limited:unarmed": "覇拳祭",
  "limited:sword": "白銀剣技杯",
  "limited:magic": "紅蓮魔術祭",
};

export function resolveTournamentDisplayName(seriesKey: TournamentSeriesKey): string {
  const mapped = DISPLAY_NAME_BY_SERIES_KEY[seriesKey];
  if (mapped !== undefined) {
    return mapped;
  }
  return "公式大会";
}
