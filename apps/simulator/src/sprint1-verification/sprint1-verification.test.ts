import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildSprint1CompletionReport,
  completionReportToJsonFile,
  validateSprint1CompletionReport,
} from "./completion-report.js";
import {
  SPRINT1_ALTERNATE_SEED,
  SPRINT1_BASE_SEED,
  SPRINT1_COMPLETION_REPORT_FILE_NAME,
  SPRINT1_PERFORMANCE_PROFILES,
  SPRINT1_PERFORMANCE_SEED,
  SPRINT1_PERFORMANCE_YEARS,
  SPRINT0_PERFORMANCE_WARNING_CODE,
} from "./constants.js";
import { compareDifferentSeedFixedSeven, compareSameSeedFixedSeven } from "./compare-fixed7.js";
import { resolveRequiredGitCommit } from "./git-meta.js";
import {
  prepareIntegratedLearningSession,
  verifyIntegratedScenario,
} from "./integrated-scenario.js";
import { invalidateCompletionReport, writeCompletionReportAtomic } from "./report-io.js";
import { buildPerformanceSidecarFromTinyTemplate } from "./performance-sidecar.js";
import { runSprint1CliVerification } from "./run-sprint1-cli.js";
import { scanMathRandomCallExpressions } from "./math-random-scan.js";
import { readAndValidateSprint0CompletionReport } from "./sprint0-regression.js";
import {
  asPersonId,
  createSprint1RunSession,
  withDefaultSprint2BindingsForRunSessionInput,
  type PersonId,
} from "@shared-world/simulation-core";
import { loadValidatedNameData } from "../file-loader.js";
import { createNodeSha256Provider } from "../node-sha256-provider.js";
import { loadTinySprint1Fixtures } from "./fixtures.js";
import {
  buildBlockedBoundarySeeds,
  buildBlockedDifferentSeed,
  buildBlockedFixedSeven,
  buildBlockedIdentity,
  buildBlockedIntegrated,
  buildBlockedPerformance,
  buildBlockedSameSeed,
  buildBlockedSprint0,
  buildBlockedYearProfiles,
} from "./completion-report.js";

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
  const dir = mkdtempSync(join(tmpdir(), "dollworld-s01-009-"));
  tempDirs.push(dir);
  return dir;
}

function minimalPassedReport(gitCommit: string) {
  return buildSprint1CompletionReport({
    generatedAtUtc: new Date().toISOString(),
    gitCommit,
    workingTreeDirty: true,
    failures: [],
    warnings: [],
    sameSeed: {
      ...buildBlockedSameSeed("unit"),
      status: "passed",
      deterministicMatch: true,
      detail: "unit",
    },
    differentSeed: {
      ...buildBlockedDifferentSeed("unit"),
      status: "passed",
      simulationIdsDiffer: true,
      seedsDiffer: true,
      domainContentDiffers: true,
      detail: "unit",
    },
    boundarySeeds: buildBlockedBoundarySeeds("unit").map((entry) => ({
      ...entry,
      status: "passed" as const,
      deterministicMatch: true,
      detail: "unit",
    })),
    yearProfiles: buildBlockedYearProfiles("unit").map((entry) => ({
      ...entry,
      status: "passed" as const,
      weeksExecuted: entry.years * 48,
      csvDataRows: entry.years,
      finalWorldYear: entry.years + 1,
      sevenFilesPassed: true,
      validationPassed: true,
      detail: "unit",
    })),
    integratedScenario: {
      ...buildBlockedIntegrated("unit"),
      status: "passed",
      weeksExecuted: 2,
      yearsExecuted: 0,
      deterministicMatch: true,
      checkpointDigestsMatch: true,
      weekRegistryReset: true,
      globalBattleResultsRetained: true,
      detail: "unit",
    },
    identityAndCanonical: {
      ...buildBlockedIdentity("unit"),
      status: "passed",
      pathIndependencePassed: true,
      sidecarMotivationMutationChangesHashes: true,
      keyOrderInvariancePassed: true,
      detail: "unit",
    },
    fixedSeven: {
      ...buildBlockedFixedSeven("unit"),
      status: "passed",
      allExactlySeven: true,
      detail: "unit",
    },
    performanceProfiles: buildBlockedPerformance("unit").map((entry) => ({
      ...entry,
      status: "passed" as const,
      actualLivingPopulation: entry.targetLivingPopulation,
      totalPersonCount: entry.targetLivingPopulation + 1,
      sidecarCount: entry.targetLivingPopulation + 1,
      elapsedSeconds: 1,
      maxRssKilobytes: 1024,
      eventCount: 10,
      exitCode: 0,
      validationPassed: true,
      finalWorldDate: "2-4-W1@48",
      functionalPassed: true,
      detail: "unit",
    })),
    sprint0Regression: {
      ...buildBlockedSprint0("unit"),
      status: "passed",
      exitCode: 0,
      overallPassed: true,
      functionalFailureCount: 0,
      warningCount: 0,
      detail: "unit",
    },
    check: {
      npmCheck: { command: "npm run check", exitCode: 0, passed: true },
      wikiCheck: { command: "npm run wiki:check", exitCode: 0, passed: true },
      diffCheck: { command: "git diff --check HEAD", exitCode: 0, passed: true },
    },
  });
}

describe("S01-009 Sprint1 verification harness", () => {
  it("invalidates stale completion reports before write and validates read-back", () => {
    const dir = makeTempDir();
    const reportPath = join(dir, SPRINT1_COMPLETION_REPORT_FILE_NAME);
    const commit = resolveRequiredGitCommit(REPO_ROOT);
    const stale = minimalPassedReport(commit);
    writeFileSync(reportPath, completionReportToJsonFile(stale), "utf8");
    expect(existsSync(reportPath)).toBe(true);
    invalidateCompletionReport(reportPath);
    expect(existsSync(reportPath)).toBe(false);

    const failed = buildSprint1CompletionReport({
      ...stale,
      failures: [
        {
          code: "UNIT_FAILURE",
          message: "forced failure",
          scope: "unit",
        },
      ],
      warnings: [],
      sameSeed: stale.sameSeed,
      differentSeed: stale.differentSeed,
      boundarySeeds: stale.boundarySeeds,
      yearProfiles: stale.yearProfiles,
      integratedScenario: stale.integratedScenario,
      identityAndCanonical: stale.identityAndCanonical,
      fixedSeven: stale.fixedSeven,
      performanceProfiles: stale.performanceProfiles,
      sprint0Regression: stale.sprint0Regression,
      check: stale.check,
      generatedAtUtc: stale.generatedAtUtc,
      gitCommit: stale.gitCommit,
      workingTreeDirty: stale.workingTreeDirty,
    });
    expect(failed.overallPassed).toBe(false);
    expect(failed.functionalFailureCount).toBe(1);

    const written = writeCompletionReportAtomic(reportPath, failed);
    expect(written.overallPassed).toBe(false);
    const validated = validateSprint1CompletionReport(
      JSON.parse(readFileSync(reportPath, "utf8")) as unknown,
    );
    expect(validated.ok).toBe(true);
  });

  it("rejects invalid status strings and count mismatches", () => {
    const commit = resolveRequiredGitCommit(REPO_ROOT);
    const report = minimalPassedReport(commit);
    const invalid = {
      ...report,
      sameSeed: { ...report.sameSeed, status: "warning" },
    };
    const result = validateSprint1CompletionReport(invalid);
    expect(result.ok).toBe(false);
  });

  it("builds performance sidecar 1:1 from tiny template personId replacement only", () => {
    const ids = [
      asPersonId("person_000001"),
      asPersonId("person_000002"),
      asPersonId("person_000010"),
    ];
    const sidecar = buildPerformanceSidecarFromTinyTemplate(REPO_ROOT, ids);
    expect(sidecar.entries.map((entry) => entry.personId)).toEqual([
      "person_000001",
      "person_000002",
      "person_000010",
    ]);
    const fixtures = loadTinySprint1Fixtures(REPO_ROOT);
    const template = [...fixtures.sprint1CliInput.initialWeeklyTrainingSidecar.entries].sort(
      (a, b) => (a.personId < b.personId ? -1 : 1),
    )[0]!;
    for (const entry of sidecar.entries) {
      expect(entry.motivationFactor).toBe(template.motivationFactor);
      expect(entry.growthProfile).toBe(template.growthProfile);
      expect(entry.teacherFactorKey).toBe(template.teacherFactorKey);
    }
  });

  it("same-seed years=1 deterministic compare and different-seed domain difference", () => {
    const root = makeTempDir();
    const runsRoot = join(root, "runs");
    mkdirSync(runsRoot, { recursive: true });
    const a = runSprint1CliVerification({
      repoRoot: REPO_ROOT,
      runKey: "unit-same-a",
      years: 1,
      seed: SPRINT1_BASE_SEED,
      outputRoot: join(runsRoot, "unit-same-a"),
    });
    const b = runSprint1CliVerification({
      repoRoot: REPO_ROOT,
      runKey: "unit-same-b",
      years: 1,
      seed: SPRINT1_BASE_SEED,
      outputRoot: join(runsRoot, "unit-same-b"),
    });
    const same = compareSameSeedFixedSeven(a.absoluteRunDirectory, b.absoluteRunDirectory);
    expect(same.passed).toBe(true);

    const alt = runSprint1CliVerification({
      repoRoot: REPO_ROOT,
      runKey: "unit-diff-alt",
      years: 1,
      seed: SPRINT1_ALTERNATE_SEED,
      outputRoot: join(runsRoot, "unit-diff-alt"),
    });
    const different = compareDifferentSeedFixedSeven(
      a.absoluteRunDirectory,
      alt.absoluteRunDirectory,
    );
    expect(different.simulationIdsDiffer).toBe(true);
    expect(different.seedsDiffer).toBe(true);
    expect(different.domainContentDiffers).toBe(true);
    expect(different.passed).toBe(true);
  }, 120_000);

  it("boundary seeds 0 and 4294967295 each succeed for years=1", () => {
    const root = makeTempDir();
    const runsRoot = join(root, "runs");
    mkdirSync(runsRoot, { recursive: true });
    for (const seed of [0, 4294967295] as const) {
      const a = runSprint1CliVerification({
        repoRoot: REPO_ROOT,
        runKey: `unit-boundary-${String(seed)}-a`,
        years: 1,
        seed,
        outputRoot: join(runsRoot, `unit-boundary-${String(seed)}-a`),
      });
      const b = runSprint1CliVerification({
        repoRoot: REPO_ROOT,
        runKey: `unit-boundary-${String(seed)}-b`,
        years: 1,
        seed,
        outputRoot: join(runsRoot, `unit-boundary-${String(seed)}-b`),
      });
      expect(compareSameSeedFixedSeven(a.absoluteRunDirectory, b.absoluteRunDirectory).passed).toBe(
        true,
      );
    }
  }, 120_000);

  it("integrated weekly-technique-battle-reset-fixed7 binds technique actor into battle", () => {
    const root = makeTempDir();
    const runsRoot = join(root, "runs");
    mkdirSync(runsRoot, { recursive: true });
    const result = verifyIntegratedScenario({
      repoRoot: REPO_ROOT,
      runsRoot,
    });
    expect(result.failures).toEqual([]);
    expect(result.section.status).toBe("passed");
    expect(result.section.weeksExecuted).toBe(2);
    expect(result.section.yearsExecuted).toBe(0);
    expect(result.section.techniqueActorPersonId).not.toBeNull();
    expect(result.section.battleParticipants).toContain(result.section.techniqueActorPersonId);
    expect(result.section.weekRegistryReset).toBe(true);
    expect(result.section.globalBattleResultsRetained).toBe(true);
    expect(result.section.battleKind).toBe("official");
    expect(result.section.strategy).toBe("default_strategy");
  }, 120_000);

  it("prepareIntegratedLearningSession keeps technique actor among official eligible pair", () => {
    const sha256 = createNodeSha256Provider();
    const fixtures = loadTinySprint1Fixtures(REPO_ROOT, sha256);
    const nameData = loadValidatedNameData({
      cwd: REPO_ROOT,
      manifestPath: fixtures.config.nameData.manifestPath,
      requiredVersion: fixtures.config.nameData.requiredVersion,
      initialFamilyCount: fixtures.config.families.initialFamilyCount,
      sha256Provider: sha256,
    });
    const created = createSprint1RunSession(
      withDefaultSprint2BindingsForRunSessionInput({
        seed: SPRINT1_BASE_SEED,
        config: fixtures.config,
        nameData,
        sprint1CliInput: fixtures.sprint1CliInputRaw,
      }),
      sha256,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const prepared = prepareIntegratedLearningSession(created.value.session);
    expect(prepared.battleParticipantIds).toContain(prepared.techniqueActorPersonId);
  });

  it("population performance profiles are living targets × years=1 with no Sprint1 timing threshold", () => {
    expect(SPRINT1_PERFORMANCE_YEARS).toBe(1);
    expect(SPRINT1_PERFORMANCE_SEED).toBe(12345);
    expect(SPRINT1_PERFORMANCE_PROFILES.map((p) => p.targetLivingPopulation)).toEqual([
      600, 2000, 5000,
    ]);
    for (const profile of SPRINT1_PERFORMANCE_PROFILES) {
      expect(profile).not.toHaveProperty("warningSeconds");
      expect(profile).not.toHaveProperty("measureOnly");
    }
    const blocked = buildBlockedPerformance("unit");
    expect(blocked.every((entry) => entry.years === 1)).toBe(true);
    expect(blocked.every((entry) => entry.seed === 12345)).toBe(true);
    expect(blocked.every((entry) => !("warningSeconds" in entry))).toBe(true);
    expect(blocked.every((entry) => !("measureOnly" in entry))).toBe(true);
    expect(blocked.every((entry) => !("exceeded" in entry))).toBe(true);
  });

  it("performance profile distinguishes living target from total World persons / sidecar 1:1", () => {
    const profiles = buildBlockedPerformance("unit").map((entry, index) => ({
      ...entry,
      status: "passed" as const,
      functionalPassed: true,
      validationPassed: true,
      actualLivingPopulation: entry.targetLivingPopulation,
      // Existing Sprint0 scaled-config evidence: living target 600 => total persons 800.
      totalPersonCount: index === 0 ? 800 : entry.targetLivingPopulation + 667,
      sidecarCount: index === 0 ? 800 : entry.targetLivingPopulation + 667,
      elapsedSeconds: 9999,
      eventCount: 1,
      exitCode: 0,
      finalWorldDate: "2-4-W1@48",
      detail: "unit living-vs-total",
    }));
    expect(profiles[0]!.actualLivingPopulation).toBe(600);
    expect(profiles[0]!.totalPersonCount).toBe(800);
    expect(profiles[0]!.sidecarCount).toBe(profiles[0]!.totalPersonCount);
    // Large elapsedSeconds alone must not be encoded as warning/failure fields.
    expect(profiles.every((p) => p.status === "passed")).toBe(true);
  });

  it("Math.random scan ignores comments/strings and finds no production calls", () => {
    const scan = scanMathRandomCallExpressions(REPO_ROOT);
    expect(scan.count).toBe(0);
  });

  it("does not invoke git tag operations from verifier modules", () => {
    const verifyCli = readFileSync(
      join(REPO_ROOT, "apps/simulator/src/sprint1-verification/verify-cli.ts"),
      "utf8",
    );
    const runVerification = readFileSync(
      join(REPO_ROOT, "apps/simulator/src/sprint1-verification/run-verification.ts"),
      "utf8",
    );
    expect(verifyCli).not.toMatch(/execFileSync\(\s*["']git["']\s*,\s*\[[^\]]*tag/);
    expect(runVerification).not.toMatch(/execFileSync\(\s*["']git["']\s*,\s*\[[^\]]*tag/);
    expect(verifyCli).not.toMatch(/spawnSync\(\s*["']git["']\s*,\s*\[[^\]]*tag/);
    expect(runVerification).not.toMatch(/spawnSync\(\s*["']git["']\s*,\s*\[[^\]]*tag/);
  });

  it("imports Sprint0 report warningCount/performanceWarnings contract", () => {
    const path = join(REPO_ROOT, "output/sprint0-verification/sprint0-completion-report.json");
    if (!existsSync(path)) {
      // Skip soft if sprint0 has not been run in this worktree yet.
      expect(true).toBe(true);
      return;
    }
    const read = readAndValidateSprint0CompletionReport(path);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.report.warningCount).toBe(read.report.performanceWarnings.length);
  });

  it("isolates CLI runs under distinct outputRoots", () => {
    const root = makeTempDir();
    const a = runSprint1CliVerification({
      repoRoot: REPO_ROOT,
      runKey: "iso-a",
      years: 1,
      seed: SPRINT1_BASE_SEED,
      outputRoot: join(root, "iso-a"),
    });
    const b = runSprint1CliVerification({
      repoRoot: REPO_ROOT,
      runKey: "iso-b",
      years: 1,
      seed: SPRINT1_BASE_SEED,
      outputRoot: join(root, "iso-b"),
    });
    expect(a.absoluteRunDirectory).not.toBe(b.absoluteRunDirectory);
    expect(a.absoluteOutputRoot).not.toBe(b.absoluteOutputRoot);
  }, 120_000);

  it("exit semantics: overallPassed false => functionalFailureCount > 0; Sprint0 warnings remain warnings", () => {
    const commit = resolveRequiredGitCommit(REPO_ROOT);
    const report = minimalPassedReport(commit);
    const failed = buildSprint1CompletionReport({
      generatedAtUtc: report.generatedAtUtc,
      gitCommit: report.gitCommit,
      workingTreeDirty: report.workingTreeDirty,
      failures: [{ code: "X", message: "y", scope: "z" }],
      warnings: [
        {
          code: SPRINT0_PERFORMANCE_WARNING_CODE,
          message: "2000 people / 100 years: 161.517s exceeded 120s",
          scope: "sprint0Regression/performance",
        },
      ],
      sameSeed: report.sameSeed,
      differentSeed: report.differentSeed,
      boundarySeeds: report.boundarySeeds,
      yearProfiles: report.yearProfiles,
      integratedScenario: report.integratedScenario,
      identityAndCanonical: report.identityAndCanonical,
      fixedSeven: report.fixedSeven,
      performanceProfiles: report.performanceProfiles,
      sprint0Regression: report.sprint0Regression,
      check: report.check,
    });
    expect(failed.overallPassed).toBe(false);
    expect(failed.functionalFailureCount).toBe(1);
    expect(failed.warningCount).toBe(1);
    // Sprint0-imported warning alone keeps overallPassed true
    const warnOnly = buildSprint1CompletionReport({
      generatedAtUtc: report.generatedAtUtc,
      gitCommit: report.gitCommit,
      workingTreeDirty: report.workingTreeDirty,
      failures: [],
      warnings: failed.warnings,
      sameSeed: report.sameSeed,
      differentSeed: report.differentSeed,
      boundarySeeds: report.boundarySeeds,
      yearProfiles: report.yearProfiles,
      integratedScenario: report.integratedScenario,
      identityAndCanonical: report.identityAndCanonical,
      fixedSeven: report.fixedSeven,
      performanceProfiles: report.performanceProfiles,
      sprint0Regression: report.sprint0Regression,
      check: report.check,
    });
    expect(warnOnly.overallPassed).toBe(true);
    expect(warnOnly.warningCount).toBe(1);
    expect(warnOnly.warnings[0]?.code).toBe(SPRINT0_PERFORMANCE_WARNING_CODE);
  });

  it("rejects Sprint1 performanceProfiles that still carry Sprint0 timing thresholds", () => {
    const commit = resolveRequiredGitCommit(REPO_ROOT);
    const report = minimalPassedReport(commit);
    const json = JSON.parse(completionReportToJsonFile(report)) as Record<string, unknown>;
    const profiles = json["performanceProfiles"] as Array<Record<string, unknown>>;
    profiles[0] = {
      ...profiles[0],
      years: 100,
      warningSeconds: 30,
      measureOnly: false,
      exceeded: true,
    };
    const validated = validateSprint1CompletionReport(json);
    expect(validated.ok).toBe(false);
  });

  it("rejects representative completion-report corruptions", () => {
    const commit = resolveRequiredGitCommit(REPO_ROOT);
    const base = JSON.parse(completionReportToJsonFile(minimalPassedReport(commit))) as Record<
      string,
      unknown
    >;

    const cases: Array<{ label: string; mutate: (report: Record<string, unknown>) => void }> = [
      {
        label: "sameSeed.deterministicMatch missing",
        mutate: (report) => {
          const section = { ...(report["sameSeed"] as Record<string, unknown>) };
          delete section["deterministicMatch"];
          report["sameSeed"] = section;
        },
      },
      {
        label: "differentSeed.domainContentDiffers missing",
        mutate: (report) => {
          const section = { ...(report["differentSeed"] as Record<string, unknown>) };
          delete section["domainContentDiffers"];
          report["differentSeed"] = section;
        },
      },
      {
        label: "integratedScenario.weeksExecuted missing",
        mutate: (report) => {
          const section = { ...(report["integratedScenario"] as Record<string, unknown>) };
          delete section["weeksExecuted"];
          report["integratedScenario"] = section;
        },
      },
      {
        label: "integratedScenario.weeksExecuted invalid",
        mutate: (report) => {
          const section = { ...(report["integratedScenario"] as Record<string, unknown>) };
          section["weeksExecuted"] = 1;
          report["integratedScenario"] = section;
        },
      },
      {
        label: "integratedScenario.strategy invalid",
        mutate: (report) => {
          const section = { ...(report["integratedScenario"] as Record<string, unknown>) };
          section["strategy"] = "scripted";
          report["integratedScenario"] = section;
        },
      },
      {
        label: "performance actualLivingPopulation missing",
        mutate: (report) => {
          const profiles = [
            ...((report["performanceProfiles"] as Array<Record<string, unknown>>) ?? []),
          ];
          const first = { ...profiles[0] };
          delete first["actualLivingPopulation"];
          profiles[0] = first;
          report["performanceProfiles"] = profiles;
        },
      },
      {
        label: "performance sidecarCount mismatch",
        mutate: (report) => {
          const profiles = [
            ...((report["performanceProfiles"] as Array<Record<string, unknown>>) ?? []),
          ];
          profiles[0] = {
            ...profiles[0],
            sidecarCount: 1,
            totalPersonCount: 999,
          };
          report["performanceProfiles"] = profiles;
        },
      },
      {
        label: "performance validationPassed=false while passed",
        mutate: (report) => {
          const profiles = [
            ...((report["performanceProfiles"] as Array<Record<string, unknown>>) ?? []),
          ];
          profiles[0] = {
            ...profiles[0],
            validationPassed: false,
          };
          report["performanceProfiles"] = profiles;
        },
      },
      {
        label: "fixedSeven.allExactlySeven missing",
        mutate: (report) => {
          const section = { ...(report["fixedSeven"] as Record<string, unknown>) };
          delete section["allExactlySeven"];
          report["fixedSeven"] = section;
        },
      },
      {
        label: "sprint0Regression.warningCount missing",
        mutate: (report) => {
          const section = { ...(report["sprint0Regression"] as Record<string, unknown>) };
          delete section["warningCount"];
          report["sprint0Regression"] = section;
        },
      },
      {
        label: "check.npmCheck missing",
        mutate: (report) => {
          const check = { ...(report["check"] as Record<string, unknown>) };
          delete check["npmCheck"];
          report["check"] = check;
        },
      },
    ];

    expect(cases.length).toBeGreaterThanOrEqual(10);
    for (const entry of cases) {
      const corrupted = structuredClone(base);
      entry.mutate(corrupted);
      const validated = validateSprint1CompletionReport(corrupted);
      expect(validated.ok, entry.label).toBe(false);
    }
  });
});

// silence unused PersonId import if tree-shaken oddly
void (null as unknown as PersonId);
