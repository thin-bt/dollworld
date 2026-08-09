/**
 * finalizeBattleResult — build BattleResult from terminal state (13 / S01-007).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { computeBattleResultFields, computeFinalStateHash } from "./battle-result-compute.js";
import {
  BATTLE_RESULT_SCHEMA_VERSION,
  type BattleResult,
  type FinalizeBattleResultInput,
} from "./battle-result-types.js";
import { evaluateBattleResultValidation } from "./validate-battle-result.js";
import { validateBattleState } from "./battle-state.js";
import { validateBattleStateReplayConsistency } from "./battle-detailed-log-replay.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  buildRunRuleSnapshotHashInput,
  computeRunRuleSnapshotHash,
  validateRunRuleSnapshot,
} from "./run-rule-snapshot.js";

export { computeFinalStateHash } from "./battle-result-compute.js";

export const FINALIZE_BATTLE_RESULT_INPUT_KEYS = [
  "terminalBattleState",
  "runRuleSnapshot",
  "postProcessContext",
] as const;

function snapshotFinalizeInput(input: unknown): ValidationResult<FinalizeBattleResultInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "FinalizeBattleResultInput must be a plain object",
              expected: "{ terminalBattleState, runRuleSnapshot, postProcessContext }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, FINALIZE_BATTLE_RESULT_INPUT_KEYS, "", issues);
  for (const key of FINALIZE_BATTLE_RESULT_INPUT_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({ path: `/${key}`, message: "required key is missing" });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  // Snapshot once: only these captured values are used afterward.
  return success({
    terminalBattleState: object[
      "terminalBattleState"
    ] as FinalizeBattleResultInput["terminalBattleState"],
    runRuleSnapshot: object["runRuleSnapshot"],
    postProcessContext: object[
      "postProcessContext"
    ] as FinalizeBattleResultInput["postProcessContext"],
  });
}

export function finalizeBattleResult(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleResult> {
  const snapped = snapshotFinalizeInput(input);
  if (!snapped.ok) return snapped;
  const { terminalBattleState, runRuleSnapshot, postProcessContext } = snapped.value;

  const snapshot = validateRunRuleSnapshot(runRuleSnapshot, provider);
  if (!snapshot.ok) {
    return failure(
      snapshot.issues.map((issue) => ({
        ...issue,
        path: `/runRuleSnapshot${issue.path}`,
      })),
    );
  }
  const runRule = snapshot.value;

  const terminalValidated = validateBattleState(terminalBattleState, provider);
  if (!terminalValidated.ok) {
    return failure(
      terminalValidated.issues.map((issue) => ({
        ...issue,
        path: `/terminalBattleState${issue.path}`,
      })),
    );
  }
  const state = terminalValidated.value;

  if (state.runRuleSnapshotHash !== runRule.runRuleSnapshotHash) {
    return failure([
      {
        path: "/runRuleSnapshotHash",
        message: "runRuleSnapshot hash must match terminalBattleState.runRuleSnapshotHash",
        actual: runRule.runRuleSnapshotHash,
        expected: state.runRuleSnapshotHash,
      },
    ]);
  }
  const recomputedHash = computeRunRuleSnapshotHash(
    buildRunRuleSnapshotHashInput(runRule),
    provider,
  );
  if (!recomputedHash.ok) return recomputedHash;
  if (recomputedHash.value !== runRule.runRuleSnapshotHash) {
    return failure([
      {
        path: "/runRuleSnapshotHash",
        message: "runRuleSnapshotHash must equal recomputed canonical hash",
      },
    ]);
  }

  const replay = validateBattleStateReplayConsistency(state, runRule);
  if (!replay.ok) {
    return failure(
      replay.issues.map((issue) => ({
        ...issue,
        path: `/terminalBattleState/replay${issue.path}`,
      })),
    );
  }

  const fields = computeBattleResultFields(state, runRule, postProcessContext, provider);
  if (!fields.ok) return fields;
  const computed = fields.value;
  const ref = state.battleRulesSnapshotRef;

  const hashMaterial = {
    matchId: state.matchId,
    battleKind: state.battleKind,
    finalState: computed.finalState,
    winnerPersonId: computed.winnerPersonId,
    loserPersonId: computed.loserPersonId,
    battleRulesRefHash: state.battleRulesRefHash,
    runRuleSnapshotHash: state.runRuleSnapshotHash,
    battleInputHash: state.battleInputHash,
    sprint1ConfigVersion: ref.sprint1ConfigVersion,
    sprint1ConfigHash: ref.sprint1ConfigHash,
    techniqueCatalogDataVersion: ref.techniqueCatalogDataVersion,
    techniqueCatalogHash: ref.techniqueCatalogHash,
    postProcessContext: computed.postProcessContext,
    postProcessContextHash: computed.postProcessContextHash,
    resultKind: computed.resultKind,
    judgeScore: computed.judgeScore,
    summaryLog: computed.summaryLog,
    summaryLogHash: computed.summaryLogHash,
    detailedLog: state.detailedLog,
    developmentEffects: computed.developmentEffects,
    finalRngState: computed.finalRngState,
  };
  const finalStateHash = computeFinalStateHash(hashMaterial, provider);
  if (!finalStateHash.ok) return finalStateHash;

  const draft: BattleResult = deepFreezePlainJson({
    schemaVersion: BATTLE_RESULT_SCHEMA_VERSION,
    matchId: state.matchId,
    simulationId: state.simulationId,
    worldDate: state.worldDate,
    battleKind: state.battleKind,
    participantAId: state.participantA.personId,
    participantBId: state.participantB.personId,
    participantAActionSourceIdentity: state.participantAActionSourceIdentity,
    participantBActionSourceIdentity: state.participantBActionSourceIdentity,
    winnerPersonId: computed.winnerPersonId,
    loserPersonId: computed.loserPersonId,
    resultKind: computed.resultKind,
    endReason: computed.endReason,
    turnsExecuted: computed.turnsExecuted,
    battleRulesRefHash: state.battleRulesRefHash,
    runRuleSnapshotHash: state.runRuleSnapshotHash,
    battleInputHash: state.battleInputHash,
    sprint1ConfigVersion: ref.sprint1ConfigVersion,
    sprint1ConfigHash: ref.sprint1ConfigHash,
    techniqueCatalogDataVersion: ref.techniqueCatalogDataVersion,
    techniqueCatalogHash: ref.techniqueCatalogHash,
    postProcessContext: computed.postProcessContext,
    postProcessContextHash: computed.postProcessContextHash,
    finalState: computed.finalState,
    judgeScore: computed.judgeScore,
    summaryLog: computed.summaryLog,
    summaryLogHash: computed.summaryLogHash,
    detailedLog: state.detailedLog,
    developmentEffects: computed.developmentEffects,
    finalRngState: computed.finalRngState,
    finalStateHash: finalStateHash.value,
    validation: {
      overallPassed: computed.resultKind === "completed",
      violations: [],
    },
  });

  const validation = evaluateBattleResultValidation(draft, runRule, provider);
  if (!validation.ok) return validation;

  const result = deepFreezePlainJson({
    ...draft,
    validation: validation.value,
  });

  if (result.resultKind === "completed" && !result.validation.overallPassed) {
    return failure(
      result.validation.violations.map((v) => ({
        path: "/validation",
        message: v.reason,
      })),
    );
  }
  if (result.resultKind === "failed" && result.validation.overallPassed) {
    return failure([
      {
        path: "/validation/overallPassed",
        message: "failed BattleResult must have validation.overallPassed=false",
      },
    ]);
  }

  return success(result);
}
