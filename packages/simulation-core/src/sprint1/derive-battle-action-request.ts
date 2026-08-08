/**
 * Derive requested BattleAction + strategy metadata for Resolver and semantic replay.
 * Scripted paths keep requestedAction from the verified log; strategy meta is null.
 * Default strategy re-derives selection and metadata from turn-start state (no log echo).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { validateBattleAction } from "./battle-action.js";
import type { BattleAction } from "./battle-action.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleSide } from "./battle-enums.js";
import type { BattleParticipantSnapshot } from "./battle-participant.js";
import { enumerateLegalBattleActions } from "./battle-legal-actions.js";
import { buildStrategyScoreComponents } from "./battle-strategy-scoring.js";
import { runDefaultBattleStrategy } from "./default-battle-strategy.js";
import type { PreparedBattleTurn } from "./prepare-battle-turn.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { BattleRange } from "./types.js";
import type { StrategyMeta } from "./battle-action-resolution.js";
import { deepFreezePlainJson } from "./plain-data.js";

export const SCRIPTED_STRATEGY_META: StrategyMeta = deepFreezePlainJson({
  strategySeed: null,
  strategyCandidateScores: null,
  strategyTieBreakUsed: null,
});

export type DeriveDefaultStrategyRequestInput = {
  actorSide: BattleSide;
  actor: BattleParticipantSnapshot;
  opponent: BattleParticipantSnapshot;
  range: BattleRange;
  turnNumber: number;
  battleSeed: number;
  /** Minimal PreparedBattleTurn.stateView carrier — only fields strategy reads. */
  stateView: PreparedBattleTurn["stateView"];
  snapshot: RunRuleSnapshot;
  catalog: ReadonlyMap<string, TechniqueDefinition>;
};

/**
 * Shared DefaultBattleStrategy decision (scoring + selection + metadata).
 * Matches obtainRequestedAction default_strategy path in resolveBattleTurn.
 */
export function deriveDefaultStrategyRequest(
  input: DeriveDefaultStrategyRequestInput,
): ValidationResult<{
  action: BattleAction;
  meta: StrategyMeta;
  strategyReturnedNoAction: boolean;
}> {
  if (!input.actor.canAct) {
    return success({
      action: { kind: "basic_defense" },
      meta: {
        strategySeed: null,
        strategyCandidateScores: [],
        strategyTieBreakUsed: false,
      },
      strategyReturnedNoAction: true,
    });
  }

  const preparedTurn: PreparedBattleTurn = {
    baseBattleStateHash: "replay-strategy-derivation",
    turnNumber: input.turnNumber,
    stateView: input.stateView,
    rngStateBeforeOrder: input.stateView.rngState,
  };

  const baselineScores = buildStrategyScoreComponents({
    actor: input.actor,
    opponent: input.opponent,
    range: input.range,
    legalActions: [],
    catalog: input.catalog,
    config: input.snapshot.sprint1Config,
    profile: input.actor.battleDecisionProfile,
  });
  if (!baselineScores.ok) {
    return failure(baselineScores.issues);
  }
  const legal = enumerateLegalBattleActions({
    actor: input.actor,
    opponent: input.opponent,
    range: input.range,
    catalogById: input.catalog,
    config: input.snapshot.sprint1Config,
    predictedMajorInjuryChance: baselineScores.value.predictedMajorInjuryChance,
  });
  const scores = buildStrategyScoreComponents({
    actor: input.actor,
    opponent: input.opponent,
    range: input.range,
    legalActions: legal,
    catalog: input.catalog,
    config: input.snapshot.sprint1Config,
    profile: input.actor.battleDecisionProfile,
  });
  if (!scores.ok) {
    return failure(scores.issues);
  }
  const strategy = runDefaultBattleStrategy({
    preparedTurn,
    actorSide: input.actorSide,
    legalActions: legal,
    strategyConfig: input.snapshot.sprint1Config.battle.strategy,
    battleDecisionProfile: input.actor.battleDecisionProfile,
    predictedMajorInjuryChance: scores.value.predictedMajorInjuryChance,
    predictedSelfInjuryChance: scores.value.predictedSelfInjuryChance,
    scoreComponents: scores.value.scoreComponents,
  });
  if (!strategy.ok) {
    return failure(strategy.issues);
  }
  if (strategy.value.requestedAction.kind === "no_action") {
    return success({
      action: { kind: "basic_defense" },
      meta: {
        strategySeed: strategy.value.strategySeed,
        strategyCandidateScores: strategy.value.candidateScores,
        strategyTieBreakUsed: strategy.value.tieBreakUsed,
      },
      strategyReturnedNoAction: true,
    });
  }
  const validated = validateBattleAction(strategy.value.requestedAction);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success({
    action: validated.value,
    meta: {
      strategySeed: strategy.value.strategySeed,
      strategyCandidateScores: strategy.value.candidateScores,
      strategyTieBreakUsed: strategy.value.tieBreakUsed,
    },
    strategyReturnedNoAction: false,
  });
}

/**
 * Resolve strategy provenance for a side at turn start.
 * Scripted: meta is always null triple; requested stays the validated log BattleAction.
 * Default: re-derive action + meta from turn-start participant/range/seed.
 */
export function deriveStrategyProvenance(input: {
  identity: BattleActionSourceIdentity;
  recordedRequested: BattleAction;
  defaultInput: DeriveDefaultStrategyRequestInput;
}): ValidationResult<{ requestedAction: BattleAction; meta: StrategyMeta }> {
  if (input.identity.kind === "scripted_actions") {
    return success({
      requestedAction: input.recordedRequested,
      meta: SCRIPTED_STRATEGY_META,
    });
  }
  const derived = deriveDefaultStrategyRequest(input.defaultInput);
  if (!derived.ok) {
    return failure(derived.issues);
  }
  return success({
    requestedAction: derived.value.action,
    meta: derived.value.meta,
  });
}
