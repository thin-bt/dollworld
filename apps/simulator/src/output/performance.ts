import { cpus, release, type as osType } from "node:os";
import type { PerformanceTargetsConfig } from "@shared-world/simulation-core";
import { FIXED_OUTPUT_FILE_NAMES, type FixedOutputFileName } from "./fixed-files.js";
import { measureUtf8Bytes, toCanonicalJsonFile } from "./atomic-write.js";
import type { PerformanceDocument, PerformanceWarningComparison } from "./types.js";
import type { RunOutputContents } from "./atomic-write.js";

function selectWarningComparison(input: {
  personCount: number;
  yearsExecuted: number;
  actualSeconds: number;
  targets: PerformanceTargetsConfig;
}): PerformanceWarningComparison {
  const { personCount, yearsExecuted, actualSeconds, targets } = input;
  if (personCount === 600 && yearsExecuted === 100) {
    return {
      populationBand: "600",
      warningSeconds: targets.warningSecondsFor600People100Years,
      actualSeconds,
      exceeded: actualSeconds > targets.warningSecondsFor600People100Years,
    };
  }
  if (personCount === 2000 && yearsExecuted === 100) {
    return {
      populationBand: "2000",
      warningSeconds: targets.warningSecondsFor2000People100Years,
      actualSeconds,
      exceeded: actualSeconds > targets.warningSecondsFor2000People100Years,
    };
  }
  return {
    populationBand: "other",
    warningSeconds: null,
    actualSeconds,
    exceeded: false,
  };
}

export type BuildPerformanceInput = {
  targets: PerformanceTargetsConfig;
  totalMilliseconds: number;
  yearsExecuted: number;
  weeksExecuted: number;
  personCount: number;
  eventCount: number;
  maxRssKilobytes: number | null;
  /** Contents of the other 6 files (performance.json filled iteratively). */
  otherFileContents: Omit<RunOutputContents, "performance.json">;
};

/**
 * Build performance.json content with stable totalBytes including itself.
 */
export function buildPerformanceDocument(input: BuildPerformanceInput): {
  document: PerformanceDocument;
  text: string;
} {
  const averageMillisecondsPerYear =
    input.yearsExecuted === 0 ? 0 : input.totalMilliseconds / input.yearsExecuted;
  const averageMillisecondsPerWeek =
    input.weeksExecuted === 0 ? 0 : input.totalMilliseconds / input.weeksExecuted;
  const actualSeconds = input.totalMilliseconds / 1000;

  const cpuList = cpus();
  const firstCpu = cpuList[0];

  const warningComparison = selectWarningComparison({
    personCount: input.personCount,
    yearsExecuted: input.yearsExecuted,
    actualSeconds,
    targets: input.targets,
  });

  const warnings: string[] = [];
  if (warningComparison.exceeded && warningComparison.warningSeconds !== null) {
    warnings.push(
      `performance warning: ${String(actualSeconds)}s exceeded ${String(warningComparison.warningSeconds)}s for band ${warningComparison.populationBand}`,
    );
  }

  const baseEnvironment = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    osType: osType(),
    osRelease: release(),
    cpuModel: firstCpu?.model ?? null,
    cpuCount: cpuList.length > 0 ? cpuList.length : null,
  };

  let document: PerformanceDocument = {
    environment: baseEnvironment,
    timing: {
      totalMilliseconds: input.totalMilliseconds,
      averageMillisecondsPerYear,
      averageMillisecondsPerWeek,
    },
    memory: {
      maxRssKilobytes: input.maxRssKilobytes,
    },
    counts: {
      personCount: input.personCount,
      weeksExecuted: input.weeksExecuted,
      eventCount: input.eventCount,
    },
    output: {
      totalBytes: 0,
      fileBytes: FIXED_OUTPUT_FILE_NAMES.map((fileName) => ({ fileName, bytes: 0 })),
    },
    performanceTargets: {
      warningSecondsFor600People100Years: input.targets.warningSecondsFor600People100Years,
      warningSecondsFor2000People100Years: input.targets.warningSecondsFor2000People100Years,
      measureOnlyPopulation: input.targets.measureOnlyPopulation,
    },
    warningComparison,
    warnings,
  };

  let text = "";
  for (let i = 0; i < 8; i += 1) {
    text = toCanonicalJsonFile(document);
    const performanceBytes = measureUtf8Bytes(text);
    const fileBytes: { fileName: FixedOutputFileName; bytes: number }[] = [];
    let totalBytes = 0;
    for (const fileName of FIXED_OUTPUT_FILE_NAMES) {
      const bytes =
        fileName === "performance.json"
          ? performanceBytes
          : measureUtf8Bytes(input.otherFileContents[fileName]);
      fileBytes.push({ fileName, bytes });
      totalBytes += bytes;
    }
    const next: PerformanceDocument = {
      ...document,
      output: { totalBytes, fileBytes },
    };
    const nextText = toCanonicalJsonFile(next);
    if (nextText === text && next.output.totalBytes === document.output.totalBytes) {
      document = next;
      text = nextText;
      break;
    }
    document = next;
    text = nextText;
  }

  return { document, text };
}

/** Node.js process.resourceUsage().maxRSS is kilobytes. */
export function readMaxRssKilobytes(): number | null {
  try {
    return process.resourceUsage().maxRSS;
  } catch {
    return null;
  }
}
