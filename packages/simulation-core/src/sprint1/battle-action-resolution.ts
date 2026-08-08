/**
 * Shared single-action battle resolution (12 / S01-006).
 * Used by resolveBattleTurn and DetailedLog semantic replay.
 * Does not call resolveBattleTurn.
 */
import type { SeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleAction, ResolvedBattleAction } from "./battle-action.js";
import type { Priority } from "./battle-action-order.js";
import {
  applyConsumptionDelta,
  baseConsumptionForResolvedAction,
  consumptionPerformanceFactor,
} from "./battle-consumption.js";
import { computeEffectiveMentalCost } from "./battle-mental-cost.js";
import { computeActivationChancePercent, rollActivation } from "./battle-activation.js";
import { computeHitChancePercent, rollHit } from "./battle-hit.js";
import {
  averagePrimaryStatSurface,
  computeRawDamage,
  rollDamageWithVariance,
} from "./battle-damage.js";
import {
  applyGuardedDamage,
  rangeShiftBlockChance,
  rollRangeShiftBlock,
} from "./battle-defense.js";
import { computeMovementScores, rollMovement } from "./battle-movement.js";
import { computeMovementChance } from "./movement-chance.js";
import { computeFocusBaseRecovery } from "./battle-focus-mind.js";
import { applyInjuryDelta, computeFinalInjuryChancePercent, rollInjury } from "./battle-injury.js";
import { isPassiveResolvedAction } from "./battle-turn-aggregate.js";
import { canShiftBattleRange, shiftBattleRange } from "./battle-turn-math.js";
import { createEmptyBattleActionLogShell } from "./battle-turn-logs.js";
import type { BattleActionLog } from "./battle-turn-logs.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import type { BattleRange } from "./types.js";
import type { BattleSide } from "./battle-enums.js";
import { getBasicAttackProfile } from "./technique-basic-attack.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
export type MutableParticipant = {
  -readonly [K in keyof BattleParticipantSnapshot]: BattleParticipantSnapshot[K];
} & {
  techniques: Array<BattleParticipantSnapshot["techniques"][number]>;
};

export type WorkingState = {
  range: BattleRange;
  participantA: MutableParticipant;
  participantB: MutableParticipant;
  actionSequence: number;
  turnNumber: number;
};

export function mutableParticipant(p: BattleParticipantSnapshot): MutableParticipant {
  return {
    ...cloneValidatedPlainJson(p),
    techniques: p.techniques.map((t) => ({ ...t })),
  } as MutableParticipant;
}

export function participantOf(state: WorkingState, side: BattleSide): MutableParticipant {
  return side === "sideA" ? state.participantA : state.participantB;
}

export function opponentOf(state: WorkingState, side: BattleSide): MutableParticipant {
  return side === "sideA" ? state.participantB : state.participantA;
}

export function speedModifierFor(
  resolved: ResolvedBattleAction,
  catalog: ReadonlyMap<string, TechniqueDefinition>,
  config: RunRuleSnapshot["sprint1Config"],
): number {
  if (resolved.kind === "use_technique") {
    return catalog.get(resolved.techniqueId)?.speedModifier ?? 0;
  }
  if (resolved.kind === "basic_attack") {
    return config.techniqueBalance.basicAttackProfiles[resolved.profile].speedModifier;
  }
  return 0;
}

export function techniqueFor(
  resolved: ResolvedBattleAction,
  catalog: ReadonlyMap<string, TechniqueDefinition>,
): TechniqueDefinition | null {
  if (resolved.kind !== "use_technique") {
    return null;
  }
  return catalog.get(resolved.techniqueId) ?? null;
}

export type StrategyMeta = {
  strategySeed: number | null;
  strategyCandidateScores: BattleActionLog["strategyCandidateScores"];
  strategyTieBreakUsed: boolean | null;
};

export type ActionResolveContext = {
  working: WorkingState;
  rng: SeededRng;
  snapshot: RunRuleSnapshot;
  catalog: ReadonlyMap<string, TechniqueDefinition>;
  turnNumber: number;
  opponentResolvedAction: ResolvedBattleAction | null;
  focusReservations: Map<BattleSide, number>;
  damageReceivedThisTurn: Map<BattleSide, number>;
  evadeDirections: Map<BattleSide, string>;
};

export function resolveOneAction(
  side: BattleSide,
  requested: BattleAction,
  resolvedBundle: {
    resolvedAction: ResolvedBattleAction;
    replacementReason: import("./battle-action.js").BattleActionReplacementReason | null;
    invalidActionCountDelta: 0 | 1;
  },
  priority: Priority,
  actionOrderScore: number | null,
  meta: StrategyMeta,
  ctx: ActionResolveContext,
): ValidationResult<BattleActionLog> {
  const actor = participantOf(ctx.working, side);
  const target = opponentOf(ctx.working, side);
  const rngBefore = ctx.rng.exportState();
  const rangeBefore = ctx.working.range;
  const actorDurabilityBefore = actor.currentDurability;
  const actorMentalBefore = actor.currentMental;
  const targetDurabilityBefore = target.currentDurability;
  const targetMentalBefore = target.currentMental;
  const guardingBefore = actor.guarding;
  const evadingBefore = actor.evading;
  const consumptionBefore = actor.inBattleConsumption;
  const nextHitBefore = actor.nextHitModifier;
  const nextActBefore = actor.nextActivationModifier;

  const log = createEmptyBattleActionLogShell({
    actionSequence: ctx.working.actionSequence,
    turnNumber: ctx.turnNumber,
    actorSide: side,
    actorPersonId: actor.personId,
    requestedAction: requested,
    resolvedAction: resolvedBundle.resolvedAction,
    replacementReason: resolvedBundle.replacementReason,
    rangeBefore,
    rangeAfter: rangeBefore,
    actorDurabilityBefore,
    actorDurabilityAfter: actorDurabilityBefore,
    actorMentalBefore,
    actorMentalAfter: actorMentalBefore,
    guardingBefore,
    guardingAfter: guardingBefore,
    evadingBefore,
    evadingAfter: evadingBefore,
    inBattleConsumptionBefore: consumptionBefore,
    inBattleConsumptionDelta: 0,
    inBattleConsumptionAfter: consumptionBefore,
    passiveActionCountDelta: 0,
    invalidActionCountDelta: resolvedBundle.invalidActionCountDelta,
    nextHitModifierBefore: nextHitBefore,
    nextHitModifierAfter: nextHitBefore,
    nextActivationModifierBefore: nextActBefore,
    nextActivationModifierAfter: nextActBefore,
    surrenderedAfter: actor.surrendered,
    unableToContinueAfter: actor.unableToContinue,
    canActAfter: actor.canAct,
    rngStateBefore: rngBefore,
    rngStateAfter: rngBefore,
  }) as BattleActionLog;

  // Mutable draft of log fields
  const draft: Record<string, unknown> = { ...log };
  draft["priority"] = priority;
  draft["actionOrderScore"] = actionOrderScore;
  draft["strategySeed"] = meta.strategySeed;
  draft["strategyCandidateScores"] = meta.strategyCandidateScores;
  draft["strategyTieBreakUsed"] = meta.strategyTieBreakUsed;

  const resolved = resolvedBundle.resolvedAction;
  const battle = ctx.snapshot.sprint1Config.battle;

  // Cancelled second action: no effects / RNG / consumption
  if (resolvedBundle.replacementReason === "opponent_ended_battle") {
    draft["rngStateAfter"] = ctx.rng.exportState();
    ctx.working.actionSequence += 1;
    actor.invalidActionCount += resolvedBundle.invalidActionCountDelta;
    return success(deepFreezePlainJson(draft) as BattleActionLog);
  }

  if (resolved.kind === "surrender") {
    actor.surrendered = true;
    actor.canAct = false;
    draft["surrenderedAfter"] = true;
    draft["canActAfter"] = false;
  } else if (resolved.kind === "basic_defense") {
    actor.guarding = true;
    draft["guardingAfter"] = true;
  } else if (resolved.kind === "evade") {
    actor.evading = true;
    draft["evadingAfter"] = true;
    draft["evadeDirection"] = resolved.direction;
  } else if (resolved.kind === "focus_mind") {
    const base = computeFocusBaseRecovery(actor.maxMental, battle.focusMind);
    if (!base.ok) {
      return base;
    }
    draft["focusBaseRecovery"] = base.value;
    ctx.focusReservations.set(side, base.value);
  } else if (resolved.kind === "approach" || resolved.kind === "retreat") {
    const moverPf = consumptionPerformanceFactor(
      actor.inBattleConsumption,
      battle.consumption.performanceBands,
    );
    if (!moverPf.ok) {
      return moverPf;
    }
    const oppPf = consumptionPerformanceFactor(
      target.inBattleConsumption,
      battle.consumption.performanceBands,
    );
    if (!oppPf.ok) {
      return oppPf;
    }
    let opponentPreferred: readonly BattleRange[] | null = null;
    if (ctx.opponentResolvedAction?.kind === "basic_attack") {
      opponentPreferred =
        ctx.snapshot.sprint1Config.techniqueBalance.basicAttackProfiles[
          ctx.opponentResolvedAction.profile
        ].preferredRanges;
    } else if (ctx.opponentResolvedAction?.kind === "use_technique") {
      opponentPreferred =
        ctx.catalog.get(ctx.opponentResolvedAction.techniqueId)?.preferredRanges ?? null;
    }
    const scores = computeMovementScores({
      moverSpeed: actor.stats.speed.surfaceValue,
      moverSkill: actor.stats.skill.surfaceValue,
      moverPerformanceFactorBp: moverPf.value,
      moverState: {
        condition: actor.condition,
        fatigue: actor.fatigue,
        injury: actor.injury,
      },
      opponentSpeed: target.stats.speed.surfaceValue,
      opponentSkill: target.stats.skill.surfaceValue,
      opponentPerformanceFactorBp: oppPf.value,
      opponentState: {
        condition: target.condition,
        fatigue: target.fatigue,
        injury: target.injury,
      },
      movementKind: resolved.kind,
      opponentResolvedAction: ctx.opponentResolvedAction,
      currentRange: ctx.working.range,
      opponentAttackPreferredRanges: opponentPreferred,
      opponentGuarding: target.guarding,
      actionOrder: battle.actionOrder,
      movement: battle.movement,
    });
    if (!scores.ok) {
      return scores;
    }
    const chance = computeMovementChance({
      moverBaseScore: scores.value.moverBase,
      opponentBaseScore: scores.value.opponentBase,
      randomMinimum: battle.movement.randomMinimum,
      randomMaximum: battle.movement.randomMaximum,
    });
    if (!chance.ok) {
      return chance;
    }
    // Chance is pre-roll display only (RNG 0). Judgment stays comparative on movementRoll.
    draft["movementChance"] = chance.value;
    const move = rollMovement(
      ctx.rng,
      scores.value.moverBase,
      scores.value.opponentBase,
      battle.movement,
    );
    draft["movementRoll"] = move.roll;
    if (move.succeeded) {
      const direction = resolved.kind === "approach" ? "approach_one" : "retreat_one";
      if (canShiftBattleRange(ctx.working.range, direction)) {
        ctx.working.range = shiftBattleRange(ctx.working.range, direction);
      }
    }
  } else if (resolved.kind === "use_technique" || resolved.kind === "basic_attack") {
    const attackResult = resolveAttackAction(side, resolved, draft, ctx);
    if (!attackResult.ok) {
      return attackResult;
    }
  }

  // Consumption after effects
  const tech = techniqueFor(resolved, ctx.catalog);
  const consumption = baseConsumptionForResolvedAction(
    resolved,
    priority,
    tech?.consumptionClass ?? null,
    battle.consumption,
  );
  const applied = applyConsumptionDelta(actor.inBattleConsumption, consumption.total);
  actor.inBattleConsumption = applied.after;
  draft["inBattleConsumptionDelta"] = applied.appliedDelta;
  draft["inBattleConsumptionAfter"] = applied.after;

  if (resolvedBundle.invalidActionCountDelta === 1) {
    actor.invalidActionCount += 1;
  }

  const damageDealt = typeof draft["damage"] === "number" ? (draft["damage"] as number) : 0;
  if (isPassiveResolvedAction(resolved, resolvedBundle.replacementReason, damageDealt)) {
    actor.passiveActionCount += 1;
    draft["passiveActionCountDelta"] = 1;
  }

  draft["rangeAfter"] = ctx.working.range;
  draft["actorDurabilityAfter"] = actor.currentDurability;
  draft["actorMentalAfter"] = actor.currentMental;
  draft["targetDurabilityAfter"] = target.currentDurability;
  draft["targetMentalAfter"] = target.currentMental;
  draft["targetDurabilityBefore"] = targetDurabilityBefore;
  draft["targetMentalBefore"] = targetMentalBefore;
  draft["guardingAfter"] = actor.guarding;
  draft["evadingAfter"] = actor.evading;
  draft["nextHitModifierAfter"] = actor.nextHitModifier;
  draft["nextActivationModifierAfter"] = actor.nextActivationModifier;
  draft["surrenderedAfter"] = actor.surrendered;
  draft["unableToContinueAfter"] = actor.unableToContinue;
  draft["canActAfter"] = actor.canAct;
  draft["rngStateAfter"] = ctx.rng.exportState();

  ctx.working.actionSequence += 1;
  return success(deepFreezePlainJson(draft) as BattleActionLog);
}

function resolveAttackAction(
  side: BattleSide,
  resolved: Extract<ResolvedBattleAction, { kind: "use_technique" | "basic_attack" }>,
  draft: Record<string, unknown>,
  ctx: ActionResolveContext,
): ValidationResult<true> {
  const actor = participantOf(ctx.working, side);
  const target = opponentOf(ctx.working, side);
  const battle = ctx.snapshot.sprint1Config.battle;
  const config = ctx.snapshot.sprint1Config;

  let power: number;
  let accuracy: number;
  let primaryStats: readonly import("../abilities.js").AbilityKey[];
  let preferredRanges: readonly BattleRange[];
  let usableRanges: readonly BattleRange[];
  let masteryDisplay: number;
  let domainAptitude: number;
  let injuryModifier: number;
  let rangeShift: "none" | "approach_one" | "retreat_one";
  let consumptionClassKey: "basicAttack" | "small" | "medium" | "large" | "ultimate" =
    "basicAttack";
  let category: "unarmed" | "sword" | "magic";
  let pendingNextHitCaptured = 0;

  if (resolved.kind === "basic_attack") {
    const profile = getBasicAttackProfile(config, resolved.profile);
    if (!profile.ok) {
      return profile;
    }
    power = profile.value.power;
    accuracy = profile.value.accuracy;
    primaryStats = profile.value.primaryStats;
    preferredRanges = profile.value.preferredRanges;
    usableRanges = profile.value.usableRanges;
    masteryDisplay = profile.value.effectiveMastery;
    category = resolved.profile;
    domainAptitude = actor.aptitudes[category].surfaceValue;
    rangeShift = profile.value.rangeShiftAfterUse;
    injuryModifier = profile.value.injuryModifier;
  } else {
    const definition = ctx.catalog.get(resolved.techniqueId);
    if (definition === undefined) {
      return failure([
        {
          path: "/techniqueId",
          message: "technique missing from catalog after replacement",
          actual: resolved.techniqueId,
        },
      ]);
    }
    const techState = actor.techniques.find((t) => t.techniqueId === resolved.techniqueId);
    if (techState === undefined) {
      return failure([
        {
          path: "/techniques",
          message: "technique state missing after replacement",
        },
      ]);
    }
    power = definition.power;
    accuracy = definition.accuracy;
    primaryStats = definition.primaryStats;
    preferredRanges = definition.preferredRanges;
    usableRanges = definition.usableRanges;
    const masteryHundredths = techState.masteryHundredths;
    masteryDisplay = Math.floor(masteryHundredths / 100);
    category = definition.category;
    domainAptitude = actor.aptitudes[category].surfaceValue;
    const mentalCost = definition.mentalCost;
    const activationDifficulty = definition.activationDifficulty;
    injuryModifier = definition.injuryModifier;
    rangeShift = definition.rangeShiftAfterUse;
    consumptionClassKey = definition.consumptionClass;

    // Capture pending modifiers at technique attempt start (before any consume).
    const pendingNextHitModifier = actor.nextHitModifier;
    const pendingNextActivationModifier = actor.nextActivationModifier;
    // This attack attempt consumes both modifiers on BattleState.
    actor.nextHitModifier = 0;
    actor.nextActivationModifier = 0;

    // attemptedUseCount before mental consume
    if (!Number.isSafeInteger(techState.attemptedUseCount + 1)) {
      return failure([
        {
          path: "/attemptedUseCount",
          message: "attemptedUseCount overflow",
        },
      ]);
    }
    techState.attemptedUseCount += 1;

    const effective = computeEffectiveMentalCost(
      mentalCost,
      masteryHundredths,
      battle.mentalCost.maximumMasteryReductionRatio,
    );
    if (!effective.ok) {
      return effective;
    }
    actor.currentMental = Math.max(0, actor.currentMental - effective.value);

    const activationChance = computeActivationChancePercent({
      activationDifficulty,
      spirit: actor.stats.spirit.surfaceValue,
      masteryDisplay,
      domainAptitude,
      fatigue: actor.fatigue,
      injury: actor.injury,
      inBattleConsumption: actor.inBattleConsumption,
      nextActivationModifier: pendingNextActivationModifier,
      config: battle.activation,
    });
    if (!activationChance.ok) {
      return activationChance;
    }
    const activation = rollActivation(ctx.rng, activationChance.value);
    draft["activationChance"] = activationChance.value;
    draft["activationRoll"] = activation.roll;
    draft["activationSucceeded"] = activation.succeeded;
    if (!activation.succeeded) {
      draft["activationFailureReason"] = "activation_roll_failed";
      // pendingNextHitModifier unused (no hit path); both already consumed to 0.
      return success(true);
    }
    if (!Number.isSafeInteger(techState.successfulUseCount + 1)) {
      return failure([
        {
          path: "/successfulUseCount",
          message: "successfulUseCount overflow",
        },
      ]);
    }
    techState.successfulUseCount += 1;

    pendingNextHitCaptured = pendingNextHitModifier;
  }

  const pendingNextHit =
    resolved.kind === "use_technique" ? pendingNextHitCaptured : actor.nextHitModifier;

  if (resolved.kind === "basic_attack") {
    // basic_attack: apply nextHit to this attempt; discard nextActivation unused.
    actor.nextHitModifier = 0;
    actor.nextActivationModifier = 0;
  }

  const attackerPf = consumptionPerformanceFactor(
    actor.inBattleConsumption,
    battle.consumption.performanceBands,
  );
  if (!attackerPf.ok) {
    return attackerPf;
  }
  const defenderPf = consumptionPerformanceFactor(
    target.inBattleConsumption,
    battle.consumption.performanceBands,
  );
  if (!defenderPf.ok) {
    return defenderPf;
  }

  const hitInput = {
    techniqueBaseAccuracy: accuracy,
    attackerSkill: actor.stats.skill.surfaceValue,
    defenderSpeed: target.stats.speed.surfaceValue,
    attackerPerformanceFactorBp: attackerPf.value,
    defenderPerformanceFactorBp: defenderPf.value,
    masteryDisplay,
    domainAptitude,
    range: ctx.working.range,
    preferredRanges,
    usableRanges,
    attackerCondition: actor.condition,
    attackerFatigue: actor.fatigue,
    attackerInjury: actor.injury,
    nextHitModifier: pendingNextHit,
    defenderEvading: target.evading,
    actionOrder: battle.actionOrder,
    hit: battle.hit,
  };

  const hitChance = computeHitChancePercent(hitInput);
  if (!hitChance.ok) {
    return hitChance;
  }
  const withoutEvade = computeHitChancePercent({ ...hitInput, defenderEvading: false });
  if (!withoutEvade.ok) {
    return withoutEvade;
  }
  const hitRoll = rollHit(ctx.rng, hitChance.value);
  draft["hitChance"] = hitChance.value;
  draft["hitRoll"] = hitRoll.roll;
  draft["hit"] = hitRoll.hit;
  actor.attemptedHits += 1;

  if (target.evading && withoutEvade.value >= hitRoll.roll && !hitRoll.hit) {
    target.successfulEvasions += 1;
    const evadeDir = ctx.evadeDirections.get(side === "sideA" ? "sideB" : "sideA");
    if (evadeDir === "approach_one" || evadeDir === "retreat_one") {
      if (canShiftBattleRange(ctx.working.range, evadeDir)) {
        ctx.working.range = shiftBattleRange(ctx.working.range, evadeDir);
      }
    }
  }

  if (!hitRoll.hit) {
    return success(true);
  }

  actor.successfulHits += 1;
  const primary = averagePrimaryStatSurface(actor.stats, primaryStats);
  if (!primary.ok) {
    return primary;
  }
  const raw = computeRawDamage({
    techniquePower: power,
    primaryStatValue: primary.value,
    domainAptitude,
    masteryDisplay,
    defenderStamina: target.stats.stamina.surfaceValue,
    defenderSkill: target.stats.skill.surfaceValue,
    defenderCondition: target.condition,
    defenderFatigue: target.fatigue,
    defenderInjury: target.injury,
    formula: battle.damageFormula,
  });
  if (!raw.ok) {
    return raw;
  }
  const damaged = rollDamageWithVariance(ctx.rng, raw.value, battle.damageFormula);
  if (!damaged.ok) {
    return damaged;
  }
  let finalDamage = damaged.value.damage;
  draft["damageVariance"] = damaged.value.varianceBp;
  let defenseReduced = 0;
  if (target.guarding) {
    const guarded = applyGuardedDamage(finalDamage, consumptionClassKey, battle.defense);
    if (!guarded.ok) {
      return guarded;
    }
    defenseReduced = guarded.value.reducedBy;
    finalDamage = guarded.value.guardedDamage;
  }
  draft["damage"] = finalDamage;
  target.currentDurability = Math.max(0, target.currentDurability - finalDamage);
  actor.damageDealt += finalDamage;
  target.damageReceived += finalDamage;
  ctx.damageReceivedThisTurn.set(
    side === "sideA" ? "sideB" : "sideA",
    (ctx.damageReceivedThisTurn.get(side === "sideA" ? "sideB" : "sideA") ?? 0) + finalDamage,
  );

  // S1-SPEC-0.1.16 §10.3: injury → major injury → rangeShiftAfterUse → guard block
  const injuryChance = computeFinalInjuryChancePercent({
    damage: finalDamage,
    maxDurability: target.maxDurability,
    fatigue: target.fatigue,
    existingInjury: target.injury,
    stamina: target.stats.stamina.surfaceValue,
    injuryProneness: target.injuryProneness,
    techniqueInjuryModifier: injuryModifier,
    guarding: target.guarding,
    inBattleConsumption: target.inBattleConsumption,
    injury: battle.injury,
    highBandInjuryMultiplierBp: battle.consumption.highBandInjuryMultiplier,
  });
  if (!injuryChance.ok) {
    return injuryChance;
  }
  draft["injuryChance"] = injuryChance.value;
  const injury = rollInjury(ctx.rng, injuryChance.value, battle.injury);
  draft["injuryRoll"] = injury.injuryRoll;
  draft["majorInjuryChance"] = injury.majorInjuryChance;
  draft["majorInjuryRoll"] = injury.majorInjuryRoll;
  draft["injuryResult"] = injury.result;
  if (injury.injuryDelta > 0) {
    const applied = applyInjuryDelta(
      target.injury,
      injury.injuryDelta,
      battle.injury.unableToContinueThreshold,
      target.currentDurability,
    );
    target.injury = applied.injuryAfter;
    if (applied.unableToContinue) {
      target.unableToContinue = true;
      target.canAct = false;
    }
  }

  let rangeShiftBlocked = false;
  if (rangeShift !== "none") {
    if (target.guarding) {
      const blockChance = rangeShiftBlockChance(consumptionClassKey, battle.defense);
      if (!blockChance.ok) {
        return blockChance;
      }
      const block = rollRangeShiftBlock(ctx.rng, blockChance.value);
      draft["rangeShiftBlockChance"] = blockChance.value;
      draft["rangeShiftBlockRoll"] = block.roll;
      rangeShiftBlocked = block.blocked;
    }
    if (!rangeShiftBlocked) {
      ctx.working.range = shiftBattleRange(ctx.working.range, rangeShift);
      draft["rangeShiftApplied"] = true;
    } else {
      draft["rangeShiftApplied"] = false;
    }
  } else {
    draft["rangeShiftApplied"] = false;
  }

  if (target.guarding && (defenseReduced >= 1 || rangeShiftBlocked)) {
    target.successfulDefenses += 1;
  }

  return success(true);
}
