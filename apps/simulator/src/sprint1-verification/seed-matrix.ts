import { join } from "node:path";
import { compareDifferentSeedFixedSeven, compareSameSeedFixedSeven } from "./compare-fixed7.js";
import {
  SPRINT1_ALTERNATE_SEED,
  SPRINT1_BASE_SEED,
  SPRINT1_BOUNDARY_SEEDS,
  SPRINT1_BOUNDARY_YEARS,
  SPRINT1_DIFFERENT_SEED_YEARS,
  SPRINT1_SAME_SEED_YEARS,
  SPRINT1_YEAR_PROFILES,
} from "./constants.js";
import { runSprint1CliVerification, type Sprint1CliRunResult } from "./run-sprint1-cli.js";
import type {
  BoundarySeedSection,
  DifferentSeedSection,
  SameSeedSection,
  VerificationIssue,
  YearProfileSection,
} from "./types.js";

export type SeedMatrixResult = {
  sameSeed: SameSeedSection;
  differentSeed: DifferentSeedSection;
  boundarySeeds: BoundarySeedSection[];
  yearProfiles: YearProfileSection[];
  /** Reusable same-seed A run for year profile 100 / different-seed base. */
  sameSeedRunA: Sprint1CliRunResult;
  failures: VerificationIssue[];
};

function pushFailure(
  failures: VerificationIssue[],
  code: string,
  message: string,
  scope: string,
): void {
  failures.push({ code, message, scope });
}

/**
 * Same-seed / different-seed / boundary / year-profile matrix.
 * Reuses same-seed A for yearProfiles[100] and different-seed base.
 */
export function verifySeedAndYearMatrix(input: {
  repoRoot: string;
  runsRoot: string;
}): SeedMatrixResult {
  const failures: VerificationIssue[] = [];

  const sameSeedRunA = runSprint1CliVerification({
    repoRoot: input.repoRoot,
    runKey: "same-seed-a",
    years: SPRINT1_SAME_SEED_YEARS,
    seed: SPRINT1_BASE_SEED,
    outputRoot: join(input.runsRoot, "same-seed-a"),
  });
  const sameSeedRunB = runSprint1CliVerification({
    repoRoot: input.repoRoot,
    runKey: "same-seed-b",
    years: SPRINT1_SAME_SEED_YEARS,
    seed: SPRINT1_BASE_SEED,
    outputRoot: join(input.runsRoot, "same-seed-b"),
  });

  if (sameSeedRunA.weeksExecuted !== SPRINT1_SAME_SEED_YEARS * 48) {
    pushFailure(
      failures,
      "SPRINT1_SAME_SEED_WEEKS",
      `same-seed A weeksExecuted=${String(sameSeedRunA.weeksExecuted)} expected ${String(SPRINT1_SAME_SEED_YEARS * 48)}`,
      "sameSeed",
    );
  }
  if (sameSeedRunA.csvDataRows !== SPRINT1_SAME_SEED_YEARS) {
    pushFailure(
      failures,
      "SPRINT1_SAME_SEED_CSV",
      `same-seed A csv rows=${String(sameSeedRunA.csvDataRows)} expected ${String(SPRINT1_SAME_SEED_YEARS)}`,
      "sameSeed",
    );
  }
  if (sameSeedRunA.finalWorldYear !== SPRINT1_SAME_SEED_YEARS + 1) {
    pushFailure(
      failures,
      "SPRINT1_SAME_SEED_FINAL_DATE",
      `same-seed A final year=${String(sameSeedRunA.finalWorldYear)} expected ${String(SPRINT1_SAME_SEED_YEARS + 1)}`,
      "sameSeed",
    );
  }

  const sameCompare = compareSameSeedFixedSeven(
    sameSeedRunA.absoluteRunDirectory,
    sameSeedRunB.absoluteRunDirectory,
  );
  if (!sameCompare.passed) {
    pushFailure(
      failures,
      "SPRINT1_SAME_SEED_MISMATCH",
      sameCompare.differences.join("; "),
      "sameSeed",
    );
  }

  const sameSeed: SameSeedSection = {
    status:
      sameCompare.passed && failures.every((f) => f.scope !== "sameSeed") ? "passed" : "failed",
    seed: SPRINT1_BASE_SEED,
    years: SPRINT1_SAME_SEED_YEARS,
    runA: sameSeedRunA.artifact,
    runB: sameSeedRunB.artifact,
    deterministicMatch: sameCompare.passed,
    detail: sameCompare.passed
      ? "same-seed 100y×2 deterministic match"
      : sameCompare.differences.join("; "),
  };

  const altRun = runSprint1CliVerification({
    repoRoot: input.repoRoot,
    runKey: "different-seed-alt",
    years: SPRINT1_DIFFERENT_SEED_YEARS,
    seed: SPRINT1_ALTERNATE_SEED,
    outputRoot: join(input.runsRoot, "different-seed-alt"),
  });
  const differentCompare = compareDifferentSeedFixedSeven(
    sameSeedRunA.absoluteRunDirectory,
    altRun.absoluteRunDirectory,
  );
  if (!differentCompare.passed) {
    pushFailure(
      failures,
      "SPRINT1_DIFFERENT_SEED_INSUFFICIENT",
      differentCompare.detail,
      "differentSeed",
    );
  }
  const differentSeed: DifferentSeedSection = {
    status: differentCompare.passed ? "passed" : "failed",
    baseSeed: SPRINT1_BASE_SEED,
    alternateSeed: SPRINT1_ALTERNATE_SEED,
    years: SPRINT1_DIFFERENT_SEED_YEARS,
    baseRun: sameSeedRunA.artifact,
    alternateRun: altRun.artifact,
    simulationIdsDiffer: differentCompare.simulationIdsDiffer,
    seedsDiffer: differentCompare.seedsDiffer,
    domainContentDiffers: differentCompare.domainContentDiffers,
    detail: differentCompare.detail,
  };

  const boundarySeeds: BoundarySeedSection[] = [];
  for (const seed of SPRINT1_BOUNDARY_SEEDS) {
    const runA = runSprint1CliVerification({
      repoRoot: input.repoRoot,
      runKey: `boundary-${String(seed)}-a`,
      years: SPRINT1_BOUNDARY_YEARS,
      seed,
      outputRoot: join(input.runsRoot, `boundary-${String(seed)}-a`),
    });
    const runB = runSprint1CliVerification({
      repoRoot: input.repoRoot,
      runKey: `boundary-${String(seed)}-b`,
      years: SPRINT1_BOUNDARY_YEARS,
      seed,
      outputRoot: join(input.runsRoot, `boundary-${String(seed)}-b`),
    });
    const compare = compareSameSeedFixedSeven(runA.absoluteRunDirectory, runB.absoluteRunDirectory);
    if (!compare.passed) {
      pushFailure(
        failures,
        "SPRINT1_BOUNDARY_SEED_MISMATCH",
        `seed=${String(seed)}: ${compare.differences.join("; ")}`,
        `boundarySeeds/${String(seed)}`,
      );
    }
    boundarySeeds.push({
      seed,
      status: compare.passed ? "passed" : "failed",
      years: SPRINT1_BOUNDARY_YEARS,
      deterministicMatch: compare.passed,
      runA: runA.artifact,
      runB: runB.artifact,
      longHorizonPerformance: "not_performed",
      detail: compare.passed
        ? `boundary seed ${String(seed)} 1y×2 match`
        : compare.differences.join("; "),
    });
  }

  const yearProfiles: YearProfileSection[] = [];
  for (const years of SPRINT1_YEAR_PROFILES) {
    let run: Sprint1CliRunResult;
    if (years === 100) {
      run = sameSeedRunA;
    } else {
      run = runSprint1CliVerification({
        repoRoot: input.repoRoot,
        runKey: `year-${String(years)}`,
        years,
        seed: SPRINT1_BASE_SEED,
        outputRoot: join(input.runsRoot, `year-${String(years)}`),
      });
    }
    const weeksOk = run.weeksExecuted === years * 48;
    const csvOk = run.csvDataRows === years;
    const dateOk = run.finalWorldYear === years + 1;
    const passed = weeksOk && csvOk && dateOk && run.validationOverallPassed;
    if (!passed) {
      pushFailure(
        failures,
        "SPRINT1_YEAR_PROFILE_FAILED",
        `years=${String(years)} weeksOk=${String(weeksOk)} csvOk=${String(csvOk)} dateOk=${String(dateOk)}`,
        `yearProfiles/${String(years)}`,
      );
    }
    yearProfiles.push({
      years,
      status: passed ? "passed" : "failed",
      weeksExecuted: run.weeksExecuted,
      csvDataRows: run.csvDataRows,
      finalWorldYear: run.finalWorldYear,
      sevenFilesPassed: true,
      validationPassed: run.validationOverallPassed,
      run: run.artifact,
      maxRssMeasurement: "not_performed",
      detail: passed
        ? `year profile ${String(years)} passed`
        : `years=${String(years)} functional checks failed`,
    });
  }

  // Recompute sameSeed status including earlier sameSeed-scoped failures.
  if (failures.some((f) => f.scope === "sameSeed" || f.scope.startsWith("sameSeed/"))) {
    sameSeed.status = "failed";
  }

  return {
    sameSeed,
    differentSeed,
    boundarySeeds,
    yearProfiles,
    sameSeedRunA,
    failures,
  };
}
