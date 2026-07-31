import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  generateInitialWorld,
  InitialWorldGenerationError,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateNameData,
  type InitialWorldConfig,
  type SeededRng,
  type SeededRngFactory,
} from "../index.js";
import {
  baselineConfigFixture,
  cloneBaselineConfig,
} from "../test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
  loadBaselineNameData,
} from "../test-fixtures/name-data-loader.fixture.js";
import { allocateByLargestRemainderOrdered, expandAllocationToList } from "./largest-remainder.js";
import { buildSimulationIdMaterial, createSimulationId } from "./simulation-id.js";
import { formatPersonId, formatRelationshipId } from "./ids.js";

const moduleUrl = import.meta.url;
const sha256Provider = createNodeSha256Provider();

function buildBaselineInput(seed: number) {
  const config = cloneBaselineConfig();
  const validated = validateInitialWorldConfig(config);
  if (!validated.ok) {
    throw new Error(JSON.stringify(validated.issues));
  }
  const nameData = loadBaselineNameData(moduleUrl);
  return {
    config: validated.value,
    configHash: computeConfigHash(validated.value, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  };
}

function buildInputFromConfig(
  config: InitialWorldConfig,
  seed: number,
  nameData = createTinyNameData(Math.max(10, config.families.initialFamilyCount)),
) {
  const validated = validateInitialWorldConfig(config);
  if (!validated.ok) {
    throw new Error(JSON.stringify(validated.issues));
  }
  return {
    config: validated.value,
    configHash: computeConfigHash(validated.value, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  };
}

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  const config: InitialWorldConfig = {
    ...cloneBaselineConfig(),
    profileId: "tiny-test-v1",
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
  return config;
}

describe("allocateByLargestRemainderOrdered", () => {
  it("distributes 24 items by float weights deterministically", () => {
    const allocation = allocateByLargestRemainderOrdered(
      { unarmed: 0.34, sword: 0.33, magic: 0.33 },
      24,
      ["unarmed", "sword", "magic"],
    );
    expect(allocation.unarmed + allocation.sword + allocation.magic).toBe(24);
    expect(allocation.unarmed).toBeGreaterThanOrEqual(allocation.sword);
  });

  it("expandAllocationToList preserves total count", () => {
    const allocation = { a: 2, b: 1, c: 0 };
    expect(expandAllocationToList(allocation, ["a", "b", "c"]).length).toBe(3);
  });
});

describe("simulationId", () => {
  it("builds material in fixed order", () => {
    expect(buildSimulationIdMaterial("abc", 12345, "def")).toBe(
      "SPEC-0.1.1|S0-SPEC-0.1.5|abc|12345|def|xoshiro128ss-v1",
    );
  });

  it("creates simulation_<16hex>", () => {
    const id = createSimulationId("abc", 12345, "def", sha256Provider);
    expect(id).toMatch(/^simulation_[0-9a-f]{16}$/);
  });
});

describe("format ids", () => {
  it("zero-pads entity ids", () => {
    expect(formatPersonId(1)).toBe("person_000001");
    expect(formatRelationshipId(42)).toBe("relationship_000042");
  });
});

describe("generateInitialWorld baseline integration", () => {
  it("generates 600 living, 200 deceased, 100 families, 24 lineages, 45 qualified masters", () => {
    const result = generateInitialWorld(buildBaselineInput(12345));
    const { snapshot } = result;

    expect(snapshot.persons.filter((p) => p.lifeStatus === "living")).toHaveLength(600);
    expect(snapshot.persons.filter((p) => p.lifeStatus === "deceased")).toHaveLength(200);
    expect(snapshot.families).toHaveLength(100);
    expect(snapshot.lineages).toHaveLength(24);
    expect(
      snapshot.persons.filter(
        (p) => p.lifeStatus === "living" && p.careerStatus === "retired" && p.qualifiedMaster,
      ),
    ).toHaveLength(45);

    expect(snapshot.generationSummary.brokenReferenceCount).toBe(0);
    expect(snapshot.generationSummary.selfReferenceCount).toBe(0);
    expect(snapshot.generationSummary.parentCycleCount).toBe(0);
    expect(snapshot.generationSummary.masterCycleCount).toBe(0);
    expect(result.validationSummary.passed).toBe(true);

    for (const family of snapshot.families) {
      const livingCount = snapshot.persons.filter(
        (p) => p.familyId === family.familyId && p.lifeStatus === "living",
      ).length;
      expect(livingCount).toBeGreaterThanOrEqual(1);
      expect(family.status).toBe("active");
    }

    const familyNames = snapshot.families.map((f) => f.familyName);
    expect(new Set(familyNames).size).toBe(100);

    expect(result.initialEvents[0]?.eventType).toBe("world.started");
    expect(result.initialEvents[0]?.importance).toBe("historic");
    expect(result.initialEvents[0]?.sourceProcessor).toBe("initial-world-generation");
    expect(result.initialEvents[0]?.payload).toEqual({ worldId: "world_000001" });
    expect(result.initialEvents.some((e) => e.eventType === "world.year_started")).toBe(false);
  });

  it("matches baseline age bands, active ranks, marriages, ids, and lineage names", () => {
    const result = generateInitialWorld(buildBaselineInput(12345));
    const { snapshot } = result;
    const living = snapshot.persons.filter((p) => p.lifeStatus === "living");

    expect(living.filter((p) => p.currentAge >= 0 && p.currentAge <= 7)).toHaveLength(80);
    expect(living.filter((p) => p.currentAge >= 8 && p.currentAge <= 15)).toHaveLength(120);
    expect(living.filter((p) => p.currentAge >= 16 && p.currentAge <= 41)).toHaveLength(220);
    expect(living.filter((p) => p.currentAge >= 42 && p.currentAge <= 70)).toHaveLength(180);

    const activeRanks = { F: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
    for (const person of living.filter((p) => p.careerStatus === "active_competitor")) {
      if (person.careerStatus === "active_competitor") {
        activeRanks[person.currentRank] += 1;
      }
    }
    expect(activeRanks).toEqual({ F: 70, E: 55, D: 40, C: 30, B: 15, A: 8, S: 2 });

    expect(snapshot.relationships.filter((r) => r.kind === "marriage")).toHaveLength(40);

    const deceased = snapshot.persons.filter((p) => p.lifeStatus === "deceased");
    expect(deceased.map((p) => p.personId)).toEqual(
      Array.from({ length: 200 }, (_, i) => formatPersonId(i + 1)),
    );
    expect(living.map((p) => p.personId)).toEqual(
      Array.from({ length: 600 }, (_, i) => formatPersonId(i + 201)),
    );

    expect(snapshot.worldId).toBe("world_000001");
    expect(new Set(snapshot.lineages.map((l) => l.lineageName)).size).toBe(24);

    for (const person of snapshot.persons) {
      expect(Object.hasOwn(person, "birthWeek")).toBe(false);
      expect(Object.hasOwn(person, "birthWeekOfApril")).toBe(false);
    }
  });

  it("reports correct generationSummary targets for baseline", () => {
    const { snapshot } = generateInitialWorld(buildBaselineInput(12345));
    const summary = snapshot.generationSummary;

    expect(summary.careerStatus.child.target).toBe(80);
    expect(summary.careerStatus.trainee.target).toBe(120);
    expect(summary.careerStatus.active_competitor.target).toBe(220);
    expect(summary.careerStatus.retired.target).toBe(380);

    expect(summary.retiredRanks.F.target).toBe(57);
    expect(summary.retiredRanks.E.target).toBe(45);
    expect(summary.retiredRanks.D.target).toBe(33);
    expect(summary.retiredRanks.C.target).toBe(25);
    expect(summary.retiredRanks.B.target).toBe(12);
    expect(summary.retiredRanks.A.target).toBe(6);
    expect(summary.retiredRanks.S.target).toBe(2);

    expect(summary.parentRelationships.target).toBe(672);
    expect(summary.knownParentPeople.target).toBe(420);
    expect(summary.twoKnownParentPeople.target).toBe(252);
    expect(summary.knownParentCoverage.target).toBe(0.7);
    expect(summary.twoKnownParentsAmongCovered.target).toBe(0.6);
    expect(summary.formalMasterCoverage.target).toBe(0.65);

    expect(summary.knownParentCoverage.actual).toBeGreaterThanOrEqual(0);
    expect(summary.knownParentCoverage.actual).toBeLessThanOrEqual(1);
    expect(summary.twoKnownParentsAmongCovered.actual).toBeGreaterThanOrEqual(0);
    expect(summary.twoKnownParentsAmongCovered.actual).toBeLessThanOrEqual(1);
    expect(summary.formalMasterCoverage.actual).toBeGreaterThanOrEqual(0);
    expect(summary.formalMasterCoverage.actual).toBeLessThanOrEqual(1);
  });

  it("is reproducible for the same seed", () => {
    const a = generateInitialWorld(buildBaselineInput(99991));
    const b = generateInitialWorld(buildBaselineInput(99991));
    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.initialEvents).toEqual(b.initialEvents);
    expect(JSON.stringify(a.snapshot)).toBe(JSON.stringify(b.snapshot));
  });

  it("differs for different seeds", () => {
    const a = generateInitialWorld(buildBaselineInput(111));
    const b = generateInitialWorld(buildBaselineInput(222));
    expect(a.snapshot.persons).not.toEqual(b.snapshot.persons);
  });

  it("keeps simulationId stable for same seed and changes with seed or hash", () => {
    const a = generateInitialWorld(buildBaselineInput(555));
    const b = generateInitialWorld(buildBaselineInput(555));
    expect(a.snapshot.simulationId).toBe(b.snapshot.simulationId);

    const differentSeed = generateInitialWorld(buildBaselineInput(556));
    expect(differentSeed.snapshot.simulationId).not.toBe(a.snapshot.simulationId);

    const idSame = createSimulationId("hash-a", 555, "name-a", sha256Provider);
    const idDifferentHash = createSimulationId("hash-b", 555, "name-a", sha256Provider);
    expect(idDifferentHash).not.toBe(idSame);
  });

  it("does not mutate input config or nameData arrays", () => {
    const input = buildBaselineInput(321);
    const configBefore = structuredClone(input.config);
    const nameDataBefore = structuredClone(input.nameData);

    generateInitialWorld(input);

    expect(input.config).toEqual(configBefore);
    expect(input.nameData).toEqual(nameDataBefore);
    expect(JSON.stringify(input.config)).toBe(JSON.stringify(configBefore));
    expect(JSON.stringify(input.nameData)).toBe(JSON.stringify(nameDataBefore));
  });

  it("assigns relationship ids in fixed kind order", () => {
    const { snapshot } = generateInitialWorld(buildBaselineInput(54321));
    const rels = snapshot.relationships;
    const firstParentIdx = rels.findIndex((r) => r.kind === "parent_child");
    const firstMarriageIdx = rels.findIndex((r) => r.kind === "marriage");
    const firstMasterIdx = rels.findIndex((r) => r.kind === "master_disciple");
    expect(firstParentIdx).toBeGreaterThanOrEqual(0);
    expect(firstMarriageIdx).toBeGreaterThan(firstParentIdx);
    expect(firstMasterIdx).toBeGreaterThan(firstMarriageIdx);
  });
});

describe("generateInitialWorld person fields", () => {
  it("living persons have birthYear and currentAge without birthWeek", () => {
    const { snapshot } = generateInitialWorld(buildBaselineInput(777));
    for (const person of snapshot.persons.filter((p) => p.lifeStatus === "living")) {
      expect(person.birthYear).toBe(1 - person.currentAge);
      expect(Object.hasOwn(person, "birthWeek")).toBe(false);
    }
  });

  it("deceased persons have deathYear and ageAtDeath without currentAge", () => {
    const { snapshot } = generateInitialWorld(buildBaselineInput(777));
    for (const person of snapshot.persons.filter((p) => p.lifeStatus === "deceased")) {
      expect(person.ageAtDeath).toBe(person.deathYear - person.birthYear);
      expect(Object.hasOwn(person, "currentAge")).toBe(false);
    }
  });
});

describe("generateInitialWorld input revalidation", () => {
  it("throws on configHash mismatch", () => {
    const input = buildBaselineInput(1);
    expect(() => generateInitialWorld({ ...input, configHash: "deadbeef".repeat(8) })).toThrow(
      InitialWorldGenerationError,
    );
  });

  it("rejects tampered name candidates that keep old hash and manifest", () => {
    const input = buildBaselineInput(1);
    const tampered = structuredClone(input.nameData);
    const first = tampered.maleGivenNames.names[0];
    if (first === undefined) {
      throw new Error("expected male given name");
    }
    tampered.maleGivenNames.names[0] = `${first}TAMPERED`;

    expect(() =>
      generateInitialWorld({
        ...input,
        nameData: tampered,
      }),
    ).toThrow(InitialWorldGenerationError);
  });

  it("rejects bad RNG factory without returning a snapshot", () => {
    const input = buildBaselineInput(1);
    const badFactory: SeededRngFactory = (seed: number): SeededRng => {
      const real = createSeededRng(seed);
      return {
        nextUint32: () => real.nextUint32(),
        nextFloat: () => real.nextFloat(),
        nextInt: (min, max) => real.nextInt(min, max),
        chance: (p) => real.chance(p),
        choose: (items) => real.choose(items),
        shuffle: (items) => real.shuffle(items),
        sampleWithoutReplacement: (items, count) => real.sampleWithoutReplacement(items, count),
        exportState: () => ({
          algorithmVersion: "bad-rng" as "xoshiro128ss-v1",
          s0: real.exportState().s0,
          s1: real.exportState().s1,
          s2: real.exportState().s2,
          s3: real.exportState().s3,
        }),
      };
    };

    expect(() => generateInitialWorld({ ...input, rngFactory: badFactory })).toThrow(
      InitialWorldGenerationError,
    );
  });

  it("throws on insufficient family names", () => {
    const base = createSmallConfig();
    const validated = validateInitialWorldConfig(base);
    expect(validated.ok).toBe(true);
    if (!validated.ok) {
      throw new Error(JSON.stringify(validated.issues));
    }
    const config: InitialWorldConfig = {
      ...validated.value,
      families: {
        ...validated.value.families,
        initialFamilyCount: 10,
      },
    };
    const nameData = createTinyNameData(2);
    const input = {
      config,
      configHash: computeConfigHash(config, sha256Provider),
      seed: 42,
      nameData,
      nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
      rngFactory: createSeededRng,
      sha256Provider,
    };
    expect(() => generateInitialWorld(input)).toThrow(InitialWorldGenerationError);
  });
});

describe("generateInitialWorld family membership and birth rate", () => {
  it("keeps all families within 3..12 when minimumMembersPerFamily=3 seed=0", () => {
    const config = cloneBaselineConfig();
    config.families = {
      ...config.families,
      minimumMembersPerFamily: 3,
    };
    const input = buildInputFromConfig(config, 0, loadBaselineNameData(moduleUrl));
    const { snapshot } = generateInitialWorld(input);
    for (const family of snapshot.families) {
      const count = snapshot.persons.filter((p) => p.familyId === family.familyId).length;
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(12);
    }
  });

  it("rejects totalLiving less than initialFamilyCount", () => {
    const config = createSmallConfig({
      population: {
        totalLiving: 2,
        initialUserFounderCount: 0,
        sexRatioMale: 0.5,
        ageBands: [
          { minAge: 0, maxAge: 7, count: 0 },
          { minAge: 8, maxAge: 15, count: 0 },
          { minAge: 16, maxAge: 41, count: 1 },
          { minAge: 42, maxAge: 70, count: 1 },
        ],
        activeRankDistribution: { F: 0, E: 0, D: 0, C: 1, B: 0, A: 0, S: 0 },
      },
      families: {
        initialFamilyCount: 3,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 8,
        baseBirthRateRange: { min: 0.1, max: 0.1 },
      },
      lineages: {
        initialLineageCount: 1,
        initialQualifiedMasters: 1,
        techniqueFocusWeights: { unarmed: 1, sword: 0, magic: 0 },
      },
      history: {
        initialDeceasedAncestors: 5,
        minimumGenerationDepth: 1,
        maximumGenerationDepth: 2,
        earliestHistoricalYear: -120,
        minimumAgeAtDeath: 18,
        maximumAgeAtDeath: 70,
        createExistingRelationships: false,
        createPastTournamentHistory: false,
      },
    });

    const maybeValid = validateInitialWorldConfig(config);
    if (!maybeValid.ok) {
      expect(maybeValid.ok).toBe(false);
      return;
    }
    const nameData = createTinyNameData(10);
    expect(() =>
      generateInitialWorld({
        config: maybeValid.value,
        configHash: computeConfigHash(maybeValid.value, sha256Provider),
        seed: 1,
        nameData,
        nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
        rngFactory: createSeededRng,
        sha256Provider,
      }),
    ).toThrow(/totalLiving less than initialFamilyCount/);
  });

  it("rejects totalPersons below minimum family capacity", () => {
    const config = createSmallConfig({
      families: {
        initialFamilyCount: 3,
        minimumMembersPerFamily: 10,
        maximumMembersPerFamily: 20,
        baseBirthRateRange: { min: 0.1, max: 0.1 },
      },
    });
    expect(() => {
      const validated = validateInitialWorldConfig(config);
      if (!validated.ok) {
        throw new InitialWorldGenerationError("invalid initial world config", {
          issues: JSON.stringify(validated.issues),
        });
      }
      const nameData = createTinyNameData(10);
      generateInitialWorld({
        config: validated.value,
        configHash: computeConfigHash(validated.value, sha256Provider),
        seed: 1,
        nameData,
        nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
        rngFactory: createSeededRng,
        sha256Provider,
      });
    }).toThrow(InitialWorldGenerationError);
  });

  it("rejects totalPersons above maximum family capacity", () => {
    const config = createSmallConfig({
      families: {
        initialFamilyCount: 3,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 4,
        baseBirthRateRange: { min: 0.1, max: 0.1 },
      },
    });
    expect(() => {
      const validated = validateInitialWorldConfig(config);
      if (!validated.ok) {
        throw new InitialWorldGenerationError("invalid initial world config", {
          issues: JSON.stringify(validated.issues),
        });
      }
      const nameData = createTinyNameData(10);
      generateInitialWorld({
        config: validated.value,
        configHash: computeConfigHash(validated.value, sha256Provider),
        seed: 1,
        nameData,
        nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
        rngFactory: createSeededRng,
        sha256Provider,
      });
    }).toThrow(InitialWorldGenerationError);
  });

  it("assigns identical membership for the same seed", () => {
    const config = cloneBaselineConfig();
    config.families = { ...config.families, minimumMembersPerFamily: 3 };
    const a = generateInitialWorld(
      buildInputFromConfig(config, 0, loadBaselineNameData(moduleUrl)),
    );
    const b = generateInitialWorld(
      buildInputFromConfig(config, 0, loadBaselineNameData(moduleUrl)),
    );
    const membership = (snapshot: typeof a.snapshot) =>
      snapshot.persons.map((p) => `${p.personId}:${p.familyId}`).sort();
    expect(membership(a.snapshot)).toEqual(membership(b.snapshot));
  });

  it("uses exact baseBirthRate when min === max including 0.10005", () => {
    const config = createSmallConfig({
      families: {
        initialFamilyCount: 3,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 8,
        baseBirthRateRange: { min: 0.10005, max: 0.10005 },
      },
    });
    const { snapshot } = generateInitialWorld(buildInputFromConfig(config, 7));
    for (const family of snapshot.families) {
      expect(family.baseBirthRate).toBe(0.10005);
    }
  });

  it("clamps baseBirthRate to configured range", () => {
    const config = createSmallConfig({
      families: {
        initialFamilyCount: 3,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 8,
        baseBirthRateRange: { min: 0.12, max: 0.18 },
      },
    });
    const { snapshot } = generateInitialWorld(buildInputFromConfig(config, 11));
    for (const family of snapshot.families) {
      expect(family.baseBirthRate).toBeGreaterThanOrEqual(0.12);
      expect(family.baseBirthRate).toBeLessThanOrEqual(0.18);
    }
    const again = generateInitialWorld(buildInputFromConfig(config, 11));
    expect(again.snapshot.families.map((f) => f.baseBirthRate)).toEqual(
      snapshot.families.map((f) => f.baseBirthRate),
    );
  });
});

describe("generateInitialWorld relationship summary zeros and shortage", () => {
  it("zeros relationship targets and actuals when createExistingRelationships=false", () => {
    const config = createSmallConfig({
      history: {
        initialDeceasedAncestors: 5,
        minimumGenerationDepth: 1,
        maximumGenerationDepth: 2,
        earliestHistoricalYear: -120,
        minimumAgeAtDeath: 18,
        maximumAgeAtDeath: 70,
        createExistingRelationships: false,
        createPastTournamentHistory: false,
      },
    });
    const { snapshot } = generateInitialWorld(buildInputFromConfig(config, 3));
    const s = snapshot.generationSummary;
    expect(s.parentRelationships).toEqual({ target: 0, actual: 0 });
    expect(s.knownParentPeople).toEqual({ target: 0, actual: 0 });
    expect(s.knownParentCoverage).toEqual({ target: 0, actual: 0 });
    expect(s.twoKnownParentPeople).toEqual({ target: 0, actual: 0 });
    expect(s.twoKnownParentsAmongCovered).toEqual({ target: 0, actual: 0 });
    expect(s.marriagePeople).toEqual({ target: 0, actual: 0 });
    expect(s.marriagePairs).toEqual({ target: 0, actual: 0 });
    expect(s.formalMasterRelationships).toEqual({ target: 0, actual: 0 });
    expect(s.formalMasterCoverage).toEqual({ target: 0, actual: 0 });
    expect(snapshot.relationships).toHaveLength(0);
  });

  it("keeps parentRelationships target at formula when coverage is short", () => {
    const config = createSmallConfig({
      relationships: {
        knownParentCoverage: 1,
        twoKnownParentsCoverageAmongCovered: 1,
        retiredSpouseCoverage: 0,
        formalMasterCoverageAge8To41: 0,
        minimumParentAgeAtChildbirth: 55,
        maximumBiologicalParents: 2,
      },
      history: {
        initialDeceasedAncestors: 5,
        minimumGenerationDepth: 1,
        maximumGenerationDepth: 1,
        earliestHistoricalYear: -120,
        minimumAgeAtDeath: 18,
        maximumAgeAtDeath: 70,
        createExistingRelationships: true,
        createPastTournamentHistory: false,
      },
    });
    const { snapshot } = generateInitialWorld(buildInputFromConfig(config, 9));
    const coveredTarget = Math.floor(10 * 1);
    const twoParentTarget = Math.floor(coveredTarget * 1);
    expect(snapshot.generationSummary.parentRelationships.target).toBe(
      coveredTarget + twoParentTarget,
    );
    expect(snapshot.generationSummary.knownParentPeople.target).toBe(coveredTarget);
    expect(snapshot.generationSummary.twoKnownParentPeople.target).toBe(twoParentTarget);
    expect(snapshot.generationSummary.parentRelationships.actual).toBeLessThanOrEqual(
      snapshot.generationSummary.parentRelationships.target,
    );
  });
});

describe("generateInitialWorld name pool and id capacity", () => {
  function buildCustomNameData(options: {
    familyNames: string[];
    maleNames: string[];
    femaleNames: string[];
    neutralNames: string[];
    initialFamilyCount: number;
  }) {
    const familyNames = {
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-TEST-0.0.1",
      locale: "ja-JP",
      style: "test",
      encoding: "UTF-8" as const,
      notes: "test fixture",
      category: "family_name" as const,
      count: options.familyNames.length,
      names: options.familyNames,
    };
    const maleGivenNames = {
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-TEST-0.0.1",
      locale: "ja-JP",
      style: "test",
      encoding: "UTF-8" as const,
      notes: "test fixture",
      category: "male_given_name" as const,
      count: options.maleNames.length,
      names: options.maleNames,
    };
    const femaleGivenNames = {
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-TEST-0.0.1",
      locale: "ja-JP",
      style: "test",
      encoding: "UTF-8" as const,
      notes: "test fixture",
      category: "female_given_name" as const,
      count: options.femaleNames.length,
      names: options.femaleNames,
    };
    const neutralGivenNames = {
      schemaVersion: "1.0.0",
      nameDataVersion: "NAMES-TEST-0.0.1",
      locale: "ja-JP",
      style: "test",
      encoding: "UTF-8" as const,
      notes: "test fixture",
      category: "neutral_given_name" as const,
      count: options.neutralNames.length,
      names: options.neutralNames,
    };
    const manifest = {
      schemaVersion: "1.1.0",
      nameDataVersion: "NAMES-TEST-0.0.1",
      locale: "ja-JP",
      style: "test",
      displayFormat: "{givenName}・{familyName}" as const,
      files: {
        family: {
          path: "family-names.json",
          count: familyNames.count,
          sha256: sha256Provider.hashUtf8(toCanonicalJson(familyNames)),
        },
        male: {
          path: "male-given-names.json",
          count: maleGivenNames.count,
          sha256: sha256Provider.hashUtf8(toCanonicalJson(maleGivenNames)),
        },
        female: {
          path: "female-given-names.json",
          count: femaleGivenNames.count,
          sha256: sha256Provider.hashUtf8(toCanonicalJson(femaleGivenNames)),
        },
        neutral: {
          path: "neutral-given-names.json",
          count: neutralGivenNames.count,
          sha256: sha256Provider.hashUtf8(toCanonicalJson(neutralGivenNames)),
        },
      },
      selectionPolicy: {
        familyNames: "without replacement",
        givenNames: "sex pool with neutral probability",
        duplicateLivingFullNameWithinFamily: "deterministic scan",
        historicalReuse: "allowed when not overlapping living",
        rng: "seeded only",
      },
      hashAlgorithm: "sha256-canonical-json-v1" as const,
    };
    const result = validateNameData({
      manifest,
      familyNames,
      maleGivenNames,
      femaleGivenNames,
      neutralGivenNames,
      requiredVersion: "NAMES-TEST-0.0.1",
      initialFamilyCount: options.initialFamilyCount,
      sha256Provider,
    });
    if (!result.ok) {
      throw new Error(JSON.stringify(result.issues));
    }
    return result.value;
  }

  it("throws when neutral pool is exhausted without sex-pool fallback", () => {
    const config = createSmallConfig({
      nameData: {
        manifestPath: "data/names/name-data.manifest.json",
        requiredVersion: "NAMES-TEST-0.0.1",
        neutralGivenNameProbability: 1,
        familyNameSelection: "without_replacement",
        avoidDuplicateLivingFullNameWithinFamily: true,
        displayFormat: "{givenName}・{familyName}",
      },
      families: {
        initialFamilyCount: 1,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 20,
        baseBirthRateRange: { min: 0.1, max: 0.1 },
      },
      lineages: {
        initialLineageCount: 1,
        initialQualifiedMasters: 1,
        techniqueFocusWeights: { unarmed: 1, sword: 0, magic: 0 },
      },
    });
    const nameData = buildCustomNameData({
      familyNames: ["同一家"],
      maleNames: Array.from({ length: 20 }, (_, i) => `Male${String(i + 1)}`),
      femaleNames: Array.from({ length: 20 }, (_, i) => `Female${String(i + 1)}`),
      neutralNames: ["唯一"],
      initialFamilyCount: 1,
    });
    const validated = validateInitialWorldConfig(config);
    if (!validated.ok) {
      throw new Error(JSON.stringify(validated.issues));
    }
    expect(() =>
      generateInitialWorld({
        config: validated.value,
        configHash: computeConfigHash(validated.value, sha256Provider),
        seed: 1,
        nameData,
        nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
        rngFactory: createSeededRng,
        sha256Provider,
      }),
    ).toThrow(InitialWorldGenerationError);
  });

  it("uses sex pool only when neutralGivenNameProbability is 0", () => {
    const config = createSmallConfig({
      nameData: {
        manifestPath: "data/names/name-data.manifest.json",
        requiredVersion: "NAMES-TEST-0.0.1",
        neutralGivenNameProbability: 0,
        familyNameSelection: "without_replacement",
        avoidDuplicateLivingFullNameWithinFamily: true,
        displayFormat: "{givenName}・{familyName}",
      },
    });
    const nameData = buildCustomNameData({
      familyNames: Array.from({ length: 10 }, (_, i) => `Family${String(i + 1)}`),
      maleNames: Array.from({ length: 20 }, (_, i) => `MaleOnly${String(i + 1)}`),
      femaleNames: Array.from({ length: 20 }, (_, i) => `FemaleOnly${String(i + 1)}`),
      neutralNames: ["ShouldNeverAppear"],
      initialFamilyCount: 3,
    });
    const validated = validateInitialWorldConfig(config);
    if (!validated.ok) {
      throw new Error(JSON.stringify(validated.issues));
    }
    const { snapshot } = generateInitialWorld({
      config: validated.value,
      configHash: computeConfigHash(validated.value, sha256Provider),
      seed: 42,
      nameData,
      nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
      rngFactory: createSeededRng,
      sha256Provider,
    });
    for (const person of snapshot.persons) {
      expect(person.givenName).not.toBe("ShouldNeverAppear");
    }
  });

  it("rejects entity counts that exceed 6-digit id capacity", () => {
    const activeCount = 50_000;
    const config = createSmallConfig({
      population: {
        totalLiving: 200_000,
        initialUserFounderCount: 0,
        sexRatioMale: 0.5,
        ageBands: [
          { minAge: 0, maxAge: 7, count: 50_000 },
          { minAge: 8, maxAge: 15, count: 50_000 },
          { minAge: 16, maxAge: 41, count: activeCount },
          { minAge: 42, maxAge: 70, count: 50_000 },
        ],
        activeRankDistribution: {
          F: 10_000,
          E: 10_000,
          D: 10_000,
          C: 10_000,
          B: 5_000,
          A: 4_000,
          S: 1_000,
        },
      },
      history: {
        initialDeceasedAncestors: 50_000,
        minimumGenerationDepth: 1,
        maximumGenerationDepth: 2,
        earliestHistoricalYear: -120,
        minimumAgeAtDeath: 18,
        maximumAgeAtDeath: 70,
        createExistingRelationships: false,
        createPastTournamentHistory: false,
      },
      families: {
        initialFamilyCount: 100,
        minimumMembersPerFamily: 1,
        maximumMembersPerFamily: 5_000,
        baseBirthRateRange: { min: 0.1, max: 0.1 },
      },
      lineages: {
        initialLineageCount: 1,
        initialQualifiedMasters: 1,
        techniqueFocusWeights: { unarmed: 1, sword: 0, magic: 0 },
      },
      relationships: {
        knownParentCoverage: 0,
        twoKnownParentsCoverageAmongCovered: 0,
        retiredSpouseCoverage: 0,
        formalMasterCoverageAge8To41: 0,
        minimumParentAgeAtChildbirth: 18,
        maximumBiologicalParents: 2,
      },
    });
    // totalPersons=250000 → relationship upper bound 1_000_000 > 999_999
    expect(() =>
      generateInitialWorld(buildInputFromConfig(config, 1, createTinyNameData(100))),
    ).toThrow(InitialWorldGenerationError);
  });

  it("formatPersonId rejects values above 999999", () => {
    expect(() => formatPersonId(1_000_000)).toThrow(InitialWorldGenerationError);
  });
});

describe("production source purity", () => {
  it("initial-world production sources avoid Math.random, Date, node:fs, node:crypto", () => {
    const initialWorldDir = join(dirname(fileURLToPath(moduleUrl)), ".");
    const files = readdirSync(initialWorldDir).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );
    const forbidden = [/Math\.random\s*\(/, /\bnew Date\s*\(/, /node:fs/, /node:crypto/];
    for (const file of files) {
      const content = readFileSync(join(initialWorldDir, file), "utf8");
      for (const pattern of forbidden) {
        expect(content, `${file} must not match ${String(pattern)}`).not.toMatch(pattern);
      }
    }
  });
});

describe("generateInitialWorld small config", () => {
  it("generates a valid tiny world", () => {
    const config = createSmallConfig();
    const result = generateInitialWorld(buildInputFromConfig(config, 100));
    expect(result.validationSummary.passed).toBe(true);
    expect(result.snapshot.persons).toHaveLength(15);
  });
});

describe("baselineConfigFixture reference", () => {
  it("matches documented baseline counts", () => {
    expect(baselineConfigFixture.population.totalLiving).toBe(600);
    expect(baselineConfigFixture.history.initialDeceasedAncestors).toBe(200);
    expect(baselineConfigFixture.families.initialFamilyCount).toBe(100);
    expect(baselineConfigFixture.lineages.initialLineageCount).toBe(24);
    expect(baselineConfigFixture.lineages.initialQualifiedMasters).toBe(45);
  });
});
