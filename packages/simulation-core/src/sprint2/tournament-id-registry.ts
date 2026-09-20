/**
 * Deterministic TournamentId generator state (G069 / S02-001 empty registry, S02-002 allocator).
 * No wall clock, UUID, process-global counter, World RNG, Battle RNG, MatchId counter, or event counter.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asTournamentId } from "../ids.js";
import type { TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  TOURNAMENT_ID_FORMAT_PATTERN,
  TOURNAMENT_ID_GENERATOR_STATE_INVALID_CODE,
  TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
  TOURNAMENT_ID_GENERATOR_VERSION,
  TOURNAMENT_ID_NAMESPACE,
  TOURNAMENT_ID_SEQUENCE_DIGITS,
  TOURNAMENT_ID_SEQUENCE_EXHAUSTED_CODE,
  TOURNAMENT_ID_SEQUENCE_EXHAUSTED_SENTINEL,
  TOURNAMENT_ID_SEQUENCE_MAXIMUM,
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

export type ReserveNextTournamentIdResult =
  | {
      kind: "success";
      tournamentId: TournamentId;
      nextState: TournamentIdGeneratorState;
      code: null;
      issues: readonly ValidationIssue[];
    }
  | {
      kind: "failure";
      tournamentId: null;
      nextState: null;
      code:
        | typeof TOURNAMENT_ID_SEQUENCE_EXHAUSTED_CODE
        | typeof TOURNAMENT_ID_GENERATOR_STATE_INVALID_CODE;
      issues: readonly ValidationIssue[];
    };

function buildState(nextSequence: number): TournamentIdGeneratorState {
  return {
    schemaVersion: TOURNAMENT_ID_GENERATOR_STATE_SCHEMA_VERSION,
    generatorVersion: TOURNAMENT_ID_GENERATOR_VERSION,
    namespace: TOURNAMENT_ID_NAMESPACE,
    nextSequence,
  };
}

/** `tournament_` + zero-padded 12-digit decimal. The prefix carries no tournament semantics. */
export function formatTournamentIdFromSequence(sequence: number): TournamentId {
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < TOURNAMENT_ID_SEQUENCE_MINIMUM ||
    sequence > TOURNAMENT_ID_SEQUENCE_MAXIMUM
  ) {
    throw new Error(
      `TournamentId sequence must be an integer within ${String(TOURNAMENT_ID_SEQUENCE_MINIMUM)}..${String(TOURNAMENT_ID_SEQUENCE_MAXIMUM)} (got ${String(sequence)})`,
    );
  }
  return asTournamentId(
    `tournament_${String(sequence).padStart(TOURNAMENT_ID_SEQUENCE_DIGITS, "0")}`,
  );
}

export function isTournamentIdText(value: unknown): value is string {
  if (typeof value !== "string" || !TOURNAMENT_ID_FORMAT_PATTERN.test(value)) {
    return false;
  }
  const sequence = Number(value.slice("tournament_".length));
  return (
    Number.isSafeInteger(sequence) &&
    sequence >= TOURNAMENT_ID_SEQUENCE_MINIMUM &&
    sequence <= TOURNAMENT_ID_SEQUENCE_MAXIMUM
  );
}

export function validateTournamentId(input: unknown): ValidationResult<TournamentId> {
  if (!isTournamentIdText(input)) {
    return failure([
      {
        path: "",
        message:
          "TournamentId must match ^tournament_[0-9]{12}$ with a numeric part within 1..999999999999",
        actual: input,
        expected: "tournament_<12-digit decimal>",
      },
    ]);
  }
  return success(asTournamentId(input));
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
  const namespace = requireLiteralString(object, "namespace", "", TOURNAMENT_ID_NAMESPACE, issues);
  const nextSequence = requireIntegerInRange(
    object,
    "nextSequence",
    "",
    TOURNAMENT_ID_SEQUENCE_MINIMUM,
    TOURNAMENT_ID_SEQUENCE_EXHAUSTED_SENTINEL,
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

/**
 * Internal pre-commit reservation stage. Never mutates `state`; callers must discard
 * the reservation unless the whole schedule commit succeeds.
 */
export function reserveNextTournamentId(state: unknown): ReserveNextTournamentIdResult {
  const validated = validateTournamentIdGeneratorState(state);
  if (!validated.ok) {
    return {
      kind: "failure",
      tournamentId: null,
      nextState: null,
      code: TOURNAMENT_ID_GENERATOR_STATE_INVALID_CODE,
      issues: validated.issues,
    };
  }

  const current = validated.value;
  if (current.nextSequence === TOURNAMENT_ID_SEQUENCE_EXHAUSTED_SENTINEL) {
    return {
      kind: "failure",
      tournamentId: null,
      nextState: null,
      code: TOURNAMENT_ID_SEQUENCE_EXHAUSTED_CODE,
      issues: [
        {
          path: "/nextSequence",
          message: "TournamentId sequence is exhausted; no further TournamentId can be issued",
          actual: current.nextSequence,
          expected: `${String(TOURNAMENT_ID_SEQUENCE_MINIMUM)}..${String(TOURNAMENT_ID_SEQUENCE_MAXIMUM)}`,
        },
      ],
    };
  }

  return {
    kind: "success",
    tournamentId: formatTournamentIdFromSequence(current.nextSequence),
    nextState: deepFreezePlainJson(buildState(current.nextSequence + 1)),
    code: null,
    issues: [],
  };
}
