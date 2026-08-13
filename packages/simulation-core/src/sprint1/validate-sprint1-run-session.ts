/**
 * Validate a complete Sprint 1 runtime session at transaction boundaries.
 * Reuses subsystem validators and only owns cross-component invariants.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateAndCloneProcessorRuntimeState } from "../world-engine/processor-runtime.js";
import { validateWorldEngineState } from "../world-engine/validate-state.js";
import {
  assertBattleResultsWeekSuffixInvariant,
  validateBattleResultsStore,
} from "./battle-result-store.js";
import { validateBattleResultWeekState } from "./battle-result-week-state.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import { WORLD_YEAR_START_PROCESSOR_ID } from "./active-year-start-processor-manifest.js";
import { validateWorldYearStartRuntimeState } from "./world-year-start-runtime-state.js";
import { validateEventAllocationState } from "./event-allocation-state.js";
import { validateSprint1EventEnvelope } from "./event-envelope-sprint1.js";
import { validateMatchIdGeneratorState } from "./match-id-generator.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { buildWeeklyTrainingPersonRecords } from "./sprint1-person-sidecar-records.js";
import { validateSprint1PersonTechniqueSemantics } from "./technique-person-semantics.js";
import { validateSprint1RunContext } from "./sprint1-run-context.js";
import {
  assertBattleResultWeekMatchesWorldDate,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  type Sprint1RunSession,
} from "./sprint1-run-session.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";
import { validateWeeklyTrainingSidecarState } from "./weekly-training-sidecar-state.js";
import { validateTrainingProcessorRuntimeState } from "./training-processor-runtime-state.js";

const SESSION_KEYS = ["context", "runtimeState"] as const;
const RUNTIME_STATE_KEYS = [
  "worldState",
  "worldRngState",
  "matchIdGeneratorState",
  "weeklyTrainingSidecars",
  "processorRuntimeStates",
  "eventStream",
  "eventAllocationState",
  "battleResults",
  "battleResultWeekState",
] as const;

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function issueFromThrownError(path: string, error: unknown): ValidationIssue {
  return {
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Validates a complete Sprint1RunSession, including all cross-root bindings.
 * It never trusts a caller's TypeScript assertion.
 */
export function validateSprint1RunSession(
  session: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunSession> {
  const issues: ValidationIssue[] = [];
  const root = snapshotPlainObjectOrFail(session, "", issues);
  if (root === undefined) {
    return failure(issues);
  }
  assertNoAccessors(root, "", issues);
  rejectUnknownKeys(root, SESSION_KEYS, "", issues);
  if (issues.length > 0) {
    return failure(issues);
  }

  const contextResult = validateSprint1RunContext(root["context"], provider);
  if (!contextResult.ok) {
    issues.push(...prefixIssues(contextResult.issues, "/context"));
  }

  const runtime = snapshotPlainObjectOrFail(root["runtimeState"], "/runtimeState", issues);
  if (runtime === undefined) {
    return failure(issues);
  }
  assertNoAccessors(runtime, "/runtimeState", issues);
  rejectUnknownKeys(runtime, RUNTIME_STATE_KEYS, "/runtimeState", issues);
  if (!contextResult.ok || issues.length > 0) {
    return failure(issues);
  }
  const context = contextResult.value;

  let worldState: Sprint1RunSession["runtimeState"]["worldState"] | undefined;
  try {
    validateWorldEngineState(runtime["worldState"]);
    worldState = runtime["worldState"];
  } catch (error) {
    issues.push(issueFromThrownError("/runtimeState/worldState", error));
  }
  if (worldState !== undefined) {
    if (worldState.simulationId !== context.simulationId) {
      issues.push({
        path: "/runtimeState/worldState/simulationId",
        message: "worldState.simulationId must equal context.simulationId",
        actual: worldState.simulationId,
        expected: context.simulationId,
      });
    }
    if (worldState.seed !== context.simulationIdentity.seed) {
      issues.push({
        path: "/runtimeState/worldState/seed",
        message: "worldState.seed must equal context.simulationIdentity.seed",
        actual: worldState.seed,
        expected: String(context.simulationIdentity.seed),
      });
    }
    if (worldState.configHash !== context.simulationIdentity.initialWorldConfigHash) {
      issues.push({
        path: "/runtimeState/worldState/configHash",
        message:
          "worldState.configHash must equal context.simulationIdentity.initialWorldConfigHash",
        actual: worldState.configHash,
        expected: context.simulationIdentity.initialWorldConfigHash,
      });
    }
  }

  const sidecarsResult = validateWeeklyTrainingSidecarState(runtime["weeklyTrainingSidecars"]);
  if (!sidecarsResult.ok) {
    issues.push(...prefixIssues(sidecarsResult.issues, "/runtimeState/weeklyTrainingSidecars"));
  }

  if (worldState !== undefined) {
    for (let index = 0; index < worldState.persons.length; index += 1) {
      const person = worldState.persons[index]!;
      if (person.sprint1State === undefined) {
        issues.push({
          path: `/runtimeState/worldState/persons/${String(index)}/sprint1State`,
          message: "Sprint 1 sessions require sprint1State for every world person",
          expected: "Sprint1PersonState",
        });
        continue;
      }
      const semantics = validateSprint1PersonTechniqueSemantics(
        person.sprint1State,
        context.techniqueCatalog,
        { spiritSurfaceValue: person.abilities.spirit.surfaceValue },
        provider,
      );
      if (!semantics.ok) {
        issues.push(
          ...prefixIssues(
            semantics.issues,
            `/runtimeState/worldState/persons/${String(index)}/sprint1State`,
          ),
        );
      }
    }
  }

  if (worldState !== undefined && sidecarsResult.ok) {
    const records = buildWeeklyTrainingPersonRecords(worldState, sidecarsResult.value);
    if (!records.ok) {
      issues.push(...prefixIssues(records.issues, "/runtimeState"));
    }
  }

  const worldRngResult = validateSeededRngState(runtime["worldRngState"]);
  if (!worldRngResult.ok) {
    issues.push(...prefixIssues(worldRngResult.issues, "/runtimeState/worldRngState"));
  }

  const generatorResult = validateMatchIdGeneratorState(runtime["matchIdGeneratorState"]);
  if (!generatorResult.ok) {
    issues.push(...prefixIssues(generatorResult.issues, "/runtimeState/matchIdGeneratorState"));
  } else {
    if (generatorResult.value.seed !== context.simulationIdentity.seed) {
      issues.push({
        path: "/runtimeState/matchIdGeneratorState/seed",
        message: "matchIdGeneratorState.seed must equal context.simulationIdentity.seed",
        actual: generatorResult.value.seed,
        expected: String(context.simulationIdentity.seed),
      });
    }
    if (
      generatorResult.value.generatorVersion !== context.simulationIdentity.matchIdGeneratorVersion
    ) {
      issues.push({
        path: "/runtimeState/matchIdGeneratorState/generatorVersion",
        message:
          "matchIdGeneratorState.generatorVersion must equal context SimulationIdentity contract",
        actual: generatorResult.value.generatorVersion,
        expected: context.simulationIdentity.matchIdGeneratorVersion,
      });
    }
  }

  let processorRuntimeStates:
    Sprint1RunSession["runtimeState"]["processorRuntimeStates"] | undefined;
  try {
    processorRuntimeStates = validateAndCloneProcessorRuntimeState(
      runtime["processorRuntimeStates"],
      SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
    );
  } catch (error) {
    issues.push(issueFromThrownError("/runtimeState/processorRuntimeStates", error));
  }
  if (processorRuntimeStates !== undefined) {
    const weeklyRng = processorRuntimeStates.rngStates[0];
    const weeklySpecific = processorRuntimeStates.processorSpecificStates?.[0];
    const yearStartSpecific = processorRuntimeStates.processorSpecificStates?.[1];
    if (
      processorRuntimeStates.processorOrder.length !== 1 ||
      processorRuntimeStates.processorOrder[0] !== WEEKLY_TRAINING_PROCESSOR_ID ||
      processorRuntimeStates.rngStates.length !== 1 ||
      weeklyRng?.processorId !== WEEKLY_TRAINING_PROCESSOR_ID ||
      processorRuntimeStates.processorSpecificStates?.length !== 2 ||
      weeklySpecific?.processorId !== WEEKLY_TRAINING_PROCESSOR_ID ||
      yearStartSpecific?.processorId !== WORLD_YEAR_START_PROCESSOR_ID
    ) {
      issues.push({
        path: "/runtimeState/processorRuntimeStates",
        message:
          "Sprint 1 requires processorOrder/rngStates=[weekly-training] and processorSpecificStates=[weekly-training, world-year-start]",
        expected:
          "processorOrder/rngStates length 1 weekly-training; processorSpecificStates length 2 ordered weekly-training then world-year-start",
      });
    } else {
      const rngResult = validateSeededRngState(weeklyRng.state);
      if (!rngResult.ok) {
        issues.push(
          ...prefixIssues(
            rngResult.issues,
            "/runtimeState/processorRuntimeStates/rngStates/0/state",
          ),
        );
      }
      const specificResult = validateTrainingProcessorRuntimeState(weeklySpecific.specificState);
      if (!specificResult.ok) {
        issues.push(
          ...prefixIssues(
            specificResult.issues,
            "/runtimeState/processorRuntimeStates/processorSpecificStates/0/specificState",
          ),
        );
      }
      const yearStartResult = validateWorldYearStartRuntimeState(yearStartSpecific.specificState);
      if (!yearStartResult.ok) {
        issues.push(
          ...prefixIssues(
            yearStartResult.issues,
            "/runtimeState/processorRuntimeStates/processorSpecificStates/1/specificState",
          ),
        );
      }
    }
  }

  const events = snapshotDenseArrayOrFail(
    runtime["eventStream"],
    "/runtimeState/eventStream",
    issues,
  );
  const eventStream = [];
  if (events !== undefined) {
    for (let index = 0; index < events.length; index += 1) {
      const event = validateSprint1EventEnvelope(events[index]);
      if (!event.ok) {
        issues.push(...prefixIssues(event.issues, `/runtimeState/eventStream/${String(index)}`));
        continue;
      }
      if (event.value.sequence !== index) {
        issues.push({
          path: `/runtimeState/eventStream/${String(index)}/sequence`,
          message: "eventStream sequences must be contiguous from 0",
          actual: event.value.sequence,
          expected: String(index),
        });
      }
      if (event.value.simulationId !== context.simulationId) {
        issues.push({
          path: `/runtimeState/eventStream/${String(index)}/simulationId`,
          message: "event simulationId must equal context.simulationId",
          actual: event.value.simulationId,
          expected: context.simulationId,
        });
      }
      eventStream.push(event.value);
    }
  }
  const allocationResult = validateEventAllocationState(runtime["eventAllocationState"]);
  if (!allocationResult.ok) {
    issues.push(...prefixIssues(allocationResult.issues, "/runtimeState/eventAllocationState"));
  } else if (events !== undefined && allocationResult.value.nextSequence !== events.length) {
    issues.push({
      path: "/runtimeState/eventAllocationState/nextSequence",
      message: "eventAllocationState.nextSequence must equal eventStream.length",
      actual: allocationResult.value.nextSequence,
      expected: String(events.length),
    });
  }

  const battleResultsResult = validateBattleResultsStore(
    runtime["battleResults"],
    context.runRuleSnapshot,
    provider,
    {
      simulationId: context.simulationId,
      runRuleSnapshotHash: context.runRuleSnapshotHash,
    },
  );
  if (!battleResultsResult.ok) {
    issues.push(...prefixIssues(battleResultsResult.issues, "/runtimeState"));
  }
  const weekStateResult = validateBattleResultWeekState(
    runtime["battleResultWeekState"],
    context.runRuleSnapshot,
    provider,
  );
  if (!weekStateResult.ok) {
    issues.push(...prefixIssues(weekStateResult.issues, "/runtimeState/battleResultWeekState"));
  }
  if (worldState !== undefined && weekStateResult.ok) {
    const weekMatch = assertBattleResultWeekMatchesWorldDate({
      battleResultWeekState: weekStateResult.value,
      worldState,
    });
    if (!weekMatch.ok) {
      issues.push(...prefixIssues(weekMatch.issues, "/runtimeState"));
    }
  }
  if (battleResultsResult.ok && weekStateResult.ok) {
    const suffix = assertBattleResultsWeekSuffixInvariant({
      battleResults: battleResultsResult.value,
      battleResultWeekState: weekStateResult.value,
    });
    if (!suffix.ok) {
      issues.push(...prefixIssues(suffix.issues, "/runtimeState"));
    }
  }

  if (
    worldState === undefined ||
    !sidecarsResult.ok ||
    !worldRngResult.ok ||
    !generatorResult.ok ||
    processorRuntimeStates === undefined ||
    events === undefined ||
    !allocationResult.ok ||
    !battleResultsResult.ok ||
    !weekStateResult.ok ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      context,
      runtimeState: {
        worldState,
        worldRngState: worldRngResult.value,
        matchIdGeneratorState: generatorResult.value,
        weeklyTrainingSidecars: sidecarsResult.value,
        processorRuntimeStates,
        eventStream,
        eventAllocationState: allocationResult.value,
        battleResults: [...battleResultsResult.value],
        battleResultWeekState: weekStateResult.value,
      },
    }),
  );
}
