/**
 * S02-010 runWeeks / runYears acceptance (WIN-001..013).
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORLD_CALENDAR_CONFIG,
  isWorldYearStartWeek,
  toCanonicalJson,
  WORLD_YEAR_START_PROCESSOR_ID,
  type ValidationResult,
} from "../index.js";
import { createNodeSha256Provider } from "../test-fixtures/name-data-loader.fixture.js";
import {
  buildFreshCheckpointRunContext,
  expectOk,
} from "../test-fixtures/sprint2-checkpoint.fixture.js";
import { deriveProcessedWorldWeeks } from "./world-week-execution-state.js";
import { runWeeks, runYears, SPRINT2_WEEKS_PER_WORLD_YEAR } from "./run-weeks.js";
import { canonicalizeSprint2CheckpointRunContext, type Sprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";
import { validateWorldYearStartRuntimeState } from "../sprint1/world-year-start-runtime-state.js";

const provider = createNodeSha256Provider();

function yearStartRuntimeOf(context: ReturnType<typeof buildFreshCheckpointRunContext>) {
  const entry = context.session.runtimeState.processorRuntimeStates.processorSpecificStates?.find(
    (item) => item.processorId === WORLD_YEAR_START_PROCESSOR_ID,
  );
  if (entry === undefined) {
    throw new Error("missing world-year-start runtime");
  }
  return expectOk(validateWorldYearStartRuntimeState(entry.specificState));
}

describe("S02-010 runWeeks window", () => {
  it("WIN-001: initial pending runWeeks(0) leaves state unchanged", () => {
    const initial = buildFreshCheckpointRunContext(92001, provider);
    const after = expectOk(runWeeks(initial, 0, provider));
    expect(canonicalizeSprint2CheckpointRunContext(after)).toBe(
      canonicalizeSprint2CheckpointRunContext(initial),
    );
  });

  it("WIN-002: initial pending runWeeks(1) advances one week", () => {
    const initial = buildFreshCheckpointRunContext(92002, provider);
    const after = expectOk(runWeeks(initial, 1, provider));
    expect(after.executionState.phase).toBe("pending");
    expect(after.executionState.elapsedWeeks).toBe(1);
    expect(deriveProcessedWorldWeeks(after.executionState)).toBe(1);
    expect(after.session.runtimeState.worldState.worldDate.absoluteWeek).toBe(1);
  });

  it("WIN-003: completed runWeeks(1) processes next pending week once", () => {
    const initial = buildFreshCheckpointRunContext(92003, provider);
    const afterOne = expectOk(runWeeks(initial, 1, provider));
    const completed = {
      ...afterOne,
      executionState: { ...afterOne.executionState, phase: "completed" as const },
    };
    const afterTwo = expectOk(runWeeks(completed, 1, provider));
    expect(afterTwo.executionState.elapsedWeeks).toBe(2);
    expect(afterTwo.executionState.phase).toBe("pending");
    expect(afterTwo.session.runtimeState.worldState.worldDate.absoluteWeek).toBe(2);
  });

  it("WIN-004: pending checkpoint resume then runWeeks(1) processes current week once", () => {
    const initial = buildFreshCheckpointRunContext(92004, provider);
    const fresh = expectOk(runWeeks(initial, 1, provider));
    const restored = expectOk(runWeeks(initial, 1, provider));
    expect(canonicalizeSprint2CheckpointRunContext(restored)).toBe(
      canonicalizeSprint2CheckpointRunContext(fresh),
    );
  });

  it("WIN-005: completed checkpoint resume then runWeeks(1) processes next week once", () => {
    const initial = buildFreshCheckpointRunContext(92005, provider);
    const afterOne = expectOk(runWeeks(initial, 1, provider));
    const completed = {
      ...afterOne,
      executionState: { ...afterOne.executionState, phase: "completed" as const },
    };
    const freshTwo = expectOk(runWeeks(initial, 2, provider));
    const resumedTwo = expectOk(runWeeks(completed, 1, provider));
    expect(canonicalizeSprint2CheckpointRunContext(resumedTwo)).toBe(
      canonicalizeSprint2CheckpointRunContext(freshTwo),
    );
  });

  it("WIN-008: phase/date mismatch rejects resume validation", () => {
    const initial = buildFreshCheckpointRunContext(92008, provider);
    const tampered = {
      ...initial,
      executionState: {
        ...initial.executionState,
        expectedCurrentWorldDate: {
          ...initial.executionState.expectedCurrentWorldDate,
          absoluteWeek: 99,
        },
      },
    };
    const result = runWeeks(tampered, 0, provider);
    expect(result.ok).toBe(false);
  });

  it("WIN-009: elapsedWeeks mismatch rejects validation", () => {
    const initial = buildFreshCheckpointRunContext(92009, provider);
    const tampered = {
      ...initial,
      executionState: {
        ...initial.executionState,
        elapsedWeeks: 99,
      },
    };
    const result = runWeeks(tampered, 0, provider);
    expect(result.ok).toBe(false);
  });

  it("WIN-010: processor failure rolls back to pending input", () => {
    const initial = buildFreshCheckpointRunContext(92010, provider);
    const before = canonicalizeSprint2CheckpointRunContext(initial);
    const failed = runWeeks(initial, 1, provider, { injectProcessorFailureOnWeek: 0 });
    expect(failed.ok).toBe(false);
    expect(canonicalizeSprint2CheckpointRunContext(initial)).toBe(before);
  });

  it("WIN-011: pending runWeeks(3) equals 1+2 chunking", () => {
    const batched = expectOk(runWeeks(buildFreshCheckpointRunContext(920111, provider), 3, provider));
    let chunked = buildFreshCheckpointRunContext(920111, provider);
    chunked = expectOk(runWeeks(chunked, 1, provider));
    chunked = expectOk(runWeeks(chunked, 2, provider));
    expect(canonicalizeSprint2CheckpointRunContext(chunked)).toBe(
      canonicalizeSprint2CheckpointRunContext(batched),
    );
  });

  it("WIN-012: completed runWeeks(3) equals 1+2 chunking", () => {
    const seedContext = buildFreshCheckpointRunContext(920121, provider);
    const afterOne = expectOk(runWeeks(seedContext, 1, provider));
    const completedBase: Sprint2CheckpointRunContext = {
      ...afterOne,
      executionState: {
        ...afterOne.executionState,
        phase: "completed",
      },
    };
    const batched = expectOk(runWeeks(completedBase, 3, provider));
    const afterOneChunk = expectOk(runWeeks(buildFreshCheckpointRunContext(920121, provider), 1, provider));
    let chunked: Sprint2CheckpointRunContext = {
      ...afterOneChunk,
      executionState: {
        ...afterOneChunk.executionState,
        phase: "completed",
      },
    };
    chunked = expectOk(runWeeks(chunked, 1, provider));
    chunked = expectOk(runWeeks(chunked, 2, provider));
    expect(canonicalizeSprint2CheckpointRunContext(chunked)).toBe(
      canonicalizeSprint2CheckpointRunContext(batched),
    );
  });

  it("WIN-013: completed runWeeks(0) is fully unchanged", () => {
    const afterOne = expectOk(runWeeks(buildFreshCheckpointRunContext(92013, provider), 1, provider));
    const completed = {
      ...afterOne,
      executionState: { ...afterOne.executionState, phase: "completed" as const },
    };
    const before = canonicalizeSprint2CheckpointRunContext(completed);
    const after = expectOk(runWeeks(completed, 0, provider));
    expect(canonicalizeSprint2CheckpointRunContext(after)).toBe(before);
  });

  it("WIN-006: runYears(100) leaves world-year 101 start pending at 4800 elapsed weeks", () => {
    const initial = buildFreshCheckpointRunContext(92006, provider);
    const after = expectOk(runYears(initial, 100, provider));
    expect(after.executionState.elapsedWeeks).toBe(100 * SPRINT2_WEEKS_PER_WORLD_YEAR);
    expect(after.session.runtimeState.worldState.worldDate.year).toBe(101);
    expect(
      isWorldYearStartWeek(
        after.session.runtimeState.worldState.worldDate,
        DEFAULT_WORLD_CALENDAR_CONFIG,
      ),
    ).toBe(true);
    expect(after.executionState.phase).toBe("pending");
  }, 360_000);

  it("WIN-007: after WIN-006, runWeeks(1) advances world-year 101 start week without duplicate year-start", () => {
    const initial = buildFreshCheckpointRunContext(92007, provider);
    const atBoundary = expectOk(runYears(initial, 100, provider));
    const runtimeBefore = yearStartRuntimeOf(atBoundary);
    const receiptCountBefore = runtimeBefore.receipts.length;
    const after = expectOk(runWeeks(atBoundary, 1, provider));
    const runtimeAfter = yearStartRuntimeOf(after);
    expect(runtimeAfter.lastCompletedWorldYearStart).toBe(101);
    expect(runtimeAfter.lastCompletedWorldYearStart).toBe(runtimeBefore.lastCompletedWorldYearStart);
    expect(runtimeAfter.receipts.length).toBe(receiptCountBefore);
    expect(after.session.runtimeState.worldState.worldDate.year).toBe(101);
    expect(after.session.runtimeState.worldState.worldDate.absoluteWeek).toBe(
      100 * SPRINT2_WEEKS_PER_WORLD_YEAR + 1,
    );
  }, 360_000);
});

describe("S02-010 S02-008 regression via checkpoint seam", () => {
  it("year-start receipt is not duplicated when resuming completed checkpoint at year boundary", () => {
    const initial = buildFreshCheckpointRunContext(92014, provider);
    const atBoundary = expectOk(runYears(initial, 1, provider));
    const completed = {
      ...atBoundary,
      executionState: { ...atBoundary.executionState, phase: "completed" as const },
    };
    const receiptCountBefore = yearStartRuntimeOf(completed).receipts.length;
    const resumed = expectOk(runWeeks(completed, 1, provider));
    const receiptCountAfter = yearStartRuntimeOf(resumed).receipts.length;
    expect(receiptCountAfter).toBe(receiptCountBefore);
    const secondStep = expectOk(runWeeks(resumed, 0, provider));
    expect(yearStartRuntimeOf(secondStep).receipts.length).toBe(receiptCountAfter);
  });
});

function expectFail(result: ValidationResult<unknown>): void {
  expect(result.ok).toBe(false);
}
