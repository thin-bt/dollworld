/**
 * Turn-end passive / advantage / focus apply (12 §15 / S01-006).
 */
import type { BattleSide } from "./battle-enums.js";
import type { BattleActionLog } from "./battle-turn-logs.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import type { BattleRange } from "./types.js";
import type { ResolvedBattleAction } from "./battle-action.js";

export type TurnDamageTotals = {
  sideADamageDealt: number;
  sideBDamageDealt: number;
  sideASuccessfulHits: number;
  sideBSuccessfulHits: number;
  sideAPreferredAttack: boolean;
  sideBPreferredAttack: boolean;
};

export function accumulateTurnDamageTotals(
  actionLogs: readonly BattleActionLog[],
): TurnDamageTotals {
  const totals: TurnDamageTotals = {
    sideADamageDealt: 0,
    sideBDamageDealt: 0,
    sideASuccessfulHits: 0,
    sideBSuccessfulHits: 0,
    sideAPreferredAttack: false,
    sideBPreferredAttack: false,
  };
  for (const log of actionLogs) {
    const damage = log.damage ?? 0;
    if (log.actorSide === "sideA") {
      totals.sideADamageDealt += damage;
      if (log.hit === true) {
        totals.sideASuccessfulHits += 1;
      }
    } else {
      totals.sideBDamageDealt += damage;
      if (log.hit === true) {
        totals.sideBSuccessfulHits += 1;
      }
    }
  }
  return totals;
}

export function isPassiveResolvedAction(
  resolved: ResolvedBattleAction,
  replacementReason: string | null,
  damageDealt: number,
): boolean {
  if (damageDealt > 0) {
    return false;
  }
  if (replacementReason === "opponent_ended_battle") {
    return false;
  }
  return (
    resolved.kind === "basic_defense" ||
    resolved.kind === "evade" ||
    resolved.kind === "retreat" ||
    resolved.kind === "focus_mind" ||
    resolved.kind === "no_action"
  );
}

export function selectAdvantageSide(totals: TurnDamageTotals): BattleSide | null {
  if (totals.sideADamageDealt !== totals.sideBDamageDealt) {
    return totals.sideADamageDealt > totals.sideBDamageDealt ? "sideA" : "sideB";
  }
  if (totals.sideASuccessfulHits !== totals.sideBSuccessfulHits) {
    return totals.sideASuccessfulHits > totals.sideBSuccessfulHits ? "sideA" : "sideB";
  }
  if (totals.sideAPreferredAttack !== totals.sideBPreferredAttack) {
    return totals.sideAPreferredAttack ? "sideA" : "sideB";
  }
  return null;
}

export function markPreferredAttack(
  totals: TurnDamageTotals,
  side: BattleSide,
  resolved: ResolvedBattleAction,
  range: BattleRange,
  preferredRanges: readonly BattleRange[] | null,
): void {
  if (
    (resolved.kind === "use_technique" || resolved.kind === "basic_attack") &&
    preferredRanges !== null &&
    preferredRanges.includes(range)
  ) {
    if (side === "sideA") {
      totals.sideAPreferredAttack = true;
    } else {
      totals.sideBPreferredAttack = true;
    }
  }
}

export function applyAdvantageTurnCount(
  participant: BattleParticipantSnapshot,
  awarded: boolean,
): BattleParticipantSnapshot {
  if (!awarded) {
    return participant;
  }
  return {
    ...participant,
    advantageTurnCount: participant.advantageTurnCount + 1,
  };
}
