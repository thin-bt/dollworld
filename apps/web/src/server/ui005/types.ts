/**
 * Local wire/view shapes for UI-005 PersonDetail pure prebuild.
 * Future owner: UI-005 (API-008). Not production acceptance.
 */

import type { AbilityKey } from "@shared-world/simulation-core";

export type WorldDateView = {
  year: number;
  month: number;
  week: number;
};

export type StatSetView = Record<AbilityKey, number>;

export type AptitudeSetView = {
  unarmed: number;
  sword: number;
  magic: number;
};

export type TemporaryConditionView = {
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
};

export type RankProjection = {
  currentRank: string | null;
  highestRank: string | null;
  retirementRank: string | null;
};

export type PersonDetailDirectFields = RankProjection & {
  familyId: string;
  lineageId: string | null;
  stats: StatSetView;
  aptitudes: AptitudeSetView;
  temporaryCondition: TemporaryConditionView;
  currentMental: number;
  qualifiedMaster: boolean;
  age: number | null;
  deathYear: number | null;
  ageAtDeath: number | null;
  learningFocusTechniqueId: string | null;
};

export type TechniqueDefinitionView = Record<string, unknown>;

export type TechniqueView = {
  techniqueId: string;
  learnedState: "learning" | "acquired";
  learningProgressTenths: number;
  masteryHundredths: number;
  successfulUseCount: number;
  attemptedUseCount: number;
  lastPracticedAbsoluteWeek: number | null;
  acquiredAbsoluteWeek: number | null;
  definition: TechniqueDefinitionView;
};

export type TrainingHistoryStatChange = {
  stat: AbilityKey;
  before: number;
  after: number;
  amount: number;
};

export type TrainingHistoryItemView = {
  worldDate: WorldDateView;
  trainingKind: "train_stat" | "learn_technique" | "practice_technique" | "rest";
  targetStat: AbilityKey | null;
  targetTechniqueId: string | null;
  forced: boolean;
  forcedReason: "severe_injury" | "fatigue_threshold" | null;
  statChanges: TrainingHistoryStatChange[];
  learningAttempted: boolean;
  learnedTechniqueIds: string[];
  relatedEventSequences: number[];
};

export type TrainingHistoryView = {
  available: true;
  items: TrainingHistoryItemView[];
};

export type StatHistoryEntry = {
  initial: number;
  current: number;
  last48WeeksDelta: number;
  lastWeekDelta: number;
};

export type StatHistoryView = Record<AbilityKey, StatHistoryEntry>;
