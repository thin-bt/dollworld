/**
 * S02-005 tournament match-plan identity and MatchId reservation preview.
 * Plan construction consumes zero World/Battle RNG and never mutates generator state.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { MatchId, PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  cloneMatchIdGeneratorState,
  reserveNextMatchId,
  validateMatchIdGeneratorState,
} from "../sprint1/match-id-generator.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import { TOURNAMENT_MATCH_PLAN_SCHEMA_VERSION } from "./constants.js";
import { assertScheduleLifecycleIdentityFresh } from "./tournament-entry-selection.js";
import type {
  BracketRuntimeSlotState,
  StructuralRoundRobinPair,
  TournamentBracketDefinition,
} from "./tournament-bracket-definition.js";
import type { KnockoutStructuralSlot } from "./tournament-bracket-policy.js";
import type { ScheduleLifecycleIdentity } from "./types.js";

export type TournamentStructuralSlotIdentity =
  | { kind: "round_robin"; pairIndex: number }
  | { kind: "group_round_robin"; pairIndex: number }
  | { kind: "knockout"; slotId: string };

export type TournamentSlotMatchBinding = {
  structuralSlotKey: string;
  matchId: MatchId;
  matchPlanIdentityHash: string;
};

export type TournamentMatchPlan = {
  schemaVersion: typeof TOURNAMENT_MATCH_PLAN_SCHEMA_VERSION;
  tournamentId: TournamentId;
  bracketDefinitionHash: string;
  structuralSlot: TournamentStructuralSlotIdentity;
  structuralSlotKey: string;
  participantPersonIdA: PersonId;
  participantPersonIdB: PersonId;
  reservedMatchId: MatchId;
  matchPlanIdentityHash: string;
};

export type TournamentMatchPlanBuildInput = {
  tournamentId: TournamentId;
  bracketDefinition: Pick<
    TournamentBracketDefinition,
    | "tournamentId"
    | "bracketDefinitionHash"
    | "formatKind"
    | "roundRobinPairs"
    | "groupRoundRobinPairs"
    | "knockoutSlots"
  >;
  runtimeState: BracketRuntimeSlotState;
  structuralSlot: TournamentStructuralSlotIdentity;
  scheduleLifecycleIdentity: ScheduleLifecycleIdentity;
  expectedScheduleLifecycleIdentity?: ScheduleLifecycleIdentity;
  slotBindings: readonly TournamentSlotMatchBinding[];
  matchIdGeneratorState: unknown;
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

function canonicalParticipantPair(
  personIdA: PersonId,
  personIdB: PersonId,
): ValidationResult<{ participantPersonIdA: PersonId; participantPersonIdB: PersonId }> {
  if (personIdA === personIdB) {
    return failure([
      {
        path: "/participants",
        message: "battle participants must be two distinct PersonIds",
        actual: personIdA,
        expected: "distinct PersonId pair",
      },
    ]);
  }
  return comparePersonIds(personIdA, personIdB) <= 0
    ? success({ participantPersonIdA: personIdA, participantPersonIdB: personIdB })
    : success({ participantPersonIdA: personIdB, participantPersonIdB: personIdA });
}

export function canonicalStructuralSlotKey(slot: TournamentStructuralSlotIdentity): string {
  switch (slot.kind) {
    case "round_robin":
      return `round_robin:pair:${String(slot.pairIndex)}`;
    case "group_round_robin":
      return `group_round_robin:pair:${String(slot.pairIndex)}`;
    case "knockout":
      return `knockout:slot:${slot.slotId}`;
  }
}

function findRoundRobinPair(
  pairs: readonly StructuralRoundRobinPair[],
  pairIndex: number,
  pathPrefix: string,
): ValidationResult<StructuralRoundRobinPair> {
  const pair = pairs.find((candidate) => candidate.pairIndex === pairIndex);
  if (pair === undefined) {
    return failure([
      {
        path: `${pathPrefix}/pairIndex`,
        message: "structural pairIndex is not present in bracket definition",
        actual: pairIndex,
        expected: "existing pairIndex",
      },
    ]);
  }
  return success(pair);
}

function runtimeParticipantForSlot(
  runtimeState: BracketRuntimeSlotState,
  slotId: string,
  path: string,
): ValidationResult<PersonId> {
  const slot = runtimeState.slotStates.find((candidate) => candidate.slotId === slotId);
  if (slot === undefined) {
    return failure([
      {
        path,
        message: "runtime slot state is missing for structural slotId",
        actual: slotId,
        expected: "existing runtime slot",
      },
    ]);
  }
  if (slot.resolvedParticipantPersonId === undefined) {
    return failure([
      {
        path: `${path}/resolvedParticipantPersonId`,
        message: "structural slot is unresolved and cannot reserve MatchId",
        actual: undefined,
        expected: "resolved PersonId",
      },
    ]);
  }
  return success(slot.resolvedParticipantPersonId);
}

function resolveKnockoutBattleParticipants(
  slot: KnockoutStructuralSlot,
  runtimeState: BracketRuntimeSlotState,
): ValidationResult<{ participantPersonIdA: PersonId; participantPersonIdB: PersonId }> {
  if (slot.isByeAdvancement === true) {
    return failure([
      {
        path: "/structuralSlot/isByeAdvancement",
        message: "BYE advancement slot cannot reserve MatchId or invoke battle",
        actual: true,
        expected: "battle-bearing slot",
      },
    ]);
  }

  const feederIds = slot.feedsFromSlotIds;
  if (feederIds === undefined || feederIds.length !== 2) {
    return failure([
      {
        path: "/structuralSlot/feedsFromSlotIds",
        message: "knockout battle slot requires exactly two upstream feeder slots",
        actual: feederIds,
        expected: "two feeder slotIds",
      },
    ]);
  }

  const left = runtimeParticipantForSlot(
    runtimeState,
    feederIds[0]!,
    `/runtimeState/slotStates/${feederIds[0]}`,
  );
  if (!left.ok) {
    return left;
  }
  const right = runtimeParticipantForSlot(
    runtimeState,
    feederIds[1]!,
    `/runtimeState/slotStates/${feederIds[1]}`,
  );
  if (!right.ok) {
    return right;
  }
  return canonicalParticipantPair(left.value, right.value);
}

function resolveBattleParticipants(
  input: TournamentMatchPlanBuildInput,
): ValidationResult<{ participantPersonIdA: PersonId; participantPersonIdB: PersonId }> {
  const { bracketDefinition, runtimeState, structuralSlot } = input;

  if (bracketDefinition.tournamentId !== input.tournamentId) {
    return failure([
      {
        path: "/tournamentId",
        message: "TournamentId mismatch with bracket definition",
        actual: input.tournamentId,
        expected: bracketDefinition.tournamentId,
      },
    ]);
  }

  if (runtimeState.tournamentId !== input.tournamentId) {
    return failure([
      {
        path: "/runtimeState/tournamentId",
        message: "runtime slot state TournamentId mismatch",
        actual: runtimeState.tournamentId,
        expected: input.tournamentId,
      },
    ]);
  }

  if (runtimeState.bracketDefinitionHash !== bracketDefinition.bracketDefinitionHash) {
    return failure([
      {
        path: "/runtimeState/bracketDefinitionHash",
        message: "runtime slot state bracket-definition hash mismatch",
        actual: runtimeState.bracketDefinitionHash,
        expected: bracketDefinition.bracketDefinitionHash,
      },
    ]);
  }

  switch (structuralSlot.kind) {
    case "round_robin": {
      if (bracketDefinition.formatKind !== "round_robin") {
        return failure([
          {
            path: "/structuralSlot/kind",
            message: "round_robin slot identity requires round_robin bracket format",
            actual: bracketDefinition.formatKind,
            expected: "round_robin",
          },
        ]);
      }
      const pair = findRoundRobinPair(
        bracketDefinition.roundRobinPairs,
        structuralSlot.pairIndex,
        "/structuralSlot",
      );
      if (!pair.ok) {
        return pair;
      }
      return canonicalParticipantPair(pair.value.personIdA, pair.value.personIdB);
    }
    case "group_round_robin": {
      if (bracketDefinition.formatKind !== "group_round_robin_knockout") {
        return failure([
          {
            path: "/structuralSlot/kind",
            message: "group_round_robin slot identity requires group_round_robin_knockout format",
            actual: bracketDefinition.formatKind,
            expected: "group_round_robin_knockout",
          },
        ]);
      }
      const pair = findRoundRobinPair(
        bracketDefinition.groupRoundRobinPairs,
        structuralSlot.pairIndex,
        "/structuralSlot",
      );
      if (!pair.ok) {
        return pair;
      }
      return canonicalParticipantPair(pair.value.personIdA, pair.value.personIdB);
    }
    case "knockout": {
      const slot = bracketDefinition.knockoutSlots.find(
        (candidate) => candidate.slotId === structuralSlot.slotId,
      );
      if (slot === undefined) {
        return failure([
          {
            path: "/structuralSlot/slotId",
            message: "knockout slotId is not present in bracket definition",
            actual: structuralSlot.slotId,
            expected: "existing slotId",
          },
        ]);
      }
      return resolveKnockoutBattleParticipants(slot, runtimeState);
    }
  }
}

function validateScheduleLifecycle(input: TournamentMatchPlanBuildInput): ValidationResult<null> {
  const issues: ValidationIssue[] = [];
  const lifecycle = input.scheduleLifecycleIdentity;

  if (lifecycle.tournamentId !== input.tournamentId) {
    issues.push({
      path: "/scheduleLifecycleIdentity/tournamentId",
      message: "schedule lifecycle TournamentId mismatch",
      actual: lifecycle.tournamentId,
      expected: input.tournamentId,
    });
  }

  if (lifecycle.lifecycleState === "cancelled") {
    issues.push({
      path: "/scheduleLifecycleIdentity/lifecycleState",
      message: "cancelled schedule lifecycle cannot build tournament match plan",
      actual: lifecycle.lifecycleState,
      expected: "non-cancelled lifecycle",
    });
  }

  if (lifecycle.lifecycleState === "merged") {
    issues.push({
      path: "/scheduleLifecycleIdentity/lifecycleState",
      message: "terminal merged schedule lifecycle cannot build tournament match plan",
      actual: lifecycle.lifecycleState,
      expected: "non-merged lifecycle",
    });
  }

  if (input.expectedScheduleLifecycleIdentity !== undefined) {
    const fresh = assertScheduleLifecycleIdentityFresh(
      input.expectedScheduleLifecycleIdentity,
      lifecycle,
    );
    if (!fresh.ok) {
      issues.push(...fresh.issues);
    }
  }

  return issues.length === 0 ? success(null) : failure(issues);
}

function validateSlotBinding(input: TournamentMatchPlanBuildInput): ValidationResult<null> {
  const slotKey = canonicalStructuralSlotKey(input.structuralSlot);
  const duplicate = input.slotBindings.find((binding) => binding.structuralSlotKey === slotKey);
  if (duplicate !== undefined) {
    return failure([
      {
        path: "/slotBindings",
        message: "structural slot is already bound to a MatchId",
        actual: duplicate.matchId,
        expected: "unbound structural slot",
      },
    ]);
  }
  return success(null);
}

function buildMatchPlanHashInput(plan: Omit<TournamentMatchPlan, "matchPlanIdentityHash">): Record<
  string,
  unknown
> {
  return {
    schemaVersion: plan.schemaVersion,
    tournamentId: plan.tournamentId,
    bracketDefinitionHash: plan.bracketDefinitionHash,
    structuralSlotKey: plan.structuralSlotKey,
    structuralSlot: plan.structuralSlot,
    participantPersonIdA: plan.participantPersonIdA,
    participantPersonIdB: plan.participantPersonIdB,
    reservedMatchId: plan.reservedMatchId,
  };
}

export function computeTournamentMatchPlanIdentityHash(
  plan: Omit<TournamentMatchPlan, "matchPlanIdentityHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildMatchPlanHashInput(plan)),
    "/matchPlanIdentityHash",
  );
}

export function buildTournamentMatchPlan(
  input: TournamentMatchPlanBuildInput,
  provider: Sha256Provider,
): ValidationResult<TournamentMatchPlan> {
  const lifecycle = validateScheduleLifecycle(input);
  if (!lifecycle.ok) {
    return lifecycle;
  }

  const binding = validateSlotBinding(input);
  if (!binding.ok) {
    return binding;
  }

  const participants = resolveBattleParticipants(input);
  if (!participants.ok) {
    return participants;
  }

  const generatorClone = cloneMatchIdGeneratorState(input.matchIdGeneratorState);
  if (!generatorClone.ok) {
    return failure(
      generatorClone.issues.map((issue) => ({
        ...issue,
        path: `/matchIdGeneratorState${issue.path}`,
      })),
    );
  }

  const reservation = reserveNextMatchId(generatorClone.value);
  if (reservation.kind === "failure") {
    return failure(reservation.issues.map((issue) => ({ ...issue, path: `/matchIdGeneratorState${issue.path}` })));
  }

  const structuralSlotKey = canonicalStructuralSlotKey(input.structuralSlot);
  const withoutHash: Omit<TournamentMatchPlan, "matchPlanIdentityHash"> = {
    schemaVersion: TOURNAMENT_MATCH_PLAN_SCHEMA_VERSION,
    tournamentId: input.tournamentId,
    bracketDefinitionHash: input.bracketDefinition.bracketDefinitionHash,
    structuralSlot: input.structuralSlot,
    structuralSlotKey,
    participantPersonIdA: participants.value.participantPersonIdA,
    participantPersonIdB: participants.value.participantPersonIdB,
    reservedMatchId: reservation.matchId,
  };

  const identityHash = computeTournamentMatchPlanIdentityHash(withoutHash, provider);
  if (!identityHash.ok) {
    return identityHash;
  }

  return success({
    ...withoutHash,
    matchPlanIdentityHash: identityHash.value,
  });
}

/** Confirms a caller-supplied generator state still yields the plan's reserved MatchId. */
export function verifyTournamentMatchPlanReservation(
  plan: TournamentMatchPlan,
  matchIdGeneratorState: unknown,
): ValidationResult<null> {
  const validated = validateMatchIdGeneratorState(matchIdGeneratorState);
  if (!validated.ok) {
    return validated;
  }
  const reservation = reserveNextMatchId(validated.value);
  if (reservation.kind === "failure") {
    return failure([...reservation.issues]);
  }
  if (reservation.matchId !== plan.reservedMatchId) {
    return failure([
      {
        path: "/reservedMatchId",
        message: "MatchId reservation no longer matches committed generator state",
        actual: reservation.matchId,
        expected: plan.reservedMatchId,
      },
    ]);
  }
  return success(null);
}
