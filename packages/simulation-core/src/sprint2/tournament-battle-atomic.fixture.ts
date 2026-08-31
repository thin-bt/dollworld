/**
 * Shared test fixture for S02-005/S02-006 tournament battle handoff and atomic adapter tests.
 */
import {
  ABILITY_KEYS,
  computeConfigHash,
  computeNameDataHash,
  computeTechniqueCatalogHash,
  createDefaultSprint1ConfigInput,
  createDefaultStrategyActionSourceIdentity,
  createSeededRng,
  createSprint1RunSession,
  createWorldDate,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  generateInitialWorld,
  INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
  SPRINT1_CLI_INPUT_SCHEMA_VERSION,
  validateInitialWorldConfig,
  validateTechniqueDefinition,
  WEEKLY_SCORED_ACTIONS,
  type Person,
  type PersonId,
  type Sprint1RunSession,
  type ValidationResult,
} from "../index.js";
import { cloneBaselineConfig } from "../test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "../test-fixtures/name-data-loader.fixture.js";
import { withDefaultSprint2BindingsForRunSessionInput } from "../test-fixtures/sprint2-identity.fixture.js";
import { asPersonId } from "../ids.js";
import { createDefaultSprint2ConfigInput } from "./sprint2-config-defaults.js";
import {
  commitSchedulePlan,
} from "./tournament-schedule-state.js";
import { buildTournamentScheduleReadModel } from "./tournament-schedule-read-model.js";
import { createInitialTournamentIdGeneratorState } from "./tournament-id-registry.js";
import type { EntrantCandidateFacts, Sprint2Config } from "./types.js";
import {
  buildPlannedParticipantList,
  computeParticipantListHash,
  computeScheduleLifecycleIdentity,
  createNeutralEntryChoicePolicy,
} from "./tournament-entry-selection.js";
import type { InjectedStructuralPolicyInput } from "./tournament-bracket-policy.js";
import {
  buildStructuralBracketDefinition,
} from "./tournament-bracket-definition.js";

export const tournamentBattleFixtureProvider = createNodeSha256Provider();
const provider = tournamentBattleFixtureProvider;
const simulationId = "simulation_0000000000000001";
const runSeed = 42;

export function tournamentBattleExpectOk<T>(result: ValidationResult<T>): T {
  if (!result.ok) {
    throw new Error(`expected success: ${JSON.stringify(result.issues)}`);
  }
  return result.value;
}

function tinyScheduleConfig(): Sprint2Config {
  const base = createDefaultSprint2ConfigInput();
  return {
    ...base,
    configVersion: "sprint2-handoff-test",
    schedule: {
      normalMonthOffsetsByRank: { F: [0], E: [0], D: [0], C: [0], B: [0] },
      openMonthOffsets: [],
      limitedMonthOffsets: { unarmed: [], sword: [], magic: [] },
      promotionMonthOffsets: [],
      weekByKind: { normal: 1, open: 1, limited: 2, promotion: 3 },
    },
  };
}

function commitTinySchedule() {
  const config = tinyScheduleConfig();
  const initial = createInitialTournamentIdGeneratorState();
  if (!initial.ok) {
    throw new Error("generator init failed");
  }
  const committed = commitSchedulePlan(config, DEFAULT_WORLD_CALENDAR_CONFIG, 1, initial.value);
  if (committed.kind !== "success") {
    throw new Error("schedule commit failed");
  }
  return { schedule: buildTournamentScheduleReadModel(committed.scheduleState), config };
}

function activeCompetitor(
  overrides: Partial<EntrantCandidateFacts> & Pick<EntrantCandidateFacts, "personId">,
): EntrantCandidateFacts {
  return {
    currentAge: 20,
    lifeStatus: "living",
    participationStatus: "active",
    careerStatus: "active_competitor",
    currentRank: "F",
    ...overrides,
  };
}

export function tournamentBattleBasePolicy(
  overrides?: Partial<InjectedStructuralPolicyInput>,
): InjectedStructuralPolicyInput {
  return {
    formatSelection: {
      formatKind: "round_robin",
      policyIdentity: {
        policyVersion: "format-selection-test-0.1.0",
        configVersion: "format-selection-config-a",
      },
    },
    knockoutSeedByePolicyIdentity: {
      policyVersion: "knockout-seed-bye-test-0.1.0",
      configVersion: "knockout-seed-bye-config-a",
    },
    standingsTieBreakPolicyIdentity: {
      policyVersion: "standings-tie-break-test-0.1.0",
      configVersion: "standings-tie-break-config-a",
    },
    ...overrides,
  };
}

export function buildTournamentBattleParticipantFixture(
  personIds: string[] = ["person_a", "person_b", "person_c"],
) {
  const { schedule, config } = commitTinySchedule();
  const tournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F")!;
  const policy = createNeutralEntryChoicePolicy(config);
  const facts = new Map(
    personIds.map((id) => [asPersonId(id), activeCompetitor({ personId: asPersonId(id), currentRank: "F" })]),
  );
  const list = buildPlannedParticipantList({
    tournamentId: tournament.tournamentId,
    scheduleEntries: schedule,
    candidateFactsByPersonId: facts,
    policy,
    config,
    simulationId,
    runSeed,
    provider,
  });
  if (!list.ok || list.value === null) {
    throw new Error("participant list build failed");
  }
  const lifecycle = computeScheduleLifecycleIdentity(tournament, provider);
  if (!lifecycle.ok) {
    throw new Error("lifecycle identity failed");
  }
  return {
    tournament,
    list: list.value,
    lifecycle: lifecycle.value,
    policy,
    config,
    schedule,
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

export function buildTournamentBattleSession(seed = 6002): Sprint1RunSession {
  const config = tournamentBattleExpectOk(
    validateInitialWorldConfig({
      ...cloneBaselineConfig(),
      profileId: "tiny-s02-battle-fixture-v1",
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
    }),
  );
  const nameData = createTinyNameData(config.families.initialFamilyCount);
  const generated = generateInitialWorld({
    config,
    configHash: computeConfigHash(config, provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, provider),
    rngFactory: createSeededRng,
    sha256Provider: provider,
  });
  const personIds = generated.snapshot.persons.map((person) => person.personId);
  const def = tournamentBattleExpectOk(validateTechniqueDefinition(techniqueDefinition("technique_alpha")));
  const catalogHash = tournamentBattleExpectOk(computeTechniqueCatalogHash([def], provider));
  const created = tournamentBattleExpectOk(
    createSprint1RunSession(
      withDefaultSprint2BindingsForRunSessionInput(
        {
          seed,
          config,
          nameData,
          sprint1CliInput: {
            schemaVersion: SPRINT1_CLI_INPUT_SCHEMA_VERSION,
            sprint1Config: createDefaultSprint1ConfigInput(),
            techniqueCatalog: {
              identity: { dataVersion: "techniques-0.1.0", catalogHash },
              definitions: [def],
            },
            initialWeeklyTrainingSidecar: {
              schemaVersion: INITIAL_WEEKLY_TRAINING_SIDECAR_SNAPSHOT_SCHEMA_VERSION,
              entries: personIds
                .slice()
                .sort((a, b) => a.localeCompare(b))
                .map((personId) => sidecarEntry(personId)),
            },
          },
        },
        provider,
      ),
      provider,
      { generateInitialWorld: () => generated },
    ),
  );
  return created.session;
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
    const { retirementRank: _, ...withoutRetirement } = base as Person & { retirementRank?: string };
    void _;
    return {
      ...withoutRetirement,
      careerStatus: "active_competitor",
      currentRank: person.careerStatus === "active_competitor" ? person.currentRank : "C",
      highestRank: person.careerStatus === "active_competitor" ? person.highestRank : "B",
      qualifiedMaster: false,
    } as Person;
  }
  return base as Person;
}

function advanceWorldDateForBattle(session: Sprint1RunSession): Sprint1RunSession {
  const worldDate = createWorldDate(
    { year: 21, month: 4, weekOfMonth: 1 },
    DEFAULT_WORLD_CALENDAR_CONFIG,
  );
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
  const persons = session.runtimeState.worldState.persons.map((person) => {
    if (person.personId !== personId) {
      return person;
    }
    const currentAge = session.runtimeState.worldState.worldDate.year - birthYear;
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

export function prepareTournamentBattleSession(seed = 6001): {
  session: Sprint1RunSession;
  personA: PersonId;
  personB: PersonId;
} {
  let session = buildTournamentBattleSession(seed);
  session = advanceWorldDateForBattle(session);
  const [personA, personB] = findOfficialBattlePair(session);
  session = normalizePersonForOfficialBattle(session, personA, 1);
  session = normalizePersonForOfficialBattle(session, personB, 2);
  session = ensureTechniqueAlpha(session, personA);
  session = ensureTechniqueAlpha(session, personB);
  return { session, personA, personB };
}

export function buildRoundRobinBracketForPersons(personA: PersonId, personB: PersonId) {
  const fixture = buildTournamentBattleParticipantFixture([personA, personB]);
  const participantListHash = tournamentBattleExpectOk(
    computeParticipantListHash(
      {
        tournamentId: fixture.tournament.tournamentId,
        scheduleLifecycleIdentityHash: fixture.lifecycle.identityHash,
        selectedPersonIds: [personA, personB],
        policyIdentity: fixture.policy.identity,
      },
      provider,
    ),
  );
  const built = buildStructuralBracketDefinition(
    {
      tournamentId: fixture.tournament.tournamentId,
      orderedPersonIds: [personA, personB],
      participantListHash,
      scheduleLifecycleIdentity: fixture.lifecycle,
      entryChoicePolicyIdentity: fixture.policy.identity,
      policy: tournamentBattleBasePolicy(),
    },
    provider,
  );
  if (!built.ok) {
    throw new Error("bracket build failed");
  }
  return { ...fixture, built: built.value };
}

export function defaultTournamentBattleActionIdentity(session: Sprint1RunSession) {
  return tournamentBattleExpectOk(
    createDefaultStrategyActionSourceIdentity({
      strategyVersion: session.context.runRuleSnapshot.defaultBattleStrategyVersion,
      strategyConfigHash: session.context.runRuleSnapshot.sprint1ConfigHash,
    }),
  );
}

export function defaultCompetitionRuleHash(session: Sprint1RunSession): string {
  return session.context.simulationIdentity.competitionDomainRegistryHash;
}
