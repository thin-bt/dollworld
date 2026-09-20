/**
 * S02-004 policy-injected structural bracket definition vs runtime slot state.
 * Pure build consumes zero MatchId and zero World/Battle RNG.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  BRACKET_RUNTIME_SLOT_STATE_SCHEMA_VERSION,
  TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION,
} from "./constants.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  assertScheduleLifecycleIdentityFresh,
  computeParticipantListHash,
} from "./tournament-entry-selection.js";
import type { EntryChoicePolicyIdentity, ScheduleLifecycleIdentity } from "./types.js";
import type {
  InjectedStructuralPolicyInput,
  KnockoutSeedByeMapping,
  KnockoutStructuralSlot,
  StructuralFormatKind,
} from "./tournament-bracket-policy.js";
import { validateInjectedStructuralPolicyInput } from "./tournament-bracket-policy.js";

export type StructuralRoundRobinPair = {
  pairIndex: number;
  personIdA: PersonId;
  personIdB: PersonId;
};

export type StructuralGroupMembership = {
  groupIndex: number;
  personIds: readonly PersonId[];
};

export type TournamentBracketDefinition = {
  schemaVersion: typeof TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION;
  tournamentId: TournamentId;
  participantListHash: string;
  orderedPersonIds: readonly PersonId[];
  scheduleLifecycleIdentityHash: string;
  formatKind: StructuralFormatKind;
  roundRobinPairs: readonly StructuralRoundRobinPair[];
  groupMemberships: readonly StructuralGroupMembership[];
  groupRoundRobinPairs: readonly StructuralRoundRobinPair[];
  knockoutSlots: readonly KnockoutStructuralSlot[];
  policyIdentities: {
    formatSelection: InjectedStructuralPolicyInput["formatSelection"]["policyIdentity"];
    knockoutSeedBye: InjectedStructuralPolicyInput["knockoutSeedByePolicyIdentity"];
    standingsTieBreak: InjectedStructuralPolicyInput["standingsTieBreakPolicyIdentity"];
  };
  bracketDefinitionHash: string;
};

export type BracketRuntimeSlotState = {
  schemaVersion: typeof BRACKET_RUNTIME_SLOT_STATE_SCHEMA_VERSION;
  tournamentId: TournamentId;
  bracketDefinitionHash: string;
  /** Mutable progression lives here; excluded from bracket-definition hash. */
  slotStates: readonly {
    slotId: string;
    resolvedParticipantPersonId?: PersonId;
  }[];
};

export type StructuralBracketHandoff = {
  tournamentId: TournamentId;
  bracketDefinitionHash: string;
  participantListHash: string;
  scheduleLifecycleIdentityHash: string;
  formatKind: StructuralFormatKind;
  orderedPersonIds: readonly PersonId[];
  roundRobinPairs: readonly StructuralRoundRobinPair[];
  groupMemberships: readonly StructuralGroupMembership[];
  groupRoundRobinPairs: readonly StructuralRoundRobinPair[];
  knockoutSlots: readonly KnockoutStructuralSlot[];
  policyIdentities: TournamentBracketDefinition["policyIdentities"];
};

export type StructuralBracketBuildInput = {
  tournamentId: TournamentId;
  orderedPersonIds: readonly PersonId[];
  participantListHash: string;
  scheduleLifecycleIdentity: ScheduleLifecycleIdentity;
  entryChoicePolicyIdentity: EntryChoicePolicyIdentity;
  expectedScheduleLifecycleIdentity?: ScheduleLifecycleIdentity;
  policy: InjectedStructuralPolicyInput;
};

export type StructuralBracketBuildResult = {
  definition: TournamentBracketDefinition;
  runtimeState: BracketRuntimeSlotState;
  handoff: StructuralBracketHandoff;
};

function comparePersonIds(left: PersonId, right: PersonId): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function canonicalPair(personIdA: PersonId, personIdB: PersonId): [PersonId, PersonId] {
  return comparePersonIds(personIdA, personIdB) <= 0
    ? [personIdA, personIdB]
    : [personIdB, personIdA];
}

function enumerateRoundRobinPairs(personIds: readonly PersonId[]): StructuralRoundRobinPair[] {
  const pairs: StructuralRoundRobinPair[] = [];
  let pairIndex = 0;
  for (let leftIndex = 0; leftIndex < personIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < personIds.length; rightIndex += 1) {
      const [personIdA, personIdB] = canonicalPair(personIds[leftIndex]!, personIds[rightIndex]!);
      pairs.push({ pairIndex, personIdA, personIdB });
      pairIndex += 1;
    }
  }
  pairs.sort((left, right) => {
    const personDiff = comparePersonIds(left.personIdA, right.personIdA);
    if (personDiff !== 0) {
      return personDiff;
    }
    return comparePersonIds(left.personIdB, right.personIdB);
  });
  return pairs.map((pair, index) => ({ ...pair, pairIndex: index }));
}

function validateDuplicatePersonIds(personIds: readonly PersonId[]): ValidationResult<null> {
  const seen = new Set<PersonId>();
  for (const personId of personIds) {
    if (seen.has(personId)) {
      return failure([
        {
          path: "/orderedPersonIds",
          message: "duplicate participant PersonId",
          actual: personId,
          expected: "unique PersonId",
        },
      ]);
    }
    seen.add(personId);
  }
  return success(null);
}

function validateSourceBinding(input: StructuralBracketBuildInput): ValidationResult<null> {
  const issues: ValidationIssue[] = [];

  if (input.scheduleLifecycleIdentity.tournamentId !== input.tournamentId) {
    issues.push({
      path: "/tournamentId",
      message: "TournamentId mismatch with schedule lifecycle identity",
      actual: input.tournamentId,
      expected: input.scheduleLifecycleIdentity.tournamentId,
    });
  }

  if (input.scheduleLifecycleIdentity.lifecycleState === "cancelled") {
    issues.push({
      path: "/scheduleLifecycleIdentity/lifecycleState",
      message: "cancelled schedule lifecycle cannot produce structural bracket",
      actual: input.scheduleLifecycleIdentity.lifecycleState,
      expected: "non-cancelled lifecycle",
    });
  }

  if (input.scheduleLifecycleIdentity.lifecycleState === "merged") {
    issues.push({
      path: "/scheduleLifecycleIdentity/lifecycleState",
      message: "terminal merged schedule lifecycle cannot produce structural bracket",
      actual: input.scheduleLifecycleIdentity.lifecycleState,
      expected: "non-merged lifecycle",
    });
  }

  const duplicateCheck = validateDuplicatePersonIds(input.orderedPersonIds);
  if (!duplicateCheck.ok) {
    issues.push(...duplicateCheck.issues);
  }

  if (input.expectedScheduleLifecycleIdentity !== undefined) {
    const fresh = assertScheduleLifecycleIdentityFresh(
      input.expectedScheduleLifecycleIdentity,
      input.scheduleLifecycleIdentity,
    );
    if (!fresh.ok) {
      issues.push(...fresh.issues);
    }
  }

  return issues.length === 0 ? success(null) : failure(issues);
}

function validateParticipantListIdentity(
  input: StructuralBracketBuildInput,
  provider: Sha256Provider,
): ValidationResult<null> {
  const computed = computeParticipantListHash(
    {
      tournamentId: input.tournamentId,
      scheduleLifecycleIdentityHash: input.scheduleLifecycleIdentity.identityHash,
      selectedPersonIds: input.orderedPersonIds,
      policyIdentity: input.entryChoicePolicyIdentity,
    },
    provider,
  );
  if (!computed.ok) {
    return computed;
  }
  if (computed.value !== input.participantListHash) {
    return failure([
      {
        path: "/participantListHash",
        message: "participant-list identity does not match supplied ordered PersonIds",
        actual: input.participantListHash,
        expected: computed.value,
      },
    ]);
  }
  return success(null);
}

function validateGroupMembership(
  groups: readonly (readonly PersonId[])[],
  frozenPersonIds: readonly PersonId[],
): ValidationResult<readonly StructuralGroupMembership[]> {
  const frozenSet = new Set(frozenPersonIds);
  const seen = new Set<PersonId>();
  const memberships: StructuralGroupMembership[] = [];

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const rawGroup = groups[groupIndex]!;
    const sortedUnique: PersonId[] = [];
    for (const personId of rawGroup) {
      if (!frozenSet.has(personId)) {
        return failure([
          {
            path: `/formatSelection/groups/${groupIndex}`,
            message: "group member is not in frozen participant list",
            actual: personId,
            expected: "frozen PersonId",
          },
        ]);
      }
      if (seen.has(personId)) {
        return failure([
          {
            path: `/formatSelection/groups/${groupIndex}`,
            message: "duplicate group membership across supplied groups",
            actual: personId,
            expected: "unique group membership",
          },
        ]);
      }
      seen.add(personId);
      sortedUnique.push(personId);
    }
    sortedUnique.sort(comparePersonIds);
    memberships.push({ groupIndex, personIds: sortedUnique });
  }

  memberships.sort((left, right) => left.groupIndex - right.groupIndex);
  return success(memberships);
}

function detectKnockoutCycle(slots: readonly KnockoutStructuralSlot[]): ValidationResult<null> {
  const slotIds = new Set(slots.map((slot) => slot.slotId));
  const adjacency = new Map<string, readonly string[]>();
  for (const slot of slots) {
    adjacency.set(slot.slotId, slot.feedsFromSlotIds ?? []);
    for (const upstreamId of slot.feedsFromSlotIds ?? []) {
      if (!slotIds.has(upstreamId)) {
        return failure([
          {
            path: `/knockoutSeedByeMapping/slots/${slot.slotId}/feedsFromSlotIds`,
            message: "feedsFromSlotIds references unknown slot",
            actual: upstreamId,
            expected: "existing slotId",
          },
        ]);
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(slotId: string): boolean {
    if (visited.has(slotId)) {
      return false;
    }
    if (visiting.has(slotId)) {
      return true;
    }
    visiting.add(slotId);
    for (const upstreamId of adjacency.get(slotId) ?? []) {
      if (visit(upstreamId)) {
        return true;
      }
    }
    visiting.delete(slotId);
    visited.add(slotId);
    return false;
  }

  for (const slotId of slotIds) {
    if (visit(slotId)) {
      return failure([
        {
          path: "/knockoutSeedByeMapping/slots",
          message: "knockout slot dependency graph contains a cycle",
          actual: slotId,
          expected: "acyclic structural graph",
        },
      ]);
    }
  }

  return success(null);
}

function validateKnockoutSeedByeMapping(
  mapping: KnockoutSeedByeMapping,
  frozenPersonIds: readonly PersonId[],
): ValidationResult<readonly KnockoutStructuralSlot[]> {
  const frozenSet = new Set(frozenPersonIds);
  const slotIds = new Set<string>();
  const placedParticipants = new Set<PersonId>();
  const seedRanks = new Set<number>();
  const normalized: KnockoutStructuralSlot[] = [];

  for (const slot of mapping.slots) {
    if (slotIds.has(slot.slotId)) {
      return failure([
        {
          path: "/knockoutSeedByeMapping/slots",
          message: "duplicate knockout slotId",
          actual: slot.slotId,
          expected: "unique slotId",
        },
      ]);
    }
    slotIds.add(slot.slotId);

    if (slot.participantPersonId !== undefined) {
      if (!frozenSet.has(slot.participantPersonId)) {
        return failure([
          {
            path: `/knockoutSeedByeMapping/slots/${slot.slotId}/participantPersonId`,
            message: "seed placement references non-frozen participant",
            actual: slot.participantPersonId,
            expected: "frozen PersonId",
          },
        ]);
      }
      if (placedParticipants.has(slot.participantPersonId)) {
        return failure([
          {
            path: `/knockoutSeedByeMapping/slots/${slot.slotId}/participantPersonId`,
            message: "duplicate seed placement for participant",
            actual: slot.participantPersonId,
            expected: "unique participant placement",
          },
        ]);
      }
      placedParticipants.add(slot.participantPersonId);
    }

    if (slot.seedRank !== undefined) {
      if (seedRanks.has(slot.seedRank)) {
        return failure([
          {
            path: `/knockoutSeedByeMapping/slots/${slot.slotId}/seedRank`,
            message: "duplicate seed rank in mapping",
            actual: slot.seedRank,
            expected: "unique seedRank",
          },
        ]);
      }
      seedRanks.add(slot.seedRank);
    }

    normalized.push({
      slotId: slot.slotId,
      roundIndex: slot.roundIndex,
      slotIndex: slot.slotIndex,
      ...(slot.participantPersonId !== undefined
        ? { participantPersonId: slot.participantPersonId }
        : {}),
      ...(slot.seedRank !== undefined ? { seedRank: slot.seedRank } : {}),
      ...(slot.isByeAdvancement === true ? { isByeAdvancement: true } : {}),
      ...(slot.feedsFromSlotIds !== undefined && slot.feedsFromSlotIds.length > 0
        ? { feedsFromSlotIds: [...slot.feedsFromSlotIds].sort() }
        : {}),
    });
  }

  normalized.sort((left, right) => {
    if (left.roundIndex !== right.roundIndex) {
      return left.roundIndex - right.roundIndex;
    }
    if (left.slotIndex !== right.slotIndex) {
      return left.slotIndex - right.slotIndex;
    }
    return left.slotId < right.slotId ? -1 : left.slotId > right.slotId ? 1 : 0;
  });

  const cycle = detectKnockoutCycle(normalized);
  if (!cycle.ok) {
    return cycle;
  }

  return success(normalized);
}

function buildBracketDefinitionHashInput(definition: {
  tournamentId: TournamentId;
  participantListHash: string;
  orderedPersonIds: readonly PersonId[];
  scheduleLifecycleIdentityHash: string;
  formatKind: StructuralFormatKind;
  roundRobinPairs: readonly StructuralRoundRobinPair[];
  groupMemberships: readonly StructuralGroupMembership[];
  groupRoundRobinPairs: readonly StructuralRoundRobinPair[];
  knockoutSlots: readonly KnockoutStructuralSlot[];
  policyIdentities: TournamentBracketDefinition["policyIdentities"];
}): Record<string, unknown> {
  return {
    schemaVersion: TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION,
    tournamentId: definition.tournamentId,
    participantListHash: definition.participantListHash,
    orderedPersonIds: [...definition.orderedPersonIds],
    scheduleLifecycleIdentityHash: definition.scheduleLifecycleIdentityHash,
    formatKind: definition.formatKind,
    roundRobinPairs: definition.roundRobinPairs.map((pair) => ({
      pairIndex: pair.pairIndex,
      personIdA: pair.personIdA,
      personIdB: pair.personIdB,
    })),
    groupMemberships: definition.groupMemberships.map((group) => ({
      groupIndex: group.groupIndex,
      personIds: [...group.personIds],
    })),
    groupRoundRobinPairs: definition.groupRoundRobinPairs.map((pair) => ({
      pairIndex: pair.pairIndex,
      personIdA: pair.personIdA,
      personIdB: pair.personIdB,
    })),
    knockoutSlots: definition.knockoutSlots.map((slot) => ({
      slotId: slot.slotId,
      roundIndex: slot.roundIndex,
      slotIndex: slot.slotIndex,
      ...(slot.participantPersonId !== undefined
        ? { participantPersonId: slot.participantPersonId }
        : {}),
      ...(slot.seedRank !== undefined ? { seedRank: slot.seedRank } : {}),
      ...(slot.isByeAdvancement === true ? { isByeAdvancement: true } : {}),
      ...(slot.feedsFromSlotIds !== undefined
        ? { feedsFromSlotIds: [...slot.feedsFromSlotIds] }
        : {}),
    })),
    policyIdentities: definition.policyIdentities,
  };
}

export function computeBracketDefinitionHash(
  definition: Omit<TournamentBracketDefinition, "bracketDefinitionHash" | "schemaVersion">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildBracketDefinitionHashInput(definition)),
    "/bracketDefinitionHash",
  );
}

export function createInitialBracketRuntimeSlotState(
  definition: Pick<
    TournamentBracketDefinition,
    "tournamentId" | "bracketDefinitionHash" | "knockoutSlots"
  >,
): BracketRuntimeSlotState {
  return {
    schemaVersion: BRACKET_RUNTIME_SLOT_STATE_SCHEMA_VERSION,
    tournamentId: definition.tournamentId,
    bracketDefinitionHash: definition.bracketDefinitionHash,
    slotStates: definition.knockoutSlots.map((slot) => ({
      slotId: slot.slotId,
      ...(slot.participantPersonId !== undefined
        ? { resolvedParticipantPersonId: slot.participantPersonId }
        : {}),
    })),
  };
}

export function toStructuralBracketHandoff(
  definition: TournamentBracketDefinition,
): StructuralBracketHandoff {
  return {
    tournamentId: definition.tournamentId,
    bracketDefinitionHash: definition.bracketDefinitionHash,
    participantListHash: definition.participantListHash,
    scheduleLifecycleIdentityHash: definition.scheduleLifecycleIdentityHash,
    formatKind: definition.formatKind,
    orderedPersonIds: definition.orderedPersonIds,
    roundRobinPairs: definition.roundRobinPairs,
    groupMemberships: definition.groupMemberships,
    groupRoundRobinPairs: definition.groupRoundRobinPairs,
    knockoutSlots: definition.knockoutSlots,
    policyIdentities: definition.policyIdentities,
  };
}

export function buildStructuralBracketDefinition(
  input: StructuralBracketBuildInput,
  provider: Sha256Provider,
): ValidationResult<StructuralBracketBuildResult> {
  const sourceBinding = validateSourceBinding(input);
  if (!sourceBinding.ok) {
    return sourceBinding;
  }

  const policy = validateInjectedStructuralPolicyInput(input.policy);
  if (!policy.ok) {
    return policy;
  }

  const participantIdentity = validateParticipantListIdentity(input, provider);
  if (!participantIdentity.ok) {
    return participantIdentity;
  }

  const formatKind = input.policy.formatSelection.formatKind;
  let roundRobinPairs: StructuralRoundRobinPair[] = [];
  let groupMemberships: StructuralGroupMembership[] = [];
  let groupRoundRobinPairs: StructuralRoundRobinPair[] = [];
  let knockoutSlots: KnockoutStructuralSlot[] = [];

  if (formatKind === "round_robin") {
    roundRobinPairs = enumerateRoundRobinPairs(input.orderedPersonIds);
  }

  if (formatKind === "group_round_robin_knockout") {
    const groups = input.policy.formatSelection.groups;
    if (groups === undefined) {
      return failure([
        {
          path: "/formatSelection/groups",
          message: "group composition is required",
          actual: undefined,
          expected: "group membership arrays",
        },
      ]);
    }
    const validatedGroups = validateGroupMembership(groups, input.orderedPersonIds);
    if (!validatedGroups.ok) {
      return validatedGroups;
    }
    groupMemberships = [...validatedGroups.value];
    for (const group of groupMemberships) {
      groupRoundRobinPairs.push(...enumerateRoundRobinPairs(group.personIds));
    }
    groupRoundRobinPairs.sort((left, right) => {
      const personDiff = comparePersonIds(left.personIdA, right.personIdA);
      if (personDiff !== 0) {
        return personDiff;
      }
      return comparePersonIds(left.personIdB, right.personIdB);
    });
    groupRoundRobinPairs = groupRoundRobinPairs.map((pair, index) => ({
      ...pair,
      pairIndex: index,
    }));
  }

  if (formatKind === "knockout" || formatKind === "group_round_robin_knockout") {
    const mapping = input.policy.knockoutSeedByeMapping;
    if (mapping === undefined) {
      return failure([
        {
          path: "/knockoutSeedByeMapping",
          message: "knockout seed/BYE mapping is required",
          actual: undefined,
          expected: "KnockoutSeedByeMapping",
        },
      ]);
    }
    const validatedKnockout = validateKnockoutSeedByeMapping(mapping, input.orderedPersonIds);
    if (!validatedKnockout.ok) {
      return validatedKnockout;
    }
    knockoutSlots = [...validatedKnockout.value];
  }

  const policyIdentities = {
    formatSelection: input.policy.formatSelection.policyIdentity,
    knockoutSeedBye: input.policy.knockoutSeedByePolicyIdentity,
    standingsTieBreak: input.policy.standingsTieBreakPolicyIdentity,
  };

  const hash = computeBracketDefinitionHash(
    {
      tournamentId: input.tournamentId,
      participantListHash: input.participantListHash,
      orderedPersonIds: input.orderedPersonIds,
      scheduleLifecycleIdentityHash: input.scheduleLifecycleIdentity.identityHash,
      formatKind,
      roundRobinPairs,
      groupMemberships,
      groupRoundRobinPairs,
      knockoutSlots,
      policyIdentities,
    },
    provider,
  );
  if (!hash.ok) {
    return hash;
  }

  const definition: TournamentBracketDefinition = {
    schemaVersion: TOURNAMENT_BRACKET_DEFINITION_SCHEMA_VERSION,
    tournamentId: input.tournamentId,
    participantListHash: input.participantListHash,
    orderedPersonIds: input.orderedPersonIds,
    scheduleLifecycleIdentityHash: input.scheduleLifecycleIdentity.identityHash,
    formatKind,
    roundRobinPairs,
    groupMemberships,
    groupRoundRobinPairs,
    knockoutSlots,
    policyIdentities,
    bracketDefinitionHash: hash.value,
  };

  const runtimeState = createInitialBracketRuntimeSlotState(definition);
  return success({
    definition,
    runtimeState,
    handoff: toStructuralBracketHandoff(definition),
  });
}
