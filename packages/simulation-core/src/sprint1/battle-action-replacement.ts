/**
 * Illegal action replacement (12 §7 / S01-006).
 */
import type { TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  invalidActionCountDeltaForReplacementReason,
  validateBattleAction,
} from "./battle-action.js";
import type {
  BattleAction,
  BattleActionReplacementReason,
  ResolvedBattleAction,
} from "./battle-action.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import { computeEffectiveMentalCost } from "./battle-mental-cost.js";
import {
  absoluteRangeDistance,
  canShiftBattleRange,
  shiftBattleRange,
} from "./battle-turn-math.js";
import { evaluateTechniqueAcquisitionConditions } from "./technique-acquisition.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { BattleRange } from "./types.js";
import type { BasisPoints } from "./basis-points.js";

export type ActionReplacementResult = {
  requestedAction: BattleAction;
  resolvedAction: ResolvedBattleAction;
  replacementReason: BattleActionReplacementReason | null;
  invalidActionCountDelta: 0 | 1;
};

export type ReplacementContext = {
  actor: BattleParticipantSnapshot;
  range: BattleRange;
  catalogById: ReadonlyMap<string, TechniqueDefinition>;
  maximumMasteryReductionRatioBp: BasisPoints;
};

function nearestUsableRangeMove(
  current: BattleRange,
  usableRanges: readonly BattleRange[],
  preferredRanges: readonly BattleRange[],
): ResolvedBattleAction {
  if (usableRanges.length === 0) {
    return { kind: "basic_defense" };
  }
  let best: BattleRange | null = null;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  for (const candidate of usableRanges) {
    const distance = absoluteRangeDistance(current, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
      continue;
    }
    if (distance === bestDistance && best !== null) {
      const preferredBest = preferredRanges.includes(best);
      const preferredCandidate = preferredRanges.includes(candidate);
      if (preferredCandidate && !preferredBest) {
        best = candidate;
        continue;
      }
      if (preferredCandidate === preferredBest) {
        // fixed order contact < close < middle < long
        if (
          absoluteRangeDistance(candidate, "contact") < absoluteRangeDistance(best, "contact") ||
          (candidate !== best &&
            ["contact", "close", "middle", "long"].indexOf(candidate) <
              ["contact", "close", "middle", "long"].indexOf(best))
        ) {
          // Prefer lower index in BATTLE_RANGES when still tied on preferred.
          const order = ["contact", "close", "middle", "long"] as const;
          if (order.indexOf(candidate) < order.indexOf(best)) {
            best = candidate;
          }
        }
      }
    }
  }
  if (best === null || best === current) {
    return { kind: "basic_defense" };
  }
  const order = ["contact", "close", "middle", "long"] as const;
  if (order.indexOf(best) < order.indexOf(current)) {
    if (canShiftBattleRange(current, "approach_one")) {
      return { kind: "approach" };
    }
    return { kind: "basic_defense" };
  }
  if (canShiftBattleRange(current, "retreat_one")) {
    return { kind: "retreat" };
  }
  return { kind: "basic_defense" };
}

function replace(
  requested: BattleAction,
  resolved: ResolvedBattleAction,
  reason: BattleActionReplacementReason | null,
): ActionReplacementResult {
  return {
    requestedAction: requested,
    resolvedAction: resolved,
    replacementReason: reason,
    invalidActionCountDelta: invalidActionCountDeltaForReplacementReason(reason),
  };
}

/**
 * Replace an illegal requested action. Does not handle opponent_ended_battle
 * (Resolver-only after first action).
 */
export function replaceIllegalBattleAction(
  requested: BattleAction,
  context: ReplacementContext,
): ValidationResult<ActionReplacementResult> {
  const validated = validateBattleAction(requested);
  if (!validated.ok) {
    return failure(
      validated.issues.map((issue) => ({
        ...issue,
        path: `/requestedAction${issue.path}`,
      })),
    );
  }
  const action = validated.value;

  if (!context.actor.canAct) {
    return success(replace(action, { kind: "no_action" }, "unable_to_act"));
  }

  if (action.kind !== "use_technique") {
    // Non-technique actions: surrender and basics are accepted as requested.
    // Range/edge legality for approach/retreat/evade is handled by Strategy legal set;
    // Resolver still accepts them (edge clamp during resolution).
    return success(replace(action, action, null));
  }

  const techniqueId = action.techniqueId as TechniqueId;
  const definition = context.catalogById.get(techniqueId);
  if (definition === undefined) {
    return success(replace(action, { kind: "basic_defense" }, "unknown_technique"));
  }

  const learned = context.actor.techniques.some((t) => t.techniqueId === techniqueId);
  if (!learned) {
    return success(replace(action, { kind: "basic_defense" }, "unlearned_technique"));
  }

  const conditions = evaluateTechniqueAcquisitionConditions(definition, {
    abilities: context.actor.stats,
    aptitudes: context.actor.aptitudes,
    techniqueStates: context.actor.techniques,
  });
  if (!conditions.ok) {
    return failure(conditions.issues);
  }
  if (!conditions.value.allConditionsMet) {
    return success(replace(action, { kind: "basic_defense" }, "requirements_not_met"));
  }

  const techState = context.actor.techniques.find((t) => t.techniqueId === techniqueId);
  if (techState === undefined) {
    return success(replace(action, { kind: "basic_defense" }, "unlearned_technique"));
  }
  const mental = computeEffectiveMentalCost(
    definition.mentalCost,
    techState.masteryHundredths,
    context.maximumMasteryReductionRatioBp,
  );
  if (!mental.ok) {
    return mental;
  }
  if (context.actor.currentMental < mental.value) {
    return success(replace(action, { kind: "basic_defense" }, "insufficient_mental"));
  }

  if (!definition.usableRanges.includes(context.range)) {
    const move = nearestUsableRangeMove(
      context.range,
      definition.usableRanges,
      definition.preferredRanges,
    );
    return success(replace(action, move, "unusable_range"));
  }

  return success(replace(action, action, null));
}

export function cancelSecondActionAsOpponentEnded(
  requested: BattleAction,
): ActionReplacementResult {
  return replace(requested, { kind: "no_action" }, "opponent_ended_battle");
}

void shiftBattleRange;
