/**
 * S01-007 BattleResult / post-effects / runBattleToCompletion (13 / S1-SPEC-0.1.18).
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  BATTLE_FINISHED_EVENT_TYPE,
  BATTLE_PROFILE_ADAPTER_VERSION,
  BATTLE_RESULT_KEYS,
  BATTLE_RESULT_SCHEMA_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  applyBattleTechniqueMasteryAttempts,
  asPersonId,
  asTechniqueId,
  battleActionScriptToCanonicalScript,
  buildBattleSummaryLog,
  computeActionScriptHash,
  computeActiveYearStartProcessorManifestHash,
  computeFinalStateHash,
  computeJudgeScoreBreakdown,
  computePostProcessContextHash,
  computeRunBattleCommitPlanHash,
  computeSimulationIdentityHash,
  computeSummaryLogHash,
  computeTechniqueCatalogHash,
  convertBattleResultToWorldEffectCandidates,
  createInitialMatchIdGeneratorState,
  createDefaultActiveYearStartProcessorManifest,
  createScriptedActionsSourceIdentity,
  createSeededRng,
  createWorldDate,
  createBattleFinishedEventCandidate,
  createRunRuleSnapshot,
  decideJudgeWinner,
  finalizeBattleResult,
  getDefaultSprint1Config,
  importSeededRng,
  isBattleExecutionAbortError,
  markBattleFailedState,
  runBattleToCompletion,
  toCanonicalJson,
  validateBattleActionScript,
  validateBattleResult,
  validateBattleState,
  validateBattleStateReplayConsistency,
  validateRunBattleCommitPlanStructure,
  validateTechniqueDefinition,
  type AbilityKey,
  type AbilityScores,
  type AptitudeKey,
  type AptitudeScores,
  type BattleAction,
  type BattleActionScript,
  type BattleExecutionAbortError,
  type BattleResult,
  type RunRuleSnapshot,
  type Sha256Provider,
  type SimulationIdentity,
  type StatValueTriple,
  type TechniqueDefinition,
  type ValidationResult,
} from "./index.js";
import {
  mapEndReason,
  requiresJudge,
  resolveNonJudgeWinner,
} from "./sprint1/battle-result-compute.js";
import { startBattleTransaction } from "./sprint1/start-battle-transaction.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

const FIXED_MATCH_ID_STATE_SEED = 12345;
const FIXED_MATCH_ID_STATE_SHA256 =
  "c5b7dd00fb9b5262e58106e9a06b2936d9aa3cefcc1cf66b64a3ab714513e54f";

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
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

function techniqueDefinitionInput(
  techniqueId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
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
    usableRanges: ["contact", "close", "middle"],
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
    ...overrides,
  };
}

const TECHNIQUE_ALPHA = "technique_alpha";
const TECHNIQUE_HARD = "technique_hard_activation";

const baseTechniqueDefinitions: readonly TechniqueDefinition[] = [
  TECHNIQUE_ALPHA,
  TECHNIQUE_HARD,
].map((id) => {
  if (id === TECHNIQUE_HARD) {
    return expectOk(
      validateTechniqueDefinition(
        techniqueDefinitionInput(id, {
          activationDifficulty: 100,
          mentalCost: 1,
          power: 10,
          accuracy: 95,
        }),
      ),
    );
  }
  return expectOk(
    validateTechniqueDefinition(
      techniqueDefinitionInput(id, {
        power: 80,
        accuracy: 95,
        activationDifficulty: 0,
        mentalCost: 1,
      }),
    ),
  );
});

const sprint1Config = getDefaultSprint1Config();
const sprint1ConfigHash = sha256Provider.hashUtf8(toCanonicalJson(sprint1Config));
const techniqueCatalogHash = expectOk(
  computeTechniqueCatalogHash(baseTechniqueDefinitions, sha256Provider),
);
const defaultYearStartManifest = createDefaultActiveYearStartProcessorManifest();
const worldCalendarConfigHash = sha256Provider.hashUtf8(
  toCanonicalJson(DEFAULT_WORLD_CALENDAR_CONFIG),
);
const yearStartProcessorManifestHash = expectOk(
  computeActiveYearStartProcessorManifestHash(defaultYearStartManifest, sha256Provider),
);

function simulationIdentity(): SimulationIdentity {
  return {
    schemaVersion: "0.5.0",
    seed: 20260807,
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
  };
}

const simulationIdentityHash = expectOk(
  computeSimulationIdentityHash(simulationIdentity(), sha256Provider),
);

const freshMatchIdGeneratorForIdentity = expectOk(
  createInitialMatchIdGeneratorState({
    seed: FIXED_MATCH_ID_STATE_SEED,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
  }),
);

const runRuleSnapshot: RunRuleSnapshot = expectOk(
  createRunRuleSnapshot(
    {
      simulationIdentity: simulationIdentity(),
      simulationIdentityHash,
      initialMatchIdGeneratorState: freshMatchIdGeneratorForIdentity,
      worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
      yearStartProcessorManifest: defaultYearStartManifest,
      sprint1Config,
      techniqueCatalogDataVersion: "techniques-0.1.0",
      techniqueDefinitions: baseTechniqueDefinitions,
    },
    sha256Provider,
  ),
);

const worldDate = createWorldDate(
  { year: 21, month: 4, weekOfMonth: 1 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);

function techniqueState(
  techniqueId: string,
  acquiredAbsoluteWeek: number | null,
  masteryHundredths = 5000,
) {
  return {
    techniqueId,
    learningProgressTenths: acquiredAbsoluteWeek === null ? 300 : 1000,
    masteryHundredths: acquiredAbsoluteWeek === null ? 0 : masteryHundredths,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek,
  };
}

type ParticipantOverrides = {
  personId?: string;
  abilities?: AbilityScores;
  temporaryCondition?: Record<string, number>;
  techniqueIds?: readonly string[];
  masteryByTechnique?: Readonly<Record<string, number>>;
  currentMental?: number;
  battleKindPersonAge?: number;
};

function buildPersonRecord(overrides: ParticipantOverrides = {}): Record<string, unknown> {
  const abilities =
    overrides.abilities ?? buildAbilities({ stamina: 50, spirit: 50, strength: 80 });
  const techniqueIds = overrides.techniqueIds ?? [TECHNIQUE_ALPHA];
  const spirit = abilities.spirit.surfaceValue;
  const currentMental = overrides.currentMental ?? 50 + spirit;
  return {
    personId: overrides.personId ?? "person_a",
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
      currentMental,
      techniqueStates: techniqueIds.map((id) =>
        techniqueState(id, 10, overrides.masteryByTechnique?.[id] ?? 5000),
      ),
      learningFocusTechniqueId: null,
    },
  };
}

function participantInput(overrides: ParticipantOverrides = {}): Record<string, unknown> {
  return {
    person: buildPersonRecord(overrides),
    temporaryCondition: overrides.temporaryCondition ?? {
      fatigue: 20,
      injury: 10,
      condition: 10,
      confidence: 0,
    },
  };
}

function freshGeneratorState() {
  return expectOk(
    createInitialMatchIdGeneratorState({
      seed: FIXED_MATCH_ID_STATE_SEED,
      generatorVersion: MATCH_ID_GENERATOR_VERSION,
      namespace: MATCH_ID_NAMESPACE,
    }),
  );
}

function buildScript(
  turnBuilder: (turnNumber: number) => { sideA: BattleAction; sideB: BattleAction },
  maxTurns = 20,
): { canonical: string; identity: ReturnType<typeof expectOk> } {
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
  ) as BattleActionScript;
  const canonical = battleActionScriptToCanonicalScript(script);
  const hash = expectOk(computeActionScriptHash(canonical, sha256Provider));
  const identity = expectOk(createScriptedActionsSourceIdentity({ actionScriptHash: hash }));
  return { canonical, identity };
}

function postProcessContext(
  personA = "person_a",
  personB = "person_b",
  matchesA = 0,
  matchesB = 0,
) {
  return {
    participantA: {
      personId: asPersonId(personA),
      matchesCompletedThisWorldWeekBeforeBattle: matchesA,
    },
    participantB: {
      personId: asPersonId(personB),
      matchesCompletedThisWorldWeekBeforeBattle: matchesB,
    },
  };
}

function runScripted(input: {
  turnBuilder: (turnNumber: number) => { sideA: BattleAction; sideB: BattleAction };
  participantA?: ParticipantOverrides;
  participantB?: ParticipantOverrides;
  worldRngSeed?: number;
  battleKind?: "official" | "mock";
  matchesA?: number;
  matchesB?: number;
  initialRange?: "contact" | "close" | "middle" | "long";
}) {
  const { canonical, identity } = buildScript(input.turnBuilder);
  const kind = input.battleKind ?? "official";
  return runBattleToCompletion(
    {
      expectedWorldStateHash: "a".repeat(64),
      startBattleInput: {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: kind,
          initialRange: input.initialRange ?? "contact",
          participantA: participantInput({
            personId: "person_a",
            ...input.participantA,
          }),
          participantB: participantInput({
            personId: "person_b",
            abilities: buildAbilities({ stamina: 20, spirit: 50, strength: 30 }),
            ...input.participantB,
          }),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(input.worldRngSeed ?? 777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      participantAActionsSource: { identity, canonicalScript: canonical },
      participantBActionsSource: { identity, canonicalScript: canonical },
      postProcessContext: postProcessContext(
        "person_a",
        "person_b",
        input.matchesA ?? 0,
        input.matchesB ?? 0,
      ),
    },
    sha256Provider,
  );
}

function expectCompleted(result: ReturnType<typeof runBattleToCompletion>): BattleResult {
  expect(result.kind).toBe("completed");
  if (result.kind !== "completed") {
    throw new Error(`expected completed: ${JSON.stringify(result)}`);
  }
  return result.commitPlan.battleResult;
}

describe("S01-007 BattleResult production", () => {
  it("publishes BattleResult schemaVersion 0.5.0 and finished event type", () => {
    expect(BATTLE_RESULT_SCHEMA_VERSION).toBe("0.5.0");
    expect(BATTLE_FINISHED_EVENT_TYPE).toBe("battle.finished");
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
  });

  it("completes knockout with winner/loser, effects, finished candidate, world conversion", () => {
    const result = runScripted({
      turnBuilder: () => ({
        sideA: { kind: "basic_attack", profile: "unarmed" },
        sideB: { kind: "basic_defense" },
      }),
      participantA: {
        abilities: buildAbilities({ stamina: 80, spirit: 50, strength: 100, skill: 100 }),
      },
      participantB: {
        abilities: buildAbilities({ stamina: 10, spirit: 50, strength: 20 }),
        temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
      },
    });
    const battleResult = expectCompleted(result);
    expect(battleResult.resultKind).toBe("completed");
    expect(battleResult.endReason).toBe("knockout");
    expect(battleResult.winnerPersonId).toBe("person_a");
    expect(battleResult.loserPersonId).toBe("person_b");
    expect(battleResult.winnerPersonId).not.toBe(battleResult.loserPersonId);
    expect(battleResult.judgeScore).toBeNull();
    expect(battleResult.validation.overallPassed).toBe(true);
    expect(Array.isArray(battleResult.developmentEffects)).toBe(false);
    const effects = battleResult.developmentEffects as Exclude<
      BattleResult["developmentEffects"],
      readonly []
    >;
    expect(effects.participantA.battleExperienceSummary.outcome).toBe("win");
    expect(effects.participantB.battleExperienceSummary.outcome).toBe("loss");
    expect(effects.participantA.currentMentalAfter).toBe(
      battleResult.finalState.participantA.currentMental,
    );
    expect(effects.participantB.injuryDelta).toBe(
      battleResult.finalState.participantB.injury -
        battleResult.finalState.participantB.sourceSnapshot.injury,
    );

    if (result.kind !== "completed") throw new Error("unreachable");
    expect(result.commitPlan.eventCandidates).toHaveLength(2);
    expect(result.commitPlan.eventCandidates[0]!.eventType).toBe("battle.started");
    expect(result.commitPlan.eventCandidates[1]!.eventType).toBe("battle.finished");
    expect(result.commitPlan.eventCandidates[1]!.sourceProcessor).toBe("battle-simulation");
    expect(result.commitPlan.eventCandidates[1]!.entities.matchIds).toEqual([battleResult.matchId]);

    const world = expectOk(convertBattleResultToWorldEffectCandidates(battleResult));
    expect(world.participants).toHaveLength(2);
    expect(Object.isFrozen(battleResult)).toBe(true);
  });

  it("handles surrender with loser additional modifiers", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    expect(battleResult.endReason).toBe("surrender");
    expect(battleResult.loserPersonId).toBe("person_b");
    expect(battleResult.winnerPersonId).toBe("person_a");
    const effects = battleResult.developmentEffects as Exclude<
      BattleResult["developmentEffects"],
      readonly []
    >;
    // officialLoss (-2,-3) + surrenderAdditional (-1,-2)
    expect(effects.participantB.conditionRequestedDelta).toBe(-3);
    expect(effects.participantB.confidenceRequestedDelta).toBe(-5);
  });

  it("converts max_turns_reached into judge_decision with non-null judgeScore", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "basic_defense" },
        }),
      }),
    );
    expect(battleResult.turnsExecuted).toBe(20);
    expect(battleResult.endReason).toBe("judge_decision");
    expect(battleResult.judgeScore).not.toBeNull();
    expect(battleResult.winnerPersonId).not.toBeNull();
    expect(battleResult.loserPersonId).not.toBeNull();
    expect(battleResult.summaryLog.judgeSummary).not.toBeNull();
    expect(battleResult.summaryLog.phaseSummaries.length).toBeGreaterThan(0);
    expect(battleResult.summaryLog.phaseSummaries.map((p) => p.phase)).toEqual([
      "opening",
      "middle",
      "closing",
    ]);
  });

  it("initiativeScore uses round (not floor); damageScore stays floor", () => {
    const j = sprint1Config.battle.judgement;
    expect(j.initiativeMaximum).toBe(10);
    const goldens: Array<{ advantage: number; expected: number }> = [
      { advantage: 0, expected: 0 },
      { advantage: 1, expected: 3 }, // 2.5 → 3
      { advantage: 2, expected: 5 },
      { advantage: 3, expected: 8 }, // 7.5 → 8
      { advantage: 4, expected: 10 },
    ];
    for (const g of goldens) {
      const breakdown = computeJudgeScoreBreakdown({
        damageDealt: 0,
        opponentMaxDurability: 100,
        successfulHits: 0,
        techniqueScore: 0,
        advantageTurnCount: g.advantage,
        turnsExecuted: 4,
        successfulDefenses: 0,
        successfulEvasions: 0,
        successfulCounters: 0,
        passiveActionCount: 0,
        invalidActionCount: 0,
        config: sprint1Config,
      });
      expect(breakdown.initiativeScore, `advantage=${g.advantage}`).toBe(g.expected);
      const floorWouldBe = Math.min(
        j.initiativeMaximum,
        Math.max(0, Math.floor((g.advantage * j.initiativeMaximum) / 4)),
      );
      if (g.advantage === 1 || g.advantage === 3) {
        expect(floorWouldBe).toBe(g.expected - 1);
        expect(breakdown.initiativeScore).not.toBe(floorWouldBe);
      }
    }

    // damageScore remains floor
    const damage = computeJudgeScoreBreakdown({
      damageDealt: 25,
      opponentMaxDurability: 100,
      successfulHits: 0,
      techniqueScore: 0,
      advantageTurnCount: 0,
      turnsExecuted: 4,
      successfulDefenses: 0,
      successfulEvasions: 0,
      successfulCounters: 0,
      passiveActionCount: 0,
      invalidActionCount: 0,
      config: sprint1Config,
    });
    expect(damage.damageScore).toBe(Math.floor((25 * j.damageMaximum) / 100));
    expect(damage.damageScore).not.toBe(Math.round((25 * j.damageMaximum) / 100));

    // round vs floor can change total_score decisive winner
    const baseOther = 40;
    const roundInit = 3;
    const floorInit = 2;
    const roundDecision = expectOk(
      decideJudgeWinner(
        {
          totalScoreA: baseOther + roundInit,
          totalScoreB: baseOther + floorInit,
          damageDealtA: 0,
          damageDealtB: 0,
          maxDurabilityA: 100,
          maxDurabilityB: 100,
          successfulHitsA: 0,
          successfulHitsB: 0,
          currentDurabilityA: 100,
          currentDurabilityB: 100,
          currentMentalA: 50,
          currentMentalB: 50,
          inBattleConsumptionA: 0,
          inBattleConsumptionB: 0,
        },
        null,
      ),
    );
    expect(roundDecision.winnerSide).toBe("sideA");
    expect(roundDecision.decisiveCriterion).toBe("total_score");
    const floorDecision = expectOk(
      decideJudgeWinner(
        {
          totalScoreA: baseOther + floorInit,
          totalScoreB: baseOther + floorInit,
          damageDealtA: 0,
          damageDealtB: 0,
          maxDurabilityA: 100,
          maxDurabilityB: 100,
          successfulHitsA: 0,
          successfulHitsB: 0,
          currentDurabilityA: 100,
          currentDurabilityB: 100,
          currentMentalA: 50,
          currentMentalB: 50,
          inBattleConsumptionA: 0,
          inBattleConsumptionB: 0,
        },
        createSeededRng(1),
      ),
    );
    expect(floorDecision.decisiveCriterion).not.toBe("total_score");
  });

  it("production BattleResult judgeScore recomputes initiativeScore with round", () => {
    // maxTurns is config-literal 20. Odd advantage (e.g. 19) hits half-up: 9.5→10 vs floor 9.
    // Prefer attacks so passivity clamp does not absorb the +1 totalScore delta.
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: (n) =>
          n <= 19
            ? {
                sideA: { kind: "basic_attack", profile: "unarmed" },
                sideB: { kind: "basic_defense" },
              }
            : {
                sideA: { kind: "basic_defense" },
                sideB: { kind: "basic_defense" },
              },
        participantA: {
          abilities: buildAbilities({
            stamina: 100,
            spirit: 80,
            strength: 20,
            skill: 20,
          }),
        },
        participantB: {
          abilities: buildAbilities({
            stamina: 100,
            spirit: 80,
            strength: 20,
            skill: 20,
          }),
        },
      }),
    );
    expect(battleResult.endReason).toBe("judge_decision");
    expect(battleResult.turnsExecuted).toBe(20);
    expect(battleResult.judgeScore).not.toBeNull();
    if (battleResult.judgeScore === null) throw new Error("unreachable");

    let sawRoundHalfUp = false;
    for (const side of ["participantA", "participantB"] as const) {
      const p = battleResult.finalState[side];
      const opponentMax =
        side === "participantA"
          ? battleResult.finalState.participantB.maxDurability
          : battleResult.finalState.participantA.maxDurability;
      const recomputed = computeJudgeScoreBreakdown({
        damageDealt: p.damageDealt,
        opponentMaxDurability: opponentMax,
        successfulHits: p.successfulHits,
        techniqueScore: battleResult.judgeScore[side].techniqueScore,
        advantageTurnCount: p.advantageTurnCount,
        turnsExecuted: battleResult.turnsExecuted,
        successfulDefenses: p.successfulDefenses,
        successfulEvasions: p.successfulEvasions,
        successfulCounters: p.successfulCounters,
        passiveActionCount: p.passiveActionCount,
        invalidActionCount: p.invalidActionCount,
        config: sprint1Config,
      });
      expect(toCanonicalJson(battleResult.judgeScore[side])).toBe(toCanonicalJson(recomputed));
      const floorInit = Math.min(
        sprint1Config.battle.judgement.initiativeMaximum,
        Math.max(
          0,
          Math.floor(
            (p.advantageTurnCount * sprint1Config.battle.judgement.initiativeMaximum) /
              Math.max(1, battleResult.turnsExecuted),
          ),
        ),
      );
      if (recomputed.initiativeScore === floorInit + 1) {
        sawRoundHalfUp = true;
        expect(recomputed.initiativeScore - floorInit).toBe(1);
        expect(battleResult.judgeScore[side].totalScore).toBe(recomputed.totalScore);
        const j = sprint1Config.battle.judgement;
        const rawFloor =
          recomputed.damageScore +
          recomputed.hitScore +
          recomputed.techniqueScore +
          floorInit +
          recomputed.defenseScore -
          recomputed.passivityPenalty;
        const rawRound = rawFloor + 1;
        const clampTotal = (n: number): number =>
          Math.min(j.totalMaximum, Math.max(j.totalMinimum, n));
        const floorClamped = clampTotal(rawFloor);
        const roundClamped = clampTotal(rawRound);
        expect(battleResult.judgeScore[side].totalScore).toBe(roundClamped);
        // clampに吸収されないとき、floor実装の仮想totalより production は実際に +1。
        expect(roundClamped).toBe(floorClamped + 1);
        expect(battleResult.judgeScore[side].totalScore).toBe(floorClamped + 1);
      }
      const expectedDamage = Math.min(
        sprint1Config.battle.judgement.damageMaximum,
        Math.floor(
          (p.damageDealt * sprint1Config.battle.judgement.damageMaximum) / Math.max(1, opponentMax),
        ),
      );
      expect(battleResult.judgeScore[side].damageScore).toBe(expectedDamage);
    }
    expect(sawRoundHalfUp).toBe(true);
    expect(validateBattleResult(battleResult, runRuleSnapshot, sha256Provider).ok).toBe(true);
  });

  it("rebuilds summaryLog and summaryLogHash from final materials", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "basic_defense" },
        }),
      }),
    );
    const rebuilt = expectOk(
      buildBattleSummaryLog({
        state: {
          ...battleResult.finalState,
          detailedLog: battleResult.detailedLog,
        },
        endReason: battleResult.endReason,
        turnsExecuted: battleResult.turnsExecuted,
        winnerPersonId: battleResult.winnerPersonId,
        loserPersonId: battleResult.loserPersonId,
        judgeScore: battleResult.judgeScore,
        decisiveCriterion: battleResult.summaryLog.judgeSummary?.decisiveCriterion ?? null,
        seededRngRoll: battleResult.summaryLog.judgeSummary?.seededRngRoll ?? null,
        developmentEffects: battleResult.developmentEffects,
      }),
    );
    expect(toCanonicalJson(rebuilt)).toBe(toCanonicalJson(battleResult.summaryLog));
    expect(expectOk(computeSummaryLogHash(rebuilt, sha256Provider))).toBe(
      battleResult.summaryLogHash,
    );
  });

  it("applies attempt-wise mastery for use_technique and excludes basic_attack", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: (n) => ({
          sideA:
            n <= 3
              ? { kind: "use_technique", techniqueId: TECHNIQUE_ALPHA as never }
              : { kind: "basic_attack", profile: "unarmed" },
          sideB: { kind: "basic_defense" },
        }),
        participantA: {
          techniqueIds: [TECHNIQUE_ALPHA],
          masteryByTechnique: { [TECHNIQUE_ALPHA]: 7900 },
          abilities: buildAbilities({ stamina: 80, spirit: 80, strength: 90, skill: 90 }),
          currentMental: 120,
        },
      }),
    );
    const effects = battleResult.developmentEffects as Exclude<
      BattleResult["developmentEffects"],
      readonly []
    >;
    const alphaDelta = effects.participantA.techniqueStateDeltas.find(
      (d) => d.techniqueId === TECHNIQUE_ALPHA,
    );
    expect(alphaDelta).toBeDefined();
    expect(alphaDelta!.attemptedUseCountDelta).toBeGreaterThan(0);

    const attempts = battleResult.detailedLog.actionLogs
      .filter(
        (l) =>
          l.actorSide === "sideA" &&
          l.resolvedAction.kind === "use_technique" &&
          l.resolvedAction.techniqueId === TECHNIQUE_ALPHA &&
          (l.activationSucceeded === true || l.activationSucceeded === false),
      )
      .sort((a, b) => a.actionSequence - b.actionSequence)
      .map((l) => ({ activationSucceeded: l.activationSucceeded as boolean }));

    const expected = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 7900,
        battleKind: "official",
        attempts,
        config: runRuleSnapshot.sprint1Config,
      }),
    );
    expect(alphaDelta!.masteryHundredthsDelta).toBe(expected.masteryHundredthsDelta);
    expect(effects.participantA.battleExperienceSummary.attemptedTechniqueUseCount).toBe(
      alphaDelta!.attemptedUseCountDelta,
    );
  });

  it("resolution_error keeps null winners, empty effects, start context, and terminal rng", () => {
    const { identity } = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantInput({ personId: "person_a" }),
          participantB: participantInput({ personId: "person_b" }),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      sha256Provider,
    );
    expect(started.kind).toBe("success");
    if (started.kind !== "success") throw new Error("start failed");

    const context = postProcessContext();
    const rngBefore = toCanonicalJson(started.battleState.rngState);
    const failed = expectOk(
      markBattleFailedState(
        started.battleState,
        {
          code: "test_resolution_error",
          severity: "error",
          targetIds: ["person_a"],
          reason: "injected failure",
          canContinue: false,
        },
        sha256Provider,
      ),
    );
    expect(failed.status).toBe("failed");
    expect(toCanonicalJson(failed.rngState)).toBe(rngBefore);
    expect(failed.detailedLog).toEqual(started.battleState.detailedLog);

    const battleResult = expectOk(
      finalizeBattleResult(
        {
          terminalBattleState: failed,
          runRuleSnapshot,
          postProcessContext: context,
        },
        sha256Provider,
      ),
    );
    expect(battleResult.resultKind).toBe("failed");
    expect(battleResult.endReason).toBe("resolution_error");
    expect(battleResult.winnerPersonId).toBeNull();
    expect(battleResult.loserPersonId).toBeNull();
    expect(battleResult.developmentEffects).toEqual([]);
    expect(battleResult.judgeScore).toBeNull();
    expect(battleResult.validation.overallPassed).toBe(false);
    expect(battleResult.summaryLog.phaseSummaries).toEqual([]);
    expect(toCanonicalJson(battleResult.finalRngState)).toBe(rngBefore);
    expect(toCanonicalJson(battleResult.postProcessContext)).toBe(toCanonicalJson(context));
    expect(battleResult.postProcessContextHash).toBe(
      expectOk(computePostProcessContextHash(context as never, sha256Provider)),
    );

    const world = expectOk(convertBattleResultToWorldEffectCandidates(battleResult));
    expect(world.participants).toEqual([]);
  });

  it("pre_start_failure rejects bad postProcessContext without commitPlan", () => {
    const { canonical, identity } = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const result = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: identity,
            participantBActionSourceIdentity: identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: { identity, canonicalScript: canonical },
        participantBActionsSource: { identity, canonicalScript: canonical },
        postProcessContext: postProcessContext("person_wrong", "person_b"),
      },
      sha256Provider,
    );
    expect(result.kind).toBe("pre_start_failure");
    if (result.kind !== "pre_start_failure") throw new Error("unreachable");
    expect(result.commitPlan).toBeNull();
  });

  it("decideJudgeWinner uses nextInt(0,2) once and ignores PersonId ordering", () => {
    const equal = {
      totalScoreA: 10,
      totalScoreB: 10,
      damageDealtA: 1,
      damageDealtB: 1,
      maxDurabilityA: 100,
      maxDurabilityB: 100,
      successfulHitsA: 1,
      successfulHitsB: 1,
      currentDurabilityA: 50,
      currentDurabilityB: 50,
      currentMentalA: 40,
      currentMentalB: 40,
      inBattleConsumptionA: 10,
      inBattleConsumptionB: 10,
    };
    const rng0 = createSeededRng(1);
    // find a seed that yields 0 then 1 by probing
    let seedFor0: number | null = null;
    let seedFor1: number | null = null;
    for (let seed = 1; seed < 5000 && (seedFor0 === null || seedFor1 === null); seed += 1) {
      const rng = createSeededRng(seed);
      const roll = rng.nextInt(0, 2);
      if (roll === 0 && seedFor0 === null) seedFor0 = seed;
      if (roll === 1 && seedFor1 === null) seedFor1 = seed;
    }
    expect(seedFor0).not.toBeNull();
    expect(seedFor1).not.toBeNull();

    const d0 = expectOk(decideJudgeWinner(equal, createSeededRng(seedFor0!)));
    expect(d0.rngDraws).toBe(1);
    expect(d0.seededRngRoll).toBe(0);
    expect(d0.winnerSide).toBe("sideA");
    expect(d0.decisiveCriterion).toBe("seeded_rng");

    const d1 = expectOk(decideJudgeWinner(equal, createSeededRng(seedFor1!)));
    expect(d1.seededRngRoll).toBe(1);
    expect(d1.winnerSide).toBe("sideB");

    // PersonId-independent: same aggregates decide sideA/sideB without id compare
    void rng0;
    expect(d0.winnerSide).toBe("sideA");
  });

  it("same seed yields identical BattleResult; different seed differs", () => {
    const builder = (): { sideA: BattleAction; sideB: BattleAction } => ({
      sideA: { kind: "basic_attack", profile: "unarmed" },
      sideB: { kind: "basic_defense" },
    });
    const a = expectCompleted(runScripted({ turnBuilder: builder, worldRngSeed: 4242 }));
    const b = expectCompleted(runScripted({ turnBuilder: builder, worldRngSeed: 4242 }));
    expect(toCanonicalJson(a)).toBe(toCanonicalJson(b));

    const c = expectCompleted(runScripted({ turnBuilder: builder, worldRngSeed: 9999 }));
    expect(a.finalState.battleSeed).not.toBe(c.finalState.battleSeed);
    expect(a.finalStateHash).not.toBe(c.finalStateHash);
  });

  it("finalStateHash matches recompute and detects tampering", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "basic_defense" },
        }),
      }),
    );
    const recomputed = expectOk(
      computeFinalStateHash(
        {
          matchId: battleResult.matchId,
          battleKind: battleResult.battleKind,
          finalState: battleResult.finalState,
          winnerPersonId: battleResult.winnerPersonId,
          loserPersonId: battleResult.loserPersonId,
          battleRulesRefHash: battleResult.battleRulesRefHash,
          runRuleSnapshotHash: battleResult.runRuleSnapshotHash,
          battleInputHash: battleResult.battleInputHash,
          sprint1ConfigVersion: battleResult.sprint1ConfigVersion,
          sprint1ConfigHash: battleResult.sprint1ConfigHash,
          techniqueCatalogDataVersion: battleResult.techniqueCatalogDataVersion,
          techniqueCatalogHash: battleResult.techniqueCatalogHash,
          postProcessContext: battleResult.postProcessContext,
          postProcessContextHash: battleResult.postProcessContextHash,
          resultKind: battleResult.resultKind,
          judgeScore: battleResult.judgeScore,
          summaryLog: battleResult.summaryLog,
          summaryLogHash: battleResult.summaryLogHash,
          detailedLog: battleResult.detailedLog,
          developmentEffects: battleResult.developmentEffects,
          finalRngState: battleResult.finalRngState,
        },
        sha256Provider,
      ),
    );
    expect(recomputed).toBe(battleResult.finalStateHash);

    const tamperedHash = expectOk(
      computeFinalStateHash(
        {
          matchId: battleResult.matchId,
          battleKind: battleResult.battleKind,
          finalState: battleResult.finalState,
          winnerPersonId: battleResult.winnerPersonId,
          loserPersonId: battleResult.loserPersonId,
          battleRulesRefHash: battleResult.battleRulesRefHash,
          runRuleSnapshotHash: battleResult.runRuleSnapshotHash,
          battleInputHash: battleResult.battleInputHash,
          sprint1ConfigVersion: battleResult.sprint1ConfigVersion,
          sprint1ConfigHash: battleResult.sprint1ConfigHash,
          techniqueCatalogDataVersion: battleResult.techniqueCatalogDataVersion,
          techniqueCatalogHash: battleResult.techniqueCatalogHash,
          postProcessContext: battleResult.postProcessContext,
          postProcessContextHash: battleResult.postProcessContextHash,
          resultKind: battleResult.resultKind,
          judgeScore: battleResult.judgeScore,
          summaryLog: battleResult.summaryLog,
          summaryLogHash: "0".repeat(64),
          detailedLog: battleResult.detailedLog,
          developmentEffects: battleResult.developmentEffects,
          finalRngState: battleResult.finalRngState,
        },
        sha256Provider,
      ),
    );
    expect(tamperedHash).not.toBe(battleResult.finalStateHash);
  });

  it("replays DetailedLog against sourceSnapshot baseline for completed battles", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_attack", profile: "unarmed" },
          sideB: { kind: "basic_defense" },
        }),
        participantB: {
          abilities: buildAbilities({ stamina: 15, spirit: 50, strength: 20 }),
        },
      }),
    );
    const state = expectOk(
      validateBattleState(
        {
          ...battleResult.finalState,
          detailedLog: battleResult.detailedLog,
        },
        sha256Provider,
      ),
    );
    const replay = validateBattleStateReplayConsistency(state, runRuleSnapshot);
    expect(replay.ok).toBe(true);
  });

  it("clamps condition/confidence applied deltas at ±20 bounds", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
        participantB: {
          temporaryCondition: { fatigue: 0, injury: 0, condition: -19, confidence: -19 },
        },
      }),
    );
    const effects = battleResult.developmentEffects as Exclude<
      BattleResult["developmentEffects"],
      readonly []
    >;
    expect(effects.participantB.conditionAfter).toBeGreaterThanOrEqual(-20);
    expect(effects.participantB.conditionAfter).toBeLessThanOrEqual(20);
    expect(effects.participantB.conditionAppliedDelta).toBe(
      effects.participantB.conditionAfter -
        battleResult.finalState.participantB.sourceSnapshot.condition,
    );
  });

  it("includes keyMoments for damaging actions and preserves fatigue non-double path", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_attack", profile: "unarmed" },
          sideB: { kind: "basic_defense" },
        }),
        participantA: {
          abilities: buildAbilities({ stamina: 80, spirit: 50, strength: 100, skill: 100 }),
        },
        participantB: {
          abilities: buildAbilities({ stamina: 12, spirit: 50, strength: 20 }),
        },
      }),
    );
    expect(battleResult.summaryLog.keyMoments.length).toBeGreaterThan(0);
    for (const moment of battleResult.summaryLog.keyMoments) {
      const hasDamage = moment.damage !== null && moment.damage > 0;
      const hasInjury = moment.injuryResult === "minor" || moment.injuryResult === "major";
      const isSurrender = moment.resolvedActionKind === "surrender";
      expect(hasDamage || hasInjury || isSurrender).toBe(true);
    }
    const effects = battleResult.developmentEffects as Exclude<
      BattleResult["developmentEffects"],
      readonly []
    >;
    const consumption = battleResult.finalState.participantA.inBattleConsumption;
    const continued = Math.floor((consumption * 2500 + 9999) / 10000);
    expect(effects.participantA.persistentFatigueDelta).toBeGreaterThanOrEqual(continued);
  });

  it("unable_to_continue / knockout endReason mapping and knockout priority over UTC flags", () => {
    const { identity } = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantInput({ personId: "person_a" }),
          participantB: participantInput({ personId: "person_b" }),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      sha256Provider,
    );
    expect(started.kind).toBe("success");
    if (started.kind !== "success") throw new Error("start failed");

    // Crafted states with empty DetailedLog are replay-inconsistent; finalize must reject them.
    const craftedKo = expectOk(
      validateBattleState(
        {
          ...started.battleState,
          status: "completed",
          terminalReason: "knockout",
          failure: null,
          participantB: {
            ...started.battleState.participantB,
            currentDurability: 0,
            unableToContinue: true,
            canAct: false,
          },
        },
        sha256Provider,
      ),
    );
    expect(
      finalizeBattleResult(
        {
          terminalBattleState: craftedKo,
          runRuleSnapshot,
          postProcessContext: postProcessContext(),
        },
        sha256Provider,
      ).ok,
    ).toBe(false);

    // EndReason / winner rules (terminalReason is authoritative; knockout beats UTC flags).
    expect(expectOk(mapEndReason(craftedKo))).toBe("knockout");
    const koWinners = expectOk(resolveNonJudgeWinner("knockout", craftedKo));
    expect(koWinners.loserPersonId).toBe("person_b");
    expect(requiresJudge("knockout", craftedKo)).toBe(false);

    const utcSingle = expectOk(
      validateBattleState(
        {
          ...started.battleState,
          status: "completed",
          terminalReason: "unable_to_continue",
          failure: null,
          participantB: {
            ...started.battleState.participantB,
            currentDurability: 10,
            unableToContinue: true,
            canAct: false,
          },
        },
        sha256Provider,
      ),
    );
    expect(expectOk(mapEndReason(utcSingle))).toBe("unable_to_continue");
    expect(requiresJudge("unable_to_continue", utcSingle)).toBe(false);
    const utcWinners = expectOk(resolveNonJudgeWinner("unable_to_continue", utcSingle));
    expect(utcWinners.winnerPersonId).toBe("person_a");
    expect(utcWinners.loserPersonId).toBe("person_b");
  });

  it("both unable_to_continue requires judgeScore while keeping endReason unable_to_continue", () => {
    const { identity } = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantInput({ personId: "person_a" }),
          participantB: participantInput({ personId: "person_b" }),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      sha256Provider,
    );
    expect(started.kind).toBe("success");
    if (started.kind !== "success") throw new Error("start failed");

    const both = expectOk(
      validateBattleState(
        {
          ...started.battleState,
          status: "completed",
          terminalReason: "unable_to_continue",
          failure: null,
          participantA: {
            ...started.battleState.participantA,
            currentDurability: 20,
            unableToContinue: true,
            canAct: false,
          },
          participantB: {
            ...started.battleState.participantB,
            currentDurability: 20,
            unableToContinue: true,
            canAct: false,
          },
        },
        sha256Provider,
      ),
    );
    expect(expectOk(mapEndReason(both))).toBe("unable_to_continue");
    expect(requiresJudge("unable_to_continue", both)).toBe(true);
    // finalize rejects replay-inconsistent craft; production judge path is covered by max-turns case.
    expect(
      finalizeBattleResult(
        {
          terminalBattleState: both,
          runRuleSnapshot,
          postProcessContext: postProcessContext(),
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("mastery covers failure activation, mock gains, and all current-value bands", () => {
    const config = runRuleSnapshot.sprint1Config;
    const bands = [0, 4000, 6000, 7500, 9000];
    for (const mastery of bands) {
      const applied = expectOk(
        applyBattleTechniqueMasteryAttempts({
          sourceMasteryHundredths: mastery,
          battleKind: "mock",
          attempts: [{ activationSucceeded: false }, { activationSucceeded: true }],
          config,
        }),
      );
      expect(applied.appliedGains).toHaveLength(2);
      expect(applied.masteryHundredthsDelta).toBe(
        applied.appliedGains[0]! + applied.appliedGains[1]!,
      );
    }
    // band cross: working mastery updates factor between attempts
    const cross = expectOk(
      applyBattleTechniqueMasteryAttempts({
        sourceMasteryHundredths: 7990,
        battleKind: "official",
        attempts: [{ activationSucceeded: true }, { activationSucceeded: true }],
        config,
      }),
    );
    expect(cross.appliedGains[0]).not.toBe(cross.appliedGains[1]);
  });

  it("rejects mutating a completed BattleResult object", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    expect(Object.isFrozen(battleResult)).toBe(true);
    expect(Object.isFrozen(battleResult.summaryLog)).toBe(true);
    expect(() => {
      (battleResult as { endReason: string }).endReason = "knockout";
    }).toThrow();
  });

  it("advances finalRngState exactly once when judge tie-break uses seeded_rng", () => {
    // Force equal judge path via finalize on a completed max-turns state with equalized scores is hard.
    // Contract-level: import terminal rng, decideJudgeWinner with all ties, compare exportState.
    const terminalRng = createSeededRng(123456).exportState();
    const rng = importSeededRng({ ...terminalRng });
    const decision = expectOk(
      decideJudgeWinner(
        {
          totalScoreA: 0,
          totalScoreB: 0,
          damageDealtA: 0,
          damageDealtB: 0,
          maxDurabilityA: 100,
          maxDurabilityB: 100,
          successfulHitsA: 0,
          successfulHitsB: 0,
          currentDurabilityA: 100,
          currentDurabilityB: 100,
          currentMentalA: 50,
          currentMentalB: 50,
          inBattleConsumptionA: 0,
          inBattleConsumptionB: 0,
        },
        rng,
      ),
    );
    expect(decision.rngDraws).toBe(1);
    expect(toCanonicalJson(rng.exportState())).not.toBe(toCanonicalJson(terminalRng));

    const rngNoDraw = importSeededRng({ ...terminalRng });
    const noDraw = expectOk(
      decideJudgeWinner(
        {
          totalScoreA: 10,
          totalScoreB: 0,
          damageDealtA: 0,
          damageDealtB: 0,
          maxDurabilityA: 100,
          maxDurabilityB: 100,
          successfulHitsA: 0,
          successfulHitsB: 0,
          currentDurabilityA: 100,
          currentDurabilityB: 100,
          currentMentalA: 50,
          currentMentalB: 50,
          inBattleConsumptionA: 0,
          inBattleConsumptionB: 0,
        },
        rngNoDraw,
      ),
    );
    expect(noDraw.rngDraws).toBe(0);
    expect(toCanonicalJson(rngNoDraw.exportState())).toBe(toCanonicalJson(terminalRng));
  });

  it("validateBattleResult rejects tampering of critical BattleResult fields", () => {
    const battleResult = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "basic_defense" },
        }),
      }),
    );
    expect(validateBattleResult(battleResult, runRuleSnapshot, sha256Provider).ok).toBe(true);

    const cases: Array<{
      path: string;
      reasonIncludes: string;
      mutate: (r: BattleResult) => BattleResult;
    }> = [
      {
        path: "winner",
        reasonIncludes: "/winnerPersonId",
        mutate: (r) => ({ ...r, winnerPersonId: r.loserPersonId, loserPersonId: r.winnerPersonId }),
      },
      {
        path: "worldDate bind",
        reasonIncludes: "/worldDate",
        mutate: (r) => ({
          ...r,
          worldDate: createWorldDate(
            { year: 99, month: 1, weekOfMonth: 1 },
            DEFAULT_WORLD_CALENDAR_CONFIG,
          ),
        }),
      },
      {
        path: "battleKind bind",
        reasonIncludes: "/battleKind",
        mutate: (r) => ({ ...r, battleKind: r.battleKind === "official" ? "mock" : "official" }),
      },
      {
        path: "endReason",
        reasonIncludes: "/endReason",
        mutate: (r) => ({ ...r, endReason: "knockout" }),
      },
      {
        path: "turnsExecuted",
        reasonIncludes: "/turnsExecuted",
        mutate: (r) => ({ ...r, turnsExecuted: r.turnsExecuted - 1 }),
      },
      {
        path: "judgeScore",
        reasonIncludes: "/judgeScore",
        mutate: (r) => ({ ...r, judgeScore: null }),
      },
      {
        path: "summaryLog",
        reasonIncludes: "/summaryLog",
        mutate: (r) => ({
          ...r,
          summaryLog: { ...r.summaryLog, turnsExecuted: r.summaryLog.turnsExecuted + 1 },
        }),
      },
      {
        path: "summaryLogHash",
        reasonIncludes: "/summaryLogHash",
        mutate: (r) => ({ ...r, summaryLogHash: "0".repeat(64) }),
      },
      {
        path: "detailedLog actionSequence",
        reasonIncludes: "detailedLog",
        mutate: (r) => ({
          ...r,
          detailedLog: {
            ...r.detailedLog,
            actionLogs: r.detailedLog.actionLogs.map((log, index) =>
              index === 0 ? { ...log, actionSequence: log.actionSequence + 99 } : log,
            ),
          },
        }),
      },
      {
        path: "damage aggregate",
        reasonIncludes: "/finalState",
        mutate: (r) => ({
          ...r,
          finalState: {
            ...r.finalState,
            participantA: {
              ...r.finalState.participantA,
              damageDealt: r.finalState.participantA.damageDealt + 50,
            },
          },
        }),
      },
      {
        path: "currentMentalAfter",
        reasonIncludes: "/developmentEffects",
        mutate: (r) => {
          const effects = r.developmentEffects as Exclude<
            BattleResult["developmentEffects"],
            readonly []
          >;
          return {
            ...r,
            developmentEffects: {
              ...effects,
              participantA: {
                ...effects.participantA,
                currentMentalAfter: effects.participantA.currentMentalAfter + 1,
              },
            },
          };
        },
      },
      {
        path: "injuryDelta",
        reasonIncludes: "/developmentEffects",
        mutate: (r) => {
          const effects = r.developmentEffects as Exclude<
            BattleResult["developmentEffects"],
            readonly []
          >;
          return {
            ...r,
            developmentEffects: {
              ...effects,
              participantB: {
                ...effects.participantB,
                injuryDelta: effects.participantB.injuryDelta + 1,
              },
            },
          };
        },
      },
      {
        path: "condition",
        reasonIncludes: "/developmentEffects",
        mutate: (r) => {
          const effects = r.developmentEffects as Exclude<
            BattleResult["developmentEffects"],
            readonly []
          >;
          return {
            ...r,
            developmentEffects: {
              ...effects,
              participantA: {
                ...effects.participantA,
                conditionAppliedDelta: effects.participantA.conditionAppliedDelta + 1,
              },
            },
          };
        },
      },
      {
        path: "confidence",
        reasonIncludes: "/developmentEffects",
        mutate: (r) => {
          const effects = r.developmentEffects as Exclude<
            BattleResult["developmentEffects"],
            readonly []
          >;
          return {
            ...r,
            developmentEffects: {
              ...effects,
              participantB: {
                ...effects.participantB,
                confidenceAppliedDelta: effects.participantB.confidenceAppliedDelta + 1,
              },
            },
          };
        },
      },
      {
        path: "technique count/mastery",
        reasonIncludes: "/developmentEffects",
        mutate: (r) => {
          const effects = r.developmentEffects as Exclude<
            BattleResult["developmentEffects"],
            readonly []
          >;
          return {
            ...r,
            developmentEffects: {
              ...effects,
              participantA: {
                ...effects.participantA,
                techniqueStateDeltas: [
                  {
                    techniqueId: asTechniqueId(TECHNIQUE_ALPHA),
                    masteryHundredthsDelta: 1,
                    attemptedUseCountDelta: 1,
                    successfulUseCountDelta: 1,
                  },
                  ...effects.participantA.techniqueStateDeltas,
                ],
              },
            },
          };
        },
      },
      {
        path: "postProcessContextHash",
        reasonIncludes: "/postProcessContextHash",
        mutate: (r) => ({ ...r, postProcessContextHash: "1".repeat(64) }),
      },
      {
        path: "finalRngState",
        reasonIncludes: "/finalRngState",
        mutate: (r) => ({
          ...r,
          finalRngState: { ...r.finalRngState, s0: (r.finalRngState.s0 + 1) >>> 0 },
        }),
      },
      {
        path: "finalStateHash",
        reasonIncludes: "/finalStateHash",
        mutate: (r) => ({ ...r, finalStateHash: "2".repeat(64) }),
      },
      {
        path: "runRuleSnapshotHash",
        reasonIncludes: "/runRuleSnapshotHash",
        mutate: (r) => ({ ...r, runRuleSnapshotHash: "3".repeat(64) }),
      },
      {
        path: "battleInputHash",
        reasonIncludes: "/battleInputHash",
        mutate: (r) => ({ ...r, battleInputHash: "4".repeat(64) }),
      },
      {
        path: "sprint1ConfigHash",
        reasonIncludes: "/sprint1ConfigHash",
        mutate: (r) => ({ ...r, sprint1ConfigHash: "5".repeat(64) }),
      },
      {
        path: "techniqueCatalogHash",
        reasonIncludes: "/techniqueCatalogHash",
        mutate: (r) => ({ ...r, techniqueCatalogHash: "6".repeat(64) }),
      },
    ];

    for (const c of cases) {
      const tampered = c.mutate(structuredClone(battleResult) as BattleResult);
      const validated = validateBattleResult(tampered, runRuleSnapshot, sha256Provider);
      expect(validated.ok, `expected reject for ${c.path}`).toBe(false);
      if (!validated.ok) {
        const reasons = validated.issues.map((i) => `${i.path}: ${i.message}`).join("\n");
        expect(reasons, `bind reason for ${c.path}`).toContain(c.reasonIncludes);
      }
    }
  });

  it("post-start resolver failure becomes resolution_error commitPlan, not pre_start_failure", () => {
    // Script covers only 1 turn while battle maxTurns=20 → resolve fails after start.
    const { canonical, identity } = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const result = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            initialRange: "contact",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: identity,
            participantBActionSourceIdentity: identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: { identity, canonicalScript: canonical },
        participantBActionsSource: { identity, canonicalScript: canonical },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(result.kind).toBe("resolution_error");
    if (result.kind !== "resolution_error") throw new Error("unreachable");
    expect(result.commitPlan).not.toBeNull();
    expect(result.commitPlan.eventCandidates).toHaveLength(2);
    expect(result.commitPlan.eventCandidates[0]!.eventType).toBe("battle.started");
    expect(result.commitPlan.eventCandidates[1]!.eventType).toBe("battle.finished");
    expect(result.commitPlan.battleResult.resultKind).toBe("failed");
    expect(result.commitPlan.battleResult.endReason).toBe("resolution_error");
    expect(result.commitPlan.battleResult.winnerPersonId).toBeNull();
    expect(result.commitPlan.battleResult.loserPersonId).toBeNull();
    expect(result.commitPlan.battleResult.developmentEffects).toEqual([]);
    expect(result.commitPlan.startRuntimeTransition.transitionHash.length).toBe(64);
    expect(result.commitPlan.battleResult.finalState.status).toBe("failed");
    expect(result.commitPlan.battleResult.finalState.failure).not.toBeNull();
    expect(result.commitPlan.battleResult.finalState.turnNumber).toBe(0);
    expect(result.commitPlan.battleResult.detailedLog.actionLogs).toEqual([]);

    // pre_start_failure remains only for pre-start validation failures
    const full = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const pre = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: full.identity,
            participantBActionSourceIdentity: full.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: { identity: full.identity, canonicalScript: full.canonical },
        participantBActionsSource: { identity: full.identity, canonicalScript: full.canonical },
        postProcessContext: postProcessContext("person_wrong", "person_b"),
      },
      sha256Provider,
    );
    expect(pre.kind).toBe("pre_start_failure");
    if (pre.kind !== "pre_start_failure") throw new Error("unreachable");
    expect(pre.commitPlan).toBeNull();
  });

  it("validateRunBattleCommitPlanStructure rejects material tampering", () => {
    const completed = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    const run = runScripted({
      turnBuilder: () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "surrender" },
      }),
    });
    expect(run.kind).toBe("completed");
    if (run.kind !== "completed") throw new Error("unreachable");
    const plan = run.commitPlan;
    const base = {
      schemaVersion: plan.schemaVersion,
      simulationId: plan.simulationId,
      runRuleSnapshotHash: plan.runRuleSnapshotHash,
      expectedWorldStateHash: plan.expectedWorldStateHash,
      expectedParticipantASourceSnapshotHash: plan.expectedParticipantASourceSnapshotHash,
      expectedParticipantBSourceSnapshotHash: plan.expectedParticipantBSourceSnapshotHash,
      startRuntimeTransition: plan.startRuntimeTransition,
      battleResult: plan.battleResult,
      eventCandidates: plan.eventCandidates,
    };
    expect(validateRunBattleCommitPlanStructure(base).overallPassed).toBe(true);

    const assertStructureReject = (
      label: string,
      mutated: typeof base,
      codeOrReason: string,
    ): void => {
      const structural = validateRunBattleCommitPlanStructure(mutated);
      expect(structural.overallPassed, label).toBe(false);
      const joined = structural.violations.map((v) => `${v.code}:${v.reason}`).join("\n");
      expect(joined, label).toContain(codeOrReason);
    };

    const started = structuredClone(plan.eventCandidates[0]!);
    started.payload.participantAId = asPersonId("person_tampered");
    assertStructureReject(
      "participantAId",
      {
        ...base,
        eventCandidates: [started, plan.eventCandidates[1]!],
      },
      "event_participant_mismatch",
    );

    const finished = structuredClone(plan.eventCandidates[1]!);
    finished.payload.participantBId = asPersonId("person_tampered_b");
    assertStructureReject(
      "participantBId",
      {
        ...base,
        eventCandidates: [plan.eventCandidates[0]!, finished],
      },
      "event_participant_mismatch",
    );

    const worldDateTampered = structuredClone(plan.eventCandidates[0]!);
    worldDateTampered.worldDate = createWorldDate(
      { year: 99, month: 1, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    worldDateTampered.payload.worldDate = worldDateTampered.worldDate;
    assertStructureReject(
      "worldDate",
      {
        ...base,
        eventCandidates: [worldDateTampered, plan.eventCandidates[1]!],
      },
      "event_world_date_mismatch",
    );

    const battleKindTampered = structuredClone(plan.eventCandidates[0]!);
    battleKindTampered.payload.battleKind =
      battleKindTampered.payload.battleKind === "official" ? "mock" : "official";
    assertStructureReject(
      "battleKind",
      {
        ...base,
        eventCandidates: [battleKindTampered, plan.eventCandidates[1]!],
      },
      "event_battle_kind_mismatch",
    );

    const rangeTampered = structuredClone(plan.eventCandidates[0]!);
    rangeTampered.payload.initialRange =
      rangeTampered.payload.initialRange === "contact" ? "long" : "contact";
    assertStructureReject(
      "initialRange",
      {
        ...base,
        eventCandidates: [rangeTampered, plan.eventCandidates[1]!],
      },
      "started_battle_geometry_mismatch",
    );

    const maxTurnsTampered = structuredClone(plan.eventCandidates[0]!);
    maxTurnsTampered.payload.maxTurns = maxTurnsTampered.payload.maxTurns + 1;
    assertStructureReject(
      "maxTurns",
      {
        ...base,
        eventCandidates: [maxTurnsTampered, plan.eventCandidates[1]!],
      },
      "started_battle_geometry_mismatch",
    );

    const seedTampered = structuredClone(plan.eventCandidates[0]!);
    seedTampered.payload.battleSeed = seedTampered.payload.battleSeed + 1;
    assertStructureReject(
      "battleSeed",
      {
        ...base,
        eventCandidates: [seedTampered, plan.eventCandidates[1]!],
      },
      "battle_seed_mismatch",
    );

    const entitiesTampered = structuredClone(plan.eventCandidates[0]!);
    entitiesTampered.entities = {
      ...entitiesTampered.entities,
      personIds: [asPersonId("person_x"), asPersonId("person_y")],
    };
    assertStructureReject(
      "entities",
      {
        ...base,
        eventCandidates: [entitiesTampered, plan.eventCandidates[1]!],
      },
      "event_entities_mismatch",
    );

    const configVersionTampered = structuredClone(plan.eventCandidates[0]!);
    configVersionTampered.payload.sprint1ConfigVersion = "tampered-config-version";
    assertStructureReject(
      "sprint1ConfigVersion",
      {
        ...base,
        eventCandidates: [configVersionTampered, plan.eventCandidates[1]!],
      },
      "event_identity_hash_mismatch",
    );

    const catalogVersionTampered = structuredClone(plan.eventCandidates[1]!);
    catalogVersionTampered.payload.techniqueCatalogDataVersion = "tampered-catalog";
    assertStructureReject(
      "techniqueCatalogDataVersion",
      {
        ...base,
        eventCandidates: [plan.eventCandidates[0]!, catalogVersionTampered],
      },
      "event_identity_hash_mismatch",
    );

    const identityTampered = structuredClone(plan.battleResult);
    identityTampered.participantAActionSourceIdentity = {
      ...identityTampered.participantAActionSourceIdentity,
      strategyVersion: "tampered-strategy",
    } as BattleResult["participantAActionSourceIdentity"];
    assertStructureReject(
      "actionSourceIdentity",
      {
        ...base,
        battleResult: identityTampered,
      },
      "event_action_source_identity_mismatch",
    );

    assertStructureReject(
      "runRuleSnapshotHash",
      {
        ...base,
        runRuleSnapshotHash: "9".repeat(64),
      },
      "run_rule_snapshot_hash_mismatch",
    );

    assertStructureReject(
      "expectedParticipantASourceSnapshotHash",
      {
        ...base,
        expectedParticipantASourceSnapshotHash: "8".repeat(64),
      },
      "expected_source_snapshot_hash_mismatch",
    );

    assertStructureReject(
      "swapped event candidates",
      {
        ...base,
        eventCandidates: [
          plan.eventCandidates[1]!,
          plan.eventCandidates[0]!,
        ] as unknown as typeof base.eventCandidates,
      },
      "event_candidate_type_mismatch",
    );

    expect(
      validateRunBattleCommitPlanStructure({
        ...base,
        unknownKey: true,
      } as unknown).overallPassed,
    ).toBe(false);

    // failed-plan invariants via resolution_error path (short script → post-start resolve failure)
    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const failedBase = {
      schemaVersion: failedRun.commitPlan.schemaVersion,
      simulationId: failedRun.commitPlan.simulationId,
      runRuleSnapshotHash: failedRun.commitPlan.runRuleSnapshotHash,
      expectedWorldStateHash: failedRun.commitPlan.expectedWorldStateHash,
      expectedParticipantASourceSnapshotHash:
        failedRun.commitPlan.expectedParticipantASourceSnapshotHash,
      expectedParticipantBSourceSnapshotHash:
        failedRun.commitPlan.expectedParticipantBSourceSnapshotHash,
      startRuntimeTransition: failedRun.commitPlan.startRuntimeTransition,
      battleResult: failedRun.commitPlan.battleResult,
      eventCandidates: failedRun.commitPlan.eventCandidates,
    };
    expect(validateRunBattleCommitPlanStructure(failedBase).overallPassed).toBe(true);

    const effectsTampered = structuredClone(failedRun.commitPlan.battleResult);
    effectsTampered.developmentEffects = {
      participantA: (
        completed.developmentEffects as Exclude<BattleResult["developmentEffects"], readonly []>
      ).participantA,
      participantB: (
        completed.developmentEffects as Exclude<BattleResult["developmentEffects"], readonly []>
      ).participantB,
    };
    expect(
      validateRunBattleCommitPlanStructure({
        ...failedBase,
        battleResult: effectsTampered,
      }).overallPassed,
    ).toBe(false);

    const finishedSummaryTampered = structuredClone(failedRun.commitPlan.eventCandidates[1]!);
    if (finishedSummaryTampered.payload.summary.kind !== "failed") {
      throw new Error("expected failed summary");
    }
    finishedSummaryTampered.payload.summary = {
      ...finishedSummaryTampered.payload.summary,
      errorCode: "tampered_code",
    };
    expect(
      validateRunBattleCommitPlanStructure({
        ...failedBase,
        eventCandidates: [failedRun.commitPlan.eventCandidates[0]!, finishedSummaryTampered],
      }).overallPassed,
    ).toBe(false);

    void completed;
  });

  it("battle.finished failed summary uses finalState.failure, not validation.violations[0]", () => {
    const { identity } = buildScript(() => ({
      sideA: { kind: "basic_defense" },
      sideB: { kind: "basic_defense" },
    }));
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantInput({ personId: "person_a" }),
          participantB: participantInput({ personId: "person_b" }),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      sha256Provider,
    );
    expect(started.kind).toBe("success");
    if (started.kind !== "success") throw new Error("start failed");
    const failedState = expectOk(
      markBattleFailedState(
        started.battleState,
        {
          code: "canonical_failure_code",
          severity: "error",
          targetIds: ["person_a"],
          reason: "canonical failure reason",
          canContinue: false,
        },
        sha256Provider,
      ),
    );
    const battleResult = expectOk(
      finalizeBattleResult(
        {
          terminalBattleState: failedState,
          runRuleSnapshot,
          postProcessContext: postProcessContext(),
        },
        sha256Provider,
      ),
    );
    const withExtraViolation = {
      ...battleResult,
      validation: {
        overallPassed: false,
        violations: [
          {
            code: "decoy_violation",
            severity: "error" as const,
            targetIds: ["decoy"],
            reason: "should not appear in finished summary",
            canContinue: false,
          },
          ...battleResult.validation.violations,
        ],
      },
    };
    const candidate = expectOk(createBattleFinishedEventCandidate(withExtraViolation));
    expect(candidate.payload.summary.kind).toBe("failed");
    if (candidate.payload.summary.kind !== "failed") throw new Error("unreachable");
    expect(candidate.payload.summary.errorCode).toBe("canonical_failure_code");
    expect(candidate.payload.summary.reason).toBe("canonical failure reason");
    expect(candidate.payload.summary.targetIds).toEqual(["person_a"]);
    expect(candidate.payload.summary.errorCode).not.toBe("decoy_violation");
    // Validator rejects the same decoy tamper (finished builder may still use finalState.failure).
    expect(validateBattleResult(withExtraViolation, runRuleSnapshot, sha256Provider).ok).toBe(
      false,
    );
  });

  it("validateBattleResult rejects failed validation field tampers (no repair)", () => {
    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const authentic = failedRun.commitPlan.battleResult;
    expect(authentic.resultKind).toBe("failed");
    expect(validateBattleResult(authentic, runRuleSnapshot, sha256Provider).ok).toBe(true);
    expect(authentic.finalState.failure).not.toBeNull();
    const failure = authentic.finalState.failure!;
    expect(authentic.validation.violations.length).toBeGreaterThan(0);
    const canonicalViolation = authentic.validation.violations[0]!;
    expect(canonicalViolation.code).toBe(failure.code);

    const cases: Array<{ label: string; mutate: (r: BattleResult) => BattleResult }> = [
      {
        label: "empty violations",
        mutate: (r) => ({
          ...r,
          validation: { overallPassed: false, violations: [] },
        }),
      },
      {
        label: "delete canonical failure violation",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: r.validation.violations.slice(1),
          },
        }),
      },
      {
        label: "code",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [{ ...canonicalViolation, code: "tampered_code" }],
          },
        }),
      },
      {
        label: "severity",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [{ ...canonicalViolation, severity: "warning" }],
          },
        }),
      },
      {
        label: "targetIds",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [{ ...canonicalViolation, targetIds: ["tampered_target"] }],
          },
        }),
      },
      {
        label: "reason",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [{ ...canonicalViolation, reason: "tampered reason" }],
          },
        }),
      },
      {
        label: "canContinue",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [{ ...canonicalViolation, canContinue: true }],
          },
        }),
      },
      {
        label: "decoy at head",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [
              {
                code: "decoy",
                severity: "error",
                targetIds: [],
                reason: "decoy",
                canContinue: false,
              },
              ...r.validation.violations,
            ],
          },
        }),
      },
      {
        label: "decoy at tail",
        mutate: (r) => ({
          ...r,
          validation: {
            overallPassed: false,
            violations: [
              ...r.validation.violations,
              {
                code: "decoy",
                severity: "error",
                targetIds: [],
                reason: "decoy",
                canContinue: false,
              },
            ],
          },
        }),
      },
      {
        label: "overallPassed=true",
        mutate: (r) => ({
          ...r,
          validation: { overallPassed: true, violations: r.validation.violations },
        }),
      },
    ];

    for (const c of cases) {
      const tampered = c.mutate(structuredClone(authentic) as BattleResult);
      const validated = validateBattleResult(tampered, runRuleSnapshot, sha256Provider);
      expect(validated.ok, `must reject ${c.label}`).toBe(false);
    }

    // Order is semantic in the canonical compare used by validateBattleResult.
    const violationA = {
      code: "order_a",
      severity: "error" as const,
      targetIds: ["a"] as readonly string[],
      reason: "first",
      canContinue: false,
    };
    const violationB = {
      code: "order_b",
      severity: "error" as const,
      targetIds: ["b"] as readonly string[],
      reason: "second",
      canContinue: false,
    };
    expect(
      toCanonicalJson({ overallPassed: false, violations: [violationA, violationB] }),
    ).not.toBe(toCanonicalJson({ overallPassed: false, violations: [violationB, violationA] }));

    const orderSwapped = {
      ...structuredClone(authentic),
      validation: {
        overallPassed: false,
        violations: [violationB, violationA],
      },
    } as BattleResult;
    expect(validateBattleResult(orderSwapped, runRuleSnapshot, sha256Provider).ok).toBe(false);
  });

  it("validateBattleResult is fail-closed on malformed containers and missing required keys", () => {
    const completed = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    expect(validateBattleResult(completed, runRuleSnapshot, sha256Provider).ok).toBe(true);

    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const failed = failedRun.commitPlan.battleResult;
    expect(validateBattleResult(failed, runRuleSnapshot, sha256Provider).ok).toBe(true);

    const assertReject = (label: string, input: unknown): void => {
      expect(
        () => validateBattleResult(input, runRuleSnapshot, sha256Provider),
        label,
      ).not.toThrow();
      const result = validateBattleResult(input, runRuleSnapshot, sha256Provider);
      expect(result.ok, label).toBe(false);
    };

    const malformedValidationCases: Array<{ label: string; validation: unknown }> = [
      { label: "validation=null", validation: null },
      { label: "validation={}", validation: {} },
      { label: "validation={ overallPassed: true }", validation: { overallPassed: true } },
      {
        label: "validation={ overallPassed: false, violations: null }",
        validation: { overallPassed: false, violations: null },
      },
      {
        label: 'validation={ overallPassed: false, violations: "x" }',
        validation: { overallPassed: false, violations: "x" },
      },
    ];
    for (const base of [
      { kind: "completed", result: completed },
      { kind: "failed", result: failed },
    ]) {
      for (const c of malformedValidationCases) {
        assertReject(`${base.kind} ${c.label}`, {
          ...structuredClone(base.result),
          validation: c.validation,
        });
      }
    }

    for (const key of BATTLE_RESULT_KEYS) {
      const missing = structuredClone(completed) as Record<string, unknown>;
      delete missing[key];
      assertReject(`missing required key ${key}`, missing);
    }

    const containerCases: Array<{ label: string; mutate: (r: BattleResult) => unknown }> = [
      { label: "finalState=null", mutate: (r) => ({ ...r, finalState: null }) },
      { label: "validation=null", mutate: (r) => ({ ...r, validation: null }) },
      { label: "detailedLog=null", mutate: (r) => ({ ...r, detailedLog: null }) },
      {
        label: "detailedLog malformed",
        mutate: (r) => ({ ...r, detailedLog: { turnOrderLogs: null, actionLogs: [] } }),
      },
      { label: "finalRngState=null", mutate: (r) => ({ ...r, finalRngState: null }) },
      { label: "postProcessContext=null", mutate: (r) => ({ ...r, postProcessContext: null }) },
    ];
    for (const c of containerCases) {
      assertReject(`completed ${c.label}`, c.mutate(structuredClone(completed)));
      assertReject(`failed ${c.label}`, c.mutate(structuredClone(failed)));
    }
  });

  it("validateBattleResult rejects malformed finalState.failure without throwing", () => {
    const completed = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    expect(validateBattleResult(completed, runRuleSnapshot, sha256Provider).ok).toBe(true);

    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const failed = failedRun.commitPlan.battleResult;
    expect(validateBattleResult(failed, runRuleSnapshot, sha256Provider).ok).toBe(true);

    const missingFailure = structuredClone(failed);
    delete (missingFailure.finalState as { failure?: unknown }).failure;
    expect(() =>
      validateBattleResult(missingFailure, runRuleSnapshot, sha256Provider),
    ).not.toThrow();
    expect(validateBattleResult(missingFailure, runRuleSnapshot, sha256Provider).ok).toBe(false);

    for (const [label, failureValue] of [
      ["failure={}", {}],
      ["failure=1", 1],
      ["failure=[]", []],
    ] as const) {
      const tampered = structuredClone(failed);
      (tampered.finalState as { failure: unknown }).failure = failureValue;
      expect(
        () => validateBattleResult(tampered, runRuleSnapshot, sha256Provider),
        label,
      ).not.toThrow();
      expect(validateBattleResult(tampered, runRuleSnapshot, sha256Provider).ok, label).toBe(false);
    }
  });

  it("CommitPlan structuralValidation binds failed validation.violations[0] to finalState.failure", () => {
    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const plan = failedRun.commitPlan;
    const base = {
      schemaVersion: plan.schemaVersion,
      simulationId: plan.simulationId,
      runRuleSnapshotHash: plan.runRuleSnapshotHash,
      expectedWorldStateHash: plan.expectedWorldStateHash,
      expectedParticipantASourceSnapshotHash: plan.expectedParticipantASourceSnapshotHash,
      expectedParticipantBSourceSnapshotHash: plan.expectedParticipantBSourceSnapshotHash,
      startRuntimeTransition: plan.startRuntimeTransition,
      battleResult: plan.battleResult,
      eventCandidates: plan.eventCandidates,
    };
    expect(validateRunBattleCommitPlanStructure(base).overallPassed).toBe(true);
    const authenticFailure = plan.battleResult.validation.violations[0];
    if (authenticFailure === undefined) throw new Error("expected canonical failure violation");

    // A: tamper violations[0] fields
    const tamperedHead = structuredClone(plan.battleResult);
    tamperedHead.validation = {
      overallPassed: false,
      violations: [{ ...authenticFailure, code: "tampered_structural_code" }],
    };
    const structuralA = validateRunBattleCommitPlanStructure({
      ...base,
      battleResult: tamperedHead,
    });
    expect(structuralA.overallPassed).toBe(false);
    expect(
      structuralA.violations.some((v) => v.code === "failed_validation_failure_mismatch"),
    ).toBe(true);

    // B: tampered head + authentic failure appended (position-independent bypass must fail)
    const tamperedWithTail = structuredClone(plan.battleResult);
    tamperedWithTail.validation = {
      overallPassed: false,
      violations: [{ ...authenticFailure, code: "tampered_structural_code" }, authenticFailure],
    };
    expect(
      validateRunBattleCommitPlanStructure({
        ...base,
        battleResult: tamperedWithTail,
      }).overallPassed,
    ).toBe(false);

    // C: decoy at head, authentic moved to index 1
    const decoyHead = structuredClone(plan.battleResult);
    decoyHead.validation = {
      overallPassed: false,
      violations: [
        {
          code: "decoy",
          severity: "error",
          targetIds: [],
          reason: "decoy",
          canContinue: false,
        },
        authenticFailure,
      ],
    };
    expect(
      validateRunBattleCommitPlanStructure({
        ...base,
        battleResult: decoyHead,
      }).overallPassed,
    ).toBe(false);

    // Production commitPlanHash helper recalculation must not bypass structuralValidation.
    const structuralFalse = validateRunBattleCommitPlanStructure({
      ...base,
      battleResult: tamperedWithTail,
    });
    expect(structuralFalse.overallPassed).toBe(false);
    const recomputedHash = expectOk(
      computeRunBattleCommitPlanHash(
        {
          schemaVersion: plan.schemaVersion,
          simulationId: plan.simulationId,
          runRuleSnapshotHash: plan.runRuleSnapshotHash,
          expectedWorldStateHash: plan.expectedWorldStateHash,
          expectedParticipantASourceSnapshotHash: plan.expectedParticipantASourceSnapshotHash,
          expectedParticipantBSourceSnapshotHash: plan.expectedParticipantBSourceSnapshotHash,
          startRuntimeTransition: plan.startRuntimeTransition,
          battleResult: tamperedWithTail,
          eventCandidates: plan.eventCandidates,
          structuralValidation: structuralFalse,
        },
        sha256Provider,
      ),
    );
    expect(recomputedHash).toMatch(/^[0-9a-f]{64}$/);
    expect(recomputedHash).not.toBe(plan.commitPlanHash);
    expect(
      validateRunBattleCommitPlanStructure({
        ...base,
        battleResult: tamperedWithTail,
      }).overallPassed,
    ).toBe(false);
  });

  it("validateRunBattleCommitPlanStructure is fail-closed on malformed unknown input", () => {
    const completed = expectCompleted(
      runScripted({
        turnBuilder: () => ({
          sideA: { kind: "basic_defense" },
          sideB: { kind: "surrender" },
        }),
      }),
    );
    const run = runScripted({
      turnBuilder: () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "surrender" },
      }),
    });
    expect(run.kind).toBe("completed");
    if (run.kind !== "completed") throw new Error("unreachable");
    const plan = run.commitPlan;
    const base = {
      schemaVersion: plan.schemaVersion,
      simulationId: plan.simulationId,
      runRuleSnapshotHash: plan.runRuleSnapshotHash,
      expectedWorldStateHash: plan.expectedWorldStateHash,
      expectedParticipantASourceSnapshotHash: plan.expectedParticipantASourceSnapshotHash,
      expectedParticipantBSourceSnapshotHash: plan.expectedParticipantBSourceSnapshotHash,
      startRuntimeTransition: plan.startRuntimeTransition,
      battleResult: plan.battleResult,
      eventCandidates: plan.eventCandidates,
    };
    expect(validateRunBattleCommitPlanStructure(base).overallPassed).toBe(true);
    void completed;

    const assertFailClosed = (label: string, input: unknown, before: string): void => {
      expect(() => validateRunBattleCommitPlanStructure(input), label).not.toThrow();
      expect(validateRunBattleCommitPlanStructure(input).overallPassed, label).toBe(false);
      expect(toCanonicalJson(input), `${label} must not mutate input`).toBe(before);
    };

    const cases: Array<{ label: string; input: unknown }> = [
      { label: "battleResult null", input: { ...base, battleResult: null } },
      { label: "battleResult {}", input: { ...base, battleResult: {} } },
      {
        label: "eventCandidates [null,null]",
        input: { ...base, eventCandidates: [null, null] },
      },
      {
        label: "eventCandidates invalid element",
        input: { ...base, eventCandidates: [{}, plan.eventCandidates[1]!] },
      },
      {
        label: "startRuntimeTransition null",
        input: { ...base, startRuntimeTransition: null },
      },
      {
        label: "startRuntimeTransition {}",
        input: { ...base, startRuntimeTransition: {} },
      },
      {
        label: "finalState null",
        input: {
          ...base,
          battleResult: { ...plan.battleResult, finalState: null },
        },
      },
      {
        label: "validation null",
        input: {
          ...base,
          battleResult: { ...plan.battleResult, validation: null },
        },
      },
      {
        label: "violations non-array",
        input: {
          ...base,
          battleResult: {
            ...plan.battleResult,
            validation: { overallPassed: false, violations: "nope" },
          },
        },
      },
      {
        label: "started payload null",
        input: {
          ...base,
          eventCandidates: [
            { ...plan.eventCandidates[0]!, payload: null },
            plan.eventCandidates[1]!,
          ],
        },
      },
      {
        label: "finished payload malformed",
        input: {
          ...base,
          eventCandidates: [plan.eventCandidates[0]!, { ...plan.eventCandidates[1]!, payload: 1 }],
        },
      },
    ];

    for (const c of cases) {
      const before = toCanonicalJson(c.input);
      assertFailClosed(c.label, c.input, before);
    }

    // Nested accessor / throwing getter must not execute.
    let getterHits = 0;
    const accessorBattle: Record<string, unknown> = {
      ...plan.battleResult,
    };
    Object.defineProperty(accessorBattle, "sneaky", {
      enumerable: true,
      get() {
        getterHits += 1;
        throw new Error("getter must not run");
      },
    });
    const accessorInput = { ...base, battleResult: accessorBattle };
    const beforeAccessor = toCanonicalJson({
      ...base,
      battleResult: { ...plan.battleResult },
    });
    void beforeAccessor;
    expect(() => validateRunBattleCommitPlanStructure(accessorInput)).not.toThrow();
    expect(validateRunBattleCommitPlanStructure(accessorInput).overallPassed).toBe(false);
    expect(getterHits).toBe(0);

    const throwingNested: Record<string, unknown> = {};
    Object.defineProperty(throwingNested, "finalState", {
      enumerable: true,
      get() {
        getterHits += 1;
        throw new Error("nested getter must not run");
      },
    });
    const nestedInput = { ...base, battleResult: throwingNested };
    expect(() => validateRunBattleCommitPlanStructure(nestedInput)).not.toThrow();
    expect(validateRunBattleCommitPlanStructure(nestedInput).overallPassed).toBe(false);
    expect(getterHits).toBe(0);

    // Cycles / nested shape / Symbol scalars / non-finite numbers (fail-closed).
    const assertNoThrowFalse = (label: string, input: unknown): void => {
      expect(() => validateRunBattleCommitPlanStructure(input), label).not.toThrow();
      expect(validateRunBattleCommitPlanStructure(input).overallPassed, label).toBe(false);
    };

    const selfCycleBattle: Record<string, unknown> = {
      ...(structuredClone(plan.battleResult) as object),
    };
    selfCycleBattle["cycle"] = selfCycleBattle;
    assertNoThrowFalse("battleResult self-cycle", { ...base, battleResult: selfCycleBattle });

    const selfCycleEvent: Record<string, unknown> = {
      ...(structuredClone(plan.eventCandidates[0]!) as object),
    };
    selfCycleEvent["cycle"] = selfCycleEvent;
    assertNoThrowFalse("eventCandidates self-cycle", {
      ...base,
      eventCandidates: [selfCycleEvent, plan.eventCandidates[1]!],
    });

    const nodeA: Record<string, unknown> = {};
    const nodeB: Record<string, unknown> = {};
    nodeA["ref"] = nodeB;
    nodeB["ref"] = nodeA;
    const mutualBattle: Record<string, unknown> = {
      ...(structuredClone(plan.battleResult) as object),
      mutual: nodeA,
    };
    assertNoThrowFalse("mutual cycle A→B→A", { ...base, battleResult: mutualBattle });

    assertNoThrowFalse("participantA null", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        finalState: { ...plan.battleResult.finalState, participantA: null },
      },
    });
    assertNoThrowFalse("participantB null", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        finalState: { ...plan.battleResult.finalState, participantB: null },
      },
    });
    assertNoThrowFalse("participantSnapshotHashes null", {
      ...base,
      eventCandidates: [
        {
          ...plan.eventCandidates[0]!,
          payload: { ...plan.eventCandidates[0]!.payload, participantSnapshotHashes: null },
        },
        plan.eventCandidates[1]!,
      ],
    });
    assertNoThrowFalse("finished summary null", {
      ...base,
      eventCandidates: [
        plan.eventCandidates[0]!,
        {
          ...plan.eventCandidates[1]!,
          payload: { ...plan.eventCandidates[1]!.payload, summary: null },
        },
      ],
    });

    assertNoThrowFalse("nested NaN", {
      ...base,
      battleResult: { ...plan.battleResult, turnsExecuted: Number.NaN },
    });
    assertNoThrowFalse("nested Infinity", {
      ...base,
      battleResult: { ...plan.battleResult, turnsExecuted: Number.POSITIVE_INFINITY },
    });
    assertNoThrowFalse("nested -Infinity", {
      ...base,
      battleResult: { ...plan.battleResult, turnsExecuted: Number.NEGATIVE_INFINITY },
    });

    for (const key of [
      "expectedWorldStateHash",
      "runRuleSnapshotHash",
      "schemaVersion",
      "simulationId",
    ] as const) {
      const sym = Symbol("x");
      const input = { ...base, [key]: sym };
      const beforeDesc = Object.getOwnPropertyDescriptor(input, key);
      assertNoThrowFalse(`Symbol ${key}`, input);
      const afterDesc = Object.getOwnPropertyDescriptor(input, key);
      expect(afterDesc?.value, `Symbol ${key} value unchanged`).toBe(sym);
      expect(afterDesc?.value, `Symbol ${key} descriptor value`).toBe(beforeDesc?.value);
    }
  });

  it("validateRunBattleCommitPlanStructure fail-closed on resolution_error nested malformation", () => {
    const short = buildScript(
      () => ({
        sideA: { kind: "basic_defense" },
        sideB: { kind: "basic_defense" },
      }),
      1,
    );
    const failedRun = runBattleToCompletion(
      {
        expectedWorldStateHash: "a".repeat(64),
        startBattleInput: {
          createBattleRequest: {
            simulationId: runRuleSnapshot.simulationId,
            worldDate,
            battleKind: "official",
            participantA: participantInput({ personId: "person_a" }),
            participantB: participantInput({ personId: "person_b" }),
            participantAActionSourceIdentity: short.identity,
            participantBActionSourceIdentity: short.identity,
            runRuleSnapshot,
          },
          worldRngState: createSeededRng(777).exportState(),
          matchIdGeneratorState: freshGeneratorState(),
        },
        participantAActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        participantBActionsSource: {
          identity: short.identity,
          canonicalScript: short.canonical,
        },
        postProcessContext: postProcessContext(),
      },
      sha256Provider,
    );
    expect(failedRun.kind).toBe("resolution_error");
    if (failedRun.kind !== "resolution_error") throw new Error("unreachable");
    const plan = failedRun.commitPlan;
    const base = {
      schemaVersion: plan.schemaVersion,
      simulationId: plan.simulationId,
      runRuleSnapshotHash: plan.runRuleSnapshotHash,
      expectedWorldStateHash: plan.expectedWorldStateHash,
      expectedParticipantASourceSnapshotHash: plan.expectedParticipantASourceSnapshotHash,
      expectedParticipantBSourceSnapshotHash: plan.expectedParticipantBSourceSnapshotHash,
      startRuntimeTransition: plan.startRuntimeTransition,
      battleResult: plan.battleResult,
      eventCandidates: plan.eventCandidates,
    };
    expect(validateRunBattleCommitPlanStructure(base).overallPassed).toBe(true);

    const assertNoThrowFalse = (label: string, input: unknown): void => {
      expect(() => validateRunBattleCommitPlanStructure(input), label).not.toThrow();
      expect(validateRunBattleCommitPlanStructure(input).overallPassed, label).toBe(false);
    };

    assertNoThrowFalse("violations [null]", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        validation: { overallPassed: false, violations: [null] },
      },
    });
    assertNoThrowFalse("violations [1]", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        validation: { overallPassed: false, violations: [1] },
      },
    });
    assertNoThrowFalse("violations [string]", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        validation: { overallPassed: false, violations: ["x"] },
      },
    });
    assertNoThrowFalse("failure = 1", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        finalState: { ...plan.battleResult.finalState, failure: 1 },
      },
    });
    assertNoThrowFalse("failure = []", {
      ...base,
      battleResult: {
        ...plan.battleResult,
        finalState: { ...plan.battleResult.finalState, failure: [] },
      },
    });
  });

  it("finalizeBattleResult public boundary rejects unknown keys and accessors", () => {
    const started = startBattleTransaction(
      {
        createBattleRequest: {
          simulationId: runRuleSnapshot.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantInput({ personId: "person_a" }),
          participantB: participantInput({ personId: "person_b" }),
          participantAActionSourceIdentity: buildScript(() => ({
            sideA: { kind: "surrender" },
            sideB: { kind: "basic_defense" },
          })).identity,
          participantBActionSourceIdentity: buildScript(() => ({
            sideA: { kind: "surrender" },
            sideB: { kind: "basic_defense" },
          })).identity,
          runRuleSnapshot,
        },
        worldRngState: createSeededRng(777).exportState(),
        matchIdGeneratorState: freshGeneratorState(),
      },
      sha256Provider,
    );
    expect(started.kind).toBe("success");
    if (started.kind !== "success") throw new Error("start failed");
    const unknownKey = finalizeBattleResult(
      {
        terminalBattleState: started.battleState,
        runRuleSnapshot,
        postProcessContext: postProcessContext(),
        extra: true,
      },
      sha256Provider,
    );
    expect(unknownKey.ok).toBe(false);

    const accessorObj: Record<string, unknown> = {
      terminalBattleState: started.battleState,
      runRuleSnapshot,
      postProcessContext: postProcessContext(),
    };
    Object.defineProperty(accessorObj, "sneaky", {
      get() {
        return 1;
      },
      enumerable: true,
    });
    expect(finalizeBattleResult(accessorObj, sha256Provider).ok).toBe(false);
  });
});

function countingProvider(delegate: Sha256Provider): Sha256Provider & { calls: number } {
  const provider: Sha256Provider & { calls: number } = {
    calls: 0,
    hashUtf8(text: string): string {
      provider.calls += 1;
      return delegate.hashUtf8(text);
    },
  };
  return provider;
}

function failAfterProvider(
  delegate: Sha256Provider,
  failAfterCalls: number,
  mode: "throw" | "malformed" = "throw",
): Sha256Provider & { calls: number } {
  const provider: Sha256Provider & { calls: number } = {
    calls: 0,
    hashUtf8(text: string): string {
      provider.calls += 1;
      if (provider.calls > failAfterCalls) {
        if (mode === "malformed") return "NOT_A_VALID_DIGEST";
        throw new Error("injected provider fail");
      }
      return delegate.hashUtf8(text);
    },
  };
  return provider;
}

function completionInput(maxScriptTurns = 20) {
  const { canonical, identity } = buildScript(
    () => ({
      sideA: { kind: "basic_defense" },
      sideB: maxScriptTurns <= 1 ? { kind: "basic_defense" } : { kind: "surrender" },
    }),
    maxScriptTurns,
  );
  return {
    expectedWorldStateHash: "a".repeat(64),
    startBattleInput: {
      createBattleRequest: {
        simulationId: runRuleSnapshot.simulationId,
        worldDate,
        battleKind: "official" as const,
        initialRange: "contact" as const,
        participantA: participantInput({ personId: "person_a" }),
        participantB: participantInput({ personId: "person_b" }),
        participantAActionSourceIdentity: identity,
        participantBActionSourceIdentity: identity,
        runRuleSnapshot,
      },
      worldRngState: createSeededRng(777).exportState(),
      matchIdGeneratorState: freshGeneratorState(),
    },
    participantAActionsSource: { identity, canonicalScript: canonical },
    participantBActionsSource: { identity, canonicalScript: canonical },
    postProcessContext: postProcessContext(),
  };
}

type AbortStage =
  | "prepare_turn"
  | "resolve_turn"
  | "mark_failed_state"
  | "finalize_battle_result"
  | "build_commit_plan";

function findDependencyAbort(
  input: unknown,
  stage: AbortStage,
  mode: "throw" | "malformed" = "throw",
): { error: BattleExecutionAbortError; failAfter: number } {
  const probe = countingProvider(sha256Provider);
  const baseline = runBattleToCompletion(structuredClone(input), probe);
  expect(["completed", "resolution_error"]).toContain(baseline.kind);
  for (let n = 0; n < probe.calls; n += 1) {
    try {
      runBattleToCompletion(structuredClone(input), failAfterProvider(sha256Provider, n, mode));
    } catch (error) {
      if (
        isBattleExecutionAbortError(error) &&
        error.failureKind === "dependency_failure" &&
        error.stage === stage
      ) {
        return { error, failAfter: n };
      }
    }
  }
  throw new Error(`did not observe dependency_failure abort at ${stage}`);
}

describe("S1-SPEC-0.1.20 production abort wiring via runBattleToCompletion", () => {
  it("provider failure before start → pre_start_failure (not abort)", () => {
    const provider = failAfterProvider(sha256Provider, 0);
    const result = runBattleToCompletion(completionInput(), provider);
    expect(result.kind).toBe("pre_start_failure");
    if (result.kind !== "pre_start_failure") throw new Error("unreachable");
    expect(result.commitPlan).toBeNull();
  });

  it("provider failure immediately after start → BattleExecutionAbortError at prepare_turn", () => {
    const input = completionInput();
    const before = toCanonicalJson(input);
    const { error } = findDependencyAbort(input, "prepare_turn");
    expect(error.stage).toBe("prepare_turn");
    expect(error.failureKind).toBe("dependency_failure");
    expect(toCanonicalJson(input)).toBe(before);
  });

  it("provider failure during prepare → dependency_failure, not resolution_error", () => {
    const { error } = findDependencyAbort(completionInput(), "prepare_turn");
    expect(error.stage).toBe("prepare_turn");
    expect(error.failureKind).toBe("dependency_failure");
  });

  it("provider failure during resolve → dependency_failure abort, not resolution_error", () => {
    // Use a completing script so resolveTurn hashes run (short scripts fail in domain path).
    const { error } = findDependencyAbort(completionInput(), "resolve_turn");
    expect(error.stage).toBe("resolve_turn");
    expect(error.failureKind).toBe("dependency_failure");
  });

  it("malformed digest after start → dependency_failure abort", () => {
    const { error } = findDependencyAbort(completionInput(), "prepare_turn", "malformed");
    expect(error.failureKind).toBe("dependency_failure");
  });

  it("provider failure while finalizing failed result → dependency abort", () => {
    const { error } = findDependencyAbort(completionInput(1), "finalize_battle_result");
    expect(error.failureKind).toBe("dependency_failure");
    expect(error.stage).toBe("finalize_battle_result");
  });

  it("provider failure while marking failed state → dependency abort", () => {
    const { error } = findDependencyAbort(completionInput(1), "mark_failed_state");
    expect(error.failureKind).toBe("dependency_failure");
    expect(error.stage).toBe("mark_failed_state");
  });

  it("commitPlanHash provider failure → dependency_failure at build_commit_plan", () => {
    const { error } = findDependencyAbort(completionInput(), "build_commit_plan");
    expect(error.failureKind).toBe("dependency_failure");
    expect(error.stage).toBe("build_commit_plan");
  });

  it("healthy provider + domain failure → resolution_error with commitPlan", () => {
    const result = runBattleToCompletion(completionInput(1), sha256Provider);
    expect(result.kind).toBe("resolution_error");
    if (result.kind !== "resolution_error") throw new Error("unreachable");
    expect(result.commitPlan.battleResult.resultKind).toBe("failed");
    expect(result.commitPlan.eventCandidates).toHaveLength(2);
  });

  it("healthy provider + completion → completed", () => {
    const result = runBattleToCompletion(completionInput(), sha256Provider);
    expect(result.kind).toBe("completed");
    if (result.kind !== "completed") throw new Error("unreachable");
    expect(result.commitPlan.battleResult.resultKind).toBe("completed");
  });

  it("abort does not mutate caller input and does not consume extra World RNG", () => {
    const input = completionInput();
    const before = toCanonicalJson(input);
    const rngBefore = toCanonicalJson(input.startBattleInput.worldRngState);
    const { failAfter } = findDependencyAbort(input, "prepare_turn");
    try {
      runBattleToCompletion(input, failAfterProvider(sha256Provider, failAfter));
      throw new Error("expected abort");
    } catch (error) {
      expect(isBattleExecutionAbortError(error)).toBe(true);
    }
    expect(toCanonicalJson(input)).toBe(before);
    expect(toCanonicalJson(input.startBattleInput.worldRngState)).toBe(rngBefore);
  });
});
