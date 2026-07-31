import type {
  EventEnvelope,
  InitialWorldSnapshot,
  PerformanceTargetsConfig,
  RunId,
  SimulationId,
  WorldEngineState,
} from "@shared-world/simulation-core";
import { eventsToJsonl, isLivingPerson } from "@shared-world/simulation-core";
import {
  toCanonicalJsonFile,
  writeRunOutputAtomic,
  type AtomicWriteResult,
  type RunOutputContents,
} from "./atomic-write.js";
import { FIXED_OUTPUT_FILE_NAMES, TECHNICAL_DECISION_VERSION } from "./fixed-files.js";
import type { FsOps } from "./fs-ops.js";
import { tryGetGitCommitId } from "./git-commit.js";
import { buildPerformanceDocument, readMaxRssKilobytes } from "./performance.js";
import type { SimulationWithYearlyResult } from "./run-simulation-yearly.js";
import type {
  FinalWorldDocument,
  ReferenceIntegrityResult,
  RunMetadataDocument,
  RunTerminationStatus,
  ValidationReportDocument,
} from "./types.js";
import { buildValidationReport, summarizeValidationFailure } from "./validation-report.js";
import { verifyReloadedRunOutputContents } from "./verify-run-output.js";
import { yearlyStatisticsToCsv } from "./yearly-statistics.js";

export type BuildAndWriteRunOutputInput = {
  fs: FsOps;
  outputRoot: string;
  runId: RunId;
  cwd: string;
  seed: number;
  years: number;
  configSchemaVersion: string;
  nameDataVersion: string;
  configHash: string;
  nameDataHash: string;
  rngAlgorithm: string;
  simulationSpecVersion: string;
  miniSpecVersion: string;
  performanceTargets: PerformanceTargetsConfig;
  initialSnapshot: InitialWorldSnapshot;
  simulation: SimulationWithYearlyResult;
  initialEvents: readonly EventEnvelope[];
  realStartedAt: Date;
  realEndedAt: Date;
  totalMilliseconds: number;
  afterTempWrite?: (tempDirectory: string) => void;
};

export type BuildAndWriteRunOutputResult = {
  atomic: AtomicWriteResult;
  runMetadata: RunMetadataDocument;
  validationReport: ValidationReportDocument;
  allEvents: EventEnvelope[];
  finalWorld: FinalWorldDocument;
};

function toIsoUtc(date: Date): string {
  return date.toISOString();
}

function buildFinalWorldDocument(
  state: WorldEngineState,
  finalEventSequence: number | null,
  referenceIntegrity: ReferenceIntegrityResult,
): FinalWorldDocument {
  return {
    schemaVersion: state.schemaVersion,
    simulationSpecVersion: state.simulationSpecVersion,
    nameDataVersion: state.nameDataVersion,
    simulationId: state.simulationId,
    worldId: state.worldId,
    worldDate: state.worldDate,
    configProfileId: state.configProfileId,
    configHash: state.configHash,
    seed: state.seed,
    rngAlgorithm: state.rngAlgorithm,
    persons: state.persons,
    families: state.families,
    lineages: state.lineages,
    relationships: state.relationships,
    generationSummary: state.generationSummary,
    finalEventSequence,
    referenceIntegrity,
  };
}

function buildRunMetadata(input: {
  runId: RunId;
  simulationId: SimulationId;
  simulationSpecVersion: string;
  miniSpecVersion: string;
  configSchemaVersion: string;
  nameDataVersion: string;
  configHash: string;
  nameDataHash: string;
  seed: number;
  rngAlgorithm: string;
  yearsExecuted: number;
  weeksExecuted: number;
  commitId: string | null;
  realStartedAt: Date;
  realEndedAt: Date;
  termination: RunTerminationStatus;
}): RunMetadataDocument {
  return {
    runId: input.runId,
    simulationId: input.simulationId,
    simulationSpecVersion: input.simulationSpecVersion,
    miniSpecVersion: input.miniSpecVersion,
    technicalDecisionVersion: TECHNICAL_DECISION_VERSION,
    configSchemaVersion: input.configSchemaVersion,
    nameDataVersion: input.nameDataVersion,
    configHash: input.configHash,
    nameDataHash: input.nameDataHash,
    seed: input.seed,
    rngAlgorithm: input.rngAlgorithm,
    yearsExecuted: input.yearsExecuted,
    weeksExecuted: input.weeksExecuted,
    commitId: input.commitId,
    realStartedAt: toIsoUtc(input.realStartedAt),
    realEndedAt: toIsoUtc(input.realEndedAt),
    termination: input.termination,
    outputFiles: FIXED_OUTPUT_FILE_NAMES.map((fileName) => ({
      fileName,
      relativePath: fileName,
    })),
  };
}

function countLivingPersons(state: WorldEngineState): number {
  let count = 0;
  for (const person of state.persons) {
    if (isLivingPerson(person)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Assemble the fixed 7 files and write them atomically under outputRoot/runId.
 * Validation failure still writes a complete 7-file run with termination.failed.
 */
export function buildAndWriteRunOutput(
  input: BuildAndWriteRunOutputInput,
): BuildAndWriteRunOutputResult {
  const allEvents = [...input.initialEvents, ...input.simulation.events];
  const eventsJsonl = eventsToJsonl(allEvents, { expectedStartSequence: 0 });
  const finalEventSequence =
    allEvents.length === 0 ? null : allEvents[allEvents.length - 1]!.sequence;

  const finalWorld = buildFinalWorldDocument(
    input.simulation.finalState,
    finalEventSequence,
    input.simulation.finalIntegrity,
  );

  const validationReport = buildValidationReport({
    finalIntegrity: input.simulation.finalIntegrity,
  });

  const termination: RunTerminationStatus = validationReport.overallPassed
    ? { kind: "completed" }
    : { kind: "failed", reason: summarizeValidationFailure(validationReport) };

  const yearlyCsv = yearlyStatisticsToCsv(input.simulation.yearEnds.map((y) => y.row));

  const runMetadata = buildRunMetadata({
    runId: input.runId,
    simulationId: input.simulation.finalState.simulationId,
    simulationSpecVersion: input.simulationSpecVersion,
    miniSpecVersion: input.miniSpecVersion,
    configSchemaVersion: input.configSchemaVersion,
    nameDataVersion: input.nameDataVersion,
    configHash: input.configHash,
    nameDataHash: input.nameDataHash,
    seed: input.seed,
    rngAlgorithm: input.rngAlgorithm,
    yearsExecuted: input.years,
    weeksExecuted: input.simulation.weeksExecuted,
    commitId: tryGetGitCommitId(input.cwd),
    realStartedAt: input.realStartedAt,
    realEndedAt: input.realEndedAt,
    termination,
  });

  const otherFileContents = {
    "run-metadata.json": toCanonicalJsonFile(runMetadata),
    "initial-world.json": toCanonicalJsonFile(input.initialSnapshot),
    "final-world.json": toCanonicalJsonFile(finalWorld),
    "yearly-statistics.csv": yearlyCsv,
    "events.jsonl": eventsJsonl,
    "validation-report.json": toCanonicalJsonFile(validationReport),
  } as const;

  const { text: performanceText } = buildPerformanceDocument({
    targets: input.performanceTargets,
    totalMilliseconds: input.totalMilliseconds,
    yearsExecuted: input.years,
    weeksExecuted: input.simulation.weeksExecuted,
    personCount: countLivingPersons(input.simulation.finalState),
    eventCount: allEvents.length,
    maxRssKilobytes: readMaxRssKilobytes(),
    otherFileContents,
  });

  const contents: RunOutputContents = {
    ...otherFileContents,
    "performance.json": performanceText,
  };

  const atomic = writeRunOutputAtomic({
    fs: input.fs,
    outputRoot: input.outputRoot,
    runId: input.runId,
    contents,
    verifyReloadedContents: verifyReloadedRunOutputContents,
    ...(input.afterTempWrite !== undefined ? { afterTempWrite: input.afterTempWrite } : {}),
  });

  return {
    atomic,
    runMetadata,
    validationReport,
    allEvents,
    finalWorld,
  };
}
