import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  allocateByLargestRemainder,
  validateInitialWorldConfig,
  type InitialWorldConfig,
  type RankDistribution,
} from "@shared-world/simulation-core";

const BASELINE_RELATIVE = "config/initial-world.config.json";

const AGE_BAND_WEIGHTS = [80, 120, 220, 180] as const;
const BASELINE_RANK_WEIGHTS: RankDistribution = {
  F: 70,
  E: 55,
  D: 40,
  C: 30,
  B: 15,
  A: 8,
  S: 2,
};

function scaleParts(weights: readonly number[], target: number): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const bases = weights.map((w) => Math.floor((w * target) / weightSum));
  let allocated = bases.reduce((sum, n) => sum + n, 0);
  const remainders = weights.map((w, i) => ({
    index: i,
    remainder: (w * target) % weightSum,
  }));
  remainders.sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });
  const result = [...bases];
  let cursor = 0;
  while (allocated < target) {
    const entry = remainders[cursor % remainders.length]!;
    result[entry.index] = (result[entry.index] ?? 0) + 1;
    allocated += 1;
    cursor += 1;
  }
  return result;
}

/**
 * For sexRatioMale=0.5, each age-band count should be even so
 * Σ floor(count/2) === floor(totalLiving/2).
 */
function enforceEvenBandsForHalfSexRatio(counts: number[]): number[] {
  const result = [...counts];
  for (let i = 0; i < result.length - 1; i += 1) {
    const value = result[i]!;
    if (value % 2 !== 0) {
      result[i] = value - 1;
      result[result.length - 1] = (result[result.length - 1] ?? 0) + 1;
    }
  }
  return result;
}

/**
 * Load and validate the repository baseline config.
 */
export function loadBaselineConfig(repoRoot: string): InitialWorldConfig {
  const raw = JSON.parse(readFileSync(join(repoRoot, BASELINE_RELATIVE), "utf8")) as unknown;
  const result = validateInitialWorldConfig(raw);
  if (!result.ok) {
    throw new Error(`baseline config validation failed: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

/**
 * Build a scaled InitialWorldConfig for performance profiles.
 * Keeps family name budget ≤ 200 by raising maximumMembersPerFamily when needed.
 * Does not mutate the baseline object.
 */
export function buildScaledPopulationConfig(
  baseline: InitialWorldConfig,
  totalLiving: number,
): InitialWorldConfig {
  if (!Number.isSafeInteger(totalLiving) || totalLiving < 1) {
    throw new Error(`totalLiving must be a positive safe integer, got ${String(totalLiving)}`);
  }

  const ageCountsRaw = scaleParts(AGE_BAND_WEIGHTS, totalLiving);
  const ageCounts =
    baseline.population.sexRatioMale === 0.5
      ? enforceEvenBandsForHalfSexRatio(ageCountsRaw)
      : ageCountsRaw;
  const age0To7 = ageCounts[0]!;
  const age8To15 = ageCounts[1]!;
  const age16To41 = ageCounts[2]!;
  const age42Plus = ageCounts[3]!;

  const deceased = Math.max(0, Math.round((totalLiving * 200) / 600));
  const totalPersons = totalLiving + deceased;
  const familyCount = Math.min(200, Math.max(1, baseline.families.initialFamilyCount));
  const minimumMembers = baseline.families.minimumMembersPerFamily;
  const requiredMaxMembers = Math.ceil(totalPersons / familyCount);
  const maximumMembers = Math.max(baseline.families.maximumMembersPerFamily, requiredMaxMembers);

  if (familyCount * minimumMembers > totalPersons) {
    throw new Error("scaled population violates family minimum members constraint");
  }
  if (totalPersons > familyCount * maximumMembers) {
    throw new Error("scaled population violates family maximum members constraint");
  }

  const activeRankDistribution = allocateByLargestRemainder(BASELINE_RANK_WEIGHTS, age16To41);
  const lineageCount = Math.min(
    familyCount,
    Math.max(1, Math.round((totalLiving * baseline.lineages.initialLineageCount) / 600)),
  );
  const qualifiedMasters = Math.min(
    age42Plus,
    Math.max(1, Math.round((totalLiving * baseline.lineages.initialQualifiedMasters) / 600)),
  );

  const scaled: InitialWorldConfig = {
    ...baseline,
    profileId: `sprint0-perf-${String(totalLiving)}-v1`,
    purpose: `Sprint 0 performance profile for ${String(totalLiving)} living persons (test fixture).`,
    population: {
      ...baseline.population,
      totalLiving,
      ageBands: [
        { minAge: 0, maxAge: 7, count: age0To7 },
        { minAge: 8, maxAge: 15, count: age8To15 },
        { minAge: 16, maxAge: 41, count: age16To41 },
        { minAge: 42, maxAge: 70, count: age42Plus },
      ],
      activeRankDistribution,
    },
    history: {
      ...baseline.history,
      initialDeceasedAncestors: deceased,
    },
    families: {
      ...baseline.families,
      initialFamilyCount: familyCount,
      maximumMembersPerFamily: maximumMembers,
    },
    lineages: {
      ...baseline.lineages,
      initialLineageCount: lineageCount,
      initialQualifiedMasters: qualifiedMasters,
    },
  };

  const validated = validateInitialWorldConfig(JSON.parse(JSON.stringify(scaled)) as unknown);
  if (!validated.ok) {
    throw new Error(
      `scaled config validation failed for ${String(totalLiving)}: ${JSON.stringify(validated.issues)}`,
    );
  }
  return validated.value;
}
