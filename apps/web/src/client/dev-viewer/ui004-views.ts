/**
 * Wire view types for DEV-VIEWER-001 — mirrors accepted UI-004 DTOs
 * (PersonListItemView exact16 / MockBattleCandidateView exact4).
 * Not a new contract; client-side mirror of apps/web/src/server/ui004/project-person.ts.
 */

export type Rank = "F" | "E" | "D" | "C" | "B" | "A" | "S";

export type StatSetView = {
  stamina: number;
  strength: number;
  skill: number;
  speed: number;
  spirit: number;
  magic: number;
};

export type AptitudeSetView = {
  unarmed: number;
  sword: number;
  magic: number;
};

export type PersonListItemView = {
  personId: string;
  displayName: string;
  lifeStatus: "living" | "deceased";
  participationStatus: "waiting" | "active" | "stopped" | null;
  careerStatus: "child" | "trainee" | "active_competitor" | "retired";
  age: number | null;
  deathYear: number | null;
  ageAtDeath: number | null;
  familyId: string;
  lineageId: string | null;
  currentRank: Rank | null;
  highestRank: Rank | null;
  retirementRank: Rank | null;
  stats: StatSetView;
  aptitudes: AptitudeSetView;
  learnedTechniqueCount: number;
};

export type MockBattleCandidateView = {
  personId: string;
  displayName: string;
  age: number;
  careerStatus: "trainee" | "active_competitor";
};

export type PageableListData<T> = {
  items: T[];
  totalCount: number;
  nextCursor: string | null;
};

export const PERSON_LIST_ITEM_KEYS = [
  "personId",
  "displayName",
  "lifeStatus",
  "participationStatus",
  "careerStatus",
  "age",
  "deathYear",
  "ageAtDeath",
  "familyId",
  "lineageId",
  "currentRank",
  "highestRank",
  "retirementRank",
  "stats",
  "aptitudes",
  "learnedTechniqueCount",
] as const;

export const MOCK_CANDIDATE_KEYS = ["personId", "displayName", "age", "careerStatus"] as const;
