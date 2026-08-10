import type {
  CreateSprint1RunSessionResult,
  PerformanceTargetsConfig,
  RunId,
  Sha256Provider,
  Sprint1EventEnvelope,
} from "@shared-world/simulation-core";
import {
  EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
  FINAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  RUN_METADATA_DOCUMENT_SCHEMA_VERSION_SPRINT1,
  S1_SPEC_VERSION,
  isLivingPerson,
} from "@shared-world/simulation-core";
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
import type { Sprint1SimulationWithYearlyResult } from "./run-sprint1-simulation-yearly.js";
import { sprint1EventsToJsonl } from "./sprint1-events-jsonl.js";
import type {
  ReferenceIntegrityResult,
  RunTerminationStatus,
  Sprint1FinalWorldDocument,
  Sprint1RunMetadataDocument,
  ValidationReportDocument,
} from "./types.js";
import { buildSprint1ValidationReport } from "./validation-report-sprint1.js";
import { summarizeValidationFailure } from "./validation-report.js";
import { createSprint1ReloadedRunOutputVerifier } from "./verify-run-output.js";
import { yearlyStatisticsToCsv } from "./yearly-statistics.js";

export type BuildAndWriteSprint1RunOutputInput = {
  fs: FsOps;
  outputRoot: string;
  runId: RunId;
  cwd: string;
  nameDataHash: string;
  nameDataVersion: string;
  configSchemaVersion: string;
  simulationSpecVersion: string;
  miniSpecVersion?: string;
  performanceTargets: PerformanceTargetsConfig;
  createResult: CreateSprint1RunSessionResult;
  simulation: Sprint1SimulationWithYearlyResult;
  provider: Sha256Provider;
  realStartedAt: Date;
  realEndedAt: Date;
  totalMilliseconds: number;
  afterTempWrite?: (tempDirectory: string) => void;
};

export type BuildAndWriteSprint1RunOutputResult = {
  atomic: AtomicWriteResult;
  runMetadata: Sprint1RunMetadataDocument;
  validationReport: ValidationReportDocument;
  allEvents: Sprint1EventEnvelope[];
  finalWorld: Sprint1FinalWorldDocument;
};

function toIsoUtc(date: Date): string {
  return date.toISOString();
}

function buildSprint1FinalWorldDocument(
  session: CreateSprint1RunSessionResult["session"],
  finalEventSequence: number | null,
  referenceIntegrity: ReferenceIntegrityResult,
): Sprint1FinalWorldDocument {
  const state = session.runtimeState.worldState;
  return {
    schemaVersion: FINAL_WORLD_DOCUMENT_SCHEMA_VERSION_SPRINT1,
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
    weeklyTrainingSidecars: session.runtimeState.weeklyTrainingSidecars,
    battleResults: session.runtimeState.battleResults,
    finalEventSequence,
    referenceIntegrity,
  };
}

function buildSprint1RunMetadata(input: {
  runId: RunId;
  session: CreateSprint1RunSessionResult["session"];
  nameDataHash: string;
  nameDataVersion: string;
  configSchemaVersion: string;
  simulationSpecVersion: string;
  miniSpecVersion: string;
  yearsExecuted: number;
  weeksExecuted: number;
  commitId: string | null;
  realStartedAt: Date;
  realEndedAt: Date;
  termination: RunTerminationStatus;
}): Sprint1RunMetadataDocument {
  const { session } = input;
  const identity = session.context.simulationIdentity;
  return {
    schemaVersion: RUN_METADATA_DOCUMENT_SCHEMA_VERSION_SPRINT1,
    runId: input.runId,
    simulationId: session.context.simulationId,
    simulationIdentity: identity,
    simulationIdentityHash: session.context.simulationIdentityHash,
    eventEnvelopeSchemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    simulationSpecVersion: input.simulationSpecVersion,
    miniSpecVersion: input.miniSpecVersion,
    technicalDecisionVersion: TECHNICAL_DECISION_VERSION,
    configSchemaVersion: input.configSchemaVersion,
    nameDataVersion: input.nameDataVersion,
    configHash: identity.initialWorldConfigHash,
    nameDataHash: input.nameDataHash,
    seed: identity.seed,
    rngAlgorithm: identity.rngAlgorithmVersion,
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

function countLivingPersons(session: CreateSprint1RunSessionResult["session"]): number {
  let count = 0;
  for (const person of session.runtimeState.worldState.persons) {
    if (isLivingPerson(person)) {
      count += 1;
    }
  }
  return count;
}

/**
 * Assemble Sprint 1 fixed 7 files and write them atomically under outputRoot/runId.
 */
export function buildAndWriteSprint1RunOutput(
  input: BuildAndWriteSprint1RunOutputInput,
): BuildAndWriteSprint1RunOutputResult {
  const session = input.simulation.finalSession;
  const initialWorldSnapshot = input.createResult.initialWorldSnapshotForOutput;
  const miniSpecVersion = input.miniSpecVersion ?? S1_SPEC_VERSION;
  const allEvents = [...session.runtimeState.eventStream];
  const eventsJsonl = sprint1EventsToJsonl(allEvents, { expectedStartSequence: 0 });
  const finalEventSequence =
    allEvents.length === 0 ? null : allEvents[allEvents.length - 1]!.sequence;

  const finalWorld = buildSprint1FinalWorldDocument(
    session,
    finalEventSequence,
    input.simulation.finalIntegrity,
  );

  const validationReport = buildSprint1ValidationReport({
    session,
    initialWorldSnapshot,
    finalWorld,
    events: allEvents,
    finalIntegrity: input.simulation.finalIntegrity,
    provider: input.provider,
  });

  const termination: RunTerminationStatus = validationReport.overallPassed
    ? { kind: "completed" }
    : { kind: "failed", reason: summarizeValidationFailure(validationReport) };

  const yearlyCsv = yearlyStatisticsToCsv(input.simulation.yearEnds.map((yearEnd) => yearEnd.row));

  const runMetadata = buildSprint1RunMetadata({
    runId: input.runId,
    session,
    nameDataHash: input.nameDataHash,
    nameDataVersion: input.nameDataVersion,
    configSchemaVersion: input.configSchemaVersion,
    simulationSpecVersion: input.simulationSpecVersion,
    miniSpecVersion,
    yearsExecuted: input.simulation.yearEnds.length,
    weeksExecuted: input.simulation.weeksExecuted,
    commitId: tryGetGitCommitId(input.cwd),
    realStartedAt: input.realStartedAt,
    realEndedAt: input.realEndedAt,
    termination,
  });

  const otherFileContents = {
    "run-metadata.json": toCanonicalJsonFile(runMetadata),
    "initial-world.json": toCanonicalJsonFile(initialWorldSnapshot),
    "final-world.json": toCanonicalJsonFile(finalWorld),
    "yearly-statistics.csv": yearlyCsv,
    "events.jsonl": eventsJsonl,
    "validation-report.json": toCanonicalJsonFile(validationReport),
  } as const;

  const { text: performanceText } = buildPerformanceDocument({
    targets: input.performanceTargets,
    totalMilliseconds: input.totalMilliseconds,
    yearsExecuted: input.simulation.yearEnds.length,
    weeksExecuted: input.simulation.weeksExecuted,
    personCount: countLivingPersons(session),
    eventCount: allEvents.length,
    maxRssKilobytes: readMaxRssKilobytes(),
    otherFileContents,
  });

  const contents: RunOutputContents = {
    ...otherFileContents,
    "performance.json": performanceText,
  };
  const verifyReloadedContents = createSprint1ReloadedRunOutputVerifier({
    provider: input.provider,
    session,
    expectedContents: contents,
    expectedRunMetadata: runMetadata,
    expectedFinalWorld: finalWorld,
    expectedValidationReport: validationReport,
    initialWorldSnapshot,
  });

  const atomic = writeRunOutputAtomic({
    fs: input.fs,
    outputRoot: input.outputRoot,
    runId: input.runId,
    contents,
    verifyReloadedContents,
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
