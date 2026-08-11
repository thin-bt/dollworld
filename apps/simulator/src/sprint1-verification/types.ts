/**
 * Sprint 1 completion report wire types (verification schema 0.1.0).
 * Status vocabulary is fixed by S01-009 clarifier; do not invent aliases.
 */

export const VERIFICATION_STATUSES = ["passed", "failed", "not_performed", "blocked"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export type VerificationIssue = {
  code: string;
  message: string;
  scope: string;
};

export type CommandGateResult = {
  command: string;
  exitCode: number;
  passed: boolean;
};

export type CheckSection = {
  npmCheck: CommandGateResult;
  wikiCheck: CommandGateResult;
  diffCheck: CommandGateResult;
};

export type RunArtifactRef = {
  runKey: string;
  /** Relative to `output/sprint1-verification/` (includes `runs/<run-key>/<runId>/`). */
  relativeRunDirectory: string;
};

export type SameSeedSection = {
  status: VerificationStatus;
  seed: number;
  years: number;
  runA: RunArtifactRef;
  runB: RunArtifactRef;
  deterministicMatch: boolean;
  detail: string;
};

export type DifferentSeedSection = {
  status: VerificationStatus;
  baseSeed: number;
  alternateSeed: number;
  years: number;
  baseRun: RunArtifactRef;
  alternateRun: RunArtifactRef;
  simulationIdsDiffer: boolean;
  seedsDiffer: boolean;
  domainContentDiffers: boolean;
  detail: string;
};

export type BoundarySeedSection = {
  seed: number;
  status: VerificationStatus;
  years: number;
  deterministicMatch: boolean;
  runA: RunArtifactRef;
  runB: RunArtifactRef;
  /** Boundary long-horizon performance is explicitly not required. */
  longHorizonPerformance: VerificationStatus;
  detail: string;
};

export type YearProfileSection = {
  years: number;
  status: VerificationStatus;
  weeksExecuted: number;
  csvDataRows: number;
  finalWorldYear: number;
  sevenFilesPassed: boolean;
  validationPassed: boolean;
  run: RunArtifactRef;
  /** Per-run maxRSS is not attributed for in-process year profiles. */
  maxRssMeasurement: VerificationStatus;
  detail: string;
};

export type IntegratedScenarioSection = {
  status: VerificationStatus;
  seed: number;
  weeksExecuted: number;
  yearsExecuted: number;
  techniqueActorPersonId: string | null;
  battleParticipants: readonly string[];
  battleKind: "official";
  strategy: "default_strategy";
  weekRegistryReset: boolean;
  globalBattleResultsRetained: boolean;
  deterministicMatch: boolean;
  runA: RunArtifactRef;
  runB: RunArtifactRef;
  checkpointDigestsMatch: boolean;
  detail: string;
};

export type IdentityAndCanonicalSection = {
  status: VerificationStatus;
  pathIndependencePassed: boolean;
  sidecarMotivationMutationChangesHashes: boolean;
  keyOrderInvariancePassed: boolean;
  mathRandomCallExpressions: number;
  detail: string;
};

export type FixedSevenSection = {
  status: VerificationStatus;
  inspectedRunCount: number;
  allExactlySeven: boolean;
  detail: string;
};

export type PerformanceProfileSection = {
  /** Living-population target (not WorldState.persons.length). */
  targetLivingPopulation: number;
  years: number;
  seed: number;
  status: VerificationStatus;
  actualLivingPopulation: number | null;
  totalPersonCount: number | null;
  sidecarCount: number | null;
  elapsedSeconds: number | null;
  maxRssKilobytes: number | null;
  eventCount: number | null;
  exitCode: number | null;
  validationPassed: boolean;
  finalWorldDate: string | null;
  functionalPassed: boolean;
  detail: string;
};

export type Sprint0RegressionSection = {
  status: VerificationStatus;
  exitCode: number;
  overallPassed: boolean | null;
  functionalFailureCount: number | null;
  warningCount: number | null;
  performanceWarnings: readonly string[];
  detail: string;
};

export type Sprint1CompletionReport = {
  schemaVersion: "0.1.0";
  sprint: "sprint1";
  specVersion: "S1-SPEC-0.1.20";
  generatedAtUtc: string;
  gitCommit: string;
  workingTreeDirty: boolean;
  overallPassed: boolean;
  functionalFailureCount: number;
  warningCount: number;
  failures: VerificationIssue[];
  warnings: VerificationIssue[];
  sameSeed: SameSeedSection;
  differentSeed: DifferentSeedSection;
  boundarySeeds: BoundarySeedSection[];
  yearProfiles: YearProfileSection[];
  integratedScenario: IntegratedScenarioSection;
  identityAndCanonical: IdentityAndCanonicalSection;
  fixedSeven: FixedSevenSection;
  performanceProfiles: PerformanceProfileSection[];
  sprint0Regression: Sprint0RegressionSection;
  check: CheckSection;
};
