import type {
  BracketRuntimeSlotState,
  KnockoutStructuralSlot,
  StoredBattleResultRecord,
  TournamentBracketDefinition,
  TournamentSlotMatchBinding,
} from "@shared-world/simulation-core";
import { canonicalStructuralSlotKey } from "@shared-world/simulation-core";
import type { KnockoutBracketProgressView } from "./types.js";

function isKnockoutBattleSlot(slot: KnockoutStructuralSlot): boolean {
  return slot.isByeAdvancement !== true && (slot.feedsFromSlotIds?.length ?? 0) === 2;
}

function bindingForSlot(
  slotId: string,
  slotBindings: readonly TournamentSlotMatchBinding[],
): TournamentSlotMatchBinding | undefined {
  const key = canonicalStructuralSlotKey({ kind: "knockout", slotId });
  return slotBindings.find((binding) => binding.structuralSlotKey === key);
}

function recordForMatchId(
  matchId: string,
  storedRecords: readonly StoredBattleResultRecord[],
): StoredBattleResultRecord | undefined {
  return storedRecords.find((record) => record.matchId === matchId);
}

export function projectKnockoutBracketProgressView(input: {
  bracketDefinition: TournamentBracketDefinition;
  bracketRuntimeState: BracketRuntimeSlotState;
  storedRecords: readonly StoredBattleResultRecord[];
  slotBindings: readonly TournamentSlotMatchBinding[];
  displayNameForPersonId: (personId: string) => string;
}): KnockoutBracketProgressView | null {
  const {
    bracketDefinition,
    bracketRuntimeState,
    storedRecords,
    slotBindings,
    displayNameForPersonId,
  } = input;
  if (bracketDefinition.knockoutSlots.length === 0) {
    return null;
  }

  const battleSlots = [...bracketDefinition.knockoutSlots]
    .filter(isKnockoutBattleSlot)
    .sort((left, right) => {
      if (left.roundIndex !== right.roundIndex) {
        return left.roundIndex - right.roundIndex;
      }
      return left.slotIndex - right.slotIndex;
    });

  if (battleSlots.length === 0) {
    return null;
  }

  const runtimeById = new Map(
    bracketRuntimeState.slotStates.map((slot) => [slot.slotId, slot.resolvedParticipantPersonId]),
  );

  type MatchRow = KnockoutBracketProgressView["rounds"][number]["matches"][number];
  const matchesByRound = new Map<number, MatchRow[]>();

  let completed = 0;
  for (const slot of battleSlots) {
    const participantAId = runtimeById.get(slot.feedsFromSlotIds?.[0] ?? "") ?? null;
    const participantBId = runtimeById.get(slot.feedsFromSlotIds?.[1] ?? "") ?? null;
    const binding = bindingForSlot(slot.slotId, slotBindings);
    const matchId = binding?.matchId ?? null;
    let winnerPersonId: string | null = null;
    if (matchId !== null) {
      const record = recordForMatchId(matchId, storedRecords);
      winnerPersonId = record?.winnerPersonId ?? null;
      if (winnerPersonId !== null) {
        completed += 1;
      }
    }
    const ready = participantAId !== null && participantBId !== null;
    const status: "pending" | "ready" | "completed" =
      winnerPersonId !== null ? "completed" : ready ? "ready" : "pending";

    const row = {
      roundIndex: slot.roundIndex,
      slotId: slot.slotId,
      participantAId,
      participantBId,
      participantADisplayName:
        participantAId === null ? "—" : displayNameForPersonId(participantAId),
      participantBDisplayName:
        participantBId === null ? "—" : displayNameForPersonId(participantBId),
      matchId,
      winnerPersonId,
      status,
    };
    const roundMatches = matchesByRound.get(slot.roundIndex) ?? [];
    roundMatches.push(row);
    matchesByRound.set(slot.roundIndex, roundMatches);
  }

  const rounds = [...matchesByRound.entries()]
    .sort(([left], [right]) => left - right)
    .map(([roundIndex, matches]) => ({
      roundIndex,
      label: `第${roundIndex + 1}ラウンド`,
      matches,
    }));

  return {
    formatKind: bracketDefinition.formatKind,
    matchesTotal: battleSlots.length,
    matchesCompleted: completed,
    rounds,
  };
}
