/** Fixed output file names per 05 mini-spec. Order is the metadata listing order. */
export const FIXED_OUTPUT_FILE_NAMES = [
  "run-metadata.json",
  "initial-world.json",
  "final-world.json",
  "yearly-statistics.csv",
  "events.jsonl",
  "validation-report.json",
  "performance.json",
] as const;

export type FixedOutputFileName = (typeof FIXED_OUTPUT_FILE_NAMES)[number];

export const FIXED_OUTPUT_FILE_COUNT = FIXED_OUTPUT_FILE_NAMES.length;

/** Technical decision version from docs/TECHNICAL_DECISIONS.md (TECH-0.1.4). */
export const TECHNICAL_DECISION_VERSION = "TECH-0.1.4" as const;
