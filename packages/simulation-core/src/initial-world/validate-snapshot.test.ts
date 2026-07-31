import { describe, expect, it } from "vitest";
import {
  computeConfigHash,
  computeNameDataHash,
  createSeededRng,
  generateInitialWorld,
  InitialWorldGenerationError,
  MINIMUM_RANK,
  toCanonicalJson,
  validateInitialWorldConfig,
  validateInitialWorldSnapshot,
  type InitialWorldConfig,
  type InitialWorldSnapshot,
  type Person,
  type Relationship,
} from "../index.js";
import { cloneBaselineConfig } from "../test-fixtures/baseline-config.fixture.js";
import {
  createNodeSha256Provider,
  createTinyNameData,
  loadBaselineNameData,
} from "../test-fixtures/name-data-loader.fixture.js";
import { asFamilyId, asPersonId, asRelationshipId } from "../ids.js";
import { buildGenerationSummary } from "./summary.js";

const moduleUrl = import.meta.url;
const sha256Provider = createNodeSha256Provider();

function buildBaselineSnapshot(seed = 12345): {
  config: InitialWorldConfig;
  snapshot: InitialWorldSnapshot;
} {
  const validated = validateInitialWorldConfig(cloneBaselineConfig());
  if (!validated.ok) {
    throw new Error(JSON.stringify(validated.issues));
  }
  const nameData = loadBaselineNameData(moduleUrl);
  const result = generateInitialWorld({
    config: validated.value,
    configHash: computeConfigHash(validated.value, sha256Provider),
    seed,
    nameData,
    nameDataHash: computeNameDataHash(nameData.manifest, sha256Provider),
    rngFactory: createSeededRng,
    sha256Provider,
  });
  return { config: validated.value, snapshot: structuredClone(result.snapshot) };
}

function expectValidationFailure(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  expect(() => validateInitialWorldSnapshot(config, snapshot)).toThrow(InitialWorldGenerationError);
}

describe("validateInitialWorldSnapshot mutations", () => {
  it("accepts a freshly generated baseline snapshot", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    expect(() => validateInitialWorldSnapshot(config, snapshot)).not.toThrow();
  });

  it("rejects under-8 changed to retired", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const child = snapshot.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "child",
    );
    if (child === undefined || child.lifeStatus !== "living") {
      throw new Error("child missing");
    }
    const mutated = {
      ...child,
      careerStatus: "retired" as const,
      retirementRank: "C" as const,
      highestRank: "C" as const,
      qualifiedMaster: false,
    };
    delete (mutated as { currentRank?: unknown }).currentRank;
    snapshot.persons = snapshot.persons.map((p) =>
      p.personId === child.personId ? (mutated as Person) : p,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects F-rank person marked qualifiedMaster", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const retiredF = snapshot.persons.find(
      (p) =>
        p.lifeStatus === "living" &&
        p.careerStatus === "retired" &&
        p.retirementRank === "F" &&
        !p.qualifiedMaster,
    );
    if (
      retiredF === undefined ||
      retiredF.lifeStatus !== "living" ||
      retiredF.careerStatus !== "retired"
    ) {
      throw new Error("retired F missing");
    }
    snapshot.persons = snapshot.persons.map((p) =>
      p.personId === retiredF.personId ? { ...retiredF, qualifiedMaster: true } : p,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects family with no living members", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const familyId = snapshot.families[0]?.familyId;
    if (familyId === undefined) {
      throw new Error("family missing");
    }
    snapshot.persons = snapshot.persons.map((p) => {
      if (p.familyId !== familyId || p.lifeStatus !== "living") {
        return p;
      }
      const other = snapshot.families.find((f) => f.familyId !== familyId);
      if (other === undefined) {
        throw new Error("other family missing");
      }
      return { ...p, familyId: other.familyId };
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects duplicate living full name within the same family", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const livingA = snapshot.persons.find((p) => p.lifeStatus === "living");
    if (livingA === undefined) {
      throw new Error("living person missing");
    }
    const livingB = snapshot.persons.find(
      (p) =>
        p.lifeStatus === "living" &&
        p.personId !== livingA.personId &&
        p.familyId === livingA.familyId,
    );
    if (livingB === undefined) {
      throw new Error("second living family member missing");
    }
    snapshot.persons = snapshot.persons.map((p) =>
      p.personId === livingB.personId
        ? {
            ...p,
            givenName: livingA.givenName,
            familyName: livingA.familyName,
            displayName: livingA.displayName,
          }
        : p,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects person with birthMonth field", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const person = snapshot.persons[0];
    if (person === undefined) {
      throw new Error("person missing");
    }
    snapshot.persons = snapshot.persons.map((p) => {
      if (p.personId !== person.personId) {
        return p;
      }
      const withBirthMonth: Person & { birthMonth?: number } = { ...p };
      withBirthMonth.birthMonth = 4;
      return withBirthMonth;
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects ability value 999", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const person = snapshot.persons[0];
    if (person === undefined) {
      throw new Error("person missing");
    }
    snapshot.persons = snapshot.persons.map((p) => {
      if (p.personId !== person.personId) {
        return p;
      }
      return {
        ...p,
        abilities: {
          ...p.abilities,
          stamina: { ...p.abilities.stamina, surfaceValue: 999 },
        },
      };
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects lineage founderFamilyId pointing elsewhere", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const lineage = snapshot.lineages[0];
    const otherFamily = snapshot.families.find((f) => f.familyId !== lineage?.founderFamilyId);
    if (lineage === undefined || otherFamily === undefined) {
      throw new Error("lineage/family missing");
    }
    snapshot.lineages = snapshot.lineages.map((l) =>
      l.lineageId === lineage.lineageId ? { ...l, founderFamilyId: otherFamily.familyId } : l,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects duplicate marriage pair", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const marriage = snapshot.relationships.find((r) => r.kind === "marriage");
    if (marriage === undefined || marriage.kind !== "marriage") {
      throw new Error("marriage missing");
    }
    const dup: Relationship = {
      ...marriage,
      relationshipId: asRelationshipId("relationship_999999"),
    };
    snapshot.relationships = [...snapshot.relationships, dup];
    expectValidationFailure(config, snapshot);
  });

  it("rejects living person with two spouses", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const marriages = snapshot.relationships.filter((r) => r.kind === "marriage");
    const first = marriages[0];
    const second = marriages[1];
    if (
      first === undefined ||
      second === undefined ||
      first.kind !== "marriage" ||
      second.kind !== "marriage"
    ) {
      throw new Error("need two marriages");
    }
    snapshot.relationships = snapshot.relationships.map((r) => {
      if (r.relationshipId !== second.relationshipId || r.kind !== "marriage") {
        return r;
      }
      const personAId = first.personAId < first.personBId ? first.personAId : first.personBId;
      const personBId = r.personBId === personAId ? r.personAId : r.personBId;
      const ordered =
        personAId < personBId
          ? { personAId, personBId }
          : { personAId: personBId, personBId: personAId };
      return { ...r, ...ordered };
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects under-8 disciple", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const masterRel = snapshot.relationships.find((r) => r.kind === "master_disciple");
    const child = snapshot.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "child",
    );
    if (masterRel === undefined || masterRel.kind !== "master_disciple" || child === undefined) {
      throw new Error("master/child missing");
    }
    snapshot.relationships = snapshot.relationships.map((r) =>
      r.relationshipId === masterRel.relationshipId && r.kind === "master_disciple"
        ? { ...r, discipleId: child.personId }
        : r,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects mismatched disciple/master lineageId", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const masterRel = snapshot.relationships.find((r) => r.kind === "master_disciple");
    if (masterRel === undefined || masterRel.kind !== "master_disciple") {
      throw new Error("master missing");
    }
    const otherLineage = snapshot.lineages.find((l) => {
      const master = snapshot.persons.find((p) => p.personId === masterRel.masterId);
      return master !== undefined && l.lineageId !== master.lineageId;
    });
    if (otherLineage === undefined) {
      throw new Error("other lineage missing");
    }
    snapshot.persons = snapshot.persons.map((p) =>
      p.personId === masterRel.discipleId ? { ...p, lineageId: otherLineage.lineageId } : p,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects father/parentRole sex mismatch", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const fatherRel = snapshot.relationships.find(
      (r) => r.kind === "parent_child" && r.parentRole === "father",
    );
    if (fatherRel === undefined || fatherRel.kind !== "parent_child") {
      throw new Error("father rel missing");
    }
    snapshot.relationships = snapshot.relationships.map((r) =>
      r.relationshipId === fatherRel.relationshipId && r.kind === "parent_child"
        ? { ...r, parentRole: "mother" as const }
        : r,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects parent age gap below minimum", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const parentRel = snapshot.relationships.find((r) => r.kind === "parent_child");
    if (parentRel === undefined || parentRel.kind !== "parent_child") {
      throw new Error("parent rel missing");
    }
    snapshot.persons = snapshot.persons.map((p) => {
      if (p.personId !== parentRel.parentId) {
        return p;
      }
      const child = snapshot.persons.find((c) => c.personId === parentRel.childId);
      if (child === undefined) {
        throw new Error("child missing");
      }
      return { ...p, birthYear: child.birthYear - 1 };
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects missing personId reference", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const parentRel = snapshot.relationships.find((r) => r.kind === "parent_child");
    if (parentRel === undefined || parentRel.kind !== "parent_child") {
      throw new Error("parent rel missing");
    }
    snapshot.relationships = snapshot.relationships.map((r) =>
      r.relationshipId === parentRel.relationshipId && r.kind === "parent_child"
        ? { ...r, parentId: asPersonId("person_999999") }
        : r,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects parent cycle", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const parentRels = snapshot.relationships.filter((r) => r.kind === "parent_child");
    const first = parentRels[0];
    if (first === undefined || first.kind !== "parent_child") {
      throw new Error("parent missing");
    }
    const cycle: Relationship = {
      relationshipId: asRelationshipId("relationship_999998"),
      kind: "parent_child",
      parentId: first.childId,
      childId: first.parentId,
      parentRole: "father",
    };
    snapshot.relationships = [...snapshot.relationships, cycle];
    expectValidationFailure(config, snapshot);
  });

  it("rejects master cycle", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const masterRels = snapshot.relationships.filter((r) => r.kind === "master_disciple");
    const first = masterRels[0];
    const second = masterRels[1];
    if (
      first === undefined ||
      second === undefined ||
      first.kind !== "master_disciple" ||
      second.kind !== "master_disciple"
    ) {
      throw new Error("need two master rels");
    }
    snapshot.relationships = snapshot.relationships.map((r) => {
      if (r.relationshipId !== second.relationshipId || r.kind !== "master_disciple") {
        return r;
      }
      return { ...r, masterId: first.discipleId, discipleId: first.masterId };
    });
    expectValidationFailure(config, snapshot);
  });

  it("rejects family member count below minimum", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const family = snapshot.families[0];
    if (family === undefined) {
      throw new Error("family missing");
    }
    const members = snapshot.persons.filter((p) => p.familyId === family.familyId);
    const victim = members.find((p) => p.lifeStatus === "deceased") ?? members[0];
    const other = snapshot.families[1];
    if (victim === undefined || other === undefined) {
      throw new Error("member/other missing");
    }
    // Force below minimum by moving all but zero living... better: set min via mutated config
    const strictConfig = {
      ...config,
      families: { ...config.families, minimumMembersPerFamily: members.length + 1 },
    };
    expectValidationFailure(strictConfig, snapshot);
  });

  it("rejects family member count above maximum", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const family = snapshot.families[0];
    if (family === undefined) {
      throw new Error("family missing");
    }
    const members = snapshot.persons.filter((p) => p.familyId === family.familyId);
    const strictConfig = {
      ...config,
      families: { ...config.families, maximumMembersPerFamily: Math.max(1, members.length - 1) },
    };
    expectValidationFailure(strictConfig, snapshot);
  });

  it("rejects duplicate relationship ids", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const first = snapshot.relationships[0];
    const second = snapshot.relationships[1];
    if (first === undefined || second === undefined) {
      throw new Error("relationships missing");
    }
    snapshot.relationships = snapshot.relationships.map((r) =>
      r.relationshipId === second.relationshipId
        ? { ...r, relationshipId: first.relationshipId }
        : r,
    );
    expectValidationFailure(config, snapshot);
  });

  it("rejects reversed relationship array order", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    snapshot.relationships = [...snapshot.relationships].reverse();
    expectValidationFailure(config, snapshot);
  });

  it("rejects tampered generationSummary targets", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    snapshot.generationSummary = {
      ...snapshot.generationSummary,
      parentRelationships: {
        target: snapshot.generationSummary.parentRelationships.actual,
        actual: snapshot.generationSummary.parentRelationships.actual,
      },
      livingCount: {
        target: 0,
        actual: snapshot.generationSummary.livingCount.actual,
      },
    };
    expectValidationFailure(config, snapshot);
  });

  it("rejects broken familyId reference via nonexistent family", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const person = snapshot.persons[0];
    if (person === undefined) {
      throw new Error("person missing");
    }
    snapshot.persons = snapshot.persons.map((p) =>
      p.personId === person.personId ? { ...p, familyId: asFamilyId("family_999999") } : p,
    );
    expectValidationFailure(config, snapshot);
  });
});

function createSmallConfig(overrides: Partial<InitialWorldConfig> = {}): InitialWorldConfig {
  return {
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
}

function buildSmallSnapshot(
  overrides: Partial<InitialWorldConfig> = {},
  seed = 3,
): {
  config: InitialWorldConfig;
  snapshot: InitialWorldSnapshot;
} {
  const validated = validateInitialWorldConfig(createSmallConfig(overrides));
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
  return { config: validated.value, snapshot: structuredClone(result.snapshot) };
}

function refreshSummary(config: InitialWorldConfig, snapshot: InitialWorldSnapshot): void {
  snapshot.generationSummary = buildGenerationSummary(
    config,
    snapshot.persons,
    snapshot.families,
    snapshot.lineages,
    snapshot.relationships,
    snapshot.generationSummary.warnings,
  );
}

function mutatePerson(person: Person, patch: Record<string, unknown>): Person {
  const copy: Record<string, unknown> = { ...person };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      delete copy[key];
    } else {
      copy[key] = value;
    }
  }
  return copy as Person;
}

describe("validateInitialWorldSnapshot createExistingRelationships=false", () => {
  it("rejects added parent/marriage/master relationships", () => {
    const { config, snapshot } = buildSmallSnapshot({
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
    expect(snapshot.relationships).toHaveLength(0);

    const living = snapshot.persons.filter((p) => p.lifeStatus === "living");
    const a = living[0];
    const b = living[1];
    if (a === undefined || b === undefined) {
      throw new Error("need two living persons");
    }

    const withParent: InitialWorldSnapshot = structuredClone(snapshot);
    withParent.relationships = [
      {
        relationshipId: asRelationshipId("relationship_000001"),
        kind: "parent_child",
        parentId: a.personId,
        childId: b.personId,
        parentRole: "father",
      },
    ];
    expectValidationFailure(config, withParent);

    const withMarriage: InitialWorldSnapshot = structuredClone(snapshot);
    const retired = living.filter((p) => p.careerStatus === "retired");
    const r0 = retired[0];
    const r1 = retired[1];
    if (r0 === undefined || r1 === undefined) {
      throw new Error("need two retired");
    }
    const [personAId, personBId] =
      r0.personId < r1.personId ? [r0.personId, r1.personId] : [r1.personId, r0.personId];
    withMarriage.relationships = [
      {
        relationshipId: asRelationshipId("relationship_000001"),
        kind: "marriage",
        personAId,
        personBId,
      },
    ];
    expectValidationFailure(config, withMarriage);

    const withMaster: InitialWorldSnapshot = structuredClone(snapshot);
    const master = living.find((p) => p.careerStatus === "retired" && p.qualifiedMaster);
    const disciple = living.find((p) => p.currentAge >= 8 && p.currentAge <= 41);
    if (master === undefined || disciple === undefined) {
      throw new Error("master/disciple missing");
    }
    withMaster.relationships = [
      {
        relationshipId: asRelationshipId("relationship_000001"),
        kind: "master_disciple",
        masterId: master.personId,
        discipleId: disciple.personId,
      },
    ];
    expectValidationFailure(config, withMaster);
  });

  it("rejects fake zero summary actuals when relationships exist", () => {
    const { config, snapshot } = buildSmallSnapshot();
    expect(snapshot.relationships.length).toBeGreaterThan(0);
    const falseConfig: InitialWorldConfig = {
      ...config,
      history: { ...config.history, createExistingRelationships: false },
    };
    snapshot.generationSummary = {
      ...snapshot.generationSummary,
      parentRelationships: { target: 0, actual: 0 },
      knownParentPeople: { target: 0, actual: 0 },
      knownParentCoverage: { target: 0, actual: 0 },
      twoKnownParentPeople: { target: 0, actual: 0 },
      twoKnownParentsAmongCovered: { target: 0, actual: 0 },
      marriagePeople: { target: 0, actual: 0 },
      marriagePairs: { target: 0, actual: 0 },
      formalMasterRelationships: { target: 0, actual: 0 },
      formalMasterCoverage: { target: 0, actual: 0 },
    };
    expectValidationFailure(falseConfig, snapshot);
  });
});

describe("validateInitialWorldSnapshot deceased and distribution hard rules", () => {
  it("rejects deceased mutated to active_competitor / S rank / qualifiedMaster", () => {
    const { config, snapshot } = buildSmallSnapshot();
    const deceased = snapshot.persons.find((p) => p.lifeStatus === "deceased");
    if (deceased === undefined || deceased.lifeStatus !== "deceased") {
      throw new Error("deceased missing");
    }

    const asActive = structuredClone(snapshot);
    asActive.persons = asActive.persons.map((p) =>
      p.personId === deceased.personId
        ? mutatePerson(p, {
            careerStatus: "active_competitor",
            highestRank: "C",
            qualifiedMaster: false,
            retirementRank: undefined,
            currentRank: "C",
          })
        : p,
    );
    expectValidationFailure(config, asActive);

    const asS = structuredClone(snapshot);
    asS.persons = asS.persons.map((p) =>
      p.personId === deceased.personId
        ? mutatePerson(p, {
            careerStatus: "retired",
            highestRank: "S",
            retirementRank: "S",
            qualifiedMaster: false,
            currentRank: undefined,
          })
        : p,
    );
    expectValidationFailure(config, asS);

    const asMaster = structuredClone(snapshot);
    asMaster.persons = asMaster.persons.map((p) =>
      p.personId === deceased.personId
        ? mutatePerson(p, {
            careerStatus: "retired",
            highestRank: MINIMUM_RANK,
            retirementRank: MINIMUM_RANK,
            qualifiedMaster: true,
            currentRank: undefined,
          })
        : p,
    );
    expectValidationFailure(config, asMaster);
  });

  it("rejects invalid sex/rank enums and sex count / retired rank distribution tampering", () => {
    const { config, snapshot } = buildSmallSnapshot();

    const badSex = structuredClone(snapshot);
    const living = badSex.persons.find((p) => p.lifeStatus === "living");
    if (living === undefined) {
      throw new Error("living missing");
    }
    badSex.persons = badSex.persons.map((p) =>
      p.personId === living.personId ? mutatePerson(p, { sex: "other" }) : p,
    );
    expectValidationFailure(config, badSex);

    const badRank = structuredClone(snapshot);
    const active = badRank.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "active_competitor",
    );
    if (active === undefined || active.lifeStatus !== "living") {
      throw new Error("active missing");
    }
    badRank.persons = badRank.persons.map((p) =>
      p.personId === active.personId ? mutatePerson(p, { currentRank: "Z", highestRank: "Z" }) : p,
    );
    expectValidationFailure(config, badRank);

    const sexFlip = structuredClone(snapshot);
    const male = sexFlip.persons.find((p) => p.sex === "male");
    if (male === undefined) {
      throw new Error("male missing");
    }
    sexFlip.persons = sexFlip.persons.map((p) =>
      p.personId === male.personId ? mutatePerson(p, { sex: "female" }) : p,
    );
    refreshSummary(config, sexFlip);
    expectValidationFailure(config, sexFlip);

    const rankDist = structuredClone(snapshot);
    const retiredLiving = rankDist.persons.filter(
      (p) => p.lifeStatus === "living" && p.careerStatus === "retired",
    );
    const first = retiredLiving[0];
    const second = retiredLiving[1];
    if (
      first === undefined ||
      second === undefined ||
      first.lifeStatus !== "living" ||
      second.lifeStatus !== "living" ||
      first.careerStatus !== "retired" ||
      second.careerStatus !== "retired"
    ) {
      throw new Error("need two living retired");
    }
    if (first.retirementRank === second.retirementRank) {
      rankDist.persons = rankDist.persons.map((p) => {
        if (p.personId !== first.personId || p.lifeStatus !== "living") {
          return p;
        }
        const otherRank = first.retirementRank === "C" ? "B" : "C";
        return mutatePerson(p, {
          careerStatus: "retired",
          retirementRank: otherRank,
          highestRank: otherRank,
          qualifiedMaster: false,
          currentRank: undefined,
        });
      });
    } else {
      rankDist.persons = rankDist.persons.map((p) => {
        if (p.personId !== first.personId || p.lifeStatus !== "living") {
          return p;
        }
        return mutatePerson(p, {
          careerStatus: "retired",
          retirementRank: second.retirementRank,
          highestRank: second.retirementRank,
          qualifiedMaster: false,
          currentRank: undefined,
        });
      });
    }
    refreshSummary(config, rankDist);
    expectValidationFailure(config, rankDist);
  });
});

describe("validateInitialWorldSnapshot sequential ids and simulationId", () => {
  it("rejects id gap, duplicate, wrong prefix, 7-digit id, empty/bad simulationId", () => {
    const { config, snapshot } = buildSmallSnapshot();

    const gap = structuredClone(snapshot);
    const person1 = gap.persons[1];
    if (person1 === undefined) {
      throw new Error("person missing");
    }
    gap.persons = gap.persons.map((p, i) =>
      i === 1 ? { ...p, personId: asPersonId("person_000003") } : p,
    );
    expectValidationFailure(config, gap);

    const dup = structuredClone(snapshot);
    const p0 = dup.persons[0];
    const p1 = dup.persons[1];
    if (p0 === undefined || p1 === undefined) {
      throw new Error("persons missing");
    }
    dup.persons = dup.persons.map((p) =>
      p.personId === p1.personId ? { ...p, personId: p0.personId } : p,
    );
    expectValidationFailure(config, dup);

    const wrongPrefix = structuredClone(snapshot);
    wrongPrefix.persons = wrongPrefix.persons.map((p, i) =>
      i === 0 ? { ...p, personId: asPersonId("human_000001") } : p,
    );
    expectValidationFailure(config, wrongPrefix);

    const sevenDigit = structuredClone(snapshot);
    sevenDigit.persons = sevenDigit.persons.map((p, i) =>
      i === 0 ? { ...p, personId: asPersonId("person_0000001") } : p,
    );
    expectValidationFailure(config, sevenDigit);

    const emptySim = structuredClone(snapshot);
    emptySim.simulationId = "" as InitialWorldSnapshot["simulationId"];
    expectValidationFailure(config, emptySim);

    const badHex = structuredClone(snapshot);
    badHex.simulationId = "simulation_gggggggggggggggg" as InitialWorldSnapshot["simulationId"];
    expectValidationFailure(config, badHex);
  });
});

describe("validateInitialWorldSnapshot family/lineage/master consistency", () => {
  it("rejects familyName, founderFamilyId, focus, and qualifiedMaster lineageId issues", () => {
    const { config, snapshot } = buildSmallSnapshot();

    const familyOnly = structuredClone(snapshot);
    const family = familyOnly.families[0];
    if (family === undefined) {
      throw new Error("family missing");
    }
    familyOnly.families = familyOnly.families.map((f) =>
      f.familyId === family.familyId ? { ...f, familyName: "改変家名" } : f,
    );
    expectValidationFailure(config, familyOnly);

    const personFamilyName = structuredClone(snapshot);
    const person = personFamilyName.persons[0];
    if (person === undefined) {
      throw new Error("person missing");
    }
    personFamilyName.persons = personFamilyName.persons.map((p) =>
      p.personId === person.personId
        ? {
            ...p,
            familyName: "改変個人家名",
            displayName: config.nameData.displayFormat
              .replace("{givenName}", p.givenName)
              .replace("{familyName}", "改変個人家名"),
          }
        : p,
    );
    expectValidationFailure(config, personFamilyName);

    const dupFounder = structuredClone(snapshot);
    const lineage0 = dupFounder.lineages[0];
    const lineage1 = dupFounder.lineages[1];
    if (lineage0 === undefined || lineage1 === undefined) {
      throw new Error("lineages missing");
    }
    dupFounder.lineages = dupFounder.lineages.map((l) =>
      l.lineageId === lineage1.lineageId ? { ...l, founderFamilyId: lineage0.founderFamilyId } : l,
    );
    expectValidationFailure(config, dupFounder);

    const focusSwap = structuredClone(snapshot);
    const focusLineage = focusSwap.lineages[0];
    if (focusLineage === undefined) {
      throw new Error("lineage missing");
    }
    const founder = focusSwap.persons.find((p) => p.personId === focusLineage.founderPersonId);
    if (founder === undefined) {
      throw new Error("founder missing");
    }
    const newFocus = focusLineage.focus === "unarmed" ? "sword" : "unarmed";
    const suffix = newFocus === "unarmed" ? "体術" : newFocus === "sword" ? "剣術" : "魔術";
    focusSwap.lineages = focusSwap.lineages.map((l) =>
      l.lineageId === focusLineage.lineageId
        ? {
            ...l,
            focus: newFocus,
            lineageName: `${founder.familyName}${suffix}`,
          }
        : l,
    );
    refreshSummary(config, focusSwap);
    expectValidationFailure(config, focusSwap);

    const noLineage = structuredClone(snapshot);
    const qm = noLineage.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "retired" && p.qualifiedMaster,
    );
    if (qm === undefined || qm.lifeStatus !== "living" || qm.careerStatus !== "retired") {
      throw new Error("qualified master missing");
    }
    noLineage.persons = noLineage.persons.map((p) => {
      if (p.personId !== qm.personId || p.lifeStatus !== "living") {
        return p;
      }
      const copy: Record<string, unknown> = { ...p };
      delete copy.lineageId;
      return copy as Person;
    });
    refreshSummary(config, noLineage);
    expectValidationFailure(config, noLineage);
  });
});

describe("validateInitialWorldSnapshot malformed snapshots", () => {
  it("rejects malformed structures with InitialWorldGenerationError not TypeError", () => {
    const { config, snapshot } = buildSmallSnapshot();

    const cases: unknown[] = [
      (() => {
        const s = structuredClone(snapshot);
        const person = s.persons[0];
        if (person === undefined) {
          throw new Error("person missing");
        }
        const abilities: Record<string, unknown> = { ...person.abilities };
        delete abilities.stamina;
        s.persons = s.persons.map((p) =>
          p.personId === person.personId
            ? { ...p, abilities: abilities as Person["abilities"] }
            : p,
        );
        return s;
      })(),
      (() => {
        const s = structuredClone(snapshot);
        const person = s.persons[0];
        if (person === undefined) {
          throw new Error("person missing");
        }
        const aptitudes: Record<string, unknown> = { ...person.aptitudes };
        delete aptitudes.magic;
        s.persons = s.persons.map((p) =>
          p.personId === person.personId
            ? { ...p, aptitudes: aptitudes as Person["aptitudes"] }
            : p,
        );
        return s;
      })(),
      (() => {
        const s = structuredClone(snapshot);
        const person = s.persons[0];
        if (person === undefined) {
          throw new Error("person missing");
        }
        const stamina: Record<string, unknown> = { ...person.abilities.stamina };
        delete stamina.surfaceValue;
        s.persons = s.persons.map((p) =>
          p.personId === person.personId
            ? {
                ...p,
                abilities: {
                  ...p.abilities,
                  stamina: stamina as Person["abilities"]["stamina"],
                },
              }
            : p,
        );
        return s;
      })(),
      { ...structuredClone(snapshot), persons: "not-an-array" },
      { ...structuredClone(snapshot), generationSummary: null },
      (() => {
        const s = structuredClone(snapshot);
        const person = s.persons[0];
        if (person === undefined) {
          throw new Error("person missing");
        }
        s.persons = s.persons.map((p) => {
          if (p.personId !== person.personId) {
            return p;
          }
          const copy: Record<string, unknown> = { ...p };
          copy.sex = "other";
          return copy as Person;
        });
        return s;
      })(),
      (() => {
        const s = structuredClone(snapshot);
        const person = s.persons[0];
        if (person === undefined) {
          throw new Error("person missing");
        }
        s.persons = s.persons.map((p) => {
          if (p.personId !== person.personId) {
            return p;
          }
          const copy: Record<string, unknown> = { ...p };
          copy.careerStatus = "wizard";
          return copy as Person;
        });
        return s;
      })(),
      (() => {
        const s = structuredClone(snapshot);
        const rel = s.relationships.find((r) => r.kind === "parent_child");
        if (rel === undefined) {
          throw new Error("parent rel missing");
        }
        s.relationships = s.relationships.map((r) => {
          if (r.relationshipId !== rel.relationshipId) {
            return r;
          }
          const copy: Record<string, unknown> = { ...r };
          copy.kind = "sibling";
          return copy as Relationship;
        });
        return s;
      })(),
      (() => {
        const s = structuredClone(snapshot);
        const rel = s.relationships.find((r) => r.kind === "parent_child");
        if (rel === undefined || rel.kind !== "parent_child") {
          throw new Error("parent rel missing");
        }
        s.relationships = s.relationships.map((r) => {
          if (r.relationshipId !== rel.relationshipId || r.kind !== "parent_child") {
            return r;
          }
          const copy: Record<string, unknown> = { ...r };
          copy.parentRole = "guardian";
          return copy as Relationship;
        });
        return s;
      })(),
    ];

    for (const malformed of cases) {
      try {
        validateInitialWorldSnapshot(config, malformed);
        throw new Error("expected validation to throw");
      } catch (error) {
        expect(error).toBeInstanceOf(InitialWorldGenerationError);
        expect(error).not.toBeInstanceOf(TypeError);
      }
    }
  });
});

describe("validateInitialWorldSnapshot final audit fixes", () => {
  it("accepts baseline snapshot after toCanonicalJson round-trip", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const restored = JSON.parse(toCanonicalJson(snapshot)) as InitialWorldSnapshot;
    expect(() => validateInitialWorldSnapshot(config, restored)).not.toThrow();
  });

  it("allows generationSummary object key reordering with identical values", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const summary = snapshot.generationSummary;
    const reorderedActive = {
      S: summary.activeRanks.S,
      A: summary.activeRanks.A,
      B: summary.activeRanks.B,
      C: summary.activeRanks.C,
      D: summary.activeRanks.D,
      E: summary.activeRanks.E,
      F: summary.activeRanks.F,
    };
    const reorderedRetired = {
      S: summary.retiredRanks.S,
      A: summary.retiredRanks.A,
      B: summary.retiredRanks.B,
      C: summary.retiredRanks.C,
      D: summary.retiredRanks.D,
      E: summary.retiredRanks.E,
      F: summary.retiredRanks.F,
    };
    snapshot.generationSummary = {
      warnings: summary.warnings,
      masterCycleCount: summary.masterCycleCount,
      parentCycleCount: summary.parentCycleCount,
      selfReferenceCount: summary.selfReferenceCount,
      brokenReferenceCount: summary.brokenReferenceCount,
      formalMasterCoverage: summary.formalMasterCoverage,
      formalMasterRelationships: summary.formalMasterRelationships,
      marriagePairs: summary.marriagePairs,
      marriagePeople: summary.marriagePeople,
      twoKnownParentsAmongCovered: summary.twoKnownParentsAmongCovered,
      twoKnownParentPeople: summary.twoKnownParentPeople,
      knownParentCoverage: summary.knownParentCoverage,
      knownParentPeople: summary.knownParentPeople,
      parentRelationships: summary.parentRelationships,
      qualifiedMasters: summary.qualifiedMasters,
      lineages: summary.lineages,
      families: summary.families,
      retiredRanks: reorderedRetired,
      activeRanks: reorderedActive,
      careerStatus: summary.careerStatus,
      sex: summary.sex,
      ageBands: summary.ageBands,
      deceasedCount: summary.deceasedCount,
      livingCount: summary.livingCount,
    };
    expect(() => validateInitialWorldSnapshot(config, snapshot)).not.toThrow();
  });

  it("rejects generationSummary value changes", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    snapshot.generationSummary = {
      ...snapshot.generationSummary,
      livingCount: {
        target: snapshot.generationSummary.livingCount.target,
        actual: snapshot.generationSummary.livingCount.actual + 1,
      },
    };
    expectValidationFailure(config, snapshot);
  });

  it("rejects living persons with deathYear or ageAtDeath own properties", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const living = snapshot.persons.find((p) => p.lifeStatus === "living");
    if (living === undefined) {
      throw new Error("living missing");
    }

    const withDeathYear = structuredClone(snapshot);
    withDeathYear.persons = withDeathYear.persons.map((p) => {
      if (p.personId !== living.personId) {
        return p;
      }
      const copy: Record<string, unknown> = { ...p };
      copy.deathYear = -1;
      return copy as Person;
    });
    expectValidationFailure(config, withDeathYear);

    const withAgeAtDeath = structuredClone(snapshot);
    withAgeAtDeath.persons = withAgeAtDeath.persons.map((p) => {
      if (p.personId !== living.personId) {
        return p;
      }
      const copy: Record<string, unknown> = { ...p };
      copy.ageAtDeath = 40;
      return copy as Person;
    });
    expectValidationFailure(config, withAgeAtDeath);

    const withUndefinedDeathYear = structuredClone(snapshot);
    withUndefinedDeathYear.persons = withUndefinedDeathYear.persons.map((p) => {
      if (p.personId !== living.personId) {
        return p;
      }
      const copy: Record<string, unknown> = { ...p };
      copy.deathYear = undefined;
      return copy as Person;
    });
    expectValidationFailure(config, withUndefinedDeathYear);

    expect(() => validateInitialWorldSnapshot(config, snapshot)).not.toThrow();
  });

  it("rejects invalid configHash formats", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const invalidHashes = [
      "",
      "a",
      "a".repeat(63),
      "a".repeat(65),
      "A".repeat(64),
      "g" + "a".repeat(63),
      "sha256:" + "a".repeat(64),
    ];
    for (const configHash of invalidHashes) {
      const mutated = structuredClone(snapshot);
      mutated.configHash = configHash;
      expect(() => validateInitialWorldSnapshot(config, mutated)).toThrow(
        InitialWorldGenerationError,
      );
    }
  });

  it("rejects lineageId on living children aged 0-7 including undefined own property", () => {
    const { config, snapshot } = buildBaselineSnapshot();
    const age0 = snapshot.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "child" && p.currentAge === 0,
    );
    const age7 = snapshot.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "child" && p.currentAge === 7,
    );
    if (age0 === undefined || age7 === undefined) {
      throw new Error("age 0 or 7 child missing");
    }

    for (const target of [age0, age7]) {
      const withLineage = structuredClone(snapshot);
      withLineage.persons = withLineage.persons.map((p) => {
        if (p.personId !== target.personId) {
          return p;
        }
        const copy: Record<string, unknown> = { ...p };
        copy.lineageId = snapshot.lineages[0]?.lineageId;
        return copy as Person;
      });
      expectValidationFailure(config, withLineage);

      const withUndefinedLineage = structuredClone(snapshot);
      withUndefinedLineage.persons = withUndefinedLineage.persons.map((p) => {
        if (p.personId !== target.personId) {
          return p;
        }
        const copy: Record<string, unknown> = { ...p };
        copy.lineageId = undefined;
        return copy as Person;
      });
      expectValidationFailure(config, withUndefinedLineage);
    }

    const trainee = snapshot.persons.find(
      (p) => p.lifeStatus === "living" && p.careerStatus === "trainee" && p.currentAge === 8,
    );
    if (trainee === undefined) {
      throw new Error("age 8 trainee missing");
    }
    // Existing 8-year trainee rules remain; baseline snapshot still validates.
    expect(() => validateInitialWorldSnapshot(config, snapshot)).not.toThrow();
  });
});
