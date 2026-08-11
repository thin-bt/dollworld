import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  type Dirent,
} from "node:fs";
import { join, relative } from "node:path";
import { runCli } from "../cli.js";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import {
  SPRINT1_FIXTURE_CONFIG_RELATIVE,
  SPRINT1_FIXTURE_INPUT_RELATIVE,
  SPRINT1_VERIFICATION_OUTPUT_DIR,
} from "./constants.js";
import type { RunArtifactRef } from "./types.js";

export type Sprint1CliRunResult = {
  artifact: RunArtifactRef;
  absoluteRunDirectory: string;
  absoluteOutputRoot: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  validationOverallPassed: boolean;
  simulationId: string;
  seed: number;
  years: number;
  yearsExecuted: number;
  weeksExecuted: number;
  finalWorldYear: number;
  csvDataRows: number;
  fileTexts: Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string>;
};

function assertExactlySevenFiles(runDirectory: string): void {
  const entries = readdirSync(runDirectory, { withFileTypes: true });
  if (entries.length !== FIXED_OUTPUT_FILE_NAMES.length) {
    throw new Error(
      `expected exactly ${String(FIXED_OUTPUT_FILE_NAMES.length)} entries in ${runDirectory}, got ${String(entries.length)}`,
    );
  }
  const names = new Set(entries.map((entry: Dirent) => entry.name));
  for (const required of FIXED_OUTPUT_FILE_NAMES) {
    if (!names.has(required)) {
      throw new Error(`missing fixed7 file ${required} in ${runDirectory}`);
    }
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) {
      throw new Error(`fixed7 entry must be a regular file: ${entry.name}`);
    }
    if (!(FIXED_OUTPUT_FILE_NAMES as readonly string[]).includes(entry.name)) {
      throw new Error(`unexpected fixed7 entry: ${entry.name}`);
    }
  }
}

function readFixedSeven(
  runDirectory: string,
): Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string> {
  const texts = {} as Record<(typeof FIXED_OUTPUT_FILE_NAMES)[number], string>;
  for (const name of FIXED_OUTPUT_FILE_NAMES) {
    texts[name] = readFileSync(join(runDirectory, name), "utf8");
  }
  return texts;
}

/**
 * Run production Sprint1 CLI into an isolated verification outputRoot.
 * Does not add `--output-root`; uses programmatic RunCliOptions.outputRoot.
 */
export function runSprint1CliVerification(input: {
  repoRoot: string;
  runKey: string;
  years: number;
  seed: number;
  /** Absolute path used as runCli outputRoot (= runs/<run-key>/). */
  outputRoot: string;
}): Sprint1CliRunResult {
  if (existsSync(input.outputRoot)) {
    rmSync(input.outputRoot, { recursive: true, force: true });
  }
  mkdirSync(input.outputRoot, { recursive: true });

  const argv = [
    "--years",
    String(input.years),
    "--seed",
    String(input.seed),
    "--config",
    SPRINT1_FIXTURE_CONFIG_RELATIVE,
    "--sprint1-input",
    SPRINT1_FIXTURE_INPUT_RELATIVE,
  ] as const;

  const cli = runCli(argv, {
    cwd: input.repoRoot,
    outputRoot: input.outputRoot,
  });

  if (cli.exitCode !== 0) {
    throw new Error(
      `runCli failed for runKey=${input.runKey}: exit=${String(cli.exitCode)} stderr=${cli.stderr} stdout=${cli.stdout}`,
    );
  }

  const children = readdirSync(input.outputRoot, { withFileTypes: true }).filter((entry) => {
    if (!entry.isDirectory()) return false;
    return statSync(join(input.outputRoot, entry.name)).isDirectory();
  });
  if (children.length !== 1) {
    throw new Error(
      `expected exactly 1 runId directory under ${input.outputRoot}, got ${String(children.length)}`,
    );
  }
  const runId = children[0]!.name;
  const absoluteRunDirectory = join(input.outputRoot, runId);
  assertExactlySevenFiles(absoluteRunDirectory);
  const fileTexts = readFixedSeven(absoluteRunDirectory);

  const validationReport = JSON.parse(fileTexts["validation-report.json"]) as {
    overallPassed?: unknown;
  };
  if (validationReport.overallPassed !== true) {
    throw new Error(`validation-report.overallPassed is not true for ${input.runKey}`);
  }

  const runMetadata = JSON.parse(fileTexts["run-metadata.json"]) as {
    simulationId?: unknown;
    seed?: unknown;
    yearsExecuted?: unknown;
    weeksExecuted?: unknown;
  };
  if (typeof runMetadata.simulationId !== "string") {
    throw new Error(`run-metadata.simulationId missing for ${input.runKey}`);
  }
  if (runMetadata.seed !== input.seed) {
    throw new Error(
      `run-metadata.seed mismatch for ${input.runKey}: expected ${String(input.seed)}, got ${String(runMetadata.seed)}`,
    );
  }
  if (runMetadata.yearsExecuted !== input.years) {
    throw new Error(
      `run-metadata.yearsExecuted mismatch for ${input.runKey}: expected ${String(input.years)}, got ${String(runMetadata.yearsExecuted)}`,
    );
  }
  if (typeof runMetadata.weeksExecuted !== "number") {
    throw new Error(`run-metadata.weeksExecuted missing for ${input.runKey}`);
  }

  const finalWorld = JSON.parse(fileTexts["final-world.json"]) as {
    worldDate?: { year?: unknown };
  };
  const finalWorldYear =
    typeof finalWorld.worldDate?.year === "number" ? finalWorld.worldDate.year : -1;

  const csvLines = fileTexts["yearly-statistics.csv"].replace(/\r\n/g, "\n").split("\n");
  const csvDataRows = csvLines.filter((line, index) => index > 0 && line.trim().length > 0).length;

  const verificationRoot = join(input.repoRoot, SPRINT1_VERIFICATION_OUTPUT_DIR);
  const relativeRunDirectory = relative(verificationRoot, absoluteRunDirectory).replace(/\\/g, "/");

  return {
    artifact: {
      runKey: input.runKey,
      relativeRunDirectory,
    },
    absoluteRunDirectory,
    absoluteOutputRoot: input.outputRoot,
    exitCode: cli.exitCode,
    stdout: cli.stdout,
    stderr: cli.stderr,
    validationOverallPassed: true,
    simulationId: runMetadata.simulationId,
    seed: input.seed,
    years: input.years,
    yearsExecuted: input.years,
    weeksExecuted: runMetadata.weeksExecuted,
    finalWorldYear,
    csvDataRows,
    fileTexts,
  };
}
