/**
 * Fresh Sprint 1 run session initialization — 21-step pipeline (S1-SPEC-0.1.20 / 02 §12).
 * Does not implement weekly step, battle commit, or fixed7 writer.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { validateInitialWorldConfig } from "../config/validate-config.js";
import type { InitialWorldConfig } from "../config/types.js";
import { generateInitialWorld } from "../initial-world/generate.js";
import type { InitialWorldGenerationResult, InitialWorldSnapshot } from "../initial-world/types.js";
import type { SimulationId } from "../ids.js";
import type { ValidatedNameData } from "../names/types.js";
import { validateNameData } from "../names/validate-name-data.js";
import { createSeededRng, type SeededRngFactory } from "../rng.js";
import { computeConfigHash, computeNameDataHash } from "../sha256-provider.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { createWorldEngineState } from "../world-engine/engine.js";
import { createInitialWorldDate } from "../world-date.js";
import {
  computeActiveYearStartProcessorManifestHash,
  createDefaultActiveYearStartProcessorManifest,
} from "./active-year-start-processor-manifest.js";
import { attachSprint1PersonStateToInitialWorld } from "./attach-sprint1-person-state.js";
import { assignInitialActiveTechniqueCoverage } from "./assign-initial-technique-coverage.js";
import { createInitialBattleResults } from "./battle-result-store.js";
import { createInitialBattleResultWeekState } from "./battle-result-week-state.js";
import {
  BATTLE_PROFILE_ADAPTER_VERSION,
  CANONICAL_JSON_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  HASH_ALGORITHM,
  INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
} from "./constants.js";
import { createEventAllocationStateAfterPromotedInitialEvents } from "./event-allocation-state.js";
import { promoteProvisionalEventStreamToSprint1 } from "./event-envelope-sprint1.js";
import {
  computeInitialWeeklyTrainingSidecarHash,
  validateInitialWeeklyTrainingSidecarSnapshot,
  type InitialWeeklyTrainingSidecarSnapshot,
} from "./initial-weekly-training-sidecar.js";
import {
  computeMatchIdGeneratorStateHash,
  createInitialMatchIdGeneratorState,
  type MatchIdGeneratorState,
} from "./match-id-generator.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireInteger,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  createRunRuleSnapshot,
  validateRunRuleSnapshot,
  validateRunRuleSnapshotAgainstIdentity,
  type RunRuleSnapshot,
} from "./run-rule-snapshot.js";
import {
  computeSimulationIdentityHash,
  createExpectedSpecVersions,
  createSimulationIdFromIdentity,
  validateSimulationIdentity,
} from "./simulation-identity.js";
import { createSprint1RunContext } from "./sprint1-run-context.js";
import { validateSprint1CliInput, type Sprint1CliInput } from "./sprint1-cli-input.js";
import {
  createInitialSprint1BattleWorldRngState,
  createInitialSprint1WeeklyTrainingProcessorRuntimeState,
} from "./sprint1-runtime-rng.js";
import {
  assertBattleResultWeekMatchesWorldDate,
  SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  type Sprint1RunSession,
  type Sprint1TransactionalProcessorAdapterId,
} from "./sprint1-run-session.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import {
  computeTechniqueCatalogHash,
  validateTechniqueCatalog,
  type TechniqueCatalog,
} from "./technique-catalog.js";
import type { SimulationIdentity, Sprint1Config } from "./types.js";
import { validateNormalizedSprint1Config } from "./validate-sprint1-config.js";
import { validateSprint1RunSession } from "./validate-sprint1-run-session.js";
import { createWeeklyTrainingSidecarStateFromInitial } from "./weekly-training-sidecar-state.js";

export const CREATE_SPRINT1_RUN_SESSION_INPUT_KEYS = [
  "seed",
  "config",
  "nameData",
  "sprint1CliInput",
] as const;

export type CreateSprint1RunSessionInput = {
  seed: number;
  config: InitialWorldConfig;
  nameData: ValidatedNameData;
  sprint1CliInput: Sprint1CliInput;
};

/**
 * Exact materials for reconstructing a Sprint1RunSession from saved RunInit /
 * RunRuleSnapshot contents without display-unit Sprint1CliInput round-trip.
 * `initialWeeklyTrainingSidecarSnapshot` is hash-bound via SimulationIdentity
 * (not a RunInitializationSnapshot field); callers supply the immutable initial
 * sidecar that matches `simulationIdentity.initialWeeklyTrainingSidecarHash`.
 */
export const CREATE_SPRINT1_RUN_SESSION_FROM_RUN_INITIALIZATION_MATERIALS_KEYS = [
  "seed",
  "config",
  "nameData",
  "simulationIdentity",
  "simulationIdentityHash",
  "runRuleSnapshot",
  "runRuleSnapshotHash",
  "initialWeeklyTrainingSidecarSnapshot",
] as const;

export type CreateSprint1RunSessionFromRunInitializationMaterialsInput = {
  seed: number;
  config: InitialWorldConfig;
  nameData: ValidatedNameData;
  simulationIdentity: SimulationIdentity;
  simulationIdentityHash: string;
  runRuleSnapshot: RunRuleSnapshot;
  runRuleSnapshotHash: string;
  initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot;
};

export type ProvisionalGenerationMeta = {
  provisionalSimulationId: SimulationId;
  initialEventCount: number;
};

/** Promoted initial-world.json document payload (world body + fixed7 projection fields). */
export type Sprint1InitialWorldDocumentSnapshot = InitialWorldSnapshot & {
  schemaVersion: typeof INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1;
  runRuleSnapshot: RunRuleSnapshot;
  runRuleSnapshotHash: string;
  initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot;
};

export type CreateSprint1RunSessionResult = {
  session: Sprint1RunSession;
  initialWorldSnapshotForOutput: Sprint1InitialWorldDocumentSnapshot;
  provisionalGenerationMeta: ProvisionalGenerationMeta;
  transactionalProcessorAdapterPipeline: readonly Sprint1TransactionalProcessorAdapterId[];
};

export type CreateSprint1RunSessionDeps = {
  generateInitialWorld: typeof generateInitialWorld;
  rngFactory?: SeededRngFactory;
};

const UINT32_MAX = 4294967295;

function mismatch(
  path: string,
  message: string,
  actual: unknown,
  expected: unknown,
): ValidationIssue {
  return { path, message, actual, expected: String(expected) };
}

function prefixIssues(issues: readonly ValidationIssue[], prefix: string): ValidationIssue[] {
  return issues.map((issue) => ({
    ...issue,
    path: issue.path === "" ? prefix : `${prefix}${issue.path}`,
  }));
}

function validatePersonSidecarExactMatch(
  world: InitialWorldSnapshot,
  sidecar: InitialWeeklyTrainingSidecarSnapshot,
): ValidationResult<true> {
  const worldIds = world.persons.map((person) => person.personId).sort();
  const sidecarIds = sidecar.entries.map((entry) => entry.personId).sort();
  const issues: ValidationIssue[] = [];

  if (worldIds.length !== sidecarIds.length) {
    issues.push(
      mismatch(
        "/sprint1CliInput/initialWeeklyTrainingSidecar/entries",
        "world persons and sidecar entries must be exact 1:1",
        sidecarIds.length,
        String(worldIds.length),
      ),
    );
  }

  const sidecarSet = new Set(sidecarIds);
  for (const personId of worldIds) {
    if (!sidecarSet.has(personId)) {
      issues.push(
        mismatch(
          "/sprint1CliInput/initialWeeklyTrainingSidecar/entries",
          `missing sidecar entry for world person ${personId}`,
          "absent",
          personId,
        ),
      );
    }
  }

  for (const personId of sidecarIds) {
    if (!worldIds.includes(personId)) {
      issues.push(
        mismatch(
          "/sprint1CliInput/initialWeeklyTrainingSidecar/entries",
          `sidecar entry ${personId} has no matching world person`,
          personId,
          "matching PersonId in world.persons",
        ),
      );
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(true);
}

/**
 * Bind a fresh provisional initial-world snapshot to the final Sprint 1 simulationId.
 * Does not require provisionalSimulationId !== finalSimulationId.
 */
export function promoteProvisionalWorldSnapshot(input: {
  world: InitialWorldSnapshot;
  provisionalSimulationId: SimulationId;
  finalSimulationId: SimulationId;
  worldCalendar: InitialWorldConfig["worldCalendar"];
}): ValidationResult<InitialWorldSnapshot> {
  const issues: ValidationIssue[] = [];
  const expectedDate = createInitialWorldDate(input.worldCalendar);
  for (const field of ["year", "month", "weekOfMonth", "absoluteWeek"] as const) {
    if (input.world.worldDate[field] !== expectedDate[field]) {
      issues.push(
        mismatch(
          `/worldDate/${field}`,
          "promotion accepts only fresh initial-world date",
          input.world.worldDate[field],
          String(expectedDate[field]),
        ),
      );
    }
  }
  if (input.world.simulationId !== input.provisionalSimulationId) {
    issues.push(
      mismatch(
        "/simulationId",
        "world simulationId must equal provisional generateInitialWorld simulationId before promotion",
        input.world.simulationId,
        input.provisionalSimulationId,
      ),
    );
  }
  // provisionalSimulationId may equal finalSimulationId: promotion is an identity
  // binding boundary, not a requirement that the SimulationId string changes.
  if (issues.length > 0) {
    return failure(issues);
  }

  const promoted = deepFreezePlainJson({
    ...cloneValidatedPlainJson(input.world),
    simulationId: input.finalSimulationId,
  }) as InitialWorldSnapshot;
  return success(promoted);
}

function parseCreateSprint1RunSessionInput(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<CreateSprint1RunSessionInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "CreateSprint1RunSessionInput must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, CREATE_SPRINT1_RUN_SESSION_INPUT_KEYS, "", issues);

  const seed = requireInteger(object, "seed", "", issues);
  if (seed !== undefined && (seed < 0 || seed > UINT32_MAX)) {
    issues.push({
      path: "/seed",
      message: "seed must be an integer in 0..4294967295",
      actual: seed,
      expected: "0..4294967295",
    });
  }

  const configResult = validateInitialWorldConfig(object["config"]);
  if (!configResult.ok) {
    issues.push(...prefixIssues(configResult.issues, "/config"));
  }

  let nameData: ValidatedNameData | undefined;
  if (configResult.ok) {
    const nameDataObject = snapshotPlainObjectOrFail(object["nameData"], "/nameData", issues);
    if (nameDataObject !== undefined) {
      const nameResult = validateNameData({
        manifest: nameDataObject["manifest"],
        familyNames: nameDataObject["familyNames"],
        maleGivenNames: nameDataObject["maleGivenNames"],
        femaleGivenNames: nameDataObject["femaleGivenNames"],
        neutralGivenNames: nameDataObject["neutralGivenNames"],
        requiredVersion: configResult.value.nameData.requiredVersion,
        initialFamilyCount: configResult.value.families.initialFamilyCount,
        sha256Provider: provider,
      });
      if (!nameResult.ok) {
        issues.push(...prefixIssues(nameResult.issues, "/nameData"));
      } else {
        nameData = nameResult.value;
      }
    }
  }

  const cliResult = validateSprint1CliInput(object["sprint1CliInput"], provider);
  if (!cliResult.ok) {
    issues.push(...prefixIssues(cliResult.issues, "/sprint1CliInput"));
  }

  if (
    seed === undefined ||
    !configResult.ok ||
    nameData === undefined ||
    !cliResult.ok ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success({
    seed,
    config: configResult.value,
    nameData,
    sprint1CliInput: cliResult.value,
  });
}

function buildSimulationIdentity(input: {
  seed: number;
  initialWorldConfigHash: string;
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
  sprint1ConfigHash: string;
  techniqueCatalogHash: string;
  initialWeeklyTrainingSidecarHash: string;
  initialMatchIdGeneratorStateHash: string;
}): SimulationIdentity {
  return {
    schemaVersion: SIMULATION_IDENTITY_SCHEMA_VERSION,
    seed: input.seed,
    initialWorldConfigHash: input.initialWorldConfigHash,
    worldCalendarConfigHash: input.worldCalendarConfigHash,
    yearStartProcessorManifestHash: input.yearStartProcessorManifestHash,
    sprint1ConfigHash: input.sprint1ConfigHash,
    techniqueCatalogHash: input.techniqueCatalogHash,
    initialWeeklyTrainingSidecarHash: input.initialWeeklyTrainingSidecarHash,
    battleProfileAdapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    initialMatchIdGeneratorStateHash: input.initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
    specVersions: createExpectedSpecVersions(),
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: CANONICAL_JSON_VERSION,
    hashAlgorithm: HASH_ALGORITHM,
  };
}

function wrapGenerateInitialWorldError(error: unknown): ValidationResult<never> {
  const detail = error instanceof Error ? error.message : String(error);
  return failure([
    {
      path: "/generateInitialWorld",
      message: `generateInitialWorld failed: ${detail}`,
      actual: detail,
      expected: "InitialWorldGenerationResult",
    },
  ]);
}

/**
 * Execute the 21-step fresh Sprint 1 initialization pipeline and return a logical
 * Sprint1RunSession plus initial-world document projection materials.
 */
export function createSprint1RunSession(
  input: unknown,
  provider: Sha256Provider,
  deps: CreateSprint1RunSessionDeps = { generateInitialWorld },
): ValidationResult<CreateSprint1RunSessionResult> {
  const parsed = parseCreateSprint1RunSessionInput(input, provider);
  if (!parsed.ok) {
    return failure(parsed.issues);
  }

  const { seed, config, nameData, sprint1CliInput } = parsed.value;
  const configHash = computeConfigHash(config, provider);
  const nameDataHash = computeNameDataHash(nameData.manifest, provider);
  const rngFactory = deps.rngFactory ?? createSeededRng;

  let generation: InitialWorldGenerationResult;
  try {
    generation = deps.generateInitialWorld({
      config,
      configHash,
      seed,
      nameData,
      nameDataHash,
      rngFactory,
      sha256Provider: provider,
    });
  } catch (error) {
    return wrapGenerateInitialWorldError(error);
  }

  const provisionalSimulationId = generation.snapshot.simulationId;

  const attached = attachSprint1PersonStateToInitialWorld(generation.snapshot);
  if (!attached.ok) {
    return failure(prefixIssues(attached.issues, "/attachSprint1PersonState"));
  }

  const coverageCatalog = validateTechniqueCatalog(sprint1CliInput.techniqueCatalog, provider);
  if (!coverageCatalog.ok) {
    return failure(prefixIssues(coverageCatalog.issues, "/techniqueCatalog"));
  }
  const covered = assignInitialActiveTechniqueCoverage(
    attached.value,
    coverageCatalog.value.definitions,
  );
  if (!covered.ok) {
    return failure(prefixIssues(covered.issues, "/initialTechniqueCoverage"));
  }

  const sidecarMatch = validatePersonSidecarExactMatch(
    covered.value,
    sprint1CliInput.initialWeeklyTrainingSidecar,
  );
  if (!sidecarMatch.ok) {
    return failure(sidecarMatch.issues);
  }

  const matchIdStateResult = createInitialMatchIdGeneratorState({
    seed,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
  });
  if (!matchIdStateResult.ok) {
    return failure(prefixIssues(matchIdStateResult.issues, "/matchIdGeneratorState"));
  }
  const matchIdState: MatchIdGeneratorState = matchIdStateResult.value;

  const matchIdHashResult = computeMatchIdGeneratorStateHash(matchIdState, provider);
  if (!matchIdHashResult.ok) {
    return failure(prefixIssues(matchIdHashResult.issues, "/matchIdGeneratorStateHash"));
  }

  const sprint1ConfigHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(sprint1CliInput.sprint1Config),
    "/sprint1ConfigHash",
  );
  if (!sprint1ConfigHashResult.ok) {
    return failure(prefixIssues(sprint1ConfigHashResult.issues, "/sprint1ConfigHash"));
  }

  const techniqueCatalogHashResult = computeTechniqueCatalogHash(
    sprint1CliInput.techniqueCatalog.definitions,
    provider,
  );
  if (!techniqueCatalogHashResult.ok) {
    return failure(prefixIssues(techniqueCatalogHashResult.issues, "/techniqueCatalogHash"));
  }

  const sidecarHashResult = computeInitialWeeklyTrainingSidecarHash(
    sprint1CliInput.initialWeeklyTrainingSidecar,
    provider,
  );
  if (!sidecarHashResult.ok) {
    return failure(prefixIssues(sidecarHashResult.issues, "/initialWeeklyTrainingSidecarHash"));
  }

  const yearStartProcessorManifest = createDefaultActiveYearStartProcessorManifest();
  const worldCalendarConfigHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(config.worldCalendar),
    "/worldCalendarConfigHash",
  );
  if (!worldCalendarConfigHashResult.ok) {
    return failure(prefixIssues(worldCalendarConfigHashResult.issues, "/worldCalendarConfigHash"));
  }
  const yearStartProcessorManifestHashResult = computeActiveYearStartProcessorManifestHash(
    yearStartProcessorManifest,
    provider,
  );
  if (!yearStartProcessorManifestHashResult.ok) {
    return failure(
      prefixIssues(yearStartProcessorManifestHashResult.issues, "/yearStartProcessorManifestHash"),
    );
  }

  const identity = buildSimulationIdentity({
    seed,
    initialWorldConfigHash: configHash,
    worldCalendarConfigHash: worldCalendarConfigHashResult.value,
    yearStartProcessorManifestHash: yearStartProcessorManifestHashResult.value,
    sprint1ConfigHash: sprint1ConfigHashResult.value,
    techniqueCatalogHash: techniqueCatalogHashResult.value,
    initialWeeklyTrainingSidecarHash: sidecarHashResult.value,
    initialMatchIdGeneratorStateHash: matchIdHashResult.value,
  });

  const identityValidated = validateSimulationIdentity(identity);
  if (!identityValidated.ok) {
    return failure(prefixIssues(identityValidated.issues, "/simulationIdentity"));
  }

  const identityHashResult = computeSimulationIdentityHash(identityValidated.value, provider);
  if (!identityHashResult.ok) {
    return failure(prefixIssues(identityHashResult.issues, "/simulationIdentityHash"));
  }

  const simulationIdResult = createSimulationIdFromIdentity(identityValidated.value, provider);
  if (!simulationIdResult.ok) {
    return failure(prefixIssues(simulationIdResult.issues, "/simulationId"));
  }
  const finalSimulationId = simulationIdResult.value;

  const promotedWorldResult = promoteProvisionalWorldSnapshot({
    world: covered.value,
    provisionalSimulationId,
    finalSimulationId,
    worldCalendar: config.worldCalendar,
  });
  if (!promotedWorldResult.ok) {
    return failure(prefixIssues(promotedWorldResult.issues, "/promotedWorld"));
  }

  const promotedEventsResult = promoteProvisionalEventStreamToSprint1(
    generation.initialEvents,
    finalSimulationId,
    provisionalSimulationId,
  );
  if (!promotedEventsResult.ok) {
    return failure(prefixIssues(promotedEventsResult.issues, "/promotedEvents"));
  }
  const promotedEvents = promotedEventsResult.value;

  const runRuleSnapshotResult = createRunRuleSnapshot(
    {
      simulationIdentity: identityValidated.value,
      simulationIdentityHash: identityHashResult.value,
      initialMatchIdGeneratorState: matchIdState,
      worldCalendar: config.worldCalendar,
      yearStartProcessorManifest,
      sprint1Config: sprint1CliInput.sprint1Config,
      techniqueCatalogDataVersion: sprint1CliInput.techniqueCatalog.identity.dataVersion,
      techniqueDefinitions: sprint1CliInput.techniqueCatalog.definitions,
    },
    provider,
  );
  if (!runRuleSnapshotResult.ok) {
    return failure(prefixIssues(runRuleSnapshotResult.issues, "/runRuleSnapshot"));
  }
  const runRuleSnapshot = runRuleSnapshotResult.value;

  const worldRngState = createInitialSprint1BattleWorldRngState(seed);
  const processorRuntimeStates = createInitialSprint1WeeklyTrainingProcessorRuntimeState(seed);

  const eventAllocationResult = createEventAllocationStateAfterPromotedInitialEvents(
    promotedEvents.length,
  );
  if (!eventAllocationResult.ok) {
    return failure(prefixIssues(eventAllocationResult.issues, "/eventAllocationState"));
  }

  const battleResultWeekResult = createInitialBattleResultWeekState(
    promotedWorldResult.value.worldDate.absoluteWeek,
  );
  if (!battleResultWeekResult.ok) {
    return failure(prefixIssues(battleResultWeekResult.issues, "/battleResultWeekState"));
  }

  const weeklyTrainingSidecarsResult = createWeeklyTrainingSidecarStateFromInitial(
    sprint1CliInput.initialWeeklyTrainingSidecar,
  );
  if (!weeklyTrainingSidecarsResult.ok) {
    return failure(prefixIssues(weeklyTrainingSidecarsResult.issues, "/weeklyTrainingSidecars"));
  }

  let worldState;
  try {
    worldState = createWorldEngineState(promotedWorldResult.value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "/worldState",
        message: `createWorldEngineState failed: ${detail}`,
        actual: detail,
        expected: "WorldEngineState",
      },
    ]);
  }

  const contextResult = createSprint1RunContext(
    {
      sprint1Config: sprint1CliInput.sprint1Config,
      techniqueCatalog: sprint1CliInput.techniqueCatalog,
      initialWeeklyTrainingSidecarSnapshot: sprint1CliInput.initialWeeklyTrainingSidecar,
      simulationIdentity: identityValidated.value,
      simulationIdentityHash: identityHashResult.value,
      simulationId: finalSimulationId,
      runRuleSnapshot,
      runRuleSnapshotHash: runRuleSnapshot.runRuleSnapshotHash,
    },
    provider,
  );
  if (!contextResult.ok) {
    return failure(prefixIssues(contextResult.issues, "/context"));
  }

  const runtimeState = deepFreezePlainJson({
    worldState,
    worldRngState,
    matchIdGeneratorState: matchIdState,
    weeklyTrainingSidecars: weeklyTrainingSidecarsResult.value,
    processorRuntimeStates,
    eventStream: promotedEvents,
    eventAllocationState: eventAllocationResult.value,
    battleResults: [...createInitialBattleResults()],
    battleResultWeekState: battleResultWeekResult.value,
  }) as Sprint1RunSession["runtimeState"];

  const weekInvariant = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: runtimeState.battleResultWeekState,
    worldState: runtimeState.worldState,
  });
  if (!weekInvariant.ok) {
    return failure(prefixIssues(weekInvariant.issues, "/runtimeState"));
  }

  const session: Sprint1RunSession = deepFreezePlainJson({
    context: contextResult.value,
    runtimeState,
  });
  const sessionResult = validateSprint1RunSession(session, provider);
  if (!sessionResult.ok) {
    return failure(prefixIssues(sessionResult.issues, "/session"));
  }

  const initialWorldSnapshotForOutput: Sprint1InitialWorldDocumentSnapshot = deepFreezePlainJson({
    ...cloneValidatedPlainJson(promotedWorldResult.value),
    schemaVersion: INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
    runRuleSnapshot,
    runRuleSnapshotHash: runRuleSnapshot.runRuleSnapshotHash,
    initialWeeklyTrainingSidecarSnapshot: contextResult.value.initialWeeklyTrainingSidecarSnapshot,
  });

  return success({
    session: sessionResult.value,
    initialWorldSnapshotForOutput,
    provisionalGenerationMeta: {
      provisionalSimulationId,
      initialEventCount: generation.initialEvents.length,
    },
    transactionalProcessorAdapterPipeline: SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  });
}

function parseCreateSprint1RunSessionFromRunInitializationMaterialsInput(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<CreateSprint1RunSessionFromRunInitializationMaterialsInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message:
                "CreateSprint1RunSessionFromRunInitializationMaterialsInput must be a plain object",
              actual: input,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(
    object,
    CREATE_SPRINT1_RUN_SESSION_FROM_RUN_INITIALIZATION_MATERIALS_KEYS,
    "",
    issues,
  );

  const seed = requireInteger(object, "seed", "", issues);
  if (seed !== undefined && (seed < 0 || seed > UINT32_MAX)) {
    issues.push({
      path: "/seed",
      message: "seed must be an integer in 0..4294967295",
      actual: seed,
      expected: "0..4294967295",
    });
  }

  const configResult = validateInitialWorldConfig(object["config"]);
  if (!configResult.ok) {
    issues.push(...prefixIssues(configResult.issues, "/config"));
  }

  let nameData: ValidatedNameData | undefined;
  if (configResult.ok) {
    const nameDataObject = snapshotPlainObjectOrFail(object["nameData"], "/nameData", issues);
    if (nameDataObject !== undefined) {
      const nameResult = validateNameData({
        manifest: nameDataObject["manifest"],
        familyNames: nameDataObject["familyNames"],
        maleGivenNames: nameDataObject["maleGivenNames"],
        femaleGivenNames: nameDataObject["femaleGivenNames"],
        neutralGivenNames: nameDataObject["neutralGivenNames"],
        requiredVersion: configResult.value.nameData.requiredVersion,
        initialFamilyCount: configResult.value.families.initialFamilyCount,
        sha256Provider: provider,
      });
      if (!nameResult.ok) {
        issues.push(...prefixIssues(nameResult.issues, "/nameData"));
      } else {
        nameData = nameResult.value;
      }
    }
  }

  const identityResult = validateSimulationIdentity(object["simulationIdentity"]);
  if (!identityResult.ok) {
    issues.push(...prefixIssues(identityResult.issues, "/simulationIdentity"));
  }

  if (
    typeof object["simulationIdentityHash"] !== "string" ||
    object["simulationIdentityHash"].length !== 64
  ) {
    issues.push({
      path: "/simulationIdentityHash",
      message: "simulationIdentityHash must be a 64 lowercase hex character SHA-256 digest",
      actual: object["simulationIdentityHash"],
      expected: "64 lowercase hex chars",
    });
  }

  if (
    typeof object["runRuleSnapshotHash"] !== "string" ||
    object["runRuleSnapshotHash"].length !== 64
  ) {
    issues.push({
      path: "/runRuleSnapshotHash",
      message: "runRuleSnapshotHash must be a 64 lowercase hex character SHA-256 digest",
      actual: object["runRuleSnapshotHash"],
      expected: "64 lowercase hex chars",
    });
  }

  const sidecarResult = validateInitialWeeklyTrainingSidecarSnapshot(
    object["initialWeeklyTrainingSidecarSnapshot"],
  );
  if (!sidecarResult.ok) {
    issues.push(...prefixIssues(sidecarResult.issues, "/initialWeeklyTrainingSidecarSnapshot"));
  }

  let runRule: RunRuleSnapshot | undefined;
  if (identityResult.ok && typeof object["simulationIdentityHash"] === "string") {
    const matchIdStateResult = createInitialMatchIdGeneratorState({
      seed: identityResult.value.seed,
      generatorVersion: MATCH_ID_GENERATOR_VERSION,
      namespace: MATCH_ID_NAMESPACE,
    });
    if (!matchIdStateResult.ok) {
      issues.push(...prefixIssues(matchIdStateResult.issues, "/matchIdGeneratorState"));
    } else {
      const against = validateRunRuleSnapshotAgainstIdentity(
        object["runRuleSnapshot"],
        identityResult.value,
        object["simulationIdentityHash"],
        matchIdStateResult.value,
        provider,
      );
      if (!against.ok) {
        issues.push(...prefixIssues(against.issues, "/runRuleSnapshot"));
      } else {
        runRule = against.value;
      }
    }
  } else {
    const runRuleOnly = validateRunRuleSnapshot(object["runRuleSnapshot"], provider);
    if (!runRuleOnly.ok) {
      issues.push(...prefixIssues(runRuleOnly.issues, "/runRuleSnapshot"));
    }
  }

  if (
    seed === undefined ||
    !configResult.ok ||
    nameData === undefined ||
    !identityResult.ok ||
    runRule === undefined ||
    !sidecarResult.ok ||
    typeof object["simulationIdentityHash"] !== "string" ||
    typeof object["runRuleSnapshotHash"] !== "string" ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (object["runRuleSnapshotHash"] !== runRule.runRuleSnapshotHash) {
    return failure([
      mismatch(
        "/runRuleSnapshotHash",
        "runRuleSnapshotHash must equal runRuleSnapshot.runRuleSnapshotHash",
        object["runRuleSnapshotHash"],
        runRule.runRuleSnapshotHash,
      ),
    ]);
  }

  const identityHashResult = computeSimulationIdentityHash(identityResult.value, provider);
  if (!identityHashResult.ok) {
    return failure(prefixIssues(identityHashResult.issues, "/simulationIdentityHash"));
  }
  if (identityHashResult.value !== object["simulationIdentityHash"]) {
    return failure([
      mismatch(
        "/simulationIdentityHash",
        "simulationIdentityHash must equal canonical SimulationIdentity hash",
        object["simulationIdentityHash"],
        identityHashResult.value,
      ),
    ]);
  }

  if (identityResult.value.seed !== seed) {
    return failure([
      mismatch("/seed", "seed must equal simulationIdentity.seed", seed, identityResult.value.seed),
    ]);
  }

  const configHash = computeConfigHash(configResult.value, provider);
  if (configHash !== identityResult.value.initialWorldConfigHash) {
    return failure([
      mismatch(
        "/config",
        "config hash must equal simulationIdentity.initialWorldConfigHash",
        configHash,
        identityResult.value.initialWorldConfigHash,
      ),
    ]);
  }

  if (
    toCanonicalJson(configResult.value.worldCalendar) !== toCanonicalJson(runRule.worldCalendar)
  ) {
    return failure([
      mismatch(
        "/config/worldCalendar",
        "config.worldCalendar must equal runRuleSnapshot.worldCalendar",
        configResult.value.worldCalendar,
        runRule.worldCalendar,
      ),
    ]);
  }

  const sidecarHashResult = computeInitialWeeklyTrainingSidecarHash(sidecarResult.value, provider);
  if (!sidecarHashResult.ok) {
    return failure(prefixIssues(sidecarHashResult.issues, "/initialWeeklyTrainingSidecarSnapshot"));
  }
  if (sidecarHashResult.value !== identityResult.value.initialWeeklyTrainingSidecarHash) {
    return failure([
      mismatch(
        "/initialWeeklyTrainingSidecarSnapshot",
        "sidecar hash must equal simulationIdentity.initialWeeklyTrainingSidecarHash",
        sidecarHashResult.value,
        identityResult.value.initialWeeklyTrainingSidecarHash,
      ),
    ]);
  }

  const configNormalized = validateNormalizedSprint1Config(runRule.sprint1Config);
  if (!configNormalized.ok) {
    return failure(prefixIssues(configNormalized.issues, "/runRuleSnapshot/sprint1Config"));
  }

  return success({
    seed,
    config: configResult.value,
    nameData,
    simulationIdentity: identityResult.value,
    simulationIdentityHash: object["simulationIdentityHash"],
    runRuleSnapshot: runRule,
    runRuleSnapshotHash: object["runRuleSnapshotHash"],
    initialWeeklyTrainingSidecarSnapshot: sidecarResult.value,
  });
}

/**
 * Reconstruct a Sprint1RunSession from already-validated/normalized RunInit-equivalent
 * materials (saved SimulationIdentity + RunRuleSnapshot + sidecar hash binding).
 * Does not accept or validate display-unit Sprint1CliInput.
 */
export function createSprint1RunSessionFromRunInitializationMaterials(
  input: unknown,
  provider: Sha256Provider,
  deps: CreateSprint1RunSessionDeps = { generateInitialWorld },
): ValidationResult<CreateSprint1RunSessionResult> {
  const parsed = parseCreateSprint1RunSessionFromRunInitializationMaterialsInput(input, provider);
  if (!parsed.ok) {
    return failure(parsed.issues);
  }

  const {
    seed,
    config,
    nameData,
    simulationIdentity,
    simulationIdentityHash,
    runRuleSnapshot,
    runRuleSnapshotHash,
    initialWeeklyTrainingSidecarSnapshot,
  } = parsed.value;

  const sprint1Config: Sprint1Config = runRuleSnapshot.sprint1Config;
  const techniqueCatalogResult = validateTechniqueCatalog(
    {
      identity: {
        dataVersion: runRuleSnapshot.techniqueCatalogDataVersion,
        catalogHash: runRuleSnapshot.techniqueCatalogHash,
      },
      definitions: runRuleSnapshot.techniqueDefinitions,
    },
    provider,
  );
  if (!techniqueCatalogResult.ok) {
    return failure(prefixIssues(techniqueCatalogResult.issues, "/techniqueCatalog"));
  }
  const techniqueCatalog: TechniqueCatalog = techniqueCatalogResult.value;

  const configHash = computeConfigHash(config, provider);
  const nameDataHash = computeNameDataHash(nameData.manifest, provider);
  const rngFactory = deps.rngFactory ?? createSeededRng;

  let generation: InitialWorldGenerationResult;
  try {
    generation = deps.generateInitialWorld({
      config,
      configHash,
      seed,
      nameData,
      nameDataHash,
      rngFactory,
      sha256Provider: provider,
    });
  } catch (error) {
    return wrapGenerateInitialWorldError(error);
  }

  const provisionalSimulationId = generation.snapshot.simulationId;

  const attached = attachSprint1PersonStateToInitialWorld(generation.snapshot);
  if (!attached.ok) {
    return failure(prefixIssues(attached.issues, "/attachSprint1PersonState"));
  }

  const covered = assignInitialActiveTechniqueCoverage(
    attached.value,
    techniqueCatalog.definitions,
  );
  if (!covered.ok) {
    return failure(prefixIssues(covered.issues, "/initialTechniqueCoverage"));
  }

  const sidecarMatch = validatePersonSidecarExactMatch(
    covered.value,
    initialWeeklyTrainingSidecarSnapshot,
  );
  if (!sidecarMatch.ok) {
    return failure(sidecarMatch.issues);
  }

  const matchIdStateResult = createInitialMatchIdGeneratorState({
    seed,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
  });
  if (!matchIdStateResult.ok) {
    return failure(prefixIssues(matchIdStateResult.issues, "/matchIdGeneratorState"));
  }
  const matchIdState: MatchIdGeneratorState = matchIdStateResult.value;

  const matchIdHashResult = computeMatchIdGeneratorStateHash(matchIdState, provider);
  if (!matchIdHashResult.ok) {
    return failure(prefixIssues(matchIdHashResult.issues, "/matchIdGeneratorStateHash"));
  }
  if (matchIdHashResult.value !== simulationIdentity.initialMatchIdGeneratorStateHash) {
    return failure([
      mismatch(
        "/matchIdGeneratorStateHash",
        "fresh MatchIdGeneratorState hash must equal SimulationIdentity.initialMatchIdGeneratorStateHash",
        matchIdHashResult.value,
        simulationIdentity.initialMatchIdGeneratorStateHash,
      ),
    ]);
  }

  const simulationIdResult = createSimulationIdFromIdentity(simulationIdentity, provider);
  if (!simulationIdResult.ok) {
    return failure(prefixIssues(simulationIdResult.issues, "/simulationId"));
  }
  const finalSimulationId = simulationIdResult.value;

  if (runRuleSnapshot.simulationId !== finalSimulationId) {
    return failure([
      mismatch(
        "/runRuleSnapshot/simulationId",
        "runRuleSnapshot.simulationId must equal SimulationIdentity-derived id",
        runRuleSnapshot.simulationId,
        finalSimulationId,
      ),
    ]);
  }

  const promotedWorldResult = promoteProvisionalWorldSnapshot({
    world: covered.value,
    provisionalSimulationId,
    finalSimulationId,
    worldCalendar: config.worldCalendar,
  });
  if (!promotedWorldResult.ok) {
    return failure(prefixIssues(promotedWorldResult.issues, "/promotedWorld"));
  }

  const promotedEventsResult = promoteProvisionalEventStreamToSprint1(
    generation.initialEvents,
    finalSimulationId,
    provisionalSimulationId,
  );
  if (!promotedEventsResult.ok) {
    return failure(prefixIssues(promotedEventsResult.issues, "/promotedEvents"));
  }
  const promotedEvents = promotedEventsResult.value;

  const worldRngState = createInitialSprint1BattleWorldRngState(seed);
  const processorRuntimeStates = createInitialSprint1WeeklyTrainingProcessorRuntimeState(seed);

  const eventAllocationResult = createEventAllocationStateAfterPromotedInitialEvents(
    promotedEvents.length,
  );
  if (!eventAllocationResult.ok) {
    return failure(prefixIssues(eventAllocationResult.issues, "/eventAllocationState"));
  }

  const battleResultWeekResult = createInitialBattleResultWeekState(
    promotedWorldResult.value.worldDate.absoluteWeek,
  );
  if (!battleResultWeekResult.ok) {
    return failure(prefixIssues(battleResultWeekResult.issues, "/battleResultWeekState"));
  }

  const weeklyTrainingSidecarsResult = createWeeklyTrainingSidecarStateFromInitial(
    initialWeeklyTrainingSidecarSnapshot,
  );
  if (!weeklyTrainingSidecarsResult.ok) {
    return failure(prefixIssues(weeklyTrainingSidecarsResult.issues, "/weeklyTrainingSidecars"));
  }

  let worldState;
  try {
    worldState = createWorldEngineState(promotedWorldResult.value);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failure([
      {
        path: "/worldState",
        message: `createWorldEngineState failed: ${detail}`,
        actual: detail,
        expected: "WorldEngineState",
      },
    ]);
  }

  const contextResult = createSprint1RunContext(
    {
      sprint1Config,
      techniqueCatalog,
      initialWeeklyTrainingSidecarSnapshot,
      simulationIdentity,
      simulationIdentityHash,
      simulationId: finalSimulationId,
      runRuleSnapshot,
      runRuleSnapshotHash,
    },
    provider,
  );
  if (!contextResult.ok) {
    return failure(prefixIssues(contextResult.issues, "/context"));
  }

  // Guard: reconstructed identity/rule hashes must remain exactly the saved canonical values.
  if (contextResult.value.simulationIdentityHash !== simulationIdentityHash) {
    return failure([
      mismatch(
        "/simulationIdentityHash",
        "reconstructed simulationIdentityHash drifted from saved material",
        contextResult.value.simulationIdentityHash,
        simulationIdentityHash,
      ),
    ]);
  }
  if (contextResult.value.runRuleSnapshotHash !== runRuleSnapshotHash) {
    return failure([
      mismatch(
        "/runRuleSnapshotHash",
        "reconstructed runRuleSnapshotHash drifted from saved material",
        contextResult.value.runRuleSnapshotHash,
        runRuleSnapshotHash,
      ),
    ]);
  }

  const runtimeState = deepFreezePlainJson({
    worldState,
    worldRngState,
    matchIdGeneratorState: matchIdState,
    weeklyTrainingSidecars: weeklyTrainingSidecarsResult.value,
    processorRuntimeStates,
    eventStream: promotedEvents,
    eventAllocationState: eventAllocationResult.value,
    battleResults: [...createInitialBattleResults()],
    battleResultWeekState: battleResultWeekResult.value,
  }) as Sprint1RunSession["runtimeState"];

  const weekInvariant = assertBattleResultWeekMatchesWorldDate({
    battleResultWeekState: runtimeState.battleResultWeekState,
    worldState: runtimeState.worldState,
  });
  if (!weekInvariant.ok) {
    return failure(prefixIssues(weekInvariant.issues, "/runtimeState"));
  }

  const session: Sprint1RunSession = deepFreezePlainJson({
    context: contextResult.value,
    runtimeState,
  });
  const sessionResult = validateSprint1RunSession(session, provider);
  if (!sessionResult.ok) {
    return failure(prefixIssues(sessionResult.issues, "/session"));
  }

  const initialWorldSnapshotForOutput: Sprint1InitialWorldDocumentSnapshot = deepFreezePlainJson({
    ...cloneValidatedPlainJson(promotedWorldResult.value),
    schemaVersion: INITIAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
    runRuleSnapshot,
    runRuleSnapshotHash,
    initialWeeklyTrainingSidecarSnapshot: contextResult.value.initialWeeklyTrainingSidecarSnapshot,
  });

  return success({
    session: sessionResult.value,
    initialWorldSnapshotForOutput,
    provisionalGenerationMeta: {
      provisionalSimulationId,
      initialEventCount: generation.initialEvents.length,
    },
    transactionalProcessorAdapterPipeline: SPRINT1_TRANSACTIONAL_PROCESSOR_ADAPTER_PIPELINE,
  });
}
