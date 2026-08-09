/**
 * Shared BattleResult field computation (13 / S01-007).
 * Pure builders only — validation is owned by validate-battle-result.ts.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { importSeededRng } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { decideJudgeWinner, type JudgeDecisiveCriterion } from "./battle-result-contracts.js";
import { buildDevelopmentEffects } from "./battle-development-effects.js";
import { buildJudgeScores } from "./battle-judge-score.js";
import {
  computePostProcessContextHash,
  validateBattlePostProcessContext,
} from "./battle-post-process-context.js";
import type {
  BattleDevelopmentEffects,
  BattleEndReason,
  BattleFinalSnapshot,
  BattlePostProcessContext,
  BattleResult,
  BattleResultKind,
  BattleSummaryLog,
  JudgeScoreByParticipant,
} from "./battle-result-types.js";
import { buildBattleSummaryLog, computeSummaryLogHash } from "./battle-summary-log.js";
import type { BattleState } from "./battle-state.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import { safeHashUtf8 } from "./safe-sha256.js";

export function computeFinalStateHash(
  material: {
    matchId: BattleResult["matchId"];
    battleKind: BattleResult["battleKind"];
    finalState: BattleFinalSnapshot;
    winnerPersonId: PersonId | null;
    loserPersonId: PersonId | null;
    battleRulesRefHash: string;
    runRuleSnapshotHash: string;
    battleInputHash: string;
    sprint1ConfigVersion: string;
    sprint1ConfigHash: string;
    techniqueCatalogDataVersion: string;
    techniqueCatalogHash: string;
    postProcessContext: BattleResult["postProcessContext"];
    postProcessContextHash: string;
    resultKind: BattleResult["resultKind"];
    judgeScore: JudgeScoreByParticipant | null;
    summaryLog: BattleResult["summaryLog"];
    summaryLogHash: string;
    detailedLog: BattleResult["detailedLog"];
    developmentEffects: BattleResult["developmentEffects"];
    finalRngState: SeededRngState;
  },
  provider: Sha256Provider,
): ValidationResult<string> {
  const hashInput = {
    matchId: material.matchId,
    battleKind: material.battleKind,
    finalState: material.finalState,
    winnerPersonId: material.winnerPersonId,
    loserPersonId: material.loserPersonId,
    battleRulesRefHash: material.battleRulesRefHash,
    runRuleSnapshotHash: material.runRuleSnapshotHash,
    battleInputHash: material.battleInputHash,
    sprint1ConfigVersion: material.sprint1ConfigVersion,
    sprint1ConfigHash: material.sprint1ConfigHash,
    techniqueCatalogDataVersion: material.techniqueCatalogDataVersion,
    techniqueCatalogHash: material.techniqueCatalogHash,
    postProcessContext: material.postProcessContext,
    postProcessContextHash: material.postProcessContextHash,
    resultKind: material.resultKind,
    judgeScore: material.judgeScore,
    summaryLog: material.summaryLog,
    summaryLogHash: material.summaryLogHash,
    detailedLog: material.detailedLog,
    developmentEffects: material.developmentEffects,
    finalRngState: material.finalRngState,
  };
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/finalStateHash");
}

export function toFinalSnapshot(state: BattleState): BattleFinalSnapshot {
  const { detailedLog: _omit, ...rest } = cloneValidatedPlainJson(state);
  void _omit;
  return deepFreezePlainJson(rest);
}

export function mapEndReason(state: BattleState): ValidationResult<BattleEndReason> {
  if (state.status === "failed") {
    if (state.failure === null) {
      return failure([
        {
          path: "/failure",
          message: "failed BattleState requires failure info for resolution_error",
        },
      ]);
    }
    return success("resolution_error");
  }
  if (state.status !== "completed" || state.terminalReason === null) {
    return failure([
      {
        path: "/status",
        message: "finalizeBattleResult requires completed+terminalReason or failed+failure",
        actual: { status: state.status, terminalReason: state.terminalReason },
      },
    ]);
  }
  if (state.terminalReason === "max_turns_reached") {
    return success("judge_decision");
  }
  return success(state.terminalReason);
}

export function requiresJudge(endReason: BattleEndReason, state: BattleState): boolean {
  if (endReason === "judge_decision") return true;
  if (
    endReason === "unable_to_continue" &&
    state.participantA.unableToContinue &&
    state.participantB.unableToContinue
  ) {
    return true;
  }
  return false;
}

export function resolveNonJudgeWinner(
  endReason: BattleEndReason,
  state: BattleState,
): ValidationResult<{ winnerPersonId: PersonId; loserPersonId: PersonId }> {
  const a = state.participantA;
  const b = state.participantB;
  if (endReason === "knockout") {
    const aKo = a.currentDurability === 0;
    const bKo = b.currentDurability === 0;
    if (aKo === bKo) {
      return failure([
        {
          path: "/endReason",
          message: "knockout requires exactly one participant with currentDurability=0",
        },
      ]);
    }
    return success(
      aKo
        ? { winnerPersonId: b.personId, loserPersonId: a.personId }
        : { winnerPersonId: a.personId, loserPersonId: b.personId },
    );
  }
  if (endReason === "surrender") {
    if (a.surrendered === b.surrendered) {
      return failure([
        {
          path: "/endReason",
          message: "surrender requires exactly one surrendered participant",
        },
      ]);
    }
    return success(
      a.surrendered
        ? { winnerPersonId: b.personId, loserPersonId: a.personId }
        : { winnerPersonId: a.personId, loserPersonId: b.personId },
    );
  }
  if (endReason === "unable_to_continue") {
    if (a.unableToContinue && !b.unableToContinue) {
      return success({ winnerPersonId: b.personId, loserPersonId: a.personId });
    }
    if (b.unableToContinue && !a.unableToContinue) {
      return success({ winnerPersonId: a.personId, loserPersonId: b.personId });
    }
    return failure([
      {
        path: "/endReason",
        message:
          "single-side unable_to_continue winner resolution expected; both/none need judge path",
      },
    ]);
  }
  return failure([
    {
      path: "/endReason",
      message: "resolveNonJudgeWinner called for judge/resolution endReason",
      actual: endReason,
    },
  ]);
}

export type ComputedBattleResultFields = {
  resultKind: BattleResultKind;
  endReason: BattleEndReason;
  turnsExecuted: number;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  judgeScore: JudgeScoreByParticipant | null;
  decisiveCriterion: JudgeDecisiveCriterion | null;
  seededRngRoll: 0 | 1 | null;
  finalRngState: SeededRngState;
  developmentEffects: BattleDevelopmentEffects | readonly [];
  summaryLog: BattleSummaryLog;
  summaryLogHash: string;
  postProcessContext: BattlePostProcessContext;
  postProcessContextHash: string;
  finalState: BattleFinalSnapshot;
};

/**
 * Compute all BattleResult fields from a validated terminal BattleState.
 * Does not assemble schemaVersion / validation / finalStateHash.
 */
export function computeBattleResultFields(
  state: BattleState,
  runRule: RunRuleSnapshot,
  postProcessContextInput: unknown,
  provider: Sha256Provider,
): ValidationResult<ComputedBattleResultFields> {
  const contextResult = validateBattlePostProcessContext(postProcessContextInput, {
    participantAId: state.participantA.personId,
    participantBId: state.participantB.personId,
    ageAtBattleA: state.participantA.ageAtBattle,
    ageAtBattleB: state.participantB.ageAtBattle,
    worldDate: state.worldDate,
    birthYearA: state.participantA.birthYear,
    birthYearB: state.participantB.birthYear,
  });
  if (!contextResult.ok) return contextResult;
  const postProcessContext = contextResult.value;
  const contextHash = computePostProcessContextHash(postProcessContext, provider);
  if (!contextHash.ok) return contextHash;

  const endReasonResult = mapEndReason(state);
  if (!endReasonResult.ok) return endReasonResult;
  const endReason = endReasonResult.value;
  const turnsExecuted = state.turnNumber;
  const resultKind: BattleResultKind = endReason === "resolution_error" ? "failed" : "completed";

  let winnerPersonId: PersonId | null = null;
  let loserPersonId: PersonId | null = null;
  let judgeScore: JudgeScoreByParticipant | null = null;
  let decisiveCriterion: JudgeDecisiveCriterion | null = null;
  let seededRngRoll: 0 | 1 | null = null;
  let finalRngState: SeededRngState = cloneValidatedPlainJson(state.rngState);

  if (endReason !== "resolution_error") {
    if (requiresJudge(endReason, state)) {
      const scores = buildJudgeScores(
        state,
        turnsExecuted,
        runRule.techniqueDefinitions,
        runRule.sprint1Config,
      );
      if (!scores.ok) return scores;
      judgeScore = scores.value;
      const rng = importSeededRng(cloneValidatedPlainJson(state.rngState));
      const decision = decideJudgeWinner(
        {
          totalScoreA: judgeScore.participantA.totalScore,
          totalScoreB: judgeScore.participantB.totalScore,
          damageDealtA: state.participantA.damageDealt,
          damageDealtB: state.participantB.damageDealt,
          maxDurabilityA: state.participantA.maxDurability,
          maxDurabilityB: state.participantB.maxDurability,
          successfulHitsA: state.participantA.successfulHits,
          successfulHitsB: state.participantB.successfulHits,
          currentDurabilityA: state.participantA.currentDurability,
          currentDurabilityB: state.participantB.currentDurability,
          currentMentalA: state.participantA.currentMental,
          currentMentalB: state.participantB.currentMental,
          inBattleConsumptionA: state.participantA.inBattleConsumption,
          inBattleConsumptionB: state.participantB.inBattleConsumption,
        },
        rng,
      );
      if (!decision.ok) return decision;
      decisiveCriterion = decision.value.decisiveCriterion;
      seededRngRoll = decision.value.seededRngRoll;
      if (decision.value.rngDraws === 1) {
        finalRngState = cloneValidatedPlainJson(rng.exportState());
      }
      if (decision.value.winnerSide === "sideA") {
        winnerPersonId = state.participantA.personId;
        loserPersonId = state.participantB.personId;
      } else {
        winnerPersonId = state.participantB.personId;
        loserPersonId = state.participantA.personId;
      }
    } else {
      const pair = resolveNonJudgeWinner(endReason, state);
      if (!pair.ok) return pair;
      winnerPersonId = pair.value.winnerPersonId;
      loserPersonId = pair.value.loserPersonId;
    }
  }

  if (winnerPersonId !== null && loserPersonId !== null && winnerPersonId === loserPersonId) {
    return failure([
      {
        path: "/winnerPersonId",
        message: "winnerPersonId and loserPersonId must be different persons",
      },
    ]);
  }

  const effects = buildDevelopmentEffects({
    state,
    endReason,
    turnsExecuted,
    winnerPersonId,
    loserPersonId,
    context: postProcessContext,
    config: runRule.sprint1Config,
  });
  if (!effects.ok) return effects;

  const summary = buildBattleSummaryLog({
    state,
    endReason,
    turnsExecuted,
    winnerPersonId,
    loserPersonId,
    judgeScore,
    decisiveCriterion,
    seededRngRoll,
    developmentEffects: effects.value,
  });
  if (!summary.ok) return summary;
  const summaryLogHash = computeSummaryLogHash(summary.value, provider);
  if (!summaryLogHash.ok) return summaryLogHash;

  return success({
    resultKind,
    endReason,
    turnsExecuted,
    winnerPersonId,
    loserPersonId,
    judgeScore,
    decisiveCriterion,
    seededRngRoll,
    finalRngState,
    developmentEffects: effects.value,
    summaryLog: summary.value,
    summaryLogHash: summaryLogHash.value,
    postProcessContext,
    postProcessContextHash: contextHash.value,
    finalState: toFinalSnapshot(state),
  });
}
