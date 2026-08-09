/**
 * Battle developmentEffects builder (13 §8 / 09 mastery / S01-007).
 */
import type { PersonId, TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleKind } from "./battle-enums.js";
import type { BattleState } from "./battle-state.js";
import type { BattleActionLog } from "./battle-turn-logs.js";
import type { PersonTechniqueState } from "./types.js";
import type { Sprint1Config } from "./types.js";
import { applyBattleTechniqueMasteryAttempts } from "./battle-result-contracts.js";
import { consecutiveMatchKeyFromCount } from "./battle-post-process-context.js";
import type { BattlePostProcessContext } from "./battle-result-types.js";
import type {
  BattleDevelopmentEffects,
  BattleEndReason,
  BattleExperienceSummary,
  BattleParticipantDevelopmentEffects,
  BattleTechniqueStateDelta,
} from "./battle-result-types.js";
import { clampInteger } from "./battle-turn-math.js";
import { deepFreezePlainJson } from "./plain-data.js";
import { BASIS_POINTS_SCALE } from "./basis-points.js";

function ceilBasisPoints(base: number, bp: number): number {
  // ceil(base * bp / 10000) via integer arithmetic
  return Math.floor((base * bp + BASIS_POINTS_SCALE - 1) / BASIS_POINTS_SCALE);
}

function damageAdditionalFatigue(
  damageReceived: number,
  maxDurability: number,
  rules: Sprint1Config["battle"]["postEffects"]["damageAdditionalFatigueRules"],
): ValidationResult<number> {
  if (maxDurability <= 0) {
    return failure([
      {
        path: "/damageAdditionalFatigue",
        message: "maxDurability must be > 0",
        actual: maxDurability,
      },
    ]);
  }
  const percent = Math.floor((damageReceived * 100) / maxDurability);
  if (percent < 10) return success(rules.below10Percent);
  if (percent < 20) return success(rules["10to19Percent"]);
  if (percent < 30) return success(rules["20to29Percent"]);
  if (percent < 40) return success(rules["30to39Percent"]);
  return success(rules["40PercentOrMore"]);
}

function ageAdditionalFatigue(
  ageAtBattle: number,
  rules: Sprint1Config["battle"]["postEffects"]["ageAdditionalFatigueRules"],
): ValidationResult<number> {
  if (!Number.isSafeInteger(ageAtBattle) || ageAtBattle < 0) {
    return failure([
      { path: "/ageAdditionalFatigue", message: "ageAtBattle must be a non-negative integer" },
    ]);
  }
  if (ageAtBattle <= 27) return success(rules.age0to27);
  if (ageAtBattle <= 34) return success(rules.age28to34);
  if (ageAtBattle <= 41) return success(rules.age35to41);
  return failure([
    {
      path: "/ageAdditionalFatigue",
      message: "ageAtBattle > 41 has no ageAdditionalFatigueRules mapping (retired boundary)",
      actual: ageAtBattle,
    },
  ]);
}

function hasMajorInjuryForTarget(
  logs: readonly BattleActionLog[],
  targetPersonId: PersonId,
  actorPersonIdA: PersonId,
  actorPersonIdB: PersonId,
): boolean {
  for (const log of logs) {
    if (log.injuryResult !== "major") continue;
    const targetId =
      log.actorPersonId === actorPersonIdA
        ? actorPersonIdB
        : log.actorPersonId === actorPersonIdB
          ? actorPersonIdA
          : null;
    if (targetId === targetPersonId) return true;
  }
  return false;
}

function countInjuriesForTarget(
  logs: readonly BattleActionLog[],
  targetPersonId: PersonId,
  actorPersonIdA: PersonId,
  actorPersonIdB: PersonId,
): { minor: number; major: number } {
  let minor = 0;
  let major = 0;
  for (const log of logs) {
    if (log.injuryResult !== "minor" && log.injuryResult !== "major") continue;
    const targetId =
      log.actorPersonId === actorPersonIdA
        ? actorPersonIdB
        : log.actorPersonId === actorPersonIdB
          ? actorPersonIdA
          : null;
    if (targetId !== targetPersonId) continue;
    if (log.injuryResult === "minor") minor += 1;
    else major += 1;
  }
  return { minor, major };
}

function techniqueMap(
  techniques: readonly PersonTechniqueState[],
): Map<string, PersonTechniqueState> {
  const map = new Map<string, PersonTechniqueState>();
  for (const t of techniques) {
    map.set(t.techniqueId, t);
  }
  return map;
}

function collectAttemptsByTechnique(
  logs: readonly BattleActionLog[],
  actorSide: "sideA" | "sideB",
): Map<string, { activationSucceeded: boolean }[]> {
  const map = new Map<string, { activationSucceeded: boolean }[]>();
  const sorted = [...logs].sort((a, b) => a.actionSequence - b.actionSequence);
  for (const log of sorted) {
    if (log.actorSide !== actorSide) continue;
    if (log.resolvedAction.kind !== "use_technique") continue;
    if (log.activationSucceeded !== true && log.activationSucceeded !== false) continue;
    const id = log.resolvedAction.techniqueId;
    const list = map.get(id) ?? [];
    list.push({ activationSucceeded: log.activationSucceeded });
    map.set(id, list);
  }
  return map;
}

function buildTechniqueStateDeltas(
  state: BattleState,
  actorSide: "sideA" | "sideB",
  battleKind: BattleKind,
  config: Sprint1Config,
): ValidationResult<readonly BattleTechniqueStateDelta[]> {
  const participant = actorSide === "sideA" ? state.participantA : state.participantB;
  const sourceMap = techniqueMap(participant.sourceSnapshot.techniques);
  const finalMap = techniqueMap(participant.techniques);
  const attemptsByTech = collectAttemptsByTechnique(state.detailedLog.actionLogs, actorSide);

  const techniqueIds = new Set<string>([
    ...sourceMap.keys(),
    ...finalMap.keys(),
    ...attemptsByTech.keys(),
  ]);
  const deltas: BattleTechniqueStateDelta[] = [];

  for (const techniqueId of [...techniqueIds].sort()) {
    const source = sourceMap.get(techniqueId);
    const final = finalMap.get(techniqueId);
    if (source === undefined || final === undefined) {
      return failure([
        {
          path: `/techniqueStateDeltas/${techniqueId}`,
          message: "technique must exist in both sourceSnapshot and final participant techniques",
        },
      ]);
    }
    const attemptedUseCountDelta = final.attemptedUseCount - source.attemptedUseCount;
    const successfulUseCountDelta = final.successfulUseCount - source.successfulUseCount;
    const attempts = attemptsByTech.get(techniqueId) ?? [];
    if (attempts.length !== attemptedUseCountDelta) {
      return failure([
        {
          path: `/techniqueStateDeltas/${techniqueId}/attemptedUseCountDelta`,
          message: "DetailedLog attempt count must equal battle-local attemptedUseCountDelta",
          actual: attempts.length,
          expected: String(attemptedUseCountDelta),
        },
      ]);
    }
    const successFromLogs = attempts.filter((a) => a.activationSucceeded).length;
    if (successFromLogs !== successfulUseCountDelta) {
      return failure([
        {
          path: `/techniqueStateDeltas/${techniqueId}/successfulUseCountDelta`,
          message: "DetailedLog success count must equal battle-local successfulUseCountDelta",
          actual: successFromLogs,
          expected: String(successfulUseCountDelta),
        },
      ]);
    }

    const mastery = applyBattleTechniqueMasteryAttempts({
      sourceMasteryHundredths: source.masteryHundredths,
      battleKind,
      attempts,
      config,
    });
    if (!mastery.ok) return mastery;

    if (
      attemptedUseCountDelta === 0 &&
      successfulUseCountDelta === 0 &&
      mastery.value.masteryHundredthsDelta === 0
    ) {
      continue;
    }

    deltas.push({
      techniqueId: techniqueId as TechniqueId,
      masteryHundredthsDelta: mastery.value.masteryHundredthsDelta,
      attemptedUseCountDelta,
      successfulUseCountDelta,
    });
  }

  return success(deepFreezePlainJson(deltas));
}

function resultModifierKeys(
  battleKind: BattleKind,
  outcome: "win" | "loss",
): "officialWin" | "officialLoss" | "mockWin" | "mockLoss" {
  if (battleKind === "official") {
    return outcome === "win" ? "officialWin" : "officialLoss";
  }
  return outcome === "win" ? "mockWin" : "mockLoss";
}

function buildExperienceSummary(input: {
  outcome: "win" | "loss";
  endReason: BattleEndReason;
  turnsExecuted: number;
  participant: BattleState["participantA"];
  techniqueDeltas: readonly BattleTechniqueStateDelta[];
}): BattleExperienceSummary {
  let attemptedTechniqueUseCount = 0;
  let successfulTechniqueUseCount = 0;
  for (const d of input.techniqueDeltas) {
    attemptedTechniqueUseCount += d.attemptedUseCountDelta;
    successfulTechniqueUseCount += d.successfulUseCountDelta;
  }
  return deepFreezePlainJson({
    outcome: input.outcome,
    endReason: input.endReason,
    turnsExecuted: input.turnsExecuted,
    damageDealt: input.participant.damageDealt,
    damageReceived: input.participant.damageReceived,
    successfulHits: input.participant.successfulHits,
    successfulDefenses: input.participant.successfulDefenses,
    successfulEvasions: input.participant.successfulEvasions,
    successfulCounters: input.participant.successfulCounters,
    attemptedTechniqueUseCount,
    successfulTechniqueUseCount,
  });
}

function buildOneSide(input: {
  state: BattleState;
  side: "sideA" | "sideB";
  endReason: BattleEndReason;
  turnsExecuted: number;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  context: BattlePostProcessContext;
  config: Sprint1Config;
}): ValidationResult<BattleParticipantDevelopmentEffects> {
  const participant = input.side === "sideA" ? input.state.participantA : input.state.participantB;
  const contextSide =
    input.side === "sideA" ? input.context.participantA : input.context.participantB;
  const pe = input.config.battle.postEffects;
  const source = participant.sourceSnapshot;

  const continued = ceilBasisPoints(participant.inBattleConsumption, pe.continuedFatigueRatio);
  const damageFatigue = damageAdditionalFatigue(
    participant.damageReceived,
    participant.maxDurability,
    pe.damageAdditionalFatigueRules,
  );
  if (!damageFatigue.ok) return damageFatigue;

  const majorOnce = hasMajorInjuryForTarget(
    input.state.detailedLog.actionLogs,
    participant.personId,
    input.state.participantA.personId,
    input.state.participantB.personId,
  )
    ? pe.majorInjuryAdditionalFatigue
    : 0;

  const consecutiveKey = consecutiveMatchKeyFromCount(
    contextSide.matchesCompletedThisWorldWeekBeforeBattle,
  );
  const consecutive = pe.consecutiveMatchAdditionalFatigueRules[consecutiveKey];
  const ageFatigue = ageAdditionalFatigue(participant.ageAtBattle, pe.ageAdditionalFatigueRules);
  if (!ageFatigue.ok) return ageFatigue;

  const persistentFatigueDelta =
    continued + damageFatigue.value + majorOnce + consecutive + ageFatigue.value;

  const injuryDelta = participant.injury - source.injury;

  const isWinner = input.winnerPersonId === participant.personId;
  const isLoser = input.loserPersonId === participant.personId;
  if (!isWinner && !isLoser) {
    return failure([
      {
        path: "/developmentEffects",
        message: "completed developmentEffects require a decisive winner and loser",
      },
    ]);
  }
  const outcome = isWinner ? "win" : "loss";
  const baseKey = resultModifierKeys(input.state.battleKind, outcome);
  const modifiers = pe.resultModifiersByBattleKindAndEndReason;
  if (!Object.prototype.hasOwnProperty.call(modifiers, baseKey)) {
    return failure([
      {
        path: `/resultModifiersByBattleKindAndEndReason/${baseKey}`,
        message: "required result modifier is missing",
      },
    ]);
  }
  let conditionRequested = modifiers[baseKey].condition;
  let confidenceRequested = modifiers[baseKey].confidence;

  if (input.endReason === "surrender" && isLoser) {
    conditionRequested += modifiers.surrenderAdditional.condition;
    confidenceRequested += modifiers.surrenderAdditional.confidence;
  }
  if (input.endReason === "knockout" && isLoser) {
    conditionRequested += modifiers.knockoutAdditional.condition;
    confidenceRequested += modifiers.knockoutAdditional.confidence;
  }

  const conditionAfter = clampInteger(source.condition + conditionRequested, -20, 20);
  const confidenceAfter = clampInteger(source.confidence + confidenceRequested, -20, 20);

  const techDeltas = buildTechniqueStateDeltas(
    input.state,
    input.side,
    input.state.battleKind,
    input.config,
  );
  if (!techDeltas.ok) return techDeltas;

  const experience = buildExperienceSummary({
    outcome,
    endReason: input.endReason,
    turnsExecuted: input.turnsExecuted,
    participant,
    techniqueDeltas: techDeltas.value,
  });

  return success(
    deepFreezePlainJson({
      persistentFatigueDelta,
      injuryDelta,
      conditionRequestedDelta: conditionRequested,
      conditionAppliedDelta: conditionAfter - source.condition,
      conditionAfter,
      confidenceRequestedDelta: confidenceRequested,
      confidenceAppliedDelta: confidenceAfter - source.confidence,
      confidenceAfter,
      currentMentalAfter: participant.currentMental,
      techniqueStateDeltas: techDeltas.value,
      battleExperienceSummary: experience,
    }),
  );
}

export function buildDevelopmentEffects(input: {
  state: BattleState;
  endReason: BattleEndReason;
  turnsExecuted: number;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  context: BattlePostProcessContext;
  config: Sprint1Config;
}): ValidationResult<BattleDevelopmentEffects | readonly []> {
  if (input.endReason === "resolution_error") {
    return success([]);
  }
  if (input.winnerPersonId === null || input.loserPersonId === null) {
    return failure([
      {
        path: "/developmentEffects",
        message: "completed battles require non-null winner and loser for developmentEffects",
      },
    ]);
  }

  const a = buildOneSide({ ...input, side: "sideA" });
  if (!a.ok) return a;
  const b = buildOneSide({ ...input, side: "sideB" });
  if (!b.ok) return b;

  return success(
    deepFreezePlainJson({
      participantA: a.value,
      participantB: b.value,
    }),
  );
}

export function countInjurySummaryForSide(
  state: BattleState,
  side: "sideA" | "sideB",
): {
  minorInjuryCount: number;
  majorInjuryCount: number;
  sourceInjury: number;
  finalInjury: number;
  injuryDelta: number;
} {
  const participant = side === "sideA" ? state.participantA : state.participantB;
  const counts = countInjuriesForTarget(
    state.detailedLog.actionLogs,
    participant.personId,
    state.participantA.personId,
    state.participantB.personId,
  );
  return {
    sourceInjury: participant.sourceSnapshot.injury,
    finalInjury: participant.injury,
    injuryDelta: participant.injury - participant.sourceSnapshot.injury,
    minorInjuryCount: counts.minor,
    majorInjuryCount: counts.major,
  };
}
