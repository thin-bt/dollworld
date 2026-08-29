/**
 * S01-005 battle start / BattleState generation (11 mini-spec, 12 §2,
 * S1-SPEC-0.1.13 MatchId contract).
 *
 * Internal stages (`reserveNextMatchId`, `createBattleState`, `beginBattle`,
 * `startBattleTransaction`) are imported from `./sprint1/*.js` on purpose: they
 * are deliberately absent from the package root.
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
  BATTLE_DECISION_PROFILE_KEYS,
  BATTLE_KINDS,
  BATTLE_PROFILE_ADAPTER_VERSION,
  BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION,
  BATTLE_SIDES,
  BATTLE_SIMULATION_SOURCE_PROCESSOR,
  BATTLE_STARTED_EVENT_TYPE,
  BATTLE_STATE_KEYS,
  BATTLE_STATE_SCHEMA_VERSION,
  BATTLE_STATUSES,
  BATTLE_TERMINAL_REASONS,
  DEFAULT_BATTLE_STRATEGY_ID,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_FORMAT_PATTERN,
  MATCH_ID_GENERATOR_STATE_KEYS,
  MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  MATCH_ID_SEQUENCE_EXHAUSTED_CODE,
  MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL,
  MATCH_ID_SEQUENCE_MAXIMUM,
  RUN_RULE_SNAPSHOT_SCHEMA_VERSION,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION,
  adaptBattleProfile,
  asMatchId,
  asTechniqueId,
  computeActiveYearStartProcessorManifestHash,
  computeMatchIdGeneratorStateHash,
  computeSimulationIdentityHash,
  computeTechniqueCatalogHash,
  createBattleRulesSnapshotRef,
  createDefaultActiveYearStartProcessorManifest,
  createDefaultStrategyActionSourceIdentity,
  createInitialMatchIdGeneratorState,
  createNeutralBattleDecisionProfile,
  createRunRuleSnapshot,
  createScriptedActionsSourceIdentity,
  createSeededRng,
  createWorldDate,
  cloneBattleRulesSnapshotRef,
  cloneTechniqueCatalog,
  deriveBaseMaxDurability,
  deriveStartCurrentDurability,
  deriveStartDurabilityPercentBasisPoints,
  formatMatchIdFromSequence,
  freezeBattleRulesSnapshotRef,
  freezeTechniqueCatalog,
  getDefaultSprint1Config,
  isBattleKind,
  isBattleSide,
  isBattleStatus,
  isBattleTerminalReason,
  isEligibleForBattleKind,
  toCanonicalJson,
  validateBattleActionSourceIdentity,
  validateBattleParticipant,
  validateBattleParticipantSnapshot,
  validateBattleRulesSnapshotRef,
  validateBattleState,
  validateMatchId,
  validateMatchIdGeneratorState,
  validateRunRuleSnapshot,
  validateRunRuleSnapshotAgainstIdentity,
  validateStartBattleRuntimeTransition,
  validateStartBattleRuntimeTransitionAgainst,
  validateTechniqueCatalog,
  validateTechniqueDefinition,
  type AbilityKey,
  type AbilityScores,
  type AptitudeKey,
  type AptitudeScores,
  type BasisPoints,
  type RunRuleSnapshot,
  type SeededRngState,
  type Sha256Provider,
  type SimulationIdentity,
  type StatValueTriple,
  type TechniqueDefinition,
  type ValidationResult,
} from "./index.js";
import { computeBattleInputHash } from "./sprint1/battle-state.js";
import { computeBattleParticipantSourceSnapshotHash } from "./sprint1/battle-participant.js";
import {
  computeSeededRngStateHash,
  computeStartBattleRuntimeTransitionHash,
} from "./sprint1/start-battle-runtime-transition.js";
import { reserveNextMatchId } from "./sprint1/match-id-generator.js";
import { createBattleState, validateCreateBattleRequest } from "./sprint1/create-battle-state.js";
import { beginBattle } from "./sprint1/begin-battle.js";
import { startBattleTransaction } from "./sprint1/start-battle-transaction.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";
import { withTestSprint2IdentityFields } from "./test-fixtures/sprint2-identity.fixture.js";

const sha256Provider = createNodeSha256Provider();

const FIXED_MATCH_ID_STATE_SEED = 12345;
const FIXED_MATCH_ID_STATE_SHA256 =
  "c5b7dd00fb9b5262e58106e9a06b2936d9aa3cefcc1cf66b64a3ab714513e54f";

type CountingProvider = Sha256Provider & { calls: number };

function countingProvider(): CountingProvider {
  const provider: CountingProvider = {
    calls: 0,
    hashUtf8(text: string): string {
      provider.calls += 1;
      return sha256Provider.hashUtf8(text);
    },
  };
  return provider;
}

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

const TECHNIQUE_ALPHA = "technique_alpha";
const TECHNIQUE_BETA = "technique_beta";
const TECHNIQUE_GAMMA = "technique_gamma";

const techniqueDefinitions: readonly TechniqueDefinition[] = [
  TECHNIQUE_ALPHA,
  TECHNIQUE_BETA,
  TECHNIQUE_GAMMA,
].map((id) => expectOk(validateTechniqueDefinition(techniqueDefinitionInput(id))));

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
    },
    sha256Provider,
  );
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
      techniqueDefinitions,
    },
    sha256Provider,
  ),
);

const worldDate = createWorldDate(
  { year: 21, month: 4, weekOfMonth: 1 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);

const knownTechniqueIdsForTests = new Set(
  runRuleSnapshot.techniqueDefinitions.map((definition) => definition.techniqueId),
);

const officialParticipantContext = {
  side: "sideA",
  battleKind: "official",
  worldDate,
  config: runRuleSnapshot.sprint1Config,
  knownTechniqueIds: knownTechniqueIdsForTests,
} as const;

function techniqueState(techniqueId: string, acquiredAbsoluteWeek: number | null) {
  return {
    techniqueId,
    learningProgressTenths: acquiredAbsoluteWeek === null ? 300 : 1000,
    masteryHundredths: acquiredAbsoluteWeek === null ? 0 : 5000,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek,
  };
}

type ParticipantOverrides = {
  personId?: string;
  careerStatus?: string;
  participationStatus?: string;
  lifeStatus?: string;
  birthYear?: number;
  currentAge?: number;
  abilities?: AbilityScores;
  temporaryCondition?: Record<string, number>;
  sprint1State?: Record<string, unknown>;
  techniqueIds?: readonly string[];
  /** When set, injected into the source root (must be rejected by the standard adapter). */
  battleDecisionProfile?: unknown;
  /** When set, injected into the source root (must be rejected by the standard adapter). */
  injuryProneness?: number;
  /** Technique acquiredAbsoluteWeek by TechniqueId; default all acquired at week 10. */
  techniqueAcquiredWeeks?: Readonly<Record<string, number | null>>;
};

function buildPersonRecord(overrides: ParticipantOverrides = {}): Record<string, unknown> {
  const abilities = overrides.abilities ?? buildAbilities({ stamina: 50, spirit: 50 });
  const techniqueIds = overrides.techniqueIds ?? [TECHNIQUE_ALPHA];
  const careerStatus = overrides.careerStatus ?? "active_competitor";
  const lifeStatus = overrides.lifeStatus ?? "living";
  const person: Record<string, unknown> = {
    personId: overrides.personId ?? "person_a",
    givenName: "Test",
    familyName: "Fighter",
    displayName: "Test・Fighter",
    nameDataVersion: "NAMES-0.1.2",
    sex: "male",
    birthYear: overrides.birthYear ?? 1,
    familyId: "family_000001",
    lifeStatus,
    careerStatus,
    abilities,
    aptitudes: buildAptitudes(),
    qualifiedMaster: careerStatus === "retired" ? true : false,
    sprint1State: overrides.sprint1State ?? {
      sprint1StateSchemaVersion: "0.1.0",
      currentMental: 50 + abilities.spirit.surfaceValue,
      techniqueStates: techniqueIds.map((id) =>
        techniqueState(
          id,
          overrides.techniqueAcquiredWeeks?.[id] === undefined
            ? 10
            : overrides.techniqueAcquiredWeeks[id]!,
        ),
      ),
      learningFocusTechniqueId: null,
    },
  };

  if (lifeStatus === "living") {
    person["participationStatus"] = overrides.participationStatus ?? "active";
    person["currentAge"] = overrides.currentAge ?? 20;
  } else {
    const ageAtDeath = overrides.currentAge ?? 20;
    const deathYear = (overrides.birthYear ?? 1) + ageAtDeath;
    person["deathYear"] = deathYear;
    person["ageAtDeath"] = ageAtDeath;
  }

  if (careerStatus === "active_competitor") {
    if (lifeStatus === "living") {
      person["currentRank"] = "C";
    }
    person["highestRank"] = "B";
    person["qualifiedMaster"] = false;
  } else if (careerStatus === "retired") {
    person["highestRank"] = "B";
    person["retirementRank"] = "C";
  } else if (careerStatus === "child" || careerStatus === "trainee") {
    person["qualifiedMaster"] = false;
  }

  return person;
}

function participantInput(overrides: ParticipantOverrides = {}): Record<string, unknown> {
  const source: Record<string, unknown> = {
    person: buildPersonRecord(overrides),
    temporaryCondition: overrides.temporaryCondition ?? {
      fatigue: 20,
      injury: 10,
      condition: 10,
      confidence: 0,
    },
  };
  if (overrides.battleDecisionProfile !== undefined) {
    source["battleDecisionProfile"] = overrides.battleDecisionProfile;
  }
  if (overrides.injuryProneness !== undefined) {
    source["injuryProneness"] = overrides.injuryProneness;
  }
  return source;
}

const defaultStrategyIdentity = expectOk(
  createDefaultStrategyActionSourceIdentity({
    strategyVersion: runRuleSnapshot.defaultBattleStrategyVersion,
    strategyConfigHash: runRuleSnapshot.sprint1ConfigHash,
  }),
);

const scriptedIdentity = expectOk(
  createScriptedActionsSourceIdentity({ actionScriptHash: "f".repeat(64) }),
);

function createBattleRequest(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    simulationId: runRuleSnapshot.simulationId,
    worldDate,
    battleKind: "official",
    participantA: participantInput({ personId: "person_a" }),
    participantB: participantInput({ personId: "person_b" }),
    participantAActionSourceIdentity: defaultStrategyIdentity,
    participantBActionSourceIdentity: defaultStrategyIdentity,
    runRuleSnapshot,
    ...overrides,
  };
}

const freshGeneratorState = expectOk(
  createInitialMatchIdGeneratorState({
    seed: FIXED_MATCH_ID_STATE_SEED,
    generatorVersion: MATCH_ID_GENERATOR_VERSION,
    namespace: MATCH_ID_NAMESPACE,
  }),
);

function freshWorldRngState(): SeededRngState {
  return createSeededRng(777).exportState();
}

function startInput(overrides: Record<string, unknown> = {}) {
  return {
    createBattleRequest: createBattleRequest(),
    worldRngState: freshWorldRngState(),
    matchIdGeneratorState: freshGeneratorState,
    ...overrides,
  };
}

describe("S01-005 version registry", () => {
  it("publishes the S01-005 schema versions and fixed strategy identifiers", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(RUN_RULE_SNAPSHOT_SCHEMA_VERSION).toBe("0.6.0");
    expect(BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION).toBe("0.1.0");
    expect(BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION).toBe("0.1.0");
    expect(START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION).toBe("0.1.0");
    expect(BATTLE_STATE_SCHEMA_VERSION).toBe("0.6.0");
    expect(DEFAULT_BATTLE_STRATEGY_ID).toBe("default-battle-strategy");
    expect(DEFAULT_BATTLE_STRATEGY_VERSION).toBe("default-battle-strategy-0.1.0");
    expect(BATTLE_ACTION_SCRIPT_FORMAT_VERSION).toBe("battle-action-script-0.1.0");
    expect(MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION).toBe("0.1.0");
  });

  it("keeps the internal start stages out of the package root", async () => {
    const api = await import("./index.js");
    for (const forbidden of [
      "reserveNextMatchId",
      "createBattleState",
      "beginBattle",
      "startBattleTransaction",
      "applyStartBattleRuntimeTransition",
      "preflightCreateBattleRequest",
      "preflightRunRuleSnapshotStructure",
      "preflightBattleParticipant",
      "preflightBattleStateStructure",
      "preflightBattleRulesSnapshotRefStructure",
      "preflightBattleParticipantSnapshotStructure",
      "preflightStartBattleRuntimeTransition",
      "preflightCurrentStartBattleRuntimeStates",
      "verifyCreateBattleRequestHashes",
      "verifyRunRuleSnapshotHashes",
      "verifyBattleStateHashes",
      "verifyBattleRulesSnapshotRefHash",
      "verifyBattleParticipantSnapshotHash",
      "verifyStartBattleRuntimeTransitionHashes",
      "validateTechniqueCatalogStructure",
      "validateInitialReadyBattleState",
      "validateBegunBattleState",
      "sealBattleParticipantWithSourceHash",
    ]) {
      expect(Object.keys(api)).not.toContain(forbidden);
    }
    expect(Object.keys(api).filter((key) => /^apply.*RuntimeTransition$/.test(key))).toEqual([]);
  });
});

describe("MatchId generator (S1-SPEC-0.1.13)", () => {
  it("locks the five canonical state keys, the format, and the fixed fixture SHA", () => {
    expect([...MATCH_ID_GENERATOR_STATE_KEYS]).toEqual([
      "schemaVersion",
      "generatorVersion",
      "namespace",
      "seed",
      "nextSequence",
    ]);
    expect(Object.keys(freshGeneratorState).sort()).toEqual(
      [...MATCH_ID_GENERATOR_STATE_KEYS].sort(),
    );
    expect(freshGeneratorState.nextSequence).toBe(1);
    expect(MATCH_ID_FORMAT_PATTERN.source).toBe("^match_[0-9]{12}$");
    expect(expectOk(computeMatchIdGeneratorStateHash(freshGeneratorState, sha256Provider))).toBe(
      FIXED_MATCH_ID_STATE_SHA256,
    );
  });

  it("formats sequence boundaries and rejects malformed MatchId text", () => {
    expect(formatMatchIdFromSequence(1)).toBe("match_000000000001");
    expect(formatMatchIdFromSequence(MATCH_ID_SEQUENCE_MAXIMUM)).toBe("match_999999999999");
    expect(validateMatchId("match_000000000001").ok).toBe(true);
    for (const bad of [
      "match_000000000000",
      "match_1",
      "match_00000000001",
      "MATCH_000000000001",
      "battle_000000000001",
    ]) {
      expect(validateMatchId(bad).ok).toBe(false);
    }
  });

  it("reserves without mutating the caller's state and fails on the exhausted sentinel", () => {
    const before = toCanonicalJson(freshGeneratorState);
    const reserved = reserveNextMatchId(freshGeneratorState);
    expect(toCanonicalJson(freshGeneratorState)).toBe(before);
    expect(reserved.kind).toBe("success");
    if (reserved.kind !== "success") return;
    expect(reserved.matchId).toBe("match_000000000001");
    expect(reserved.nextState.nextSequence).toBe(2);

    const atMaximum = reserveNextMatchId({
      ...freshGeneratorState,
      nextSequence: MATCH_ID_SEQUENCE_MAXIMUM,
    });
    expect(atMaximum.kind).toBe("success");
    if (atMaximum.kind === "success") {
      expect(atMaximum.matchId).toBe("match_999999999999");
      expect(atMaximum.nextState.nextSequence).toBe(MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL);
    }

    const exhausted = reserveNextMatchId({
      ...freshGeneratorState,
      nextSequence: MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL,
    });
    expect(exhausted.kind).toBe("failure");
    if (exhausted.kind === "failure") {
      expect(exhausted.code).toBe(MATCH_ID_SEQUENCE_EXHAUSTED_CODE);
      expect(exhausted.matchId).toBeNull();
      expect(exhausted.nextState).toBeNull();
    }
  });

  it("keeps the MatchId text independent of the seed and hashes the state per seed", () => {
    const seedOne = reserveNextMatchId({ ...freshGeneratorState, seed: 1 });
    const seedTwo = reserveNextMatchId({ ...freshGeneratorState, seed: 2 });
    expect(seedOne.kind).toBe("success");
    expect(seedTwo.kind).toBe("success");
    if (seedOne.kind !== "success" || seedTwo.kind !== "success") return;
    expect(seedOne.matchId).toBe(seedTwo.matchId);
    expect(expectOk(computeMatchIdGeneratorStateHash(seedOne.nextState, sha256Provider))).not.toBe(
      expectOk(computeMatchIdGeneratorStateHash(seedTwo.nextState, sha256Provider)),
    );
  });

  it("never calls the SHA-256 provider for a structurally invalid state", () => {
    const provider = countingProvider();
    const result = computeMatchIdGeneratorStateHash({ seed: 1 }, provider);
    expect(result.ok).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("rejects unknown keys and out-of-range sequences", () => {
    expect(
      validateMatchIdGeneratorState({ ...freshGeneratorState, lastMatchId: "match_1" }).ok,
    ).toBe(false);
    expect(validateMatchIdGeneratorState({ ...freshGeneratorState, nextSequence: 0 }).ok).toBe(
      false,
    );
    expect(
      validateMatchIdGeneratorState({
        ...freshGeneratorState,
        nextSequence: MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL + 1,
      }).ok,
    ).toBe(false);
  });
});

describe("battle enumerations and profile adapter", () => {
  it("locks the fixed battle enumerations", () => {
    expect([...BATTLE_KINDS]).toEqual(["official", "mock"]);
    expect([...BATTLE_SIDES]).toEqual(["sideA", "sideB"]);
    expect([...BATTLE_STATUSES]).toEqual(["ready", "in_progress", "completed", "failed"]);
    expect([...BATTLE_TERMINAL_REASONS]).toEqual([
      "knockout",
      "surrender",
      "unable_to_continue",
      "max_turns_reached",
    ]);
    expect(isBattleKind("official")).toBe(true);
    expect(isBattleKind("exhibition")).toBe(false);
    expect(isBattleSide("sideA")).toBe(true);
    expect(isBattleStatus("ready")).toBe(true);
    expect(isBattleTerminalReason("knockout")).toBe(true);
    expect(isBattleTerminalReason("draw")).toBe(false);
  });

  it("falls back to the neutral 50 for every axis and keeps explicit values", () => {
    const neutral = expectOk(adaptBattleProfile());
    expect(neutral.adapterVersion).toBe(BATTLE_PROFILE_ADAPTER_VERSION);
    expect(neutral.injuryProneness).toBe(50);
    for (const key of BATTLE_DECISION_PROFILE_KEYS) {
      expect(neutral.battleDecisionProfile[key]).toBe(50);
    }
    expect(neutral.battleDecisionProfile).toEqual(createNeutralBattleDecisionProfile());

    const explicit = expectOk(
      adaptBattleProfile({
        battleDecisionProfile: { aggression: 70, caution: 30, riskTolerance: 60, perseverance: 40 },
        injuryProneness: 12,
      }),
    );
    expect(explicit.battleDecisionProfile.aggression).toBe(70);
    expect(explicit.injuryProneness).toBe(12);
    expect(adaptBattleProfile({ injuryProneness: 101 }).ok).toBe(false);
  });
});

describe("BattleActionSourceIdentity", () => {
  it("builds both kinds with explicit nulls on the inactive branch", () => {
    expect(defaultStrategyIdentity).toEqual({
      schemaVersion: BATTLE_ACTION_SOURCE_IDENTITY_SCHEMA_VERSION,
      kind: "default_strategy",
      strategyId: DEFAULT_BATTLE_STRATEGY_ID,
      strategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
      strategyConfigHash: runRuleSnapshot.sprint1ConfigHash,
      scriptFormatVersion: null,
      actionScriptHash: null,
    });
    expect(scriptedIdentity.kind).toBe("scripted_actions");
    expect(scriptedIdentity.strategyId).toBeNull();
    expect(scriptedIdentity.scriptFormatVersion).toBe(BATTLE_ACTION_SCRIPT_FORMAT_VERSION);
  });

  it("rejects mixed branches and unknown keys", () => {
    expect(
      validateBattleActionSourceIdentity({
        ...defaultStrategyIdentity,
        actionScriptHash: "f".repeat(64),
      }).ok,
    ).toBe(false);
    expect(validateBattleActionSourceIdentity({ ...scriptedIdentity, strategyId: "x" }).ok).toBe(
      false,
    );
    expect(validateBattleActionSourceIdentity({ ...defaultStrategyIdentity, extra: 1 }).ok).toBe(
      false,
    );
  });
});

describe("RunRuleSnapshot", () => {
  it("recomputes simulationId, config hash, catalog hash and the self-excluding snapshot hash", () => {
    expect(runRuleSnapshot.schemaVersion).toBe(RUN_RULE_SNAPSHOT_SCHEMA_VERSION);
    expect(runRuleSnapshot.simulationIdentityHash).toBe(simulationIdentityHash);
    expect(runRuleSnapshot.simulationId).toBe(`simulation_${simulationIdentityHash.slice(0, 16)}`);
    expect(runRuleSnapshot.sprint1ConfigHash).toBe(sprint1ConfigHash);
    expect(runRuleSnapshot.techniqueCatalogHash).toBe(techniqueCatalogHash);
    expect(runRuleSnapshot.sprint1ConfigVersion).toBe(sprint1Config.configVersion);
    expect(runRuleSnapshot.techniqueDefinitions.map((d) => d.techniqueId)).toEqual([
      TECHNIQUE_ALPHA,
      TECHNIQUE_BETA,
      TECHNIQUE_GAMMA,
    ]);
    expect(Object.isFrozen(runRuleSnapshot)).toBe(true);
    expect(validateRunRuleSnapshot(runRuleSnapshot, sha256Provider).ok).toBe(true);
  });

  it("rejects a tampered hash, a wrong config version, and non-canonical catalog order", () => {
    expect(
      validateRunRuleSnapshot(
        { ...runRuleSnapshot, runRuleSnapshotHash: "0".repeat(64) },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateRunRuleSnapshot(
        { ...runRuleSnapshot, sprint1ConfigVersion: "not-the-config-version" },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateRunRuleSnapshot(
        {
          ...runRuleSnapshot,
          techniqueDefinitions: [...runRuleSnapshot.techniqueDefinitions].reverse(),
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });
});

describe("BattleRulesSnapshotRef", () => {
  it("normalizes relevantTechniqueIds ascending and deduplicated with a self-excluding hash", () => {
    const ref = expectOk(
      createBattleRulesSnapshotRef(
        runRuleSnapshot,
        [TECHNIQUE_BETA, TECHNIQUE_ALPHA, TECHNIQUE_BETA].map((id) => asTechniqueId(id)),
        sha256Provider,
      ),
    );
    expect(ref.relevantTechniqueIds).toEqual([TECHNIQUE_ALPHA, TECHNIQUE_BETA]);
    expect(ref.runRuleSnapshotHash).toBe(runRuleSnapshot.runRuleSnapshotHash);
    expect(ref.schemaVersion).toBe(BATTLE_RULES_SNAPSHOT_REF_SCHEMA_VERSION);

    const hashMaterial = { ...ref } as Record<string, unknown>;
    delete hashMaterial["battleRulesRefHash"];
    expect(sha256Provider.hashUtf8(toCanonicalJson(hashMaterial))).toBe(ref.battleRulesRefHash);
  });
});

describe("battle participant derivation (11 §5 / §6 / §7)", () => {
  const context = officialParticipantContext;

  it("derives the golden start durability: stamina 50 / cond 10 / fat 20 / inj 10 → 95% and 142", () => {
    expect(expectOk(deriveBaseMaxDurability(50))).toBe(150);
    const percentBp = deriveStartDurabilityPercentBasisPoints(
      runRuleSnapshot.sprint1Config.battle.startDurability,
      10,
      20,
      10,
    );
    expect(percentBp).toBe(950_000);
    expect(percentBp / 10_000).toBe(95);
    expect(deriveStartCurrentDurability(150, percentBp)).toBe(142);

    const snapshot = expectOk(
      validateBattleParticipant(participantInput(), context, sha256Provider),
    );
    expect(snapshot.baseMaxDurability).toBe(150);
    expect(snapshot.maxDurability).toBe(150);
    expect(snapshot.startDurabilityPercentBasisPoints).toBe(950_000);
    expect(snapshot.currentDurability).toBe(142);
    expect(snapshot.maxMental).toBe(100);
    expect(snapshot.currentMental).toBe(100);
  });

  it("clamps the start percent between minimumPercent and 100% and never below 1 durability", () => {
    const startDurability = runRuleSnapshot.sprint1Config.battle.startDurability;

    // The shipped balance can only subtract 85 points, so the lower clamp is
    // exercised through a harsher (still integer basis-point) configuration.
    const harsh = {
      ...startDurability,
      injuryPercentPerPoint: 20_000 as BasisPoints,
    };
    const clamped = deriveStartDurabilityPercentBasisPoints(harsh, -20, 100, 99);
    expect(clamped).toBe(harsh.minimumPercent * 10_000);
    expect(deriveStartCurrentDurability(1, clamped)).toBe(1);

    expect(deriveStartDurabilityPercentBasisPoints(startDurability, -20, 100, 100)).toBe(150_000);
    expect(deriveStartDurabilityPercentBasisPoints(startDurability, 20, 0, 0)).toBe(1_000_000);
  });

  it("initializes every battle flag and counter at the spec default", () => {
    const snapshot = expectOk(
      validateBattleParticipant(participantInput(), context, sha256Provider),
    );
    expect(snapshot.guarding).toBe(false);
    expect(snapshot.evading).toBe(false);
    expect(snapshot.canAct).toBe(true);
    expect(snapshot.surrendered).toBe(false);
    expect(snapshot.unableToContinue).toBe(false);
    for (const counter of [
      snapshot.damageDealt,
      snapshot.damageReceived,
      snapshot.attemptedHits,
      snapshot.successfulHits,
      snapshot.successfulDefenses,
      snapshot.successfulEvasions,
      snapshot.successfulCounters,
      snapshot.passiveActionCount,
      snapshot.invalidActionCount,
      snapshot.advantageTurnCount,
      snapshot.inBattleConsumption,
      snapshot.nextHitModifier,
      snapshot.nextActivationModifier,
    ]) {
      expect(counter).toBe(0);
    }
    expect(snapshot.injury).toBe(10);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("uses the neutral profile when no battleDecisionProfile is supplied", () => {
    const snapshot = expectOk(
      validateBattleParticipant(participantInput(), context, sha256Provider),
    );
    expect(snapshot.battleDecisionProfile).toEqual(createNeutralBattleDecisionProfile());
  });

  it("applies the official / mock career and age windows", () => {
    expect(isEligibleForBattleKind("official", "active_competitor", 16)).toBe(true);
    expect(isEligibleForBattleKind("official", "active_competitor", 41)).toBe(true);
    expect(isEligibleForBattleKind("official", "active_competitor", 15)).toBe(false);
    expect(isEligibleForBattleKind("official", "active_competitor", 42)).toBe(false);
    expect(isEligibleForBattleKind("official", "trainee", 12)).toBe(false);
    expect(isEligibleForBattleKind("mock", "trainee", 8)).toBe(true);
    expect(isEligibleForBattleKind("mock", "trainee", 15)).toBe(true);
    expect(isEligibleForBattleKind("mock", "trainee", 16)).toBe(false);
    expect(isEligibleForBattleKind("mock", "active_competitor", 20)).toBe(true);
    for (const careerStatus of ["child", "retired"] as const) {
      expect(isEligibleForBattleKind("mock", careerStatus, 20)).toBe(false);
    }
  });

  it("rejects deceased, waiting, stopped, and out-of-window participants", () => {
    for (const overrides of [
      { lifeStatus: "deceased" },
      { participationStatus: "waiting" },
      { participationStatus: "stopped" },
      { careerStatus: "child" },
      { careerStatus: "retired" },
      { careerStatus: "trainee" },
      { birthYear: 21 - 42, currentAge: 42 },
    ] satisfies ParticipantOverrides[]) {
      expect(
        validateBattleParticipant(participantInput(overrides), context, sha256Provider).ok,
      ).toBe(false);
    }
  });

  it("requires currentAge to match the January week 1 derivation from worldDate and birthYear", () => {
    expect(
      validateBattleParticipant(participantInput({ currentAge: 21 }), context, sha256Provider).ok,
    ).toBe(false);

    const decemberWeek4 = createWorldDate(
      { year: 21, month: 12, weekOfMonth: 4 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    const stillTwenty = expectOk(
      validateBattleParticipant(
        participantInput({ currentAge: 20 }),
        { ...context, worldDate: decemberWeek4 },
        sha256Provider,
      ),
    );
    expect(stillTwenty.ageAtBattle).toBe(20);

    const januaryWeek1NextYear = createWorldDate(
      { year: 22, month: 1, weekOfMonth: 1 },
      DEFAULT_WORLD_CALENDAR_CONFIG,
    );
    const nowTwentyOne = expectOk(
      validateBattleParticipant(
        participantInput({ currentAge: 21 }),
        { ...context, worldDate: januaryWeek1NextYear },
        sha256Provider,
      ),
    );
    expect(nowTwentyOne.ageAtBattle).toBe(21);
  });

  it("rejects injury at or above the battle unable-to-continue threshold", () => {
    const threshold = runRuleSnapshot.sprint1Config.battle.injury.unableToContinueThreshold;
    expect(
      validateBattleParticipant(
        participantInput({
          temporaryCondition: { fatigue: 0, injury: threshold, condition: 0, confidence: 0 },
        }),
        context,
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateBattleParticipant(
        participantInput({
          temporaryCondition: { fatigue: 0, injury: threshold - 1, condition: 0, confidence: 0 },
        }),
        context,
        sha256Provider,
      ).ok,
    ).toBe(true);
  });

  it("rejects a non-integer or out-of-range currentMental instead of clamping", () => {
    for (const currentMental of [-1, 101, 50.5]) {
      const result = validateBattleParticipant(
        participantInput({
          sprint1State: {
            sprint1StateSchemaVersion: "0.1.0",
            currentMental,
            techniqueStates: [techniqueState(TECHNIQUE_ALPHA, 10)],
            learningFocusTechniqueId: null,
          },
        }),
        context,
        sha256Provider,
      );
      expect(result.ok).toBe(false);
    }
    const low = expectOk(
      validateBattleParticipant(
        participantInput({
          sprint1State: {
            sprint1StateSchemaVersion: "0.1.0",
            currentMental: 7,
            techniqueStates: [techniqueState(TECHNIQUE_ALPHA, 10)],
            learningFocusTechniqueId: null,
          },
        }),
        context,
        sha256Provider,
      ),
    );
    expect(low.currentMental).toBe(7);
  });

  it("separates an unknown TechniqueId from a known but unacquired one", () => {
    const unknown = validateBattleParticipant(
      participantInput({ techniqueIds: ["technique_unknown"] }),
      context,
      sha256Provider,
    );
    expect(unknown.ok).toBe(false);

    const knownButUnacquired = expectOk(
      validateBattleParticipant(
        participantInput({
          sprint1State: {
            sprint1StateSchemaVersion: "0.1.0",
            currentMental: 100,
            techniqueStates: [techniqueState(TECHNIQUE_BETA, null)],
            learningFocusTechniqueId: null,
          },
        }),
        context,
        sha256Provider,
      ),
    );
    expect(knownButUnacquired.techniques).toHaveLength(1);
    expect(knownButUnacquired.techniques[0]?.acquiredAbsoluteWeek).toBeNull();
  });

  it("rejects successfulUseCount > attemptedUseCount on battle participant techniques (S1-SPEC-0.1.14)", () => {
    const invertedTechnique = {
      ...techniqueState(TECHNIQUE_ALPHA, 10),
      successfulUseCount: 2,
      attemptedUseCount: 1,
    };
    expect(
      validateBattleParticipant(
        participantInput({
          sprint1State: {
            sprint1StateSchemaVersion: "0.1.0",
            currentMental: 100,
            techniqueStates: [invertedTechnique],
            learningFocusTechniqueId: null,
          },
        }),
        context,
        sha256Provider,
      ).ok,
    ).toBe(false);

    const snapshot = expectOk(
      validateBattleParticipant(participantInput(), context, sha256Provider),
    );
    const badSnapshot = {
      ...snapshot,
      techniques: [
        {
          ...snapshot.techniques[0]!,
          successfulUseCount: 2,
          attemptedUseCount: 1,
        },
      ],
    };
    expect(validateBattleParticipantSnapshot(badSnapshot, "sideA", sha256Provider).ok).toBe(false);
  });

  it("covers birthYear, ageAtBattle and sprint1StateSchemaVersion in sourceSnapshotHash", () => {
    const snapshot = expectOk(
      validateBattleParticipant(participantInput(), context, sha256Provider),
    );
    const material = {
      personId: snapshot.personId,
      lifeStatus: snapshot.lifeStatus,
      participationStatus: snapshot.participationStatus,
      careerStatus: snapshot.careerStatus,
      birthYear: snapshot.birthYear,
      ageAtBattle: snapshot.ageAtBattle,
      stats: snapshot.stats,
      aptitudes: snapshot.aptitudes,
      techniques: snapshot.techniques,
      fatigue: snapshot.fatigue,
      injury: snapshot.injury,
      condition: snapshot.condition,
      confidence: snapshot.confidence,
      battleDecisionProfile: snapshot.battleDecisionProfile,
      injuryProneness: snapshot.injuryProneness,
      sprint1StateSchemaVersion: snapshot.sprint1StateSchemaVersion,
      currentMental: snapshot.currentMental,
    };
    expect(expectOk(computeBattleParticipantSourceSnapshotHash(material, sha256Provider))).toBe(
      snapshot.sourceSnapshotHash,
    );
    expect(
      expectOk(computeBattleParticipantSourceSnapshotHash(snapshot.sourceSnapshot, sha256Provider)),
    ).toBe(snapshot.sourceSnapshotHash);
    expect(toCanonicalJson(snapshot.sourceSnapshot)).toBe(toCanonicalJson(material));

    const olderContext = {
      ...context,
      worldDate: createWorldDate(
        { year: 20, month: 4, weekOfMonth: 1 },
        DEFAULT_WORLD_CALENDAR_CONFIG,
      ),
    };
    const older = expectOk(
      validateBattleParticipant(participantInput({ currentAge: 19 }), olderContext, sha256Provider),
    );
    expect(older.sourceSnapshotHash).not.toBe(snapshot.sourceSnapshotHash);
  });

  it("does not mutate the caller's participant input", () => {
    const input = participantInput();
    const before = JSON.stringify(input);
    validateBattleParticipant(input, context, sha256Provider);
    expect(JSON.stringify(input)).toBe(before);
  });
});

describe("startBattleTransaction success plan", () => {
  it("produces an in_progress state, the runtime transition, and the started event", () => {
    const input = startInput();
    const result = startBattleTransaction(input, sha256Provider);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;

    expect(result.battleState.status).toBe("in_progress");
    expect(result.battleState.matchId).toBe("match_000000000001");
    expect(result.battleState.schemaVersion).toBe(BATTLE_STATE_SCHEMA_VERSION);
    expect(result.battleState.turnNumber).toBe(0);
    expect(result.battleState.actionSequence).toBe(0);
    expect(result.battleState.terminalReason).toBeNull();
    expect(result.battleState.failure).toBeNull();
    expect(result.battleState.detailedLog).toEqual({ turnOrderLogs: [], actionLogs: [] });
    expect(result.battleState.maxTurns).toBe(20);
    expect(result.battleState.initialRange).toBe(
      runRuleSnapshot.sprint1Config.battle.defaultInitialRange,
    );
    expect(result.battleState.range).toBe(result.battleState.initialRange);
    expect(Object.keys(result.battleState).sort()).toEqual([...BATTLE_STATE_KEYS].sort());
    expect(Object.isFrozen(result.battleState)).toBe(true);
    expect(result.validation.ok).toBe(true);
  });

  it("advances the world RNG exactly once and seals both next states in one transition", () => {
    const worldRngState = freshWorldRngState();
    const expectedRng = createSeededRng(777);
    const expectedSeed = expectedRng.nextUint32();
    const expectedNextRngState = expectedRng.exportState();

    const result = startBattleTransaction({ ...startInput(), worldRngState }, sha256Provider);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;

    expect(result.battleState.battleSeed).toBe(expectedSeed);
    expect(result.runtimeTransition.nextWorldRngState).toEqual(expectedNextRngState);
    expect(result.runtimeTransition.nextMatchIdGeneratorState.nextSequence).toBe(2);
    expect(result.runtimeTransition.expectedWorldRngStateHash).toBe(
      expectOk(computeSeededRngStateHash(worldRngState, sha256Provider)),
    );
    expect(result.runtimeTransition.expectedMatchIdGeneratorStateHash).toBe(
      expectOk(computeMatchIdGeneratorStateHash(freshGeneratorState, sha256Provider)),
    );
    expect(result.runtimeTransition.schemaVersion).toBe(
      START_BATTLE_RUNTIME_TRANSITION_SCHEMA_VERSION,
    );
    expect(validateStartBattleRuntimeTransition(result.runtimeTransition, sha256Provider).ok).toBe(
      true,
    );
  });

  it("keeps the battle RNG derived from battleSeed and distinct from the world RNG", () => {
    const result = startBattleTransaction(startInput(), sha256Provider);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.battleState.rngState).toEqual(
      createSeededRng(result.battleState.battleSeed).exportState(),
    );
    expect(result.battleState.rngState).not.toEqual(result.runtimeTransition.nextWorldRngState);
  });

  it("emits exactly one battle.started candidate with matching entities and payload", () => {
    const result = startBattleTransaction(startInput(), sha256Provider);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;

    const candidate = result.battleStartedEventCandidate;
    expect(candidate.eventType).toBe(BATTLE_STARTED_EVENT_TYPE);
    expect(candidate.sourceProcessor).toBe(BATTLE_SIMULATION_SOURCE_PROCESSOR);
    expect(candidate.entities.matchIds).toEqual([result.battleState.matchId]);
    expect(candidate.entities.personIds).toEqual(["person_a", "person_b"]);
    expect(candidate).not.toHaveProperty("eventId");
    expect(candidate).not.toHaveProperty("sequence");
    expect(candidate.payload.battleSeed).toBe(result.battleState.battleSeed);
    expect(candidate.payload.battleInputHash).toBe(result.battleState.battleInputHash);
    expect(candidate.payload.maxTurns).toBe(20);
    expect(candidate.payload.participantSnapshotHashes).toEqual({
      sideA: result.battleState.participantA.sourceSnapshotHash,
      sideB: result.battleState.participantB.sourceSnapshotHash,
    });
    expect(candidate.payload.participantSnapshotHashes.sideA).not.toBe(
      candidate.payload.participantSnapshotHashes.sideB,
    );
  });

  it("recomputes battleInputHash from the start-input material", () => {
    const result = startBattleTransaction(startInput(), sha256Provider);
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    const state = result.battleState;
    expect(
      expectOk(
        computeBattleInputHash(
          {
            matchId: state.matchId,
            simulationId: state.simulationId,
            worldDate: state.worldDate,
            battleKind: state.battleKind,
            initialRange: state.initialRange,
            participantASourceSnapshotHash: state.participantA.sourceSnapshotHash,
            participantBSourceSnapshotHash: state.participantB.sourceSnapshotHash,
            battleRulesRefHash: state.battleRulesRefHash,
            runRuleSnapshotHash: state.runRuleSnapshotHash,
            participantAActionSourceIdentity: state.participantAActionSourceIdentity,
            participantBActionSourceIdentity: state.participantBActionSourceIdentity,
            battleSeed: state.battleSeed,
          },
          sha256Provider,
        ),
      ),
    ).toBe(state.battleInputHash);
    expect(validateBattleState(state, sha256Provider).ok).toBe(true);
  });

  it("changes battleInputHash when the action source identity changes", () => {
    const withDefault = startBattleTransaction(startInput(), sha256Provider);
    const withScripted = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          participantBActionSourceIdentity: scriptedIdentity,
        }),
      }),
      sha256Provider,
    );
    expect(withDefault.kind).toBe("success");
    expect(withScripted.kind).toBe("success");
    if (withDefault.kind !== "success" || withScripted.kind !== "success") return;
    expect(withScripted.battleState.battleInputHash).not.toBe(
      withDefault.battleState.battleInputHash,
    );
  });

  it("produces a byte-identical plan for the same inputs and seed", () => {
    const first = startBattleTransaction(startInput(), sha256Provider);
    const second = startBattleTransaction(startInput(), sha256Provider);
    expect(first.kind).toBe("success");
    expect(second.kind).toBe("success");
    if (first.kind !== "success" || second.kind !== "success") return;
    expect(toCanonicalJson(second.battleState)).toBe(toCanonicalJson(first.battleState));
    expect(toCanonicalJson(second.runtimeTransition)).toBe(
      toCanonicalJson(first.runtimeTransition),
    );
    expect(toCanonicalJson(second.battleStartedEventCandidate)).toBe(
      toCanonicalJson(first.battleStartedEventCandidate),
    );
  });

  it("does not mutate the caller's runtime states or request", () => {
    const input = startInput();
    const before = JSON.stringify(input);
    const result = startBattleTransaction(input, sha256Provider);
    expect(result.kind).toBe("success");
    expect(JSON.stringify(input)).toBe(before);
    expect(freshGeneratorState.nextSequence).toBe(1);
  });

  it("accepts a mock battle between a trainee and an active competitor", () => {
    const result = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          battleKind: "mock",
          initialRange: "long",
          participantA: participantInput({
            personId: "person_trainee",
            careerStatus: "trainee",
            birthYear: 9,
            currentAge: 12,
          }),
        }),
      }),
      sha256Provider,
    );
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.battleState.battleKind).toBe("mock");
    expect(result.battleState.initialRange).toBe("long");
    expect(result.battleState.range).toBe("long");
  });
});

describe("startBattleTransaction failure plan", () => {
  const failureCases: Array<[string, Record<string, unknown>]> = [
    [
      "the same person on both sides",
      {
        createBattleRequest: createBattleRequest({
          participantB: participantInput({ personId: "person_a" }),
        }),
      },
    ],
    [
      "an unknown TechniqueId",
      {
        createBattleRequest: createBattleRequest({
          participantA: participantInput({ techniqueIds: ["technique_unknown"] }),
        }),
      },
    ],
    [
      "a deceased participant",
      {
        createBattleRequest: createBattleRequest({
          participantA: participantInput({ lifeStatus: "deceased" }),
        }),
      },
    ],
    [
      "a waiting participant",
      {
        createBattleRequest: createBattleRequest({
          participantA: participantInput({ participationStatus: "waiting" }),
        }),
      },
    ],
    [
      "an official battle with a trainee",
      {
        createBattleRequest: createBattleRequest({
          participantA: participantInput({ careerStatus: "trainee", birthYear: 9, currentAge: 12 }),
        }),
      },
    ],
    [
      "an invalid battle kind",
      { createBattleRequest: createBattleRequest({ battleKind: "exhibition" }) },
    ],
    [
      "an invalid initial range",
      { createBattleRequest: createBattleRequest({ initialRange: "point_blank" }) },
    ],
    [
      "a simulationId that does not match the run snapshot",
      { createBattleRequest: createBattleRequest({ simulationId: "simulation_0000000000000000" }) },
    ],
    [
      "a tampered runRuleSnapshotHash",
      {
        createBattleRequest: createBattleRequest({
          runRuleSnapshot: { ...runRuleSnapshot, runRuleSnapshotHash: "0".repeat(64) },
        }),
      },
    ],
    ["a missing world RNG state", { worldRngState: undefined }],
    [
      "an exhausted MatchId sequence",
      {
        matchIdGeneratorState: {
          ...freshGeneratorState,
          nextSequence: MATCH_ID_SEQUENCE_EXHAUSTED_SENTINEL,
        },
      },
    ],
  ];

  for (const [label, overrides] of failureCases) {
    it(`returns nulls and leaves both runtime states untouched for ${label}`, () => {
      const input = startInput(overrides);
      const before = JSON.stringify(input);
      const result = startBattleTransaction(input, sha256Provider);
      expect(result.kind).toBe("failure");
      expect(result.battleState).toBeNull();
      expect(result.runtimeTransition).toBeNull();
      expect(result.battleStartedEventCandidate).toBeNull();
      expect(result.validation.ok).toBe(false);
      expect(result.validation.issues.length).toBeGreaterThan(0);
      expect(JSON.stringify(input)).toBe(before);
    });
  }

  it("does not leak a MatchId or battleSeed through a failure result", () => {
    const result = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          participantB: participantInput({ personId: "person_a" }),
        }),
      }),
      sha256Provider,
    );
    expect(result.kind).toBe("failure");
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("match_0000");
    expect(serialized).not.toContain("battleSeed");
  });

  it("does not consume the world RNG when the request is invalid", () => {
    const worldRngState = freshWorldRngState();
    const result = startBattleTransaction(
      {
        createBattleRequest: createBattleRequest({ battleKind: "exhibition" }),
        worldRngState,
        matchIdGeneratorState: freshGeneratorState,
      },
      sha256Provider,
    );
    expect(result.kind).toBe("failure");
    expect(worldRngState).toEqual(freshWorldRngState());
    expect(freshGeneratorState.nextSequence).toBe(1);
  });
});

describe("internal createBattleState / beginBattle stages", () => {
  it("creates a ready state that beginBattle promotes exactly once", () => {
    const validatedRequest = expectOk(
      validateCreateBattleRequest(createBattleRequest(), sha256Provider),
    );
    const ready = expectOk(
      createBattleState(
        {
          createBattleRequest: validatedRequest,
          reservedMatchId: asMatchId("match_000000000007"),
          battleSeed: 123456,
        },
        sha256Provider,
      ),
    );
    expect(ready.status).toBe("ready");
    expect(ready.matchId).toBe("match_000000000007");
    expect(ready.battleSeed).toBe(123456);
    expect(ready.detailedLog.turnOrderLogs).toHaveLength(0);
    expect(ready.detailedLog.actionLogs).toHaveLength(0);

    const begun = beginBattle(ready, sha256Provider);
    expect(begun.kind).toBe("success");
    if (begun.kind !== "success") return;
    expect(begun.battleState.status).toBe("in_progress");
    expect(begun.battleState.rngState).toEqual(ready.rngState);
    expect(begun.battleState.turnNumber).toBe(ready.turnNumber);
    expect(begun.battleState.actionSequence).toBe(ready.actionSequence);
    expect(begun.battleState.battleInputHash).toBe(ready.battleInputHash);
    expect(ready.status).toBe("ready");

    const doubleStart = beginBattle(begun.battleState, sha256Provider);
    expect(doubleStart.kind).toBe("failure");
    expect(doubleStart.battleState).toBeNull();
    expect(doubleStart.eventCandidate).toBeNull();
  });

  it("rejects a malformed reserved MatchId or battle seed", () => {
    const validatedRequest = expectOk(
      validateCreateBattleRequest(createBattleRequest(), sha256Provider),
    );
    expect(
      createBattleState(
        {
          createBattleRequest: validatedRequest,
          reservedMatchId: "match_7" as never,
          battleSeed: 1,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      createBattleState(
        {
          createBattleRequest: validatedRequest,
          reservedMatchId: asMatchId("match_000000000007"),
          battleSeed: 4294967296,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });
});

describe("StartBattleRuntimeTransition verification", () => {
  const plan = startBattleTransaction(startInput(), sha256Provider);

  it("accepts the transition against the exact states it was built from", () => {
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        {
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: freshGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(true);
  });

  it("rejects a tampered transitionHash", () => {
    if (plan.kind !== "success") return;
    expect(
      validateStartBattleRuntimeTransition(
        { ...plan.runtimeTransition, transitionHash: "0".repeat(64) },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects a stale state and a second application of the same transition", () => {
    if (plan.kind !== "success") return;

    const staleWorldRng = createSeededRng(778).exportState();
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        { worldRngState: staleWorldRng, matchIdGeneratorState: freshGeneratorState },
        sha256Provider,
      ).ok,
    ).toBe(false);

    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        {
          worldRngState: plan.runtimeTransition.nextWorldRngState,
          matchIdGeneratorState: plan.runtimeTransition.nextMatchIdGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects committing only one of the two runtime states", () => {
    if (plan.kind !== "success") return;
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        {
          worldRngState: plan.runtimeTransition.nextWorldRngState,
          matchIdGeneratorState: freshGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        {
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: plan.runtimeTransition.nextMatchIdGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });
});

describe("BattleState invariants", () => {
  const plan = startBattleTransaction(startInput(), sha256Provider);

  it("rejects a swapped participant pair and a tampered battleInputHash", () => {
    if (plan.kind !== "success") return;
    const state = plan.battleState;
    expect(
      validateBattleState(
        { ...state, participantA: state.participantB, participantB: state.participantA },
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateBattleState({ ...state, battleInputHash: "0".repeat(64) }, sha256Provider).ok,
    ).toBe(false);
    expect(
      validateBattleState({ ...state, battleRulesRefHash: "0".repeat(64) }, sha256Provider).ok,
    ).toBe(false);
  });

  it("enforces the status / terminalReason / failure combinations", () => {
    if (plan.kind !== "success") return;
    const state = plan.battleState;
    expect(validateBattleState({ ...state, terminalReason: "knockout" }, sha256Provider).ok).toBe(
      false,
    );
    expect(validateBattleState({ ...state, status: "completed" }, sha256Provider).ok).toBe(false);
    expect(validateBattleState({ ...state, status: "failed" }, sha256Provider).ok).toBe(false);
    expect(
      validateBattleState(
        {
          ...state,
          status: "failed",
          failure: {
            code: "pre_start_failure",
            severity: "fatal",
            targetIds: [state.participantA.personId],
            reason: "test",
            canContinue: false,
          },
        },
        sha256Provider,
      ).ok,
    ).toBe(true);
  });

  it("rejects unknown keys and a non-empty detailed log", () => {
    if (plan.kind !== "success") return;
    expect(validateBattleState({ ...plan.battleState, extra: 1 }, sha256Provider).ok).toBe(false);
    expect(
      validateBattleState(
        { ...plan.battleState, detailedLog: { turnOrderLogs: [{}], actionLogs: [] } },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });
});

describe("age and profile adapter boundaries", () => {
  it("locks the 7/8, 15/16, and 41/42 eligibility edges", () => {
    expect(isEligibleForBattleKind("mock", "trainee", 7)).toBe(false);
    expect(isEligibleForBattleKind("mock", "trainee", 8)).toBe(true);
    expect(isEligibleForBattleKind("mock", "trainee", 15)).toBe(true);
    expect(isEligibleForBattleKind("mock", "trainee", 16)).toBe(false);
    expect(isEligibleForBattleKind("official", "active_competitor", 15)).toBe(false);
    expect(isEligibleForBattleKind("official", "active_competitor", 16)).toBe(true);
    expect(isEligibleForBattleKind("official", "active_competitor", 41)).toBe(true);
    expect(isEligibleForBattleKind("official", "active_competitor", 42)).toBe(false);
    expect(isEligibleForBattleKind("mock", "active_competitor", 41)).toBe(true);
    expect(isEligibleForBattleKind("mock", "active_competitor", 42)).toBe(false);
  });

  it("keeps the neutral profile independent of PersonId and ability differences", () => {
    const base = expectOk(adaptBattleProfile(undefined));
    expect(base.battleDecisionProfile).toEqual({
      aggression: 50,
      caution: 50,
      riskTolerance: 50,
      perseverance: 50,
    });
    expect(base.injuryProneness).toBe(50);
    expect(Object.isFrozen(base)).toBe(true);
    expect(Object.isFrozen(base.battleDecisionProfile)).toBe(true);

    const withId = expectOk(
      validateBattleParticipant(
        participantInput({ personId: "person_other" }),
        officialParticipantContext,
        sha256Provider,
      ),
    );
    const withStats = expectOk(
      validateBattleParticipant(
        participantInput({ abilities: buildAbilities({ stamina: 99, spirit: 1 }) }),
        officialParticipantContext,
        sha256Provider,
      ),
    );
    expect(withId.battleDecisionProfile).toEqual(base.battleDecisionProfile);
    expect(withStats.battleDecisionProfile).toEqual(base.battleDecisionProfile);
    expect(withId.injuryProneness).toBe(50);
    expect(withStats.injuryProneness).toBe(50);
  });
});

describe("input hardening for battle start", () => {
  it("rejects a MatchIdGeneratorState root getter without invoking it or hashing", () => {
    const provider = countingProvider();
    const valid = expectOk(
      createInitialMatchIdGeneratorState({
        seed: FIXED_MATCH_ID_STATE_SEED,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const hostile: Record<string, unknown> = { ...valid };
    let getterCalls = 0;
    Object.defineProperty(hostile, "seed", {
      get: () => {
        getterCalls += 1;
        return FIXED_MATCH_ID_STATE_SEED;
      },
      enumerable: true,
      configurable: true,
    });
    expect(validateMatchIdGeneratorState(hostile).ok).toBe(false);
    expect(computeMatchIdGeneratorStateHash(hostile, provider).ok).toBe(false);
    expect(getterCalls).toBe(0);
    expect(provider.calls).toBe(0);
  });

  it("rejects class instances, Date, Map, Set, symbol keys, toJSON, and valueOf", () => {
    class FakeState {
      schemaVersion = MATCH_ID_GENERATOR_STATE_SCHEMA_VERSION;
    }
    expect(validateMatchIdGeneratorState(new FakeState()).ok).toBe(false);
    expect(validateMatchIdGeneratorState(new Date()).ok).toBe(false);
    expect(validateMatchIdGeneratorState(new Map()).ok).toBe(false);
    expect(validateMatchIdGeneratorState(new Set()).ok).toBe(false);

    const withSymbol: Record<string | symbol, unknown> = {
      ...expectOk(
        createInitialMatchIdGeneratorState({
          seed: 1,
          generatorVersion: MATCH_ID_GENERATOR_VERSION,
          namespace: MATCH_ID_NAMESPACE,
        }),
      ),
    };
    withSymbol[Symbol("hidden")] = 1;
    expect(validateMatchIdGeneratorState(withSymbol).ok).toBe(false);

    const withToJson: Record<string, unknown> = {
      ...expectOk(
        createInitialMatchIdGeneratorState({
          seed: 1,
          generatorVersion: MATCH_ID_GENERATOR_VERSION,
          namespace: MATCH_ID_NAMESPACE,
        }),
      ),
      toJSON() {
        return {};
      },
    };
    expect(validateMatchIdGeneratorState(withToJson).ok).toBe(false);

    const withValueOf: Record<string, unknown> = {
      ...expectOk(
        createInitialMatchIdGeneratorState({
          seed: 1,
          generatorVersion: MATCH_ID_GENERATOR_VERSION,
          namespace: MATCH_ID_NAMESPACE,
        }),
      ),
      valueOf() {
        return 1;
      },
    };
    expect(validateMatchIdGeneratorState(withValueOf).ok).toBe(false);
  });

  it("rejects throwing and revoked Proxy inputs without an external throw", () => {
    const throwing = new Proxy(
      {},
      {
        ownKeys(): string[] {
          throw new Error("hostile ownKeys trap");
        },
      },
    );
    expect(() => validateMatchIdGeneratorState(throwing)).not.toThrow();
    expect(validateMatchIdGeneratorState(throwing).ok).toBe(false);
    expect(() =>
      startBattleTransaction(
        {
          createBattleRequest: throwing,
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: freshGeneratorState,
        },
        sha256Provider,
      ),
    ).not.toThrow();

    const revocable = Proxy.revocable({ ...freshGeneratorState }, {});
    revocable.revoke();
    expect(() => validateMatchIdGeneratorState(revocable.proxy)).not.toThrow();
    expect(validateMatchIdGeneratorState(revocable.proxy).ok).toBe(false);
  });

  it("rejects a createBattleRequest participant getter without consuming the world RNG", () => {
    const request = createBattleRequest();
    const hostileParticipant: Record<string, unknown> = { ...participantInput() };
    let getterCalls = 0;
    Object.defineProperty(hostileParticipant, "personId", {
      get: () => {
        getterCalls += 1;
        return "person_a";
      },
      enumerable: true,
      configurable: true,
    });
    const worldRngState = freshWorldRngState();
    const generator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: FIXED_MATCH_ID_STATE_SEED,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const result = startBattleTransaction(
      {
        createBattleRequest: { ...request, participantA: hostileParticipant },
        worldRngState,
        matchIdGeneratorState: generator,
      },
      sha256Provider,
    );
    expect(result.kind).toBe("failure");
    expect(result.battleState).toBeNull();
    expect(result.runtimeTransition).toBeNull();
    expect(result.battleStartedEventCandidate).toBeNull();
    expect(getterCalls).toBe(0);
    expect(worldRngState).toEqual(freshWorldRngState());
    expect(generator.nextSequence).toBe(1);
  });

  it("re-issues the same MatchId and battleSeed after a discarded failure plan", () => {
    const worldRngState = freshWorldRngState();
    const generator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: FIXED_MATCH_ID_STATE_SEED,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    const failed = startBattleTransaction(
      {
        createBattleRequest: createBattleRequest({
          participantB: participantInput({ personId: "person_a" }),
        }),
        worldRngState,
        matchIdGeneratorState: generator,
      },
      sha256Provider,
    );
    expect(failed.kind).toBe("failure");

    const successPlan = startBattleTransaction(
      {
        createBattleRequest: createBattleRequest(),
        worldRngState,
        matchIdGeneratorState: generator,
      },
      sha256Provider,
    );
    expect(successPlan.kind).toBe("success");
    if (successPlan.kind !== "success") return;
    expect(successPlan.battleState.matchId).toBe("match_000000000001");
    expect(successPlan.battleState.battleSeed).toBe(createSeededRng(777).nextUint32());
  });
});

describe("S01-005 acceptance audit fixes", () => {
  it("keeps relevantTechniqueIds acquired-only with union / empty / dedupe", () => {
    const result = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          participantA: participantInput({
            personId: "person_a",
            techniqueIds: [TECHNIQUE_ALPHA, TECHNIQUE_BETA],
            techniqueAcquiredWeeks: {
              [TECHNIQUE_ALPHA]: 10,
              [TECHNIQUE_BETA]: null,
            },
          }),
          participantB: participantInput({
            personId: "person_b",
            techniqueIds: [TECHNIQUE_BETA, TECHNIQUE_GAMMA],
            techniqueAcquiredWeeks: {
              [TECHNIQUE_BETA]: null,
              [TECHNIQUE_GAMMA]: 12,
            },
          }),
        }),
      }),
      sha256Provider,
    );
    expect(result.kind).toBe("success");
    if (result.kind !== "success") return;
    expect(result.battleState.battleRulesSnapshotRef.relevantTechniqueIds).toEqual([
      TECHNIQUE_ALPHA,
      TECHNIQUE_GAMMA,
    ]);
    expect(result.battleState.participantA.techniques.map((t) => t.techniqueId)).toEqual([
      TECHNIQUE_ALPHA,
      TECHNIQUE_BETA,
    ]);
    expect(
      result.battleState.participantA.techniques.find((t) => t.techniqueId === TECHNIQUE_BETA)
        ?.acquiredAbsoluteWeek,
    ).toBeNull();

    const emptyAcquired = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          participantA: participantInput({
            personId: "person_a",
            techniqueIds: [TECHNIQUE_ALPHA],
            techniqueAcquiredWeeks: { [TECHNIQUE_ALPHA]: null },
          }),
          participantB: participantInput({
            personId: "person_b",
            techniqueIds: [TECHNIQUE_BETA],
            techniqueAcquiredWeeks: { [TECHNIQUE_BETA]: null },
          }),
        }),
      }),
      sha256Provider,
    );
    expect(emptyAcquired.kind).toBe("success");
    if (emptyAcquired.kind !== "success") return;
    expect(emptyAcquired.battleState.battleRulesSnapshotRef.relevantTechniqueIds).toEqual([]);

    const sharedAcquired = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          participantA: participantInput({
            personId: "person_a",
            techniqueIds: [TECHNIQUE_ALPHA],
          }),
          participantB: participantInput({
            personId: "person_b",
            techniqueIds: [TECHNIQUE_ALPHA],
          }),
        }),
      }),
      sha256Provider,
    );
    expect(sharedAcquired.kind).toBe("success");
    if (sharedAcquired.kind !== "success") return;
    expect(sharedAcquired.battleState.battleRulesSnapshotRef.relevantTechniqueIds).toEqual([
      TECHNIQUE_ALPHA,
    ]);
  });

  it("binds default strategy identities to the RunRuleSnapshot version and config hash", () => {
    const wrongVersion = expectOk(
      createDefaultStrategyActionSourceIdentity({
        strategyVersion: "default-battle-strategy-9.9.9",
        strategyConfigHash: runRuleSnapshot.sprint1ConfigHash,
      }),
    );
    const wrongHash = expectOk(
      createDefaultStrategyActionSourceIdentity({
        strategyVersion: runRuleSnapshot.defaultBattleStrategyVersion,
        strategyConfigHash: "a".repeat(64),
      }),
    );
    for (const [label, overrides] of [
      ["A wrong version", { participantAActionSourceIdentity: wrongVersion }],
      ["B wrong config hash", { participantBActionSourceIdentity: wrongHash }],
    ] as const) {
      const worldRngState = freshWorldRngState();
      const result = startBattleTransaction(
        startInput({
          createBattleRequest: createBattleRequest(overrides),
          worldRngState,
        }),
        sha256Provider,
      );
      expect(result.kind, label).toBe("failure");
      expect(result.battleState).toBeNull();
      expect(result.runtimeTransition).toBeNull();
      expect(result.battleStartedEventCandidate).toBeNull();
      expect(worldRngState).toEqual(freshWorldRngState());
      expect(freshGeneratorState.nextSequence).toBe(1);
    }
  });

  it("rejects RunRuleSnapshot materials that diverge from SimulationIdentity", () => {
    const identity = simulationIdentity();
    expect(
      createRunRuleSnapshot(
        {
          simulationIdentity: {
            ...identity,
            battleProfileAdapterVersion: "battle-profile-adapter-9.9.9",
          },
          simulationIdentityHash,
          initialMatchIdGeneratorState: freshMatchIdGeneratorForIdentity,
          worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
          yearStartProcessorManifest: defaultYearStartManifest,
          sprint1Config,
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);

    const wrongGenerator = expectOk(
      createInitialMatchIdGeneratorState({
        seed: 99999,
        generatorVersion: MATCH_ID_GENERATOR_VERSION,
        namespace: MATCH_ID_NAMESPACE,
      }),
    );
    expect(
      createRunRuleSnapshot(
        {
          simulationIdentity: identity,
          simulationIdentityHash,
          initialMatchIdGeneratorState: wrongGenerator,
          worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
          yearStartProcessorManifest: defaultYearStartManifest,
          sprint1Config,
          techniqueCatalogDataVersion: "techniques-0.1.0",
          techniqueDefinitions,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects forged exact-step transitions even when transitionHash is recomputed", () => {
    const plan = startBattleTransaction(startInput(), sha256Provider);
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;

    const forgedGenerator = {
      ...plan.runtimeTransition.nextMatchIdGeneratorState,
      nextSequence: plan.runtimeTransition.nextMatchIdGeneratorState.nextSequence + 2,
    };
    const forgedHashInput = {
      schemaVersion: plan.runtimeTransition.schemaVersion,
      expectedWorldRngStateHash: plan.runtimeTransition.expectedWorldRngStateHash,
      expectedMatchIdGeneratorStateHash: plan.runtimeTransition.expectedMatchIdGeneratorStateHash,
      nextWorldRngState: plan.runtimeTransition.nextWorldRngState,
      nextMatchIdGeneratorState: forgedGenerator,
    };
    const forged = {
      ...forgedHashInput,
      transitionHash: expectOk(
        computeStartBattleRuntimeTransitionHash(forgedHashInput, sha256Provider),
      ),
    };
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        forged,
        {
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: freshGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);

    const forgedRng = createSeededRng(424242).exportState();
    const forgedRngInput = {
      schemaVersion: plan.runtimeTransition.schemaVersion,
      expectedWorldRngStateHash: plan.runtimeTransition.expectedWorldRngStateHash,
      expectedMatchIdGeneratorStateHash: plan.runtimeTransition.expectedMatchIdGeneratorStateHash,
      nextWorldRngState: forgedRng,
      nextMatchIdGeneratorState: plan.runtimeTransition.nextMatchIdGeneratorState,
    };
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        {
          ...forgedRngInput,
          transitionHash: expectOk(
            computeStartBattleRuntimeTransitionHash(forgedRngInput, sha256Provider),
          ),
        },
        {
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: freshGeneratorState,
        },
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects caller profile and injuryProneness injection on the standard source", () => {
    expect(
      validateBattleParticipant(
        participantInput({
          battleDecisionProfile: {
            aggression: 90,
            caution: 10,
            riskTolerance: 10,
            perseverance: 10,
          },
        }),
        officialParticipantContext,
        sha256Provider,
      ).ok,
    ).toBe(false);
    expect(
      validateBattleParticipant(
        participantInput({ injuryProneness: 99 }),
        officialParticipantContext,
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("rejects unknown TechniqueId when creating a BattleRulesSnapshotRef", () => {
    expect(
      createBattleRulesSnapshotRef(
        runRuleSnapshot,
        [asTechniqueId("technique_unknown")],
        sha256Provider,
      ).ok,
    ).toBe(false);
  });

  it("hardens StartBattleInput root getters and Proxies without external throws", () => {
    const provider = countingProvider();
    const hostile: Record<string, unknown> = {
      createBattleRequest: createBattleRequest(),
      worldRngState: freshWorldRngState(),
      matchIdGeneratorState: freshGeneratorState,
    };
    let getterCalls = 0;
    Object.defineProperty(hostile, "createBattleRequest", {
      get: () => {
        getterCalls += 1;
        return createBattleRequest();
      },
      enumerable: true,
      configurable: true,
    });
    expect(() => startBattleTransaction(hostile, provider)).not.toThrow();
    expect(startBattleTransaction(hostile, provider).kind).toBe("failure");
    expect(getterCalls).toBe(0);
    expect(provider.calls).toBe(0);

    const throwing = new Proxy(
      {},
      {
        ownKeys(): string[] {
          throw new Error("hostile ownKeys");
        },
      },
    );
    expect(() => startBattleTransaction(throwing, provider)).not.toThrow();
    expect(startBattleTransaction(throwing, provider).kind).toBe("failure");

    const revocable = Proxy.revocable(
      {
        createBattleRequest: createBattleRequest(),
        worldRngState: freshWorldRngState(),
        matchIdGeneratorState: freshGeneratorState,
      },
      {},
    );
    revocable.revoke();
    expect(() => startBattleTransaction(revocable.proxy, provider)).not.toThrow();
    expect(startBattleTransaction(revocable.proxy, provider).kind).toBe("failure");
  });

  it("keeps raw internal hash/input types out of the package root", async () => {
    const api = await import("./index.js");
    for (const forbidden of [
      "buildRunRuleSnapshotHashInput",
      "RUN_RULE_SNAPSHOT_HASH_INPUT_KEYS",
      "buildBattleRulesRefHashInput",
      "BATTLE_RULES_REF_HASH_INPUT_KEYS",
      "BATTLE_INPUT_HASH_KEYS",
      "computeBattleInputHash",
      "computeBattleParticipantSourceSnapshotHash",
      "computeSeededRngStateHash",
      "computeStartBattleRuntimeTransitionHash",
      "START_BATTLE_RUNTIME_TRANSITION_HASH_INPUT_KEYS",
    ]) {
      expect(forbidden in api).toBe(false);
    }
  });

  it("rejects mid-battle immutable source-field tampering while keeping sourceSnapshotHash", () => {
    const plan = startBattleTransaction(startInput(), sha256Provider);
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const tampered = {
      ...plan.battleState,
      participantA: {
        ...plan.battleState.participantA,
        stats: {
          ...plan.battleState.participantA.stats,
          skill: {
            ...plan.battleState.participantA.stats.skill,
            surfaceValue: plan.battleState.participantA.stats.skill.surfaceValue + 1,
          },
        },
      },
    };
    expect(validateBattleState(tampered, sha256Provider).ok).toBe(false);
  });

  it("allows currentMental divergence from sourceSnapshot without hash failure", () => {
    const plan = startBattleTransaction(startInput(), sha256Provider);
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const nextMental = Math.max(0, plan.battleState.participantA.currentMental - 1);
    if (nextMental === plan.battleState.participantA.currentMental) {
      // fixture already at floor — bump instead
    }
    const adjusted =
      nextMental === plan.battleState.participantA.currentMental
        ? Math.min(
            plan.battleState.participantA.maxMental,
            plan.battleState.participantA.currentMental + 1,
          )
        : nextMental;
    const mutated = {
      ...plan.battleState,
      participantA: {
        ...plan.battleState.participantA,
        currentMental: adjusted,
      },
    };
    expect(mutated.participantA.currentMental).not.toBe(
      mutated.participantA.sourceSnapshot.currentMental,
    );
    expect(validateBattleState(mutated, sha256Provider).ok).toBe(true);
  });
});

function throwingProvider(): CountingProvider {
  const provider: CountingProvider = {
    calls: 0,
    hashUtf8(): string {
      provider.calls += 1;
      throw new Error("provider boom");
    },
  };
  return provider;
}

describe("S01-005 BattleRulesSnapshotRef safe hash / provider throw defense", () => {
  it("does not escape throws from validate/clone/freeze BattleRulesSnapshotRef", () => {
    const ref = expectOk(
      createBattleRulesSnapshotRef(
        runRuleSnapshot,
        [asTechniqueId(TECHNIQUE_ALPHA)],
        sha256Provider,
      ),
    );
    const provider = throwingProvider();
    expect(() => validateBattleRulesSnapshotRef(ref, provider)).not.toThrow();
    expect(validateBattleRulesSnapshotRef(ref, provider).ok).toBe(false);
    expect(() => cloneBattleRulesSnapshotRef(ref, provider)).not.toThrow();
    expect(cloneBattleRulesSnapshotRef(ref, provider).ok).toBe(false);
    expect(() => freezeBattleRulesSnapshotRef(ref, provider)).not.toThrow();
    expect(freezeBattleRulesSnapshotRef(ref, provider).ok).toBe(false);
  });

  it("does not escape throws from validateBattleState when hashing BattleRulesSnapshotRef", () => {
    const plan = startBattleTransaction(startInput(), sha256Provider);
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const provider = throwingProvider();
    expect(() => validateBattleState(plan.battleState, provider)).not.toThrow();
    expect(validateBattleState(plan.battleState, provider).ok).toBe(false);
  });

  it("never calls the provider for structurally invalid BattleRulesSnapshotRef", () => {
    const provider = countingProvider();
    expect(validateBattleRulesSnapshotRef({ unknown: true }, provider).ok).toBe(false);
    expect(cloneBattleRulesSnapshotRef({ unknown: true }, provider).ok).toBe(false);
    expect(freezeBattleRulesSnapshotRef({ unknown: true }, provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });
});

describe("S01-005 startBattleTransaction provider call boundary", () => {
  function expectPhase1Failure(input: unknown, label: string): void {
    const provider = countingProvider();
    const worldRngState = freshWorldRngState();
    const result = startBattleTransaction(
      {
        createBattleRequest: input,
        worldRngState,
        matchIdGeneratorState: freshGeneratorState,
      },
      provider,
    );
    expect(result.kind, label).toBe("failure");
    expect(result.battleState, label).toBeNull();
    expect(result.runtimeTransition, label).toBeNull();
    expect(result.battleStartedEventCandidate, label).toBeNull();
    expect(provider.calls, label).toBe(0);
    expect(worldRngState, label).toEqual(freshWorldRngState());
    expect(freshGeneratorState.nextSequence).toBe(1);
  }

  it("keeps provider.calls at 0 when participant B is structurally invalid", () => {
    expectPhase1Failure(
      createBattleRequest({
        participantB: { person: "not-a-person", temporaryCondition: { fatigue: 0 } },
      }),
      "invalid participantB",
    );
  });

  it("keeps provider.calls at 0 when participant A is structurally invalid", () => {
    expectPhase1Failure(
      createBattleRequest({
        participantA: { person: "not-a-person", temporaryCondition: { fatigue: 0 } },
      }),
      "invalid participantA",
    );
  });

  it("keeps provider.calls at 0 when action source A or B is invalid", () => {
    expectPhase1Failure(
      createBattleRequest({
        participantAActionSourceIdentity: { kind: "default_strategy" },
      }),
      "invalid action source A",
    );
    expectPhase1Failure(
      createBattleRequest({
        participantBActionSourceIdentity: { kind: "scripted_actions" },
      }),
      "invalid action source B",
    );
  });

  it("keeps provider.calls at 0 when initialRange is invalid", () => {
    expectPhase1Failure(createBattleRequest({ initialRange: "teleport" }), "invalid initialRange");
  });

  it("keeps provider.calls at 0 for RunRuleSnapshot structure failures", () => {
    expectPhase1Failure(
      createBattleRequest({
        runRuleSnapshot: { ...runRuleSnapshot, unknownKey: true },
      }),
      "unknown key",
    );
    expectPhase1Failure(
      createBattleRequest({
        runRuleSnapshot: { ...runRuleSnapshot, schemaVersion: "9.9.9" },
      }),
      "wrong schemaVersion",
    );
    const sparseDefinitions: unknown[] = [techniqueDefinitions[0], techniqueDefinitions[1]];
    delete sparseDefinitions[1];
    expectPhase1Failure(
      createBattleRequest({
        runRuleSnapshot: {
          ...runRuleSnapshot,
          techniqueDefinitions: sparseDefinitions,
        },
      }),
      "sparse techniqueDefinitions",
    );
    expectPhase1Failure(
      createBattleRequest({
        runRuleSnapshot: {
          ...runRuleSnapshot,
          techniqueDefinitions: [techniqueDefinitions[0], techniqueDefinitions[0]],
        },
      }),
      "duplicate TechniqueId",
    );
  });

  it("keeps provider.calls at 0 when caller injects battleDecisionProfile or injuryProneness", () => {
    expectPhase1Failure(
      createBattleRequest({
        participantA: participantInput({
          personId: "person_a",
          battleDecisionProfile: createNeutralBattleDecisionProfile(),
        }),
      }),
      "battleDecisionProfile injection",
    );
    expectPhase1Failure(
      createBattleRequest({
        participantB: participantInput({
          personId: "person_b",
          injuryProneness: 50,
        }),
      }),
      "injuryProneness injection",
    );
  });

  it("advances to Phase 2 (provider.calls > 0) for valid structure with invalid hash only", () => {
    const provider = countingProvider();
    const worldRngState = freshWorldRngState();
    const result = startBattleTransaction(
      startInput({
        createBattleRequest: createBattleRequest({
          runRuleSnapshot: {
            ...runRuleSnapshot,
            runRuleSnapshotHash: "0".repeat(64),
          },
        }),
        worldRngState,
      }),
      provider,
    );
    expect(result.kind).toBe("failure");
    expect(result.battleState).toBeNull();
    expect(result.runtimeTransition).toBeNull();
    expect(result.battleStartedEventCandidate).toBeNull();
    expect(provider.calls).toBeGreaterThan(0);
    expect(worldRngState).toEqual(freshWorldRngState());
    expect(freshGeneratorState.nextSequence).toBe(1);
  });

  it("does not escape a throwing provider and never consumes World RNG or MatchId", () => {
    const provider = throwingProvider();
    const worldRngState = freshWorldRngState();
    let result!: ReturnType<typeof startBattleTransaction>;
    expect(() => {
      result = startBattleTransaction(
        startInput({
          worldRngState,
        }),
        provider,
      );
    }).not.toThrow();
    expect(result.kind).toBe("failure");
    expect(result.battleState).toBeNull();
    expect(result.runtimeTransition).toBeNull();
    expect(result.battleStartedEventCandidate).toBeNull();
    expect(worldRngState).toEqual(freshWorldRngState());
    expect(freshGeneratorState.nextSequence).toBe(1);
  });
});

describe("S01-005 RuntimeTransition current preflight", () => {
  const plan = startBattleTransaction(startInput(), sha256Provider);

  it("hardens currentInput root getters without provider calls or external throws", () => {
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const provider = countingProvider();
    const current: Record<string, unknown> = {
      worldRngState: freshWorldRngState(),
      matchIdGeneratorState: freshGeneratorState,
    };
    let getterCalls = 0;
    Object.defineProperty(current, "worldRngState", {
      get: () => {
        getterCalls += 1;
        return freshWorldRngState();
      },
      enumerable: true,
      configurable: true,
    });
    expect(() =>
      validateStartBattleRuntimeTransitionAgainst(plan.runtimeTransition, current, provider),
    ).not.toThrow();
    expect(
      validateStartBattleRuntimeTransitionAgainst(plan.runtimeTransition, current, provider).ok,
    ).toBe(false);
    expect(getterCalls).toBe(0);
    expect(provider.calls).toBe(0);
  });

  it("hardens throwing and revoked currentInput Proxies without provider calls", () => {
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const provider = countingProvider();
    const throwing = new Proxy(
      {},
      {
        ownKeys(): string[] {
          throw new Error("hostile ownKeys");
        },
      },
    );
    expect(() =>
      validateStartBattleRuntimeTransitionAgainst(plan.runtimeTransition, throwing, provider),
    ).not.toThrow();
    expect(
      validateStartBattleRuntimeTransitionAgainst(plan.runtimeTransition, throwing, provider).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    const revocable = Proxy.revocable(
      {
        worldRngState: freshWorldRngState(),
        matchIdGeneratorState: freshGeneratorState,
      },
      {},
    );
    revocable.revoke();
    expect(() =>
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        revocable.proxy,
        provider,
      ),
    ).not.toThrow();
    expect(
      validateStartBattleRuntimeTransitionAgainst(plan.runtimeTransition, revocable.proxy, provider)
        .ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("keeps provider.calls at 0 for invalid current world RNG or MatchId generator", () => {
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const provider = countingProvider();
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        { worldRngState: { bad: true }, matchIdGeneratorState: freshGeneratorState },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      validateStartBattleRuntimeTransitionAgainst(
        plan.runtimeTransition,
        { worldRngState: freshWorldRngState(), matchIdGeneratorState: { bad: true } },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("keeps provider.calls at 0 when the transition itself is structurally invalid", () => {
    const provider = countingProvider();
    expect(
      validateStartBattleRuntimeTransitionAgainst(
        { schemaVersion: "9.9.9" },
        {
          worldRngState: freshWorldRngState(),
          matchIdGeneratorState: freshGeneratorState,
        },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);
  });
});

describe("S01-005 initial battle invariants", () => {
  function readyState() {
    const validatedRequest = expectOk(
      validateCreateBattleRequest(createBattleRequest(), sha256Provider),
    );
    return expectOk(
      createBattleState(
        {
          createBattleRequest: validatedRequest,
          reservedMatchId: asMatchId("match_000000000007"),
          battleSeed: 123456,
        },
        sha256Provider,
      ),
    );
  }

  it("rejects tampered ready counters, flags, range, maxTurns, logs via beginBattle", () => {
    const ready = readyState();
    const cases: Array<[string, Record<string, unknown>]> = [
      ["maxTurns 21", { maxTurns: 21 }],
      ["maxTurns 999", { maxTurns: 999 }],
      ["turnNumber 1", { turnNumber: 1 }],
      ["actionSequence 1", { actionSequence: 1 }],
      ["range mismatch", { range: ready.initialRange === "contact" ? "close" : "contact" }],
      ["damageDealt", { participantA: { ...ready.participantA, damageDealt: 1 } }],
      ["attemptedHits", { participantA: { ...ready.participantA, attemptedHits: 1 } }],
      ["nextHitModifier", { participantA: { ...ready.participantA, nextHitModifier: 1 } }],
      ["guarding", { participantA: { ...ready.participantA, guarding: true } }],
      [
        "non-empty actionLogs",
        {
          detailedLog: {
            ...ready.detailedLog,
            actionLogs: [{ turnNumber: 1, actionSequence: 1 }],
          },
        },
      ],
    ];
    for (const [label, override] of cases) {
      const begun = beginBattle({ ...ready, ...override }, sha256Provider);
      expect(begun.kind, label).toBe("failure");
      expect(begun.eventCandidate, label).toBeNull();
      expect(begun.battleState, label).toBeNull();
    }
  });
});

describe("S01-005 validateBattleState structure-first provider boundary", () => {
  it("keeps provider.calls at 0 for nested structural failures", () => {
    const plan = startBattleTransaction(startInput(), sha256Provider);
    expect(plan.kind).toBe("success");
    if (plan.kind !== "success") return;
    const state = plan.battleState;

    const cases: Array<[string, Record<string, unknown>]> = [
      ["participantA", { participantA: { side: "sideA" } }],
      ["participantB", { participantB: { side: "sideB" } }],
      ["detailedLog", { detailedLog: { turnOrderLogs: "bad" } }],
      ["action source", { participantAActionSourceIdentity: { kind: "default_strategy" } }],
      ["rngState", { rngState: { seed: "nope" } }],
      ["battleRulesRef", { battleRulesSnapshotRef: { schemaVersion: "9.9.9" } }],
    ];
    for (const [label, override] of cases) {
      const provider = countingProvider();
      expect(validateBattleState({ ...state, ...override }, provider).ok, label).toBe(false);
      expect(provider.calls, label).toBe(0);
    }
  });
});

describe("S01-005 RunRuleSnapshot composite structure-first boundary", () => {
  it("keeps provider.calls at 0 for invalid identity or generator in AgainstIdentity", () => {
    const provider = countingProvider();
    expect(
      validateRunRuleSnapshotAgainstIdentity(
        runRuleSnapshot,
        { schemaVersion: "bad" },
        simulationIdentityHash,
        freshMatchIdGeneratorForIdentity,
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      validateRunRuleSnapshotAgainstIdentity(
        runRuleSnapshot,
        simulationIdentity(),
        "not-a-hash",
        freshMatchIdGeneratorForIdentity,
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      validateRunRuleSnapshotAgainstIdentity(
        runRuleSnapshot,
        simulationIdentity(),
        simulationIdentityHash,
        { bad: true },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);
  });

  it("keeps provider.calls at 0 for invalid createRunRuleSnapshot structure inputs", () => {
    const identity = simulationIdentity();
    const base = {
      simulationIdentity: identity,
      simulationIdentityHash,
      initialMatchIdGeneratorState: freshMatchIdGeneratorForIdentity,
      worldCalendar: DEFAULT_WORLD_CALENDAR_CONFIG,
      yearStartProcessorManifest: defaultYearStartManifest,
      sprint1Config,
      techniqueCatalogDataVersion: "techniques-0.1.0",
      techniqueDefinitions,
    };

    const provider = countingProvider();
    expect(
      createRunRuleSnapshot({ ...base, initialMatchIdGeneratorState: { bad: true } }, provider).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      createRunRuleSnapshot({ ...base, sprint1Config: { configVersion: "x" } }, provider).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(
      createRunRuleSnapshot(
        { ...base, techniqueDefinitions: [{ techniqueId: "broken" }] },
        provider,
      ).ok,
    ).toBe(false);
    expect(provider.calls).toBe(0);

    expect(createRunRuleSnapshot({ ...base, techniqueCatalogDataVersion: "" }, provider).ok).toBe(
      false,
    );
    expect(provider.calls).toBe(0);
  });
});

describe("S01-005 TechniqueCatalog provider safety", () => {
  it("does not escape throwing providers on catalog hash paths", () => {
    const catalog = {
      identity: {
        dataVersion: "techniques-0.1.0",
        catalogHash: techniqueCatalogHash,
      },
      definitions: techniqueDefinitions,
    };
    const provider = throwingProvider();
    expect(() => computeTechniqueCatalogHash(techniqueDefinitions, provider)).not.toThrow();
    expect(computeTechniqueCatalogHash(techniqueDefinitions, provider).ok).toBe(false);
    expect(() => validateTechniqueCatalog(catalog, provider)).not.toThrow();
    expect(validateTechniqueCatalog(catalog, provider).ok).toBe(false);
    expect(() => cloneTechniqueCatalog(catalog, provider)).not.toThrow();
    expect(cloneTechniqueCatalog(catalog, provider).ok).toBe(false);
    expect(() => freezeTechniqueCatalog(catalog, provider)).not.toThrow();
    expect(freezeTechniqueCatalog(catalog, provider).ok).toBe(false);
  });

  it("never calls the provider for structurally invalid catalogs", () => {
    const provider = countingProvider();
    expect(validateTechniqueCatalog({ identity: {}, definitions: [] }, provider).ok).toBe(false);
    expect(cloneTechniqueCatalog({ identity: {}, definitions: [] }, provider).ok).toBe(false);
    expect(freezeTechniqueCatalog({ identity: {}, definitions: [] }, provider).ok).toBe(false);
    expect(computeTechniqueCatalogHash([{ techniqueId: "x" }], provider).ok).toBe(false);
    expect(provider.calls).toBe(0);
  });
});
