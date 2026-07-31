import { parseArgs } from "node:util";
import {
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  createWorldEngineState,
  generateInitialWorld,
  runWorldYears,
  validateInitialWorldConfig,
  type Sha256Provider,
} from "@shared-world/simulation-core";
import {
  FileLoadError,
  loadValidatedNameData,
  readJsonFile,
  resolveConfigPath,
} from "./file-loader.js";
import { createNodeSha256Provider } from "./node-sha256-provider.js";

export const EXIT_SUCCESS = 0;
export const EXIT_RUNTIME_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;

const UINT32_MAX = 4294967295;

const HELP_TEXT = `Usage: npm run simulate -- --years <n> --seed <n> --config <path>

Options:
  --help              Show this help message
  --years <n>         Positive integer number of world years to simulate
  --seed <n>          Seed integer in 0..4294967295
  --config <path>     Path to initial-world config JSON (relative to cwd)

Example:
  npm run simulate -- --years 1 --seed 12345 --config config/initial-world.config.json
`;

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunCliOptions = {
  cwd: string;
  sha256Provider?: Sha256Provider;
};

type ParsedCliArgs =
  | { kind: "help" }
  | {
      kind: "run";
      years: number;
      seed: number;
      configPath: string;
    }
  | { kind: "usageError"; message: string };

function formatErrorMessage(error: unknown): string {
  if (error instanceof FileLoadError) {
    if (error.causeDetail !== undefined) {
      return `${error.message}: ${error.causeDetail}`;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parsePositiveInteger(raw: string, field: string): number | string {
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    return `${field} must be a positive integer`;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    return `${field} must be a positive integer`;
  }
  return value;
}

function parseSeed(raw: string): number | string {
  if (!/^(0|[1-9]\d*)$/.test(raw)) {
    return "seed must be an integer in 0..4294967295";
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > UINT32_MAX) {
    return "seed must be an integer in 0..4294967295";
  }
  return value;
}

function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  let values: {
    help?: boolean;
    years?: string;
    seed?: string;
    config?: string;
  };
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        help: { type: "boolean", default: false },
        years: { type: "string" },
        seed: { type: "string" },
        config: { type: "string" },
      },
      strict: true,
      allowPositionals: false,
    });
    values = parsed.values;
  } catch (error) {
    return {
      kind: "usageError",
      message: formatErrorMessage(error),
    };
  }

  if (values.help === true) {
    return { kind: "help" };
  }

  if (values.years === undefined) {
    return { kind: "usageError", message: "missing required option: --years" };
  }
  if (values.seed === undefined) {
    return { kind: "usageError", message: "missing required option: --seed" };
  }
  if (values.config === undefined) {
    return { kind: "usageError", message: "missing required option: --config" };
  }

  const years = parsePositiveInteger(values.years, "years");
  if (typeof years === "string") {
    return { kind: "usageError", message: years };
  }
  const seed = parseSeed(values.seed);
  if (typeof seed === "string") {
    return { kind: "usageError", message: seed };
  }
  if (values.config.trim() === "") {
    return { kind: "usageError", message: "--config must be a non-empty path" };
  }

  return {
    kind: "run",
    years,
    seed,
    configPath: values.config,
  };
}

function buildSummary(input: {
  years: number;
  seed: number;
  simulationId: string;
  initialPersonCount: number;
  initialFamilyCount: number;
  initialLineageCount: number;
  finalWorldDate: {
    year: number;
    month: number;
    weekOfMonth: number;
    absoluteWeek: number;
  };
  weeksExecuted: number;
}): string {
  const date = input.finalWorldDate;
  return [
    "simulation completed",
    `years=${String(input.years)}`,
    `seed=${String(input.seed)}`,
    `simulationId=${input.simulationId}`,
    `initialPersons=${String(input.initialPersonCount)}`,
    `initialFamilies=${String(input.initialFamilyCount)}`,
    `initialLineages=${String(input.initialLineageCount)}`,
    `finalWorldDate=${String(date.year)}-${String(date.month)}-W${String(date.weekOfMonth)}@${String(date.absoluteWeek)}`,
    `weeksExecuted=${String(input.weeksExecuted)}`,
  ].join("\n");
}

function runSimulation(
  args: Extract<ParsedCliArgs, { kind: "run" }>,
  options: RunCliOptions,
): CliResult {
  const sha256Provider = options.sha256Provider ?? createNodeSha256Provider();
  const absoluteConfigPath = resolveConfigPath(options.cwd, args.configPath);

  let configJson: unknown;
  try {
    configJson = readJsonFile(absoluteConfigPath);
  } catch (error) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `${formatErrorMessage(error)}\n`,
    };
  }

  const configResult = validateInitialWorldConfig(configJson);
  if (!configResult.ok) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `config validation failed: ${JSON.stringify(configResult.issues)}\n`,
    };
  }
  const config = configResult.value;

  let nameData;
  try {
    nameData = loadValidatedNameData({
      cwd: options.cwd,
      manifestPath: config.nameData.manifestPath,
      requiredVersion: config.nameData.requiredVersion,
      initialFamilyCount: config.families.initialFamilyCount,
      sha256Provider,
    });
  } catch (error) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `${formatErrorMessage(error)}\n`,
    };
  }

  try {
    const configHash = computeConfigHash(config, sha256Provider);
    const nameDataHash = computeNameDataHash(nameData.manifest, sha256Provider);
    const generated = generateInitialWorld({
      config,
      configHash,
      seed: args.seed,
      nameData,
      nameDataHash,
      rngFactory: createSeededRng,
      sha256Provider,
    });

    const engineState = createWorldEngineState(generated.snapshot);
    const result = runWorldYears({
      state: engineState,
      processors: [],
      years: args.years,
      startSequence: generated.initialEvents.length,
    });

    const summary = buildSummary({
      years: args.years,
      seed: args.seed,
      simulationId: result.state.simulationId,
      initialPersonCount: generated.snapshot.persons.length,
      initialFamilyCount: generated.snapshot.families.length,
      initialLineageCount: generated.snapshot.lineages.length,
      finalWorldDate: result.state.worldDate,
      weeksExecuted: result.weeksExecuted,
    });

    return {
      exitCode: EXIT_SUCCESS,
      stdout: `${summary}\n`,
      stderr: "",
    };
  } catch (error) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `${formatErrorMessage(error)}\n`,
    };
  }
}

/**
 * Parse argv and run the headless simulator. Does not touch process.exit.
 */
export function runCli(argv: readonly string[], options: RunCliOptions): CliResult {
  const parsed = parseCliArgs(argv);
  if (parsed.kind === "help") {
    return {
      exitCode: EXIT_SUCCESS,
      stdout: HELP_TEXT,
      stderr: "",
    };
  }
  if (parsed.kind === "usageError") {
    return {
      exitCode: EXIT_USAGE_ERROR,
      stdout: "",
      stderr: `${parsed.message}\n`,
    };
  }
  return runSimulation(parsed, options);
}
