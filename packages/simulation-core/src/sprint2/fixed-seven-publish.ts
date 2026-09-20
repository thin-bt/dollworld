/**
 * S02-011 atomic fixed-seven publication (staging -> completed, no partial final runs).
 */
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import {
  FIXED_SEVEN_OUTPUT_FILE_COUNT,
  FIXED_SEVEN_OUTPUT_FILE_NAMES,
  FIXED_SEVEN_PUBLISH_PROTOCOL_SCHEMA_VERSION,
  type FixedSevenOutputFileName,
} from "./constants.js";
import type { FixedSevenRunOutput } from "./fixed-seven-projection.js";
import {
  assertFixedSevenStreamingEqualsReference,
  reassembleFixedSevenFromStreaming,
  serializeFixedSevenStreaming,
  serializeFixedSevenToMemoryReference,
} from "./fixed-seven-serializer.js";
import type { Sprint2CheckpointRunContext } from "./sprint2-checkpoint-context.js";

export type PublishFixedSevenRunInput = {
  runId: string;
  context: Sprint2CheckpointRunContext;
  output: FixedSevenRunOutput;
  afterStagingFileWrite?: (
    stagingRunId: string,
    filesWritten: readonly FixedSevenOutputFileName[],
  ) => void;
};

export type PublishFixedSevenRunOutcome =
  | { kind: "published"; runId: string; output: FixedSevenRunOutput }
  | { kind: "refused_transaction_open"; completedRunIds: readonly string[] }
  | { kind: "refused_integrity"; issues: readonly ValidationIssue[] };

type StagingEntry = {
  files: Map<FixedSevenOutputFileName, string>;
  extraEntries: string[];
};

export class Sprint2FixedSevenPublicationStore {
  readonly #protocolVersion = FIXED_SEVEN_PUBLISH_PROTOCOL_SCHEMA_VERSION;
  readonly #staging = new Map<string, StagingEntry>();
  readonly #completed = new Map<string, FixedSevenRunOutput>();

  get protocolVersion(): typeof FIXED_SEVEN_PUBLISH_PROTOCOL_SCHEMA_VERSION {
    return this.#protocolVersion;
  }

  listCompletedRunIds(): readonly string[] {
    return [...this.#completed.keys()];
  }

  listStagingRunIds(): readonly string[] {
    return [...this.#staging.keys()];
  }

  getCompletedRun(runId: string): FixedSevenRunOutput | undefined {
    return this.#completed.get(runId);
  }

  getStagingRun(runId: string): ReadonlyMap<FixedSevenOutputFileName, string> | undefined {
    const entry = this.#staging.get(runId);
    return entry === undefined ? undefined : entry.files;
  }

  publish(input: PublishFixedSevenRunInput): PublishFixedSevenRunOutcome {
    if (input.context.transactionOpen) {
      return {
        kind: "refused_transaction_open",
        completedRunIds: this.listCompletedRunIds(),
      };
    }

    const membership = validateFixedSevenStagingMembership(input.output);
    if (!membership.ok) {
      return { kind: "refused_integrity", issues: membership.issues };
    }

    const reference = serializeFixedSevenToMemoryReference(input.output);
    const streamed = reassembleFixedSevenFromStreaming(serializeFixedSevenStreaming(reference));
    try {
      assertFixedSevenStreamingEqualsReference(reference, streamed);
    } catch (error) {
      return {
        kind: "refused_integrity",
        issues: [
          {
            path: "/streaming",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }

    const stagingEntry: StagingEntry = {
      files: new Map(),
      extraEntries: [],
    };
    this.#staging.set(input.runId, stagingEntry);

    const filesWritten: FixedSevenOutputFileName[] = [];
    try {
      for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
        stagingEntry.files.set(fileName, input.output[fileName]);
        filesWritten.push(fileName);
        if (input.afterStagingFileWrite !== undefined) {
          input.afterStagingFileWrite(input.runId, filesWritten);
        }
      }

      const validated = validateFixedSevenStagingMembership(
        Object.fromEntries(stagingEntry.files.entries()) as FixedSevenRunOutput,
      );
      if (!validated.ok) {
        this.#staging.delete(input.runId);
        return { kind: "refused_integrity", issues: validated.issues };
      }

      if (stagingEntry.extraEntries.length > 0) {
        this.#staging.delete(input.runId);
        return {
          kind: "refused_integrity",
          issues: [
            {
              path: "/staging",
              message: "extra staging entry rejects publish",
              actual: stagingEntry.extraEntries.join(","),
            },
          ],
        };
      }

      const completedBefore = this.listCompletedRunIds().length;
      this.#completed.set(input.runId, deepFreezePlainJson(reference));
      this.#staging.delete(input.runId);

      if (this.listCompletedRunIds().length !== completedBefore + 1) {
        this.#completed.delete(input.runId);
        return {
          kind: "refused_integrity",
          issues: [{ path: "/publish", message: "atomic publish invariant failed" }],
        };
      }

      return { kind: "published", runId: input.runId, output: reference };
    } catch (error) {
      this.#staging.delete(input.runId);
      this.#completed.delete(input.runId);
      return {
        kind: "refused_integrity",
        issues: [
          {
            path: "/publish",
            message: error instanceof Error ? error.message : String(error),
          },
        ],
      };
    }
  }

  injectStagingExtraEntry(runId: string, entryName: string): ValidationResult<true> {
    const staging = this.#staging.get(runId);
    if (staging === undefined) {
      return failure([{ path: "/staging", message: "staging run not found", actual: runId }]);
    }
    staging.extraEntries.push(entryName);
    return success(true);
  }
}

export function validateFixedSevenStagingMembership(
  output: Partial<FixedSevenRunOutput> & Record<string, string | undefined>,
): ValidationResult<FixedSevenRunOutput> {
  const issues: ValidationIssue[] = [];
  const keys = Object.keys(output);
  const allowed = new Set<string>(FIXED_SEVEN_OUTPUT_FILE_NAMES);

  for (const key of keys) {
    if (!allowed.has(key)) {
      issues.push({
        path: `/${key}`,
        message: "extra completed output entry rejected",
        actual: key,
      });
    }
  }

  for (const fileName of FIXED_SEVEN_OUTPUT_FILE_NAMES) {
    if (typeof output[fileName] !== "string") {
      issues.push({
        path: `/${fileName}`,
        message: "missing fixed-seven output content",
        expected: fileName,
      });
    }
  }

  if (keys.length !== FIXED_SEVEN_OUTPUT_FILE_COUNT) {
    issues.push({
      path: "/",
      message: "completed run must contain exactly the fixed seven outputs",
      actual: String(keys.length),
      expected: String(FIXED_SEVEN_OUTPUT_FILE_COUNT),
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  return success(output as FixedSevenRunOutput);
}

export function publishSprint2FixedSevenRun(
  store: Sprint2FixedSevenPublicationStore,
  input: PublishFixedSevenRunInput,
): PublishFixedSevenRunOutcome {
  return store.publish(input);
}

export function listCompletedFixedSevenRuns(
  store: Sprint2FixedSevenPublicationStore,
): readonly string[] {
  return store.listCompletedRunIds();
}

export function listStagingFixedSevenRuns(
  store: Sprint2FixedSevenPublicationStore,
): readonly string[] {
  return store.listStagingRunIds();
}
