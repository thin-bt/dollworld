/**
 * S03-020 weekly world-step: evaluate and persist original-technique loss transitions.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import {
  buildOriginalTechniqueLossEvaluationRecord,
  listTrackedOriginalTechniqueIds,
} from "./derive-live-original-technique-loss-evaluation.js";
import {
  buildOriginalTechniqueLossHistoryRecord,
  evaluateOriginalTechniqueLoss,
  isOriginalTechniqueLifecycleEnabled,
} from "./evaluate-original-technique-lifecycle.js";
import {
  validateOriginalTechniqueLifecycleRuntimeState,
  type OriginalTechniqueLifecycleRuntimeState,
} from "./original-technique-lifecycle-runtime-state.js";
import type { Sprint3MentorshipEntrypointRuntimeState } from "./sprint3-mentorship-entrypoint-runtime-state.js";
import type { Sprint3Config } from "./types.js";

export type ProcessOriginalTechniqueLossWeekInput = {
  absoluteWeek: number;
  worldState: WorldEngineState;
  sprint3Config?: Sprint3Config;
  runtimeState: OriginalTechniqueLifecycleRuntimeState | undefined;
  mentorshipRuntime: Sprint3MentorshipEntrypointRuntimeState | undefined;
};

export type ProcessOriginalTechniqueLossWeekResult = {
  runtimeState: OriginalTechniqueLifecycleRuntimeState | undefined;
};

export function processOriginalTechniqueLossWeek(
  input: ProcessOriginalTechniqueLossWeekInput,
): ValidationResult<ProcessOriginalTechniqueLossWeekResult> {
  if (
    input.sprint3Config === undefined ||
    !isOriginalTechniqueLifecycleEnabled(input.sprint3Config) ||
    input.runtimeState === undefined
  ) {
    return success({ runtimeState: input.runtimeState });
  }

  const runtime = cloneValidatedPlainJson(input.runtimeState);
  const validatedRuntime = validateOriginalTechniqueLifecycleRuntimeState(runtime);
  if (!validatedRuntime.ok) {
    return failure(
      validatedRuntime.issues.map((issue) => ({
        ...issue,
        path: `/originalTechniqueLifecycleRuntime${issue.path}`,
      })),
    );
  }

  const working = validatedRuntime.value;
  const lostTechniqueIds = new Set(working.lossHistories.map((record) => record.techniqueId));
  const techniqueIds = listTrackedOriginalTechniqueIds({
    foundingHistories: working.foundingHistories,
    lossHistories: working.lossHistories,
  });

  const founderByTechniqueId = new Map<string, string>();
  for (const history of working.foundingHistories) {
    if (!founderByTechniqueId.has(history.newTechniqueId)) {
      founderByTechniqueId.set(history.newTechniqueId, history.founderPersonId);
    }
  }

  const newLossRecords = [...working.lossHistories];
  for (const techniqueId of techniqueIds) {
    if (lostTechniqueIds.has(techniqueId)) {
      continue;
    }
    const founderPersonId = founderByTechniqueId.get(techniqueId);
    if (founderPersonId === undefined) {
      continue;
    }
    const evaluationRecord = buildOriginalTechniqueLossEvaluationRecord({
      techniqueId,
      founderPersonId,
      worldState: input.worldState,
      mentorshipRuntime: input.mentorshipRuntime,
    });
    const outcome = evaluateOriginalTechniqueLoss(evaluationRecord);
    if (!outcome.isLost) {
      continue;
    }
    newLossRecords.push(
      buildOriginalTechniqueLossHistoryRecord({
        techniqueId,
        founderPersonId,
        worldWeekIndex: input.absoluteWeek,
        reasons: outcome.reasons,
      }),
    );
    lostTechniqueIds.add(techniqueId);
  }

  newLossRecords.sort((left, right) =>
    compareUnicodeCodePoints(left.techniqueId, right.techniqueId),
  );

  const nextRuntime = validateOriginalTechniqueLifecycleRuntimeState(
    deepFreezePlainJson({
      ...working,
      lossHistories: newLossRecords,
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
