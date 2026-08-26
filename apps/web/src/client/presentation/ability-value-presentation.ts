/**
 * Presentation-only ability/aptitude value tiers (UA-032).
 * Thresholds are UI acceptance rules; does not invent domain values.
 */

export type AbilityValueTier = "peak" | "strong" | "mid" | "weak" | "critical";

export function abilityValueTier(value: number): AbilityValueTier {
  if (!Number.isFinite(value)) {
    return "mid";
  }
  if (value >= 90) {
    return "peak";
  }
  if (value >= 70) {
    return "strong";
  }
  if (value <= 10) {
    return "critical";
  }
  if (value <= 30) {
    return "weak";
  }
  return "mid";
}

/** CSS class for tiered ability values (color + weight via CSS; not color-only). */
export function abilityValueClassName(value: number): string {
  return `dw-ability-value dw-ability-value--${abilityValueTier(value)}`;
}

export function abilityValueToneLabel(tier: AbilityValueTier): string | null {
  switch (tier) {
    case "peak":
      return "突出";
    case "strong":
      return "得意";
    case "weak":
      return "苦手";
    case "critical":
      return "弱点";
    default:
      return null;
  }
}
