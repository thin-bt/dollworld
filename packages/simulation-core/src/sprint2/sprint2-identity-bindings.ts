/**
 * Sprint2 identity binding helpers for SimulationIdentity / RunRuleSnapshot extension.
 */
import type { Sha256Provider } from "../sha256-provider.js";
import type { Sprint2IdentityBindings } from "../sprint1/types.js";
import { failure, success } from "../validation.js";
import type { ValidationResult } from "../validation.js";
import {
  createDefaultCompetitionDomainRegistryInput,
  finalizeCompetitionDomainRegistry,
} from "./competition-domain.js";
import {
  DERIVED_TIE_KEY_POLICY_VERSION,
  SPRINT2_CONFIG_VERSION_DEFAULT,
  TOURNAMENT_ID_GENERATOR_VERSION,
} from "./constants.js";
import {
  computeTournamentIdGeneratorStateHash,
  createInitialTournamentIdGeneratorState,
} from "./tournament-id-registry.js";
import { computeSprint2ConfigHash, createDefaultSprint2Config } from "./validate-sprint2-config.js";

export function createDefaultSprint2IdentityBindings(
  provider: Sha256Provider,
): ValidationResult<Sprint2IdentityBindings> {
  const sprint2ConfigResult = createDefaultSprint2Config(provider);
  if (!sprint2ConfigResult.ok) {
    return sprint2ConfigResult;
  }
  const sprint2ConfigHashResult = computeSprint2ConfigHash(sprint2ConfigResult.value, provider);
  if (!sprint2ConfigHashResult.ok) {
    return sprint2ConfigHashResult;
  }

  const registryResult = finalizeCompetitionDomainRegistry(
    createDefaultCompetitionDomainRegistryInput(),
    provider,
  );
  if (!registryResult.ok) {
    return registryResult;
  }

  const initialStateResult = createInitialTournamentIdGeneratorState();
  if (!initialStateResult.ok) {
    return initialStateResult;
  }
  const initialStateHashResult = computeTournamentIdGeneratorStateHash(
    initialStateResult.value,
    provider,
  );
  if (!initialStateHashResult.ok) {
    return initialStateHashResult;
  }

  return success({
    sprint2ConfigVersion: SPRINT2_CONFIG_VERSION_DEFAULT,
    sprint2ConfigHash: sprint2ConfigHashResult.value,
    competitionDomainRegistryVersion: registryResult.value.registryVersion,
    competitionDomainRegistryHash: registryResult.value.registryHash,
    derivedTieKeyPolicyVersion: DERIVED_TIE_KEY_POLICY_VERSION,
    tournamentIdGeneratorVersion: TOURNAMENT_ID_GENERATOR_VERSION,
    initialTournamentIdGeneratorStateHash: initialStateHashResult.value,
  });
}

export function validateSprint2IdentityBindings(
  input: unknown,
): ValidationResult<Sprint2IdentityBindings> {
  if (typeof input !== "object" || input === null) {
    return failure([
      {
        path: "",
        message: "Sprint2IdentityBindings must be a plain object",
        actual: input,
        expected: "object",
      },
    ]);
  }
  const object = input as Record<string, unknown>;
  const requiredStringKeys = [
    "sprint2ConfigVersion",
    "sprint2ConfigHash",
    "competitionDomainRegistryVersion",
    "competitionDomainRegistryHash",
    "derivedTieKeyPolicyVersion",
    "tournamentIdGeneratorVersion",
    "initialTournamentIdGeneratorStateHash",
  ] as const;
  for (const key of requiredStringKeys) {
    if (typeof object[key] !== "string" || object[key].length === 0) {
      return failure([
        {
          path: `/${key}`,
          message: "required non-empty string is missing",
          actual: object[key],
          expected: "string",
        },
      ]);
    }
  }
  return success({
    sprint2ConfigVersion: object.sprint2ConfigVersion as string,
    sprint2ConfigHash: object.sprint2ConfigHash as string,
    competitionDomainRegistryVersion:
      object.competitionDomainRegistryVersion as Sprint2IdentityBindings["competitionDomainRegistryVersion"],
    competitionDomainRegistryHash: object.competitionDomainRegistryHash as string,
    derivedTieKeyPolicyVersion:
      object.derivedTieKeyPolicyVersion as Sprint2IdentityBindings["derivedTieKeyPolicyVersion"],
    tournamentIdGeneratorVersion:
      object.tournamentIdGeneratorVersion as Sprint2IdentityBindings["tournamentIdGeneratorVersion"],
    initialTournamentIdGeneratorStateHash: object.initialTournamentIdGeneratorStateHash as string,
  });
}
