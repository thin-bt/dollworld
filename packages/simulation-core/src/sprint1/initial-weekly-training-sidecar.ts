/**
 * InitialWeeklyTrainingSidecarSnapshot — Sprint 1 run external sidecar input
 * (S1-SPEC-0.1.20 / 10). Does not store Person bodies; WorldEngine adapter merges
 * current Person + sidecar entry into WeeklyTrainingPersonRecord (S01-008).
 */
import { compareUnicodeCodePoints, toCanonicalJson } from "../canonical-json.js";
import { asPersonId } from "../ids.js";
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BasisPoints } from "./basis-points.js";
import { requireNormalizedBasisPointsValue } from "./basis-points.js";
import {
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  WEEKLY_TRAINING_PROCESSOR_ID,
} from "./constants.js";
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
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { validateStatGrowthRemainderCollection } from "./stat-growth-remainder.js";
import type { StatGrowthRemainderCollection } from "./stat-growth-remainder.js";
import {
  MOTIVATION_FACTOR_MAXIMUM_BASIS_POINTS,
  MOTIVATION_FACTOR_MINIMUM_BASIS_POINTS,
  validateTechniqueTargetContexts,
  validateWeeklyStatTargetContext,
} from "./weekly-training-types.js";
import type { TechniqueTargetContext, WeeklyStatTargetContext } from "./weekly-training-types.js";
import { validateWeeklyPlannerContext } from "./weekly-planner-context.js";
import type { WeeklyPlannerContext } from "./weekly-planner-context.js";

/** Re-export production processor / sourceProcessor literal for single-owner import. */
export { WEEKLY_TRAINING_PROCESSOR_ID };

export const INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_KEYS = ["schemaVersion", "entries"] as const;

export const INITIAL_WEEKLY_TRAINING_SIDECAR_ENTRY_KEYS = [
  "personId",
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

export type InitialWeeklyTrainingSidecarEntry = {
  personId: PersonId;
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

export type InitialWeeklyTrainingSidecarSnapshot = {
  schemaVersion: typeof INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION;
  entries: readonly InitialWeeklyTrainingSidecarEntry[];
};

function validateSidecarEntry(
  input: unknown,
  path: string,
  issues: ValidationIssue[],
): InitialWeeklyTrainingSidecarEntry | undefined {
  const object = snapshotPlainObjectOrFail(input, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, INITIAL_WEEKLY_TRAINING_SIDECAR_ENTRY_KEYS, path, issues);

  let personId: PersonId | undefined;
  if (!hasOwn(object, "personId") || typeof object["personId"] !== "string") {
    issues.push({
      path: `${path}/personId`,
      message: "personId must be a non-empty string",
      expected: "PersonId",
    });
  } else if (object["personId"].length === 0) {
    issues.push({
      path: `${path}/personId`,
      message: "personId must be a non-empty string",
      actual: object["personId"],
    });
  } else {
    personId = asPersonId(object["personId"]);
  }

  let growthProfile: GrowthProfile | undefined;
  const rawGrowthProfile = object["growthProfile"];
  if (!isGrowthProfile(rawGrowthProfile)) {
    issues.push({
      path: `${path}/growthProfile`,
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
      issues.push({ ...issue, path: `${path}/growthPotential${issue.path}` });
    }
  } else {
    growthPotential = growthPotentialResult.value;
  }

  let statGrowthRemainders: StatGrowthRemainderCollection | undefined;
  const remaindersResult = validateStatGrowthRemainderCollection(object["statGrowthRemainders"]);
  if (!remaindersResult.ok) {
    for (const issue of remaindersResult.issues) {
      issues.push({ ...issue, path: `${path}/statGrowthRemainders${issue.path}` });
    }
  } else {
    statGrowthRemainders = remaindersResult.value;
  }

  let temporaryCondition: PersonTemporaryCondition | undefined;
  const conditionResult = validatePersonTemporaryCondition(object["temporaryCondition"]);
  if (!conditionResult.ok) {
    for (const issue of conditionResult.issues) {
      issues.push({ ...issue, path: `${path}/temporaryCondition${issue.path}` });
    }
  } else {
    temporaryCondition = conditionResult.value;
  }

  let motivationFactor: BasisPoints | undefined;
  if (!hasOwn(object, "motivationFactor")) {
    issues.push({
      path: `${path}/motivationFactor`,
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
        path: `${path}/motivationFactor`,
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
      issues.push({ ...issue, path: `${path}/plannerContext${issue.path}` });
    }
  } else {
    plannerContext = plannerResult.value;
  }

  let statTargetContext: WeeklyStatTargetContext | undefined;
  const statTargetResult = validateWeeklyStatTargetContext(object["statTargetContext"]);
  if (!statTargetResult.ok) {
    for (const issue of statTargetResult.issues) {
      issues.push({ ...issue, path: `${path}/statTargetContext${issue.path}` });
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
      issues.push({ ...issue, path: `${path}/techniqueTargetContexts${issue.path}` });
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
      path: `${path}/teacherFactorKey`,
      message: "teacherFactorKey must be one of the fixed growth.teacherFactors keys",
      actual: rawTeacherFactorKey,
      expected: TEACHER_FACTOR_KEYS.join(" | "),
    });
  } else {
    teacherFactorKey = rawTeacherFactorKey as TeacherFactorKey;
  }

  const discipleCount = requireSafeIntegerAtLeast(object, "discipleCount", path, 0, issues);

  if (
    personId === undefined ||
    growthProfile === undefined ||
    growthPotential === undefined ||
    statGrowthRemainders === undefined ||
    temporaryCondition === undefined ||
    motivationFactor === undefined ||
    plannerContext === undefined ||
    statTargetContext === undefined ||
    techniqueTargetContexts === undefined ||
    teacherFactorKey === undefined ||
    discipleCount === undefined
  ) {
    return undefined;
  }

  return {
    personId,
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
  };
}

/**
 * Validate InitialWeeklyTrainingSidecarSnapshot.
 * Entries must be PersonId Unicode code point ascending with no duplicates.
 * Top-level required sidecar fields are never defaulted/neutral-filled.
 */
export function validateInitialWeeklyTrainingSidecarSnapshot(
  input: unknown,
): ValidationResult<InitialWeeklyTrainingSidecarSnapshot> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "InitialWeeklyTrainingSidecarSnapshot must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    issues,
  );

  const rawEntries = snapshotDenseArrayOrFail(object["entries"], "/entries", issues);
  if (schemaVersion === undefined || rawEntries === undefined || issues.length > 0) {
    return failure(issues);
  }

  const entries: InitialWeeklyTrainingSidecarEntry[] = [];
  let entriesOk = true;
  for (let index = 0; index < rawEntries.length; index += 1) {
    const entry = validateSidecarEntry(rawEntries[index], `/entries/${String(index)}`, issues);
    if (entry === undefined) {
      entriesOk = false;
      continue;
    }
    entries.push(entry);
  }
  if (!entriesOk || issues.length > 0) {
    return failure(issues);
  }

  const seen = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const id = entries[index]!.personId;
    if (seen.has(id)) {
      issues.push({
        path: `/entries/${String(index)}/personId`,
        message: "duplicate personId is not allowed",
        actual: id,
        expected: "unique PersonId values",
      });
    }
    seen.add(id);
    if (index > 0) {
      const prev = entries[index - 1]!.personId;
      if (compareUnicodeCodePoints(prev, id) >= 0) {
        issues.push({
          path: `/entries/${String(index)}/personId`,
          message: "entries must be sorted by PersonId Unicode code point ascending",
          actual: id,
          expected: `strictly after ${prev}`,
        });
      }
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
      entries,
    }),
  );
}

/**
 * SHA-256(canonical JSON of validated InitialWeeklyTrainingSidecarSnapshot).
 * Invalid input never calls `provider`.
 */
export function computeInitialWeeklyTrainingSidecarHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateInitialWeeklyTrainingSidecarSnapshot(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return safeHashUtf8(provider, toCanonicalJson(validated.value), "");
}
