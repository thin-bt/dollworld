/**
 * `BattleRulesSnapshotRef` — the lightweight per-battle pointer into the single
 * per-run `RunRuleSnapshot` (11 mini-spec §8 / S01-005).
 *
 * A battle never copies the full Sprint1Config or technique catalog. It stores
 * only the run snapshot hash, the config/catalog identities, the union of the
 * TechniqueIds both participants have acquired, and a self-excluding
 * `battleRulesRefHash`.
 */
import { compareUnicodeCodePoints, toCanonicalJson } from "../canonical-json.js";
import { asTechniqueId } from "../ids.js";
import type { TechniqueId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION } from "./constants.js";
import {
  SHA256_HEX_PATTERN,
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireLiteralString,
  requireNonEmptyTrimmedString,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import { safeHashUtf8 } from "./safe-sha256.js";

export const BATTLE_RULES_REF_HASH_INPUT_KEYS = [
  "schemaVersion",
  "runRuleSnapshotHash",
  "sprint1ConfigVersion",
  "sprint1ConfigHash",
  "techniqueCatalogDataVersion",
  "techniqueCatalogHash",
  "relevantTechniqueIds",
] as const;

export const BATTLE_RULES_SNAPSHOT_REF_KEYS = [
  ...BATTLE_RULES_REF_HASH_INPUT_KEYS,
  "battleRulesRefHash",
] as const;

export type BattleRulesSnapshotRef = {
  schemaVersion: typeof BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION;
  runRuleSnapshotHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  relevantTechniqueIds: readonly TechniqueId[];
  battleRulesRefHash: string;
};

/** Every field except `battleRulesRefHash` (11 §8 `BattleRulesRefHashInput`). */
export type BattleRulesRefHashInput = Omit<BattleRulesSnapshotRef, "battleRulesRefHash">;

function requireHashHex(
  object: Record<string, unknown>,
  key: string,
  issues: ValidationIssue[],
): string | undefined {
  if (!hasOwn(object, key)) {
    issues.push({
      path: `/${key}`,
      message: "required key is missing",
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  const value = object[key];
  if (typeof value !== "string" || !SHA256_HEX_PATTERN.test(value)) {
    issues.push({
      path: `/${key}`,
      message: "value must be a 64 lowercase hex character SHA-256 digest",
      actual: value,
      expected: "64 lowercase hex chars",
    });
    return undefined;
  }
  return value;
}

function parseRelevantTechniqueIds(
  value: unknown,
  issues: ValidationIssue[],
): TechniqueId[] | undefined {
  const items = snapshotDenseArrayOrFail(value, "/relevantTechniqueIds", issues);
  if (items === undefined) {
    return undefined;
  }
  const ids: TechniqueId[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (typeof item !== "string" || item.length === 0) {
      issues.push({
        path: `/relevantTechniqueIds/${String(index)}`,
        message: "relevantTechniqueIds entries must be non-empty TechniqueId strings",
        actual: item,
        expected: "TechniqueId",
      });
      return undefined;
    }
    ids.push(asTechniqueId(item));
  }
  for (let index = 1; index < ids.length; index += 1) {
    const order = compareUnicodeCodePoints(ids[index - 1]!, ids[index]!);
    if (order === 0) {
      issues.push({
        path: "/relevantTechniqueIds",
        message: "relevantTechniqueIds must not contain duplicates",
        actual: ids[index],
        expected: "unique TechniqueId values",
      });
      return undefined;
    }
    if (order > 0) {
      issues.push({
        path: "/relevantTechniqueIds",
        message: "relevantTechniqueIds must be sorted by TechniqueId ascending",
        actual: `${ids[index - 1]!} before ${ids[index]!}`,
        expected: "TechniqueId ascending",
      });
      return undefined;
    }
  }
  return ids;
}

export function buildBattleRulesRefHashInput(ref: BattleRulesSnapshotRef): BattleRulesRefHashInput {
  return {
    schemaVersion: ref.schemaVersion,
    runRuleSnapshotHash: ref.runRuleSnapshotHash,
    sprint1ConfigVersion: ref.sprint1ConfigVersion,
    sprint1ConfigHash: ref.sprint1ConfigHash,
    techniqueCatalogDataVersion: ref.techniqueCatalogDataVersion,
    techniqueCatalogHash: ref.techniqueCatalogHash,
    relevantTechniqueIds: ref.relevantTechniqueIds,
  };
}

export function computeBattleRulesRefHash(
  hashInput: BattleRulesRefHashInput,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/battleRulesRefHash");
}

export function validateBattleRulesSnapshotRef(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleRulesSnapshotRef> {
  const structure = preflightBattleRulesSnapshotRefStructure(input);
  if (!structure.ok) {
    return failure(structure.issues);
  }
  return verifyBattleRulesSnapshotRefHash(structure.value, provider);
}

/** Structure only — declared digests are format-checked, never recomputed. */
export function preflightBattleRulesSnapshotRefStructure(
  input: unknown,
): ValidationResult<BattleRulesSnapshotRef> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "BattleRulesSnapshotRef must be a plain object",
              actual: input,
              expected: "BattleRulesSnapshotRef",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, BATTLE_RULES_SNAPSHOT_REF_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION,
    issues,
  );
  const runRuleSnapshotHash = requireHashHex(object, "runRuleSnapshotHash", issues);
  const sprint1ConfigVersion = requireNonEmptyTrimmedString(
    object,
    "sprint1ConfigVersion",
    "",
    issues,
  );
  const sprint1ConfigHash = requireHashHex(object, "sprint1ConfigHash", issues);
  const techniqueCatalogDataVersion = requireNonEmptyTrimmedString(
    object,
    "techniqueCatalogDataVersion",
    "",
    issues,
  );
  const techniqueCatalogHash = requireHashHex(object, "techniqueCatalogHash", issues);
  const battleRulesRefHash = requireHashHex(object, "battleRulesRefHash", issues);
  const relevantTechniqueIds = parseRelevantTechniqueIds(object["relevantTechniqueIds"], issues);

  if (
    schemaVersion === undefined ||
    runRuleSnapshotHash === undefined ||
    sprint1ConfigVersion === undefined ||
    sprint1ConfigHash === undefined ||
    techniqueCatalogDataVersion === undefined ||
    techniqueCatalogHash === undefined ||
    battleRulesRefHash === undefined ||
    relevantTechniqueIds === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion,
      runRuleSnapshotHash,
      sprint1ConfigVersion,
      sprint1ConfigHash,
      techniqueCatalogDataVersion,
      techniqueCatalogHash,
      relevantTechniqueIds,
      battleRulesRefHash,
    }),
  );
}

/** Recompute and verify `battleRulesRefHash` after structure preflight succeeded. */
export function verifyBattleRulesSnapshotRefHash(
  ref: BattleRulesSnapshotRef,
  provider: Sha256Provider,
): ValidationResult<BattleRulesSnapshotRef> {
  const computed = computeBattleRulesRefHash(buildBattleRulesRefHashInput(ref), provider);
  if (!computed.ok) {
    return failure(computed.issues);
  }
  if (computed.value !== ref.battleRulesRefHash) {
    return failure([
      {
        path: "/battleRulesRefHash",
        message:
          "battleRulesRefHash must equal the SHA-256 of the canonical BattleRulesRefHashInput (self-excluding)",
        actual: ref.battleRulesRefHash,
        expected: computed.value,
      },
    ]);
  }
  return success(ref);
}

/**
 * Build a ref from a validated `RunRuleSnapshot` and the union of the acquired
 * TechniqueIds of both participants (11 §8: ascending, deduplicated).
 */
export function createBattleRulesSnapshotRef(
  runRuleSnapshot: RunRuleSnapshot,
  relevantTechniqueIds: readonly TechniqueId[],
  provider: Sha256Provider,
): ValidationResult<BattleRulesSnapshotRef> {
  const catalogIds = new Set(
    runRuleSnapshot.techniqueDefinitions.map((definition) => definition.techniqueId),
  );
  for (let index = 0; index < relevantTechniqueIds.length; index += 1) {
    const techniqueId = relevantTechniqueIds[index]!;
    if (!catalogIds.has(techniqueId)) {
      return failure([
        {
          path: `/relevantTechniqueIds/${String(index)}`,
          message:
            "relevantTechniqueIds entries must belong to RunRuleSnapshot.techniqueDefinitions",
          actual: techniqueId,
          expected: "TechniqueId present in the complete catalog",
        },
      ]);
    }
  }

  const normalized = [...new Set<string>(relevantTechniqueIds)]
    .sort(compareUnicodeCodePoints)
    .map((value) => asTechniqueId(value));

  const hashInput: BattleRulesRefHashInput = {
    schemaVersion: BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION,
    runRuleSnapshotHash: runRuleSnapshot.runRuleSnapshotHash,
    sprint1ConfigVersion: runRuleSnapshot.sprint1ConfigVersion,
    sprint1ConfigHash: runRuleSnapshot.sprint1ConfigHash,
    techniqueCatalogDataVersion: runRuleSnapshot.techniqueCatalogDataVersion,
    techniqueCatalogHash: runRuleSnapshot.techniqueCatalogHash,
    relevantTechniqueIds: normalized,
  };
  const battleRulesRefHash = computeBattleRulesRefHash(hashInput, provider);
  if (!battleRulesRefHash.ok) {
    return failure(battleRulesRefHash.issues);
  }
  return validateBattleRulesSnapshotRef(
    { ...hashInput, battleRulesRefHash: battleRulesRefHash.value },
    provider,
  );
}

export function cloneBattleRulesSnapshotRef(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleRulesSnapshotRef> {
  const validated = validateBattleRulesSnapshotRef(input, provider);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeBattleRulesSnapshotRef(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<BattleRulesSnapshotRef> {
  return validateBattleRulesSnapshotRef(input, provider);
}
