/**
 * BattleResult / post-process types (13 / S01-007 / S1-SPEC-0.1.18).
 */
import type { MatchId, PersonId, SimulationId, TechniqueId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import type { WorldDate } from "../world-date.js";
import type { BattleActionSourceIdentity } from "./battle-action-source-identity.js";
import type { BattleKind } from "./battle-enums.js";
import type { BattleDetailedLog, BattleState } from "./battle-state.js";
import type { JudgeDecisiveCriterion } from "./battle-result-contracts.js";
import type { BattleActionKind } from "./battle-action.js";
import type { InjuryResultLog } from "./battle-turn-logs.js";

export const BATTLE_RESULT_SCHEMA_VERSION = "0.5.0" as const;
export const RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION = "0.2.0" as const;
export const BATTLE_REPLAY_BUNDLE_SCHEMA_VERSION = "0.1.0" as const;

export const BATTLE_RESULT_KINDS = ["completed", "failed"] as const;
export type BattleResultKind = (typeof BATTLE_RESULT_KINDS)[number];

export const BATTLE_END_REASONS = [
  "knockout",
  "surrender",
  "unable_to_continue",
  "judge_decision",
  "resolution_error",
] as const;
export type BattleEndReason = (typeof BATTLE_END_REASONS)[number];

export const BATTLE_EXPERIENCE_OUTCOMES = ["win", "loss"] as const;
export type BattleExperienceOutcome = (typeof BATTLE_EXPERIENCE_OUTCOMES)[number];

export type BattlePostProcessParticipantContext = {
  personId: PersonId;
  matchesCompletedThisWorldWeekBeforeBattle: number;
};

export type BattlePostProcessContext = {
  participantA: BattlePostProcessParticipantContext;
  participantB: BattlePostProcessParticipantContext;
};

/** BattleState without detailedLog (13 §6). */
export type BattleFinalSnapshot = Omit<BattleState, "detailedLog">;

export type JudgeScoreBreakdown = {
  damageScore: number;
  hitScore: number;
  techniqueScore: number;
  initiativeScore: number;
  defenseScore: number;
  passivityPenalty: number;
  totalScore: number;
};

export type JudgeScoreByParticipant = {
  participantA: JudgeScoreBreakdown;
  participantB: JudgeScoreBreakdown;
};

export type BattleTechniqueStateDelta = {
  techniqueId: TechniqueId;
  masteryHundredthsDelta: number;
  attemptedUseCountDelta: number;
  successfulUseCountDelta: number;
};

export type BattleExperienceSummary = {
  outcome: BattleExperienceOutcome;
  endReason: BattleEndReason;
  turnsExecuted: number;
  damageDealt: number;
  damageReceived: number;
  successfulHits: number;
  successfulDefenses: number;
  successfulEvasions: number;
  successfulCounters: number;
  attemptedTechniqueUseCount: number;
  successfulTechniqueUseCount: number;
};

export type BattleParticipantDevelopmentEffects = {
  persistentFatigueDelta: number;
  injuryDelta: number;
  conditionRequestedDelta: number;
  conditionAppliedDelta: number;
  conditionAfter: number;
  confidenceRequestedDelta: number;
  confidenceAppliedDelta: number;
  confidenceAfter: number;
  currentMentalAfter: number;
  techniqueStateDeltas: readonly BattleTechniqueStateDelta[];
  battleExperienceSummary: BattleExperienceSummary;
};

export type BattleDevelopmentEffects = {
  participantA: BattleParticipantDevelopmentEffects;
  participantB: BattleParticipantDevelopmentEffects;
};

export type BattlePhaseSummary = {
  phase: "opening" | "middle" | "closing";
  startTurn: number;
  endTurn: number;
  participantADamageDealt: number;
  participantBDamageDealt: number;
  participantASuccessfulHits: number;
  participantBSuccessfulHits: number;
};

export type BattleKeyMoment = {
  actionSequence: number;
  turnNumber: number;
  actorPersonId: PersonId;
  targetPersonId: PersonId | null;
  resolvedActionKind: BattleActionKind | "no_action";
  damage: number | null;
  injuryResult: InjuryResultLog | null;
};

export type BattleSideRatioSummary = {
  participantA: number;
  participantB: number;
};

export type BattleSideValueSummary = {
  participantA: number;
  participantB: number;
};

export type BattleJudgeSummary = {
  participantA: JudgeScoreBreakdown;
  participantB: JudgeScoreBreakdown;
  decisiveCriterion: JudgeDecisiveCriterion;
  seededRngRoll: 0 | 1 | null;
};

export type BattleInjuryParticipantSummary = {
  sourceInjury: number;
  finalInjury: number;
  injuryDelta: number;
  minorInjuryCount: number;
  majorInjuryCount: number;
};

export type BattleInjurySummary = {
  participantA: BattleInjuryParticipantSummary;
  participantB: BattleInjuryParticipantSummary;
};

export type BattleSummaryLog = {
  matchId: MatchId;
  battleKind: BattleKind;
  participantAId: PersonId;
  participantBId: PersonId;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  endReason: BattleEndReason;
  turnsExecuted: number;
  phaseSummaries: readonly BattlePhaseSummary[];
  keyMoments: readonly BattleKeyMoment[];
  finalDurabilityRatios: BattleSideRatioSummary;
  finalMentalValues: BattleSideValueSummary;
  judgeSummary: BattleJudgeSummary | null;
  injurySummary: BattleInjurySummary;
};

export type BattleResultViolation = {
  code: string;
  severity: "error" | "warning";
  targetIds: readonly string[];
  reason: string;
  canContinue: boolean;
};

export type BattleResultValidation = {
  overallPassed: boolean;
  violations: readonly BattleResultViolation[];
};

export type BattleResult = {
  schemaVersion: typeof BATTLE_RESULT_SCHEMA_VERSION;
  matchId: MatchId;
  simulationId: SimulationId;
  worldDate: WorldDate;
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
  battleRulesRefHash: string;
  runRuleSnapshotHash: string;
  battleInputHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  postProcessContext: BattlePostProcessContext;
  postProcessContextHash: string;
  finalState: BattleFinalSnapshot;
  judgeScore: JudgeScoreByParticipant | null;
  summaryLog: BattleSummaryLog;
  summaryLogHash: string;
  detailedLog: BattleDetailedLog;
  developmentEffects: BattleDevelopmentEffects | readonly [];
  finalRngState: SeededRngState;
  finalStateHash: string;
  validation: BattleResultValidation;
};

export type FinalizeBattleResultInput = {
  terminalBattleState: BattleState;
  runRuleSnapshot: unknown;
  postProcessContext: BattlePostProcessContext;
};
