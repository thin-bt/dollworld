import type {
  EventId,
  FamilyId,
  LineageId,
  PersonId,
  RelationshipId,
  RunId,
  SimulationId,
  WorldDate,
  WorldEngineState,
} from "@shared-world/simulation-core";
import type {
  BattleResult,
  SimulationIdentity,
  WeeklyTrainingSidecarState,
} from "@shared-world/simulation-core";
import type { FixedOutputFileName } from "./fixed-files.js";

export type IsoUtcTimestamp = string;

export type RunTerminationStatus = { kind: "completed" } | { kind: "failed"; reason: string };

export type OutputFileListing = {
  fileName: FixedOutputFileName;
  /** Relative path from run directory (file name only). Excluded from determinism compare. */
  relativePath: string;
};

export type RunMetadataDocument = {
  runId: RunId;
  simulationId: SimulationId;
  simulationSpecVersion: string;
  miniSpecVersion: string;
  technicalDecisionVersion: string;
  configSchemaVersion: string;
  nameDataVersion: string;
  configHash: string;
  nameDataHash: string;
  seed: number;
  rngAlgorithm: string;
  yearsExecuted: number;
  weeksExecuted: number;
  /** Git commit when available; null when unavailable. */
  commitId: string | null;
  realStartedAt: IsoUtcTimestamp;
  realEndedAt: IsoUtcTimestamp;
  termination: RunTerminationStatus;
  outputFiles: OutputFileListing[];
};

/** Sprint 1 new-run run-metadata.json (schemaVersion 0.4.0). */
export type Sprint1RunMetadataDocument = RunMetadataDocument & {
  schemaVersion: "0.4.0";
  simulationIdentity: SimulationIdentity;
  simulationIdentityHash: string;
  eventEnvelopeSchemaVersion: "0.2.0";
};

export type BrokenReferenceViolation = {
  targetIds: string[];
  reason: string;
  severity: "error";
};

export type CycleViolation = {
  kind: "parent_child" | "master_disciple";
  targetIds: string[];
  reason: string;
  severity: "error";
};

export type AgeViolation = {
  personId: PersonId;
  reason: string;
  severity: "error";
};

export type StatusViolation = {
  personId: PersonId;
  reason: string;
  severity: "error";
};

export type SelfReferenceViolation = {
  relationshipId: string;
  personIds: string[];
  reason: string;
  severity: "error";
};

export type ReferenceIntegrityResult = {
  brokenReferenceCount: number;
  brokenReferences: BrokenReferenceViolation[];
  selfReferenceCount: number;
  selfReferences: SelfReferenceViolation[];
  parentCycleCount: number;
  masterCycleCount: number;
  cycles: CycleViolation[];
  ageViolations: AgeViolation[];
  statusViolations: StatusViolation[];
  invariantViolationCount: number;
  passed: boolean;
};

export type FinalWorldDocument = {
  schemaVersion: string;
  simulationSpecVersion: string;
  nameDataVersion: string;
  simulationId: SimulationId;
  worldId: WorldEngineState["worldId"];
  worldDate: WorldDate;
  configProfileId: string;
  configHash: string;
  seed: number;
  rngAlgorithm: WorldEngineState["rngAlgorithm"];
  persons: WorldEngineState["persons"];
  families: WorldEngineState["families"];
  lineages: WorldEngineState["lineages"];
  relationships: WorldEngineState["relationships"];
  generationSummary: WorldEngineState["generationSummary"];
  /** Last EventEnvelope.sequence in events.jsonl; null when no events. */
  finalEventSequence: number | null;
  referenceIntegrity: ReferenceIntegrityResult;
};

/** Sprint 1 new-run final-world.json (schemaVersion 0.3.0). */
export type Sprint1FinalWorldDocument = Omit<FinalWorldDocument, "schemaVersion"> & {
  schemaVersion: "0.3.0";
  weeklyTrainingSidecars: WeeklyTrainingSidecarState;
  battleResults: readonly BattleResult[];
};

export type ValidationCheckStatus = "passed" | "failed" | "not_performed";

export type ValidationCheckResult = {
  name: string;
  status: ValidationCheckStatus;
  violationCount: number;
  targetIds: string[];
  reasons: string[];
  severity: "error" | "warning" | "info" | "none";
  canContinue: boolean;
};

export type ValidationReportDocument = {
  overallPassed: boolean;
  checks: ValidationCheckResult[];
  brokenReferences: BrokenReferenceViolation[];
  cycles: CycleViolation[];
  ageViolations: AgeViolation[];
  statusViolations: StatusViolation[];
  sameSeedComparison: {
    status: ValidationCheckStatus;
    detail: string;
  };
  brokenReferenceCount: number;
  invariantViolationCount: number;
};

export type PerformanceWarningComparison = {
  populationBand: "600" | "2000" | "other";
  warningSeconds: number | null;
  actualSeconds: number;
  exceeded: boolean;
};

export type PerformanceDocument = {
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
    osType: string;
    osRelease: string;
    cpuModel: string | null;
    cpuCount: number | null;
  };
  timing: {
    totalMilliseconds: number;
    averageMillisecondsPerYear: number;
    averageMillisecondsPerWeek: number;
  };
  memory: {
    /** Peak RSS from process.resourceUsage().maxRSS (kilobytes per Node.js). */
    maxRssKilobytes: number | null;
  };
  counts: {
    personCount: number;
    weeksExecuted: number;
    eventCount: number;
  };
  output: {
    /** Sum of byte sizes of all 7 fixed output files (UTF-8). */
    totalBytes: number;
    fileBytes: { fileName: FixedOutputFileName; bytes: number }[];
  };
  performanceTargets: {
    warningSecondsFor600People100Years: number;
    warningSecondsFor2000People100Years: number;
    measureOnlyPopulation: number;
  };
  warningComparison: PerformanceWarningComparison;
  warnings: string[];
};

export type EntityId =
  PersonId | FamilyId | LineageId | RelationshipId | EventId | SimulationId | RunId;
