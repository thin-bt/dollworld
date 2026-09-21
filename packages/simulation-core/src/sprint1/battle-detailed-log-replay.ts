/**
 * Semantic DetailedLog replay (S1-SPEC-0.1.17 / S01-006 fix5 fix1).
 *
 * Derives expected ActionLog / participant battle-local fields from
 * sourceSnapshot baseline + RunRuleSnapshot + technique catalog + continuous
 * battleSeed-rooted RNG via shared resolveOneAction. ActionLog after/delta /
 * judgment fields are comparison targets only — never applied as state inputs.
 */
import { createSeededRng } from "../rng.js";
import type { SeededRng } from "../rng.js";
import type { SeededRngState } from "../rng.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId } from "../ids.js";
import { applyMentalRecovery, resolveFocusMindAtTurnEnd } from "./battle-focus-mind.js";
import {
  deriveBaseMaxDurability,
  deriveStartCurrentDurability,
  deriveStartDurabilityPercentBasisPoints,
} from "./battle-participant.js";
import type {
  BattleParticipantSnapshot,
  BattleParticipantSourceSnapshot,
} from "./battle-participant.js";
import type { BattleSide } from "./battle-enums.js";
import type { BattleState } from "./battle-state.js";
import type { BattleActionLog, BattleTurnOrderLog } from "./battle-turn-logs.js";
import type { PersonTechniqueState } from "./types.js";
import type { Sprint1Config } from "./types.js";
import type { RunRuleSnapshot } from "./run-rule-snapshot.js";
import { seededRngStatesEqual } from "./validate-seeded-rng-state.js";
import { validateBattleAction } from "./battle-action.js";
import type { BattleAction } from "./battle-action.js";
import { deriveStrategyProvenance } from "./derive-battle-action-request.js";
import {
  cancelSecondActionAsOpponentEnded,
  replaceIllegalBattleAction,
} from "./battle-action-replacement.js";
import { priorityForResolvedAction, resolveActionOrder } from "./battle-action-order.js";
import type { TechniqueDefinition } from "./technique-definition.js";
import { buildBattleTechniqueDefinitionCatalogMap } from "../sprint3/generated-technique-battle-catalog.js";
import type { GeneratedTechniqueCatalogOverlay } from "../sprint3/generated-technique-catalog-overlay.js";
import { battleEndedAfterAction } from "./battle-surrender.js";
import {
  accumulateTurnDamageTotals,
  markPreferredAttack,
  selectAdvantageSide,
} from "./battle-turn-aggregate.js";
import { cloneValidatedPlainJson, deepFreezePlainJson } from "./plain-data.js";
import {
  mutableParticipant,
  opponentOf,
  participantOf,
  resolveOneAction,
  speedModifierFor,
  techniqueFor,
  type ActionResolveContext,
  type MutableParticipant,
  type WorkingState,
} from "./battle-action-resolution.js";

export type BattleParticipantReplayRuntime = {
  personId: PersonId;
  currentDurability: number;
  maxDurability: number;
  currentMental: number;
  maxMental: number;
  injury: number;
  guarding: boolean;
  evading: boolean;
  canAct: boolean;
  surrendered: boolean;
  unableToContinue: boolean;
  nextHitModifier: number;
  nextActivationModifier: number;
  damageDealt: number;
  damageReceived: number;
  attemptedHits: number;
  successfulHits: number;
  successfulDefenses: number;
  successfulEvasions: number;
  successfulCounters: number;
  passiveActionCount: number;
  invalidActionCount: number;
  advantageTurnCount: number;
  inBattleConsumption: number;
  techniques: PersonTechniqueState[];
};

function issue(
  path: string,
  message: string,
  actual?: unknown,
  expected?: string,
): ValidationIssue {
  const out: ValidationIssue = { path, message };
  if (actual !== undefined) {
    out.actual = actual;
  }
  if (expected !== undefined) {
    out.expected = expected;
  }
  return out;
}

function statesEqual(a: SeededRngState, b: SeededRngState): boolean {
  return seededRngStatesEqual(a, b);
}

function cloneTechniques(techniques: readonly PersonTechniqueState[]): PersonTechniqueState[] {
  return techniques.map((t) => ({ ...t }));
}

/**
 * Build battle-start battle-local runtime from frozen sourceSnapshot + config.
 */
export function createBattleParticipantReplayBaseline(
  source: BattleParticipantSourceSnapshot,
  config: Sprint1Config,
): ValidationResult<BattleParticipantReplayRuntime> {
  const baseMax = deriveBaseMaxDurability(source.stats.stamina.surfaceValue);
  if (!baseMax.ok) {
    return failure(baseMax.issues.map((i) => ({ ...i, path: `/stats${i.path}` })));
  }
  const percentBp = deriveStartDurabilityPercentBasisPoints(
    config.battle.startDurability,
    source.condition,
    source.fatigue,
    source.injury,
  );
  const startDurability = deriveStartCurrentDurability(baseMax.value, percentBp);
  const maxMental = 50 + source.stats.spirit.surfaceValue;
  return success({
    personId: source.personId,
    currentDurability: startDurability,
    maxDurability: baseMax.value,
    currentMental: source.currentMental,
    maxMental,
    injury: source.injury,
    guarding: false,
    evading: false,
    canAct: true,
    surrendered: false,
    unableToContinue: false,
    nextHitModifier: 0,
    nextActivationModifier: 0,
    damageDealt: 0,
    damageReceived: 0,
    attemptedHits: 0,
    successfulHits: 0,
    successfulDefenses: 0,
    successfulEvasions: 0,
    successfulCounters: 0,
    passiveActionCount: 0,
    invalidActionCount: 0,
    advantageTurnCount: 0,
    inBattleConsumption: 0,
    techniques: cloneTechniques(source.techniques),
  });
}

function assertEq(
  issues: ValidationIssue[],
  path: string,
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (actual !== expected) {
    issues.push(issue(path, message, actual, String(expected)));
  }
}

function assertCanonicalEq(
  issues: ValidationIssue[],
  path: string,
  actual: unknown,
  expected: unknown,
  message: string,
): void {
  if (toCanonicalJson(actual) !== toCanonicalJson(expected)) {
    issues.push(issue(path, message, actual, "canonical match"));
  }
}

function runtimeFromParticipant(p: MutableParticipant): BattleParticipantReplayRuntime {
  return {
    personId: p.personId,
    currentDurability: p.currentDurability,
    maxDurability: p.maxDurability,
    currentMental: p.currentMental,
    maxMental: p.maxMental,
    injury: p.injury,
    guarding: p.guarding,
    evading: p.evading,
    canAct: p.canAct,
    surrendered: p.surrendered,
    unableToContinue: p.unableToContinue,
    nextHitModifier: p.nextHitModifier,
    nextActivationModifier: p.nextActivationModifier,
    damageDealt: p.damageDealt,
    damageReceived: p.damageReceived,
    attemptedHits: p.attemptedHits,
    successfulHits: p.successfulHits,
    successfulDefenses: p.successfulDefenses,
    successfulEvasions: p.successfulEvasions,
    successfulCounters: p.successfulCounters,
    passiveActionCount: p.passiveActionCount,
    invalidActionCount: p.invalidActionCount,
    advantageTurnCount: p.advantageTurnCount,
    inBattleConsumption: p.inBattleConsumption,
    techniques: cloneTechniques(p.techniques),
  };
}

function buildWorkingParticipant(
  participant: BattleParticipantSnapshot,
  baseline: BattleParticipantReplayRuntime,
): MutableParticipant {
  const base = mutableParticipant(participant);
  const source = participant.sourceSnapshot;
  base.stats = cloneValidatedPlainJson(source.stats);
  base.aptitudes = cloneValidatedPlainJson(source.aptitudes);
  base.condition = source.condition;
  base.fatigue = source.fatigue;
  base.confidence = source.confidence;
  base.injuryProneness = source.injuryProneness;
  base.battleDecisionProfile = cloneValidatedPlainJson(source.battleDecisionProfile);
  base.techniques = cloneTechniques(baseline.techniques);
  base.currentDurability = baseline.currentDurability;
  base.maxDurability = baseline.maxDurability;
  base.currentMental = baseline.currentMental;
  base.maxMental = baseline.maxMental;
  base.injury = baseline.injury;
  base.guarding = baseline.guarding;
  base.evading = baseline.evading;
  base.canAct = baseline.canAct;
  base.surrendered = baseline.surrendered;
  base.unableToContinue = baseline.unableToContinue;
  base.nextHitModifier = baseline.nextHitModifier;
  base.nextActivationModifier = baseline.nextActivationModifier;
  base.damageDealt = baseline.damageDealt;
  base.damageReceived = baseline.damageReceived;
  base.attemptedHits = baseline.attemptedHits;
  base.successfulHits = baseline.successfulHits;
  base.successfulDefenses = baseline.successfulDefenses;
  base.successfulEvasions = baseline.successfulEvasions;
  base.successfulCounters = baseline.successfulCounters;
  base.passiveActionCount = baseline.passiveActionCount;
  base.invalidActionCount = baseline.invalidActionCount;
  base.advantageTurnCount = baseline.advantageTurnCount;
  base.inBattleConsumption = baseline.inBattleConsumption;
  return base;
}

function parseRequestedBattleAction(
  raw: unknown,
  pathPrefix: string,
): ValidationResult<BattleAction> {
  const validated = validateBattleAction(raw);
  if (!validated.ok) {
    return failure(validated.issues.map((i) => ({ ...i, path: `${pathPrefix}${i.path}` })));
  }
  return success(validated.value);
}

function deriveReplacementBundle(
  requested: BattleAction,
  actor: MutableParticipant,
  range: WorkingState["range"],
  catalog: ReadonlyMap<string, TechniqueDefinition>,
  snapshot: RunRuleSnapshot,
): ValidationResult<{
  requestedAction: BattleAction;
  resolvedAction: BattleActionLog["resolvedAction"];
  replacementReason: BattleActionLog["replacementReason"];
  invalidActionCountDelta: 0 | 1;
}> {
  if (!actor.canAct) {
    return success({
      requestedAction: requested,
      resolvedAction: { kind: "no_action" },
      replacementReason: "unable_to_act",
      invalidActionCountDelta: 1,
    });
  }
  return replaceIllegalBattleAction(requested, {
    actor,
    range,
    catalogById: catalog,
    maximumMasteryReductionRatioBp:
      snapshot.sprint1Config.battle.mentalCost.maximumMasteryReductionRatio,
  });
}

function compareActionLogs(
  issues: ValidationIssue[],
  pathPrefix: string,
  expected: BattleActionLog,
  recorded: BattleActionLog,
): void {
  const keys = Object.keys(expected) as Array<keyof BattleActionLog>;
  for (const key of keys) {
    assertCanonicalEq(
      issues,
      `${pathPrefix}/${key}`,
      recorded[key],
      expected[key],
      `ActionLog.${String(key)} must match semantically derived expectation`,
    );
  }
}

function compareTurnOrderLogs(
  issues: ValidationIssue[],
  pathPrefix: string,
  expected: BattleTurnOrderLog,
  recorded: BattleTurnOrderLog,
): void {
  const keys = Object.keys(expected) as Array<keyof BattleTurnOrderLog>;
  for (const key of keys) {
    assertCanonicalEq(
      issues,
      `${pathPrefix}/${key}`,
      recorded[key],
      expected[key],
      `TurnOrderLog.${String(key)} must match semantically derived expectation`,
    );
  }
}

function bindRuntimeToParticipant(
  runtime: BattleParticipantReplayRuntime,
  participant: BattleParticipantSnapshot,
  pathPrefix: string,
  issues: ValidationIssue[],
): void {
  const fields: Array<keyof BattleParticipantReplayRuntime> = [
    "currentDurability",
    "currentMental",
    "injury",
    "guarding",
    "evading",
    "canAct",
    "surrendered",
    "unableToContinue",
    "nextHitModifier",
    "nextActivationModifier",
    "damageDealt",
    "damageReceived",
    "attemptedHits",
    "successfulHits",
    "successfulDefenses",
    "successfulEvasions",
    "successfulCounters",
    "passiveActionCount",
    "invalidActionCount",
    "advantageTurnCount",
    "inBattleConsumption",
  ];
  for (const key of fields) {
    assertEq(
      issues,
      `${pathPrefix}/${key}`,
      participant[key],
      runtime[key],
      `${key} must equal sourceSnapshot+DetailedLog semantic replay`,
    );
  }
  if (
    toCanonicalJson(
      participant.techniques.map((t) => ({
        techniqueId: t.techniqueId,
        attemptedUseCount: t.attemptedUseCount,
        successfulUseCount: t.successfulUseCount,
      })),
    ) !==
    toCanonicalJson(
      runtime.techniques.map((t) => ({
        techniqueId: t.techniqueId,
        attemptedUseCount: t.attemptedUseCount,
        successfulUseCount: t.successfulUseCount,
      })),
    )
  ) {
    issues.push(
      issue(
        `${pathPrefix}/techniques`,
        "technique use counts must equal sourceSnapshot+DetailedLog semantic replay",
      ),
    );
  }
}

/**
 * State-only structural gate: empty detailedLog ⇒ battle-local fields must equal
 * the battle-start baseline derived from sourceSnapshot + config.
 */
export function assertEmptyLogMatchesBaseline(
  state: BattleState,
  config: Sprint1Config,
): ValidationResult<true> {
  const issues: ValidationIssue[] = [];
  if (state.detailedLog.turnOrderLogs.length !== 0 || state.detailedLog.actionLogs.length !== 0) {
    return success(true);
  }
  for (const [side, participant] of [
    ["sideA", state.participantA],
    ["sideB", state.participantB],
  ] as const) {
    const baseline = createBattleParticipantReplayBaseline(participant.sourceSnapshot, config);
    if (!baseline.ok) {
      issues.push(
        ...baseline.issues.map((i) => ({
          ...i,
          path: `/participant${side === "sideA" ? "A" : "B"}${i.path}`,
        })),
      );
      continue;
    }
    bindRuntimeToParticipant(
      baseline.value,
      participant,
      `/participant${side === "sideA" ? "A" : "B"}`,
      issues,
    );
  }
  return issues.length === 0 ? success(true) : failure(issues);
}

/**
 * Full rules-aware semantic replay: sourceSnapshot + BattleDetailedLog +
 * RunRuleSnapshot must reproduce participantA/B battle-local fields and logs.
 */
export function validateBattleDetailedLogReplay(
  state: BattleState,
  runRuleSnapshot: RunRuleSnapshot,
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay,
): ValidationResult<true> {
  const config = runRuleSnapshot.sprint1Config;
  const issues: ValidationIssue[] = [];

  const baseA = createBattleParticipantReplayBaseline(state.participantA.sourceSnapshot, config);
  const baseB = createBattleParticipantReplayBaseline(state.participantB.sourceSnapshot, config);
  if (!baseA.ok) {
    return failure(baseA.issues.map((i) => ({ ...i, path: `/participantA${i.path}` })));
  }
  if (!baseB.ok) {
    return failure(baseB.issues.map((i) => ({ ...i, path: `/participantB${i.path}` })));
  }

  const battleStartRng = createSeededRng(state.battleSeed);
  const battleStartRngState = battleStartRng.exportState();
  const rng: SeededRng = createSeededRng(state.battleSeed);

  const turnOrders = state.detailedLog.turnOrderLogs;
  const actionLogs = state.detailedLog.actionLogs;
  if (actionLogs.length !== turnOrders.length * 2) {
    return failure([
      issue(
        "/detailedLog",
        "actionLogs length must equal turnOrderLogs.length * 2 for replay",
        actionLogs.length,
        String(turnOrders.length * 2),
      ),
    ]);
  }

  if (turnOrders.length === 0) {
    if (!statesEqual(state.rngState, battleStartRngState)) {
      issues.push(
        issue(
          "/rngState",
          "empty detailedLog requires rngState equal to createSeededRng(battleSeed)",
          state.rngState,
        ),
      );
    }
    const empty = assertEmptyLogMatchesBaseline(state, config);
    if (!empty.ok) {
      return empty;
    }
    return issues.length === 0 ? success(true) : failure(issues);
  }

  const catalog = buildBattleTechniqueDefinitionCatalogMap(
    runRuleSnapshot.techniqueDefinitions,
    generatedTechniqueCatalogOverlay,
  );

  const working: WorkingState = {
    range: state.initialRange,
    participantA: buildWorkingParticipant(state.participantA, baseA.value),
    participantB: buildWorkingParticipant(state.participantB, baseB.value),
    actionSequence: 0,
    turnNumber: 0,
  };

  for (let turnIndex = 0; turnIndex < turnOrders.length; turnIndex += 1) {
    const recordedOrder = turnOrders[turnIndex]!;
    const pathOrder = `/detailedLog/turnOrderLogs/${String(turnIndex)}`;
    const turnNumber = recordedOrder.turnNumber;
    working.turnNumber = turnNumber;

    // Turn start: reset guarding / evading
    working.participantA.guarding = false;
    working.participantA.evading = false;
    working.participantB.guarding = false;
    working.participantB.evading = false;

    const firstRecorded = actionLogs[turnIndex * 2]!;
    const secondRecorded = actionLogs[turnIndex * 2 + 1]!;

    // Locate each side's recorded log for requestedAction (order-independent)
    const logBySide = new Map<BattleSide, BattleActionLog>();
    for (const log of [firstRecorded, secondRecorded]) {
      logBySide.set(log.actorSide, log);
    }
    const recordedA = logBySide.get("sideA");
    const recordedB = logBySide.get("sideB");
    if (recordedA === undefined || recordedB === undefined) {
      return failure([
        issue(pathOrder, "each turn must include one ActionLog for sideA and one for sideB"),
      ]);
    }

    const recordedReqA = parseRequestedBattleAction(
      recordedA.requestedAction,
      `${pathOrder}/sideA/requestedAction`,
    );
    if (!recordedReqA.ok) {
      return failure(recordedReqA.issues);
    }
    const recordedReqB = parseRequestedBattleAction(
      recordedB.requestedAction,
      `${pathOrder}/sideB/requestedAction`,
    );
    if (!recordedReqB.ok) {
      return failure(recordedReqB.issues);
    }

    // Strategy provenance: scripted keeps log requested; default re-derives action+meta.
    // Synthetic stateView carries turn-start participants/range/battleSeed for scoring.
    const strategyStateView = {
      ...state,
      range: working.range,
      participantA: working.participantA,
      participantB: working.participantB,
      turnNumber: turnNumber - 1,
      actionSequence: working.actionSequence,
      rngState: rng.exportState(),
    } as BattleState;

    const provenanceA = deriveStrategyProvenance({
      identity: state.participantAActionSourceIdentity,
      recordedRequested: recordedReqA.value,
      defaultInput: {
        actorSide: "sideA",
        actor: working.participantA,
        opponent: working.participantB,
        range: working.range,
        turnNumber,
        battleSeed: state.battleSeed,
        stateView: strategyStateView,
        snapshot: runRuleSnapshot,
        catalog,
      },
    });
    if (!provenanceA.ok) {
      return failure(
        provenanceA.issues.map((i) => ({ ...i, path: `${pathOrder}/sideA${i.path}` })),
      );
    }
    const provenanceB = deriveStrategyProvenance({
      identity: state.participantBActionSourceIdentity,
      recordedRequested: recordedReqB.value,
      defaultInput: {
        actorSide: "sideB",
        actor: working.participantB,
        opponent: working.participantA,
        range: working.range,
        turnNumber,
        battleSeed: state.battleSeed,
        stateView: strategyStateView,
        snapshot: runRuleSnapshot,
        catalog,
      },
    });
    if (!provenanceB.ok) {
      return failure(
        provenanceB.issues.map((i) => ({ ...i, path: `${pathOrder}/sideB${i.path}` })),
      );
    }

    const reqA = provenanceA.value.requestedAction;
    const reqB = provenanceB.value.requestedAction;
    const metaA = provenanceA.value.meta;
    const metaB = provenanceB.value.meta;

    // For default_strategy, recorded requestedAction must match re-derived selection.
    assertCanonicalEq(
      issues,
      `${pathOrder}/sideA/requestedAction`,
      recordedA.requestedAction,
      reqA,
      "requestedAction must match strategy provenance derivation",
    );
    assertCanonicalEq(
      issues,
      `${pathOrder}/sideB/requestedAction`,
      recordedB.requestedAction,
      reqB,
      "requestedAction must match strategy provenance derivation",
    );

    const replacedA = deriveReplacementBundle(
      reqA,
      working.participantA,
      working.range,
      catalog,
      runRuleSnapshot,
    );
    if (!replacedA.ok) {
      return failure(replacedA.issues.map((i) => ({ ...i, path: `${pathOrder}/sideA${i.path}` })));
    }
    const replacedB = deriveReplacementBundle(
      reqB,
      working.participantB,
      working.range,
      catalog,
      runRuleSnapshot,
    );
    if (!replacedB.ok) {
      return failure(replacedB.issues.map((i) => ({ ...i, path: `${pathOrder}/sideB${i.path}` })));
    }

    const finalA = replacedA.value;
    const finalB = replacedB.value;

    const prioA = priorityForResolvedAction(
      finalA.resolvedAction,
      techniqueFor(finalA.resolvedAction, catalog),
    );
    const prioB = priorityForResolvedAction(
      finalB.resolvedAction,
      techniqueFor(finalB.resolvedAction, catalog),
    );

    const rngBeforeOrder = rng.exportState();
    if (turnIndex === 0 && !statesEqual(rngBeforeOrder, battleStartRngState)) {
      issues.push(
        issue(
          `${pathOrder}/rngStateBeforeOrder`,
          "turn 1 order RNG must begin at createSeededRng(battleSeed)",
        ),
      );
    }
    assertCanonicalEq(
      issues,
      `${pathOrder}/rngStateBeforeOrder`,
      recordedOrder.rngStateBeforeOrder,
      rngBeforeOrder,
      "rngStateBeforeOrder must match continuous battleSeed-rooted replay RNG",
    );

    const order = resolveActionOrder({
      turnNumber,
      sideAAction: finalA.resolvedAction,
      sideBAction: finalB.resolvedAction,
      sideAPriority: prioA,
      sideBPriority: prioB,
      sideA: working.participantA,
      sideB: working.participantB,
      sideASpeedModifier: speedModifierFor(finalA.resolvedAction, catalog, config),
      sideBSpeedModifier: speedModifierFor(finalB.resolvedAction, catalog, config),
      rngStateBeforeOrder: rngBeforeOrder,
      rng,
      battle: config.battle,
    });
    if (!order.ok) {
      return failure(order.issues.map((i) => ({ ...i, path: `${pathOrder}${i.path}` })));
    }
    compareTurnOrderLogs(issues, pathOrder, order.value.turnOrderLog, recordedOrder);

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

    const derivedActionLogs: BattleActionLog[] = [];

    const firstSide = order.value.firstSide;
    const firstBundle = firstSide === "sideA" ? finalA : finalB;
    const firstReq = firstSide === "sideA" ? reqA : reqB;
    const firstRecordedForSide = firstSide === "sideA" ? recordedA : recordedB;
    const firstScore =
      firstSide === "sideA" ? order.value.sideAActionOrderScore : order.value.sideBActionOrderScore;
    const firstPrio = firstSide === "sideA" ? prioA : prioB;

    const ctx: ActionResolveContext = {
      working,
      rng,
      snapshot: runRuleSnapshot,
      catalog,
      turnNumber,
      opponentResolvedAction: firstSide === "sideA" ? finalB.resolvedAction : finalA.resolvedAction,
      focusReservations,
      damageReceivedThisTurn,
      evadeDirections,
    };

    const firstLog = resolveOneAction(
      firstSide,
      firstReq,
      firstBundle,
      firstPrio,
      firstScore,
      firstSide === "sideA" ? metaA : metaB,
      ctx,
    );
    if (!firstLog.ok) {
      return failure(
        firstLog.issues.map((i) => ({
          ...i,
          path: `/detailedLog/actionLogs/${String(turnIndex * 2)}${i.path}`,
        })),
      );
    }
    derivedActionLogs.push(firstLog.value);

    const firstActor = participantOf(working, firstSide);
    const firstTarget = opponentOf(working, firstSide);
    const ended = battleEndedAfterAction({
      actorSurrendered: firstActor.surrendered,
      targetDurability: firstTarget.currentDurability,
      targetUnableToContinue: firstTarget.unableToContinue,
    });

    const secondSide = order.value.secondSide;
    const secondReq = secondSide === "sideA" ? reqA : reqB;
    const secondRecordedForSide = secondSide === "sideA" ? recordedA : recordedB;
    const secondScore =
      secondSide === "sideA"
        ? order.value.sideAActionOrderScore
        : order.value.sideBActionOrderScore;
    const secondPrio = secondSide === "sideA" ? prioA : prioB;
    let secondBundle = secondSide === "sideA" ? finalA : finalB;
    if (ended) {
      secondBundle = cancelSecondActionAsOpponentEnded(secondReq);
    }

    // Validate replacementReason for the recorded second action against derivation
    assertCanonicalEq(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2 + 1)}/resolvedAction`,
      secondRecordedForSide.resolvedAction,
      secondBundle.resolvedAction,
      "second resolvedAction must match semantic derivation (incl. opponent_ended_battle)",
    );
    assertCanonicalEq(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2 + 1)}/replacementReason`,
      secondRecordedForSide.replacementReason,
      secondBundle.replacementReason,
      "second replacementReason must match semantic derivation",
    );
    assertCanonicalEq(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2)}/resolvedAction`,
      firstRecordedForSide.resolvedAction,
      firstBundle.resolvedAction,
      "first resolvedAction must match semantic derivation",
    );
    assertCanonicalEq(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2)}/replacementReason`,
      firstRecordedForSide.replacementReason,
      firstBundle.replacementReason,
      "first replacementReason must match semantic derivation",
    );

    ctx.opponentResolvedAction = firstBundle.resolvedAction;
    const secondLog = resolveOneAction(
      secondSide,
      secondReq,
      secondBundle,
      secondPrio,
      secondScore,
      secondSide === "sideA" ? metaA : metaB,
      ctx,
    );
    if (!secondLog.ok) {
      return failure(
        secondLog.issues.map((i) => ({
          ...i,
          path: `/detailedLog/actionLogs/${String(turnIndex * 2 + 1)}${i.path}`,
        })),
      );
    }
    derivedActionLogs.push(secondLog.value);

    // Turn-end focus apply (same order as Resolver)
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
        config.battle.focusMind,
      );
      if (!applied.ok) {
        return failure(
          applied.issues.map((i) => ({
            ...i,
            path: `${pathOrder}/focus/${side}${i.path}`,
          })),
        );
      }
      actor.currentMental = applyMentalRecovery(
        actor.currentMental,
        actor.maxMental,
        applied.value.appliedRecovery,
      );
      actor.nextHitModifier += applied.value.nextHitModifier;
      actor.nextActivationModifier += applied.value.nextActivationModifier;
      for (let i = derivedActionLogs.length - 1; i >= 0; i -= 1) {
        const log = derivedActionLogs[i]!;
        if (log.actorSide === side && log.resolvedAction.kind === "focus_mind") {
          derivedActionLogs[i] = deepFreezePlainJson({
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

    // Advantage from derived damages / preferred ranges (not from recorded award)
    const totals = accumulateTurnDamageTotals(derivedActionLogs);
    for (const log of derivedActionLogs) {
      const resolved = log.resolvedAction;
      let preferred: readonly import("./types.js").BattleRange[] | null = null;
      if (resolved.kind === "basic_attack") {
        preferred = config.techniqueBalance.basicAttackProfiles[resolved.profile].preferredRanges;
      } else if (resolved.kind === "use_technique") {
        preferred = catalog.get(resolved.techniqueId)?.preferredRanges ?? null;
      }
      markPreferredAttack(totals, log.actorSide, resolved, log.rangeBefore, preferred);
    }
    const advantage = selectAdvantageSide(totals);
    if (advantage !== null) {
      const winner = participantOf(working, advantage);
      winner.advantageTurnCount += 1;
      const last = derivedActionLogs[derivedActionLogs.length - 1]!;
      derivedActionLogs[derivedActionLogs.length - 1] = deepFreezePlainJson({
        ...last,
        advantageTurnAwardedTo: advantage,
      }) as BattleActionLog;
    }

    // Compare derived logs to recorded in resolution order (first, second)
    compareActionLogs(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2)}`,
      derivedActionLogs[0]!,
      firstRecorded,
    );
    compareActionLogs(
      issues,
      `/detailedLog/actionLogs/${String(turnIndex * 2 + 1)}`,
      derivedActionLogs[1]!,
      secondRecorded,
    );
  }

  assertEq(
    issues,
    "/range",
    state.range,
    working.range,
    "range must equal semantically replayed range",
  );
  assertCanonicalEq(
    issues,
    "/rngState",
    state.rngState,
    rng.exportState(),
    "rngState must equal continuous battleSeed-rooted replay RNG after all turns",
  );
  assertEq(
    issues,
    "/actionSequence",
    state.actionSequence,
    working.actionSequence,
    "actionSequence must equal semantic replay",
  );

  bindRuntimeToParticipant(
    runtimeFromParticipant(working.participantA),
    state.participantA,
    "/participantA",
    issues,
  );
  bindRuntimeToParticipant(
    runtimeFromParticipant(working.participantB),
    state.participantB,
    "/participantB",
    issues,
  );

  return issues.length === 0 ? success(true) : failure(issues);
}

/**
 * Convenience: validateBattleState hashes are caller's responsibility;
 * this only runs the rules-aware semantic replay consistency check.
 */
export function validateBattleStateReplayConsistency(
  state: BattleState,
  runRuleSnapshot: RunRuleSnapshot,
  generatedTechniqueCatalogOverlay?: GeneratedTechniqueCatalogOverlay,
): ValidationResult<true> {
  if (runRuleSnapshot.runRuleSnapshotHash !== state.runRuleSnapshotHash) {
    return failure([
      issue(
        "/runRuleSnapshot/runRuleSnapshotHash",
        "RunRuleSnapshot hash must match BattleState.runRuleSnapshotHash",
        runRuleSnapshot.runRuleSnapshotHash,
        state.runRuleSnapshotHash,
      ),
    ]);
  }
  return validateBattleDetailedLogReplay(
    state,
    runRuleSnapshot,
    generatedTechniqueCatalogOverlay,
  );
}
