/**
 * Sprint1RunSession / Sprint1RunRuntimeState / weekly adapter I/O foundations
 * (S1-SPEC-0.1.20 / S01-008). Types and invariants only — production facades are
 * not implemented here.
 */
import type { Sprint1EventEnvelope } from "./event-envelope-sprint1.js";
import type { SeededRngState } from "../rng.js";
import type {
  WorldEngineState,
  ProcessorRuntimeState,
  WorldProcessor,
} from "../world-engine/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import type { BattleResult } from "./battle-result-types.js";
import type { BattleResultWeekState } from "./battle-result-week-state.js";
import type { EventAllocationState } from "./event-allocation-state.js";
import type { MatchIdGeneratorState } from "./match-id-generator.js";
import type { Sprint1RunContext } from "./sprint1-run-context.js";
import type { TechniqueCatalog } from "./technique-catalog.js";
import type { OriginalTechniqueLifecycleRuntimeState } from "../sprint3/original-technique-lifecycle-runtime-state.js";
import type { Sprint3MentorshipEntrypointRuntimeState } from "../sprint3/sprint3-mentorship-entrypoint-runtime-state.js";
import type { Sprint3Config } from "../sprint3/types.js";
import type { GeneratedTechniqueCatalogOverlay } from "../sprint3/generated-technique-catalog-overlay.js";
import type { Sprint2CompetitiveRecordRuntimeState } from "../sprint3/live-sprint2-competitive-record-runtime-state.js";
import type { Sprint1Config } from "./types.js";
import type { WeeklyTrainingEventCandidate } from "./weekly-training-types.js";
import type { WeeklyTrainingSidecarState } from "./weekly-training-sidecar-state.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";

/**
 * Mutable runtime-only root. Rolled back as a whole on week/battle failure.
 * Immutable run materials live on Sprint1RunContext, not here.
 *
 * battleResults: run-wide canonical store of committed BattleResults (commit order).
 * Projected to final-world.json top-level; not discarded on week advance.
 * battleResultWeekState: same-week count registry only (results reset on week advance).
 */
export type Sprint1RunRuntimeState = {
  worldState: WorldEngineState;
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  processorRuntimeStates: ProcessorRuntimeState;
  eventStream: Sprint1EventEnvelope[];
  eventAllocationState: EventAllocationState;
  battleResults: BattleResult[];
  battleResultWeekState: BattleResultWeekState;
  /** S03-009: per-person research/cooldown when sprint3-balance-0.9.0 is bound on context. */
  originalTechniqueLifecycleRuntime?: OriginalTechniqueLifecycleRuntimeState;
  /** S03-012: enrollment / intake / explicit-teach entrypoint persistence when Sprint3 is bound. */
  mentorshipEntrypointRuntime?: Sprint3MentorshipEntrypointRuntimeState;
  /** S03-015: runtime generated-technique overlay for production battle technique lookup. */
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay;
  /** S03-017: authoritative Sprint2 competitive records for live master qualification derivation. */
  sprint2CompetitiveRecordRuntime?: Sprint2CompetitiveRecordRuntimeState;
};

/**
 * Logical production run/session owner: immutable context + mutable runtime.
 * Name may stay internal until S01-008 production facade lands.
 */
export type Sprint1RunSession = {
  context: Sprint1RunContext;
  runtimeState: Sprint1RunRuntimeState;
};

/**
 * Sprint1 weekly-training transactional adapter input (outside legacy WorldProcessor).
 * Does not capture config/catalog via globals or closures.
 */
export type Sprint1WeeklyTrainingAdapterInput = {
  absoluteWeek: number;
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  sprint1Config: Sprint1Config;
  techniqueCatalog: TechniqueCatalog;
  processorRuntimeStates: ProcessorRuntimeState;
  /** Optional S03-005 binding: teachingEfficiency disciple brackets for weekly outcomes. */
  sprint3Config?: Sprint3Config;
  /** Optional S03-012: mentorship relation kind merge at weekly record build. */
  mentorshipEntrypointRuntime?: Sprint3MentorshipEntrypointRuntimeState;
};

/**
 * Sprint1 weekly-training transactional adapter output.
 * eventCandidates are S01-004 WeeklyTrainingEventCandidate (pre-EventEnvelope).
 */
export type Sprint1WeeklyTrainingAdapterOutput = {
  worldState: WorldEngineState;
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  processorRuntimeStates: ProcessorRuntimeState;
  eventCandidates: readonly WeeklyTrainingEventCandidate[];
};

/**
 * Documented production Sprint1 transactional processor adapter pipeline.
 * This is NOT `RunWorldOneWeekInput.processors` (legacy WorldProcessor[]).
 */
export type Sprint1TransactionalProcessorAdapterId = typeof WEEKLY_TRAINING_PROCESSOR_ID;

export const SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE: readonly Sprint1TransactionalProcessorAdapterId[] =
  [WEEKLY_TRAINING_PROCESSOR_ID];

/**
 * Runtime invariant: battleResultWeekState.absoluteWeek === worldDate.absoluteWeek.
 */
export function assertBattleResultWeekMatchesWorldDate(input: {
  battleResultWeekState: Pick<BattleResultWeekState, "absoluteWeek">;
  worldState: Pick<WorldEngineState, "worldDate">;
}): ValidationResult<true> {
  const registryWeek = input.battleResultWeekState.absoluteWeek;
  const worldWeek = input.worldState.worldDate.absoluteWeek;
  if (registryWeek !== worldWeek) {
    return failure([
      {
        path: "/battleResultWeekState/absoluteWeek",
        message: "battleResultWeekState.absoluteWeek must equal worldState.worldDate.absoluteWeek",
        actual: registryWeek,
        expected: String(worldWeek),
      },
    ]);
  }
  return success(true);
}

/**
 * Compile-time / docs guard: legacy WorldProcessor signature shape (unchanged).
 * Production weekly-training must NOT be forced into this interface.
 */
export type LegacyWorldProcessorContract = WorldProcessor;
