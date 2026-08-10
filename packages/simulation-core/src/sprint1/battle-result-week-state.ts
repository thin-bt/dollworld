/**
 * BattleResultWeekState — same-week committed BattleResult count registry (S1-SPEC-0.1.20).
 *
 * Owned by Sprint1RunRuntimeState.battleResultWeekState (runtime-only; not fixed7).
 * Run-wide canonical BattleResult store is Sprint1RunRuntimeState.battleResults
 * (projected to final-world.battleResults). This week registry holds only the
 * current-week committed suffix used for matchesCompletedThisWorldWeekBeforeBattle.
 * Week advance resets results to [] without touching battleResults.
 */
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleResult } from "./battle-result-types.js";
import { BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION } from "./constants.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { validateBattleResult } from "./validate-battle-result.js";

export { BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION };

/** Canonical key order. */
export const BATTLE_RESULT_WEEK_STATE_KEYS = ["schemaVersion", "absoluteWeek", "results"] as const;

export type BattleResultWeekState = {
  schemaVersion: typeof BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION;
  absoluteWeek: number;
  /** Commit-order BattleResults for the current absoluteWeek. */
  results: readonly BattleResult[];
};

/**
 * Fresh week registry after promotion / week advance.
 * results is always empty.
 */
export function createInitialBattleResultWeekState(
  absoluteWeek: number,
): ValidationResult<BattleResultWeekState> {
  return validateBattleResultWeekState(
    {
      schemaVersion: BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
      absoluteWeek,
      results: [],
    },
    undefined,
    undefined,
  );
}

/**
 * Count completed matches in the current week registry for one person.
 * Only `resultKind === "completed"` counts.
 * `resolution_error` (`resultKind === "failed"`) may be registered but does not increment.
 */
export function countCompletedMatchesForPersonThisWorldWeek(
  state: BattleResultWeekState,
  personId: PersonId | string,
): number {
  let count = 0;
  for (const result of state.results) {
    if (result.resultKind !== "completed") {
      continue;
    }
    const a = result.finalState.participantA.personId;
    const b = result.finalState.participantB.personId;
    if (a === personId || b === personId) {
      count += 1;
    }
  }
  return count;
}

/**
 * Reject duplicate matchId against the current week registry (preflight).
 * Does not mutate state.
 */
export function assertBattleResultMatchIdNotInWeekState(
  state: BattleResultWeekState,
  matchId: string,
): ValidationResult<true> {
  for (const result of state.results) {
    if (result.matchId === matchId) {
      return failure([
        {
          path: "/results",
          message: "duplicate matchId is not allowed in the current week BattleResult registry",
          actual: matchId,
          expected: "unique MatchId values in results",
        },
      ]);
    }
  }
  return success(true);
}

/**
 * Append a validated BattleResult in commit order.
 * Rejects duplicate matchId without mutating the input state.
 */
export function appendBattleResultToWeekState(
  state: BattleResultWeekState,
  result: BattleResult,
): ValidationResult<BattleResultWeekState> {
  const dup = assertBattleResultMatchIdNotInWeekState(state, result.matchId);
  if (!dup.ok) {
    return failure(dup.issues);
  }
  return success(
    deepFreezePlainJson({
      schemaVersion: BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
      absoluteWeek: state.absoluteWeek,
      results: [...state.results, result],
    }),
  );
}

/**
 * Validate BattleResultWeekState.
 * When `runRuleSnapshot` and `provider` are both provided, each result is validated
 * via existing `validateBattleResult` (no duplicate BattleResult schema).
 * When either is omitted, results must be an empty array (fresh / structural-only path).
 */
export function validateBattleResultWeekState(
  input: unknown,
  runRuleSnapshot: unknown | undefined,
  provider: Sha256Provider | undefined,
): ValidationResult<BattleResultWeekState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleResultWeekState must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_RESULT_WEEK_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
    issues,
  );
  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", "", 0, issues);
  const rawResults = snapshotDenseArrayOrFail(object["results"], "/results", issues);

  if (
    schemaVersion === undefined ||
    absoluteWeek === undefined ||
    rawResults === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const canDeepValidate = runRuleSnapshot !== undefined && provider !== undefined;
  if (!canDeepValidate && rawResults.length > 0) {
    return failure([
      {
        path: "/results",
        message:
          "non-empty BattleResultWeekState.results require runRuleSnapshot and Sha256Provider for validateBattleResult",
        actual: rawResults.length,
        expected: "empty results, or provide runRuleSnapshot + provider",
      },
    ]);
  }

  const results: BattleResult[] = [];
  const seenMatchIds = new Set<string>();
  for (let index = 0; index < rawResults.length; index += 1) {
    if (!canDeepValidate || provider === undefined) {
      break;
    }
    const validated = validateBattleResult(rawResults[index], runRuleSnapshot, provider);
    if (!validated.ok) {
      for (const issue of validated.issues) {
        issues.push({
          ...issue,
          path: `/results/${String(index)}${issue.path === "" ? "" : issue.path}`,
        });
      }
      continue;
    }
    const matchId = validated.value.matchId;
    if (seenMatchIds.has(matchId)) {
      issues.push({
        path: `/results/${String(index)}/matchId`,
        message: "duplicate matchId is not allowed in the current week BattleResult registry",
        actual: matchId,
        expected: "unique MatchId values in results",
      });
    }
    seenMatchIds.add(matchId);
    results.push(validated.value);
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: BATTLE_RESULT_WEEK_STATE_SCHEMA_VERSION,
      absoluteWeek,
      results,
    }),
  );
}
