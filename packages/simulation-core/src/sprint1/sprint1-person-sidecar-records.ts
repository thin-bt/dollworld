/**
 * Merge WorldEngine Person + weekly-training sidecar entry into WeeklyTrainingPersonRecord
 * (S01-008 / 10). Missing sidecar entries reject; no neutral defaults.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { InitialWeeklyTrainingSidecarEntry } from "./initial-weekly-training-sidecar.js";
import { validateWeeklyTrainingSidecarState } from "./weekly-training-sidecar-state.js";
import {
  validateWeeklyTrainingPersonRecord,
  type WeeklyTrainingPersonRecord,
} from "./weekly-training-types.js";
import {
  lookupMentorshipRelationKindForChild,
  type Sprint3MentorshipEntrypointRuntimeState,
} from "../sprint3/sprint3-mentorship-entrypoint-runtime-state.js";

function mismatch(
  path: string,
  message: string,
  actual: unknown,
  expected: unknown,
): ValidationIssue {
  return { path, message, actual, expected: String(expected) };
}

function sortedPersonIds(personIds: readonly PersonId[]): PersonId[] {
  return [...personIds].sort((a, b) => compareUnicodeCodePoints(a, b));
}

/**
 * Build validated WeeklyTrainingPersonRecord[] from current world persons and sidecar entries.
 * Every living/deceased person in worldState must have exactly one sidecar entry.
 */
export function buildWeeklyTrainingPersonRecords(
  worldState: WorldEngineState,
  sidecars: unknown,
  mentorshipEntrypointRuntime?: Sprint3MentorshipEntrypointRuntimeState,
): ValidationResult<readonly WeeklyTrainingPersonRecord[]> {
  const sidecarResult = validateWeeklyTrainingSidecarState(sidecars);
  if (!sidecarResult.ok) {
    return failure(
      sidecarResult.issues.map((issue) => ({
        ...issue,
        path: `/weeklyTrainingSidecars${issue.path}`,
      })),
    );
  }

  const sidecarByPersonId = new Map<PersonId, InitialWeeklyTrainingSidecarEntry>();
  for (let index = 0; index < sidecarResult.value.entries.length; index += 1) {
    const entry = sidecarResult.value.entries[index]!;
    if (sidecarByPersonId.has(entry.personId)) {
      return failure([
        mismatch(
          `/weeklyTrainingSidecars/entries/${String(index)}/personId`,
          "duplicate sidecar personId is not allowed",
          entry.personId,
          "unique PersonId",
        ),
      ]);
    }
    sidecarByPersonId.set(entry.personId, entry);
  }

  const worldPersonIds = sortedPersonIds(worldState.persons.map((person) => person.personId));
  const sidecarPersonIds = sortedPersonIds(
    sidecarResult.value.entries.map((entry) => entry.personId),
  );

  const issues: ValidationIssue[] = [];
  if (worldPersonIds.length !== sidecarPersonIds.length) {
    issues.push(
      mismatch(
        "/weeklyTrainingSidecars/entries",
        "world persons and sidecar entries must be exact 1:1",
        sidecarPersonIds.length,
        String(worldPersonIds.length),
      ),
    );
  }

  for (const personId of worldPersonIds) {
    if (!sidecarByPersonId.has(personId)) {
      issues.push(
        mismatch(
          `/weeklyTrainingSidecars/entries`,
          `missing sidecar entry for world person ${personId}`,
          "absent",
          personId,
        ),
      );
    }
  }

  for (const personId of sidecarPersonIds) {
    if (!worldPersonIds.includes(personId)) {
      issues.push(
        mismatch(
          `/weeklyTrainingSidecars/entries`,
          `sidecar entry ${personId} has no matching world person`,
          personId,
          "matching PersonId in worldState.persons",
        ),
      );
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const records: WeeklyTrainingPersonRecord[] = [];
  for (const person of worldState.persons) {
    const entry = sidecarByPersonId.get(person.personId)!;
    const mentorshipRelationKind = lookupMentorshipRelationKindForChild(
      mentorshipEntrypointRuntime,
      person.personId,
    );
    const record: WeeklyTrainingPersonRecord = {
      person,
      growthProfile: entry.growthProfile,
      growthPotential: entry.growthPotential,
      statGrowthRemainders: entry.statGrowthRemainders,
      temporaryCondition: entry.temporaryCondition,
      motivationFactor: entry.motivationFactor,
      plannerContext: entry.plannerContext,
      statTargetContext: entry.statTargetContext,
      techniqueTargetContexts: entry.techniqueTargetContexts,
      teacherFactorKey: entry.teacherFactorKey,
      discipleCount: entry.discipleCount,
      ...(mentorshipRelationKind === undefined ? {} : { mentorshipRelationKind }),
    };
    const validated = validateWeeklyTrainingPersonRecord(record);
    if (!validated.ok) {
      return failure(
        validated.issues.map((issue) => ({
          ...issue,
          path: `/personRecords/${person.personId}${issue.path}`,
        })),
      );
    }
    records.push(validated.value.record);
  }

  records.sort((a, b) => compareUnicodeCodePoints(a.person.personId, b.person.personId));
  return success(records);
}
