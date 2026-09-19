import type {
  BracketRuntimeSlotState,
  KnockoutStructuralSlot,
  StoredBattleResultRecord,
  TournamentBracketDefinition,
  TournamentSlotMatchBinding,
} from "@shared-world/simulation-core";
import { canonicalStructuralSlotKey } from "@shared-world/simulation-core";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";

export type BracketStructuralSlot =
  | { kind: "round_robin"; pairIndex: number }
  | { kind: "group_round_robin"; pairIndex: number }
  | { kind: "knockout"; slotId: string };

export type BracketProgressSnapshot = {
  readonly nextStructuralSlot: BracketStructuralSlot | null;
  readonly matchesCompleted: number;
  readonly matchesTotal: number;
  readonly groupPhaseComplete: boolean;
  readonly knockoutPhaseComplete: boolean;
};

function boundSlotKeys(slotBindings: readonly TournamentSlotMatchBinding[]): Set<string> {
  return new Set(slotBindings.map((binding) => binding.structuralSlotKey));
}

function isKnockoutBattleSlot(slot: KnockoutStructuralSlot): boolean {
  return slot.isByeAdvancement !== true && (slot.feedsFromSlotIds?.length ?? 0) === 2;
}

function knockoutFeedersResolved(
  slot: KnockoutStructuralSlot,
  runtimeState: BracketRuntimeSlotState,
): boolean {
  for (const feederId of slot.feedsFromSlotIds ?? []) {
    const feeder = runtimeState.slotStates.find((row) => row.slotId === feederId);
    if (feeder?.resolvedParticipantPersonId === undefined) {
      return false;
    }
  }
  return true;
}

function countKnockoutBattleSlots(definition: TournamentBracketDefinition): number {
  return definition.knockoutSlots.filter(isKnockoutBattleSlot).length;
}

function findNextKnockoutBattleSlot(input: {
  definition: TournamentBracketDefinition;
  runtimeState: BracketRuntimeSlotState;
  slotBindings: readonly TournamentSlotMatchBinding[];
}): BracketStructuralSlot | null {
  const bound = boundSlotKeys(input.slotBindings);
  const ordered = [...input.definition.knockoutSlots].sort((left, right) => {
    if (left.roundIndex !== right.roundIndex) {
      return left.roundIndex - right.roundIndex;
    }
    return left.slotIndex - right.slotIndex;
  });
  for (const slot of ordered) {
    if (!isKnockoutBattleSlot(slot)) {
      continue;
    }
    const slotKey = canonicalStructuralSlotKey({ kind: "knockout", slotId: slot.slotId });
    if (bound.has(slotKey)) {
      continue;
    }
    if (!knockoutFeedersResolved(slot, input.runtimeState)) {
      continue;
    }
    return { kind: "knockout", slotId: slot.slotId };
  }
  return null;
}

export function projectBracketProgress(input: {
  bracketDefinition: TournamentBracketDefinition;
  bracketRuntimeState: BracketRuntimeSlotState;
  storedRecords: readonly StoredBattleResultRecord[];
  slotBindings: readonly TournamentSlotMatchBinding[];
}): BracketProgressSnapshot {
  const { bracketDefinition, storedRecords, slotBindings, bracketRuntimeState } = input;
  const bound = boundSlotKeys(slotBindings);

  if (bracketDefinition.formatKind === "round_robin") {
    const progress = projectRoundRobinProgress({ bracketDefinition, storedRecords });
    return {
      nextStructuralSlot:
        progress.nextPairIndex === null
          ? null
          : { kind: "round_robin", pairIndex: progress.nextPairIndex },
      matchesCompleted: progress.matchesCompleted,
      matchesTotal: progress.matchesTotal,
      groupPhaseComplete: true,
      knockoutPhaseComplete: true,
    };
  }

  const groupProgress =
    bracketDefinition.groupRoundRobinPairs.length > 0
      ? projectRoundRobinProgress({
          bracketDefinition: {
            ...bracketDefinition,
            roundRobinPairs: bracketDefinition.groupRoundRobinPairs,
          },
          storedRecords,
        })
      : null;

  const groupPhaseComplete =
    groupProgress === null ? true : groupProgress.nextPairIndex === null;
  const groupMatchesCompleted = groupProgress?.matchesCompleted ?? 0;
  const groupMatchesTotal = groupProgress?.matchesTotal ?? 0;

  if (!groupPhaseComplete) {
    return {
      nextStructuralSlot: {
        kind: "group_round_robin",
        pairIndex: groupProgress!.nextPairIndex!,
      },
      matchesCompleted: groupMatchesCompleted,
      matchesTotal: groupMatchesTotal + countKnockoutBattleSlots(bracketDefinition),
      groupPhaseComplete: false,
      knockoutPhaseComplete: false,
    };
  }

  const knockoutTotal = countKnockoutBattleSlots(bracketDefinition);
  const knockoutCompleted = [...bracketDefinition.knockoutSlots]
    .filter(isKnockoutBattleSlot)
    .filter((slot) =>
      bound.has(canonicalStructuralSlotKey({ kind: "knockout", slotId: slot.slotId })),
    ).length;

  const nextKnockout = findNextKnockoutBattleSlot({
    definition: bracketDefinition,
    runtimeState: bracketRuntimeState,
    slotBindings,
  });

  return {
    nextStructuralSlot: nextKnockout,
    matchesCompleted: groupMatchesCompleted + knockoutCompleted,
    matchesTotal: groupMatchesTotal + knockoutTotal,
    groupPhaseComplete: true,
    knockoutPhaseComplete: nextKnockout === null && knockoutCompleted === knockoutTotal,
  };
}

export function isBracketStructurallyComplete(progress: BracketProgressSnapshot): boolean {
  if (progress.matchesTotal <= 0) {
    return false;
  }
  return progress.nextStructuralSlot === null && progress.matchesCompleted >= progress.matchesTotal;
}
