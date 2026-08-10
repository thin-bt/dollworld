/**
 * Run-wide BattleResult canonical store helpers (S1-SPEC-0.1.20 / S01-008).
 *
 * Sprint1RunRuntimeState.battleResults owns every successfully committed
 * BattleResult for the run (commit order). BattleResultWeekState remains the
 * same-week count registry only.
 *
 * Production commitRunBattlePlan / fixed7 writer are not implemented here.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleResult } from "./battle-result-types.js";
import type { BattleResultWeekState } from "./battle-result-week-state.js";
import {
  appendBattleResultToWeekState,
  assertBattleResultMatchIdNotInWeekState,
} from "./battle-result-week-state.js";
import { assertNoAccessors, deepFreezePlainJson, snapshotDenseArrayOrFail } from "./plain-data.js";
import { validateBattleResult } from "./validate-battle-result.js";

export type BattleResultsStoreContext = {
  simulationId: string;
  runRuleSnapshotHash: string;
};

/**
 * Fresh run-wide store after promotion / new run start.
 */
export function createInitialBattleResults(): readonly BattleResult[] {
  return deepFreezePlainJson([]);
}

/**
 * Reject duplicate matchId against the run-wide store (preflight).
 * Does not mutate state.
 */
export function assertBattleResultMatchIdNotInStore(
  battleResults: readonly BattleResult[],
  matchId: string,
): ValidationResult<true> {
  for (const result of battleResults) {
    if (result.matchId === matchId) {
      return failure([
        {
          path: "/battleResults",
          message: "duplicate matchId is not allowed in the run-wide BattleResult store",
          actual: matchId,
          expected: "unique MatchId values in battleResults",
        },
      ]);
    }
  }
  return success(true);
}

/**
 * Append a BattleResult in commit order to the run-wide store.
 * Rejects duplicate matchId without mutating the input store.
 */
export function appendBattleResultToStore(
  battleResults: readonly BattleResult[],
  result: BattleResult,
): ValidationResult<readonly BattleResult[]> {
  const dup = assertBattleResultMatchIdNotInStore(battleResults, result.matchId);
  if (!dup.ok) {
    return failure(dup.issues);
  }
  return success(deepFreezePlainJson([...battleResults, result]));
}

function battleResultsCanonicallyEqual(a: BattleResult, b: BattleResult): boolean {
  return toCanonicalJson(a) === toCanonicalJson(b);
}

/**
 * Required invariant: week.results is the commit-ordered suffix of battleResults.
 *
 * N = week.results.length
 * N === 0 → empty week registry is allowed
 * N > 0 → battleResults.slice(battleResults.length - N) must canonically equal week.results
 *
 * Validate before battle facade / commitRunBattlePlan / weekly step.
 */
export function assertBattleResultsWeekSuffixInvariant(input: {
  battleResults: readonly BattleResult[];
  battleResultWeekState: Pick<BattleResultWeekState, "results">;
}): ValidationResult<true> {
  const weekResults = input.battleResultWeekState.results;
  const global = input.battleResults;
  const n = weekResults.length;
  if (n === 0) {
    return success(true);
  }
  if (n > global.length) {
    return failure([
      {
        path: "/battleResultWeekState/results",
        message:
          "battleResultWeekState.results length must not exceed battleResults length (week suffix invariant)",
        actual: n,
        expected: `<= ${String(global.length)}`,
      },
    ]);
  }
  const suffix = global.slice(global.length - n);
  for (let index = 0; index < n; index += 1) {
    const globalEntry = suffix[index]!;
    const weekEntry = weekResults[index]!;
    if (!battleResultsCanonicallyEqual(globalEntry, weekEntry)) {
      return failure([
        {
          path: `/battleResultWeekState/results/${String(index)}`,
          message:
            "battleResultWeekState.results must equal battleResults current-week committed suffix (canonical)",
          actual: weekEntry.matchId,
          expected: globalEntry.matchId,
        },
      ]);
    }
  }
  return success(true);
}

/**
 * Register one committed BattleResult into both the run-wide store and the week registry
 * in the same logical outer transaction. One-sided append is forbidden.
 *
 * Call only for completed / resolution_error BattleResults after commit success.
 * pre_start_failure / abort / commit failure must not call this helper.
 */
export function appendCommittedBattleResultToRuntimeStores(input: {
  battleResults: readonly BattleResult[];
  battleResultWeekState: BattleResultWeekState;
  result: BattleResult;
}): ValidationResult<{
  battleResults: readonly BattleResult[];
  battleResultWeekState: BattleResultWeekState;
}> {
  const globalDup = assertBattleResultMatchIdNotInStore(input.battleResults, input.result.matchId);
  if (!globalDup.ok) {
    return failure(globalDup.issues);
  }
  const weekDup = assertBattleResultMatchIdNotInWeekState(
    input.battleResultWeekState,
    input.result.matchId,
  );
  if (!weekDup.ok) {
    return failure(weekDup.issues);
  }
  const nextGlobal = appendBattleResultToStore(input.battleResults, input.result);
  if (!nextGlobal.ok) {
    return failure(nextGlobal.issues);
  }
  const nextWeek = appendBattleResultToWeekState(input.battleResultWeekState, input.result);
  if (!nextWeek.ok) {
    return failure(nextWeek.issues);
  }
  const suffixCheck = assertBattleResultsWeekSuffixInvariant({
    battleResults: nextGlobal.value,
    battleResultWeekState: nextWeek.value,
  });
  if (!suffixCheck.ok) {
    return failure(suffixCheck.issues);
  }
  return success({
    battleResults: nextGlobal.value,
    battleResultWeekState: nextWeek.value,
  });
}

/**
 * Validate a dense BattleResult[] as the run-wide / final-world.battleResults store.
 * Reuses validateBattleResult — does not reimplement BattleResult schema.
 *
 * When context is provided, each result must match simulationId and runRuleSnapshotHash.
 */
export function validateBattleResultsStore(
  input: unknown,
  runRuleSnapshot: unknown,
  provider: Sha256Provider,
  context?: BattleResultsStoreContext,
): ValidationResult<readonly BattleResult[]> {
  const issues: ValidationIssue[] = [];
  const rawResults = snapshotDenseArrayOrFail(input, "/battleResults", issues);
  if (rawResults === undefined || issues.length > 0) {
    return failure(issues);
  }

  const results: BattleResult[] = [];
  const seenMatchIds = new Set<string>();
  for (let index = 0; index < rawResults.length; index += 1) {
    const entry = rawResults[index];
    if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
      assertNoAccessors(
        entry as Record<string, unknown>,
        `/battleResults/${String(index)}`,
        issues,
      );
    }
    const validated = validateBattleResult(entry, runRuleSnapshot, provider);
    if (!validated.ok) {
      for (const issue of validated.issues) {
        issues.push({
          ...issue,
          path: `/battleResults/${String(index)}${issue.path === "" ? "" : issue.path}`,
        });
      }
      continue;
    }
    const matchId = validated.value.matchId;
    if (seenMatchIds.has(matchId)) {
      issues.push({
        path: `/battleResults/${String(index)}/matchId`,
        message: "duplicate matchId is not allowed in the run-wide BattleResult store",
        actual: matchId,
        expected: "unique MatchId values in battleResults",
      });
    }
    seenMatchIds.add(matchId);
    if (context !== undefined) {
      if (validated.value.simulationId !== context.simulationId) {
        issues.push({
          path: `/battleResults/${String(index)}/simulationId`,
          message: "BattleResult.simulationId must equal run simulationId",
          actual: validated.value.simulationId,
          expected: context.simulationId,
        });
      }
      if (validated.value.runRuleSnapshotHash !== context.runRuleSnapshotHash) {
        issues.push({
          path: `/battleResults/${String(index)}/runRuleSnapshotHash`,
          message: "BattleResult.runRuleSnapshotHash must equal run runRuleSnapshotHash",
          actual: validated.value.runRuleSnapshotHash,
          expected: context.runRuleSnapshotHash,
        });
      }
    }
    results.push(validated.value);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(deepFreezePlainJson(results));
}
