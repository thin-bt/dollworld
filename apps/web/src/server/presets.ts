import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import {
  computeActiveYearStartProcessorManifestHash,
  computeConfigHash,
  computeNameDataHash,
  createDefaultActiveYearStartProcessorManifest,
  createExpectedSpecVersions,
  BATTLE_PROFILE_ADAPTER_VERSION,
  CANONICAL_JSON_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  HASH_ALGORITHM,
  MATCH_ID_GENERATOR_VERSION,
  RNG_ALGORITHM_VERSION,
  RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
  SIMULATION_IDENTITY_SCHEMA_VERSION,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateNameData,
  validateNameDataManifest,
  validateSprint1CliInput,
  type InitialWorldConfig,
  type Sha256Provider,
  type Sha256Utf8Hasher,
  type Sprint1CliInput,
  type ValidatedNameData,
} from "@shared-world/simulation-core";
import { createHash } from "node:crypto";

export type PresetView = {
  presetId: string;
  displayName: string;
  initialProfileId: string;
  initialWorldConfigHash: string;
  sprint1ConfigVersion: string;
  sprint1ConfigHash: string;
  techniqueCatalogDataVersion: string;
  techniqueCatalogHash: string;
  nameDataVersion: string;
  nameDataHash: string;
  simulationIdentitySchemaVersion: typeof SIMULATION_IDENTITY_SCHEMA_VERSION;
  specVersions: ReadonlyArray<{ specSetId: string; version: string }>;
  rngAlgorithmVersion: string;
  canonicalJsonVersion: string;
  battleProfileAdapterVersion: string;
  matchIdGeneratorVersion: string;
  defaultBattleStrategyVersion: string;
  hashAlgorithm: typeof HASH_ALGORITHM;
  runRuleSnapshotSchemaVersion: typeof RUN_RULE_SNAPSHOT_SCHEMA_VERSION;
  worldCalendarConfigHash: string;
  yearStartProcessorManifestHash: string;
};

export type PresetMaterials = {
  presetId: string;
  displayName: string;
  config: InitialWorldConfig;
  /** Validated/normalized CLI input for identity projection (preset list views). */
  sprint1CliInput: Sprint1CliInput;
  /**
   * Display-unit Sprint1 CLI JSON for createSprint1RunSession on start only.
   * Never persisted into RunInitializationSnapshot.
   */
  sprint1CliInputForCreate: unknown;
  nameData: ValidatedNameData;
};

export type FrozenPresetRegistry = {
  readonly items: readonly PresetView[];
  readonly materialsById: ReadonlyMap<string, PresetMaterials>;
  getView(presetId: string): PresetView | undefined;
  getMaterials(presetId: string): PresetMaterials | undefined;
};

export function createNodeSha256Provider(): Sha256Provider {
  return {
    hashUtf8(utf8Text: string): string {
      return createHash("sha256").update(utf8Text, "utf8").digest("hex");
    },
    createUtf8Hasher(): Sha256Utf8Hasher {
      const hash = createHash("sha256");
      return {
        update(utf8Text: string): void {
          hash.update(utf8Text, "utf8");
        },
        digestHex(): string {
          return hash.digest("hex");
        },
      };
    },
  };
}

function readJson(absolutePath: string): unknown {
  return JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
}

function resolvePath(cwd: string, relativePath: string): string {
  return isAbsolute(relativePath) ? relativePath : resolve(cwd, relativePath);
}

function loadValidatedNameData(input: {
  cwd: string;
  manifestPath: string;
  requiredVersion: string;
  initialFamilyCount: number;
  sha256Provider: Sha256Provider;
}): ValidatedNameData {
  const manifestAbsolutePath = resolvePath(input.cwd, input.manifestPath);
  const manifestJson = readJson(manifestAbsolutePath);
  const manifestResult = validateNameDataManifest(manifestJson);
  if (!manifestResult.ok) {
    throw new Error(
      `name data manifest validation failed: ${JSON.stringify(manifestResult.issues)}`,
    );
  }
  const manifest = manifestResult.value;
  const baseDir = dirname(manifestAbsolutePath);
  const familyNames = readJson(join(baseDir, manifest.files.family.path));
  const maleGivenNames = readJson(join(baseDir, manifest.files.male.path));
  const femaleGivenNames = readJson(join(baseDir, manifest.files.female.path));
  const neutralGivenNames = readJson(join(baseDir, manifest.files.neutral.path));
  const validated = validateNameData({
    manifest,
    familyNames,
    maleGivenNames,
    femaleGivenNames,
    neutralGivenNames,
    requiredVersion: input.requiredVersion,
    initialFamilyCount: input.initialFamilyCount,
    sha256Provider: input.sha256Provider,
  });
  if (!validated.ok) {
    throw new Error(`name data validation failed: ${JSON.stringify(validated.issues)}`);
  }
  return validated.value;
}

export function projectPresetView(
  materials: PresetMaterials,
  sha256Provider: Sha256Provider,
): PresetView {
  const initialWorldConfigHash = computeConfigHash(materials.config, sha256Provider);
  const sprint1ConfigHash = sha256Provider.hashUtf8(
    toCanonicalJson(materials.sprint1CliInput.sprint1Config),
  );
  const nameDataHash = computeNameDataHash(materials.nameData.manifest, sha256Provider);
  const worldCalendarConfigHash = sha256Provider.hashUtf8(
    toCanonicalJson(materials.config.worldCalendar),
  );
  const yearStartManifest = createDefaultActiveYearStartProcessorManifest();
  const yearStartHashResult = computeActiveYearStartProcessorManifestHash(
    yearStartManifest,
    sha256Provider,
  );
  if (!yearStartHashResult.ok) {
    throw new Error(
      `yearStartProcessorManifestHash failed: ${JSON.stringify(yearStartHashResult.issues)}`,
    );
  }
  const yearStartProcessorManifestHash = yearStartHashResult.value;
  const catalog = materials.sprint1CliInput.techniqueCatalog;
  return {
    presetId: materials.presetId,
    displayName: materials.displayName,
    initialProfileId: materials.config.profileId,
    initialWorldConfigHash,
    sprint1ConfigVersion: materials.sprint1CliInput.sprint1Config.configVersion,
    sprint1ConfigHash,
    techniqueCatalogDataVersion: catalog.identity.dataVersion,
    techniqueCatalogHash: catalog.identity.catalogHash,
    nameDataVersion: materials.nameData.manifest.nameDataVersion,
    nameDataHash,
    simulationIdentitySchemaVersion: SIMULATION_IDENTITY_SCHEMA_VERSION,
    specVersions: createExpectedSpecVersions().map((entry) => ({
      specSetId: entry.specSetId,
      version: entry.version,
    })),
    rngAlgorithmVersion: RNG_ALGORITHM_VERSION,
    canonicalJsonVersion: CANONICAL_JSON_VERSION,
    battleProfileAdapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    defaultBattleStrategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
    hashAlgorithm: HASH_ALGORITHM,
    runRuleSnapshotSchemaVersion: RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
    worldCalendarConfigHash,
    yearStartProcessorManifestHash,
  };
}

export const DEFAULT_SPRINT1_PRESET_ID = "sprint1-tiny-accepted" as const;

export function loadSprint1AcceptedPresetMaterials(
  repoRoot: string,
  sha256Provider: Sha256Provider = createNodeSha256Provider(),
): PresetMaterials {
  const configPath = join(
    repoRoot,
    "apps/simulator/fixtures/sprint1/tiny-initial-world.config.json",
  );
  const inputPath = join(repoRoot, "apps/simulator/fixtures/sprint1/sprint1-input.json");
  const configRaw = readJson(configPath);
  const configResult = validateInitialWorldConfig(configRaw);
  if (!configResult.ok) {
    throw new Error(`preset config validation failed: ${JSON.stringify(configResult.issues)}`);
  }
  const sprint1Raw = readJson(inputPath);
  const sprint1Result = validateSprint1CliInput(sprint1Raw, sha256Provider);
  if (!sprint1Result.ok) {
    throw new Error(
      `preset sprint1-input validation failed: ${JSON.stringify(sprint1Result.issues)}`,
    );
  }
  const nameData = loadValidatedNameData({
    cwd: repoRoot,
    manifestPath: configResult.value.nameData.manifestPath,
    requiredVersion: configResult.value.nameData.requiredVersion,
    initialFamilyCount: configResult.value.families.initialFamilyCount,
    sha256Provider,
  });
  return {
    presetId: DEFAULT_SPRINT1_PRESET_ID,
    displayName: `Sprint 1 accepted (${configResult.value.profileId})`,
    config: configResult.value,
    sprint1CliInput: sprint1Result.value,
    sprint1CliInputForCreate: sprint1Raw,
    nameData,
  };
}

export function freezePresetRegistry(
  materialsList: readonly PresetMaterials[],
  sha256Provider: Sha256Provider = createNodeSha256Provider(),
): FrozenPresetRegistry {
  if (materialsList.length < 1) {
    throw new Error("preset registry requires at least one preset");
  }
  const ids = new Set<string>();
  const views: PresetView[] = [];
  const materialsById = new Map<string, PresetMaterials>();
  for (const materials of materialsList) {
    if (ids.has(materials.presetId)) {
      throw new Error(`duplicate presetId: ${materials.presetId}`);
    }
    ids.add(materials.presetId);
    const view = projectPresetView(materials, sha256Provider);
    views.push(view);
    materialsById.set(materials.presetId, materials);
  }
  views.sort((a, b) => (a.presetId < b.presetId ? -1 : a.presetId > b.presetId ? 1 : 0));
  Object.freeze(views);
  for (const view of views) {
    Object.freeze(view);
    Object.freeze(view.specVersions);
  }
  return {
    items: views,
    materialsById,
    getView(presetId: string) {
      return views.find((item) => item.presetId === presetId);
    },
    getMaterials(presetId: string) {
      return materialsById.get(presetId);
    },
  };
}

export function loadDefaultFrozenPresetRegistry(repoRoot: string): FrozenPresetRegistry {
  const materials = loadSprint1AcceptedPresetMaterials(repoRoot);
  return freezePresetRegistry([materials]);
}
