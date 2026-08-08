/**
 * DefaultBattleStrategy score-component builder (12 §23.1 / S01-006 fix1).
 *
 * Reuses Resolver activation / hit / damage / injury pure cores.
 * estimatedDamage uses neutral variance 1.00 (10000 BP). No Strategy-only approx.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { BASIC_ATTACK_PROFILES } from "./battle-action.js";
import type { BattleAction, ResolvedBattleAction } from "./battle-action.js";
import { computeActivationChancePercent } from "./battle-activation.js";
import type { BattleDecisionProfile } from "./battle-decision-profile.js";
import { averagePrimaryStatSurface, computeRawDamage } from "./battle-damage.js";
import { applyGuardedDamage } from "./battle-defense.js";
import { computeHitChancePercent } from "./battle-hit.js";
import { computeFinalInjuryChancePercent } from "./battle-injury.js";
import { computeEffectiveMentalCost } from "./battle-mental-cost.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import { consumptionPerformanceFactor } from "./battle-consumption.js";
import {
  canShiftBattleRange,
  floorDivBasisPoints,
  scaleByBasisPointsFloor,
  shiftBattleRange,
} from "./battle-turn-math.js";
import type { StrategyScoreComponents } from "./default-battle-strategy.js";
import { evaluateTechniqueAcquisitionConditions } from "./technique-acquisition.js";
import { getBasicAttackProfile } from "./technique-basic-attack.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { BattleRange, Sprint1Config } from "./types.js";
import { toCanonicalJson } from "../canonical-json.js";

const NEUTRAL_VARIANCE_BP = 10000;

const ACTION_KIND_ORDER = [
  "use_technique",
  "basic_attack",
  "basic_defense",
  "evade",
  "approach",
  "retreat",
  "focus_mind",
  "surrender",
  "no_action",
] as const;

const BASIC_ATTACK_PROFILE_ORDER = ["unarmed", "sword", "magic"] as const;
const EVADE_DIRECTION_ORDER = ["hold", "approach_one", "retreat_one"] as const;

function kindRank(kind: string): number {
  const index = (ACTION_KIND_ORDER as readonly string[]).indexOf(kind);
  return index < 0 ? ACTION_KIND_ORDER.length : index;
}

/**
 * Canonical Strategy candidate order (12 §23.1). Must not use JSON string sort.
 */
export function compareBattleActionsCanonical(
  a: BattleAction | ResolvedBattleAction,
  b: BattleAction | ResolvedBattleAction,
): number {
  const kindCmp = kindRank(a.kind) - kindRank(b.kind);
  if (kindCmp !== 0) {
    return kindCmp;
  }
  if (a.kind === "use_technique" && b.kind === "use_technique") {
    return compareUnicodeCodePoints(a.techniqueId, b.techniqueId);
  }
  if (a.kind === "basic_attack" && b.kind === "basic_attack") {
    return (
      (BASIC_ATTACK_PROFILE_ORDER as readonly string[]).indexOf(a.profile) -
      (BASIC_ATTACK_PROFILE_ORDER as readonly string[]).indexOf(b.profile)
    );
  }
  if (a.kind === "evade" && b.kind === "evade") {
    return (
      (EVADE_DIRECTION_ORDER as readonly string[]).indexOf(a.direction) -
      (EVADE_DIRECTION_ORDER as readonly string[]).indexOf(b.direction)
    );
  }
  return 0;
}

export function sortBattleActionsCanonical(
  actions: readonly (BattleAction | ResolvedBattleAction)[],
): Array<BattleAction | ResolvedBattleAction> {
  return actions.slice().sort(compareBattleActionsCanonical);
}

export function strategyActionKey(action: BattleAction | ResolvedBattleAction): string {
  return toCanonicalJson(action);
}

type OffenseSpec = {
  kind: "use_technique" | "basic_attack";
  action: BattleAction;
  power: number;
  accuracy: number;
  primaryStats: readonly import("../abilities.js").AbilityKey[];
  preferredRanges: readonly BattleRange[];
  usableRanges: readonly BattleRange[];
  masteryDisplay: number;
  domainAptitude: number;
  injuryModifier: number;
  activationDifficulty: number | null;
  mentalCost: number;
  masteryHundredths: number;
  consumptionClassKey: "basicAttack" | "small" | "medium" | "large" | "ultimate";
  category: "unarmed" | "sword" | "magic";
};

function ratioBp(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Number((BigInt(current) * 10000n) / BigInt(max));
}

function predictedRangeAfterAction(range: BattleRange, action: BattleAction): BattleRange {
  if (action.kind === "approach" && canShiftBattleRange(range, "approach_one")) {
    return shiftBattleRange(range, "approach_one");
  }
  if (action.kind === "retreat" && canShiftBattleRange(range, "retreat_one")) {
    return shiftBattleRange(range, "retreat_one");
  }
  if (action.kind === "evade") {
    if (action.direction === "approach_one" && canShiftBattleRange(range, "approach_one")) {
      return shiftBattleRange(range, "approach_one");
    }
    if (action.direction === "retreat_one" && canShiftBattleRange(range, "retreat_one")) {
      return shiftBattleRange(range, "retreat_one");
    }
  }
  return range;
}

function defenseFlagsAfterAction(action: BattleAction): {
  guarding: boolean;
  evading: boolean;
} {
  if (action.kind === "basic_defense") {
    return { guarding: true, evading: false };
  }
  if (action.kind === "evade") {
    return { guarding: false, evading: true };
  }
  return { guarding: false, evading: false };
}

function buildOffenseSpecs(
  actor: BattleParticipantSnapshot,
  range: BattleRange,
  catalog: ReadonlyMap<string, TechniqueDefinition>,
  config: Sprint1Config,
): ValidationResult<OffenseSpec[]> {
  const specs: OffenseSpec[] = [];
  const techniqueIds = actor.techniques
    .map((t) => t.techniqueId)
    .slice()
    .sort(compareUnicodeCodePoints);
  for (const techniqueId of techniqueIds) {
    const definition = catalog.get(techniqueId);
    if (definition === undefined || !definition.usableRanges.includes(range)) {
      continue;
    }
    const conditions = evaluateTechniqueAcquisitionConditions(definition, {
      abilities: actor.stats,
      aptitudes: actor.aptitudes,
      techniqueStates: actor.techniques,
    });
    if (!conditions.ok || !conditions.value.allConditionsMet) {
      continue;
    }
    const techState = actor.techniques.find((t) => t.techniqueId === techniqueId);
    if (techState === undefined) {
      continue;
    }
    const mental = computeEffectiveMentalCost(
      definition.mentalCost,
      techState.masteryHundredths,
      config.battle.mentalCost.maximumMasteryReductionRatio,
    );
    if (!mental.ok || actor.currentMental < mental.value) {
      continue;
    }
    specs.push({
      kind: "use_technique",
      action: { kind: "use_technique", techniqueId },
      power: definition.power,
      accuracy: definition.accuracy,
      primaryStats: definition.primaryStats,
      preferredRanges: definition.preferredRanges,
      usableRanges: definition.usableRanges,
      masteryDisplay: Math.floor(techState.masteryHundredths / 100),
      domainAptitude: actor.aptitudes[definition.category].surfaceValue,
      injuryModifier: definition.injuryModifier,
      activationDifficulty: definition.activationDifficulty,
      mentalCost: definition.mentalCost,
      masteryHundredths: techState.masteryHundredths,
      consumptionClassKey: definition.consumptionClass,
      category: definition.category,
    });
  }
  for (const profile of BASIC_ATTACK_PROFILES) {
    const attackProfile = getBasicAttackProfile(config, profile);
    if (!attackProfile.ok) {
      return attackProfile;
    }
    if (!attackProfile.value.usableRanges.includes(range)) {
      continue;
    }
    specs.push({
      kind: "basic_attack",
      action: { kind: "basic_attack", profile },
      power: attackProfile.value.power,
      accuracy: attackProfile.value.accuracy,
      primaryStats: attackProfile.value.primaryStats,
      preferredRanges: attackProfile.value.preferredRanges,
      usableRanges: attackProfile.value.usableRanges,
      masteryDisplay: attackProfile.value.effectiveMastery,
      domainAptitude: actor.aptitudes[profile].surfaceValue,
      injuryModifier: attackProfile.value.injuryModifier,
      activationDifficulty: null,
      mentalCost: 0,
      masteryHundredths: attackProfile.value.effectiveMastery * 100,
      consumptionClassKey: "basicAttack",
      category: profile,
    });
  }
  return success(specs);
}

function estimateDamageNeutralVariance(rawDamage: number, minimumDamage: number): number {
  const scaled = Number((BigInt(rawDamage) * BigInt(NEUTRAL_VARIANCE_BP)) / 10000n);
  return Math.max(minimumDamage, scaled);
}

function expectedActivationPercent(
  spec: OffenseSpec,
  attacker: BattleParticipantSnapshot,
  config: Sprint1Config,
): ValidationResult<number> {
  if (spec.activationDifficulty === null) {
    return success(100);
  }
  return computeActivationChancePercent({
    activationDifficulty: spec.activationDifficulty,
    spirit: attacker.stats.spirit.surfaceValue,
    masteryDisplay: spec.masteryDisplay,
    domainAptitude: spec.domainAptitude,
    fatigue: attacker.fatigue,
    injury: attacker.injury,
    inBattleConsumption: attacker.inBattleConsumption,
    nextActivationModifier: attacker.nextActivationModifier,
    config: config.battle.activation,
  });
}

function expectedHitPercent(
  spec: OffenseSpec,
  attacker: BattleParticipantSnapshot,
  defender: BattleParticipantSnapshot,
  range: BattleRange,
  defenderEvading: boolean,
  config: Sprint1Config,
): ValidationResult<number> {
  const attackerPf = consumptionPerformanceFactor(
    attacker.inBattleConsumption,
    config.battle.consumption.performanceBands,
  );
  if (!attackerPf.ok) {
    return attackerPf;
  }
  const defenderPf = consumptionPerformanceFactor(
    defender.inBattleConsumption,
    config.battle.consumption.performanceBands,
  );
  if (!defenderPf.ok) {
    return defenderPf;
  }
  return computeHitChancePercent({
    techniqueBaseAccuracy: spec.accuracy,
    attackerSkill: attacker.stats.skill.surfaceValue,
    defenderSpeed: defender.stats.speed.surfaceValue,
    attackerPerformanceFactorBp: attackerPf.value,
    defenderPerformanceFactorBp: defenderPf.value,
    masteryDisplay: spec.masteryDisplay,
    domainAptitude: spec.domainAptitude,
    range,
    preferredRanges: spec.preferredRanges,
    usableRanges: spec.usableRanges,
    attackerCondition: attacker.condition,
    attackerFatigue: attacker.fatigue,
    attackerInjury: attacker.injury,
    nextHitModifier: attacker.nextHitModifier,
    defenderEvading,
    actionOrder: config.battle.actionOrder,
    hit: config.battle.hit,
  });
}

function estimatedDamageForSpec(
  spec: OffenseSpec,
  attacker: BattleParticipantSnapshot,
  defender: BattleParticipantSnapshot,
  guarding: boolean,
  config: Sprint1Config,
): ValidationResult<number> {
  const primary = averagePrimaryStatSurface(attacker.stats, spec.primaryStats);
  if (!primary.ok) {
    return primary;
  }
  const raw = computeRawDamage({
    techniquePower: spec.power,
    primaryStatValue: primary.value,
    domainAptitude: spec.domainAptitude,
    masteryDisplay: spec.masteryDisplay,
    defenderStamina: defender.stats.stamina.surfaceValue,
    defenderSkill: defender.stats.skill.surfaceValue,
    defenderCondition: defender.condition,
    defenderFatigue: defender.fatigue,
    defenderInjury: defender.injury,
    formula: config.battle.damageFormula,
  });
  if (!raw.ok) {
    return raw;
  }
  let damage = estimateDamageNeutralVariance(raw.value, config.battle.damageFormula.minimumDamage);
  if (guarding) {
    const guarded = applyGuardedDamage(damage, spec.consumptionClassKey, config.battle.defense);
    if (!guarded.ok) {
      return guarded;
    }
    damage = guarded.value.guardedDamage;
  }
  return success(damage);
}

function rangeControlForAttack(
  range: BattleRange,
  preferredRanges: readonly BattleRange[],
  usableRanges: readonly BattleRange[],
  rangeControlWeight: number,
): number {
  if (preferredRanges.includes(range)) {
    return rangeControlWeight;
  }
  if (usableRanges.includes(range)) {
    return Number((BigInt(rangeControlWeight) * 5000n) / 10000n);
  }
  return 0;
}

function expectedDamageScoreFromParts(
  successChancePercent: number,
  estimatedDamage: number,
  expectedDamageWeightBp: number,
): ValidationResult<number> {
  // success/100 * damage * (weightBp/10000)
  return floorDivBasisPoints(
    (BigInt(successChancePercent) * BigInt(estimatedDamage) * BigInt(expectedDamageWeightBp)) /
      100n,
  );
}

/**
 * predictedSelfInjuryChance for a candidate stance (12 §23.1).
 * Max over opponent legal offenses × activation × hit × final injury.
 */
export function computePredictedSelfInjuryChance(input: {
  self: BattleParticipantSnapshot;
  opponent: BattleParticipantSnapshot;
  range: BattleRange;
  selfGuarding: boolean;
  selfEvading: boolean;
  catalog: ReadonlyMap<string, TechniqueDefinition>;
  config: Sprint1Config;
}): ValidationResult<number> {
  const offenses = buildOffenseSpecs(input.opponent, input.range, input.catalog, input.config);
  if (!offenses.ok) {
    return offenses;
  }
  let maxChance = 0;
  for (const spec of offenses.value) {
    if (!spec.usableRanges.includes(input.range)) {
      continue;
    }
    const activation = expectedActivationPercent(spec, input.opponent, input.config);
    if (!activation.ok) {
      return activation;
    }
    const hit = expectedHitPercent(
      spec,
      input.opponent,
      input.self,
      input.range,
      input.selfEvading,
      input.config,
    );
    if (!hit.ok) {
      return hit;
    }
    const damage = estimatedDamageForSpec(
      spec,
      input.opponent,
      input.self,
      input.selfGuarding,
      input.config,
    );
    if (!damage.ok) {
      return damage;
    }
    const injuryChance = computeFinalInjuryChancePercent({
      damage: damage.value,
      maxDurability: input.self.maxDurability,
      fatigue: input.self.fatigue,
      existingInjury: input.self.injury,
      stamina: input.self.stats.stamina.surfaceValue,
      injuryProneness: input.self.injuryProneness,
      techniqueInjuryModifier: spec.injuryModifier,
      guarding: input.selfGuarding,
      inBattleConsumption: input.self.inBattleConsumption,
      injury: input.config.battle.injury,
      highBandInjuryMultiplierBp: input.config.battle.consumption.highBandInjuryMultiplier,
    });
    if (!injuryChance.ok) {
      return injuryChance;
    }
    // finalInjury × activationRate × hitRate (percents)
    const weighted = floorDivBasisPoints(
      BigInt(injuryChance.value) * BigInt(activation.value) * BigInt(hit.value),
    );
    if (!weighted.ok) {
      return weighted;
    }
    // activation*hit are percent*percent → divide by 100*100 via two BP floors:
    // floor(injury * act * hit / 10000) already did /10000 once; need /100 more for second percent.
    // injury% * (act/100) * (hit/100) = injury * act * hit / 10000
    // floorDivBasisPoints divides by 10000 once → correct.
    if (weighted.value > maxChance) {
      maxChance = weighted.value;
    }
  }
  return success(maxChance);
}

export function computePredictedMajorInjuryChance(
  predictedSelfInjuryChance: number,
  majorChanceWhenInjuredBp: number,
): ValidationResult<number> {
  return scaleByBasisPointsFloor(predictedSelfInjuryChance, majorChanceWhenInjuredBp);
}

function personalityActionModifier(
  action: BattleAction,
  profile: BattleDecisionProfile,
  strategy: Sprint1Config["battle"]["strategy"],
): ValidationResult<number> {
  const p = strategy.personalityModifiers;
  if (action.kind === "use_technique" || action.kind === "basic_attack") {
    return floorDivBasisPoints(
      BigInt(profile.aggression - 50) * BigInt(p.attackAggressionPerPointFrom50) +
        BigInt(profile.riskTolerance - 50) * BigInt(p.attackRiskTolerancePerPointFrom50),
    );
  }
  if (action.kind === "basic_defense" || action.kind === "evade") {
    return floorDivBasisPoints(
      BigInt(profile.caution - 50) * BigInt(p.defenseCautionPerPointFrom50) -
        BigInt(profile.riskTolerance - 50) * BigInt(p.defenseRiskTolerancePenaltyPerPointFrom50),
    );
  }
  if (action.kind === "focus_mind") {
    return floorDivBasisPoints(BigInt(profile.caution - 50) * BigInt(p.focusCautionPerPointFrom50));
  }
  if (action.kind === "approach" || action.kind === "retreat") {
    return floorDivBasisPoints(
      BigInt(profile.aggression - profile.caution) * BigInt(p.movementAggressionMinusCaution),
    );
  }
  return success(0);
}

function injuryRiskPenalty(
  predictedSelfInjuryChance: number,
  weight: number,
): ValidationResult<number> {
  // chance/100 * weight
  return floorDivBasisPoints(BigInt(predictedSelfInjuryChance) * BigInt(weight) * 100n);
}

export type StrategyScoreBuildInput = {
  actor: BattleParticipantSnapshot;
  opponent: BattleParticipantSnapshot;
  range: BattleRange;
  legalActions: readonly BattleAction[];
  catalog: ReadonlyMap<string, TechniqueDefinition>;
  config: Sprint1Config;
  profile: BattleDecisionProfile;
};

export type StrategyScoreBuildResult = {
  scoreComponents: ReadonlyMap<string, StrategyScoreComponents>;
  /** Baseline (no guard/evade) self-injury used for surrender inclusion / score. */
  predictedSelfInjuryChance: number;
  predictedMajorInjuryChance: number;
};

/**
 * Build per-candidate StrategyScoreComponents for every non-surrender legal action.
 * Missing components are not allowed — caller must fail closed.
 */
export function buildStrategyScoreComponents(
  input: StrategyScoreBuildInput,
): ValidationResult<StrategyScoreBuildResult> {
  const { actor, opponent, range, catalog, config, profile } = input;
  const strategy = config.battle.strategy;

  const baselineSelfInjury = computePredictedSelfInjuryChance({
    self: actor,
    opponent,
    range,
    selfGuarding: false,
    selfEvading: false,
    catalog,
    config,
  });
  if (!baselineSelfInjury.ok) {
    return baselineSelfInjury;
  }
  const baselineMajor = computePredictedMajorInjuryChance(
    baselineSelfInjury.value,
    config.battle.injury.majorChanceWhenInjured,
  );
  if (!baselineMajor.ok) {
    return baselineMajor;
  }

  const map = new Map<string, StrategyScoreComponents>();
  const durabilityRatioBp = ratioBp(actor.currentDurability, actor.maxDurability);
  const mentalRatioBp = ratioBp(actor.currentMental, actor.maxMental);

  // Precompute attack expectedDamageScores at current range for referenceOffense selection.
  const actorOffensesAt = (
    atRange: BattleRange,
  ): ValidationResult<{ spec: OffenseSpec; expectedDamageScore: number }[]> => {
    const specs = buildOffenseSpecs(actor, atRange, catalog, config);
    if (!specs.ok) {
      return specs;
    }
    const scored: { spec: OffenseSpec; expectedDamageScore: number }[] = [];
    for (const spec of specs.value) {
      if (!spec.usableRanges.includes(atRange)) {
        continue;
      }
      const activation = expectedActivationPercent(spec, actor, config);
      if (!activation.ok) {
        return activation;
      }
      const hit = expectedHitPercent(spec, actor, opponent, atRange, false, config);
      if (!hit.ok) {
        return hit;
      }
      const damage = estimatedDamageForSpec(spec, actor, opponent, false, config);
      if (!damage.ok) {
        return damage;
      }
      const successChance =
        spec.kind === "use_technique"
          ? Number((BigInt(activation.value) * BigInt(hit.value)) / 100n)
          : hit.value;
      const eds = expectedDamageScoreFromParts(
        successChance,
        damage.value,
        strategy.expectedDamageWeight,
      );
      if (!eds.ok) {
        return eds;
      }
      scored.push({ spec, expectedDamageScore: eds.value });
    }
    return success(scored);
  };

  const pickReferenceOffense = (atRange: BattleRange): ValidationResult<OffenseSpec | null> => {
    const scored = actorOffensesAt(atRange);
    if (!scored.ok) {
      return scored;
    }
    if (scored.value.length === 0) {
      return success(null);
    }
    let best = scored.value[0]!;
    for (const entry of scored.value.slice(1)) {
      if (entry.expectedDamageScore > best.expectedDamageScore) {
        best = entry;
        continue;
      }
      if (entry.expectedDamageScore < best.expectedDamageScore) {
        continue;
      }
      // Tie: basic_attack profile order, then TechniqueId — no RNG.
      const cmp = compareBattleActionsCanonical(entry.spec.action, best.spec.action);
      if (cmp < 0) {
        best = entry;
      }
    }
    return success(best.spec);
  };

  for (const action of input.legalActions) {
    if (action.kind === "surrender") {
      continue;
    }

    const predictedRange = predictedRangeAfterAction(range, action);
    const flags = defenseFlagsAfterAction(action);
    const selfInjury = computePredictedSelfInjuryChance({
      self: actor,
      opponent,
      range: predictedRange,
      selfGuarding: flags.guarding,
      selfEvading: flags.evading,
      catalog,
      config,
    });
    if (!selfInjury.ok) {
      return selfInjury;
    }
    const injuryPenalty = injuryRiskPenalty(selfInjury.value, strategy.injuryRiskPenaltyWeight);
    if (!injuryPenalty.ok) {
      return injuryPenalty;
    }
    const personality = personalityActionModifier(action, profile, strategy);
    if (!personality.ok) {
      return personality;
    }

    let expectedDamageScore = 0;
    let rangeControlScore = 0;
    let defenseNeedScore = 0;
    let mentalRecoveryNeedScore = 0;
    let mentalCostPenalty = 0;

    if (action.kind === "use_technique" || action.kind === "basic_attack") {
      const specs = buildOffenseSpecs(actor, range, catalog, config);
      if (!specs.ok) {
        return specs;
      }
      const spec = specs.value.find(
        (s) => strategyActionKey(s.action) === strategyActionKey(action),
      );
      if (spec === undefined) {
        return failure([
          {
            path: "/legalActions",
            message: "legal attack candidate missing offense spec",
            actual: action,
          },
        ]);
      }
      const activation = expectedActivationPercent(spec, actor, config);
      if (!activation.ok) {
        return activation;
      }
      const hit = expectedHitPercent(spec, actor, opponent, range, false, config);
      if (!hit.ok) {
        return hit;
      }
      const damage = estimatedDamageForSpec(spec, actor, opponent, false, config);
      if (!damage.ok) {
        return damage;
      }
      const successChance =
        action.kind === "use_technique"
          ? Number((BigInt(activation.value) * BigInt(hit.value)) / 100n)
          : hit.value;
      const eds = expectedDamageScoreFromParts(
        successChance,
        damage.value,
        strategy.expectedDamageWeight,
      );
      if (!eds.ok) {
        return eds;
      }
      expectedDamageScore = eds.value;
      rangeControlScore = rangeControlForAttack(
        range,
        spec.preferredRanges,
        spec.usableRanges,
        strategy.rangeControlWeight,
      );
      if (action.kind === "use_technique") {
        const effective = computeEffectiveMentalCost(
          spec.mentalCost,
          spec.masteryHundredths,
          config.battle.mentalCost.maximumMasteryReductionRatio,
        );
        if (!effective.ok) {
          return effective;
        }
        // mentalCost / max(1,maxMental) * (weightBp/10000)
        const penalty = floorDivBasisPoints(
          (BigInt(effective.value) * BigInt(strategy.mentalCostPenaltyWeight)) /
            BigInt(Math.max(1, actor.maxMental)),
        );
        if (!penalty.ok) {
          return penalty;
        }
        mentalCostPenalty = penalty.value;
      }
    } else {
      const reference = pickReferenceOffense(predictedRange);
      if (!reference.ok) {
        return reference;
      }
      if (reference.value !== null) {
        rangeControlScore = rangeControlForAttack(
          predictedRange,
          reference.value.preferredRanges,
          reference.value.usableRanges,
          strategy.rangeControlWeight,
        );
      }
      if (action.kind === "basic_defense" || action.kind === "evade") {
        const need = floorDivBasisPoints(
          (10000n - BigInt(durabilityRatioBp)) * BigInt(strategy.defenseNeedWeight),
        );
        if (!need.ok) {
          return need;
        }
        defenseNeedScore = need.value;
      }
      if (action.kind === "focus_mind") {
        const need = floorDivBasisPoints(
          (10000n - BigInt(mentalRatioBp)) * BigInt(strategy.mentalRecoveryNeedWeight),
        );
        if (!need.ok) {
          return need;
        }
        mentalRecoveryNeedScore = need.value;
      }
    }

    map.set(strategyActionKey(action), {
      expectedDamageScore,
      rangeControlScore,
      defenseNeedScore,
      mentalRecoveryNeedScore,
      mentalCostPenalty,
      injuryRiskPenalty: injuryPenalty.value,
      personalityActionModifier: personality.value,
    });
  }

  return success({
    scoreComponents: map,
    predictedSelfInjuryChance: baselineSelfInjury.value,
    predictedMajorInjuryChance: baselineMajor.value,
  });
}
