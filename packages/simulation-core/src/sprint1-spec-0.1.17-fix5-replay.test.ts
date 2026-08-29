/**
 * S01-006 fix5: mid-battle sourceSnapshotHash always-verify + DetailedLog replay.
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  asTechniqueId,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  BATTLE_PROFILE_ADAPTER_VERSION,
  BATTLE_STATE_SCHEMA_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  battleActionScriptToCanonicalScript,
  buildFixedBasicDefenseBattleActionScript,
  computeActionScriptHash,
  computeActiveYearStartProcessorManifestHash,
  computeSimulationIdentityHash,
  computeTechniqueCatalogHash,
  createBattleParticipantReplayBaseline,
  createDefaultActiveYearStartProcessorManifest,
  createInitialMatchIdGeneratorState,
  createRunRuleSnapshot,
  createScriptedActionsSourceIdentity,
  createSeededRng,
  createWorldDate,
  getDefaultSprint1Config,
  prepareBattleTurn,
  resolveBattleTurn,
  toCanonicalJson,
  validateBattleActionScript,
  validateBattleActionLog,
  validateBattleDetailedLogReplay,
  validateBattleState,
  validateBattleStateReplayConsistency,
  validateTechniqueDefinition,
  createDefaultStrategyActionSourceIdentity,
  applyGuardedDamage,
  averagePrimaryStatSurface,
  computeRawDamage,
  getBasicAttackProfile,
  rollDamageWithVariance,
  validateNormalizedSprint1Config,
  type AbilityKey,
  type AbilityScores,
  type AptitudeKey,
  type AptitudeScores,
  type BattleAction,
  type BattleActionLog,
  type BattleParticipantSnapshot,
  type BattleRange,
  type BattleSide,
  type BattleState,
  type RunRuleSnapshot,
  type SeededRng,
  type SimulationIdentity,
  type StatValueTriple,
  type TechniqueCategory,
  type TechniqueDefinition,
  type ValidationResult,
} from "./index.js";
import { startBattleTransaction } from "./sprint1/start-battle-transaction.js";
import { computeBattleInputHash } from "./sprint1/battle-state.js";
import { registerKnownSprint1ConfigVersion } from "./sprint1/sprint1-config-version-registry.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";
import { withTestSprint2IdentityFields } from "./test-fixtures/sprint2-identity.fixture.js";

const sha256Provider = createNodeSha256Provider();
const FIXED_MATCH_ID_STATE_SEED = 12345;
const FIXED_MATCH_ID_STATE_SHA256 =
  "c5b7dd00fb9b5262e58106e9a06b2936d9aa3cefcc1cf66b64a3ab714513e54f";
const TECHNIQUE_ALPHA = "technique_alpha";

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(JSON.stringify(result.issues));
  }
  return result.value;
}

function statTriple(surfaceValue: number): StatValueTriple {
  return { surfaceValue, expressedGeneticValue: surfaceValue, latentGeneticValue: surfaceValue };
}

function buildAbilities(overrides: Partial<Record<AbilityKey, number>> = {}): AbilityScores {
  const result = {} as Record<AbilityKey, StatValueTriple>;
  for (const key of ABILITY_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AbilityScores;
}

function buildAptitudes(overrides: Partial<Record<AptitudeKey, number>> = {}): AptitudeScores {
  const result = {} as Record<AptitudeKey, StatValueTriple>;
  for (const key of APTITUDE_KEYS) {
    result[key] = statTriple(overrides[key] ?? 50);
  }
  return result as AptitudeScores;
}

function techniqueDefinitionInput(techniqueId: string): Record<string, unknown> {
  return {
    techniqueId,
    schemaVersion: "0.1.0",
    dataVersion: "techniques-0.1.0",
    name: techniqueId,
    category: "unarmed",
    primaryStats: ["strength", "skill"],
    requiredAptitude: 10,
    requiredStats: { strength: 20 },
    prerequisiteTechniqueMastery: [],
    mentalCost: 5,
    difficulty: 30,
    learningTier: "basic",
    consumptionClass: "small",
    learningProgressRequired: 100,
    learningProgressOverrideReason: null,
    teachingProficiencyRequired: 20,
    secrecy: 0,
    power: 25,
    accuracy: 70,
    activationDifficulty: 10,
    prerequisiteTechniqueIds: [],
    originPersonId: null,
    sourceTechniqueIds: [],
    tags: ["strike"],
    usableRanges: ["contact", "close"],
    preferredRanges: ["contact"],
    rangeShiftAfterUse: "none",
    priority: 0,
    speedModifier: 0,
    injuryModifier: 0,
    actionTraits: {
      simultaneous: false,
      counterOnHit: false,
      interception: false,
      interrupt: false,
      defenseBreak: false,
    },
  };
}

const techniqueDefinitions: readonly TechniqueDefinition[] = [
  expectOk(validateTechniqueDefinition(techniqueDefinitionInput(TECHNIQUE_ALPHA))),
];
const sprint1Config = getDefaultSprint1Config();
const sprint1ConfigHash = sha256Provider.hashUtf8(toCanonicalJson(sprint1Config));
const techniqueCatalogHash = expectOk(
  computeTechniqueCatalogHash(techniqueDefinitions, sha256Provider),
);
const defaultYearStartManifest = createDefaultActiveYearStartProcessorManifest();
const worldCalendarConfigHash = sha256Provider.hashUtf8(
  toCanonicalJson(DEFAULT_WORLD_CALENDAR_CONFIG),
);
const yearStartProcessorManifestHash = expectOk(
  computeActiveYearStartProcessorManifestHash(defaultYearStartManifest, sha256Provider),
);

function simulationIdentity(): SimulationIdentity {
  return withTestSprint2IdentityFields(
    {
      seed: 20260808,
      initialWorldConfigHash: "a".repeat(64),
      worldCalendarConfigHash,
      yearStartProcessorManifestHash,
      sprint1ConfigHash,
      techniqueCatalogHash,
      initialWeeklyTrainingSidecarHash: "c".repeat(64),
      battleProfileAdapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
      matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
      initialMatchIdGeneratorStateHash: FIXED_MATCH_ID_STATE_SHA256,
      defaultBattleStrategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
      specVersions: [
        { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
        { specSetId: "sprint1", version: S1_SPEC_VERSION },
      ],
      rngAlgorithmVersion: "xoshiro128ss-v1",
      canonicalJsonVersion: "canonical-json-v1",
      hashAlgorithm: "SHA-256",
    },
    sha256Provider,
  );
}

const simulationIdentityHash = expectOk(
  computeSimulationIdentityHash(simulationIdentity(), sha256Provider),
);
const runRuleSnapshot: RunRuleSnapshot = expectOk(
  createRunRuleSnapshot(
    {
      simulationIdentity: simulationIdentity(),
      simulationIdentityHash,
      initialMatchIdGeneratorState: expectOk(
        createInitialMatchIdGeneratorState({
          seed: FIXED_MATCH_ID_STATE_SEED,
          generatorVersion: MATCH_ID_GENERATOR_VERSION,
          namespace: MATCH_ID_NAMESPACE,
        }),
      ),
      worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
      yearStartProcessorManifest: defaultYearStartManifest,
      sprint1Config,
      techniqueCatalogDataVersion: "techniques-0.1.0",
      techniqueDefinitions,
    },
    sha256Provider,
  ),
);

const worldDate = createWorldDate(
  { year: 21, month: 4, weekOfMonth: 1 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);
const fixedDefenseScript = buildFixedBasicDefenseBattleActionScript(20);
const fixedDefenseCanonical = battleActionScriptToCanonicalScript(fixedDefenseScript);
const fixedDefenseIdentity = expectOk(
  createScriptedActionsSourceIdentity({
    actionScriptHash: expectOk(computeActionScriptHash(fixedDefenseCanonical, sha256Provider)),
  }),
);

function buildScript(
  turnBuilder: (turnNumber: number) => { sideA: BattleAction; sideB: BattleAction },
  maxTurns = 20,
) {
  const turns = [];
  for (let turnNumber = 1; turnNumber <= maxTurns; turnNumber += 1) {
    const sides = turnBuilder(turnNumber);
    turns.push({ turnNumber, sideA: sides.sideA, sideB: sides.sideB });
  }
  const script = expectOk(
    validateBattleActionScript(
      { scriptFormatVersion: BATTLE_ACTION_SCRIPT_FORMAT_VERSION, turns },
      maxTurns,
    ),
  );
  const canonical = battleActionScriptToCanonicalScript(script);
  const identity = expectOk(
    createScriptedActionsSourceIdentity({
      actionScriptHash: expectOk(computeActionScriptHash(canonical, sha256Provider)),
    }),
  );
  return { script, canonical, identity };
}

function participantInput(
  personId: string,
  abilityOverrides: Partial<Record<AbilityKey, number>> = {},
): Record<string, unknown> {
  const abilities = buildAbilities({ stamina: 50, spirit: 50, ...abilityOverrides });
  return {
    person: {
      personId,
      givenName: "Test",
      familyName: "Fighter",
      displayName: "Test・Fighter",
      nameDataVersion: "NAMES-0.1.2",
      sex: "male",
      birthYear: 1,
      familyId: "family_000001",
      lifeStatus: "living",
      careerStatus: "active_competitor",
      participationStatus: "active",
      currentAge: 20,
      currentRank: "C",
      highestRank: "B",
      qualifiedMaster: false,
      abilities,
      aptitudes: buildAptitudes(),
      sprint1State: {
        sprint1StateSchemaVersion: "0.1.0",
        currentMental: 50 + abilities.spirit.surfaceValue,
        techniqueStates: [
          {
            techniqueId: TECHNIQUE_ALPHA,
            learningProgressTenths: 1000,
            masteryHundredths: 5000,
            successfulUseCount: 0,
            attemptedUseCount: 0,
            lastPracticedAbsoluteWeek: null,
            acquiredAbsoluteWeek: 10,
          },
        ],
        learningFocusTechniqueId: null,
      },
    },
    temporaryCondition: { fatigue: 20, injury: 10, condition: 10, confidence: 0 },
  };
}

function startBattle(identity = fixedDefenseIdentity): BattleState {
  const result = startBattleTransaction(
    {
      createBattleRequest: {
        simulationId: runRuleSnapshot.simulationId,
        worldDate,
        battleKind: "official",
        initialRange: "contact",
        participantA: participantInput("person_a"),
        participantB: participantInput("person_b"),
        participantAActionSourceIdentity: identity,
        participantBActionSourceIdentity: identity,
        runRuleSnapshot,
      },
      worldRngState: createSeededRng(777).exportState(),
      matchIdGeneratorState: expectOk(
        createInitialMatchIdGeneratorState({
          seed: FIXED_MATCH_ID_STATE_SEED,
          generatorVersion: MATCH_ID_GENERATOR_VERSION,
          namespace: MATCH_ID_NAMESPACE,
        }),
      ),
    },
    sha256Provider,
  );
  expect(result.kind).toBe("success");
  if (result.kind !== "success") {
    throw new Error(JSON.stringify(result));
  }
  return result.battleState;
}

function resolveOne(
  state: BattleState,
  canonical: string,
  identity: typeof fixedDefenseIdentity,
  snapshot: RunRuleSnapshot = runRuleSnapshot,
) {
  const prepared = prepareBattleTurn({ battleState: state }, sha256Provider);
  expect(prepared.kind).toBe("success");
  if (prepared.kind !== "success") {
    throw new Error(JSON.stringify(prepared));
  }
  const resolved = resolveBattleTurn(
    {
      battleState: state,
      preparedTurn: prepared.preparedTurn,
      participantAActionsSource: { identity, canonicalScript: canonical },
      participantBActionsSource: { identity, canonicalScript: canonical },
      runRuleSnapshot: snapshot,
    },
    sha256Provider,
  );
  expect(resolved.kind).toBe("success");
  if (resolved.kind !== "success") {
    throw new Error(JSON.stringify(resolved));
  }
  return resolved.battleState;
}

function withLogs(state: BattleState, actionLogs: BattleState["detailedLog"]["actionLogs"]) {
  return {
    ...state,
    detailedLog: { turnOrderLogs: state.detailedLog.turnOrderLogs, actionLogs },
  };
}

describe("S01-006 fix5 always-on sourceSnapshotHash", () => {
  it("publishes S1-SPEC-0.1.20 / BattleState 0.6.0", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(BATTLE_STATE_SCHEMA_VERSION).toBe("0.6.0");
  });

  it("rejects mid-battle sourceSnapshot tamper with hash left unchanged (A and B)", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    expect(state.turnNumber).toBeGreaterThanOrEqual(1);
    expect(validateBattleState(state, sha256Provider).ok).toBe(true);

    for (const key of ["participantA", "participantB"] as const) {
      const base = state[key];
      const tampered = {
        ...state,
        [key]: {
          ...base,
          sourceSnapshot: {
            ...base.sourceSnapshot,
            // battle-local currentMental may diverge; only sourceSnapshot is hashed.
            currentMental: Math.max(0, base.sourceSnapshot.currentMental - 1),
          },
        },
      };
      expect(tampered[key].sourceSnapshotHash).toBe(base.sourceSnapshotHash);
      const result = validateBattleState(tampered, sha256Provider);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.issues.some((i) => i.path === `/${key}/sourceSnapshotHash`)).toBe(true);
      }
    }
  });

  it("allows legitimate current-only battle-local divergence without hash failure", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    const next = {
      ...state,
      participantA: {
        ...state.participantA,
        currentMental: Math.max(0, state.participantA.currentMental - 1),
        injury: Math.min(100, state.participantA.injury + 1),
      },
    };
    expect(next.participantA.currentMental).not.toBe(
      next.participantA.sourceSnapshot.currentMental,
    );
    expect(validateBattleState(next, sha256Provider).ok).toBe(true);
  });
});

describe("S01-006 fix5 DetailedLog replay validator", () => {
  it("accepts empty-log start state matching sourceSnapshot baseline", () => {
    const state = startBattle();
    const replay = validateBattleDetailedLogReplay(state, runRuleSnapshot);
    expect(replay.ok).toBe(true);
    const baseline = expectOk(
      createBattleParticipantReplayBaseline(state.participantA.sourceSnapshot, sprint1Config),
    );
    expect(state.participantA.currentDurability).toBe(baseline.currentDurability);
    expect(state.participantA.injury).toBe(baseline.injury);
  });

  it("rejects empty-log currentMental / injury / currentDurability / use-count / aggregate tampers", () => {
    const state = startBattle();
    for (const patch of [
      { currentMental: Math.max(0, state.participantA.currentMental - 1) },
      { injury: Math.min(100, state.participantA.injury + 1) },
      { currentDurability: Math.max(1, state.participantA.currentDurability - 1) },
      {
        techniques: state.participantA.techniques.map((t) => ({
          ...t,
          attemptedUseCount: t.attemptedUseCount + 1,
        })),
      },
      { damageDealt: 1 },
    ] as const) {
      const tampered = {
        ...state,
        participantA: { ...state.participantA, ...patch },
      };
      expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
    }
  });

  it("replays one and multiple turns to matching final state", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    expect(validateBattleStateReplayConsistency(state, runRuleSnapshot).ok).toBe(true);
    state = resolveOne(state, script.canonical, script.identity);
    expect(validateBattleStateReplayConsistency(state, runRuleSnapshot).ok).toBe(true);
    expect(state.turnNumber).toBe(2);
  });

  it("rejects final bind-field tampers without log changes", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    for (const key of [
      "currentDurability",
      "currentMental",
      "injury",
      "guarding",
      "inBattleConsumption",
      "passiveActionCount",
      "advantageTurnCount",
      "nextHitModifier",
    ] as const) {
      const base = state.participantA[key];
      const patchedValue =
        typeof base === "boolean" ? !base : typeof base === "number" ? base + 1 : base;
      const tampered = {
        ...state,
        participantA: { ...state.participantA, [key]: patchedValue },
      };
      expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
    }
  });

  it("rejects ActionLog before/after chain tampers", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    const logs = state.detailedLog.actionLogs;
    const first = logs[0]!;
    const tamperedLog = { ...first, actorMentalAfter: first.actorMentalAfter + 1 };
    const tampered = {
      ...state,
      detailedLog: {
        turnOrderLogs: state.detailedLog.turnOrderLogs,
        actionLogs: [tamperedLog, ...logs.slice(1)],
      },
      participantA:
        first.actorSide === "sideA"
          ? { ...state.participantA, currentMental: state.participantA.currentMental + 1 }
          : state.participantA,
      participantB:
        first.actorSide === "sideB"
          ? { ...state.participantB, currentMental: state.participantB.currentMental + 1 }
          : state.participantB,
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects RNG after-state that does not match replayed rolls", () => {
    const script = buildScript(() => ({
      sideA: { kind: "approach" },
      sideB: { kind: "approach" },
    }));
    // start at middle via recreate
    const middleStart = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "middle",
          participantA: participantInput("person_a"),
          participantB: participantInput("person_b"),
          participantAActionSourceIdentity: script.identity,
          participantBActionSourceIdentity: script.identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(42).exportState(),
        matchIdGeneratorState: expectOk(
          createInitialMatchIdGeneratorState({
            seed: FIXED_MATCH_ID_STATE_SEED,
            generatorVersion: MATCH_ID_GENERATOR_VERSION,
            namespace: MATCH_ID_NAMESPACE,
          }),
        ),
      },
      sha256Provider,
    );
    expect(middleStart.kind).toBe("success");
    if (middleStart.kind !== "success") return;
    const state = resolveOne(middleStart.battleState, script.canonical, script.identity);
    const first = state.detailedLog.actionLogs[0]!;
    const bogusAfter = createSeededRng(999).exportState();
    const tampered = {
      ...state,
      detailedLog: {
        ...state.detailedLog,
        actionLogs: [
          { ...first, rngStateAfter: bogusAfter },
          ...state.detailedLog.actionLogs.slice(1),
        ],
      },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("is deterministic for same input/seed and leaves inputs unchanged on replay failure", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const a = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const b = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    expect(toCanonicalJson(a.participantA)).toBe(toCanonicalJson(b.participantA));
    expect(toCanonicalJson(a.detailedLog)).toBe(toCanonicalJson(b.detailedLog));

    const before = toCanonicalJson(a);
    const prepared = prepareBattleTurn({ battleState: a }, sha256Provider);
    expect(prepared.kind).toBe("success");
    if (prepared.kind !== "success") {
      throw new Error("prepare");
    }
    const failed = resolveBattleTurn(
      {
        battleState: {
          ...a,
          participantA: {
            ...a.participantA,
            currentDurability: a.participantA.currentDurability - 1,
          },
        },
        preparedTurn: prepared.preparedTurn,
        participantAActionsSource: {
          identity: script.identity,
          canonicalScript: script.canonical,
        },
        participantBActionsSource: {
          identity: script.identity,
          canonicalScript: script.canonical,
        },
        runRuleSnapshot,
      },
      sha256Provider,
    );
    expect(failed.kind).toBe("failure");
    expect(toCanonicalJson(a)).toBe(before);
  });

  it("replays focus_mind turn-end recovery for first and second actor", () => {
    for (const focusSide of ["sideA", "sideB"] as const) {
      const script = buildScript(() =>
        focusSide === "sideA"
          ? { sideA: { kind: "focus_mind" }, sideB: { kind: "basic_defense" } }
          : { sideA: { kind: "basic_defense" }, sideB: { kind: "focus_mind" } },
      );
      const after = resolveOne(startBattle(script.identity), script.canonical, script.identity);
      expect(validateBattleStateReplayConsistency(after, runRuleSnapshot).ok).toBe(true);
      const focusLog = after.detailedLog.actionLogs.find(
        (l) => l.resolvedAction.kind === "focus_mind",
      );
      expect(focusLog?.focusBaseRecovery).not.toBeNull();
      expect(focusLog?.focusAppliedRecovery).not.toBeNull();
    }
  });

  it("replays surrender / opponent_ended_battle", () => {
    const script = buildScript(() => ({
      sideA: { kind: "surrender" },
      sideB: { kind: "basic_defense" },
    }));
    const after = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    expect(after.participantA.surrendered).toBe(true);
    expect(
      after.detailedLog.actionLogs.some((l) => l.replacementReason === "opponent_ended_battle"),
    ).toBe(true);
    expect(validateBattleStateReplayConsistency(after, runRuleSnapshot).ok).toBe(true);
  });
});

describe("S01-006 fix5 fix1 coordinated semantic tampers", () => {
  it("rejects basic_defense actorMentalAfter chained across later target mental and final", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const first = state.detailedLog.actionLogs[0]!;
    const second = state.detailedLog.actionLogs[1]!;
    const delta = -1;
    const firstTampered = { ...first, actorMentalAfter: first.actorMentalAfter + delta };
    const affectsSecondTarget = second.actorSide !== first.actorSide;
    const secondTampered = {
      ...second,
      targetMentalBefore:
        affectsSecondTarget && second.targetMentalBefore !== null
          ? second.targetMentalBefore + delta
          : second.targetMentalBefore,
      targetMentalAfter:
        affectsSecondTarget && second.targetMentalAfter !== null
          ? second.targetMentalAfter + delta
          : second.targetMentalAfter,
    };
    const actorKey = first.actorSide === "sideA" ? "participantA" : "participantB";
    const tampered = {
      ...withLogs(state, [firstTampered, secondTampered]),
      [actorKey]: {
        ...state[actorKey],
        currentMental: state[actorKey].currentMental + delta,
      },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects basic_defense guardingAfter + final guarding simultaneous false", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const logs = state.detailedLog.actionLogs.map((log) =>
      log.resolvedAction.kind === "basic_defense" ? { ...log, guardingAfter: false } : log,
    );
    const tampered = {
      ...withLogs(state, logs),
      participantA: { ...state.participantA, guarding: false },
      participantB: { ...state.participantB, guarding: false },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects consumption delta/after across two turns for same actor + final", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    state = resolveOne(state, script.canonical, script.identity);
    expect(state.turnNumber).toBe(2);
    const sideALogs = state.detailedLog.actionLogs.filter((l) => l.actorSide === "sideA");
    expect(sideALogs.length).toBeGreaterThanOrEqual(2);
    const t1 = sideALogs[0]!;
    const t2 = sideALogs[1]!;
    const bump = 7;
    const logs = state.detailedLog.actionLogs.map((log) => {
      if (log === t1) {
        return {
          ...log,
          inBattleConsumptionDelta: log.inBattleConsumptionDelta + bump,
          inBattleConsumptionAfter: log.inBattleConsumptionAfter + bump,
        };
      }
      if (log === t2) {
        return {
          ...log,
          inBattleConsumptionBefore: log.inBattleConsumptionBefore + bump,
          inBattleConsumptionDelta: log.inBattleConsumptionDelta,
          inBattleConsumptionAfter: log.inBattleConsumptionAfter + bump,
        };
      }
      // Later logs of the same actor or opponent seeing after values may need chain;
      // bump any subsequent sideA consumption before/after for structural continuity.
      if (log.actorSide === "sideA" && log.actionSequence > t2.actionSequence) {
        return {
          ...log,
          inBattleConsumptionBefore: log.inBattleConsumptionBefore + bump,
          inBattleConsumptionAfter: log.inBattleConsumptionAfter + bump,
        };
      }
      return log;
    });
    const tampered = {
      ...withLogs(state, logs),
      participantA: {
        ...state.participantA,
        inBattleConsumption: state.participantA.inBattleConsumption + bump,
      },
    };
    expect(validateBattleState(tampered, sha256Provider).ok).toBe(true);
    const replay = validateBattleDetailedLogReplay(tampered, runRuleSnapshot);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(
        replay.issues.some(
          (i) =>
            i.path.includes("inBattleConsumption") ||
            i.path.includes("participantA/inBattleConsumption"),
        ),
      ).toBe(true);
    }
  });

  it("rejects activationSucceeded flip with follow-up nulls / use counts / final aligned", () => {
    const script = buildScript(() => ({
      sideA: { kind: "use_technique", techniqueId: asTechniqueId(TECHNIQUE_ALPHA) },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const techLog = state.detailedLog.actionLogs.find((l) => l.activationRoll !== null);
    expect(techLog).toBeDefined();
    const wasSuccess = techLog!.activationSucceeded === true;
    const logs = state.detailedLog.actionLogs.map((log) => {
      if (log !== techLog) return log;
      if (wasSuccess) {
        return {
          ...log,
          activationSucceeded: false,
          activationFailureReason: "activation_roll_failed",
          hitChance: null,
          hitRoll: null,
          hit: null,
          damage: null,
          damageVariance: null,
          injuryChance: null,
          injuryRoll: null,
          majorInjuryChance: null,
          majorInjuryRoll: null,
          injuryResult: null,
          targetDurabilityAfter: log.targetDurabilityBefore,
          targetMentalAfter: log.targetMentalBefore,
        };
      }
      return {
        ...log,
        activationSucceeded: true,
        activationFailureReason: null,
      };
    });
    const actorKey = techLog!.actorSide === "sideA" ? "participantA" : "participantB";
    const techniques = state[actorKey].techniques.map((t) =>
      t.techniqueId === TECHNIQUE_ALPHA
        ? {
            ...t,
            successfulUseCount: wasSuccess
              ? Math.max(0, t.successfulUseCount - 1)
              : t.successfulUseCount + 1,
          }
        : t,
    );
    const tampered = {
      ...withLogs(state, logs),
      [actorKey]: { ...state[actorKey], techniques },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects hit flip with damage/injury/final coordinated rewrite", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const attack = state.detailedLog.actionLogs.find((l) => l.hitRoll !== null)!;
    expect(attack).toBeDefined();
    const targetKey = attack.actorSide === "sideA" ? "participantB" : "participantA";
    const actorKey = attack.actorSide === "sideA" ? "participantA" : "participantB";
    if (attack.hit === true) {
      const logs = state.detailedLog.actionLogs.map((log) =>
        log === attack
          ? {
              ...log,
              hit: false,
              damage: null,
              damageVariance: null,
              injuryResult: null,
              injuryRoll: null,
              injuryChance: null,
              majorInjuryChance: null,
              majorInjuryRoll: null,
              targetDurabilityAfter: log.targetDurabilityBefore,
            }
          : log,
      );
      const tampered = {
        ...withLogs(state, logs),
        [actorKey]: {
          ...state[actorKey],
          damageDealt: 0,
          successfulHits: Math.max(0, state[actorKey].successfulHits - 1),
        },
        [targetKey]: {
          ...state[targetKey],
          currentDurability: attack.targetDurabilityBefore ?? state[targetKey].currentDurability,
          damageReceived: 0,
          injury: state[targetKey].sourceSnapshot.injury,
        },
      };
      expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
    } else {
      const logs = state.detailedLog.actionLogs.map((log) =>
        log === attack
          ? {
              ...log,
              hit: true,
              damage: 1,
              damageVariance: log.damageVariance ?? 10000,
              targetDurabilityAfter: Math.max(0, (log.targetDurabilityBefore ?? 1) - 1),
            }
          : log,
      );
      const tampered = {
        ...withLogs(state, logs),
        [actorKey]: {
          ...state[actorKey],
          damageDealt: state[actorKey].damageDealt + 1,
          successfulHits: state[actorKey].successfulHits + 1,
        },
        [targetKey]: {
          ...state[targetKey],
          currentDurability: Math.max(0, state[targetKey].currentDurability - 1),
          damageReceived: state[targetKey].damageReceived + 1,
        },
      };
      expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
    }
  });

  it("rejects injuryResult/final injury rewrite while keeping injuryRoll", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    for (let i = 0; i < 8; i += 1) {
      if (state.status !== "in_progress") break;
      state = resolveOne(state, script.canonical, script.identity);
      const injuredLog = state.detailedLog.actionLogs.find(
        (l) => l.injuryResult === "minor" || l.injuryResult === "major",
      );
      if (injuredLog !== undefined) {
        const flipped = (injuredLog.injuryResult === "minor" ? "major" : "minor") as
          "minor" | "major";
        const logs: BattleActionLog[] = state.detailedLog.actionLogs.map((log) =>
          log === injuredLog ? { ...log, injuryResult: flipped } : log,
        );
        const targetKey = injuredLog.actorSide === "sideA" ? "participantB" : "participantA";
        const tampered = {
          ...withLogs(state, logs),
          [targetKey]: {
            ...state[targetKey],
            injury: Math.min(100, state[targetKey].injury + 11),
          },
        };
        expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
        return;
      }
    }
    const hitLog = state.detailedLog.actionLogs.find((l) => l.hit === true);
    expect(hitLog).toBeDefined();
    const logs = state.detailedLog.actionLogs.map((log) =>
      log === hitLog
        ? {
            ...log,
            injuryResult: "minor" as const,
            // keep injuryRoll as recorded (may be null); derivation must disagree
          }
        : log,
    );
    const targetKey = hitLog!.actorSide === "sideA" ? "participantB" : "participantA";
    const tampered = {
      ...withLogs(state, logs),
      [targetKey]: {
        ...state[targetKey],
        injury: Math.min(
          100,
          state[targetKey].injury + sprint1Config.battle.injury.minorInjuryDelta,
        ),
      },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects movementRoll-consistent rangeAfter/final range rewrite", () => {
    const script = buildScript(() => ({
      sideA: { kind: "approach" },
      sideB: { kind: "approach" },
    }));
    const middleStart = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "middle",
          participantA: participantInput("person_a"),
          participantB: participantInput("person_b"),
          participantAActionSourceIdentity: script.identity,
          participantBActionSourceIdentity: script.identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: expectOk(
          createInitialMatchIdGeneratorState({
            seed: FIXED_MATCH_ID_STATE_SEED,
            generatorVersion: MATCH_ID_GENERATOR_VERSION,
            namespace: MATCH_ID_NAMESPACE,
          }),
        ),
      },
      sha256Provider,
    );
    expect(middleStart.kind).toBe("success");
    if (middleStart.kind !== "success") return;
    const state = resolveOne(middleStart.battleState, script.canonical, script.identity);
    const move = state.detailedLog.actionLogs.find((l) => l.movementRoll !== null)!;
    const newRange: BattleRange = move.rangeAfter === "close" ? "contact" : "close";
    const logs: BattleActionLog[] = state.detailedLog.actionLogs.map((log) =>
      log === move
        ? { ...log, rangeAfter: newRange }
        : { ...log, rangeBefore: newRange, rangeAfter: newRange },
    );
    expect(
      validateBattleDetailedLogReplay(
        { ...withLogs(state, logs), range: newRange },
        runRuleSnapshot,
      ).ok,
    ).toBe(false);
  });

  it("rejects rangeShiftApplied inconsistent with rangeShiftBlockRoll", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    for (let i = 0; i < 6; i += 1) {
      state = resolveOne(state, script.canonical, script.identity);
      const blocked = state.detailedLog.actionLogs.find((l) => l.rangeShiftBlockRoll !== null);
      if (blocked !== undefined) {
        const logs = state.detailedLog.actionLogs.map((log) =>
          log === blocked
            ? {
                ...log,
                rangeShiftApplied: !log.rangeShiftApplied,
                rangeAfter: log.rangeBefore,
              }
            : log,
        );
        expect(validateBattleDetailedLogReplay(withLogs(state, logs), runRuleSnapshot).ok).toBe(
          false,
        );
        return;
      }
    }
    const attack = state.detailedLog.actionLogs.find((l) => l.hit === true)!;
    const logs = state.detailedLog.actionLogs.map((log) =>
      log === attack
        ? {
            ...log,
            rangeShiftBlockRoll: 1,
            rangeShiftBlockChance: 100,
            rangeShiftApplied: true,
          }
        : log,
    );
    expect(validateBattleDetailedLogReplay(withLogs(state, logs), runRuleSnapshot).ok).toBe(false);
  });

  it("rejects structurally coordinated priority/firstSide rewrite vs derivation", () => {
    // Use evade (priority 2) vs defense (priority 0) so order is deterministic without RNG.
    const script = buildScript(() => ({
      sideA: { kind: "evade", direction: "hold" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const order = state.detailedLog.turnOrderLogs[0]!;
    expect(order.resolvedFirstSide).toBe("sideA");
    const first = state.detailedLog.actionLogs[0]!;
    const second = state.detailedLog.actionLogs[1]!;
    expect(first.actorSide).toBe("sideA");
    const chainCursor = order.rngStateAfterOrder;
    // Flip firstSide to sideB and swap ActionLog order with matching sequences /
    // priorities / RNG chain so structural continuity holds; derivation still expects A first.
    const swappedFirst = {
      ...second,
      actionSequence: 0,
      priority: 2,
      actionOrderScore: null,
      rngStateBefore: chainCursor,
      rngStateAfter: chainCursor,
      rangeBefore: first.rangeBefore,
      rangeAfter: first.rangeBefore,
    };
    const swappedSecond = {
      ...first,
      actionSequence: 1,
      priority: 0,
      actionOrderScore: null,
      rngStateBefore: chainCursor,
      rngStateAfter: chainCursor,
      rangeBefore: first.rangeBefore,
      rangeAfter: first.rangeBefore,
    };
    const tampered = {
      ...state,
      detailedLog: {
        turnOrderLogs: [
          {
            ...order,
            resolvedFirstSide: "sideB" as const,
            sideAPriority: 0,
            sideBPriority: 2,
            sideAActionOrderScore: null,
            sideBActionOrderScore: null,
            sideAOrderRoll: null,
            sideBOrderRoll: null,
            tieBreakRoll: null,
            rngStateAfterOrder: chainCursor,
          },
        ],
        actionLogs: [swappedFirst, swappedSecond],
      },
      rngState: chainCursor,
    };
    expect(validateBattleState(tampered, sha256Provider).ok).toBe(true);
    const replay = validateBattleDetailedLogReplay(tampered, runRuleSnapshot);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(
        replay.issues.some(
          (i) =>
            i.path.includes("resolvedFirstSide") ||
            i.path.includes("priority") ||
            i.path.includes("actorSide"),
        ),
      ).toBe(true);
    }
  });

  it("rejects advantageTurnAwardedTo + final advantageTurnCount coordinated rewrite", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    let state = startBattle(script.identity);
    for (let i = 0; i < 5; i += 1) {
      state = resolveOne(state, script.canonical, script.identity);
      const awarded = state.detailedLog.actionLogs.find((l) => l.advantageTurnAwardedTo !== null);
      if (awarded !== undefined) {
        const flipped: BattleSide = awarded.advantageTurnAwardedTo === "sideA" ? "sideB" : "sideA";
        const logs: BattleActionLog[] = state.detailedLog.actionLogs.map((log) =>
          log === awarded ? { ...log, advantageTurnAwardedTo: flipped } : log,
        );
        const tampered = {
          ...withLogs(state, logs),
          participantA: {
            ...state.participantA,
            advantageTurnCount:
              flipped === "sideA"
                ? state.participantA.advantageTurnCount + 1
                : Math.max(0, state.participantA.advantageTurnCount - 1),
          },
          participantB: {
            ...state.participantB,
            advantageTurnCount:
              flipped === "sideB"
                ? state.participantB.advantageTurnCount + 1
                : Math.max(0, state.participantB.advantageTurnCount - 1),
          },
        };
        expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
        return;
      }
    }
    const logs = state.detailedLog.actionLogs.map((log, idx, arr) =>
      idx === arr.length - 1 ? { ...log, advantageTurnAwardedTo: "sideA" as const } : log,
    );
    const tampered = {
      ...withLogs(state, logs),
      participantA: {
        ...state.participantA,
        advantageTurnCount: state.participantA.advantageTurnCount + 1,
      },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });

  it("rejects alternate battleSeed-rooted complete chain bound onto original battleSeed", () => {
    const script = buildScript(() => ({
      sideA: { kind: "approach" },
      sideB: { kind: "approach" },
    }));
    const startA = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "middle",
          participantA: participantInput("person_a"),
          participantB: participantInput("person_b"),
          participantAActionSourceIdentity: script.identity,
          participantBActionSourceIdentity: script.identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: expectOk(
          createInitialMatchIdGeneratorState({
            seed: FIXED_MATCH_ID_STATE_SEED,
            generatorVersion: MATCH_ID_GENERATOR_VERSION,
            namespace: MATCH_ID_NAMESPACE,
          }),
        ),
      },
      sha256Provider,
    );
    const startB = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "middle",
          participantA: participantInput("person_a"),
          participantB: participantInput("person_b"),
          participantAActionSourceIdentity: script.identity,
          participantBActionSourceIdentity: script.identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(888).exportState(),
        matchIdGeneratorState: expectOk(
          createInitialMatchIdGeneratorState({
            seed: FIXED_MATCH_ID_STATE_SEED,
            generatorVersion: MATCH_ID_GENERATOR_VERSION,
            namespace: MATCH_ID_NAMESPACE,
          }),
        ),
      },
      sha256Provider,
    );
    expect(startA.kind).toBe("success");
    expect(startB.kind).toBe("success");
    if (startA.kind !== "success" || startB.kind !== "success") return;
    expect(startA.battleState.battleSeed).not.toBe(startB.battleState.battleSeed);
    const resolvedB = resolveOne(startB.battleState, script.canonical, script.identity);
    // Bind original battleSeed onto B's complete chain; recompute battleInputHash so
    // validateBattleState succeeds while replay sees battleSeed-root RNG mismatch.
    const reboundSeed = startA.battleState.battleSeed;
    const reboundHash = expectOk(
      computeBattleInputHash(
        {
          matchId: resolvedB.matchId,
          simulationId: resolvedB.simulationId,
          worldDate: resolvedB.worldDate,
          battleKind: resolvedB.battleKind,
          initialRange: resolvedB.initialRange,
          participantASourceSnapshotHash: resolvedB.participantA.sourceSnapshotHash,
          participantBSourceSnapshotHash: resolvedB.participantB.sourceSnapshotHash,
          battleRulesRefHash: resolvedB.battleRulesRefHash,
          runRuleSnapshotHash: resolvedB.runRuleSnapshotHash,
          participantAActionSourceIdentity: resolvedB.participantAActionSourceIdentity,
          participantBActionSourceIdentity: resolvedB.participantBActionSourceIdentity,
          battleSeed: reboundSeed,
        },
        sha256Provider,
      ),
    );
    const tampered = {
      ...resolvedB,
      battleSeed: reboundSeed,
      battleInputHash: reboundHash,
    };
    expect(validateBattleState(tampered, sha256Provider).ok).toBe(true);
    const replay = validateBattleDetailedLogReplay(tampered, runRuleSnapshot);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(
        replay.issues.some(
          (i) =>
            i.path.includes("rngStateBeforeOrder") ||
            i.path === "/detailedLog/turnOrderLogs/0/rngStateBeforeOrder",
        ),
      ).toBe(true);
    }
  });

  it("rejects every final bind field individually for participantA and B", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const keys = [
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
    ] as const;
    for (const who of ["participantA", "participantB"] as const) {
      for (const key of keys) {
        const base = state[who][key];
        const patched =
          typeof base === "boolean" ? !base : typeof base === "number" ? base + 1 : base;
        expect(
          validateBattleDetailedLogReplay(
            { ...state, [who]: { ...state[who], [key]: patched } },
            runRuleSnapshot,
          ).ok,
        ).toBe(false);
      }
      for (const useKey of ["attemptedUseCount", "successfulUseCount"] as const) {
        const techniques = state[who].techniques.map((t, idx) =>
          idx === 0 ? { ...t, [useKey]: t[useKey] + 1 } : t,
        );
        expect(
          validateBattleDetailedLogReplay(
            { ...state, [who]: { ...state[who], techniques } },
            runRuleSnapshot,
          ).ok,
        ).toBe(false);
      }
    }
  });
});

describe("S01-006 fix5 fix1 normal boundary replay", () => {
  it("accepts defense/evade/focus/surrender/attack/technique/movement mixes", () => {
    const cases: Array<{
      build: () => { sideA: BattleAction; sideB: BattleAction };
      range?: "contact" | "middle";
    }> = [
      { build: () => ({ sideA: { kind: "basic_defense" }, sideB: { kind: "basic_defense" } }) },
      {
        build: () => ({
          sideA: { kind: "evade", direction: "hold" },
          sideB: { kind: "basic_attack", profile: "unarmed" },
        }),
      },
      { build: () => ({ sideA: { kind: "focus_mind" }, sideB: { kind: "basic_defense" } }) },
      { build: () => ({ sideA: { kind: "basic_defense" }, sideB: { kind: "focus_mind" } }) },
      { build: () => ({ sideA: { kind: "surrender" }, sideB: { kind: "basic_defense" } }) },
      {
        build: () => ({
          sideA: { kind: "basic_attack", profile: "unarmed" },
          sideB: { kind: "basic_defense" },
        }),
      },
      {
        build: () => ({
          sideA: { kind: "use_technique", techniqueId: asTechniqueId(TECHNIQUE_ALPHA) },
          sideB: { kind: "basic_defense" },
        }),
      },
      {
        build: () => ({ sideA: { kind: "approach" }, sideB: { kind: "retreat" } }),
        range: "middle",
      },
      {
        build: () => ({
          sideA: { kind: "focus_mind" },
          sideB: { kind: "basic_attack", profile: "unarmed" },
        }),
      },
    ];
    for (const entry of cases) {
      const script = buildScript(entry.build);
      if (entry.range === "middle") {
        const middleStart = startBattleTransaction(
          {
            createBattleRequest: {
              simulationId: runRuleSnapshot.simulationId,
              worldDate,
              battleKind: "official",
              initialRange: "middle",
              participantA: participantInput("person_a"),
              participantB: participantInput("person_b"),
              participantAActionSourceIdentity: script.identity,
              participantBActionSourceIdentity: script.identity,
              runRuleSnapshot,
            },
            worldRngState: createSeededRng(777).exportState(),
            matchIdGeneratorState: expectOk(
              createInitialMatchIdGeneratorState({
                seed: FIXED_MATCH_ID_STATE_SEED,
                generatorVersion: MATCH_ID_GENERATOR_VERSION,
                namespace: MATCH_ID_NAMESPACE,
              }),
            ),
          },
          sha256Provider,
        );
        expect(middleStart.kind).toBe("success");
        if (middleStart.kind !== "success") continue;
        const after = resolveOne(middleStart.battleState, script.canonical, script.identity);
        expect(validateBattleStateReplayConsistency(after, runRuleSnapshot).ok).toBe(true);
      } else {
        const after = resolveOne(startBattle(script.identity), script.canonical, script.identity);
        expect(validateBattleStateReplayConsistency(after, runRuleSnapshot).ok).toBe(true);
      }
    }
  });

  it("accepts multi-turn mix with same-seed full equality", () => {
    const script = buildScript((turn) => {
      if (turn % 3 === 1) {
        return {
          sideA: { kind: "basic_attack", profile: "unarmed" },
          sideB: { kind: "basic_defense" },
        };
      }
      if (turn % 3 === 2) {
        return {
          sideA: { kind: "focus_mind" },
          sideB: { kind: "evade", direction: "hold" },
        };
      }
      return {
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_attack", profile: "unarmed" },
      };
    });
    let a = startBattle(script.identity);
    let b = startBattle(script.identity);
    for (let i = 0; i < 3; i += 1) {
      a = resolveOne(a, script.canonical, script.identity);
      b = resolveOne(b, script.canonical, script.identity);
      expect(validateBattleStateReplayConsistency(a, runRuleSnapshot).ok).toBe(true);
    }
    expect(toCanonicalJson(a)).toBe(toCanonicalJson(b));
  });
});

describe("S01-006 fix5 fix2 requestedAction no_action gate", () => {
  it("rejects requestedAction={kind:no_action} in validateBattleActionLog", () => {
    const script = buildScript(() => ({
      sideA: { kind: "surrender" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const cancelled = state.detailedLog.actionLogs.find(
      (l) => l.replacementReason === "opponent_ended_battle",
    )!;
    expect(cancelled.resolvedAction.kind).toBe("no_action");
    expect(validateBattleActionLog(cancelled).ok).toBe(true);
    expect(
      validateBattleActionLog({
        ...cancelled,
        requestedAction: { kind: "no_action" },
      }).ok,
    ).toBe(false);
  });

  it("rejects no_action requestedAction when passed to replay directly", () => {
    const script = buildScript(() => ({
      sideA: { kind: "surrender" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const logs = state.detailedLog.actionLogs.map((log) =>
      log.replacementReason === "opponent_ended_battle"
        ? { ...log, requestedAction: { kind: "no_action" as const } }
        : log,
    );
    const replay = validateBattleDetailedLogReplay(withLogs(state, logs as never), runRuleSnapshot);
    expect(replay.ok).toBe(false);
    if (!replay.ok) {
      expect(replay.issues.some((i) => i.path.includes("requestedAction"))).toBe(true);
    }
  });

  it("accepts resolved no_action + opponent_ended_battle normal logs", () => {
    const script = buildScript(() => ({
      sideA: { kind: "surrender" },
      sideB: { kind: "approach" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    expect(
      state.detailedLog.actionLogs.some((l) => l.replacementReason === "opponent_ended_battle"),
    ).toBe(true);
    expect(validateBattleStateReplayConsistency(state, runRuleSnapshot).ok).toBe(true);
  });

  it("rejects coordinated requested/resolved/replacement/final unable_to_act forgery", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const first = state.detailedLog.actionLogs[0]!;
    const forged = {
      ...first,
      requestedAction: { kind: "basic_attack" as const, profile: "unarmed" as const },
      resolvedAction: { kind: "no_action" as const },
      replacementReason: "unable_to_act" as const,
      invalidActionCountDelta: 1 as const,
      guardingAfter: false,
      passiveActionCountDelta: 1,
    };
    const actorKey = first.actorSide === "sideA" ? "participantA" : "participantB";
    const tampered = {
      ...withLogs(state, [forged, ...state.detailedLog.actionLogs.slice(1)]),
      [actorKey]: {
        ...state[actorKey],
        canAct: false,
        unableToContinue: true,
        guarding: false,
        invalidActionCount: state[actorKey].invalidActionCount + 1,
        passiveActionCount: state[actorKey].passiveActionCount + 1,
      },
    };
    expect(validateBattleDetailedLogReplay(tampered, runRuleSnapshot).ok).toBe(false);
  });
});

describe("S01-006 fix5 fix2 strategy provenance", () => {
  it("rejects scripted strategy meta non-null tampers", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    const first = state.detailedLog.actionLogs[0]!;
    for (const patch of [
      { strategySeed: 1 },
      { strategyCandidateScores: [{ action: { kind: "basic_defense" }, score: 1 }] },
      { strategyTieBreakUsed: true },
    ] as const) {
      const logs = state.detailedLog.actionLogs.map((log) =>
        log === first ? { ...log, ...patch } : log,
      );
      expect(validateBattleDetailedLogReplay(withLogs(state, logs), runRuleSnapshot).ok).toBe(
        false,
      );
    }
  });

  it("rejects default strategy seed / scores / tieBreak / coordinated selection tampers", () => {
    const defaultIdentity = expectOk(
      createDefaultStrategyActionSourceIdentity({
        strategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
        strategyConfigHash: sprint1ConfigHash,
      }),
    );
    let state: BattleState | null = null;
    let target: BattleActionLog | undefined;
    for (let worldSeed = 777; worldSeed < 1200 && target === undefined; worldSeed += 1) {
      const started = startBattleTransaction(
        {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            // close: unarmed+sword basic_attack co-legal for profile swap.
            initialRange: "close",
            participantA: participantInput("person_a"),
            participantB: participantInput("person_b"),
            participantAActionSourceIdentity: defaultIdentity,
            participantBActionSourceIdentity: defaultIdentity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(worldSeed).exportState(),
          matchIdGeneratorState: expectOk(
            createInitialMatchIdGeneratorState({
              seed: FIXED_MATCH_ID_STATE_SEED,
              generatorVersion: MATCH_ID_GENERATOR_VERSION,
              namespace: MATCH_ID_NAMESPACE,
            }),
          ),
        },
        sha256Provider,
      );
      if (started.kind !== "success") continue;
      const prepared = prepareBattleTurn({ battleState: started.battleState }, sha256Provider);
      if (prepared.kind !== "success") continue;
      const resolved = resolveBattleTurn(
        {
          battleState: started.battleState,
          preparedTurn: prepared.preparedTurn,
          participantAActionsSource: { identity: defaultIdentity },
          participantBActionsSource: { identity: defaultIdentity },
          runRuleSnapshot,
        },
        sha256Provider,
      );
      if (resolved.kind !== "success") continue;
      state = resolved.battleState;
      target = state.detailedLog.actionLogs.find((log) => {
        if (log.strategyCandidateScores === null || log.strategyCandidateScores.length < 2) {
          return false;
        }
        if (log.replacementReason !== null) return false;
        if (log.requestedAction.kind !== "basic_attack") return false;
        const key = toCanonicalJson(log.requestedAction);
        return log.strategyCandidateScores.some(
          (entry) => entry.action.kind === "basic_attack" && toCanonicalJson(entry.action) !== key,
        );
      });
      // If turn 1 did not select basic_attack, try a few more turns on the same battle.
      if (target === undefined && state.status === "in_progress") {
        let cur = state;
        for (
          let extra = 0;
          extra < 4 && target === undefined && cur.status === "in_progress";
          extra += 1
        ) {
          const prep2 = prepareBattleTurn({ battleState: cur }, sha256Provider);
          if (prep2.kind !== "success") break;
          const res2 = resolveBattleTurn(
            {
              battleState: cur,
              preparedTurn: prep2.preparedTurn,
              participantAActionsSource: { identity: defaultIdentity },
              participantBActionsSource: { identity: defaultIdentity },
              runRuleSnapshot,
            },
            sha256Provider,
          );
          if (res2.kind !== "success") break;
          cur = res2.battleState;
          state = cur;
          target = cur.detailedLog.actionLogs.find((log) => {
            if (log.strategyCandidateScores === null || log.strategyCandidateScores.length < 2) {
              return false;
            }
            if (log.replacementReason !== null) return false;
            if (log.requestedAction.kind !== "basic_attack") return false;
            const key = toCanonicalJson(log.requestedAction);
            return log.strategyCandidateScores.some(
              (entry) =>
                entry.action.kind === "basic_attack" && toCanonicalJson(entry.action) !== key,
            );
          });
        }
      }
    }
    expect(state).not.toBeNull();
    expect(validateBattleStateReplayConsistency(state!, runRuleSnapshot).ok).toBe(true);
    expect(target).toBeDefined();

    const metaLog =
      state!.detailedLog.actionLogs.find((l) => l.strategyCandidateScores !== null) ?? target!;
    expect(
      validateBattleDetailedLogReplay(
        withLogs(
          state!,
          state!.detailedLog.actionLogs.map((log) =>
            log === metaLog ? { ...log, strategySeed: (log.strategySeed ?? 0) + 1 } : log,
          ),
        ),
        runRuleSnapshot,
      ).ok,
    ).toBe(false);

    if (metaLog.strategyCandidateScores !== null) {
      const tweakedScores = metaLog.strategyCandidateScores.map((entry, idx) =>
        idx === 0 ? { ...entry, score: entry.score + 1 } : entry,
      );
      expect(
        validateBattleDetailedLogReplay(
          withLogs(
            state!,
            state!.detailedLog.actionLogs.map((log) =>
              log === metaLog ? { ...log, strategyCandidateScores: tweakedScores } : log,
            ),
          ),
          runRuleSnapshot,
        ).ok,
      ).toBe(false);
    }

    expect(
      validateBattleDetailedLogReplay(
        withLogs(
          state!,
          state!.detailedLog.actionLogs.map((log) =>
            log === metaLog
              ? { ...log, strategyTieBreakUsed: !(log.strategyTieBreakUsed === true) }
              : log,
          ),
        ),
        runRuleSnapshot,
      ).ok,
    ).toBe(false);

    const scores = target!.strategyCandidateScores!;
    const selectedKey = toCanonicalJson(target!.requestedAction);
    const sameKindAlts = scores.filter(
      (entry) =>
        entry.action.kind === "basic_attack" && toCanonicalJson(entry.action) !== selectedKey,
    );
    expect(sameKindAlts.length).toBeGreaterThanOrEqual(1);
    const altEntry = sameKindAlts[0]!;
    const altKey = toCanonicalJson(altEntry.action);
    const otherMax = Math.max(
      ...scores.filter((entry) => toCanonicalJson(entry.action) !== altKey).map((e) => e.score),
    );
    const promotedScores = scores.map((entry) =>
      toCanonicalJson(entry.action) === altKey
        ? { action: entry.action, score: otherMax + 1 }
        : { action: entry.action, score: entry.score },
    );
    // Unique winner, no tie-break metadata.
    expect(promotedScores.filter((e) => e.score === otherMax + 1)).toHaveLength(1);
    const tamperedFirst: BattleActionLog = {
      ...target!,
      requestedAction: altEntry.action,
      resolvedAction: altEntry.action,
      strategyCandidateScores: promotedScores,
      strategyTieBreakUsed: false,
      strategySeed: null,
    };
    const logValidation = validateBattleActionLog(tamperedFirst);
    expect(logValidation.ok).toBe(true);
    const coordinatedState = withLogs(
      state!,
      state!.detailedLog.actionLogs.map((log) => (log === target ? tamperedFirst : log)),
    );
    const stateOk = validateBattleState(coordinatedState, sha256Provider);
    expect(stateOk.ok).toBe(true);
    const coordinatedReplay = validateBattleDetailedLogReplay(coordinatedState, runRuleSnapshot);
    expect(coordinatedReplay.ok).toBe(false);
    if (!coordinatedReplay.ok) {
      expect(
        coordinatedReplay.issues.some(
          (i) =>
            i.path.includes("requestedAction") ||
            i.path.includes("strategySeed") ||
            i.path.includes("strategyCandidateScores") ||
            i.path.includes("strategyTieBreakUsed"),
        ),
      ).toBe(true);
      expect(
        coordinatedReplay.issues.every(
          (i) =>
            !i.message.includes("canonical BattleAction order") &&
            !i.message.includes("duplicate strategy candidate"),
        ),
      ).toBe(true);
    }
  });

  it("accepts normal scripted strategy logs with null strategy meta", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "approach" },
    }));
    const state = resolveOne(startBattle(script.identity), script.canonical, script.identity);
    for (const log of state.detailedLog.actionLogs) {
      expect(log.strategySeed).toBeNull();
      expect(log.strategyCandidateScores).toBeNull();
      expect(log.strategyTieBreakUsed).toBeNull();
    }
    expect(validateBattleStateReplayConsistency(state, runRuleSnapshot).ok).toBe(true);
  });
});

describe("S01-006 fix5 fix2 evasion/defense/injury boundary replay", () => {
  function startWithSeed(
    script: ReturnType<typeof buildScript>,
    seed: number,
    opts?: {
      snapshot?: RunRuleSnapshot;
      participantA?: Record<string, unknown>;
      participantB?: Record<string, unknown>;
    },
  ): BattleState | null {
    const snapshot = opts?.snapshot ?? runRuleSnapshot;
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: snapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: opts?.participantA ?? participantInput("person_a"),
          participantB: opts?.participantB ?? participantInput("person_b"),
          participantAActionSourceIdentity: script.identity,
          participantBActionSourceIdentity: script.identity,
          runRuleSnapshot: snapshot,
        },
        worldRngState: createSeededRng(seed).exportState(),
        matchIdGeneratorState: expectOk(
          createInitialMatchIdGeneratorState({
            seed: FIXED_MATCH_ID_STATE_SEED,
            generatorVersion: MATCH_ID_GENERATOR_VERSION,
            namespace: MATCH_ID_NAMESPACE,
          }),
        ),
      },
      sha256Provider,
    );
    return started.kind === "success" ? started.battleState : null;
  }

  function withoutEvadeHitChance(withEvadeChance: number): number {
    const hit = sprint1Config.battle.hit;
    return Math.min(hit.maximumPercent, withEvadeChance + hit.evadePenalty);
  }

  /**
   * Guard適用前 normalDamage を production 公開純関数から再計算する。
   * ActionLog.damageVariance は観測値として渡し、rollDamageWithVariance の RNG 引き出しに供給する
   * （分散適用式のテスト内複製はしない）。
   */
  function recomputeNormalDamageBeforeGuard(
    actor: BattleParticipantSnapshot,
    target: BattleParticipantSnapshot,
    category: TechniqueCategory,
    varianceBp: number,
  ): number {
    const profile = expectOk(getBasicAttackProfile(sprint1Config, category));
    const primary = expectOk(averagePrimaryStatSurface(actor.stats, profile.primaryStats));
    const raw = expectOk(
      computeRawDamage({
        techniquePower: profile.power,
        primaryStatValue: primary,
        domainAptitude: actor.aptitudes[category].surfaceValue,
        masteryDisplay: profile.effectiveMastery,
        defenderStamina: target.stats.stamina.surfaceValue,
        defenderSkill: target.stats.skill.surfaceValue,
        defenderCondition: target.condition,
        defenderFatigue: target.fatigue,
        defenderInjury: target.injury,
        formula: sprint1Config.battle.damageFormula,
      }),
    );
    const stubRng = {
      nextInt(): number {
        return varianceBp;
      },
    } as unknown as SeededRng;
    const rolled = expectOk(
      rollDamageWithVariance(stubRng, raw, sprint1Config.battle.damageFormula),
    );
    expect(rolled.varianceBp).toBe(varianceBp);
    return rolled.damage;
  }

  const registeredInjuryConfigVersions = new Set<string>();

  function buildCustomInjurySnapshot(
    configVersion: string,
    opts?: { majorChanceWhenInjured?: number },
  ): RunRuleSnapshot {
    const customRaw = JSON.parse(toCanonicalJson(sprint1Config)) as typeof sprint1Config & {
      configVersion: string;
    };
    customRaw.configVersion = configVersion;
    customRaw.battle.injury.minorInjuryDelta = 7;
    customRaw.battle.injury.majorInjuryDelta = 19;
    customRaw.battle.injury.unableToContinueThreshold = 40;
    if (opts?.majorChanceWhenInjured !== undefined) {
      // Already-normalized config uses basis points (0.20 → 2000).
      (customRaw.battle.injury as { majorChanceWhenInjured: number }).majorChanceWhenInjured =
        opts.majorChanceWhenInjured;
    }
    if (!registeredInjuryConfigVersions.has(configVersion)) {
      registerKnownSprint1ConfigVersion(configVersion, toCanonicalJson(customRaw));
      registeredInjuryConfigVersions.add(configVersion);
    }
    const customConfig = expectOk(validateNormalizedSprint1Config(customRaw));
    const customConfigHash = sha256Provider.hashUtf8(toCanonicalJson(customConfig));
    const customIdentity = {
      ...simulationIdentity(),
      sprint1ConfigHash: customConfigHash,
    };
    const customIdentityHash = expectOk(
      computeSimulationIdentityHash(customIdentity, sha256Provider),
    );
    return expectOk(
      createRunRuleSnapshot(
        {
          simulationIdentity: customIdentity,
          simulationIdentityHash: customIdentityHash,
          initialMatchIdGeneratorState: expectOk(
            createInitialMatchIdGeneratorState({
              seed: FIXED_MATCH_ID_STATE_SEED,
              generatorVersion: MATCH_ID_GENERATOR_VERSION,
              namespace: MATCH_ID_NAMESPACE,
            }),
          ),
          worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
          yearStartProcessorManifest: defaultYearStartManifest,
          sprint1Config: customConfig,
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions,
        },
        sha256Provider,
      ),
    );
  }

  it("accepts evade-caused miss with successfulEvasions +1", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "evade", direction: "hold" },
    }));
    let foundSeed: number | null = null;
    let after: BattleState | null = null;
    let attack: BattleActionLog | null = null;
    for (let seed = 700; seed < 900; seed += 1) {
      const started = startWithSeed(script, seed);
      if (started === null) continue;
      const resolved = resolveOne(started, script.canonical, script.identity);
      const hitLog = resolved.detailedLog.actionLogs.find(
        (l) => l.actorSide === "sideA" && l.hitRoll !== null,
      );
      if (hitLog === undefined || hitLog.hit !== false || hitLog.hitChance === null) continue;
      const withoutEvade = withoutEvadeHitChance(hitLog.hitChance);
      if (!(hitLog.hitChance < hitLog.hitRoll! && withoutEvade >= hitLog.hitRoll!)) continue;
      if (resolved.participantB.successfulEvasions !== 1) continue;
      foundSeed = seed;
      after = resolved;
      attack = hitLog;
      break;
    }
    expect(foundSeed).not.toBeNull();
    expect(attack).not.toBeNull();
    expect(after).not.toBeNull();
    expect(
      after!.detailedLog.actionLogs.some(
        (l) => l.actorSide === "sideB" && l.resolvedAction.kind === "evade",
      ),
    ).toBe(true);
    expect(validateBattleStateReplayConsistency(after!, runRuleSnapshot).ok).toBe(true);
  });

  it("accepts non-evade miss while target.evading without incrementing successfulEvasions", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "evade", direction: "hold" },
    }));
    let foundSeed: number | null = null;
    let after: BattleState | null = null;
    let attack: BattleActionLog | null = null;
    for (let seed = 1; seed < 300; seed += 1) {
      const started = startWithSeed(script, seed, {
        participantA: participantInput("person_a", { skill: 5 }),
        participantB: participantInput("person_b", { speed: 95 }),
      });
      if (started === null) continue;
      const resolved = resolveOne(started, script.canonical, script.identity);
      const hitLog = resolved.detailedLog.actionLogs.find(
        (l) => l.actorSide === "sideA" && l.hitRoll !== null,
      );
      if (hitLog === undefined || hitLog.hit !== false || hitLog.hitChance === null) continue;
      const withoutEvade = withoutEvadeHitChance(hitLog.hitChance);
      if (!(withoutEvade < hitLog.hitRoll!)) continue;
      if (resolved.participantB.successfulEvasions !== 0) continue;
      foundSeed = seed;
      after = resolved;
      attack = hitLog;
      break;
    }
    expect(foundSeed).not.toBeNull();
    expect(attack).not.toBeNull();
    expect(
      after!.detailedLog.actionLogs.some(
        (l) => l.actorSide === "sideB" && l.resolvedAction.kind === "evade",
      ),
    ).toBe(true);
    expect(validateBattleStateReplayConsistency(after!, runRuleSnapshot).ok).toBe(true);
  });

  it("accepts guard damage reduction with successfulDefenses +1", () => {
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    let foundSeed: number | null = null;
    let after: BattleState | null = null;
    let hit: BattleActionLog | null = null;
    let beforeDefenses = 0;
    let normalDamage = 0;
    for (let seed = 900; seed < 1200; seed += 1) {
      const started = startWithSeed(script, seed, {
        participantA: participantInput("person_a", { strength: 90, skill: 90 }),
      });
      if (started === null) continue;
      const defensesBefore = started.participantB.successfulDefenses;
      const actorBefore = started.participantA;
      const targetBefore = started.participantB;
      const resolved = resolveOne(started, script.canonical, script.identity);
      const hitLog = resolved.detailedLog.actionLogs.find(
        (l) =>
          l.actorSide === "sideA" &&
          l.hit === true &&
          (l.damage ?? 0) >= 2 &&
          l.rangeShiftBlockRoll === null &&
          l.damageVariance !== null,
      );
      if (hitLog === undefined) continue;
      const recomputed = recomputeNormalDamageBeforeGuard(
        actorBefore,
        targetBefore,
        "unarmed",
        hitLog.damageVariance!,
      );
      const guarded = expectOk(
        applyGuardedDamage(recomputed, "basicAttack", sprint1Config.battle.defense),
      );
      if (guarded.reducedBy < 1) continue;
      if (guarded.guardedDamage !== hitLog.damage) continue;
      if (resolved.participantB.successfulDefenses !== defensesBefore + 1) continue;
      foundSeed = seed;
      after = resolved;
      hit = hitLog;
      beforeDefenses = defensesBefore;
      normalDamage = recomputed;
      break;
    }
    expect(foundSeed).not.toBeNull();
    expect(hit).not.toBeNull();
    expect(hit!.rangeShiftBlockRoll).toBeNull();
    const guarded = expectOk(
      applyGuardedDamage(normalDamage, "basicAttack", sprint1Config.battle.defense),
    );
    expect(guarded.reducedBy).toBeGreaterThanOrEqual(1);
    expect(guarded.guardedDamage).toBe(hit!.damage);
    expect(after!.participantB.successfulDefenses).toBe(beforeDefenses + 1);
    expect(validateBattleStateReplayConsistency(after!, runRuleSnapshot).ok).toBe(true);
  });

  it("accepts guard with damage=1 / reducedBy=0 and no rangeShiftBlock as successfulDefenses +0", () => {
    expect(
      expectOk(applyGuardedDamage(1, "basicAttack", sprint1Config.battle.defense)).reducedBy,
    ).toBe(0);
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    }));
    let foundSeed: number | null = null;
    let after: BattleState | null = null;
    let hit: BattleActionLog | null = null;
    let beforeDefenses = 0;
    for (let seed = 1; seed < 500; seed += 1) {
      const started = startWithSeed(script, seed, {
        participantA: participantInput("person_a", { strength: 1, skill: 20 }),
        participantB: participantInput("person_b", {
          stamina: 95,
          skill: 95,
          speed: 1,
        }),
      });
      if (started === null) continue;
      const defensesBefore = started.participantB.successfulDefenses;
      const resolved = resolveOne(started, script.canonical, script.identity);
      const hitLog = resolved.detailedLog.actionLogs.find(
        (l) =>
          l.actorSide === "sideA" &&
          l.hit === true &&
          l.damage === 1 &&
          l.rangeShiftBlockRoll === null,
      );
      if (hitLog === undefined) continue;
      if (resolved.participantB.successfulDefenses !== defensesBefore) continue;
      foundSeed = seed;
      after = resolved;
      hit = hitLog;
      beforeDefenses = defensesBefore;
      break;
    }
    expect(foundSeed).not.toBeNull();
    expect(hit).not.toBeNull();
    expect(hit!.damage).toBe(1);
    expect(hit!.rangeShiftBlockRoll).toBeNull();
    expect(
      expectOk(applyGuardedDamage(1, "basicAttack", sprint1Config.battle.defense)).reducedBy,
    ).toBe(0);
    expect(after!.participantB.successfulDefenses).toBe(beforeDefenses);
    expect(validateBattleStateReplayConsistency(after!, runRuleSnapshot).ok).toBe(true);
  });

  it("accepts custom minor injury delta replay", () => {
    // majorChance=0 → every injury is minor; BattleState delta must be exactly 7.
    const customSnapshot = buildCustomInjurySnapshot(
      "sprint1-balance-test-injury-fix5-fix3-minor-0.0.1",
      { majorChanceWhenInjured: 0 },
    );
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "focus_mind" },
    }));
    let foundSeed: number | null = null;
    let finalState: BattleState | null = null;
    for (let seed = 1; seed < 80 && foundSeed === null; seed += 1) {
      let state = startWithSeed(script, seed, {
        snapshot: customSnapshot,
        participantA: participantInput("person_a", { strength: 95, skill: 95 }),
        participantB: {
          ...participantInput("person_b"),
          temporaryCondition: { fatigue: 60, injury: 5, condition: 10, confidence: 0 },
        },
      });
      if (state === null) continue;
      for (let turn = 0; turn < 8 && state.status === "in_progress"; turn += 1) {
        const beforeInjury = state.participantB.injury;
        expect(beforeInjury + 7).toBeLessThanOrEqual(100);
        const turnStart = state.detailedLog.actionLogs.length;
        state = resolveOne(state, script.canonical, script.identity, customSnapshot);
        const newLogs = state.detailedLog.actionLogs.slice(turnStart);
        const sideAAttack = newLogs.find(
          (l) => l.actorSide === "sideA" && l.resolvedAction.kind === "basic_attack",
        );
        if (sideAAttack === undefined || sideAAttack.injuryResult !== "minor") continue;
        const injuryAppsToB = newLogs.filter((l) => {
          if (l.injuryResult !== "minor" && l.injuryResult !== "major") return false;
          const targetSide = l.actorSide === "sideA" ? "sideB" : "sideA";
          return targetSide === "sideB";
        });
        expect(injuryAppsToB).toHaveLength(1);
        expect(state.participantB.injury - beforeInjury).toBe(7);
        foundSeed = seed;
        finalState = state;
        break;
      }
    }
    expect(foundSeed).not.toBeNull();
    expect(validateBattleStateReplayConsistency(finalState!, customSnapshot).ok).toBe(true);
  });

  it("accepts custom major injury delta replay", () => {
    // majorChance=100% → every injury is major; BattleState delta must be exactly 19.
    const customSnapshot = buildCustomInjurySnapshot(
      "sprint1-balance-test-injury-fix5-fix3-major-0.0.1",
      { majorChanceWhenInjured: 10000 },
    );
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "focus_mind" },
    }));
    let foundSeed: number | null = null;
    let finalState: BattleState | null = null;
    for (let seed = 1; seed < 80 && foundSeed === null; seed += 1) {
      let state = startWithSeed(script, seed, {
        snapshot: customSnapshot,
        participantA: participantInput("person_a", { strength: 95, skill: 95 }),
        participantB: {
          ...participantInput("person_b"),
          temporaryCondition: { fatigue: 60, injury: 5, condition: 10, confidence: 0 },
        },
      });
      if (state === null) continue;
      for (let turn = 0; turn < 8 && state.status === "in_progress"; turn += 1) {
        const beforeInjury = state.participantB.injury;
        expect(beforeInjury + 19).toBeLessThanOrEqual(100);
        const turnStart = state.detailedLog.actionLogs.length;
        state = resolveOne(state, script.canonical, script.identity, customSnapshot);
        const newLogs = state.detailedLog.actionLogs.slice(turnStart);
        const sideAAttack = newLogs.find(
          (l) => l.actorSide === "sideA" && l.resolvedAction.kind === "basic_attack",
        );
        if (sideAAttack === undefined || sideAAttack.injuryResult !== "major") continue;
        const injuryAppsToB = newLogs.filter((l) => {
          if (l.injuryResult !== "minor" && l.injuryResult !== "major") return false;
          const targetSide = l.actorSide === "sideA" ? "sideB" : "sideA";
          return targetSide === "sideB";
        });
        expect(injuryAppsToB).toHaveLength(1);
        expect(state.participantB.injury - beforeInjury).toBe(19);
        foundSeed = seed;
        finalState = state;
        break;
      }
    }
    expect(foundSeed).not.toBeNull();
    expect(validateBattleStateReplayConsistency(finalState!, customSnapshot).ok).toBe(true);
  });

  it("accepts custom unableToContinueThreshold replay", () => {
    const customSnapshot = buildCustomInjurySnapshot(
      "sprint1-balance-test-injury-fix5-fix3-threshold-0.0.1",
      { majorChanceWhenInjured: 0 },
    );
    const script = buildScript(() => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "focus_mind" },
    }));
    let foundSeed: number | null = null;
    let finalState: BattleState | null = null;
    for (let seed = 1; seed < 80 && foundSeed === null; seed += 1) {
      let state = startWithSeed(script, seed, {
        snapshot: customSnapshot,
        participantA: participantInput("person_a", { strength: 95, skill: 95 }),
        participantB: {
          ...participantInput("person_b"),
          temporaryCondition: { fatigue: 60, injury: 35, condition: 10, confidence: 0 },
        },
      });
      if (state === null) continue;
      for (let turn = 0; turn < 8 && state.status === "in_progress"; turn += 1) {
        const beforeA = state.participantA.injury;
        const beforeB = state.participantB.injury;
        state = resolveOne(state, script.canonical, script.identity, customSnapshot);
        for (const who of ["participantA", "participantB"] as const) {
          const before = who === "participantA" ? beforeA : beforeB;
          if (before < 40 && state[who].injury >= 40) {
            expect(state[who].unableToContinue).toBe(true);
            expect(state[who].canAct).toBe(false);
            foundSeed = seed;
            finalState = state;
            break;
          }
        }
        if (foundSeed !== null) break;
      }
    }
    expect(foundSeed).not.toBeNull();
    expect(validateBattleStateReplayConsistency(finalState!, customSnapshot).ok).toBe(true);
  });
});
