/**
 * Pure contracts for S1-SPEC-0.1.19 post-start execution abort clarification.
 * Does not implement runBattleToCompletion / finalizeBattleResult / WorldEngine.
 */
import type { ValidationIssue } from "../validation.js";

export const BATTLE_EXECUTION_ABORT_FAILURE_KINDS = [
  "dependency_failure",
  "internal_invariant_violation",
] as const;

export type BattleExecutionAbortFailureKind = (typeof BATTLE_EXECUTION_ABORT_FAILURE_KINDS)[number];

export const BATTLE_EXECUTION_ABORT_STAGES = [
  "prepare_turn",
  "resolve_turn",
  "mark_failed_state",
  "finalize_battle_result",
  "build_commit_plan",
] as const;

export type BattleExecutionAbortStage = (typeof BATTLE_EXECUTION_ABORT_STAGES)[number];

export type BattleExecutionAbortErrorInput = {
  failureKind: BattleExecutionAbortFailureKind;
  stage: BattleExecutionAbortStage;
  issues: readonly ValidationIssue[];
  message?: string;
};

/**
 * Execution abort outside RunBattleToCompletionResult.
 * Not a BattleResult. Not a 4th result kind. Not stored in simulation canonical data.
 */
export class BattleExecutionAbortError extends Error {
  override readonly name = "BattleExecutionAbortError";
  readonly failureKind: BattleExecutionAbortFailureKind;
  readonly stage: BattleExecutionAbortStage;
  readonly issues: readonly ValidationIssue[];

  constructor(input: BattleExecutionAbortErrorInput) {
    const message =
      input.message ?? `Battle execution abort: ${input.failureKind} at ${input.stage}`;
    super(message);
    this.failureKind = input.failureKind;
    this.stage = input.stage;
    this.issues = Object.freeze(input.issues.map((issue) => ({ ...issue })));
  }
}

export function isBattleExecutionAbortError(value: unknown): value is BattleExecutionAbortError {
  return value instanceof BattleExecutionAbortError;
}

const SHA256_HEX = /^[0-9a-f]{64}$/;

/** Provider digest contract: 64 lowercase hex chars. */
export function isValidSha256HexDigest(value: unknown): boolean {
  return typeof value === "string" && SHA256_HEX.test(value);
}

/**
 * Detect Sha256Provider / digest contract failures in ValidationIssue lists
 * (safeHashUtf8 catch, invalid digest, provider error messages).
 */
export function issuesIndicateDependencyFailure(issues: readonly ValidationIssue[]): boolean {
  for (const issue of issues) {
    if (issue.expected === "successful SHA-256 digest") {
      return true;
    }
    if (
      typeof issue.message === "string" &&
      /Sha256Provider|hashUtf8|injected (provider )?fail/i.test(issue.message)
    ) {
      return true;
    }
    if (
      typeof issue.actual === "string" &&
      issue.actual.length > 0 &&
      !isValidSha256HexDigest(issue.actual) &&
      /hash|digest/i.test(issue.path)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Classifies an observed runBattleToCompletion failure/success context into the
 * 0.1.19 outcome table. Pure: does not run battles or consume RNG.
 */
export type ClassifyRunBattleToCompletionOutcomeInput = {
  /** Whether startBattleTransaction already returned success. */
  startSucceeded: boolean;
  /**
   * Observed terminal intent before abort/plan construction:
   * - completed: normal completion path
   * - domain_resolution_failure: prepare/strategy/resolve BattleFailureInfo path
   * - none: no domain terminal yet (e.g. dependency failed mid-turn)
   */
  terminalKind: "completed" | "domain_resolution_failure" | "none";
  /**
   * Cause of the interrupting failure (if any):
   * - none: no interrupting failure (success path)
   * - semantic_or_input: validation / eligibility / BattleFailureInfo domain failure
   * - dependency_or_hash: Sha256Provider throw/failure/invalid digest
   * - internal_invariant: healthy provider but mark/finalize/plan rejected pipeline materials
   */
  failureCause: "none" | "semantic_or_input" | "dependency_or_hash" | "internal_invariant";
  /** Stage where the interrupting failure was observed. */
  stage: "pre_start" | BattleExecutionAbortStage;
  /**
   * Whether a complete failed BattleResult + RunBattleCommitPlan can still be built
   * under healthy dependencies (required for resolution_error).
   */
  canBuildCompleteFailedPlan: boolean;
};

export type RunBattleToCompletionOutcomeClassification =
  | { outcome: "completed" }
  | { outcome: "resolution_error" }
  | { outcome: "pre_start_failure" }
  | {
      outcome: "execution_abort";
      failureKind: BattleExecutionAbortFailureKind;
      stage: BattleExecutionAbortStage;
    };

export function classifyRunBattleToCompletionOutcome(
  input: ClassifyRunBattleToCompletionOutcomeInput,
): RunBattleToCompletionOutcomeClassification {
  if (!input.startSucceeded) {
    // Rows 1–2: pre-start semantic/input OR dependency/hash → pre_start_failure
    return { outcome: "pre_start_failure" };
  }

  if (input.failureCause === "dependency_or_hash") {
    // Rows 4 and domain→dependency escalation: never resolution_error
    const stage = input.stage === "pre_start" ? "prepare_turn" : input.stage;
    return {
      outcome: "execution_abort",
      failureKind: "dependency_failure",
      stage,
    };
  }

  if (input.failureCause === "internal_invariant") {
    // Row 5
    const stage = input.stage === "pre_start" ? "finalize_battle_result" : input.stage;
    return {
      outcome: "execution_abort",
      failureKind: "internal_invariant_violation",
      stage,
    };
  }

  if (
    input.terminalKind === "domain_resolution_failure" &&
    input.failureCause === "semantic_or_input" &&
    input.canBuildCompleteFailedPlan
  ) {
    // Row 3: start後 battle semantic/resolution failure with complete failed plan
    return { outcome: "resolution_error" };
  }

  if (input.terminalKind === "completed" && input.failureCause === "none") {
    // Row 6
    return { outcome: "completed" };
  }

  // Incomplete failed-plan construction after domain failure without dependency label
  // is an internal invariant violation (cannot silently invent resolution_error).
  if (input.terminalKind === "domain_resolution_failure" && !input.canBuildCompleteFailedPlan) {
    const stage = input.stage === "pre_start" ? "finalize_battle_result" : input.stage;
    return {
      outcome: "execution_abort",
      failureKind: "internal_invariant_violation",
      stage,
    };
  }

  // Defensive: unclassified post-start contexts abort rather than invent a 4th kind.
  const stage = input.stage === "pre_start" ? "finalize_battle_result" : input.stage;
  return {
    outcome: "execution_abort",
    failureKind: "internal_invariant_violation",
    stage,
  };
}

/** Public result discriminants remain exactly these three strings. */
export const RUN_BATTLE_TO_COMPLETION_RESULT_KINDS = [
  "completed",
  "resolution_error",
  "pre_start_failure",
] as const;

export type RunBattleToCompletionResultKind =
  (typeof RUN_BATTLE_TO_COMPLETION_RESULT_KINDS)[number];
