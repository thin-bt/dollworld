/**
 * Year-start transaction aggregate component hashing (CAL-JAN-SYNC 0.2.4 §2.4).
 * postTransactionAggregateHash uses the sentinel method: the receipt field is
 * temporarily 64 zeros while hashing processorRuntimeState, then replaced.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { ProcessorRuntimeState } from "../world-engine/types.js";
import type { WorldEngineState } from "../world-engine/types.js";
import { EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1 } from "./event-envelope-sprint1.js";
import type { MatchIdGeneratorState } from "./match-id-generator.js";
import { computeMatchIdGeneratorStateHash } from "./match-id-generator.js";
import { computeSeededRngStateHash } from "./start-battle-runtime-transition.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import {
  WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION,
  computeWorldYearStartTransactionAggregateHash,
  type WorldYearStartTransactionAggregate,
} from "./world-year-start-runtime-state.js";

export const YEAR_START_AGGREGATE_SENTINEL_HASH = "0".repeat(64);

export type YearStartAggregateComponentInput = {
  worldState: WorldEngineState;
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
  eventAllocationNextSequence: number;
  /** Sprint1 EventEnvelope[] (schema 0.2.0) or compatible canonical stream rows. */
  eventStream: readonly unknown[];
  processorRuntimeStates: ProcessorRuntimeState;
};

export type YearStartAggregateHashes = {
  aggregate: WorldYearStartTransactionAggregate;
  aggregateHash: string;
  worldRngStateHash: string;
};

function hashCanonical(
  provider: Sha256Provider,
  value: unknown,
  path: string,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(value), path);
}

export function computeWorldStateComponentHash(
  worldState: WorldEngineState,
  provider: Sha256Provider,
): ValidationResult<string> {
  return hashCanonical(provider, worldState, "/worldStateHash");
}

export function computeEventAllocationStateHash(
  nextSequence: number,
  provider: Sha256Provider,
): ValidationResult<string> {
  return hashCanonical(
    provider,
    {
      eventEnvelopeSchemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
      nextSequence,
    },
    "/eventAllocationStateHash",
  );
}

export function computeEventStreamHash(
  eventStream: readonly unknown[],
  provider: Sha256Provider,
): ValidationResult<string> {
  const sorted = [...eventStream].sort((a, b) => {
    const seqA =
      typeof a === "object" && a !== null && "sequence" in a && typeof a.sequence === "number"
        ? a.sequence
        : Number.NaN;
    const seqB =
      typeof b === "object" && b !== null && "sequence" in b && typeof b.sequence === "number"
        ? b.sequence
        : Number.NaN;
    return seqA - seqB;
  });
  return hashCanonical(provider, sorted, "/eventStreamHash");
}

export function computeIdGeneratorStatesHash(
  matchIdGeneratorState: MatchIdGeneratorState,
  provider: Sha256Provider,
): ValidationResult<string> {
  // EventId is derived from sequence; only MatchId (and future non-EventId generators).
  // Reject non-canonical MatchId state via existing hash helper before embedding.
  const matchHash = computeMatchIdGeneratorStateHash(matchIdGeneratorState, provider);
  if (!matchHash.ok) {
    return matchHash;
  }
  void matchHash;
  const entries = [{ generatorId: "match", state: matchIdGeneratorState }].sort((a, b) =>
    a.generatorId < b.generatorId ? -1 : a.generatorId > b.generatorId ? 1 : 0,
  );
  return hashCanonical(provider, entries, "/idGeneratorStatesHash");
}

export function computeProcessorRuntimeStateHash(
  processorRuntimeStates: ProcessorRuntimeState,
  provider: Sha256Provider,
): ValidationResult<string> {
  return hashCanonical(provider, processorRuntimeStates, "/processorRuntimeStateHash");
}

export function buildWorldYearStartTransactionAggregate(
  input: YearStartAggregateComponentInput,
  provider: Sha256Provider,
): ValidationResult<YearStartAggregateHashes> {
  const worldStateHash = computeWorldStateComponentHash(input.worldState, provider);
  if (!worldStateHash.ok) {
    return worldStateHash;
  }
  const worldRngStateHash = computeSeededRngStateHash(input.worldRngState, provider);
  if (!worldRngStateHash.ok) {
    return worldRngStateHash;
  }
  const idGeneratorStatesHash = computeIdGeneratorStatesHash(input.matchIdGeneratorState, provider);
  if (!idGeneratorStatesHash.ok) {
    return idGeneratorStatesHash;
  }
  const eventAllocationStateHash = computeEventAllocationStateHash(
    input.eventAllocationNextSequence,
    provider,
  );
  if (!eventAllocationStateHash.ok) {
    return eventAllocationStateHash;
  }
  const eventStreamHash = computeEventStreamHash(input.eventStream, provider);
  if (!eventStreamHash.ok) {
    return eventStreamHash;
  }
  const processorRuntimeStateHash = computeProcessorRuntimeStateHash(
    input.processorRuntimeStates,
    provider,
  );
  if (!processorRuntimeStateHash.ok) {
    return processorRuntimeStateHash;
  }

  const aggregate: WorldYearStartTransactionAggregate = {
    schemaVersion: WORLD_YEAR_START_TRANSACTION_AGGREGATE_SCHEMA_VERSION,
    worldStateHash: worldStateHash.value,
    worldRngStateHash: worldRngStateHash.value,
    idGeneratorStatesHash: idGeneratorStatesHash.value,
    eventAllocationStateHash: eventAllocationStateHash.value,
    eventStreamHash: eventStreamHash.value,
    processorRuntimeStateHash: processorRuntimeStateHash.value,
  };

  const aggregateHash = computeWorldYearStartTransactionAggregateHash(aggregate, provider);
  if (!aggregateHash.ok) {
    return aggregateHash;
  }

  return success({
    aggregate,
    aggregateHash: aggregateHash.value,
    worldRngStateHash: worldRngStateHash.value,
  });
}

/**
 * Sentinel recompute for receipt.postTransactionAggregateHash (0.2.4 §2.4).
 * `processorRuntimeStates` must already contain the draft receipt whose
 * postTransactionAggregateHash field is exactly 64 zeros.
 */
export function finalizePostTransactionAggregateHash(input: {
  provider: Sha256Provider;
  worldState: WorldEngineState;
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
  eventAllocationNextSequence: number;
  eventStreamIncludingYearStartPrefix: readonly unknown[];
  processorRuntimeStatesWithSentinelReceipt: ProcessorRuntimeState;
}): ValidationResult<{
  postTransactionAggregateHash: string;
  postTransactionRngStateHash: string;
}> {
  const built = buildWorldYearStartTransactionAggregate(
    {
      worldState: input.worldState,
      worldRngState: input.worldRngState,
      matchIdGeneratorState: input.matchIdGeneratorState,
      eventAllocationNextSequence: input.eventAllocationNextSequence,
      eventStream: input.eventStreamIncludingYearStartPrefix,
      processorRuntimeStates: input.processorRuntimeStatesWithSentinelReceipt,
    },
    input.provider,
  );
  if (!built.ok) {
    return built;
  }
  if (built.value.aggregateHash === YEAR_START_AGGREGATE_SENTINEL_HASH) {
    return failure([
      {
        path: "/postTransactionAggregateHash",
        message: "sentinel recompute must not yield the all-zero sentinel digest",
      },
    ]);
  }
  return success({
    postTransactionAggregateHash: built.value.aggregateHash,
    postTransactionRngStateHash: built.value.worldRngStateHash,
  });
}
