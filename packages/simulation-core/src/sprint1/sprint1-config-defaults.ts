/**
 * Exact Sprint1Config default values (14 mini-spec §2-§7).
 * Every literal below must match the mini-spec text verbatim; do not "round" or
 * "simplify" any figure. `createDefaultSprint1ConfigInput` returns a fresh mutable
 * object tree (no shared references) so callers may freeze only after validating.
 */
import { SPRINT1_CONFIG_SCHEMA_VERSION, SPRINT1_CONFIG_VERSION_DEFAULT } from "./constants.js";
import type {
  BattleConfigInput,
  GrowthConfigInput,
  Sprint1ConfigInput,
  TechniqueBalanceConfigInput,
  TechniqueLearningConfigInput,
  TemporaryConditionConfigInput,
  WeeklyPlannerConfigInput,
} from "./types.js";

/** 14 §7.6: consumption band boundaries and action-base costs are fixed canon (no override). */
export const FIXED_CONSUMPTION_ACTION_BASE: BattleConfigInput["consumption"]["actionBase"] = {
  basicAttack: 2,
  techniqueSmall: 3,
  techniqueMedium: 5,
  techniqueLarge: 8,
  techniqueUltimate: 12,
  approach: 3,
  retreat: 3,
  basicDefense: 1,
  evade: 4,
  focusMind: 1,
  surrender: 0,
  noAction: 0,
};

export const FIXED_CONSUMPTION_HIGH_PRIORITY_ADDITIONAL = 2;

export const FIXED_CONSUMPTION_PERFORMANCE_BANDS: BattleConfigInput["consumption"]["performanceBands"] =
  {
    "0..29": 1.0,
    "30..49": 0.95,
    "50..69": 0.9,
    "70..84": 0.8,
    "85..100": 0.7,
  };

/** 14 §7.7 / §8: judgement's 100-point allocation is fixed canon (no override). */
export const FIXED_JUDGEMENT: BattleConfigInput["judgement"] = {
  totalMinimum: 0,
  totalMaximum: 100,
  damageMaximum: 50,
  hitMaximum: 15,
  techniqueMaximum: 15,
  initiativeMaximum: 10,
  defenseMaximum: 10,
  passivityPenaltyMaximum: 20,
  passivityPenaltyPerAction: 2,
  invalidActionPenaltyPerAction: 2,
  techniqueImportancePoints: {
    basic: 1,
    standard: 2,
    advanced: 3,
    secret: 5,
  },
};

function createDefaultGrowthConfig(): GrowthConfigInput {
  return {
    fixedPointScale: 1000,
    baseMilliPointsPerTraining: 500,
    potentialMinimumFactor: 0.65,
    potentialMaximumFactor: 1.35,
    ageFactorsByProfile: {
      early: {
        age0to7: 0.0,
        age8to11: 0.9,
        age12to15: 1.1,
        age16to20: 1.15,
        age21to27: 0.9,
        age28to34: 0.65,
        age35to41: 0.35,
        age42plus: 0.0,
      },
      normal: {
        age0to7: 0.0,
        age8to11: 0.8,
        age12to15: 1.0,
        age16to20: 1.15,
        age21to27: 1.0,
        age28to34: 0.75,
        age35to41: 0.45,
        age42plus: 0.0,
      },
      late: {
        age0to7: 0.0,
        age8to11: 0.7,
        age12to15: 0.9,
        age16to20: 1.05,
        age21to27: 1.1,
        age28to34: 0.85,
        age35to41: 0.55,
        age42plus: 0.0,
      },
    },
    currentValueFactors: {
      value0to39: 1.15,
      value40to59: 1.0,
      value60to74: 0.75,
      value75to89: 0.45,
      value90to100: 0.2,
    },
    teacherFactors: {
      noFormalMasterOrUnqualifiedParent: 0.75,
      averageMaster: 1.0,
      goodMaster: 1.1,
      renownedInstructor: 1.2,
      eraLeadingInstructor: 1.3,
    },
    discipleCountFactors: {
      count1to3: 1.0,
      count4to6: 0.92,
      count7to10: 0.82,
      count11to20: 0.7,
      count21to40: 0.55,
      count41plus: 0.4,
    },
    fatigueFactors: {
      value0to20: 1.0,
      value21to40: 0.9,
      value41to60: 0.7,
      value61to80: 0.4,
      value81to100: 0.15,
    },
    injuryFactors: {
      none0: 1.0,
      light1to24: 0.85,
      medium25to59: 0.55,
      severe60to100: 0.2,
    },
    motivationConditionMinimumFactor: 0.8,
    motivationConditionMaximumFactor: 1.15,
    rngMinimumFactor: 0.9,
    rngMaximumFactor: 1.1,
  };
}

function createDefaultTemporaryConditionConfig(): TemporaryConditionConfigInput {
  return {
    injuryBands: {
      none: 0,
      light: { min: 1, max: 24 },
      medium: { min: 25, max: 59 },
      severe: { min: 60, max: 100 },
    },
    weeklyFatigueDelta: {
      trainStat: 8,
      learnTechnique: 7,
      practiceTechnique: 6,
      rest: -18,
    },
    restConditionDelta: 2,
    restMentalRecovery: 20,
    restInjuryRecovery: 5,
    forcedRestFatigueThreshold: 81,
  };
}

function createDefaultWeeklyPlannerConfig(): WeeklyPlannerConfigInput {
  return {
    baseScoresByCareerStatus: {
      trainee: { train: 35, learn: 30, practice: 20, rest: 15 },
      activeCompetitor: { train: 30, learn: 20, practice: 30, rest: 20 },
      retired: { train: 0, learn: 0, practice: 0, rest: 100 },
    },
    contextScoreRange: { min: -20, max: 20 },
    contextWeights: {
      personality: 1.0,
      developmentNeed: 1.0,
      recentResult: 1.0,
      teacherAdvice: 1.0,
      schedule: 1.0,
    },
    baseFatiguePenaltyPerFivePoints: 1,
    baseInjuryPenaltyPerFivePoints: 1,
    baseMentalExhaustionPenaltyMaximum: 20,
    burdenPenaltyMultipliersByAction: {
      trainStat: { fatigue: 1.0, injury: 1.0, mental: 0.6 },
      learnTechnique: { fatigue: 0.8, injury: 0.8, mental: 1.0 },
      practiceTechnique: { fatigue: 0.7, injury: 0.6, mental: 0.75 },
      rest: { fatigue: 0.0, injury: 0.0, mental: 0.0 },
    },
    restNeedBonuses: {
      fatiguePerFivePoints: 1.5,
      fatigueMaximum: 30,
      injuryPerFivePoints: 1.25,
      injuryMaximum: 25,
      mentalExhaustionMaximum: 25,
    },
    statTargetWeights: {
      remainingCapacity: 1.0,
      growthPotential: 1.0,
      relatedAptitude: 0.5,
      teacherRecommendation: 1.0,
    },
    learningTargetWeights: {
      aptitude: 25,
      requiredStats: 15,
      currentProgress: 25,
      teacherAvailability: 20,
      styleMatch: 10,
      tierAccessibility: 5,
    },
    practiceTargetWeights: {
      masteryNeed: 50,
      recentPracticeNeed: 20,
      teacherPriority: 15,
      styleMatch: 15,
    },
  };
}

function createDefaultTechniqueLearningConfig(): TechniqueLearningConfigInput {
  return {
    baseWeeklyProgressTenths: 100,
    aptitudeFactorRange: { min: 0.6, max: 1.4 },
    aptitudeFactorFormula: "0.60 + aptitude / 100 * 0.80",
    requiredStatsFactorRange: { min: 0.7, max: 1.2 },
    learningTraitFactorRange: { min: 0.7, max: 1.3 },
    learningTraitFactorFormula: "0.70 + learningTrait / 100 * 0.60",
    teacherTransmissionFactorRange: { min: 0.7, max: 1.3 },
    teacherTransmissionFactorFormula: "0.70 + teachingAbility / 100 * 0.60",
    compatibilityFactorRange: { min: 0.8, max: 1.2 },
    compatibilityFactorFormula: "0.80 + compatibility / 100 * 0.40",
    selfStudyFactor: 0.4,
    rngFactorRange: { min: 0.9, max: 1.1 },
    initialMasteryByTier: {
      basic: 20,
      standard: 15,
      advanced: 10,
      secret: 5,
    },
    masteryGainHundredths: {
      dedicatedPractice: 150,
      normalTraining: 50,
      officialSuccess: 20,
      officialFailure: 10,
      mockSuccess: 10,
      mockFailure: 5,
    },
    masteryPracticeRngFactorRange: { min: 0.9, max: 1.1 },
    masteryCurrentValueFactors: {
      mastery0to39: 1.0,
      mastery40to59: 0.8,
      mastery60to79: 0.55,
      mastery80to89: 0.25,
      mastery90to100: 0.1,
    },
  };
}

function createDefaultTechniqueBalanceConfig(): TechniqueBalanceConfigInput {
  return {
    powerBands: {
      basicAttack: 20,
      small: { min: 20, max: 35 },
      standard: { min: 36, max: 55 },
      advanced: { min: 56, max: 75 },
      secret: { min: 76, max: 100 },
    },
    basicAttackProfiles: {
      unarmed: {
        primaryStats: ["strength", "skill"],
        usableRanges: ["contact", "close"],
        preferredRanges: ["contact", "close"],
        power: 20,
        accuracy: 75,
        mentalCost: 0,
        priority: 0,
        speedModifier: 0,
        rangeShiftAfterUse: "none",
        injuryModifier: 0,
        effectiveMastery: 50,
        activationCheck: false,
      },
      sword: {
        primaryStats: ["skill", "strength"],
        usableRanges: ["close", "middle"],
        preferredRanges: ["close"],
        power: 20,
        accuracy: 75,
        mentalCost: 0,
        priority: 0,
        speedModifier: 0,
        rangeShiftAfterUse: "none",
        injuryModifier: 0,
        effectiveMastery: 50,
        activationCheck: false,
      },
      magic: {
        primaryStats: ["magic", "spirit"],
        usableRanges: ["middle", "long"],
        preferredRanges: ["long"],
        power: 20,
        accuracy: 75,
        mentalCost: 0,
        priority: 0,
        speedModifier: 0,
        rangeShiftAfterUse: "none",
        injuryModifier: 0,
        effectiveMastery: 50,
        activationCheck: false,
      },
    },
  };
}

function createDefaultBattleConfig(): BattleConfigInput {
  return {
    maxTurns: 20,
    defaultInitialRange: "middle",
    startDurability: {
      conditionPercentPerPoint: 0.5,
      fatiguePercentPerPoint: 0.25,
      injuryPercentPerPoint: 0.5,
      minimumPercent: 10,
    },
    actionOrder: {
      conditionPerPoint: 0.25,
      fatiguePenaltyPerPoint: 0.1,
      injuryPenaltyPerPoint: 0.15,
      randomMinimum: -5,
      randomMaximum: 5,
    },
    hit: {
      minimumPercent: 5,
      maximumPercent: 95,
      preferredRangeModifier: 10,
      usableNonPreferredRangePenalty: 15,
      evadePenalty: 30,
    },
    damageFormula: {
      aptitudeBase: 0.7,
      aptitudeDivisor: 250,
      masteryBase: 0.8,
      masteryDivisor: 500,
      staminaDefenseWeight: 0.45,
      skillDefenseWeight: 0.2,
      conditionDefenseWeight: 0.1,
      fatigueDefensePenaltyWeight: 0.05,
      injuryDefensePenaltyWeight: 0.1,
      techniquePowerWeight: 0.35,
      attackValueWeight: 0.25,
      defenseValueReductionWeight: 0.2,
      varianceMinimum: 0.9,
      varianceMaximum: 1.1,
      minimumDamage: 1,
    },
    defense: {
      damageFactorByConsumptionClass: {
        basicAttack: 0.55,
        small: 0.55,
        medium: 0.6,
        large: 0.7,
        ultimate: 0.8,
      },
      rangeShiftBlockChanceByConsumptionClass: {
        basicAttack: 70,
        small: 70,
        medium: 60,
        large: 45,
        ultimate: 30,
      },
    },
    movement: {
      speedWeight: 0.5,
      skillWeight: 0.3,
      actionBonus: 5,
      opponentPreferredRangeControlBonus: 5,
      opposingMovementBonus: 10,
      guardingRangeControlBonus: 5,
      randomMinimum: -10,
      randomMaximum: 10,
    },
    focusMind: {
      recoveryRatio: 0.1,
      partialRecoveryRatio: 0.5,
      interruptDamageRatio: 0.2,
      noDamageNextHitModifier: 3,
      noDamageNextActivationModifier: 3,
      partialDamageNextHitModifier: 1,
      partialDamageNextActivationModifier: 1,
    },
    activation: {
      minimumPercent: 5,
      maximumPercent: 100,
      basePercent: 95,
      difficultyPenaltyPerPoint: 0.5,
      spiritBonusPerPointFrom50: 0.25,
      masteryBonusPerPointFrom50: 0.2,
      aptitudeBonusPerPointFrom50: 0.1,
      fatiguePenaltyPerPoint: 0.1,
      injuryPenaltyPerPoint: 0.1,
      consumptionPenaltyPerPoint: 0.1,
    },
    mentalCost: {
      maximumMasteryReductionRatio: 0.1,
    },
    injury: {
      baseChanceBands: {
        below10Percent: 0,
        "10to19Percent": 2,
        "20to29Percent": 6,
        "30to39Percent": 12,
        "40PercentOrMore": 25,
      },
      fatigueChancePerPoint: 0.1,
      existingInjuryChancePerPoint: 0.1,
      staminaReductionPerPoint: 0.08,
      injuryPronenessChancePerPointFrom50: 0.1,
      maximumPercent: 95,
      guardedChanceFactor: 0.5,
      majorChanceWhenInjured: 0.2,
      minorInjuryDelta: 10,
      majorInjuryDelta: 30,
      unableToContinueThreshold: 100,
    },
    consumption: {
      actionBase: { ...FIXED_CONSUMPTION_ACTION_BASE },
      highPriorityAdditional: FIXED_CONSUMPTION_HIGH_PRIORITY_ADDITIONAL,
      performanceBands: { ...FIXED_CONSUMPTION_PERFORMANCE_BANDS },
      highBandInjuryMultiplier: 1.25,
    },
    judgement: {
      ...FIXED_JUDGEMENT,
      techniqueImportancePoints: { ...FIXED_JUDGEMENT.techniqueImportancePoints },
    },
    strategy: {
      expectedDamageWeight: 1.0,
      rangeControlWeight: 10,
      defenseNeedWeight: 20,
      mentalRecoveryNeedWeight: 15,
      mentalCostPenaltyWeight: 0.5,
      injuryRiskPenaltyWeight: 20,
      personalityModifiers: {
        attackAggressionPerPointFrom50: 0.2,
        attackRiskTolerancePerPointFrom50: 0.1,
        defenseCautionPerPointFrom50: 0.2,
        defenseRiskTolerancePenaltyPerPointFrom50: 0.05,
        focusCautionPerPointFrom50: 0.1,
        movementAggressionMinusCaution: 0.05,
        surrenderCautionPerPointFrom50: 0.1,
        surrenderPerseveranceReductionPerPointFrom50: 0.2,
        surrenderRiskToleranceReductionPerPointFrom50: 0.1,
      },
      surrenderCandidateThreshold: 70,
      surrenderActionBaseScore: 0,
      surrender: {
        durabilityWeight: 45,
        mentalWeight: 15,
        injuryWeight: 20,
        consumptionWeight: 15,
        opponentLeadWeight: 20,
        confidenceWeight: 10,
        majorInjuryRiskWeight: 20,
      },
      highConsumptionSurrenderBonus: 10,
    },
    postEffects: {
      continuedFatigueRatio: 0.25,
      damageAdditionalFatigueRules: {
        below10Percent: 0,
        "10to19Percent": 2,
        "20to29Percent": 4,
        "30to39Percent": 7,
        "40PercentOrMore": 10,
      },
      majorInjuryAdditionalFatigue: 8,
      consecutiveMatchAdditionalFatigueRules: {
        firstMatch: 0,
        secondMatch: 3,
        thirdOrLater: 6,
      },
      ageAdditionalFatigueRules: {
        age0to27: 0,
        age28to34: 2,
        age35to41: 4,
      },
      resultModifiersByBattleKindAndEndReason: {
        officialWin: { condition: 2, confidence: 3 },
        officialLoss: { condition: -2, confidence: -3 },
        mockWin: { condition: 1, confidence: 1 },
        mockLoss: { condition: -1, confidence: -1 },
        surrenderAdditional: { condition: -1, confidence: -2 },
        knockoutAdditional: { condition: -1, confidence: -1 },
      },
    },
  };
}

/**
 * Fresh mutable raw Sprint1ConfigInput tree from the 14 mini-spec §2-§7 display values.
 * Decimal factors are intentional; pass through `validateSprint1Config` before runtime use.
 */
export function createDefaultSprint1ConfigInput(): Sprint1ConfigInput {
  return {
    schemaVersion: SPRINT1_CONFIG_SCHEMA_VERSION,
    configVersion: SPRINT1_CONFIG_VERSION_DEFAULT,
    growth: createDefaultGrowthConfig(),
    temporaryCondition: createDefaultTemporaryConditionConfig(),
    weeklyPlanner: createDefaultWeeklyPlannerConfig(),
    techniqueLearning: createDefaultTechniqueLearningConfig(),
    techniqueBalance: createDefaultTechniqueBalanceConfig(),
    battle: createDefaultBattleConfig(),
  };
}
