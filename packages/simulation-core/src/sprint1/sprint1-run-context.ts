/**
 * Sprint1RunContext — immutable per-run fixed materials (S1-SPEC-0.1.20).
 * Created once at fresh initialization; never mutated by week/battle transactions.
 * Dependencies (Sha256Provider, paths, loggers, clocks) are NOT canonical fields.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { SimulationId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { MATCH_ID_GENERATOR_VERSION, MATCH_ID_NAMESPACE } from "./constants.js";
import {
  computeInitialWeeklyTrainingSidecarHash,
  validateInitialWeeklyTrainingSidecarSnapshot,
  type InitialWeeklyTrainingSidecarSnapshot,
} from "./initial-weekly-training-sidecar.js";
import {
  computeMatchIdGeneratorStateHash,
  createInitialMatchIdGeneratorState,
} from "./match-id-generator.js";
import {
  SHA256_HEX_PATTERN,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import {
  computeSimulationIdentityHash,
  createSimulationIdFromIdentity,
  validateSimulationIdentity,
} from "./simulation-identity.js";
import {
  buildRunRuleSnapshotHashInput,
  computeRunRuleSnapshotHash,
  validateRunRuleSnapshotAgainstIdentity,
  type RunRuleSnapshot,
} from "./run-rule-snapshot.js";
import {
  computeTechniqueCatalogHash,
  validateTechniqueCatalog,
  type TechniqueCatalog,
} from "./technique-catalog.js";
import type { SimulationIdentity, Sprint1Config } from "./types.js";
import { validateNormalizedSprint1Config } from "./validate-sprint1-config.js";

export const SPRINT1_RUN_CONTEXT_KEYS = [
  "sprint1Config",
  "techniqueCatalog",
  "initialWeeklyTrainingSidecarSnapshot",
  "simulationIdentity",
  "simulationIdentityHash",
  "simulationId",
  "runRuleSnapshot",
  "runRuleSnapshotHash",
] as const;

export type Sprint1RunContext = {
  readonly sprint1Config: Sprint1Config;
  readonly techniqueCatalog: TechniqueCatalog;
  readonly initialWeeklyTrainingSidecarSnapshot: InitialWeeklyTrainingSidecarSnapshot;
  readonly simulationIdentity: SimulationIdentity;
  readonly simulationIdentityHash: string;
  readonly simulationId: SimulationId;
  readonly runRuleSnapshot: RunRuleSnapshot;
  readonly runRuleSnapshotHash: string;
};

export type ValidateSprint1RunContextInput = {
  sprint1Config: unknown;
  techniqueCatalog: unknown;
  initialWeeklyTrainingSidecarSnapshot: unknown;
  simulationIdentity: unknown;
  simulationIdentityHash: unknown;
  simulationId: unknown;
  runRuleSnapshot: unknown;
  runRuleSnapshotHash: unknown;
};

function mismatch(
  path: string,
  message: string,
  actual: unknown,
  expected: unknown,
): ValidationIssue {
  return { path, message, actual, expected: String(expected) };
}

/**
 * Validate and freeze an immutable Sprint1RunContext with full cross-references.
 * Fresh initial MatchIdGeneratorState is rebuilt internally from SimulationIdentity.seed
 * (never taken from runtime current nextSequence).
 */
export function validateSprint1RunContext(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunContext> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "Sprint1RunContext must be a plain object",
              actual: input,
              expected: "Sprint1RunContext",
            },
          ],
    );
  }
  rejectUnknownKeys(object, SPRINT1_RUN_CONTEXT_KEYS, "", issues);
  for (const key of SPRINT1_RUN_CONTEXT_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({
        path: `/${key}`,
        message: "required key is missing",
        expected: key,
      });
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  return createSprint1RunContext(
    {
      sprint1Config: object["sprint1Config"],
      techniqueCatalog: object["techniqueCatalog"],
      initialWeeklyTrainingSidecarSnapshot: object["initialWeeklyTrainingSidecarSnapshot"],
      simulationIdentity: object["simulationIdentity"],
      simulationIdentityHash: object["simulationIdentityHash"],
      simulationId: object["simulationId"],
      runRuleSnapshot: object["runRuleSnapshot"],
      runRuleSnapshotHash: object["runRuleSnapshotHash"],
    },
    provider,
  );
}

/**
 * Build Sprint1RunContext from validated parts + cross-reference checks.
 */
export function createSprint1RunContext(
  input: ValidateSprint1RunContextInput,
  provider: Sha256Provider,
): ValidationResult<Sprint1RunContext> {
  const configResult = validateNormalizedSprint1Config(input.sprint1Config);
  if (!configResult.ok) {
    return failure(
      configResult.issues.map((issue) => ({
        ...issue,
        path: `/sprint1Config${issue.path}`,
      })),
    );
  }

  const catalogResult = validateTechniqueCatalog(input.techniqueCatalog, provider);
  if (!catalogResult.ok) {
    return failure(
      catalogResult.issues.map((issue) => ({
        ...issue,
        path: `/techniqueCatalog${issue.path}`,
      })),
    );
  }

  const sidecarResult = validateInitialWeeklyTrainingSidecarSnapshot(
    input.initialWeeklyTrainingSidecarSnapshot,
  );
  if (!sidecarResult.ok) {
    return failure(
      sidecarResult.issues.map((issue) => ({
        ...issue,
        path: `/initialWeeklyTrainingSidecarSnapshot${issue.path}`,
      })),
    );
  }

  const identityResult = validateSimulationIdentity(input.simulationIdentity);
  if (!identityResult.ok) {
    return failure(
      identityResult.issues.map((issue) => ({
        ...issue,
        path: `/simulationIdentity${issue.path}`,
      })),
    );
  }

  if (
    typeof input.simulationIdentityHash !== "string" ||
    !SHA256_HEX_PATTERN.test(input.simulationIdentityHash)
  ) {
    return failure([
      mismatch(
        "/simulationIdentityHash",
        "simulationIdentityHash must be a 64 lowercase hex character SHA-256 digest",
        input.simulationIdentityHash,
        "64 lowercase hex chars",
      ),
    ]);
  }

  if (typeof input.simulationId !== "string") {
    return failure([
      mismatch(
        "/simulationId",
        "simulationId must be a string",
        input.simulationId,
        "SimulationId",
      ),
    ]);
  }

  if (
    typeof input.runRuleSnapshotHash !== "string" ||
    !SHA256_HEX_PATTERN.test(input.runRuleSnapshotHash)
  ) {
    return failure([
      mismatch(
        "/runRuleSnapshotHash",
        "runRuleSnapshotHash must be a 64 lowercase hex character SHA-256 digest",
        input.runRuleSnapshotHash,
        "64 lowercase hex chars",
      ),
    ]);
  }

  const configHashResult = safeHashUtf8(
    provider,
    toCanonicalJson(configResult.value),
    "/sprint1Config",
  );
  if (!configHashResult.ok) {
    return failure(
      configHashResult.issues.map((issue) => ({
        ...issue,
        path: `/sprint1Config${issue.path}`,
      })),
    );
  }
  if (configHashResult.value !== identityResult.value.sprint1ConfigHash) {
    return failure([
      mismatch(
        "/sprint1Config",
        "sprint1Config hash must equal simulationIdentity.sprint1ConfigHash",
        configHashResult.value,
        identityResult.value.sprint1ConfigHash,
      ),
    ]);
  }

  const catalogHashResult = computeTechniqueCatalogHash(catalogResult.value.definitions, provider);
  if (!catalogHashResult.ok) {
    return failure(
      catalogHashResult.issues.map((issue) => ({
        ...issue,
        path: `/techniqueCatalog${issue.path}`,
      })),
    );
  }
  if (catalogHashResult.value !== identityResult.value.techniqueCatalogHash) {
    return failure([
      mismatch(
        "/techniqueCatalog",
        "techniqueCatalog hash must equal simulationIdentity.techniqueCatalogHash",
        catalogHashResult.value,
        identityResult.value.techniqueCatalogHash,
      ),
    ]);
  }
  if (catalogHashResult.value !== catalogResult.value.identity.catalogHash) {
    return failure([
      mismatch(
        "/techniqueCatalog/identity/catalogHash",
        "techniqueCatalog.identity.catalogHash must match computed catalog hash",
        catalogResult.value.identity.catalogHash,
        catalogHashResult.value,
      ),
    ]);
  }

  const sidecarHashResult = computeInitialWeeklyTrainingSidecarHash(sidecarResult.value, provider);
  if (!sidecarHashResult.ok) {
    return failure(
      sidecarHashResult.issues.map((issue) => ({
        ...issue,
        path: `/initialWeeklyTrainingSidecarSnapshot${issue.path}`,
      })),
    );
  }
  if (sidecarHashResult.value !== identityResult.value.initialWeeklyTrainingSidecarHash) {
    return failure([
      mismatch(
        "/initialWeeklyTrainingSidecarSnapshot",
        "sidecar hash must equal simulationIdentity.initialWeeklyTrainingSidecarHash",
        sidecarHashResult.value,
        identityResult.value.initialWeeklyTrainingSidecarHash,
      ),
    ]);
  }

  const computedIdentityHash = computeSimulationIdentityHash(identityResult.value, provider);
  if (!computedIdentityHash.ok) {
    return failure(
      computedIdentityHash.issues.map((issue) => ({
        ...issue,
        path: `/simulationIdentity${issue.path}`,
      })),
    );
  }
  if (computedIdentityHash.value !== input.simulationIdentityHash) {
    return failure([
      mismatch(
        "/simulationIdentityHash",
        "simulationIdentityHash must equal canonical SimulationIdentity hash",
        input.simulationIdentityHash,
        computedIdentityHash.value,
      ),
    ]);
  }

  const computedSimulationId = createSimulationIdFromIdentity(identityResult.value, provider);
  if (!computedSimulationId.ok) {
    return failure(
      computedSimulationId.issues.map((issue) => ({
        ...issue,
        path: `/simulationId${issue.path}`,
      })),
    );
  }
  if (computedSimulationId.value !== input.simulationId) {
    return failure([
      mismatch(
        "/simulationId",
        "simulationId must equal SimulationIdentity-derived id",
        input.simulationId,
        computedSimulationId.value,
      ),
    ]);
  }

  // Rebuild fresh initial MatchId state from identity seed — never use runtime current state.
  const freshMatchIdStateResult = createInitialMatchIdGeneratorState({
    seed: identityResult.value.seed,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
  });
  if (!freshMatchIdStateResult.ok) {
    return failure(
      freshMatchIdStateResult.issues.map((issue) => ({
        ...issue,
        path: `/simulationIdentity/seed${issue.path}`,
      })),
    );
  }
  const freshMatchIdHash = computeMatchIdGeneratorStateHash(
    freshMatchIdStateResult.value,
    provider,
  );
  if (!freshMatchIdHash.ok) {
    return failure(
      freshMatchIdHash.issues.map((issue) => ({
        ...issue,
        path: `/simulationIdentity/initialMatchIdGeneratorStateHash${issue.path}`,
      })),
    );
  }
  if (freshMatchIdHash.value !== identityResult.value.initialMatchIdGeneratorStateHash) {
    return failure([
      mismatch(
        "/simulationIdentity/initialMatchIdGeneratorStateHash",
        "fresh MatchIdGeneratorState hash must equal SimulationIdentity.initialMatchIdGeneratorStateHash",
        freshMatchIdHash.value,
        identityResult.value.initialMatchIdGeneratorStateHash,
      ),
    ]);
  }

  const against = validateRunRuleSnapshotAgainstIdentity(
    input.runRuleSnapshot,
    identityResult.value,
    input.simulationIdentityHash,
    freshMatchIdStateResult.value,
    provider,
  );
  if (!against.ok) {
    return failure(
      against.issues.map((issue) => ({
        ...issue,
        path: issue.path.startsWith("/runRuleSnapshot")
          ? issue.path
          : `/runRuleSnapshot${issue.path}`,
      })),
    );
  }

  const hashInput = buildRunRuleSnapshotHashInput(against.value);
  const computedSnapshotHash = computeRunRuleSnapshotHash(hashInput, provider);
  if (!computedSnapshotHash.ok) {
    return failure(
      computedSnapshotHash.issues.map((issue) => ({
        ...issue,
        path: `/runRuleSnapshotHash${issue.path}`,
      })),
    );
  }
  if (computedSnapshotHash.value !== input.runRuleSnapshotHash) {
    return failure([
      mismatch(
        "/runRuleSnapshotHash",
        "runRuleSnapshotHash must equal RunRuleSnapshot canonical hash",
        input.runRuleSnapshotHash,
        computedSnapshotHash.value,
      ),
    ]);
  }
  if (against.value.runRuleSnapshotHash !== input.runRuleSnapshotHash) {
    return failure([
      mismatch(
        "/runRuleSnapshot/runRuleSnapshotHash",
        "runRuleSnapshot.runRuleSnapshotHash must equal context.runRuleSnapshotHash",
        against.value.runRuleSnapshotHash,
        input.runRuleSnapshotHash,
      ),
    ]);
  }
  if (against.value.simulationId !== input.simulationId) {
    return failure([
      mismatch(
        "/runRuleSnapshot/simulationId",
        "runRuleSnapshot.simulationId must equal context.simulationId",
        against.value.simulationId,
        input.simulationId,
      ),
    ]);
  }
  if (against.value.simulationIdentityHash !== input.simulationIdentityHash) {
    return failure([
      mismatch(
        "/runRuleSnapshot/simulationIdentityHash",
        "runRuleSnapshot.simulationIdentityHash must equal context.simulationIdentityHash",
        against.value.simulationIdentityHash,
        input.simulationIdentityHash,
      ),
    ]);
  }

  return success(
    deepFreezePlainJson({
      sprint1Config: configResult.value,
      techniqueCatalog: catalogResult.value,
      initialWeeklyTrainingSidecarSnapshot: sidecarResult.value,
      simulationIdentity: identityResult.value,
      simulationIdentityHash: input.simulationIdentityHash,
      simulationId: computedSimulationId.value,
      runRuleSnapshot: against.value,
      runRuleSnapshotHash: input.runRuleSnapshotHash,
    }),
  );
}
