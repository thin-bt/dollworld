import type { AbilityScores, AptitudeScores } from "../abilities.js";
import type { CareerStatus, Rank, Sex } from "../enums.js";
import type { FamilyId, LineageId, PersonId } from "../ids.js";

/** Mutable person state during initial-world generation (before final Person assembly). */
export type PersonDraft = {
  personId: PersonId;
  sex: Sex;
  birthYear: number;
  familyId: FamilyId;
  lifeStatus: "living" | "deceased";
  givenName: string;
  familyName: string;
  displayName: string;
  nameDataVersion: string;
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  participationStatus?: "waiting" | "active" | "stopped";
  currentAge?: number;
  careerStatus: CareerStatus;
  currentRank?: Rank;
  highestRank?: Rank;
  retirementRank?: Rank;
  qualifiedMaster: boolean;
  lineageId?: LineageId;
  deathYear?: number;
  ageAtDeath?: number;
};

export type FamilyDraft = {
  familyId: FamilyId;
  familyName: string;
  status: "active";
  baseBirthRate: number;
  initialHistory: true;
  memberIds: PersonId[];
  livingMemberIds: PersonId[];
};

export type LineageDraft = {
  lineageId: LineageId;
  lineageName: string;
  focus: "unarmed" | "sword" | "magic";
  founderPersonId: PersonId;
  founderFamilyId: FamilyId;
  status: "active";
};

export type ParentRelationshipDraft = {
  parentId: PersonId;
  childId: PersonId;
  parentRole: "father" | "mother";
};

export type MarriageRelationshipDraft = {
  personAId: PersonId;
  personBId: PersonId;
};

export type MasterDiscipleRelationshipDraft = {
  masterId: PersonId;
  discipleId: PersonId;
};

export type InitialWorldDraftState = {
  persons: PersonDraft[];
  families: FamilyDraft[];
  lineages: LineageDraft[];
  parentRelationships: ParentRelationshipDraft[];
  marriageRelationships: MarriageRelationshipDraft[];
  masterRelationships: MasterDiscipleRelationshipDraft[];
  warnings: string[];
};

export function livingDrafts(state: InitialWorldDraftState): PersonDraft[] {
  return state.persons.filter((p) => p.lifeStatus === "living");
}

export function deceasedDrafts(state: InitialWorldDraftState): PersonDraft[] {
  return state.persons.filter((p) => p.lifeStatus === "deceased");
}

export function personById(state: InitialWorldDraftState, personId: PersonId): PersonDraft {
  const person = state.persons.find((p) => p.personId === personId);
  if (person === undefined) {
    throw new Error(`person not found: ${personId}`);
  }
  return person;
}

export function sortPersonIds(ids: readonly PersonId[]): PersonId[] {
  return [...ids].sort((a, b) => a.localeCompare(b));
}
