/**
 * `startBattleTransaction` — the pure, uncommitted battle start plan
 * (11 mini-spec §10 / §11 / S01-005).
 *
 * Deliberately not exported from the package root: the only public battle entry
 * point in Sprint 1 is `runBattleToCompletion` (12 §2), and the runtime states
 * produced here may only be replaced inside `commitRunBattlePlan`.
 *
 * Fixed three-phase order:
 * 1. Structure / semantics / references — zero Sha256Provider calls
 * 2. Hash verification — first provider use; still zero World RNG / MatchId consume
 * 3. Consume clones — MatchId reserve, World RNG nextUint32 once, create / begin /
 *    RuntimeTransition
 * Any failure returns nulls and leaves the caller's runtime states untouched.
 */
import { importSeededRng } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleStartedEventCandidate } from "./battle-started-event.js";
import type { BattleState } from "./battle-state.js";
import { beginBattle } from "./begin-battle.js";
import type { BattleStartValidation } from "./begin-battle.js";
import { START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION } from "./constants.js";
import {
  createBattleState,
  preflightCreateBattleRequest,
  verifyCreateBattleRequestHashes,
} from "./create-battle-state.js";
import {
  cloneMatchIdGeneratorState,
  computeMatchIdGeneratorStateHash,
  reserveNextMatchId,
} from "./match-id-generator.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  rejectUnknownKeys,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import {
  computeSeededRngStateHash,
  computeStartBattleRuntimeTransitionHash,
  validateStartBattlePlanConsistency,
  validateStartBattleRuntimeTransition,
} from "./start-battle-runtime-transition.js";
import type { StartBattleRuntimeTransition } from "./start-battle-runtime-transition.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";

export const START_BATTLE_INPUT_KEYS = [
  "createBattleRequest",
  "worldRngState",
  "matchIdGeneratorState",
] as const;

export type StartBattleInput = {
  createBattleRequest: unknown;
  worldRngState: unknown;
  matchIdGeneratorState: unknown;
};

export type StartBattleResult =
  | {
      kind: "success";
      battleState: BattleState;
      runtimeTransition: StartBattleRuntimeTransition;
      battleStartedEventCandidate: BattleStartedEventCandidate;
      validation: BattleStartValidation;
    }
  | {
      kind: "failure";
      battleState: null;
      runtimeTransition: null;
      battleStartedEventCandidate: null;
      validation: BattleStartValidation;
    };

function startBattleFailure(issues: readonly ValidationIssue[]): StartBattleResult {
  return {
    kind: "failure",
    battleState: null,
    runtimeTransition: null,
    battleStartedEventCandidate: null,
    validation: { ok: false, issues },
  };
}

function prefix(issues: readonly ValidationIssue[], at: string): ValidationIssue[] {
  return issues.map((issue) => ({ ...issue, path: `${at}${issue.path}` }));
}

function snapshotStartBattleInput(input: unknown): ValidationResult<StartBattleInput> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "StartBattleInput must be a plain object",
              actual: input,
              expected: "{ createBattleRequest, worldRngState, matchIdGeneratorState }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, START_BATTLE_INPUT_KEYS, "", issues);
  if (issues.length > 0) {
    return failure(issues);
  }
  return success({
    createBattleRequest: object["createBattleRequest"],
    worldRngState: object["worldRngState"],
    matchIdGeneratorState: object["matchIdGeneratorState"],
  });
}

/** One uint32 from a clone of the world RNG; the caller's state is never touched. */
function drawBattleSeed(
  worldRngState: SeededRngState,
): ValidationResult<{ battleSeed: number; nextWorldRngState: SeededRngState }> {
  let rng;
  try {
    rng = importSeededRng({ ...worldRngState });
  } catch (error) {
    return failure([
      {
        path: "/worldRngState",
        message: error instanceof Error ? error.message : "world RNG state could not be imported",
        actual: worldRngState,
        expected: "SeededRngState",
      },
    ]);
  }
  const battleSeed = rng.nextUint32();
  return success({ battleSeed, nextWorldRngState: rng.exportState() });
}

export function startBattleTransaction(
  input: unknown,
  provider: Sha256Provider,
): StartBattleResult {
  const root = snapshotStartBattleInput(input);
  if (!root.ok) {
    return startBattleFailure(root.issues);
  }

  // Phase 1: structure / semantic / reference validation only. Zero Sha256Provider
  // calls. No MatchId reservation and no World RNG draw.
  const worldRng = validateSeededRngState(root.value.worldRngState);
  if (!worldRng.ok) {
    return startBattleFailure(prefix(worldRng.issues, "/worldRngState"));
  }

  const generatorClone = cloneMatchIdGeneratorState(root.value.matchIdGeneratorState);
  if (!generatorClone.ok) {
    return startBattleFailure(prefix(generatorClone.issues, "/matchIdGeneratorState"));
  }

  const requestPreflight = preflightCreateBattleRequest(root.value.createBattleRequest);
  if (!requestPreflight.ok) {
    return startBattleFailure(prefix(requestPreflight.issues, "/createBattleRequest"));
  }

  // Phase 2: hashes only after Phase 1 succeeded. Still zero consume.
  const requestValidation = verifyCreateBattleRequestHashes(requestPreflight.value, provider);
  if (!requestValidation.ok) {
    return startBattleFailure(prefix(requestValidation.issues, "/createBattleRequest"));
  }

  const expectedWorldRngStateHash = computeSeededRngStateHash(worldRng.value, provider);
  if (!expectedWorldRngStateHash.ok) {
    return startBattleFailure(prefix(expectedWorldRngStateHash.issues, "/worldRngState"));
  }
  const expectedMatchIdGeneratorStateHash = computeMatchIdGeneratorStateHash(
    generatorClone.value,
    provider,
  );
  if (!expectedMatchIdGeneratorStateHash.ok) {
    return startBattleFailure(
      prefix(expectedMatchIdGeneratorStateHash.issues, "/matchIdGeneratorState"),
    );
  }

  // Phase 3: consume clones only after every hash succeeded.
  const reservation = reserveNextMatchId(generatorClone.value);
  if (reservation.kind === "failure") {
    return startBattleFailure(prefix(reservation.issues, "/matchIdGeneratorState"));
  }

  const seedDraw = drawBattleSeed(worldRng.value);
  if (!seedDraw.ok) {
    return startBattleFailure(seedDraw.issues);
  }

  const readyState = createBattleState(
    {
      createBattleRequest: requestValidation.value,
      reservedMatchId: reservation.matchId,
      battleSeed: seedDraw.value.battleSeed,
    },
    provider,
  );
  if (!readyState.ok) {
    return startBattleFailure(readyState.issues);
  }

  const begun = beginBattle(readyState.value, provider);
  if (begun.kind === "failure") {
    return startBattleFailure(begun.validation.issues);
  }

  const transitionHashInput = {
    schemaVersion: START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION,
    expectedWorldRngStateHash: expectedWorldRngStateHash.value,
    expectedMatchIdGeneratorStateHash: expectedMatchIdGeneratorStateHash.value,
    nextWorldRngState: seedDraw.value.nextWorldRngState,
    nextMatchIdGeneratorState: reservation.nextState,
  } as const;

  const transitionHash = computeStartBattleRuntimeTransitionHash(transitionHashInput, provider);
  if (!transitionHash.ok) {
    return startBattleFailure(prefix(transitionHash.issues, "/runtimeTransition"));
  }

  const transition = validateStartBattleRuntimeTransition(
    {
      ...transitionHashInput,
      transitionHash: transitionHash.value,
    },
    provider,
  );
  if (!transition.ok) {
    return startBattleFailure(prefix(transition.issues, "/runtimeTransition"));
  }

  const consistency = validateStartBattlePlanConsistency(
    begun.battleState,
    transition.value,
    root.value.worldRngState,
    root.value.matchIdGeneratorState,
    provider,
  );
  if (!consistency.ok) {
    return startBattleFailure(consistency.issues);
  }

  return {
    kind: "success",
    battleState: deepFreezePlainJson(begun.battleState),
    runtimeTransition: deepFreezePlainJson(transition.value),
    battleStartedEventCandidate: deepFreezePlainJson(begun.eventCandidate),
    validation: { ok: true, issues: [] },
  };
}
