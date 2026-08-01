import { closeSync, fsyncSync, openSync, readFileSync, renameSync, writeSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  runPopulationPerformanceProfile,
  type PopulationPerformanceWorkerInput,
  type PopulationPerformanceWorkerOutput,
} from "./sprint0-verification/population-performance-worker.js";

function assertWorkerInput(value: unknown): PopulationPerformanceWorkerInput {
  if (typeof value !== "object" || value === null) {
    throw new Error("worker input must be a JSON object");
  }
  const input = value as Partial<PopulationPerformanceWorkerInput>;
  const requiredStrings: (keyof PopulationPerformanceWorkerInput)[] = ["repoRoot", "outputRoot"];
  for (const key of requiredStrings) {
    if (typeof input[key] !== "string" || (input[key] as string).length === 0) {
      throw new Error(`worker input field ${String(key)} must be a non-empty string`);
    }
  }
  const requiredNumbers: (keyof PopulationPerformanceWorkerInput)[] = [
    "seed",
    "years",
    "population",
  ];
  for (const key of requiredNumbers) {
    if (!Number.isSafeInteger(input[key])) {
      throw new Error(`worker input field ${String(key)} must be a safe integer`);
    }
  }
  if (typeof input.measureOnly !== "boolean") {
    throw new Error("worker input field measureOnly must be a boolean");
  }
  if (input.warningSeconds !== null && typeof input.warningSeconds !== "number") {
    throw new Error("worker input field warningSeconds must be a number or null");
  }
  if (typeof input.config !== "object" || input.config === null) {
    throw new Error("worker input field config must be an object");
  }
  return input as PopulationPerformanceWorkerInput;
}

function readWorkerInput(inputPath: string): PopulationPerformanceWorkerInput {
  let text: string;
  try {
    text = readFileSync(inputPath, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to read worker input ${inputPath}: ${detail}`, { cause: error });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`worker input ${inputPath} is not valid JSON: ${detail}`, { cause: error });
  }
  return assertWorkerInput(parsed);
}

function writeWorkerOutputAtomic(
  outputPath: string,
  output: PopulationPerformanceWorkerOutput,
): void {
  const tempPath = join(dirname(outputPath), `.tmp-${String(process.pid)}-worker-output.json`);
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

/**
 * Child-process entry for isolated population performance measurement.
 * Usage: node dist/population-performance-worker-main.js <inputJsonPath> <outputJsonPath>
 * Exits 0 only after the output JSON has been completely written and renamed.
 */
function main(argv: readonly string[]): void {
  const args = argv.slice(2);
  if (args.length !== 2) {
    throw new Error(
      `expected exactly 2 arguments (inputJsonPath outputJsonPath), got ${String(args.length)}`,
    );
  }
  const [inputPath, outputPath] = args as [string, string];
  const input = readWorkerInput(inputPath);
  const output = runPopulationPerformanceProfile(input);
  writeWorkerOutputAtomic(outputPath, output);
}

try {
  main(process.argv);
  process.exitCode = 0;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`population performance worker failed: ${message}\n`);
  process.exitCode = 1;
}
