/**
 * Contract tests for S1-SPEC-0.1.17 battle participant sourceSnapshot baseline.
 * Does not implement S01-006 Resolver fix5 / BattleResult / WorldEngine.
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  APTITUDE_KEYS,
  BATTLE_PROFILE_ADAPTER_VERSION,
  BATTLE_STATE_SCHEMA_VERSION,
  DEFAULT_BATTLE_STRATEGY_VERSION,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  MAIN_SPEC_VERSION_FOR_IDENTITY,
  MATCH_ID_GENERATOR_VERSION,
  MATCH_ID_NAMESPACE,
  S0_SPEC_VERSION_FOR_IDENTITY,
  S1_SPEC_VERSION,
  SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
  SPRINT1_CONFIG_SCHEMA_VERSION,
  SPRINT1_CONFIG_VERSION_DEFAULT,
  computeActiveYearStartProcessorManifestHash,
  computeSimulationIdentityHash,
  computeTechniqueCatalogHash,
  createDefaultActiveYearStartProcessorManifest,
  createDefaultStrategyActionSourceIdentity,
  createDefaultSprint1ConfigInput,
  createInitialMatchIdGeneratorState,
  createRunRuleSnapshot,
  createSeededRng,
  createSimulationIdFromIdentity,
  createWorldDate,
  getDefaultSprint1Config,
  toCanonicalJson,
  validateBattleParticipantSnapshot,
  validateBattleState,
  validateSimulationIdentity,
  validateSprint1Config,
  validateTechniqueDefinition,
  type AbilityKey,
  type AbilityScores,
  type AptitudeKey,
  type AptitudeScores,
  type BattleParticipantSnapshot,
  type BattleParticipantSourceSnapshot,
  type BattleState,
  type RunRuleSnapshot,
  type SimulationIdentity,
  type StatValueTriple,
  type TechniqueDefinition,
  type ValidationResult,
} from "./index.js";
import { computeBattleParticipantSourceSnapshotHash } from "./sprint1/battle-participant.js";
import { startBattleTransaction } from "./sprint1/start-battle-transaction.js";
import { createNodeSha256Provider } from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

/** Locked SHA-256 of the battle-start sourceSnapshot for participantA in this fixture. */
const PARTICIPANT_A_SOURCE_SNAPSHOT_HASH_GOLDEN =
  "49ad085dab8dd2cf64e773eb03bfd3cd5b4cc18eee7d2f2f59bf0268818e24b6";

function expectOk<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function identityWithSprint1(version: string): SimulationIdentity {
  const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
  const sprint1ConfigHash = sha256Provider.hashUtf8(toCanonicalJson(config));
  return {
    schemaVersion: "0.5.0",
    seed: 1,
    initialWorldConfigHash: "a".repeat(64),
    worldCalendarConfigHash: "a".repeat(64),
    yearStartProcessorManifestHash: "a".repeat(64),
    sprint1ConfigHash,
    techniqueCatalogHash: "b".repeat(64),
    initialWeeklyTrainingSidecarHash: "c".repeat(64),
    battleProfileAdapterVersion: BATTLE_PROFILE_ADAPTER_VERSION,
    matchIdGeneratorVersion: MATCH_ID_GENERATOR_VERSION,
    initialMatchIdGeneratorStateHash: "c".repeat(64),
    defaultBattleStrategyVersion: DEFAULT_BATTLE_STRATEGY_VERSION,
    specVersions: [
      { specSetId: "main", version: MAIN_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint0", version: S0_SPEC_VERSION_FOR_IDENTITY },
      { specSetId: "sprint1", version },
    ],
    rngAlgorithmVersion: "xoshiro128ss-v1",
    canonicalJsonVersion: "canonical-json-v1",
    hashAlgorithm: "SHA-256",
  };
}

const FIXED_MATCH_ID_STATE_SEED = 12345;
const FIXED_MATCH_ID_STATE_SHA256 =
  "c5b7dd00fb9b5262e58106e9a06b2936d9aa3cefcc1cf66b64a3ab714513e54f";
const TECHNIQUE_ALPHA = "technique_alpha";

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
      techniqueDefinitions,
    },
    sha256Provider,
  ),
);

const worldDate = createWorldDate(
  { year: 21, month: 4, weekOfMonth: 1 },
  DEFAULT_WORLD_CALENDAR_CONFIG,
);
const defaultStrategyIdentity = expectOk(
  createDefaultStrategyActionSourceIdentity({
    strategyVersion: runRuleSnapshot.defaultBattleStrategyVersion,
    strategyConfigHash: runRuleSnapshot.sprint1ConfigHash,
  }),
);

function defaultTechniqueStates(): Array<Record<string, unknown>> {
  return [
    {
      techniqueId: TECHNIQUE_ALPHA,
      learningProgressTenths: 1000,
      masteryHundredths: 5000,
      successfulUseCount: 0,
      attemptedUseCount: 0,
      lastPracticedAbsoluteWeek: null,
      acquiredAbsoluteWeek: 10,
    },
  ];
}

function participantInput(
  personId: string,
  options: {
    abilities?: AbilityScores;
    aptitudes?: AptitudeScores;
    techniqueStates?: Array<Record<string, unknown>>;
  } = {},
): Record<string, unknown> {
  const abilities = options.abilities ?? buildAbilities({ stamina: 50, spirit: 50 });
  const aptitudes = options.aptitudes ?? buildAptitudes();
  const techniqueStates = options.techniqueStates ?? defaultTechniqueStates();
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
      aptitudes,
      sprint1State: {
        sprint1StateSchemaVersion: "0.1.0",
        currentMental: 50 + abilities.spirit.surfaceValue,
        techniqueStates,
        learningFocusTechniqueId: null,
      },
    },
    temporaryCondition: {
      fatigue: 20,
      injury: 10,
      condition: 10,
      confidence: 0,
    },
  };
}

function startInProgressBattle(
  participantAInput: Record<string, unknown> = participantInput("person_a"),
  participantBInput: Record<string, unknown> = participantInput("person_b"),
): BattleState {
  const result = startBattleTransaction(
    {
      createBattleRequest: {
        simulationId: runRuleSnapshot.simulationId,
        worldDate,
        battleKind: "official",
        initialRange: "contact",
        participantA: participantAInput,
        participantB: participantBInput,
        participantAActionSourceIdentity: defaultStrategyIdentity,
        participantBActionSourceIdentity: defaultStrategyIdentity,
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

function clonePlainJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function withRehashedSourceSnapshot(
  participant: BattleParticipantSnapshot,
  mutate: (source: BattleParticipantSourceSnapshot) => BattleParticipantSourceSnapshot,
): BattleParticipantSnapshot {
  const sourceSnapshot = mutate(clonePlainJson(participant.sourceSnapshot));
  const sourceSnapshotHash = expectOk(
    computeBattleParticipantSourceSnapshotHash(sourceSnapshot, sha256Provider),
  );
  return {
    ...clonePlainJson(participant),
    sourceSnapshot,
    sourceSnapshotHash,
  };
}

function expectValidationPathFailure(
  participant: BattleParticipantSnapshot,
  expectedPath: string,
): void {
  const result = validateBattleParticipantSnapshot(participant, "sideA", sha256Provider);
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected validation failure");
  }
  expect(result.issues.map((issue) => issue.path)).toContain(expectedPath);
}

describe("S1-SPEC-0.1.18 version registry", () => {
  it("publishes S1-SPEC-0.1.20 / BattleState 0.6.0 and keeps Sprint1Config SHA", () => {
    expect(S1_SPEC_VERSION).toBe("S1-SPEC-0.1.21");
    expect(BATTLE_STATE_SCHEMA_VERSION).toBe("0.6.0");
    expect(MAIN_SPEC_VERSION_FOR_IDENTITY).toBe("SPEC-0.1.3");
    expect(SPRINT1_CONFIG_SCHEMA_VERSION).toBe("0.2.0");
    expect(SPRINT1_CONFIG_VERSION_DEFAULT).toBe("sprint1-balance-0.2.0");
    const config = expectOk(validateSprint1Config(createDefaultSprint1ConfigInput()));
    expect(sha256Provider.hashUtf8(toCanonicalJson(config))).toBe(
      SPRINT1_BALANCE_0_2_0_CANONICAL_SHA256,
    );
  });

  it("accepts S1-SPEC-0.1.18 identity and rejects 0.1.17", () => {
    const ok = validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.21"));
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(createSimulationIdFromIdentity(ok.value, sha256Provider).ok).toBe(true);
    }
    expect(validateSimulationIdentity(identityWithSprint1("S1-SPEC-0.1.18")).ok).toBe(false);
  });

  it("accepts BattleState schema 0.6.0 and rejects 0.5.0 for new state", () => {
    const state = startInProgressBattle();
    expect(state.schemaVersion).toBe("0.6.0");
    expect(validateBattleState(state, sha256Provider).ok).toBe(true);
    expect(validateBattleState({ ...state, schemaVersion: "0.5.0" }, sha256Provider).ok).toBe(
      false,
    );
  });
});

describe("S1-SPEC-0.1.17 sourceSnapshot baseline", () => {
  it("matches hash(sourceSnapshot) === sourceSnapshotHash at battle start", () => {
    const state = startInProgressBattle();
    const a = state.participantA;
    expect(
      expectOk(computeBattleParticipantSourceSnapshotHash(a.sourceSnapshot, sha256Provider)),
    ).toBe(a.sourceSnapshotHash);
    expect(a.sourceSnapshot.currentMental).toBe(a.currentMental);
    expect(a.sourceSnapshot.injury).toBe(a.injury);
  });

  it("keeps sourceSnapshot canonical-stable after battle-local runtime mutations", () => {
    const state = startInProgressBattle();
    const before = toCanonicalJson(state.participantA.sourceSnapshot);
    const beforeHash = state.participantA.sourceSnapshotHash;

    const mutated: BattleState = {
      ...state,
      participantA: {
        ...state.participantA,
        currentMental: Math.max(0, state.participantA.currentMental - 3),
        injury: Math.min(100, state.participantA.injury + 2),
        techniques: state.participantA.techniques.map((t) => ({
          ...t,
          attemptedUseCount: t.attemptedUseCount + 1,
          successfulUseCount: t.successfulUseCount + 1,
        })),
        damageDealt: 1,
        guarding: true,
      },
    };

    expect(toCanonicalJson(mutated.participantA.sourceSnapshot)).toBe(before);
    expect(mutated.participantA.sourceSnapshotHash).toBe(beforeHash);
    expect(validateBattleState(mutated, sha256Provider).ok).toBe(true);
  });

  it("allows currentMental / injury / use-count divergence without changing sourceSnapshotHash", () => {
    const state = startInProgressBattle();
    const hash = state.participantA.sourceSnapshotHash;
    const sourceCanonical = toCanonicalJson(state.participantA.sourceSnapshot);

    const mentalDiverged = {
      ...state.participantA,
      currentMental: Math.max(0, state.participantA.currentMental - 1),
    };
    expect(mentalDiverged.currentMental).not.toBe(mentalDiverged.sourceSnapshot.currentMental);
    expect(mentalDiverged.sourceSnapshotHash).toBe(hash);
    expect(toCanonicalJson(mentalDiverged.sourceSnapshot)).toBe(sourceCanonical);
    expect(validateBattleParticipantSnapshot(mentalDiverged, "sideA", sha256Provider).ok).toBe(
      true,
    );

    const injuryDiverged = {
      ...state.participantA,
      injury: Math.min(100, state.participantA.injury + 1),
    };
    expect(injuryDiverged.injury).not.toBe(injuryDiverged.sourceSnapshot.injury);
    expect(injuryDiverged.sourceSnapshotHash).toBe(hash);
    expect(validateBattleParticipantSnapshot(injuryDiverged, "sideA", sha256Provider).ok).toBe(
      true,
    );

    const useCountDiverged = {
      ...state.participantA,
      techniques: state.participantA.techniques.map((t) => ({
        ...t,
        attemptedUseCount: t.attemptedUseCount + 2,
        successfulUseCount: t.successfulUseCount + 1,
      })),
    };
    expect(useCountDiverged.techniques[0]!.attemptedUseCount).toBeGreaterThan(
      useCountDiverged.sourceSnapshot.techniques[0]!.attemptedUseCount,
    );
    expect(useCountDiverged.techniques[0]!.successfulUseCount).toBeLessThanOrEqual(
      useCountDiverged.techniques[0]!.attemptedUseCount,
    );
    expect(useCountDiverged.sourceSnapshotHash).toBe(hash);
    expect(toCanonicalJson(useCountDiverged.sourceSnapshot)).toBe(sourceCanonical);
    expect(validateBattleParticipantSnapshot(useCountDiverged, "sideA", sha256Provider).ok).toBe(
      true,
    );
  });

  it("rejects sourceSnapshot.currentMental above maxMental from sourceSnapshot.stats", () => {
    const state = startInProgressBattle();
    const base = state.participantA;
    const maxMentalFromSource = 50 + base.sourceSnapshot.stats.spirit.surfaceValue;
    expect(base.currentMental).toBeLessThanOrEqual(base.maxMental);
    expect(maxMentalFromSource).toBe(base.maxMental);

    const tampered = withRehashedSourceSnapshot(base, (source) => ({
      ...source,
      currentMental: maxMentalFromSource + 1,
    }));
    expect(tampered.currentMental).toBeLessThanOrEqual(tampered.maxMental);
    expect(tampered.sourceSnapshot.currentMental).toBe(maxMentalFromSource + 1);
    expect(
      expectOk(computeBattleParticipantSourceSnapshotHash(tampered.sourceSnapshot, sha256Provider)),
    ).toBe(tampered.sourceSnapshotHash);

    const result = validateBattleParticipantSnapshot(tampered, "sideA", sha256Provider);
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected validation failure");
    }
    expect(result.issues.map((issue) => issue.path)).toContain("/sourceSnapshot/currentMental");
    expect(result.issues.some((issue) => issue.path === "/sourceSnapshotHash")).toBe(false);
  });

  it.each([
    {
      name: "personId",
      path: "/personId",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        personId: "person_other" as typeof source.personId,
      }),
    },
    {
      name: "lifeStatus",
      path: "/lifeStatus",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        lifeStatus: "deceased" as const,
      }),
    },
    {
      name: "participationStatus",
      path: "/participationStatus",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        participationStatus: "waiting" as const,
      }),
    },
    {
      name: "careerStatus",
      path: "/careerStatus",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        careerStatus: "trainee" as const,
      }),
    },
    {
      name: "birthYear",
      path: "/birthYear",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        birthYear: source.birthYear + 1,
      }),
    },
    {
      name: "ageAtBattle",
      path: "/ageAtBattle",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        ageAtBattle: source.ageAtBattle + 1,
      }),
    },
    {
      name: "stats",
      path: "/stats",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        stats: {
          ...source.stats,
          skill: {
            ...source.stats.skill,
            surfaceValue: source.stats.skill.surfaceValue + 1,
          },
        },
      }),
    },
    {
      name: "aptitudes",
      path: "/aptitudes",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        aptitudes: {
          ...source.aptitudes,
          unarmed: {
            ...source.aptitudes.unarmed,
            surfaceValue: source.aptitudes.unarmed.surfaceValue + 1,
          },
        },
      }),
    },
    {
      name: "fatigue",
      path: "/fatigue",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        fatigue: source.fatigue + 1,
      }),
    },
    {
      name: "condition",
      path: "/condition",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        condition: source.condition + 1,
      }),
    },
    {
      name: "confidence",
      path: "/confidence",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        confidence: source.confidence + 1,
      }),
    },
    {
      name: "battleDecisionProfile",
      path: "/battleDecisionProfile",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        battleDecisionProfile: {
          ...source.battleDecisionProfile,
          aggression: source.battleDecisionProfile.aggression + 1,
        },
      }),
    },
    {
      name: "injuryProneness",
      path: "/injuryProneness",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        injuryProneness: Math.min(100, source.injuryProneness + 1),
      }),
    },
    {
      name: "sprint1StateSchemaVersion",
      path: "/sprint1StateSchemaVersion",
      mutate: (source: BattleParticipantSourceSnapshot) => ({
        ...source,
        sprint1StateSchemaVersion: "0.2.0" as typeof source.sprint1StateSchemaVersion,
      }),
    },
  ] as const)(
    "rejects sourceSnapshot.$name bind mismatch with recomputed hash",
    ({ path, mutate }) => {
      const state = startInProgressBattle();
      const tampered = withRehashedSourceSnapshot(state.participantA, mutate);
      expect(
        expectOk(
          computeBattleParticipantSourceSnapshotHash(tampered.sourceSnapshot, sha256Provider),
        ),
      ).toBe(tampered.sourceSnapshotHash);
      expectValidationPathFailure(tampered, path);
    },
  );

  it.each([
    {
      name: "techniqueId",
      path: "/techniques/0/techniqueId",
      mutateTechnique: (technique: BattleParticipantSourceSnapshot["techniques"][number]) => ({
        ...technique,
        techniqueId: "technique_beta" as typeof technique.techniqueId,
      }),
    },
    {
      name: "learningProgressTenths",
      path: "/techniques/0/learningProgressTenths",
      mutateTechnique: (technique: BattleParticipantSourceSnapshot["techniques"][number]) => ({
        ...technique,
        learningProgressTenths: technique.learningProgressTenths - 1,
      }),
    },
    {
      name: "masteryHundredths",
      path: "/techniques/0/masteryHundredths",
      mutateTechnique: (technique: BattleParticipantSourceSnapshot["techniques"][number]) => ({
        ...technique,
        masteryHundredths: technique.masteryHundredths + 1,
      }),
    },
    {
      name: "lastPracticedAbsoluteWeek",
      path: "/techniques/0/lastPracticedAbsoluteWeek",
      mutateTechnique: (technique: BattleParticipantSourceSnapshot["techniques"][number]) => ({
        ...technique,
        lastPracticedAbsoluteWeek: 1,
      }),
    },
    {
      name: "acquiredAbsoluteWeek",
      path: "/techniques/0/acquiredAbsoluteWeek",
      mutateTechnique: (technique: BattleParticipantSourceSnapshot["techniques"][number]) => ({
        ...technique,
        acquiredAbsoluteWeek: (technique.acquiredAbsoluteWeek ?? 0) + 1,
      }),
    },
  ] as const)(
    "rejects sourceSnapshot.techniques.$name bind mismatch with recomputed hash",
    ({ path, mutateTechnique }) => {
      const state = startInProgressBattle();
      const tampered = withRehashedSourceSnapshot(state.participantA, (source) => ({
        ...source,
        techniques: source.techniques.map((technique, index) =>
          index === 0 ? mutateTechnique(technique) : technique,
        ),
      }));
      expect(
        expectOk(
          computeBattleParticipantSourceSnapshotHash(tampered.sourceSnapshot, sha256Provider),
        ),
      ).toBe(tampered.sourceSnapshotHash);
      expectValidationPathFailure(tampered, path);
    },
  );

  it("rejects sourceSnapshot tamper with hash left unchanged", () => {
    const state = startInProgressBattle();
    const a = state.participantA;
    const tampered = {
      ...state,
      participantA: {
        ...a,
        sourceSnapshot: {
          ...a.sourceSnapshot,
          currentMental: a.sourceSnapshot.currentMental + 1,
        },
      },
    };
    expect(tampered.participantA.sourceSnapshotHash).toBe(a.sourceSnapshotHash);
    expect(validateBattleState(tampered, sha256Provider).ok).toBe(false);
  });

  it("keeps the battle-start sourceSnapshotHash fixture stable", () => {
    const state = startInProgressBattle();
    expect(state.participantA.sourceSnapshotHash).toBe(PARTICIPANT_A_SOURCE_SNAPSHOT_HASH_GOLDEN);
    expect(
      expectOk(
        computeBattleParticipantSourceSnapshotHash(
          state.participantA.sourceSnapshot,
          sha256Provider,
        ),
      ),
    ).toBe(PARTICIPANT_A_SOURCE_SNAPSHOT_HASH_GOLDEN);
  });

  it("deep-clones and freezes sourceSnapshot away from current and caller inputs", () => {
    const abilities = buildAbilities({ stamina: 50, spirit: 50 });
    const aptitudes = buildAptitudes();
    const techniqueStates = defaultTechniqueStates();
    const state = startInProgressBattle(
      participantInput("person_a", { abilities, aptitudes, techniqueStates }),
      participantInput("person_b"),
    );
    const source = state.participantA.sourceSnapshot;
    const current = state.participantA;

    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(source.stats)).toBe(true);
    expect(Object.isFrozen(source.aptitudes)).toBe(true);
    expect(Object.isFrozen(source.techniques)).toBe(true);
    expect(Object.isFrozen(source.battleDecisionProfile)).toBe(true);
    for (const key of ABILITY_KEYS) {
      expect(Object.isFrozen(source.stats[key])).toBe(true);
      expect(source.stats[key]).not.toBe(current.stats[key]);
      expect(source.stats[key]).not.toBe(abilities[key]);
    }
    for (const key of APTITUDE_KEYS) {
      expect(Object.isFrozen(source.aptitudes[key])).toBe(true);
      expect(source.aptitudes[key]).not.toBe(current.aptitudes[key]);
      expect(source.aptitudes[key]).not.toBe(aptitudes[key]);
    }
    expect(source.stats).not.toBe(current.stats);
    expect(source.stats).not.toBe(abilities);
    expect(source.aptitudes).not.toBe(current.aptitudes);
    expect(source.aptitudes).not.toBe(aptitudes);
    expect(source.techniques).not.toBe(current.techniques);
    expect(source.techniques).not.toBe(techniqueStates as unknown as typeof source.techniques);
    expect(source.techniques[0]).not.toBe(current.techniques[0]);
    expect(source.techniques[0]).not.toBe(
      techniqueStates[0] as unknown as (typeof source.techniques)[number],
    );
    expect(Object.isFrozen(source.techniques[0]!)).toBe(true);
    expect(source.battleDecisionProfile).not.toBe(current.battleDecisionProfile);
  });
});
