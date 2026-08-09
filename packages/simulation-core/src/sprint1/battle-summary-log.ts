/**
 * BattleSummaryLog builder and hash (13 §9 / S01-007).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleState } from "./battle-state.js";
import type { BattleActionLog } from "./battle-turn-logs.js";
import {
  battlePhaseFromIndex,
  computeBattlePhaseIndex,
  computeFinalDurabilityRatioBasisPoints,
  isBattleKeyMomentLog,
  listBattlePhasesForTurnsExecuted,
  type JudgeDecisiveCriterion,
} from "./battle-result-contracts.js";
import { countInjurySummaryForSide } from "./battle-development-effects.js";
import type {
  BattleDevelopmentEffects,
  BattleEndReason,
  BattleJudgeSummary,
  BattleKeyMoment,
  BattlePhaseSummary,
  BattleSummaryLog,
  JudgeScoreByParticipant,
} from "./battle-result-types.js";
import { deepFreezePlainJson } from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";

function opponentPersonId(state: BattleState, actorPersonId: PersonId): PersonId | null {
  if (actorPersonId === state.participantA.personId) return state.participantB.personId;
  if (actorPersonId === state.participantB.personId) return state.participantA.personId;
  return null;
}

function buildPhaseSummaries(
  state: BattleState,
  turnsExecuted: number,
): ValidationResult<readonly BattlePhaseSummary[]> {
  const phases = listBattlePhasesForTurnsExecuted(turnsExecuted);
  if (turnsExecuted === 0) return success([]);

  const buckets = new Map<
    string,
    {
      startTurn: number;
      endTurn: number;
      aDamage: number;
      bDamage: number;
      aHits: number;
      bHits: number;
    }
  >();

  for (const phase of phases) {
    buckets.set(phase, {
      startTurn: Number.MAX_SAFE_INTEGER,
      endTurn: 0,
      aDamage: 0,
      bDamage: 0,
      aHits: 0,
      bHits: 0,
    });
  }

  for (let n = 1; n <= turnsExecuted; n += 1) {
    const phase = battlePhaseFromIndex(computeBattlePhaseIndex(n, turnsExecuted));
    const bucket = buckets.get(phase);
    if (bucket === undefined) continue;
    bucket.startTurn = Math.min(bucket.startTurn, n);
    bucket.endTurn = Math.max(bucket.endTurn, n);
  }

  for (const log of state.detailedLog.actionLogs) {
    if (log.turnNumber < 1 || log.turnNumber > turnsExecuted) continue;
    const phase = battlePhaseFromIndex(computeBattlePhaseIndex(log.turnNumber, turnsExecuted));
    const bucket = buckets.get(phase);
    if (bucket === undefined) continue;
    const damage = log.damage ?? 0;
    const hit = log.hit === true ? 1 : 0;
    if (log.actorSide === "sideA") {
      bucket.aDamage += damage;
      bucket.aHits += hit;
    } else {
      bucket.bDamage += damage;
      bucket.bHits += hit;
    }
  }

  const summaries: BattlePhaseSummary[] = [];
  for (const phase of phases) {
    const bucket = buckets.get(phase)!;
    summaries.push({
      phase,
      startTurn: bucket.startTurn,
      endTurn: bucket.endTurn,
      participantADamageDealt: bucket.aDamage,
      participantBDamageDealt: bucket.bDamage,
      participantASuccessfulHits: bucket.aHits,
      participantBSuccessfulHits: bucket.bHits,
    });
  }
  return success(deepFreezePlainJson(summaries));
}

function buildKeyMoments(state: BattleState): readonly BattleKeyMoment[] {
  const moments: BattleKeyMoment[] = [];
  const sorted = [...state.detailedLog.actionLogs].sort(
    (a, b) => a.actionSequence - b.actionSequence,
  );
  for (const log of sorted) {
    const candidate = {
      damage: log.damage,
      injuryResult: log.injuryResult,
      resolvedActionKind: log.resolvedAction.kind,
    };
    if (!isBattleKeyMomentLog(candidate)) continue;
    const needsTarget =
      (log.damage !== null && log.damage > 0) ||
      log.injuryResult === "minor" ||
      log.injuryResult === "major";
    moments.push({
      actionSequence: log.actionSequence,
      turnNumber: log.turnNumber,
      actorPersonId: log.actorPersonId,
      targetPersonId: needsTarget ? opponentPersonId(state, log.actorPersonId) : null,
      resolvedActionKind: log.resolvedAction.kind,
      damage: log.damage,
      injuryResult: log.injuryResult,
    });
  }
  return deepFreezePlainJson(moments);
}

export function buildBattleSummaryLog(input: {
  state: BattleState;
  endReason: BattleEndReason;
  turnsExecuted: number;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  judgeScore: JudgeScoreByParticipant | null;
  decisiveCriterion: JudgeDecisiveCriterion | null;
  seededRngRoll: 0 | 1 | null;
  developmentEffects: BattleDevelopmentEffects | readonly [];
}): ValidationResult<BattleSummaryLog> {
  void input.developmentEffects;
  const phases = buildPhaseSummaries(input.state, input.turnsExecuted);
  if (!phases.ok) return phases;

  const ratioA = computeFinalDurabilityRatioBasisPoints(
    input.state.participantA.currentDurability,
    input.state.participantA.maxDurability,
  );
  if (!ratioA.ok) return ratioA;
  const ratioB = computeFinalDurabilityRatioBasisPoints(
    input.state.participantB.currentDurability,
    input.state.participantB.maxDurability,
  );
  if (!ratioB.ok) return ratioB;

  let judgeSummary: BattleJudgeSummary | null = null;
  if (input.judgeScore !== null) {
    if (input.decisiveCriterion === null) {
      return failure([
        {
          path: "/judgeSummary/decisiveCriterion",
          message: "decisiveCriterion required when judgeScore is present",
        },
      ]);
    }
    judgeSummary = deepFreezePlainJson({
      participantA: input.judgeScore.participantA,
      participantB: input.judgeScore.participantB,
      decisiveCriterion: input.decisiveCriterion,
      seededRngRoll: input.seededRngRoll,
    });
  }

  const injuryA = countInjurySummaryForSide(input.state, "sideA");
  const injuryB = countInjurySummaryForSide(input.state, "sideB");

  return success(
    deepFreezePlainJson({
      matchId: input.state.matchId,
      battleKind: input.state.battleKind,
      participantAId: input.state.participantA.personId,
      participantBId: input.state.participantB.personId,
      participantAActionSourceIdentity: input.state.participantAActionSourceIdentity,
      participantBActionSourceIdentity: input.state.participantBActionSourceIdentity,
      winnerPersonId: input.winnerPersonId,
      loserPersonId: input.loserPersonId,
      endReason: input.endReason,
      turnsExecuted: input.turnsExecuted,
      phaseSummaries: phases.value,
      keyMoments: buildKeyMoments(input.state),
      finalDurabilityRatios: {
        participantA: ratioA.value,
        participantB: ratioB.value,
      },
      finalMentalValues: {
        participantA: input.state.participantA.currentMental,
        participantB: input.state.participantB.currentMental,
      },
      judgeSummary,
      injurySummary: {
        participantA: injuryA,
        participantB: injuryB,
      },
    }),
  );
}

export function computeSummaryLogHash(
  summaryLog: BattleSummaryLog,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(summaryLog), "/summaryLogHash");
}

/** Re-export for validators that need ActionLog typing. */
export type { BattleActionLog };
