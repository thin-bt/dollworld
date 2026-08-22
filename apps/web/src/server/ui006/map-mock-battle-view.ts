/**
 * MockBattleView mapping + exact34 validation (§13B/§13C/§13E / FIX-082).
 * Inputs must already be integrity-validated by the caller (§13A.5 order).
 */

import { fail, ok, type PureResult } from "./result.js";
import {
  MOCK_BATTLE_VIEW_KEYS,
  type FailureView,
  type MockBattleLatestRecordSource,
  type MockBattleView,
} from "./types.js";
import { validateEventCandidatesPair } from "./validate-event-candidates-pair.js";

const FORBIDDEN_VIEW_KEYS = ["judgeDecision", "battleResult"] as const;

function pickFailure(finalState: Record<string, unknown>): PureResult<FailureView | null> {
  const raw = finalState.failure;
  if (raw === null || raw === undefined) {
    return ok(null);
  }
  if (typeof raw !== "object") {
    return fail("finalState.failure must be object or null");
  }
  const failure = raw as Record<string, unknown>;
  if ("message" in failure) {
    return fail("failure.message is forbidden on wire");
  }
  for (const key of ["code", "severity", "targetIds", "reason", "canContinue"] as const) {
    if (!(key in failure)) {
      return fail(`failure missing ${key}`);
    }
  }
  return ok({
    code: String(failure.code),
    severity: String(failure.severity),
    targetIds: failure.targetIds as string[],
    reason: String(failure.reason),
    canContinue: Boolean(failure.canContinue),
  });
}

export function validateMockBattleViewShape(view: Record<string, unknown>): PureResult<true> {
  const keys = Object.keys(view);
  if (keys.length !== MOCK_BATTLE_VIEW_KEYS.length) {
    return fail(`MockBattleView key count must be 34, got ${keys.length}`);
  }
  for (const key of MOCK_BATTLE_VIEW_KEYS) {
    if (!(key in view)) {
      return fail(`MockBattleView missing key: ${key}`);
    }
  }
  for (const key of keys) {
    if (!(MOCK_BATTLE_VIEW_KEYS as readonly string[]).includes(key)) {
      return fail(`MockBattleView unknown key: ${key}`);
    }
    if ((FORBIDDEN_VIEW_KEYS as readonly string[]).includes(key)) {
      return fail(`MockBattleView forbidden key: ${key}`);
    }
  }
  if (view.replayAvailable !== true) {
    return fail("replayAvailable must be true");
  }
  if (view.battleKind !== "mock") {
    return fail("battleKind must be mock");
  }
  if (view.battleResultSchemaVersion !== "0.5.0") {
    return fail("battleResultSchemaVersion must be 0.5.0");
  }
  return ok(true);
}

/** §13E.6/§13E.7 completed / failed invariants on the produced view. */
export function validateMockBattleViewInvariants(view: MockBattleView): PureResult<true> {
  if (view.resultKind === "completed") {
    if (view.winnerPersonId === null || view.loserPersonId === null) {
      return fail("completed requires winner and loser");
    }
    if (view.winnerPersonId === view.loserPersonId) {
      return fail("winner and loser must differ");
    }
    const participants = [view.participantAPersonId, view.participantBPersonId];
    if (!participants.includes(view.winnerPersonId) || !participants.includes(view.loserPersonId)) {
      return fail("winner/loser must be the two participants");
    }
    if (view.endReason === "resolution_error") {
      return fail("completed must not be resolution_error");
    }
    if (view.failure !== null) {
      return fail("completed requires failure null");
    }
    if ((view.finalState as { status?: unknown }).status !== "completed") {
      return fail("completed requires finalState.status completed");
    }
    if ((view.validation as { overallPassed?: unknown }).overallPassed !== true) {
      return fail("completed requires validation.overallPassed true");
    }
  } else {
    if (view.winnerPersonId !== null || view.loserPersonId !== null) {
      return fail("failed requires null winner/loser");
    }
    if (view.endReason !== "resolution_error") {
      return fail("failed requires resolution_error");
    }
    if (view.endReasonIsJudgeDecision !== false || view.judgementApplied !== false) {
      return fail("failed requires judge flags false");
    }
    if (view.judgeScore !== null) {
      return fail("failed requires judgeScore null");
    }
    if (view.failure === null) {
      return fail("failed requires failure");
    }
    if ((view.finalState as { status?: unknown }).status !== "failed") {
      return fail("failed requires finalState.status failed");
    }
    if ((view.validation as { overallPassed?: unknown }).overallPassed !== false) {
      return fail("failed requires validation.overallPassed false");
    }
  }
  if (view.endReasonIsJudgeDecision !== (view.endReason === "judge_decision")) {
    return fail("endReasonIsJudgeDecision mapping mismatch");
  }
  if (view.judgementApplied !== (view.judgeScore !== null && view.judgeScore !== undefined)) {
    return fail("judgementApplied mapping mismatch");
  }
  // §13B.3 judgeScore null correlation.
  const a = view.finalState.participantA as { unableToContinue?: unknown } | undefined;
  const b = view.finalState.participantB as { unableToContinue?: unknown } | undefined;
  const bothUnable = a?.unableToContinue === true && b?.unableToContinue === true;
  const expectJudge =
    view.endReason === "judge_decision" || (view.endReason === "unable_to_continue" && bothUnable);
  if (expectJudge !== view.judgementApplied) {
    return fail("judgeScore null correlation violated");
  }
  return ok(true);
}

export function mapLatestToMockBattleView(
  record: MockBattleLatestRecordSource,
): PureResult<MockBattleView> {
  const br = record.battleResult;
  const pair = validateEventCandidatesPair(record.eventCandidates);
  if (!pair.ok) {
    return pair;
  }
  if (br.battleKind !== "mock") {
    return fail("battleKind must be mock");
  }
  if (br.schemaVersion !== "0.5.0") {
    return fail("schemaVersion must be 0.5.0");
  }
  if (record.replaySnapshot.sourceWorldUiRevision > record.resultUiRevision) {
    return fail("sourceWorldUiRevision must be <= resultUiRevision");
  }

  const participantA = br.finalState.participantA as { sourceSnapshotHash: string };
  const participantB = br.finalState.participantB as { sourceSnapshotHash: string };
  const battleSeed = br.finalState.battleSeed;
  if (typeof battleSeed !== "number") {
    return fail("finalState.battleSeed required");
  }

  const failure = br.resultKind === "completed" ? ok(null) : pickFailure(br.finalState);
  if (!failure.ok) {
    return failure;
  }
  if (br.resultKind === "completed" && br.finalState.failure != null) {
    return fail("completed result must have finalState.failure null");
  }
  if (br.resultKind === "failed" && failure.value === null) {
    return fail("failed result requires failure exact5");
  }

  const endReasonIsJudgeDecision = br.endReason === "judge_decision";
  const judgementApplied = br.judgeScore != null;

  const view: MockBattleView = {
    resultUiRevision: record.resultUiRevision,
    sourceWorldUiRevision: record.replaySnapshot.sourceWorldUiRevision,
    battleResultSchemaVersion: "0.5.0",
    matchId: br.matchId,
    simulationId: br.simulationId,
    battleKind: "mock",
    participantAPersonId: br.participantAId,
    participantBPersonId: br.participantBId,
    participantAActionSourceIdentity: structuredClone(br.participantAActionSourceIdentity),
    participantBActionSourceIdentity: structuredClone(br.participantBActionSourceIdentity),
    participantSourceSnapshotHashes: {
      participantA: participantA.sourceSnapshotHash,
      participantB: participantB.sourceSnapshotHash,
    },
    sourceWorldDate: {
      year: br.worldDate.year,
      month: br.worldDate.month,
      week: br.worldDate.weekOfMonth,
    },
    battleSeed,
    resultKind: br.resultKind,
    winnerPersonId: br.winnerPersonId,
    loserPersonId: br.loserPersonId,
    endReason: br.endReason,
    endReasonIsJudgeDecision,
    judgementApplied,
    judgeScore: br.judgeScore === undefined ? null : structuredClone(br.judgeScore),
    turnsExecuted: br.turnsExecuted,
    battleInputHash: br.battleInputHash,
    runRuleSnapshotHash: br.runRuleSnapshotHash,
    sprint1ConfigVersion: br.sprint1ConfigVersion,
    sprint1ConfigHash: br.sprint1ConfigHash,
    techniqueCatalogDataVersion: br.techniqueCatalogDataVersion,
    techniqueCatalogHash: br.techniqueCatalogHash,
    finalState: structuredClone(br.finalState),
    finalRngState: structuredClone(br.finalRngState),
    failure: failure.value,
    eventCandidates: structuredClone([...pair.value]) as unknown[],
    validation: structuredClone(br.validation),
    logTotalCount: br.detailedLog.actionLogs.length,
    replayAvailable: true,
  };

  const shape = validateMockBattleViewShape(view as unknown as Record<string, unknown>);
  if (!shape.ok) {
    return shape;
  }
  const invariants = validateMockBattleViewInvariants(view);
  if (!invariants.ok) {
    return invariants;
  }
  return ok(view);
}

/** §13C.1B revision separation for GET latest. */
export function validateRevisionSeparation(input: {
  sessionUiRevision: number;
  resultUiRevision: number;
  sourceWorldUiRevision: number;
}): PureResult<true> {
  if (input.sourceWorldUiRevision > input.resultUiRevision) {
    return fail("sourceWorldUiRevision <= resultUiRevision required");
  }
  if (input.resultUiRevision > input.sessionUiRevision) {
    return fail("resultUiRevision <= session uiRevision required");
  }
  // Do NOT require resultUiRevision === sessionUiRevision.
  return ok(true);
}
