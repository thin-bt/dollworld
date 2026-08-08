/**
 * In-battle consumption bands and action deltas (12 §18 / S01-006).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import type { ResolvedBattleAction } from "./battle-action.js";
import type { BattleConfig } from "./types.js";
import type { TechniqueConsumptionClass } from "./technique-enums.js";
import { clampInteger } from "./battle-turn-math.js";

export type ConsumptionPerformanceFactor = BasisPoints;

export function consumptionPerformanceFactor(
  inBattleConsumption: number,
  bands: BattleConfig["consumption"]["performanceBands"],
): ValidationResult<ConsumptionPerformanceFactor> {
  if (
    typeof inBattleConsumption !== "number" ||
    !Number.isSafeInteger(inBattleConsumption) ||
    inBattleConsumption < 0 ||
    inBattleConsumption > 100
  ) {
    return failure([
      {
        path: "/inBattleConsumption",
        message: "inBattleConsumption must be a safe integer in 0..100",
        actual: inBattleConsumption,
        expected: "0..100",
      },
    ]);
  }
  if (inBattleConsumption <= 29) {
    return success(bands["0..29"]);
  }
  if (inBattleConsumption <= 49) {
    return success(bands["30..49"]);
  }
  if (inBattleConsumption <= 69) {
    return success(bands["50..69"]);
  }
  if (inBattleConsumption <= 84) {
    return success(bands["70..84"]);
  }
  return success(bands["85..100"]);
}

export function isHighConsumptionBand(inBattleConsumption: number): boolean {
  return inBattleConsumption >= 85;
}

export function baseConsumptionForResolvedAction(
  resolved: ResolvedBattleAction,
  priority: number,
  consumptionClass: TechniqueConsumptionClass | null,
  config: BattleConfig["consumption"],
): { base: number; priorityAdditional: number; total: number } {
  let base = 0;
  switch (resolved.kind) {
    case "basic_attack":
      base = config.actionBase.basicAttack;
      break;
    case "use_technique":
      if (consumptionClass === "small") {
        base = config.actionBase.techniqueSmall;
      } else if (consumptionClass === "medium") {
        base = config.actionBase.techniqueMedium;
      } else if (consumptionClass === "large") {
        base = config.actionBase.techniqueLarge;
      } else if (consumptionClass === "ultimate") {
        base = config.actionBase.techniqueUltimate;
      }
      break;
    case "approach":
      base = config.actionBase.approach;
      break;
    case "retreat":
      base = config.actionBase.retreat;
      break;
    case "basic_defense":
      base = config.actionBase.basicDefense;
      break;
    case "evade":
      base = config.actionBase.evade;
      break;
    case "focus_mind":
      base = config.actionBase.focusMind;
      break;
    case "surrender":
      base = config.actionBase.surrender;
      break;
    case "no_action":
      base = config.actionBase.noAction;
      break;
  }

  let priorityAdditional = 0;
  if (
    resolved.kind !== "surrender" &&
    resolved.kind !== "no_action" &&
    (priority === 1 || priority === 2)
  ) {
    priorityAdditional = config.highPriorityAdditional;
  }

  return { base, priorityAdditional, total: base + priorityAdditional };
}

export function applyConsumptionDelta(
  before: number,
  delta: number,
): { after: number; appliedDelta: number } {
  const after = clampInteger(before + delta, 0, 100);
  return { after, appliedDelta: after - before };
}
