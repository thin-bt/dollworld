/**
 * Sprint 1 `teacherCanTeach` static availability predicate (09 mini-spec §8.1 /
 * S01-003). Pure predicate: does not consume the master's weekly action, does not
 * read WorldState directly, and does not decide which technique to teach (both
 * deferred to Sprint 3 per 09 §8.1 / §16). Invalid enum-shaped inputs are a
 * ValidationResult failure, never a silent `false`.
 *
 * The teaching proficiency threshold is always taken from the target
 * `TechniqueDefinition.teachingProficiencyRequired` — callers cannot supply an
 * independent threshold. The master's stored state must also refer to the same
 * `techniqueId` as the definition.
 */
import type { CareerStatus, LifeStatus, ParticipationStatus } from "../enums.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  rejectUnknownKeys,
  requireBoolean,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validatePersonTechniqueState } from "./person-technique-state.js";
import { validateTechniqueDefinition } from "./technique-definition.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { PersonTechniqueState } from "./types.js";

const LIFE_STATUSES: readonly LifeStatus[] = ["living", "deceased"];
const PARTICIPATION_STATUSES: readonly ParticipationStatus[] = ["waiting", "active", "stopped"];
const CAREER_STATUSES: readonly CareerStatus[] = [
  "child",
  "trainee",
  "active_competitor",
  "retired",
];
const TEACHING_ELIGIBLE_CAREER_STATUSES: readonly CareerStatus[] = ["active_competitor", "retired"];

const TEACHER_CAN_TEACH_CONTEXT_KEYS = [
  "activeMentorshipExists",
  "masterLifeStatus",
  "masterParticipationStatus",
  "masterCareerStatus",
  "masterTechniqueState",
] as const;

export type TeacherCanTeachContext = {
  activeMentorshipExists: boolean;
  masterLifeStatus: "living" | "deceased";
  masterParticipationStatus: "active" | "waiting" | "stopped";
  masterCareerStatus: CareerStatus;
  masterTechniqueState: PersonTechniqueState | null;
};

function requireStringEnumValue(
  object: Record<string, unknown>,
  key: string,
  allowed: readonly string[],
  issues: ValidationIssue[],
): string | undefined {
  if (!Object.prototype.hasOwnProperty.call(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push({
      path: `/${key}`,
      message: `${key} must be one of the fixed enum values`,
      actual: value,
      expected: allowed.join(" | "),
    });
    return undefined;
  }
  return value;
}

/**
 * Shared TeacherCanTeachContext structural validator (09 §8.1).
 * Used by `teacherCanTeach` and S01-004 TechniqueTargetContext validation so
 * CareerStatus / life / participation enums cannot drift between call sites.
 * Package-internal; not required on the package root export surface.
 */
export function validateTeacherCanTeachContext(
  contextInput: unknown,
): ValidationResult<TeacherCanTeachContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(contextInput, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TeacherCanTeachContext must be a plain object",
              actual: contextInput,
              expected: "object",
            },
          ],
    );
  }

  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TEACHER_CAN_TEACH_CONTEXT_KEYS, "", issues);

  const activeMentorshipExists = requireBoolean(object, "activeMentorshipExists", "", issues);
  const masterLifeStatus = requireStringEnumValue(
    object,
    "masterLifeStatus",
    LIFE_STATUSES,
    issues,
  );
  const masterParticipationStatus = requireStringEnumValue(
    object,
    "masterParticipationStatus",
    PARTICIPATION_STATUSES,
    issues,
  );
  const masterCareerStatus = requireStringEnumValue(
    object,
    "masterCareerStatus",
    CAREER_STATUSES,
    issues,
  );

  let masterTechniqueState: PersonTechniqueState | null | undefined;
  if (!Object.prototype.hasOwnProperty.call(object, "masterTechniqueState")) {
    issues.push({
      path: "/masterTechniqueState",
      message: "required key is missing",
      expected: "PersonTechniqueState | null",
    });
    masterTechniqueState = undefined;
  } else if (object["masterTechniqueState"] === null) {
    masterTechniqueState = null;
  } else {
    const stateResult = validatePersonTechniqueState(object["masterTechniqueState"]);
    if (!stateResult.ok) {
      for (const issue of stateResult.issues) {
        issues.push({
          ...issue,
          path: `/masterTechniqueState${issue.path === "" ? "" : issue.path}`,
        });
      }
      masterTechniqueState = undefined;
    } else {
      masterTechniqueState = stateResult.value;
    }
  }

  if (
    activeMentorshipExists === undefined ||
    masterLifeStatus === undefined ||
    masterParticipationStatus === undefined ||
    masterCareerStatus === undefined ||
    masterTechniqueState === undefined
  ) {
    return failure(issues);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success({
    activeMentorshipExists,
    masterLifeStatus: masterLifeStatus as TeacherCanTeachContext["masterLifeStatus"],
    masterParticipationStatus:
      masterParticipationStatus as TeacherCanTeachContext["masterParticipationStatus"],
    masterCareerStatus: masterCareerStatus as CareerStatus,
    masterTechniqueState,
  });
}

/**
 * 09 §8.1:
 * `teacherCanTeach = activeMentorshipExists && living && active && (active_competitor
 * | retired) && master state exists for the same techniqueId && acquiredAbsoluteWeek
 * != null && masteryHundredths >= definition.teachingProficiencyRequired * 100`.
 * `teachingProficiencyRequired=0` still requires the master to hold the technique.
 * A master state whose `techniqueId` differs from the target definition is treated
 * as missing for that technique (`false`), not as a validation failure.
 */
export function teacherCanTeach(
  definitionInput: unknown,
  contextInput: unknown,
): ValidationResult<boolean> {
  const definitionResult = validateTechniqueDefinition(definitionInput);
  if (!definitionResult.ok) {
    return failure(definitionResult.issues);
  }
  const definition: TechniqueDefinition = definitionResult.value;

  const contextResult = validateTeacherCanTeachContext(contextInput);
  if (!contextResult.ok) {
    return failure(contextResult.issues);
  }
  const ctx = contextResult.value;

  if (!ctx.activeMentorshipExists) {
    return success(false);
  }
  if (ctx.masterLifeStatus !== "living") {
    return success(false);
  }
  if (ctx.masterParticipationStatus !== "active") {
    return success(false);
  }
  if (!(TEACHING_ELIGIBLE_CAREER_STATUSES as readonly string[]).includes(ctx.masterCareerStatus)) {
    return success(false);
  }
  if (ctx.masterTechniqueState === null) {
    return success(false);
  }
  if (ctx.masterTechniqueState.techniqueId !== definition.techniqueId) {
    return success(false);
  }
  if (ctx.masterTechniqueState.acquiredAbsoluteWeek === null) {
    return success(false);
  }

  const requiredMasteryHundredths = definition.teachingProficiencyRequired * 100;
  return success(ctx.masterTechniqueState.masteryHundredths >= requiredMasteryHundredths);
}
