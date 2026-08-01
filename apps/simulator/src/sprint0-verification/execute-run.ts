import {
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  createWorldEngineState,
  generateInitialWorld,
  isLivingPerson,
  RNG_ALGORITHM_VERSION,
  S0_SPEC_VERSION,
  SIMULATION_SPEC_VERSION,
  type EventEnvelope,
  type InitialWorldConfig,
  type InitialWorldSnapshot,
  type ProcessorRuntimeState,
} from "@shared-world/simulation-core";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { buildAndWriteRunOutput } from "../output/build-run-output.js";
import { createNodeFsOps } from "../output/fs-ops.js";
import { createRunIdGenerator } from "../output/run-id.js";
import {
  runSimulationWithYearlyCapture,
  type SimulationWithYearlyResult,
  type YearEndCapture,
} from "../output/run-simulation-yearly.js";
import type {
  FinalWorldDocument,
  PerformanceDocument,
  RunMetadataDocument,
  ValidationReportDocument,
} from "../output/types.js";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import { tryGetGitCommitId } from "../output/git-commit.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Sprint0RunArtifacts = {
  seed: number;
  years: number;
  config: InitialWorldConfig;
  livingCount: number;
  initialSnapshot: InitialWorldSnapshot;
  initialEvents: readonly EventEnvelope[];
  simulation: SimulationWithYearlyResult;
  allEvents: EventEnvelope[];
  runDirectory: string;
  runId: string;
  runMetadata: RunMetadataDocument;
  validationReport: ValidationReportDocument;
  finalWorld: FinalWorldDocument;
  performance: PerformanceDocument;
  fileTexts: Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string>;
  timings: {
    totalMilliseconds: number;
    generationMilliseconds: number;
    simulationMilliseconds: number;
    outputMilliseconds: number;
  };
  processorRuntimeState: ProcessorRuntimeState;
  commitId: string | null;
};

export type ExecuteSprint0RunInput = {
  repoRoot: string;
  outputRoot: string;
  config: InitialWorldConfig;
  seed: number;
  years: number;
  clock?: () => Date;
};

/**
 * Generate initial world, run N years with yearly capture, and write fixed 7 files.
 */
export function executeSprint0Run(input: ExecuteSprint0RunInput): Sprint0RunArtifacts {
  const sha256 = createNodeSha256Provider();
  const fs = createNodeFsOps();
  const clock = input.clock ?? (() => new Date());
  const startedAt = clock();
  const wallStart = Date.now();

  const nameData = loadValidatedNameData({
    cwd: input.repoRoot,
    manifestPath: input.config.nameData.manifestPath,
    requiredVersion: input.config.nameData.requiredVersion,
    initialFamilyCount: input.config.families.initialFamilyCount,
    sha256Provider: sha256,
  });
  const configHash = computeConfigHash(input.config, sha256);
  const nameDataHash = computeNameDataHash(nameData.manifest, sha256);

  const genStart = Date.now();
  const generated = generateInitialWorld({
    config: input.config,
    configHash,
    seed: input.seed,
    nameData,
    nameDataHash,
    rngFactory: createSeededRng,
    sha256Provider: sha256,
  });
  const generationMilliseconds = Date.now() - genStart;

  const simStart = Date.now();
  const simulation = runSimulationWithYearlyCapture({
    initialState: createWorldEngineState(generated.snapshot),
    years: input.years,
    startSequence: generated.initialEvents.length,
    processors: [],
    priorEvents: generated.initialEvents,
  });
  const simulationMilliseconds = Date.now() - simStart;

  const endedAt = clock();
  const runId = createRunIdGenerator(clock).next();
  const outStart = Date.now();
  const written = buildAndWriteRunOutput({
    fs,
    outputRoot: input.outputRoot,
    runId,
    cwd: input.repoRoot,
    seed: input.seed,
    years: input.years,
    configSchemaVersion: input.config.schemaVersion,
    nameDataVersion: nameData.manifest.nameDataVersion,
    configHash,
    nameDataHash,
    rngAlgorithm: RNG_ALGORITHM_VERSION,
    simulationSpecVersion: SIMULATION_SPEC_VERSION,
    miniSpecVersion: S0_SPEC_VERSION,
    performanceTargets: input.config.performanceTargets,
    initialSnapshot: generated.snapshot,
    simulation,
    initialEvents: generated.initialEvents,
    realStartedAt: startedAt,
    realEndedAt: endedAt,
    totalMilliseconds: Date.now() - wallStart,
  });
  const outputMilliseconds = Date.now() - outStart;

  const fileTexts = {} as Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string>;
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    fileTexts[name] = readFileSync(join(written.atomic.runDirectory, name), "utf8");
  }

  const performance = JSON.parse(fileTexts["performance.json"]!) as PerformanceDocument;
  const livingCount = simulation.finalState.persons.filter((p) => isLivingPerson(p)).length;

  return {
    seed: input.seed,
    years: input.years,
    config: input.config,
    livingCount,
    initialSnapshot: generated.snapshot,
    initialEvents: generated.initialEvents,
    simulation,
    allEvents: written.allEvents,
    runDirectory: written.atomic.runDirectory,
    runId,
    runMetadata: written.runMetadata,
    validationReport: written.validationReport,
    finalWorld: written.finalWorld,
    performance,
    fileTexts,
    timings: {
      totalMilliseconds: Date.now() - wallStart,
      generationMilliseconds,
      simulationMilliseconds,
      outputMilliseconds,
    },
    processorRuntimeState: simulation.processorRuntimeState,
    commitId: tryGetGitCommitId(input.repoRoot),
  };
}

export function freezeYearEnds(yearEnds: readonly YearEndCapture[]): readonly YearEndCapture[] {
  return yearEnds.map((entry) => ({
    worldYear: entry.worldYear,
    state: entry.state,
    integrity: entry.integrity,
    row: { ...entry.row },
  }));
}
