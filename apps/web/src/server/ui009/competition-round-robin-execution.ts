import {
  buildTournamentMatchPlan,
  createEmptyDetailedLogPayloadStore,
  executeTournamentBattleAtomic,
  formatTournamentSlotId,
  type BattleActionsSource,
  type BracketRuntimeSlotState,
  type ScheduleLifecycleIdentity,
  type Sha256Provider,
  type Sprint1RunSession,
  type StoredBattleResultRecord,
  type TournamentBracketDefinition,
  type TournamentId,
} from "@shared-world/simulation-core";
import { defaultCompetitionRuleHash, defaultTournamentBattleActionIdentity } from "./competition-engine-helpers.js";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";

export type RoundRobinExecutionState = {
  readonly tournamentId: string;
  readonly scheduleLifecycleIdentity: Record<string, unknown>;
  readonly bracketDefinition: Record<string, unknown>;
  readonly bracketRuntimeState: Record<string, unknown>;
  readonly storedRecords: readonly Record<string, unknown>[];
};

export type ExecuteNextRoundRobinMatchOutcome =
  | { readonly kind: "complete" }
  | {
      readonly kind: "completed";
      readonly pairIndex: number;
      readonly atomic: ReturnType<typeof executeTournamentBattleAtomic>;
    }
  | { readonly kind: "domain_failure"; readonly issues: readonly { path: string; message: string }[] };

/**
 * Execute the next accepted round-robin structural pair from persisted UI009 state.
 *
 * Pair selection is derived only from the accepted TournamentBracketDefinition
 * plus accepted StoredBattleResultRecord facts. This deliberately does not rank,
 * tie-break, or finalize the tournament; those semantics remain caller supplied.
 */
export function executeNextRoundRobinMatch(input: {
  state: RoundRobinExecutionState;
  session: Sprint1RunSession;
  provider: Sha256Provider;
}): ExecuteNextRoundRobinMatchOutcome {
  const bracketDefinition = input.state.bracketDefinition as unknown as TournamentBracketDefinition;
  const bracketRuntimeState = input.state.bracketRuntimeState as unknown as BracketRuntimeSlotState;
  const storedRecords = input.state.storedRecords as unknown as readonly StoredBattleResultRecord[];
  const progress = projectRoundRobinProgress({ bracketDefinition, storedRecords });
  if (progress.nextPairIndex === null) {
    return { kind: "complete" };
  }

  const tournamentId = input.state.tournamentId as TournamentId;
  const lifecycle = input.state.scheduleLifecycleIdentity as unknown as ScheduleLifecycleIdentity;
  const plan = buildTournamentMatchPlan(
    {
      tournamentId,
      bracketDefinition,
      runtimeState: bracketRuntimeState,
      structuralSlot: { kind: "round_robin", pairIndex: progress.nextPairIndex },
      scheduleLifecycleIdentity: lifecycle,
      slotBindings: [],
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
        slotBindings: [],
      },
      matchPlan: plan.value,
      slotIdentity: {
        slotId: formatTournamentSlotId(progress.nextPairIndex),
        matchOrdinal: progress.matchesCompleted,
      },
      competitionRuleHash: defaultCompetitionRuleHash(input.session),
      payloadStore: createEmptyDetailedLogPayloadStore(),
      storedRecords: [...storedRecords],
    },
    input.provider,
  );

  return { kind: "completed", pairIndex: progress.nextPairIndex, atomic };
}
