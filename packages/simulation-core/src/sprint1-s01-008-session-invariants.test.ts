import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  WEEKLY_SCORED_ACTIONS,
  commitRunBattlePlan,
  computeConfigHash,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createDefaultStrategyActionSourceIdentity,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  generateInitialWorld,
  runBattleToCompletion,
  runSprint1WeeklyStep,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  type InitialWorldConfig,
  type Person,
  type PersonId,
  type Sprint1RunSession,
  type ValidationResult,
} from "./index.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.issues));
  return result.value;
}

function makeSession(): Sprint1RunSession {
  const config = expectOk(
    validateInitialWorldConfig({
      ...cloneBaselineConfig(),
      profileId: "tiny-s01-008-session-invariants-v1",
      population: {
        totalLiving: 10,
        initialUserFounderCount: 0,
        sexRatioMale: 0.5,
        ageBands: [
          { minAge: 0, maxAge: 7, count: 4 },
          { minAge: 8, maxAge: 15, count: 2 },
          { minAge: 16, maxAge: 41, count: 2 },
          { minAge: 42, maxAge: 70, count: 2 },
        ],
        activeRankDistribution: { F: 0, E: 0, D: 0, C: 1, B: 1, A: 0, S: 0 },
      },
      history: {
        ...cloneBaselineConfig().history,
        initialDeceasedAncestors: 5,
        minimumGenerationDepth: 1,
        maximumGenerationDepth: 2,
      },
      families: {
        ...cloneBaselineConfig().families,
        initialFamilyCount: 3,
        baseBirthRateRange: { min: 0, max: 0 },
      },
      lineages: {
        ...cloneBaselineConfig().lineages,
        initialLineageCount: 2,
        initialQualifiedMasters: 1,
      },
      nameData: {
        ...cloneBaselineConfig().nameData,
        requiredVersion: "NAMES-TEST-0.0.1",
      },
    } as InitialWorldConfig),
  );
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, sha256Provider),
    seed: 8181,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
  const definition = expectOk(
    validateTechniqueDefinition({
      techniqueId: "technique_alpha",
      schemaVersion: "0.1.0",
      dataVersion: "techniques-0.1.0",
      name: "technique_alpha",
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
    }),
  );
  const sidecar = {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: generated.snapshot.persons.map((person) => ({
      personId: person.personId,
      growthProfile: "normal",
      growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
      statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
      temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
      motivationFactor: 10000,
      plannerContext: {
        byAction: Object.fromEntries(
          WEEKLY_SCORED_ACTIONS.map((action) => [
            action,
            { personality: 0, developmentNeed: 0, recentResult: 0, teacherAdvice: 0, schedule: 0 },
          ]),
        ),
      },
      statTargetContext: {
        byAbility: Object.fromEntries(
          ABILITY_KEYS.map((key) => [
            key,
            { relatedAptitude: 50, teacherRecommendation: key === "strength" ? 100 : 0 },
          ]),
        ),
      },
      techniqueTargetContexts: [],
      teacherFactorKey: "averageMaster",
      discipleCount: 0,
    })),
  };
  return expectOk(
    createSprint1RunSession(
      {
        seed: 8181,
        config,
        nameData,
        sprint1CliInput: {
          schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
          sprint1Config: createDefaultSprint1ConfigInput(),
          techniqueCatalog: {
            identity: {
              dataVersion: "techniques-0.1.0",
              catalogHash: expectOk(computeTechniqueCatalogHash([definition], sha256Provider)),
            },
            definitions: [definition],
          },
          initialWeeklyTrainingSidecar: sidecar,
        },
      },
      sha256Provider,
    ),
  ).session;
}

function mutable(session: Sprint1RunSession): Sprint1RunSession {
  return JSON.parse(toCanonicalJson(session)) as Sprint1RunSession;
}

function prepareCompletedBattle(session: Sprint1RunSession) {
  const worldDate = createWorldDate(
    { year: 21, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living" || person.currentAge === null) return person;
    const currentAge = worldDate.year - person.birthYear;
    if (currentAge >= 42) {
      const { currentRank: _, ...retired } = {
        ...person,
        currentAge,
        careerStatus: "retired" as const,
        retirementRank: person.careerStatus === "retired" ? person.retirementRank : "C",
        highestRank: person.careerStatus === "retired" ? person.highestRank : "B",
      } as Person & { currentRank?: string };
      void _;
      return retired as Person;
    }
    if (currentAge >= 16) {
      const { retirementRank: _, ...active } = {
        ...person,
        currentAge,
        careerStatus: "active_competitor" as const,
        currentRank: person.careerStatus === "active_competitor" ? person.currentRank : "C",
        highestRank: person.careerStatus === "active_competitor" ? person.highestRank : "B",
        qualifiedMaster: false,
      } as Person & { retirementRank?: string };
      void _;
      return active as Person;
    }
    const {
      currentRank: _,
      highestRank: __,
      retirementRank: ___,
      ...nonRanked
    } = {
      ...person,
      currentAge,
      careerStatus: currentAge <= 7 ? ("child" as const) : ("trainee" as const),
    } as Person & { currentRank?: string; highestRank?: string; retirementRank?: string };
    void _;
    void __;
    void ___;
    return nonRanked as Person;
  });
  let pristine = {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: { ...session.runtimeState.worldState, worldDate, persons },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
  const eligible = persons.filter(
    (person) =>
      person.lifeStatus === "living" &&
      person.participationStatus === "active" &&
      person.careerStatus === "active_competitor" &&
      person.currentAge !== null &&
      person.currentAge >= 16 &&
      person.currentAge <= 41,
  );
  const [first, second] = eligible;
  if (first === undefined || second === undefined) throw new Error("missing official battle pair");
  pristine = {
    ...pristine,
    runtimeState: {
      ...pristine.runtimeState,
      worldState: {
        ...pristine.runtimeState.worldState,
        persons: persons.map((person) => {
          if (person.personId === first.personId)
            return { ...person, birthYear: 1, currentAge: 20 } as Person;
          if (person.personId === second.personId)
            return { ...person, birthYear: 2, currentAge: 19 } as Person;
          return person;
        }),
      },
    },
  };
  const source = (personId: PersonId) => {
    const person = pristine.runtimeState.worldState.persons.find(
      (entry) => entry.personId === personId,
    );
    const sidecar = pristine.runtimeState.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === personId,
    );
    if (person === undefined || sidecar === undefined) throw new Error("missing battle source");
    return { person, temporaryCondition: sidecar.temporaryCondition };
  };
  const identity = expectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: pristine.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: pristine.context.runRuleSnapshot.sprint1ConfigHash,
    }),
  );
  const week = pristine.runtimeState.battleResultWeekState;
  const run = runBattleToCompletion(
    {
      expectedWorldStateHash: expectOk(
        computeExpectedWorldStateHash(pristine.runtimeState.worldState, sha256Provider),
      ),
      startBattleInput: {
        createBattleRequest: {
          simulationId: pristine.context.simulationId,
          worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: source(first.personId),
          participantB: source(second.personId),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot: pristine.context.runRuleSnapshot,
        },
        worldRngState: pristine.runtimeState.worldRngState,
        matchIdGeneratorState: pristine.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: { identity },
      participantBActionsSource: { identity },
      postProcessContext: {
        participantA: {
          personId: first.personId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, first.personId),
        },
        participantB: {
          personId: second.personId,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, second.personId),
        },
      },
    },
    sha256Provider,
  );
  if (run.kind !== "completed")
    throw new Error(`expected completed battle: ${JSON.stringify(run)}`);
  return { pristine, commitPlan: run.commitPlan };
}

function expectWeeklyRejectsWithoutMutation(session: Sprint1RunSession): void {
  const before = toCanonicalJson(session);
  expect(runSprint1WeeklyStep(session, sha256Provider).ok).toBe(false);
  expect(toCanonicalJson(session)).toBe(before);
}

describe("S01-008 session boundary invariants", () => {
  it("rejects a nextSequence mismatch without mutating the input root", () => {
    const session = mutable(makeSession());
    session.runtimeState.eventAllocationState.nextSequence += 1;
    expectWeeklyRejectsWithoutMutation(session);
  });

  it("rejects nextSequence tampering before applying a valid battle commit plan", () => {
    const { pristine, commitPlan } = prepareCompletedBattle(makeSession());
    const tampered = mutable(pristine);
    tampered.runtimeState.eventAllocationState.nextSequence += 1;
    const before = toCanonicalJson(tampered);
    expect(commitRunBattlePlan({ session: tampered, commitPlan }, sha256Provider).ok).toBe(false);
    expect(toCanonicalJson(tampered)).toBe(before);
  });

  it("rejects event simulationId and sequence tampering", () => {
    const wrongId = mutable(makeSession());
    wrongId.runtimeState.eventStream[0]!.simulationId =
      "simulation_ffffffffffffffff" as (typeof wrongId.runtimeState.eventStream)[0]["simulationId"];
    expectWeeklyRejectsWithoutMutation(wrongId);

    const gap = mutable(makeSession());
    gap.runtimeState.eventStream[0]!.sequence = 1;
    expectWeeklyRejectsWithoutMutation(gap);
  }, 30_000);

  it("rejects processor, person state, and sidecar/world invariant tampering", () => {
    const extraProcessor = mutable(makeSession());
    extraProcessor.runtimeState.processorRuntimeStates.processorSpecificStates!.push({
      processorId: "other",
      specificState: {},
    });
    expectWeeklyRejectsWithoutMutation(extraProcessor);

    const missingSpecificState = mutable(makeSession());
    delete (
      missingSpecificState.runtimeState.processorRuntimeStates.processorSpecificStates![0] as {
        specificState?: unknown;
      }
    ).specificState;
    expectWeeklyRejectsWithoutMutation(missingSpecificState);

    const malformedPerson = mutable(makeSession());
    malformedPerson.runtimeState.worldState.persons[0]!.sprint1State = {} as never;
    expectWeeklyRejectsWithoutMutation(malformedPerson);

    const mismatchedSidecar = mutable(makeSession());
    mismatchedSidecar.runtimeState.weeklyTrainingSidecars.entries =
      mismatchedSidecar.runtimeState.weeklyTrainingSidecars.entries.slice(1);
    expectWeeklyRejectsWithoutMutation(mismatchedSidecar);
  }, 30_000);
});
