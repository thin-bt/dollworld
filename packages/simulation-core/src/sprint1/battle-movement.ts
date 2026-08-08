/**
 * approach / retreat movement resolution (12 §13 / S1-SPEC-0.1.15–0.1.16).
 * MUST use computeMoverStateModifier / computeOpponentStateModifier —
 * never reimplement the state-modifier formula.
 * MUST use computeMovementChance for ActionLog.movementChance — never duplicate the formula.
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  computeMoverStateModifier,
  computeOpponentStateModifier,
} from "./movement-state-modifier.js";
import type { MovementParticipantStateSnapshot } from "./movement-state-modifier.js";
import { computeMovementChance } from "./movement-chance.js";
import { scaleByBasisPointsFloor } from "./battle-turn-math.js";
import type { ResolvedBattleAction } from "./battle-action.js";
import type { BattleConfig } from "./types.js";
import type { BattleRange } from "./types.js";
import type { BasisPoints } from "./basis-points.js";

export type MovementScoreInput = {
  moverSpeed: number;
  moverSkill: number;
  moverPerformanceFactorBp: BasisPoints;
  moverState: MovementParticipantStateSnapshot;
  opponentSpeed: number;
  opponentSkill: number;
  opponentPerformanceFactorBp: BasisPoints;
  opponentState: MovementParticipantStateSnapshot;
  movementKind: "approach" | "retreat";
  opponentResolvedAction: ResolvedBattleAction | null;
  currentRange: BattleRange;
  opponentAttackPreferredRanges: readonly BattleRange[] | null;
  opponentGuarding: boolean;
  actionOrder: BattleConfig["actionOrder"];
  movement: BattleConfig["movement"];
};

export function computeMovementScores(
  input: MovementScoreInput,
): ValidationResult<{ moverBase: number; opponentBase: number }> {
  const moverStateMod = computeMoverStateModifier(input.moverState, input.actionOrder);
  if (!moverStateMod.ok) {
    return moverStateMod;
  }
  const opponentStateMod = computeOpponentStateModifier(input.opponentState, input.actionOrder);
  if (!opponentStateMod.ok) {
    return opponentStateMod;
  }

  const moverSpeedPart = scaleByBasisPointsFloor(input.moverSpeed, input.moverPerformanceFactorBp);
  if (!moverSpeedPart.ok) {
    return moverSpeedPart;
  }
  const moverSkillPart = scaleByBasisPointsFloor(input.moverSkill, input.moverPerformanceFactorBp);
  if (!moverSkillPart.ok) {
    return moverSkillPart;
  }
  const moverSpeedWeighted = scaleByBasisPointsFloor(
    moverSpeedPart.value,
    input.movement.speedWeight,
  );
  if (!moverSpeedWeighted.ok) {
    return moverSpeedWeighted;
  }
  const moverSkillWeighted = scaleByBasisPointsFloor(
    moverSkillPart.value,
    input.movement.skillWeight,
  );
  if (!moverSkillWeighted.ok) {
    return moverSkillWeighted;
  }

  const opponentSpeedPart = scaleByBasisPointsFloor(
    input.opponentSpeed,
    input.opponentPerformanceFactorBp,
  );
  if (!opponentSpeedPart.ok) {
    return opponentSpeedPart;
  }
  const opponentSkillPart = scaleByBasisPointsFloor(
    input.opponentSkill,
    input.opponentPerformanceFactorBp,
  );
  if (!opponentSkillPart.ok) {
    return opponentSkillPart;
  }
  const opponentSpeedWeighted = scaleByBasisPointsFloor(
    opponentSpeedPart.value,
    input.movement.speedWeight,
  );
  if (!opponentSpeedWeighted.ok) {
    return opponentSpeedWeighted;
  }
  const opponentSkillWeighted = scaleByBasisPointsFloor(
    opponentSkillPart.value,
    input.movement.skillWeight,
  );
  if (!opponentSkillWeighted.ok) {
    return opponentSkillWeighted;
  }

  let opponentPreferredRangeControlBonus = 0;
  if (
    input.opponentResolvedAction !== null &&
    (input.opponentResolvedAction.kind === "basic_attack" ||
      input.opponentResolvedAction.kind === "use_technique") &&
    input.opponentAttackPreferredRanges !== null &&
    input.opponentAttackPreferredRanges.includes(input.currentRange)
  ) {
    opponentPreferredRangeControlBonus = input.movement.opponentPreferredRangeControlBonus;
  }

  let opposingMovementBonus = 0;
  if (
    input.opponentResolvedAction !== null &&
    ((input.movementKind === "approach" && input.opponentResolvedAction.kind === "retreat") ||
      (input.movementKind === "retreat" && input.opponentResolvedAction.kind === "approach"))
  ) {
    opposingMovementBonus = input.movement.opposingMovementBonus;
  }

  const guardingRangeControlBonus = input.opponentGuarding
    ? input.movement.guardingRangeControlBonus
    : 0;

  const moverBase =
    moverSpeedWeighted.value +
    moverSkillWeighted.value +
    moverStateMod.value +
    input.movement.actionBonus;
  const opponentBase =
    opponentSpeedWeighted.value +
    opponentSkillWeighted.value +
    opponentStateMod.value +
    opponentPreferredRangeControlBonus +
    opposingMovementBonus +
    guardingRangeControlBonus;

  return success({ moverBase, opponentBase });
}

export function rollMovement(
  rng: SeededRng,
  moverBase: number,
  opponentBase: number,
  movement: BattleConfig["movement"],
): { roll: number; succeeded: boolean } {
  const roll = rng.nextInt(movement.randomMinimum, movement.randomMaximum + 1);
  return { roll, succeeded: moverBase + roll >= opponentBase };
}

/**
 * ActionLog pre-roll success percent. Delegates to movement-chance helper (RNG 0).
 */
export function movementChanceForActionLog(input: {
  moverBaseScore: number;
  opponentBaseScore: number;
  movement: BattleConfig["movement"];
}): ValidationResult<number> {
  return computeMovementChance({
    moverBaseScore: input.moverBaseScore,
    opponentBaseScore: input.opponentBaseScore,
    randomMinimum: input.movement.randomMinimum,
    randomMaximum: input.movement.randomMaximum,
  });
}

void failure;
