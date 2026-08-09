/**
 * Convert BattleResult.developmentEffects into World-apply candidates (13 / S01-007).
 * Does not mutate Person / WorldState — commit wiring is S01-008.
 */
import type { PersonId, TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type {
  BattleDevelopmentEffects,
  BattleParticipantDevelopmentEffects,
  BattleResult,
  BattleTechniqueStateDelta,
} from "./battle-result-types.js";
import { deepFreezePlainJson } from "./plain-data.js";

export type WorldPersonTechniqueEffectCandidate = {
  techniqueId: TechniqueId;
  masteryHundredthsDelta: number;
  attemptedUseCountDelta: number;
  successfulUseCountDelta: number;
};

export type WorldPersonBattleEffectCandidate = {
  personId: PersonId;
  persistentFatigueDelta: number;
  injuryDelta: number;
  conditionAppliedDelta: number;
  conditionAfter: number;
  confidenceAppliedDelta: number;
  confidenceAfter: number;
  currentMentalAfter: number;
  techniqueStateDeltas: readonly WorldPersonTechniqueEffectCandidate[];
};

export type BattleResultWorldEffectCandidates = {
  matchId: BattleResult["matchId"];
  resultKind: BattleResult["resultKind"];
  endReason: BattleResult["endReason"];
  participants: readonly WorldPersonBattleEffectCandidate[];
};

function toTechniqueCandidates(
  deltas: readonly BattleTechniqueStateDelta[],
): readonly WorldPersonTechniqueEffectCandidate[] {
  return deltas.map((d) => ({
    techniqueId: d.techniqueId,
    masteryHundredthsDelta: d.masteryHundredthsDelta,
    attemptedUseCountDelta: d.attemptedUseCountDelta,
    successfulUseCountDelta: d.successfulUseCountDelta,
  }));
}

function toPersonCandidate(
  personId: PersonId,
  effects: BattleParticipantDevelopmentEffects,
): WorldPersonBattleEffectCandidate {
  return {
    personId,
    persistentFatigueDelta: effects.persistentFatigueDelta,
    injuryDelta: effects.injuryDelta,
    conditionAppliedDelta: effects.conditionAppliedDelta,
    conditionAfter: effects.conditionAfter,
    confidenceAppliedDelta: effects.confidenceAppliedDelta,
    confidenceAfter: effects.confidenceAfter,
    currentMentalAfter: effects.currentMentalAfter,
    techniqueStateDeltas: toTechniqueCandidates(effects.techniqueStateDeltas),
  };
}

export function convertBattleResultToWorldEffectCandidates(
  battleResult: BattleResult,
): ValidationResult<BattleResultWorldEffectCandidates> {
  if (battleResult.resultKind === "failed" || battleResult.endReason === "resolution_error") {
    if (
      !Array.isArray(battleResult.developmentEffects) ||
      battleResult.developmentEffects.length !== 0
    ) {
      return failure([
        {
          path: "/developmentEffects",
          message: "resolution_error must convert from empty developmentEffects",
        },
      ]);
    }
    return success(
      deepFreezePlainJson({
        matchId: battleResult.matchId,
        resultKind: battleResult.resultKind,
        endReason: battleResult.endReason,
        participants: [],
      }),
    );
  }

  const effects = battleResult.developmentEffects as BattleDevelopmentEffects;
  return success(
    deepFreezePlainJson({
      matchId: battleResult.matchId,
      resultKind: battleResult.resultKind,
      endReason: battleResult.endReason,
      participants: [
        toPersonCandidate(battleResult.participantAId, effects.participantA),
        toPersonCandidate(battleResult.participantBId, effects.participantB),
      ],
    }),
  );
}
