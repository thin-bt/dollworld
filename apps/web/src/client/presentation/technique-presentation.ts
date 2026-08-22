/**
 * Presentation-only technique labels (FIX14 technique presentation followup).
 * Does not alter TechniqueId, catalog hash, or battle semantics.
 *
 * Label choices for current Sprint1.5 built-ins:
 * - technique_sword_basic → 基本剣技 (Inbox required)
 * - technique_magic_basic → 基本魔法 (Inbox required)
 * - technique_alpha → 基本格闘 (presentation-only; catalog `name` is the raw ID /
 *   English placeholder, so category-based neutral label is used)
 */

import { aptitudeLabel, learnedStateLabel } from "./display-labels.js";

const TECHNIQUE_PRIMARY_LABEL: Record<string, string> = {
  technique_sword_basic: "基本剣技",
  technique_magic_basic: "基本魔法",
  technique_alpha: "基本格闘",
};

const CATEGORY_FALLBACK_LABEL: Record<string, string> = {
  unarmed: "基本格闘",
  sword: "基本剣技",
  magic: "基本魔法",
};

const CATEGORY_NOUN: Record<string, string> = {
  unarmed: "格闘",
  sword: "剣技",
  magic: "魔法",
};

/** Canonical BattleRange → Japanese (aligned with battle-display). */
const RANGE_LABEL: Record<string, string> = {
  contact: "密着",
  close: "近距離",
  middle: "中距離",
  long: "遠距離",
};

function readDefinition(tech: Record<string, unknown>): Record<string, unknown> | null {
  const definition = tech.definition;
  if (definition !== null && typeof definition === "object" && !Array.isArray(definition)) {
    return definition as Record<string, unknown>;
  }
  return null;
}

function readCategory(definition: Record<string, unknown> | null): string | null {
  if (definition === null) {
    return null;
  }
  const category = definition.category;
  return typeof category === "string" && category.length > 0 ? category : null;
}

export function techniquePrimaryLabel(
  techniqueId: string | null | undefined,
  category?: string | null,
): string {
  if (typeof techniqueId === "string" && techniqueId.length > 0) {
    const mapped = TECHNIQUE_PRIMARY_LABEL[techniqueId];
    if (mapped !== undefined) {
      return mapped;
    }
  }
  if (typeof category === "string" && category.length > 0) {
    const byCategory = CATEGORY_FALLBACK_LABEL[category];
    if (byCategory !== undefined) {
      return byCategory;
    }
  }
  return "技";
}

export function techniqueCategoryPresentation(category: string | null | undefined): string | null {
  if (category === null || category === undefined || category === "") {
    return null;
  }
  const noun = CATEGORY_NOUN[category];
  if (noun !== undefined) {
    return noun;
  }
  return aptitudeLabel(category);
}

export function formatTechniqueUsableRanges(usableRanges: unknown): string | null {
  if (!Array.isArray(usableRanges) || usableRanges.length === 0) {
    return null;
  }
  const labels: string[] = [];
  for (const item of usableRanges) {
    if (typeof item !== "string" || item.length === 0) {
      continue;
    }
    labels.push(RANGE_LABEL[item] ?? item);
  }
  if (labels.length === 0) {
    return null;
  }
  return labels.join("・");
}

export function techniquePresentationDescription(
  category: string | null | undefined,
  usableRanges: unknown,
): string | null {
  const noun =
    typeof category === "string" && category.length > 0 ? CATEGORY_NOUN[category] : undefined;
  if (noun === undefined) {
    return null;
  }
  const ranges = formatTechniqueUsableRanges(usableRanges);
  if (ranges === null) {
    return `${noun}の基本技。`;
  }
  return `${noun}の基本技。${ranges}で使用可能。`;
}

export function formatMasteryDisplay(masteryHundredths: unknown): string | null {
  if (typeof masteryHundredths !== "number" || !Number.isFinite(masteryHundredths)) {
    return null;
  }
  // masteryHundredths is 0..10000 → display as 0..100 with up to 2 decimals when needed.
  const value = masteryHundredths / 100;
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatMentalCostDisplay(mentalCost: unknown): string | null {
  if (typeof mentalCost !== "number" || !Number.isFinite(mentalCost)) {
    return null;
  }
  return String(mentalCost);
}

export type TechniquePresentation = {
  techniqueId: string;
  primaryLabel: string;
  categoryLabel: string | null;
  description: string | null;
  usableRangesLabel: string | null;
  mentalCostLabel: string | null;
  masteryLabel: string | null;
  learnedStateLabel: string | null;
};

export function presentTechniqueView(tech: Record<string, unknown>): TechniquePresentation {
  const techniqueId = typeof tech.techniqueId === "string" ? tech.techniqueId : "";
  const definition = readDefinition(tech);
  const category = readCategory(definition);
  const learnedState = typeof tech.learnedState === "string" ? tech.learnedState : "";
  return {
    techniqueId,
    primaryLabel: techniquePrimaryLabel(techniqueId, category),
    categoryLabel: techniqueCategoryPresentation(category),
    description: techniquePresentationDescription(category, definition?.usableRanges),
    usableRangesLabel: formatTechniqueUsableRanges(definition?.usableRanges),
    mentalCostLabel: formatMentalCostDisplay(definition?.mentalCost),
    masteryLabel: formatMasteryDisplay(tech.masteryHundredths),
    learnedStateLabel: learnedState.length > 0 ? learnedStateLabel(learnedState) : null,
  };
}
