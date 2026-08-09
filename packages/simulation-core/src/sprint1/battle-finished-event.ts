/**
 * `battle.finished` event candidate (13 §12 / S01-007).
 */
import type { MatchId, PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { WorldDate } from "../world-date.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleKind } from "./battle-enums.js";
import { BATTLE_SIMULATION_SOURCE_PROCESSOR } from "./battle-started-event.js";
import type { BattleEndReason, BattleResult, BattleResultKind } from "./battle-result-types.js";
import { deepFreezePlainJson } from "./plain-data.js";

export const BATTLE_FINISHED_EVENT_TYPE = "battle.finished" as const;

export type BattleFinishedSummaryCompleted = {
  kind: "completed";
  endReason: BattleEndReason;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  turnsExecuted: number;
  resultKind: BattleResultKind;
};

export type BattleFinishedSummaryFailed = {
  kind: "failed";
  endReason: "resolution_error";
  errorCode: string;
  targetIds: readonly string[];
  reason: string;
  severity: string;
  canContinue: boolean;
};

export type BattleFinishedSummary = BattleFinishedSummaryCompleted | BattleFinishedSummaryFailed;

export type BattleFinishedEventPayload = {
  matchId: MatchId;
  battleKind: BattleKind;
  participantAId: PersonId;
  participantBId: PersonId;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  resultKind: BattleResultKind;
  endReason: BattleEndReason;
  turnsExecuted: number;
  battleSeed: number;
  battleInputHash: string;
  battleRulesRefHash: string;
  runRuleSnapshotHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  postProcessContextHash: string;
  finalStateHash: string;
  summary: BattleFinishedSummary;
};

export type BattleFinishedEventCandidate = {
  eventType: typeof BATTLE_FINISHED_EVENT_TYPE;
  sourceProcessor: typeof BATTLE_SIMULATION_SOURCE_PROCESSOR;
  worldDate: WorldDate;
  entities: {
    personIds: readonly PersonId[];
    matchIds: readonly MatchId[];
  };
  payload: BattleFinishedEventPayload;
};

/**
 * Build battle.finished candidate. Failed summary uses finalState.failure only
 * (never validation.violations[0]).
 */
export function createBattleFinishedEventCandidate(
  battleResult: BattleResult,
): ValidationResult<BattleFinishedEventCandidate> {
  let summary: BattleFinishedSummary;
  if (battleResult.resultKind === "failed") {
    const failureInfo = battleResult.finalState.failure;
    if (failureInfo === null) {
      return failure([
        {
          path: "/finalState/failure",
          message: "battle.finished candidate for resultKind=failed requires finalState.failure",
        },
      ]);
    }
    summary = {
      kind: "failed",
      endReason: "resolution_error",
      errorCode: failureInfo.code,
      targetIds: failureInfo.targetIds,
      reason: failureInfo.reason,
      severity: failureInfo.severity,
      canContinue: failureInfo.canContinue,
    };
  } else {
    summary = {
      kind: "completed",
      endReason: battleResult.endReason,
      winnerPersonId: battleResult.winnerPersonId,
      loserPersonId: battleResult.loserPersonId,
      turnsExecuted: battleResult.turnsExecuted,
      resultKind: battleResult.resultKind,
    };
  }

  return success(
    deepFreezePlainJson({
      eventType: BATTLE_FINISHED_EVENT_TYPE,
      sourceProcessor: BATTLE_SIMULATION_SOURCE_PROCESSOR,
      worldDate: battleResult.worldDate,
      entities: {
        personIds: [battleResult.participantAId, battleResult.participantBId],
        matchIds: [battleResult.matchId],
      },
      payload: {
        matchId: battleResult.matchId,
        battleKind: battleResult.battleKind,
        participantAId: battleResult.participantAId,
        participantBId: battleResult.participantBId,
        participantAActionSourceIdentity: battleResult.participantAActionSourceIdentity,
        participantBActionSourceIdentity: battleResult.participantBActionSourceIdentity,
        winnerPersonId: battleResult.winnerPersonId,
        loserPersonId: battleResult.loserPersonId,
        resultKind: battleResult.resultKind,
        endReason: battleResult.endReason,
        turnsExecuted: battleResult.turnsExecuted,
        battleSeed: battleResult.finalState.battleSeed,
        battleInputHash: battleResult.battleInputHash,
        battleRulesRefHash: battleResult.battleRulesRefHash,
        runRuleSnapshotHash: battleResult.runRuleSnapshotHash,
        sprint1ConfigVersion: battleResult.sprint1ConfigVersion,
        sprint1ConfigHash: battleResult.sprint1ConfigHash,
        techniqueCatalogDataVersion: battleResult.techniqueCatalogDataVersion,
        techniqueCatalogHash: battleResult.techniqueCatalogHash,
        postProcessContextHash: battleResult.postProcessContextHash,
        finalStateHash: battleResult.finalStateHash,
        summary,
      },
    }),
  );
}
