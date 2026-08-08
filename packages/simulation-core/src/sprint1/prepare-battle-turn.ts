/**
 * prepareBattleTurn — next turnNumber + Strategy stateView (12 §2 / S01-006).
 *
 * Pure / atomic: failure leaves the input BattleState unchanged and does not
 * advance RNG, actionSequence, or detailedLog.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { SeededRngState } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  preflightBattleStateStructure,
  preflightPreparedBattleStateViewStructure,
  validatePreparedBattleStateView,
  verifyBattleStateHashes,
} from "./battle-state.js";
import type { BattleFailureInfo, BattleState } from "./battle-state.js";
import {
  assertNoAccessors,
  cloneValidatedPlainJson,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireIntegerInRange,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import { safeHashUtf8 } from "./safe-sha256.js";
import { validateSeededRngState } from "./validate-seeded-rng-state.js";

export const PREPARE_BATTLE_TURN_INPUT_KEYS = ["battleState"] as const;

export const PREPARED_BATTLE_TURN_KEYS = [
  "baseBattleStateHash",
  "turnNumber",
  "stateView",
  "rngStateBeforeOrder",
] as const;

export type PreparedBattleTurn = {
  baseBattleStateHash: string;
  turnNumber: number;
  stateView: BattleState;
  rngStateBeforeOrder: SeededRngState;
};

export type PrepareBattleTurnValidation = {
  ok: boolean;
  issues: readonly ValidationIssue[];
};

export type PrepareBattleTurnResult =
  | {
      kind: "success";
      preparedTurn: PreparedBattleTurn;
      validation: PrepareBattleTurnValidation;
    }
  | {
      kind: "failure";
      failure: BattleFailureInfo;
      validation: PrepareBattleTurnValidation;
    };

function prepareFailure(
  issues: readonly ValidationIssue[],
  code = "prepare_battle_turn_failed",
): PrepareBattleTurnResult {
  const failureInfo: BattleFailureInfo = deepFreezePlainJson({
    code,
    severity: "error",
    targetIds: [],
    reason: issues.map((issue) => issue.message).join("; ") || "prepareBattleTurn failed",
    canContinue: false,
  });
  return {
    kind: "failure",
    failure: failureInfo,
    validation: { ok: false, issues },
  };
}

export function computeBattleStateCanonicalHash(
  state: BattleState,
  provider: Sha256Provider,
): ReturnType<typeof safeHashUtf8> {
  return safeHashUtf8(provider, toCanonicalJson(state), "/baseBattleStateHash");
}

/**
 * Phase A structure-only PreparedBattleTurn check (no Sha256Provider).
 * stateView uses PreparedTurn-only structure (turnNumber may be length+1).
 */
export function preflightPreparedBattleTurnStructure(
  input: unknown,
): ValidationResult<PreparedBattleTurn> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "PreparedBattleTurn must be a plain object",
              actual: input,
              expected: "PreparedBattleTurn",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, PREPARED_BATTLE_TURN_KEYS, "", issues);

  if (!hasOwn(object, "baseBattleStateHash") || typeof object["baseBattleStateHash"] !== "string") {
    issues.push({
      path: "/baseBattleStateHash",
      message: "baseBattleStateHash must be a SHA-256 hex string",
      actual: object["baseBattleStateHash"],
    });
  }
  const turnNumber = requireIntegerInRange(
    object,
    "turnNumber",
    "",
    1,
    Number.MAX_SAFE_INTEGER,
    issues,
  );
  const rngResult = validateSeededRngState(object["rngStateBeforeOrder"]);
  if (!rngResult.ok) {
    issues.push(
      ...rngResult.issues.map((issue) => ({
        ...issue,
        path: `/rngStateBeforeOrder${issue.path}`,
      })),
    );
  }
  const stateView = preflightPreparedBattleStateViewStructure(object["stateView"]);
  if (!stateView.ok) {
    issues.push(
      ...stateView.issues.map((issue) => ({ ...issue, path: `/stateView${issue.path}` })),
    );
  }
  if (
    typeof object["baseBattleStateHash"] !== "string" ||
    turnNumber === undefined ||
    !rngResult.ok ||
    !stateView.ok ||
    issues.length > 0
  ) {
    return failure(issues);
  }
  if (stateView.value.turnNumber !== turnNumber) {
    return failure([
      {
        path: "/stateView/turnNumber",
        message: "stateView.turnNumber must equal preparedTurn.turnNumber",
        actual: stateView.value.turnNumber,
        expected: String(turnNumber),
      },
    ]);
  }
  return success(
    deepFreezePlainJson({
      baseBattleStateHash: object["baseBattleStateHash"] as string,
      turnNumber,
      stateView: stateView.value,
      rngStateBeforeOrder: rngResult.value,
    }),
  );
}

export function validatePreparedBattleTurn(
  input: unknown,
  provider: Sha256Provider,
): ValidationResult<PreparedBattleTurn> {
  const structure = preflightPreparedBattleTurnStructure(input);
  if (!structure.ok) {
    return structure;
  }
  const stateView = validatePreparedBattleStateView(structure.value.stateView, provider);
  if (!stateView.ok) {
    return failure(
      stateView.issues.map((issue) => ({ ...issue, path: `/stateView${issue.path}` })),
    );
  }
  return success(
    deepFreezePlainJson({
      ...structure.value,
      stateView: stateView.value,
    }),
  );
}

/**
 * Bind preparedTurn against a verified input BattleState (Resolver Phase B).
 * expected stateView = buildPreparedStateView(battleState, turnNumber+1) only.
 */
export function bindPreparedBattleTurnToBattleState(
  preparedTurn: PreparedBattleTurn,
  battleState: BattleState,
  provider: Sha256Provider,
): ValidationResult<PreparedBattleTurn> {
  const expectedTurnNumber = battleState.turnNumber + 1;
  if (preparedTurn.turnNumber !== expectedTurnNumber) {
    return failure([
      {
        path: "/preparedTurn/turnNumber",
        message: "preparedTurn.turnNumber must equal battleState.turnNumber + 1",
        actual: preparedTurn.turnNumber,
        expected: String(expectedTurnNumber),
      },
    ]);
  }
  if (toCanonicalJson(preparedTurn.rngStateBeforeOrder) !== toCanonicalJson(battleState.rngState)) {
    return failure([
      {
        path: "/preparedTurn/rngStateBeforeOrder",
        message: "preparedTurn.rngStateBeforeOrder must equal battleState.rngState",
      },
    ]);
  }
  const baseHash = computeBattleStateCanonicalHash(battleState, provider);
  if (!baseHash.ok) {
    return baseHash;
  }
  if (preparedTurn.baseBattleStateHash !== baseHash.value) {
    return failure([
      {
        path: "/preparedTurn/baseBattleStateHash",
        message: "preparedTurn.baseBattleStateHash must match input BattleState canonical hash",
        actual: preparedTurn.baseBattleStateHash,
        expected: baseHash.value,
      },
    ]);
  }
  const expectedStateView = buildPreparedStateView(battleState, expectedTurnNumber);
  if (toCanonicalJson(preparedTurn.stateView) !== toCanonicalJson(expectedStateView)) {
    return failure([
      {
        path: "/preparedTurn/stateView",
        message:
          "preparedTurn.stateView must equal buildPreparedStateView(battleState, turnNumber+1) exactly",
      },
    ]);
  }
  if (
    preparedTurn.stateView.participantA.guarding !== false ||
    preparedTurn.stateView.participantA.evading !== false ||
    preparedTurn.stateView.participantB.guarding !== false ||
    preparedTurn.stateView.participantB.evading !== false
  ) {
    return failure([
      {
        path: "/preparedTurn/stateView",
        message: "preparedTurn.stateView guarding/evading must be false for both sides",
      },
    ]);
  }
  return success(preparedTurn);
}

/**
 * Build a Strategy-only stateView: clone of battleState with turnNumber advanced and
 * both participants' guarding/evading cleared. Does not mutate the input.
 */
export function buildPreparedStateView(battleState: BattleState, turnNumber: number): BattleState {
  const cloned = cloneValidatedPlainJson(battleState) as BattleState;
  return deepFreezePlainJson({
    ...cloned,
    turnNumber,
    participantA: {
      ...cloned.participantA,
      guarding: false,
      evading: false,
    },
    participantB: {
      ...cloned.participantB,
      guarding: false,
      evading: false,
    },
  });
}

export function prepareBattleTurn(
  input: unknown,
  provider: Sha256Provider,
): PrepareBattleTurnResult {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return prepareFailure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "PrepareBattleTurnInput must be a plain object",
              actual: input,
              expected: "{ battleState }",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, PREPARE_BATTLE_TURN_INPUT_KEYS, "", issues);
  if (issues.length > 0) {
    return prepareFailure(issues);
  }

  // Phase A: structure only (no provider.hash).
  const preflight = preflightBattleStateStructure(object["battleState"]);
  if (!preflight.ok) {
    return prepareFailure(preflight.issues, "invalid_battle_state_structure");
  }

  if (preflight.value.status !== "in_progress") {
    return prepareFailure(
      [
        {
          path: "/battleState/status",
          message: "prepareBattleTurn accepts status=in_progress only",
          actual: preflight.value.status,
          expected: "in_progress",
        },
      ],
      "battle_not_in_progress",
    );
  }

  const nextTurn = preflight.value.turnNumber + 1;
  if (nextTurn < 1 || nextTurn > preflight.value.maxTurns) {
    return prepareFailure(
      [
        {
          path: "/battleState/turnNumber",
          message: "next turnNumber must be within 1..maxTurns",
          actual: {
            current: preflight.value.turnNumber,
            next: nextTurn,
            maxTurns: preflight.value.maxTurns,
          },
          expected: `1..${String(preflight.value.maxTurns)}`,
        },
      ],
      "turn_out_of_range",
    );
  }

  // Phase B: hashes.
  const verified = verifyBattleStateHashes(preflight.value, provider);
  if (!verified.ok) {
    return prepareFailure(verified.issues, "battle_state_hash_mismatch");
  }

  const baseHash = computeBattleStateCanonicalHash(verified.value, provider);
  if (!baseHash.ok) {
    return prepareFailure(baseHash.issues, "battle_state_hash_failed");
  }

  const stateView = buildPreparedStateView(verified.value, nextTurn);
  const preparedTurn: PreparedBattleTurn = deepFreezePlainJson({
    baseBattleStateHash: baseHash.value,
    turnNumber: nextTurn,
    stateView,
    rngStateBeforeOrder: verified.value.rngState,
  });

  return {
    kind: "success",
    preparedTurn,
    validation: { ok: true, issues: [] },
  };
}
