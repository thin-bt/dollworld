import type { AbilityKey, AptitudeKey } from "../abilities.js";
import type { TechniqueId } from "../ids.js";
import type { BasisPoints } from "./basis-points.js";

/** Same keys as AptitudeKey / BasicAttackProfile. `martial` is forbidden. */
export const TECHNIQUE_CATEGORIES = ["unarmed", "sword", "magic"] as const;
export type TechniqueCategory = (typeof TECHNIQUE_CATEGORIES)[number];

export const BATTLE_RANGES = ["contact", "close", "middle", "long"] as const;
export type BattleRange = (typeof BATTLE_RANGES)[number];

/** Full 09 mini-spec union. Basic-attack profiles still require `"none"` only at Config validation. */
export const RANGE_SHIFT_AFTER_USE = ["none", "approach_one", "retreat_one"] as const;
export type RangeShiftAfterUse = (typeof RANGE_SHIFT_AFTER_USE)[number];

/**
 * Person-side technique storage shape owned by S01-001 (09 §6).
 * Catalog membership and mastery/learning semantics are validated in S01-003.
 */
export type PersonTechniqueState = {
  techniqueId: TechniqueId;
  learningProgressTenths: number;
  masteryHundredths: number;
  successfulUseCount: number;
  attemptedUseCount: number;
  lastPracticedAbsoluteWeek: number | null;
  acquiredAbsoluteWeek: number | null;
};

/** Integer or raw-display min/max pair. */
export type NumericMinMax = {
  min: number;
  max: number;
};

/** Normalized factor-range min/max in basis points. */
export type BasisPointsMinMax = {
  min: BasisPoints;
  max: BasisPoints;
};

export type GrowthAgeFactorsInput = {
  age0to7: number;
  age8to11: number;
  age12to15: number;
  age16to20: number;
  age21to27: number;
  age28to34: number;
  age35to41: number;
  age42plus: number;
};

export type GrowthConfigInput = {
  fixedPointScale: number;
  baseMilliPointsPerTraining: number;
  potentialMinimumFactor: number;
  potentialMaximumFactor: number;
  ageFactorsByProfile: {
    early: GrowthAgeFactorsInput;
    normal: GrowthAgeFactorsInput;
    late: GrowthAgeFactorsInput;
  };
  currentValueFactors: {
    value0to39: number;
    value40to59: number;
    value60to74: number;
    value75to89: number;
    value90to100: number;
  };
  teacherFactors: {
    noFormalMasterOrUnqualifiedParent: number;
    averageMaster: number;
    goodMaster: number;
    renownedInstructor: number;
    eraLeadingInstructor: number;
  };
  discipleCountFactors: {
    count1to3: number;
    count4to6: number;
    count7to10: number;
    count11to20: number;
    count21to40: number;
    count41plus: number;
  };
  fatigueFactors: {
    value0to20: number;
    value21to40: number;
    value41to60: number;
    value61to80: number;
    value81to100: number;
  };
  injuryFactors: {
    none0: number;
    light1to24: number;
    medium25to59: number;
    severe60to100: number;
  };
  motivationConditionMinimumFactor: number;
  motivationConditionMaximumFactor: number;
  rngMinimumFactor: number;
  rngMaximumFactor: number;
};

export type TemporaryConditionConfigInput = {
  injuryBands: {
    none: number;
    light: NumericMinMax;
    medium: NumericMinMax;
    severe: NumericMinMax;
  };
  weeklyFatigueDelta: {
    trainStat: number;
    learnTechnique: number;
    practiceTechnique: number;
    rest: number;
  };
  restConditionDelta: number;
  restMentalRecovery: number;
  restInjuryRecovery: number;
  forcedRestFatigueThreshold: number;
};

export type WeeklyActionScoresInput = {
  train: number;
  learn: number;
  practice: number;
  rest: number;
};

export type BurdenPenaltyMultipliersInput = {
  fatigue: number;
  injury: number;
  mental: number;
};

export type WeeklyPlannerConfigInput = {
  baseScoresByCareerStatus: {
    trainee: WeeklyActionScoresInput;
    activeCompetitor: WeeklyActionScoresInput;
    retired: WeeklyActionScoresInput;
  };
  contextScoreRange: NumericMinMax;
  contextWeights: {
    personality: number;
    developmentNeed: number;
    recentResult: number;
    teacherAdvice: number;
    schedule: number;
  };
  baseFatiguePenaltyPerFivePoints: number;
  baseInjuryPenaltyPerFivePoints: number;
  baseMentalExhaustionPenaltyMaximum: number;
  burdenPenaltyMultipliersByAction: {
    trainStat: BurdenPenaltyMultipliersInput;
    learnTechnique: BurdenPenaltyMultipliersInput;
    practiceTechnique: BurdenPenaltyMultipliersInput;
    rest: BurdenPenaltyMultipliersInput;
  };
  restNeedBonuses: {
    fatiguePerFivePoints: number;
    fatigueMaximum: number;
    injuryPerFivePoints: number;
    injuryMaximum: number;
    mentalExhaustionMaximum: number;
  };
  statTargetWeights: {
    remainingCapacity: number;
    growthPotential: number;
    relatedAptitude: number;
    teacherRecommendation: number;
  };
  learningTargetWeights: {
    aptitude: number;
    requiredStats: number;
    currentProgress: number;
    teacherAvailability: number;
    styleMatch: number;
    tierAccessibility: number;
  };
  practiceTargetWeights: {
    masteryNeed: number;
    recentPracticeNeed: number;
    teacherPriority: number;
    styleMatch: number;
  };
};

export type TechniqueLearningConfigInput = {
  baseWeeklyProgressTenths: number;
  aptitudeFactorRange: NumericMinMax;
  aptitudeFactorFormula: string;
  requiredStatsFactorRange: NumericMinMax;
  learningTraitFactorRange: NumericMinMax;
  learningTraitFactorFormula: string;
  teacherTransmissionFactorRange: NumericMinMax;
  teacherTransmissionFactorFormula: string;
  compatibilityFactorRange: NumericMinMax;
  compatibilityFactorFormula: string;
  selfStudyFactor: number;
  rngFactorRange: NumericMinMax;
  initialMasteryByTier: {
    basic: number;
    standard: number;
    advanced: number;
    secret: number;
  };
  masteryGainHundredths: {
    dedicatedPractice: number;
    normalTraining: number;
    officialSuccess: number;
    officialFailure: number;
    mockSuccess: number;
    mockFailure: number;
  };
  masteryPracticeRngFactorRange: NumericMinMax;
  masteryCurrentValueFactors: {
    mastery0to39: number;
    mastery40to59: number;
    mastery60to79: number;
    mastery80to89: number;
    mastery90to100: number;
  };
};

export type BasicAttackProfileInput = {
  primaryStats: readonly AbilityKey[];
  usableRanges: readonly BattleRange[];
  preferredRanges: readonly BattleRange[];
  power: number;
  accuracy: number;
  mentalCost: number;
  priority: number;
  speedModifier: number;
  rangeShiftAfterUse: RangeShiftAfterUse;
  injuryModifier: number;
  effectiveMastery: number;
  activationCheck: boolean;
};

export type TechniqueBalanceConfigInput = {
  powerBands: {
    basicAttack: number;
    small: NumericMinMax;
    standard: NumericMinMax;
    advanced: NumericMinMax;
    secret: NumericMinMax;
  };
  basicAttackProfiles: {
    readonly [K in AptitudeKey]: BasicAttackProfileInput;
  };
};

export type BattleConfigInput = {
  maxTurns: number;
  defaultInitialRange: BattleRange;
  startDurability: {
    conditionPercentPerPoint: number;
    fatiguePercentPerPoint: number;
    injuryPercentPerPoint: number;
    minimumPercent: number;
  };
  actionOrder: {
    conditionPerPoint: number;
    fatiguePenaltyPerPoint: number;
    injuryPenaltyPerPoint: number;
    randomMinimum: number;
    randomMaximum: number;
  };
  hit: {
    minimumPercent: number;
    maximumPercent: number;
    preferredRangeModifier: number;
    usableNonPreferredRangePenalty: number;
    evadePenalty: number;
  };
  damageFormula: {
    aptitudeBase: number;
    aptitudeDivisor: number;
    masteryBase: number;
    masteryDivisor: number;
    staminaDefenseWeight: number;
    skillDefenseWeight: number;
    conditionDefenseWeight: number;
    fatigueDefensePenaltyWeight: number;
    injuryDefensePenaltyWeight: number;
    techniquePowerWeight: number;
    attackValueWeight: number;
    defenseValueReductionWeight: number;
    varianceMinimum: number;
    varianceMaximum: number;
    minimumDamage: number;
  };
  defense: {
    damageFactorByConsumptionClass: {
      basicAttack: number;
      small: number;
      medium: number;
      large: number;
      ultimate: number;
    };
    rangeShiftBlockChanceByConsumptionClass: {
      basicAttack: number;
      small: number;
      medium: number;
      large: number;
      ultimate: number;
    };
  };
  movement: {
    speedWeight: number;
    skillWeight: number;
    actionBonus: number;
    opponentPreferredRangeControlBonus: number;
    opposingMovementBonus: number;
    guardingRangeControlBonus: number;
    randomMinimum: number;
    randomMaximum: number;
  };
  focusMind: {
    recoveryRatio: number;
    partialRecoveryRatio: number;
    interruptDamageRatio: number;
    noDamageNextHitModifier: number;
    noDamageNextActivationModifier: number;
    partialDamageNextHitModifier: number;
    partialDamageNextActivationModifier: number;
  };
  activation: {
    minimumPercent: number;
    maximumPercent: number;
    basePercent: number;
    difficultyPenaltyPerPoint: number;
    spiritBonusPerPointFrom50: number;
    masteryBonusPerPointFrom50: number;
    aptitudeBonusPerPointFrom50: number;
    fatiguePenaltyPerPoint: number;
    injuryPenaltyPerPoint: number;
    consumptionPenaltyPerPoint: number;
  };
  mentalCost: {
    maximumMasteryReductionRatio: number;
  };
  injury: {
    baseChanceBands: {
      below10Percent: number;
      "10to19Percent": number;
      "20to29Percent": number;
      "30to39Percent": number;
      "40PercentOrMore": number;
    };
    fatigueChancePerPoint: number;
    existingInjuryChancePerPoint: number;
    staminaReductionPerPoint: number;
    injuryPronenessChancePerPointFrom50: number;
    maximumPercent: number;
    guardedChanceFactor: number;
    majorChanceWhenInjured: number;
    minorInjuryDelta: number;
    majorInjuryDelta: number;
    unableToContinueThreshold: number;
  };
  consumption: {
    actionBase: {
      basicAttack: number;
      techniqueSmall: number;
      techniqueMedium: number;
      techniqueLarge: number;
      techniqueUltimate: number;
      approach: number;
      retreat: number;
      basicDefense: number;
      evade: number;
      focusMind: number;
      surrender: number;
      noAction: number;
    };
    highPriorityAdditional: number;
    performanceBands: {
      "0..29": number;
      "30..49": number;
      "50..69": number;
      "70..84": number;
      "85..100": number;
    };
    highBandInjuryMultiplier: number;
  };
  judgement: {
    totalMinimum: number;
    totalMaximum: number;
    damageMaximum: number;
    hitMaximum: number;
    techniqueMaximum: number;
    initiativeMaximum: number;
    defenseMaximum: number;
    passivityPenaltyMaximum: number;
    passivityPenaltyPerAction: number;
    invalidActionPenaltyPerAction: number;
    techniqueImportancePoints: {
      basic: number;
      standard: number;
      advanced: number;
      secret: number;
    };
  };
  strategy: {
    expectedDamageWeight: number;
    rangeControlWeight: number;
    defenseNeedWeight: number;
    mentalRecoveryNeedWeight: number;
    mentalCostPenaltyWeight: number;
    injuryRiskPenaltyWeight: number;
    personalityModifiers: {
      attackAggressionPerPointFrom50: number;
      attackRiskTolerancePerPointFrom50: number;
      defenseCautionPerPointFrom50: number;
      defenseRiskTolerancePenaltyPerPointFrom50: number;
      focusCautionPerPointFrom50: number;
      movementAggressionMinusCaution: number;
      surrenderCautionPerPointFrom50: number;
      surrenderPerseveranceReductionPerPointFrom50: number;
      surrenderRiskToleranceReductionPerPointFrom50: number;
    };
    surrenderCandidateThreshold: number;
    surrenderActionBaseScore: number;
    surrender: {
      durabilityWeight: number;
      mentalWeight: number;
      injuryWeight: number;
      consumptionWeight: number;
      opponentLeadWeight: number;
      confidenceWeight: number;
      majorInjuryRiskWeight: number;
    };
    highConsumptionSurrenderBonus: number;
  };
  postEffects: {
    continuedFatigueRatio: number;
    damageAdditionalFatigueRules: {
      below10Percent: number;
      "10to19Percent": number;
      "20to29Percent": number;
      "30to39Percent": number;
      "40PercentOrMore": number;
    };
    majorInjuryAdditionalFatigue: number;
    consecutiveMatchAdditionalFatigueRules: {
      firstMatch: number;
      secondMatch: number;
      thirdOrLater: number;
    };
    ageAdditionalFatigueRules: {
      age0to27: number;
      age28to34: number;
      age35to41: number;
    };
    resultModifiersByBattleKindAndEndReason: {
      officialWin: { condition: number; confidence: number };
      officialLoss: { condition: number; confidence: number };
      mockWin: { condition: number; confidence: number };
      mockLoss: { condition: number; confidence: number };
      surrenderAdditional: { condition: number; confidence: number };
      knockoutAdditional: { condition: number; confidence: number };
    };
  };
};

export type GrowthAgeFactors = {
  age0to7: BasisPoints;
  age8to11: BasisPoints;
  age12to15: BasisPoints;
  age16to20: BasisPoints;
  age21to27: BasisPoints;
  age28to34: BasisPoints;
  age35to41: BasisPoints;
  age42plus: BasisPoints;
};

export type GrowthConfig = {
  fixedPointScale: number;
  baseMilliPointsPerTraining: number;
  potentialMinimumFactor: BasisPoints;
  potentialMaximumFactor: BasisPoints;
  ageFactorsByProfile: {
    early: GrowthAgeFactors;
    normal: GrowthAgeFactors;
    late: GrowthAgeFactors;
  };
  currentValueFactors: {
    value0to39: BasisPoints;
    value40to59: BasisPoints;
    value60to74: BasisPoints;
    value75to89: BasisPoints;
    value90to100: BasisPoints;
  };
  teacherFactors: {
    noFormalMasterOrUnqualifiedParent: BasisPoints;
    averageMaster: BasisPoints;
    goodMaster: BasisPoints;
    renownedInstructor: BasisPoints;
    eraLeadingInstructor: BasisPoints;
  };
  discipleCountFactors: {
    count1to3: BasisPoints;
    count4to6: BasisPoints;
    count7to10: BasisPoints;
    count11to20: BasisPoints;
    count21to40: BasisPoints;
    count41plus: BasisPoints;
  };
  fatigueFactors: {
    value0to20: BasisPoints;
    value21to40: BasisPoints;
    value41to60: BasisPoints;
    value61to80: BasisPoints;
    value81to100: BasisPoints;
  };
  injuryFactors: {
    none0: BasisPoints;
    light1to24: BasisPoints;
    medium25to59: BasisPoints;
    severe60to100: BasisPoints;
  };
  motivationConditionMinimumFactor: BasisPoints;
  motivationConditionMaximumFactor: BasisPoints;
  rngMinimumFactor: BasisPoints;
  rngMaximumFactor: BasisPoints;
};

export type TemporaryConditionConfig = {
  injuryBands: {
    none: number;
    light: NumericMinMax;
    medium: NumericMinMax;
    severe: NumericMinMax;
  };
  weeklyFatigueDelta: {
    trainStat: number;
    learnTechnique: number;
    practiceTechnique: number;
    rest: number;
  };
  restConditionDelta: number;
  restMentalRecovery: number;
  restInjuryRecovery: number;
  forcedRestFatigueThreshold: number;
};

export type WeeklyActionScores = {
  train: number;
  learn: number;
  practice: number;
  rest: number;
};

export type BurdenPenaltyMultipliers = {
  fatigue: BasisPoints;
  injury: BasisPoints;
  mental: BasisPoints;
};

export type WeeklyPlannerConfig = {
  baseScoresByCareerStatus: {
    trainee: WeeklyActionScores;
    activeCompetitor: WeeklyActionScores;
    retired: WeeklyActionScores;
  };
  contextScoreRange: NumericMinMax;
  contextWeights: {
    personality: BasisPoints;
    developmentNeed: BasisPoints;
    recentResult: BasisPoints;
    teacherAdvice: BasisPoints;
    schedule: BasisPoints;
  };
  baseFatiguePenaltyPerFivePoints: number;
  baseInjuryPenaltyPerFivePoints: number;
  baseMentalExhaustionPenaltyMaximum: number;
  burdenPenaltyMultipliersByAction: {
    trainStat: BurdenPenaltyMultipliers;
    learnTechnique: BurdenPenaltyMultipliers;
    practiceTechnique: BurdenPenaltyMultipliers;
    rest: BurdenPenaltyMultipliers;
  };
  restNeedBonuses: {
    fatiguePerFivePoints: BasisPoints;
    fatigueMaximum: number;
    injuryPerFivePoints: BasisPoints;
    injuryMaximum: number;
    mentalExhaustionMaximum: number;
  };
  statTargetWeights: {
    remainingCapacity: BasisPoints;
    growthPotential: BasisPoints;
    relatedAptitude: BasisPoints;
    teacherRecommendation: BasisPoints;
  };
  learningTargetWeights: {
    aptitude: number;
    requiredStats: number;
    currentProgress: number;
    teacherAvailability: number;
    styleMatch: number;
    tierAccessibility: number;
  };
  practiceTargetWeights: {
    masteryNeed: number;
    recentPracticeNeed: number;
    teacherPriority: number;
    styleMatch: number;
  };
};

export type TechniqueLearningConfig = {
  baseWeeklyProgressTenths: number;
  aptitudeFactorRange: BasisPointsMinMax;
  aptitudeFactorFormula: string;
  requiredStatsFactorRange: BasisPointsMinMax;
  learningTraitFactorRange: BasisPointsMinMax;
  learningTraitFactorFormula: string;
  teacherTransmissionFactorRange: BasisPointsMinMax;
  teacherTransmissionFactorFormula: string;
  compatibilityFactorRange: BasisPointsMinMax;
  compatibilityFactorFormula: string;
  selfStudyFactor: BasisPoints;
  rngFactorRange: BasisPointsMinMax;
  initialMasteryByTier: {
    basic: number;
    standard: number;
    advanced: number;
    secret: number;
  };
  masteryGainHundredths: {
    dedicatedPractice: number;
    normalTraining: number;
    officialSuccess: number;
    officialFailure: number;
    mockSuccess: number;
    mockFailure: number;
  };
  masteryPracticeRngFactorRange: BasisPointsMinMax;
  masteryCurrentValueFactors: {
    mastery0to39: BasisPoints;
    mastery40to59: BasisPoints;
    mastery60to79: BasisPoints;
    mastery80to89: BasisPoints;
    mastery90to100: BasisPoints;
  };
};

export type BasicAttackProfile = {
  primaryStats: readonly AbilityKey[];
  usableRanges: readonly BattleRange[];
  preferredRanges: readonly BattleRange[];
  power: number;
  accuracy: number;
  mentalCost: number;
  priority: number;
  speedModifier: number;
  rangeShiftAfterUse: RangeShiftAfterUse;
  injuryModifier: number;
  effectiveMastery: number;
  activationCheck: boolean;
};

export type TechniqueBalanceConfig = {
  powerBands: {
    basicAttack: number;
    small: NumericMinMax;
    standard: NumericMinMax;
    advanced: NumericMinMax;
    secret: NumericMinMax;
  };
  basicAttackProfiles: {
    readonly [K in AptitudeKey]: BasicAttackProfile;
  };
};

export type BattleConfig = {
  maxTurns: number;
  defaultInitialRange: BattleRange;
  startDurability: {
    conditionPercentPerPoint: BasisPoints;
    fatiguePercentPerPoint: BasisPoints;
    injuryPercentPerPoint: BasisPoints;
    minimumPercent: number;
  };
  actionOrder: {
    conditionPerPoint: BasisPoints;
    fatiguePenaltyPerPoint: BasisPoints;
    injuryPenaltyPerPoint: BasisPoints;
    randomMinimum: number;
    randomMaximum: number;
  };
  hit: {
    minimumPercent: number;
    maximumPercent: number;
    preferredRangeModifier: number;
    usableNonPreferredRangePenalty: number;
    evadePenalty: number;
  };
  damageFormula: {
    aptitudeBase: BasisPoints;
    aptitudeDivisor: number;
    masteryBase: BasisPoints;
    masteryDivisor: number;
    staminaDefenseWeight: BasisPoints;
    skillDefenseWeight: BasisPoints;
    conditionDefenseWeight: BasisPoints;
    fatigueDefensePenaltyWeight: BasisPoints;
    injuryDefensePenaltyWeight: BasisPoints;
    techniquePowerWeight: BasisPoints;
    attackValueWeight: BasisPoints;
    defenseValueReductionWeight: BasisPoints;
    varianceMinimum: BasisPoints;
    varianceMaximum: BasisPoints;
    minimumDamage: number;
  };
  defense: {
    damageFactorByConsumptionClass: {
      basicAttack: BasisPoints;
      small: BasisPoints;
      medium: BasisPoints;
      large: BasisPoints;
      ultimate: BasisPoints;
    };
    rangeShiftBlockChanceByConsumptionClass: {
      basicAttack: number;
      small: number;
      medium: number;
      large: number;
      ultimate: number;
    };
  };
  movement: {
    speedWeight: BasisPoints;
    skillWeight: BasisPoints;
    actionBonus: number;
    opponentPreferredRangeControlBonus: number;
    opposingMovementBonus: number;
    guardingRangeControlBonus: number;
    randomMinimum: number;
    randomMaximum: number;
  };
  focusMind: {
    recoveryRatio: BasisPoints;
    partialRecoveryRatio: BasisPoints;
    interruptDamageRatio: BasisPoints;
    noDamageNextHitModifier: number;
    noDamageNextActivationModifier: number;
    partialDamageNextHitModifier: number;
    partialDamageNextActivationModifier: number;
  };
  activation: {
    minimumPercent: number;
    maximumPercent: number;
    basePercent: number;
    difficultyPenaltyPerPoint: BasisPoints;
    spiritBonusPerPointFrom50: BasisPoints;
    masteryBonusPerPointFrom50: BasisPoints;
    aptitudeBonusPerPointFrom50: BasisPoints;
    fatiguePenaltyPerPoint: BasisPoints;
    injuryPenaltyPerPoint: BasisPoints;
    consumptionPenaltyPerPoint: BasisPoints;
  };
  mentalCost: {
    maximumMasteryReductionRatio: BasisPoints;
  };
  injury: {
    baseChanceBands: {
      below10Percent: number;
      "10to19Percent": number;
      "20to29Percent": number;
      "30to39Percent": number;
      "40PercentOrMore": number;
    };
    fatigueChancePerPoint: BasisPoints;
    existingInjuryChancePerPoint: BasisPoints;
    staminaReductionPerPoint: BasisPoints;
    injuryPronenessChancePerPointFrom50: BasisPoints;
    maximumPercent: number;
    guardedChanceFactor: BasisPoints;
    majorChanceWhenInjured: BasisPoints;
    minorInjuryDelta: number;
    majorInjuryDelta: number;
    unableToContinueThreshold: number;
  };
  consumption: {
    actionBase: {
      basicAttack: number;
      techniqueSmall: number;
      techniqueMedium: number;
      techniqueLarge: number;
      techniqueUltimate: number;
      approach: number;
      retreat: number;
      basicDefense: number;
      evade: number;
      focusMind: number;
      surrender: number;
      noAction: number;
    };
    highPriorityAdditional: number;
    performanceBands: {
      "0..29": BasisPoints;
      "30..49": BasisPoints;
      "50..69": BasisPoints;
      "70..84": BasisPoints;
      "85..100": BasisPoints;
    };
    highBandInjuryMultiplier: BasisPoints;
  };
  judgement: {
    totalMinimum: number;
    totalMaximum: number;
    damageMaximum: number;
    hitMaximum: number;
    techniqueMaximum: number;
    initiativeMaximum: number;
    defenseMaximum: number;
    passivityPenaltyMaximum: number;
    passivityPenaltyPerAction: number;
    invalidActionPenaltyPerAction: number;
    techniqueImportancePoints: {
      basic: number;
      standard: number;
      advanced: number;
      secret: number;
    };
  };
  strategy: {
    expectedDamageWeight: BasisPoints;
    rangeControlWeight: number;
    defenseNeedWeight: number;
    mentalRecoveryNeedWeight: number;
    mentalCostPenaltyWeight: BasisPoints;
    injuryRiskPenaltyWeight: number;
    personalityModifiers: {
      attackAggressionPerPointFrom50: BasisPoints;
      attackRiskTolerancePerPointFrom50: BasisPoints;
      defenseCautionPerPointFrom50: BasisPoints;
      defenseRiskTolerancePenaltyPerPointFrom50: BasisPoints;
      focusCautionPerPointFrom50: BasisPoints;
      movementAggressionMinusCaution: BasisPoints;
      surrenderCautionPerPointFrom50: BasisPoints;
      surrenderPerseveranceReductionPerPointFrom50: BasisPoints;
      surrenderRiskToleranceReductionPerPointFrom50: BasisPoints;
    };
    surrenderCandidateThreshold: number;
    surrenderActionBaseScore: number;
    surrender: {
      durabilityWeight: number;
      mentalWeight: number;
      injuryWeight: number;
      consumptionWeight: number;
      opponentLeadWeight: number;
      confidenceWeight: number;
      majorInjuryRiskWeight: number;
    };
    highConsumptionSurrenderBonus: number;
  };
  postEffects: {
    continuedFatigueRatio: BasisPoints;
    damageAdditionalFatigueRules: {
      below10Percent: number;
      "10to19Percent": number;
      "20to29Percent": number;
      "30to39Percent": number;
      "40PercentOrMore": number;
    };
    majorInjuryAdditionalFatigue: number;
    consecutiveMatchAdditionalFatigueRules: {
      firstMatch: number;
      secondMatch: number;
      thirdOrLater: number;
    };
    ageAdditionalFatigueRules: {
      age0to27: number;
      age28to34: number;
      age35to41: number;
    };
    resultModifiersByBattleKindAndEndReason: {
      officialWin: { condition: number; confidence: number };
      officialLoss: { condition: number; confidence: number };
      mockWin: { condition: number; confidence: number };
      mockLoss: { condition: number; confidence: number };
      surrenderAdditional: { condition: number; confidence: number };
      knockoutAdditional: { condition: number; confidence: number };
    };
  };
};

export type Sprint1ConfigInput = {
  schemaVersion: "0.2.0";
  configVersion: string;
  growth: GrowthConfigInput;
  temporaryCondition: TemporaryConditionConfigInput;
  weeklyPlanner: WeeklyPlannerConfigInput;
  techniqueLearning: TechniqueLearningConfigInput;
  techniqueBalance: TechniqueBalanceConfigInput;
  battle: BattleConfigInput;
};

declare const sprint1ConfigNormalizedBrand: unique symbol;

/**
 * Validated + basis-points-normalized Sprint1Config.
 * Factor / ratio / weight fields are integer basis points (×10000).
 * All numeric leaves are finite safe integers. Produced only by validators.
 */
export type Sprint1Config = {
  schemaVersion: "0.2.0";
  configVersion: string;
  growth: GrowthConfig;
  temporaryCondition: TemporaryConditionConfig;
  weeklyPlanner: WeeklyPlannerConfig;
  techniqueLearning: TechniqueLearningConfig;
  techniqueBalance: TechniqueBalanceConfig;
  battle: BattleConfig;
  readonly [sprint1ConfigNormalizedBrand]: void;
};

export type Sprint1ConfigIdentity = {
  configVersion: string;
  configHash: string;
};

export type SpecSetId = "main" | "sprint0" | "sprint1";

export type SpecVersionEntry = {
  specSetId: SpecSetId;
  version: string;
};

/**
 * Sprint 1 SimulationIdentity (02 §12 / S1-SPEC-0.1.21 / CAL-JAN).
 * Catalog/MatchId generator contents and the initial weekly-training sidecar
 * are supplied as hashes/versions. Calendar and year-start manifest are hash-only.
 */
export type SimulationIdentity = {
  schemaVersion: "0.5.0";
  seed: number;
  initialWorldConfigHash: string;
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
  sprint1ConfigHash: string;
  techniqueCatalogHash: string;
  initialWeeklyTrainingSidecarHash: string;
  battleProfileAdapterVersion: string;
  matchIdGeneratorVersion: string;
  initialMatchIdGeneratorStateHash: string;
  defaultBattleStrategyVersion: string;
  specVersions: readonly SpecVersionEntry[];
  rngAlgorithmVersion: string;
  canonicalJsonVersion: string;
  hashAlgorithm: "SHA-256";
};
