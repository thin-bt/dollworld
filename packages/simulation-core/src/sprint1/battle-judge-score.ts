/**
 * Judge score breakdown (13 §4 / S01-007).
 */
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleState } from "./battle-state.js";
import type { BattleActionLog } from "./battle-turn-logs.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { Sprint1Config } from "./types.js";
import type { JudgeScoreBreakdown, JudgeScoreByParticipant } from "./battle-result-types.js";
import { deepFreezePlainJson } from "./plain-data.js";
import { clampInteger } from "./battle-turn-math.js";

function techniqueImportancePoints(
  learningTier: TechniqueDefinition["learningTier"],
  points: Sprint1Config["battle"]["judgement"]["techniqueImportancePoints"],
): number {
  return points[learningTier];
}

function catalogById(
  definitions: readonly TechniqueDefinition[],
): Map<string, TechniqueDefinition> {
  const map = new Map<string, TechniqueDefinition>();
  for (const def of definitions) {
    map.set(def.techniqueId, def);
  }
  return map;
}

export function computeTechniqueScoreFromLogs(
  actionLogs: readonly BattleActionLog[],
  actorSide: "sideA" | "sideB",
  catalog: readonly TechniqueDefinition[],
  config: Sprint1Config,
): ValidationResult<number> {
  const j = config.battle.judgement;
  const byId = catalogById(catalog);
  let sum = 0;
  for (const log of actionLogs) {
    if (log.actorSide !== actorSide) continue;
    if (log.resolvedAction.kind !== "use_technique") continue;
    if (log.activationSucceeded !== true) continue;
    const def = byId.get(log.resolvedAction.techniqueId);
    if (def === undefined) {
      return failure([
        {
          path: "/techniqueScore",
          message: "successful use_technique requires a catalog definition",
          actual: log.resolvedAction.techniqueId,
        },
      ]);
    }
    sum += techniqueImportancePoints(def.learningTier, j.techniqueImportancePoints);
  }
  return success(Math.min(j.techniqueMaximum, sum));
}

export function computeJudgeScoreBreakdown(input: {
  damageDealt: number;
  opponentMaxDurability: number;
  successfulHits: number;
  techniqueScore: number;
  advantageTurnCount: number;
  turnsExecuted: number;
  successfulDefenses: number;
  successfulEvasions: number;
  successfulCounters: number;
  passiveActionCount: number;
  invalidActionCount: number;
  config: Sprint1Config;
}): JudgeScoreBreakdown {
  const j = input.config.battle.judgement;
  const opponentMax = Math.max(1, input.opponentMaxDurability);
  const damageScore = Math.min(
    j.damageMaximum,
    Math.floor((input.damageDealt * j.damageMaximum) / opponentMax),
  );
  const hitScore = Math.min(j.hitMaximum, input.successfulHits);
  const techniqueScore = Math.min(j.techniqueMaximum, input.techniqueScore);
  const turnsDenom = Math.max(1, input.turnsExecuted);
  // 13: round(advantageShare * initiativeMaximum); keep damageScore on floor.
  const initiativeScore = Math.min(
    j.initiativeMaximum,
    Math.max(0, Math.round((input.advantageTurnCount * j.initiativeMaximum) / turnsDenom)),
  );
  const defenseScore = Math.min(
    j.defenseMaximum,
    input.successfulDefenses + input.successfulEvasions + input.successfulCounters * 2,
  );
  const passivityPenalty = Math.min(
    j.passivityPenaltyMaximum,
    input.passiveActionCount * j.passivityPenaltyPerAction +
      input.invalidActionCount * j.invalidActionPenaltyPerAction,
  );
  const raw =
    damageScore + hitScore + techniqueScore + initiativeScore + defenseScore - passivityPenalty;
  const totalScore = clampInteger(raw, j.totalMinimum, j.totalMaximum);
  return deepFreezePlainJson({
    damageScore,
    hitScore,
    techniqueScore,
    initiativeScore,
    defenseScore,
    passivityPenalty,
    totalScore,
  });
}

export function buildJudgeScores(
  state: BattleState,
  turnsExecuted: number,
  catalog: readonly TechniqueDefinition[],
  config: Sprint1Config,
): ValidationResult<JudgeScoreByParticipant> {
  const techA = computeTechniqueScoreFromLogs(
    state.detailedLog.actionLogs,
    "sideA",
    catalog,
    config,
  );
  if (!techA.ok) return techA;
  const techB = computeTechniqueScoreFromLogs(
    state.detailedLog.actionLogs,
    "sideB",
    catalog,
    config,
  );
  if (!techB.ok) return techB;

  const participantA = computeJudgeScoreBreakdown({
    damageDealt: state.participantA.damageDealt,
    opponentMaxDurability: state.participantB.maxDurability,
    successfulHits: state.participantA.successfulHits,
    techniqueScore: techA.value,
    advantageTurnCount: state.participantA.advantageTurnCount,
    turnsExecuted,
    successfulDefenses: state.participantA.successfulDefenses,
    successfulEvasions: state.participantA.successfulEvasions,
    successfulCounters: state.participantA.successfulCounters,
    passiveActionCount: state.participantA.passiveActionCount,
    invalidActionCount: state.participantA.invalidActionCount,
    config,
  });
  const participantB = computeJudgeScoreBreakdown({
    damageDealt: state.participantB.damageDealt,
    opponentMaxDurability: state.participantA.maxDurability,
    successfulHits: state.participantB.successfulHits,
    techniqueScore: techB.value,
    advantageTurnCount: state.participantB.advantageTurnCount,
    turnsExecuted,
    successfulDefenses: state.participantB.successfulDefenses,
    successfulEvasions: state.participantB.successfulEvasions,
    successfulCounters: state.participantB.successfulCounters,
    passiveActionCount: state.participantB.passiveActionCount,
    invalidActionCount: state.participantB.invalidActionCount,
    config,
  });

  return success(deepFreezePlainJson({ participantA, participantB }));
}
