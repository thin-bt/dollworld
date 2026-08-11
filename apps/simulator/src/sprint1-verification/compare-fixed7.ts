import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toCanonicalJson } from "@shared-world/simulation-core";
import { FIXED_OUTPUT_FILE_NAMES } from "../output/fixed-files.js";

const DETERMINISTIC_TEXT_FILES = [
  "initial-world.json",
  "final-world.json",
  "events.jsonl",
  "yearly-statistics.csv",
  "validation-report.json",
] as const satisfies ReadonlyArray<(typeof FIXED_OUTPUT_FILE_NAMES)[number]>;

/** Exact non-deterministic run-metadata fields excluded by 05 / S01-009 clarifier. */
const RUN_METADATA_EXCLUDED_KEYS = ["runId", "realStartedAt", "realEndedAt"] as const;

export type SameSeedCompareResult = {
  passed: boolean;
  differences: string[];
};

function readUtf8(runDirectory: string, name: string): string {
  return readFileSync(join(runDirectory, name), "utf8");
}

function omitRunMetadataNonDeterministic(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...metadata };
  for (const key of RUN_METADATA_EXCLUDED_KEYS) {
    delete clone[key];
  }
  return clone;
}

/**
 * Same-seed deterministic compare using production toCanonicalJson for run-metadata.
 */
export function compareSameSeedFixedSeven(
  runDirectoryA: string,
  runDirectoryB: string,
): SameSeedCompareResult {
  const differences: string[] = [];

  for (const name of DETERMINISTIC_TEXT_FILES) {
    const a = readUtf8(runDirectoryA, name);
    const b = readUtf8(runDirectoryB, name);
    if (a !== b) {
      differences.push(`${name}: UTF-8 text mismatch`);
    }
  }

  const metaA = JSON.parse(readUtf8(runDirectoryA, "run-metadata.json")) as Record<string, unknown>;
  const metaB = JSON.parse(readUtf8(runDirectoryB, "run-metadata.json")) as Record<string, unknown>;
  const canonicalA = toCanonicalJson(omitRunMetadataNonDeterministic(metaA));
  const canonicalB = toCanonicalJson(omitRunMetadataNonDeterministic(metaB));
  if (canonicalA !== canonicalB) {
    differences.push(
      "run-metadata.json: canonical mismatch after excluding runId/realStartedAt/realEndedAt",
    );
  }

  return { passed: differences.length === 0, differences };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Strip identity-only fields from a world document for domain comparison. */
function domainPayloadFromWorld(world: Record<string, unknown>, includeSidecars: boolean): unknown {
  const persons = Array.isArray(world["persons"]) ? world["persons"] : [];
  const families = Array.isArray(world["families"]) ? world["families"] : [];
  const lineages = Array.isArray(world["lineages"]) ? world["lineages"] : [];
  const relationships = Array.isArray(world["relationships"]) ? world["relationships"] : [];
  const generationSummary = world["generationSummary"];

  const stripPerson = (person: unknown): unknown => {
    if (!isPlainObject(person)) return person;
    const { personId: _personId, simulationId: _simulationId, worldId: _worldId, ...rest } = person;
    void _personId;
    void _simulationId;
    void _worldId;
    return rest;
  };

  const payload: Record<string, unknown> = {
    persons: persons.map(stripPerson),
    families,
    lineages,
    relationships,
    generationSummary,
  };
  if (includeSidecars && world["weeklyTrainingSidecars"] !== undefined) {
    payload["weeklyTrainingSidecars"] = world["weeklyTrainingSidecars"];
  }
  return payload;
}

export type DifferentSeedCompareResult = {
  passed: boolean;
  simulationIdsDiffer: boolean;
  seedsDiffer: boolean;
  domainContentDiffers: boolean;
  detail: string;
};

/**
 * Different-seed must show real world domain differences, not only identity metadata.
 */
export function compareDifferentSeedFixedSeven(
  runDirectoryA: string,
  runDirectoryB: string,
): DifferentSeedCompareResult {
  const metaA = JSON.parse(readUtf8(runDirectoryA, "run-metadata.json")) as Record<string, unknown>;
  const metaB = JSON.parse(readUtf8(runDirectoryB, "run-metadata.json")) as Record<string, unknown>;
  const simulationIdsDiffer = metaA["simulationId"] !== metaB["simulationId"];
  const seedsDiffer = metaA["seed"] !== metaB["seed"];

  const initialA = JSON.parse(readUtf8(runDirectoryA, "initial-world.json")) as Record<
    string,
    unknown
  >;
  const initialB = JSON.parse(readUtf8(runDirectoryB, "initial-world.json")) as Record<
    string,
    unknown
  >;
  const finalA = JSON.parse(readUtf8(runDirectoryA, "final-world.json")) as Record<string, unknown>;
  const finalB = JSON.parse(readUtf8(runDirectoryB, "final-world.json")) as Record<string, unknown>;

  const initialDomainDiffers =
    toCanonicalJson(domainPayloadFromWorld(initialA, false)) !==
    toCanonicalJson(domainPayloadFromWorld(initialB, false));
  const finalDomainDiffers =
    toCanonicalJson(domainPayloadFromWorld(finalA, true)) !==
    toCanonicalJson(domainPayloadFromWorld(finalB, true));
  const domainContentDiffers = initialDomainDiffers || finalDomainDiffers;

  const passed = simulationIdsDiffer && seedsDiffer && domainContentDiffers;
  const detail = passed
    ? `domain differs (initial=${String(initialDomainDiffers)}, final=${String(finalDomainDiffers)})`
    : `insufficient difference: simulationIdsDiffer=${String(simulationIdsDiffer)} seedsDiffer=${String(seedsDiffer)} domainContentDiffers=${String(domainContentDiffers)}`;

  return {
    passed,
    simulationIdsDiffer,
    seedsDiffer,
    domainContentDiffers,
    detail,
  };
}
