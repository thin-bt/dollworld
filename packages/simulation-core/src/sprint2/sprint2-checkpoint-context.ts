/**
 * S02-010 checkpoint run context bundling session + execution state + S02-009 retention.
 */
import type { SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { toCanonicalJson } from "../canonical-json.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { Sprint1RunSession } from "../sprint1/sprint1-run-session.js";
import { validateSprint1RunSession } from "../sprint1/validate-sprint1-run-session.js";
import {
  createEmptyAnnualRankingHistoryStore,
  type AnnualRankingHistoryStore,
} from "./annual-ranking-history.js";
import {
  createEmptyDetailedLogPayloadStore,
  type DetailedLogPayloadStore,
} from "./detailed-log-payload-store.js";
import type { StoredBattleResultRecord } from "./stored-battle-result.js";
import {
  createInitialWorldWeekExecutionState,
  validateWorldWeekExecutionState,
  type WorldWeekExecutionState,
} from "./world-week-execution-state.js";

export type Sprint2CheckpointRunContext = {
  session: Sprint1RunSession;
  executionState: WorldWeekExecutionState;
  payloadStore: DetailedLogPayloadStore;
  retainedRecords: readonly StoredBattleResultRecord[];
  annualRankingHistoryStore: AnnualRankingHistoryStore;
  transactionOpen: boolean;
};

function clonePayloadStore(store: DetailedLogPayloadStore): DetailedLogPayloadStore {
  return {
    schemaVersion: store.schemaVersion,
    entries: new Map(store.entries),
  };
}

function finalizeCheckpointRunContext(
  context: Sprint2CheckpointRunContext,
): Sprint2CheckpointRunContext {
  return {
    session: context.session,
    executionState: context.executionState,
    payloadStore: clonePayloadStore(context.payloadStore),
    retainedRecords: context.retainedRecords.map((record) => deepFreezePlainJson(record)),
    annualRankingHistoryStore: deepFreezePlainJson(context.annualRankingHistoryStore),
    transactionOpen: context.transactionOpen,
  };
}

export function createInitialSprint2CheckpointRunContext(
  session: Sprint1RunSession,
  provider: Sha256Provider,
): ValidationResult<Sprint2CheckpointRunContext> {
  const validatedSession = validateSprint1RunSession(session, provider);
  if (!validatedSession.ok) {
    return validatedSession;
  }
  const executionState = createInitialWorldWeekExecutionState({
    simulationId: validatedSession.value.context.simulationId,
    sprint2ConfigHash: validatedSession.value.context.simulationIdentity.sprint2ConfigHash,
    worldCalendarConfigHash: validatedSession.value.context.simulationIdentity.worldCalendarConfigHash,
    initialWorldDate: validatedSession.value.runtimeState.worldState.worldDate,
  });
  if (!executionState.ok) {
    return executionState;
  }
  return success(
    finalizeCheckpointRunContext({
      session: validatedSession.value,
      executionState: executionState.value,
      payloadStore: createEmptyDetailedLogPayloadStore(),
      retainedRecords: [],
      annualRankingHistoryStore: createEmptyAnnualRankingHistoryStore(),
      transactionOpen: false,
    }),
  );
}

export function validateSprint2CheckpointRunContext(
  context: Sprint2CheckpointRunContext,
  provider: Sha256Provider,
): ValidationResult<Sprint2CheckpointRunContext> {
  const validatedSession = validateSprint1RunSession(context.session, provider);
  if (!validatedSession.ok) {
    return validatedSession;
  }
  const executionState = validateWorldWeekExecutionState(
    context.executionState,
    validatedSession.value.runtimeState.worldState.worldDate,
  );
  if (!executionState.ok) {
    return failure(
      executionState.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/executionState" : `/executionState${issue.path}`,
      })),
    );
  }
  if (executionState.value.simulationId !== validatedSession.value.context.simulationId) {
    return failure([
      {
        path: "/executionState/simulationId",
        message: "execution state simulationId must match session",
        actual: executionState.value.simulationId,
        expected: validatedSession.value.context.simulationId,
      },
    ]);
  }
  return success(
    finalizeCheckpointRunContext({
      ...context,
      session: validatedSession.value,
      executionState: executionState.value,
    }),
  );
}

export function cloneSprint2CheckpointRunContext(
  context: Sprint2CheckpointRunContext,
): Sprint2CheckpointRunContext {
  return finalizeCheckpointRunContext({
    session: JSON.parse(toCanonicalJson(context.session)) as Sprint1RunSession,
    executionState: deepFreezePlainJson(context.executionState),
    payloadStore: clonePayloadStore(context.payloadStore),
    retainedRecords: [...context.retainedRecords],
    annualRankingHistoryStore: deepFreezePlainJson(context.annualRankingHistoryStore),
    transactionOpen: context.transactionOpen,
  });
}

export function canonicalizeSprint2CheckpointRunContext(context: Sprint2CheckpointRunContext): string {
  return toCanonicalJson({
    session: context.session,
    executionState: context.executionState,
    payloadStore: {
      schemaVersion: context.payloadStore.schemaVersion,
      entries: [...context.payloadStore.entries.entries()].sort(([a], [b]) => a.localeCompare(b)),
    },
    retainedRecords: context.retainedRecords,
    annualRankingHistoryStore: context.annualRankingHistoryStore,
    transactionOpen: context.transactionOpen,
  });
}

export function assertSimulationIdMatch(
  context: Sprint2CheckpointRunContext,
  simulationId: SimulationId,
): ValidationResult<true> {
  if (context.executionState.simulationId !== simulationId) {
    return failure([
      {
        path: "/executionState/simulationId",
        message: "simulationId mismatch",
        actual: context.executionState.simulationId,
        expected: simulationId,
      },
    ]);
  }
  return success(true);
}
