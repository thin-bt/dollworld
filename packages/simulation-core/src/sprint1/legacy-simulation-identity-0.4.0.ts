/**
 * Read-only legacy SimulationIdentity 0.4.0 validator (pre-CAL-JAN / sprint1-complete).
 * Does NOT write, migrate, continue, or accept April as a new-run profile.
 * Separated from the current 0.5.0 new-run path (CAL-JAN-034).
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asSimulationId, type SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireLiteralString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";

export const LEGACY_SIMULATION_IDENTITY_SCHEMA_VERSION_0_4_0 = "0.4.0" as const;
export const LEGACY_S1_SPEC_VERSION_0_4_0 = "S1-SPEC-0.1.20" as const;

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

const FORBIDDEN_0_5_KEYS = ["worldCalendarConfigHash", "yearStartProcessorManifestHash"] as const;

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export type LegacySimulationIdentityV040 = {
  schemaVersion: typeof LEGACY_SIMULATION_IDENTITY_SCHEMA_VERSION_0_4_0;
  seed: number;
  initialWorldConfigHash: string;
  sprint1ConfigHash: string;
  techniqueCatalogHash: string;
  initialWeeklyTrainingSidecarHash: string;
  battleProfileAdapterVersion: string;
  matchIdGeneratorVersion: string;
  initialMatchIdGeneratorStateHash: string;
  defaultBattleStrategyVersion: string;
  specVersions: readonly { specSetId: string; version: string }[];
  rngAlgorithmVersion: string;
  canonicalJsonVersion: string;
  hashAlgorithm: string;
};

function mismatch(
  path: string,
  message: string,
  actual?: unknown,
  expected?: unknown,
): ValidationIssue {
  return {
    path,
    message,
    ...(actual !== undefined ? { actual } : {}),
    ...(expected !== undefined ? { expected: String(expected) } : {}),
  };
}

function requireHashHex(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = object[key];
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    issues.push(
      mismatch(`/${key}`, `${key} must be 64 lowercase hex chars`, value, "64 lowercase hex"),
    );
    return undefined;
  }
  return value;
}

/**
 * Strict read-only validation of pre-CAL-JAN SimulationIdentity 0.4.0.
 * Rejects 0.5 calendar/manifest hash fields (no silent migration).
 */
export function validateLegacySimulationIdentityV040(
  input: unknown,
): ValidationResult<LegacySimulationIdentityV040> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);

  for (const forbidden of FORBIDDEN_0_5_KEYS) {
    if (Object.prototype.hasOwnProperty.call(object, forbidden)) {
      issues.push(
        mismatch(
          `/${forbidden}`,
          "legacy 0.4.0 identity must not include CAL-JAN 0.5.0 fields (no silent migration)",
          object[forbidden],
          "absent",
        ),
      );
    }
  }

  rejectUnknownKeys(object, ROOT_KEYS, "", issues);
  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    LEGACY_SIMULATION_IDENTITY_SCHEMA_VERSION_0_4_0,
    issues,
  );
  const seed = requireSafeIntegerAtLeast(object, "seed", "", 0, issues);

  const initialWorldConfigHash = requireHashHex(object, "initialWorldConfigHash", issues);
  const sprint1ConfigHash = requireHashHex(object, "sprint1ConfigHash", issues);
  const techniqueCatalogHash = requireHashHex(object, "techniqueCatalogHash", issues);
  const initialWeeklyTrainingSidecarHash = requireHashHex(
    object,
    "initialWeeklyTrainingSidecarHash",
    issues,
  );
  const initialMatchIdGeneratorStateHash = requireHashHex(
    object,
    "initialMatchIdGeneratorStateHash",
    issues,
  );

  const battleProfileAdapterVersion = requireNonEmpty(
    object,
    "battleProfileAdapterVersion",
    issues,
  );
  const matchIdGeneratorVersion = requireNonEmpty(object, "matchIdGeneratorVersion", issues);
  const defaultBattleStrategyVersion = requireNonEmpty(
    object,
    "defaultBattleStrategyVersion",
    issues,
  );
  const rngAlgorithmVersion = requireNonEmpty(object, "rngAlgorithmVersion", issues);
  const canonicalJsonVersion = requireNonEmpty(object, "canonicalJsonVersion", issues);
  const hashAlgorithm = requireNonEmpty(object, "hashAlgorithm", issues);

  const specVersionsRaw = snapshotDenseArrayOrFail(object["specVersions"], "/specVersions", issues);
  const specVersions: { specSetId: string; version: string }[] = [];
  if (specVersionsRaw !== undefined) {
    for (let index = 0; index < specVersionsRaw.length; index += 1) {
      const path = `/specVersions/${String(index)}`;
      const entry = snapshotPlainObjectOrFail(specVersionsRaw[index], path, issues);
      if (entry === undefined) {
        continue;
      }
      rejectUnknownKeys(entry, ["specSetId", "version"] as const, path, issues);
      const specSetId = entry["specSetId"];
      const version = entry["version"];
      if (typeof specSetId !== "string" || specSetId.length < 1) {
        issues.push(mismatch(`${path}/specSetId`, "specSetId must be non-empty string", specSetId));
        continue;
      }
      if (typeof version !== "string" || version.length < 1) {
        issues.push(mismatch(`${path}/version`, "version must be non-empty string", version));
        continue;
      }
      specVersions.push({ specSetId, version });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
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
    rngAlgorithmVersion === undefined ||
    canonicalJsonVersion === undefined ||
    hashAlgorithm === undefined
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: LEGACY_SIMULATION_IDENTITY_SCHEMA_VERSION_0_4_0,
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
    }),
  );
}

export function computeLegacySimulationIdentityV040Hash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateLegacySimulationIdentityV040(input);
  if (!validated.ok) {
    return validated;
  }
  return safeHashUtf8(provider, toCanonicalJson(validated.value), "/legacySimulationIdentityV040");
}

export function createSimulationIdFromLegacyIdentityV040Hash(identityHash: string): SimulationId {
  if (!SHA256_HEX_PATTERN.test(identityHash)) {
    throw new Error(`legacy identity hash must be 64 lowercase hex (got ${identityHash})`);
  }
  return asSimulationId(`simulation_${identityHash.slice(0, 16)}`);
}

function requireNonEmpty(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): string | undefined {
  const value = object[key];
  if (typeof value !== "string" || value.length < 1) {
    issues.push(mismatch(`/${key}`, `${key} must be a non-empty string`, value));
    return undefined;
  }
  return value;
}
