/**
 * `WeeklyPlannerContext` input value object (10 mini-spec §4.3 / S01-004).
 *
 * The five context factors are produced by an input adapter from existing person /
 * relationship / recent-result data and normalized to -20..20. Only factors whose
 * information does not exist may be 0; this module never invents or defaults a
 * value, and never re-derives a factor from person state.
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  childPath,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { WEEKLY_SCORED_ACTIONS } from "./weekly-actions.js";
import type { WeeklyScoredAction } from "./weekly-actions.js";

export const WEEKLY_ACTION_CONTEXT_SCORE_KEYS = [
  "personality",
  "developmentNeed",
  "recentResult",
  "teacherAdvice",
  "schedule",
] as const;
export type WeeklyActionContextScoreKey = (typeof WEEKLY_ACTION_CONTEXT_SCORE_KEYS)[number];

export type WeeklyActionContextScore = {
  personality: number;
  developmentNeed: number;
  recentResult: number;
  teacherAdvice: number;
  schedule: number;
};

export const WEEKLY_PLANNER_CONTEXT_KEYS = ["byAction"] as const;

export type WeeklyPlannerContext = {
  byAction: { readonly [K in WeeklyScoredAction]: WeeklyActionContextScore };
};

function parseActionContextScore(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WeeklyActionContextScore | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, WEEKLY_ACTION_CONTEXT_SCORE_KEYS, path, issues);

  const personality = requireIntegerInRange(object, "personality", path, -20, 20, issues);
  const developmentNeed = requireIntegerInRange(object, "developmentNeed", path, -20, 20, issues);
  const recentResult = requireIntegerInRange(object, "recentResult", path, -20, 20, issues);
  const teacherAdvice = requireIntegerInRange(object, "teacherAdvice", path, -20, 20, issues);
  const schedule = requireIntegerInRange(object, "schedule", path, -20, 20, issues);

  if (
    personality === undefined ||
    developmentNeed === undefined ||
    recentResult === undefined ||
    teacherAdvice === undefined ||
    schedule === undefined
  ) {
    return undefined;
  }
  return { personality, developmentNeed, recentResult, teacherAdvice, schedule };
}

export function validateWeeklyPlannerContext(
  input: unknown,
): ValidationResult<WeeklyPlannerContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "WeeklyPlannerContext must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WEEKLY_PLANNER_CONTEXT_KEYS, "", issues);

  const byActionRaw = snapshotPlainObjectOrFail(object["byAction"], "/byAction", issues);
  if (byActionRaw === undefined) {
    return failure(issues);
  }
  assertNoAccessors(byActionRaw, "/byAction", issues);
  rejectUnknownKeys(byActionRaw, WEEKLY_SCORED_ACTIONS, "/byAction", issues);

  const rebuilt = {} as { [K in WeeklyScoredAction]: WeeklyActionContextScore };
  let ok = true;
  for (const action of WEEKLY_SCORED_ACTIONS) {
    const path = childPath("/byAction", action);
    if (!Object.prototype.hasOwnProperty.call(byActionRaw, action)) {
      issues.push({
        path,
        message: "required key is missing",
        expected: "WeeklyActionContextScore",
      });
      ok = false;
      continue;
    }
    const parsed = parseActionContextScore(byActionRaw[action], path, issues);
    if (parsed === undefined) {
      ok = false;
      continue;
    }
    rebuilt[action] = parsed;
  }

  if (!ok || issues.length > 0) {
    return failure(issues);
  }

  return success(deepFreezePlainJson({ byAction: rebuilt }));
}

export function cloneWeeklyPlannerContext(input: unknown): ValidationResult<WeeklyPlannerContext> {
  const validated = validateWeeklyPlannerContext(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeWeeklyPlannerContext(input: unknown): ValidationResult<WeeklyPlannerContext> {
  return validateWeeklyPlannerContext(input);
}
