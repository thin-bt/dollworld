import { closeSync, fsyncSync, openSync, readFileSync, renameSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  runSprint1PopulationPerformanceProfile,
  type Sprint1PopulationPerformanceWorkerInput,
  type Sprint1PopulationPerformanceWorkerOutput,
} from "./sprint1-verification/population-performance.js";

function assertWorkerInput(value: unknown): Sprint1PopulationPerformanceWorkerInput {
  if (typeof value !== "object" || value === null) {
    throw new Error("worker input must be a JSON object");
  }
  const input = value as Partial<Sprint1PopulationPerformanceWorkerInput>;
  if (typeof input.repoRoot !== "string" || input.repoRoot.length === 0) {
    throw new Error("worker input field repoRoot must be a non-empty string");
  }
  for (const key of ["targetLivingPopulation", "years", "seed"] as const) {
    if (!Number.isSafeInteger(input[key])) {
      throw new Error(`worker input field ${key} must be a safe integer`);
    }
  }
  if (typeof input.config !== "object" || input.config === null) {
    throw new Error("worker input field config must be an object");
  }
  return input as Sprint1PopulationPerformanceWorkerInput;
}

function writeWorkerOutputAtomic(
  outputPath: string,
  output: Sprint1PopulationPerformanceWorkerOutput,
): void {
  const tempPath = join(dirname(outputPath), `.tmp-${String(process.pid)}-s1-worker-output.json`);
  const payload = `${JSON.stringify(output)}\n`;
  const fd = openSync(tempPath, "w");
  try {
    writeSync(fd, payload, undefined, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tempPath, outputPath);
}

function main(argv: readonly string[]): void {
  const args = argv.slice(2);
  if (args.length !== 2) {
    throw new Error(
      `expected exactly 2 arguments (inputJsonPath outputJsonPath), got ${String(args.length)}`,
    );
  }
  const [inputPath, outputPath] = args as [string, string];
  const parsed = JSON.parse(readFileSync(inputPath, "utf8")) as unknown;
  const input = assertWorkerInput(parsed);
  const output = runSprint1PopulationPerformanceProfile(input);
  writeWorkerOutputAtomic(outputPath, output);
}

try {
  main(process.argv);
  process.exitCode = 0;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`sprint1 population performance worker failed: ${message}\n`);
  process.exitCode = 1;
}
