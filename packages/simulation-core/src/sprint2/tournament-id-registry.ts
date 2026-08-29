/**
 * Deterministic empty TournamentId generator state (G069 / S2-SPEC-0.2.2-draft §8.2).
 * No allocator, reserve-next, seed derivation, or RNG consumption in S02-001.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
  TOURNAMENT_ID_GENERATOR_VERSION,
  TOURNAMENT_ID_NAMESPACE,
  TOURNAMENT_ID_SEQUENCE_MINIMUM,
} from "./constants.js";
import {
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireLiteralString,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type { TournamentIdGeneratorState } from "./types.js";

export const TOURNAMENT_ID_GENERATOR_STATE_KEYS = [
  "schemaVersion",
  "generatorVersion",
  "namespace",
  "nextSequence",
] as const;

function buildState(nextSequence: number): TournamentIdGeneratorState {
  return {
    schemaVersion: TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
    generatorVersion: TOURNAMENT_ID_GENERATOR_VERSION,
    namespace: TOURNAMENT_ID_NAMESPACE,
    nextSequence,
  };
}

export function createInitialTournamentIdGeneratorState(): ValidationResult<TournamentIdGeneratorState> {
  return success(deepFreezePlainJson(buildState(TOURNAMENT_ID_SEQUENCE_MINIMUM)));
}

export function validateTournamentIdGeneratorState(
  input: unknown,
): ValidationResult<TournamentIdGeneratorState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  rejectUnknownKeys(object, TOURNAMENT_ID_GENERATOR_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
    issues,
  );
  const generatorVersion = requireLiteralString(
    object,
    "generatorVersion",
    "",
    TOURNAMENT_ID_GENERATOR_VERSION,
    issues,
  );
  const namespace = requireLiteralString(
    object,
    "namespace",
    "",
    TOURNAMENT_ID_NAMESPACE,
    issues,
  );
  const nextSequence = requireIntegerInRange(
    object,
    "nextSequence",
    "",
    TOURNAMENT_ID_SEQUENCE_MINIMUM,
    Number.MAX_SAFE_INTEGER,
    issues,
  );

  if (
    schemaVersion === undefined ||
    generatorVersion === undefined ||
    namespace === undefined ||
    nextSequence === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(deepFreezePlainJson(buildState(nextSequence)));
}

export function computeTournamentIdGeneratorStateHash(
  state: TournamentIdGeneratorState,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(state), "/tournamentIdGeneratorStateHash");
}

export function cloneTournamentIdGeneratorState(
  input: unknown,
): ValidationResult<TournamentIdGeneratorState> {
  const validated = validateTournamentIdGeneratorState(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson({ ...validated.value }));
}
