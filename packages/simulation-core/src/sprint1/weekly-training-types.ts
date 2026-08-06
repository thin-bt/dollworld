/**
 * Weekly training processor I/O contract (10 mini-spec §6, §7, §9, §11 / S01-004).
 *
 * These types are the *sidecar inputs* the weekly processor needs in order to
 * evaluate the formulas defined by 08 / 09 / 10 / 14. They carry no game rules of
 * their own: every field either mirrors an existing validated domain value
 * (`Person`, `PersonTemporaryCondition`, `GrowthPotentialScores`, …) or is an
 * adapter-normalized 0..100 / basis-points input that the mini-specs require the
 * Planner to receive rather than to invent (10 §4.3, §6.2, §6.3; 09 §8).
 *
 * Nothing here emits `eventId` / `simulationId` / `sequence`: the weekly processor
 * only returns ordered EventEnvelope *candidates* (10 §7, §11).
 */
import { ABILITY_KEYS } from "../abilities.js";
import type { AbilityKey } from "../abilities.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Person } from "../domain.js";
import { asTechniqueId } from "../ids.js";
import type { PersonId, TechniqueId } from "../ids.js";
import type { SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import { requireNormalizedBasisPointsValue } from "./basis-points.js";
import { GROWTH_PROFILES, isGrowthProfile } from "./growth-profile.js";
import type { GrowthProfile } from "./growth-profile.js";
import { TEACHER_FACTOR_KEYS } from "./growth-factor-selectors.js";
import type { TeacherFactorKey } from "./growth-factor-selectors.js";
import { validateGrowthPotentialScores } from "./growth-potential.js";
import type { GrowthPotentialScores } from "./growth-potential.js";
import { validatePersonTemporaryCondition } from "./person-temporary-condition.js";
import type { PersonTemporaryCondition } from "./person-temporary-condition.js";
import {
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validateStatGrowthRemainderCollection } from "./stat-growth-remainder.js";
import type { StatGrowthRemainderCollection } from "./stat-growth-remainder.js";
import type { TeacherCanTeachContext } from "./technique-teacher.js";
import { validateTeacherCanTeachContext } from "./technique-teacher.js";
import { parseWeeklyTrainingPerson } from "./weekly-person-structure.js";
import type { WeeklyTrainingPersonView } from "./weekly-person-structure.js";
import { validateWeeklyPlannerContext } from "./weekly-planner-context.js";
import type { WeeklyPlannerContext } from "./weekly-planner-context.js";
import type { TrainingProcessorRuntimeState } from "./training-processor-runtime-state.js";

export type { WeeklyTrainingPersonView } from "./weekly-person-structure.js";

/** Neutral value used when an optional 0..100 normalized input is absent (09 §8, 10 §6.2). */
export const NEUTRAL_NORMALIZED_INPUT = 50;

/** `motivationFactor` contract from 08 §9 (required, never defaulted to 10000). */
export const MOTIVATION_FACTOR_MINIMUM_BASIS_POINTS = 8000;
export const MOTIVATION_FACTOR_MAXIMUM_BASIS_POINTS = 11500;

export const STAT_TARGET_ABILITY_CONTEXT_KEYS = [
  "relatedAptitude",
  "teacherRecommendation",
] as const;

/** 10 §6.1 stat-target inputs that are not derivable from person state alone. */
export type StatTargetAbilityContext = {
  relatedAptitude: number;
  teacherRecommendation: number;
};

export type WeeklyStatTargetContext = {
  byAbility: { readonly [K in AbilityKey]: StatTargetAbilityContext };
};

export const WEEKLY_STAT_TARGET_CONTEXT_KEYS = ["byAbility"] as const;

export const TECHNIQUE_TARGET_CONTEXT_KEYS = [
  "techniqueId",
  "styleMatch",
  "teacherPriority",
  "learningTrait",
  "teachingAbility",
  "compatibility",
  "teacherCanTeachContext",
] as const;

/**
 * Per-technique adapter inputs (10 §6.2 / §6.3, 09 §8 `TechniqueLearningContext`).
 * Omitted optional values use the mini-spec fallbacks: `styleMatch` → 50,
 * `teacherPriority` → 0, `learningTrait` / `teachingAbility` / `compatibility` → 50.
 */
export type TechniqueTargetContext = {
  techniqueId: TechniqueId;
  styleMatch?: number;
  teacherPriority?: number;
  learningTrait?: number;
  teachingAbility?: number;
  compatibility?: number;
  teacherCanTeachContext: TeacherCanTeachContext;
};

export const WEEKLY_TRAINING_PERSON_RECORD_KEYS = [
  "person",
  "growthProfile",
  "growthPotential",
  "statGrowthRemainders",
  "temporaryCondition",
  "motivationFactor",
  "plannerContext",
  "statTargetContext",
  "techniqueTargetContexts",
  "teacherFactorKey",
  "discipleCount",
] as const;

export type WeeklyTrainingPersonRecord = {
  person: Person;
  growthProfile: GrowthProfile;
  growthPotential: GrowthPotentialScores;
  statGrowthRemainders: StatGrowthRemainderCollection;
  temporaryCondition: PersonTemporaryCondition;
  motivationFactor: BasisPoints;
  plannerContext: WeeklyPlannerContext;
  statTargetContext: WeeklyStatTargetContext;
  techniqueTargetContexts: readonly TechniqueTargetContext[];
  teacherFactorKey: TeacherFactorKey;
  discipleCount: number;
};

/** Ordered EventEnvelope candidate: no `eventId` / `simulationId` / `sequence` (10 §7, §11). */
export type WeeklyTrainingEventCandidate = {
  eventType: string;
  personId: PersonId;
  absoluteWeek: number;
  payload: Readonly<Record<string, unknown>>;
};

export type WeeklyTrainingResult = {
  personRecords: readonly WeeklyTrainingPersonRecord[];
  runtimeState: TrainingProcessorRuntimeState;
  rngState: SeededRngState;
  eventCandidates: readonly WeeklyTrainingEventCandidate[];
};

export function validateWeeklyStatTargetContext(
  input: unknown,
): ValidationResult<WeeklyStatTargetContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "WeeklyStatTargetContext must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WEEKLY_STAT_TARGET_CONTEXT_KEYS, "", issues);

  const byAbilityRaw = snapshotPlainObjectOrFail(object["byAbility"], "/byAbility", issues);
  if (byAbilityRaw === undefined) {
    return failure(issues);
  }
  assertNoAccessors(byAbilityRaw, "/byAbility", issues);
  rejectUnknownKeys(byAbilityRaw, ABILITY_KEYS, "/byAbility", issues);

  const rebuilt = {} as { [K in AbilityKey]: StatTargetAbilityContext };
  let ok = true;
  for (const key of ABILITY_KEYS) {
    const path = childPath("/byAbility", key);
    const entry = snapshotPlainObjectOrFail(byAbilityRaw[key], path, issues);
    if (entry === undefined) {
      ok = false;
      continue;
    }
    assertNoAccessors(entry, path, issues);
    rejectUnknownKeys(entry, STAT_TARGET_ABILITY_CONTEXT_KEYS, path, issues);
    const relatedAptitude = requireIntegerInRange(entry, "relatedAptitude", path, 0, 100, issues);
    const teacherRecommendation = requireIntegerInRange(
      entry,
      "teacherRecommendation",
      path,
      0,
      100,
      issues,
    );
    if (relatedAptitude === undefined || teacherRecommendation === undefined) {
      ok = false;
      continue;
    }
    rebuilt[key] = { relatedAptitude, teacherRecommendation };
  }

  if (!ok || issues.length > 0) {
    return failure(issues);
  }
  return success(deepFreezePlainJson({ byAbility: rebuilt }));
}

function parseTeacherCanTeachContextShape(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): TeacherCanTeachContext | undefined {
  const result = validateTeacherCanTeachContext(value);
  if (!result.ok) {
    for (const issue of result.issues) {
      const relative = issue.path.startsWith("/") ? issue.path : `/${issue.path}`;
      issues.push({
        ...issue,
        path: `${path}${relative === "/" ? "" : relative}`,
      });
    }
    return undefined;
  }
  return result.value;
}

function parseOptionalNormalizedInput(
  object: Record<string, unknown>,
  key: string,
  path: string,
  issues: ValidationIssue[],
): number | undefined | "invalid" {
  if (!hasOwn(object, key)) {
    return undefined;
  }
  const value = requireIntegerInRange(object, key, path, 0, 100, issues);
  return value === undefined ? "invalid" : value;
}

export function validateTechniqueTargetContext(
  input: unknown,
): ValidationResult<TechniqueTargetContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "TechniqueTargetContext must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, TECHNIQUE_TARGET_CONTEXT_KEYS, "", issues);

  const rawTechniqueId = object["techniqueId"];
  let techniqueId: TechniqueId | undefined;
  if (typeof rawTechniqueId !== "string" || rawTechniqueId.trim().length === 0) {
    issues.push({
      path: "/techniqueId",
      message: "techniqueId must be a non-empty string",
      actual: rawTechniqueId,
      expected: "TechniqueId",
    });
  } else {
    techniqueId = asTechniqueId(rawTechniqueId);
  }

  const styleMatch = parseOptionalNormalizedInput(object, "styleMatch", "", issues);
  const teacherPriority = parseOptionalNormalizedInput(object, "teacherPriority", "", issues);
  const learningTrait = parseOptionalNormalizedInput(object, "learningTrait", "", issues);
  const teachingAbility = parseOptionalNormalizedInput(object, "teachingAbility", "", issues);
  const compatibility = parseOptionalNormalizedInput(object, "compatibility", "", issues);

  const teacherCanTeachContext = parseTeacherCanTeachContextShape(
    object["teacherCanTeachContext"],
    "/teacherCanTeachContext",
    issues,
  );

  if (
    techniqueId === undefined ||
    teacherCanTeachContext === undefined ||
    styleMatch === "invalid" ||
    teacherPriority === "invalid" ||
    learningTrait === "invalid" ||
    teachingAbility === "invalid" ||
    compatibility === "invalid" ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const rebuilt: {
    techniqueId: TechniqueId;
    styleMatch?: number;
    teacherPriority?: number;
    learningTrait?: number;
    teachingAbility?: number;
    compatibility?: number;
    teacherCanTeachContext: TeacherCanTeachContext;
  } = { techniqueId, teacherCanTeachContext };
  if (styleMatch !== undefined) rebuilt.styleMatch = styleMatch;
  if (teacherPriority !== undefined) rebuilt.teacherPriority = teacherPriority;
  if (learningTrait !== undefined) rebuilt.learningTrait = learningTrait;
  if (teachingAbility !== undefined) rebuilt.teachingAbility = teachingAbility;
  if (compatibility !== undefined) rebuilt.compatibility = compatibility;

  return success(deepFreezePlainJson(rebuilt));
}

/** Dense, TechniqueId-unique, TechniqueId-ascending array of per-technique contexts. */
export function validateTechniqueTargetContexts(
  input: unknown,
): ValidationResult<readonly TechniqueTargetContext[]> {
  const issues: ValidationIssue[] = [];
  const items = snapshotDenseArrayOrFail(input, "", issues);
  if (items === undefined) {
    return failure(issues);
  }

  const parsed: TechniqueTargetContext[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const result = validateTechniqueTargetContext(items[index]);
    if (!result.ok) {
      for (const issue of result.issues) {
        issues.push({
          ...issue,
          path: `/${String(index)}${issue.path}`,
        });
      }
      continue;
    }
    parsed.push(result.value);
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  for (let index = 1; index < parsed.length; index += 1) {
    const previous = parsed[index - 1]!.techniqueId;
    const current = parsed[index]!.techniqueId;
    const order = compareUnicodeCodePoints(previous, current);
    if (order === 0) {
      return failure([
        {
          path: "",
          message: "techniqueTargetContexts must not contain duplicate TechniqueId",
          actual: current,
          expected: "unique TechniqueId",
        },
      ]);
    }
    if (order > 0) {
      return failure([
        {
          path: "",
          message: "techniqueTargetContexts must be sorted by TechniqueId ascending",
          actual: `${previous} before ${current}`,
          expected: "TechniqueId ascending",
        },
      ]);
    }
  }

  return success(deepFreezePlainJson(parsed));
}

export type ValidatedWeeklyTrainingPersonRecord = {
  record: WeeklyTrainingPersonRecord;
  view: WeeklyTrainingPersonView;
};

export function validateWeeklyTrainingPersonRecord(
  input: unknown,
): ValidationResult<ValidatedWeeklyTrainingPersonRecord> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "WeeklyTrainingPersonRecord must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, WEEKLY_TRAINING_PERSON_RECORD_KEYS, "", issues);

  const parsedPerson = parseWeeklyTrainingPerson(object["person"], "/person", issues);

  let growthProfile: GrowthProfile | undefined;
  const rawGrowthProfile = object["growthProfile"];
  if (!isGrowthProfile(rawGrowthProfile)) {
    issues.push({
      path: "/growthProfile",
      message: "growthProfile must be early | normal | late",
      actual: rawGrowthProfile,
      expected: GROWTH_PROFILES.join(" | "),
    });
  } else {
    growthProfile = rawGrowthProfile;
  }

  let growthPotential: GrowthPotentialScores | undefined;
  const growthPotentialResult = validateGrowthPotentialScores(object["growthPotential"]);
  if (!growthPotentialResult.ok) {
    for (const issue of growthPotentialResult.issues) {
      issues.push({ ...issue, path: `/growthPotential${issue.path}` });
    }
  } else {
    growthPotential = growthPotentialResult.value;
  }

  let statGrowthRemainders: StatGrowthRemainderCollection | undefined;
  const remaindersResult = validateStatGrowthRemainderCollection(object["statGrowthRemainders"]);
  if (!remaindersResult.ok) {
    for (const issue of remaindersResult.issues) {
      issues.push({ ...issue, path: `/statGrowthRemainders${issue.path}` });
    }
  } else {
    statGrowthRemainders = remaindersResult.value;
  }

  let temporaryCondition: PersonTemporaryCondition | undefined;
  const conditionResult = validatePersonTemporaryCondition(object["temporaryCondition"]);
  if (!conditionResult.ok) {
    for (const issue of conditionResult.issues) {
      issues.push({ ...issue, path: `/temporaryCondition${issue.path}` });
    }
  } else {
    temporaryCondition = conditionResult.value;
  }

  let motivationFactor: BasisPoints | undefined;
  if (!hasOwn(object, "motivationFactor")) {
    issues.push({
      path: "/motivationFactor",
      message: "motivationFactor is required and must not be defaulted to 10000 (08 §9)",
      expected: `${String(MOTIVATION_FACTOR_MINIMUM_BASIS_POINTS)}..${String(MOTIVATION_FACTOR_MAXIMUM_BASIS_POINTS)} basis points`,
    });
  } else {
    const bp = requireNormalizedBasisPointsValue(object["motivationFactor"]);
    if (
      bp === undefined ||
      bp < MOTIVATION_FACTOR_MINIMUM_BASIS_POINTS ||
      bp > MOTIVATION_FACTOR_MAXIMUM_BASIS_POINTS
    ) {
      issues.push({
        path: "/motivationFactor",
        message: "motivationFactor must be normalized basis points within 8000..11500 (08 §9)",
        actual: object["motivationFactor"],
        expected: "8000..11500",
      });
    } else {
      motivationFactor = bp;
    }
  }

  let plannerContext: WeeklyPlannerContext | undefined;
  const plannerResult = validateWeeklyPlannerContext(object["plannerContext"]);
  if (!plannerResult.ok) {
    for (const issue of plannerResult.issues) {
      issues.push({ ...issue, path: `/plannerContext${issue.path}` });
    }
  } else {
    plannerContext = plannerResult.value;
  }

  let statTargetContext: WeeklyStatTargetContext | undefined;
  const statTargetResult = validateWeeklyStatTargetContext(object["statTargetContext"]);
  if (!statTargetResult.ok) {
    for (const issue of statTargetResult.issues) {
      issues.push({ ...issue, path: `/statTargetContext${issue.path}` });
    }
  } else {
    statTargetContext = statTargetResult.value;
  }

  let techniqueTargetContexts: readonly TechniqueTargetContext[] | undefined;
  const techniqueContextsResult = validateTechniqueTargetContexts(
    object["techniqueTargetContexts"],
  );
  if (!techniqueContextsResult.ok) {
    for (const issue of techniqueContextsResult.issues) {
      issues.push({ ...issue, path: `/techniqueTargetContexts${issue.path}` });
    }
  } else {
    techniqueTargetContexts = techniqueContextsResult.value;
  }

  let teacherFactorKey: TeacherFactorKey | undefined;
  const rawTeacherFactorKey = object["teacherFactorKey"];
  if (
    typeof rawTeacherFactorKey !== "string" ||
    !(TEACHER_FACTOR_KEYS as readonly string[]).includes(rawTeacherFactorKey)
  ) {
    issues.push({
      path: "/teacherFactorKey",
      message: "teacherFactorKey must be one of the fixed growth.teacherFactors keys",
      actual: rawTeacherFactorKey,
      expected: TEACHER_FACTOR_KEYS.join(" | "),
    });
  } else {
    teacherFactorKey = rawTeacherFactorKey as TeacherFactorKey;
  }

  const discipleCount = requireSafeIntegerAtLeast(object, "discipleCount", "", 0, issues);

  if (
    parsedPerson === undefined ||
    growthProfile === undefined ||
    growthPotential === undefined ||
    statGrowthRemainders === undefined ||
    temporaryCondition === undefined ||
    motivationFactor === undefined ||
    plannerContext === undefined ||
    statTargetContext === undefined ||
    techniqueTargetContexts === undefined ||
    teacherFactorKey === undefined ||
    discipleCount === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const record = {
    person: parsedPerson.person,
    growthProfile,
    growthPotential,
    statGrowthRemainders,
    temporaryCondition,
    motivationFactor,
    plannerContext,
    statTargetContext,
    techniqueTargetContexts,
    teacherFactorKey,
    discipleCount,
  } satisfies WeeklyTrainingPersonRecord;

  return success({
    record: deepFreezePlainJson(record),
    view: deepFreezePlainJson(parsedPerson.view),
  });
}

/** 10 §6.2 / §6.3: absent `styleMatch` is 50, absent `teacherPriority` is 0. */
export function resolveStyleMatch(context: TechniqueTargetContext | undefined): number {
  return context?.styleMatch ?? NEUTRAL_NORMALIZED_INPUT;
}

export function resolveTeacherPriority(context: TechniqueTargetContext | undefined): number {
  return context?.teacherPriority ?? 0;
}

/** 09 §8: absent `TechniqueLearningContext` inputs are the neutral 50. */
export function resolveLearningTrait(context: TechniqueTargetContext | undefined): number {
  return context?.learningTrait ?? NEUTRAL_NORMALIZED_INPUT;
}

export function resolveTeachingAbility(context: TechniqueTargetContext | undefined): number {
  return context?.teachingAbility ?? NEUTRAL_NORMALIZED_INPUT;
}

export function resolveCompatibility(context: TechniqueTargetContext | undefined): number {
  return context?.compatibility ?? NEUTRAL_NORMALIZED_INPUT;
}
