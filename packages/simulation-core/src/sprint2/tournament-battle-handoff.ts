/**
 * S02-005 tournament battle handoff — reuses Sprint1 battle start/run/commit semantics.
 * MatchId reservation preview lives in tournament-match-plan; execution commits atomically.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { MatchId, PersonId, SimulationId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { Person } from "../domain.js";
import type { BattleActionsSource } from "../sprint1/battle-actions-source.js";
import type { BattleActionSourceIdentity } from "../sprint1/battle-action-source-identity.js";
import type { BattlePostProcessContext } from "../sprint1/battle-result-types.js";
import {
  commitRunBattlePlan,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
} from "../sprint1/commit-run-battle-plan.js";
import { validateBattleParticipant } from "../sprint1/battle-participant.js";
import type { PersonTemporaryCondition } from "../sprint1/person-temporary-condition.js";
import {
  runBattleToCompletion,
  type RunBattleCommitPlan,
  type RunBattleToCompletionResult,
} from "../sprint1/run-battle-to-completion.js";
import type { Sprint1RunSession } from "../sprint1/sprint1-run-session.js";
import { collectKnownTechniqueIdsForBattle } from "../sprint3/generated-technique-battle-catalog.js";
import { TOURNAMENT_BATTLE_HANDOFF_RESULT_SCHEMA_VERSION } from "./constants.js";
import type {
  TournamentMatchPlan,
  TournamentSlotMatchBinding,
  TournamentStructuralSlotIdentity,
} from "./tournament-match-plan.js";
import { verifyTournamentMatchPlanReservation } from "./tournament-match-plan.js";

export type TournamentBattleHandoffResult = {
  schemaVersion: typeof TOURNAMENT_BATTLE_HANDOFF_RESULT_SCHEMA_VERSION;
  tournamentId: TournamentId;
  bracketDefinitionHash: string;
  structuralSlot: TournamentStructuralSlotIdentity;
  structuralSlotKey: string;
  matchId: MatchId;
  battleResultFinalStateHash: string;
  winnerPersonId: PersonId | null;
  loserPersonId: PersonId | null;
  executionPlanIdentityHash: string;
  matchPlanIdentityHash: string;
};

export type TournamentBattleHandoffInput = {
  matchPlan: TournamentMatchPlan;
  session: Sprint1RunSession;
  participantAActionSourceIdentity: BattleActionSourceIdentity;
  participantBActionSourceIdentity: BattleActionSourceIdentity;
  participantAActionsSource: BattleActionsSource;
  participantBActionsSource: BattleActionsSource;
  slotBindings: readonly TournamentSlotMatchBinding[];
};

export type TournamentBattleHandoffSuccess = {
  kind: "completed";
  result: TournamentBattleHandoffResult;
  session: Sprint1RunSession;
  commitPlan: RunBattleCommitPlan;
  slotBindings: readonly TournamentSlotMatchBinding[];
};

export type TournamentBattleHandoffOutput =
  | TournamentBattleHandoffSuccess
  | Extract<RunBattleToCompletionResult, { kind: "pre_start_failure" }>
  | {
      kind: "plan_validation_failure";
      validation: { ok: false; issues: readonly ValidationIssue[] };
    }
  | {
      kind: "commit_failure";
      commitPlan: RunBattleCommitPlan;
      validation: { ok: false; issues: readonly ValidationIssue[] };
    };

function findWorldPerson(
  worldState: Sprint1RunSession["runtimeState"]["worldState"],
  personId: PersonId,
): Person | undefined {
  return worldState.persons.find((person) => person.personId === personId);
}

function findSidecarTemporaryCondition(
  session: Sprint1RunSession,
  personId: PersonId,
): PersonTemporaryCondition | undefined {
  const entry = session.runtimeState.weeklyTrainingSidecars.entries.find(
    (candidate) => candidate.personId === personId,
  );
  return entry?.temporaryCondition;
}

function participantSource(
  session: Sprint1RunSession,
  personId: PersonId,
  side: "sideA" | "sideB",
  provider: Sha256Provider,
): ValidationResult<{ person: Person; temporaryCondition: PersonTemporaryCondition }> {
  const person = findWorldPerson(session.runtimeState.worldState, personId);
  if (person === undefined) {
    return failure([
      {
        path: side === "sideA" ? "/participantPersonIdA" : "/participantPersonIdB",
        message: "participant PersonId is not present in current WorldState",
        actual: personId,
        expected: "existing WorldState person",
      },
    ]);
  }
  const temporaryCondition = findSidecarTemporaryCondition(session, personId);
  if (temporaryCondition === undefined) {
    return failure([
      {
        path: side === "sideA" ? "/participantPersonIdA" : "/participantPersonIdB",
        message: "participant weekly sidecar is required for battle handoff",
        actual: personId,
        expected: "weekly sidecar entry",
      },
    ]);
  }

  const validated = validateBattleParticipant(
    { person, temporaryCondition },
    {
      side,
      battleKind: "official",
      worldDate: session.runtimeState.worldState.worldDate,
      config: session.context.runRuleSnapshot.sprint1Config,
      knownTechniqueIds: collectKnownTechniqueIdsForBattle(
        session.context.runRuleSnapshot.techniqueDefinitions,
        session.runtimeState.generatedTechniqueCatalogOverlay,
      ),
    },
    provider,
  );
  if (!validated.ok) {
    return failure(
      validated.issues.map((issue) => ({
        ...issue,
        path: `${side === "sideA" ? "/participantPersonIdA" : "/participantPersonIdB"}${issue.path}`,
      })),
    );
  }

  return success({ person, temporaryCondition });
}

function buildPostProcessContext(
  session: Sprint1RunSession,
  personA: PersonId,
  personB: PersonId,
): BattlePostProcessContext {
  const week = session.runtimeState.battleResultWeekState;
  return {
    participantA: {
      personId: personA,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        personA,
      ),
    },
    participantB: {
      personId: personB,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        personB,
      ),
    },
  };
}

function toHandoffResult(
  matchPlan: TournamentMatchPlan,
  commitPlan: RunBattleCommitPlan,
): TournamentBattleHandoffResult {
  return {
    schemaVersion: TOURNAMENT_BATTLE_HANDOFF_RESULT_SCHEMA_VERSION,
    tournamentId: matchPlan.tournamentId,
    bracketDefinitionHash: matchPlan.bracketDefinitionHash,
    structuralSlot: matchPlan.structuralSlot,
    structuralSlotKey: matchPlan.structuralSlotKey,
    matchId: matchPlan.reservedMatchId,
    battleResultFinalStateHash: commitPlan.battleResult.finalStateHash,
    winnerPersonId: commitPlan.battleResult.winnerPersonId,
    loserPersonId: commitPlan.battleResult.loserPersonId,
    executionPlanIdentityHash: commitPlan.commitPlanHash,
    matchPlanIdentityHash: matchPlan.matchPlanIdentityHash,
  };
}

function appendSlotBinding(
  bindings: readonly TournamentSlotMatchBinding[],
  matchPlan: TournamentMatchPlan,
): readonly TournamentSlotMatchBinding[] {
  return [
    ...bindings,
    {
      structuralSlotKey: matchPlan.structuralSlotKey,
      matchId: matchPlan.reservedMatchId,
      matchPlanIdentityHash: matchPlan.matchPlanIdentityHash,
    },
  ];
}

export function executeTournamentBattleHandoff(
  input: TournamentBattleHandoffInput,
  provider: Sha256Provider,
): TournamentBattleHandoffOutput {
  const { matchPlan, session } = input;

  const reservation = verifyTournamentMatchPlanReservation(
    matchPlan,
    session.runtimeState.matchIdGeneratorState,
  );
  if (!reservation.ok) {
    return {
      kind: "plan_validation_failure",
      validation: { ok: false, issues: reservation.issues },
    };
  }

  const duplicateBinding = input.slotBindings.find(
    (binding) => binding.structuralSlotKey === matchPlan.structuralSlotKey,
  );
  if (duplicateBinding !== undefined) {
    return {
      kind: "plan_validation_failure",
      validation: {
        ok: false,
        issues: [
          {
            path: "/slotBindings",
            message: "structural slot is already bound to a MatchId",
            actual: duplicateBinding.matchId,
            expected: "unbound structural slot",
          },
        ],
      },
    };
  }

  const participantA = participantSource(
    session,
    matchPlan.participantPersonIdA,
    "sideA",
    provider,
  );
  if (!participantA.ok) {
    return {
      kind: "plan_validation_failure",
      validation: { ok: false, issues: participantA.issues },
    };
  }

  const participantB = participantSource(
    session,
    matchPlan.participantPersonIdB,
    "sideB",
    provider,
  );
  if (!participantB.ok) {
    return {
      kind: "plan_validation_failure",
      validation: { ok: false, issues: participantB.issues },
    };
  }

  const expectedWorldStateHash = computeExpectedWorldStateHash(
    session.runtimeState.worldState,
    provider,
  );
  if (!expectedWorldStateHash.ok) {
    return {
      kind: "plan_validation_failure",
      validation: { ok: false, issues: expectedWorldStateHash.issues },
    };
  }

  const simulationId: SimulationId = session.context.simulationId;
  const run = runBattleToCompletion(
    {
      expectedWorldStateHash: expectedWorldStateHash.value,
      startBattleInput: {
        createBattleRequest: {
          simulationId,
          worldDate: session.runtimeState.worldState.worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: {
            person: participantA.value.person,
            temporaryCondition: participantA.value.temporaryCondition,
          },
          participantB: {
            person: participantB.value.person,
            temporaryCondition: participantB.value.temporaryCondition,
          },
          participantAActionSourceIdentity: input.participantAActionSourceIdentity,
          participantBActionSourceIdentity: input.participantBActionSourceIdentity,
          runRuleSnapshot: session.context.runRuleSnapshot,
          ...(session.runtimeState.generatedTechniqueCatalogOverlay === undefined
            ? {}
            : {
                generatedTechniqueCatalogOverlay:
                  session.runtimeState.generatedTechniqueCatalogOverlay,
              }),
        },
        worldRngState: session.runtimeState.worldRngState,
        matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: input.participantAActionsSource,
      participantBActionsSource: input.participantBActionsSource,
      postProcessContext: buildPostProcessContext(
        session,
        matchPlan.participantPersonIdA,
        matchPlan.participantPersonIdB,
      ),
    },
    provider,
  );

  if (run.kind === "pre_start_failure") {
    return run;
  }

  const commit = commitRunBattlePlan({ session, commitPlan: run.commitPlan }, provider);
  if (!commit.ok) {
    return {
      kind: "commit_failure",
      commitPlan: run.commitPlan,
      validation: { ok: false, issues: commit.issues },
    };
  }

  if (run.commitPlan.battleResult.matchId !== matchPlan.reservedMatchId) {
    return {
      kind: "commit_failure",
      commitPlan: run.commitPlan,
      validation: {
        ok: false,
        issues: [
          {
            path: "/matchId",
            message: "committed battle MatchId does not match tournament match plan reservation",
            actual: run.commitPlan.battleResult.matchId,
            expected: matchPlan.reservedMatchId,
          },
        ],
      },
    };
  }

  return {
    kind: "completed",
    result: toHandoffResult(matchPlan, run.commitPlan),
    session: commit.value,
    commitPlan: run.commitPlan,
    slotBindings: appendSlotBinding(input.slotBindings, matchPlan),
  };
}

/** Snapshot helper for deterministic replay evidence without exposing mutable session internals. */
export function snapshotTournamentHandoffMaterial(
  result: TournamentBattleHandoffResult,
): Record<string, unknown> {
  return {
    schemaVersion: result.schemaVersion,
    tournamentId: result.tournamentId,
    bracketDefinitionHash: result.bracketDefinitionHash,
    structuralSlotKey: result.structuralSlotKey,
    structuralSlot: result.structuralSlot,
    matchId: result.matchId,
    battleResultFinalStateHash: result.battleResultFinalStateHash,
    winnerPersonId: result.winnerPersonId,
    loserPersonId: result.loserPersonId,
    executionPlanIdentityHash: result.executionPlanIdentityHash,
    matchPlanIdentityHash: result.matchPlanIdentityHash,
  };
}

export function snapshotTournamentHandoffMaterialJson(
  result: TournamentBattleHandoffResult,
): string {
  return toCanonicalJson(snapshotTournamentHandoffMaterial(result));
}
