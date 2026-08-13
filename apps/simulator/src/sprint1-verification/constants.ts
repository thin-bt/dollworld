/** Fixed seeds and matrix constants for Sprint 1 verification (S01-009). */

export const SPRINT1_BASE_SEED = 12345 as const;
export const SPRINT1_ALTERNATE_SEED = 54321 as const;
export const SPRINT1_BOUNDARY_SEEDS = [0, 4294967295] as const;

export const SPRINT1_SAME_SEED_YEARS = 100 as const;
export const SPRINT1_DIFFERENT_SEED_YEARS = 100 as const;
export const SPRINT1_BOUNDARY_YEARS = 1 as const;
export const SPRINT1_YEAR_PROFILES = [10, 50, 100, 300] as const;
export type Sprint1YearProfile = (typeof SPRINT1_YEAR_PROFILES)[number];

/** Sprint 1 population performance baseline measurement years (not Sprint 0's 100y). */
export const SPRINT1_PERFORMANCE_YEARS = 1 as const;
export const SPRINT1_PERFORMANCE_SEED = SPRINT1_BASE_SEED;

/**
 * Target living populations for Sprint 1 population performance.
 * These are living-population targets, not WorldState.persons.length
 * (deceased ancestors remain World Persons under Sprint 0 scaled-config rules).
 */
export const SPRINT1_PERFORMANCE_PROFILES = [
  { targetLivingPopulation: 600 },
  { targetLivingPopulation: 2000 },
  { targetLivingPopulation: 5000 },
] as const;

export const SPRINT1_COMPLETION_REPORT_SCHEMA_VERSION = "0.1.0" as const;
export const SPRINT1_COMPLETION_REPORT_FILE_NAME = "sprint1-completion-report.json" as const;
export const SPRINT1_SPEC_VERSION = "S1-SPEC-0.1.21" as const;
export const SPRINT1_VERIFICATION_SPRINT = "sprint1" as const;

export const SPRINT1_FIXTURE_CONFIG_RELATIVE =
  "apps/simulator/fixtures/sprint1/tiny-initial-world.config.json" as const;
export const SPRINT1_FIXTURE_INPUT_RELATIVE =
  "apps/simulator/fixtures/sprint1/sprint1-input.json" as const;

export const SPRINT1_VERIFICATION_OUTPUT_DIR = "output/sprint1-verification" as const;
export const SPRINT1_VERIFICATION_RUNS_DIR = "output/sprint1-verification/runs" as const;

export const SPRINT0_COMPLETION_REPORT_RELATIVE =
  "output/sprint0-verification/sprint0-completion-report.json" as const;

export const SPRINT0_PERFORMANCE_WARNING_CODE = "SPRINT0_PERFORMANCE_WARNING" as const;
