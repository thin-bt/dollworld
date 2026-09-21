/**
 * runBattleToCompletion — pure battle pipeline to uncommitted RunBattleCommitPlan
 * (12 §23.2 / 13 / S01-007). Does not implement commitRunBattlePlan (S01-008).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  BattleExecutionAbortError,
  issuesIndicateDependencyFailure,
  type BattleExecutionAbortStage,
} from "./battle-execution-abort.js";
import { validateBattleActionsSource } from "./battle-actions-source.js";
import type { BattleActionsSource } from "./battle-actions-source.js";
import { createBattleFinishedEventCandidate } from "./battle-finished-event.js";
import type { BattleFinishedEventCandidate } from "./battle-finished-event.js";
import {
  computePostProcessContextHash,
  validateBattlePostProcessContext,
} from "./battle-post-process-context.js";
import type { BattlePostProcessContext, BattleResult } from "./battle-result-types.js";
import { RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION } from "./battle-result-types.js";
import type { BattleStartedEventCandidate } from "./battle-started-event.js";
import type { BattleFailureInfo, BattleState } from "./battle-state.js";
import { preflightCreateBattleRequest } from "./create-battle-state.js";
import { finalizeBattleResult } from "./finalize-battle-result.js";
import { markBattleFailedState } from "./mark-battle-failed.js";
import {
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { prepareBattleTurn } from "./prepare-battle-turn.js";
import { resolveBattleTurn } from "./resolve-battle-turn.js";
import { validateRunRuleSnapshot } from "./run-rule-snapshot.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import type { StartBattleRuntimeTransition } from "./start-battle-runtime-transition.js";
import { startBattleTransaction } from "./start-battle-transaction.js";
import { readOptionalGeneratedTechniqueCatalogOverlayFromCreateBattleRequest } from "../sprint3/generated-technique-battle-catalog.js";
import type { GeneratedTechniqueCatalogOverlay } from "../sprint3/generated-technique-catalog-overlay.js";

export const RUN_BATTLE_TO_COMPLETION_INPUT_KEYS = [
  "expectedWorldStateHash",
  "startBattleInput",
  "participantAActionsSource",
  "participantBActionsSource",
  "postProcessContext",
] as const;

export type RunBattleToCompletionInput = {
  expectedWorldStateHash: string;
  startBattleInput: {
    createBattleRequest: unknown;
    worldRngState: unknown;
    matchIdGeneratorState: unknown;
  };
  participantAActionsSource: BattleActionsSource;
  participantBActionsSource: BattleActionsSource;
  postProcessContext: BattlePostProcessContext;
};

export type RunBattleCommitPlanStructuralValidation = {
  overallPassed: boolean;
  violations: readonly {
    code: string;
    severity: "error" | "warning";
    targetIds: readonly string[];
    reason: string;
    canContinue: boolean;
  }[];
};

export type RunBattleCommitPlan = {
  schemaVersion: typeof RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION;
  simulationId: BattleResult["simulationId"];
  runRuleSnapshotHash: string;
  expectedWorldStateHash: string;
  expectedParticipantASourceSnapshotHash: string;
  expectedParticipantBSourceSnapshotHash: string;
  startRuntimeTransition: StartBattleRuntimeTransition;
  battleResult: BattleResult;
  eventCandidates: readonly [BattleStartedEventCandidate, BattleFinishedEventCandidate];
  structuralValidation: RunBattleCommitPlanStructuralValidation;
  commitPlanHash: string;
};

export type RunBattleToCompletionResult =
  | { kind: "completed"; commitPlan: RunBattleCommitPlan }
  | { kind: "resolution_error"; commitPlan: RunBattleCommitPlan }
  | {
      kind: "pre_start_failure";
      commitPlan: null;
      validation: { ok: false; issues: readonly ValidationIssue[] };
    };

function preStartFailure(issues: readonly ValidationIssue[]): RunBattleToCompletionResult {
  return {
    kind: "pre_start_failure",
    commitPlan: null,
    validation: { ok: false, issues },
  };
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

function validateExpectedWorldStateHash(value: unknown): ValidationResult<string> {
  if (typeof value !== "string" || !SHA256_HEX.test(value)) {
    return failure([
      {
        path: "/expectedWorldStateHash",
        message: "expectedWorldStateHash must be 64 lowercase hex chars",
        actual: value,
      },
    ]);
  }
  return success(value);
}

function pushViolation(
  violations: RunBattleCommitPlanStructuralValidation["violations"][number][],
  code: string,
  reason: string,
): void {
  violations.push({
    code,
    severity: "error",
    targetIds: [],
    reason,
    canContinue: false,
  });
}

export const RUN_BATTLE_COMMIT_PLAN_STRUCTURE_INPUT_KEYS = [
  "schemaVersion",
  "simulationId",
  "runRuleSnapshotHash",
  "expectedWorldStateHash",
  "expectedParticipantASourceSnapshotHash",
  "expectedParticipantBSourceSnapshotHash",
  "startRuntimeTransition",
  "battleResult",
  "eventCandidates",
] as const;

type RunBattleCommitPlanStructureInput = {
  schemaVersion: string;
  simulationId: BattleResult["simulationId"];
  runRuleSnapshotHash: string;
  expectedWorldStateHash: string;
  expectedParticipantASourceSnapshotHash: string;
  expectedParticipantBSourceSnapshotHash: string;
  startRuntimeTransition: StartBattleRuntimeTransition;
  battleResult: BattleResult;
  eventCandidates: readonly [BattleStartedEventCandidate, BattleFinishedEventCandidate];
};

function isPlainObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requirePlainObjectField(
  parent: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  const path = childPath(parentPath, key);
  if (!hasOwn(parent, key)) {
    issues.push({ path, message: "required key is missing", expected: "plain object" });
    return undefined;
  }
  const value = parent[key];
  if (!isPlainObjectRecord(value)) {
    issues.push({
      path,
      message: "value must be a plain object",
      actual: value === null ? null : Array.isArray(value) ? "array" : typeof value,
      expected: "plain object",
    });
    return undefined;
  }
  return value;
}

/**
 * Descriptor-based deep snapshot of plain JSON (objects/arrays/primitives).
 * Never invokes getters; nested accessors / cycles / non-finite numbers become issues.
 */
function deepSnapshotPlainJson(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  visiting: WeakSet<object> = new WeakSet<object>(),
): unknown | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      issues.push({
        path,
        message: "number must be finite (NaN/Infinity are not plain JSON)",
        actual: value,
        expected: "finite number",
      });
      return undefined;
    }
    // Preserve -0; do not normalize.
    return value;
  }
  if (typeof value !== "object") {
    issues.push({
      path,
      message: "value must be plain JSON (object, array, or primitive)",
      actual: typeof value,
      expected: "plain JSON",
    });
    return undefined;
  }

  if (visiting.has(value)) {
    issues.push({
      path,
      message: "circular reference is not allowed",
      expected: "acyclic plain JSON",
    });
    return undefined;
  }
  visiting.add(value);
  try {
    let isArray: boolean;
    try {
      isArray = Array.isArray(value);
    } catch {
      issues.push({
        path,
        message: "array reflection failed",
        expected: "plain JSON array or object",
      });
      return undefined;
    }

    if (isArray) {
      const arr = snapshotDenseArrayOrFail(value, path, issues);
      if (arr === undefined) return undefined;
      const out: unknown[] = [];
      for (let index = 0; index < arr.length; index += 1) {
        const child = deepSnapshotPlainJson(arr[index], childPath(path, index), issues, visiting);
        if (child === undefined) return undefined;
        out.push(child);
      }
      return out;
    }

    const object = snapshotPlainObjectOrFail(value, path, issues);
    if (object === undefined) return undefined;
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const key of Object.keys(object)) {
      const child = deepSnapshotPlainJson(object[key], childPath(path, key), issues, visiting);
      if (child === undefined) return undefined;
      out[key] = child;
    }
    return out;
  } finally {
    visiting.delete(value);
  }
}

function snapshotCommitPlanStructureInput(
  input: unknown,
): ValidationResult<RunBattleCommitPlanStructureInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [{ path: "", message: "RunBattleCommitPlan structure input required" }],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, RUN_BATTLE_COMMIT_PLAN_STRUCTURE_INPUT_KEYS, "", issues);
  for (const key of RUN_BATTLE_COMMIT_PLAN_STRUCTURE_INPUT_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({ path: `/${key}`, message: "required key is missing" });
    }
  }
  if (issues.length > 0) return failure(issues);

  // Top-level scalars: runtime string checks (casts are not validation).
  const schemaVersion = requireString(object, "schemaVersion", "", issues);
  const simulationId = requireString(object, "simulationId", "", issues);
  const runRuleSnapshotHash = requireString(object, "runRuleSnapshotHash", "", issues);
  const expectedWorldStateHash = requireString(object, "expectedWorldStateHash", "", issues);
  const expectedParticipantASourceSnapshotHash = requireString(
    object,
    "expectedParticipantASourceSnapshotHash",
    "",
    issues,
  );
  const expectedParticipantBSourceSnapshotHash = requireString(
    object,
    "expectedParticipantBSourceSnapshotHash",
    "",
    issues,
  );
  if (issues.length > 0) return failure(issues);

  // Nested materials: deep descriptor snapshot before any business dereference.
  const battleResultSnap = deepSnapshotPlainJson(object["battleResult"], "/battleResult", issues);
  const eventCandidatesSnap = deepSnapshotPlainJson(
    object["eventCandidates"],
    "/eventCandidates",
    issues,
  );
  const transitionSnap = deepSnapshotPlainJson(
    object["startRuntimeTransition"],
    "/startRuntimeTransition",
    issues,
  );
  if (
    battleResultSnap === undefined ||
    eventCandidatesSnap === undefined ||
    transitionSnap === undefined
  ) {
    return failure(issues);
  }
  if (!Array.isArray(eventCandidatesSnap) || eventCandidatesSnap.length !== 2) {
    return failure([
      {
        path: "/eventCandidates",
        message: "eventCandidates must be a 2-tuple [battle.started, battle.finished]",
      },
    ]);
  }
  if (!isPlainObjectRecord(battleResultSnap)) {
    return failure([
      {
        path: "/battleResult",
        message: "battleResult must be a plain object",
      },
    ]);
  }
  if (!isPlainObjectRecord(transitionSnap)) {
    return failure([
      {
        path: "/startRuntimeTransition",
        message: "startRuntimeTransition must be a plain object",
      },
    ]);
  }

  // Transition hash fields must be strings before any RegExp.test in structural body.
  requireString(transitionSnap, "schemaVersion", "/startRuntimeTransition", issues);
  requireString(transitionSnap, "expectedWorldRngStateHash", "/startRuntimeTransition", issues);
  requireString(
    transitionSnap,
    "expectedMatchIdGeneratorStateHash",
    "/startRuntimeTransition",
    issues,
  );
  requireString(transitionSnap, "transitionHash", "/startRuntimeTransition", issues);

  const finalState = requirePlainObjectField(
    battleResultSnap,
    "finalState",
    "/battleResult",
    issues,
  );
  if (finalState !== undefined) {
    requirePlainObjectField(finalState, "participantA", "/battleResult/finalState", issues);
    requirePlainObjectField(finalState, "participantB", "/battleResult/finalState", issues);
    if (hasOwn(finalState, "failure") && finalState["failure"] !== null) {
      if (!isPlainObjectRecord(finalState["failure"])) {
        issues.push({
          path: "/battleResult/finalState/failure",
          message: "failure must be null or a plain object",
          actual: Array.isArray(finalState["failure"]) ? "array" : typeof finalState["failure"],
          expected: "null | plain object",
        });
      }
    }
  }

  const validation = requirePlainObjectField(
    battleResultSnap,
    "validation",
    "/battleResult",
    issues,
  );
  if (validation !== undefined) {
    if (!hasOwn(validation, "violations") || !Array.isArray(validation["violations"])) {
      issues.push({
        path: "/battleResult/validation/violations",
        message: "violations must be an array",
      });
    } else {
      const violationsArr = validation["violations"] as unknown[];
      for (let i = 0; i < violationsArr.length; i += 1) {
        if (!isPlainObjectRecord(violationsArr[i])) {
          issues.push({
            path: `/battleResult/validation/violations/${String(i)}`,
            message: "violation entry must be a plain object",
            actual:
              violationsArr[i] === null
                ? null
                : Array.isArray(violationsArr[i])
                  ? "array"
                  : typeof violationsArr[i],
            expected: "plain object",
          });
        }
      }
    }
  }

  for (let i = 0; i < eventCandidatesSnap.length; i += 1) {
    const eventPath = `/eventCandidates/${String(i)}`;
    const event = eventCandidatesSnap[i];
    if (!isPlainObjectRecord(event)) {
      issues.push({
        path: eventPath,
        message: "event candidate must be a plain object",
      });
      continue;
    }
    requirePlainObjectField(event, "entities", eventPath, issues);
    const payload = requirePlainObjectField(event, "payload", eventPath, issues);
    if (payload === undefined) continue;
    const eventType = event["eventType"];
    // Containers dereferenced only on matching eventType in structural body.
    if (eventType === "battle.started") {
      if (
        !hasOwn(payload, "participantSnapshotHashes") ||
        !isPlainObjectRecord(payload["participantSnapshotHashes"])
      ) {
        issues.push({
          path: `${eventPath}/payload/participantSnapshotHashes`,
          message: "battle.started payload.participantSnapshotHashes must be a plain object",
          actual: !hasOwn(payload, "participantSnapshotHashes")
            ? "missing"
            : payload["participantSnapshotHashes"] === null
              ? null
              : Array.isArray(payload["participantSnapshotHashes"])
                ? "array"
                : typeof payload["participantSnapshotHashes"],
          expected: "plain object",
        });
      }
    }
    if (eventType === "battle.finished") {
      if (!hasOwn(payload, "summary") || !isPlainObjectRecord(payload["summary"])) {
        issues.push({
          path: `${eventPath}/payload/summary`,
          message: "battle.finished payload.summary must be a plain object",
          actual: !hasOwn(payload, "summary")
            ? "missing"
            : payload["summary"] === null
              ? null
              : Array.isArray(payload["summary"])
                ? "array"
                : typeof payload["summary"],
          expected: "plain object",
        });
      }
    }
  }

  if (
    schemaVersion === undefined ||
    simulationId === undefined ||
    runRuleSnapshotHash === undefined ||
    expectedWorldStateHash === undefined ||
    expectedParticipantASourceSnapshotHash === undefined ||
    expectedParticipantBSourceSnapshotHash === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success({
    schemaVersion,
    simulationId: simulationId as BattleResult["simulationId"],
    runRuleSnapshotHash,
    expectedWorldStateHash,
    expectedParticipantASourceSnapshotHash,
    expectedParticipantBSourceSnapshotHash,
    startRuntimeTransition: transitionSnap as StartBattleRuntimeTransition,
    battleResult: battleResultSnap as BattleResult,
    eventCandidates:
      eventCandidatesSnap as unknown as RunBattleCommitPlanStructureInput["eventCandidates"],
  });
}

/**
 * Business/structural validation for RunBattleCommitPlan materials.
 * Must not inspect or verify commitPlanHash (hash cycle prevention).
 * Public boundary: unknown → snapshot / accessor / unknown-key reject.
 */
export function validateRunBattleCommitPlanStructure(
  input: unknown,
): RunBattleCommitPlanStructuralValidation {
  const snapped = snapshotCommitPlanStructureInput(input);
  if (!snapped.ok) {
    return deepFreezePlainJson({
      overallPassed: false,
      violations: snapped.issues.map((issue) => ({
        code: "structure_input_invalid",
        severity: "error" as const,
        targetIds: [],
        reason: `${issue.path}: ${issue.message}`,
        canContinue: false,
      })),
    });
  }
  const {
    battleResult,
    eventCandidates,
    schemaVersion,
    simulationId,
    runRuleSnapshotHash,
    expectedWorldStateHash,
    expectedParticipantASourceSnapshotHash,
    expectedParticipantBSourceSnapshotHash,
    startRuntimeTransition,
  } = snapped.value;
  const violations: RunBattleCommitPlanStructuralValidation["violations"][number][] = [];
  const [started, finished] = eventCandidates;
  const structureInput = {
    schemaVersion,
    simulationId,
    runRuleSnapshotHash,
    expectedWorldStateHash,
    expectedParticipantASourceSnapshotHash,
    expectedParticipantBSourceSnapshotHash,
    startRuntimeTransition,
  };

  if (structureInput.schemaVersion !== RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION) {
    pushViolation(
      violations,
      "schema_version_mismatch",
      "RunBattleCommitPlan.schemaVersion mismatch",
    );
  }
  if (structureInput.simulationId !== battleResult.simulationId) {
    pushViolation(
      violations,
      "simulation_id_mismatch",
      "plan.simulationId must match BattleResult",
    );
  }
  if (structureInput.runRuleSnapshotHash !== battleResult.runRuleSnapshotHash) {
    pushViolation(
      violations,
      "run_rule_snapshot_hash_mismatch",
      "plan.runRuleSnapshotHash must match BattleResult",
    );
  }
  if (!SHA256_HEX.test(structureInput.expectedWorldStateHash)) {
    pushViolation(
      violations,
      "expected_world_hash_invalid",
      "expectedWorldStateHash format invalid",
    );
  }

  const startedOk = started.eventType === "battle.started";
  const finishedOk = finished.eventType === "battle.finished";
  if (!startedOk || !finishedOk) {
    pushViolation(
      violations,
      "event_candidate_type_mismatch",
      "eventCandidates must be [battle.started, battle.finished]",
    );
  }
  if (
    started.sourceProcessor !== "battle-simulation" ||
    finished.sourceProcessor !== "battle-simulation"
  ) {
    pushViolation(
      violations,
      "event_source_processor_mismatch",
      "sourceProcessor must be battle-simulation",
    );
  }

  const expectedEntities = {
    personIds: [battleResult.participantAId, battleResult.participantBId],
    matchIds: [battleResult.matchId],
  };

  // Field-level cross-checks only when event types are in the expected slots.
  if (startedOk && finishedOk) {
    if (
      toCanonicalJson(started.entities) !== toCanonicalJson(expectedEntities) ||
      toCanonicalJson(finished.entities) !== toCanonicalJson(expectedEntities)
    ) {
      pushViolation(
        violations,
        "event_entities_mismatch",
        "eventCandidates.entities must match BattleResult participants and matchId",
      );
    }
    if (
      toCanonicalJson(started.worldDate) !== toCanonicalJson(battleResult.worldDate) ||
      toCanonicalJson(finished.worldDate) !== toCanonicalJson(battleResult.worldDate) ||
      toCanonicalJson(started.payload.worldDate) !== toCanonicalJson(battleResult.worldDate)
    ) {
      pushViolation(
        violations,
        "event_world_date_mismatch",
        "eventCandidates worldDate must match BattleResult.worldDate",
      );
    }
    if (
      started.payload.battleKind !== battleResult.battleKind ||
      finished.payload.battleKind !== battleResult.battleKind
    ) {
      pushViolation(
        violations,
        "event_battle_kind_mismatch",
        "eventCandidates battleKind must match BattleResult.battleKind",
      );
    }
    if (
      started.payload.matchId !== battleResult.matchId ||
      finished.payload.matchId !== battleResult.matchId
    ) {
      pushViolation(
        violations,
        "event_match_id_mismatch",
        "eventCandidates matchId must equal BattleResult.matchId",
      );
    }
    if (
      started.payload.participantAId !== battleResult.participantAId ||
      started.payload.participantBId !== battleResult.participantBId ||
      finished.payload.participantAId !== battleResult.participantAId ||
      finished.payload.participantBId !== battleResult.participantBId
    ) {
      pushViolation(
        violations,
        "event_participant_mismatch",
        "event participant IDs must match BattleResult",
      );
    }
    if (
      toCanonicalJson(started.payload.participantAActionSourceIdentity) !==
        toCanonicalJson(battleResult.participantAActionSourceIdentity) ||
      toCanonicalJson(started.payload.participantBActionSourceIdentity) !==
        toCanonicalJson(battleResult.participantBActionSourceIdentity) ||
      toCanonicalJson(finished.payload.participantAActionSourceIdentity) !==
        toCanonicalJson(battleResult.participantAActionSourceIdentity) ||
      toCanonicalJson(finished.payload.participantBActionSourceIdentity) !==
        toCanonicalJson(battleResult.participantBActionSourceIdentity)
    ) {
      pushViolation(
        violations,
        "event_action_source_identity_mismatch",
        "event ActionSourceIdentity must match BattleResult",
      );
    }
    if (
      started.payload.runRuleSnapshotHash !== battleResult.runRuleSnapshotHash ||
      finished.payload.runRuleSnapshotHash !== battleResult.runRuleSnapshotHash ||
      started.payload.battleInputHash !== battleResult.battleInputHash ||
      finished.payload.battleInputHash !== battleResult.battleInputHash ||
      started.payload.battleRulesRefHash !== battleResult.battleRulesRefHash ||
      finished.payload.battleRulesRefHash !== battleResult.battleRulesRefHash ||
      started.payload.sprint1ConfigHash !== battleResult.sprint1ConfigHash ||
      finished.payload.sprint1ConfigHash !== battleResult.sprint1ConfigHash ||
      started.payload.techniqueCatalogHash !== battleResult.techniqueCatalogHash ||
      finished.payload.techniqueCatalogHash !== battleResult.techniqueCatalogHash ||
      started.payload.sprint1ConfigVersion !== battleResult.sprint1ConfigVersion ||
      finished.payload.sprint1ConfigVersion !== battleResult.sprint1ConfigVersion ||
      started.payload.techniqueCatalogDataVersion !== battleResult.techniqueCatalogDataVersion ||
      finished.payload.techniqueCatalogDataVersion !== battleResult.techniqueCatalogDataVersion
    ) {
      pushViolation(
        violations,
        "event_identity_hash_mismatch",
        "event identity hashes/versions must match BattleResult",
      );
    }
    if (
      toCanonicalJson(started.payload.initialRange) !==
        toCanonicalJson(battleResult.finalState.initialRange) ||
      started.payload.maxTurns !== battleResult.finalState.maxTurns
    ) {
      pushViolation(
        violations,
        "started_battle_geometry_mismatch",
        "battle.started initialRange/maxTurns must match finalState",
      );
    }
    if (
      started.payload.battleSeed !== battleResult.finalState.battleSeed ||
      finished.payload.battleSeed !== battleResult.finalState.battleSeed
    ) {
      pushViolation(
        violations,
        "battle_seed_mismatch",
        "eventCandidates battleSeed must match finalState.battleSeed",
      );
    }
    if (
      started.payload.participantSnapshotHashes.sideA !==
        battleResult.finalState.participantA.sourceSnapshotHash ||
      started.payload.participantSnapshotHashes.sideB !==
        battleResult.finalState.participantB.sourceSnapshotHash
    ) {
      pushViolation(
        violations,
        "started_source_snapshot_hash_mismatch",
        "battle.started participantSnapshotHashes must match finalState sourceSnapshotHash",
      );
    }

    // finished payload ↔ BattleResult outcome fields
    if (
      finished.payload.winnerPersonId !== battleResult.winnerPersonId ||
      finished.payload.loserPersonId !== battleResult.loserPersonId ||
      finished.payload.resultKind !== battleResult.resultKind ||
      finished.payload.endReason !== battleResult.endReason ||
      finished.payload.turnsExecuted !== battleResult.turnsExecuted ||
      finished.payload.postProcessContextHash !== battleResult.postProcessContextHash ||
      finished.payload.finalStateHash !== battleResult.finalStateHash
    ) {
      pushViolation(
        violations,
        "finished_payload_mismatch",
        "battle.finished payload must match BattleResult outcome fields",
      );
    }
  }

  if (
    structureInput.expectedParticipantASourceSnapshotHash !==
      battleResult.finalState.participantA.sourceSnapshotHash ||
    structureInput.expectedParticipantBSourceSnapshotHash !==
      battleResult.finalState.participantB.sourceSnapshotHash
  ) {
    pushViolation(
      violations,
      "expected_source_snapshot_hash_mismatch",
      "expected participant sourceSnapshotHash must match BattleResult finalState",
    );
  }

  const transition = structureInput.startRuntimeTransition;
  if (transition.schemaVersion !== "0.1.0") {
    pushViolation(
      violations,
      "runtime_transition_schema_mismatch",
      "StartBattleRuntimeTransition.schemaVersion mismatch",
    );
  }
  if (
    !SHA256_HEX.test(transition.expectedWorldRngStateHash) ||
    !SHA256_HEX.test(transition.expectedMatchIdGeneratorStateHash) ||
    !SHA256_HEX.test(transition.transitionHash)
  ) {
    pushViolation(
      violations,
      "runtime_transition_hash_format_invalid",
      "StartBattleRuntimeTransition hash fields must be 64 lowercase hex",
    );
  }

  if (battleResult.resultKind === "completed") {
    if (!battleResult.validation.overallPassed) {
      pushViolation(
        violations,
        "completed_validation_not_passed",
        "completed BattleResult.validation.overallPassed must be true",
      );
    }
    if (finishedOk && finished.payload.summary.kind !== "completed") {
      pushViolation(
        violations,
        "finished_summary_kind_mismatch",
        "completed finished summary.kind must be completed",
      );
    }
  }

  if (battleResult.resultKind === "failed") {
    if (battleResult.validation.overallPassed) {
      pushViolation(
        violations,
        "failed_validation_passed",
        "resolution_error BattleResult.validation.overallPassed must be false",
      );
    }
    if (battleResult.finalState.status !== "failed" || battleResult.finalState.failure === null) {
      pushViolation(
        violations,
        "failed_state_invalid",
        "resolution_error requires finalState.status=failed and failure",
      );
    }
    if (battleResult.winnerPersonId !== null || battleResult.loserPersonId !== null) {
      pushViolation(
        violations,
        "failed_winner_loser_not_null",
        "resolution_error winner/loser must be null",
      );
    }
    if (
      !Array.isArray(battleResult.developmentEffects) ||
      battleResult.developmentEffects.length !== 0
    ) {
      pushViolation(
        violations,
        "failed_development_effects_not_empty",
        "resolution_error developmentEffects must be empty array",
      );
    }
    if (battleResult.finalState.failure !== null) {
      const f = battleResult.finalState.failure;
      const expectedSeverity = f.severity === "warning" ? "warning" : "error";
      // Canonical failure violation is always slot 0 (evaluateBattleResultValidation).
      const head = battleResult.validation.violations[0];
      if (
        head === undefined ||
        head.code !== f.code ||
        head.severity !== expectedSeverity ||
        toCanonicalJson(head.targetIds) !== toCanonicalJson(f.targetIds) ||
        head.reason !== f.reason ||
        head.canContinue !== f.canContinue
      ) {
        pushViolation(
          violations,
          "failed_validation_failure_mismatch",
          "battleResult.validation.violations[0] must equal canonical failure from finalState.failure",
        );
      }
    }
    if (finishedOk) {
      if (finished.payload.summary.kind !== "failed") {
        pushViolation(
          violations,
          "finished_summary_kind_mismatch",
          "failed finished summary.kind must be failed",
        );
      } else if (battleResult.finalState.failure !== null) {
        const summary = finished.payload.summary;
        const f = battleResult.finalState.failure;
        if (
          summary.errorCode !== f.code ||
          toCanonicalJson(summary.targetIds) !== toCanonicalJson(f.targetIds) ||
          summary.reason !== f.reason ||
          summary.severity !== f.severity ||
          summary.canContinue !== f.canContinue
        ) {
          pushViolation(
            violations,
            "finished_failure_summary_mismatch",
            "battle.finished failed summary must equal finalState.failure",
          );
        }
      }
    }
  }

  return deepFreezePlainJson({
    overallPassed: violations.length === 0,
    violations,
  });
}

/** Production commitPlanHash materialization (excludes verifying structuralValidation via hash). */
export function computeRunBattleCommitPlanHash(
  planWithoutHash: Omit<RunBattleCommitPlan, "commitPlanHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  const hashInput = {
    schemaVersion: planWithoutHash.schemaVersion,
    simulationId: planWithoutHash.simulationId,
    runRuleSnapshotHash: planWithoutHash.runRuleSnapshotHash,
    expectedWorldStateHash: planWithoutHash.expectedWorldStateHash,
    expectedParticipantASourceSnapshotHash: planWithoutHash.expectedParticipantASourceSnapshotHash,
    expectedParticipantBSourceSnapshotHash: planWithoutHash.expectedParticipantBSourceSnapshotHash,
    startRuntimeTransition: planWithoutHash.startRuntimeTransition,
    battleResult: planWithoutHash.battleResult,
    eventCandidates: planWithoutHash.eventCandidates,
    structuralValidation: planWithoutHash.structuralValidation,
  };
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/commitPlanHash");
}

function buildCommitPlan(input: {
  battleResult: BattleResult;
  startRuntimeTransition: StartBattleRuntimeTransition;
  started: BattleStartedEventCandidate;
  expectedWorldStateHash: string;
  provider: Sha256Provider;
}): ValidationResult<RunBattleCommitPlan> {
  const finishedResult = createBattleFinishedEventCandidate(input.battleResult);
  if (!finishedResult.ok) return finishedResult;
  const finished = finishedResult.value;

  const withoutHashBase = {
    schemaVersion: RUN_BATTLE_COMMIT_PLAN_SCHEMA_VERSION,
    simulationId: input.battleResult.simulationId,
    runRuleSnapshotHash: input.battleResult.runRuleSnapshotHash,
    expectedWorldStateHash: input.expectedWorldStateHash,
    expectedParticipantASourceSnapshotHash:
      input.battleResult.finalState.participantA.sourceSnapshotHash,
    expectedParticipantBSourceSnapshotHash:
      input.battleResult.finalState.participantB.sourceSnapshotHash,
    startRuntimeTransition: input.startRuntimeTransition,
    battleResult: input.battleResult,
    eventCandidates: [input.started, finished] as const,
  };

  const structuralValidation = validateRunBattleCommitPlanStructure(withoutHashBase);
  if (!structuralValidation.overallPassed) {
    return failure(
      structuralValidation.violations.map((v) => ({
        path: "/structuralValidation",
        message: v.reason,
      })),
    );
  }

  const withoutHash = {
    ...withoutHashBase,
    structuralValidation,
  };
  const hash = computeRunBattleCommitPlanHash(withoutHash, input.provider);
  if (!hash.ok) return hash;
  return success(
    deepFreezePlainJson({
      ...withoutHash,
      commitPlanHash: hash.value,
    }),
  );
}

function abortPostStart(
  stage: BattleExecutionAbortStage,
  issues: readonly ValidationIssue[],
): never {
  throw new BattleExecutionAbortError({
    failureKind: issuesIndicateDependencyFailure(issues)
      ? "dependency_failure"
      : "internal_invariant_violation",
    stage,
    issues,
  });
}

export function runBattleToCompletion(
  input: unknown,
  provider: Sha256Provider,
): RunBattleToCompletionResult {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return preStartFailure(
      issues.length > 0 ? issues : [{ path: "", message: "RunBattleToCompletionInput required" }],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, RUN_BATTLE_TO_COMPLETION_INPUT_KEYS, "", issues);
  if (issues.length > 0) return preStartFailure(issues);

  const worldHash = validateExpectedWorldStateHash(object["expectedWorldStateHash"]);
  if (!worldHash.ok) return preStartFailure(worldHash.issues);

  const startInputObject = snapshotPlainObjectOrFail(
    object["startBattleInput"],
    "/startBattleInput",
    issues,
  );
  if (startInputObject === undefined || issues.length > 0) {
    return preStartFailure(issues);
  }

  const sourceA = validateBattleActionsSource(object["participantAActionsSource"]);
  if (!sourceA.ok) {
    return preStartFailure(
      sourceA.issues.map((i) => ({ ...i, path: `/participantAActionsSource${i.path}` })),
    );
  }
  const sourceB = validateBattleActionsSource(object["participantBActionsSource"]);
  if (!sourceB.ok) {
    return preStartFailure(
      sourceB.issues.map((i) => ({ ...i, path: `/participantBActionsSource${i.path}` })),
    );
  }

  if (!hasOwn(startInputObject, "createBattleRequest")) {
    return preStartFailure([
      { path: "/startBattleInput/createBattleRequest", message: "required key is missing" },
    ]);
  }
  const preflight = preflightCreateBattleRequest(startInputObject["createBattleRequest"]);
  if (!preflight.ok) {
    return preStartFailure(
      preflight.issues.map((i) => ({
        ...i,
        path: `/startBattleInput/createBattleRequest${i.path}`,
      })),
    );
  }

  const overlayRead = readOptionalGeneratedTechniqueCatalogOverlayFromCreateBattleRequest(
    startInputObject["createBattleRequest"],
  );
  if (!overlayRead.ok) {
    return preStartFailure(
      overlayRead.issues.map((i) => ({
        ...i,
        path: `/startBattleInput/createBattleRequest${i.path}`,
      })),
    );
  }
  const generatedTechniqueCatalogOverlay: GeneratedTechniqueCatalogOverlay | undefined =
    overlayRead.value;

  const context = validateBattlePostProcessContext(object["postProcessContext"], {
    participantAId: preflight.value.participantA.personId,
    participantBId: preflight.value.participantB.personId,
    ageAtBattleA: preflight.value.participantA.ageAtBattle,
    ageAtBattleB: preflight.value.participantB.ageAtBattle,
    worldDate: preflight.value.worldDate,
    birthYearA: preflight.value.participantA.birthYear,
    birthYearB: preflight.value.participantB.birthYear,
  });
  if (!context.ok) {
    return preStartFailure(
      context.issues.map((i) => ({
        ...i,
        path: `/postProcessContext${i.path === "" ? "" : i.path}`,
      })),
    );
  }
  const earlyHash = computePostProcessContextHash(context.value, provider);
  if (!earlyHash.ok) return preStartFailure(earlyHash.issues);

  const runRule = validateRunRuleSnapshot(preflight.value.runRuleSnapshot, provider);
  if (!runRule.ok) {
    return preStartFailure(
      runRule.issues.map((i) => ({
        ...i,
        path: `/startBattleInput/createBattleRequest/runRuleSnapshot${i.path}`,
      })),
    );
  }

  if (
    toCanonicalJson(sourceA.value.identity) !==
    toCanonicalJson(preflight.value.participantAActionSourceIdentity)
  ) {
    return preStartFailure([
      {
        path: "/participantAActionsSource/identity",
        message: "ActionsSource identity must match createBattleRequest identity",
      },
    ]);
  }
  if (
    toCanonicalJson(sourceB.value.identity) !==
    toCanonicalJson(preflight.value.participantBActionSourceIdentity)
  ) {
    return preStartFailure([
      {
        path: "/participantBActionsSource/identity",
        message: "ActionsSource identity must match createBattleRequest identity",
      },
    ]);
  }

  const started = startBattleTransaction(
    {
      createBattleRequest: startInputObject["createBattleRequest"],
      worldRngState: startInputObject["worldRngState"],
      matchIdGeneratorState: startInputObject["matchIdGeneratorState"],
    },
    provider,
  );
  if (started.kind === "failure") {
    return preStartFailure(
      started.validation.issues.map((i) => ({ ...i, path: `/startBattleInput${i.path}` })),
    );
  }

  // ---- post-start: never return pre_start_failure below this line ----
  // Plan-impossible failures throw BattleExecutionAbortError (S1-SPEC-0.1.19).
  let battleState: BattleState = started.battleState;
  let terminalFailure: BattleFailureInfo | null = null;

  for (let resolveCount = 0; resolveCount < battleState.maxTurns; resolveCount += 1) {
    if (battleState.status !== "in_progress") break;

    const prepared = prepareBattleTurn({ battleState }, provider);
    if (prepared.kind === "failure") {
      if (issuesIndicateDependencyFailure(prepared.validation.issues)) {
        abortPostStart("prepare_turn", prepared.validation.issues);
      }
      terminalFailure = prepared.failure;
      break;
    }

    const resolved = resolveBattleTurn(
      {
        battleState,
        preparedTurn: prepared.preparedTurn,
        runRuleSnapshot: runRule.value,
        participantAActionsSource: sourceA.value,
        participantBActionsSource: sourceB.value,
        ...(generatedTechniqueCatalogOverlay === undefined
          ? {}
          : { generatedTechniqueCatalogOverlay }),
      },
      provider,
    );
    if (resolved.kind === "failure") {
      if (issuesIndicateDependencyFailure(resolved.validation.issues)) {
        abortPostStart("resolve_turn", resolved.validation.issues);
      }
      terminalFailure = resolved.failure;
      break;
    }
    battleState = resolved.battleState;
  }

  let terminalState = battleState;
  if (terminalFailure !== null) {
    const failed = markBattleFailedState(battleState, terminalFailure, provider);
    if (!failed.ok) {
      abortPostStart("mark_failed_state", failed.issues);
    }
    terminalState = failed.value;
  } else if (battleState.status === "in_progress") {
    const failed = markBattleFailedState(
      battleState,
      deepFreezePlainJson({
        code: "battle_did_not_complete",
        severity: "error",
        targetIds: [],
        reason: "battle remained in_progress after maxTurns resolve attempts",
        canContinue: false,
      }),
      provider,
    );
    if (!failed.ok) {
      abortPostStart("mark_failed_state", failed.issues);
    }
    terminalState = failed.value;
  }

  const result = finalizeBattleResult(
    {
      terminalBattleState: terminalState,
      runRuleSnapshot: runRule.value,
      postProcessContext: context.value,
      ...(generatedTechniqueCatalogOverlay === undefined
        ? {}
        : { generatedTechniqueCatalogOverlay }),
    },
    provider,
  );
  if (!result.ok) {
    abortPostStart("finalize_battle_result", result.issues);
  }

  const plan = buildCommitPlan({
    battleResult: result.value,
    startRuntimeTransition: started.runtimeTransition,
    started: started.battleStartedEventCandidate,
    expectedWorldStateHash: worldHash.value,
    provider,
  });
  if (!plan.ok) {
    abortPostStart("build_commit_plan", plan.issues);
  }

  if (result.value.resultKind === "failed") {
    return { kind: "resolution_error", commitPlan: plan.value };
  }
  return { kind: "completed", commitPlan: plan.value };
}
