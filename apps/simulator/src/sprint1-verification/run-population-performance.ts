import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { InitialWorldConfig } from "@shared-world/simulation-core";
import {
  SPRINT1_PERFORMANCE_PROFILES,
  SPRINT1_PERFORMANCE_SEED,
  SPRINT1_PERFORMANCE_YEARS,
} from "./constants.js";
import {
  buildScaledSprint1PerformanceConfig,
  type Sprint1PopulationPerformanceWorkerOutput,
} from "./population-performance.js";
import type { PerformanceProfileSection, VerificationIssue } from "./types.js";

function resolveWorkerMainPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, "..", "sprint1-population-performance-worker-main.js");
}

export function runIsolatedSprint1PopulationPerformance(input: {
  repoRoot: string;
  targetLivingPopulation: number;
  years: number;
  seed: number;
  config: InitialWorldConfig;
}): Sprint1PopulationPerformanceWorkerOutput {
  const workRoot = mkdtempSync(
    join(tmpdir(), `dollworld-s1-pop-${String(input.targetLivingPopulation)}-`),
  );
  try {
    const inputPath = join(workRoot, "input.json");
    const outputPath = join(workRoot, "output.json");
    writeFileSync(
      inputPath,
      `${JSON.stringify({
        repoRoot: input.repoRoot,
        targetLivingPopulation: input.targetLivingPopulation,
        years: input.years,
        seed: input.seed,
        config: input.config,
      })}\n`,
      "utf8",
    );
    const result = spawnSync(process.execPath, [resolveWorkerMainPath(), inputPath, outputPath], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
      const stderr = result.stderr?.toString() ?? "";
      const stdout = result.stdout?.toString() ?? "";
      throw new Error(
        `sprint1 population worker exited ${String(result.status)}: ${stderr || stdout || "no output"}`,
      );
    }
    return JSON.parse(readFileSync(outputPath, "utf8")) as Sprint1PopulationPerformanceWorkerOutput;
  } finally {
    rmSync(workRoot, { recursive: true, force: true });
  }
}

export type PerformanceVerificationResult = {
  profiles: PerformanceProfileSection[];
  failures: VerificationIssue[];
  warnings: VerificationIssue[];
};

/**
 * Sequential living-target 600 → 2000 → 5000 child-process baseline profiles (years=1).
 * Elapsed time alone never creates Sprint1 warnings or failures.
 */
export function verifySprint1Performance(repoRoot: string): PerformanceVerificationResult {
  const failures: VerificationIssue[] = [];
  const warnings: VerificationIssue[] = [];
  const profiles: PerformanceProfileSection[] = [];

  for (const spec of SPRINT1_PERFORMANCE_PROFILES) {
    try {
      const config = buildScaledSprint1PerformanceConfig(repoRoot, spec.targetLivingPopulation);
      const output = runIsolatedSprint1PopulationPerformance({
        repoRoot,
        targetLivingPopulation: spec.targetLivingPopulation,
        years: SPRINT1_PERFORMANCE_YEARS,
        seed: SPRINT1_PERFORMANCE_SEED,
        config,
      });
      if (!output.functionalPassed || !output.validationPassed) {
        failures.push({
          code: "SPRINT1_PERFORMANCE_FUNCTIONAL",
          message: `targetLivingPopulation ${String(spec.targetLivingPopulation)} functional failure`,
          scope: `performance/${String(spec.targetLivingPopulation)}`,
        });
      }
      profiles.push({
        targetLivingPopulation: output.targetLivingPopulation,
        years: output.years,
        seed: output.seed,
        status: output.functionalPassed && output.validationPassed ? "passed" : "failed",
        actualLivingPopulation: output.actualLivingPopulation,
        totalPersonCount: output.totalPersonCount,
        sidecarCount: output.sidecarCount,
        elapsedSeconds: output.elapsedSeconds,
        maxRssKilobytes: output.maxRssKilobytes,
        eventCount: output.eventCount,
        exitCode: output.exitCode,
        validationPassed: output.validationPassed,
        finalWorldDate: output.finalWorldDate,
        functionalPassed: output.functionalPassed,
        detail: output.detail,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        code: "SPRINT1_PERFORMANCE_FAILED",
        message,
        scope: `performance/${String(spec.targetLivingPopulation)}`,
      });
      profiles.push({
        targetLivingPopulation: spec.targetLivingPopulation,
        years: SPRINT1_PERFORMANCE_YEARS,
        seed: SPRINT1_PERFORMANCE_SEED,
        status: "failed",
        actualLivingPopulation: null,
        totalPersonCount: null,
        sidecarCount: null,
        elapsedSeconds: null,
        maxRssKilobytes: null,
        eventCount: null,
        exitCode: null,
        validationPassed: false,
        finalWorldDate: null,
        functionalPassed: false,
        detail: message,
      });
    }
  }

  return { profiles, failures, warnings };
}
