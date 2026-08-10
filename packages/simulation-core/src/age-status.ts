import type {
  LivingActiveCompetitorPerson,
  LivingChildPerson,
  LivingPerson,
  LivingRetiredPerson,
  LivingTraineePerson,
  Person,
} from "./domain.js";
import type { CareerStatus, Rank } from "./enums.js";
import { MINIMUM_RANK } from "./enums.js";
import type { PersonId } from "./ids.js";

export type AgeEligibility = {
  canEnterLineage: boolean;
  canDebut: boolean;
  canVoluntarilyRetire: boolean;
  mustRetire: boolean;
};

/**
 * Pure age/status eligibility derived from person state (00 / 01 mini-specs).
 * No persistent eligibility flags are stored on the person.
 */
export function deriveAgeEligibility(person: Person): AgeEligibility {
  if (person.lifeStatus !== "living") {
    return {
      canEnterLineage: false,
      canDebut: false,
      canVoluntarilyRetire: false,
      mustRetire: false,
    };
  }

  const active = person.participationStatus === "active";
  const age = person.currentAge;
  const notRetired = person.careerStatus !== "retired";
  const isActiveCompetitor = person.careerStatus === "active_competitor";

  return {
    canEnterLineage: active && notRetired && age >= 8 && age <= 41,
    canDebut:
      active &&
      (person.careerStatus === "child" || person.careerStatus === "trainee") &&
      age >= 16 &&
      age <= 41,
    canVoluntarilyRetire: active && isActiveCompetitor && age >= 18 && age <= 41,
    mustRetire: isActiveCompetitor && age >= 42,
  };
}

export function computeCurrentAge(currentWorldYear: number, birthYear: number): number {
  if (!Number.isSafeInteger(currentWorldYear) || !Number.isSafeInteger(birthYear)) {
    throw new Error("currentWorldYear and birthYear must be safe integers");
  }
  const age = currentWorldYear - birthYear;
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new Error(`computed age must be a non-negative safe integer (got ${String(age)})`);
  }
  return age;
}

export type CareerTransitionResult = {
  person: LivingPerson;
  transitions: PersonCareerTransition[];
};

export type PersonCareerTransition =
  | {
      kind: "career_status_changed";
      personId: PersonId;
      previousCareerStatus: CareerStatus;
      nextCareerStatus: CareerStatus;
    }
  | {
      kind: "person_debuted";
      personId: PersonId;
      rank: Rank;
      previousCareerStatus: CareerStatus;
      nextCareerStatus: "active_competitor";
    }
  | {
      kind: "person_force_retired";
      personId: PersonId;
      retirementRank: Rank;
      highestRank: Rank;
      previousCareerStatus: "active_competitor";
      nextCareerStatus: "retired";
    };

/**
 * Apply age-based Sprint 0 career updates after currentAge has been recalculated.
 */
export function applyAgeBasedCareerUpdates(person: LivingPerson): CareerTransitionResult {
  const age = person.currentAge;
  const transitions: PersonCareerTransition[] = [];
  let current: LivingPerson = person;

  if (current.careerStatus === "child" && age >= 8 && age < 16) {
    const previous = current.careerStatus;
    current = toTrainee(current, age);
    transitions.push({
      kind: "career_status_changed",
      personId: current.personId,
      previousCareerStatus: previous,
      nextCareerStatus: "trainee",
    });
  }

  if ((current.careerStatus === "child" || current.careerStatus === "trainee") && age >= 16) {
    const previous = current.careerStatus;
    current = toActiveCompetitor(current, age);
    transitions.push({
      kind: "career_status_changed",
      personId: current.personId,
      previousCareerStatus: previous,
      nextCareerStatus: "active_competitor",
    });
    transitions.push({
      kind: "person_debuted",
      personId: current.personId,
      rank: MINIMUM_RANK,
      previousCareerStatus: previous,
      nextCareerStatus: "active_competitor",
    });
  }

  if (current.careerStatus === "active_competitor" && age >= 42) {
    const previousRank = current.currentRank;
    const highestRank = current.highestRank;
    current = toRetired(current, age);
    transitions.push({
      kind: "career_status_changed",
      personId: current.personId,
      previousCareerStatus: "active_competitor",
      nextCareerStatus: "retired",
    });
    transitions.push({
      kind: "person_force_retired",
      personId: current.personId,
      retirementRank: previousRank,
      highestRank,
      previousCareerStatus: "active_competitor",
      nextCareerStatus: "retired",
    });
  }

  return { person: current, transitions };
}

export function withRecalculatedAge(person: LivingPerson, targetWorldYear: number): LivingPerson {
  if (!Number.isSafeInteger(targetWorldYear)) {
    throw new Error(`targetWorldYear must be a safe integer (got ${String(targetWorldYear)})`);
  }

  const { birthYear, currentAge } = person;
  if (!Number.isSafeInteger(birthYear)) {
    throw new Error(`birthYear must be a safe integer (got ${String(birthYear)})`);
  }
  if (!Number.isSafeInteger(currentAge) || currentAge < 0) {
    throw new Error(`currentAge must be a non-negative safe integer (got ${String(currentAge)})`);
  }

  const currentPersonWorldYear = birthYear + currentAge;
  if (!Number.isSafeInteger(currentPersonWorldYear)) {
    throw new Error(
      `currentPersonWorldYear must be a safe integer (got ${String(currentPersonWorldYear)})`,
    );
  }
  if (targetWorldYear < currentPersonWorldYear) {
    throw new Error(
      `cannot regress person age: targetWorldYear=${String(targetWorldYear)} < currentPersonWorldYear=${String(currentPersonWorldYear)}`,
    );
  }

  const newAge = computeCurrentAge(targetWorldYear, birthYear);
  switch (person.careerStatus) {
    case "child":
      return { ...person, currentAge: newAge };
    case "trainee":
      return { ...person, currentAge: newAge };
    case "active_competitor":
      return { ...person, currentAge: newAge };
    case "retired":
      return { ...person, currentAge: newAge };
  }
}

function toTrainee(person: LivingChildPerson, age: number): LivingTraineePerson {
  return {
    personId: person.personId,
    givenName: person.givenName,
    familyName: person.familyName,
    displayName: person.displayName,
    nameDataVersion: person.nameDataVersion,
    sex: person.sex,
    birthYear: person.birthYear,
    familyId: person.familyId,
    abilities: person.abilities,
    aptitudes: person.aptitudes,
    ...(person.lineageId === undefined ? {} : { lineageId: person.lineageId }),
    ...(person.sprint1State === undefined ? {} : { sprint1State: person.sprint1State }),
    lifeStatus: "living",
    participationStatus: person.participationStatus,
    currentAge: age,
    careerStatus: "trainee",
    qualifiedMaster: false,
  };
}

function toActiveCompetitor(
  person: LivingChildPerson | LivingTraineePerson,
  age: number,
): LivingActiveCompetitorPerson {
  return {
    personId: person.personId,
    givenName: person.givenName,
    familyName: person.familyName,
    displayName: person.displayName,
    nameDataVersion: person.nameDataVersion,
    sex: person.sex,
    birthYear: person.birthYear,
    familyId: person.familyId,
    abilities: person.abilities,
    aptitudes: person.aptitudes,
    ...(person.lineageId === undefined ? {} : { lineageId: person.lineageId }),
    ...(person.sprint1State === undefined ? {} : { sprint1State: person.sprint1State }),
    lifeStatus: "living",
    participationStatus: person.participationStatus,
    currentAge: age,
    careerStatus: "active_competitor",
    currentRank: MINIMUM_RANK,
    highestRank: MINIMUM_RANK,
    qualifiedMaster: false,
  };
}

function toRetired(person: LivingActiveCompetitorPerson, age: number): LivingRetiredPerson {
  return {
    personId: person.personId,
    givenName: person.givenName,
    familyName: person.familyName,
    displayName: person.displayName,
    nameDataVersion: person.nameDataVersion,
    sex: person.sex,
    birthYear: person.birthYear,
    familyId: person.familyId,
    abilities: person.abilities,
    aptitudes: person.aptitudes,
    ...(person.lineageId === undefined ? {} : { lineageId: person.lineageId }),
    ...(person.sprint1State === undefined ? {} : { sprint1State: person.sprint1State }),
    lifeStatus: "living",
    participationStatus: person.participationStatus,
    currentAge: age,
    careerStatus: "retired",
    retirementRank: person.currentRank,
    highestRank: person.highestRank,
    qualifiedMaster: person.qualifiedMaster,
  };
}

export function isLivingPerson(person: Person): person is LivingPerson {
  return person.lifeStatus === "living";
}
