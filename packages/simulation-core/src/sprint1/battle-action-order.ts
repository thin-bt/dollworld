/**
 * Priority and ActionOrderScore (12 §4–§5 / S01-006).
 * ActionOrderScore uses turn-start condition/fatigue/injury only.
 */
import type { SeededRng, SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { ResolvedBattleAction } from "./battle-action.js";
import type { BattleSide } from "./battle-enums.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import { consumptionPerformanceFactor } from "./battle-consumption.js";
import { floorDivBasisPoints, scaleByBasisPointsFloor } from "./battle-turn-math.js";
import type { BattleTurnOrderLog } from "./battle-turn-logs.js";
import type { BattleConfig } from "./types.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import { deepFreezePlainJson } from "./plain-data.js";

export type Priority = 2 | 1 | 0 | -1;

export function priorityForResolvedAction(
  action: ResolvedBattleAction,
  technique: TechniqueDefinition | null,
): Priority {
  switch (action.kind) {
    case "evade":
    case "surrender":
      return 2;
    case "use_technique":
      return (technique?.priority ?? 0) as Priority;
    case "no_action":
      return 0;
    default:
      return 0;
  }
}

export type ActionOrderScoreInput = {
  speed: number;
  inBattleConsumption: number;
  actionSpeedModifier: number;
  condition: number;
  fatigue: number;
  injury: number;
  actionOrder: BattleConfig["actionOrder"];
  performanceBands: BattleConfig["consumption"]["performanceBands"];
};

export function computeActionOrderScoreWithoutRandom(
  input: ActionOrderScoreInput,
): ValidationResult<number> {
  const factor = consumptionPerformanceFactor(input.inBattleConsumption, input.performanceBands);
  if (!factor.ok) {
    return factor;
  }
  const speedPart = scaleByBasisPointsFloor(input.speed, factor.value);
  if (!speedPart.ok) {
    return speedPart;
  }
  const stateMod = floorDivBasisPoints(
    BigInt(input.condition) * BigInt(input.actionOrder.conditionPerPoint) -
      BigInt(input.fatigue) * BigInt(input.actionOrder.fatiguePenaltyPerPoint) -
      BigInt(input.injury) * BigInt(input.actionOrder.injuryPenaltyPerPoint),
  );
  if (!stateMod.ok) {
    return stateMod;
  }
  return success(speedPart.value + input.actionSpeedModifier + stateMod.value);
}

export type ResolveActionOrderInput = {
  turnNumber: number;
  sideAAction: ResolvedBattleAction;
  sideBAction: ResolvedBattleAction;
  sideAPriority: Priority;
  sideBPriority: Priority;
  sideA: BattleParticipantSnapshot;
  sideB: BattleParticipantSnapshot;
  sideASpeedModifier: number;
  sideBSpeedModifier: number;
  rngStateBeforeOrder: SeededRngState;
  rng: SeededRng;
  battle: BattleConfig;
};

export type ResolveActionOrderResult = {
  turnOrderLog: BattleTurnOrderLog;
  firstSide: BattleSide;
  secondSide: BattleSide;
  sideAActionOrderScore: number | null;
  sideBActionOrderScore: number | null;
};

export function resolveActionOrder(
  input: ResolveActionOrderInput,
): ValidationResult<ResolveActionOrderResult> {
  const before = input.rngStateBeforeOrder;

  if (input.sideAPriority !== input.sideBPriority) {
    const firstSide: BattleSide = input.sideAPriority > input.sideBPriority ? "sideA" : "sideB";
    const secondSide: BattleSide = firstSide === "sideA" ? "sideB" : "sideA";
    const after = input.rng.exportState();
    return success({
      turnOrderLog: deepFreezePlainJson({
        turnNumber: input.turnNumber,
        sideAPriority: input.sideAPriority,
        sideBPriority: input.sideBPriority,
        sideAActionOrderScore: null,
        sideBActionOrderScore: null,
        rngStateBeforeOrder: before,
        sideAOrderRoll: null,
        sideBOrderRoll: null,
        tieBreakRoll: null,
        resolvedFirstSide: firstSide,
        rngStateAfterOrder: after,
      }),
      firstSide,
      secondSide,
      sideAActionOrderScore: null,
      sideBActionOrderScore: null,
    });
  }

  const baseA = computeActionOrderScoreWithoutRandom({
    speed: input.sideA.stats.speed.surfaceValue,
    inBattleConsumption: input.sideA.inBattleConsumption,
    actionSpeedModifier: input.sideASpeedModifier,
    condition: input.sideA.condition,
    fatigue: input.sideA.fatigue,
    injury: input.sideA.injury,
    actionOrder: input.battle.actionOrder,
    performanceBands: input.battle.consumption.performanceBands,
  });
  if (!baseA.ok) {
    return baseA;
  }
  const baseB = computeActionOrderScoreWithoutRandom({
    speed: input.sideB.stats.speed.surfaceValue,
    inBattleConsumption: input.sideB.inBattleConsumption,
    actionSpeedModifier: input.sideBSpeedModifier,
    condition: input.sideB.condition,
    fatigue: input.sideB.fatigue,
    injury: input.sideB.injury,
    actionOrder: input.battle.actionOrder,
    performanceBands: input.battle.consumption.performanceBands,
  });
  if (!baseB.ok) {
    return baseB;
  }

  const sideAOrderRoll = input.rng.nextInt(
    input.battle.actionOrder.randomMinimum,
    input.battle.actionOrder.randomMaximum + 1,
  );
  const sideBOrderRoll = input.rng.nextInt(
    input.battle.actionOrder.randomMinimum,
    input.battle.actionOrder.randomMaximum + 1,
  );
  const scoreA = baseA.value + sideAOrderRoll;
  const scoreB = baseB.value + sideBOrderRoll;

  let firstSide: BattleSide;
  let tieBreakRoll: number | null = null;
  if (scoreA > scoreB) {
    firstSide = "sideA";
  } else if (scoreB > scoreA) {
    firstSide = "sideB";
  } else {
    tieBreakRoll = input.rng.nextInt(0, 2);
    firstSide = tieBreakRoll === 0 ? "sideA" : "sideB";
  }
  const secondSide: BattleSide = firstSide === "sideA" ? "sideB" : "sideA";
  const after = input.rng.exportState();

  return success({
    turnOrderLog: deepFreezePlainJson({
      turnNumber: input.turnNumber,
      sideAPriority: input.sideAPriority,
      sideBPriority: input.sideBPriority,
      sideAActionOrderScore: scoreA,
      sideBActionOrderScore: scoreB,
      rngStateBeforeOrder: before,
      sideAOrderRoll,
      sideBOrderRoll,
      tieBreakRoll,
      resolvedFirstSide: firstSide,
      rngStateAfterOrder: after,
    }),
    firstSide,
    secondSide,
    sideAActionOrderScore: scoreA,
    sideBActionOrderScore: scoreB,
  });
}

void failure;
