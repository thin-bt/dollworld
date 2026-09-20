import {
  buildTournamentMatchPlan,
  canonicalStructuralSlotKey,
  executeTournamentBattleAtomic,
  formatTournamentSlotId,
  type BattleActionsSource,
  type BracketRuntimeSlotState,
  type PersonId,
  type ScheduleLifecycleIdentity,
  type Sha256Provider,
  type Sprint1RunSession,
  type StoredBattleResultRecord,
  type TournamentBracketDefinition,
  type TournamentId,
  type TournamentSlotMatchBinding,
} from "@shared-world/simulation-core";
import {
  applyKnockoutBattleWinner,
  resolveKnockoutByeAdvancements,
  seedKnockoutLeafParticipants,
} from "./competition-bracket-runtime.js";
import {
  isBracketStructurallyComplete,
  projectBracketProgress,
  type BracketStructuralSlot,
} from "./competition-bracket-progress.js";
import {
  defaultCompetitionRuleHash,
  defaultTournamentBattleActionIdentity,
} from "./competition-engine-helpers.js";
import { restoreDetailedLogPayloadStore } from "./competition-payload-store.js";

export type BracketExecutionState = {
  readonly tournamentId: string;
  readonly scheduleLifecycleIdentity: Record<string, unknown>;
  readonly bracketDefinition: Record<string, unknown>;
  readonly bracketRuntimeState: Record<string, unknown>;
  readonly payloadStore: Record<string, unknown>;
  readonly storedRecords: readonly Record<string, unknown>[];
  readonly slotBindings: readonly TournamentSlotMatchBinding[];
};

export type ExecuteNextBracketMatchOutcome =
  | { readonly kind: "complete" }
  | {
      readonly kind: "completed";
      readonly structuralSlot: BracketStructuralSlot;
      readonly atomic: Extract<
        ReturnType<typeof executeTournamentBattleAtomic>,
        { kind: "completed" }
      >;
      readonly bracketRuntimeState: BracketRuntimeSlotState;
      readonly slotBindings: readonly TournamentSlotMatchBinding[];
    }
  | {
      readonly kind: "domain_failure";
      readonly issues: readonly { path: string; message: string }[];
    };

function toStructuralSlotIdentity(slot: BracketStructuralSlot) {
  return slot.kind === "knockout" ? { kind: "knockout" as const, slotId: slot.slotId } : slot;
}

export function executeNextBracketMatch(input: {
  state: BracketExecutionState;
  session: Sprint1RunSession;
  provider: Sha256Provider;
  knockoutSeedPersonIds?: readonly PersonId[];
}): ExecuteNextBracketMatchOutcome {
  const bracketDefinition = input.state.bracketDefinition as unknown as TournamentBracketDefinition;
  let bracketRuntimeState = input.state.bracketRuntimeState as unknown as BracketRuntimeSlotState;
  const storedRecords = input.state.storedRecords as unknown as readonly StoredBattleResultRecord[];
  const slotBindings = [...input.state.slotBindings];

  if (input.knockoutSeedPersonIds !== undefined && input.knockoutSeedPersonIds.length > 0) {
    bracketRuntimeState = seedKnockoutLeafParticipants(
      bracketDefinition,
      bracketRuntimeState,
      input.knockoutSeedPersonIds,
    );
  } else {
    bracketRuntimeState = resolveKnockoutByeAdvancements(bracketDefinition, bracketRuntimeState);
  }

  const progress = projectBracketProgress({
    bracketDefinition,
    bracketRuntimeState,
    storedRecords,
    slotBindings,
  });
  if (progress.nextStructuralSlot === null) {
    if (!isBracketStructurallyComplete(progress)) {
      return {
        kind: "domain_failure",
        issues: [
          {
            path: "/bracketProgress",
            message: "bracket has no playable slot but structural completion is not satisfied",
          },
        ],
      };
    }
    return { kind: "complete" };
  }

  const structuralSlot = progress.nextStructuralSlot;
  const payloadStore = restoreDetailedLogPayloadStore(input.state.payloadStore);
  if (payloadStore === null) {
    return {
      kind: "domain_failure",
      issues: [
        { path: "/payloadStore", message: "competition detailed-log payload store is invalid" },
      ],
    };
  }

  const tournamentId = input.state.tournamentId as TournamentId;
  const lifecycle = input.state.scheduleLifecycleIdentity as unknown as ScheduleLifecycleIdentity;
  const plan = buildTournamentMatchPlan(
    {
      tournamentId,
      bracketDefinition,
      runtimeState: bracketRuntimeState,
      structuralSlot: toStructuralSlotIdentity(structuralSlot),
      scheduleLifecycleIdentity: lifecycle,
      slotBindings,
      matchIdGeneratorState: input.session.runtimeState.matchIdGeneratorState,
    },
    input.provider,
  );
  if (!plan.ok) {
    return { kind: "domain_failure", issues: plan.issues };
  }

  const actionIdentity = defaultTournamentBattleActionIdentity(input.session);
  const actionsSource = { identity: actionIdentity } as BattleActionsSource;
  const atomic = executeTournamentBattleAtomic(
    {
      handoff: {
        matchPlan: plan.value,
        session: input.session,
        participantAActionSourceIdentity: actionIdentity,
        participantBActionSourceIdentity: actionIdentity,
        participantAActionsSource: actionsSource,
        participantBActionsSource: actionsSource,
        slotBindings,
      },
      matchPlan: plan.value,
      slotIdentity: {
        slotId: formatTournamentSlotId(progress.matchesCompleted),
        matchOrdinal: progress.matchesCompleted,
      },
      competitionRuleHash: defaultCompetitionRuleHash(input.session),
      payloadStore,
      storedRecords: [...storedRecords],
    },
    input.provider,
  );

  if (atomic.kind !== "completed") {
    const issues =
      "issues" in atomic && atomic.issues !== undefined
        ? atomic.issues
        : [{ path: "", message: atomic.kind }];
    return { kind: "domain_failure", issues };
  }

  let nextRuntime = bracketRuntimeState;
  if (structuralSlot.kind === "knockout") {
    const winner = atomic.applicationFact.handoffResult.winnerPersonId;
    if (winner === null) {
      return {
        kind: "domain_failure",
        issues: [{ path: "", message: "knockout match produced no winner" }],
      };
    }
    nextRuntime = applyKnockoutBattleWinner(nextRuntime, structuralSlot.slotId, winner);
    nextRuntime = resolveKnockoutByeAdvancements(bracketDefinition, nextRuntime);
  }

  const nextBindings = [...atomic.slotBindings];
  const slotKey = canonicalStructuralSlotKey(toStructuralSlotIdentity(structuralSlot));
  if (!nextBindings.some((binding) => binding.structuralSlotKey === slotKey)) {
    nextBindings.push({
      structuralSlotKey: slotKey,
      matchId: plan.value.reservedMatchId,
      matchPlanIdentityHash: plan.value.matchPlanIdentityHash,
    });
  }

  return {
    kind: "completed",
    structuralSlot,
    atomic,
    bracketRuntimeState: nextRuntime,
    slotBindings: nextBindings,
  };
}
