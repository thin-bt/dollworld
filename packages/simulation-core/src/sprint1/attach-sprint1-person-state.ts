/**
 * Attach Sprint1PersonState to a fresh initial world (08 §6.2 / S01-002).
 * Full-world validation uses Sprint 0 `cloneWorldEngineState` (validate → clone →
 * revalidate). Does not reimplement a weaker person validator or spread raw
 * unknown Person records.
 *
 * Fresh-run gate: worldDate must equal createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG)
 * (world year 1 configured start week).
 * (year=1, month=4, weekOfMonth=1, absoluteWeek=0). Valid mid-run / checkpoint
 * worlds are rejected without rewinding dates or reassigning IDs.
 *
 * Note: `validateInitialWorldSnapshot` requires InitialWorldConfig and rejects
 * living waiting/stopped (initial-generation rule). This adapter must still
 * attach state to waiting/stopped/deceased per 08, so WorldEngine validation is
 * the matching existing Sprint 0 world validator.
 */
import type { Person } from "../domain.js";
import type { InitialWorldSnapshot } from "../initial-world/types.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  createInitialWorldDate,
  type WorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
} from "../world-date.js";
import { clonePerson, cloneWorldEngineState } from "../world-engine/clone.js";
import { WorldEngineError } from "../world-engine/errors.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { createInitialSprint1PersonState } from "./sprint1-person-state.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";

function toValidationFailure(error: unknown): ValidationResult<never> {
  if (error instanceof WorldEngineError) {
    const issues: ValidationIssue[] = [
      {
        path: error.context.field !== undefined ? `/${error.context.field}` : "",
        message: error.message,
        ...(error.context.detail !== undefined ? { actual: error.context.detail } : {}),
        expected: "valid Sprint 0 initial-world / WorldEngineState",
      },
    ];
    return failure(issues);
  }
  const detail = error instanceof Error ? error.message : String(error);
  return failure([
    {
      path: "",
      message: `attachSprint1PersonStateToInitialWorld failed: ${detail}`,
      actual: detail,
      expected: "valid Sprint 0 initial-world / WorldEngineState",
    },
  ]);
}

function personAlreadyHasSprint1State(person: Person): boolean {
  return Object.prototype.hasOwnProperty.call(person, "sprint1State");
}

function withSprint1State(person: Person, sprint1State: Sprint1PersonState): Person {
  const cloned = clonePerson(person);
  return { ...cloned, sprint1State };
}

function requireFreshInitialWorldDate(worldDate: WorldDate): ValidationIssue[] {
  const expected = createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG);
  const issues: ValidationIssue[] = [];
  const fields = ["year", "month", "weekOfMonth", "absoluteWeek"] as const;
  for (const field of fields) {
    if (worldDate[field] !== expected[field]) {
      issues.push({
        path: `/worldDate/${field}`,
        message:
          "attachSprint1PersonStateToInitialWorld accepts only fresh initial-world date (year 1 start week, absoluteWeek 0)",
        actual: worldDate[field],
        expected: String(expected[field]),
      });
    }
  }
  return issues;
}

/**
 * Attach initial Sprint1PersonState to every person in a Sprint 0 initial-world snapshot.
 * Does not consume RNG, generate events, or mutate the input.
 */
export function attachSprint1PersonStateToInitialWorld(
  world: unknown,
): ValidationResult<InitialWorldSnapshot> {
  let clonedWorld: WorldEngineState;
  try {
    clonedWorld = cloneWorldEngineState(world);
  } catch (error) {
    return toValidationFailure(error);
  }

  const dateIssues = requireFreshInitialWorldDate(clonedWorld.worldDate);
  if (dateIssues.length > 0) {
    return failure(dateIssues);
  }

  const issues: ValidationIssue[] = [];
  for (let index = 0; index < clonedWorld.persons.length; index += 1) {
    const person = clonedWorld.persons[index]!;
    if (personAlreadyHasSprint1State(person)) {
      issues.push({
        path: `/persons/${String(index)}/sprint1State`,
        message: "person already has Sprint1PersonState; double initialization is forbidden",
        expected: "absent sprint1State",
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const nextPersons: Person[] = [];
  for (let index = 0; index < clonedWorld.persons.length; index += 1) {
    const person = clonedWorld.persons[index]!;
    const personPath = `/persons/${String(index)}`;
    const stateResult = createInitialSprint1PersonState(person.abilities.spirit.surfaceValue);
    if (!stateResult.ok) {
      for (const issue of stateResult.issues) {
        issues.push({
          ...issue,
          path: `${personPath}${issue.path === "" ? "" : issue.path}`,
        });
      }
      continue;
    }
    try {
      nextPersons.push(withSprint1State(person, stateResult.value));
    } catch (error) {
      return toValidationFailure(error);
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const nextWorld: InitialWorldSnapshot = {
    schemaVersion: clonedWorld.schemaVersion,
    simulationSpecVersion: clonedWorld.simulationSpecVersion,
    nameDataVersion: clonedWorld.nameDataVersion,
    simulationId: clonedWorld.simulationId,
    worldId: clonedWorld.worldId,
    worldDate: {
      year: clonedWorld.worldDate.year,
      month: clonedWorld.worldDate.month,
      weekOfMonth: clonedWorld.worldDate.weekOfMonth,
      absoluteWeek: clonedWorld.worldDate.absoluteWeek,
    },
    configProfileId: clonedWorld.configProfileId,
    configHash: clonedWorld.configHash,
    seed: clonedWorld.seed,
    rngAlgorithm: clonedWorld.rngAlgorithm,
    persons: nextPersons,
    families: clonedWorld.families,
    lineages: clonedWorld.lineages,
    relationships: clonedWorld.relationships,
    generationSummary: clonedWorld.generationSummary,
  };

  return success(nextWorld);
}
