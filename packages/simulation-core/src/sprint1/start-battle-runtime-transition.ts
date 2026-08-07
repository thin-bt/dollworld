/**
 * `StartBattleRuntimeTransition` — the single uncommitted envelope holding both
 * advanced runtime states produced by a battle start (11 mini-spec §10 / §11 /
 * S01-005).
 *
 * There is deliberately no public "apply" function: the replacement happens
 * inside `commitRunBattlePlan` (12 §23.2) together with the BattleResult, the
 * person effects, and the event candidates.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { createSeededRng, importSeededRng } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleState } from "./battle-state.js";
import { START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION } from "./constants.js";
import {
  computeMatchIdGeneratorStateHash,
  reserveNextMatchId,
  validateMatchIdGeneratorState,
} from "./match-id-generator.js";
import type { MatchIdGeneratorState } from "./match-id-generator.js";
import {
  SHA256_HEX_PATTERN,
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireLiteralString,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";

export const START_BATTLE_RUNTIME_TRANSITION_HASH_INPUT_KEYS = [
  "schemaVersion",
  "expectedWorldRngStateHash",
  "expectedMatchIdGeneratorStateHash",
  "nextWorldRngState",
  "nextMatchIdGeneratorState",
] as const;

export const START_BATTLE_RUNTIME_TRANSITION_KEYS = [
  ...START_BATTLE_RUNTIME_TRANSITION_HASH_INPUT_KEYS,
  "transitionHash",
] as const;

export const START_BATTLE_RUNTIME_TRANSITION_CURRENT_KEYS = [
  "worldRngState",
  "matchIdGeneratorState",
] as const;

export type StartBattleRuntimeTransition = {
  schemaVersion: typeof START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION;
  expectedWorldRngStateHash: string;
  expectedMatchIdGeneratorStateHash: string;
  nextWorldRngState: SeededRngState;
  nextMatchIdGeneratorState: MatchIdGeneratorState;
  transitionHash: string;
};

export type StartBattleRuntimeTransitionHashInput = Omit<
  StartBattleRuntimeTransition,
  "transitionHash"
>;

/** Canonical hash of a validated `SeededRngState`; never called on raw input. */
export function computeSeededRngStateHash(
  state: SeededRngState,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(state), "/worldRngState");
}

export function computeStartBattleRuntimeTransitionHash(
  hashInput: StartBattleRuntimeTransitionHashInput,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(hashInput), "/transitionHash");
}

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

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

function snapshotCurrentRuntimeStates(
  current: unknown,
): ValidationResult<{ worldRngState: unknown; matchIdGeneratorState: unknown }> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(current, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "current runtime states must be a plain object",
              actual: current,
              expected: "{ worldRngState, matchIdGeneratorState }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, START_BATTLE_RUNTIME_TRANSITION_CURRENT_KEYS, "", issues);
  if (issues.length > 0) {
    return failure(issues);
  }
  return success({
    worldRngState: object["worldRngState"],
    matchIdGeneratorState: object["matchIdGeneratorState"],
  });
}

/** Structure only — declared digests are format-checked, never recomputed. */
export function preflightStartBattleRuntimeTransition(
  input: unknown,
): ValidationResult<StartBattleRuntimeTransition> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "StartBattleRuntimeTransition must be a plain object",
              actual: input,
              expected: "StartBattleRuntimeTransition",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, START_BATTLE_RUNTIME_TRANSITION_KEYS, "", issues);

  const schemaVersion = requireLiteralString(
    object,
    "schemaVersion",
    "",
    START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION,
    issues,
  );
  const expectedWorldRngStateHash = requireHashHex(object, "expectedWorldRngStateHash", issues);
  const expectedMatchIdGeneratorStateHash = requireHashHex(
    object,
    "expectedMatchIdGeneratorStateHash",
    issues,
  );
  const transitionHash = requireHashHex(object, "transitionHash", issues);

  let nextWorldRngState: SeededRngState | undefined;
  const rngResult = validateSeededRngState(object["nextWorldRngState"]);
  if (rngResult.ok) {
    nextWorldRngState = rngResult.value;
  } else {
    issues.push(...prefix(rngResult.issues, "/nextWorldRngState"));
  }

  let nextMatchIdGeneratorState: MatchIdGeneratorState | undefined;
  const generatorResult = validateMatchIdGeneratorState(object["nextMatchIdGeneratorState"]);
  if (generatorResult.ok) {
    nextMatchIdGeneratorState = generatorResult.value;
  } else {
    issues.push(...prefix(generatorResult.issues, "/nextMatchIdGeneratorState"));
  }

  if (
    schemaVersion === undefined ||
    expectedWorldRngStateHash === undefined ||
    expectedMatchIdGeneratorStateHash === undefined ||
    transitionHash === undefined ||
    nextWorldRngState === undefined ||
    nextMatchIdGeneratorState === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion,
      expectedWorldRngStateHash,
      expectedMatchIdGeneratorStateHash,
      nextWorldRngState,
      nextMatchIdGeneratorState,
      transitionHash,
    }),
  );
}

/** Recompute and verify `transitionHash` after structure preflight succeeded. */
export function verifyStartBattleRuntimeTransitionHashes(
  preflight: StartBattleRuntimeTransition,
  provider: Sha256Provider,
): ValidationResult<StartBattleRuntimeTransition> {
  const hashInput: StartBattleRuntimeTransitionHashInput = {
    schemaVersion: preflight.schemaVersion,
    expectedWorldRngStateHash: preflight.expectedWorldRngStateHash,
    expectedMatchIdGeneratorStateHash: preflight.expectedMatchIdGeneratorStateHash,
    nextWorldRngState: preflight.nextWorldRngState,
    nextMatchIdGeneratorState: preflight.nextMatchIdGeneratorState,
  };
  const computed = computeStartBattleRuntimeTransitionHash(hashInput, provider);
  if (!computed.ok) {
    return failure(computed.issues);
  }
  if (computed.value !== preflight.transitionHash) {
    return failure([
      {
        path: "/transitionHash",
        message:
          "transitionHash must equal the SHA-256 of the canonical transition minus transitionHash",
        actual: preflight.transitionHash,
        expected: computed.value,
      },
    ]);
  }
  return success(preflight);
}

/**
 * Descriptor-safe current runtime intake plus SeededRng / MatchId generator
 * structure (S01-005 Phase 1 for Against). Never calls Sha256Provider.
 */
export function preflightCurrentStartBattleRuntimeStates(current: unknown): ValidationResult<{
  worldRngState: SeededRngState;
  matchIdGeneratorState: MatchIdGeneratorState;
}> {
  const snapshotted = snapshotCurrentRuntimeStates(current);
  if (!snapshotted.ok) {
    return failure(prefix(snapshotted.issues, "/current"));
  }

  const issues: ValidationIssue[] = [];
  let worldRngState: SeededRngState | undefined;
  const rngResult = validateSeededRngState(snapshotted.value.worldRngState);
  if (rngResult.ok) {
    worldRngState = rngResult.value;
  } else {
    issues.push(...prefix(rngResult.issues, "/currentWorldRngState"));
  }

  let matchIdGeneratorState: MatchIdGeneratorState | undefined;
  const generatorResult = validateMatchIdGeneratorState(snapshotted.value.matchIdGeneratorState);
  if (generatorResult.ok) {
    matchIdGeneratorState = generatorResult.value;
  } else {
    issues.push(...prefix(generatorResult.issues, "/currentMatchIdGeneratorState"));
  }

  if (worldRngState === undefined || matchIdGeneratorState === undefined || issues.length > 0) {
    return failure(issues);
  }
  return success({ worldRngState, matchIdGeneratorState });
}

/** Structure and self-excluding `transitionHash` only (11 §10). */
export function validateStartBattleRuntimeTransition(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<StartBattleRuntimeTransition> {
  const preflight = preflightStartBattleRuntimeTransition(input);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }
  return verifyStartBattleRuntimeTransitionHashes(preflight.value, provider);
}

/**
 * Structure, `transitionHash`, expected-state hashes, and exact one-step next
 * states against the runtime state the caller still holds (11 §10 / §11).
 *
 * Order: current runtime descriptor + structure first, then provider hashes and
 * exact one-step checks.
 */
export function validateStartBattleRuntimeTransitionAgainst(
  input: unknown,
  currentInput: unknown,
  provider: Sha256Provider,
): ValidationResult<StartBattleRuntimeTransition> {
  const current = preflightCurrentStartBattleRuntimeStates(currentInput);
  if (!current.ok) {
    return failure(current.issues);
  }

  const preflight = preflightStartBattleRuntimeTransition(input);
  if (!preflight.ok) {
    return failure(preflight.issues);
  }

  const transition = verifyStartBattleRuntimeTransitionHashes(preflight.value, provider);
  if (!transition.ok) {
    return failure(transition.issues);
  }

  const issues: ValidationIssue[] = [];

  const currentHash = computeSeededRngStateHash(current.value.worldRngState, provider);
  if (!currentHash.ok) {
    issues.push(...currentHash.issues);
  } else if (currentHash.value !== transition.value.expectedWorldRngStateHash) {
    issues.push({
      path: "/expectedWorldRngStateHash",
      message: "the held world RNG state does not match the transition's expected state",
      actual: currentHash.value,
      expected: transition.value.expectedWorldRngStateHash,
    });
  } else {
    try {
      const rng = importSeededRng({ ...current.value.worldRngState });
      rng.nextUint32();
      const expectedNext = rng.exportState();
      if (toCanonicalJson(expectedNext) !== toCanonicalJson(transition.value.nextWorldRngState)) {
        issues.push({
          path: "/nextWorldRngState",
          message:
            "nextWorldRngState must equal the held world RNG advanced by exactly one nextUint32",
          actual: toCanonicalJson(transition.value.nextWorldRngState),
          expected: toCanonicalJson(expectedNext),
        });
      }
    } catch (error) {
      issues.push({
        path: "/currentWorldRngState",
        message:
          error instanceof Error
            ? error.message
            : "world RNG state could not be imported for exact-step verification",
        expected: "SeededRngState",
      });
    }
  }

  const currentGeneratorHash = computeMatchIdGeneratorStateHash(
    current.value.matchIdGeneratorState,
    provider,
  );
  if (!currentGeneratorHash.ok) {
    issues.push(...prefix(currentGeneratorHash.issues, "/currentMatchIdGeneratorState"));
  } else if (currentGeneratorHash.value !== transition.value.expectedMatchIdGeneratorStateHash) {
    issues.push({
      path: "/expectedMatchIdGeneratorStateHash",
      message: "the held MatchId generator state does not match the transition's expected state",
      actual: currentGeneratorHash.value,
      expected: transition.value.expectedMatchIdGeneratorStateHash,
    });
  } else {
    const reservation = reserveNextMatchId(current.value.matchIdGeneratorState);
    if (reservation.kind === "failure" || reservation.nextState === null) {
      issues.push(...prefix(reservation.issues, "/currentMatchIdGeneratorState"));
    } else if (
      toCanonicalJson(reservation.nextState) !==
      toCanonicalJson(transition.value.nextMatchIdGeneratorState)
    ) {
      issues.push({
        path: "/nextMatchIdGeneratorState",
        message:
          "nextMatchIdGeneratorState must equal exactly one MatchId reservation from the held state",
        actual: toCanonicalJson(transition.value.nextMatchIdGeneratorState),
        expected: toCanonicalJson(reservation.nextState),
      });
    }
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(transition.value);
}

/**
 * Internal consistency between an uncommitted start plan and the exact one-step
 * transition that produced it. Not exported from the package root.
 */
export function validateStartBattlePlanConsistency(
  battleState: BattleState,
  runtimeTransition: StartBattleRuntimeTransition,
  currentWorldRngState: unknown,
  currentMatchIdGeneratorState: unknown,
  provider: Sha256Provider,
): ValidationResult<true> {
  const against = validateStartBattleRuntimeTransitionAgainst(
    runtimeTransition,
    {
      worldRngState: currentWorldRngState,
      matchIdGeneratorState: currentMatchIdGeneratorState,
    },
    provider,
  );
  if (!against.ok) {
    return failure(against.issues);
  }

  const issues: ValidationIssue[] = [];
  const currentGenerator = validateMatchIdGeneratorState(currentMatchIdGeneratorState);
  if (!currentGenerator.ok) {
    return failure(prefix(currentGenerator.issues, "/currentMatchIdGeneratorState"));
  }
  const reservation = reserveNextMatchId(currentGenerator.value);
  if (reservation.kind === "failure" || reservation.matchId === null) {
    return failure(prefix(reservation.issues, "/currentMatchIdGeneratorState"));
  }
  if (battleState.matchId !== reservation.matchId) {
    issues.push({
      path: "/battleState/matchId",
      message: "BattleState.matchId must equal the MatchId reserved by the one-step transition",
      actual: battleState.matchId,
      expected: reservation.matchId,
    });
  }

  const currentRng = validateSeededRngState(currentWorldRngState);
  if (!currentRng.ok) {
    return failure(prefix(currentRng.issues, "/currentWorldRngState"));
  }
  let expectedSeed: number;
  try {
    const rng = importSeededRng({ ...currentRng.value });
    expectedSeed = rng.nextUint32();
  } catch (error) {
    return failure([
      {
        path: "/currentWorldRngState",
        message: error instanceof Error ? error.message : "world RNG state could not be imported",
        expected: "SeededRngState",
      },
    ]);
  }
  if (battleState.battleSeed !== expectedSeed) {
    issues.push({
      path: "/battleState/battleSeed",
      message: "BattleState.battleSeed must equal the single nextUint32 drawn for the transition",
      actual: battleState.battleSeed,
      expected: String(expectedSeed),
    });
  }

  const expectedBattleRng = createSeededRng(expectedSeed).exportState();
  if (toCanonicalJson(battleState.rngState) !== toCanonicalJson(expectedBattleRng)) {
    issues.push({
      path: "/battleState/rngState",
      message: "BattleState.rngState must equal the initial Battle RNG seeded from battleSeed",
      actual: toCanonicalJson(battleState.rngState),
      expected: toCanonicalJson(expectedBattleRng),
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }
  return success(true);
}

export function cloneStartBattleRuntimeTransition(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<StartBattleRuntimeTransition> {
  const validated = validateStartBattleRuntimeTransition(input, provider);
  if (!validated.ok) {
    return failure(validated.issues);
  }
  return success(deepFreezePlainJson(cloneValidatedPlainJson(validated.value)));
}

export function freezeStartBattleRuntimeTransition(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<StartBattleRuntimeTransition> {
  return validateStartBattleRuntimeTransition(input, provider);
}
