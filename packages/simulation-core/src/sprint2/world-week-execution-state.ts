/**
 * S02-010 canonical world-week execution state (pending vs completed phase).
 */
import type { SimulationId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  DEFAULT_WORLD_CALENDAR_CONFIG,
  isSameWorldDate,
  validateWorldDate,
  type WorldDate,
} from "../world-date.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import {
  WORLD_WEEK_EXECUTION_PHASES,
  WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION,
} from "./constants.js";

export type WorldWeekExecutionState = {
  schemaVersion: typeof WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION;
  phase: (typeof WORLD_WEEK_EXECUTION_PHASES)[number];
  expectedCurrentWorldDate: WorldDate;
  elapsedWeeks: number;
  simulationId: SimulationId;
  sprint2ConfigHash: string;
  worldCalendarConfigHash: string;
};

export function deriveProcessedWorldWeeks(state: WorldWeekExecutionState): number {
  return state.elapsedWeeks + (state.phase === "completed" ? 1 : 0);
}

function validateWorldDateResult(
  date: WorldDate,
): ValidationResult<WorldDate> {
  try {
    validateWorldDate(date, DEFAULT_WORLD_CALENDAR_CONFIG);
    return success(deepFreezePlainJson(date));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "",
        message: detail,
        actual: date,
      },
    ]);
  }
}

export function createInitialWorldWeekExecutionState(input: {
  simulationId: SimulationId;
  sprint2ConfigHash: string;
  worldCalendarConfigHash: string;
  initialWorldDate: WorldDate;
}): ValidationResult<WorldWeekExecutionState> {
  const date = validateWorldDateResult(input.initialWorldDate);
  if (!date.ok) {
    return date;
  }
  return success(
    deepFreezePlainJson({
      schemaVersion: WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION,
      phase: "pending",
      expectedCurrentWorldDate: date.value,
      elapsedWeeks: 0,
      simulationId: input.simulationId,
      sprint2ConfigHash: input.sprint2ConfigHash,
      worldCalendarConfigHash: input.worldCalendarConfigHash,
    }),
  );
}

export function validateWorldWeekExecutionState(
  state: unknown,
  actualWorldDate: WorldDate,
): ValidationResult<WorldWeekExecutionState> {
  const issues: ValidationIssue[] = [];
  if (typeof state !== "object" || state === null) {
    return failure([{ path: "", message: "execution state must be an object", actual: state }]);
  }
  const object = state as Record<string, unknown>;
  if (object.schemaVersion !== WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "unsupported world week execution state schema version",
      actual: object.schemaVersion,
      expected: WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION,
    });
  }
  if (object.phase !== "pending" && object.phase !== "completed") {
    issues.push({
      path: "/phase",
      message: "phase must be pending or completed",
      actual: object.phase,
    });
  }
  const dateResult = validateWorldDateResult(object.expectedCurrentWorldDate as WorldDate);
  if (!dateResult.ok) {
    issues.push(
      ...dateResult.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/expectedCurrentWorldDate" : `/expectedCurrentWorldDate${issue.path}`,
      })),
    );
  }
  if (typeof object.elapsedWeeks !== "number" || !Number.isSafeInteger(object.elapsedWeeks) || object.elapsedWeeks < 0) {
    issues.push({
      path: "/elapsedWeeks",
      message: "elapsedWeeks must be a non-negative safe integer",
      actual: object.elapsedWeeks,
    });
  }
  if (typeof object.simulationId !== "string" || object.simulationId.length === 0) {
    issues.push({ path: "/simulationId", message: "simulationId must be a non-empty string", actual: object.simulationId });
  }
  if (typeof object.sprint2ConfigHash !== "string" || !/^[0-9a-f]{64}$/.test(object.sprint2ConfigHash)) {
    issues.push({
      path: "/sprint2ConfigHash",
      message: "sprint2ConfigHash must be a 64-char lowercase hex digest",
      actual: object.sprint2ConfigHash,
    });
  }
  if (
    typeof object.worldCalendarConfigHash !== "string" ||
    !/^[0-9a-f]{64}$/.test(object.worldCalendarConfigHash)
  ) {
    issues.push({
      path: "/worldCalendarConfigHash",
      message: "worldCalendarConfigHash must be a 64-char lowercase hex digest",
      actual: object.worldCalendarConfigHash,
    });
  }
  if (issues.length > 0 || !dateResult.ok) {
    return failure(issues);
  }
  const validated = deepFreezePlainJson({
    schemaVersion: WORLD_WEEK_EXECUTION_STATE_SCHEMA_VERSION,
    phase: object.phase as WorldWeekExecutionState["phase"],
    expectedCurrentWorldDate: dateResult.value,
    elapsedWeeks: object.elapsedWeeks as number,
    simulationId: object.simulationId as SimulationId,
    sprint2ConfigHash: object.sprint2ConfigHash as string,
    worldCalendarConfigHash: object.worldCalendarConfigHash as string,
  });
  if (!isSameWorldDate(validated.expectedCurrentWorldDate, actualWorldDate)) {
    return failure([
      {
        path: "/expectedCurrentWorldDate",
        message: "expectedCurrentWorldDate must match session world date",
        actual: validated.expectedCurrentWorldDate.absoluteWeek,
        expected: String(actualWorldDate.absoluteWeek),
      },
    ]);
  }
  if (validated.expectedCurrentWorldDate.absoluteWeek !== validated.elapsedWeeks) {
    return failure([
      {
        path: "/elapsedWeeks",
        message: "elapsedWeeks must equal expectedCurrentWorldDate.absoluteWeek",
        actual: validated.elapsedWeeks,
        expected: String(validated.expectedCurrentWorldDate.absoluteWeek),
      },
    ]);
  }
  return success(validated);
}

export function normalizeCompletedToPendingWeek(
  state: WorldWeekExecutionState,
): ValidationResult<WorldWeekExecutionState> {
  if (state.phase !== "completed") {
    return failure([
      {
        path: "/phase",
        message: "only completed execution state can normalize to pending",
        actual: state.phase,
        expected: "completed",
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      ...state,
      phase: "pending",
    }),
  );
}

export function markExecutionStateCompleted(
  state: WorldWeekExecutionState,
): ValidationResult<WorldWeekExecutionState> {
  if (state.phase !== "pending") {
    return failure([
      {
        path: "/phase",
        message: "only pending execution state can be marked completed",
        actual: state.phase,
        expected: "pending",
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      ...state,
      phase: "completed",
    }),
  );
}

export function assertExecutionStateConfigCompatibility(
  state: WorldWeekExecutionState,
  sprint2ConfigHash: string,
  worldCalendarConfigHash: string,
): ValidationResult<true> {
  const issues: ValidationIssue[] = [];
  if (state.sprint2ConfigHash !== sprint2ConfigHash) {
    issues.push({
      path: "/sprint2ConfigHash",
      message: "execution state sprint2ConfigHash mismatch",
      actual: state.sprint2ConfigHash,
      expected: sprint2ConfigHash,
    });
  }
  if (state.worldCalendarConfigHash !== worldCalendarConfigHash) {
    issues.push({
      path: "/worldCalendarConfigHash",
      message: "execution state worldCalendarConfigHash mismatch",
      actual: state.worldCalendarConfigHash,
      expected: worldCalendarConfigHash,
    });
  }
  return issues.length > 0 ? failure(issues) : success(true);
}

export function toCompletedCheckpointExecutionState(
  state: WorldWeekExecutionState,
): ValidationResult<WorldWeekExecutionState> {
  return markExecutionStateCompleted(state);
}
