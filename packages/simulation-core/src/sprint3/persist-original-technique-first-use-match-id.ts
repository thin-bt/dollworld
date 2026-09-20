/**
 * S03-011: persist authoritative first-use MatchId on original-technique founding history.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { BattleDevelopmentEffects, BattleResult } from "../sprint1/battle-result-types.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { Sprint1RunRuntimeState } from "../sprint1/sprint1-run-session.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { isOriginalTechniqueLifecycleEnabled } from "./evaluate-original-technique-lifecycle.js";
import {
  validateOriginalTechniqueLifecycleRuntimeState,
  type OriginalTechniqueLifecycleRuntimeState,
} from "./original-technique-lifecycle-runtime-state.js";
import type { Sprint3Config } from "./types.js";

/** TechniqueIds with at least one successful in-battle use (BattleResult developmentEffects). */
export function collectSuccessfulBattleTechniqueUseIds(
  developmentEffects: BattleDevelopmentEffects | readonly [],
): readonly string[] {
  if (Array.isArray(developmentEffects) && developmentEffects.length === 0) {
    return [];
  }
  const effects = developmentEffects as BattleDevelopmentEffects;
  const ids = new Set<string>();
  for (const delta of effects.participantA.techniqueStateDeltas) {
    if (delta.successfulUseCountDelta > 0) {
      ids.add(delta.techniqueId);
    }
  }
  for (const delta of effects.participantB.techniqueStateDeltas) {
    if (delta.successfulUseCountDelta > 0) {
      ids.add(delta.techniqueId);
    }
  }
  return [...ids].sort(compareUnicodeCodePoints);
}

export function applyFirstUseMatchIdToOriginalTechniqueFoundingHistories(input: {
  runtimeState: OriginalTechniqueLifecycleRuntimeState;
  matchId: string;
  successfullyUsedTechniqueIds: readonly string[];
}): ValidationResult<OriginalTechniqueLifecycleRuntimeState> {
  if (input.successfullyUsedTechniqueIds.length === 0) {
    return success(input.runtimeState);
  }

  const usedSet = new Set(input.successfullyUsedTechniqueIds);
  let changed = false;
  const nextHistories = input.runtimeState.foundingHistories.map((history) => {
    if (!usedSet.has(history.newTechniqueId)) {
      return history;
    }
    if (history.firstUseMatchId !== undefined) {
      return history;
    }
    changed = true;
    return deepFreezePlainJson({
      ...history,
      firstUseMatchId: input.matchId,
    });
  });

  if (!changed) {
    return success(input.runtimeState);
  }

  const nextRuntime = validateOriginalTechniqueLifecycleRuntimeState(
    deepFreezePlainJson({
      ...cloneValidatedPlainJson(input.runtimeState),
      foundingHistories: nextHistories,
    }),
  );
  if (!nextRuntime.ok) {
    return failure(
      nextRuntime.issues.map((issue: ValidationIssue) => ({
        ...issue,
        path: `/originalTechniqueLifecycleRuntime${issue.path}`,
      })),
    );
  }

  return success(nextRuntime.value);
}

/**
 * Battle commit boundary: record first-use MatchId once per founded technique (unset only).
 */
export function applyOriginalTechniqueFirstUseMatchIdAfterBattleCommit(input: {
  sprint3Config: Sprint3Config | undefined;
  runtimeState: Sprint1RunRuntimeState;
  battleResult: BattleResult;
}): ValidationResult<Sprint1RunRuntimeState> {
  if (
    input.battleResult.resultKind !== "completed" ||
    input.sprint3Config === undefined ||
    !isOriginalTechniqueLifecycleEnabled(input.sprint3Config) ||
    input.runtimeState.originalTechniqueLifecycleRuntime === undefined
  ) {
    return success(input.runtimeState);
  }

  const successfullyUsedTechniqueIds = collectSuccessfulBattleTechniqueUseIds(
    input.battleResult.developmentEffects,
  );
  const applied = applyFirstUseMatchIdToOriginalTechniqueFoundingHistories({
    runtimeState: input.runtimeState.originalTechniqueLifecycleRuntime,
    matchId: input.battleResult.matchId,
    successfullyUsedTechniqueIds,
  });
  if (!applied.ok) {
    return applied;
  }

  if (applied.value === input.runtimeState.originalTechniqueLifecycleRuntime) {
    return success(input.runtimeState);
  }

  return success({
    ...input.runtimeState,
    originalTechniqueLifecycleRuntime: applied.value,
  });
}
