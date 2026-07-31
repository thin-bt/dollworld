import type {
  DeceasedActiveCompetitorPerson,
  DeceasedChildPerson,
  DeceasedRetiredPerson,
  DeceasedTraineePerson,
  Family,
  Lineage,
  LivingActiveCompetitorPerson,
  LivingChildPerson,
  LivingRetiredPerson,
  LivingTraineePerson,
  Person,
} from "../domain.js";
import type { ParticipationStatus, Rank } from "../enums.js";
import type { PersonDraft, InitialWorldDraftState } from "./draft.js";
import { InitialWorldGenerationError } from "./errors.js";

function requireDefined<T>(draft: PersonDraft, field: string, value: T | undefined): T {
  if (value === undefined) {
    throw new InitialWorldGenerationError("missing required person field", {
      personId: draft.personId,
      field,
    });
  }
  return value;
}

function buildNameAndCore(draft: PersonDraft) {
  const core = {
    personId: draft.personId,
    givenName: draft.givenName,
    familyName: draft.familyName,
    displayName: draft.displayName,
    nameDataVersion: draft.nameDataVersion,
    sex: draft.sex,
    birthYear: draft.birthYear,
    familyId: draft.familyId,
    abilities: draft.abilities,
    aptitudes: draft.aptitudes,
  };
  if (draft.lineageId !== undefined) {
    return { ...core, lineageId: draft.lineageId };
  }
  return core;
}

function assembleDeceased(draft: PersonDraft): Person {
  const core = buildNameAndCore(draft);
  const deathYear = requireDefined(draft, "deathYear", draft.deathYear);
  const ageAtDeath = requireDefined(draft, "ageAtDeath", draft.ageAtDeath);

  if (draft.careerStatus === "child") {
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: DeceasedChildPerson = {
      ...core,
      lifeStatus: "deceased",
      deathYear,
      ageAtDeath,
      careerStatus: "child",
      qualifiedMaster: false,
    };
    return person;
  }

  if (draft.careerStatus === "trainee") {
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: DeceasedTraineePerson = {
      ...core,
      lifeStatus: "deceased",
      deathYear,
      ageAtDeath,
      careerStatus: "trainee",
      qualifiedMaster: false,
    };
    return person;
  }

  if (draft.careerStatus === "active_competitor") {
    const highestRank = requireDefined(draft, "highestRank", draft.highestRank);
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: DeceasedActiveCompetitorPerson = {
      ...core,
      lifeStatus: "deceased",
      deathYear,
      ageAtDeath,
      careerStatus: "active_competitor",
      highestRank,
      qualifiedMaster: false,
    };
    return person;
  }

  const highestRank = requireDefined(draft, "highestRank", draft.highestRank);
  const retirementRank = requireDefined(draft, "retirementRank", draft.retirementRank);
  const person: DeceasedRetiredPerson = {
    ...core,
    lifeStatus: "deceased",
    deathYear,
    ageAtDeath,
    careerStatus: "retired",
    highestRank,
    retirementRank,
    qualifiedMaster: draft.qualifiedMaster,
  };
  return person;
}

function assembleLiving(draft: PersonDraft): Person {
  const core = buildNameAndCore(draft);
  const participationStatus: ParticipationStatus = requireDefined(
    draft,
    "participationStatus",
    draft.participationStatus,
  );
  const currentAge = requireDefined(draft, "currentAge", draft.currentAge);

  if (draft.careerStatus === "child") {
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: LivingChildPerson = {
      ...core,
      lifeStatus: "living",
      participationStatus,
      currentAge,
      careerStatus: "child",
      qualifiedMaster: false,
    };
    return person;
  }

  if (draft.careerStatus === "trainee") {
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: LivingTraineePerson = {
      ...core,
      lifeStatus: "living",
      participationStatus,
      currentAge,
      careerStatus: "trainee",
      qualifiedMaster: false,
    };
    return person;
  }

  if (draft.careerStatus === "active_competitor") {
    const currentRank: Rank = requireDefined(draft, "currentRank", draft.currentRank);
    const highestRank: Rank = requireDefined(draft, "highestRank", draft.highestRank);
    if (draft.qualifiedMaster !== false) {
      throw new InitialWorldGenerationError("invalid person field", {
        personId: draft.personId,
        field: "qualifiedMaster",
      });
    }
    const person: LivingActiveCompetitorPerson = {
      ...core,
      lifeStatus: "living",
      participationStatus,
      currentAge,
      careerStatus: "active_competitor",
      currentRank,
      highestRank,
      qualifiedMaster: false,
    };
    return person;
  }

  const retirementRank: Rank = requireDefined(draft, "retirementRank", draft.retirementRank);
  const highestRank: Rank = requireDefined(draft, "highestRank", draft.highestRank);
  const person: LivingRetiredPerson = {
    ...core,
    lifeStatus: "living",
    participationStatus,
    currentAge,
    careerStatus: "retired",
    retirementRank,
    highestRank,
    qualifiedMaster: draft.qualifiedMaster,
  };
  return person;
}

export function assemblePerson(draft: PersonDraft): Person {
  if (draft.lifeStatus === "deceased") {
    return assembleDeceased(draft);
  }
  return assembleLiving(draft);
}

export function assembleFamilies(state: InitialWorldDraftState): Family[] {
  return state.families.map((family) => ({
    familyId: family.familyId,
    familyName: family.familyName,
    status: family.status,
    baseBirthRate: family.baseBirthRate,
    initialHistory: family.initialHistory,
  }));
}

export function assembleLineages(state: InitialWorldDraftState): Lineage[] {
  return state.lineages.map((lineage) => ({
    lineageId: lineage.lineageId,
    lineageName: lineage.lineageName,
    focus: lineage.focus,
    founderPersonId: lineage.founderPersonId,
    founderFamilyId: lineage.founderFamilyId,
    status: lineage.status,
  }));
}

export function assemblePersons(state: InitialWorldDraftState): Person[] {
  return [...state.persons]
    .sort((a, b) => a.personId.localeCompare(b.personId))
    .map(assemblePerson);
}
