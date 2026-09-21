/**
 * Build battle-log presentation summary for official tournament matches from retained detailed logs.
 */

import type { BattleActionLog, BattleDetailedLog, PersonId } from "@shared-world/simulation-core";
import { validateBattleActionLog } from "@shared-world/simulation-core";
import type { StoredBattleResultRecord } from "@shared-world/simulation-core";

export type CompetitionBattleLogSummaryView = {
  matchId: string;
  simulationId: string;
  participantAPersonId: string;
  participantBPersonId: string;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  resultKind: string;
  endReason: string;
  logTotalCount: number;
  finalState: Record<string, unknown>;
  judgeScore: null;
};

type ParticipantAccumulator = {
  maxDurability: number;
  maxMental: number;
  currentDurability: number | null;
  currentMental: number | null;
  guarding: boolean | null;
  evading: boolean | null;
  canAct: boolean | null;
  surrendered: boolean | null;
  unableToContinue: boolean | null;
};

function emptyParticipant(): ParticipantAccumulator {
  return {
    maxDurability: 0,
    maxMental: 0,
    currentDurability: null,
    currentMental: null,
    guarding: null,
    evading: null,
    canAct: null,
    surrendered: null,
    unableToContinue: null,
  };
}

function applyActorSide(acc: ParticipantAccumulator, log: BattleActionLog): ParticipantAccumulator {
  const next = { ...acc };
  next.maxDurability = Math.max(
    next.maxDurability,
    log.actorDurabilityBefore,
    log.actorDurabilityAfter,
  );
  next.maxMental = Math.max(next.maxMental, log.actorMentalBefore, log.actorMentalAfter);
  next.currentDurability = log.actorDurabilityAfter;
  next.currentMental = log.actorMentalAfter;
  next.guarding = log.guardingAfter;
  next.evading = log.evadingAfter;
  next.canAct = log.canActAfter;
  next.surrendered = log.surrenderedAfter;
  next.unableToContinue = log.unableToContinueAfter;
  return next;
}

function applyTargetSide(
  acc: ParticipantAccumulator,
  log: BattleActionLog,
): ParticipantAccumulator {
  if (
    log.targetDurabilityBefore === null ||
    log.targetDurabilityAfter === null ||
    log.targetMentalBefore === null ||
    log.targetMentalAfter === null
  ) {
    return acc;
  }
  const next = { ...acc };
  next.maxDurability = Math.max(
    next.maxDurability,
    log.targetDurabilityBefore,
    log.targetDurabilityAfter,
  );
  next.maxMental = Math.max(next.maxMental, log.targetMentalBefore, log.targetMentalAfter);
  next.currentDurability = log.targetDurabilityAfter;
  next.currentMental = log.targetMentalAfter;
  return next;
}

function participantWire(personId: PersonId, acc: ParticipantAccumulator): Record<string, unknown> {
  const maxDurability = acc.maxDurability > 0 ? acc.maxDurability : (acc.currentDurability ?? 0);
  const maxMental = acc.maxMental > 0 ? acc.maxMental : (acc.currentMental ?? 0);
  return {
    personId,
    currentDurability: acc.currentDurability ?? maxDurability,
    maxDurability,
    currentMental: acc.currentMental ?? maxMental,
    maxMental,
    injury: 0,
    fatigue: 0,
    guarding: acc.guarding ?? false,
    evading: acc.evading ?? false,
    canAct: acc.canAct ?? true,
    surrendered: acc.surrendered ?? false,
    unableToContinue: acc.unableToContinue ?? false,
  };
}

function inferEndReason(input: {
  resultKind: string;
  participantA: Record<string, unknown>;
  participantB: Record<string, unknown>;
}): string {
  if (input.resultKind === "failed") {
    return "resolution_error";
  }
  const aUnable = input.participantA.unableToContinue === true;
  const bUnable = input.participantB.unableToContinue === true;
  if (aUnable && bUnable) {
    return "judge_decision";
  }
  if (aUnable || bUnable) {
    return "unable_to_continue";
  }
  return "judge_decision";
}

export function projectCompetitionBattleLogSummary(
  record: StoredBattleResultRecord,
  detailedLog: BattleDetailedLog,
): CompetitionBattleLogSummaryView | null {
  if (detailedLog.actionLogs.length === 0) {
    return null;
  }

  let participantA = emptyParticipant();
  let participantB = emptyParticipant();
  let initialRange: string | null = null;
  let finalRange: string | null = null;

  for (const raw of detailedLog.actionLogs) {
    const validated = validateBattleActionLog(raw);
    if (!validated.ok) {
      continue;
    }
    const log = validated.value;
    if (initialRange === null) {
      initialRange = log.rangeBefore;
    }
    finalRange = log.rangeAfter;
    if (log.actorPersonId === record.participantAId) {
      participantA = applyActorSide(participantA, log);
      participantB = applyTargetSide(participantB, log);
    } else if (log.actorPersonId === record.participantBId) {
      participantB = applyActorSide(participantB, log);
      participantA = applyTargetSide(participantA, log);
    }
  }

  const participantAWire = participantWire(record.participantAId, participantA);
  const participantBWire = participantWire(record.participantBId, participantB);
  const endReason = inferEndReason({
    resultKind: record.resultKind,
    participantA: participantAWire,
    participantB: participantBWire,
  });

  return {
    matchId: record.matchId,
    simulationId: record.simulationId,
    participantAPersonId: record.participantAId,
    participantBPersonId: record.participantBId,
    winnerPersonId: record.winnerPersonId,
    loserPersonId: record.loserPersonId,
    resultKind: record.resultKind,
    endReason,
    logTotalCount: detailedLog.actionLogs.length,
    finalState: {
      status: record.resultKind === "failed" ? "failed" : "completed",
      battleSeed: 0,
      range: finalRange ?? initialRange ?? "mid",
      initialRange: initialRange ?? finalRange ?? "mid",
      participantA: participantAWire,
      participantB: participantBWire,
      failure: null,
    },
    judgeScore: null,
  };
}
