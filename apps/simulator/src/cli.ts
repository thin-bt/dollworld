import { parseArgs } from "node:util";
import {
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  createDefaultSprint2IdentityBindings,
  createSprint1RunSession,
  createWorldEngineState,
  generateInitialWorld,
  RNG_ALGORITHM_VERSION,
  S0_SPEC_VERSION,
  SIMULATION_SPEC_VERSION,
  validateInitialWorldConfig,
  validateSprint1CliInput,
  type InitialWorldConfig,
  type Sha256Provider,
  type ValidatedNameData,
} from "@shared-world/simulation-core";
import {
  FileLoadError,
  loadValidatedNameData,
  readJsonFile,
  resolveConfigPath,
} from "./file-loader.js";
import { createNodeSha256Provider } from "./node-sha256-provider.js";
import { buildAndWriteRunOutput } from "./output/build-run-output.js";
import { buildAndWriteSprint1RunOutput } from "./output/build-sprint1-run-output.js";
import { createNodeFsOps, type FsOps } from "./output/fs-ops.js";
import { createRunIdGenerator, type Clock, type RunIdGenerator } from "./output/run-id.js";
import {
  runSimulationWithYearlyCapture,
  type SimulationWithYearlyResult,
} from "./output/run-simulation-yearly.js";
import { runSprint1SimulationWithYearlyCapture } from "./output/run-sprint1-simulation-yearly.js";
import { summarizeValidationFailure } from "./output/validation-report.js";

export const EXIT_SUCCESS = 0;
export const EXIT_RUNTIME_ERROR = 1;
export const EXIT_USAGE_ERROR = 2;

const UINT32_MAX = 4294967295;

const HELP_TEXT = `Usage: npm run simulate -- --years <n> --seed <n> --config <path> [--sprint1-input <path>]

Options:
  --help                  Show this help message
  --years <n>             Positive integer number of world years to simulate
  --seed <n>              Seed integer in 0..4294967295
  --config <path>         Path to initial-world config JSON (relative to cwd)
  --sprint1-input <path>  Optional Sprint 1 CLI input JSON (enables Sprint 1 mode)

Example:
  npm run simulate -- --years 1 --seed 12345 --config config/initial-world.config.json
  npm run simulate -- --years 1 --seed 4242 --config apps/simulator/fixtures/sprint1/tiny-initial-world.config.json --sprint1-input apps/simulator/fixtures/sprint1/sprint1-input.json
`;

export type CliResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type RunCliOptions = {
  cwd: string;
  sha256Provider?: Sha256Provider;
  /** Injected clock for RunId generation (tests). Default: real UTC now. */
  clock?: Clock;
  /** Injected RunId generator. Default: createRunIdGenerator(clock). */
  runIdGenerator?: RunIdGenerator;
  /** Output root directory. Default: <cwd>/output */
  outputRoot?: string;
  /** Filesystem operations (tests may inject failures). */
  fs?: FsOps;
  /** Optional hook after temp write, before rename (tests). */
  afterTempWrite?: (tempDirectory: string) => void;
  /**
   * Optional transform of the completed simulation before output (tests).
   * Used to inject broken integrity without env-var production branches.
   */
  transformSimulation?: (result: SimulationWithYearlyResult) => SimulationWithYearlyResult;
};

type ParsedCliArgs =
  | { kind: "help" }
  | {
      kind: "run";
      years: number;
      seed: number;
      configPath: string;
      sprint1InputPath?: string;
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
    "sprint1-input"?: string;
  };
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        help: { type: "boolean", default: false },
        years: { type: "string" },
        seed: { type: "string" },
        config: { type: "string" },
        "sprint1-input": { type: "string" },
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

  let sprint1InputPath: string | undefined;
  if (values["sprint1-input"] !== undefined) {
    if (values["sprint1-input"].trim() === "") {
      return { kind: "usageError", message: "--sprint1-input must be a non-empty path" };
    }
    sprint1InputPath = values["sprint1-input"];
  }

  return {
    kind: "run",
    years,
    seed,
    configPath: values.config,
    ...(sprint1InputPath !== undefined ? { sprint1InputPath } : {}),
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
  runId: string;
  outputDirectory: string;
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
    `runId=${input.runId}`,
    `outputDirectory=${input.outputDirectory}`,
    "7 files written",
  ].join("\n");
}

function runSimulation(
  args: Extract<ParsedCliArgs, { kind: "run" }>,
  options: RunCliOptions,
): CliResult {
  const sha256Provider = options.sha256Provider ?? createNodeSha256Provider();
  const fs = options.fs ?? createNodeFsOps();
  const clock = options.clock ?? (() => new Date());
  const runIdGenerator = options.runIdGenerator ?? createRunIdGenerator(clock);
  const outputRoot = options.outputRoot ?? fs.join(options.cwd, "output");
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
    const realStartedAt = clock();
    const startedMs = Date.now();

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

    // Keep an independent initial snapshot for output (engine clones its own copy).
    const initialSnapshot = generated.snapshot;
    const engineState = createWorldEngineState(initialSnapshot);
    const simulationRaw = runSimulationWithYearlyCapture({
      initialState: engineState,
      years: args.years,
      startSequence: generated.initialEvents.length,
      processors: [],
      priorEvents: generated.initialEvents,
    });
    const simulation =
      options.transformSimulation !== undefined
        ? options.transformSimulation(simulationRaw)
        : simulationRaw;

    const realEndedAt = clock();
    const totalMilliseconds = Date.now() - startedMs;
    const runId = runIdGenerator.next();

    const written = buildAndWriteRunOutput({
      fs,
      outputRoot,
      runId,
      cwd: options.cwd,
      seed: args.seed,
      years: args.years,
      configSchemaVersion: config.schemaVersion,
      nameDataVersion: nameData.manifest.nameDataVersion,
      configHash,
      nameDataHash,
      rngAlgorithm: RNG_ALGORITHM_VERSION,
      simulationSpecVersion: SIMULATION_SPEC_VERSION,
      miniSpecVersion: S0_SPEC_VERSION,
      performanceTargets: config.performanceTargets,
      initialSnapshot,
      simulation,
      initialEvents: generated.initialEvents,
      realStartedAt,
      realEndedAt,
      totalMilliseconds,
      ...(options.afterTempWrite !== undefined ? { afterTempWrite: options.afterTempWrite } : {}),
    });

    if (!written.validationReport.overallPassed) {
      const reason = summarizeValidationFailure(written.validationReport);
      return {
        exitCode: EXIT_RUNTIME_ERROR,
        stdout: "",
        stderr: `validation failed: ${reason}\n`,
      };
    }

    const summary = buildSummary({
      years: args.years,
      seed: args.seed,
      simulationId: simulation.finalState.simulationId,
      initialPersonCount: initialSnapshot.persons.length,
      initialFamilyCount: initialSnapshot.families.length,
      initialLineageCount: initialSnapshot.lineages.length,
      finalWorldDate: simulation.finalState.worldDate,
      weeksExecuted: simulation.weeksExecuted,
      runId,
      outputDirectory: written.atomic.runDirectory,
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
  if (parsed.sprint1InputPath !== undefined) {
    return runSprint1Simulation({ ...parsed, sprint1InputPath: parsed.sprint1InputPath }, options);
  }
  return runSimulation(parsed, options);
}

function loadConfigAndNameData(
  args: Extract<ParsedCliArgs, { kind: "run" }>,
  options: RunCliOptions,
  sha256Provider: Sha256Provider,
):
  | { ok: true; config: InitialWorldConfig; nameData: ValidatedNameData }
  | { ok: false; result: CliResult } {
  const absoluteConfigPath = resolveConfigPath(options.cwd, args.configPath);

  let configJson: unknown;
  try {
    configJson = readJsonFile(absoluteConfigPath);
  } catch (error) {
    return {
      ok: false,
      result: {
        exitCode: EXIT_RUNTIME_ERROR,
        stdout: "",
        stderr: `${formatErrorMessage(error)}\n`,
      },
    };
  }

  const configResult = validateInitialWorldConfig(configJson);
  if (!configResult.ok) {
    return {
      ok: false,
      result: {
        exitCode: EXIT_RUNTIME_ERROR,
        stdout: "",
        stderr: `config validation failed: ${JSON.stringify(configResult.issues)}\n`,
      },
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
      ok: false,
      result: {
        exitCode: EXIT_RUNTIME_ERROR,
        stdout: "",
        stderr: `${formatErrorMessage(error)}\n`,
      },
    };
  }

  return { ok: true, config, nameData };
}

function runSprint1Simulation(
  args: Extract<ParsedCliArgs, { kind: "run" }> & { sprint1InputPath: string },
  options: RunCliOptions,
): CliResult {
  const sha256Provider = options.sha256Provider ?? createNodeSha256Provider();
  const fs = options.fs ?? createNodeFsOps();
  const clock = options.clock ?? (() => new Date());
  const runIdGenerator = options.runIdGenerator ?? createRunIdGenerator(clock);
  const outputRoot = options.outputRoot ?? fs.join(options.cwd, "output");

  const loaded = loadConfigAndNameData(args, options, sha256Provider);
  if (!loaded.ok) {
    return loaded.result;
  }
  const { config, nameData } = loaded;

  const absoluteSprint1InputPath = resolveConfigPath(options.cwd, args.sprint1InputPath);
  let sprint1InputJson: unknown;
  try {
    sprint1InputJson = readJsonFile(absoluteSprint1InputPath);
  } catch (error) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `${formatErrorMessage(error)}\n`,
    };
  }

  const sprint1InputResult = validateSprint1CliInput(sprint1InputJson, sha256Provider);
  if (!sprint1InputResult.ok) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `sprint1-input validation failed: ${JSON.stringify(sprint1InputResult.issues)}\n`,
    };
  }

  const nameDataHash = computeNameDataHash(nameData.manifest, sha256Provider);

  const sprint2IdentityBindingsResult = createDefaultSprint2IdentityBindings(sha256Provider);
  if (!sprint2IdentityBindingsResult.ok) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `sprint2 identity bindings failed: ${JSON.stringify(sprint2IdentityBindingsResult.issues)}\n`,
    };
  }

  const sessionResult = createSprint1RunSession(
    {
      seed: args.seed,
      config,
      nameData,
      sprint1CliInput: sprint1InputJson,
      sprint2IdentityBindings: sprint2IdentityBindingsResult.value,
    },
    sha256Provider,
  );
  if (!sessionResult.ok) {
    return {
      exitCode: EXIT_RUNTIME_ERROR,
      stdout: "",
      stderr: `sprint1 run session creation failed: ${JSON.stringify(sessionResult.issues)}\n`,
    };
  }

  try {
    const realStartedAt = clock();
    const startedMs = Date.now();

    const simulation = runSprint1SimulationWithYearlyCapture({
      initialSession: sessionResult.value.session,
      years: args.years,
      sha256Provider,
    });

    const realEndedAt = clock();
    const totalMilliseconds = Date.now() - startedMs;
    const runId = runIdGenerator.next();

    const written = buildAndWriteSprint1RunOutput({
      fs,
      outputRoot,
      runId,
      cwd: options.cwd,
      configSchemaVersion: config.schemaVersion,
      nameDataVersion: nameData.manifest.nameDataVersion,
      nameDataHash,
      simulationSpecVersion: SIMULATION_SPEC_VERSION,
      performanceTargets: config.performanceTargets,
      createResult: sessionResult.value,
      simulation,
      provider: sha256Provider,
      realStartedAt,
      realEndedAt,
      totalMilliseconds,
      ...(options.afterTempWrite !== undefined ? { afterTempWrite: options.afterTempWrite } : {}),
    });

    if (!written.validationReport.overallPassed) {
      const reason = summarizeValidationFailure(written.validationReport);
      return {
        exitCode: EXIT_RUNTIME_ERROR,
        stdout: "",
        stderr: `validation failed: ${reason}\n`,
      };
    }

    const initialSnapshot = sessionResult.value.initialWorldSnapshotForOutput;
    const summary = buildSummary({
      years: args.years,
      seed: args.seed,
      simulationId: simulation.finalSession.context.simulationId,
      initialPersonCount: initialSnapshot.persons.length,
      initialFamilyCount: initialSnapshot.families.length,
      initialLineageCount: initialSnapshot.lineages.length,
      finalWorldDate: simulation.finalSession.runtimeState.worldState.worldDate,
      weeksExecuted: simulation.weeksExecuted,
      runId,
      outputDirectory: written.atomic.runDirectory,
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
