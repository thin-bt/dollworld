import {
  createSeededRng,
  deriveSeed,
  importSeededRng,
  RNG_ALGORITHM_VERSION,
  type SeededRng,
  type SeededRngState,
} from "../rng.js";
import { WorldEngineError, toWorldEngineError } from "./errors.js";
import { readEnumerableDataProperty } from "./safe-access.js";
import { assertDataArray, assertDataRecord, dataValue, isPlainObject, setFrom } from "./schema.js";
import type { ProcessorRuntimeState, WorldProcessor } from "./types.js";

const UINT32_MAX = 4294967295;

export type FixedProcessor = {
  processorId: string;
  process: WorldProcessor["process"];
};

function assertUint32Field(
  value: unknown,
  field: string,
  processorId?: string,
): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new WorldEngineError(`${field} must be a uint32`, {
      ...(processorId !== undefined ? { processorId } : {}),
      field,
      detail: String(value),
    });
  }
}

/** Validate a SeededRngState snapshot; never trust exportState blindly. */
export function assertValidSeededRngState(state: unknown, processorId?: string): SeededRngState {
  if (!isPlainObject(state)) {
    throw new WorldEngineError("RNG state must be a plain object", {
      ...(processorId !== undefined ? { processorId } : {}),
      field: "rngStates",
    });
  }
  if (state.algorithmVersion !== RNG_ALGORITHM_VERSION) {
    throw new WorldEngineError("unsupported RNG algorithmVersion", {
      ...(processorId !== undefined ? { processorId } : {}),
      field: "algorithmVersion",
      detail: String(state.algorithmVersion),
    });
  }
  assertUint32Field(state.s0, "s0", processorId);
  assertUint32Field(state.s1, "s1", processorId);
  assertUint32Field(state.s2, "s2", processorId);
  assertUint32Field(state.s3, "s3", processorId);
  if (state.s0 === 0 && state.s1 === 0 && state.s2 === 0 && state.s3 === 0) {
    throw new WorldEngineError("RNG state must not be all zero", {
      ...(processorId !== undefined ? { processorId } : {}),
      field: "rngStates",
    });
  }
  return {
    algorithmVersion: RNG_ALGORITHM_VERSION,
    s0: state.s0,
    s1: state.s1,
    s2: state.s2,
    s3: state.s3,
  };
}

/**
 * Freeze a facade RNG object and reject mutations as WorldEngineError(field=rng).
 * Underlying SeededRng closure state remains mutable for normal consumption.
 */
export function sealProcessorRng(rng: SeededRng, processorId: string): SeededRng {
  const facade: SeededRng = {
    nextUint32: () => rng.nextUint32(),
    nextFloat: () => rng.nextFloat(),
    nextInt: (minInclusive, maxExclusive) => rng.nextInt(minInclusive, maxExclusive),
    chance: (probability) => rng.chance(probability),
    choose: (items) => rng.choose(items),
    shuffle: (items) => rng.shuffle(items),
    sampleWithoutReplacement: (items, count) => rng.sampleWithoutReplacement(items, count),
    exportState: () => rng.exportState(),
  };
  Object.freeze(facade);
  const reject = (detail: string): never => {
    throw new WorldEngineError("processor must not mutate rng", {
      processorId,
      field: "rng",
      detail,
    });
  };
  return new Proxy(facade, {
    set(_target, prop): boolean {
      return reject(String(prop));
    },
    defineProperty(_target, prop): boolean {
      return reject(String(prop));
    },
    deleteProperty(_target, prop): boolean {
      return reject(String(prop));
    },
  });
}

export function processorRngLabel(processorId: string): string {
  if (typeof processorId !== "string") {
    throw new WorldEngineError("processorId must be a non-empty printable ASCII string", {
      field: "processorId",
      detail: String(processorId),
    });
  }
  return `world-engine/processor/${processorId}`;
}

/**
 * Snapshot the processor list at run start so later mutation of the input array
 * or processor objects cannot change this execution.
 */
export function fixProcessorList(processors: unknown): FixedProcessor[] {
  try {
    assertDataArray(processors, "processors");

    const fixed: FixedProcessor[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < processors.length; i += 1) {
      const processor = processors[i];
      if (processor === undefined || typeof processor !== "object" || processor === null) {
        throw new WorldEngineError("processor entry must be an object", {
          field: "processors",
          index: i,
          detail: `index=${String(i)}`,
        });
      }
      const record = processor as object;
      const processorIdValue = readEnumerableDataProperty(record, "processorId", {
        field: "processorId",
        index: i,
      });
      if (typeof processorIdValue !== "string") {
        throw new WorldEngineError("processorId must be a non-empty printable ASCII string", {
          field: "processorId",
          index: i,
          detail: String(processorIdValue),
        });
      }
      const processorId = processorIdValue;
      assertPrintableAsciiProcessorId(processorId);
      if (seen.has(processorId)) {
        throw new WorldEngineError("duplicate processorId is not allowed", {
          processorId,
          field: "processorId",
          index: i,
        });
      }
      const processValue = readEnumerableDataProperty(record, "process", {
        field: "process",
        processorId,
        index: i,
      });
      if (typeof processValue !== "function") {
        throw new WorldEngineError("processor.process must be a function", {
          processorId,
          field: "process",
          index: i,
        });
      }
      const processFn = processValue as WorldProcessor["process"];
      // Freeze a private host so this.processorId stays at the start-time value.
      const frozenHost = Object.freeze({
        processorId,
        process: processFn,
      });
      seen.add(processorId);
      fixed.push({
        processorId,
        process: processFn.bind(frozenHost),
      });
    }

    return fixed;
  } catch (error) {
    throw toWorldEngineError(error, "failed to fix processor list", { field: "processors" });
  }
}

export function assertValidProcessorIds(processors: unknown): string[] {
  return fixProcessorList(processors).map((processor) => processor.processorId);
}

export function createInitialRuntime(
  seed: number,
  processorOrder: readonly string[],
): { rngs: SeededRng[]; runtimeState: ProcessorRuntimeState } {
  assertSeed(seed);
  if (!Array.isArray(processorOrder)) {
    throw new WorldEngineError("processorOrder must be an array", { field: "processorOrder" });
  }
  const order = [...processorOrder];
  const rngs: SeededRng[] = [];
  const rngStates: ProcessorRuntimeState["rngStates"] = [];

  for (const processorId of order) {
    assertPrintableAsciiProcessorId(processorId);
    const label = processorRngLabel(processorId);
    const derived = deriveSeed(seed, label);
    const rng = sealProcessorRng(createSeededRng(derived), processorId);
    rngs.push(rng);
    rngStates.push({
      processorId,
      state: assertValidSeededRngState(rng.exportState(), processorId),
    });
  }

  return {
    rngs,
    runtimeState: {
      processorOrder: [...order],
      rngStates,
    },
  };
}

const RUNTIME_KEYS = setFrom(["processorOrder", "rngStates"]);
const ENTRY_KEYS = setFrom(["processorId", "state"]);
const RNG_STATE_KEYS = setFrom(["algorithmVersion", "s0", "s1", "s2", "s3"]);

/**
 * Validate ProcessorRuntimeState via descriptors only, then return a fresh clone.
 */
export function validateAndCloneProcessorRuntimeState(
  runtimeState: unknown,
  expectedProcessorOrder: readonly string[],
): ProcessorRuntimeState {
  if (!isPlainObject(runtimeState)) {
    throw new WorldEngineError("processorRuntimeState must be a plain object", {
      field: "processorRuntimeState",
    });
  }
  assertDataRecord(runtimeState, RUNTIME_KEYS, "processorRuntimeState");

  const processorOrderValue = dataValue(runtimeState, "processorOrder", "processorRuntimeState");
  assertDataArray(processorOrderValue, "processorRuntimeState.processorOrder");
  const processorOrder: string[] = [];
  for (let i = 0; i < processorOrderValue.length; i += 1) {
    const id = processorOrderValue[i];
    if (typeof id !== "string") {
      throw new WorldEngineError("processorOrder entries must be strings", {
        field: "processorOrder",
        detail: `index=${String(i)}`,
      });
    }
    processorOrder.push(id);
  }

  if (processorOrder.length !== expectedProcessorOrder.length) {
    throw new WorldEngineError("processorRuntimeState processor count mismatch", {
      field: "processorOrder",
      detail: `expected=${String(expectedProcessorOrder.length)} got=${String(processorOrder.length)}`,
    });
  }
  for (let i = 0; i < expectedProcessorOrder.length; i += 1) {
    const expectedId = expectedProcessorOrder[i]!;
    if (processorOrder[i] !== expectedId) {
      throw new WorldEngineError("processorRuntimeState processorOrder mismatch", {
        processorId: expectedId,
        field: "processorOrder",
        detail: `index=${String(i)} expected=${expectedId} got=${String(processorOrder[i])}`,
      });
    }
  }

  const rngStatesValue = dataValue(runtimeState, "rngStates", "processorRuntimeState");
  assertDataArray(rngStatesValue, "processorRuntimeState.rngStates");
  if (rngStatesValue.length !== expectedProcessorOrder.length) {
    throw new WorldEngineError("processorRuntimeState rngStates count mismatch", {
      field: "rngStates",
      detail: `expected=${String(expectedProcessorOrder.length)} got=${String(rngStatesValue.length)}`,
    });
  }

  const rngStates: ProcessorRuntimeState["rngStates"] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rngStatesValue.length; i += 1) {
    const entry = rngStatesValue[i];
    if (!isPlainObject(entry)) {
      throw new WorldEngineError("processorRuntimeState rngStates entry must be an object", {
        field: "rngStates",
      });
    }
    assertDataRecord(entry, ENTRY_KEYS, `processorRuntimeState.rngStates[${String(i)}]`);
    const processorId = dataValue(entry, "processorId", `rngStates[${String(i)}]`);
    if (typeof processorId !== "string") {
      throw new WorldEngineError("rngStates.processorId must be a string", { field: "rngStates" });
    }
    if (processorId !== expectedProcessorOrder[i]) {
      throw new WorldEngineError("processorRuntimeState rngStates order mismatch", {
        processorId,
        field: "rngStates",
        detail: `expected=${expectedProcessorOrder[i]} got=${processorId}`,
      });
    }
    if (seen.has(processorId)) {
      throw new WorldEngineError("processorRuntimeState has duplicate processorId", {
        processorId,
        field: "rngStates",
      });
    }
    seen.add(processorId);

    const stateValue = dataValue(entry, "state", `rngStates[${String(i)}]`);
    if (!isPlainObject(stateValue)) {
      throw new WorldEngineError("RNG state must be a plain object", { field: "rngStates" });
    }
    assertDataRecord(stateValue, RNG_STATE_KEYS, `rngStates[${String(i)}].state`);
    const snapshot = {
      algorithmVersion: dataValue(stateValue, "algorithmVersion", "algorithmVersion"),
      s0: dataValue(stateValue, "s0", "s0"),
      s1: dataValue(stateValue, "s1", "s1"),
      s2: dataValue(stateValue, "s2", "s2"),
      s3: dataValue(stateValue, "s3", "s3"),
    };
    const validated = assertValidSeededRngState(snapshot, processorId);
    rngStates.push({
      processorId,
      state: { ...validated },
    });
  }

  for (const expectedId of expectedProcessorOrder) {
    if (!seen.has(expectedId)) {
      throw new WorldEngineError("processorRuntimeState missing processorId", {
        processorId: expectedId,
        field: "rngStates",
      });
    }
  }

  return {
    processorOrder: [...processorOrder],
    rngStates,
  };
}

export function restoreRuntime(
  runtimeState: unknown,
  processorOrder: readonly string[],
  seed: number,
): { rngs: SeededRng[]; runtimeState: ProcessorRuntimeState } {
  assertSeed(seed);
  if (!Array.isArray(processorOrder)) {
    throw new WorldEngineError("processorOrder must be an array", { field: "processorOrder" });
  }
  const order = [...processorOrder];
  const cloned = validateAndCloneProcessorRuntimeState(runtimeState, order);
  const rngs: SeededRng[] = [];
  const rngStates: ProcessorRuntimeState["rngStates"] = [];

  for (let i = 0; i < order.length; i += 1) {
    const processorId = order[i]!;
    const entry = cloned.rngStates[i]!;
    let rng: SeededRng;
    try {
      rng = sealProcessorRng(importSeededRng(cloneRngState(entry.state)), processorId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`invalid processor RNG state: ${message}`, {
        processorId,
        field: "rngStates",
        detail: message,
      });
    }
    rngs.push(rng);
    rngStates.push({
      processorId,
      state: assertValidSeededRngState(rng.exportState(), processorId),
    });
  }

  return {
    rngs,
    runtimeState: {
      processorOrder: [...order],
      rngStates,
    },
  };
}

export function exportRuntimeState(processorOrder: unknown, rngs: unknown): ProcessorRuntimeState {
  if (!Array.isArray(processorOrder)) {
    throw new WorldEngineError("processorOrder must be an array", { field: "processorOrder" });
  }
  if (!Array.isArray(rngs)) {
    throw new WorldEngineError("rngs must be an array", { field: "processorRuntimeState" });
  }
  if (processorOrder.length !== rngs.length) {
    throw new WorldEngineError("processorOrder and rngs length mismatch", {
      field: "processorRuntimeState",
      detail: `order=${String(processorOrder.length)} rngs=${String(rngs.length)}`,
    });
  }
  return {
    processorOrder: processorOrder.map((processorId, index) => {
      if (typeof processorId !== "string") {
        throw new WorldEngineError("processorOrder entries must be strings", {
          field: "processorOrder",
          detail: `index=${String(index)}`,
        });
      }
      return processorId;
    }),
    rngStates: processorOrder.map((processorId, index) => {
      const rng = rngs[index] as SeededRng;
      if (rng === null || typeof rng !== "object" || typeof rng.exportState !== "function") {
        throw new WorldEngineError("rngs entry must be a SeededRng", {
          field: "processorRuntimeState",
          detail: `index=${String(index)}`,
        });
      }
      let exported: unknown;
      try {
        exported = rng.exportState();
      } catch (error) {
        throw toWorldEngineError(error, "rng.exportState failed", {
          processorId: processorId as string,
          field: "rng",
        });
      }
      return {
        processorId: processorId as string,
        state: assertValidSeededRngState(exported, processorId as string),
      };
    }),
  };
}

export function cloneRuntimeState(runtimeState: unknown): ProcessorRuntimeState {
  if (runtimeState === null || typeof runtimeState !== "object" || Array.isArray(runtimeState)) {
    throw new WorldEngineError("processorRuntimeState must be an object", {
      field: "processorRuntimeState",
    });
  }
  const typed = runtimeState as ProcessorRuntimeState;
  if (!Array.isArray(typed.processorOrder) || !Array.isArray(typed.rngStates)) {
    throw new WorldEngineError("processorRuntimeState shape is invalid", {
      field: "processorRuntimeState",
    });
  }
  return {
    processorOrder: [...typed.processorOrder],
    rngStates: typed.rngStates.map((entry) => {
      if (entry === null || typeof entry !== "object") {
        throw new WorldEngineError("processorRuntimeState rngStates entry must be an object", {
          field: "rngStates",
        });
      }
      return {
        processorId: entry.processorId,
        state: cloneRngState(entry.state),
      };
    }),
  };
}

function assertPrintableAsciiProcessorId(processorId: string): void {
  if (typeof processorId !== "string" || processorId.length === 0) {
    throw new WorldEngineError("processorId must be a non-empty printable ASCII string", {
      field: "processorId",
      detail: String(processorId),
    });
  }
  for (let i = 0; i < processorId.length; i += 1) {
    const code = processorId.charCodeAt(i);
    if (code < 0x20 || code > 0x7e) {
      throw new WorldEngineError("processorId must be printable ASCII", {
        processorId,
        field: "processorId",
        detail: `non-printable at index ${String(i)}`,
      });
    }
  }
}

function assertSeed(seed: number): void {
  if (typeof seed !== "number" || !Number.isInteger(seed) || seed < 0 || seed > UINT32_MAX) {
    throw new WorldEngineError(`seed must be an integer in 0..${String(UINT32_MAX)}`, {
      field: "seed",
      detail: String(seed),
    });
  }
}

function cloneRngState(state: SeededRngState): SeededRngState {
  if (state === null || typeof state !== "object") {
    throw new WorldEngineError("RNG state must be an object", { field: "rngStates" });
  }
  return {
    algorithmVersion: state.algorithmVersion,
    s0: state.s0,
    s1: state.s1,
    s2: state.s2,
    s3: state.s3,
  };
}
