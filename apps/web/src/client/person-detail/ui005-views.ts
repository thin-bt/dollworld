/**
 * Client mirror of accepted UI-005 PersonDetailView 0.2.0 exact25.
 * Not a widened contract — keys must match server PERSON_DETAIL_VIEW_KEYS.
 */

export const PERSON_DETAIL_VIEW_KEYS = [
  "personId",
  "displayName",
  "sex",
  "lifeStatus",
  "participationStatus",
  "careerStatus",
  "birthYear",
  "age",
  "deathYear",
  "ageAtDeath",
  "familyId",
  "lineageId",
  "currentRank",
  "highestRank",
  "retirementRank",
  "qualifiedMaster",
  "parentPersonIds",
  "formalMasterPersonIds",
  "stats",
  "aptitudes",
  "temporaryCondition",
  "currentMental",
  "learningFocusTechniqueId",
  "statHistory",
  "techniques",
  "trainingHistory",
] as const;

export type PersonDetailView = {
  personId: string;
  displayName: string;
  sex: "male" | "female";
  lifeStatus: string;
  participationStatus: string | null;
  careerStatus: string;
  birthYear: number;
  age: number | null;
  deathYear: number | null;
  ageAtDeath: number | null;
  familyId: string;
  lineageId: string | null;
  currentRank: string | null;
  highestRank: string | null;
  retirementRank: string | null;
  qualifiedMaster: boolean;
  parentPersonIds: string[];
  formalMasterPersonIds: string[];
  stats: Record<string, number>;
  aptitudes: Record<string, number>;
  temporaryCondition: Record<string, number>;
  currentMental: number;
  learningFocusTechniqueId: string | null;
  statHistory: Record<string, unknown> | null;
  techniques: ReadonlyArray<Record<string, unknown>>;
  trainingHistory: { available: true; items: ReadonlyArray<Record<string, unknown>> } | null;
};
