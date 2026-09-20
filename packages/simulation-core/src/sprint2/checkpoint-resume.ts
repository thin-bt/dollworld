/**
 * S02-010 checkpoint resume (byte/state restoration only).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { Sprint1RunSession } from "../sprint1/sprint1-run-session.js";
import { validateSprint1RunSession } from "../sprint1/validate-sprint1-run-session.js";
import {
  assertBundleRefMatchesBundle,
  validateSprint2CheckpointBundle,
  type Sprint2CheckpointBundle,
  type Sprint2CheckpointBundleRef,
} from "./checkpoint-bundle.js";
import { DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION } from "./constants.js";
import type { DetailedLogPayloadStore } from "./detailed-log-payload-store.js";
import type { Sprint2CheckpointPublicationStore } from "./checkpoint-publish.js";
import {
  validateSprint2CheckpointRunContext,
  type Sprint2CheckpointRunContext,
} from "./sprint2-checkpoint-context.js";
import {
  assertExecutionStateConfigCompatibility,
  validateWorldWeekExecutionState,
} from "./world-week-execution-state.js";

export type ResumeCheckpointInput = {
  checkpointId: string;
  expectedSimulationId?: Sprint2CheckpointRunContext["executionState"]["simulationId"];
};

function rebuildPayloadStore(bundle: Sprint2CheckpointBundle): DetailedLogPayloadStore {
  const entries = new Map<string, { detailedLogHash: string; canonicalUtf8Bytes: string }>();
  for (const entry of bundle.payloadStore.entries) {
    entries.set(entry.detailedLogHash, {
      detailedLogHash: entry.detailedLogHash,
      canonicalUtf8Bytes: entry.canonicalUtf8Bytes,
    });
  }
  return {
    schemaVersion: DETAILED_LOG_PAYLOAD_STORE_SCHEMA_VERSION,
    entries,
  };
}

export function restoreSprint2CheckpointRunContextFromBundle(
  bundle: Sprint2CheckpointBundle,
  provider: Sha256Provider,
  bundleRef?: Sprint2CheckpointBundleRef,
): ValidationResult<Sprint2CheckpointRunContext> {
  const validatedBundle = validateSprint2CheckpointBundle(bundle, provider);
  if (!validatedBundle.ok) {
    return validatedBundle;
  }
  if (bundleRef !== undefined) {
    const refMatch = assertBundleRefMatchesBundle(validatedBundle.value, bundleRef);
    if (!refMatch.ok) {
      return refMatch;
    }
  }
  let session: Sprint1RunSession;
  try {
    session = JSON.parse(validatedBundle.value.sessionCanonicalJson) as Sprint1RunSession;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "/sessionCanonicalJson",
        message: `invalid session JSON: ${detail}`,
        actual: detail,
      },
    ]);
  }
  const validatedSession = validateSprint1RunSession(session, provider);
  if (!validatedSession.ok) {
    return failure(
      validatedSession.issues.map((issue) => ({
        ...issue,
        path: issue.path === "" ? "/session" : `/session${issue.path}`,
      })),
    );
  }
  const executionState = validateWorldWeekExecutionState(
    validatedBundle.value.executionState,
    validatedSession.value.runtimeState.worldState.worldDate,
  );
  if (!executionState.ok) {
    return executionState;
  }
  const configMatch = assertExecutionStateConfigCompatibility(
    executionState.value,
    validatedSession.value.context.simulationIdentity.sprint2ConfigHash,
    validatedSession.value.context.simulationIdentity.worldCalendarConfigHash,
  );
  if (!configMatch.ok) {
    return configMatch;
  }
  const context: Sprint2CheckpointRunContext = {
    session: validatedSession.value,
    executionState: executionState.value,
    payloadStore: rebuildPayloadStore(validatedBundle.value),
    retainedRecords: validatedBundle.value.retainedRecords,
    annualRankingHistoryStore: validatedBundle.value.annualRankingHistoryStore,
    transactionOpen: false,
  };
  return validateSprint2CheckpointRunContext(context, provider);
}

export function resumeSprint2CheckpointFromStore(
  store: Sprint2CheckpointPublicationStore,
  input: ResumeCheckpointInput,
  provider: Sha256Provider,
): ValidationResult<Sprint2CheckpointRunContext> {
  const bundle = store.getCompletedCheckpoint(input.checkpointId);
  if (bundle === undefined) {
    return failure([
      {
        path: "/checkpointId",
        message: "completed checkpoint not found",
        actual: input.checkpointId,
      },
    ]);
  }
  const restored = restoreSprint2CheckpointRunContextFromBundle(bundle, provider, bundle.bundleRef);
  if (!restored.ok) {
    return restored;
  }
  if (
    input.expectedSimulationId !== undefined &&
    restored.value.executionState.simulationId !== input.expectedSimulationId
  ) {
    return failure([
      {
        path: "/executionState/simulationId",
        message: "resume simulationId mismatch",
        actual: restored.value.executionState.simulationId,
        expected: input.expectedSimulationId,
      },
    ]);
  }
  return restored;
}

export function rejectUnsupportedDraftCheckpointBundle(bundle: {
  schemaVersion?: string;
}): ValidationResult<true> {
  if (bundle.schemaVersion === "0.0.1-draft") {
    return failure([
      {
        path: "/schemaVersion",
        message: "unsupported old draft checkpoint schema",
        actual: bundle.schemaVersion,
      },
    ]);
  }
  return success(true);
}
