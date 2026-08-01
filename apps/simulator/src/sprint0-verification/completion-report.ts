import { toCanonicalJson } from "@shared-world/simulation-core";
import { TECHNICAL_DECISION_VERSION } from "../output/fixed-files.js";
import type { YearlyStatisticsRow } from "../output/yearly-statistics.js";
import { SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION } from "./constants.js";
import type {
  DeterminismComparisonResult,
  DifferentSeedComparisonResult,
} from "./determinism-verification.js";
import type { InvariantVerificationResult } from "./invariant-verification.js";
import type { Sprint0RunArtifacts } from "./execute-run.js";
import type { SameSeedRunCheck } from "./same-seed-verification.js";

export type VerificationCheckStatus = "passed" | "failed" | "not_performed" | "warning";

export type UnavailableStatistic = {
  available: false;
};

export type YearProfileFinalStatistics = {
  livingCount: number;
  ageBands: {
    age0To7: number;
    age8To15: number;
    age16To17: number;
    age18To41: number;
    age42Plus: number;
  };
  career: {
    child: number;
    trainee: number;
    activeCompetitor: number;
    retired: number;
  };
  ranks: {
    rankNone: number;
    rankF: number;
    rankE: number;
    rankD: number;
    rankC: number;
    rankB: number;
    rankA: number;
    rankS: number;
  };
  familyCount: number;
  lineageCount: number;
  qualifiedMasterCount: number;
  mastersWithDisciplesCount: number;
  maximumDiscipleCount: number;
  births: UnavailableStatistic;
  deaths: UnavailableStatistic;
  brokenReferenceCount: number;
  invariantViolationCount: number;
  eventCountCumulative: number;
};

export type YearProfileResult = {
  years: number;
  weeksExecuted: number;
  csvRows: number;
  finalWorldDate: {
    year: number;
    month: number;
    weekOfMonth: number;
    absoluteWeek: number;
  };
  eventCount: number;
  livingCount: number;
  totalMilliseconds: number;
  averageMillisecondsPerYear: number;
  /**
   * Year profiles run sequentially in the shared suite process, so a per-run peak
   * RSS cannot be attributed. Always null; see maxRssMeasurementScope.
   */
  maxRssKilobytes: null;
  maxRssMeasurementScope: "not_measured_per_run";
  outputBytes: number;
  invariantsPassed: boolean;
  sevenFilesPassed: boolean;
  finalYearStatistics: YearProfileFinalStatistics;
};

export type PopulationPerformanceResult = {
  population: number;
  years: number;
  livingCount: number;
  totalMilliseconds: number;
  actualSeconds: number;
  averageMillisecondsPerYear: number;
  warningSeconds: number | null;
  exceeded: boolean;
  measureOnly: boolean;
  maxRssKilobytes: number | null;
  outputBytes: number;
  eventCount: number;
  warnings: string[];
};

export type BoundarySeedRunCheck = {
  /** first / second execution of the same boundary seed and config. */
  run: "first" | "second";
  invariantsPassed: boolean;
  validationPassed: boolean;
  terminationPassed: boolean;
  sevenFilesPassed: boolean;
};

export type BoundarySeedVerification = {
  seed: number;
  determinismPassed: boolean;
  differenceCount: number;
  runs: BoundarySeedRunCheck[];
  passed: boolean;
};

export type BoundarySeedReportEntry = {
  seed: number;
  status: VerificationCheckStatus;
  determinismStatus: VerificationCheckStatus;
  differenceCount: number;
  runs: BoundarySeedRunCheck[];
};

export type Sprint0CompletionReport = {
  schemaVersion: typeof SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION;
  generatedAt: string;
  commitId: string | null;
  /** true when tracked files differ from HEAD at report generation time. */
  workingTreeDirty: boolean | null;
  environment: {
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  versions: {
    simulationSpecVersion: string;
    miniSpecVersion: string;
    technicalDecisionVersion: string;
    configSchemaVersion: string;
    nameDataVersion: string;
    rngAlgorithm: string;
  };
  seeds: {
    primary: number;
    alternate: number;
    boundary: number[];
  };
  sameSeedComparison: {
    status: VerificationCheckStatus;
    differenceCount: number;
    differences: DeterminismComparisonResult["differences"];
    runs: SameSeedRunCheck[];
  };
  differentSeedComparison: {
    status: VerificationCheckStatus;
    detail: string;
    simulationIdsDiffer: boolean;
    initialWorldDiffers: boolean;
    finalWorldDiffers: boolean;
  };
  boundarySeedDeterminism: {
    status: VerificationCheckStatus;
    results: BoundarySeedReportEntry[];
  };
  invariants: {
    status: VerificationCheckStatus;
    issueCount: number;
    issues: InvariantVerificationResult["issues"];
  };
  yearProfiles: YearProfileResult[];
  populationProfiles: PopulationPerformanceResult[];
  performanceWarnings: string[];
  sevenFiles: {
    status: VerificationCheckStatus;
    detail: string;
  };
  validation: {
    status: VerificationCheckStatus;
    overallPassedSamples: boolean;
  };
  overallPassed: boolean;
  functionalFailureCount: number;
  warningCount: number;
  notPerformed: string[];
};

export function buildFinalYearStatistics(row: YearlyStatisticsRow): YearProfileFinalStatistics {
  return {
    livingCount: row.livingCount,
    ageBands: {
      age0To7: row.age0To7,
      age8To15: row.age8To15,
      age16To17: row.age16To17,
      age18To41: row.age18To41,
      age42Plus: row.age42Plus,
    },
    career: {
      child: row.childCount,
      trainee: row.traineeCount,
      activeCompetitor: row.activeCompetitorCount,
      retired: row.retiredCount,
    },
    ranks: {
      rankNone: row.rankNone,
      rankF: row.rankF,
      rankE: row.rankE,
      rankD: row.rankD,
      rankC: row.rankC,
      rankB: row.rankB,
      rankA: row.rankA,
      rankS: row.rankS,
    },
    familyCount: row.familyCount,
    lineageCount: row.lineageCount,
    qualifiedMasterCount: row.qualifiedMasterCount,
    mastersWithDisciplesCount: row.mastersWithDisciplesCount,
    maximumDiscipleCount: row.maximumDiscipleCount,
    births: { available: false },
    deaths: { available: false },
    brokenReferenceCount: row.brokenReferenceCount,
    invariantViolationCount: row.invariantViolationCount,
    eventCountCumulative: row.eventCountCumulative,
  };
}

export function buildYearProfile(
  artifacts: Sprint0RunArtifacts,
  invariantsPassed: boolean,
  sevenFilesPassed: boolean,
): YearProfileResult {
  const lastYear = artifacts.simulation.yearEnds[artifacts.simulation.yearEnds.length - 1];
  if (lastYear === undefined) {
    throw new Error(`year profile for ${String(artifacts.years)} years has no year-end rows`);
  }
  const totalMilliseconds = artifacts.timings.totalMilliseconds;
  return {
    years: artifacts.years,
    weeksExecuted: artifacts.simulation.weeksExecuted,
    csvRows: artifacts.simulation.yearEnds.length,
    finalWorldDate: { ...artifacts.simulation.finalState.worldDate },
    eventCount: artifacts.allEvents.length,
    livingCount: artifacts.livingCount,
    totalMilliseconds,
    averageMillisecondsPerYear: artifacts.years === 0 ? 0 : totalMilliseconds / artifacts.years,
    maxRssKilobytes: null,
    maxRssMeasurementScope: "not_measured_per_run",
    outputBytes: artifacts.performance.output.totalBytes,
    invariantsPassed,
    sevenFilesPassed,
    finalYearStatistics: buildFinalYearStatistics(lastYear.row),
  };
}

export function buildPopulationPerformanceResult(input: {
  population: number;
  years: number;
  livingCount: number;
  totalMilliseconds: number;
  maxRssKilobytes: number | null;
  outputBytes: number;
  eventCount: number;
  warningSeconds: number | null;
  measureOnly: boolean;
}): PopulationPerformanceResult {
  const actualSeconds = input.totalMilliseconds / 1000;
  const averageMillisecondsPerYear = input.years === 0 ? 0 : input.totalMilliseconds / input.years;
  const exceeded =
    !input.measureOnly && input.warningSeconds !== null && actualSeconds > input.warningSeconds;
  const warnings: string[] = [];
  if (exceeded && input.warningSeconds !== null) {
    warnings.push(
      `${String(input.population)} people / ${String(input.years)} years: ${String(actualSeconds)}s exceeded ${String(input.warningSeconds)}s`,
    );
  }
  return {
    population: input.population,
    years: input.years,
    livingCount: input.livingCount,
    totalMilliseconds: input.totalMilliseconds,
    actualSeconds,
    averageMillisecondsPerYear,
    warningSeconds: input.warningSeconds,
    exceeded,
    measureOnly: input.measureOnly,
    maxRssKilobytes: input.maxRssKilobytes,
    outputBytes: input.outputBytes,
    eventCount: input.eventCount,
    warnings,
  };
}

export function buildPopulationPerformanceResultFromArtifacts(input: {
  population: number;
  artifacts: Sprint0RunArtifacts;
  warningSeconds: number | null;
  measureOnly: boolean;
}): PopulationPerformanceResult {
  return buildPopulationPerformanceResult({
    population: input.population,
    years: input.artifacts.years,
    livingCount: input.artifacts.livingCount,
    totalMilliseconds: input.artifacts.timings.totalMilliseconds,
    maxRssKilobytes: input.artifacts.performance.memory.maxRssKilobytes,
    outputBytes: input.artifacts.performance.output.totalBytes,
    eventCount: input.artifacts.allEvents.length,
    warningSeconds: input.warningSeconds,
    measureOnly: input.measureOnly,
  });
}

export function buildSprint0CompletionReport(input: {
  generatedAt: Date;
  commitId: string | null;
  workingTreeDirty: boolean | null;
  simulationSpecVersion: string;
  miniSpecVersion: string;
  configSchemaVersion: string;
  nameDataVersion: string;
  rngAlgorithm: string;
  primarySeed: number;
  alternateSeed: number;
  boundarySeeds: readonly number[];
  sameSeed: DeterminismComparisonResult;
  /** Independent checks for the same-seed first/second runs (years100a / years100b). */
  sameSeedRuns: readonly SameSeedRunCheck[];
  differentSeed: DifferentSeedComparisonResult;
  boundarySeedDeterminism: {
    passed: boolean;
    results: BoundarySeedVerification[];
  };
  invariants: InvariantVerificationResult;
  yearProfiles: YearProfileResult[];
  populationProfiles: PopulationPerformanceResult[];
  sevenFilesOk: boolean;
  validationSamplesOk: boolean;
  notPerformed: string[];
}): Sprint0CompletionReport {
  const performanceWarnings = input.populationProfiles.flatMap((p) => p.warnings);
  const functionalFailures: string[] = [];
  if (!input.sameSeed.passed) {
    functionalFailures.push("same_seed_comparison");
  }
  for (const run of input.sameSeedRuns) {
    if (
      !run.invariantsPassed ||
      !run.validationPassed ||
      !run.terminationPassed ||
      !run.sevenFilesPassed
    ) {
      functionalFailures.push(`same_seed_run_${run.run}`);
    }
  }
  if (!input.differentSeed.passed) {
    functionalFailures.push("different_seed_comparison");
  }
  if (!input.boundarySeedDeterminism.passed) {
    functionalFailures.push("boundary_seed_verification");
  }
  if (!input.invariants.passed) {
    functionalFailures.push("invariants");
  }
  if (!input.sevenFilesOk) {
    functionalFailures.push("seven_files");
  }
  if (!input.validationSamplesOk) {
    functionalFailures.push("validation");
  }
  for (const profile of input.yearProfiles) {
    if (!profile.invariantsPassed || !profile.sevenFilesPassed) {
      functionalFailures.push(`year_profile_${String(profile.years)}`);
    }
  }

  const overallPassed = functionalFailures.length === 0;

  return {
    schemaVersion: SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION,
    generatedAt: input.generatedAt.toISOString(),
    commitId: input.commitId,
    workingTreeDirty: input.workingTreeDirty,
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    versions: {
      simulationSpecVersion: input.simulationSpecVersion,
      miniSpecVersion: input.miniSpecVersion,
      technicalDecisionVersion: TECHNICAL_DECISION_VERSION,
      configSchemaVersion: input.configSchemaVersion,
      nameDataVersion: input.nameDataVersion,
      rngAlgorithm: input.rngAlgorithm,
    },
    seeds: {
      primary: input.primarySeed,
      alternate: input.alternateSeed,
      boundary: [...input.boundarySeeds],
    },
    sameSeedComparison: {
      status:
        input.sameSeed.passed &&
        input.sameSeedRuns.every(
          (run) =>
            run.invariantsPassed &&
            run.validationPassed &&
            run.terminationPassed &&
            run.sevenFilesPassed,
        )
          ? "passed"
          : "failed",
      differenceCount: input.sameSeed.differences.length,
      differences: input.sameSeed.differences,
      runs: [...input.sameSeedRuns],
    },
    differentSeedComparison: {
      status: input.differentSeed.passed ? "passed" : "failed",
      detail: input.differentSeed.detail,
      simulationIdsDiffer: input.differentSeed.simulationIdsDiffer,
      initialWorldDiffers: input.differentSeed.initialWorldDiffers,
      finalWorldDiffers: input.differentSeed.finalWorldDiffers,
    },
    boundarySeedDeterminism: {
      status: input.boundarySeedDeterminism.passed ? "passed" : "failed",
      results: input.boundarySeedDeterminism.results.map((result) => ({
        seed: result.seed,
        status: result.passed ? "passed" : "failed",
        determinismStatus: result.determinismPassed ? "passed" : "failed",
        differenceCount: result.differenceCount,
        runs: result.runs,
      })),
    },
    invariants: {
      status: input.invariants.passed ? "passed" : "failed",
      issueCount: input.invariants.issues.length,
      issues: input.invariants.issues,
    },
    yearProfiles: input.yearProfiles,
    populationProfiles: input.populationProfiles,
    performanceWarnings,
    sevenFiles: {
      status: input.sevenFilesOk ? "passed" : "failed",
      detail: input.sevenFilesOk
        ? "all sampled runs produced valid fixed 7 files on disk"
        : "seven-file validation failed",
    },
    validation: {
      status: input.validationSamplesOk ? "passed" : "failed",
      overallPassedSamples: input.validationSamplesOk,
    },
    overallPassed,
    functionalFailureCount: functionalFailures.length,
    warningCount: performanceWarnings.length,
    notPerformed: [...input.notPerformed],
  };
}

export function completionReportToJsonFile(report: Sprint0CompletionReport): string {
  return `${toCanonicalJson(report)}\n`;
}
