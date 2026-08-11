import {
  asPersonId,
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  createSprint1RunSession,
  generateInitialWorld,
  validateSprint1RunSession,
  type InitialWorldConfig,
  type PersonId,
  type Sha256Provider,
} from "@shared-world/simulation-core";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { runSprint1SimulationWithYearlyCaptureResult } from "../output/run-sprint1-simulation-yearly.js";
import {
  buildScaledPopulationConfig,
  loadBaselineConfig,
} from "../sprint0-verification/scaled-config.js";
import {
  SPRINT1_FIXTURE_INPUT_RELATIVE,
  SPRINT1_PERFORMANCE_SEED,
  SPRINT1_PERFORMANCE_YEARS,
} from "./constants.js";
import { loadTinySprint1Fixtures } from "./fixtures.js";
import { buildPerformanceSidecarFromTinyTemplate } from "./performance-sidecar.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Sprint1PopulationPerformanceWorkerInput = {
  repoRoot: string;
  /** Living-population target used by Sprint 0 scaled-config rules. */
  targetLivingPopulation: number;
  years: number;
  seed: number;
  config: InitialWorldConfig;
};

export type Sprint1PopulationPerformanceWorkerOutput = {
  targetLivingPopulation: number;
  years: number;
  seed: number;
  elapsedSeconds: number;
  totalMilliseconds: number;
  functionalPassed: boolean;
  validationPassed: boolean;
  maxRssKilobytes: number | null;
  actualLivingPopulation: number;
  totalPersonCount: number;
  sidecarCount: number;
  eventCount: number;
  weeksExecuted: number;
  yearsExecuted: number;
  yearEndCount: number;
  finalWorldDate: string;
  exitCode: number;
  detail: string;
};

function readMaxRssKilobytes(): number | null {
  try {
    const usage = process.resourceUsage();
    if (typeof usage.maxRSS === "number" && Number.isFinite(usage.maxRSS)) {
      return Math.round(usage.maxRSS);
    }
  } catch {
    // ignore
  }
  return null;
}

function formatWorldDate(worldDate: {
  year: number;
  month: number;
  weekOfMonth: number;
  absoluteWeek: number;
}): string {
  return `${String(worldDate.year)}-${String(worldDate.month)}-W${String(worldDate.weekOfMonth)}@${String(worldDate.absoluteWeek)}`;
}

/**
 * Probe PersonIds via generateInitialWorld (not timed), build sidecar, then
 * measure createSprint1RunSession + 1-year production yearly path
 * (validated-session trust boundary + year-end capture).
 */
export function runSprint1PopulationPerformanceProfile(
  input: Sprint1PopulationPerformanceWorkerInput,
): Sprint1PopulationPerformanceWorkerOutput {
  if (input.years !== SPRINT1_PERFORMANCE_YEARS) {
    throw new Error(
      `Sprint1 population performance years must be ${String(SPRINT1_PERFORMANCE_YEARS)}, got ${String(input.years)}`,
    );
  }

  const sha256Provider: Sha256Provider = createNodeSha256Provider();
  const fixtures = loadTinySprint1Fixtures(input.repoRoot, sha256Provider);
  const nameData = loadValidatedNameData({
    cwd: input.repoRoot,
    manifestPath: input.config.nameData.manifestPath,
    requiredVersion: input.config.nameData.requiredVersion,
    initialFamilyCount: input.config.families.initialFamilyCount,
    sha256Provider,
  });
  const configHash = computeConfigHash(input.config, sha256Provider);
  const nameDataHash = computeNameDataHash(nameData.manifest, sha256Provider);

  // Prep (not timed): discover PersonIds for this profile seed/config.
  const probe = generateInitialWorld({
    config: input.config,
    configHash,
    seed: input.seed,
    nameData,
    nameDataHash,
    rngFactory: createSeededRng,
    sha256Provider,
  });
  const personIds: PersonId[] = probe.snapshot.persons.map((person) => asPersonId(person.personId));
  const sidecar = buildPerformanceSidecarFromTinyTemplate(
    input.repoRoot,
    personIds,
    sha256Provider,
  );

  const sprint1CliInputRaw = JSON.parse(
    readFileSync(join(input.repoRoot, SPRINT1_FIXTURE_INPUT_RELATIVE), "utf8"),
  ) as Record<string, unknown>;
  const measuredInput = {
    ...sprint1CliInputRaw,
    initialWeeklyTrainingSidecar: sidecar,
  };

  const wallStart = Date.now();
  const createResult = createSprint1RunSession(
    {
      seed: input.seed,
      config: input.config,
      nameData,
      sprint1CliInput: measuredInput,
    },
    sha256Provider,
  );
  if (!createResult.ok) {
    throw new Error(
      `performance createSprint1RunSession failed: ${JSON.stringify(createResult.issues)}`,
    );
  }

  const yearly = runSprint1SimulationWithYearlyCaptureResult({
    initialSession: createResult.value.session,
    years: input.years,
    sha256Provider,
  });
  if (!yearly.ok) {
    throw new Error(`performance yearly simulation failed: ${JSON.stringify(yearly.issues)}`);
  }

  const validated = validateSprint1RunSession(yearly.value.finalSession, sha256Provider);
  if (!validated.ok) {
    throw new Error(
      `performance validateSprint1RunSession failed: ${JSON.stringify(validated.issues)}`,
    );
  }

  const totalMilliseconds = Date.now() - wallStart;
  const elapsedSeconds = totalMilliseconds / 1000;
  const persons = validated.value.runtimeState.worldState.persons;
  const actualLivingPopulation = persons.filter((person) => person.lifeStatus === "living").length;
  const totalPersonCount = persons.length;
  const sidecarCount = validated.value.runtimeState.weeklyTrainingSidecars.entries.length;
  const eventCount = validated.value.runtimeState.eventStream.length;
  const weeksExecuted = yearly.value.weeksExecuted;
  const yearsExecuted = input.years;
  const yearEndCount = yearly.value.yearEnds.length;
  const finalWorldDate = formatWorldDate(validated.value.runtimeState.worldState.worldDate);

  if (actualLivingPopulation !== input.targetLivingPopulation) {
    throw new Error(
      `actualLivingPopulation ${String(actualLivingPopulation)} !== targetLivingPopulation ${String(input.targetLivingPopulation)}`,
    );
  }
  if (weeksExecuted !== input.years * 48) {
    throw new Error(
      `weeksExecuted ${String(weeksExecuted)} !== expected ${String(input.years * 48)}`,
    );
  }
  if (yearEndCount !== input.years) {
    throw new Error(
      `year-end capture count ${String(yearEndCount)} !== years ${String(input.years)}`,
    );
  }
  if (
    validated.value.runtimeState.eventAllocationState.nextSequence !==
    validated.value.runtimeState.eventStream.length
  ) {
    throw new Error("eventAllocationState.nextSequence must equal eventStream.length");
  }

  const sessionIds = new Set(persons.map((person) => person.personId));
  const sidecarIds = new Set(
    validated.value.runtimeState.weeklyTrainingSidecars.entries.map((entry) => entry.personId),
  );
  if (sessionIds.size !== sidecarIds.size || sidecarCount !== totalPersonCount) {
    throw new Error("performance sidecar PersonId set must be exact 1:1 with World persons");
  }
  for (const id of sessionIds) {
    if (!sidecarIds.has(id)) {
      throw new Error(`performance sidecar missing PersonId ${id}`);
    }
  }
  void fixtures;

  return {
    targetLivingPopulation: input.targetLivingPopulation,
    years: input.years,
    seed: input.seed,
    elapsedSeconds,
    totalMilliseconds,
    functionalPassed: true,
    validationPassed: true,
    maxRssKilobytes: readMaxRssKilobytes(),
    actualLivingPopulation,
    totalPersonCount,
    sidecarCount,
    eventCount,
    weeksExecuted,
    yearsExecuted,
    yearEndCount,
    finalWorldDate,
    exitCode: 0,
    detail: `targetLiving=${String(input.targetLivingPopulation)} living=${String(actualLivingPopulation)} totalPersons=${String(totalPersonCount)} elapsedSeconds=${String(elapsedSeconds)}`,
  };
}

export function buildScaledSprint1PerformanceConfig(
  repoRoot: string,
  targetLivingPopulation: number,
): InitialWorldConfig {
  const baseline = loadBaselineConfig(repoRoot);
  return buildScaledPopulationConfig(baseline, targetLivingPopulation);
}

export { SPRINT1_PERFORMANCE_SEED, SPRINT1_PERFORMANCE_YEARS };
