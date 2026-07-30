import type { AbilityScores, AptitudeScores } from "./abilities.js";
import type {
  CareerStatus,
  FamilyStatus,
  LifeStatus,
  LineageFocus,
  LineageStatus,
  ParentRole,
  ParticipationStatus,
  Rank,
  Sex,
} from "./enums.js";
import type { FamilyId, LineageId, PersonId, RelationshipId } from "./ids.js";

export type PersonName = {
  givenName: string;
  familyName: string;
  displayName: string;
  nameDataVersion: string;
};

type PersonCore = PersonName & {
  personId: PersonId;
  sex: Sex;
  birthYear: number;
  familyId: FamilyId;
  abilities: AbilityScores;
  aptitudes: AptitudeScores;
  lineageId?: LineageId;
};

type LivingPersonShared = PersonCore & {
  lifeStatus: Extract<LifeStatus, "living">;
  participationStatus: ParticipationStatus;
  currentAge: number;
  deathYear?: never;
  ageAtDeath?: never;
};

export type LivingChildPerson = LivingPersonShared & {
  careerStatus: Extract<CareerStatus, "child">;
  currentRank?: never;
  highestRank?: never;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type LivingTraineePerson = LivingPersonShared & {
  careerStatus: Extract<CareerStatus, "trainee">;
  currentRank?: never;
  highestRank?: never;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type LivingActiveCompetitorPerson = LivingPersonShared & {
  careerStatus: Extract<CareerStatus, "active_competitor">;
  currentRank: Rank;
  highestRank: Rank;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type LivingRetiredPerson = LivingPersonShared & {
  careerStatus: Extract<CareerStatus, "retired">;
  currentRank?: never;
  retirementRank: Rank;
  highestRank: Rank;
  qualifiedMaster: boolean;
};

export type LivingPerson =
  LivingChildPerson | LivingTraineePerson | LivingActiveCompetitorPerson | LivingRetiredPerson;

type DeceasedPersonShared = PersonCore & {
  lifeStatus: Extract<LifeStatus, "deceased">;
  deathYear: number;
  ageAtDeath: number;
  participationStatus?: never;
  currentAge?: never;
  currentRank?: never;
};

export type DeceasedChildPerson = DeceasedPersonShared & {
  careerStatus: Extract<CareerStatus, "child">;
  highestRank?: never;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type DeceasedTraineePerson = DeceasedPersonShared & {
  careerStatus: Extract<CareerStatus, "trainee">;
  highestRank?: never;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type DeceasedActiveCompetitorPerson = DeceasedPersonShared & {
  careerStatus: Extract<CareerStatus, "active_competitor">;
  highestRank: Rank;
  retirementRank?: never;
  qualifiedMaster: false;
};

export type DeceasedRetiredPerson = DeceasedPersonShared & {
  careerStatus: Extract<CareerStatus, "retired">;
  highestRank: Rank;
  retirementRank: Rank;
  qualifiedMaster: boolean;
};

export type DeceasedPerson =
  | DeceasedChildPerson
  | DeceasedTraineePerson
  | DeceasedActiveCompetitorPerson
  | DeceasedRetiredPerson;

export type Person = LivingPerson | DeceasedPerson;

export type Family = {
  familyId: FamilyId;
  familyName: string;
  status: FamilyStatus;
  baseBirthRate: number;
  initialHistory: boolean;
};

export type Lineage = {
  lineageId: LineageId;
  lineageName: string;
  focus: LineageFocus;
  founderPersonId: PersonId;
  founderFamilyId: FamilyId;
  status: LineageStatus;
};

export type ParentChildRelationship = {
  relationshipId: RelationshipId;
  kind: "parent_child";
  parentId: PersonId;
  childId: PersonId;
  parentRole: ParentRole;
};

export type MarriageRelationship = {
  relationshipId: RelationshipId;
  kind: "marriage";
  personAId: PersonId;
  personBId: PersonId;
};

export type MasterDiscipleRelationship = {
  relationshipId: RelationshipId;
  kind: "master_disciple";
  masterId: PersonId;
  discipleId: PersonId;
};

export type Relationship =
  ParentChildRelationship | MarriageRelationship | MasterDiscipleRelationship;
