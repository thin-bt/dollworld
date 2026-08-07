/**
 * Movement state modifier contract (12 §13 / S1-SPEC-0.1.15).
 *
 * Uses shared `battle.actionOrder` coefficients — never movement-specific keys,
 * never nextHit/nextActivation modifiers, never consumptionPerformanceFactor on
 * the state modifier itself. Structure/formula helpers only; no turn Resolver.
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";
import type { BasisPoints } from "./basis-points.js";

/** Battle-local participant fields used by movement state modifiers. */
export type MovementParticipantStateSnapshot = {
  condition: number;
  fatigue: number;
  injury: number;
};

/** Shared actionOrder coefficients (normalized BasisPoints). */
export type MovementStateModifierActionOrderCoeffs = {
  conditionPerPoint: BasisPoints;
  fatiguePenaltyPerPoint: BasisPoints;
  injuryPenaltyPerPoint: BasisPoints;
};

/** Canonical config paths — movement must not invent parallel keys. */
export const MOVEMENT_STATE_MODIFIER_ACTION_ORDER_PATHS = [
  "battle.actionOrder.conditionPerPoint",
  "battle.actionOrder.fatiguePenaltyPerPoint",
  "battle.actionOrder.injuryPenaltyPerPoint",
] as const;

/** Keys that must NOT appear under battle.movement for state modifiers. */
export const FORBIDDEN_MOVEMENT_STATE_MODIFIER_KEYS = [
  "conditionPerPoint",
  "fatiguePenaltyPerPoint",
  "injuryPenaltyPerPoint",
] as const;

/**
 * Floor-divide a signed BigInt numerator by BASIS_POINTS_SCALE (toward −∞).
 */
function floorDivBasisPoints(numerator: bigint): number {
  const scale = BigInt(BASIS_POINTS_SCALE);
  const quotient = numerator / scale;
  const remainder = numerator % scale;
  if (remainder !== 0n && numerator < 0n) {
    const adjusted = quotient - 1n;
    if (adjusted < BigInt(Number.MIN_SAFE_INTEGER) || adjusted > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("movement state modifier result is outside the safe-integer range");
    }
    return Number(adjusted);
  }
  if (quotient < BigInt(Number.MIN_SAFE_INTEGER) || quotient > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("movement state modifier result is outside the safe-integer range");
  }
  return Number(quotient);
}

function requireSafeIntegerField(value: unknown, path: string): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    return failure([
      {
        path,
        message: "value must be a safe integer",
        actual: value,
        expected: "safe integer",
      },
    ]);
  }
  return success(value);
}

/**
 * Compute moverStateModifier / opponentStateModifier from battle-local state and
 * shared actionOrder BasisPoints coefficients.
 *
 * ```text
 * stateModifier
 * = condition * conditionPerPoint
 * - fatigue * fatiguePenaltyPerPoint
 * - injury * injuryPenaltyPerPoint
 * ```
 *
 * Single combined numerator, then floor-divide by 10000. Does not read
 * nextHitModifier / nextActivationModifier / consumptionPerformanceFactor.
 */
export function computeMovementStateModifier(
  state: MovementParticipantStateSnapshot,
  actionOrder: MovementStateModifierActionOrderCoeffs,
): ValidationResult<number> {
  const condition = requireSafeIntegerField(state.condition, "/condition");
  if (!condition.ok) {
    return failure(condition.issues);
  }
  const fatigue = requireSafeIntegerField(state.fatigue, "/fatigue");
  if (!fatigue.ok) {
    return failure(fatigue.issues);
  }
  const injury = requireSafeIntegerField(state.injury, "/injury");
  if (!injury.ok) {
    return failure(injury.issues);
  }
  const conditionPerPoint = requireSafeIntegerField(
    actionOrder.conditionPerPoint,
    "/actionOrder/conditionPerPoint",
  );
  if (!conditionPerPoint.ok) {
    return failure(conditionPerPoint.issues);
  }
  const fatiguePenaltyPerPoint = requireSafeIntegerField(
    actionOrder.fatiguePenaltyPerPoint,
    "/actionOrder/fatiguePenaltyPerPoint",
  );
  if (!fatiguePenaltyPerPoint.ok) {
    return failure(fatiguePenaltyPerPoint.issues);
  }
  const injuryPenaltyPerPoint = requireSafeIntegerField(
    actionOrder.injuryPenaltyPerPoint,
    "/actionOrder/injuryPenaltyPerPoint",
  );
  if (!injuryPenaltyPerPoint.ok) {
    return failure(injuryPenaltyPerPoint.issues);
  }

  const numerator =
    BigInt(condition.value) * BigInt(conditionPerPoint.value) -
    BigInt(fatigue.value) * BigInt(fatiguePenaltyPerPoint.value) -
    BigInt(injury.value) * BigInt(injuryPenaltyPerPoint.value);

  try {
    return success(floorDivBasisPoints(numerator));
  } catch (error) {
    return failure([
      {
        path: "",
        message: error instanceof Error ? error.message : "movement state modifier overflow",
        expected: "safe integer",
      },
    ]);
  }
}

export function computeMoverStateModifier(
  mover: MovementParticipantStateSnapshot,
  actionOrder: MovementStateModifierActionOrderCoeffs,
): ValidationResult<number> {
  return computeMovementStateModifier(mover, actionOrder);
}

export function computeOpponentStateModifier(
  opponent: MovementParticipantStateSnapshot,
  actionOrder: MovementStateModifierActionOrderCoeffs,
): ValidationResult<number> {
  return computeMovementStateModifier(opponent, actionOrder);
}
