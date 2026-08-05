/**
 * `requiredStatsFactor` (09 mini-spec §4.5 `[Sprint 1暫定]`, integer basis points).
 *
 * requiredStatRatio(stat) = requiredValue == 0 ? 1 : clamp(0, 1.4, current / required)
 * averageRequiredStatRatio = arithmetic mean of the ratios (requiredStats non-empty)
 * requiredStatsFactor
 *   = requiredStats empty -> 1.00
 *     average <= 1.00     -> 0.70 + average * 0.30
 *     average >  1.00     -> min(1.20, 1.00 + (average - 1.00) * 0.50)
 *
 * All math is exact integer basis points (scale 10000, `floor` at every division);
 * no floating point ratios are stored or compared.
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey, AbilityScores } from "../abilities.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { requireNormalizedBasisPointsValue } from "./basis-points.js";
import type { BasisPoints } from "./basis-points.js";
import type { TechniqueDefinition } from "./technique-definition.js";

const RATIO_SCALE = 10000;
const RATIO_MAXIMUM = 14000;

function toBasisPointsResult(value: number, path: string): ValidationResult<BasisPoints> {
  const bp = requireNormalizedBasisPointsValue(value);
  if (bp === undefined) {
    return failure([
      {
        path,
        message: "computed requiredStatsFactor is not a valid basis-points integer",
        actual: value,
        expected: "safe integer basis points",
      },
    ]);
  }
  return success(bp);
}

/** Validate every AbilityKey has an integer `surfaceValue` in 0..100; fail otherwise. */
function readAllAbilitySurfaceValues(
  abilities: AbilityScores,
  issues: ValidationIssue[],
): Map<AbilityKey, number> | undefined {
  const surfaceByKey = new Map<AbilityKey, number>();
  const record =
    abilities === null || typeof abilities !== "object"
      ? undefined
      : (abilities as unknown as Record<string, unknown>);

  let ok = true;
  for (const key of ABILITY_KEYS) {
    const entry = record === undefined ? undefined : record[key];
    if (typeof entry !== "object" || entry === null) {
      issues.push({
        path: `/abilities/${key}`,
        message: "ability entry is missing or not an object",
        actual: entry,
        expected: "StatValueTriple",
      });
      ok = false;
      continue;
    }
    const surfaceValue = (entry as Record<string, unknown>)["surfaceValue"];
    if (
      typeof surfaceValue !== "number" ||
      !Number.isInteger(surfaceValue) ||
      surfaceValue < 0 ||
      surfaceValue > 100
    ) {
      issues.push({
        path: `/abilities/${key}/surfaceValue`,
        message: "surfaceValue must be an integer within 0..100",
        actual: surfaceValue,
        expected: "0..100",
      });
      ok = false;
      continue;
    }
    surfaceByKey.set(key, surfaceValue);
  }
  return ok ? surfaceByKey : undefined;
}

export function deriveRequiredStatsFactor(
  definition: TechniqueDefinition,
  abilities: AbilityScores,
): ValidationResult<BasisPoints> {
  const issues: ValidationIssue[] = [];
  const surfaceByKey = readAllAbilitySurfaceValues(abilities, issues);
  if (surfaceByKey === undefined) {
    return failure(issues);
  }

  const requiredKeys = ABILITY_KEYS.filter((key) => definition.requiredStats[key] !== undefined);
  if (requiredKeys.length === 0) {
    return toBasisPointsResult(RATIO_SCALE, "");
  }

  let ratioSum = 0;
  for (const key of requiredKeys) {
    const required = definition.requiredStats[key]!;
    const current = surfaceByKey.get(key)!;
    const ratio =
      required === 0
        ? RATIO_SCALE
        : Math.min(RATIO_MAXIMUM, Math.max(0, Math.floor((current * RATIO_SCALE) / required)));
    ratioSum += ratio;
  }
  const average = Math.floor(ratioSum / requiredKeys.length);

  const factor =
    average <= RATIO_SCALE
      ? 7000 + Math.floor((average * 3000) / RATIO_SCALE)
      : Math.min(12000, 10000 + Math.floor(((average - RATIO_SCALE) * 5000) / RATIO_SCALE));

  return toBasisPointsResult(factor, "");
}
