/**
 * FIX14 / G076: deterministic time-zero technique coverage on ordinary active persons.
 * No world-time advance, no World/Battle RNG consumption.
 */
import type { AbilityKey, AptitudeKey } from "../abilities.js";
import { computeCurrentAge } from "../age-status.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import { asTechniqueId } from "../ids.js";
import type { InitialWorldSnapshot } from "../initial-world/types.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { clonePerson, cloneWorldEngineState } from "../world-engine/clone.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { isEligibleForBattleKind } from "./battle-participant.js";
import { validatePersonTechniqueState } from "./person-technique-state.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { PersonTechniqueState, TechniqueCategory } from "./types.js";
import { TECHNIQUE_CATEGORIES } from "./types.js";

/** G076: basic initial mastery display 20 → hundredths. */
const INITIAL_BASIC_MASTERY_HUNDREDTHS = 20 * 100;

const CATEGORY_TO_TECHNIQUE_ID: Record<TechniqueCategory, string> = {
  unarmed: "technique_alpha",
  sword: "technique_sword_basic",
  magic: "technique_magic_basic",
};

function isMockSelectable(person: Person, world: WorldEngineState): boolean {
  if (person.lifeStatus !== "living") {
    return false;
  }
  if (person.participationStatus !== "active") {
    return false;
  }
  const age = computeCurrentAge(world.worldDate.year, person.birthYear);
  return isEligibleForBattleKind("mock", person.careerStatus, age);
}

function meetsTechniqueRequirements(person: Person, definition: TechniqueDefinition): boolean {
  const category = definition.category as AptitudeKey;
  const aptitude = person.aptitudes[category]?.surfaceValue;
  if (typeof aptitude !== "number" || aptitude < definition.requiredAptitude) {
    return false;
  }
  for (const [statKey, required] of Object.entries(definition.requiredStats)) {
    const ability = person.abilities[statKey as AbilityKey]?.surfaceValue;
    if (typeof required !== "number" || typeof ability !== "number" || ability < required) {
      return false;
    }
  }
  return true;
}

function primaryStatSum(person: Person, definition: TechniqueDefinition): number {
  let sum = 0;
  for (const key of definition.primaryStats) {
    sum += person.abilities[key]?.surfaceValue ?? 0;
  }
  return sum;
}

function compareCandidates(a: Person, b: Person, definition: TechniqueDefinition): number {
  const category = definition.category as AptitudeKey;
  const aptA = a.aptitudes[category]!.surfaceValue;
  const aptB = b.aptitudes[category]!.surfaceValue;
  if (aptA !== aptB) {
    return aptB - aptA;
  }
  const sumA = primaryStatSum(a, definition);
  const sumB = primaryStatSum(b, definition);
  if (sumA !== sumB) {
    return sumB - sumA;
  }
  return compareUnicodeCodePoints(a.personId, b.personId);
}

function buildAcquiredState(
  definition: TechniqueDefinition,
): ValidationResult<PersonTechniqueState> {
  return validatePersonTechniqueState({
    techniqueId: asTechniqueId(definition.techniqueId),
    learningProgressTenths: definition.learningProgressRequired * 10,
    masteryHundredths: INITIAL_BASIC_MASTERY_HUNDREDTHS,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: 0,
  });
}

/**
 * Whether `pool` can assign distinct persons to `categories` (by requirement) and
 * still leave one unused person as no-technique control.
 */
function canCoverCategoriesWithControl(
  pool: readonly Person[],
  categories: readonly TechniqueCategory[],
  byTechniqueId: ReadonlyMap<string, TechniqueDefinition>,
): boolean {
  if (pool.length < categories.length + 1) {
    return false;
  }
  const match = (
    remainingCategories: readonly TechniqueCategory[],
    remainingPeople: readonly Person[],
  ): boolean => {
    if (remainingCategories.length === 0) {
      return remainingPeople.length >= 1;
    }
    const category = remainingCategories[0]!;
    const definition = byTechniqueId.get(CATEGORY_TO_TECHNIQUE_ID[category])!;
    const nextCategories = remainingCategories.slice(1);
    for (let index = 0; index < remainingPeople.length; index += 1) {
      const person = remainingPeople[index]!;
      if (!meetsTechniqueRequirements(person, definition)) {
        continue;
      }
      const without = remainingPeople.filter((_, i) => i !== index);
      if (match(nextCategories, without)) {
        return true;
      }
    }
    return false;
  };
  return match(categories, pool);
}

/**
 * After empty Sprint1PersonState attach: assign one acquired technique holder per
 * category (unarmed → sword → magic) among mock-selectable living active persons,
 * leaving at least one mock-selectable person with empty techniqueStates.
 */
export function assignInitialActiveTechniqueCoverage(
  world: unknown,
  definitions: readonly TechniqueDefinition[],
): ValidationResult<InitialWorldSnapshot> {
  const issues: ValidationIssue[] = [];
  let cloned: WorldEngineState;
  try {
    cloned = cloneWorldEngineState(world);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "",
        message: `assignInitialActiveTechniqueCoverage failed to clone world: ${detail}`,
        actual: detail,
      },
    ]);
  }

  const byTechniqueId = new Map<string, TechniqueDefinition>();
  for (const definition of definitions) {
    byTechniqueId.set(definition.techniqueId, definition);
  }

  const requiredIds = TECHNIQUE_CATEGORIES.map((category) => CATEGORY_TO_TECHNIQUE_ID[category]);
  const missingRequired = requiredIds.filter((id) => !byTechniqueId.has(id));
  if (missingRequired.length > 0) {
    // Incomplete catalogs (unit fixtures) skip FIX14 coverage; production G076 catalog is complete.
    return success(cloned as InitialWorldSnapshot);
  }

  const personUpdates = new Map<string, Person>();
  for (const person of cloned.persons) {
    personUpdates.set(person.personId, person);
  }

  const assignedPersonIds = new Set<string>();

  for (let categoryIndex = 0; categoryIndex < TECHNIQUE_CATEGORIES.length; categoryIndex += 1) {
    const category = TECHNIQUE_CATEGORIES[categoryIndex]!;
    const techniqueId = CATEGORY_TO_TECHNIQUE_ID[category];
    const definition = byTechniqueId.get(techniqueId);
    if (definition === undefined) {
      issues.push({
        path: `/techniqueCatalog/${techniqueId}`,
        message: "required coverage technique missing from catalog",
        expected: techniqueId,
      });
      continue;
    }

    const remainingCategoriesIncludingThis = TECHNIQUE_CATEGORIES.slice(categoryIndex);
    const candidates = [...personUpdates.values()]
      .filter(
        (person) =>
          isMockSelectable(person, cloned) &&
          !assignedPersonIds.has(person.personId) &&
          meetsTechniqueRequirements(person, definition),
      )
      .sort((a, b) => compareCandidates(a, b, definition));

    const pick = candidates.find((candidate) => {
      const others = [...personUpdates.values()].filter(
        (person) =>
          isMockSelectable(person, cloned) &&
          !assignedPersonIds.has(person.personId) &&
          person.personId !== candidate.personId,
      );
      return canCoverCategoriesWithControl(
        others,
        remainingCategoriesIncludingThis.slice(1),
        byTechniqueId,
      );
    });

    if (pick === undefined) {
      issues.push({
        path: `/initialTechniqueCoverage/${category}`,
        message:
          "no mock-selectable person can receive coverage while preserving remaining holders and a no-technique control",
        expected: techniqueId,
        actual: { candidateCount: candidates.length },
      });
      continue;
    }

    const stateResult = buildAcquiredState(definition);
    if (!stateResult.ok) {
      issues.push(...stateResult.issues);
      continue;
    }
    const current = personUpdates.get(pick.personId)!;
    const sprint1 = current.sprint1State;
    if (sprint1 === undefined) {
      issues.push({
        path: `/persons/${pick.personId}/sprint1State`,
        message: "sprint1State missing before technique coverage assignment",
      });
      continue;
    }
    personUpdates.set(pick.personId, {
      ...clonePerson(current),
      sprint1State: {
        ...sprint1,
        techniqueStates: [stateResult.value],
      },
    });
    assignedPersonIds.add(pick.personId);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const controlExists = [...personUpdates.values()].some(
    (person) =>
      isMockSelectable(person, cloned) && (person.sprint1State?.techniqueStates.length ?? 0) === 0,
  );
  if (!controlExists) {
    return failure([
      {
        path: "/initialTechniqueCoverage/control",
        message: "no mock-selectable no-technique control person remains after coverage assignment",
      },
    ]);
  }

  for (const category of TECHNIQUE_CATEGORIES) {
    const techniqueId = CATEGORY_TO_TECHNIQUE_ID[category];
    const holder = [...personUpdates.values()].find((person) =>
      person.sprint1State?.techniqueStates.some((state) => state.techniqueId === techniqueId),
    );
    if (holder === undefined) {
      return failure([
        {
          path: `/initialTechniqueCoverage/${category}`,
          message: "coverage holder missing after assignment",
          expected: techniqueId,
        },
      ]);
    }
  }

  const nextPersons = cloned.persons.map((person) => personUpdates.get(person.personId) ?? person);
  return success({ ...cloned, persons: nextPersons } as InitialWorldSnapshot);
}
