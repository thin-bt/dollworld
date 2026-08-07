/**
 * Deterministic `match-id-generator-0.1.0` MatchId generator (00 mini-spec §3
 * "MatchId（Sprint 1）", 11 mini-spec §3 / S1-SPEC-0.1.13 / S01-005).
 *
 * The generator is a pure counter over an opaque `MatchIdGeneratorState` whose
 * canonical field set is exactly the five keys below. It consumes no RNG: the
 * `seed` field only binds a state to a run (`initialMatchIdGeneratorStateHash`)
 * and is never mixed into the MatchId text, so two runs with different seeds
 * legitimately emit the same `match_000000000001`.
 *
 * `reserveNextMatchId` is an internal pre-commit stage: it never mutates its
 * input, and the caller must discard the reservation unless the whole battle
 * commit plan succeeds (11 §10, 12 §23.2).
 */
import { toCanonicalJson } from "../canonical-json.js";
import { asMatchId } from "../ids.js";
import type { MatchId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
} from "./constants.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireIntegerInRange,
  requireLiteralString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";

/** Exactly the canonical field set; any other key is rejected (00 §3). */
export const MATCH_ID_GENERATOR_STATE_KEYS = [
  "schemaVersion",
  "generatorVersion",
  "namespace",
  "seed",
  "nextSequence",
] as const;

export const CREATE_INITIAL_MATCH_ID_GENERATOR_STATE_KEYS = [
  "seed",
  "generatorVersion",
  "namespace",
] as const;

export const MATCH_ID_FORMAT_PATTERN = /^match_[0-9]{12}$/;
export const MATCH_ID_SEQUENCE_DIGITS = 12;
export const MATCH_ID_SEQUENCE_MINIMUM = 1;
export const MATCH_ID_SEQUENCE_MAXIMUM = 999_999_999_999;
/** Valid, terminal state: no further MatchId can be issued from it (00 §3). */
export const MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL = 1_000_000_000_000;
export const MATCH_ID_SEED_MINIMUM = 0;
export const MATCH_ID_SEED_MAXIMUM = 4294967295;
export const MATCH_ID_SEQUENCE_EXHAUSTED_CODE = "match_id_sequence_exhausted" as const;
export const MATCH_ID_GENERATOR_STATE_INVALID_CODE = "match_id_generator_state_invalid" as const;

export type MatchIdGeneratorState = {
  schemaVersion: typeof MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION;
  generatorVersion: typeof MATCH_ID_GENERATOR_VERSION;
  namespace: typeof MATCH_ID_NAMESPACE;
  seed: number;
  nextSequence: number;
};

export type CreateInitialMatchIdGeneratorStateInput = {
  seed: number;
  generatorVersion: typeof MATCH_ID_GENERATOR_VERSION;
  namespace: typeof MATCH_ID_NAMESPACE;
};

export type ReserveNextMatchIdResult =
  | {
      kind: "success";
      matchId: MatchId;
      nextState: MatchIdGeneratorState;
      code: null;
      issues: readonly ValidationIssue[];
    }
  | {
      kind: "failure";
      matchId: null;
      nextState: null;
      code: typeof MATCH_ID_SEQUENCE_EXHAUSTED_CODE | typeof MATCH_ID_GENERATOR_STATE_INVALID_CODE;
      issues: readonly ValidationIssue[];
    };

function buildState(seed: number, nextSequence: number): MatchIdGeneratorState {
  return {
    schemaVersion: MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
    seed,
    nextSequence,
  };
}

/** `match_` + zero-padded 12-digit decimal. The prefix carries no match semantics. */
export function formatMatchIdFromSequence(sequence: number): MatchId {
  if (
    !Number.isSafeInteger(sequence) ||
    sequence < MATCH_ID_SEQUENCE_MINIMUM ||
    sequence > MATCH_ID_SEQUENCE_MAXIMUM
  ) {
    throw new Error(
      `MatchId sequence must be an integer within ${String(MATCH_ID_SEQUENCE_MINIMUM)}..${String(MATCH_ID_SEQUENCE_MAXIMUM)} (got ${String(sequence)})`,
    );
  }
  return asMatchId(`match_${String(sequence).padStart(MATCH_ID_SEQUENCE_DIGITS, "0")}`);
}

/** Format check plus the `1..999999999999` numeric band (`match_000000000000` is invalid). */
export function isMatchIdText(value: unknown): value is string {
  if (typeof value !== "string" || !MATCH_ID_FORMAT_PATTERN.test(value)) {
    return false;
  }
  const sequence = Number(value.slice("match_".length));
  return (
    Number.isSafeInteger(sequence) &&
    sequence >= MATCH_ID_SEQUENCE_MINIMUM &&
    sequence <= MATCH_ID_SEQUENCE_MAXIMUM
  );
}

export function validateMatchId(input: unknown): ValidationResult<MatchId> {
  if (!isMatchIdText(input)) {
    return failure([
      {
        path: "",
        message: "MatchId must match ^match_[0-9]{12}$ with a numeric part within 1..999999999999",
        actual: input,
        expected: "match_<12-digit decimal>",
      },
    ]);
  }
  return success(asMatchId(input));
}

export function validateMatchIdGeneratorState(
  input: unknown,
): ValidationResult<MatchIdGeneratorState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "MatchIdGeneratorState must be a plain object",
              actual: input,
              expected: "MatchIdGeneratorState",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, MATCH_ID_GENERATOR_STATE_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
    issues,
  );
  const generatorVersion = requireLiteralString(
    object,
    "generatorVersion",
    "",
    MATCH_ID_GENERATOR_VERSION,
    issues,
  );
  const namespace = requireLiteralString(object, "namespace", "", MATCH_ID_NAMESPACE, issues);
  const seed = requireIntegerInRange(
    object,
    "seed",
    "",
    MATCH_ID_SEED_MINIMUM,
    MATCH_ID_SEED_MAXIMUM,
    issues,
  );
  const nextSequence = requireIntegerInRange(
    object,
    "nextSequence",
    "",
    MATCH_ID_SEQUENCE_MINIMUM,
    MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL,
    issues,
  );

  if (
    schemaVersion === undefined ||
    generatorVersion === undefined ||
    namespace === undefined ||
    seed === undefined ||
    nextSequence === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(deepFreezePlainJson(buildState(seed, nextSequence)));
}

/**
 * Fresh-run initial state (00 §3): `nextSequence` is always 1 and can never be
 * injected from an external counter or a previous run's state.
 */
export function createInitialMatchIdGeneratorState(
  input: unknown,
): ValidationResult<MatchIdGeneratorState> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "createInitialMatchIdGeneratorState input must be a plain object",
              actual: input,
              expected: "{ seed, generatorVersion, namespace }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, CREATE_INITIAL_MATCH_ID_GENERATOR_STATE_KEYS, "", issues);

  const seed = requireIntegerInRange(
    object,
    "seed",
    "",
    MATCH_ID_SEED_MINIMUM,
    MATCH_ID_SEED_MAXIMUM,
    issues,
  );
  const generatorVersion = requireLiteralString(
    object,
    "generatorVersion",
    "",
    MATCH_ID_GENERATOR_VERSION,
    issues,
  );
  const namespace = requireLiteralString(object, "namespace", "", MATCH_ID_NAMESPACE, issues);

  if (
    seed === undefined ||
    generatorVersion === undefined ||
    namespace === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(deepFreezePlainJson(buildState(seed, MATCH_ID_SEQUENCE_MINIMUM)));
}

export function cloneMatchIdGeneratorState(
  input: unknown,
): ValidationResult<MatchIdGeneratorState> {
  const validated = validateMatchIdGeneratorState(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeMatchIdGeneratorState(
  input: unknown,
): ValidationResult<MatchIdGeneratorState> {
  return validateMatchIdGeneratorState(input);
}

/**
 * `initialMatchIdGeneratorStateHash` material (00 §3): SHA-256 of the canonical
 * JSON of the five-key state. Structurally invalid input never calls `provider`.
 */
export function computeMatchIdGeneratorStateHash(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<string> {
  const validated = validateMatchIdGeneratorState(input);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return safeHashUtf8(provider, toCanonicalJson(validated.value), "");
}

/**
 * Internal pre-commit reservation stage (00 §3, 11 §10 step 2). Never exported
 * from the package root: only `startBattleTransaction` may reserve, and the
 * reservation is discarded unless the whole commit plan succeeds.
 *
 * Consumes no RNG and does not mutate `state`; re-running it on the same
 * committed state re-issues the identical MatchId.
 */
export function reserveNextMatchId(state: unknown): ReserveNextMatchIdResult {
  const validated = validateMatchIdGeneratorState(state);
  if (!validated.ok) {
    return {
      kind: "failure",
      matchId: null,
      nextState: null,
      code: MATCH_ID_GENERATOR_STATE_INVALID_CODE,
      issues: validated.issues,
    };
  }

  const current = validated.value;
  if (current.nextSequence === MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL) {
    return {
      kind: "failure",
      matchId: null,
      nextState: null,
      code: MATCH_ID_SEQUENCE_EXHAUSTED_CODE,
      issues: [
        {
          path: "/nextSequence",
          message: "MatchId sequence is exhausted; no further MatchId can be issued",
          actual: current.nextSequence,
          expected: `${String(MATCH_ID_SEQUENCE_MINIMUM)}..${String(MATCH_ID_SEQUENCE_MAXIMUM)}`,
        },
      ],
    };
  }

  return {
    kind: "success",
    matchId: formatMatchIdFromSequence(current.nextSequence),
    nextState: deepFreezePlainJson(buildState(current.seed, current.nextSequence + 1)),
    code: null,
    issues: [],
  };
}
