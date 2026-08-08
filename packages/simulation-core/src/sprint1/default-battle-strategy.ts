/**
 * DefaultBattleStrategy — separate from Resolver (12 §23.1 / S01-006 fix1).
 * Strategy tie uses deriveSeed only; does not advance battle rngState.
 * Production path must supply full scoreComponents — no personality-only fallback.
 */
import { deriveSeed, createSeededRng } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleAction, ResolvedBattleAction } from "./battle-action.js";
import type { BattleSide } from "./battle-enums.js";
import type { BattleDecisionProfile } from "./battle-decision-profile.js";
import type { PreparedBattleTurn } from "./prepare-battle-turn.js";
import type { Sprint1Config } from "./types.js";
import { deepFreezePlainJson } from "./plain-data.js";
import { computeSurrenderScore, surrenderActionScore } from "./battle-surrender.js";
import type { StrategyCandidateScoreEntry } from "./battle-turn-logs.js";
import {
  compareBattleActionsCanonical,
  sortBattleActionsCanonical,
  strategyActionKey,
} from "./battle-strategy-scoring.js";

export type BattleStrategyInput = {
  preparedTurn: PreparedBattleTurn;
  actorSide: BattleSide;
  legalActions: readonly BattleAction[];
  strategyConfig: Sprint1Config["battle"]["strategy"];
  battleDecisionProfile: BattleDecisionProfile;
  /** Precomputed predicted major injury chance (0..100 scale percent). */
  predictedMajorInjuryChance: number;
  predictedSelfInjuryChance: number;
  /** Required expected score components for every non-surrender legal candidate. */
  scoreComponents: ReadonlyMap<string, StrategyScoreComponents>;
};

export type StrategyScoreComponents = {
  expectedDamageScore: number;
  rangeControlScore: number;
  defenseNeedScore: number;
  mentalRecoveryNeedScore: number;
  mentalCostPenalty: number;
  injuryRiskPenalty: number;
  personalityActionModifier: number;
};

export type BattleStrategyResult = {
  requestedAction: BattleAction | ResolvedBattleAction;
  candidateScores: readonly StrategyCandidateScoreEntry[];
  tieBreakUsed: boolean;
  strategySeed: number | null;
};

/**
 * Score a legal action into integer BasisPoints-normalized score units.
 * Surrender uses surrenderActionScore exclusively.
 * Missing scoreComponents → ValidationResult failure (no personality-only fallback).
 */
export function scoreStrategyAction(
  action: BattleAction,
  input: BattleStrategyInput,
): ValidationResult<number> {
  if (action.kind === "surrender") {
    const actor =
      input.actorSide === "sideA"
        ? input.preparedTurn.stateView.participantA
        : input.preparedTurn.stateView.participantB;
    const opponent =
      input.actorSide === "sideA"
        ? input.preparedTurn.stateView.participantB
        : input.preparedTurn.stateView.participantA;
    const durabilityRatioBp = Number(
      (BigInt(actor.currentDurability) * 10000n) / BigInt(Math.max(1, actor.maxDurability)),
    );
    const mentalRatioBp = Number(
      (BigInt(actor.currentMental) * 10000n) / BigInt(Math.max(1, actor.maxMental)),
    );
    const opponentRatioBp = Number(
      (BigInt(opponent.currentDurability) * 10000n) / BigInt(Math.max(1, opponent.maxDurability)),
    );
    const score = computeSurrenderScore({
      durabilityRatioBp,
      mentalRatioBp,
      injury: actor.injury,
      inBattleConsumption: actor.inBattleConsumption,
      opponentDurabilityLeadBp: Math.max(0, opponentRatioBp - durabilityRatioBp),
      confidence: actor.confidence,
      predictedMajorInjuryChance: input.predictedMajorInjuryChance,
      profile: input.battleDecisionProfile,
      strategy: input.strategyConfig,
    });
    if (!score.ok) {
      return score;
    }
    return success(
      surrenderActionScore(score.value, input.strategyConfig.surrenderActionBaseScore),
    );
  }

  const components = input.scoreComponents.get(strategyActionKey(action));
  if (components === undefined) {
    return failure([
      {
        path: "/scoreComponents",
        message:
          "scoreComponents missing for legal strategy candidate (personality-only fallback forbidden)",
        actual: action,
        expected: "StrategyScoreComponents for every non-surrender legal action",
      },
    ]);
  }
  return success(
    components.expectedDamageScore +
      components.rangeControlScore +
      components.defenseNeedScore +
      components.mentalRecoveryNeedScore -
      components.mentalCostPenalty -
      components.injuryRiskPenalty +
      components.personalityActionModifier,
  );
}

export function runDefaultBattleStrategy(
  input: BattleStrategyInput,
): ValidationResult<BattleStrategyResult> {
  const actor =
    input.actorSide === "sideA"
      ? input.preparedTurn.stateView.participantA
      : input.preparedTurn.stateView.participantB;

  if (!actor.canAct) {
    return success(
      deepFreezePlainJson({
        requestedAction: { kind: "no_action" },
        candidateScores: [],
        tieBreakUsed: false,
        strategySeed: null,
      }),
    );
  }

  if (input.legalActions.length === 0) {
    return failure([
      {
        path: "/legalActions",
        message: "legalActions must not be empty for a canAct participant",
        expected: "non-empty BattleAction[]",
      },
    ]);
  }

  const orderedActions = sortBattleActionsCanonical(input.legalActions) as BattleAction[];
  const scored: StrategyCandidateScoreEntry[] = [];
  for (const action of orderedActions) {
    const score = scoreStrategyAction(action, input);
    if (!score.ok) {
      return score;
    }
    scored.push({ action, score: score.value });
  }

  let bestScore = scored[0]!.score;
  for (const entry of scored) {
    if (entry.score > bestScore) {
      bestScore = entry.score;
    }
  }
  const tied = scored
    .filter((entry) => entry.score === bestScore)
    .slice()
    .sort((a, b) => compareBattleActionsCanonical(a.action, b.action));
  if (tied.length === 1) {
    return success(
      deepFreezePlainJson({
        requestedAction: tied[0]!.action,
        candidateScores: scored,
        tieBreakUsed: false,
        strategySeed: null,
      }),
    );
  }

  const sideLabel = input.actorSide === "sideA" ? "side-a" : "side-b";
  const turnLabel = String(input.preparedTurn.turnNumber).padStart(4, "0");
  const label = `battle/strategy/turn-${turnLabel}/${sideLabel}`;
  const strategySeed = deriveSeed(input.preparedTurn.stateView.battleSeed, label);
  const rng = createSeededRng(strategySeed);
  const pick = rng.nextInt(0, tied.length);
  return success(
    deepFreezePlainJson({
      requestedAction: tied[pick]!.action,
      candidateScores: scored,
      tieBreakUsed: true,
      strategySeed,
    }),
  );
}

/** Alias matching the public name in the task brief. */
export const DefaultBattleStrategy = {
  select: runDefaultBattleStrategy,
};
