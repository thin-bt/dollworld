import type { AbilityScores, AptitudeScores, AbilityKey, AptitudeKey } from "../abilities.js";
import { ABILITY_KEYS, APTITUDE_KEYS } from "../abilities.js";

export function createEmptyAbilities(): AbilityScores {
  const emptyTriple = { surfaceValue: 0, expressedGeneticValue: 0, latentGeneticValue: 0 };
  return {
    stamina: { ...emptyTriple },
    strength: { ...emptyTriple },
    skill: { ...emptyTriple },
    speed: { ...emptyTriple },
    spirit: { ...emptyTriple },
    magic: { ...emptyTriple },
  };
}

export function createEmptyAptitudes(): AptitudeScores {
  const emptyTriple = { surfaceValue: 0, expressedGeneticValue: 0, latentGeneticValue: 0 };
  return {
    unarmed: { ...emptyTriple },
    sword: { ...emptyTriple },
    magic: { ...emptyTriple },
  };
}

const STAT_VALUE_KEYS = ["surfaceValue", "expressedGeneticValue", "latentGeneticValue"] as const;

export function generateAbilitiesForAllPersons(
  personCount: number,
  generateInt: (min: number, maxExclusive: number) => number,
  setAbility: (
    personIndex: number,
    key: AbilityKey,
    field: (typeof STAT_VALUE_KEYS)[number],
    value: number,
  ) => void,
  setAptitude: (
    personIndex: number,
    key: AptitudeKey,
    field: (typeof STAT_VALUE_KEYS)[number],
    value: number,
  ) => void,
  ranges: {
    surface: { min: number; max: number };
    genetic: { min: number; max: number };
    aptitudeSurface: { min: number; max: number };
    aptitudeGenetic: { min: number; max: number };
  },
): void {
  for (let personIndex = 0; personIndex < personCount; personIndex += 1) {
    for (const abilityKey of ABILITY_KEYS) {
      for (const field of STAT_VALUE_KEYS) {
        const range = field === "surfaceValue" ? ranges.surface : ranges.genetic;
        setAbility(personIndex, abilityKey, field, generateInt(range.min, range.max + 1));
      }
    }
    for (const aptitudeKey of APTITUDE_KEYS) {
      for (const field of STAT_VALUE_KEYS) {
        const range = field === "surfaceValue" ? ranges.aptitudeSurface : ranges.aptitudeGenetic;
        setAptitude(personIndex, aptitudeKey, field, generateInt(range.min, range.max + 1));
      }
    }
  }
}
