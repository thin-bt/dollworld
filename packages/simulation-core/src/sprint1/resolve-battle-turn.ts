/**
 * resolveBattleTurn — 3-phase structure → hash → clone-local execution (12 / S01-006).
 *
 * eventCandidates is always [] for S01-006 (no per-turn World events).
 * Does not implement BattleResult / runBattleToCompletion / WorldEngine.
 */
import { importSeededRng } from "../rng.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import type { BattleAction } from "./battle-action.js";
import {
  getBattleActionFromScript,
  validateCanonicalBattleActionScriptString,
  computeActionScriptHash,
} from "./battle-action-script.js";
import { validateScriptedBothSideBinding } from "./battle-action-script-binding.js";
import {
  cancelSecondActionAsOpponentEnded,
  replaceIllegalBattleAction,
} from "./battle-action-replacement.js";
import { priorityForResolvedAction, resolveActionOrder } from "./battle-action-order.js";
import { validateBattleActionsSource } from "./battle-actions-source.js";
import type { BattleActionsSource } from "./battle-actions-source.js";
import { ACTION_TRAITS_KEYS } from "./technique-enums.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import {
  preflightBattleStateStructure,
  validateBattleState,
  verifyBattleStateHashes,
} from "./battle-state.js";
import type { BattleFailureInfo, BattleState } from "./battle-state.js";
import { validateBattleStateReplayConsistency } from "./battle-detailed-log-replay.js";
import {
  bindPreparedBattleTurnToBattleState,
  preflightPreparedBattleTurnStructure,
  validatePreparedBattleTurn,
} from "./prepare-battle-turn.js";
import type { PreparedBattleTurn } from "./prepare-battle-turn.js";
import { preflightRunRuleSnapshotStructure, validateRunRuleSnapshot } from "./run-rule-snapshot.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import { deriveDefaultStrategyRequest } from "./derive-battle-action-request.js";
import type { BattleActionLog, BattleTurnOrderLog } from "./battle-turn-logs.js";
import { applyMentalRecovery, resolveFocusMindAtTurnEnd } from "./battle-focus-mind.js";
import { battleEndedAfterAction } from "./battle-surrender.js";
import { applyTerminalIfNeeded } from "./battle-terminal.js";
import {
  accumulateTurnDamageTotals,
  markPreferredAttack,
  selectAdvantageSide,
} from "./battle-turn-aggregate.js";
import {
  assertNoAccessors,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import type { BattleSide } from "./battle-enums.js";
import type { BattleRange } from "./types.js";
import {
  mutableParticipant,
  opponentOf,
  participantOf,
  resolveOneAction,
  speedModifierFor,
  techniqueFor,
  type ActionResolveContext,
  type StrategyMeta,
  type WorkingState,
} from "./battle-action-resolution.js";

export const RESOLVE_BATTLE_TURN_INPUT_KEYS = [
  "battleState",
  "preparedTurn",
  "runRuleSnapshot",
  "participantAActionsSource",
  "participantBActionsSource",
] as const;

export type ResolveBattleTurnValidation = {
  ok: boolean;
  issues: readonly ValidationIssue[];
};

export type ResolveBattleTurnResult =
  | {
      kind: "success";
      battleState: BattleState;
      eventCandidates: readonly [];
      validation: ResolveBattleTurnValidation;
    }
  | {
      kind: "failure";
      failure: BattleFailureInfo;
      validation: ResolveBattleTurnValidation;
    };

function resolveFailure(
  issues: readonly ValidationIssue[],
  code = "resolve_battle_turn_failed",
): ResolveBattleTurnResult {
  return {
    kind: "failure",
    failure: deepFreezePlainJson({
      code,
      severity: "error",
      targetIds: [],
      reason: issues.map((i) => i.message).join("; ") || "resolveBattleTurn failed",
      canContinue: false,
    }),
    validation: { ok: false, issues },
  };
}

function identitiesEqual(
  a: BattleState["participantAActionSourceIdentity"],
  b: BattleActionsSource["identity"],
): boolean {
  return (
    a.kind === b.kind &&
    a.strategyId === b.strategyId &&
    a.strategyVersion === b.strategyVersion &&
    a.strategyConfigHash === b.strategyConfigHash &&
    a.scriptFormatVersion === b.scriptFormatVersion &&
    a.actionScriptHash === b.actionScriptHash
  );
}

function rejectReservedTraits(definitions: readonly TechniqueDefinition[]): ValidationResult<true> {
  for (const definition of definitions) {
    for (const key of ACTION_TRAITS_KEYS) {
      if (definition.actionTraits[key] !== false) {
        return failure([
          {
            path: `/techniqueDefinitions/${definition.techniqueId}/actionTraits/${key}`,
            message: "reserved actionTraits must be literal false in Sprint 1",
            actual: definition.actionTraits[key],
            expected: "false",
          },
        ]);
      }
    }
  }
  return success(true);
}

function obtainRequestedAction(
  source: BattleActionsSource,
  preparedTurn: PreparedBattleTurn,
  side: BattleSide,
  snapshot: RunRuleSnapshot,
  catalog: ReadonlyMap<string, TechniqueDefinition>,
  provider: Sha256Provider,
): ValidationResult<{
  action: BattleAction;
  meta: StrategyMeta;
  strategyReturnedNoAction: boolean;
}> {
  if (source.identity.kind === "scripted_actions") {
    const scripted = source as Extract<
      BattleActionsSource,
      { identity: { kind: "scripted_actions" } }
    >;
    const parsed = validateCanonicalBattleActionScriptString(
      scripted.canonicalScript,
      snapshot.sprint1Config.battle.maxTurns,
    );
    if (!parsed.ok) {
      return failure(parsed.issues);
    }
    const hash = computeActionScriptHash(parsed.value.canonicalScript, provider);
    if (!hash.ok) {
      return failure(hash.issues);
    }
    if (hash.value !== source.identity.actionScriptHash) {
      return failure([
        {
          path: "/actionScriptHash",
          message: "script hash mismatch",
          actual: source.identity.actionScriptHash,
          expected: hash.value,
        },
      ]);
    }
    const action = getBattleActionFromScript(parsed.value.script, preparedTurn.turnNumber, side);
    if (!action.ok) {
      return failure(action.issues);
    }
    return success({
      action: action.value,
      meta: { strategySeed: null, strategyCandidateScores: null, strategyTieBreakUsed: null },
      strategyReturnedNoAction: false,
    });
  }

  const actor =
    side === "sideA" ? preparedTurn.stateView.participantA : preparedTurn.stateView.participantB;
  const opponent =
    side === "sideA" ? preparedTurn.stateView.participantB : preparedTurn.stateView.participantA;

  return deriveDefaultStrategyRequest({
    actorSide: side,
    actor,
    opponent,
    range: preparedTurn.stateView.range,
    turnNumber: preparedTurn.turnNumber,
    battleSeed: preparedTurn.stateView.battleSeed,
    stateView: preparedTurn.stateView,
    snapshot,
    catalog,
  });
}

export function resolveBattleTurn(
  input: unknown,
  provider: Sha256Provider,
): ResolveBattleTurnResult {
  // ---------- Phase A: structure (provider.calls must stay 0) ----------
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(input, "", issues);
  if (object === undefined) {
    return resolveFailure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "ResolveBattleTurnInput must be a plain object",
              actual: input,
              expected: "ResolveBattleTurnInput",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, RESOLVE_BATTLE_TURN_INPUT_KEYS, "", issues);
  for (const key of RESOLVE_BATTLE_TURN_INPUT_KEYS) {
    if (!hasOwn(object, key)) {
      issues.push({ path: `/${key}`, message: "required key is missing" });
    }
  }
  if (issues.length > 0) {
    return resolveFailure(issues, "invalid_resolve_input_structure");
  }

  const battlePreflight = preflightBattleStateStructure(object["battleState"]);
  if (!battlePreflight.ok) {
    return resolveFailure(battlePreflight.issues, "invalid_battle_state_structure");
  }
  if (battlePreflight.value.status !== "in_progress") {
    return resolveFailure(
      [
        {
          path: "/battleState/status",
          message: "resolveBattleTurn accepts status=in_progress only",
          actual: battlePreflight.value.status,
          expected: "in_progress",
        },
      ],
      "battle_not_in_progress",
    );
  }

  const sourceA = validateBattleActionsSource(object["participantAActionsSource"]);
  if (!sourceA.ok) {
    return resolveFailure(sourceA.issues, "invalid_actions_source_a");
  }
  const sourceB = validateBattleActionsSource(object["participantBActionsSource"]);
  if (!sourceB.ok) {
    return resolveFailure(sourceB.issues, "invalid_actions_source_b");
  }

  const preparedStructure = preflightPreparedBattleTurnStructure(object["preparedTurn"]);
  if (!preparedStructure.ok) {
    return resolveFailure(preparedStructure.issues, "invalid_prepared_turn_structure");
  }

  const snapshotStructure = preflightRunRuleSnapshotStructure(object["runRuleSnapshot"]);
  if (!snapshotStructure.ok) {
    return resolveFailure(snapshotStructure.issues, "invalid_run_rule_snapshot_structure");
  }

  // Scripted canonicalScript: parse + structure only (no hash / provider).
  const maxTurnsForScript = battlePreflight.value.maxTurns;
  if (sourceA.value.identity.kind === "scripted_actions") {
    const scriptedA = sourceA.value as Extract<
      BattleActionsSource,
      { identity: { kind: "scripted_actions" } }
    >;
    const parsedA = validateCanonicalBattleActionScriptString(
      scriptedA.canonicalScript,
      maxTurnsForScript,
    );
    if (!parsedA.ok) {
      return resolveFailure(parsedA.issues, "invalid_scripted_canonical_script_a");
    }
  }
  if (sourceB.value.identity.kind === "scripted_actions") {
    const scriptedB = sourceB.value as Extract<
      BattleActionsSource,
      { identity: { kind: "scripted_actions" } }
    >;
    const parsedB = validateCanonicalBattleActionScriptString(
      scriptedB.canonicalScript,
      maxTurnsForScript,
    );
    if (!parsedB.ok) {
      return resolveFailure(parsedB.issues, "invalid_scripted_canonical_script_b");
    }
  }

  // ---------- Phase B: hashes / binding ----------
  const battleState = verifyBattleStateHashes(battlePreflight.value, provider);
  if (!battleState.ok) {
    return resolveFailure(battleState.issues, "battle_state_hash_mismatch");
  }

  const preparedValidated = validatePreparedBattleTurn(object["preparedTurn"], provider);
  if (!preparedValidated.ok) {
    return resolveFailure(preparedValidated.issues, "invalid_prepared_turn");
  }
  const preparedBound = bindPreparedBattleTurnToBattleState(
    preparedValidated.value,
    battleState.value,
    provider,
  );
  if (!preparedBound.ok) {
    return resolveFailure(preparedBound.issues, "prepared_turn_binding_failed");
  }
  const prepared = preparedBound;

  const snapshot = validateRunRuleSnapshot(object["runRuleSnapshot"], provider);
  if (!snapshot.ok) {
    return resolveFailure(snapshot.issues, "invalid_run_rule_snapshot");
  }
  if (snapshot.value.runRuleSnapshotHash !== battleState.value.runRuleSnapshotHash) {
    return resolveFailure(
      [
        {
          path: "/runRuleSnapshot/runRuleSnapshotHash",
          message: "RunRuleSnapshot hash must match BattleState.runRuleSnapshotHash",
          actual: snapshot.value.runRuleSnapshotHash,
          expected: battleState.value.runRuleSnapshotHash,
        },
      ],
      "run_rule_snapshot_mismatch",
    );
  }
  if (
    snapshot.value.sprint1ConfigVersion !== battleState.value.sprint1ConfigVersion ||
    snapshot.value.sprint1ConfigHash !== battleState.value.battleRulesSnapshotRef.sprint1ConfigHash
  ) {
    return resolveFailure(
      [
        {
          path: "/runRuleSnapshot",
          message: "Sprint1Config identity mismatch against BattleRulesSnapshotRef",
        },
      ],
      "config_identity_mismatch",
    );
  }

  const inputReplay = validateBattleStateReplayConsistency(battleState.value, snapshot.value);
  if (!inputReplay.ok) {
    return resolveFailure(inputReplay.issues, "battle_state_replay_mismatch");
  }

  if (
    !identitiesEqual(battleState.value.participantAActionSourceIdentity, sourceA.value.identity)
  ) {
    return resolveFailure(
      [
        {
          path: "/participantAActionsSource/identity",
          message: "ActionsSource identity must match BattleState fixed identity",
        },
      ],
      "action_source_identity_mismatch",
    );
  }
  if (
    !identitiesEqual(battleState.value.participantBActionSourceIdentity, sourceB.value.identity)
  ) {
    return resolveFailure(
      [
        {
          path: "/participantBActionsSource/identity",
          message: "ActionsSource identity must match BattleState fixed identity",
        },
      ],
      "action_source_identity_mismatch",
    );
  }

  const binding = validateScriptedBothSideBinding(
    {
      participantAActionSourceIdentity: sourceA.value.identity,
      participantBActionSourceIdentity: sourceB.value.identity,
      canonicalScript:
        sourceA.value.identity.kind === "scripted_actions"
          ? (
              sourceA.value as Extract<
                BattleActionsSource,
                { identity: { kind: "scripted_actions" } }
              >
            ).canonicalScript
          : "",
      expectedMaxTurns: snapshot.value.sprint1Config.battle.maxTurns,
    },
    provider,
  );
  if (
    sourceA.value.identity.kind === "scripted_actions" ||
    sourceB.value.identity.kind === "scripted_actions"
  ) {
    if (
      sourceA.value.identity.kind === "scripted_actions" &&
      sourceB.value.identity.kind === "scripted_actions"
    ) {
      const aScript = (
        sourceA.value as Extract<BattleActionsSource, { identity: { kind: "scripted_actions" } }>
      ).canonicalScript;
      const bScript = (
        sourceB.value as Extract<BattleActionsSource, { identity: { kind: "scripted_actions" } }>
      ).canonicalScript;
      if (aScript !== bScript) {
        return resolveFailure(
          [
            {
              path: "/canonicalScript",
              message: "both scripted sides must share the same canonicalScript",
            },
          ],
          "scripted_script_mismatch",
        );
      }
      const both = validateScriptedBothSideBinding(
        {
          participantAActionSourceIdentity: sourceA.value.identity,
          participantBActionSourceIdentity: sourceB.value.identity,
          canonicalScript: aScript,
          expectedMaxTurns: snapshot.value.sprint1Config.battle.maxTurns,
        },
        provider,
      );
      if (!both.ok) {
        return resolveFailure(both.issues, "scripted_binding_failed");
      }
    } else if (!binding.ok) {
      return resolveFailure(binding.issues, "scripted_binding_failed");
    }
  }

  const traits = rejectReservedTraits(snapshot.value.techniqueDefinitions);
  if (!traits.ok) {
    return resolveFailure(traits.issues, "reserved_action_traits");
  }

  // ---------- Phase C: clone-local execution ----------
  try {
    const catalog = new Map<string, TechniqueDefinition>();
    for (const definition of snapshot.value.techniqueDefinitions) {
      catalog.set(definition.techniqueId, definition);
    }

    const view = prepared.value.stateView;
    const working: WorkingState = {
      range: view.range,
      participantA: mutableParticipant(view.participantA),
      participantB: mutableParticipant(view.participantB),
      actionSequence: view.actionSequence,
      turnNumber: prepared.value.turnNumber,
    };

    const requestedA = obtainRequestedAction(
      sourceA.value,
      prepared.value,
      "sideA",
      snapshot.value,
      catalog,
      provider,
    );
    if (!requestedA.ok) {
      return resolveFailure(requestedA.issues, "strategy_or_script_a_failed");
    }
    const requestedB = obtainRequestedAction(
      sourceB.value,
      prepared.value,
      "sideB",
      snapshot.value,
      catalog,
      provider,
    );
    if (!requestedB.ok) {
      return resolveFailure(requestedB.issues, "strategy_or_script_b_failed");
    }

    // When strategy returns no_action for !canAct, replace path should use unable_to_act.
    // obtainRequestedAction maps that to basic_defense placeholder when !canAct — fix:
    const reqA: BattleAction = !working.participantA.canAct
      ? { kind: "basic_defense" }
      : requestedA.value.action;
    const reqB: BattleAction = !working.participantB.canAct
      ? { kind: "basic_defense" }
      : requestedB.value.action;

    const replacedA = replaceIllegalBattleAction(reqA, {
      actor: working.participantA,
      range: working.range,
      catalogById: catalog,
      maximumMasteryReductionRatioBp:
        snapshot.value.sprint1Config.battle.mentalCost.maximumMasteryReductionRatio,
    });
    if (!replacedA.ok) {
      return resolveFailure(replacedA.issues, "replacement_a_failed");
    }
    const replacedB = replaceIllegalBattleAction(reqB, {
      actor: working.participantB,
      range: working.range,
      catalogById: catalog,
      maximumMasteryReductionRatioBp:
        snapshot.value.sprint1Config.battle.mentalCost.maximumMasteryReductionRatio,
    });
    if (!replacedB.ok) {
      return resolveFailure(replacedB.issues, "replacement_b_failed");
    }

    // Fix unable_to_act: if !canAct, force no_action regardless of placeholder.
    const finalA = !working.participantA.canAct
      ? {
          requestedAction: reqA,
          resolvedAction: { kind: "no_action" as const },
          replacementReason: "unable_to_act" as const,
          invalidActionCountDelta: 1 as const,
        }
      : replacedA.value;
    const finalB = !working.participantB.canAct
      ? {
          requestedAction: reqB,
          resolvedAction: { kind: "no_action" as const },
          replacementReason: "unable_to_act" as const,
          invalidActionCountDelta: 1 as const,
        }
      : replacedB.value;

    const prioA = priorityForResolvedAction(
      finalA.resolvedAction,
      techniqueFor(finalA.resolvedAction, catalog),
    );
    const prioB = priorityForResolvedAction(
      finalB.resolvedAction,
      techniqueFor(finalB.resolvedAction, catalog),
    );

    const rng = importSeededRng(prepared.value.rngStateBeforeOrder);
    const order = resolveActionOrder({
      turnNumber: prepared.value.turnNumber,
      sideAAction: finalA.resolvedAction,
      sideBAction: finalB.resolvedAction,
      sideAPriority: prioA,
      sideBPriority: prioB,
      sideA: working.participantA,
      sideB: working.participantB,
      sideASpeedModifier: speedModifierFor(
        finalA.resolvedAction,
        catalog,
        snapshot.value.sprint1Config,
      ),
      sideBSpeedModifier: speedModifierFor(
        finalB.resolvedAction,
        catalog,
        snapshot.value.sprint1Config,
      ),
      rngStateBeforeOrder: prepared.value.rngStateBeforeOrder,
      rng,
      battle: snapshot.value.sprint1Config.battle,
    });
    if (!order.ok) {
      return resolveFailure(order.issues, "action_order_failed");
    }

    const evadeDirections = new Map<BattleSide, string>();
    for (const [side, bundle] of [
      ["sideA", finalA],
      ["sideB", finalB],
    ] as const) {
      if (bundle.resolvedAction.kind === "evade") {
        evadeDirections.set(side, bundle.resolvedAction.direction);
      }
    }

    const focusReservations = new Map<BattleSide, number>();
    const damageReceivedThisTurn = new Map<BattleSide, number>([
      ["sideA", 0],
      ["sideB", 0],
    ]);
    const actionLogs: BattleActionLog[] = [];

    const firstBundle = order.value.firstSide === "sideA" ? finalA : finalB;
    const firstReq = order.value.firstSide === "sideA" ? reqA : reqB;
    const firstMeta =
      order.value.firstSide === "sideA" ? requestedA.value.meta : requestedB.value.meta;
    const firstScore =
      order.value.firstSide === "sideA"
        ? order.value.sideAActionOrderScore
        : order.value.sideBActionOrderScore;
    const firstPrio = order.value.firstSide === "sideA" ? prioA : prioB;

    const ctx: ActionResolveContext = {
      working,
      rng,
      snapshot: snapshot.value,
      catalog,
      turnNumber: prepared.value.turnNumber,
      opponentResolvedAction:
        order.value.firstSide === "sideA" ? finalB.resolvedAction : finalA.resolvedAction,
      focusReservations,
      damageReceivedThisTurn,
      evadeDirections,
    };

    const firstLog = resolveOneAction(
      order.value.firstSide,
      firstReq,
      firstBundle,
      firstPrio,
      firstScore,
      firstMeta,
      ctx,
    );
    if (!firstLog.ok) {
      return resolveFailure(firstLog.issues, "first_action_failed");
    }
    actionLogs.push(firstLog.value);

    const firstActor = participantOf(working, order.value.firstSide);
    const firstTarget = opponentOf(working, order.value.firstSide);
    const ended = battleEndedAfterAction({
      actorSurrendered: firstActor.surrendered,
      targetDurability: firstTarget.currentDurability,
      targetUnableToContinue: firstTarget.unableToContinue,
    });

    const secondSide = order.value.secondSide;
    const secondReq = secondSide === "sideA" ? reqA : reqB;
    const secondMeta = secondSide === "sideA" ? requestedA.value.meta : requestedB.value.meta;
    const secondScore =
      secondSide === "sideA"
        ? order.value.sideAActionOrderScore
        : order.value.sideBActionOrderScore;
    const secondPrio = secondSide === "sideA" ? prioA : prioB;
    let secondBundle = secondSide === "sideA" ? finalA : finalB;
    if (ended) {
      secondBundle = cancelSecondActionAsOpponentEnded(secondReq);
    }

    ctx.opponentResolvedAction = firstBundle.resolvedAction;
    const secondLog = resolveOneAction(
      secondSide,
      secondReq,
      secondBundle,
      secondPrio,
      secondScore,
      secondMeta,
      ctx,
    );
    if (!secondLog.ok) {
      return resolveFailure(secondLog.issues, "second_action_failed");
    }
    actionLogs.push(secondLog.value);

    // Turn-end focus apply
    for (const side of ["sideA", "sideB"] as const) {
      const reserved = focusReservations.get(side);
      if (reserved === undefined) {
        continue;
      }
      const actor = participantOf(working, side);
      const applied = resolveFocusMindAtTurnEnd(
        reserved,
        damageReceivedThisTurn.get(side) ?? 0,
        actor.maxDurability,
        snapshot.value.sprint1Config.battle.focusMind,
      );
      if (!applied.ok) {
        return resolveFailure(applied.issues, "focus_apply_failed");
      }
      actor.currentMental = applyMentalRecovery(
        actor.currentMental,
        actor.maxMental,
        applied.value.appliedRecovery,
      );
      actor.nextHitModifier += applied.value.nextHitModifier;
      actor.nextActivationModifier += applied.value.nextActivationModifier;
      // Patch last action log for this side's focus fields if it was focus_mind
      for (let i = actionLogs.length - 1; i >= 0; i -= 1) {
        const log = actionLogs[i]!;
        if (log.actorSide === side && log.resolvedAction.kind === "focus_mind") {
          actionLogs[i] = deepFreezePlainJson({
            ...log,
            focusAppliedRecovery: applied.value.appliedRecovery,
            actorMentalAfter: actor.currentMental,
            nextHitModifierAfter: actor.nextHitModifier,
            nextActivationModifierAfter: actor.nextActivationModifier,
          }) as BattleActionLog;
          break;
        }
      }
    }

    // Advantage
    const totals = accumulateTurnDamageTotals(actionLogs);
    for (const log of actionLogs) {
      const resolved = log.resolvedAction;
      let preferred: readonly BattleRange[] | null = null;
      if (resolved.kind === "basic_attack") {
        preferred =
          snapshot.value.sprint1Config.techniqueBalance.basicAttackProfiles[resolved.profile]
            .preferredRanges;
      } else if (resolved.kind === "use_technique") {
        preferred = catalog.get(resolved.techniqueId)?.preferredRanges ?? null;
      }
      markPreferredAttack(totals, log.actorSide, resolved, log.rangeBefore, preferred);
    }
    const advantage = selectAdvantageSide(totals);
    if (advantage !== null) {
      const winner = participantOf(working, advantage);
      winner.advantageTurnCount += 1;
      const last = actionLogs[actionLogs.length - 1]!;
      actionLogs[actionLogs.length - 1] = deepFreezePlainJson({
        ...last,
        advantageTurnAwardedTo: advantage,
      }) as BattleActionLog;
    }

    const turnOrderLog: BattleTurnOrderLog = order.value.turnOrderLog;
    const nextDetailedLog = deepFreezePlainJson({
      turnOrderLogs: [...view.detailedLog.turnOrderLogs, turnOrderLog],
      actionLogs: [...view.detailedLog.actionLogs, ...actionLogs],
    });

    // Keep battle-start sourceSnapshotHash and battleInputHash unchanged (12 / S01-006).
    // Battle-local participant fields may diverge from the start source fingerprint.
    let nextState: BattleState = deepFreezePlainJson({
      ...view,
      turnNumber: prepared.value.turnNumber,
      range: working.range,
      participantA: deepFreezePlainJson({
        ...working.participantA,
        sourceSnapshotHash: view.participantA.sourceSnapshotHash,
        techniques: working.participantA.techniques.map((t) => ({ ...t })),
      }),
      participantB: deepFreezePlainJson({
        ...working.participantB,
        sourceSnapshotHash: view.participantB.sourceSnapshotHash,
        techniques: working.participantB.techniques.map((t) => ({ ...t })),
      }),
      battleInputHash: view.battleInputHash,
      actionSequence: working.actionSequence,
      rngState: rng.exportState(),
      detailedLog: nextDetailedLog,
      status: "in_progress",
      terminalReason: null,
      failure: null,
    });

    nextState = applyTerminalIfNeeded(nextState, {
      sideADurability: nextState.participantA.currentDurability,
      sideBDurability: nextState.participantB.currentDurability,
      sideASurrendered: nextState.participantA.surrendered,
      sideBSurrendered: nextState.participantB.surrendered,
      sideAUnableToContinue: nextState.participantA.unableToContinue,
      sideBUnableToContinue: nextState.participantB.unableToContinue,
      turnNumber: nextState.turnNumber,
      maxTurns: nextState.maxTurns,
    });

    const validated = validateBattleState(nextState, provider);
    if (!validated.ok) {
      return resolveFailure(validated.issues, "final_battle_state_invalid");
    }

    const outputReplay = validateBattleStateReplayConsistency(validated.value, snapshot.value);
    if (!outputReplay.ok) {
      return resolveFailure(outputReplay.issues, "final_battle_state_replay_mismatch");
    }

    return {
      kind: "success",
      battleState: validated.value,
      eventCandidates: [],
      validation: { ok: true, issues: [] },
    };
  } catch (error) {
    return resolveFailure(
      [
        {
          path: "",
          message: error instanceof Error ? error.message : "resolveBattleTurn threw unexpectedly",
        },
      ],
      "resolve_internal_error",
    );
  }
}
