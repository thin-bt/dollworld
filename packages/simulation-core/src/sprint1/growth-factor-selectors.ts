/**
 * Deterministic growth factor selectors for S01-004 (08 §4–§5 / S01-002).
 * Returns BasisPoints from normalized Sprint1Config. Does not multiply factors
 * or apply growth / RNG / events.
 */
import type { BasisPoints } from "./basis-points.js";
import type { GrowthProfile } from "./growth-profile.js";
import { isGrowthProfile } from "./growth-profile.js";
import type { Sprint1Config } from "./types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";

export const TEACHER_FACTOR_KEYS = [
  "noFormalMasterOrUnqualifiedParent",
  "averageMaster",
  "goodMaster",
  "renownedInstructor",
  "eraLeadingInstructor",
] as const;
export type TeacherFactorKey = (typeof TEACHER_FACTOR_KEYS)[number];

const TEACHER_FACTOR_KEY_SET: ReadonlySet<string> = new Set(TEACHER_FACTOR_KEYS);

function requireNonNegativeInteger(
  value: number,
  path: string,
  label: string,
): ValidationResult<number> {
  if (typeof value !== "number" || !Number.isInteger(value) || Object.is(value, -0)) {
    return failure([
      {
        path,
        message: `${label} must be a finite integer`,
        actual: value,
        expected: "non-negative integer",
      },
    ]);
  }
  if (value < 0) {
    return failure([
      {
        path,
        message: `${label} must be non-negative`,
        actual: value,
        expected: ">= 0",
      },
    ]);
  }
  return success(value);
}

export function selectAgeGrowthFactor(
  profile: GrowthProfile,
  age: number,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  if (!isGrowthProfile(profile)) {
    return failure([
      {
        path: "/ageProfile",
        message: "GrowthProfile must be early | normal | late",
        actual: profile,
        expected: "early | normal | late",
      },
    ]);
  }
  const ageResult = requireNonNegativeInteger(age, "/age", "age");
  if (!ageResult.ok) {
    return ageResult;
  }
  const factors = config.growth.ageFactorsByProfile[profile];
  const a = ageResult.value;
  if (a <= 7) return success(factors.age0to7);
  if (a <= 11) return success(factors.age8to11);
  if (a <= 15) return success(factors.age12to15);
  if (a <= 20) return success(factors.age16to20);
  if (a <= 27) return success(factors.age21to27);
  if (a <= 34) return success(factors.age28to34);
  if (a <= 41) return success(factors.age35to41);
  return success(factors.age42plus);
}

export function selectCurrentValueGrowthFactor(
  surfaceValue: number,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  if (
    typeof surfaceValue !== "number" ||
    !Number.isInteger(surfaceValue) ||
    Object.is(surfaceValue, -0)
  ) {
    return failure([
      {
        path: "/surfaceValue",
        message: "surfaceValue must be a finite integer",
        actual: surfaceValue,
        expected: "integer 0..100",
      },
    ]);
  }
  if (surfaceValue < 0 || surfaceValue > 100) {
    return failure([
      {
        path: "/surfaceValue",
        message: "surfaceValue out of range",
        actual: surfaceValue,
        expected: "0..100",
      },
    ]);
  }
  const factors = config.growth.currentValueFactors;
  if (surfaceValue <= 39) return success(factors.value0to39);
  if (surfaceValue <= 59) return success(factors.value40to59);
  if (surfaceValue <= 74) return success(factors.value60to74);
  if (surfaceValue <= 89) return success(factors.value75to89);
  return success(factors.value90to100);
}

export function selectDiscipleCountGrowthFactor(
  discipleCount: number,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  if (
    typeof discipleCount !== "number" ||
    !Number.isInteger(discipleCount) ||
    Object.is(discipleCount, -0)
  ) {
    return failure([
      {
        path: "/discipleCount",
        message: "discipleCount must be a finite integer",
        actual: discipleCount,
        expected: "integer >= 1",
      },
    ]);
  }
  if (discipleCount < 1) {
    return failure([
      {
        path: "/discipleCount",
        message: "discipleCount must be at least 1",
        actual: discipleCount,
        expected: ">= 1",
      },
    ]);
  }
  const factors = config.growth.discipleCountFactors;
  if (discipleCount <= 3) return success(factors.count1to3);
  if (discipleCount <= 6) return success(factors.count4to6);
  if (discipleCount <= 10) return success(factors.count7to10);
  if (discipleCount <= 20) return success(factors.count11to20);
  if (discipleCount <= 40) return success(factors.count21to40);
  return success(factors.count41plus);
}

export function selectFatigueGrowthFactor(
  fatigue: number,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  if (typeof fatigue !== "number" || !Number.isInteger(fatigue) || Object.is(fatigue, -0)) {
    return failure([
      {
        path: "/fatigue",
        message: "fatigue must be a finite integer",
        actual: fatigue,
        expected: "integer 0..100",
      },
    ]);
  }
  if (fatigue < 0 || fatigue > 100) {
    return failure([
      {
        path: "/fatigue",
        message: "fatigue out of range",
        actual: fatigue,
        expected: "0..100",
      },
    ]);
  }
  const factors = config.growth.fatigueFactors;
  if (fatigue <= 20) return success(factors.value0to20);
  if (fatigue <= 40) return success(factors.value21to40);
  if (fatigue <= 60) return success(factors.value41to60);
  if (fatigue <= 80) return success(factors.value61to80);
  return success(factors.value81to100);
}

export function selectTeacherGrowthFactor(
  key: TeacherFactorKey,
  config: Sprint1Config,
): ValidationResult<BasisPoints> {
  if (typeof key !== "string" || !TEACHER_FACTOR_KEY_SET.has(key)) {
    return failure([
      {
        path: "/teacherFactorKey",
        message: "unknown teacher factor key",
        actual: key,
        expected: TEACHER_FACTOR_KEYS.join(" | "),
      },
    ]);
  }
  return success(config.growth.teacherFactors[key]);
}
