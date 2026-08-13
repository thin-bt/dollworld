import type { EventEnvelope } from "../events/types.js";
import type { EventId } from "../ids.js";
import type { InitialGenerationSummary, InitialWorldSnapshot } from "../initial-world/types.js";
import type { SeededRng, SeededRngState } from "../rng.js";
import type { WorldDate } from "../world-date.js";

/**
 * Mutable world state for weekly advance.
 * Same fields as InitialWorldSnapshot; generationSummary is a frozen historical record.
 */
export type WorldEngineState = {
  schemaVersion: string;
  simulationSpecVersion: string;
  nameDataVersion: string;
  simulationId: InitialWorldSnapshot["simulationId"];
  worldId: InitialWorldSnapshot["worldId"];
  worldDate: WorldDate;
  configProfileId: string;
  configHash: string;
  seed: number;
  rngAlgorithm: InitialWorldSnapshot["rngAlgorithm"];
  persons: InitialWorldSnapshot["persons"];
  families: InitialWorldSnapshot["families"];
  lineages: InitialWorldSnapshot["lineages"];
  relationships: InitialWorldSnapshot["relationships"];
  generationSummary: InitialGenerationSummary;
};

export type WorldProcessor = {
  readonly processorId: string;
  process(input: { state: WorldEngineState; rng: SeededRng }): WorldEngineState;
};

/**
 * Legacy Sprint0 WorldProcessor contract is unchanged.
 * Sprint1 production `weekly-training` runs via the Sprint1 transactional
 * processor adapter pipeline (outside this interface) — do not force
 * processWeeklyTrainingWeek into WorldProcessor.process.
 */

export type ProcessorRngEntry = {
  processorId: string;
  state: SeededRngState;
};

/**
 * Processor-specific deterministic runtime payload entry.
 * Sprint 0 runs omit `processorSpecificStates` or use an empty array.
 * Sprint 1 weekly-training stores TrainingProcessorRuntimeState here (exact 1 entry).
 */
export type ProcessorSpecificRuntimeEntry = {
  processorId: string;
  specificState: unknown;
};

export type ProcessorRuntimeState = {
  processorOrder: string[];
  rngStates: ProcessorRngEntry[];
  /**
   * Optional for Sprint 0 compatibility (omit or []).
   * Sprint 1 fresh init always creates the weekly-training entry explicitly.
   * Resume must not invent missing specific states.
   */
  processorSpecificStates?: ProcessorSpecificRuntimeEntry[];
};

export type YearStatsFinalizedNotice = {
  worldYear: number;
  worldDate: WorldDate;
  eventId: EventId;
  sequence: number;
};

export type WorldEngineRunResult = {
  state: WorldEngineState;
  events: EventEnvelope[];
  yearStatsFinalizedNotices: YearStatsFinalizedNotice[];
  nextSequence: number;
  processorRuntimeState: ProcessorRuntimeState;
  weeksExecuted: number;
  processorOrder: string[];
};

export type RunWorldWeeksInput = {
  state: WorldEngineState;
  processors: readonly WorldProcessor[];
  weeks: number;
  startSequence: number;
  processorRuntimeState?: ProcessorRuntimeState;
};

export type RunWorldYearsInput = {
  state: WorldEngineState;
  processors: readonly WorldProcessor[];
  years: number;
  startSequence: number;
  processorRuntimeState?: ProcessorRuntimeState;
};

export type RunWorldOneWeekInput = {
  state: WorldEngineState;
  processors: readonly WorldProcessor[];
  startSequence: number;
  processorRuntimeState?: ProcessorRuntimeState;
  /**
   * When true, run legacy processors only and do not advance the calendar.
   * Used after Sprint1 year-start phase already advanced absoluteWeek by 1.
   */
  skipCalendarStep?: boolean;
};
