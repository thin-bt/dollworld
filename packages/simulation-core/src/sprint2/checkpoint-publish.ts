/**
 * S02-010 atomic checkpoint publication (in-memory staging + commit).
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  buildSprint2CheckpointBundle,
  validateSprint2CheckpointBundle,
  type Sprint2CheckpointBundle,
} from "./checkpoint-bundle.js";
import type { Sprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";
import { toCompletedCheckpointExecutionState } from "./world-week-execution-state.js";

export type PublishCheckpointInput = {
  context: Sprint2CheckpointRunContext;
  checkpointId: string;
  form: "pending" | "completed";
};

export type PublishCheckpointOutcome =
  | { kind: "published"; checkpointId: string; bundle: Sprint2CheckpointBundle }
  | { kind: "refused_transaction_open"; completedCheckpointIds: readonly string[] }
  | { kind: "refused_integrity"; issues: readonly { path: string; message: string }[] };

export class Sprint2CheckpointPublicationStore {
  readonly #staging = new Map<string, Sprint2CheckpointBundle>();
  readonly #completed = new Map<string, Sprint2CheckpointBundle>();

  listCompletedCheckpointIds(): readonly string[] {
    return [...this.#completed.keys()];
  }

  getCompletedCheckpoint(checkpointId: string): Sprint2CheckpointBundle | undefined {
    return this.#completed.get(checkpointId);
  }

  publish(input: PublishCheckpointInput, provider: Sha256Provider): PublishCheckpointOutcome {
    if (input.context.transactionOpen) {
      return {
        kind: "refused_transaction_open",
        completedCheckpointIds: this.listCompletedCheckpointIds(),
      };
    }
    let publishContext = input.context;
    if (input.form === "completed") {
      const completedState = toCompletedCheckpointExecutionState(input.context.executionState);
      if (!completedState.ok) {
        return { kind: "refused_integrity", issues: completedState.issues };
      }
      publishContext = {
        ...input.context,
        executionState: completedState.value,
      };
    }
    const bundle = buildSprint2CheckpointBundle(publishContext, provider);
    if (!bundle.ok) {
      return { kind: "refused_integrity", issues: bundle.issues };
    }
    const validated = validateSprint2CheckpointBundle(bundle.value, provider);
    if (!validated.ok) {
      return { kind: "refused_integrity", issues: validated.issues };
    }

    const completedBefore = this.listCompletedCheckpointIds().length;
    this.#staging.set(input.checkpointId, validated.value);
    const restaged = validateSprint2CheckpointBundle(validated.value, provider);
    if (!restaged.ok) {
      this.#staging.delete(input.checkpointId);
      return { kind: "refused_integrity", issues: restaged.issues };
    }
    this.#completed.set(input.checkpointId, restaged.value);
    this.#staging.delete(input.checkpointId);
    if (this.listCompletedCheckpointIds().length !== completedBefore + 1) {
      this.#completed.delete(input.checkpointId);
      return {
        kind: "refused_integrity",
        issues: [{ path: "/publish", message: "atomic publish invariant failed" }],
      };
    }
    return {
      kind: "published",
      checkpointId: input.checkpointId,
      bundle: restaged.value,
    };
  }
}

export function publishSprint2Checkpoint(
  store: Sprint2CheckpointPublicationStore,
  input: PublishCheckpointInput,
  provider: Sha256Provider,
): PublishCheckpointOutcome {
  return store.publish(input, provider);
}

export function beginCheckpointTransaction(
  context: Sprint2CheckpointRunContext,
): ValidationResult<Sprint2CheckpointRunContext> {
  if (context.transactionOpen) {
    return failure([
      {
        path: "/transactionOpen",
        message: "checkpoint transaction already open",
        actual: true,
      },
    ]);
  }
  return success({ ...context, transactionOpen: true });
}

export function endCheckpointTransaction(
  context: Sprint2CheckpointRunContext,
): Sprint2CheckpointRunContext {
  return { ...context, transactionOpen: false };
}
