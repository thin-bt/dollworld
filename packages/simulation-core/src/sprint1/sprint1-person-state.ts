/**
 * Sprint1PersonState structural validation (08 §6.2 / S01-002).
 * Catalog membership and learningProgressRequired belong to S01-003.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { asTechniqueId, type TechniqueId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deriveMaxMental } from "./max-mental.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireLiteralString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validatePersonTechniqueState } from "./person-technique-state.js";
import type { PersonTechniqueState } from "./types.js";

export const SPRINT1_PERSON_STATE_SCHEMA_VERSION = "0.1.0" as const;

export const SPRINT1_PERSON_STATE_KEYS = [
  "sprint1StateSchemaVersion",
  "currentMental",
  "techniqueStates",
  "learningFocusTechniqueId",
] as const;

export type Sprint1PersonState = {
  sprint1StateSchemaVersion: typeof SPRINT1_PERSON_STATE_SCHEMA_VERSION;
  currentMental: number;
  techniqueStates: readonly PersonTechniqueState[];
  learningFocusTechniqueId: TechniqueId | null;
};

export type Sprint1PersonStateContext = {
  spiritSurfaceValue: number;
};

export function createInitialSprint1PersonState(
  spiritSurfaceValue: number,
): ValidationResult<Sprint1PersonState> {
  const maxMental = deriveMaxMental(spiritSurfaceValue);
  if (!maxMental.ok) {
    return failure(maxMental.issues);
  }
  return success(
    deepFreezePlainJson({
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: maxMental.value,
      techniqueStates: [],
      learningFocusTechniqueId: null,
    }),
  );
}

export function validateSprint1PersonState(
  input: unknown,
  context: Sprint1PersonStateContext,
): ValidationResult<Sprint1PersonState> {
  const issues: ValidationIssue[] = [];
  const maxMentalResult = deriveMaxMental(context.spiritSurfaceValue);
  if (!maxMentalResult.ok) {
    return failure(maxMentalResult.issues);
  }
  const maxMental = maxMentalResult.value;

  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "Sprint1PersonState must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SPRINT1_PERSON_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "sprint1StateSchemaVersion",
    "",
    SPRINT1_PERSON_STATE_SCHEMA_VERSION,
    issues,
  );
  const currentMental = requireIntegerInRange(object, "currentMental", "", 0, maxMental, issues);

  const techniqueStatesRaw = snapshotDenseArrayOrFail(
    object["techniqueStates"],
    "/techniqueStates",
    issues,
  );

  const techniqueStates: PersonTechniqueState[] = [];
  if (techniqueStatesRaw !== undefined) {
    for (let index = 0; index < techniqueStatesRaw.length; index += 1) {
      const entry = validatePersonTechniqueState(techniqueStatesRaw[index]);
      if (!entry.ok) {
        for (const issue of entry.issues) {
          issues.push({
            ...issue,
            path: `/techniqueStates/${String(index)}${issue.path === "" ? "" : issue.path}`,
          });
        }
        continue;
      }
      techniqueStates.push(entry.value);
    }
  }

  const seenIds = new Set<string>();
  for (const entry of techniqueStates) {
    if (seenIds.has(entry.techniqueId)) {
      issues.push({
        path: "/techniqueStates",
        message: "techniqueStates must not contain duplicate TechniqueId",
        actual: entry.techniqueId,
        expected: "unique TechniqueId",
      });
      break;
    }
    seenIds.add(entry.techniqueId);
  }

  techniqueStates.sort((a, b) => compareUnicodeCodePoints(a.techniqueId, b.techniqueId));

  let learningFocusTechniqueId: TechniqueId | null | undefined;
  if (!Object.prototype.hasOwnProperty.call(object, "learningFocusTechniqueId")) {
    issues.push({
      path: "/learningFocusTechniqueId",
      message: "required key is missing",
      expected: "TechniqueId | null",
    });
  } else {
    const focusRaw = object["learningFocusTechniqueId"];
    if (focusRaw === null) {
      learningFocusTechniqueId = null;
    } else if (typeof focusRaw === "string" && focusRaw.trim().length > 0) {
      const focusId = asTechniqueId(focusRaw.trim());
      if (!seenIds.has(focusId)) {
        issues.push({
          path: "/learningFocusTechniqueId",
          message: "learningFocusTechniqueId must refer to a stored techniqueStates entry",
          actual: focusRaw,
          expected: "TechniqueId present in techniqueStates, or null",
        });
      } else {
        learningFocusTechniqueId = focusId;
      }
    } else {
      issues.push({
        path: "/learningFocusTechniqueId",
        message: "learningFocusTechniqueId must be TechniqueId or null",
        actual: focusRaw,
        expected: "TechniqueId | null",
      });
    }
  }

  if (
    schemaVersion === undefined ||
    currentMental === undefined ||
    techniqueStatesRaw === undefined ||
    learningFocusTechniqueId === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental,
      techniqueStates,
      learningFocusTechniqueId,
    }),
  );
}

export function cloneSprint1PersonState(
  input: unknown,
  context: Sprint1PersonStateContext,
): ValidationResult<Sprint1PersonState> {
  const validated = validateSprint1PersonState(input, context);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeSprint1PersonState(
  input: unknown,
  context: Sprint1PersonStateContext,
): ValidationResult<Sprint1PersonState> {
  return validateSprint1PersonState(input, context);
}
