/**
 * Legal action enumeration for DefaultBattleStrategy (12 §23.1 / S01-006).
 */
import { computeSurrenderScore, includeSurrenderCandidate } from "./battle-surrender.js";
import { BASIC_ATTACK_PROFILES } from "./battle-action.js";
import type { BattleAction } from "./battle-action.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import { computeEffectiveMentalCost } from "./battle-mental-cost.js";
import { canShiftBattleRange } from "./battle-turn-math.js";
import { evaluateTechniqueAcquisitionConditions } from "./technique-acquisition.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { BattleRange, Sprint1Config } from "./types.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";

export type LegalActionsContext = {
  actor: BattleParticipantSnapshot;
  opponent: BattleParticipantSnapshot;
  range: BattleRange;
  catalogById: ReadonlyMap<string, TechniqueDefinition>;
  config: Sprint1Config;
  predictedMajorInjuryChance: number;
};

function ratioBp(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Number((BigInt(current) * 10000n) / BigInt(max));
}

/**
 * Canonical legal candidate set for DefaultBattleStrategy.
 * Empty set is an invariant violation (caller must fail) — never silently pad.
 */
export function enumerateLegalBattleActions(context: LegalActionsContext): BattleAction[] {
  const { actor, opponent, range, catalogById, config } = context;
  if (!actor.canAct) {
    return [{ kind: "basic_defense" }]; // Strategy short-circuits to no_action before scoring;
  }

  const actions: BattleAction[] = [];

  const techniqueIds = actor.techniques
    .map((t) => t.techniqueId)
    .slice()
    .sort(compareUnicodeCodePoints);
  for (const techniqueId of techniqueIds) {
    const definition = catalogById.get(techniqueId);
    if (definition === undefined) {
      continue;
    }
    if (!definition.usableRanges.includes(range)) {
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
    actions.push({ kind: "use_technique", techniqueId });
  }

  for (const profile of BASIC_ATTACK_PROFILES) {
    const attackProfile = config.techniqueBalance.basicAttackProfiles[profile];
    if (attackProfile.usableRanges.includes(range)) {
      actions.push({ kind: "basic_attack", profile });
    }
  }

  actions.push({ kind: "basic_defense" });
  actions.push({ kind: "evade", direction: "hold" });
  if (canShiftBattleRange(range, "approach_one")) {
    actions.push({ kind: "evade", direction: "approach_one" });
  }
  if (canShiftBattleRange(range, "retreat_one")) {
    actions.push({ kind: "evade", direction: "retreat_one" });
  }
  if (canShiftBattleRange(range, "approach_one")) {
    actions.push({ kind: "approach" });
  }
  if (canShiftBattleRange(range, "retreat_one")) {
    actions.push({ kind: "retreat" });
  }
  if (actor.currentMental < actor.maxMental) {
    actions.push({ kind: "focus_mind" });
  }

  const durabilityRatioBp = ratioBp(actor.currentDurability, actor.maxDurability);
  const mentalRatioBp = ratioBp(actor.currentMental, actor.maxMental);
  const opponentDurabilityRatioBp = ratioBp(opponent.currentDurability, opponent.maxDurability);
  const opponentLeadBp = Math.max(0, opponentDurabilityRatioBp - durabilityRatioBp);
  const surrender = computeSurrenderScore({
    durabilityRatioBp,
    mentalRatioBp,
    injury: actor.injury,
    inBattleConsumption: actor.inBattleConsumption,
    opponentDurabilityLeadBp: opponentLeadBp,
    confidence: actor.confidence,
    predictedMajorInjuryChance: context.predictedMajorInjuryChance,
    profile: actor.battleDecisionProfile,
    strategy: config.battle.strategy,
  });
  if (
    surrender.ok &&
    includeSurrenderCandidate(surrender.value, config.battle.strategy.surrenderCandidateThreshold)
  ) {
    actions.push({ kind: "surrender" });
  }

  return actions;
}
