/**
 * Year-start runtime registry (CAL-JAN-SYNC 0.2.4 §2.4 / CAL-JAN-015 / 042).
 * Holds only enabled manifest entries; binds processorId/slot/version to callables.
 * Not persisted in RunRuleSnapshot or ActiveYearStartProcessorManifest.
 */
import { applyAgeBasedCareerUpdates, isLivingPerson, withRecalculatedAge } from "../age-status.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import type { PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { WorldCalendarTransition } from "../world-calendar.js";
import {
  type ActiveYearStartProcessorManifest,
  type YearStartProcessorSlot,
} from "./active-year-start-processor-manifest.js";

export type YearStartProcessorExecutionState = {
  previousWorldYear: number;
  newWorldYear: number;
  persons: Person[];
  /** Captured once before aging; PersonId ascending. */
  massAgingTargetPersonIds: readonly PersonId[] | undefined;
  previousYearFinalizeTransitions: WorldCalendarTransition[];
  otherYearStartTransitions: WorldCalendarTransition[];
};

export type YearStartProcessorCallable = (
  state: YearStartProcessorExecutionState,
) => ValidationResult<void>;

export type YearStartProcessorRegistryEntry = {
  processorId: string;
  slot: YearStartProcessorSlot;
  processorVersion: string;
  callable: YearStartProcessorCallable;
};

export type YearStartProcessorRegistry = {
  readonly entries: readonly YearStartProcessorRegistryEntry[];
};

/** Pure ordered plan of enabled registry entries; no callables invoked. */
export type YearStartExecutionPlan = {
  readonly entries: readonly YearStartProcessorRegistryEntry[];
};

function mismatch(
  path: string,
  message: string,
  actual?: unknown,
  expected?: unknown,
): ValidationIssue {
  return {
    path,
    message,
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected: String(expected) } : {}),
  };
}

/**
 * Living + active + birthYear < targetWorldYear, PersonId ascending.
 */
export function selectMassAgingTargetPersonIds(
  persons: readonly Person[],
  targetWorldYear: number,
): PersonId[] {
  if (!Number.isSafeInteger(targetWorldYear) || targetWorldYear < 1) {
    throw new Error(`targetWorldYear must be a safe integer >= 1 (got ${String(targetWorldYear)})`);
  }
  const ids: PersonId[] = [];
  for (const person of persons) {
    if (!isLivingPerson(person)) {
      continue;
    }
    if (person.participationStatus !== "active") {
      continue;
    }
    if (person.birthYear >= targetWorldYear) {
      continue;
    }
    ids.push(person.personId);
  }
  ids.sort((a, b) => compareUnicodeCodePoints(a, b));
  return ids;
}

export function applyMassAging(
  persons: readonly Person[],
  targetWorldYear: number,
  targetPersonIds: readonly PersonId[],
): { persons: Person[]; transitions: WorldCalendarTransition[] } {
  if (!Number.isSafeInteger(targetWorldYear) || targetWorldYear < 1) {
    throw new Error(`targetWorldYear must be a safe integer >= 1 (got ${String(targetWorldYear)})`);
  }
  const byId = new Map<PersonId, Person>();
  for (const person of persons) {
    byId.set(person.personId, person);
  }
  const transitions: WorldCalendarTransition[] = [];
  for (const personId of targetPersonIds) {
    const person = byId.get(personId);
    if (person === undefined || !isLivingPerson(person)) {
      throw new Error(`mass-aging snapshot personId missing or not living: ${String(personId)}`);
    }
    const previousAge = person.currentAge;
    const aged = withRecalculatedAge(person, targetWorldYear);
    if (aged.currentAge !== previousAge) {
      transitions.push({
        kind: "person_aged",
        personId: aged.personId,
        previousAge,
        nextAge: aged.currentAge,
        birthYear: aged.birthYear,
        worldYear: targetWorldYear,
      });
    }
    byId.set(personId, aged);
  }
  const nextPersons = persons.map((person) => byId.get(person.personId) ?? person);
  return { persons: nextPersons, transitions };
}

export function applyAgeQualification(
  persons: readonly Person[],
  targetPersonIds: readonly PersonId[],
): { persons: Person[]; transitions: WorldCalendarTransition[] } {
  const byId = new Map<PersonId, Person>();
  for (const person of persons) {
    byId.set(person.personId, person);
  }
  const transitions: WorldCalendarTransition[] = [];
  for (const personId of targetPersonIds) {
    const person = byId.get(personId);
    if (person === undefined || !isLivingPerson(person)) {
      throw new Error(
        `age-qualification snapshot personId missing or not living: ${String(personId)}`,
      );
    }
    const career = applyAgeBasedCareerUpdates(person);
    transitions.push(...career.transitions);
    byId.set(personId, career.person);
  }
  const nextPersons = persons.map((person) => byId.get(person.personId) ?? person);
  return { persons: nextPersons, transitions };
}

function ensureMassAgingSnapshot(state: YearStartProcessorExecutionState): readonly PersonId[] {
  if (state.massAgingTargetPersonIds !== undefined) {
    return state.massAgingTargetPersonIds;
  }
  const snapshot = selectMassAgingTargetPersonIds(state.persons, state.newWorldYear);
  state.massAgingTargetPersonIds = snapshot;
  return snapshot;
}

function runPreviousYearFinalize(state: YearStartProcessorExecutionState): ValidationResult<void> {
  state.previousYearFinalizeTransitions.push({
    kind: "year_stats_finalized",
    worldYear: state.previousWorldYear,
  });
  return success(undefined);
}

function runMassAging(state: YearStartProcessorExecutionState): ValidationResult<void> {
  try {
    const snapshot = ensureMassAgingSnapshot(state);
    const result = applyMassAging(state.persons, state.newWorldYear, snapshot);
    state.persons = result.persons;
    state.otherYearStartTransitions.push(...result.transitions);
    return success(undefined);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([mismatch("/mass-aging", `mass-aging failed: ${detail}`, detail)]);
  }
}

function runAgeQualification(state: YearStartProcessorExecutionState): ValidationResult<void> {
  try {
    const snapshot = ensureMassAgingSnapshot(state);
    const result = applyAgeQualification(state.persons, snapshot);
    state.persons = result.persons;
    state.otherYearStartTransitions.push(...result.transitions);
    return success(undefined);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([mismatch("/age-qualification", `age-qualification failed: ${detail}`, detail)]);
  }
}

/**
 * Default production registry: exactly the default-enabled manifest processors.
 */
export function createDefaultYearStartProcessorRegistry(): YearStartProcessorRegistry {
  return {
    entries: [
      {
        processorId: "previous-year-finalize",
        slot: "previous_year_finalize",
        processorVersion: "0.1.0",
        callable: runPreviousYearFinalize,
      },
      {
        processorId: "mass-aging",
        slot: "mass_aging",
        processorVersion: "0.1.0",
        callable: runMassAging,
      },
      {
        processorId: "age-qualification",
        slot: "age_qualification",
        processorVersion: "0.1.0",
        callable: runAgeQualification,
      },
    ],
  };
}

/**
 * Reject before any processor call when registry does not exactly match enabled manifest.
 */
export function validateRegistryAgainstManifest(
  registry: YearStartProcessorRegistry,
  manifest: ActiveYearStartProcessorManifest,
): ValidationResult<void> {
  const issues: ValidationIssue[] = [];
  const enabled = manifest.entries.filter((entry) => entry.implementationStatus === "enabled");
  const notImplemented = manifest.entries.filter(
    (entry) => entry.implementationStatus === "not_implemented",
  );

  const registryById = new Map<string, YearStartProcessorRegistryEntry>();
  for (let index = 0; index < registry.entries.length; index += 1) {
    const entry = registry.entries[index]!;
    if (registryById.has(entry.processorId)) {
      issues.push(
        mismatch(
          `/registry/entries/${String(index)}/processorId`,
          "registry processorId must be unique",
          entry.processorId,
        ),
      );
      continue;
    }
    registryById.set(entry.processorId, entry);
  }

  const enabledIds = new Set(enabled.map((entry) => entry.processorId));
  const registryIds = new Set(registryById.keys());

  for (const entry of notImplemented) {
    if (registryIds.has(entry.processorId)) {
      issues.push(
        mismatch(
          `/registry/entries/${entry.processorId}`,
          "not_implemented manifest processor must have no registry entry",
          entry.processorId,
          "absent",
        ),
      );
    }
  }

  for (const id of enabledIds) {
    if (!registryIds.has(id)) {
      issues.push(
        mismatch(
          `/registry/entries/${id}`,
          "enabled manifest processor missing from registry",
          undefined,
          id,
        ),
      );
    }
  }
  for (const id of registryIds) {
    if (!enabledIds.has(id)) {
      issues.push(
        mismatch(
          `/registry/entries/${id}`,
          "registry entry is not an enabled manifest processor",
          id,
          "enabled manifest ID set",
        ),
      );
    }
  }

  for (const manifestEntry of enabled) {
    const registryEntry = registryById.get(manifestEntry.processorId);
    if (registryEntry === undefined) {
      continue;
    }
    if (registryEntry.slot !== manifestEntry.slot) {
      issues.push(
        mismatch(
          `/registry/entries/${manifestEntry.processorId}/slot`,
          "registry slot must match manifest slot",
          registryEntry.slot,
          manifestEntry.slot,
        ),
      );
    }
    if (registryEntry.processorVersion !== manifestEntry.processorVersion) {
      issues.push(
        mismatch(
          `/registry/entries/${manifestEntry.processorId}/processorVersion`,
          "registry processorVersion must match manifest processorVersion",
          registryEntry.processorVersion,
          manifestEntry.processorVersion,
        ),
      );
    }
    if (typeof registryEntry.callable !== "function") {
      issues.push(
        mismatch(
          `/registry/entries/${manifestEntry.processorId}/callable`,
          "registry entry must bind a callable",
          typeof registryEntry.callable,
          "function",
        ),
      );
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(undefined);
}

/**
 * Pure execution-plan boundary: validates registry↔enabled manifest exact match and returns
 * ordered enabled entries without invoking any callable.
 */
export function buildYearStartExecutionPlan(
  registry: YearStartProcessorRegistry,
  manifest: ActiveYearStartProcessorManifest,
): ValidationResult<YearStartExecutionPlan> {
  const validated = validateRegistryAgainstManifest(registry, manifest);
  if (!validated.ok) {
    return validated;
  }

  const registryById = new Map(
    registry.entries.map((entry) => [entry.processorId, entry] as const),
  );
  const enabledPlan = manifest.entries.filter((entry) => entry.implementationStatus === "enabled");
  const ordered: YearStartProcessorRegistryEntry[] = [];
  for (const planEntry of enabledPlan) {
    const registryEntry = registryById.get(planEntry.processorId);
    if (registryEntry === undefined) {
      return failure([
        mismatch(
          `/registry/entries/${planEntry.processorId}`,
          "enabled processor missing from registry after validation",
        ),
      ]);
    }
    ordered.push(registryEntry);
  }
  return success({ entries: ordered });
}

/**
 * Invoke enabled processors once each in manifest plan order via the validated registry.
 * Inserts coordinator `year_started` after previous_year_finalize and before other slots.
 * Per-invocation counts are returned in the result only (no process-global residue).
 */
export function invokeYearStartProcessorsViaRegistry(input: {
  registry: YearStartProcessorRegistry;
  manifest: ActiveYearStartProcessorManifest;
  previousWorldYear: number;
  newWorldYear: number;
  persons: readonly Person[];
}): ValidationResult<{
  persons: Person[];
  transitions: WorldCalendarTransition[];
  invocationCounts: ReadonlyMap<string, number>;
}> {
  const planResult = buildYearStartExecutionPlan(input.registry, input.manifest);
  if (!planResult.ok) {
    return planResult;
  }
  const plan = planResult.value;

  const state: YearStartProcessorExecutionState = {
    previousWorldYear: input.previousWorldYear,
    newWorldYear: input.newWorldYear,
    persons: [...input.persons],
    massAgingTargetPersonIds: undefined,
    previousYearFinalizeTransitions: [],
    otherYearStartTransitions: [],
  };

  const runCounts = new Map<string, number>();

  for (const registryEntry of plan.entries) {
    const result = registryEntry.callable(state);
    if (!result.ok) {
      // Local counts only; failure returns without promoting partial counts to any global store.
      return result;
    }
    runCounts.set(registryEntry.processorId, (runCounts.get(registryEntry.processorId) ?? 0) + 1);
  }

  // Coordinator: previous_year_finalize events BEFORE year_started BEFORE other groups.
  const transitions: WorldCalendarTransition[] = [
    ...state.previousYearFinalizeTransitions,
    {
      kind: "year_started",
      worldYear: input.newWorldYear,
    },
    ...state.otherYearStartTransitions,
  ];

  return success({
    persons: state.persons,
    transitions,
    invocationCounts: runCounts,
  });
}
