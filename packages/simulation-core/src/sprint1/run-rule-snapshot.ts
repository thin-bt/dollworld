/**
 * `RunRuleSnapshot` — the single immutable per-run rule snapshot (11 mini-spec §8
 * / S01-005).
 *
 * The full Sprint1Config and the full technique catalog are stored exactly once
 * per simulation run here; individual battles keep only a lightweight
 * `BattleRulesSnapshotRef` and re-read rule text from this snapshot.
 *
 * `runRuleSnapshotHash` is the SHA-256 of the canonical JSON of every field
 * except the hash itself, so a snapshot can never certify its own digest.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { validateWorldCalendarConfig } from "../config/validate-config.js";
import type { WorldCalendarConfig } from "../config/types.js";
import { asSimulationId } from "../ids.js";
import type { SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  computeActiveYearStartProcessorManifestHash,
  validateActiveYearStartProcessorManifest,
  type ActiveYearStartProcessorManifest,
} from "./active-year-start-processor-manifest.js";
import {
  BATTLE_PROFILE_ADAPTER_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  MATCH_ID_GENERATOR_VERSION,
  RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
} from "./constants.js";
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
import {
  createSimulationIdFromIdentityHash,
  validateSimulationIdentity,
  computeSimulationIdentityHash,
} from "./simulation-identity.js";
import {
  computeMatchIdGeneratorStateHash,
  validateMatchIdGeneratorState,
} from "./match-id-generator.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { validateTechniqueCatalogStructure } from "./technique-catalog.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import type { Sprint1Config } from "./types.js";
import { validateNormalizedSprint1Config } from "./validate-sprint1-config.js";

export const RUN_RULE_SNAPSHOT_HASH_INPUT_KEYS = [
  "schemaVersion",
  "simulationId",
  "simulationIdentityHash",
  "worldCalendar",
  "worldCalendarConfigHash",
  "yearStartProcessorManifest",
  "yearStartProcessorManifestHash",
  "battleProfileAdapterVersion",
  "matchIdGeneratorVersion",
  "initialMatchIdGeneratorStateHash",
  "defaultBattleStrategyVersion",
  "sprint1ConfigVersion",
  "sprint1ConfigHash",
  "sprint1Config",
  "techniqueCatalogDataVersion",
  "techniqueCatalogHash",
  "techniqueDefinitions",
] as const;

export const RUN_RULE_SNAPSHOT_KEYS = [
  ...RUN_RULE_SNAPSHOT_HASH_INPUT_KEYS,
  "runRuleSnapshotHash",
] as const;

export type RunRuleSnapshot = {
  schemaVersion: typeof RUN_RULE_SNAPSHOT_SCHEMA_VERSION;
  simulationId: SimulationId;
  simulationIdentityHash: string;
  worldCalendar: WorldCalendarConfig;
  worldCalendarConfigHash: string;
  yearStartProcessorManifest: ActiveYearStartProcessorManifest;
  yearStartProcessorManifestHash: string;
  battleProfileAdapterVersion: typeof BATTLE_PROFILE_ADAPTER_VERSION;
  matchIdGeneratorVersion: typeof MATCH_ID_GENERATOR_VERSION;
  initialMatchIdGeneratorStateHash: string;
  defaultBattleStrategyVersion: typeof DEFAULT_BATTLE_STRATEGY_VERSION;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  sprint1Config: Sprint1Config;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  techniqueDefinitions: readonly TechniqueDefinition[];
  runRuleSnapshotHash: string;
};

/** Every field except `runRuleSnapshotHash` (11 §8 self-excluding hash material). */
export type RunRuleSnapshotHashInput = Omit<RunRuleSnapshot, "runRuleSnapshotHash">;

export type CreateRunRuleSnapshotInput = {
  simulationIdentity: unknown;
  simulationIdentityHash: unknown;
  initialMatchIdGeneratorState: unknown;
  worldCalendar: unknown;
  yearStartProcessorManifest: unknown;
  sprint1Config: unknown;
  techniqueCatalogDataVersion: unknown;
  techniqueDefinitions: unknown;
};

export const CREATE_RUN_RULE_SNAPSHOT_INPUT_KEYS = [
  "simulationIdentity",
  "simulationIdentityHash",
  "initialMatchIdGeneratorState",
  "worldCalendar",
  "yearStartProcessorManifest",
  "sprint1Config",
  "techniqueCatalogDataVersion",
  "techniqueDefinitions",
] as const;

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

/**
 * Read the raw `techniqueId` of each definition entry without validating the
 * definition itself, so canonical-order violations are reported even when
 * `validateTechniqueCatalog` would silently sort the array.
 */
function readRawTechniqueIdOrder(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }
  const ids: string[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const entryPath = `${path}/${String(index)}`;
    const entry = snapshotPlainObjectOrFail(items[index], entryPath, issues);
    if (entry === undefined) {
      return undefined;
    }
    const techniqueId = entry["techniqueId"];
    if (typeof techniqueId !== "string" || techniqueId.length === 0) {
      issues.push({
        path: `${entryPath}/techniqueId`,
        message: "techniqueId must be a non-empty string",
        actual: techniqueId,
        expected: "TechniqueId",
      });
      return undefined;
    }
    ids.push(techniqueId);
  }
  return ids;
}

export function buildRunRuleSnapshotHashInput(snapshot: RunRuleSnapshot): RunRuleSnapshotHashInput {
  return {
    schemaVersion: snapshot.schemaVersion,
    simulationId: snapshot.simulationId,
    simulationIdentityHash: snapshot.simulationIdentityHash,
    worldCalendar: snapshot.worldCalendar,
    worldCalendarConfigHash: snapshot.worldCalendarConfigHash,
    yearStartProcessorManifest: snapshot.yearStartProcessorManifest,
    yearStartProcessorManifestHash: snapshot.yearStartProcessorManifestHash,
    battleProfileAdapterVersion: snapshot.battleProfileAdapterVersion,
    matchIdGeneratorVersion: snapshot.matchIdGeneratorVersion,
    initialMatchIdGeneratorStateHash: snapshot.initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion: snapshot.defaultBattleStrategyVersion,
    sprint1ConfigVersion: snapshot.sprint1ConfigVersion,
    sprint1ConfigHash: snapshot.sprint1ConfigHash,
    sprint1Config: snapshot.sprint1Config,
    techniqueCatalogDataVersion: snapshot.techniqueCatalogDataVersion,
    techniqueCatalogHash: snapshot.techniqueCatalogHash,
    techniqueDefinitions: snapshot.techniqueDefinitions,
  };
}

export function computeRunRuleSnapshotHash(
  hashInput: RunRuleSnapshotHashInput,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/runRuleSnapshotHash");
}

/**
 * Structure / semantics of a RunRuleSnapshot without hash recomputation
 * (S01-005 Phase 1). Declared digests are format-checked only.
 */
export function preflightRunRuleSnapshotStructure(
  input: unknown,
): ValidationResult<RunRuleSnapshot> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "RunRuleSnapshot must be a plain object",
              actual: input,
              expected: "RunRuleSnapshot",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, RUN_RULE_SNAPSHOT_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
    issues,
  );
  const simulationIdText = requireNonEmptyTrimmedString(object, "simulationId", "", issues);
  const simulationIdentityHash = requireHashHex(object, "simulationIdentityHash", issues);

  let worldCalendar: WorldCalendarConfig | undefined;
  const calendarResult = validateWorldCalendarConfig(object["worldCalendar"]);
  if (!calendarResult.ok) {
    for (const issue of calendarResult.issues) {
      issues.push({
        ...issue,
        path: issue.path.startsWith("/worldCalendar") ? issue.path : `/worldCalendar${issue.path}`,
      });
    }
  } else {
    worldCalendar = calendarResult.value;
  }
  const worldCalendarConfigHash = requireHashHex(object, "worldCalendarConfigHash", issues);

  let yearStartProcessorManifest: ActiveYearStartProcessorManifest | undefined;
  const manifestResult = validateActiveYearStartProcessorManifest(
    object["yearStartProcessorManifest"],
  );
  if (!manifestResult.ok) {
    for (const issue of manifestResult.issues) {
      issues.push({ ...issue, path: `/yearStartProcessorManifest${issue.path}` });
    }
  } else {
    yearStartProcessorManifest = manifestResult.value;
  }
  const yearStartProcessorManifestHash = requireHashHex(
    object,
    "yearStartProcessorManifestHash",
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
    issues,
  );
  const defaultBattleStrategyVersion = requireLiteralString(
    object,
    "defaultBattleStrategyVersion",
    "",
    DEFAULT_BATTLE_STRATEGY_VERSION,
    issues,
  );
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
  const runRuleSnapshotHash = requireHashHex(object, "runRuleSnapshotHash", issues);

  let sprint1Config: Sprint1Config | undefined;
  const configResult = validateNormalizedSprint1Config(object["sprint1Config"]);
  if (!configResult.ok) {
    for (const issue of configResult.issues) {
      issues.push({ ...issue, path: `/sprint1Config${issue.path}` });
    }
  } else {
    sprint1Config = configResult.value;
  }

  const rawTechniqueIdOrder = readRawTechniqueIdOrder(
    object["techniqueDefinitions"],
    "/techniqueDefinitions",
    issues,
  );

  if (
    schemaVersion === undefined ||
    simulationIdText === undefined ||
    simulationIdentityHash === undefined ||
    worldCalendar === undefined ||
    worldCalendarConfigHash === undefined ||
    yearStartProcessorManifest === undefined ||
    yearStartProcessorManifestHash === undefined ||
    battleProfileAdapterVersion === undefined ||
    matchIdGeneratorVersion === undefined ||
    initialMatchIdGeneratorStateHash === undefined ||
    defaultBattleStrategyVersion === undefined ||
    sprint1ConfigVersion === undefined ||
    sprint1ConfigHash === undefined ||
    techniqueCatalogDataVersion === undefined ||
    techniqueCatalogHash === undefined ||
    runRuleSnapshotHash === undefined ||
    sprint1Config === undefined ||
    rawTechniqueIdOrder === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  if (sprint1ConfigVersion !== sprint1Config.configVersion) {
    issues.push({
      path: "/sprint1ConfigVersion",
      message: "sprint1ConfigVersion must equal sprint1Config.configVersion",
      actual: sprint1ConfigVersion,
      expected: sprint1Config.configVersion,
    });
  }

  const expectedSimulationId = createSimulationIdFromIdentityHash(simulationIdentityHash);
  if (simulationIdText !== expectedSimulationId) {
    issues.push({
      path: "/simulationId",
      message: "simulationId must be re-derivable from simulationIdentityHash (02 §12)",
      actual: simulationIdText,
      expected: expectedSimulationId,
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const catalogResult = validateTechniqueCatalogStructure({
    identity: {
      dataVersion: techniqueCatalogDataVersion,
      catalogHash: techniqueCatalogHash,
    },
    definitions: object["techniqueDefinitions"],
  });
  if (!catalogResult.ok) {
    for (const issue of catalogResult.issues) {
      issues.push({
        ...issue,
        path: issue.path.startsWith("/definitions")
          ? `/techniqueDefinitions${issue.path.slice("/definitions".length)}`
          : issue.path,
      });
    }
    return failure(issues);
  }

  const sortedDefinitions = catalogResult.value.definitions;
  if (rawTechniqueIdOrder.length !== sortedDefinitions.length) {
    issues.push({
      path: "/techniqueDefinitions",
      message: "techniqueDefinitions must be the complete catalog with no duplicates",
      actual: rawTechniqueIdOrder.length,
      expected: String(sortedDefinitions.length),
    });
  } else {
    for (let index = 0; index < sortedDefinitions.length; index += 1) {
      if (rawTechniqueIdOrder[index] !== sortedDefinitions[index]!.techniqueId) {
        issues.push({
          path: "/techniqueDefinitions",
          message: "techniqueDefinitions must already be sorted by TechniqueId ascending",
          actual: rawTechniqueIdOrder[index],
          expected: sortedDefinitions[index]!.techniqueId,
        });
        break;
      }
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const rebuilt: RunRuleSnapshot = {
    schemaVersion,
    simulationId: asSimulationId(simulationIdText),
    simulationIdentityHash,
    worldCalendar,
    worldCalendarConfigHash,
    yearStartProcessorManifest,
    yearStartProcessorManifestHash,
    battleProfileAdapterVersion,
    matchIdGeneratorVersion,
    initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion,
    sprint1ConfigVersion,
    sprint1ConfigHash,
    sprint1Config,
    techniqueCatalogDataVersion,
    techniqueCatalogHash,
    techniqueDefinitions: sortedDefinitions,
    runRuleSnapshotHash,
  };

  return success(deepFreezePlainJson(rebuilt));
}

/**
 * Recompute Sprint1Config / catalog / snapshot digests after structure preflight
 * (S01-005 Phase 2).
 */
export function verifyRunRuleSnapshotHashes(
  snapshot: RunRuleSnapshot,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  const issues: ValidationIssue[] = [];

  const computedCalendarHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(snapshot.worldCalendar),
    "/worldCalendarConfigHash",
  );
  if (!computedCalendarHashResult.ok) {
    return failure(computedCalendarHashResult.issues);
  }
  if (computedCalendarHashResult.value !== snapshot.worldCalendarConfigHash) {
    issues.push({
      path: "/worldCalendarConfigHash",
      message:
        "worldCalendarConfigHash must equal the SHA-256 of the canonical WorldCalendarConfig",
      actual: snapshot.worldCalendarConfigHash,
      expected: computedCalendarHashResult.value,
    });
  }

  const computedManifestHash = computeActiveYearStartProcessorManifestHash(
    snapshot.yearStartProcessorManifest,
    provider,
  );
  if (!computedManifestHash.ok) {
    return failure(computedManifestHash.issues);
  }
  if (computedManifestHash.value !== snapshot.yearStartProcessorManifestHash) {
    issues.push({
      path: "/yearStartProcessorManifestHash",
      message:
        "yearStartProcessorManifestHash must equal the SHA-256 of the canonical ActiveYearStartProcessorManifest",
      actual: snapshot.yearStartProcessorManifestHash,
      expected: computedManifestHash.value,
    });
  }

  const computedConfigHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(snapshot.sprint1Config),
    "/sprint1ConfigHash",
  );
  if (!computedConfigHashResult.ok) {
    return failure(computedConfigHashResult.issues);
  }
  if (computedConfigHashResult.value !== snapshot.sprint1ConfigHash) {
    issues.push({
      path: "/sprint1ConfigHash",
      message: "sprint1ConfigHash must equal the SHA-256 of the canonical normalized Sprint1Config",
      actual: snapshot.sprint1ConfigHash,
      expected: computedConfigHashResult.value,
    });
  }

  const catalogHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(snapshot.techniqueDefinitions),
    "/techniqueCatalogHash",
  );
  if (!catalogHashResult.ok) {
    return failure(catalogHashResult.issues);
  }
  if (catalogHashResult.value !== snapshot.techniqueCatalogHash) {
    issues.push({
      path: "/techniqueCatalogHash",
      message:
        "techniqueCatalogHash must equal the SHA-256 of the canonical sorted techniqueDefinitions",
      actual: snapshot.techniqueCatalogHash,
      expected: catalogHashResult.value,
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const computedSnapshotHash = computeRunRuleSnapshotHash(
    buildRunRuleSnapshotHashInput(snapshot),
    provider,
  );
  if (!computedSnapshotHash.ok) {
    return failure(computedSnapshotHash.issues);
  }
  if (computedSnapshotHash.value !== snapshot.runRuleSnapshotHash) {
    return failure([
      {
        path: "/runRuleSnapshotHash",
        message:
          "runRuleSnapshotHash must equal the SHA-256 of the canonical JSON of every other field",
        actual: snapshot.runRuleSnapshotHash,
        expected: computedSnapshotHash.value,
      },
    ]);
  }

  return success(snapshot);
}

/**
 * Full validation (11 §8, §14): structural shape, normalized Sprint1Config,
 * `sprint1ConfigVersion` / `sprint1ConfigHash` recomputation, TechniqueId-ascending
 * complete catalog with a uniform `dataVersion`, `techniqueCatalogHash`
 * recomputation, `simulationId` re-derivation from `simulationIdentityHash`, and
 * the self-excluding `runRuleSnapshotHash`.
 *
 * Structurally invalid input never reaches the `provider`.
 */
export function validateRunRuleSnapshot(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  const structure = preflightRunRuleSnapshotStructure(input);
  if (!structure.ok) {
    return failure(structure.issues);
  }
  return verifyRunRuleSnapshotHashes(structure.value, provider);
}

/**
 * Bind a RunRuleSnapshot to a SimulationIdentity and the fresh MatchId generator
 * state that identity claims (11 §8 / S01-005 audit).
 *
 * Structure first (snapshot / identity / hash format / generator), then hashes.
 */
export function validateRunRuleSnapshotAgainstIdentity(
  snapshotInput: unknown,
  simulationIdentityInput: unknown,
  simulationIdentityHashInput: unknown,
  initialMatchIdGeneratorStateInput: unknown,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  const structure = preflightRunRuleSnapshotStructure(snapshotInput);
  if (!structure.ok) {
    return failure(structure.issues);
  }

  const identity = validateSimulationIdentity(simulationIdentityInput);
  if (!identity.ok) {
    return failure(
      identity.issues.map((issue) => ({ ...issue, path: `/simulationIdentity${issue.path}` })),
    );
  }

  if (
    typeof simulationIdentityHashInput !== "string" ||
    !SHA256_HEX_PATTERN.test(simulationIdentityHashInput)
  ) {
    return failure([
      {
        path: "/simulationIdentityHash",
        message: "simulationIdentityHash must be a 64 lowercase hex character SHA-256 digest",
        actual: simulationIdentityHashInput,
        expected: "64 lowercase hex chars",
      },
    ]);
  }

  const generatorState = validateMatchIdGeneratorState(initialMatchIdGeneratorStateInput);
  if (!generatorState.ok) {
    return failure(
      generatorState.issues.map((issue) => ({
        ...issue,
        path: `/initialMatchIdGeneratorState${issue.path}`,
      })),
    );
  }

  const snapshot = verifyRunRuleSnapshotHashes(structure.value, provider);
  if (!snapshot.ok) {
    return failure(snapshot.issues);
  }

  const computedIdentityHash = computeSimulationIdentityHash(identity.value, provider);
  if (!computedIdentityHash.ok) {
    return failure(computedIdentityHash.issues);
  }
  if (computedIdentityHash.value !== simulationIdentityHashInput) {
    return failure([
      {
        path: "/simulationIdentityHash",
        message: "simulationIdentityHash must equal SHA-256(canonical SimulationIdentity)",
        actual: simulationIdentityHashInput,
        expected: computedIdentityHash.value,
      },
    ]);
  }

  if (snapshot.value.simulationIdentityHash !== simulationIdentityHashInput) {
    return failure([
      {
        path: "/simulationIdentityHash",
        message: "RunRuleSnapshot.simulationIdentityHash must equal the declared identity hash",
        actual: snapshot.value.simulationIdentityHash,
        expected: simulationIdentityHashInput,
      },
    ]);
  }

  const expectedSimulationId = createSimulationIdFromIdentityHash(simulationIdentityHashInput);
  if (snapshot.value.simulationId !== expectedSimulationId) {
    return failure([
      {
        path: "/simulationId",
        message:
          "simulationId must equal createSimulationIdFromIdentityHash(simulationIdentityHash)",
        actual: snapshot.value.simulationId,
        expected: expectedSimulationId,
      },
    ]);
  }

  const generatorHash = computeMatchIdGeneratorStateHash(generatorState.value, provider);
  if (!generatorHash.ok) {
    return failure(
      generatorHash.issues.map((issue) => ({
        ...issue,
        path: `/initialMatchIdGeneratorState${issue.path}`,
      })),
    );
  }

  const checks: Array<{ path: string; actual: string; expected: string; message: string }> = [
    {
      path: "/worldCalendarConfigHash",
      actual: snapshot.value.worldCalendarConfigHash,
      expected: identity.value.worldCalendarConfigHash,
      message: "worldCalendarConfigHash must match SimulationIdentity",
    },
    {
      path: "/yearStartProcessorManifestHash",
      actual: snapshot.value.yearStartProcessorManifestHash,
      expected: identity.value.yearStartProcessorManifestHash,
      message: "yearStartProcessorManifestHash must match SimulationIdentity",
    },
    {
      path: "/battleProfileAdapterVersion",
      actual: snapshot.value.battleProfileAdapterVersion,
      expected: identity.value.battleProfileAdapterVersion,
      message: "battleProfileAdapterVersion must match SimulationIdentity",
    },
    {
      path: "/matchIdGeneratorVersion",
      actual: snapshot.value.matchIdGeneratorVersion,
      expected: identity.value.matchIdGeneratorVersion,
      message: "matchIdGeneratorVersion must match SimulationIdentity",
    },
    {
      path: "/initialMatchIdGeneratorStateHash",
      actual: snapshot.value.initialMatchIdGeneratorStateHash,
      expected: identity.value.initialMatchIdGeneratorStateHash,
      message: "initialMatchIdGeneratorStateHash must match SimulationIdentity",
    },
    {
      path: "/initialMatchIdGeneratorStateHash",
      actual: generatorHash.value,
      expected: identity.value.initialMatchIdGeneratorStateHash,
      message:
        "SHA-256(initialMatchIdGeneratorState) must equal SimulationIdentity.initialMatchIdGeneratorStateHash",
    },
    {
      path: "/defaultBattleStrategyVersion",
      actual: snapshot.value.defaultBattleStrategyVersion,
      expected: identity.value.defaultBattleStrategyVersion,
      message: "defaultBattleStrategyVersion must match SimulationIdentity",
    },
    {
      path: "/sprint1ConfigHash",
      actual: snapshot.value.sprint1ConfigHash,
      expected: identity.value.sprint1ConfigHash,
      message: "sprint1ConfigHash must match SimulationIdentity",
    },
    {
      path: "/techniqueCatalogHash",
      actual: snapshot.value.techniqueCatalogHash,
      expected: identity.value.techniqueCatalogHash,
      message: "techniqueCatalogHash must match SimulationIdentity",
    },
  ];

  const issues: ValidationIssue[] = [];
  for (const check of checks) {
    if (check.actual !== check.expected) {
      issues.push({
        path: check.path,
        message: check.message,
        actual: check.actual,
        expected: check.expected,
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(snapshot.value);
}

/**
 * Build a snapshot from validated run materials bound to a SimulationIdentity
 * and the fresh MatchId generator state that identity claims.
 *
 * All structure (identity, hash format, generator, config, catalog dataVersion,
 * techniqueDefinitions) runs before any Sha256Provider call.
 */
export function createRunRuleSnapshot(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "CreateRunRuleSnapshotInput must be a plain object",
              actual: input,
              expected: "CreateRunRuleSnapshotInput",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, CREATE_RUN_RULE_SNAPSHOT_INPUT_KEYS, "", issues);
  if (issues.length > 0) {
    return failure(issues);
  }

  const identity = validateSimulationIdentity(object["simulationIdentity"]);
  if (!identity.ok) {
    return failure(
      identity.issues.map((issue) => ({ ...issue, path: `/simulationIdentity${issue.path}` })),
    );
  }

  const declaredHash = object["simulationIdentityHash"];
  if (typeof declaredHash !== "string" || !SHA256_HEX_PATTERN.test(declaredHash)) {
    return failure([
      {
        path: "/simulationIdentityHash",
        message: "simulationIdentityHash must be a 64 lowercase hex character SHA-256 digest",
        actual: declaredHash,
        expected: "64 lowercase hex chars",
      },
    ]);
  }

  const generatorState = validateMatchIdGeneratorState(object["initialMatchIdGeneratorState"]);
  if (!generatorState.ok) {
    return failure(
      generatorState.issues.map((issue) => ({
        ...issue,
        path: `/initialMatchIdGeneratorState${issue.path}`,
      })),
    );
  }

  const calendarResult = validateWorldCalendarConfig(object["worldCalendar"]);
  if (!calendarResult.ok) {
    return failure(
      calendarResult.issues.map((issue) => ({
        ...issue,
        path: issue.path.startsWith("/worldCalendar") ? issue.path : `/worldCalendar${issue.path}`,
      })),
    );
  }
  const worldCalendar = calendarResult.value;

  const manifestResult = validateActiveYearStartProcessorManifest(
    object["yearStartProcessorManifest"],
  );
  if (!manifestResult.ok) {
    return failure(
      manifestResult.issues.map((issue) => ({
        ...issue,
        path: `/yearStartProcessorManifest${issue.path}`,
      })),
    );
  }
  const yearStartProcessorManifest = manifestResult.value;

  const configResult = validateNormalizedSprint1Config(object["sprint1Config"]);
  if (!configResult.ok) {
    return failure(
      configResult.issues.map((issue) => ({ ...issue, path: `/sprint1Config${issue.path}` })),
    );
  }
  const sprint1Config = configResult.value;

  const techniqueCatalogDataVersion = object["techniqueCatalogDataVersion"];
  if (typeof techniqueCatalogDataVersion !== "string" || techniqueCatalogDataVersion.length === 0) {
    return failure([
      {
        path: "/techniqueCatalogDataVersion",
        message: "techniqueCatalogDataVersion must be a non-empty string",
        actual: techniqueCatalogDataVersion,
        expected: "non-empty string",
      },
    ]);
  }

  const catalogStructure = validateTechniqueCatalogStructure({
    identity: {
      dataVersion: techniqueCatalogDataVersion,
      catalogHash: identity.value.techniqueCatalogHash,
    },
    definitions: object["techniqueDefinitions"],
  });
  if (!catalogStructure.ok) {
    return failure(
      catalogStructure.issues.map((issue) => ({
        ...issue,
        path: issue.path.startsWith("/definitions")
          ? `/techniqueDefinitions${issue.path.slice("/definitions".length)}`
          : issue.path.startsWith("/identity")
            ? issue.path.replace(/^\/identity/, "/techniqueCatalogIdentity")
            : `/techniqueDefinitions${issue.path}`,
      })),
    );
  }

  if (identity.value.battleProfileAdapterVersion !== BATTLE_PROFILE_ADAPTER_VERSION) {
    return failure([
      {
        path: "/simulationIdentity/battleProfileAdapterVersion",
        message: "battleProfileAdapterVersion must equal the fixed registry value",
        actual: identity.value.battleProfileAdapterVersion,
        expected: BATTLE_PROFILE_ADAPTER_VERSION,
      },
    ]);
  }
  if (identity.value.matchIdGeneratorVersion !== MATCH_ID_GENERATOR_VERSION) {
    return failure([
      {
        path: "/simulationIdentity/matchIdGeneratorVersion",
        message: "matchIdGeneratorVersion must equal the fixed registry value",
        actual: identity.value.matchIdGeneratorVersion,
        expected: MATCH_ID_GENERATOR_VERSION,
      },
    ]);
  }
  if (identity.value.defaultBattleStrategyVersion !== DEFAULT_BATTLE_STRATEGY_VERSION) {
    return failure([
      {
        path: "/simulationIdentity/defaultBattleStrategyVersion",
        message: "defaultBattleStrategyVersion must equal the fixed registry value",
        actual: identity.value.defaultBattleStrategyVersion,
        expected: DEFAULT_BATTLE_STRATEGY_VERSION,
      },
    ]);
  }

  // Provider phase — only after every structure check succeeded.
  const computedIdentityHash = computeSimulationIdentityHash(identity.value, provider);
  if (!computedIdentityHash.ok) {
    return failure(computedIdentityHash.issues);
  }
  if (computedIdentityHash.value !== declaredHash) {
    return failure([
      {
        path: "/simulationIdentityHash",
        message: "simulationIdentityHash must equal SHA-256(canonical SimulationIdentity)",
        actual: declaredHash,
        expected: computedIdentityHash.value,
      },
    ]);
  }

  const generatorHash = computeMatchIdGeneratorStateHash(generatorState.value, provider);
  if (!generatorHash.ok) {
    return failure(generatorHash.issues);
  }
  if (generatorHash.value !== identity.value.initialMatchIdGeneratorStateHash) {
    return failure([
      {
        path: "/initialMatchIdGeneratorState",
        message:
          "initialMatchIdGeneratorState hash must equal SimulationIdentity.initialMatchIdGeneratorStateHash",
        actual: generatorHash.value,
        expected: identity.value.initialMatchIdGeneratorStateHash,
      },
    ]);
  }

  const worldCalendarConfigHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(worldCalendar),
    "/worldCalendarConfigHash",
  );
  if (!worldCalendarConfigHashResult.ok) {
    return failure(worldCalendarConfigHashResult.issues);
  }
  if (worldCalendarConfigHashResult.value !== identity.value.worldCalendarConfigHash) {
    return failure([
      {
        path: "/worldCalendar",
        message: "WorldCalendarConfig hash must equal SimulationIdentity.worldCalendarConfigHash",
        actual: worldCalendarConfigHashResult.value,
        expected: identity.value.worldCalendarConfigHash,
      },
    ]);
  }

  const yearStartProcessorManifestHashResult = computeActiveYearStartProcessorManifestHash(
    yearStartProcessorManifest,
    provider,
  );
  if (!yearStartProcessorManifestHashResult.ok) {
    return failure(yearStartProcessorManifestHashResult.issues);
  }
  if (
    yearStartProcessorManifestHashResult.value !== identity.value.yearStartProcessorManifestHash
  ) {
    return failure([
      {
        path: "/yearStartProcessorManifest",
        message:
          "ActiveYearStartProcessorManifest hash must equal SimulationIdentity.yearStartProcessorManifestHash",
        actual: yearStartProcessorManifestHashResult.value,
        expected: identity.value.yearStartProcessorManifestHash,
      },
    ]);
  }

  const sprint1ConfigHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(sprint1Config),
    "/sprint1ConfigHash",
  );
  if (!sprint1ConfigHashResult.ok) {
    return failure(sprint1ConfigHashResult.issues);
  }
  const sprint1ConfigHash = sprint1ConfigHashResult.value;
  if (sprint1ConfigHash !== identity.value.sprint1ConfigHash) {
    return failure([
      {
        path: "/sprint1Config",
        message: "Sprint1Config hash must equal SimulationIdentity.sprint1ConfigHash",
        actual: sprint1ConfigHash,
        expected: identity.value.sprint1ConfigHash,
      },
    ]);
  }

  const catalogHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(catalogStructure.value.definitions),
    "/techniqueCatalogHash",
  );
  if (!catalogHashResult.ok) {
    return failure(catalogHashResult.issues);
  }
  if (catalogHashResult.value !== identity.value.techniqueCatalogHash) {
    return failure([
      {
        path: "/techniqueDefinitions",
        message: "technique catalog hash must equal SimulationIdentity.techniqueCatalogHash",
        actual: catalogHashResult.value,
        expected: identity.value.techniqueCatalogHash,
      },
    ]);
  }

  const hashInput: RunRuleSnapshotHashInput = {
    schemaVersion: RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
    simulationId: createSimulationIdFromIdentityHash(declaredHash),
    simulationIdentityHash: declaredHash,
    worldCalendar,
    worldCalendarConfigHash: worldCalendarConfigHashResult.value,
    yearStartProcessorManifest,
    yearStartProcessorManifestHash: yearStartProcessorManifestHashResult.value,
    battleProfileAdapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    initialMatchIdGeneratorStateHash: identity.value.initialMatchIdGeneratorStateHash,
    defaultBattleStrategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
    sprint1ConfigVersion: sprint1Config.configVersion,
    sprint1ConfigHash,
    sprint1Config,
    techniqueCatalogDataVersion,
    techniqueCatalogHash: catalogHashResult.value,
    techniqueDefinitions: catalogStructure.value.definitions,
  };

  const runHash = computeRunRuleSnapshotHash(hashInput, provider);
  if (!runHash.ok) {
    return failure(runHash.issues);
  }

  return validateRunRuleSnapshotAgainstIdentity(
    { ...hashInput, runRuleSnapshotHash: runHash.value },
    identity.value,
    declaredHash,
    generatorState.value,
    provider,
  );
}

export function cloneRunRuleSnapshot(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  const validated = validateRunRuleSnapshot(input, provider);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeRunRuleSnapshot(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<RunRuleSnapshot> {
  return validateRunRuleSnapshot(input, provider);
}
