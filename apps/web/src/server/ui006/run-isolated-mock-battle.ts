/**
 * Isolated mock battle execution (§4.4 / §13D / §13G / ACC-024/025/038).
 *
 * UI-000 fixed `isolatedRunnerDecision = not_required`: no IsolatedMockBattleRunner
 * facade is introduced here. The public simulation-core surface is used directly —
 * canonical clone of the committed source session, then `runBattleToCompletion`
 * plus `commitRunBattlePlan` against the clone only. The canonical world, World RNG,
 * MatchIdGeneratorState, event allocation and event stream are never touched.
 */

import {
  commitRunBattlePlan,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  createDefaultStrategyActionSourceIdentity,
  isBattleExecutionAbortError,
  runBattleToCompletion,
  toCanonicalJson,
  validateSprint1RunSession,
  type Sha256Provider,
  type Sprint1RunSession,
  type ValidationIssue,
} from "@shared-world/simulation-core";
import { buildMockCandidateSourceRows } from "../ui004/source-from-runtime.js";
import { mockCandidateEligible } from "../ui004/mock-candidates/mock-candidate-eligible.js";
import type { BattleResultSource, EventCandidateSource } from "./types.js";

export type MockBattleExecutionHooks = {
  /** FI-049: post-start execution abort between run and clone commit. */
  throwOnBattleExecution?: () => void;
  /** Force the clone commit to fail (execution abort surface). */
  failCloneCommit?: boolean;
};

export type IsolatedMockRunOutcome =
  | { kind: "pre_start_failure"; issues: readonly ValidationIssue[] }
  | { kind: "execution_abort"; reason: string }
  | { kind: "internal"; reason: string }
  | {
      kind: "ok";
      battleResult: BattleResultSource;
      eventCandidates: readonly [EventCandidateSource, EventCandidateSource];
      participantAActionSourceIdentity: Record<string, unknown>;
      participantBActionSourceIdentity: Record<string, unknown>;
    };

/** Canonical deep clone; the result shares no mutable reference with the source. */
export function canonicalCloneSession(session: Sprint1RunSession): Record<string, unknown> {
  return JSON.parse(toCanonicalJson(session)) as Record<string, unknown>;
}

export type EligibilityOutcome =
  | { kind: "ok" }
  | { kind: "missing"; personId: string }
  | { kind: "ineligible"; personId: string }
  | { kind: "corrupt" };

/**
 * DB-008 revalidation on the accepted immutable source snapshot (BRIDGE-059).
 * Candidate GET output is never trusted here.
 */
export function revalidateMockParticipants(
  session: Sprint1RunSession,
  participantAId: string,
  participantBId: string,
): EligibilityOutcome {
  const source = buildMockCandidateSourceRows(session);
  if (!source.ok) {
    return { kind: "corrupt" };
  }
  for (const personId of [participantAId, participantBId]) {
    const row = source.rows.find((entry) => entry.personId === personId);
    if (row === undefined) {
      return { kind: "missing", personId };
    }
    if (!row.sourceValidationOk || row.eligibleInput === undefined) {
      return { kind: "corrupt" };
    }
    if (!mockCandidateEligible(row.eligibleInput)) {
      return { kind: "ineligible", personId };
    }
  }
  return { kind: "ok" };
}

function participantSource(
  session: Sprint1RunSession,
  personId: string,
): Record<string, unknown> | undefined {
  const person = session.runtimeState.worldState.persons.find(
    (entry) => entry.personId === personId,
  );
  const sidecar = session.runtimeState.weeklyTrainingSidecars.entries.find(
    (entry) => entry.personId === personId,
  );
  if (person === undefined || sidecar === undefined) {
    return undefined;
  }
  return { person, temporaryCondition: sidecar.temporaryCondition };
}

/**
 * Build the canonical `RunBattleToCompletionInput` for a mock battle from an
 * isolated clone. `battleKind` is fixed to `mock` and both action sources come from
 * the run's `DefaultBattleStrategy` identity (ACC-026); the UI never supplies scripts.
 */
export function buildMockRunInput(input: {
  clone: Sprint1RunSession;
  participantAId: string;
  participantBId: string;
  provider: Sha256Provider;
}):
  | { ok: true; runInput: Record<string, unknown>; identity: Record<string, unknown> }
  | { ok: false; issues: readonly ValidationIssue[] } {
  const identity = createDefaultStrategyActionSourceIdentity({
    strategyVersion: input.clone.context.runRuleSnapshot.defaultBattleStrategyVersion,
    strategyConfigHash: input.clone.context.runRuleSnapshot.sprint1ConfigHash,
  });
  if (!identity.ok) {
    return { ok: false, issues: identity.issues };
  }
  const worldStateHash = computeExpectedWorldStateHash(
    input.clone.runtimeState.worldState,
    input.provider,
  );
  if (!worldStateHash.ok) {
    return { ok: false, issues: worldStateHash.issues };
  }
  const sourceA = participantSource(input.clone, input.participantAId);
  const sourceB = participantSource(input.clone, input.participantBId);
  if (sourceA === undefined || sourceB === undefined) {
    return {
      ok: false,
      issues: [
        {
          path: sourceA === undefined ? "/participantAId" : "/participantBId",
          message: "participant is not present in the isolated source runtime",
        },
      ],
    };
  }
  const identityValue = identity.value as unknown as Record<string, unknown>;
  const weekState = input.clone.runtimeState.battleResultWeekState;
  return {
    ok: true,
    identity: identityValue,
    runInput: {
      expectedWorldStateHash: worldStateHash.value,
      startBattleInput: {
        createBattleRequest: {
          simulationId: input.clone.context.simulationId,
          worldDate: input.clone.runtimeState.worldState.worldDate,
          battleKind: "mock",
          initialRange: "middle",
          participantA: sourceA,
          participantB: sourceB,
          participantAActionSourceIdentity: identityValue,
          participantBActionSourceIdentity: identityValue,
          runRuleSnapshot: input.clone.context.runRuleSnapshot,
        },
        worldRngState: input.clone.runtimeState.worldRngState,
        matchIdGeneratorState: input.clone.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: { identity: identityValue },
      participantBActionsSource: { identity: identityValue },
      postProcessContext: {
        participantA: {
          personId: input.participantAId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(weekState, input.participantAId),
        },
        participantB: {
          personId: input.participantBId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(weekState, input.participantBId),
        },
      },
    },
  };
}

/**
 * Run one mock battle inside an isolated clone rebuilt from `checkpoint`, and complete
 * the canonical atomic commit on that clone only.
 */
export function runIsolatedMockBattle(input: {
  checkpoint: Record<string, unknown>;
  participantAId: string;
  participantBId: string;
  provider: Sha256Provider;
  hooks?: MockBattleExecutionHooks;
}): IsolatedMockRunOutcome {
  const isolated = validateSprint1RunSession(
    JSON.parse(JSON.stringify(input.checkpoint)) as unknown,
    input.provider,
  );
  if (!isolated.ok) {
    return { kind: "internal", reason: "isolated runtime rebuild failed" };
  }
  const clone = isolated.value;

  const built = buildMockRunInput({
    clone,
    participantAId: input.participantAId,
    participantBId: input.participantBId,
    provider: input.provider,
  });
  if (!built.ok) {
    return { kind: "pre_start_failure", issues: built.issues };
  }

  let run;
  try {
    run = runBattleToCompletion(built.runInput, input.provider);
  } catch (error) {
    if (isBattleExecutionAbortError(error)) {
      return { kind: "execution_abort", reason: "battle execution aborted after start" };
    }
    return { kind: "internal", reason: "battle execution threw" };
  }

  if (run.kind === "pre_start_failure") {
    return { kind: "pre_start_failure", issues: run.validation.issues };
  }

  try {
    input.hooks?.throwOnBattleExecution?.();
  } catch (error) {
    if (isBattleExecutionAbortError(error)) {
      return { kind: "execution_abort", reason: "battle execution aborted after start" };
    }
    return { kind: "internal", reason: "post-start execution abort" };
  }

  if (input.hooks?.failCloneCommit === true) {
    return { kind: "execution_abort", reason: "clone commit aborted" };
  }

  // §4.4: the plan alone is not a commit — finish the canonical atomic commit on the clone.
  const committed = commitRunBattlePlan(
    { session: clone, commitPlan: run.commitPlan },
    input.provider,
  );
  if (!committed.ok) {
    return { kind: "execution_abort", reason: "clone commit rejected the plan" };
  }

  const battleResult = JSON.parse(
    toCanonicalJson(run.commitPlan.battleResult),
  ) as BattleResultSource;
  const eventCandidates = JSON.parse(toCanonicalJson(run.commitPlan.eventCandidates)) as [
    EventCandidateSource,
    EventCandidateSource,
  ];
  const identity = JSON.parse(toCanonicalJson(built.identity)) as Record<string, unknown>;

  return {
    kind: "ok",
    battleResult,
    eventCandidates,
    participantAActionSourceIdentity: identity,
    participantBActionSourceIdentity: identity,
  };
}
