/** Fixed seeds for Sprint 0 verification (S00-010). */
export const SPRINT0_PRIMARY_SEED = 12345 as const;
export const SPRINT0_ALTERNATE_SEED = 99999 as const;
export const SPRINT0_BOUNDARY_SEEDS = [0, 4294967295] as const;

export const SPRINT0_BENCHMARK_YEARS = [10, 50, 100, 300] as const;
export type Sprint0BenchmarkYear = (typeof SPRINT0_BENCHMARK_YEARS)[number];

export const SPRINT0_PERFORMANCE_POPULATIONS = [600, 2000, 5000] as const;
export type Sprint0PerformancePopulation = (typeof SPRINT0_PERFORMANCE_POPULATIONS)[number];

export const SPRINT0_COMPLETION_REPORT_SCHEMA_VERSION = "sprint0-completion-0.1.0" as const;
export const SPRINT0_COMPLETION_REPORT_FILE_NAME = "sprint0-completion-report.json" as const;
