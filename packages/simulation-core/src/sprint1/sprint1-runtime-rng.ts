/**
 * Fresh Sprint 1 battle World RNG and weekly-training processor RNG initialization
 * (S1-SPEC-0.1.20). Labels are fixed ASCII literals — do not derive from paths or
 * processor array indices.
 */
import { createSeededRng, deriveSeed, type SeededRngState } from "../rng.js";
import type { ProcessorRuntimeState } from "../world-engine/types.js";
import {
  SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL,
} from "./constants.js";
import {
  createInitialTrainingProcessorRuntimeState,
  type TrainingProcessorRuntimeState,
} from "./training-processor-runtime-state.js";

export { SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL, WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL };

/**
 * initialWorldRngState = createSeededRng(deriveSeed(runSeed, "battle/world-rng")).exportState()
 * Consumes zero RNG draws after exportState of a fresh engine.
 * Does not use generateInitialWorld internal RNG position.
 */
export function createInitialSprint1BattleWorldRngState(runSeed: number): SeededRngState {
  const battleWorldSeed = deriveSeed(runSeed, SPRINT1_BATTLE_WORLD_RNG_SEED_LABEL);
  return createSeededRng(battleWorldSeed).exportState();
}

/**
 * Logical weekly-training processor runtime entry for Sprint1RunRuntimeState.processorRuntimeStates.
 */
export type WeeklyTrainingProcessorRuntimeParts = {
  processorId: typeof WEEKLY_TRAINING_PROCESSOR_ID;
  rngState: SeededRngState;
  specificState: TrainingProcessorRuntimeState;
};

/**
 * Build weekly-training RNG + TrainingProcessorRuntimeState for fresh Sprint 1 init.
 * RNG label = "processor/weekly-training" (not WorldEngine createInitialRuntime's
 * `world-engine/processor/${id}` label).
 * specificState always comes from createInitialTrainingProcessorRuntimeState().
 */
export function createInitialWeeklyTrainingProcessorRuntimeParts(
  runSeed: number,
): WeeklyTrainingProcessorRuntimeParts {
  const weeklyTrainingSeed = deriveSeed(runSeed, WEEKLY_TRAINING_PROCESSOR_RNG_SEED_LABEL);
  return {
    processorId: WEEKLY_TRAINING_PROCESSOR_ID,
    rngState: createSeededRng(weeklyTrainingSeed).exportState(),
    specificState: createInitialTrainingProcessorRuntimeState(),
  };
}

/**
 * Fresh Sprint 1 ProcessorRuntimeState collection with exact one weekly-training entry.
 * Uses Sprint1 seed labels; do not substitute createInitialRuntime for this path.
 */
export function createInitialSprint1WeeklyTrainingProcessorRuntimeState(
  runSeed: number,
): ProcessorRuntimeState {
  const parts = createInitialWeeklyTrainingProcessorRuntimeParts(runSeed);
  return {
    processorOrder: [WEEKLY_TRAINING_PROCESSOR_ID],
    rngStates: [
      {
        processorId: WEEKLY_TRAINING_PROCESSOR_ID,
        state: parts.rngState,
      },
    ],
    processorSpecificStates: [
      {
        processorId: WEEKLY_TRAINING_PROCESSOR_ID,
        specificState: parts.specificState,
      },
    ],
  };
}
