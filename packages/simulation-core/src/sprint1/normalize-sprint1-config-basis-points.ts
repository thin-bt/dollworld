/**
 * Basis-points (×10000) normalization pass for a structurally-validated raw
 * Sprint1Config (14 mini-spec §1 / §8).
 *
 * Runs after structural validation, which allows decimals on factor/ratio/weight
 * fields. This pass converts exactly the basis-points fields listed in the 14
 * mini-spec to integer ×10000 values, leaving every other numeric field (counts,
 * percents, tenths/hundredths scales, and fixed literals) untouched.
 *
 * Never mutates the input `config`; always operates on a deep clone.
 */
import type { ValidationIssue } from "../validation.js";
import { normalizeBasisPoints } from "./basis-points.js";
import type { BasisPoints } from "./basis-points.js";
import { cloneValidatedPlainJson } from "./plain-data.js";
import type { Sprint1Config, Sprint1ConfigInput } from "./types.js";

/**
 * Structural shape of a normalized Sprint1Config without the opaque brand.
 * Used as the normalize-pass return type before freeze/brand.
 */
export type Sprint1ConfigNormalizedData = {
  [K in keyof Sprint1Config as K extends symbol ? never : K]: Sprint1Config[K];
};

function convert(
  container: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const value = container[key];
  if (typeof value !== "number") {
    issues.push({ path, message: "basis-points field must be a number", actual: value });
    return false;
  }
  const bp = normalizeBasisPoints(value);
  if (bp === undefined) {
    issues.push({
      path,
      message: "value cannot be normalized to basis points (at most 4 decimal places)",
      actual: value,
      expected: "exact 1/10000 step",
    });
    return false;
  }
  container[key] = bp as BasisPoints;
  return true;
}

function convertAll(
  container: Record<string, unknown>,
  keys: readonly string[],
  basePath: string,
  issues: ValidationIssue[],
): boolean {
  let ok = true;
  for (const key of keys) {
    if (!convert(container, key, `${basePath}/${key}`, issues)) {
      ok = false;
    }
  }
  return ok;
}

function convertRange(
  container: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): boolean {
  const rangeValue = container[key];
  if (typeof rangeValue !== "object" || rangeValue === null) {
    issues.push({
      path,
      message: "basis-points range field must be an object with min/max",
      actual: rangeValue,
    });
    return false;
  }
  const range = rangeValue as Record<string, unknown>;
  const minOk = convert(range, "min", `${path}/min`, issues);
  const maxOk = convert(range, "max", `${path}/max`, issues);
  return minOk && maxOk;
}

function asRecord(
  container: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  const value = container[key];
  if (typeof value !== "object" || value === null) {
    issues.push({ path, message: "value must be an object", actual: value });
    return undefined;
  }
  return value as Record<string, unknown>;
}

const AGE_FACTOR_KEYS = [
  "age0to7",
  "age8to11",
  "age12to15",
  "age16to20",
  "age21to27",
  "age28to34",
  "age35to41",
  "age42plus",
] as const;

const CURRENT_VALUE_FACTOR_KEYS = [
  "value0to39",
  "value40to59",
  "value60to74",
  "value75to89",
  "value90to100",
] as const;

const TEACHER_FACTOR_KEYS = [
  "noFormalMasterOrUnqualifiedParent",
  "averageMaster",
  "goodMaster",
  "renownedInstructor",
  "eraLeadingInstructor",
] as const;

const DISCIPLE_COUNT_FACTOR_KEYS = [
  "count1to3",
  "count4to6",
  "count7to10",
  "count11to20",
  "count21to40",
  "count41plus",
] as const;

const FATIGUE_FACTOR_KEYS = [
  "value0to20",
  "value21to40",
  "value41to60",
  "value61to80",
  "value81to100",
] as const;

const INJURY_FACTOR_KEYS = ["none0", "light1to24", "medium25to59", "severe60to100"] as const;

const AGE_PROFILE_KEYS = ["early", "normal", "late"] as const;

function convertGrowth(
  growth: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): boolean {
  let ok = convert(growth, "potentialMinimumFactor", `${path}/potentialMinimumFactor`, issues);
  if (!convert(growth, "potentialMaximumFactor", `${path}/potentialMaximumFactor`, issues)) {
    ok = false;
  }

  const ageFactorsByProfile = asRecord(
    growth,
    "ageFactorsByProfile",
    `${path}/ageFactorsByProfile`,
    issues,
  );
  if (ageFactorsByProfile === undefined) {
    ok = false;
  } else {
    for (const profileKey of AGE_PROFILE_KEYS) {
      const profile = asRecord(
        ageFactorsByProfile,
        profileKey,
        `${path}/ageFactorsByProfile/${profileKey}`,
        issues,
      );
      if (profile === undefined) {
        ok = false;
        continue;
      }
      if (
        !convertAll(profile, AGE_FACTOR_KEYS, `${path}/ageFactorsByProfile/${profileKey}`, issues)
      ) {
        ok = false;
      }
    }
  }

  const currentValueFactors = asRecord(
    growth,
    "currentValueFactors",
    `${path}/currentValueFactors`,
    issues,
  );
  if (currentValueFactors === undefined) {
    ok = false;
  } else if (
    !convertAll(
      currentValueFactors,
      CURRENT_VALUE_FACTOR_KEYS,
      `${path}/currentValueFactors`,
      issues,
    )
  ) {
    ok = false;
  }

  const teacherFactors = asRecord(growth, "teacherFactors", `${path}/teacherFactors`, issues);
  if (teacherFactors === undefined) {
    ok = false;
  } else if (!convertAll(teacherFactors, TEACHER_FACTOR_KEYS, `${path}/teacherFactors`, issues)) {
    ok = false;
  }

  const discipleCountFactors = asRecord(
    growth,
    "discipleCountFactors",
    `${path}/discipleCountFactors`,
    issues,
  );
  if (discipleCountFactors === undefined) {
    ok = false;
  } else if (
    !convertAll(
      discipleCountFactors,
      DISCIPLE_COUNT_FACTOR_KEYS,
      `${path}/discipleCountFactors`,
      issues,
    )
  ) {
    ok = false;
  }

  const fatigueFactors = asRecord(growth, "fatigueFactors", `${path}/fatigueFactors`, issues);
  if (fatigueFactors === undefined) {
    ok = false;
  } else if (!convertAll(fatigueFactors, FATIGUE_FACTOR_KEYS, `${path}/fatigueFactors`, issues)) {
    ok = false;
  }

  const injuryFactors = asRecord(growth, "injuryFactors", `${path}/injuryFactors`, issues);
  if (injuryFactors === undefined) {
    ok = false;
  } else if (!convertAll(injuryFactors, INJURY_FACTOR_KEYS, `${path}/injuryFactors`, issues)) {
    ok = false;
  }

  if (
    !convert(
      growth,
      "motivationConditionMinimumFactor",
      `${path}/motivationConditionMinimumFactor`,
      issues,
    )
  ) {
    ok = false;
  }
  if (
    !convert(
      growth,
      "motivationConditionMaximumFactor",
      `${path}/motivationConditionMaximumFactor`,
      issues,
    )
  ) {
    ok = false;
  }
  if (!convert(growth, "rngMinimumFactor", `${path}/rngMinimumFactor`, issues)) {
    ok = false;
  }
  if (!convert(growth, "rngMaximumFactor", `${path}/rngMaximumFactor`, issues)) {
    ok = false;
  }

  return ok;
}

const CONTEXT_WEIGHT_KEYS = [
  "personality",
  "developmentNeed",
  "recentResult",
  "teacherAdvice",
  "schedule",
] as const;

const BURDEN_MULTIPLIER_KEYS = ["fatigue", "injury", "mental"] as const;
const BURDEN_ACTION_KEYS = ["trainStat", "learnTechnique", "practiceTechnique", "rest"] as const;

const STAT_TARGET_WEIGHT_KEYS = [
  "remainingCapacity",
  "growthPotential",
  "relatedAptitude",
  "teacherRecommendation",
] as const;

function convertWeeklyPlanner(
  weeklyPlanner: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): boolean {
  let ok = true;

  const contextWeights = asRecord(
    weeklyPlanner,
    "contextWeights",
    `${path}/contextWeights`,
    issues,
  );
  if (contextWeights === undefined) {
    ok = false;
  } else if (!convertAll(contextWeights, CONTEXT_WEIGHT_KEYS, `${path}/contextWeights`, issues)) {
    ok = false;
  }

  const burdenPenaltyMultipliersByAction = asRecord(
    weeklyPlanner,
    "burdenPenaltyMultipliersByAction",
    `${path}/burdenPenaltyMultipliersByAction`,
    issues,
  );
  if (burdenPenaltyMultipliersByAction === undefined) {
    ok = false;
  } else {
    for (const actionKey of BURDEN_ACTION_KEYS) {
      const actionMultipliers = asRecord(
        burdenPenaltyMultipliersByAction,
        actionKey,
        `${path}/burdenPenaltyMultipliersByAction/${actionKey}`,
        issues,
      );
      if (actionMultipliers === undefined) {
        ok = false;
        continue;
      }
      if (
        !convertAll(
          actionMultipliers,
          BURDEN_MULTIPLIER_KEYS,
          `${path}/burdenPenaltyMultipliersByAction/${actionKey}`,
          issues,
        )
      ) {
        ok = false;
      }
    }
  }

  const restNeedBonuses = asRecord(
    weeklyPlanner,
    "restNeedBonuses",
    `${path}/restNeedBonuses`,
    issues,
  );
  if (restNeedBonuses === undefined) {
    ok = false;
  } else {
    if (
      !convert(
        restNeedBonuses,
        "fatiguePerFivePoints",
        `${path}/restNeedBonuses/fatiguePerFivePoints`,
        issues,
      )
    ) {
      ok = false;
    }
    if (
      !convert(
        restNeedBonuses,
        "injuryPerFivePoints",
        `${path}/restNeedBonuses/injuryPerFivePoints`,
        issues,
      )
    ) {
      ok = false;
    }
  }

  const statTargetWeights = asRecord(
    weeklyPlanner,
    "statTargetWeights",
    `${path}/statTargetWeights`,
    issues,
  );
  if (statTargetWeights === undefined) {
    ok = false;
  } else if (
    !convertAll(statTargetWeights, STAT_TARGET_WEIGHT_KEYS, `${path}/statTargetWeights`, issues)
  ) {
    ok = false;
  }

  return ok;
}

const MASTERY_CURRENT_VALUE_FACTOR_KEYS = [
  "mastery0to39",
  "mastery40to59",
  "mastery60to79",
  "mastery80to89",
  "mastery90to100",
] as const;

function convertTechniqueLearning(
  techniqueLearning: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): boolean {
  let ok = true;

  const rangeKeys = [
    "aptitudeFactorRange",
    "requiredStatsFactorRange",
    "learningTraitFactorRange",
    "teacherTransmissionFactorRange",
    "compatibilityFactorRange",
    "rngFactorRange",
    "masteryPracticeRngFactorRange",
  ] as const;
  for (const rangeKey of rangeKeys) {
    if (!convertRange(techniqueLearning, rangeKey, `${path}/${rangeKey}`, issues)) {
      ok = false;
    }
  }

  if (!convert(techniqueLearning, "selfStudyFactor", `${path}/selfStudyFactor`, issues)) {
    ok = false;
  }

  const masteryCurrentValueFactors = asRecord(
    techniqueLearning,
    "masteryCurrentValueFactors",
    `${path}/masteryCurrentValueFactors`,
    issues,
  );
  if (masteryCurrentValueFactors === undefined) {
    ok = false;
  } else if (
    !convertAll(
      masteryCurrentValueFactors,
      MASTERY_CURRENT_VALUE_FACTOR_KEYS,
      `${path}/masteryCurrentValueFactors`,
      issues,
    )
  ) {
    ok = false;
  }

  return ok;
}

const DAMAGE_FORMULA_BASIS_POINTS_KEYS = [
  "aptitudeBase",
  "masteryBase",
  "staminaDefenseWeight",
  "skillDefenseWeight",
  "conditionDefenseWeight",
  "fatigueDefensePenaltyWeight",
  "injuryDefensePenaltyWeight",
  "techniquePowerWeight",
  "attackValueWeight",
  "defenseValueReductionWeight",
  "varianceMinimum",
  "varianceMaximum",
] as const;

const CONSUMPTION_CLASS_KEYS = ["basicAttack", "small", "medium", "large", "ultimate"] as const;

const PERFORMANCE_BAND_KEYS = ["0..29", "30..49", "50..69", "70..84", "85..100"] as const;

const PERSONALITY_MODIFIER_BASIS_POINTS_KEYS = [
  "attackAggressionPerPointFrom50",
  "attackRiskTolerancePerPointFrom50",
  "defenseCautionPerPointFrom50",
  "defenseRiskTolerancePenaltyPerPointFrom50",
  "focusCautionPerPointFrom50",
  "movementAggressionMinusCaution",
  "surrenderCautionPerPointFrom50",
  "surrenderPerseveranceReductionPerPointFrom50",
  "surrenderRiskToleranceReductionPerPointFrom50",
] as const;

function convertBattle(
  battle: Record<string, unknown>,
  path: string,
  issues: ValidationIssue[],
): boolean {
  let ok = true;

  const startDurability = asRecord(battle, "startDurability", `${path}/startDurability`, issues);
  if (startDurability === undefined) {
    ok = false;
  } else if (
    !convertAll(
      startDurability,
      ["conditionPercentPerPoint", "fatiguePercentPerPoint", "injuryPercentPerPoint"],
      `${path}/startDurability`,
      issues,
    )
  ) {
    ok = false;
  }

  const actionOrder = asRecord(battle, "actionOrder", `${path}/actionOrder`, issues);
  if (actionOrder === undefined) {
    ok = false;
  } else if (
    !convertAll(
      actionOrder,
      ["conditionPerPoint", "fatiguePenaltyPerPoint", "injuryPenaltyPerPoint"],
      `${path}/actionOrder`,
      issues,
    )
  ) {
    ok = false;
  }

  const damageFormula = asRecord(battle, "damageFormula", `${path}/damageFormula`, issues);
  if (damageFormula === undefined) {
    ok = false;
  } else if (
    !convertAll(damageFormula, DAMAGE_FORMULA_BASIS_POINTS_KEYS, `${path}/damageFormula`, issues)
  ) {
    ok = false;
  }

  const defense = asRecord(battle, "defense", `${path}/defense`, issues);
  if (defense === undefined) {
    ok = false;
  } else {
    const damageFactorByConsumptionClass = asRecord(
      defense,
      "damageFactorByConsumptionClass",
      `${path}/defense/damageFactorByConsumptionClass`,
      issues,
    );
    if (damageFactorByConsumptionClass === undefined) {
      ok = false;
    } else if (
      !convertAll(
        damageFactorByConsumptionClass,
        CONSUMPTION_CLASS_KEYS,
        `${path}/defense/damageFactorByConsumptionClass`,
        issues,
      )
    ) {
      ok = false;
    }
  }

  const movement = asRecord(battle, "movement", `${path}/movement`, issues);
  if (movement === undefined) {
    ok = false;
  } else if (!convertAll(movement, ["speedWeight", "skillWeight"], `${path}/movement`, issues)) {
    ok = false;
  }

  const focusMind = asRecord(battle, "focusMind", `${path}/focusMind`, issues);
  if (focusMind === undefined) {
    ok = false;
  } else if (
    !convertAll(
      focusMind,
      ["recoveryRatio", "partialRecoveryRatio", "interruptDamageRatio"],
      `${path}/focusMind`,
      issues,
    )
  ) {
    ok = false;
  }

  const activation = asRecord(battle, "activation", `${path}/activation`, issues);
  if (activation === undefined) {
    ok = false;
  } else if (
    !convertAll(
      activation,
      [
        "difficultyPenaltyPerPoint",
        "spiritBonusPerPointFrom50",
        "masteryBonusPerPointFrom50",
        "aptitudeBonusPerPointFrom50",
        "fatiguePenaltyPerPoint",
        "injuryPenaltyPerPoint",
        "consumptionPenaltyPerPoint",
      ],
      `${path}/activation`,
      issues,
    )
  ) {
    ok = false;
  }

  const mentalCost = asRecord(battle, "mentalCost", `${path}/mentalCost`, issues);
  if (mentalCost === undefined) {
    ok = false;
  } else if (
    !convert(
      mentalCost,
      "maximumMasteryReductionRatio",
      `${path}/mentalCost/maximumMasteryReductionRatio`,
      issues,
    )
  ) {
    ok = false;
  }

  const injury = asRecord(battle, "injury", `${path}/injury`, issues);
  if (injury === undefined) {
    ok = false;
  } else if (
    !convertAll(
      injury,
      [
        "fatigueChancePerPoint",
        "existingInjuryChancePerPoint",
        "staminaReductionPerPoint",
        "injuryPronenessChancePerPointFrom50",
        "guardedChanceFactor",
        "majorChanceWhenInjured",
      ],
      `${path}/injury`,
      issues,
    )
  ) {
    ok = false;
  }

  const consumption = asRecord(battle, "consumption", `${path}/consumption`, issues);
  if (consumption === undefined) {
    ok = false;
  } else {
    const performanceBands = asRecord(
      consumption,
      "performanceBands",
      `${path}/consumption/performanceBands`,
      issues,
    );
    if (performanceBands === undefined) {
      ok = false;
    } else if (
      !convertAll(
        performanceBands,
        PERFORMANCE_BAND_KEYS,
        `${path}/consumption/performanceBands`,
        issues,
      )
    ) {
      ok = false;
    }
    if (
      !convert(
        consumption,
        "highBandInjuryMultiplier",
        `${path}/consumption/highBandInjuryMultiplier`,
        issues,
      )
    ) {
      ok = false;
    }
  }

  const strategy = asRecord(battle, "strategy", `${path}/strategy`, issues);
  if (strategy === undefined) {
    ok = false;
  } else {
    if (
      !convert(strategy, "expectedDamageWeight", `${path}/strategy/expectedDamageWeight`, issues)
    ) {
      ok = false;
    }
    if (
      !convert(
        strategy,
        "mentalCostPenaltyWeight",
        `${path}/strategy/mentalCostPenaltyWeight`,
        issues,
      )
    ) {
      ok = false;
    }
    const personalityModifiers = asRecord(
      strategy,
      "personalityModifiers",
      `${path}/strategy/personalityModifiers`,
      issues,
    );
    if (personalityModifiers === undefined) {
      ok = false;
    } else if (
      !convertAll(
        personalityModifiers,
        PERSONALITY_MODIFIER_BASIS_POINTS_KEYS,
        `${path}/strategy/personalityModifiers`,
        issues,
      )
    ) {
      ok = false;
    }
  }

  const postEffects = asRecord(battle, "postEffects", `${path}/postEffects`, issues);
  if (postEffects === undefined) {
    ok = false;
  } else if (
    !convert(
      postEffects,
      "continuedFatigueRatio",
      `${path}/postEffects/continuedFatigueRatio`,
      issues,
    )
  ) {
    ok = false;
  }

  return ok;
}

/**
 * Converts every basis-points field of a structurally-validated Sprint1Config
 * from its decimal display value to an integer ×10000 basis-points value.
 *
 * Returns a deep clone with the converted fields on full success. On any
 * conversion failure, `issues` is populated with one entry per failing field
 * and `undefined` is returned; every field is still attempted so all failures
 * are reported together.
 */
export function normalizeSprint1ConfigBasisPoints(
  config: Sprint1ConfigInput,
  issues: ValidationIssue[],
): Sprint1ConfigNormalizedData | undefined {
  const cloned = cloneValidatedPlainJson(config) as unknown as Record<string, unknown>;

  let ok = true;

  const growth = asRecord(cloned, "growth", "/growth", issues);
  if (growth === undefined) {
    ok = false;
  } else if (!convertGrowth(growth, "/growth", issues)) {
    ok = false;
  }

  const weeklyPlanner = asRecord(cloned, "weeklyPlanner", "/weeklyPlanner", issues);
  if (weeklyPlanner === undefined) {
    ok = false;
  } else if (!convertWeeklyPlanner(weeklyPlanner, "/weeklyPlanner", issues)) {
    ok = false;
  }

  const techniqueLearning = asRecord(cloned, "techniqueLearning", "/techniqueLearning", issues);
  if (techniqueLearning === undefined) {
    ok = false;
  } else if (!convertTechniqueLearning(techniqueLearning, "/techniqueLearning", issues)) {
    ok = false;
  }

  const battle = asRecord(cloned, "battle", "/battle", issues);
  if (battle === undefined) {
    ok = false;
  } else if (!convertBattle(battle, "/battle", issues)) {
    ok = false;
  }

  if (!ok) {
    return undefined;
  }

  return cloned as unknown as Sprint1ConfigNormalizedData;
}
