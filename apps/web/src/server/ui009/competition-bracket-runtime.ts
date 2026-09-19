import type {
  BracketRuntimeSlotState,
  KnockoutStructuralSlot,
  PersonId,
  TournamentBracketDefinition,
} from "@shared-world/simulation-core";

function cloneRuntimeState(state: BracketRuntimeSlotState): BracketRuntimeSlotState {
  return {
    ...state,
    slotStates: state.slotStates.map((slot) => ({ ...slot })),
  };
}

function setResolvedParticipant(
  state: BracketRuntimeSlotState,
  slotId: string,
  personId: PersonId,
): BracketRuntimeSlotState {
  const next = cloneRuntimeState(state);
  const slot = next.slotStates.find((row) => row.slotId === slotId);
  if (slot === undefined) {
    return state;
  }
  slot.resolvedParticipantPersonId = personId;
  return next;
}

/**
 * Propagate BYE and leaf seed resolutions through knockout feeder edges.
 */
export function resolveKnockoutByeAdvancements(
  definition: TournamentBracketDefinition,
  runtimeState: BracketRuntimeSlotState,
): BracketRuntimeSlotState {
  let current = cloneRuntimeState(runtimeState);
  const slotsById = new Map(definition.knockoutSlots.map((slot) => [slot.slotId, slot]));
  let changed = true;
  while (changed) {
    changed = false;
    for (const slotState of current.slotStates) {
      if (slotState.resolvedParticipantPersonId !== undefined) {
        continue;
      }
      const structural = slotsById.get(slotState.slotId);
      if (structural === undefined) {
        continue;
      }
      if (structural.isByeAdvancement === true && structural.participantPersonId !== undefined) {
        current = setResolvedParticipant(current, slotState.slotId, structural.participantPersonId);
        changed = true;
        continue;
      }
      const feeders = structural.feedsFromSlotIds;
      if (feeders === undefined || feeders.length !== 2) {
        continue;
      }
      const left = current.slotStates.find((row) => row.slotId === feeders[0]);
      const right = current.slotStates.find((row) => row.slotId === feeders[1]);
      if (
        left?.resolvedParticipantPersonId !== undefined &&
        right?.resolvedParticipantPersonId !== undefined &&
        left.resolvedParticipantPersonId === right.resolvedParticipantPersonId
      ) {
        current = setResolvedParticipant(
          current,
          slotState.slotId,
          left.resolvedParticipantPersonId,
        );
        changed = true;
      }
    }
  }
  return current;
}

export function applyKnockoutBattleWinner(
  runtimeState: BracketRuntimeSlotState,
  knockoutSlotId: string,
  winnerPersonId: PersonId,
): BracketRuntimeSlotState {
  return setResolvedParticipant(runtimeState, knockoutSlotId, winnerPersonId);
}

export function seedKnockoutLeafParticipants(
  definition: TournamentBracketDefinition,
  runtimeState: BracketRuntimeSlotState,
  orderedPersonIds: readonly PersonId[],
): BracketRuntimeSlotState {
  let current = runtimeState;
  for (const slot of definition.knockoutSlots) {
    if (slot.participantPersonId !== undefined) {
      current = setResolvedParticipant(current, slot.slotId, slot.participantPersonId);
    }
  }
  if (orderedPersonIds.length > 0) {
    for (const personId of orderedPersonIds) {
      const leaf = definition.knockoutSlots.find(
        (slot) => slot.participantPersonId === personId && slot.feedsFromSlotIds === undefined,
      );
      if (leaf !== undefined) {
        current = setResolvedParticipant(current, leaf.slotId, personId);
      }
    }
  }
  return resolveKnockoutByeAdvancements(definition, current);
}

export function findFinalKnockoutBattleSlot(
  definition: TournamentBracketDefinition,
): KnockoutStructuralSlot | null {
  const battleSlots = definition.knockoutSlots.filter(
    (slot) => slot.isByeAdvancement !== true && (slot.feedsFromSlotIds?.length ?? 0) === 2,
  );
  if (battleSlots.length === 0) {
    return null;
  }
  return battleSlots.sort((left, right) => {
    if (left.roundIndex !== right.roundIndex) {
      return right.roundIndex - left.roundIndex;
    }
    return right.slotIndex - left.slotIndex;
  })[0]!;
}
