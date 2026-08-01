import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { InitialWorldConfig } from "@shared-world/simulation-core";
import type { PopulationPerformanceResult } from "./completion-report.js";
import type { PopulationPerformanceWorkerOutput } from "./population-performance-worker.js";

export type RunIsolatedPopulationPerformanceInput = {
  repoRoot: string;
  seed: number;
  years: number;
  population: number;
  config: InitialWorldConfig;
  warningSeconds: number | null;
  measureOnly: boolean;
};

/**
 * Test-only seams. Not part of the verification suite's callable surface;
 * production callers pass only {@link RunIsolatedPopulationPerformanceInput}.
 */
export type IsolatedPopulationPerformanceOverrides = {
  createWorkRoot?: () => string;
  workerMainPath?: string;
};

function resolveWorkerMainPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // Compiled layout: dist/sprint0-verification/*.js → dist/population-performance-worker-main.js
  return join(here, "..", "population-performance-worker-main.js");
}

/**
 * Measure one population profile in a fresh Node child process.
 * The temporary work root (worker I/O plus the run's fixed 7 files) is always
 * removed, including on spawn failure, non-zero exit, and JSON parse failure.
 */
export function runIsolatedPopulationPerformance(
  input: RunIsolatedPopulationPerformanceInput,
  overrides: IsolatedPopulationPerformanceOverrides = {},
): PopulationPerformanceWorkerOutput {
  const createWorkRoot =
    overrides.createWorkRoot ??
    (() => mkdtempSync(join(tmpdir(), `dollworld-pop-${String(input.population)}-`)));
  const workRoot = createWorkRoot();
  try {
    const inputPath = join(workRoot, "input.json");
    const outputPath = join(workRoot, "output.json");
    const outputRoot = join(workRoot, "runs");
    writeFileSync(
      inputPath,
      `${JSON.stringify({
        repoRoot: input.repoRoot,
        outputRoot,
        seed: input.seed,
        years: input.years,
        population: input.population,
        config: input.config,
        warningSeconds: input.warningSeconds,
        measureOnly: input.measureOnly,
      })}\n`,
      "utf8",
    );

    const workerMain = overrides.workerMainPath ?? resolveWorkerMainPath();
    const result = spawnSync(process.execPath, [workerMain, inputPath, outputPath], {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    if (result.status !== 0) {
      const stderr = result.stderr?.toString() ?? "";
      const stdout = result.stdout?.toString() ?? "";
      throw new Error(
        `population performance worker exited ${String(result.status)}: ${stderr || stdout || "no output"}`,
      );
    }
    return JSON.parse(readFileSync(outputPath, "utf8")) as PopulationPerformanceWorkerOutput;
  } finally {
    rmSync(workRoot, { recursive: true, force: true });
  }
}

export type IsolatedPopulationProfileSummary = {
  profile: PopulationPerformanceResult;
  invariantsPassed: boolean;
  sevenFilesPassed: boolean;
};
