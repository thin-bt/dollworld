/**
 * Pure deterministic contracts for S1-SPEC-0.1.19 BattleResult clarification.
 * Does not implement finalizeBattleResult / runBattleToCompletion / WorldEngine.
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleKind } from "./battle-enums.js";
import { multiplyBasisPointsFloor } from "./multiply-basis-points.js";
import { selectMasteryCurrentValueFactor } from "./technique-mastery.js";
import type { Sprint1Config } from "./types.js";

export const BATTLE_PHASES = ["opening", "middle", "closing"] as const;
export type BattlePhase = (typeof BATTLE_PHASES)[number];

export const JUDGE_DECISIVE_CRITERIA = [
  "total_score",
  "effective_damage_ratio",
  "successful_hits",
  "remaining_durability_ratio",
  "remaining_mental",
  "lower_in_battle_consumption",
  "seeded_rng",
] as const;
export type JudgeDecisiveCriterion = (typeof JUDGE_DECISIVE_CRITERIA)[number];

export type JudgeTieBreakSide = "sideA" | "sideB";

/**
 * phaseIndex for turnNumber n (1-based) given turnsExecuted T (>0).
 * `min(2, floor((n - 1) * 3 / T))`.
 */
export function computeBattlePhaseIndex(turnNumber: number, turnsExecuted: number): number {
  if (
    !Number.isSafeInteger(turnNumber) ||
    !Number.isSafeInteger(turnsExecuted) ||
    turnNumber < 1 ||
    turnsExecuted < 1
  ) {
    throw new Error("computeBattlePhaseIndex requires turnNumber>=1 and turnsExecuted>=1");
  }
  return Math.min(2, Math.floor(((turnNumber - 1) * 3) / turnsExecuted));
}

export function battlePhaseFromIndex(phaseIndex: number): BattlePhase {
  if (phaseIndex === 0) return "opening";
  if (phaseIndex === 1) return "middle";
  if (phaseIndex === 2) return "closing";
  throw new Error(`invalid phaseIndex: ${String(phaseIndex)}`);
}

/** Phases that have at least one turn for T=turnsExecuted, in opening→middle→closing order. */
export function listBattlePhasesForTurnsExecuted(turnsExecuted: number): readonly BattlePhase[] {
  if (!Number.isSafeInteger(turnsExecuted) || turnsExecuted < 0) {
    throw new Error("turnsExecuted must be a non-negative safe integer");
  }
  if (turnsExecuted === 0) return [];
  const present = new Set<BattlePhase>();
  for (let n = 1; n <= turnsExecuted; n += 1) {
    present.add(battlePhaseFromIndex(computeBattlePhaseIndex(n, turnsExecuted)));
  }
  return BATTLE_PHASES.filter((phase) => present.has(phase));
}

export type KeyMomentCandidateLog = {
  damage: number | null;
  injuryResult: "none" | "minor" | "major" | null;
  resolvedActionKind: string;
};

/** 13 §9.2 inclusion predicate (no subjective scoring). */
export function isBattleKeyMomentLog(log: KeyMomentCandidateLog): boolean {
  if (log.damage !== null && log.damage > 0) return true;
  if (log.injuryResult === "minor" || log.injuryResult === "major") return true;
  if (log.resolvedActionKind === "surrender") return true;
  return false;
}

/** Display/summary durability ratio in basis points 0..10000. */
export function computeFinalDurabilityRatioBasisPoints(
  currentDurability: number,
  maxDurability: number,
): ValidationResult<number> {
  if (
    !Number.isSafeInteger(currentDurability) ||
    !Number.isSafeInteger(maxDurability) ||
    currentDurability < 0 ||
    maxDurability <= 0
  ) {
    return failure([
      {
        path: "/durability",
        message: "currentDurability>=0 and maxDurability>0 safe integers required",
        actual: { currentDurability, maxDurability },
      },
    ]);
  }
  return success(Math.floor((currentDurability * 10000) / maxDurability));
}

export type CrossProductComparison = "sideA" | "sideB" | "tie";

/** Compare left vs right as BigInt; larger wins. */
export function compareBigIntCrossProduct(left: bigint, right: bigint): CrossProductComparison {
  if (left > right) return "sideA";
  if (left < right) return "sideB";
  return "tie";
}

/**
 * Effective damage ratio tie-break (13 §5.1 locked cross product).
 * left = A.damageDealt * B.maxDurability
 * right = B.damageDealt * A.maxDurability
 */
export function compareEffectiveDamageRatio(
  damageDealtA: number,
  maxDurabilityA: number,
  damageDealtB: number,
  maxDurabilityB: number,
): CrossProductComparison {
  const left = BigInt(damageDealtA) * BigInt(maxDurabilityB);
  const right = BigInt(damageDealtB) * BigInt(maxDurabilityA);
  return compareBigIntCrossProduct(left, right);
}

/** Remaining durability ratio tie-break (13 §5.3). */
export function compareRemainingDurabilityRatio(
  currentA: number,
  maxA: number,
  currentB: number,
  maxB: number,
): CrossProductComparison {
  const left = BigInt(currentA) * BigInt(maxB);
  const right = BigInt(currentB) * BigInt(maxA);
  return compareBigIntCrossProduct(left, right);
}

export function compareSuccessfulHits(hitsA: number, hitsB: number): CrossProductComparison {
  if (hitsA > hitsB) return "sideA";
  if (hitsA < hitsB) return "sideB";
  return "tie";
}

export function compareRemainingMental(mentalA: number, mentalB: number): CrossProductComparison {
  if (mentalA > mentalB) return "sideA";
  if (mentalA < mentalB) return "sideB";
  return "tie";
}

/** Lower inBattleConsumption wins. */
export function compareLowerInBattleConsumption(
  consumptionA: number,
  consumptionB: number,
): CrossProductComparison {
  if (consumptionA < consumptionB) return "sideA";
  if (consumptionA > consumptionB) return "sideB";
  return "tie";
}

export type JudgeTieBreakInput = {
  totalScoreA: number;
  totalScoreB: number;
  damageDealtA: number;
  damageDealtB: number;
  maxDurabilityA: number;
  maxDurabilityB: number;
  successfulHitsA: number;
  successfulHitsB: number;
  currentDurabilityA: number;
  currentDurabilityB: number;
  currentMentalA: number;
  currentMentalB: number;
  inBattleConsumptionA: number;
  inBattleConsumptionB: number;
};

export type JudgeTieBreakResult = {
  winnerSide: JudgeTieBreakSide;
  decisiveCriterion: JudgeDecisiveCriterion;
  seededRngRoll: 0 | 1 | null;
  rngDraws: 0 | 1;
};

/**
 * Full judge winner selection after scores are known (13 §5).
 * Consumes RNG only when criterion reaches seeded_rng: exactly nextInt(0, 2).
 */
export function decideJudgeWinner(
  input: JudgeTieBreakInput,
  rng: SeededRng | null,
): ValidationResult<JudgeTieBreakResult> {
  if (input.totalScoreA > input.totalScoreB) {
    return success({
      winnerSide: "sideA",
      decisiveCriterion: "total_score",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }
  if (input.totalScoreA < input.totalScoreB) {
    return success({
      winnerSide: "sideB",
      decisiveCriterion: "total_score",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  const damage = compareEffectiveDamageRatio(
    input.damageDealtA,
    input.maxDurabilityA,
    input.damageDealtB,
    input.maxDurabilityB,
  );
  if (damage !== "tie") {
    return success({
      winnerSide: damage,
      decisiveCriterion: "effective_damage_ratio",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  const hits = compareSuccessfulHits(input.successfulHitsA, input.successfulHitsB);
  if (hits !== "tie") {
    return success({
      winnerSide: hits,
      decisiveCriterion: "successful_hits",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  const durability = compareRemainingDurabilityRatio(
    input.currentDurabilityA,
    input.maxDurabilityA,
    input.currentDurabilityB,
    input.maxDurabilityB,
  );
  if (durability !== "tie") {
    return success({
      winnerSide: durability,
      decisiveCriterion: "remaining_durability_ratio",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  const mental = compareRemainingMental(input.currentMentalA, input.currentMentalB);
  if (mental !== "tie") {
    return success({
      winnerSide: mental,
      decisiveCriterion: "remaining_mental",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  const consumption = compareLowerInBattleConsumption(
    input.inBattleConsumptionA,
    input.inBattleConsumptionB,
  );
  if (consumption !== "tie") {
    return success({
      winnerSide: consumption,
      decisiveCriterion: "lower_in_battle_consumption",
      seededRngRoll: null,
      rngDraws: 0,
    });
  }

  if (rng === null) {
    return failure([
      {
        path: "/rng",
        message: "seeded RNG required when judge tie-break reaches seeded_rng",
      },
    ]);
  }
  const roll = rng.nextInt(0, 2);
  if (roll !== 0 && roll !== 1) {
    return failure([
      {
        path: "/rng",
        message: "nextInt(0, 2) must return 0 or 1",
        actual: roll,
      },
    ]);
  }
  return success({
    winnerSide: roll === 0 ? "sideA" : "sideB",
    decisiveCriterion: "seeded_rng",
    seededRngRoll: roll,
    rngDraws: 1,
  });
}

export type BattleMasteryAttempt = {
  activationSucceeded: boolean;
};

/**
 * Apply battle mastery gains attempt-by-attempt (13 §8.2 / 09 §9).
 * Does not handle basic_attack (caller must exclude).
 */
export function applyBattleTechniqueMasteryAttempts(input: {
  sourceMasteryHundredths: number;
  battleKind: BattleKind;
  attempts: readonly BattleMasteryAttempt[];
  config: Sprint1Config;
}): ValidationResult<{
  workingMastery: number;
  masteryHundredthsDelta: number;
  appliedGains: readonly number[];
}> {
  const gains = input.config.techniqueLearning.masteryGainHundredths;
  let working = input.sourceMasteryHundredths;
  if (!Number.isSafeInteger(working) || working < 0 || working > 10000) {
    return failure([
      {
        path: "/sourceMasteryHundredths",
        message: "sourceMasteryHundredths must be 0..10000",
        actual: working,
      },
    ]);
  }
  const appliedGains: number[] = [];
  for (const attempt of input.attempts) {
    const factor = selectMasteryCurrentValueFactor(working, input.config);
    if (!factor.ok) return factor;
    const base =
      input.battleKind === "official"
        ? attempt.activationSucceeded
          ? gains.officialSuccess
          : gains.officialFailure
        : attempt.activationSucceeded
          ? gains.mockSuccess
          : gains.mockFailure;
    const scaled = multiplyBasisPointsFloor(base, [factor.value]);
    if (!scaled.ok) return scaled;
    appliedGains.push(scaled.value);
    working = Math.min(10000, working + scaled.value);
  }
  return success({
    workingMastery: working,
    masteryHundredthsDelta: working - input.sourceMasteryHundredths,
    appliedGains,
  });
}
