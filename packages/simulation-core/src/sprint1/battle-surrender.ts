/**
 * Surrender scoring (12 §19) and terminal reason selection (12 §6) / S01-006.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { floorDivBasisPoints } from "./battle-turn-math.js";
import { isHighConsumptionBand } from "./battle-consumption.js";
import type { BattleDecisionProfile } from "./battle-decision-profile.js";
import type { BattleTerminalReason } from "./battle-enums.js";
import type { BattleConfig } from "./types.js";

export type SurrenderScoreInput = {
  durabilityRatioBp: number; // 0..10000 = 0..1
  mentalRatioBp: number;
  injury: number;
  inBattleConsumption: number;
  opponentDurabilityLeadBp: number;
  confidence: number;
  predictedMajorInjuryChance: number;
  profile: BattleDecisionProfile;
  strategy: BattleConfig["strategy"];
};

/**
 * SurrenderScore as integer (percent-point scale matching config weights).
 * Ratios and weights use BasisPoints where configured as such.
 */
export function computeSurrenderScore(input: SurrenderScoreInput): ValidationResult<number> {
  const s = input.strategy.surrender;
  // Keep consistent: express everything as value * 10000 then floor once.
  // injury/100 * w = injury * w / 100 → contribute injury * w * 100 to numerator with denom 10000
  let numerator = 0n;
  numerator += (10000n - BigInt(input.durabilityRatioBp)) * BigInt(s.durabilityWeight);
  numerator += (10000n - BigInt(input.mentalRatioBp)) * BigInt(s.mentalWeight);
  numerator += BigInt(input.injury) * BigInt(s.injuryWeight) * 100n; // injury/100 * w * 10000
  numerator += BigInt(input.inBattleConsumption) * BigInt(s.consumptionWeight) * 100n;
  numerator += BigInt(input.opponentDurabilityLeadBp) * BigInt(s.opponentLeadWeight);

  // confidenceNormalized = (confidence + 20) / 40
  // - confidenceNormalized * confidenceWeight
  // = - (confidence+20)/40 * w * 10000 = - (confidence+20) * w * 250
  numerator -= BigInt(input.confidence + 20) * BigInt(s.confidenceWeight) * 250n;

  // predictedMajorInjuryChance * majorInjuryRiskWeight / 100
  numerator += BigInt(input.predictedMajorInjuryChance) * BigInt(s.majorInjuryRiskWeight) * 100n;

  const floored = floorDivBasisPoints(numerator);
  if (!floored.ok) {
    return floored;
  }

  // personalitySurrenderModifier = (caution-50)*0.10 - (perseverance-50)*0.20 - (riskTolerance-50)*0.10
  const personality = floorDivBasisPoints(
    BigInt(input.profile.caution - 50) *
      BigInt(input.strategy.personalityModifiers.surrenderCautionPerPointFrom50) -
      BigInt(input.profile.perseverance - 50) *
        BigInt(input.strategy.personalityModifiers.surrenderPerseveranceReductionPerPointFrom50) -
      BigInt(input.profile.riskTolerance - 50) *
        BigInt(input.strategy.personalityModifiers.surrenderRiskToleranceReductionPerPointFrom50),
  );
  if (!personality.ok) {
    return personality;
  }

  let score = floored.value + personality.value;
  if (isHighConsumptionBand(input.inBattleConsumption)) {
    score += input.strategy.highConsumptionSurrenderBonus;
  }
  return success(score);
}

export function includeSurrenderCandidate(surrenderScore: number, threshold: number): boolean {
  return surrenderScore >= threshold;
}

export function surrenderActionScore(surrenderScore: number, baseScore: number): number {
  return baseScore + surrenderScore;
}

export type TerminalCheckInput = {
  sideADurability: number;
  sideBDurability: number;
  sideASurrendered: boolean;
  sideBSurrendered: boolean;
  sideAUnableToContinue: boolean;
  sideBUnableToContinue: boolean;
  turnNumber: number;
  maxTurns: number;
};

/**
 * Terminal priority: knockout > surrender > unable_to_continue > max_turns_reached.
 * Returns null when the battle continues.
 */
export function selectTerminalReason(input: TerminalCheckInput): BattleTerminalReason | null {
  if (input.sideADurability === 0 || input.sideBDurability === 0) {
    return "knockout";
  }
  if (input.sideASurrendered || input.sideBSurrendered) {
    return "surrender";
  }
  if (input.sideAUnableToContinue || input.sideBUnableToContinue) {
    return "unable_to_continue";
  }
  if (input.turnNumber >= input.maxTurns) {
    return "max_turns_reached";
  }
  return null;
}

export function battleEndedAfterAction(input: {
  actorSurrendered: boolean;
  targetDurability: number;
  targetUnableToContinue: boolean;
}): boolean {
  if (input.actorSurrendered) {
    return true;
  }
  if (input.targetDurability === 0) {
    return true;
  }
  if (input.targetUnableToContinue) {
    return true;
  }
  return false;
}

void failure;
void success;
