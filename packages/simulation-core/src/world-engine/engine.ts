import type { InitialWorldSnapshot } from "../initial-world/types.js";
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { convertWorldCalendarTransitions } from "../events/from-transitions.js";
import type { EventEnvelope } from "../events/types.js";
import type { KnownEntityIds } from "../events/validate.js";
import { validateEventSequence } from "../events/validate.js";
import { stepOneWeek } from "../world-calendar.js";
import { clonePerson, cloneWorldEngineState, cloneWorldEngineStateUnchecked } from "./clone.js";
import { WorldEngineError, toWorldEngineError } from "./errors.js";
import { freezeDeepTrusted } from "./freeze.js";
import { assertProcessorDidNotMutateFixedFields, extractOrderedEntityIds } from "./ids-guard.js";
import {
  createInitialRuntime,
  exportRuntimeState,
  fixProcessorList,
  restoreRuntime,
  type FixedProcessor,
} from "./processor-runtime.js";
import {
  assertPlainObjectInput,
  readEnumerableDataProperty,
  readOptionalEnumerableDataProperty,
} from "./safe-access.js";
import { assertDataArray } from "./schema.js";
import { validateProcessorReturnedState, validateWorldEngineState } from "./validate-state.js";
import type {
  ProcessorRuntimeState,
  RunWorldOneWeekInput,
  RunWorldWeeksInput,
  RunWorldYearsInput,
  WorldEngineRunResult,
  WorldEngineState,
  YearStatsFinalizedNotice,
} from "./types.js";

const WEEKS_PER_YEAR = 48;
const canonicalCache = new WeakMap<object, string>();

type ParsedRunInput = {
  state: WorldEngineState;
  processors: FixedProcessor[];
  weeks: number;
  startSequence: number;
  processorRuntimeState?: ProcessorRuntimeState;
};

/**
 * Build engine state from an initial world snapshot.
 * Deep-copies the snapshot so later mutations do not touch the input.
 */
export function createWorldEngineState(snapshot: InitialWorldSnapshot): WorldEngineState {
  try {
    validateWorldEngineState(snapshot);
    const state = cloneWorldEngineStateUnchecked(snapshot);
    validateWorldEngineState(state);
    return state;
  } catch (error) {
    throw toWorldEngineError(error, "createWorldEngineState failed", { field: "state" });
  }
}

export function runWorldOneWeek(input: RunWorldOneWeekInput): WorldEngineRunResult {
  try {
    return executeWorldWeeks(parseRunOneWeekInput(input));
  } catch (error) {
    throw toWorldEngineError(error, "runWorldOneWeek failed");
  }
}

export function runWorldYears(input: RunWorldYearsInput): WorldEngineRunResult {
  try {
    return executeWorldWeeks(parseRunYearsInput(input));
  } catch (error) {
    throw toWorldEngineError(error, "runWorldYears failed");
  }
}

export function runWorldWeeks(input: RunWorldWeeksInput): WorldEngineRunResult {
  try {
    return executeWorldWeeks(parseRunWeeksInput(input));
  } catch (error) {
    throw toWorldEngineError(error, "runWorldWeeks failed");
  }
}

function isolateValidatedState(state: unknown): WorldEngineState {
  // validate → typed clone → revalidate (public clone API contract)
  return cloneWorldEngineState(state);
}

function parseRunWeeksInput(input: unknown): ParsedRunInput {
  try {
    assertPlainObjectInput(input, "input");
    const stateValue = readEnumerableDataProperty(input, "state", { field: "state" });
    const isolatedState = isolateValidatedState(stateValue);

    const processorsValue = readEnumerableDataProperty(input, "processors", {
      field: "processors",
    });
    assertDataArray(processorsValue, "processors");
    const weeks = readEnumerableDataProperty(input, "weeks", { field: "weeks" });
    assertNonNegativeSafeInteger(weeks, "weeks");
    const startSequence = readEnumerableDataProperty(input, "startSequence", {
      field: "startSequence",
    });
    assertNonNegativeSafeInteger(startSequence, "startSequence");

    const processors = fixProcessorList(processorsValue);
    const parsed: ParsedRunInput = {
      state: isolatedState,
      processors,
      weeks,
      startSequence,
    };
    const runtime = readOptionalEnumerableDataProperty(input, "processorRuntimeState", {
      field: "processorRuntimeState",
    });
    if (runtime !== undefined) {
      parsed.processorRuntimeState = runtime as ProcessorRuntimeState;
    }
    return parsed;
  } catch (error) {
    throw toWorldEngineError(error, "invalid runWorldWeeks input");
  }
}

function parseRunOneWeekInput(input: unknown): ParsedRunInput {
  try {
    assertPlainObjectInput(input, "input");
    const stateValue = readEnumerableDataProperty(input, "state", { field: "state" });
    const isolatedState = isolateValidatedState(stateValue);

    const processorsValue = readEnumerableDataProperty(input, "processors", {
      field: "processors",
    });
    assertDataArray(processorsValue, "processors");
    const startSequence = readEnumerableDataProperty(input, "startSequence", {
      field: "startSequence",
    });
    assertNonNegativeSafeInteger(startSequence, "startSequence");

    const processors = fixProcessorList(processorsValue);
    const parsed: ParsedRunInput = {
      state: isolatedState,
      processors,
      weeks: 1,
      startSequence,
    };
    const runtime = readOptionalEnumerableDataProperty(input, "processorRuntimeState", {
      field: "processorRuntimeState",
    });
    if (runtime !== undefined) {
      parsed.processorRuntimeState = runtime as ProcessorRuntimeState;
    }
    return parsed;
  } catch (error) {
    throw toWorldEngineError(error, "invalid runWorldOneWeek input");
  }
}

function parseRunYearsInput(input: unknown): ParsedRunInput {
  try {
    assertPlainObjectInput(input, "input");
    const stateValue = readEnumerableDataProperty(input, "state", { field: "state" });
    const isolatedState = isolateValidatedState(stateValue);

    const processorsValue = readEnumerableDataProperty(input, "processors", {
      field: "processors",
    });
    assertDataArray(processorsValue, "processors");
    const years = readEnumerableDataProperty(input, "years", { field: "years" });
    assertNonNegativeSafeInteger(years, "years");
    const startSequence = readEnumerableDataProperty(input, "startSequence", {
      field: "startSequence",
    });
    assertNonNegativeSafeInteger(startSequence, "startSequence");

    const weeks = years * WEEKS_PER_YEAR;
    if (!Number.isSafeInteger(weeks)) {
      throw new WorldEngineError("years * 48 must be a safe integer", {
        years,
        field: "years",
        detail: String(weeks),
      });
    }

    const processors = fixProcessorList(processorsValue);
    const parsed: ParsedRunInput = {
      state: isolatedState,
      processors,
      weeks,
      startSequence,
    };
    const runtime = readOptionalEnumerableDataProperty(input, "processorRuntimeState", {
      field: "processorRuntimeState",
    });
    if (runtime !== undefined) {
      parsed.processorRuntimeState = runtime as ProcessorRuntimeState;
    }
    return parsed;
  } catch (error) {
    throw toWorldEngineError(error, "invalid runWorldYears input");
  }
}

function executeWorldWeeks(input: ParsedRunInput): WorldEngineRunResult {
  let processors: FixedProcessor[];
  let processorOrder: string[];
  let seed: number;
  let prepared: ReturnType<typeof createInitialRuntime>;
  try {
    processors = input.processors;
    processorOrder = processors.map((processor) => processor.processorId);
    seed = input.state.seed;
    prepared =
      input.processorRuntimeState !== undefined
        ? restoreRuntime(input.processorRuntimeState, processorOrder, seed)
        : createInitialRuntime(seed, processorOrder);
  } catch (error) {
    throw toWorldEngineError(error, "failed to prepare world engine runtime");
  }

  const rngs = prepared.rngs;

  if (input.weeks === 0) {
    let resultState: WorldEngineState;
    try {
      resultState = cloneWorldEngineStateUnchecked(input.state);
      validateWorldEngineState(resultState);
    } catch (error) {
      throw toWorldEngineError(error, "failed to create zero-week result state", {
        field: "state",
      });
    }
    try {
      validateEventSequence([], {
        expectedStartSequence: input.startSequence,
        knownIds: knownIdsFromState(resultState),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`event sequence validation failed: ${message}`, {
        startSequence: input.startSequence,
        detail: message,
      });
    }
    return {
      state: resultState,
      events: [],
      yearStatsFinalizedNotices: [],
      nextSequence: input.startSequence,
      processorRuntimeState: exportRuntimeState(processorOrder, rngs),
      weeksExecuted: 0,
      processorOrder: [...processorOrder],
    };
  }

  // Working state is an isolated deep clone of the caller input, then frozen so
  // processors cannot mutate it in place. Processors receive this frozen clone.
  let state: WorldEngineState;
  try {
    // parse already produced a validated isolate; revalidate then freeze it.
    validateWorldEngineState(input.state);
    state = freezeDeepTrusted(input.state);
  } catch (error) {
    throw toWorldEngineError(error, "failed to create working world engine state", {
      field: "state",
    });
  }
  let sequence = input.startSequence;
  const allEvents: EventEnvelope[] = [];
  const notices: YearStatsFinalizedNotice[] = [];
  const runStartSequence = input.startSequence;

  for (let weekIndex = 0; weekIndex < input.weeks; weekIndex += 1) {
    const weekContext = {
      absoluteWeek: state.worldDate.absoluteWeek,
      worldDate: state.worldDate,
      startSequence: sequence,
    };

    for (let p = 0; p < processors.length; p += 1) {
      const processor = processors[p]!;
      const rng = rngs[p]!;
      const before = state;
      const inputState = state;
      const inputCanonical = safeCanonicalJson(
        inputState,
        processor.processorId,
        weekContext,
        "processor input",
      );
      let after: unknown;
      try {
        after = processor.process({ state: inputState, rng });
      } catch (error) {
        if (isFrozenMutationError(error)) {
          throw new WorldEngineError("processor must not mutate its input state", {
            processorId: processor.processorId,
            ...weekContext,
            field: "state",
          });
        }
        throw withProcessorContext(error, processor.processorId, weekContext);
      }

      try {
        if (after === null || after === undefined || Array.isArray(after) || isThenable(after)) {
          throw new WorldEngineError("processor must return a WorldEngineState object", {
            processorId: processor.processorId,
            ...weekContext,
            field: "state",
            detail: describeReturn(after),
          });
        }
        assertInputStateUnchanged(inputState, inputCanonical, processor.processorId, weekContext);
        validateProcessorReturnedState(after, before);
        assertProcessorDidNotMutateFixedFields(before, after, processor.processorId, weekContext);
        if (after === inputState) {
          state = inputState;
        } else {
          const next = cloneWorldEngineStateUnchecked(after);
          // `after` was fully validated above; freeze only the isolated clone.
          state = freezeDeepTrusted(next);
        }
      } catch (error) {
        throw withProcessorContext(error, processor.processorId, weekContext);
      }
    }

    let calendarResult;
    try {
      calendarResult = stepOneWeek({
        worldDate: state.worldDate,
        persons: state.persons,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`calendar step failed: ${message}`, {
        ...weekContext,
        detail: message,
      });
    }

    const nextSequenceCandidate = sequence + calendarResult.transitions.length;
    if (!Number.isSafeInteger(nextSequenceCandidate) || nextSequenceCandidate < 0) {
      throw new WorldEngineError("event sequence would exceed safe integer range", {
        ...weekContext,
        startSequence: sequence,
        detail: String(nextSequenceCandidate),
      });
    }

    let weekEvents: EventEnvelope[];
    try {
      weekEvents = convertWorldCalendarTransitions({
        transitions: calendarResult.transitions,
        simulationId: state.simulationId,
        worldDate: calendarResult.state.worldDate,
        startSequence: sequence,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`event conversion failed: ${message}`, {
        ...weekContext,
        detail: message,
      });
    }

    try {
      validateEventSequence(weekEvents, {
        expectedStartSequence: sequence,
        knownIds: knownIdsFromState(state),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`event sequence validation failed: ${message}`, {
        ...weekContext,
        detail: message,
      });
    }

    for (const event of weekEvents) {
      allEvents.push(event);
      const notice = noticeFromEvent(event);
      if (notice !== undefined) {
        notices.push(notice);
      }
    }

    sequence = nextSequenceCandidate;

    try {
      // Isolate from input via initial clone; week-to-week only replace
      // calendar-owned fields. Unchanged trusted entity graphs stay shared.
      const candidate: WorldEngineState = {
        ...state,
        worldDate: { ...calendarResult.state.worldDate },
        persons: calendarResult.state.persons.map((person) =>
          Object.isFrozen(person) ? person : clonePerson(person),
        ),
      };
      validateWorldEngineState(candidate);
      state = freezeDeepTrusted(candidate);
    } catch (error) {
      if (error instanceof WorldEngineError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new WorldEngineError(`calendar state validation failed: ${message}`, {
        ...weekContext,
        detail: message,
      });
    }
  }

  validateWorldEngineState(state);
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    throw new WorldEngineError("nextSequence must be a non-negative safe integer", {
      startSequence: sequence,
      field: "nextSequence",
    });
  }

  try {
    validateEventSequence(allEvents, {
      expectedStartSequence: runStartSequence,
      knownIds: knownIdsFromState(state),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`aggregated event sequence validation failed: ${message}`, {
      startSequence: runStartSequence,
      detail: message,
    });
  }

  return {
    state,
    events: allEvents,
    yearStatsFinalizedNotices: notices,
    nextSequence: sequence,
    processorRuntimeState: exportRuntimeState(processorOrder, rngs),
    weeksExecuted: input.weeks,
    processorOrder: [...processorOrder],
  };
}

function knownIdsFromState(state: WorldEngineState): KnownEntityIds {
  const ids = extractOrderedEntityIds(state);
  return {
    personIds: ids.personIds,
    familyIds: ids.familyIds,
    lineageIds: ids.lineageIds,
    relationshipIds: ids.relationshipIds,
  };
}

function noticeFromEvent(event: EventEnvelope): YearStatsFinalizedNotice | undefined {
  if (event.eventType !== "world.year_stats_finalized") {
    return undefined;
  }
  return {
    worldYear: event.payload.worldYear,
    worldDate: event.worldDate,
    eventId: event.eventId,
    sequence: event.sequence,
  };
}

type WeekContext = {
  absoluteWeek: number;
  worldDate: WorldEngineState["worldDate"];
  startSequence: number;
};

function safeCanonicalJson(
  value: unknown,
  processorId: string,
  weekContext: WeekContext,
  field: string,
): string {
  try {
    return serializeCanonicalTrustingFrozen(value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`${field} canonicalization failed`, {
      processorId,
      ...weekContext,
      field,
      detail,
    });
  }
}

function serializeCanonicalTrustingFrozen(value: unknown): string {
  if (value === null) {
    return "null";
  }
  switch (typeof value) {
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw new Error(`canonical JSON rejects non-finite number: ${String(value)}`);
      }
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case "undefined":
    case "function":
    case "symbol":
    case "bigint":
      throw new Error(`canonical JSON rejects value of type ${typeof value}`);
    case "object":
      break;
  }
  if (Object.isFrozen(value)) {
    const cached = canonicalCache.get(value);
    if (cached !== undefined) {
      return cached;
    }
  }
  if (Array.isArray(value)) {
    const canonical = `[${value.map(serializeCanonicalTrustingFrozen).join(",")}]`;
    if (Object.isFrozen(value)) {
      canonicalCache.set(value, canonical);
    }
    return canonical;
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort(compareUnicodeCodePoints);
  const canonical = `{${sortedKeys
    .map((key) => `${JSON.stringify(key)}:${serializeCanonicalTrustingFrozen(record[key])}`)
    .join(",")}}`;
  if (Object.isFrozen(value)) {
    canonicalCache.set(value, canonical);
  }
  return canonical;
}

function assertInputStateUnchanged(
  inputState: WorldEngineState,
  inputCanonical: string,
  processorId: string,
  weekContext: WeekContext,
): void {
  const afterCanonical = safeCanonicalJson(inputState, processorId, weekContext, "processor input");
  if (afterCanonical !== inputCanonical) {
    throw new WorldEngineError("processor must not mutate its input state", {
      processorId,
      ...weekContext,
      field: "state",
    });
  }
}

function withProcessorContext(
  error: unknown,
  processorId: string,
  weekContext: WeekContext,
): WorldEngineError {
  if (error instanceof WorldEngineError) {
    return new WorldEngineError(error.baseMessage, {
      ...weekContext,
      ...error.context,
      processorId: error.context.processorId ?? processorId,
    });
  }
  const detail = error instanceof Error ? error.message : String(error);
  return new WorldEngineError(`processor.process failed: ${detail}`, {
    processorId,
    ...weekContext,
    detail,
  });
}

function isFrozenMutationError(error: unknown): boolean {
  return (
    error instanceof TypeError &&
    /Cannot assign to read only property|Cannot add property|object is not extensible|Cannot redefine property/i.test(
      error.message,
    )
  );
}

function isThenable(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

function describeReturn(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (isThenable(value)) {
    return "Promise";
  }
  return typeof value;
}

function assertNonNegativeSafeInteger(value: unknown, name: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    const context: {
      field: string;
      detail: string;
      weeks?: number;
      years?: number;
      startSequence?: number;
    } = {
      field: name,
      detail: String(value),
    };
    if (name === "weeks" && typeof value === "number") {
      context.weeks = value;
    } else if (name === "years" && typeof value === "number") {
      context.years = value;
    } else if (name === "startSequence" && typeof value === "number") {
      context.startSequence = value;
    }
    throw new WorldEngineError(`${name} must be a non-negative safe integer`, context);
  }
}
