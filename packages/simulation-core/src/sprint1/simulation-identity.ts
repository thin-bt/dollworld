/**
 * Sprint 1 SimulationIdentity validation, hashing, and simulationId derivation
 * (02 mini-spec §12 / 14 mini-spec §1.2). Does not touch the Sprint 0
 * `initial-world/simulation-id.ts` legacy factory; Sprint 0 runs keep their own
 * `simulationId` unchanged.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asSimulationId } from "../ids.js";
import type { SimulationId } from "../ids.js";
import { RNG_ALGORITHM_VERSION } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  BATTLE_PROFILE_ADAPTER_VERSION,
  CANONICAL_JSON_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  EXPECTED_SPEC_VERSIONS,
  HASH_ALGORITHM,
  MATCH_ID_GENERATOR_VERSION,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
} from "./constants.js";
import {
  SHA256_HEX_PATTERN,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireInteger,
  requireLiteralString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import type { SimulationIdentity, SpecVersionEntry } from "./types.js";

const UINT32_MAX = 4294967295;

const ROOT_KEYS = [
  "schemaVersion",
  "seed",
  "initialWorldConfigHash",
  "sprint1ConfigHash",
  "techniqueCatalogHash",
  "initialWeeklyTrainingSidecarHash",
  "battleProfileAdapterVersion",
  "matchIdGeneratorVersion",
  "initialMatchIdGeneratorStateHash",
  "defaultBattleStrategyVersion",
  "specVersions",
  "rngAlgorithmVersion",
  "canonicalJsonVersion",
  "hashAlgorithm",
] as const;

const SPEC_VERSION_ENTRY_KEYS = ["specSetId", "version"] as const;

const EXPECTED_SPEC_SET_IDS = EXPECTED_SPEC_VERSIONS.map((entry) => entry.specSetId);

/** A frozen, independently-owned copy of the fixed specSetId-ascending registry. */
export function createExpectedSpecVersions(): readonly SpecVersionEntry[] {
  return deepFreezePlainJson(cloneValidatedPlainJson(EXPECTED_SPEC_VERSIONS as SpecVersionEntry[]));
}

function beginPlainObject(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ValidationIssue[],
): Record<string, unknown> | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  rejectUnknownKeys(object, keys, path, issues);
  return object;
}

function requireHashHex(
  object: Record<string, unknown>,
  key: string,
  parentPath: string,
  issues: ValidationIssue[],
): string | undefined {
  const path = parentPath === "" ? `/${key}` : `${parentPath}/${key}`;
  if (!hasOwn(object, key)) {
    issues.push({ path, message: "required key is missing", expected: "64 lowercase hex chars" });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    issues.push({
      path,
      message: "value must be a 64 lowercase hex character SHA-256 digest",
      actual: value,
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  return value;
}

function parseSpecVersionEntry(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): { specSetId: string; version: string } | undefined {
  const object = beginPlainObject(value, path, SPEC_VERSION_ENTRY_KEYS, issues);
  if (object === undefined) {
    return undefined;
  }

  if (!hasOwn(object, "specSetId") || typeof object["specSetId"] !== "string") {
    issues.push({
      path: `${path}/specSetId`,
      message: "required key is missing or not a string",
      expected: "string specSetId",
    });
    return undefined;
  }
  if (!hasOwn(object, "version") || typeof object["version"] !== "string") {
    issues.push({
      path: `${path}/version`,
      message: "required key is missing or not a string",
      expected: "string version",
    });
    return undefined;
  }

  return { specSetId: object["specSetId"], version: object["version"] };
}

/**
 * Accept any order of the required registry entries; reject duplicates, unknown
 * ids, missing entries, and version mismatches. Success value is always
 * canonical `main, sprint0, sprint1` order.
 */
function parseSpecVersions(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): readonly SpecVersionEntry[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues, EXPECTED_SPEC_VERSIONS.length);
  if (items === undefined) {
    return undefined;
  }

  const parsed: { specSetId: string; version: string }[] = [];
  let ok = true;
  for (let index = 0; index < items.length; index += 1) {
    const entry = parseSpecVersionEntry(items[index], `${path}/${String(index)}`, issues);
    if (entry === undefined) {
      ok = false;
      continue;
    }
    parsed.push(entry);
  }
  if (!ok) {
    return undefined;
  }

  const byId = new Map<string, { specSetId: string; version: string }>();
  for (let index = 0; index < parsed.length; index += 1) {
    const entry = parsed[index]!;
    if (byId.has(entry.specSetId)) {
      issues.push({
        path: `${path}/${String(index)}/specSetId`,
        message: "duplicate specSetId is not allowed",
        actual: entry.specSetId,
        expected: "unique specSetId values",
      });
      ok = false;
      continue;
    }
    if (!(EXPECTED_SPEC_SET_IDS as readonly string[]).includes(entry.specSetId)) {
      issues.push({
        path: `${path}/${String(index)}/specSetId`,
        message: "unknown specSetId is not allowed",
        actual: entry.specSetId,
        expected: EXPECTED_SPEC_SET_IDS.join(" | "),
      });
      ok = false;
      continue;
    }
    byId.set(entry.specSetId, entry);
  }

  const normalized: SpecVersionEntry[] = [];
  for (const expected of EXPECTED_SPEC_VERSIONS) {
    const found = byId.get(expected.specSetId);
    if (found === undefined) {
      issues.push({
        path,
        message: `required specSetId "${expected.specSetId}" is missing`,
        expected: expected.specSetId,
      });
      ok = false;
      continue;
    }
    if (found.version !== expected.version) {
      issues.push({
        path,
        message: `specSetId "${expected.specSetId}" version must equal the fixed registry version`,
        actual: found.version,
        expected: expected.version,
      });
      ok = false;
      continue;
    }
    normalized.push({ specSetId: expected.specSetId, version: expected.version });
  }

  return ok ? normalized : undefined;
}

export function validateSimulationIdentity(input: unknown): ValidationResult<SimulationIdentity> {
  const issues: ValidationIssue[] = [];

  const object = beginPlainObject(input, "", ROOT_KEYS, issues);
  if (object === undefined) {
    return failure(issues);
  }

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    SIMULATION_IDENTITY_SCHEMA_VERSION,
    issues,
  );
  const seed = requireInteger(object, "seed", "", issues);
  if (seed !== undefined && (seed < 0 || seed > UINT32_MAX)) {
    issues.push({
      path: "/seed",
      message: "seed must be an integer in 0..4294967295",
      actual: seed,
      expected: "0..4294967295",
    });
  }
  const initialWorldConfigHash = requireHashHex(object, "initialWorldConfigHash", "", issues);
  const sprint1ConfigHash = requireHashHex(object, "sprint1ConfigHash", "", issues);
  const techniqueCatalogHash = requireHashHex(object, "techniqueCatalogHash", "", issues);
  const initialWeeklyTrainingSidecarHash = requireHashHex(
    object,
    "initialWeeklyTrainingSidecarHash",
    "",
    issues,
  );
  const battleProfileAdapterVersion = requireLiteralString(
    object,
    "battleProfileAdapterVersion",
    "",
    BATTLE_PROFILE_ADAPTER_VERSION,
    issues,
  );
  const matchIdGeneratorVersion = requireLiteralString(
    object,
    "matchIdGeneratorVersion",
    "",
    MATCH_ID_GENERATOR_VERSION,
    issues,
  );
  const initialMatchIdGeneratorStateHash = requireHashHex(
    object,
    "initialMatchIdGeneratorStateHash",
    "",
    issues,
  );
  const defaultBattleStrategyVersion = requireLiteralString(
    object,
    "defaultBattleStrategyVersion",
    "",
    DEFAULT_BATTLE_STRATEGY_VERSION,
    issues,
  );
  const specVersions = parseSpecVersions(object["specVersions"], "/specVersions", issues);
  const rngAlgorithmVersion = requireLiteralString(
    object,
    "rngAlgorithmVersion",
    "",
    RNG_ALGORITHM_VERSION,
    issues,
  );
  const canonicalJsonVersion = requireLiteralString(
    object,
    "canonicalJsonVersion",
    "",
    CANONICAL_JSON_VERSION,
    issues,
  );
  const hashAlgorithm = requireLiteralString(object, "hashAlgorithm", "", HASH_ALGORITHM, issues);

  if (
    schemaVersion === undefined ||
    seed === undefined ||
    initialWorldConfigHash === undefined ||
    sprint1ConfigHash === undefined ||
    techniqueCatalogHash === undefined ||
    initialWeeklyTrainingSidecarHash === undefined ||
    battleProfileAdapterVersion === undefined ||
    matchIdGeneratorVersion === undefined ||
    initialMatchIdGeneratorStateHash === undefined ||
    defaultBattleStrategyVersion === undefined ||
    specVersions === undefined ||
    rngAlgorithmVersion === undefined ||
    canonicalJsonVersion === undefined ||
    hashAlgorithm === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const value: SimulationIdentity = {
    schemaVersion,
    seed,
    initialWorldConfigHash,
    sprint1ConfigHash,
    techniqueCatalogHash,
    initialWeeklyTrainingSidecarHash,
    battleProfileAdapterVersion,
    matchIdGeneratorVersion,
    initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion,
    specVersions,
    rngAlgorithmVersion,
    canonicalJsonVersion,
    hashAlgorithm,
  };

  return success(deepFreezePlainJson(value));
}

/**
 * Validate unknown input, then SHA-256 the canonical JSON of the frozen identity.
 * Invalid input never calls `provider`.
 */
export function computeSimulationIdentityHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateSimulationIdentity(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return safeHashUtf8(provider, toCanonicalJson(validated.value), "");
}

/**
 * `simulationId = existingSimulationIdFactory(simulationIdentityHash)` per 02 §12.
 * Does not re-hash; `identityHash` must already be the SimulationIdentity's SHA-256 digest.
 */
export function createSimulationIdFromIdentityHash(identityHash: string): SimulationId {
  if (!SHA256_HEX_PATTERN.test(identityHash)) {
    throw new Error(`SimulationIdentity hash must be 64 lowercase hex chars (got ${identityHash})`);
  }
  return asSimulationId(`simulation_${identityHash.slice(0, 16)}`);
}

/**
 * Validate unknown identity input, hash it, then derive simulationId.
 * Invalid input never calls `provider`.
 */
export function createSimulationIdFromIdentity(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<SimulationId> {
  const hashResult = computeSimulationIdentityHash(input, provider);
  if (!hashResult.ok) {
    return failure(hashResult.issues);
  }
  return success(createSimulationIdFromIdentityHash(hashResult.value));
}
