/**
 * Mark last committed BattleState as failed without advancing logs/RNG (12 §23.2 / 13 §16).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleFailureInfo, BattleState } from "./battle-state.js";
import { validateBattleState } from "./battle-state.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";

/**
 * Clone the last battle-local committed state and attach failure only.
 * status=failed, terminalReason=null; logs / turnNumber / rng / participants unchanged.
 */
export function markBattleFailedState(
  lastCommitted: BattleState,
  failureInfo: BattleFailureInfo,
  provider: Sha256Provider,
): ValidationResult<BattleState> {
  if (lastCommitted.status !== "in_progress" && lastCommitted.status !== "ready") {
    // Allow marking from in_progress primarily; ready should not reach here after begin.
    // If already failed/completed, reject.
    if (lastCommitted.status === "failed" || lastCommitted.status === "completed") {
      return failure([
        {
          path: "/status",
          message: "markBattleFailedState requires a non-terminal last committed BattleState",
          actual: lastCommitted.status,
        },
      ]);
    }
  }

  const cloned = cloneValidatedPlainJson(lastCommitted);
  const candidate = deepFreezePlainJson({
    ...cloned,
    status: "failed" as const,
    terminalReason: null,
    failure: cloneValidatedPlainJson(failureInfo),
  });
  return validateBattleState(candidate, provider);
}

/** Pure structure helper used when validateBattleState already holds the provider path. */
export function buildFailedBattleStateMaterial(
  lastCommitted: BattleState,
  failureInfo: BattleFailureInfo,
): BattleState {
  const cloned = cloneValidatedPlainJson(lastCommitted);
  return deepFreezePlainJson({
    ...cloned,
    status: "failed" as const,
    terminalReason: null,
    failure: cloneValidatedPlainJson(failureInfo),
  });
}

export function assertFailedStatePreservesCommittedBody(
  before: BattleState,
  after: BattleState,
): ValidationResult<true> {
  const beforeWithoutTerminal = {
    ...before,
    status: undefined,
    terminalReason: undefined,
    failure: undefined,
  };
  const afterWithoutTerminal = {
    ...after,
    status: undefined,
    terminalReason: undefined,
    failure: undefined,
  };
  // Compare via JSON of shared fields excluding status/terminal/failure
  const keys = Object.keys(before) as (keyof BattleState)[];
  for (const key of keys) {
    if (key === "status" || key === "terminalReason" || key === "failure") continue;
    const left = before[key];
    const right = after[key];
    if (JSON.stringify(left) !== JSON.stringify(right)) {
      return failure([
        {
          path: `/${String(key)}`,
          message: "failed state must preserve last committed battle body except failure fields",
        },
      ]);
    }
  }
  if (after.status !== "failed") {
    return failure([{ path: "/status", message: "status must be failed", actual: after.status }]);
  }
  if (after.terminalReason !== null) {
    return failure([
      {
        path: "/terminalReason",
        message: "terminalReason must be null for failed state",
        actual: after.terminalReason,
      },
    ]);
  }
  if (after.failure === null) {
    return failure([{ path: "/failure", message: "failure is required for failed state" }]);
  }
  void beforeWithoutTerminal;
  void afterWithoutTerminal;
  return success(true);
}
