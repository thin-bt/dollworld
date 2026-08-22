import {
  computeConfigHash,
  computeInitialWeeklyTrainingSidecarHash,
  computeNameDataHash,
  toCanonicalJson,
  validateInitialWeeklyTrainingSidecarSnapshot,
  validateInitialWorldConfig,
  validateNameData,
  validateNameDataManifest,
  validateSimulationIdentity,
  type InitialWorldConfig,
  type InitialWeeklyTrainingSidecarSnapshot,
  type RunRuleSnapshot,
  type SimulationIdentity,
  type Sprint1RunSession,
  type ValidatedNameData,
} from "@shared-world/simulation-core";
import { createNodeSha256Provider } from "./presets.js";

export const RUN_INITIALIZATION_SNAPSHOT_SCHEMA_VERSION = "0.2.0" as const;

export const RUN_INITIALIZATION_SNAPSHOT_KEYS = [
  "schemaVersion",
  "presetId",
  "seed",
  "initialWorldConfig",
  "initialWorldConfigHash",
  "validatedNameData",
  "nameDataVersion",
  "nameDataHash",
  "simulationIdentity",
  "simulationIdentityHash",
  "runRuleSnapshot",
  "runRuleSnapshotHash",
  "initialWeeklyTrainingSidecarSnapshot",
] as const;

export type RunInitializationSnapshot = {
  readonly schemaVersion: typeof RUN_INITIALIZATION_SNAPSHOT_SCHEMA_VERSION;
  readonly presetId: string;
  readonly seed: number;
  readonly initialWorldConfig: InitialWorldConfig;
  readonly initialWorldConfigHash: string;
  readonly validatedNameData: ValidatedNameData;
  readonly nameDataVersion: string;
  readonly nameDataHash: string;
  readonly simulationIdentity: SimulationIdentity;
  readonly simulationIdentityHash: string;
  readonly runRuleSnapshot: RunRuleSnapshot;
  readonly runRuleSnapshotHash: string;
  readonly initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot;
};

export type CanonicalObject = Record<string, unknown>;

function asCanonicalObject(value: unknown): CanonicalObject {
  return JSON.parse(toCanonicalJson(value)) as CanonicalObject;
}

function cloneSidecar(
  sidecar: InitialWeeklyTrainingSidecarSnapshot,
): InitialWeeklyTrainingSidecarSnapshot {
  return JSON.parse(toCanonicalJson(sidecar)) as InitialWeeklyTrainingSidecarSnapshot;
}

export function buildRunInitializationSnapshot(input: {
  presetId: string;
  seed: number;
  config: InitialWorldConfig;
  nameData: ValidatedNameData;
  session: Sprint1RunSession;
}): RunInitializationSnapshot {
  const sha256 = createNodeSha256Provider();
  const initialWorldConfigHash = computeConfigHash(input.config, sha256);
  const nameDataHash = computeNameDataHash(input.nameData.manifest, sha256);
  const identity = input.session.context.simulationIdentity;
  const identityValidated = validateSimulationIdentity(identity);
  if (!identityValidated.ok) {
    throw new Error(
      "simulationIdentity failed validation while building RunInitializationSnapshot",
    );
  }
  if (input.session.context.simulationIdentityHash.length !== 64) {
    throw new Error("simulationIdentityHash invalid");
  }
  if (input.session.context.runRuleSnapshotHash.length !== 64) {
    throw new Error("runRuleSnapshotHash invalid");
  }
  if (identity.initialWorldConfigHash !== initialWorldConfigHash) {
    throw new Error("initialWorldConfigHash mismatch vs SimulationIdentity");
  }
  if (identity.seed !== input.seed) {
    throw new Error("seed mismatch vs SimulationIdentity");
  }

  const sidecarValidated = validateInitialWeeklyTrainingSidecarSnapshot(
    input.session.context.initialWeeklyTrainingSidecarSnapshot,
  );
  if (!sidecarValidated.ok) {
    throw new Error("initialWeeklyTrainingSidecarSnapshot invalid while building RunInit");
  }
  const sidecar = cloneSidecar(sidecarValidated.value);
  const sidecarHashResult = computeInitialWeeklyTrainingSidecarHash(sidecar, sha256);
  if (!sidecarHashResult.ok) {
    throw new Error("initialWeeklyTrainingSidecarSnapshot hash computation failed");
  }
  if (sidecarHashResult.value !== identityValidated.value.initialWeeklyTrainingSidecarHash) {
    throw new Error("initialWeeklyTrainingSidecarSnapshot hash mismatch vs SimulationIdentity");
  }

  return {
    schemaVersion: RUN_INITIALIZATION_SNAPSHOT_SCHEMA_VERSION,
    presetId: input.presetId,
    seed: input.seed,
    initialWorldConfig: JSON.parse(toCanonicalJson(input.config)) as InitialWorldConfig,
    initialWorldConfigHash,
    validatedNameData: JSON.parse(toCanonicalJson(input.nameData)) as ValidatedNameData,
    nameDataVersion: input.nameData.manifest.nameDataVersion,
    nameDataHash,
    simulationIdentity: JSON.parse(toCanonicalJson(identityValidated.value)) as SimulationIdentity,
    simulationIdentityHash: input.session.context.simulationIdentityHash,
    runRuleSnapshot: JSON.parse(
      toCanonicalJson(input.session.context.runRuleSnapshot),
    ) as RunRuleSnapshot,
    runRuleSnapshotHash: input.session.context.runRuleSnapshotHash,
    initialWeeklyTrainingSidecarSnapshot: sidecar,
  };
}

export function runInitializationSnapshotsEqual(
  a: RunInitializationSnapshot,
  b: RunInitializationSnapshot,
): boolean {
  return toCanonicalJson(a) === toCanonicalJson(b);
}

export function validateRunInitializationSnapshot(
  input: unknown,
): { ok: true; value: RunInitializationSnapshot } | { ok: false; message: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, message: "RunInitializationSnapshot must be an object" };
  }
  const row = input as Record<string, unknown>;
  const keys = Object.keys(row);
  if (keys.length !== RUN_INITIALIZATION_SNAPSHOT_KEYS.length) {
    return { ok: false, message: "RunInitializationSnapshot key set mismatch" };
  }
  for (const key of RUN_INITIALIZATION_SNAPSHOT_KEYS) {
    if (!(key in row)) {
      return { ok: false, message: `missing ${key}` };
    }
  }
  for (const key of keys) {
    if (!(RUN_INITIALIZATION_SNAPSHOT_KEYS as readonly string[]).includes(key)) {
      return { ok: false, message: `unknown field ${key}` };
    }
  }
  if (row.schemaVersion !== RUN_INITIALIZATION_SNAPSHOT_SCHEMA_VERSION) {
    return { ok: false, message: "schemaVersion mismatch" };
  }
  if (typeof row.presetId !== "string" || row.presetId.length === 0) {
    return { ok: false, message: "presetId invalid" };
  }
  if (
    typeof row.seed !== "number" ||
    !Number.isInteger(row.seed) ||
    row.seed < 0 ||
    row.seed > 4294967295
  ) {
    return { ok: false, message: "seed invalid" };
  }
  const sha256 = createNodeSha256Provider();
  const configResult = validateInitialWorldConfig(row.initialWorldConfig);
  if (!configResult.ok) {
    return { ok: false, message: "initialWorldConfig invalid" };
  }
  const configHash = computeConfigHash(configResult.value, sha256);
  if (configHash !== row.initialWorldConfigHash) {
    return { ok: false, message: "initialWorldConfigHash mismatch" };
  }
  const nameRaw = row.validatedNameData;
  if (typeof nameRaw !== "object" || nameRaw === null) {
    return { ok: false, message: "validatedNameData invalid" };
  }
  const nameObj = nameRaw as Record<string, unknown>;
  const manifestResult = validateNameDataManifest(nameObj["manifest"]);
  if (!manifestResult.ok) {
    return { ok: false, message: "nameData manifest invalid" };
  }
  const nameValidated = validateNameData({
    manifest: manifestResult.value,
    familyNames: nameObj["familyNames"],
    maleGivenNames: nameObj["maleGivenNames"],
    femaleGivenNames: nameObj["femaleGivenNames"],
    neutralGivenNames: nameObj["neutralGivenNames"],
    requiredVersion: configResult.value.nameData.requiredVersion,
    initialFamilyCount: configResult.value.families.initialFamilyCount,
    sha256Provider: sha256,
  });
  if (!nameValidated.ok) {
    return { ok: false, message: "validatedNameData invalid" };
  }
  const nameHash = computeNameDataHash(nameValidated.value.manifest, sha256);
  if (
    nameHash !== row.nameDataHash ||
    nameValidated.value.manifest.nameDataVersion !== row.nameDataVersion
  ) {
    return { ok: false, message: "nameData hash/version mismatch" };
  }
  const identityResult = validateSimulationIdentity(row.simulationIdentity);
  if (!identityResult.ok) {
    return { ok: false, message: "simulationIdentity invalid" };
  }
  if (identityResult.value.seed !== row.seed) {
    return { ok: false, message: "identity seed mismatch" };
  }
  if (identityResult.value.initialWorldConfigHash !== configHash) {
    return { ok: false, message: "identity config hash mismatch" };
  }
  const runRule = row.runRuleSnapshot as RunRuleSnapshot;
  if (
    typeof runRule !== "object" ||
    runRule === null ||
    typeof row.runRuleSnapshotHash !== "string" ||
    row.runRuleSnapshotHash !== runRule.runRuleSnapshotHash
  ) {
    return { ok: false, message: "runRuleSnapshot hash mismatch" };
  }
  if (
    toCanonicalJson(configResult.value.worldCalendar) !== toCanonicalJson(runRule.worldCalendar)
  ) {
    return { ok: false, message: "worldCalendar mismatch" };
  }
  if (runRule.worldCalendarConfigHash !== identityResult.value.worldCalendarConfigHash) {
    return { ok: false, message: "worldCalendarConfigHash mismatch" };
  }
  if (typeof row.simulationIdentityHash !== "string" || row.simulationIdentityHash.length !== 64) {
    return { ok: false, message: "simulationIdentityHash invalid" };
  }

  const sidecarResult = validateInitialWeeklyTrainingSidecarSnapshot(
    row.initialWeeklyTrainingSidecarSnapshot,
  );
  if (!sidecarResult.ok) {
    return { ok: false, message: "initialWeeklyTrainingSidecarSnapshot invalid" };
  }
  const sidecarHashResult = computeInitialWeeklyTrainingSidecarHash(sidecarResult.value, sha256);
  if (!sidecarHashResult.ok) {
    return { ok: false, message: "initialWeeklyTrainingSidecarSnapshot hash invalid" };
  }
  if (sidecarHashResult.value !== identityResult.value.initialWeeklyTrainingSidecarHash) {
    return {
      ok: false,
      message: "initialWeeklyTrainingSidecarSnapshot hash mismatch vs SimulationIdentity",
    };
  }

  return {
    ok: true,
    value: {
      schemaVersion: RUN_INITIALIZATION_SNAPSHOT_SCHEMA_VERSION,
      presetId: row.presetId,
      seed: row.seed,
      initialWorldConfig: configResult.value,
      initialWorldConfigHash: configHash,
      validatedNameData: nameValidated.value,
      nameDataVersion: nameValidated.value.manifest.nameDataVersion,
      nameDataHash: nameHash,
      simulationIdentity: identityResult.value,
      simulationIdentityHash: row.simulationIdentityHash,
      runRuleSnapshot: JSON.parse(toCanonicalJson(runRule)) as RunRuleSnapshot,
      runRuleSnapshotHash: row.runRuleSnapshotHash,
      initialWeeklyTrainingSidecarSnapshot: cloneSidecar(sidecarResult.value),
    },
  };
}

/**
 * Map saved exact RunInit 0.2.0 fields (including sidecar payload) into
 * createSprint1RunSessionFromRunInitializationMaterials input.
 * Does not accept current runtime/context sidecar.
 */
export function buildReconstructionMaterialsFromRunInitializationSnapshot(
  snapshot: RunInitializationSnapshot,
): {
  seed: number;
  config: InitialWorldConfig;
  nameData: ValidatedNameData;
  simulationIdentity: SimulationIdentity;
  simulationIdentityHash: string;
  runRuleSnapshot: RunRuleSnapshot;
  runRuleSnapshotHash: string;
  initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot;
} {
  return {
    seed: snapshot.seed,
    config: snapshot.initialWorldConfig,
    nameData: snapshot.validatedNameData,
    simulationIdentity: snapshot.simulationIdentity,
    simulationIdentityHash: snapshot.simulationIdentityHash,
    runRuleSnapshot: snapshot.runRuleSnapshot,
    runRuleSnapshotHash: snapshot.runRuleSnapshotHash,
    initialWeeklyTrainingSidecarSnapshot: snapshot.initialWeeklyTrainingSidecarSnapshot,
  };
}

export function snapshotToCanonicalWire(snapshot: RunInitializationSnapshot): CanonicalObject {
  return asCanonicalObject(snapshot);
}
