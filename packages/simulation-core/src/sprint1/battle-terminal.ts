/**
 * Terminal battle state transition helpers (12 §6 / S01-006).
 * Re-exports selectTerminalReason and applies completed status.
 */
import { deepFreezePlainJson } from "./plain-data.js";
import type { BattleState } from "./battle-state.js";
import type { BattleTerminalReason } from "./battle-enums.js";
import { selectTerminalReason } from "./battle-surrender.js";
import type { TerminalCheckInput } from "./battle-surrender.js";

export { selectTerminalReason };
export type { TerminalCheckInput };

export function applyTerminalIfNeeded(state: BattleState, check: TerminalCheckInput): BattleState {
  const reason: BattleTerminalReason | null = selectTerminalReason(check);
  if (reason === null) {
    return state;
  }
  return deepFreezePlainJson({
    ...state,
    status: "completed",
    terminalReason: reason,
    failure: null,
  });
}

export function isBattleTerminal(state: BattleState): boolean {
  return state.status === "completed" || state.status === "failed";
}
