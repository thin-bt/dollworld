import type { Sha256Provider } from "../sha256-provider.js";
import type { SimulationIdentity, Sprint2IdentityBindings } from "../sprint1/types.js";
import { SIMULATION_IDENTITY_SCHEMA_VERSION } from "../sprint1/constants.js";
import { createExpectedSpecVersions } from "../sprint1/simulation-identity.js";
import { createDefaultSprint2IdentityBindings } from "../sprint2/sprint2-identity-bindings.js";
import { createNodeSha256Provider } from "./name-data-loader.fixture.js";

let cachedBindings: Sprint2IdentityBindings | undefined;

export function createTestSprint2IdentityBindings(
  provider: Sha256Provider = createNodeSha256Provider(),
): Sprint2IdentityBindings {
  if (cachedBindings === undefined) {
    const result = createDefaultSprint2IdentityBindings(provider);
    if (!result.ok) {
      throw new Error("failed to create default Sprint2 identity bindings for tests");
    }
    cachedBindings = result.value;
  }
  return cachedBindings;
}

export function withDefaultSprint2BindingsForRunSessionInput<T extends Record<string, unknown>>(
  input: T,
  provider: Sha256Provider = createNodeSha256Provider(),
): T & { sprint2IdentityBindings: Sprint2IdentityBindings } {
  const bindings = createDefaultSprint2IdentityBindings(provider);
  if (!bindings.ok) {
    throw new Error("failed to create default Sprint2 identity bindings for run session input");
  }
  return {
    ...input,
    sprint2IdentityBindings: bindings.value,
  };
}

export function withTestSprint2IdentityFields(
  identity: Omit<
    SimulationIdentity,
    | "schemaVersion"
    | "sprint2ConfigVersion"
    | "sprint2ConfigHash"
    | "competitionDomainRegistryVersion"
    | "competitionDomainRegistryHash"
    | "derivedTieKeyPolicyVersion"
    | "tournamentIdGeneratorVersion"
    | "initialTournamentIdGeneratorStateHash"
  >,
  provider: Sha256Provider = createNodeSha256Provider(),
): SimulationIdentity {
  const bindings = createTestSprint2IdentityBindings(provider);
  return {
    ...identity,
    schemaVersion: SIMULATION_IDENTITY_SCHEMA_VERSION,
    sprint2ConfigVersion: bindings.sprint2ConfigVersion,
    sprint2ConfigHash: bindings.sprint2ConfigHash,
    competitionDomainRegistryVersion: bindings.competitionDomainRegistryVersion,
    competitionDomainRegistryHash: bindings.competitionDomainRegistryHash,
    derivedTieKeyPolicyVersion: bindings.derivedTieKeyPolicyVersion,
    tournamentIdGeneratorVersion: bindings.tournamentIdGeneratorVersion,
    initialTournamentIdGeneratorStateHash: bindings.initialTournamentIdGeneratorStateHash,
  };
}

export function buildTestSimulationIdentity(
  overrides: Partial<SimulationIdentity> = {},
  provider: Sha256Provider = createNodeSha256Provider(),
): SimulationIdentity {
  const hex = "a".repeat(64);
  return withTestSprint2IdentityFields(
    {
      seed: 12345,
      initialWorldConfigHash: hex,
      worldCalendarConfigHash: hex,
      yearStartProcessorManifestHash: hex,
      sprint1ConfigHash: hex,
      techniqueCatalogHash: hex,
      initialWeeklyTrainingSidecarHash: hex,
      battleProfileAdapterVersion: "battle-profile-adapter-0.1.0",
      matchIdGeneratorVersion: "match-id-generator-0.1.0",
      initialMatchIdGeneratorStateHash: hex,
      defaultBattleStrategyVersion: "default-battle-strategy-0.1.0",
      specVersions: createExpectedSpecVersions(),
      rngAlgorithmVersion: "xoshiro128ss-v1",
      canonicalJsonVersion: "canonical-json-v1",
      hashAlgorithm: "SHA-256",
      ...overrides,
    },
    provider,
  );
}
