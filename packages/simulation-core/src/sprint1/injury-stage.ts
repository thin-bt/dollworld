/**
 * Injury stage derivation from injury degree (08 §6.3 / S01-002).
 * Boundaries come only from normalized Sprint1Config.temporaryCondition.injuryBands.
 */
import type { BasisPoints } from "./basis-points.js";
import type { Sprint1Config } from "./types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export const INJURY_STAGES = ["none", "light", "medium", "severe"] as const;
export type InjuryStage = (typeof INJURY_STAGES)[number];

export function deriveInjuryStage(
  injury: number,
  config: Sprint1Config,
): ValidationResult<InjuryStage> {
  if (typeof injury !== "number" || !Number.isInteger(injury) || Object.is(injury, -0)) {
    return failure([
      {
        path: "/injury",
        message: "injury must be a finite integer",
        actual: injury,
        expected: "integer 0..100",
      },
    ]);
  }
  if (injury < 0 || injury > 100) {
    return failure([
      {
        path: "/injury",
        message: "injury out of range",
        actual: injury,
        expected: "0..100",
      },
    ]);
  }

  const bands = config.temporaryCondition.injuryBands;
  if (injury === bands.none) {
    return success("none");
  }
  if (injury >= bands.light.min && injury <= bands.light.max) {
    return success("light");
  }
  if (injury >= bands.medium.min && injury <= bands.medium.max) {
    return success("medium");
  }
  if (injury >= bands.severe.min && injury <= bands.severe.max) {
    return success("severe");
  }
  return failure([
    {
      path: "/injury",
      message: "injury does not fall in any configured injuryBands",
      actual: injury,
      expected: "a value covered by temporaryCondition.injuryBands",
    },
  ]);
}

export function selectInjuryGrowthFactor(stage: InjuryStage, config: Sprint1Config): BasisPoints {
  const factors = config.growth.injuryFactors;
  switch (stage) {
    case "none":
      return factors.none0;
    case "light":
      return factors.light1to24;
    case "medium":
      return factors.medium25to59;
    case "severe":
      return factors.severe60to100;
  }
}
