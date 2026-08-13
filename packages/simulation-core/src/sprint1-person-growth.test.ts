import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import {
  ABILITY_KEYS,
  GROWTH_PROFILES,
  INJURY_STAGES,
  SPRINT1_PERSON_STATE_KEYS,
  SPRINT1_PERSON_STATE_SCHEMA_VERSION,
  TEACHER_FACTOR_KEYS,
  attachSprint1PersonStateToInitialWorld,
  computeConfigHash,
  computeNameDataHash,
  createInitialSprint1PersonState,
  createInitialWorldDate,
  createSeededRng,
  createWorldEngineState,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  deriveInjuryStage,
  freezePersonTemporaryCondition,
  generateInitialWorld,
  getDefaultSprint1Config,
  isFormalTrainingEligible,
  isWeeklyStateUpdateEligible,
  runWorldWeeks,
  selectAgeGrowthFactor,
  selectCurrentValueGrowthFactor,
  selectDiscipleCountGrowthFactor,
  selectFatigueGrowthFactor,
  selectInjuryGrowthFactor,
  selectTeacherGrowthFactor,
  toCanonicalJson,
  validateInitialWorldConfig,
  validatePersonTemporaryCondition,
  validateSprint1PersonState,
  validateStatGrowthRemainder,
  validateStatGrowthRemainderCollection,
  validateWorldEngineState,
  type InitialWorldConfig,
  type InitialWorldSnapshot,
  type Person,
  type PersonTechniqueState,
  type Relationship,
  type Sprint1PersonState,
  type ValidationResult,
} from "./index.js";
import { asTechniqueId } from "./ids.js";
import { cloneBaselineConfig } from "./test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
} from "./test-fixtures/name-data-loader.fixture.js";

const sprint1Dir = join(fileURLToPath(new URL(".", import.meta.url)), "sprint1");
const sha256Provider = createNodeSha256Provider();
const config = getDefaultSprint1Config();

function expectOkValue<T>(result: ValidationResult<T>): T {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ValidationResult success");
  }
  return result.value;
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
    ...cloneBaselineConfig(),
    profileId: "tiny-s01-002-attach-v1",
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
      baseBirthRateRange: { min: 0.1, max: 0.1 },
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

function buildAttachWorld(seed = 3): InitialWorldSnapshot {
  const validated = validateInitialWorldConfig(createSmallConfig());
  if (!validated.ok) {
    throw new Error(JSON.stringify(validated.issues));
  }
  const nameData = createTinyNameData(10);
  const result = generateInitialWorld({
    config: validated.value,
    configHash: computeConfigHash(validated.value, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
  return structuredClone(result.snapshot);
}

function replacePerson(
  world: InitialWorldSnapshot,
  personId: string,
  next: Person,
): InitialWorldSnapshot {
  return {
    ...world,
    persons: world.persons.map((person) => (person.personId === personId ? next : person)),
  };
}

function firstLiving(world: InitialWorldSnapshot): Person & { lifeStatus: "living" } {
  const person = world.persons.find((entry) => entry.lifeStatus === "living");
  if (person === undefined || person.lifeStatus !== "living") {
    throw new Error("living person missing");
  }
  return person;
}

function techniqueState(
  id: string,
  overrides: Partial<PersonTechniqueState> = {},
): PersonTechniqueState {
  return {
    techniqueId: asTechniqueId(id),
    learningProgressTenths: 0,
    masteryHundredths: 0,
    successfulUseCount: 0,
    attemptedUseCount: 0,
    lastPracticedAbsoluteWeek: null,
    acquiredAbsoluteWeek: null,
    ...overrides,
  };
}

function remainderCollection(milli = 0) {
  return ABILITY_KEYS.map((stat) => ({ stat, milliPoints: milli }));
}

describe("S01-002 public API / types", () => {
  it("exports growth constants and Sprint1PersonState shape", () => {
    expect(GROWTH_PROFILES).toHaveLength(3);
    expect(INJURY_STAGES).toHaveLength(4);

    const initial = createInitialSprint1PersonState(50);
    expect(initial.ok).toBe(true);
    if (!initial.ok) {
      return;
    }
    expect(Object.keys(initial.value).sort()).toEqual([...SPRINT1_PERSON_STATE_KEYS].sort());
    expect(Object.keys(initial.value)).toHaveLength(4);

    expectTypeOf<Sprint1PersonState["currentMental"]>().toBeNumber();
    expectTypeOf<Sprint1PersonState["techniqueStates"]>().toEqualTypeOf<
      readonly PersonTechniqueState[]
    >();
    expectTypeOf<Sprint1PersonState["learningFocusTechniqueId"]>().toEqualTypeOf<ReturnType<
      typeof asTechniqueId
    > | null>();
  });

  it("exports attach adapter and hides internal helpers", async () => {
    const api = await import("./index.js");
    expect(typeof api.attachSprint1PersonStateToInitialWorld).toBe("function");
    expect("countNumericLeaves" in api).toBe(false);
    // `BattleState` joined with S01-005; `BattleResult` with S01-007.
    expect(
      Object.keys(api).filter((key) => /weeklyPlanner|learnTechniqueMutation/.test(key)),
    ).toEqual([]);
  });
});

describe("StatGrowthRemainder collection", () => {
  it("accepts all six keys and orders by ABILITY_KEYS even when input is reversed", () => {
    const reversed = [...ABILITY_KEYS].reverse().map((stat) => ({ stat, milliPoints: 100 }));
    const result = validateStatGrowthRemainderCollection(reversed);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.map((entry) => entry.stat)).toEqual([...ABILITY_KEYS]);
  });

  it("accepts milliPoints boundary 0 and 999", () => {
    expect(validateStatGrowthRemainder({ stat: "spirit", milliPoints: 0 }).ok).toBe(true);
    expect(validateStatGrowthRemainder({ stat: "spirit", milliPoints: 999 }).ok).toBe(true);
  });

  it("rejects invalid milliPoints and structural errors", () => {
    for (const bad of [-1, 1000, 0.5]) {
      expect(validateStatGrowthRemainder({ stat: "spirit", milliPoints: bad }).ok).toBe(false);
    }
    expect(validateStatGrowthRemainderCollection(remainderCollection().slice(0, 5)).ok).toBe(false);
    expect(
      validateStatGrowthRemainderCollection([
        { stat: "stamina", milliPoints: 0 },
        { stat: "stamina", milliPoints: 1 },
        ...remainderCollection().slice(2),
      ]).ok,
    ).toBe(false);

    const sparse: unknown[] = [];
    sparse[5] = { stat: "magic", milliPoints: 0 };
    expect(validateStatGrowthRemainderCollection(sparse).ok).toBe(false);

    const withExtra = remainderCollection();
    Object.defineProperty(withExtra, "extra", {
      value: 1,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(validateStatGrowthRemainderCollection(withExtra).ok).toBe(false);
  });
});

describe("PersonTemporaryCondition", () => {
  it("accepts boundary values and deep-freezes", () => {
    const input = { fatigue: 0, injury: 100, condition: -20, confidence: 20 };
    const validated = validatePersonTemporaryCondition(input);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      return;
    }
    expect(Object.isFrozen(validated.value)).toBe(true);
    const frozen = freezePersonTemporaryCondition(input);
    expect(frozen.ok).toBe(true);
  });

  it("rejects out-of-range and unknown keys", () => {
    expect(
      validatePersonTemporaryCondition({ fatigue: -1, injury: 0, condition: 0, confidence: 0 }).ok,
    ).toBe(false);
    expect(
      validatePersonTemporaryCondition({ fatigue: 0, injury: 101, condition: 0, confidence: 0 }).ok,
    ).toBe(false);
    expect(
      validatePersonTemporaryCondition({ fatigue: 0, injury: 0, condition: 21, confidence: 0 }).ok,
    ).toBe(false);
    expect(
      validatePersonTemporaryCondition({ fatigue: 0, injury: 0, condition: 0, confidence: -21 }).ok,
    ).toBe(false);
    expect(
      validatePersonTemporaryCondition({
        fatigue: 0,
        injury: 0,
        condition: 0,
        confidence: 0,
        extra: 1,
      }).ok,
    ).toBe(false);
  });
});

describe("Sprint1PersonState", () => {
  const ctx = { spiritSurfaceValue: 50 };

  it("createInitial sets currentMental to 50 + spirit", () => {
    const result = createInitialSprint1PersonState(50);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.currentMental).toBe(100);
    expect(result.value.techniqueStates).toEqual([]);
    expect(result.value.learningFocusTechniqueId).toBeNull();
  });

  it("rejects max+1, decimal currentMental, and unknown schema", () => {
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 101,
          techniqueStates: [],
          learningFocusTechniqueId: null,
        },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 99.5,
          techniqueStates: [],
          learningFocusTechniqueId: null,
        },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: "0.2.0",
          currentMental: 100,
          techniqueStates: [],
          learningFocusTechniqueId: null,
        },
        ctx,
      ).ok,
    ).toBe(false);
  });

  it("sorts techniqueStates and matches canonical JSON of pre-sorted input", () => {
    const reversed = [techniqueState("technique_zeta"), techniqueState("technique_alpha")];
    const sorted = [...reversed].sort((a, b) => a.techniqueId.localeCompare(b.techniqueId));
    const reversedResult = validateSprint1PersonState(
      {
        sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
        currentMental: 100,
        techniqueStates: reversed,
        learningFocusTechniqueId: null,
      },
      ctx,
    );
    const sortedResult = validateSprint1PersonState(
      {
        sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
        currentMental: 100,
        techniqueStates: sorted,
        learningFocusTechniqueId: null,
      },
      ctx,
    );
    expect(reversedResult.ok).toBe(true);
    expect(sortedResult.ok).toBe(true);
    if (!reversedResult.ok || !sortedResult.ok) {
      return;
    }
    expect(reversedResult.value.techniqueStates.map((t) => t.techniqueId)).toEqual([
      "technique_alpha",
      "technique_zeta",
    ]);
    expect(toCanonicalJson(reversedResult.value)).toBe(toCanonicalJson(sortedResult.value));
  });

  it("rejects duplicate TechniqueId and invalid learning focus", () => {
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 100,
          techniqueStates: [techniqueState("technique_a"), techniqueState("technique_a")],
          learningFocusTechniqueId: null,
        },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 100,
          techniqueStates: [],
          learningFocusTechniqueId: asTechniqueId("technique_missing"),
        },
        ctx,
      ).ok,
    ).toBe(false);
    expect(
      validateSprint1PersonState(
        {
          sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
          currentMental: 100,
          techniqueStates: [techniqueState("technique_a")],
          learningFocusTechniqueId: asTechniqueId("technique_a"),
        },
        ctx,
      ).ok,
    ).toBe(true);
  });

  it("does not invoke accessors and rejects revoked Proxy safely", () => {
    let getterCalls = 0;
    const withGetter: Record<string, unknown> = {
      sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      currentMental: 100,
      techniqueStates: [],
      learningFocusTechniqueId: null,
    };
    Object.defineProperty(withGetter, "currentMental", {
      enumerable: true,
      configurable: true,
      get() {
        getterCalls += 1;
        return 100;
      },
    });
    expect(validateSprint1PersonState(withGetter, ctx).ok).toBe(false);
    expect(getterCalls).toBe(0);

    const { proxy, revoke } = Proxy.revocable(
      {
        sprint1StateSchemaVersion: SPRINT1_PERSON_STATE_SCHEMA_VERSION,
        currentMental: 100,
        techniqueStates: [],
        learningFocusTechniqueId: null,
      },
      {},
    );
    revoke();
    expect(() => validateSprint1PersonState(proxy, ctx)).not.toThrow();
    expect(validateSprint1PersonState(proxy, ctx).ok).toBe(false);
  });
});

describe("growth factor selectors (default config)", () => {
  it("selects age bands for early/normal/late at every boundary", () => {
    const ages = [7, 8, 11, 12, 15, 16, 20, 21, 27, 28, 34, 35, 41, 42] as const;
    for (const profile of GROWTH_PROFILES) {
      const table = config.growth.ageFactorsByProfile[profile];
      const expectedByAge: Record<(typeof ages)[number], number> = {
        7: table.age0to7,
        8: table.age8to11,
        11: table.age8to11,
        12: table.age12to15,
        15: table.age12to15,
        16: table.age16to20,
        20: table.age16to20,
        21: table.age21to27,
        27: table.age21to27,
        28: table.age28to34,
        34: table.age28to34,
        35: table.age35to41,
        41: table.age35to41,
        42: table.age42plus,
      };
      for (const age of ages) {
        expect(expectOkValue(selectAgeGrowthFactor(profile, age, config))).toBe(expectedByAge[age]);
      }
    }
    expect(expectOkValue(selectAgeGrowthFactor("early", 41, config))).toBe(3500);
    expect(expectOkValue(selectAgeGrowthFactor("early", 42, config))).toBe(0);
  });

  it("selects current-value surface bands", () => {
    const factors = config.growth.currentValueFactors;
    expect(expectOkValue(selectCurrentValueGrowthFactor(39, config))).toBe(factors.value0to39);
    expect(expectOkValue(selectCurrentValueGrowthFactor(40, config))).toBe(factors.value40to59);
    expect(expectOkValue(selectCurrentValueGrowthFactor(59, config))).toBe(factors.value40to59);
    expect(expectOkValue(selectCurrentValueGrowthFactor(60, config))).toBe(factors.value60to74);
    expect(expectOkValue(selectCurrentValueGrowthFactor(74, config))).toBe(factors.value60to74);
    expect(expectOkValue(selectCurrentValueGrowthFactor(75, config))).toBe(factors.value75to89);
    expect(expectOkValue(selectCurrentValueGrowthFactor(89, config))).toBe(factors.value75to89);
    expect(expectOkValue(selectCurrentValueGrowthFactor(90, config))).toBe(factors.value90to100);
    expect(expectOkValue(selectCurrentValueGrowthFactor(100, config))).toBe(factors.value90to100);
  });

  it("selects disciple-count bands", () => {
    const factors = config.growth.discipleCountFactors;
    expect(expectOkValue(selectDiscipleCountGrowthFactor(1, config))).toBe(factors.count1to3);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(3, config))).toBe(factors.count1to3);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(4, config))).toBe(factors.count4to6);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(6, config))).toBe(factors.count4to6);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(7, config))).toBe(factors.count7to10);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(10, config))).toBe(factors.count7to10);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(11, config))).toBe(factors.count11to20);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(20, config))).toBe(factors.count11to20);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(21, config))).toBe(factors.count21to40);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(40, config))).toBe(factors.count21to40);
    expect(expectOkValue(selectDiscipleCountGrowthFactor(41, config))).toBe(factors.count41plus);
  });

  it("selects fatigue bands at every boundary", () => {
    const factors = config.growth.fatigueFactors;
    expect(expectOkValue(selectFatigueGrowthFactor(0, config))).toBe(factors.value0to20);
    expect(expectOkValue(selectFatigueGrowthFactor(20, config))).toBe(factors.value0to20);
    expect(expectOkValue(selectFatigueGrowthFactor(21, config))).toBe(factors.value21to40);
    expect(expectOkValue(selectFatigueGrowthFactor(40, config))).toBe(factors.value21to40);
    expect(expectOkValue(selectFatigueGrowthFactor(41, config))).toBe(factors.value41to60);
    expect(expectOkValue(selectFatigueGrowthFactor(60, config))).toBe(factors.value41to60);
    expect(expectOkValue(selectFatigueGrowthFactor(61, config))).toBe(factors.value61to80);
    expect(expectOkValue(selectFatigueGrowthFactor(80, config))).toBe(factors.value61to80);
    expect(expectOkValue(selectFatigueGrowthFactor(81, config))).toBe(factors.value81to100);
    expect(expectOkValue(selectFatigueGrowthFactor(100, config))).toBe(factors.value81to100);
  });

  it("derives injury stage and growth factor from config bands", () => {
    const cases: Array<[number, "none" | "light" | "medium" | "severe", number]> = [
      [0, "none", config.growth.injuryFactors.none0],
      [1, "light", config.growth.injuryFactors.light1to24],
      [24, "light", config.growth.injuryFactors.light1to24],
      [25, "medium", config.growth.injuryFactors.medium25to59],
      [59, "medium", config.growth.injuryFactors.medium25to59],
      [60, "severe", config.growth.injuryFactors.severe60to100],
      [100, "severe", config.growth.injuryFactors.severe60to100],
    ];
    for (const [injury, stageName, expectedBp] of cases) {
      const stage = deriveInjuryStage(injury, config);
      expect(stage.ok).toBe(true);
      if (!stage.ok) {
        continue;
      }
      expect(stage.value).toBe(stageName);
      expect(selectInjuryGrowthFactor(stage.value, config)).toBe(expectedBp);
    }
  });

  it("returns all five teacher factor keys", () => {
    expect(TEACHER_FACTOR_KEYS).toHaveLength(5);
    for (const key of TEACHER_FACTOR_KEYS) {
      expect(expectOkValue(selectTeacherGrowthFactor(key, config))).toBe(
        config.growth.teacherFactors[key],
      );
    }
  });
});

describe("weekly / formal training eligibility", () => {
  it("rejects deceased, waiting, and stopped for weekly updates", () => {
    expect(isWeeklyStateUpdateEligible({ lifeStatus: "deceased", careerStatus: "trainee" })).toBe(
      false,
    );
    expect(
      isWeeklyStateUpdateEligible({
        lifeStatus: "living",
        participationStatus: "waiting",
        careerStatus: "trainee",
      }),
    ).toBe(false);
    expect(
      isWeeklyStateUpdateEligible({
        lifeStatus: "living",
        participationStatus: "stopped",
        careerStatus: "trainee",
      }),
    ).toBe(false);
  });

  it("applies formal training age and career rules", () => {
    const activeTrainee = {
      lifeStatus: "living" as const,
      participationStatus: "active" as const,
      careerStatus: "trainee" as const,
    };
    expect(isFormalTrainingEligible({ ...activeTrainee, currentAge: 41 })).toBe(true);
    expect(isFormalTrainingEligible({ ...activeTrainee, currentAge: 42 })).toBe(false);
    expect(isFormalTrainingEligible({ ...activeTrainee, currentAge: 7 })).toBe(false);
    expect(
      isFormalTrainingEligible({
        lifeStatus: "living",
        participationStatus: "active",
        careerStatus: "retired",
        currentAge: 30,
      }),
    ).toBe(false);
  });
});

describe("attachSprint1PersonStateToInitialWorld", () => {
  let fixtureWorld: InitialWorldSnapshot;

  beforeAll(() => {
    fixtureWorld = buildAttachWorld();
  });

  function worldCopy(): InitialWorldSnapshot {
    return structuredClone(fixtureWorld);
  }

  it("attaches initial state to living active/waiting/stopped and deceased", () => {
    const world = worldCopy();
    const living = world.persons.filter((person) => person.lifeStatus === "living");
    expect(living.length).toBeGreaterThanOrEqual(3);
    const [active, waiting, stopped] = living;
    if (active === undefined || waiting === undefined || stopped === undefined) {
      throw new Error("need at least three living persons");
    }
    const withStatuses: InitialWorldSnapshot = {
      ...world,
      persons: world.persons.map((person) => {
        if (person.personId === waiting.personId && person.lifeStatus === "living") {
          return { ...person, participationStatus: "waiting" as const };
        }
        if (person.personId === stopped.personId && person.lifeStatus === "living") {
          return { ...person, participationStatus: "stopped" as const };
        }
        return person;
      }),
    };
    expect(withStatuses.persons.some((person) => person.lifeStatus === "deceased")).toBe(true);

    const result = attachSprint1PersonStateToInitialWorld(withStatuses);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.seed).toBe(withStatuses.seed);
    expect(result.value.rngAlgorithm).toBe(withStatuses.rngAlgorithm);
    for (const person of result.value.persons) {
      expect(person.sprint1State).toBeDefined();
      const spirit = person.abilities.spirit.surfaceValue;
      expect(person.sprint1State?.currentMental).toBe(50 + spirit);
      expect(person.sprint1State?.techniqueStates).toEqual([]);
      expect(person.sprint1State?.learningFocusTechniqueId).toBeNull();
      expect(person.sprint1State?.sprint1StateSchemaVersion).toBe(
        SPRINT1_PERSON_STATE_SCHEMA_VERSION,
      );
    }
  });

  it("does not mutate input, keeps PersonId, and rejects double attach", () => {
    const world = worldCopy();
    const inputClone = structuredClone(world);
    const first = attachSprint1PersonStateToInitialWorld(world);
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    expect(world).toEqual(inputClone);
    expect(world.persons.every((person) => person.sprint1State === undefined)).toBe(true);
    expect(first.value.persons.map((person) => person.personId)).toEqual(
      world.persons.map((person) => person.personId),
    );
    expect(attachSprint1PersonStateToInitialWorld(first.value).ok).toBe(false);
  });

  it("rejects wrong schemaVersion and runtime world keys", () => {
    const world = worldCopy();
    expect(attachSprint1PersonStateToInitialWorld({ ...world, schemaVersion: "0.2.0" }).ok).toBe(
      false,
    );
    expect(attachSprint1PersonStateToInitialWorld({ ...world, events: [] }).ok).toBe(false);
  });

  it("fails atomically when any person has invalid spirit and leaves input unchanged", () => {
    const world = worldCopy();
    const target = firstLiving(world);
    const mutated = replacePerson(world, target.personId, {
      ...target,
      abilities: {
        ...target.abilities,
        spirit: {
          ...target.abilities.spirit,
          surfaceValue: 101,
        },
      },
    });
    const before = structuredClone(mutated);
    const result = attachSprint1PersonStateToInitialWorld(mutated);
    expect(result.ok).toBe(false);
    expect(mutated).toEqual(before);
  });

  it("is deterministic for identical input", () => {
    const world = worldCopy();
    const a = attachSprint1PersonStateToInitialWorld(structuredClone(world));
    const b = attachSprint1PersonStateToInitialWorld(structuredClone(world));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) {
      return;
    }
    expect(toCanonicalJson(a.value.persons.map((person) => person.sprint1State))).toBe(
      toCanonicalJson(b.value.persons.map((person) => person.sprint1State)),
    );
  });

  it("rejects missing Person required fields and invalid careerStatus", () => {
    const world = worldCopy();
    const living = firstLiving(world);

    const withoutSex = { ...living } as Record<string, unknown>;
    delete withoutSex.sex;
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, withoutSex as Person),
      ).ok,
    ).toBe(false);

    const withoutFamilyId = { ...living } as Record<string, unknown>;
    delete withoutFamilyId.familyId;
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, withoutFamilyId as Person),
      ).ok,
    ).toBe(false);

    const withoutAptitudes = { ...living } as Record<string, unknown>;
    delete withoutAptitudes.aptitudes;
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, withoutAptitudes as Person),
      ).ok,
    ).toBe(false);

    const withoutParticipation = { ...living } as Record<string, unknown>;
    delete withoutParticipation.participationStatus;
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, withoutParticipation as Person),
      ).ok,
    ).toBe(false);

    const withoutAge = { ...living } as Record<string, unknown>;
    delete withoutAge.currentAge;
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, withoutAge as Person),
      ).ok,
    ).toBe(false);

    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, {
          ...living,
          careerStatus: "not-a-career",
        } as unknown as Person),
      ).ok,
    ).toBe(false);
  });

  it("rejects out-of-range ability and aptitude values", () => {
    const world = worldCopy();
    const living = firstLiving(world);
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, {
          ...living,
          abilities: {
            ...living.abilities,
            stamina: { ...living.abilities.stamina, surfaceValue: 101 },
          },
        }),
      ).ok,
    ).toBe(false);
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, {
          ...living,
          aptitudes: {
            ...living.aptitudes,
            magic: { ...living.aptitudes.magic, latentGeneticValue: -1 },
          },
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects unknown keys, symbol keys, and class instance persons", () => {
    const world = worldCopy();
    const living = firstLiving(world);

    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, {
          ...living,
          extraField: true,
        } as unknown as Person),
      ).ok,
    ).toBe(false);

    const withSymbol = { ...living } as Person;
    Object.defineProperty(withSymbol, Symbol("hostile"), {
      value: 1,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    expect(
      attachSprint1PersonStateToInitialWorld(replacePerson(world, living.personId, withSymbol)).ok,
    ).toBe(false);

    class PersonClass {
      constructor(source: Person) {
        Object.assign(this, source);
      }
    }
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, new PersonClass(living) as unknown as Person),
      ).ok,
    ).toBe(false);
  });

  it("does not execute hostile getters on Person.abilities or abilities.spirit", () => {
    const world = worldCopy();
    const living = firstLiving(world);

    let abilityGetterCalls = 0;
    const abilitiesGetterPerson = { ...living } as Person;
    Object.defineProperty(abilitiesGetterPerson, "abilities", {
      enumerable: true,
      configurable: true,
      get() {
        abilityGetterCalls += 1;
        return living.abilities;
      },
    });
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, abilitiesGetterPerson),
      ).ok,
    ).toBe(false);
    expect(abilityGetterCalls).toBe(0);

    let spiritGetterCalls = 0;
    const spiritGetterPerson = {
      ...living,
      abilities: { ...living.abilities },
    } as Person;
    Object.defineProperty(spiritGetterPerson.abilities, "spirit", {
      enumerable: true,
      configurable: true,
      get() {
        spiritGetterCalls += 1;
        return living.abilities.spirit;
      },
    });
    expect(
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, spiritGetterPerson),
      ).ok,
    ).toBe(false);
    expect(spiritGetterCalls).toBe(0);
  });

  it("converts revoked Person Proxy to failure without external throw", () => {
    const world = worldCopy();
    const living = firstLiving(world);
    const { proxy, revoke } = Proxy.revocable({ ...living }, {});
    revoke();
    expect(() =>
      attachSprint1PersonStateToInitialWorld(
        replacePerson(world, living.personId, proxy as Person),
      ),
    ).not.toThrow();
    expect(
      attachSprint1PersonStateToInitialWorld(replacePerson(world, living.personId, proxy as Person))
        .ok,
    ).toBe(false);
  });

  it("rejects invalid configHash, worldDate, and broken relationship references", () => {
    const world = worldCopy();
    expect(attachSprint1PersonStateToInitialWorld({ ...world, configHash: "not-a-hash" }).ok).toBe(
      false,
    );
    expect(
      attachSprint1PersonStateToInitialWorld({
        ...world,
        worldDate: { year: 1, month: 1, day: 1 } as unknown as InitialWorldSnapshot["worldDate"],
      }).ok,
    ).toBe(false);

    const relationship = world.relationships[0];
    if (relationship === undefined) {
      throw new Error("relationship missing in fixture");
    }
    const broken: Relationship = structuredClone(relationship);
    if (broken.kind === "parent_child") {
      (broken as { parentId: string }).parentId = "person_999999";
    } else if (broken.kind === "marriage") {
      (broken as { personAId: string }).personAId = "person_999999";
    } else {
      (broken as { masterId: string }).masterId = "person_999999";
    }
    const brokenWorld: InitialWorldSnapshot = {
      ...world,
      relationships: world.relationships.map((entry, index) => (index === 0 ? broken : entry)),
    };
    expect(attachSprint1PersonStateToInitialWorld(brokenWorld).ok).toBe(false);
  });

  it("accepts only fresh initial date and rejects valid mid-run worlds", () => {
    const world = worldCopy();
    expect(world.worldDate).toEqual(createInitialWorldDate(DEFAULT_WORLD_CALENDAR_CONFIG));
    expect(attachSprint1PersonStateToInitialWorld(world).ok).toBe(true);

    const engineState = createWorldEngineState(world);
    const week2 = runWorldWeeks({
      state: engineState,
      processors: [],
      weeks: 1,
      startSequence: 1,
    }).state;
    expect(week2.worldDate).toEqual({ year: 1, month: 1, weekOfMonth: 2, absoluteWeek: 1 });
    expect(() => validateWorldEngineState(week2)).not.toThrow();
    const week2Reject = attachSprint1PersonStateToInitialWorld(week2);
    expect(week2Reject.ok).toBe(false);
    if (!week2Reject.ok) {
      expect(week2Reject.issues.some((issue) => issue.path.startsWith("/worldDate/"))).toBe(true);
    }

    const month5 = runWorldWeeks({
      state: engineState,
      processors: [],
      weeks: 4,
      startSequence: 1,
    }).state;
    expect(month5.worldDate).toEqual({ year: 1, month: 2, weekOfMonth: 1, absoluteWeek: 4 });
    expect(() => validateWorldEngineState(month5)).not.toThrow();
    expect(attachSprint1PersonStateToInitialWorld(month5).ok).toBe(false);

    const year2 = runWorldWeeks({
      state: engineState,
      processors: [],
      weeks: 48,
      startSequence: 1,
    }).state;
    expect(year2.worldDate).toEqual({ year: 2, month: 1, weekOfMonth: 1, absoluteWeek: 48 });
    expect(() => validateWorldEngineState(year2)).not.toThrow();
    expect(attachSprint1PersonStateToInitialWorld(year2).ok).toBe(false);

    // Adapter must not rewind dates or rewrite identity when rejecting mid-run worlds.
    expect(week2.worldDate.absoluteWeek).toBe(1);
    expect(week2.simulationId).toBe(world.simulationId);
    expect(week2.persons.map((person) => person.personId)).toEqual(
      world.persons.map((person) => person.personId),
    );
  }, 60_000);
});

describe("S01-002 sprint1 modules avoid Math.random", () => {
  const targetFiles = [
    "attach-sprint1-person-state.ts",
    "growth-factor-selectors.ts",
    "growth-profile.ts",
    "injury-stage.ts",
    "max-mental.ts",
    "person-temporary-condition.ts",
    "sprint1-person-state.ts",
    "stat-growth-remainder.ts",
    "weekly-update-eligibility.ts",
  ];

  it("source files do not reference Math.random", () => {
    for (const file of targetFiles) {
      const source = readFileSync(join(sprint1Dir, file), "utf8");
      expect(source.includes("Math.random")).toBe(false);
    }
    const allTs = readdirSync(sprint1Dir).filter((name) => name.endsWith(".ts"));
    for (const file of allTs) {
      if (!targetFiles.includes(file)) {
        continue;
      }
      expect(readFileSync(join(sprint1Dir, file), "utf8").includes("Math.random")).toBe(false);
    }
  });
});
