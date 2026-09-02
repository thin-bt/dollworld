/**
 * S02-010 bounded week-window execution (runWeeks/runYears).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { runSprint1WeeklyStep, runSprint1Weeks } from "../sprint1/sprint1-weekly-step.js";
import type { WorldProcessor } from "../world-engine/types.js";
import {
  validateSprint2CheckpointRunContext,
  type Sprint2CheckpointRunContext,
} from "./sprint2-checkpoint-context.js";
import {
  createInitialWorldWeekExecutionState,
  normalizeCompletedToPendingWeek,
  validateWorldWeekExecutionState,
} from "./world-week-execution-state.js";

const WEEKS_PER_YEAR = 48;

export type RunWeeksOptions = {
  legacyProcessors?: readonly WorldProcessor[];
  /** Test-only: inject processor failure during pending week processing. */
  injectProcessorFailureOnWeek?: number;
};

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function updateExecutionStateAfterProcessedWeek(
  context: Sprint2CheckpointRunContext,
): ValidationResult<Sprint2CheckpointRunContext> {
  const executionState = createInitialWorldWeekExecutionState({
    simulationId: context.session.context.simulationId,
    sprint2ConfigHash: context.session.context.simulationIdentity.sprint2ConfigHash,
    worldCalendarConfigHash: context.session.context.simulationIdentity.worldCalendarConfigHash,
    initialWorldDate: context.session.runtimeState.worldState.worldDate,
  });
  if (!executionState.ok) {
    return executionState;
  }
  const withElapsed = {
    ...executionState.value,
    elapsedWeeks: context.session.runtimeState.worldState.worldDate.absoluteWeek,
    phase: "pending" as const,
  };
  const validated = validateWorldWeekExecutionState(
    withElapsed,
    context.session.runtimeState.worldState.worldDate,
  );
  if (!validated.ok) {
    return validated;
  }
  return success({
    ...context,
    executionState: validated.value,
    transactionOpen: false,
  });
}

function processOnePendingWeek(
  context: Sprint2CheckpointRunContext,
  provider: Sha256Provider,
  options: RunWeeksOptions,
): ValidationResult<Sprint2CheckpointRunContext> {
  if (context.executionState.phase !== "pending") {
    return failure([
      {
        path: "/executionState/phase",
        message: "week processing requires pending execution phase",
        actual: context.executionState.phase,
        expected: "pending",
      },
    ]);
  }
  const weekIndex = context.executionState.elapsedWeeks;
  if (options.injectProcessorFailureOnWeek === weekIndex) {
    return failure([
      {
        path: "/processor",
        message: "injected processor failure during pending week",
        actual: weekIndex,
      },
    ]);
  }
  const step = runSprint1WeeklyStep(context.session, provider, {
    ...(options.legacyProcessors !== undefined
      ? { legacyProcessors: options.legacyProcessors }
      : {}),
  });
  if (!step.ok) {
    return failure(prefixIssues(step.issues, "/session"));
  }
  return updateExecutionStateAfterProcessedWeek({
    ...context,
    session: step.value,
    transactionOpen: false,
  });
}

/**
 * Advance by `weeks` world weeks. `weeks === 0` is a true no-op.
 */
export function runWeeks(
  context: Sprint2CheckpointRunContext,
  weeks: number,
  provider: Sha256Provider,
  options: RunWeeksOptions = {},
): ValidationResult<Sprint2CheckpointRunContext> {
  const validated = validateSprint2CheckpointRunContext(context, provider);
  if (!validated.ok) {
    return validated;
  }
  if (!Number.isSafeInteger(weeks) || weeks < 0) {
    return failure([
      {
        path: "/weeks",
        message: "weeks must be a non-negative safe integer",
        actual: weeks,
      },
    ]);
  }
  if (weeks === 0) {
    return success(validated.value);
  }

  let current = validated.value;
  for (let index = 0; index < weeks; index += 1) {
    if (current.executionState.phase === "completed") {
      const normalized = normalizeCompletedToPendingWeek(current.executionState);
      if (!normalized.ok) {
        return normalized;
      }
      current = {
        ...current,
        executionState: normalized.value,
      };
    }
    const processed = processOnePendingWeek(current, provider, options);
    if (!processed.ok) {
      return failure(prefixIssues(processed.issues, `/weeks/${String(index)}`));
    }
    current = processed.value;
  }
  return validateSprint2CheckpointRunContext(current, provider);
}

/**
 * Advance by `years * 48` weeks using {@link runSprint1Weeks}.
 */
export function runYears(
  context: Sprint2CheckpointRunContext,
  years: number,
  provider: Sha256Provider,
  options: RunWeeksOptions = {},
): ValidationResult<Sprint2CheckpointRunContext> {
  const validated = validateSprint2CheckpointRunContext(context, provider);
  if (!validated.ok) {
    return validated;
  }
  if (!Number.isSafeInteger(years) || years < 0) {
    return failure([
      {
        path: "/years",
        message: "years must be a non-negative safe integer",
        actual: years,
      },
    ]);
  }
  if (years === 0) {
    return success(validated.value);
  }

  let current = validated.value;
  if (current.executionState.phase === "completed") {
    const normalized = normalizeCompletedToPendingWeek(current.executionState);
    if (!normalized.ok) {
      return normalized;
    }
    current = {
      ...current,
      executionState: normalized.value,
    };
  }

  const targetWeeks = years * WEEKS_PER_YEAR;
  const stepped = runSprint1Weeks(current.session, targetWeeks, provider, {
    ...(options.legacyProcessors !== undefined
      ? { legacyProcessors: options.legacyProcessors }
      : {}),
  });
  if (!stepped.ok) {
    return failure(prefixIssues(stepped.issues, "/session"));
  }

  const updated = updateExecutionStateAfterProcessedWeek({
    ...current,
    session: stepped.value,
    transactionOpen: false,
  });
  if (!updated.ok) {
    return updated;
  }
  return validateSprint2CheckpointRunContext(updated.value, provider);
}

export { WEEKS_PER_YEAR as SPRINT2_WEEKS_PER_WORLD_YEAR };
