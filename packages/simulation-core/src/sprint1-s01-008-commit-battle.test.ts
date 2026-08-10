/**
 * commitRunBattlePlan production tests (S01-008 / 12 §23.2).
 */
import { describe, expect, it } from "vitest";
import {
  ABILITY_KEYS,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  commitRunBattlePlan,
  computeConfigHash,
  computeExpectedWorldStateHash,
  computeMatchesCompletedThisWorldWeekBeforeBattle,
  computeRunBattleCommitPlanHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  computeActionScriptHash,
  countCompletedMatchesForPersonThisWorldWeek,
  createDefaultSprint1ConfigInput,
  createDefaultStrategyActionSourceIdentity,
  createScriptedActionsSourceIdentity,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  generateInitialWorld,
  runBattleToCompletion,
  runSprint1WeeklyStep,
  toCanonicalJson,
  validateBattleActionScript,
  validateBattleParticipant,
  validateInitialWorldConfig,
  validateRunBattleCommitPlanStructure,
  validateTechniqueDefinition,
  BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
  battleActionScriptToCanonicalScript,
  WEEKLY_SCORED_ACTIONS,
  type InitialWorldConfig,
  type PersonId,
  type Person,
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
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  expect(result.ok).toBe(true);
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s01-008-commit-v1",
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

function sidecarEntry(
  personId: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
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
    ...overrides,
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
    power: 80,
    accuracy: 95,
    activationDifficulty: 0,
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

function buildSession(seed = 5150): Sprint1RunSession {
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
      {
        seed,
        config,
        nameData,
        sprint1CliInput: buildSprint1CliInput(buildSidecarForPersonIds(personIds)),
      },
      sha256Provider,
      { generateInitialWorld: () => generated },
    ),
  );
  return created.session;
}

function normalizeCareerStatusForAge(person: Person, currentAge: number): Person {
  if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
    return person;
  }

  let careerStatus = person.careerStatus;
  if (currentAge <= 7) {
    careerStatus = "child";
  } else if (currentAge <= 15) {
    careerStatus = "trainee";
  } else if (currentAge >= 42) {
    careerStatus = "retired";
  } else if (careerStatus === "child" || careerStatus === "trainee") {
    careerStatus = "active_competitor";
  }

  const base = {
    ...person,
    currentAge,
    careerStatus,
    qualifiedMaster: careerStatus === "retired" ? person.qualifiedMaster : false,
  };

  if (careerStatus === "active_competitor") {
    const { retirementRank: _, ...withoutRetirement } = base as Person & {
      retirementRank?: string;
    };
    void _;
    return {
      ...withoutRetirement,
      careerStatus: "active_competitor",
      currentRank: person.careerStatus === "active_competitor" ? person.currentRank : "C",
      highestRank: person.careerStatus === "active_competitor" ? person.highestRank : "B",
      qualifiedMaster: false,
    } as Person;
  }

  if (careerStatus === "retired") {
    const { currentRank: _, ...withoutCurrent } = base as Person & {
      currentRank?: string;
    };
    void _;
    return {
      ...withoutCurrent,
      careerStatus: "retired",
      retirementRank: person.careerStatus === "retired" ? person.retirementRank : "C",
      highestRank: person.careerStatus === "retired" ? person.highestRank : "B",
    } as Person;
  }

  const {
    currentRank: _a,
    highestRank: _b,
    retirementRank: _c,
    ...minimal
  } = base as Person & {
    currentRank?: string;
    highestRank?: string;
    retirementRank?: string;
  };
  void _a;
  void _b;
  void _c;
  return minimal as Person;
}

function advanceWorldDateForBattle(session: Sprint1RunSession): Sprint1RunSession {
  const worldDate = createWorldDate({ year: 21, month: 4, weekOfMonth: 1 });
  const worldYear = worldDate.year;
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.lifeStatus !== "living" || person.currentAge === null) {
      return person;
    }
    const currentAge = worldYear - person.birthYear;
    return normalizeCareerStatusForAge(person, currentAge);
  });
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        worldDate,
        persons,
      },
      battleResultWeekState: {
        ...session.runtimeState.battleResultWeekState,
        absoluteWeek: worldDate.absoluteWeek,
      },
    },
  };
}

function normalizePersonForOfficialBattle(
  session: Sprint1RunSession,
  personId: PersonId,
  birthYear: number,
): Sprint1RunSession {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const currentAge = worldYear - birthYear;
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.personId !== personId) {
      return person;
    }
    return normalizeCareerStatusForAge(
      {
        ...person,
        birthYear,
        participationStatus: "active",
        careerStatus: "active_competitor",
        currentRank: "C",
        highestRank: "B",
        qualifiedMaster: false,
      } as Person,
      currentAge,
    );
  });
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      worldState: {
        ...session.runtimeState.worldState,
        persons,
      },
    },
  };
}

function ensureTechniqueAlpha(session: Sprint1RunSession, personId: PersonId): Sprint1RunSession {
  const runtime = session.runtimeState;
  const persons = runtime.worldState.persons.map((person) => {
    if (person.personId !== personId) {
      return person;
    }
    const sprint1State = person.sprint1State;
    if (sprint1State === undefined) {
      return person;
    }
    const hasTechnique = sprint1State.techniqueStates.some(
      (state) => state.techniqueId === "technique_alpha",
    );
    if (hasTechnique) {
      return person;
    }
    return {
      ...person,
      sprint1State: {
        ...sprint1State,
        techniqueStates: [
          ...sprint1State.techniqueStates,
          {
            techniqueId: "technique_alpha",
            learningProgressTenths: 1000,
            masteryHundredths: 5000,
            lastPracticedAbsoluteWeek: null,
            acquiredAbsoluteWeek: 10,
            attemptedUseCount: 0,
            successfulUseCount: 0,
          },
        ],
      },
    } as Person;
  });
  return {
    ...session,
    runtimeState: {
      ...runtime,
      worldState: {
        ...runtime.worldState,
        persons,
      },
    },
  };
}

function participantSource(
  session: Sprint1RunSession,
  personId: PersonId,
): Record<string, unknown> {
  const person = session.runtimeState.worldState.persons.find(
    (entry) => entry.personId === personId,
  );
  const sidecar = session.runtimeState.weeklyTrainingSidecars.entries.find(
    (entry) => entry.personId === personId,
  );
  if (person === undefined || sidecar === undefined) {
    throw new Error(`missing person or sidecar for ${personId}`);
  }
  return {
    person,
    temporaryCondition: sidecar.temporaryCondition,
  };
}

function setSidecarTemporaryCondition(
  session: Sprint1RunSession,
  personId: PersonId,
  temporaryCondition: Record<string, number>,
): Sprint1RunSession {
  const entries = session.runtimeState.weeklyTrainingSidecars.entries.map((entry) =>
    entry.personId === personId
      ? {
          ...entry,
          temporaryCondition: {
            ...entry.temporaryCondition,
            ...temporaryCondition,
          },
        }
      : entry,
  );
  return {
    ...session,
    runtimeState: {
      ...session.runtimeState,
      weeklyTrainingSidecars: {
        ...session.runtimeState.weeklyTrainingSidecars,
        entries,
      },
    },
  };
}

function sidecarFatigue(session: Sprint1RunSession, personId: PersonId): number {
  const entry = session.runtimeState.weeklyTrainingSidecars.entries.find(
    (candidate) => candidate.personId === personId,
  );
  if (entry === undefined) {
    throw new Error(`missing sidecar for ${personId}`);
  }
  return entry.temporaryCondition.fatigue;
}

function postProcessContext(
  session: Sprint1RunSession,
  personA: PersonId,
  personB: PersonId,
): Record<string, unknown> {
  const week = session.runtimeState.battleResultWeekState;
  return {
    participantA: {
      personId: personA,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        personA,
      ),
    },
    participantB: {
      personId: personB,
      matchesCompletedThisWorldWeekBeforeBattle: computeMatchesCompletedThisWorldWeekBeforeBattle(
        week,
        personB,
      ),
    },
  };
}

function defaultIdentity(session: Sprint1RunSession) {
  return expectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: session.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: session.context.runRuleSnapshot.sprint1ConfigHash,
    }),
  );
}

function buildResolutionErrorScript() {
  const script = expectOk(
    validateBattleActionScript(
      {
        scriptFormatVersion: BATTLE_ACTION_SCRIPT_FORMAT_VERSION,
        turns: [
          {
            turnNumber: 1,
            sideA: { kind: "basic_defense" },
            sideB: { kind: "basic_defense" },
          },
        ],
      },
      1,
    ),
  );
  const canonical = battleActionScriptToCanonicalScript(script);
  const hash = expectOk(computeActionScriptHash(canonical, sha256Provider));
  const identity = expectOk(createScriptedActionsSourceIdentity({ actionScriptHash: hash }));
  return { canonical, identity };
}

function runSessionBattle(input: {
  session: Sprint1RunSession;
  personA: PersonId;
  personB: PersonId;
  useResolutionErrorScript?: boolean;
}) {
  const identity = defaultIdentity(input.session);
  const resolutionScript = input.useResolutionErrorScript ? buildResolutionErrorScript() : null;
  const scripted = resolutionScript?.identity ?? identity;
  const canonicalScript = resolutionScript?.canonical;

  const expectedWorldStateHash = expectOk(
    computeExpectedWorldStateHash(input.session.runtimeState.worldState, sha256Provider),
  );

  return runBattleToCompletion(
    {
      expectedWorldStateHash,
      startBattleInput: {
        createBattleRequest: {
          simulationId: input.session.context.simulationId,
          worldDate: input.session.runtimeState.worldState.worldDate,
          battleKind: "official",
          initialRange: "contact",
          participantA: participantSource(input.session, input.personA),
          participantB: participantSource(input.session, input.personB),
          participantAActionSourceIdentity: scripted,
          participantBActionSourceIdentity: scripted,
          runRuleSnapshot: input.session.context.runRuleSnapshot,
        },
        worldRngState: input.session.runtimeState.worldRngState,
        matchIdGeneratorState: input.session.runtimeState.matchIdGeneratorState,
      },
      participantAActionsSource: input.useResolutionErrorScript
        ? { identity: scripted, canonicalScript: canonicalScript! }
        : { identity },
      participantBActionsSource: input.useResolutionErrorScript
        ? { identity: scripted, canonicalScript: canonicalScript! }
        : { identity },
      postProcessContext: postProcessContext(input.session, input.personA, input.personB),
    },
    sha256Provider,
  );
}

function mutableCommitPlan<T>(plan: T): T {
  return JSON.parse(toCanonicalJson(plan)) as T;
}

function recomputeCommitPlanHash<T extends { commitPlanHash: string }>(plan: T): string {
  const { commitPlanHash: _, ...withoutHash } = plan;
  void _;
  return expectOk(
    computeRunBattleCommitPlanHash(
      withoutHash as unknown as Parameters<typeof computeRunBattleCommitPlanHash>[0],
      sha256Provider,
    ),
  );
}

function findOfficialBattlePair(session: Sprint1RunSession): [PersonId, PersonId] {
  const eligible = session.runtimeState.worldState.persons.filter(
    (person) =>
      person.lifeStatus === "living" &&
      person.participationStatus === "active" &&
      person.careerStatus === "active_competitor" &&
      person.currentAge !== null &&
      person.currentAge >= 16 &&
      person.currentAge <= 41,
  );
  if (eligible.length < 2) {
    throw new Error("expected at least two official-battle-eligible persons");
  }
  return [eligible[0]!.personId, eligible[1]!.personId];
}

function prepareBattleSession(seed = 5150): {
  session: Sprint1RunSession;
  personA: PersonId;
  personB: PersonId;
} {
  let session = buildSession(seed);
  session = advanceWorldDateForBattle(session);
  const [personA, personB] = findOfficialBattlePair(session);
  session = normalizePersonForOfficialBattle(session, personA, 1);
  session = normalizePersonForOfficialBattle(session, personB, 2);
  session = ensureTechniqueAlpha(session, personA);
  session = ensureTechniqueAlpha(session, personB);
  return { session, personA, personB };
}

describe("commitRunBattlePlan", () => {
  it("completed commit path updates RNG, MatchId, events, and stores", () => {
    const { session, personA, personB } = prepareBattleSession(6001);
    const beforeRng = toCanonicalJson(session.runtimeState.worldRngState);
    const beforeMatchId = toCanonicalJson(session.runtimeState.matchIdGeneratorState);
    const beforeEvents = session.runtimeState.eventStream.length;
    const beforeAllocation = session.runtimeState.eventAllocationState.nextSequence;

    const run = runSessionBattle({ session, personA, personB });
    expect(run.kind).toBe("completed");
    if (run.kind !== "completed") {
      throw new Error(JSON.stringify(run));
    }

    const committed = expectOk(
      commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    );
    expect(toCanonicalJson(committed.runtimeState.worldRngState)).not.toBe(beforeRng);
    expect(toCanonicalJson(committed.runtimeState.matchIdGeneratorState)).not.toBe(beforeMatchId);
    expect(committed.runtimeState.eventStream.length).toBe(beforeEvents + 2);
    expect(committed.runtimeState.eventAllocationState.nextSequence).toBe(beforeAllocation + 2);
    expect(committed.runtimeState.battleResults).toHaveLength(1);
    expect(committed.runtimeState.battleResultWeekState.results).toHaveLength(1);
    expect(committed.runtimeState.battleResults[0]!.matchId).toBe(
      run.commitPlan.battleResult.matchId,
    );
    expect(committed.runtimeState.battleResults[0]!.detailedLog).toEqual(
      run.commitPlan.battleResult.detailedLog,
    );
    const appendedEvents = committed.runtimeState.eventStream.slice(beforeEvents);
    expect(appendedEvents.map((event) => event.eventType)).toEqual([
      "battle.started",
      "battle.finished",
    ]);
    expect(appendedEvents.map((event) => event.sequence)).toEqual([
      beforeAllocation,
      beforeAllocation + 1,
    ]);
    for (const event of appendedEvents) {
      expect(event.schemaVersion).toBe("0.2.0");
      expect(event.sourceProcessor).toBe("battle-simulation");
      expect(event.entities.matchIds).toEqual([run.commitPlan.battleResult.matchId]);
      expect(event.entities.personIds).toEqual([personA, personB].sort());
    }
    expect(
      countCompletedMatchesForPersonThisWorldWeek(
        committed.runtimeState.battleResultWeekState,
        personA,
      ),
    ).toBe(1);
  });

  it("resets only the weekly battle registry after a production committed battle", () => {
    const { session, personA, personB } = prepareBattleSession(6012);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const committed = expectOk(
      commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    );
    const advanced = expectOk(runSprint1WeeklyStep(committed, sha256Provider));

    expect(advanced.runtimeState.battleResults).toHaveLength(1);
    expect(advanced.runtimeState.battleResults[0]).toEqual(committed.runtimeState.battleResults[0]);
    expect(advanced.runtimeState.battleResultWeekState.results).toEqual([]);
    expect(advanced.runtimeState.battleResultWeekState.absoluteWeek).toBe(
      advanced.runtimeState.worldState.worldDate.absoluteWeek,
    );
  });

  it("resolution_error appends stores without person or sidecar changes and count stays +0", () => {
    const { session, personA, personB } = prepareBattleSession(6002);
    const beforePersonJson = toCanonicalJson(
      session.runtimeState.worldState.persons.find((person) => person.personId === personA),
    );
    const beforeSidecarJson = toCanonicalJson(
      session.runtimeState.weeklyTrainingSidecars.entries.find(
        (entry) => entry.personId === personA,
      ),
    );

    const run = runSessionBattle({
      session,
      personA,
      personB,
      useResolutionErrorScript: true,
    });
    expect(run.kind).toBe("resolution_error");
    if (run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }

    const committed = expectOk(
      commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    );
    expect(committed.runtimeState.battleResults).toHaveLength(1);
    expect(committed.runtimeState.battleResultWeekState.results).toHaveLength(1);
    expect(
      countCompletedMatchesForPersonThisWorldWeek(
        committed.runtimeState.battleResultWeekState,
        personA,
      ),
    ).toBe(0);
    expect(
      toCanonicalJson(
        committed.runtimeState.worldState.persons.find((person) => person.personId === personA),
      ),
    ).toBe(beforePersonJson);
    expect(
      toCanonicalJson(
        committed.runtimeState.weeklyTrainingSidecars.entries.find(
          (entry) => entry.personId === personA,
        ),
      ),
    ).toBe(beforeSidecarJson);
  });

  it("rejects duplicate matchId on double apply", () => {
    const { session, personA, personB } = prepareBattleSession(6003);
    const run = runSessionBattle({ session, personA, personB });
    expect(run.kind === "completed" || run.kind === "resolution_error").toBe(true);
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }

    const first = expectOk(
      commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    );
    const second = commitRunBattlePlan(
      { session: first, commitPlan: run.commitPlan },
      sha256Provider,
    );
    const firstSnapshot = toCanonicalJson(first);
    const firstRuntime = first.runtimeState;
    expect(second.ok).toBe(false);
    expect(toCanonicalJson(first)).toBe(firstSnapshot);
    expect(first.runtimeState).toBe(firstRuntime);
    expect(first.runtimeState.battleResults).toHaveLength(1);
    expect(first.runtimeState.eventAllocationState.nextSequence).toBe(
      session.runtimeState.eventAllocationState.nextSequence + 2,
    );
  });

  it("rejects tampered commitPlanHash", () => {
    const { session, personA, personB } = prepareBattleSession(6004);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const tampered = {
      ...run.commitPlan,
      commitPlanHash: "b".repeat(64),
    };
    const rejected = commitRunBattlePlan({ session, commitPlan: tampered }, sha256Provider);
    expect(rejected.ok).toBe(false);
    expect(session.runtimeState.battleResults).toHaveLength(0);
  });

  it("binds stored structuralValidation to recomputed structural validation", () => {
    const { session, personA, personB } = prepareBattleSession(6009);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const before = toCanonicalJson(session);

    const overallPassedFalse = mutableCommitPlan(run.commitPlan);
    overallPassedFalse.structuralValidation = {
      ...overallPassedFalse.structuralValidation,
      overallPassed: false,
    };
    const extraViolation = mutableCommitPlan(run.commitPlan);
    extraViolation.structuralValidation = {
      ...extraViolation.structuralValidation,
      violations: [
        ...extraViolation.structuralValidation.violations,
        {
          code: "injected",
          severity: "error",
          targetIds: [],
          reason: "injected structural violation",
          canContinue: false,
        },
      ],
    };
    const recomputedHashTamper = mutableCommitPlan(extraViolation);
    recomputedHashTamper.commitPlanHash = recomputeCommitPlanHash(recomputedHashTamper);

    for (const [label, plan] of [
      ["overallPassed false", overallPassedFalse],
      ["extra violation", extraViolation],
      ["extra violation with recomputed hash", recomputedHashTamper],
    ] as const) {
      const rejected = commitRunBattlePlan({ session, commitPlan: plan }, sha256Provider);
      expect(rejected.ok, label).toBe(false);
      expect(toCanonicalJson(session), label).toBe(before);
    }
  });

  it("rejects reordered or edited stored structural violations even with recomputed hashes", () => {
    const { session, personA, personB } = prepareBattleSession(6010);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const base = mutableCommitPlan(run.commitPlan);
    base.schemaVersion = "9.9.9" as typeof base.schemaVersion;
    base.simulationId = "tampered-simulation-id" as typeof base.simulationId;
    const { commitPlanHash: _, structuralValidation: __, ...structureMaterial } = base;
    void _;
    void __;
    const canonicalStructural = validateRunBattleCommitPlanStructure(structureMaterial);
    expect(canonicalStructural.violations.length).toBeGreaterThan(1);

    const reordered = {
      ...base,
      structuralValidation: {
        ...canonicalStructural,
        violations: [...canonicalStructural.violations].reverse(),
      },
    };
    reordered.commitPlanHash = recomputeCommitPlanHash(reordered);

    const fieldEdits = [
      {
        label: "violation code",
        edit: (violation: (typeof canonicalStructural.violations)[number]) => ({
          ...violation,
          code: `${violation.code}_tampered`,
        }),
      },
      {
        label: "violation reason",
        edit: (violation: (typeof canonicalStructural.violations)[number]) => ({
          ...violation,
          reason: `${violation.reason} tampered`,
        }),
      },
      {
        label: "violation targetIds",
        edit: (violation: (typeof canonicalStructural.violations)[number]) => ({
          ...violation,
          targetIds: ["tampered-target"],
        }),
      },
    ].map(({ label, edit }) => {
      const plan = {
        ...base,
        structuralValidation: {
          ...canonicalStructural,
          violations: canonicalStructural.violations.map((violation, index) =>
            index === 0 ? edit(violation) : violation,
          ),
        },
      };
      plan.commitPlanHash = recomputeCommitPlanHash(plan);
      return { label, plan };
    });

    for (const [label, plan] of [
      ["violation order", reordered],
      ...fieldEdits.map(({ label, plan }) => [label, plan] as const),
    ] as const) {
      const rejected = commitRunBattlePlan(
        { session, commitPlan: plan as typeof run.commitPlan },
        sha256Provider,
      );
      expect(rejected.ok, label).toBe(false);
      expect(session.runtimeState.battleResults, label).toHaveLength(0);
    }
  });

  it("rejects hostile commit-plan getters without invoking them", () => {
    const { session, personA, personB } = prepareBattleSession(6011);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }

    for (const path of [
      "commitPlanHash",
      "structuralValidation",
      "battleResult",
      "structuralValidation.overallPassed",
      "structuralValidation.violations",
    ] as const) {
      const hostile = mutableCommitPlan(run.commitPlan);
      let calls = 0;
      const [parentKey, propertyKey] = path.split(".") as [string, string?];
      const parent =
        propertyKey === undefined
          ? hostile
          : (hostile[parentKey as "structuralValidation"] as Record<string, unknown>);
      Object.defineProperty(parent, propertyKey ?? parentKey, {
        enumerable: true,
        get: () => {
          calls += 1;
          throw new Error(`hostile getter at ${path}`);
        },
      });

      const rejected = commitRunBattlePlan(
        { session, commitPlan: hostile as typeof run.commitPlan },
        sha256Provider,
      );
      expect(rejected.ok, path).toBe(false);
      expect(calls, path).toBe(0);
      expect(session.runtimeState.battleResults, path).toHaveLength(0);
    }
  });

  it("rejects every plan hash and structural tamper without changing the runtime root", () => {
    const { session, personA, personB } = prepareBattleSession(6007);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const original = toCanonicalJson(session);
    const runtimeRoot = session.runtimeState;
    const hash = "c".repeat(64);
    const plans = [
      {
        label: "runRuleSnapshotHash",
        plan: { ...run.commitPlan, runRuleSnapshotHash: hash },
      },
      {
        label: "expectedWorldStateHash",
        plan: { ...run.commitPlan, expectedWorldStateHash: hash },
      },
      {
        label: "participant source hash",
        plan: { ...run.commitPlan, expectedParticipantASourceSnapshotHash: hash },
      },
      {
        label: "MatchId expected hash",
        plan: {
          ...run.commitPlan,
          startRuntimeTransition: {
            ...run.commitPlan.startRuntimeTransition,
            expectedMatchIdGeneratorStateHash: hash,
          },
        },
      },
      {
        label: "commitPlanHash",
        plan: { ...run.commitPlan, commitPlanHash: hash },
      },
      {
        label: "structural schemaVersion",
        plan: { ...run.commitPlan, schemaVersion: "9.9.9" },
      },
      {
        label: "matchesCompleted",
        plan: {
          ...run.commitPlan,
          battleResult: {
            ...run.commitPlan.battleResult,
            postProcessContext: {
              ...run.commitPlan.battleResult.postProcessContext,
              participantA: {
                ...run.commitPlan.battleResult.postProcessContext.participantA,
                matchesCompletedThisWorldWeekBeforeBattle: 99,
              },
            },
          },
        },
      },
    ];

    for (const candidate of plans) {
      const rejected = commitRunBattlePlan(
        {
          session,
          commitPlan: candidate.plan as unknown as typeof run.commitPlan,
        },
        sha256Provider,
      );
      expect(rejected.ok, candidate.label).toBe(false);
      expect(toCanonicalJson(session), candidate.label).toBe(original);
      expect(session.runtimeState, candidate.label).toBe(runtimeRoot);
    }
  });

  it("rejects current participant sidecar tamper without advancing any root component", () => {
    const prepared = prepareBattleSession(6008);
    const run = runSessionBattle(prepared);
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }
    const tamperedSession = setSidecarTemporaryCondition(prepared.session, prepared.personA, {
      fatigue: 1,
    });
    const before = toCanonicalJson(tamperedSession);
    const runtimeRoot = tamperedSession.runtimeState;
    const rejected = commitRunBattlePlan(
      { session: tamperedSession, commitPlan: run.commitPlan },
      sha256Provider,
    );

    expect(rejected.ok).toBe(false);
    expect(toCanonicalJson(tamperedSession)).toBe(before);
    expect(tamperedSession.runtimeState).toBe(runtimeRoot);
    expect(tamperedSession.runtimeState.battleResults).toEqual([]);
  });

  it("clamps sidecar fatigue 90+15 to 100 on completed commit", () => {
    const prepared = prepareBattleSession(6005);
    let session = prepared.session;
    const { personA, personB } = prepared;
    session = setSidecarTemporaryCondition(session, personA, { fatigue: 90 });

    const run = runSessionBattle({ session, personA, personB });
    expect(run.kind).toBe("completed");
    if (run.kind !== "completed") {
      throw new Error(JSON.stringify(run));
    }

    const effects = run.commitPlan.battleResult.developmentEffects as Exclude<
      typeof run.commitPlan.battleResult.developmentEffects,
      readonly []
    >;
    const participantEffects =
      run.commitPlan.battleResult.participantAId === personA
        ? effects.participantA
        : effects.participantB;
    expect(participantEffects.persistentFatigueDelta).toBe(15);

    const committed = expectOk(
      commitRunBattlePlan({ session, commitPlan: run.commitPlan }, sha256Provider),
    );
    expect(sidecarFatigue(committed, personA)).toBe(100);
  });

  it("rebuilds participant sourceSnapshotHash from current world and sidecar", () => {
    const { session, personA, personB } = prepareBattleSession(6006);
    const run = runSessionBattle({ session, personA, personB });
    if (run.kind !== "completed" && run.kind !== "resolution_error") {
      throw new Error(JSON.stringify(run));
    }

    const context = {
      side: "sideA" as const,
      battleKind: "official" as const,
      worldDate: session.runtimeState.worldState.worldDate,
      config: session.context.sprint1Config,
      knownTechniqueIds: new Set(
        session.context.techniqueCatalog.definitions.map((definition) => definition.techniqueId),
      ),
    };
    const rebuilt = expectOk(
      validateBattleParticipant(participantSource(session, personA), context, sha256Provider),
    );
    expect(rebuilt.sourceSnapshotHash).toBe(run.commitPlan.expectedParticipantASourceSnapshotHash);
  });
});
