import type { TournamentScheduleReadModelEntry } from "@shared-world/simulation-core";
import {
  limitedDomainPlayerLabel,
  rankBandPlayerLabel,
  tournamentKindPlayerLabel,
} from "./competition-player-labels.js";

export function rankOrCategoryLabelFromScheduleEntry(
  entry: TournamentScheduleReadModelEntry,
): string {
  if (entry.kind === "normal") {
    return rankBandPlayerLabel(entry.targetRank ?? null) ?? "通常";
  }
  if (entry.kind === "open") {
    return "A・Sオープン";
  }
  if (entry.kind === "promotion") {
    return "昇格戦";
  }
  if (entry.kind === "limited") {
    const domain = limitedDomainPlayerLabel(entry.domain);
    return domain !== null ? `${domain}限定` : "限定大会";
  }
  return tournamentKindPlayerLabel(entry.kind) ?? "大会";
}
