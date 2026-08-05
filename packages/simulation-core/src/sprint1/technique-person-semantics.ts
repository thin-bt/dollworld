/**
 * Semantic validation connecting Sprint1PersonState technique state (S01-002) with
 * a TechniqueCatalog (09 mini-spec §6, §6.1 / S01-003): catalog membership of every
 * stored PersonTechniqueState and of `learningFocusTechniqueId`, and the
 * `learningProgressTenths <= learningProgressRequired * 10` invariant. Does not
 * evaluate acquisition conditions (requiredAptitude / requiredStats / prerequisites)
 * — that is ./technique-acquisition.ts's responsibility.
 *
 * `personContext` is hardened from `unknown` and currently carries only
 * `spiritSurfaceValue` (needed by Sprint1PersonState mental-cap validation).
 * Abilities / aptitudes belong to TechniqueLearnerContext for acquisition checks.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import type { Sprint1PersonState } from "./sprint1-person-state.js";
import { validateSprint1PersonState } from "./sprint1-person-state.js";
import { validateTechniqueCatalog } from "./technique-catalog.js";
import type { TechniqueCatalog } from "./technique-catalog.js";
import type { TechniqueDefinition } from "./technique-definition.js";

const TECHNIQUE_SEMANTICS_PERSON_CONTEXT_KEYS = ["spiritSurfaceValue"] as const;

/**
 * Minimal person context needed to validate a Sprint1PersonState's technique
 * semantics against a catalog. Acquisition-condition inputs live on
 * TechniqueLearnerContext, not here.
 */
export type TechniqueSemanticsPersonContext = {
  spiritSurfaceValue: number;
};

function parseTechniqueSemanticsPersonContext(
  personContext: unknown,
): ValidationResult<TechniqueSemanticsPersonContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(personContext, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TechniqueSemanticsPersonContext must be a plain object",
              actual: personContext,
              expected: "object",
            },
          ],
    );
  }

  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TECHNIQUE_SEMANTICS_PERSON_CONTEXT_KEYS, "", issues);
  const spiritSurfaceValue = requireIntegerInRange(
    object,
    "spiritSurfaceValue",
    "",
    0,
    100,
    issues,
  );

  if (spiritSurfaceValue === undefined || issues.length > 0) {
    return failure(issues);
  }

  return success({ spiritSurfaceValue });
}

export function validateSprint1PersonTechniqueSemantics(
  sprint1PersonState: unknown,
  catalog: unknown,
  personContext: unknown,
  provider: Sha256Provider,
): ValidationResult<{
  personState: Sprint1PersonState;
  catalog: TechniqueCatalog;
}> {
  const contextResult = parseTechniqueSemanticsPersonContext(personContext);
  if (!contextResult.ok) {
    return failure(contextResult.issues);
  }

  // Structural person-state validation before catalog hash so invalid person
  // state never invokes the Sha256Provider.
  const personStateResult = validateSprint1PersonState(sprint1PersonState, {
    spiritSurfaceValue: contextResult.value.spiritSurfaceValue,
  });
  if (!personStateResult.ok) {
    return failure(personStateResult.issues);
  }

  const catalogResult = validateTechniqueCatalog(catalog, provider);
  if (!catalogResult.ok) {
    return failure(catalogResult.issues);
  }

  const issues: ValidationIssue[] = [];
  const definitionsById = new Map<string, TechniqueDefinition>();
  for (const definition of catalogResult.value.definitions) {
    definitionsById.set(definition.techniqueId, definition);
  }

  const techniqueStates = personStateResult.value.techniqueStates;
  for (let index = 0; index < techniqueStates.length; index += 1) {
    const state = techniqueStates[index]!;
    const path = `/techniqueStates/${String(index)}`;
    const definition = definitionsById.get(state.techniqueId);
    if (definition === undefined) {
      issues.push({
        path: `${path}/techniqueId`,
        message: "techniqueId must exist in the TechniqueCatalog",
        actual: state.techniqueId,
        expected: "techniqueId present in TechniqueCatalog.definitions",
      });
      continue;
    }
    const maxLearningProgressTenths = definition.learningProgressRequired * 10;
    if (state.learningProgressTenths > maxLearningProgressTenths) {
      issues.push({
        path: `${path}/learningProgressTenths`,
        message: "learningProgressTenths must not exceed learningProgressRequired * 10",
        actual: state.learningProgressTenths,
        expected: `<= ${String(maxLearningProgressTenths)}`,
      });
    }
  }

  const focusTechniqueId = personStateResult.value.learningFocusTechniqueId;
  if (focusTechniqueId !== null && !definitionsById.has(focusTechniqueId)) {
    issues.push({
      path: "/learningFocusTechniqueId",
      message: "learningFocusTechniqueId must exist in the TechniqueCatalog",
      actual: focusTechniqueId,
      expected: "techniqueId present in TechniqueCatalog.definitions",
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const result = {
    personState: cloneValidatedPlainJson(personStateResult.value),
    catalog: cloneValidatedPlainJson(catalogResult.value),
  };
  return success(deepFreezePlainJson(result));
}
