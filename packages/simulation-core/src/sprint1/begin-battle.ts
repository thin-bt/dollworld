/**
 * Internal stage 2 of the battle start transaction: the `ready` → `in_progress`
 * transition and the single `battle.started` candidate (12 mini-spec §2, 11 §15 /
 * S01-005).
 *
 * Not exported from the package root. RNG, `turnNumber`, `actionSequence`,
 * participant state, and the detailed log are all carried over unchanged.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import type { ValidationIssue } from "../validation.js";
import { createBattleStartedEventCandidate } from "./battle-started-event.js";
import type { BattleStartedEventCandidate } from "./battle-started-event.js";
import {
  validateBattleState,
  validateBegunBattleState,
  validateInitialReadyBattleState,
} from "./battle-state.js";
import type { BattleState } from "./battle-state.js";

export type BattleStartValidation = {
  ok: boolean;
  issues: readonly ValidationIssue[];
};

export type BeginBattleResult =
  | {
      kind: "success";
      battleState: BattleState;
      eventCandidate: BattleStartedEventCandidate;
      validation: BattleStartValidation;
    }
  | {
      kind: "failure";
      battleState: null;
      eventCandidate: null;
      validation: BattleStartValidation;
    };

function beginBattleFailure(issues: readonly ValidationIssue[]): BeginBattleResult {
  return {
    kind: "failure",
    battleState: null,
    eventCandidate: null,
    validation: { ok: false, issues },
  };
}

export function beginBattle(input: unknown, provider: Sha256Provider): BeginBattleResult {
  const validated = validateBattleState(input, provider);
  if (!validated.ok) {
    return beginBattleFailure(validated.issues);
  }

  const initialReady = validateInitialReadyBattleState(validated.value);
  if (!initialReady.ok) {
    return beginBattleFailure(initialReady.issues);
  }

  const started = validateBattleState({ ...initialReady.value, status: "in_progress" }, provider);
  if (!started.ok) {
    return beginBattleFailure(started.issues);
  }

  const begun = validateBegunBattleState(started.value);
  if (!begun.ok) {
    return beginBattleFailure(begun.issues);
  }

  return {
    kind: "success",
    battleState: begun.value,
    eventCandidate: createBattleStartedEventCandidate(begun.value),
    validation: { ok: true, issues: [] },
  };
}
