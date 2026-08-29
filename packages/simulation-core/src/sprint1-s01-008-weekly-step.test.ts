/**
 * Sprint1 outer weekly transaction tests (S01-008 / S1-SPEC-0.1.20).
 */
import { describe, expect, it, vi } from "vitest";
import * as worldEngine from "./world-engine/engine.js";
import {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION,
  WEEKLY_TRAINING_PROCESSOR_ID,
  WEEKLY_SCORED_ACTIONS,
  assertBattleResultWeekMatchesWorldDate,
  commitRunBattlePlan,
  computeConfigHash,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createInitialBattleResultWeekState,
  createDefaultStrategyActionSourceIdentity,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  generateInitialWorld,
  runBattleToCompletion,
  runSprint1WeeklyStep,
  runSprint1Years,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  type InitialWorldConfig,
  type Person,
  type PersonId,
  type Sprint1EventEnvelope,
  type Sprint1RunSession,
  type ValidationResult,
  type WorldProcessor,
} from "./index.js";
import { setSprint1YearsValidationHooksForTests } from "./sprint1/sprint1-weekly-step.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "./test-fixtures/sprint2-identity.fixture.js";

const sha256Provider = createNodeSha256Provider();

function expectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues, null, 2)}`);
  }
  expect(result.ok).toBe(true);
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s01-008-weekly-v1",
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
      initialDeceasedAncestors: 5,
      minimumGenerationDepth: 1,
      maximumGenerationDepth: 2,
      earliestHistoricalYear: -120,
      minimumAgeAtDeath: 18,
      maximumAgeAtDeath: 70,
      createExistingRelationships: true,
      createPastTournamentHistory: false,
    },
    relationships: {
      knownParentCoverage: 0.5,
      twoKnownParentsCoverageAmongCovered: 0.5,
      retiredSpouseCoverage: 0.4,
      formalMasterCoverageAge8To41: 0.5,
      minimumParentAgeAtChildbirth: 18,
      maximumBiologicalParents: 2,
    },
    families: {
      initialFamilyCount: 3,
      minimumMembersPerFamily: 1,
      maximumMembersPerFamily: 8,
      baseBirthRateRange: { min: 0, max: 0 },
    },
    lineages: {
      initialLineageCount: 2,
      initialQualifiedMasters: 1,
      techniqueFocusWeights: { unarmed: 0.5, sword: 0.25, magic: 0.25 },
    },
    nameData: {
      manifestPath: "data/names/name-data.manifest.json",
      requiredVersion: "NAMES-TEST-0.0.1",
      neutralGivenNameProbability: 0,
      familyNameSelection: "without_replacement",
      avoidDuplicateLivingFullNameWithinFamily: true,
      displayFormat: "{givenName}・{familyName}",
    },
    ...overrides,
  };
}

function plannerContext(): Record<string, unknown> {
  const byAction: Record<string, unknown> = {};
  for (const action of WEEKLY_SCORED_ACTIONS) {
    byAction[action] = {
      personality: 0,
      developmentNeed: 0,
      recentResult: 0,
      teacherAdvice: 0,
      schedule: 0,
    };
  }
  return { byAction };
}

function statTargetContext(): Record<string, unknown> {
  const byAbility: Record<string, unknown> = {};
  for (const key of ABILITY_KEYS) {
    byAbility[key] = {
      relatedAptitude: 50,
      teacherRecommendation: key === "strength" ? 100 : 0,
    };
  }
  return { byAbility };
}

function sidecarEntry(personId: string): Record<string, unknown> {
  return {
    personId,
    growthProfile: "normal",
    growthPotential: Object.fromEntries(ABILITY_KEYS.map((key) => [key, 50])),
    statGrowthRemainders: ABILITY_KEYS.map((stat) => ({ stat, milliPoints: 0 })),
    temporaryCondition: { fatigue: 0, injury: 0, condition: 0, confidence: 0 },
    motivationFactor: 10000,
    plannerContext: plannerContext(),
    statTargetContext: statTargetContext(),
    techniqueTargetContexts: [],
    teacherFactorKey: "averageMaster",
    discipleCount: 0,
  };
}

function techniqueDefinition(techniqueId: string): Record<string, unknown> {
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
  };
}

function buildSidecarForPersonIds(personIds: readonly string[]): Record<string, unknown> {
  return {
    schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
    entries: [...personIds]
      .sort((a, b) => a.localeCompare(b))
      .map((personId) => sidecarEntry(personId)),
  };
}

function buildSprint1CliInput(sidecar: Record<string, unknown>): Record<string, unknown> {
  const def = expectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const catalogHash = expectOk(computeTechniqueCatalogHash([def], sha256Provider));
  return {
    schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
    sprint1Config: createDefaultSprint1ConfigInput(),
    techniqueCatalog: {
      identity: { dataVersion: "techniques-0.1.0", catalogHash },
      definitions: [def],
    },
    initialWeeklyTrainingSidecar: sidecar,
  };
}

function buildFreshSession(seed = 5150): Sprint1RunSession {
  const config = expectOk(validateInitialWorldConfig(createSmallConfig()));
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
  const personIds = generated.snapshot.persons.map((person) => person.personId);
  const created = expectOk(
    createSprint1RunSession(
      withDefaultSprint2BindingsForRunSessionInput(
        {
          seed,
          config,
          nameData,
          sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
        },
        sha256Provider,
      ),
      sha256Provider,
    ),
  );
  return created.session;
}

function prepareBattleSession(seed: number): {
  session: Sprint1RunSession;
  personA: PersonId;
  personB: PersonId;
} {
  const initial = buildFreshSession(seed);
  const worldDate = createWorldDate(
    { year: 21, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
  let persons = initial.runtimeState.worldState.persons.map((person) => {
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
  const eligible = persons.filter(
    (person) =>
      person.lifeStatus === "living" &&
      person.participationStatus === "active" &&
      person.careerStatus === "active_competitor" &&
      person.currentAge !== null &&
      person.currentAge >= 16 &&
      person.currentAge <= 41,
  );
  if (eligible.length < 2) throw new Error("expected two official battle participants");
  const [personA, personB] = eligible;
  if (personA === undefined || personB === undefined) throw new Error("missing battle participant");
  persons = persons.map((person) => {
    if (person.personId === personA.personId)
      return { ...person, birthYear: 1, currentAge: 20 } as Person;
    if (person.personId === personB.personId)
      return { ...person, birthYear: 2, currentAge: 19 } as Person;
    return person;
  });
  return {
    session: {
      ...initial,
      runtimeState: {
        ...initial.runtimeState,
        worldState: { ...initial.runtimeState.worldState, worldDate, persons },
        battleResultWeekState: {
          ...initial.runtimeState.battleResultWeekState,
          absoluteWeek: worldDate.absoluteWeek,
        },
      },
    },
    personA: personA.personId,
    personB: personB.personId,
  };
}

function commitCompletedBattle(
  session: Sprint1RunSession,
  personA: PersonId,
  personB: PersonId,
): Sprint1RunSession {
  const participantSource = (personId: PersonId) => {
    const person = session.runtimeState.worldState.persons.find(
      (entry) => entry.personId === personId,
    );
    const sidecar = session.runtimeState.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === personId,
    );
    if (person === undefined || sidecar === undefined) throw new Error("missing battle source");
    return { person, temporaryCondition: sidecar.temporaryCondition };
  };
  const identity = expectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: session.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: session.context.runRuleSnapshot.sprint1ConfigHash,
    }),
  );
  const week = session.runtimeState.battleResultWeekState;
  const run = runBattleToCompletion(
    {
      expectedWorldStateHash: expectOk(
        computeExpectedWorldStateHash(session.runtimeState.worldState, sha256Provider),
      ),
      startBattleInput: {
        createBattleRequest: {
          simulationId: session.context.simulationId,
          worldDate: session.runtimeState.worldState.worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantSource(personA),
          participantB: participantSource(personB),
          participantAActionSourceIdentity: identity,
          participantBActionSourceIdentity: identity,
          runRuleSnapshot: session.context.runRuleSnapshot,
        },
        worldRngState: session.runtimeState.worldRngState,
        matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: { identity },
      participantBActionsSource: { identity },
      postProcessContext: {
        participantA: {
          personId: personA,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, personA),
        },
        participantB: {
          personId: personB,
          matchesCompletedThisWorldWeekBeforeBattle:
            computeMatchesCompletedThisWorldWeekBeforeBattle(week, personB),
        },
      },
    },
    sha256Provider,
  );
  if (run.kind !== "completed")
    throw new Error(`expected completed battle: ${JSON.stringify(run)}`);
  return expectOk(commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider));
}

function toCanonicalSnapshot(session: Sprint1RunSession): string {
  return JSON.stringify(session);
}

function mutableSession(session: Sprint1RunSession): Sprint1RunSession {
  return JSON.parse(toCanonicalSnapshot(session)) as Sprint1RunSession;
}

describe("runSprint1WeeklyStep", () => {
  it("resets week registry on week advance while keeping run-wide battleResults", () => {
    const prepared = prepareBattleSession(6003);
    const committed = commitCompletedBattle(prepared.session, prepared.personA, prepared.personB);
    const advanced = expectOk(runSprint1WeeklyStep(committed, sha256Provider));

    expect(committed.runtimeState.battleResults.length).toBeGreaterThanOrEqual(1);
    expect(advanced.runtimeState.battleResults).toEqual(committed.runtimeState.battleResults);
    expect(advanced.runtimeState.battleResultWeekState.results).toEqual([]);
    expect(advanced.runtimeState.worldState.worldDate.absoluteWeek).toBe(
      committed.runtimeState.worldState.worldDate.absoluteWeek + 1,
    );
    expect(advanced.runtimeState.battleResultWeekState.absoluteWeek).toBe(
      advanced.runtimeState.worldState.worldDate.absoluteWeek,
    );
    expect(
      assertBattleResultWeekMatchesWorldDate({
        battleResultWeekState: advanced.runtimeState.battleResultWeekState,
        worldState: advanced.runtimeState.worldState,
      }).ok,
    ).toBe(true);
  });

  it("advances one week and updates persons, sidecar, events, and processor runtime", () => {
    const session = buildFreshSession(6001);
    const beforePerson = session.runtimeState.worldState.persons[0]!;
    const beforeSidecar = session.runtimeState.weeklyTrainingSidecars.entries[0]!;
    const beforeEventCount = session.runtimeState.eventStream.length;
    const beforeNextSequence = session.runtimeState.eventAllocationState.nextSequence;

    const stepped = expectOk(runSprint1WeeklyStep(session, sha256Provider));

    expect(stepped.runtimeState.worldState.worldDate.absoluteWeek).toBe(1);
    expect(stepped.runtimeState.eventStream.length).toBeGreaterThan(beforeEventCount);
    expect(stepped.runtimeState.eventAllocationState.nextSequence).toBeGreaterThan(
      beforeNextSequence,
    );

    const newWeeklyEvents = stepped.runtimeState.eventStream.filter(
      (event) => event.sourceProcessor === WEEKLY_TRAINING_PROCESSOR_ID,
    );
    expect(newWeeklyEvents.length).toBeGreaterThan(0);
    for (const event of newWeeklyEvents) {
      expect(event.schemaVersion).toBe(SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION);
      expect(event.simulationId).toBe(stepped.context.simulationId);
      expect(event.entities.matchIds).toEqual([]);
    }

    const afterPerson = stepped.runtimeState.worldState.persons.find(
      (person) => person.personId === beforePerson.personId,
    )!;
    const afterSidecar = stepped.runtimeState.weeklyTrainingSidecars.entries.find(
      (entry) => entry.personId === beforeSidecar.personId,
    )!;
    expect(afterPerson).not.toBe(beforePerson);
    expect(afterSidecar).not.toBe(beforeSidecar);

    const specificState =
      stepped.runtimeState.processorRuntimeStates.processorSpecificStates?.[0]?.specificState;
    expect(specificState).toMatchObject({ lastProcessedAbsoluteWeek: 0 });

    expect(
      assertBattleResultWeekMatchesWorldDate({
        battleResultWeekState: stepped.runtimeState.battleResultWeekState,
        worldState: stepped.runtimeState.worldState,
      }).ok,
    ).toBe(true);
    expect(stepped.runtimeState.battleResultWeekState.absoluteWeek).toBe(1);
    expect(stepped.runtimeState.battleResultWeekState.results).toEqual([]);
  });

  it("does not register weekly-training into legacy WorldProcessor processors", () => {
    const session = buildFreshSession(6002);
    const runWorldSpy = vi.spyOn(worldEngine, "runWorldOneWeek");

    try {
      expectOk(runSprint1WeeklyStep(session, sha256Provider));
      expect(runWorldSpy).toHaveBeenCalled();
      const call = runWorldSpy.mock.calls[0]?.[0];
      expect(call?.processors).toEqual([]);
    } finally {
      runWorldSpy.mockRestore();
    }
  });

  it("rejects reserved legacy processor IDs before mutating the session or invoking processors", () => {
    const session = buildFreshSession(6007);
    const before = toCanonicalSnapshot(session);
    const beforeWeeklyRng = JSON.stringify(
      session.runtimeState.processorRuntimeStates.rngStates.find(
        (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
      ),
    );
    const beforeNextSequence = session.runtimeState.eventAllocationState.nextSequence;
    const processor: WorldProcessor = {
      processorId: WEEKLY_TRAINING_PROCESSOR_ID,
      process: vi.fn((input) => input.state),
    };

    const failed = runSprint1WeeklyStep(session, sha256Provider, {
      legacyProcessors: [processor],
    });

    expect(failed.ok).toBe(false);
    expect(processor.process).not.toHaveBeenCalled();
    expect(toCanonicalSnapshot(session)).toBe(before);
    expect(
      JSON.stringify(
        session.runtimeState.processorRuntimeStates.rngStates.find(
          (entry) => entry.processorId === WEEKLY_TRAINING_PROCESSOR_ID,
        ),
      ),
    ).toBe(beforeWeeklyRng);
    expect(session.runtimeState.eventAllocationState.nextSequence).toBe(beforeNextSequence);
  });

  it("rejects accessor processor IDs without invoking their getters", () => {
    const session = buildFreshSession(6008);
    const before = toCanonicalSnapshot(session);
    let getterCalls = 0;
    const processor = {
      process: vi.fn((input: Parameters<WorldProcessor["process"]>[0]) => input.state),
    } as unknown as WorldProcessor;
    Object.defineProperty(processor, "processorId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return "weekly-training";
      },
    });

    const failed = runSprint1WeeklyStep(session, sha256Provider, {
      legacyProcessors: [processor],
    });

    expect(failed.ok).toBe(false);
    expect(getterCalls).toBe(0);
    expect(processor.process).not.toHaveBeenCalled();
    expect(toCanonicalSnapshot(session)).toBe(before);
  });

  it("accepts non-Sprint1 legacy WorldProcessor auxiliary hooks", () => {
    const session = buildFreshSession(6009);
    const processor: WorldProcessor = {
      processorId: "simulator/year-end-state-capture",
      process: vi.fn((input) => input.state),
    };

    expectOk(runSprint1WeeklyStep(session, sha256Provider, { legacyProcessors: [processor] }));
    expect(processor.process).toHaveBeenCalledOnce();
  });

  it("rolls back without mutating the input session on failure", () => {
    const session = buildFreshSession(6004);
    const badSession: Sprint1RunSession = {
      ...session,
      runtimeState: {
        ...session.runtimeState,
        battleResultWeekState: expectOk(createInitialBattleResultWeekState(99)),
      },
    };
    const before = toCanonicalSnapshot(badSession);
    const beforeNextSequence = badSession.runtimeState.eventAllocationState.nextSequence;

    const failed = runSprint1WeeklyStep(badSession, sha256Provider);
    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.issues.some((issue) => issue.path.includes("battleResultWeekState"))).toBe(true);

    expect(toCanonicalSnapshot(badSession)).toBe(before);
    expect(badSession.runtimeState.eventAllocationState.nextSequence).toBe(beforeNextSequence);
  });

  it("rolls back adapter failure including global event allocation", () => {
    const session = buildFreshSession(6005);
    const badSession = {
      ...session,
      runtimeState: {
        ...session.runtimeState,
        weeklyTrainingSidecars: {
          ...session.runtimeState.weeklyTrainingSidecars,
          entries: session.runtimeState.weeklyTrainingSidecars.entries.slice(1),
        },
      },
    } as Sprint1RunSession;
    const before = toCanonicalSnapshot(badSession);
    const beforeNextSequence = badSession.runtimeState.eventAllocationState.nextSequence;

    const failed = runSprint1WeeklyStep(badSession, sha256Provider);
    expect(failed.ok).toBe(false);
    expect(toCanonicalSnapshot(badSession)).toBe(before);
    expect(badSession.runtimeState.eventAllocationState.nextSequence).toBe(beforeNextSequence);
  });

  it("rolls back weekly draft and sequence when legacy WorldEngine processing throws", () => {
    const session = buildFreshSession(6006);
    const before = toCanonicalSnapshot(session);
    const beforeNextSequence = session.runtimeState.eventAllocationState.nextSequence;
    const failed = runSprint1WeeklyStep(session, sha256Provider, {
      legacyProcessors: [
        {
          processorId: "test-failing-world-processor",
          process() {
            throw new Error("forced WorldEngine processor failure");
          },
        },
      ],
    });

    expect(failed.ok).toBe(false);
    if (failed.ok) return;
    expect(failed.issues.some((issue) => issue.path === "/worldEngine")).toBe(true);
    expect(toCanonicalSnapshot(session)).toBe(before);
    expect(session.runtimeState.eventAllocationState.nextSequence).toBe(beforeNextSequence);
  });
});

describe("runSprint1Years", () => {
  it("validates the input session even when years is zero", () => {
    const valid = buildFreshSession(6101);
    const validBefore = toCanonicalSnapshot(valid);
    const zeroYears = runSprint1Years(valid, 0, sha256Provider);
    expect(zeroYears.ok).toBe(true);
    expect(zeroYears.ok && toCanonicalSnapshot(zeroYears.value)).toBe(validBefore);

    const invalidEventAllocation = mutableSession(buildFreshSession(6102));
    invalidEventAllocation.runtimeState.eventAllocationState.nextSequence += 1;
    const allocationBefore = toCanonicalSnapshot(invalidEventAllocation);
    expect(runSprint1Years(invalidEventAllocation, 0, sha256Provider).ok).toBe(false);
    expect(toCanonicalSnapshot(invalidEventAllocation)).toBe(allocationBefore);

    const wrongEventSimulationId = mutableSession(buildFreshSession(6103));
    wrongEventSimulationId.runtimeState.eventStream[0]!.simulationId =
      "simulation_ffffffffffffffff" as (typeof wrongEventSimulationId.runtimeState.eventStream)[0]["simulationId"];
    const eventBefore = toCanonicalSnapshot(wrongEventSimulationId);
    expect(runSprint1Years(wrongEventSimulationId, 0, sha256Provider).ok).toBe(false);
    expect(toCanonicalSnapshot(wrongEventSimulationId)).toBe(eventBefore);

    const invalidProcessor = mutableSession(buildFreshSession(6104));
    invalidProcessor.runtimeState.processorRuntimeStates.processorSpecificStates!.push({
      processorId: "unexpected-processor",
      specificState: {},
    });
    const processorBefore = toCanonicalSnapshot(invalidProcessor);
    expect(runSprint1Years(invalidProcessor, 0, sha256Provider).ok).toBe(false);
    expect(toCanonicalSnapshot(invalidProcessor)).toBe(processorBefore);
  });

  it("validates legacyProcessors options even when years is zero", () => {
    const valid = buildFreshSession(6110);
    const validBefore = toCanonicalSnapshot(valid);

    expectOk(runSprint1Years(valid, 0, sha256Provider, {}));
    expect(toCanonicalSnapshot(valid)).toBe(validBefore);

    const yearEnd: WorldProcessor = {
      processorId: "simulator/year-end-state-capture",
      process: vi.fn((input) => input.state),
    };
    expectOk(
      runSprint1Years(valid, 0, sha256Provider, {
        legacyProcessors: [yearEnd],
      }),
    );
    expect(yearEnd.process).not.toHaveBeenCalled();
    expect(toCanonicalSnapshot(valid)).toBe(validBefore);

    const reserved: WorldProcessor = {
      processorId: WEEKLY_TRAINING_PROCESSOR_ID,
      process: vi.fn((input) => input.state),
    };
    const reservedFailed = runSprint1Years(valid, 0, sha256Provider, {
      legacyProcessors: [reserved],
    });
    expect(reservedFailed.ok).toBe(false);
    expect(reserved.process).not.toHaveBeenCalled();
    expect(toCanonicalSnapshot(valid)).toBe(validBefore);

    let getterCalls = 0;
    const accessorProcessor = {
      process: vi.fn((input: Parameters<WorldProcessor["process"]>[0]) => input.state),
    } as unknown as WorldProcessor;
    Object.defineProperty(accessorProcessor, "processorId", {
      enumerable: true,
      get() {
        getterCalls += 1;
        return WEEKLY_TRAINING_PROCESSOR_ID;
      },
    });
    const accessorFailed = runSprint1Years(valid, 0, sha256Provider, {
      legacyProcessors: [accessorProcessor],
    });
    expect(accessorFailed.ok).toBe(false);
    expect(getterCalls).toBe(0);
    expect(accessorProcessor.process).not.toHaveBeenCalled();
    expect(toCanonicalSnapshot(valid)).toBe(validBefore);
  });

  it("advances 48 weeks per year", () => {
    const session = buildFreshSession(6100);
    const afterOneYear = expectOk(runSprint1Years(session, 1, sha256Provider));
    expect(afterOneYear.runtimeState.worldState.worldDate.absoluteWeek).toBe(48);
    expect(afterOneYear.runtimeState.worldState.worldDate.year).toBe(2);
  }, 60_000);

  it("matches 48 public weekly steps for one year (canonical equivalence)", () => {
    const seed = 6201;
    const yearsSession = buildFreshSession(seed);
    const afterYears = expectOk(runSprint1Years(yearsSession, 1, sha256Provider));

    let weekly = buildFreshSession(seed);
    for (let week = 0; week < 48; week += 1) {
      weekly = expectOk(runSprint1WeeklyStep(weekly, sha256Provider));
    }

    expect(toCanonicalJson(afterYears.context)).toBe(toCanonicalJson(weekly.context));
    expect(toCanonicalJson(afterYears.runtimeState.worldState)).toBe(
      toCanonicalJson(weekly.runtimeState.worldState),
    );
    expect(toCanonicalJson(afterYears.runtimeState.weeklyTrainingSidecars)).toBe(
      toCanonicalJson(weekly.runtimeState.weeklyTrainingSidecars),
    );
    expect(toCanonicalJson(afterYears.runtimeState.processorRuntimeStates)).toBe(
      toCanonicalJson(weekly.runtimeState.processorRuntimeStates),
    );
    expect(toCanonicalJson(afterYears.runtimeState.eventStream)).toBe(
      toCanonicalJson(weekly.runtimeState.eventStream),
    );
    expect(toCanonicalJson(afterYears.runtimeState.eventAllocationState)).toBe(
      toCanonicalJson(weekly.runtimeState.eventAllocationState),
    );
    expect(toCanonicalJson(afterYears.runtimeState.battleResults)).toBe(
      toCanonicalJson(weekly.runtimeState.battleResults),
    );
    expect(toCanonicalJson(afterYears.runtimeState.battleResultWeekState)).toBe(
      toCanonicalJson(weekly.runtimeState.battleResultWeekState),
    );
    expect(toCanonicalJson(afterYears.runtimeState.worldRngState)).toBe(
      toCanonicalJson(weekly.runtimeState.worldRngState),
    );
    expect(toCanonicalJson(afterYears.runtimeState.matchIdGeneratorState)).toBe(
      toCanonicalJson(weekly.runtimeState.matchIdGeneratorState),
    );
  }, 120_000);

  it("keeps full-session validation O(1) across multi-week years", () => {
    const session = buildFreshSession(6301);
    let fullSessionValidations = 0;
    let transitionEventValidations = 0;
    setSprint1YearsValidationHooksForTests({
      onFullSessionValidation: () => {
        fullSessionValidations += 1;
      },
      onTransitionEventEnvelopeValidation: () => {
        transitionEventValidations += 1;
      },
    });
    try {
      const afterTwoYears = expectOk(runSprint1Years(session, 2, sha256Provider));
      // start + final only (not 2 * weeks)
      expect(fullSessionValidations).toBe(2);
      expect(transitionEventValidations).toBe(
        afterTwoYears.runtimeState.eventStream.length - session.runtimeState.eventStream.length,
      );
      // Must stay far below the old public-weekly pattern (1 + 2*96).
      expect(fullSessionValidations).toBeLessThan(10);
    } finally {
      setSprint1YearsValidationHooksForTests(null);
    }
  }, 120_000);

  it("does not partially commit on reserved weekly-training preflight failure (caller root unchanged)", () => {
    const session = buildFreshSession(6401);
    const before = toCanonicalSnapshot(session);
    const reserved: WorldProcessor = {
      processorId: WEEKLY_TRAINING_PROCESSOR_ID,
      process: (input) => input.state,
    };
    // Invalid legacyProcessors fail before any week mutation path commits.
    const failed = runSprint1Years(session, 1, sha256Provider, {
      legacyProcessors: [reserved],
    });
    expect(failed.ok).toBe(false);
    expect(toCanonicalSnapshot(session)).toBe(before);
  });

  it("does not partially commit on true mid-year failure after successful weeks", () => {
    const session = buildFreshSession(6402);
    const before = toCanonicalSnapshot(session);
    let processCalls = 0;
    const midYearFail: WorldProcessor = {
      processorId: "test-mid-year-fail",
      process: (input) => {
        processCalls += 1;
        // First three weeks succeed; fail on the fourth trusted week.
        if (processCalls > 3) {
          throw new Error("intentional mid-year failure");
        }
        return input.state;
      },
    };
    const failed = runSprint1Years(session, 1, sha256Provider, {
      legacyProcessors: [midYearFail],
    });
    expect(failed.ok).toBe(false);
    expect(processCalls).toBeGreaterThan(3);
    expect(toCanonicalSnapshot(session)).toBe(before);
  }, 60_000);

  it("exposes only frozen narrow week observations (no session mutation port)", () => {
    const session = buildFreshSession(6403);
    const withoutObserver = expectOk(runSprint1Years(session, 1, sha256Provider));
    const observations: Array<{
      keys: string[];
      frozenRoot: boolean;
      frozenWorldDate: boolean;
      frozenAppended: boolean;
      eventCountCumulative: number;
      appendedLength: number;
      absoluteWeek: number;
    }> = [];
    const withObserver = expectOk(
      runSprint1Years(session, 1, sha256Provider, {
        onAfterValidatedWeek: (observation) => {
          observations.push({
            keys: Object.keys(observation).sort(),
            frozenRoot: Object.isFrozen(observation),
            frozenWorldDate: Object.isFrozen(observation.worldDate),
            frozenAppended: Object.isFrozen(observation.appendedEvents),
            eventCountCumulative: observation.eventCountCumulative,
            appendedLength: observation.appendedEvents.length,
            absoluteWeek: observation.worldDate.absoluteWeek,
          });
          expect(observation).not.toHaveProperty("runtimeState");
          expect(observation).not.toHaveProperty("context");
          expect(observation).not.toHaveProperty("weeklyTrainingSidecars");
          expect(observation).not.toHaveProperty("battleResults");
          expect(observation).not.toHaveProperty("eventStream");
          expect(observation).not.toHaveProperty("processorRuntimeStates");
          // Observation must reject mutation (frozen).
          expect(() => {
            (observation as { eventCountCumulative: number }).eventCountCumulative = -1;
          }).toThrow();
          expect(() => {
            (observation.worldDate as { absoluteWeek: number }).absoluteWeek = -1;
          }).toThrow();
          expect(() => {
            (observation.appendedEvents as Sprint1EventEnvelope[]).push(
              observation.appendedEvents[0]!,
            );
          }).toThrow();
        },
      }),
    );
    expect(observations.length).toBe(48);
    expect(observations.every((entry) => entry.frozenRoot)).toBe(true);
    expect(observations.every((entry) => entry.frozenWorldDate)).toBe(true);
    expect(observations.every((entry) => entry.frozenAppended)).toBe(true);
    expect(
      observations.every(
        (entry) => entry.keys.join(",") === "appendedEvents,eventCountCumulative,worldDate",
      ),
    ).toBe(true);
    expect(observations[0]!.absoluteWeek).toBe(1);
    expect(observations[47]!.absoluteWeek).toBe(48);
    expect(observations[47]!.eventCountCumulative).toBe(
      withObserver.runtimeState.eventStream.length,
    );
    expect(toCanonicalJson(withObserver.runtimeState.worldState)).toBe(
      toCanonicalJson(withoutObserver.runtimeState.worldState),
    );
    expect(toCanonicalJson(withObserver.runtimeState.eventStream)).toBe(
      toCanonicalJson(withoutObserver.runtimeState.eventStream),
    );
  }, 120_000);

  it("converts week observer throw into ValidationResult without mutating caller root", () => {
    const session = buildFreshSession(6404);
    const before = toCanonicalSnapshot(session);
    let calls = 0;
    const failed = runSprint1Years(session, 1, sha256Provider, {
      onAfterValidatedWeek: () => {
        calls += 1;
        if (calls >= 2) {
          throw new Error("observer boom");
        }
      },
    });
    expect(failed.ok).toBe(false);
    if (failed.ok) {
      throw new Error("expected failure");
    }
    expect(calls).toBe(2);
    expect(failed.issues.some((issue) => issue.path === "/onAfterValidatedWeek")).toBe(true);
    expect(toCanonicalSnapshot(session)).toBe(before);
  }, 60_000);
});
