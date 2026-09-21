/**
 * S03-021 world-step persistence: apply accepted explicit weekly teach outcomes to Person technique state.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import { asTechniqueId } from "../ids.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import { validatePersonTechniqueState } from "../sprint1/person-technique-state.js";
import { evaluateTechniqueAcquisitionConditions } from "../sprint1/technique-acquisition.js";
import type { TechniqueCatalog } from "../sprint1/technique-catalog.js";
import { deriveInitialMasteryHundredths } from "../sprint1/technique-mastery.js";
import type { Sprint1Config } from "../sprint1/types.js";
import type { PersonTechniqueState } from "../sprint1/types.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { Sprint3CompletedExplicitWeeklyTeachOutcomeEntry } from "./sprint3-mentorship-entrypoint-runtime-state.js";

export type ApplyExplicitWeeklyTeachOutcomesInput = {
  worldState: WorldEngineState;
  absoluteWeek: number;
  sprint1Config: Sprint1Config;
  techniqueCatalog: TechniqueCatalog;
  completedEntries: readonly Sprint3CompletedExplicitWeeklyTeachOutcomeEntry[];
};

function definitionById(catalog: TechniqueCatalog, techniqueId: string) {
  return catalog.definitions.find((entry) => entry.techniqueId === techniqueId);
}

function ensureTechniqueState(
  states: PersonTechniqueState[],
  techniqueId: string,
): PersonTechniqueState {
  const existing = states.find((entry) => entry.techniqueId === techniqueId);
  if (existing !== undefined) {
    return existing;
  }
  const created: PersonTechniqueState = {
    techniqueId: asTechniqueId(techniqueId),
    acquiredAbsoluteWeek: null,
    masteryHundredths: 0,
    learningProgressTenths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
  };
  states.push(created);
  states.sort((left, right) => compareUnicodeCodePoints(left.techniqueId, right.techniqueId));
  return created;
}

function applyAcceptedTeachingToPerson(input: {
  person: Person;
  techniqueId: string;
  absoluteWeek: number;
  sprint1Config: Sprint1Config;
  catalog: TechniqueCatalog;
}): ValidationResult<Person> {
  const definition = definitionById(input.catalog, input.techniqueId);
  if (definition === undefined) {
    return failure([
      {
        path: "/techniqueId",
        message: "techniqueId is missing from technique catalog",
        actual: input.techniqueId,
        expected: "known TechniqueDefinition",
      },
    ]);
  }
  const sprint1State = input.person.sprint1State;
  if (sprint1State === undefined) {
    return failure([
      {
        path: "/person/sprint1State",
        message: "sprint1State is required to persist explicit weekly teach progress",
      },
    ]);
  }

  const nextTechniqueStates = sprint1State.techniqueStates.map((state) =>
    cloneValidatedPlainJson(state),
  );
  const techniqueState = ensureTechniqueState(nextTechniqueStates, input.techniqueId);
  if (techniqueState.acquiredAbsoluteWeek !== null) {
    return success(input.person);
  }

  const progressCapTenths = definition.learningProgressRequired * 10;
  const progressGain = input.sprint1Config.techniqueLearning.baseWeeklyProgressTenths;
  const progressAfter = Math.min(
    progressCapTenths,
    techniqueState.learningProgressTenths + progressGain,
  );
  techniqueState.learningProgressTenths = progressAfter;

  let learningFocusTechniqueId: typeof sprint1State.learningFocusTechniqueId;
  if (progressAfter >= progressCapTenths) {
    const learner = {
      abilities: input.person.abilities,
      aptitudes: input.person.aptitudes,
      techniqueStates: nextTechniqueStates,
    };
    const conditions = evaluateTechniqueAcquisitionConditions(definition, learner);
    if (!conditions.ok) {
      return conditions;
    }
    if (conditions.value.allConditionsMet) {
      const mastery = deriveInitialMasteryHundredths(definition.learningTier, input.sprint1Config);
      if (!mastery.ok) {
        return mastery;
      }
      techniqueState.acquiredAbsoluteWeek = input.absoluteWeek;
      techniqueState.masteryHundredths = mastery.value;
      learningFocusTechniqueId = null;
    } else {
      learningFocusTechniqueId = null;
    }
  } else {
    learningFocusTechniqueId = asTechniqueId(input.techniqueId);
  }

  for (const state of nextTechniqueStates) {
    const validated = validatePersonTechniqueState(state);
    if (!validated.ok) {
      return failure(
        validated.issues.map((issue) => ({
          ...issue,
          path: `/person/sprint1State/techniqueStates${issue.path}`,
        })),
      );
    }
  }

  return success({
    ...input.person,
    sprint1State: {
      ...sprint1State,
      techniqueStates: nextTechniqueStates,
      learningFocusTechniqueId,
    },
  });
}

export function applyExplicitWeeklyTeachOutcomesToWorldState(
  input: ApplyExplicitWeeklyTeachOutcomesInput,
): ValidationResult<WorldEngineState> {
  let persons = input.worldState.persons.map((person) => cloneValidatedPlainJson(person));

  for (const entry of input.completedEntries) {
    if (entry.absoluteWeek !== input.absoluteWeek) {
      continue;
    }
    if (entry.outcome.kind !== "teach_week_completed") {
      continue;
    }
    for (const discipleOutcome of entry.outcome.discipleOutcomes) {
      if (discipleOutcome.decision !== "accepted") {
        continue;
      }
      const personIndex = persons.findIndex(
        (candidate) => candidate.personId === discipleOutcome.disciplePersonId,
      );
      if (personIndex < 0) {
        return failure([
          {
            path: "/worldState/persons",
            message: "disciple personId from explicit teach outcome is missing from worldState",
            actual: discipleOutcome.disciplePersonId,
          },
        ]);
      }
      const updated = applyAcceptedTeachingToPerson({
        person: persons[personIndex]!,
        techniqueId: discipleOutcome.techniqueId,
        absoluteWeek: input.absoluteWeek,
        sprint1Config: input.sprint1Config,
        catalog: input.techniqueCatalog,
      });
      if (!updated.ok) {
        return updated;
      }
      persons = persons.map((person, index) => (index === personIndex ? updated.value : person));
    }
  }

  return success(
    deepFreezePlainJson({
      ...input.worldState,
      persons,
    }),
  );
}
