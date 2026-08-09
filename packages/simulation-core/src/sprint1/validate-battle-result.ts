/**
 * BattleResult validator — independent recomputation against 13 / S1-SPEC-0.1.18.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { computeBattleResultFields, computeFinalStateHash } from "./battle-result-compute.js";
import {
  BATTLE_END_REASONS,
  BATTLE_RESULT_KINDS,
  BATTLE_RESULT_SCHEMA_VERSION,
  type BattleResult,
  type BattleResultValidation,
  type BattleResultViolation,
} from "./battle-result-types.js";
import type { BattleState } from "./battle-state.js";
import { validateBattleDetailedLog, validateBattleState } from "./battle-state.js";
import { validateBattleStateReplayConsistency } from "./battle-detailed-log-replay.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  isPlainObject,
  rejectUnknownKeys,
  requireBoolean,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  buildRunRuleSnapshotHashInput,
  computeRunRuleSnapshotHash,
  validateRunRuleSnapshot,
} from "./run-rule-snapshot.js";
import { seededRngStatesEqual, validateSeededRngState } from "./validate-seeded-rng-state.js";

export const BATTLE_RESULT_KEYS = [
  "schemaVersion",
  "matchId",
  "simulationId",
  "worldDate",
  "battleKind",
  "participantAId",
  "participantBId",
  "participantAActionSourceIdentity",
  "participantBActionSourceIdentity",
  "winnerPersonId",
  "loserPersonId",
  "resultKind",
  "endReason",
  "turnsExecuted",
  "battleRulesRefHash",
  "runRuleSnapshotHash",
  "battleInputHash",
  "sprint1ConfigVersion",
  "sprint1ConfigHash",
  "techniqueCatalogDataVersion",
  "techniqueCatalogHash",
  "postProcessContext",
  "postProcessContextHash",
  "finalState",
  "judgeScore",
  "summaryLog",
  "summaryLogHash",
  "detailedLog",
  "developmentEffects",
  "finalRngState",
  "finalStateHash",
  "validation",
] as const;

function issue(
  path: string,
  message: string,
  actual?: unknown,
  expected?: unknown,
): ValidationIssue {
  const out: ValidationIssue = { path, message };
  if (actual !== undefined) out.actual = actual;
  if (expected !== undefined) {
    out.expected = typeof expected === "string" ? expected : JSON.stringify(expected);
  }
  return out;
}

function toViolations(issues: readonly ValidationIssue[]): BattleResultViolation[] {
  return issues.map((i) => ({
    code: "battle_result_validation_failed",
    severity: "error" as const,
    targetIds: [],
    reason: `${i.path}: ${i.message}`,
    canContinue: false,
  }));
}

function reconstructTerminalState(result: BattleResult): BattleState {
  return deepFreezePlainJson({
    ...cloneValidatedPlainJson(result.finalState),
    detailedLog: cloneValidatedPlainJson(result.detailedLog),
  });
}

function compareCanonical(
  issues: ValidationIssue[],
  path: string,
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (toCanonicalJson(actual) !== toCanonicalJson(expected)) {
    issues.push(issue(path, message, actual, expected));
  }
}

/**
 * Build the BattleResultValidation object that must be stored on a BattleResult.
 * Independent of the candidate's claimed validation field.
 */
export function evaluateBattleResultValidation(
  result: BattleResult,
  runRuleSnapshot: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleResultValidation> {
  const issues: ValidationIssue[] = [];

  if (result.schemaVersion !== BATTLE_RESULT_SCHEMA_VERSION) {
    issues.push(
      issue(
        "/schemaVersion",
        "schemaVersion must be BattleResult Sprint 1 initial value",
        result.schemaVersion,
        BATTLE_RESULT_SCHEMA_VERSION,
      ),
    );
  }
  if (!(BATTLE_RESULT_KINDS as readonly string[]).includes(result.resultKind)) {
    issues.push(issue("/resultKind", "invalid resultKind", result.resultKind));
  }
  if (!(BATTLE_END_REASONS as readonly string[]).includes(result.endReason)) {
    issues.push(issue("/endReason", "invalid endReason", result.endReason));
  }

  const runRule = validateRunRuleSnapshot(runRuleSnapshot, provider);
  if (!runRule.ok) {
    return failure(runRule.issues.map((i) => ({ ...i, path: `/runRuleSnapshot${i.path}` })));
  }
  const recomputedRunHash = computeRunRuleSnapshotHash(
    buildRunRuleSnapshotHashInput(runRule.value),
    provider,
  );
  if (!recomputedRunHash.ok) return recomputedRunHash;
  if (recomputedRunHash.value !== runRule.value.runRuleSnapshotHash) {
    issues.push(issue("/runRuleSnapshotHash", "runRuleSnapshotHash recomputation mismatch"));
  }
  if (result.runRuleSnapshotHash !== runRule.value.runRuleSnapshotHash) {
    issues.push(
      issue(
        "/runRuleSnapshotHash",
        "BattleResult.runRuleSnapshotHash must match RunRuleSnapshot",
        result.runRuleSnapshotHash,
        runRule.value.runRuleSnapshotHash,
      ),
    );
  }
  if (result.simulationId !== runRule.value.simulationId) {
    issues.push(issue("/simulationId", "simulationId must match RunRuleSnapshot"));
  }
  if (result.sprint1ConfigVersion !== runRule.value.sprint1ConfigVersion) {
    issues.push(issue("/sprint1ConfigVersion", "config version mismatch"));
  }
  if (result.sprint1ConfigHash !== runRule.value.sprint1ConfigHash) {
    issues.push(issue("/sprint1ConfigHash", "config hash mismatch"));
  }
  if (result.techniqueCatalogDataVersion !== runRule.value.techniqueCatalogDataVersion) {
    issues.push(issue("/techniqueCatalogDataVersion", "catalog dataVersion mismatch"));
  }
  if (result.techniqueCatalogHash !== runRule.value.techniqueCatalogHash) {
    issues.push(issue("/techniqueCatalogHash", "catalog hash mismatch"));
  }

  const terminal = reconstructTerminalState(result);
  const validatedState = validateBattleState(terminal, provider);
  if (!validatedState.ok) {
    issues.push(
      ...validatedState.issues.map((i) => ({
        ...i,
        path: `/finalState${i.path}`,
      })),
    );
  } else {
    const replay = validateBattleStateReplayConsistency(validatedState.value, runRule.value);
    if (!replay.ok) {
      issues.push(
        ...replay.issues.map((i) => ({
          ...i,
          path: `/detailedLog/replay${i.path}`,
        })),
      );
    }
  }

  if (validatedState.ok) {
    const expected = computeBattleResultFields(
      validatedState.value,
      runRule.value,
      result.postProcessContext,
      provider,
    );
    if (!expected.ok) {
      issues.push(...expected.issues);
    } else {
      const e = expected.value;
      compareCanonical(
        issues,
        "/resultKind",
        result.resultKind,
        e.resultKind,
        "resultKind mismatch",
      );
      compareCanonical(issues, "/endReason", result.endReason, e.endReason, "endReason mismatch");
      compareCanonical(
        issues,
        "/turnsExecuted",
        result.turnsExecuted,
        e.turnsExecuted,
        "turnsExecuted mismatch",
      );
      compareCanonical(
        issues,
        "/winnerPersonId",
        result.winnerPersonId,
        e.winnerPersonId,
        "winnerPersonId mismatch",
      );
      compareCanonical(
        issues,
        "/loserPersonId",
        result.loserPersonId,
        e.loserPersonId,
        "loserPersonId mismatch",
      );
      compareCanonical(
        issues,
        "/judgeScore",
        result.judgeScore,
        e.judgeScore,
        "judgeScore mismatch",
      );
      compareCanonical(
        issues,
        "/developmentEffects",
        result.developmentEffects,
        e.developmentEffects,
        "developmentEffects mismatch",
      );
      compareCanonical(
        issues,
        "/summaryLog",
        result.summaryLog,
        e.summaryLog,
        "summaryLog mismatch",
      );
      compareCanonical(
        issues,
        "/summaryLogHash",
        result.summaryLogHash,
        e.summaryLogHash,
        "summaryLogHash mismatch",
      );
      compareCanonical(
        issues,
        "/postProcessContext",
        result.postProcessContext,
        e.postProcessContext,
        "postProcessContext mismatch",
      );
      compareCanonical(
        issues,
        "/postProcessContextHash",
        result.postProcessContextHash,
        e.postProcessContextHash,
        "postProcessContextHash mismatch",
      );
      compareCanonical(
        issues,
        "/finalState",
        result.finalState,
        e.finalState,
        "finalState mismatch",
      );
      if (!seededRngStatesEqual(result.finalRngState, e.finalRngState)) {
        issues.push(
          issue("/finalRngState", "finalRngState mismatch with recomputed RNG end state"),
        );
      }

      // Aggregate / effect field spot checks (also covered by developmentEffects/summary compare)
      if (
        e.resultKind === "completed" &&
        !Array.isArray(e.developmentEffects) &&
        "participantA" in e.developmentEffects
      ) {
        const effects = e.developmentEffects;
        compareCanonical(
          issues,
          "/developmentEffects/participantA/currentMentalAfter",
          effects.participantA.currentMentalAfter,
          validatedState.value.participantA.currentMental,
          "currentMentalAfter must equal final currentMental",
        );
        compareCanonical(
          issues,
          "/developmentEffects/participantB/currentMentalAfter",
          effects.participantB.currentMentalAfter,
          validatedState.value.participantB.currentMental,
          "currentMentalAfter must equal final currentMental",
        );
      }

      const hash = computeFinalStateHash(
        {
          matchId: result.matchId,
          battleKind: result.battleKind,
          finalState: e.finalState,
          winnerPersonId: e.winnerPersonId,
          loserPersonId: e.loserPersonId,
          battleRulesRefHash: result.battleRulesRefHash,
          runRuleSnapshotHash: result.runRuleSnapshotHash,
          battleInputHash: result.battleInputHash,
          sprint1ConfigVersion: result.sprint1ConfigVersion,
          sprint1ConfigHash: result.sprint1ConfigHash,
          techniqueCatalogDataVersion: result.techniqueCatalogDataVersion,
          techniqueCatalogHash: result.techniqueCatalogHash,
          postProcessContext: e.postProcessContext,
          postProcessContextHash: e.postProcessContextHash,
          resultKind: e.resultKind,
          judgeScore: e.judgeScore,
          summaryLog: e.summaryLog,
          summaryLogHash: e.summaryLogHash,
          detailedLog: result.detailedLog,
          developmentEffects: e.developmentEffects,
          finalRngState: e.finalRngState,
        },
        provider,
      );
      if (!hash.ok) {
        issues.push(...hash.issues);
      } else if (hash.value !== result.finalStateHash) {
        issues.push(
          issue(
            "/finalStateHash",
            "finalStateHash must equal recomputed hash",
            result.finalStateHash,
            hash.value,
          ),
        );
      }
    }

    // Identity fields from terminal state (top-level ↔ finalState bind)
    compareCanonical(
      issues,
      "/matchId",
      result.matchId,
      validatedState.value.matchId,
      "matchId mismatch",
    );
    compareCanonical(
      issues,
      "/worldDate",
      result.worldDate,
      validatedState.value.worldDate,
      "worldDate must equal finalState.worldDate",
    );
    compareCanonical(
      issues,
      "/battleKind",
      result.battleKind,
      validatedState.value.battleKind,
      "battleKind must equal finalState.battleKind",
    );
    compareCanonical(
      issues,
      "/runRuleSnapshotHash",
      result.runRuleSnapshotHash,
      validatedState.value.runRuleSnapshotHash,
      "runRuleSnapshotHash must equal finalState.runRuleSnapshotHash",
    );
    compareCanonical(
      issues,
      "/participantAId",
      result.participantAId,
      validatedState.value.participantA.personId,
      "participantAId mismatch",
    );
    compareCanonical(
      issues,
      "/participantBId",
      result.participantBId,
      validatedState.value.participantB.personId,
      "participantBId mismatch",
    );
    compareCanonical(
      issues,
      "/participantAActionSourceIdentity",
      result.participantAActionSourceIdentity,
      validatedState.value.participantAActionSourceIdentity,
      "participantAActionSourceIdentity mismatch",
    );
    compareCanonical(
      issues,
      "/participantBActionSourceIdentity",
      result.participantBActionSourceIdentity,
      validatedState.value.participantBActionSourceIdentity,
      "participantBActionSourceIdentity mismatch",
    );
    compareCanonical(
      issues,
      "/battleRulesRefHash",
      result.battleRulesRefHash,
      validatedState.value.battleRulesRefHash,
      "battleRulesRefHash mismatch",
    );
    compareCanonical(
      issues,
      "/battleInputHash",
      result.battleInputHash,
      validatedState.value.battleInputHash,
      "battleInputHash mismatch",
    );
  }

  // resolution_error invariants
  if (result.endReason === "resolution_error" || result.resultKind === "failed") {
    if (result.resultKind !== "failed") {
      issues.push(issue("/resultKind", "resolution_error requires resultKind=failed"));
    }
    if (result.endReason !== "resolution_error") {
      issues.push(issue("/endReason", "failed result requires endReason=resolution_error"));
    }
    if (result.finalState.status !== "failed") {
      issues.push(
        issue("/finalState/status", "resolution_error requires finalState.status=failed"),
      );
    }
    if (result.finalState.terminalReason !== null) {
      issues.push(
        issue("/finalState/terminalReason", "resolution_error requires terminalReason=null"),
      );
    }
    if (result.finalState.failure === null) {
      issues.push(issue("/finalState/failure", "resolution_error requires failure"));
    }
    if (result.winnerPersonId !== null || result.loserPersonId !== null) {
      issues.push(issue("/winnerPersonId", "resolution_error requires null winner and loser"));
    }
    if (!Array.isArray(result.developmentEffects) || result.developmentEffects.length !== 0) {
      issues.push(
        issue("/developmentEffects", "resolution_error requires empty developmentEffects"),
      );
    }
    if (result.judgeScore !== null) {
      issues.push(issue("/judgeScore", "resolution_error requires judgeScore=null"));
    }
    if (
      validatedState.ok &&
      !seededRngStatesEqual(result.finalRngState, validatedState.value.rngState)
    ) {
      issues.push(
        issue("/finalRngState", "resolution_error must not consume additional judge tie-break RNG"),
      );
    }
  }

  if (result.resultKind === "completed") {
    if (issues.length > 0) {
      return success(
        deepFreezePlainJson({
          overallPassed: false,
          violations: toViolations(issues),
        }),
      );
    }
    return success(deepFreezePlainJson({ overallPassed: true, violations: [] }));
  }

  // failed: overallPassed=false; include canonical failure from finalState.failure
  const failureViolations: BattleResultViolation[] = [];
  if (result.finalState.failure !== null) {
    failureViolations.push({
      code: result.finalState.failure.code,
      severity:
        result.finalState.failure.severity === "warning"
          ? ("warning" as const)
          : ("error" as const),
      targetIds: result.finalState.failure.targetIds,
      reason: result.finalState.failure.reason,
      canContinue: result.finalState.failure.canContinue,
    });
  }
  failureViolations.push(...toViolations(issues));
  if (failureViolations.length === 0) {
    failureViolations.push({
      code: "resolution_error",
      severity: "error",
      targetIds: [],
      reason: "battle resolution failed",
      canContinue: false,
    });
  }
  return success(
    deepFreezePlainJson({
      overallPassed: false,
      violations: failureViolations,
    }),
  );
}

/**
 * Public BattleResult validator. Rejects accessors / unknown keys / tampering via
 * independent recomputation. Returns a frozen BattleResult with authoritative validation.
 */
export function validateBattleResult(
  input: unknown,
  runRuleSnapshot: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleResult> {
  const structuralIssues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", structuralIssues);
  if (object === undefined) {
    return failure(
      structuralIssues.length > 0
        ? structuralIssues
        : [issue("", "BattleResult must be a plain object")],
    );
  }
  assertNoAccessors(object, "", structuralIssues);
  rejectUnknownKeys(object, BATTLE_RESULT_KEYS, "", structuralIssues);
  for (const key of BATTLE_RESULT_KEYS) {
    if (!hasOwn(object, key)) {
      structuralIssues.push(issue(`/${key}`, "required key is missing"));
    }
  }
  if (structuralIssues.length > 0) return failure(structuralIssues);

  // Nested containers dereferenced by evaluate / claim checks — shape before typed use.
  if (!isPlainObject(object["finalState"])) {
    structuralIssues.push(
      issue(
        "/finalState",
        "finalState must be a plain object",
        object["finalState"] === null
          ? null
          : Array.isArray(object["finalState"])
            ? "array"
            : typeof object["finalState"],
        "plain object",
      ),
    );
  }
  if (!isPlainObject(object["postProcessContext"])) {
    structuralIssues.push(
      issue(
        "/postProcessContext",
        "postProcessContext must be a plain object",
        object["postProcessContext"] === null
          ? null
          : Array.isArray(object["postProcessContext"])
            ? "array"
            : typeof object["postProcessContext"],
        "plain object",
      ),
    );
  }

  const validationValue = object["validation"];
  if (!isPlainObject(validationValue)) {
    structuralIssues.push(
      issue(
        "/validation",
        "validation must be a plain object",
        validationValue === null
          ? null
          : Array.isArray(validationValue)
            ? "array"
            : typeof validationValue,
        "plain object",
      ),
    );
  } else {
    requireBoolean(validationValue, "overallPassed", "/validation", structuralIssues);
    if (!hasOwn(validationValue, "violations") || !Array.isArray(validationValue["violations"])) {
      structuralIssues.push(
        issue(
          "/validation/violations",
          "violations must be an array",
          !hasOwn(validationValue, "violations")
            ? "missing"
            : validationValue["violations"] === null
              ? null
              : typeof validationValue["violations"],
          "array",
        ),
      );
    }
  }

  const detailedLogResult = validateBattleDetailedLog(object["detailedLog"]);
  if (!detailedLogResult.ok) {
    structuralIssues.push(
      ...detailedLogResult.issues.map((i) => ({
        ...i,
        path: `/detailedLog${i.path}`,
      })),
    );
  }

  const finalRngResult = validateSeededRngState(object["finalRngState"]);
  if (!finalRngResult.ok) {
    structuralIssues.push(
      ...finalRngResult.issues.map((i) => ({
        ...i,
        path: i.path === "" ? "/finalRngState" : `/finalRngState${i.path}`,
      })),
    );
  }

  if (structuralIssues.length > 0) return failure(structuralIssues);

  let candidate: BattleResult;
  try {
    candidate = deepFreezePlainJson(cloneValidatedPlainJson(object) as BattleResult);
  } catch (error) {
    return failure([
      issue("", error instanceof Error ? error.message : "BattleResult clone/freeze failed"),
    ]);
  }

  // Guarantee terminal BattleState schema (incl. finalState.failure) before evaluate
  // dereferences nested failure fields on the failed / resolution_error path.
  const terminalState = reconstructTerminalState(candidate);
  const terminalValidated = validateBattleState(terminalState, provider);
  if (!terminalValidated.ok) {
    return failure(
      terminalValidated.issues.map((i) => {
        if (i.path === "/detailedLog" || i.path.startsWith("/detailedLog/")) {
          return i;
        }
        return {
          ...i,
          path: i.path === "" ? "/finalState" : `/finalState${i.path}`,
        };
      }),
    );
  }

  const evaluated = evaluateBattleResultValidation(candidate, runRuleSnapshot, provider);
  if (!evaluated.ok) return evaluated;

  const withValidation = deepFreezePlainJson({
    ...candidate,
    validation: evaluated.value,
  });

  // For completed: any semantic mismatch means reject (ok=false)
  if (withValidation.resultKind === "completed") {
    if (!evaluated.value.overallPassed) {
      return failure(evaluated.value.violations.map((v) => issue("/validation", v.reason)));
    }
    // Claimed validation must also be overallPassed with empty violations
    if (!candidate.validation.overallPassed || candidate.validation.violations.length !== 0) {
      return failure([
        issue(
          "/validation",
          "completed BattleResult.validation must be overallPassed=true with empty violations",
        ),
      ]);
    }
    return success(withValidation);
  }

  // failed: reject body invariant failures AND any tamper of stored validation.
  // Not a repair/normalizer API — candidate.validation must equal recomputed value.
  const invariantViolations = evaluated.value.violations.filter(
    (v) => v.code === "battle_result_validation_failed",
  );
  if (invariantViolations.length > 0) {
    return failure(invariantViolations.map((v) => issue("/validation", v.reason)));
  }
  if (candidate.validation.overallPassed) {
    return failure([
      issue(
        "/validation/overallPassed",
        "failed BattleResult.validation.overallPassed must be false",
      ),
    ]);
  }
  if (toCanonicalJson(candidate.validation) !== toCanonicalJson(evaluated.value)) {
    return failure([
      issue(
        "/validation",
        "failed BattleResult.validation must equal independently recomputed validation",
        candidate.validation,
        evaluated.value,
      ),
    ]);
  }
  return success(withValidation);
}
