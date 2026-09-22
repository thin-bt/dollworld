/**
 * Person → PersonListItemView 0.2.0 exact16 projection (API-007).
 */

import {
  computeCurrentAge,
  type Person,
  type Rank,
  validateSprint1PersonState,
} from "@shared-world/simulation-core";
import type { PeopleListPerson } from "./people/page-people.js";

const PERSON_LIST_ITEM_KEYS = [
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

function projectStats(person: Person): StatSetView | null {
  const a = person.abilities;
  if (
    a === undefined ||
    a.stamina === undefined ||
    a.strength === undefined ||
    a.skill === undefined ||
    a.speed === undefined ||
    a.spirit === undefined ||
    a.magic === undefined
  ) {
    return null;
  }
  return {
    stamina: a.stamina.surfaceValue,
    strength: a.strength.surfaceValue,
    skill: a.skill.surfaceValue,
    speed: a.speed.surfaceValue,
    spirit: a.spirit.surfaceValue,
    magic: a.magic.surfaceValue,
  };
}

export function projectPersonStatsAndAptitudes(
  person: Person,
): { stats: StatSetView; aptitudes: AptitudeSetView } | null {
  const stats = projectStats(person);
  const aptitudes = projectAptitudes(person);
  if (stats === null || aptitudes === null) {
    return null;
  }
  return { stats, aptitudes };
}

function projectAptitudes(person: Person): AptitudeSetView | null {
  const a = person.aptitudes;
  if (
    a === undefined ||
    a.unarmed === undefined ||
    a.sword === undefined ||
    a.magic === undefined
  ) {
    return null;
  }
  return {
    unarmed: a.unarmed.surfaceValue,
    sword: a.sword.surfaceValue,
    magic: a.magic.surfaceValue,
  };
}

function projectRanks(person: Person): {
  currentRank: Rank | null;
  highestRank: Rank | null;
  retirementRank: Rank | null;
} | null {
  if (person.careerStatus === "child" || person.careerStatus === "trainee") {
    return { currentRank: null, highestRank: null, retirementRank: null };
  }
  if (person.careerStatus === "active_competitor") {
    if (person.lifeStatus === "living") {
      if (person.currentRank === undefined || person.highestRank === undefined) {
        return null;
      }
      return {
        currentRank: person.currentRank,
        highestRank: person.highestRank,
        retirementRank: null,
      };
    }
    if (person.highestRank === undefined) {
      return null;
    }
    return {
      currentRank: null,
      highestRank: person.highestRank,
      retirementRank: null,
    };
  }
  // retired
  if (person.highestRank === undefined || person.retirementRank === undefined) {
    return null;
  }
  return {
    currentRank: null,
    highestRank: person.highestRank,
    retirementRank: person.retirementRank,
  };
}

function learnedTechniqueCount(person: Person): number | null {
  if (person.sprint1State === undefined) {
    return null;
  }
  const validated = validateSprint1PersonState(person.sprint1State, {
    spiritSurfaceValue: person.abilities.spirit.surfaceValue,
  });
  if (!validated.ok) {
    return null;
  }
  let count = 0;
  for (const entry of validated.value.techniqueStates) {
    if (entry.acquiredAbsoluteWeek !== null) {
      count += 1;
    }
  }
  return count;
}

/**
 * Strict-project one Person into PersonListItemView.
 * Returns null on any canonical mapping/validation failure (route → 500).
 */
export function projectPersonListItem(
  person: Person,
  worldYear: number,
): PersonListItemView | null {
  if (typeof person.personId !== "string" || person.personId.length === 0) {
    return null;
  }
  if (typeof person.displayName !== "string" || person.displayName.length === 0) {
    return null;
  }
  if (typeof person.familyId !== "string" || person.familyId.length === 0) {
    return null;
  }

  const stats = projectStats(person);
  const aptitudes = projectAptitudes(person);
  if (stats === null || aptitudes === null) {
    return null;
  }

  const ranks = projectRanks(person);
  if (ranks === null) {
    return null;
  }

  const techniqueCount = learnedTechniqueCount(person);
  if (techniqueCount === null) {
    return null;
  }

  const lineageId =
    Object.prototype.hasOwnProperty.call(person, "lineageId") && person.lineageId !== undefined
      ? person.lineageId
      : null;

  let age: number | null;
  let deathYear: number | null;
  let ageAtDeath: number | null;
  let participationStatus: PersonListItemView["participationStatus"];

  if (person.lifeStatus === "living") {
    if (
      typeof person.currentAge !== "number" ||
      !Number.isInteger(person.currentAge) ||
      person.participationStatus === undefined
    ) {
      return null;
    }
    const derived = computeCurrentAge(worldYear, person.birthYear);
    if (person.currentAge !== derived) {
      return null;
    }
    age = person.currentAge;
    deathYear = null;
    ageAtDeath = null;
    participationStatus = person.participationStatus;
  } else if (person.lifeStatus === "deceased") {
    if (
      typeof person.deathYear !== "number" ||
      !Number.isInteger(person.deathYear) ||
      typeof person.ageAtDeath !== "number" ||
      !Number.isInteger(person.ageAtDeath)
    ) {
      return null;
    }
    if (person.ageAtDeath !== person.deathYear - person.birthYear) {
      return null;
    }
    age = null;
    deathYear = person.deathYear;
    ageAtDeath = person.ageAtDeath;
    participationStatus = null;
  } else {
    return null;
  }

  const view: PersonListItemView = {
    personId: person.personId,
    displayName: person.displayName,
    lifeStatus: person.lifeStatus,
    participationStatus,
    careerStatus: person.careerStatus,
    age,
    deathYear,
    ageAtDeath,
    familyId: person.familyId,
    lineageId,
    currentRank: ranks.currentRank,
    highestRank: ranks.highestRank,
    retirementRank: ranks.retirementRank,
    stats,
    aptitudes,
    learnedTechniqueCount: techniqueCount,
  };

  const keys = Object.keys(view);
  if (
    keys.length !== PERSON_LIST_ITEM_KEYS.length ||
    !PERSON_LIST_ITEM_KEYS.every((k) => keys.includes(k))
  ) {
    return null;
  }
  return view;
}

export function toPeopleListPerson(person: Person, item: PersonListItemView): PeopleListPerson {
  return {
    personId: item.personId,
    displayName: item.displayName,
    lifeStatus: item.lifeStatus,
    ...(item.participationStatus !== null ? { participationStatus: item.participationStatus } : {}),
    careerStatus: item.careerStatus,
    abilities: {
      stamina: { surfaceValue: item.stats.stamina },
      strength: { surfaceValue: item.stats.strength },
      skill: { surfaceValue: item.stats.skill },
      speed: { surfaceValue: item.stats.speed },
      spirit: { surfaceValue: item.stats.spirit },
      magic: { surfaceValue: item.stats.magic },
    },
    aptitudes: {
      unarmed: { surfaceValue: item.aptitudes.unarmed },
      sword: { surfaceValue: item.aptitudes.sword },
      magic: { surfaceValue: item.aptitudes.magic },
    },
  };
}

export function projectMockBattleCandidateView(
  person: Person,
  worldYear: number,
): MockBattleCandidateView | null {
  if (person.lifeStatus !== "living") {
    return null;
  }
  if (person.careerStatus !== "trainee" && person.careerStatus !== "active_competitor") {
    return null;
  }
  if (typeof person.currentAge !== "number" || !Number.isInteger(person.currentAge)) {
    return null;
  }
  const derived = computeCurrentAge(worldYear, person.birthYear);
  if (person.currentAge !== derived) {
    return null;
  }
  if (typeof person.displayName !== "string" || person.displayName.length === 0) {
    return null;
  }
  return {
    personId: person.personId,
    displayName: person.displayName,
    age: person.currentAge,
    careerStatus: person.careerStatus,
  };
}

export function assertExactKeys(value: object, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((k) => keys.includes(k));
}
