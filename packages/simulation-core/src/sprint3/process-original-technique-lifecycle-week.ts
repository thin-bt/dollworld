/**
 * S03-009 weekly world-step processor: research accumulation + generation attempts.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { importSeededRng } from "../rng.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { Sprint1PersonState } from "../sprint1/sprint1-person-state.js";
import {
  evaluateOriginalTechniqueGenerationAttempt,
  isOriginalTechniqueLifecycleEnabled,
} from "./evaluate-original-technique-lifecycle.js";
import {
  createInitialOriginalTechniqueLifecycleRuntimeState,
  researchValueFromTenths,
  researchValueToTenths,
  validateOriginalTechniqueLifecycleRuntimeState,
  type OriginalTechniqueLifecyclePersonEntry,
  type OriginalTechniqueLifecycleRuntimeState,
} from "./original-technique-lifecycle-runtime-state.js";
import { resolveAutonomousOriginalTechniqueWeeklyResearchIncrementTenths } from "./resolve-autonomous-original-technique-weekly-research-increment.js";
import type { Sprint3Config } from "./types.js";

const AUTONOMOUS_DEVELOPMENT_REASON = "autonomous_weekly_research_accumulation" as const;

export type ProcessOriginalTechniqueLifecycleWeekInput = {
  absoluteWeek: number;
  runSeed: number;
  worldState: WorldEngineState;
  sprint3Config?: Sprint3Config;
  runtimeState: OriginalTechniqueLifecycleRuntimeState | undefined;
};

export type ProcessOriginalTechniqueLifecycleWeekResult = {
  runtimeState: OriginalTechniqueLifecycleRuntimeState | undefined;
};

function selectSourceTechniqueIds(sprint1State: Sprint1PersonState | undefined): readonly string[] {
  if (sprint1State === undefined || sprint1State.techniqueStates.length === 0) {
    return ["unknown_source_technique"];
  }
  const sorted = [...sprint1State.techniqueStates].sort((left, right) => {
    const masteryDelta = right.masteryHundredths - left.masteryHundredths;
    if (masteryDelta !== 0) {
      return masteryDelta;
    }
    return compareUnicodeCodePoints(left.techniqueId, right.techniqueId);
  });
  return [sorted[0]!.techniqueId];
}

function proposeNewTechniqueId(personId: PersonId, successfulGenerationCount: number): string {
  return `original_${personId}_${String(successfulGenerationCount + 1)}`;
}

function upsertPersonEntry(
  entries: OriginalTechniqueLifecyclePersonEntry[],
  personId: PersonId,
): OriginalTechniqueLifecyclePersonEntry {
  const existing = entries.find((entry) => entry.personId === personId);
  if (existing !== undefined) {
    return existing;
  }
  return {
    personId,
    researchValueTenths: 0,
    cooldownWeeksRemaining: 0,
    successfulGenerationCount: 0,
  };
}

function replacePersonEntry(
  entries: readonly OriginalTechniqueLifecyclePersonEntry[],
  nextEntry: OriginalTechniqueLifecyclePersonEntry,
): OriginalTechniqueLifecyclePersonEntry[] {
  const without = entries.filter((entry) => entry.personId !== nextEntry.personId);
  const merged = [...without, nextEntry];
  merged.sort((left, right) => compareUnicodeCodePoints(left.personId, right.personId));
  return merged;
}

/**
 * Apply one world week of original-technique research accumulation and generation attempts.
 * No-op when Sprint3 lifecycle is unbound or disabled.
 */
export function processOriginalTechniqueLifecycleWeek(
  input: ProcessOriginalTechniqueLifecycleWeekInput,
): ValidationResult<ProcessOriginalTechniqueLifecycleWeekResult> {
  if (input.sprint3Config === undefined || !isOriginalTechniqueLifecycleEnabled(input.sprint3Config)) {
    return success({ runtimeState: input.runtimeState });
  }

  let runtime =
    input.runtimeState === undefined
      ? createInitialOriginalTechniqueLifecycleRuntimeState(input.runSeed)
      : cloneValidatedPlainJson(input.runtimeState);

  const validatedRuntime = validateOriginalTechniqueLifecycleRuntimeState(runtime);
  if (!validatedRuntime.ok) {
    return failure(
      validatedRuntime.issues.map((issue) => ({
        ...issue,
        path: `/originalTechniqueLifecycleRuntime${issue.path}`,
      })),
    );
  }
  runtime = validatedRuntime.value;

  const rng = importSeededRng(runtime.rngState);
  const personIds = input.worldState.persons
    .map((person) => person.personId)
    .sort(compareUnicodeCodePoints);

  let personEntries = [...runtime.personEntries];
  let foundingHistories = [...runtime.foundingHistories];
  const issues: ValidationIssue[] = [];

  for (const personId of personIds) {
    const person = input.worldState.persons.find((candidate) => candidate.personId === personId)!;
    let entry = upsertPersonEntry(personEntries, personId);

    if (entry.cooldownWeeksRemaining > 0) {
      entry = {
        ...entry,
        cooldownWeeksRemaining: entry.cooldownWeeksRemaining - 1,
      };
      personEntries = replacePersonEntry(personEntries, entry);
      continue;
    }

    const incrementTenths = resolveAutonomousOriginalTechniqueWeeklyResearchIncrementTenths({
      worldState: input.worldState,
      personId,
    });
    if (incrementTenths > 0) {
      entry = {
        ...entry,
        researchValueTenths: entry.researchValueTenths + incrementTenths,
      };
    }

    const researchValue = researchValueFromTenths(entry.researchValueTenths);
    const generation = evaluateOriginalTechniqueGenerationAttempt(
      input.sprint3Config,
      {
        founderPersonId: personId,
        researchValue,
        sourceTechniqueIds: selectSourceTechniqueIds(person.sprint1State),
        developmentReason: AUTONOMOUS_DEVELOPMENT_REASON,
        worldWeekIndex: input.absoluteWeek,
        cooldownWeeksRemaining: entry.cooldownWeeksRemaining,
        modifiers: { successPercentAdjustmentPoints: 0 },
        proposedNewTechniqueId: proposeNewTechniqueId(personId, entry.successfulGenerationCount),
      },
      rng,
    );
    if (!generation.ok) {
      issues.push(
        ...generation.issues.map((issue) => ({
          ...issue,
          path: `/generation/${personId}${issue.path}`,
        })),
      );
      continue;
    }

    const outcome = generation.value;
    switch (outcome.kind) {
      case "below_research_threshold":
        personEntries = replacePersonEntry(personEntries, entry);
        break;
      case "cooldown_active":
        personEntries = replacePersonEntry(personEntries, entry);
        break;
      case "generation_failed":
        entry = {
          ...entry,
          researchValueTenths: researchValueToTenths(outcome.retainedResearchValue ?? 0),
          cooldownWeeksRemaining: outcome.cooldownWeeksRemaining ?? 0,
        };
        personEntries = replacePersonEntry(personEntries, entry);
        break;
      case "generation_succeeded": {
        if (outcome.foundingHistory === undefined) {
          issues.push({
            path: `/generation/${personId}/foundingHistory`,
            message: "generation_succeeded requires foundingHistory",
            actual: undefined,
          });
          break;
        }
        foundingHistories = [...foundingHistories, outcome.foundingHistory];
        entry = {
          ...entry,
          researchValueTenths: 0,
          cooldownWeeksRemaining: 0,
          successfulGenerationCount: entry.successfulGenerationCount + 1,
        };
        personEntries = replacePersonEntry(personEntries, entry);
        break;
      }
      case "feature_disabled":
        break;
      default:
        break;
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const nextRuntime = validateOriginalTechniqueLifecycleRuntimeState(
    deepFreezePlainJson({
      ...runtime,
      rngState: rng.exportState(),
      lastProcessedAbsoluteWeek: input.absoluteWeek,
      personEntries,
      foundingHistories,
    }),
  );
  if (!nextRuntime.ok) {
    return failure(
      nextRuntime.issues.map((issue) => ({
        ...issue,
        path: `/originalTechniqueLifecycleRuntime${issue.path}`,
      })),
    );
  }

  return success({ runtimeState: nextRuntime.value });
}
