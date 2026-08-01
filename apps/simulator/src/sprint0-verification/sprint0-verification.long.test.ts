import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SPRINT0_COMPLETION_REPORT_FILE_NAME } from "./constants.js";
import {
  cleanupSprint0WorkRoot,
  runSprint0Verification,
  type Sprint0VerificationSuiteResult,
} from "./run-verification.js";

const REPO_ROOT = join(import.meta.dirname, "../../../..");

/**
 * Optional Vitest wrapper around the same Sprint 0 suite used by the CLI.
 * Excluded from default `vitest run` (see vitest.config.ts).
 * `npm run verify:sprint0` executes the CLI entry (`verify-sprint0-main.js`),
 * which calls `runSprint0Verification` directly — it does not invoke this file.
 * Run explicitly with: `npx vitest run apps/simulator/src/sprint0-verification/sprint0-verification.long.test.ts`
 */
describe("sprint0 long-horizon verification", () => {
  let suite: Sprint0VerificationSuiteResult;
  let workRoot: string;

  beforeAll(() => {
    workRoot = mkdtempSync(join(tmpdir(), "dollworld-sprint0-long-"));
    suite = runSprint0Verification({ repoRoot: REPO_ROOT, workRoot });
  }, 3_600_000);

  afterAll(() => {
    if (workRoot !== undefined) {
      cleanupSprint0WorkRoot(workRoot);
    }
  });

  it("passes overall Sprint 0 completion", () => {
    expect(suite.report.overallPassed).toBe(true);
    expect(suite.report.functionalFailureCount).toBe(0);
    expect(suite.reportPath).toContain(SPRINT0_COMPLETION_REPORT_FILE_NAME);
    const text = readFileSync(suite.reportPath, "utf8");
    expect(text.endsWith("\n")).toBe(true);
    expect(JSON.parse(text).schemaVersion).toBe(suite.report.schemaVersion);
  });

  it("validates 10/50/100/300 year calendars and CSV rows", () => {
    const expected = [
      { years: 10, weeks: 480, rows: 10, absoluteWeek: 480 },
      { years: 50, weeks: 2400, rows: 50, absoluteWeek: 2400 },
      { years: 100, weeks: 4800, rows: 100, absoluteWeek: 4800 },
      { years: 300, weeks: 14400, rows: 300, absoluteWeek: 14400 },
    ];
    for (const row of expected) {
      const profile = suite.report.yearProfiles.find((p) => p.years === row.years);
      expect(profile).toBeDefined();
      expect(profile!.weeksExecuted).toBe(row.weeks);
      expect(profile!.csvRows).toBe(row.rows);
      expect(profile!.finalWorldDate).toEqual({
        year: row.years + 1,
        month: 4,
        weekOfMonth: 1,
        absoluteWeek: row.absoluteWeek,
      });
      expect(profile!.invariantsPassed).toBe(true);
      expect(profile!.sevenFilesPassed).toBe(true);
      expect(profile!.finalYearStatistics.births).toEqual({ available: false });
      expect(profile!.finalYearStatistics.deaths).toEqual({ available: false });
      expect(profile!.finalYearStatistics.livingCount).toBe(profile!.livingCount);
      expect(profile!.averageMillisecondsPerYear).toBeGreaterThan(0);
      expect(profile!.maxRssKilobytes).toBeNull();
      expect(profile!.maxRssMeasurementScope).toBe("not_measured_per_run");
    }
  });

  it("records 600/2000 warning bands and 5000 measure-only from isolated workers", () => {
    const p600 = suite.report.populationProfiles.find((p) => p.population === 600);
    const p2000 = suite.report.populationProfiles.find((p) => p.population === 2000);
    const p5000 = suite.report.populationProfiles.find((p) => p.population === 5000);
    expect(p600?.livingCount).toBe(600);
    expect(p600?.measureOnly).toBe(false);
    expect(p600?.warningSeconds).toBe(30);
    expect(p600?.averageMillisecondsPerYear).toBeGreaterThan(0);
    expect(p2000?.livingCount).toBe(2000);
    expect(p2000?.measureOnly).toBe(false);
    expect(p2000?.warningSeconds).toBe(120);
    expect(p5000?.livingCount).toBe(5000);
    expect(p5000?.measureOnly).toBe(true);
    expect(p5000?.warningSeconds).toBeNull();
    expect(suite.report.warningCount).toBe(suite.report.performanceWarnings.length);
  });

  it("keeps same-seed, different-seed, and boundary determinism results", () => {
    expect(suite.report.sameSeedComparison.status).toBe("passed");
    expect(suite.report.sameSeedComparison.runs).toHaveLength(2);
    for (const run of suite.report.sameSeedComparison.runs) {
      expect(run.invariantsPassed).toBe(true);
      expect(run.validationPassed).toBe(true);
      expect(run.terminationPassed).toBe(true);
      expect(run.sevenFilesPassed).toBe(true);
    }
    expect(suite.report.differentSeedComparison.status).toBe("passed");
    expect(suite.report.boundarySeedDeterminism.status).toBe("passed");
    expect(suite.report.boundarySeedDeterminism.results).toHaveLength(2);
    for (const boundary of suite.report.boundarySeedDeterminism.results) {
      expect(boundary.determinismStatus).toBe("passed");
      expect(boundary.runs).toHaveLength(2);
      for (const run of boundary.runs) {
        expect(run.invariantsPassed).toBe(true);
        expect(run.validationPassed).toBe(true);
        expect(run.terminationPassed).toBe(true);
        expect(run.sevenFilesPassed).toBe(true);
      }
    }
    expect(suite.report.workingTreeDirty).toBe(false);
    expect(suite.report.invariants.status).toBe("passed");
    expect(suite.report.notPerformed.length).toBeGreaterThan(0);
    expect(
      suite.report.notPerformed.every((item) => !item.toLowerCase().includes("passed as success")),
    ).toBe(true);
    expect(
      suite.report.notPerformed.some((item) =>
        item.includes("boundary-seed long-horizon performance"),
      ),
    ).toBe(true);
  });
});
