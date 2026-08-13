import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
  type Dirent,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  asRelationshipId,
  cloneWorldEngineState,
  validateInitialWorldConfig,
} from "@shared-world/simulation-core";
import { afterEach, describe, expect, it } from "vitest";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";
import { evaluateReferenceIntegrity } from "../output/world-integrity.js";
import { buildValidationReport } from "../output/validation-report.js";
import { finalWorldToEngineState } from "../output/final-world.js";
import { verifyBoundarySeedPair } from "./boundary-seed-verification.js";
import {
  buildSprint0CompletionReport,
  completionReportToJsonFile,
  type BoundarySeedVerification,
  type YearProfileResult,
} from "./completion-report.js";
import { SPRINT0_ALTERNATE_SEED, SPRINT0_PRIMARY_SEED } from "./constants.js";
import {
  compareDifferentSeedRuns,
  compareDifferentSeedWorldBundles,
  compareSameSeedRuns,
  extractDifferentSeedWorldBundle,
  normalizeInitialEventForComparison,
} from "./determinism-verification.js";
import { executeSprint0Run } from "./execute-run.js";
import { verifyFixedSevenDirents, verifyFixedSevenFilesOnDisk } from "./fixed-seven-files.js";
import { verifyRunInvariants } from "./invariant-verification.js";
import { invalidateCompletionReport, writeCompletionReportAtomic } from "./report-io.js";
import { runIsolatedPopulationPerformance } from "./run-population-performance.js";
import { verifySameSeedPair } from "./same-seed-verification.js";
import { buildScaledPopulationConfig, loadBaselineConfig } from "./scaled-config.js";

const REPO_ROOT = join(import.meta.dirname, "../../../..");

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir !== undefined) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "dollworld-s00-010-"));
  tempDirs.push(dir);
  return dir;
}

function mkdirSyncUnique(parent: string): string {
  return mkdtempSync(join(parent, "worker-"));
}

function emptyFinalYearStatistics(): YearProfileResult["finalYearStatistics"] {
  return {
    livingCount: 0,
    ageBands: { age0To7: 0, age8To15: 0, age16To17: 0, age18To41: 0, age42Plus: 0 },
    career: { child: 0, trainee: 0, activeCompetitor: 0, retired: 0 },
    ranks: {
      rankNone: 0,
      rankF: 0,
      rankE: 0,
      rankD: 0,
      rankC: 0,
      rankB: 0,
      rankA: 0,
      rankS: 0,
    },
    familyCount: 0,
    lineageCount: 0,
    qualifiedMasterCount: 0,
    mastersWithDisciplesCount: 0,
    maximumDiscipleCount: 0,
    births: { available: false },
    deaths: { available: false },
    brokenReferenceCount: 0,
    invariantViolationCount: 0,
    eventCountCumulative: 0,
  };
}

function boundaryEntry(seed: number, passed: boolean): BoundarySeedVerification {
  return {
    seed,
    determinismPassed: true,
    differenceCount: 0,
    runs: [
      {
        run: "first",
        invariantsPassed: passed,
        validationPassed: true,
        terminationPassed: true,
        sevenFilesPassed: passed,
      },
      {
        run: "second",
        invariantsPassed: passed,
        validationPassed: true,
        terminationPassed: true,
        sevenFilesPassed: passed,
      },
    ],
    passed,
  };
}

const passedSameSeedRuns = [
  {
    run: "first" as const,
    invariantsPassed: true,
    validationPassed: true,
    terminationPassed: true,
    sevenFilesPassed: true,
  },
  {
    run: "second" as const,
    invariantsPassed: true,
    validationPassed: true,
    terminationPassed: true,
    sevenFilesPassed: true,
  },
];

const passedBoundary = {
  passed: true,
  results: [boundaryEntry(0, true), boundaryEntry(4294967295, true)],
};

describe("scaled-config", () => {
  it("builds valid 2000 and 5000 population configs", () => {
    const baseline = loadBaselineConfig(REPO_ROOT);
    for (const population of [2000, 5000] as const) {
      const scaled = buildScaledPopulationConfig(baseline, population);
      expect(scaled.population.totalLiving).toBe(population);
      const ageSum = scaled.population.ageBands.reduce((sum, band) => sum + band.count, 0);
      expect(ageSum).toBe(population);
      const rankSum = Object.values(scaled.population.activeRankDistribution).reduce(
        (sum, n) => sum + n,
        0,
      );
      const activeBand = scaled.population.ageBands.find((b) => b.minAge === 16);
      expect(rankSum).toBe(activeBand?.count);
      const revalidated = validateInitialWorldConfig(JSON.parse(JSON.stringify(scaled)) as unknown);
      expect(revalidated.ok).toBe(true);
    }
  });
});

describe("sprint0 short-horizon verification", () => {
  it("matches same-seed deterministic outputs and differs for alternate seed", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const a = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 2,
    });
    const b = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 2,
    });
    const c = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_ALTERNATE_SEED,
      years: 2,
    });

    const same = compareSameSeedRuns(a, b);
    expect(same.passed).toBe(true);
    expect(same.differences).toEqual([]);
    expect(a.fileTexts["final-world.json"]).toBe(b.fileTexts["final-world.json"]);
    expect(a.processorRuntimeState).toEqual(b.processorRuntimeState);

    const different = compareDifferentSeedRuns(a, c);
    expect(different.passed).toBe(true);
    expect(different.simulationIdsDiffer).toBe(true);
    expect(different.initialWorldDiffers || different.finalWorldDiffers).toBe(true);

    const invariants = verifyRunInvariants(a, baseline);
    expect(invariants.passed).toBe(true);
    expect(a.simulation.weeksExecuted).toBe(96);
    expect(a.simulation.yearEnds).toHaveLength(2);
  }, 180_000);

  it("fails different-seed comparison when only simulationId differs", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const base = extractDifferentSeedWorldBundle(run);
    const idOnly = {
      ...base,
      simulationId: `${base.simulationId}_other`,
    };
    const result = compareDifferentSeedWorldBundles(base, idOnly);
    expect(result.simulationIdsDiffer).toBe(true);
    expect(result.initialWorldDiffers).toBe(false);
    expect(result.finalWorldDiffers).toBe(false);
    expect(result.passed).toBe(false);
  }, 120_000);

  it("fails different-seed comparison when only simulationId-derived event metadata differs", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const base = extractDifferentSeedWorldBundle(run);
    expect(base.initial.initialEvents.length).toBeGreaterThan(0);

    // Same world, but every id derived from a different simulationId.
    const otherSimulationId = `${base.simulationId}_other`;
    const rewrittenEvents = run.initialEvents.map((event, index) =>
      normalizeInitialEventForComparison({
        ...event,
        simulationId: otherSimulationId as typeof event.simulationId,
        eventId: `event_9${String(index).padStart(8, "0")}` as typeof event.eventId,
      }),
    );
    const simulationIdOnly = {
      simulationId: otherSimulationId,
      initial: { ...base.initial, initialEvents: rewrittenEvents },
      final: base.final,
    };

    const result = compareDifferentSeedWorldBundles(base, simulationIdOnly);
    expect(result.simulationIdsDiffer).toBe(true);
    expect(result.initialWorldDiffers).toBe(false);
    expect(result.finalWorldDiffers).toBe(false);
    expect(result.passed).toBe(false);

    for (const event of base.initial.initialEvents) {
      expect(event).not.toHaveProperty("simulationId");
      expect(event).not.toHaveProperty("eventId");
    }
  }, 120_000);

  it("passes different-seed comparison when entity content differs", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const base = extractDifferentSeedWorldBundle(run);
    const withPersonDiff = {
      simulationId: `${base.simulationId}_other`,
      initial: {
        ...base.initial,
        persons: [...(base.initial.persons as unknown[]), { marker: "diff" }],
      },
      final: base.final,
    };
    const result = compareDifferentSeedWorldBundles(base, withPersonDiff);
    expect(result.passed).toBe(true);
    expect(result.simulationIdsDiffer).toBe(true);
    expect(result.initialWorldDiffers).toBe(true);
  }, 120_000);

  it("matches same-seed outputs for boundary seeds 0 and 4294967295", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    for (const seed of [0, 4294967295] as const) {
      const first = executeSprint0Run({
        repoRoot: REPO_ROOT,
        outputRoot,
        config: baseline,
        seed,
        years: 1,
      });
      const second = executeSprint0Run({
        repoRoot: REPO_ROOT,
        outputRoot,
        config: baseline,
        seed,
        years: 1,
      });
      const same = compareSameSeedRuns(first, second);
      expect(same.passed).toBe(true);
      expect(verifyRunInvariants(first, baseline).passed).toBe(true);
      expect(first.simulation.finalState.worldDate.absoluteWeek).toBe(48);
    }
  }, 180_000);

  it("fails disk seven-file check for extra files, directories, and missing files", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const before = verifyFixedSevenFilesOnDisk(run.runDirectory);
    expect(before.passed).toBe(true);
    expect(before.entryCount).toBe(7);
    expect(before.actualFileNames).toEqual([...FIXED_OUTPUT_FILE_NAMES].sort());

    const extraFile = join(run.runDirectory, "extra-note.txt");
    writeFileSync(extraFile, "unexpected\n", "utf8");
    const withExtraFile = verifyFixedSevenFilesOnDisk(run.runDirectory);
    expect(withExtraFile.passed).toBe(false);
    expect(withExtraFile.issues.some((issue) => issue.name === "sevenFiles.extra")).toBe(true);

    const invariants = verifyRunInvariants(run, baseline);
    expect(invariants.passed).toBe(false);
    expect(invariants.issues.some((issue) => issue.name === "sevenFiles.extra")).toBe(true);
    rmSync(extraFile);

    const extraDir = join(run.runDirectory, "extra-directory");
    mkdirSync(extraDir);
    const withExtraDir = verifyFixedSevenFilesOnDisk(run.runDirectory);
    expect(withExtraDir.passed).toBe(false);
    expect(withExtraDir.issues.some((issue) => issue.name === "sevenFiles.nonRegularEntry")).toBe(
      true,
    );
    rmSync(extraDir, { recursive: true });

    rmSync(join(run.runDirectory, "performance.json"));
    const withMissing = verifyFixedSevenFilesOnDisk(run.runDirectory);
    expect(withMissing.passed).toBe(false);
    expect(
      withMissing.issues.some(
        (issue) =>
          issue.name === "sevenFiles.missing" && issue.targetIds.includes("performance.json"),
      ),
    ).toBe(true);
  }, 120_000);

  it("fails when a required name is a directory or a symbolic link", () => {
    const dir = makeTempDir();
    const runDirectory = join(dir, "run");
    mkdirSync(runDirectory);
    for (const name of FIXED_OUTPUT_FILE_NAMES) {
      if (name === "performance.json") {
        mkdirSync(join(runDirectory, name));
        continue;
      }
      writeFileSync(join(runDirectory, name), "x", "utf8");
    }
    const requiredNameIsDirectory = verifyFixedSevenFilesOnDisk(runDirectory);
    expect(requiredNameIsDirectory.passed).toBe(false);
    expect(requiredNameIsDirectory.entryCount).toBe(7);
    expect(
      requiredNameIsDirectory.issues.some((issue) => issue.name === "sevenFiles.nonRegularEntry"),
    ).toBe(true);
    expect(
      requiredNameIsDirectory.issues.some(
        (issue) =>
          issue.name === "sevenFiles.missing" && issue.targetIds.includes("performance.json"),
      ),
    ).toBe(true);

    // Symbolic links need elevated rights on Windows; fall back to Dirent-level checks.
    const linkDirectory = join(dir, "linked-run");
    mkdirSync(linkDirectory);
    let symlinkCreated = true;
    try {
      const target = join(dir, "target.json");
      writeFileSync(target, "{}", "utf8");
      for (const name of FIXED_OUTPUT_FILE_NAMES) {
        if (name === "events.jsonl") {
          symlinkSync(target, join(linkDirectory, name), "file");
          continue;
        }
        writeFileSync(join(linkDirectory, name), "x", "utf8");
      }
    } catch {
      symlinkCreated = false;
    }
    if (symlinkCreated) {
      const linkResult = verifyFixedSevenFilesOnDisk(linkDirectory);
      expect(linkResult.passed).toBe(false);
      expect(linkResult.issues.some((issue) => issue.name === "sevenFiles.nonRegularEntry")).toBe(
        true,
      );
    }

    const symlinkDirent = {
      name: "events.jsonl",
      isFile: () => false,
      isDirectory: () => false,
      isSymbolicLink: () => true,
    } as unknown as Dirent;
    const regularDirents = readdirSync(runDirectory, { withFileTypes: true }).filter(
      (entry) => entry.name !== "events.jsonl" && entry.name !== "performance.json",
    );
    const direntResult = verifyFixedSevenDirents([...regularDirents, symlinkDirent]);
    expect(direntResult.passed).toBe(false);
    expect(direntResult.issues.some((issue) => issue.name === "sevenFiles.nonRegularEntry")).toBe(
      true,
    );
  });

  it("fails overall when a boundary seed run breaks the fixed 7 files", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const first = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: 0,
      years: 1,
    });
    const second = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: 0,
      years: 1,
    });

    const healthy = verifyBoundarySeedPair({ seed: 0, config: baseline, first, second });
    expect(healthy.result.passed).toBe(true);
    expect(healthy.result.determinismPassed).toBe(true);
    expect(healthy.result.runs).toHaveLength(2);
    for (const run of healthy.result.runs) {
      expect(run.invariantsPassed).toBe(true);
      expect(run.validationPassed).toBe(true);
      expect(run.terminationPassed).toBe(true);
      expect(run.sevenFilesPassed).toBe(true);
    }

    // Same identical corruption in both runs: determinism still matches, verification must not.
    writeFileSync(join(first.runDirectory, "stray.json"), "{}\n", "utf8");
    writeFileSync(join(second.runDirectory, "stray.json"), "{}\n", "utf8");
    const broken = verifyBoundarySeedPair({ seed: 0, config: baseline, first, second });
    expect(broken.result.determinismPassed).toBe(true);
    expect(broken.result.passed).toBe(false);
    expect(broken.result.runs.every((run) => !run.sevenFilesPassed)).toBe(true);
    expect(broken.issues.length).toBeGreaterThan(0);

    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: baseline.schemaVersion,
      nameDataVersion: first.initialSnapshot.nameDataVersion,
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: SPRINT0_PRIMARY_SEED,
      alternateSeed: SPRINT0_ALTERNATE_SEED,
      boundarySeeds: [0, 4294967295],
      sameSeed: { passed: true, differences: [] },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: {
        passed: false,
        results: [broken.result, boundaryEntry(4294967295, true)],
      },
      invariants: { passed: false, issues: broken.issues },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.boundarySeedDeterminism.status).toBe("failed");
    expect(completion.boundarySeedDeterminism.results[0]?.determinismStatus).toBe("passed");
    expect(completion.boundarySeedDeterminism.results[0]?.runs).toHaveLength(2);
  }, 180_000);

  it("fails overall when only the same-seed second run breaks fixed 7 files", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    // Short runs exercise the same aggregation path as years100a/years100b.
    const years100a = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const years100b = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });

    const healthy = verifySameSeedPair({ config: baseline, first: years100a, second: years100b });
    expect(healthy.determinism.passed).toBe(true);
    expect(healthy.passed).toBe(true);
    expect(healthy.runs[0]?.sevenFilesPassed).toBe(true);
    expect(healthy.runs[1]?.sevenFilesPassed).toBe(true);

    writeFileSync(join(years100b.runDirectory, "stray-second-only.json"), "{}\n", "utf8");
    expect(compareSameSeedRuns(years100a, years100b).passed).toBe(true);
    expect(verifyFixedSevenFilesOnDisk(years100a.runDirectory).passed).toBe(true);
    expect(verifyFixedSevenFilesOnDisk(years100b.runDirectory).passed).toBe(false);

    const broken = verifySameSeedPair({ config: baseline, first: years100a, second: years100b });
    expect(broken.determinism.passed).toBe(true);
    expect(broken.runs[0]?.sevenFilesPassed).toBe(true);
    expect(broken.runs[1]?.sevenFilesPassed).toBe(false);
    expect(broken.passed).toBe(false);

    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: baseline.schemaVersion,
      nameDataVersion: years100a.initialSnapshot.nameDataVersion,
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: SPRINT0_PRIMARY_SEED,
      alternateSeed: SPRINT0_ALTERNATE_SEED,
      boundarySeeds: [0, 4294967295],
      sameSeed: broken.determinism,
      sameSeedRuns: broken.runs,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: { passed: false, issues: broken.issues },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: false,
      validationSamplesOk: false,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.sameSeedComparison.status).toBe("failed");
    expect(completion.sameSeedComparison.differenceCount).toBe(0);
    expect(completion.sameSeedComparison.runs[0]?.sevenFilesPassed).toBe(true);
    expect(completion.sameSeedComparison.runs[1]?.sevenFilesPassed).toBe(false);
    expect(completion.sevenFiles.status).toBe("failed");
  }, 180_000);

  it("fails overall when only the same-seed second run has failed validation", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const years100a = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const years100b = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });

    years100b.validationReport = {
      ...years100b.validationReport,
      overallPassed: false,
    };

    expect(compareSameSeedRuns(years100a, years100b).passed).toBe(true);
    const broken = verifySameSeedPair({ config: baseline, first: years100a, second: years100b });
    expect(broken.determinism.passed).toBe(true);
    expect(broken.runs[0]?.validationPassed).toBe(true);
    expect(broken.runs[1]?.validationPassed).toBe(false);
    expect(broken.passed).toBe(false);

    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: baseline.schemaVersion,
      nameDataVersion: years100a.initialSnapshot.nameDataVersion,
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: SPRINT0_PRIMARY_SEED,
      alternateSeed: SPRINT0_ALTERNATE_SEED,
      boundarySeeds: [0, 4294967295],
      sameSeed: broken.determinism,
      sameSeedRuns: broken.runs,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: { passed: false, issues: broken.issues },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: false,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.sameSeedComparison.status).toBe("failed");
    expect(completion.sameSeedComparison.runs[1]?.validationPassed).toBe(false);
  }, 180_000);

  it("removes the population worker temp directory on success and on failure", () => {
    const parent = makeTempDir();
    const scriptDir = join(parent, "scripts");
    mkdirSync(scriptDir);
    const baseline = loadBaselineConfig(REPO_ROOT);
    const createdRoots: string[] = [];
    const createWorkRoot = (): string => {
      const root = mkdirSyncUnique(parent);
      createdRoots.push(root);
      return root;
    };
    const workerInput = {
      repoRoot: REPO_ROOT,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
      population: 600,
      config: baseline,
      warningSeconds: null,
      measureOnly: true,
    } as const;

    // Stub worker: exercises temp lifecycle without paying for a full population run.
    const okWorker = join(scriptDir, "ok-worker.cjs");
    writeFileSync(
      okWorker,
      [
        "const fs = require('node:fs');",
        "const outputPath = process.argv[3];",
        "fs.writeFileSync(outputPath, JSON.stringify({",
        "  profile: { population: 600, years: 1, livingCount: 600, totalMilliseconds: 1,",
        "    actualSeconds: 0.001, averageMillisecondsPerYear: 1, warningSeconds: null,",
        "    exceeded: false, measureOnly: true, maxRssKilobytes: 1, outputBytes: 1,",
        "    eventCount: 1, warnings: [] },",
        "  invariantsPassed: true, sevenFilesPassed: true, validationOverallPassed: true,",
        "  terminationKind: 'completed', nameDataVersion: 'NAMES-0.1.2'",
        "}) + '\\n', 'utf8');",
        "",
      ].join("\n"),
      "utf8",
    );
    const failingWorker = join(scriptDir, "failing-worker.cjs");
    writeFileSync(
      failingWorker,
      "process.stderr.write('worker boom\\n');\nprocess.exit(1);\n",
      "utf8",
    );

    const okOutput = runIsolatedPopulationPerformance(workerInput, {
      createWorkRoot,
      workerMainPath: okWorker,
    });
    expect(okOutput.profile.population).toBe(600);
    expect(createdRoots).toHaveLength(1);
    expect(existsSync(createdRoots[0]!)).toBe(false);

    expect(() =>
      runIsolatedPopulationPerformance(workerInput, {
        createWorkRoot,
        workerMainPath: failingWorker,
      }),
    ).toThrow(/population performance worker exited/);
    expect(createdRoots).toHaveLength(2);
    expect(existsSync(createdRoots[1]!)).toBe(false);
    expect(readdirSync(parent)).toEqual(["scripts"]);
  }, 120_000);

  it("fails overall when alternate-seed invariant sample fails", () => {
    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: "0.2.3",
      nameDataVersion: "NAMES-0.1.2",
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: SPRINT0_PRIMARY_SEED,
      alternateSeed: SPRINT0_ALTERNATE_SEED,
      boundarySeeds: [0, 4294967295],
      sameSeed: { passed: true, differences: [] },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: {
        passed: false,
        issues: [
          {
            name: "altSeed10.invariants",
            targetIds: ["person_missing"],
            reason: "alternate seed run failed invariants",
            severity: "error",
            canContinue: false,
          },
        ],
      },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.functionalFailureCount).toBeGreaterThan(0);
    expect(completion.invariants.status).toBe("failed");
  });

  it("invalidates prior success report before rewrite and on failure path", () => {
    const dir = makeTempDir();
    const reportPath = join(dir, "sprint0-completion-report.json");
    const success = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: "old",
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: "0.2.3",
      nameDataVersion: "NAMES-0.1.2",
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: 12345,
      alternateSeed: 99999,
      boundarySeeds: [0],
      sameSeed: { passed: true, differences: [] },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: { passed: true, issues: [] },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: [],
    });
    expect(success.overallPassed).toBe(true);
    writeCompletionReportAtomic(reportPath, success);
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, "utf8")).overallPassed).toBe(true);

    invalidateCompletionReport(reportPath);
    expect(existsSync(reportPath)).toBe(false);
  });

  it("fails invariants and validation report for broken references with target ids", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const brokenState = {
      ...run.simulation.finalState,
      persons: run.simulation.finalState.persons.map((person, index) =>
        index === 0 ? { ...person, familyId: "family_missing" as typeof person.familyId } : person,
      ),
    };
    const integrity = evaluateReferenceIntegrity(brokenState);
    expect(integrity.passed).toBe(false);
    expect(integrity.brokenReferences[0]?.targetIds.length).toBeGreaterThan(0);
    const report = buildValidationReport({ finalIntegrity: integrity });
    expect(report.overallPassed).toBe(false);

    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: baseline.schemaVersion,
      nameDataVersion: run.initialSnapshot.nameDataVersion,
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: SPRINT0_PRIMARY_SEED,
      alternateSeed: SPRINT0_ALTERNATE_SEED,
      boundarySeeds: [0, 4294967295],
      sameSeed: { passed: true, differences: [] },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: {
        passed: false,
        issues: [
          {
            name: "broken_references",
            targetIds: integrity.brokenReferences[0]!.targetIds,
            reason: "broken",
            severity: "error",
            canContinue: false,
          },
        ],
      },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: ["example-not-performed"],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.functionalFailureCount).toBeGreaterThan(0);
    expect(completion.notPerformed).toContain("example-not-performed");
    expect(completion.sameSeedComparison.status).not.toBe("not_performed");
    const text = completionReportToJsonFile(completion);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.includes("\r")).toBe(false);
    expect(JSON.parse(text).schemaVersion).toBe(completion.schemaVersion);
  }, 120_000);

  it("keeps self-reference and cycle negatives distinct", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const state = cloneWorldEngineState(finalWorldToEngineState(run.finalWorld));
    const personId = state.persons.find((p) => p.lifeStatus === "living")!.personId;
    const withSelf = {
      ...state,
      relationships: [
        ...state.relationships,
        {
          relationshipId: asRelationshipId("relationship_self_pc"),
          kind: "parent_child" as const,
          parentId: personId,
          childId: personId,
          parentRole: "father" as const,
        },
      ],
    };
    const integrity = evaluateReferenceIntegrity(withSelf);
    expect(integrity.selfReferenceCount).toBe(1);
    expect(integrity.selfReferences[0]?.relationshipId).toBe("relationship_self_pc");
    expect(integrity.cycles.some((c) => c.targetIds.includes("relationship_self_pc"))).toBe(false);
  }, 120_000);

  it("fails invariants for event sequence gaps, duplicates, and eventId mismatch", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    expect(run.allEvents.length).toBeGreaterThan(2);

    const gapEvents = run.allEvents.filter((_, index) => index !== 1);
    const gapResult = verifyRunInvariants({ ...run, allEvents: gapEvents }, baseline);
    expect(gapResult.passed).toBe(false);
    expect(gapResult.issues.some((issue) => issue.name.startsWith("events."))).toBe(true);

    const dupEvents = [...run.allEvents];
    dupEvents.splice(1, 0, { ...run.allEvents[0]! });
    const dupResult = verifyRunInvariants({ ...run, allEvents: dupEvents }, baseline);
    expect(dupResult.passed).toBe(false);

    const mismatchEvents = run.allEvents.map((event, index) =>
      index === 0 ? { ...event, eventId: "event_000000099" as typeof event.eventId } : event,
    );
    const mismatchResult = verifyRunInvariants({ ...run, allEvents: mismatchEvents }, baseline);
    expect(mismatchResult.passed).toBe(false);
    expect(
      mismatchResult.issues.some(
        (issue) => issue.targetIds.length > 0 || issue.name.includes("events"),
      ),
    ).toBe(true);
  }, 120_000);

  it("fails integrity for invalid age and retired person retaining currentRank", () => {
    const outputRoot = join(makeTempDir(), "output");
    const baseline = loadBaselineConfig(REPO_ROOT);
    const run = executeSprint0Run({
      repoRoot: REPO_ROOT,
      outputRoot,
      config: baseline,
      seed: SPRINT0_PRIMARY_SEED,
      years: 1,
    });
    const state = cloneWorldEngineState(finalWorldToEngineState(run.finalWorld));
    const living = state.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "active_competitor",
    );
    expect(living).toBeDefined();
    if (living === undefined || living.lifeStatus !== "living") {
      throw new Error("expected living active_competitor");
    }
    const badAge = {
      ...state,
      persons: state.persons.map((person) =>
        person.personId === living.personId && person.lifeStatus === "living"
          ? { ...person, currentAge: person.currentAge + 5 }
          : person,
      ),
    };
    const ageIntegrity = evaluateReferenceIntegrity(badAge);
    expect(ageIntegrity.passed).toBe(false);
    expect(ageIntegrity.ageViolations[0]?.personId).toBe(living.personId);
    expect(ageIntegrity.ageViolations[0]?.severity).toBe("error");

    const retired = state.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "retired",
    );
    expect(retired).toBeDefined();
    if (retired === undefined || retired.lifeStatus !== "living") {
      throw new Error("expected living retired person");
    }
    const badRankPerson = {
      ...retired,
      careerStatus: "retired" as const,
      currentRank: "F",
    };
    const badRank = {
      ...state,
      persons: state.persons.map((person) =>
        person.personId === retired.personId ? (badRankPerson as unknown as typeof person) : person,
      ),
    };
    const rankIntegrity = evaluateReferenceIntegrity(badRank);
    expect(rankIntegrity.passed).toBe(false);
    expect(rankIntegrity.statusViolations.some((v) => v.personId === retired.personId)).toBe(true);
    expect(rankIntegrity.statusViolations[0]?.severity).toBe("error");
  }, 120_000);

  it("treats performance warnings as warnings without forcing overall failure alone", () => {
    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: "abc",
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: "0.2.3",
      nameDataVersion: "NAMES-0.1.2",
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: 12345,
      alternateSeed: 99999,
      boundarySeeds: [0],
      sameSeed: { passed: true, differences: [] },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: false,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: { passed: true, issues: [] },
      yearProfiles: [
        {
          years: 10,
          weeksExecuted: 480,
          csvRows: 10,
          finalWorldDate: { year: 11, month: 1, weekOfMonth: 1, absoluteWeek: 480 },
          eventCount: 1,
          livingCount: 600,
          totalMilliseconds: 1000,
          averageMillisecondsPerYear: 100,
          maxRssKilobytes: null,
          maxRssMeasurementScope: "not_measured_per_run",
          outputBytes: 1,
          invariantsPassed: true,
          sevenFilesPassed: true,
          finalYearStatistics: emptyFinalYearStatistics(),
        },
      ],
      populationProfiles: [
        {
          population: 600,
          years: 100,
          livingCount: 600,
          totalMilliseconds: 60_000,
          actualSeconds: 60,
          averageMillisecondsPerYear: 600,
          warningSeconds: 30,
          exceeded: true,
          measureOnly: false,
          maxRssKilobytes: 1,
          outputBytes: 1,
          eventCount: 1,
          warnings: ["600 people exceeded"],
        },
      ],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(true);
    expect(completion.warningCount).toBe(1);
    expect(completion.functionalFailureCount).toBe(0);
  });

  it("marks reproducibility violation as overall failure", () => {
    const completion = buildSprint0CompletionReport({
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
      commitId: null,
      workingTreeDirty: false,
      simulationSpecVersion: "SPEC-0.1.1",
      miniSpecVersion: "S0-SPEC-0.1.6",
      configSchemaVersion: "0.2.3",
      nameDataVersion: "NAMES-0.1.2",
      rngAlgorithm: "xoshiro128ss-v1",
      primarySeed: 12345,
      alternateSeed: 99999,
      boundarySeeds: [],
      sameSeed: {
        passed: false,
        differences: [
          {
            subject: "final-world.json",
            path: "final-world.json",
            expected: "a",
            actual: "b",
          },
        ],
      },
      sameSeedRuns: passedSameSeedRuns,
      differentSeed: {
        passed: true,
        simulationIdsDiffer: true,
        initialWorldDiffers: true,
        finalWorldDiffers: true,
        detail: "ok",
      },
      boundarySeedDeterminism: passedBoundary,
      invariants: { passed: true, issues: [] },
      yearProfiles: [],
      populationProfiles: [],
      sevenFilesOk: true,
      validationSamplesOk: true,
      notPerformed: [],
    });
    expect(completion.overallPassed).toBe(false);
    expect(completion.functionalFailureCount).toBe(1);
    expect(completion.sameSeedComparison.status).toBe("failed");
  });
});
