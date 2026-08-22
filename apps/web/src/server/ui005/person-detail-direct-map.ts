/**
 * PersonDetail direct mapping primitives (BRIDGE-043/065/073/078/092, TX-035/044/049/063).
 * Future owner: UI-005. No Historical generalization. No route/session.
 */

import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  computeCurrentAge,
  type AbilityKey,
  type AptitudeKey,
} from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";
import type {
  AptitudeSetView,
  PersonDetailDirectFields,
  RankProjection,
  StatSetView,
  TemporaryConditionView,
} from "./types.js";

export type PersonDetailSource = {
  personId: string;
  familyId: string;
  lineageId?: string;
  lifeStatus: "living" | "deceased";
  careerStatus: "child" | "trainee" | "active_competitor" | "retired";
  qualifiedMaster: boolean;
  currentAge?: number;
  birthYear: number;
  deathYear?: number;
  ageAtDeath?: number;
  currentRank?: string;
  highestRank?: string;
  retirementRank?: string;
  abilities: Record<string, { surfaceValue: number }>;
  aptitudes: Record<string, { surfaceValue: number }>;
  sprint1State?: {
    currentMental: number;
    learningFocusTechniqueId: string | null;
  };
};

export type TemporaryConditionSource = {
  fatigue: number;
  injury: number;
  condition: number;
  confidence: number;
};

function projectRanks(person: PersonDetailSource): PureResult<RankProjection> {
  const { lifeStatus, careerStatus } = person;
  if (careerStatus === "child" || careerStatus === "trainee") {
    if (
      person.currentRank !== undefined ||
      person.highestRank !== undefined ||
      person.retirementRank !== undefined
    ) {
      return fail("rank fields present for child/trainee");
    }
    if (person.qualifiedMaster !== false) {
      return fail("qualifiedMaster must be false for child/trainee");
    }
    return ok({ currentRank: null, highestRank: null, retirementRank: null });
  }
  if (careerStatus === "active_competitor") {
    if (person.qualifiedMaster !== false) {
      return fail("qualifiedMaster must be false for active_competitor");
    }
    if (person.retirementRank !== undefined) {
      return fail("retirementRank forbidden for active_competitor");
    }
    if (person.highestRank === undefined) {
      return fail("highestRank required for active_competitor");
    }
    if (lifeStatus === "living") {
      if (person.currentRank === undefined) {
        return fail("currentRank required for living active_competitor");
      }
      return ok({
        currentRank: person.currentRank,
        highestRank: person.highestRank,
        retirementRank: null,
      });
    }
    if (person.currentRank !== undefined) {
      return fail("currentRank must be absent for deceased active_competitor");
    }
    return ok({
      currentRank: null,
      highestRank: person.highestRank,
      retirementRank: null,
    });
  }
  // retired
  if (typeof person.qualifiedMaster !== "boolean") {
    return fail("qualifiedMaster required boolean for retired");
  }
  if (person.highestRank === undefined || person.retirementRank === undefined) {
    return fail("highestRank and retirementRank required for retired");
  }
  if (person.currentRank !== undefined) {
    return fail("currentRank must be absent for retired");
  }
  return ok({
    currentRank: null,
    highestRank: person.highestRank,
    retirementRank: person.retirementRank,
  });
}

function mapStats(abilities: PersonDetailSource["abilities"]): PureResult<StatSetView> {
  const stats = {} as StatSetView;
  for (const key of ABILITY_KEYS) {
    const triple = abilities[key];
    if (triple === undefined || typeof triple.surfaceValue !== "number") {
      return fail(`missing ability surfaceValue: ${key}`);
    }
    stats[key as AbilityKey] = triple.surfaceValue;
  }
  return ok(stats);
}

function mapAptitudes(aptitudes: PersonDetailSource["aptitudes"]): PureResult<AptitudeSetView> {
  const out = {} as AptitudeSetView;
  for (const key of APTITUDE_KEYS) {
    const triple = aptitudes[key];
    if (triple === undefined || typeof triple.surfaceValue !== "number") {
      return fail(`missing aptitude surfaceValue: ${key}`);
    }
    out[key as AptitudeKey] = triple.surfaceValue;
  }
  return ok(out);
}

function validateTemporaryCondition(
  tc: TemporaryConditionSource,
): PureResult<TemporaryConditionView> {
  const { fatigue, injury, condition, confidence } = tc;
  for (const [name, value, min, max] of [
    ["fatigue", fatigue, 0, 100],
    ["injury", injury, 0, 100],
    ["condition", condition, -20, 20],
    ["confidence", confidence, -20, 20],
  ] as const) {
    if (!Number.isInteger(value) || value < min || value > max) {
      return fail(`${name} out of range`);
    }
  }
  return ok({ fatigue, injury, condition, confidence });
}

/**
 * Direct map PersonDetail core fields from a validated same-snapshot source.
 * computeCurrentAge is cross-check only for living age; wire age = currentAge.
 */
export function mapPersonDetailDirect(input: {
  person: PersonDetailSource;
  temporaryCondition: TemporaryConditionSource;
  worldYear: number;
}): PureResult<PersonDetailDirectFields> {
  const { person, temporaryCondition, worldYear } = input;
  const ranks = projectRanks(person);
  if (!ranks.ok) {
    return ranks;
  }
  const stats = mapStats(person.abilities);
  if (!stats.ok) {
    return stats;
  }
  const aptitudes = mapAptitudes(person.aptitudes);
  if (!aptitudes.ok) {
    return aptitudes;
  }
  const tc = validateTemporaryCondition(temporaryCondition);
  if (!tc.ok) {
    return tc;
  }
  if (person.sprint1State === undefined) {
    return fail("sprint1State required");
  }
  const spirit = stats.value.spirit;
  const mentalMax = 50 + spirit;
  const { currentMental, learningFocusTechniqueId } = person.sprint1State;
  if (!Number.isInteger(currentMental) || currentMental < 0 || currentMental > mentalMax) {
    return fail("currentMental out of range for spirit");
  }

  let age: number | null;
  let deathYear: number | null = null;
  let ageAtDeath: number | null = null;
  if (person.lifeStatus === "living") {
    if (person.currentAge === undefined) {
      return fail("currentAge required for living");
    }
    const derived = computeCurrentAge(worldYear, person.birthYear);
    if (derived !== person.currentAge) {
      return fail("currentAge mismatch vs computeCurrentAge");
    }
    age = person.currentAge;
  } else {
    if (person.deathYear === undefined || person.ageAtDeath === undefined) {
      return fail("deathYear/ageAtDeath required for deceased");
    }
    age = null;
    deathYear = person.deathYear;
    ageAtDeath = person.ageAtDeath;
  }

  const lineageId =
    Object.prototype.hasOwnProperty.call(person, "lineageId") && person.lineageId !== undefined
      ? person.lineageId
      : null;

  return ok({
    familyId: person.familyId,
    lineageId,
    ...ranks.value,
    stats: stats.value,
    aptitudes: aptitudes.value,
    temporaryCondition: tc.value,
    currentMental,
    qualifiedMaster: person.qualifiedMaster,
    age,
    deathYear,
    ageAtDeath,
    learningFocusTechniqueId,
  });
}
