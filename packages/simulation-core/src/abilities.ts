export const ABILITY_KEYS = ["stamina", "strength", "skill", "speed", "spirit", "magic"] as const;

export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const APTITUDE_KEYS = ["unarmed", "sword", "magic"] as const;

export type AptitudeKey = (typeof APTITUDE_KEYS)[number];

/** Surface / genetic values shared by both ability and aptitude entries. */
export type StatValueTriple = {
  surfaceValue: number;
  expressedGeneticValue: number;
  latentGeneticValue: number;
};

/** Foundation ability scores keyed by AbilityKey (includes ability-magic). */
export type AbilityScores = { readonly [K in AbilityKey]: StatValueTriple };

/** Aptitude scores keyed by AptitudeKey (includes aptitude-magic; distinct from AbilityScores). */
export type AptitudeScores = { readonly [K in AptitudeKey]: StatValueTriple };
