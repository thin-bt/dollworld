/**
 * Fixed battle enumerations (11 mini-spec §4.1, §6, §7, §9 / S01-005).
 * `BattleRange` itself is owned by S01-001 (`./types.ts`) and is not redefined here.
 */

export const BATTLE_KINDS = ["official", "mock"] as const;
export type BattleKind = (typeof BATTLE_KINDS)[number];

/** Side labels used by participant snapshots and `participantSnapshotHashes` (11 §15). */
export const BATTLE_SIDES = ["sideA", "sideB"] as const;
export type BattleSide = (typeof BATTLE_SIDES)[number];

export const BATTLE_STATUSES = ["ready", "in_progress", "completed", "failed"] as const;
export type BattleStatus = (typeof BATTLE_STATUSES)[number];

export const BATTLE_TERMINAL_REASONS = [
  "knockout",
  "surrender",
  "unable_to_continue",
  "max_turns_reached",
] as const;
export type BattleTerminalReason = (typeof BATTLE_TERMINAL_REASONS)[number];

export function isBattleKind(value: unknown): value is BattleKind {
  return typeof value === "string" && (BATTLE_KINDS as readonly string[]).includes(value);
}

export function isBattleSide(value: unknown): value is BattleSide {
  return typeof value === "string" && (BATTLE_SIDES as readonly string[]).includes(value);
}

export function isBattleStatus(value: unknown): value is BattleStatus {
  return typeof value === "string" && (BATTLE_STATUSES as readonly string[]).includes(value);
}

export function isBattleTerminalReason(value: unknown): value is BattleTerminalReason {
  return (
    typeof value === "string" && (BATTLE_TERMINAL_REASONS as readonly string[]).includes(value)
  );
}
