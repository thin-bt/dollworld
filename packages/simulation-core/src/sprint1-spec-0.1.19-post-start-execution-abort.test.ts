/**
 * Contract tests for S1-SPEC-0.1.20 post-start execution abort clarification.
 * Locks classification / abort error shape. Production wiring through
 * runBattleToCompletion is covered in sprint1-battle-result.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  BATTLE_EXECUTION_ABORT_FAILURE_KINDS,
  BATTLE_EXECUTION_ABORT_STAGES,
  BattleExecutionAbortError,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  RUN_BATTLE_TO_COMPLETION_RESULT_KINDS,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
  classifyRunBattleToCompletionOutcome,
  createDefaultSprint1ConfigInput,
  createSeededRng,
  createSimulationIdFromIdentity,
  isBattleExecutionAbortError,
  isValidSha256HexDigest,
  toCanonicalJson,
  validateSimulationIdentity,
  validateSprint1Config,
  type SimulationIdentity,
  type ValidationResult,
} from "./index.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function identityWithSprint1(version: string): SimulationIdentity {
  const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
  const sprint1ConfigHash = sha256Provider.hashUtf8(toCanonicalJson(config));
  return {
    schemaVersion: "0.5.0",
    seed: 1,
    initialWorldConfigHash: "a".repeat(64),
    worldCalendarConfigHash: "a".repeat(64),
    yearStartProcessorManifestHash: "a".repeat(64),
    sprint1ConfigHash,
    techniqueCatalogHash: "b".repeat(64),
    initialWeeklyTrainingSidecarHash: "c".repeat(64),
    battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
    matchIdGeneratorVersion: "match-id-generator-0.1.0",
    initialMatchIdGeneratorStateHash: "c".repeat(64),
    defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
    specVersions: [
      { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint1", version },
    ],
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
  };
}

describe("S1-SPEC-0.1.20 version registry", () => {
  it("publishes S1-SPEC-0.1.21 and keeps main SPEC / Sprint1Config SHA unchanged", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.3");
    expect(SPRINT1_CONFIG_SCHEMA_VERSION).toBe("0.2.0");
    expect(SPRINT1_CONFIG_VERSION_DEFAULT).toBe("sprint1-balance-0.2.0");
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    expect(sha256Provider.hashUtf8(toCanonicalJson(config))).toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
  });

  it("accepts identity with S1-SPEC-0.1.21 and rejects 0.1.18", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.21"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.specVersions[2]?.version).toBe("S1-SPEC-0.1.21");
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.19")).ok).toBe(false);
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.18")).ok).toBe(false);
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.17")).ok).toBe(false);
  });

  it("keeps public RunBattleToCompletionResult discriminants at exactly 3 kinds", () => {
    expect([...RUN_BATTLE_TO_COMPLETION_RESULT_KINDS]).toEqual([
      "completed",
      "resolution_error",
      "pre_start_failure",
    ]);
    expect(RUN_BATTLE_TO_COMPLETION_RESULT_KINDS).not.toContain("execution_abort");
  });
});

describe("S1-SPEC-0.1.20 BattleExecutionAbortError shape", () => {
  it("exposes failureKind / stage / issues and is detectable", () => {
    const issues = Object.freeze([
      { path: "/hash", message: "provider failed", expected: "digest" },
    ]);
    const err = new BattleExecutionAbortError({
      failureKind: "dependency_failure",
      stage: "finalize_battle_result",
      issues,
    });
    expect(isBattleExecutionAbortError(err)).toBe(true);
    expect(err.name).toBe("BattleExecutionAbortError");
    expect(err.failureKind).toBe("dependency_failure");
    expect(err.stage).toBe("finalize_battle_result");
    expect(err.issues).toEqual(issues);
    expect(BATTLE_EXECUTION_ABORT_FAILURE_KINDS).toEqual([
      "dependency_failure",
      "internal_invariant_violation",
    ]);
    expect(BATTLE_EXECUTION_ABORT_STAGES).toEqual([
      "prepare_turn",
      "resolve_turn",
      "mark_failed_state",
      "finalize_battle_result",
      "build_commit_plan",
    ]);
  });
});

describe("S1-SPEC-0.1.20 outcome classification table", () => {
  it("A: provider/hash failure before start → pre_start_failure (no plan)", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: false,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "pre_start",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({ outcome: "pre_start_failure" });
  });

  it("A2: semantic/input failure before start → pre_start_failure", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: false,
      terminalKind: "none",
      failureCause: "semantic_or_input",
      stage: "pre_start",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({ outcome: "pre_start_failure" });
  });

  it("B: provider failure immediately after start → dependency_failure abort", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "prepare_turn",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({
      outcome: "execution_abort",
      failureKind: "dependency_failure",
      stage: "prepare_turn",
    });
  });

  it("C: provider failure during prepare → dependency_failure, not resolution_error", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "prepare_turn",
      canBuildCompleteFailedPlan: false,
    });
    expect(c.outcome).toBe("execution_abort");
    if (c.outcome === "execution_abort") {
      expect(c.failureKind).toBe("dependency_failure");
      expect(c.stage).toBe("prepare_turn");
    }
    expect(c.outcome).not.toBe("resolution_error");
  });

  it("D: provider failure during resolve → dependency_failure abort", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "resolve_turn",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({
      outcome: "execution_abort",
      failureKind: "dependency_failure",
      stage: "resolve_turn",
    });
  });

  it("E: domain failure then provider failure in mark/finalize → dependency abort, no resolution_error plan", () => {
    for (const stage of ["mark_failed_state", "finalize_battle_result"] as const) {
      const c = classifyRunBattleToCompletionOutcome({
        startSucceeded: true,
        terminalKind: "domain_resolution_failure",
        failureCause: "dependency_or_hash",
        stage,
        canBuildCompleteFailedPlan: false,
      });
      expect(c).toEqual({
        outcome: "execution_abort",
        failureKind: "dependency_failure",
        stage,
      });
      expect(c.outcome).not.toBe("resolution_error");
    }
  });

  it("F: commitPlanHash provider failure → dependency_failure at build_commit_plan", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "completed",
      failureCause: "dependency_or_hash",
      stage: "build_commit_plan",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({
      outcome: "execution_abort",
      failureKind: "dependency_failure",
      stage: "build_commit_plan",
    });
  });

  it("G: invalid digest (no throw) is still dependency_failure material", () => {
    expect(isValidSha256HexDigest("0".repeat(64))).toBe(true);
    expect(isValidSha256HexDigest("Z".repeat(64))).toBe(false);
    expect(isValidSha256HexDigest("abc")).toBe(false);
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "finalize_battle_result",
      canBuildCompleteFailedPlan: false,
    });
    expect(c.outcome).toBe("execution_abort");
    if (c.outcome === "execution_abort") {
      expect(c.failureKind).toBe("dependency_failure");
    }
  });

  it("H: healthy provider + domain resolution failure with complete failed plan → resolution_error", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "domain_resolution_failure",
      failureCause: "semantic_or_input",
      stage: "resolve_turn",
      canBuildCompleteFailedPlan: true,
    });
    expect(c).toEqual({ outcome: "resolution_error" });
  });

  it("I: healthy provider + normal completion → completed", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "completed",
      failureCause: "none",
      stage: "build_commit_plan",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({ outcome: "completed" });
  });

  it("internal invariant after start → internal_invariant_violation abort", () => {
    const c = classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "domain_resolution_failure",
      failureCause: "internal_invariant",
      stage: "mark_failed_state",
      canBuildCompleteFailedPlan: false,
    });
    expect(c).toEqual({
      outcome: "execution_abort",
      failureKind: "internal_invariant_violation",
      stage: "mark_failed_state",
    });
  });
});

describe("S1-SPEC-0.1.20 abort atomicity contracts", () => {
  it("J: constructing abort does not mutate caller-owned input objects", () => {
    const issues = [{ path: "/x", message: "fail" }];
    const input = {
      failureKind: "dependency_failure" as const,
      stage: "prepare_turn" as const,
      issues,
      runtimeState: { s0: 1, s1: 2, s2: 3, s3: 4 },
      participantSource: { hash: "a".repeat(64) },
    };
    const before = toCanonicalJson(input);
    const err = new BattleExecutionAbortError({
      failureKind: input.failureKind,
      stage: input.stage,
      issues: input.issues,
    });
    expect(isBattleExecutionAbortError(err)).toBe(true);
    expect(toCanonicalJson(input)).toBe(before);
    input.issues.push({ path: "/mutated", message: "should not affect error" });
    expect(err.issues).toHaveLength(1);
    expect(err.issues[0]?.path).toBe("/x");
  });

  it("K: execution abort construction does not consume additional RNG", () => {
    const rng = createSeededRng(42);
    const before = toCanonicalJson(rng.exportState());
    void new BattleExecutionAbortError({
      failureKind: "dependency_failure",
      stage: "resolve_turn",
      issues: [{ path: "/rng", message: "abort" }],
    });
    void classifyRunBattleToCompletionOutcome({
      startSucceeded: true,
      terminalKind: "none",
      failureCause: "dependency_or_hash",
      stage: "resolve_turn",
      canBuildCompleteFailedPlan: false,
    });
    expect(toCanonicalJson(rng.exportState())).toBe(before);
  });
});
