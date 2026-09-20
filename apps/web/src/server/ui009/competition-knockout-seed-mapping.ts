import type {
  KnockoutSeedByeMapping,
  KnockoutStructuralSlot,
  PersonId,
} from "@shared-world/simulation-core";

export const UI009_KNOCKOUT_SEED_BYE_POLICY = {
  policyVersion: "ui009-knockout-seed-bye-0.1.0",
  configVersion: "ui009-knockout-seed-bye-config-a",
} as const;

/** Standard first-round pairings for power-of-two bracket positions (0-indexed). */
const BRACKET_FIRST_ROUND_PAIRINGS: readonly (readonly [number, number])[] = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [8, 9],
  [10, 11],
  [12, 13],
  [14, 15],
];

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) {
    size *= 2;
  }
  return size;
}

function appendUpperRounds(
  slots: KnockoutStructuralSlot[],
  firstRoundSlotIds: readonly string[],
): string {
  let previous = [...firstRoundSlotIds];
  let roundIndex = 1;
  while (previous.length > 1) {
    const next: string[] = [];
    for (let matchIndex = 0; matchIndex < previous.length; matchIndex += 2) {
      const leftFeeder = previous[matchIndex]!;
      const rightFeeder = previous[matchIndex + 1];
      if (rightFeeder === undefined) {
        next.push(leftFeeder);
        continue;
      }
      const slotId = previous.length === 2 ? "final" : `ko_r${roundIndex}_m${matchIndex / 2}`;
      next.push(slotId);
      slots.push({
        slotId,
        roundIndex,
        slotIndex: matchIndex / 2,
        feedsFromSlotIds: [leftFeeder, rightFeeder],
      });
    }
    previous = next;
    roundIndex += 1;
  }
  return previous[0] ?? "final";
}

/**
 * Deterministic single-elimination knockout mapping for UI009 integration.
 * Seeds follow orderedPersonIds; empty bracket positions are structural BYEs.
 */
export function buildUi009SingleEliminationKnockoutMapping(
  orderedPersonIds: readonly PersonId[],
): KnockoutSeedByeMapping {
  const bracketSize = nextPowerOfTwo(Math.max(2, orderedPersonIds.length));
  const slots: KnockoutStructuralSlot[] = [];

  type BracketCell = PersonId | "BYE";
  const padded: BracketCell[] = [...orderedPersonIds];
  while (padded.length < bracketSize) {
    padded.push("BYE");
  }

  const firstRoundSlotIds: string[] = [];
  const pairings = BRACKET_FIRST_ROUND_PAIRINGS.slice(0, bracketSize / 2);
  for (let matchIndex = 0; matchIndex < pairings.length; matchIndex += 1) {
    const [leftIndex, rightIndex] = pairings[matchIndex]!;
    const left = padded[leftIndex]!;
    const right = padded[rightIndex]!;
    if (left === "BYE" && right === "BYE") {
      continue;
    }

    const battleSlotId = `ko_r0_m${matchIndex}`;
    firstRoundSlotIds.push(battleSlotId);

    if (left !== "BYE" && right !== "BYE") {
      const leftLeafId = `${battleSlotId}_a`;
      const rightLeafId = `${battleSlotId}_b`;
      slots.push({
        slotId: leftLeafId,
        roundIndex: 0,
        slotIndex: matchIndex * 2,
        participantPersonId: left,
        seedRank: leftIndex + 1,
      });
      slots.push({
        slotId: rightLeafId,
        roundIndex: 0,
        slotIndex: matchIndex * 2 + 1,
        participantPersonId: right,
        seedRank: rightIndex + 1,
      });
      slots.push({
        slotId: battleSlotId,
        roundIndex: 0,
        slotIndex: matchIndex,
        feedsFromSlotIds: [leftLeafId, rightLeafId],
      });
      continue;
    }

    const lone = (left !== "BYE" ? left : right) as PersonId;
    const seedRank = left !== "BYE" ? leftIndex + 1 : rightIndex + 1;
    slots.push({
      slotId: battleSlotId,
      roundIndex: 0,
      slotIndex: matchIndex,
      participantPersonId: lone,
      seedRank,
      isByeAdvancement: true,
    });
  }

  appendUpperRounds(slots, firstRoundSlotIds);

  return {
    policyIdentity: { ...UI009_KNOCKOUT_SEED_BYE_POLICY },
    slots,
  };
}
