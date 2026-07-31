import type { AbilityScores, AptitudeScores, StatValueTriple } from "../abilities.js";
import type { Family, Lineage, Person, Relationship } from "../domain.js";
import type {
  InitialGenerationSummary,
  TargetActualPair,
  TargetActualRate,
} from "../initial-world/types.js";
import type { WorldEngineState } from "./types.js";
import { toWorldEngineError } from "./errors.js";
import { validateWorldEngineState } from "./validate-state.js";

function cloneStatValueTriple(value: StatValueTriple): StatValueTriple {
  return {
    surfaceValue: value.surfaceValue,
    expressedGeneticValue: value.expressedGeneticValue,
    latentGeneticValue: value.latentGeneticValue,
  };
}

function cloneAbilities(value: AbilityScores): AbilityScores {
  return {
    stamina: cloneStatValueTriple(value.stamina),
    strength: cloneStatValueTriple(value.strength),
    skill: cloneStatValueTriple(value.skill),
    speed: cloneStatValueTriple(value.speed),
    spirit: cloneStatValueTriple(value.spirit),
    magic: cloneStatValueTriple(value.magic),
  };
}

function cloneAptitudes(value: AptitudeScores): AptitudeScores {
  return {
    unarmed: cloneStatValueTriple(value.unarmed),
    sword: cloneStatValueTriple(value.sword),
    magic: cloneStatValueTriple(value.magic),
  };
}

function clonePersonCore(person: Person) {
  return {
    personId: person.personId,
    givenName: person.givenName,
    familyName: person.familyName,
    displayName: person.displayName,
    nameDataVersion: person.nameDataVersion,
    sex: person.sex,
    birthYear: person.birthYear,
    familyId: person.familyId,
    abilities: cloneAbilities(person.abilities),
    aptitudes: cloneAptitudes(person.aptitudes),
  };
}

export function clonePerson(person: Person): Person {
  const core = clonePersonCore(person);

  if (person.lifeStatus === "living") {
    switch (person.careerStatus) {
      case "child":
        return {
          ...core,
          lifeStatus: "living",
          participationStatus: person.participationStatus,
          currentAge: person.currentAge,
          careerStatus: "child",
          qualifiedMaster: false,
        };
      case "trainee": {
        const next = {
          ...core,
          lifeStatus: "living" as const,
          participationStatus: person.participationStatus,
          currentAge: person.currentAge,
          careerStatus: "trainee" as const,
          qualifiedMaster: false as const,
        };
        return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
      }
      case "active_competitor": {
        const next = {
          ...core,
          lifeStatus: "living" as const,
          participationStatus: person.participationStatus,
          currentAge: person.currentAge,
          careerStatus: "active_competitor" as const,
          currentRank: person.currentRank,
          highestRank: person.highestRank,
          qualifiedMaster: false as const,
        };
        return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
      }
      case "retired": {
        const next = {
          ...core,
          lifeStatus: "living" as const,
          participationStatus: person.participationStatus,
          currentAge: person.currentAge,
          careerStatus: "retired" as const,
          retirementRank: person.retirementRank,
          highestRank: person.highestRank,
          qualifiedMaster: person.qualifiedMaster,
        };
        return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
      }
    }
  }

  switch (person.careerStatus) {
    case "child": {
      const next = {
        ...core,
        lifeStatus: "deceased" as const,
        deathYear: person.deathYear,
        ageAtDeath: person.ageAtDeath,
        careerStatus: "child" as const,
        qualifiedMaster: false as const,
      };
      return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
    }
    case "trainee": {
      const next = {
        ...core,
        lifeStatus: "deceased" as const,
        deathYear: person.deathYear,
        ageAtDeath: person.ageAtDeath,
        careerStatus: "trainee" as const,
        qualifiedMaster: false as const,
      };
      return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
    }
    case "active_competitor": {
      const next = {
        ...core,
        lifeStatus: "deceased" as const,
        deathYear: person.deathYear,
        ageAtDeath: person.ageAtDeath,
        careerStatus: "active_competitor" as const,
        highestRank: person.highestRank,
        qualifiedMaster: false as const,
      };
      return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
    }
    case "retired": {
      const next = {
        ...core,
        lifeStatus: "deceased" as const,
        deathYear: person.deathYear,
        ageAtDeath: person.ageAtDeath,
        careerStatus: "retired" as const,
        retirementRank: person.retirementRank,
        highestRank: person.highestRank,
        qualifiedMaster: person.qualifiedMaster,
      };
      return person.lineageId !== undefined ? { ...next, lineageId: person.lineageId } : next;
    }
  }
}

function cloneFamily(family: Family): Family {
  return {
    familyId: family.familyId,
    familyName: family.familyName,
    status: family.status,
    baseBirthRate: family.baseBirthRate,
    initialHistory: family.initialHistory,
  };
}

function cloneLineage(lineage: Lineage): Lineage {
  return {
    lineageId: lineage.lineageId,
    lineageName: lineage.lineageName,
    focus: lineage.focus,
    founderPersonId: lineage.founderPersonId,
    founderFamilyId: lineage.founderFamilyId,
    status: lineage.status,
  };
}

function cloneRelationship(relationship: Relationship): Relationship {
  switch (relationship.kind) {
    case "parent_child":
      return {
        relationshipId: relationship.relationshipId,
        kind: "parent_child",
        parentId: relationship.parentId,
        childId: relationship.childId,
        parentRole: relationship.parentRole,
      };
    case "marriage":
      return {
        relationshipId: relationship.relationshipId,
        kind: "marriage",
        personAId: relationship.personAId,
        personBId: relationship.personBId,
      };
    case "master_disciple":
      return {
        relationshipId: relationship.relationshipId,
        kind: "master_disciple",
        masterId: relationship.masterId,
        discipleId: relationship.discipleId,
      };
  }
}

function clonePair(pair: TargetActualPair): TargetActualPair {
  return { target: pair.target, actual: pair.actual };
}

function cloneRate(rate: TargetActualRate): TargetActualRate {
  return { target: rate.target, actual: rate.actual };
}

function cloneCareerTable(
  table: InitialGenerationSummary["careerStatus"],
): InitialGenerationSummary["careerStatus"] {
  return {
    child: clonePair(table.child),
    trainee: clonePair(table.trainee),
    active_competitor: clonePair(table.active_competitor),
    retired: clonePair(table.retired),
  };
}

function cloneRankTable(
  table: InitialGenerationSummary["activeRanks"],
): InitialGenerationSummary["activeRanks"] {
  return {
    F: clonePair(table.F),
    E: clonePair(table.E),
    D: clonePair(table.D),
    C: clonePair(table.C),
    B: clonePair(table.B),
    A: clonePair(table.A),
    S: clonePair(table.S),
  };
}

function cloneGenerationSummary(summary: InitialGenerationSummary): InitialGenerationSummary {
  return {
    livingCount: clonePair(summary.livingCount),
    deceasedCount: clonePair(summary.deceasedCount),
    ageBands: summary.ageBands.map(clonePair),
    sex: {
      male: clonePair(summary.sex.male),
      female: clonePair(summary.sex.female),
    },
    careerStatus: cloneCareerTable(summary.careerStatus),
    activeRanks: cloneRankTable(summary.activeRanks),
    retiredRanks: cloneRankTable(summary.retiredRanks),
    families: clonePair(summary.families),
    lineages: clonePair(summary.lineages),
    qualifiedMasters: clonePair(summary.qualifiedMasters),
    parentRelationships: clonePair(summary.parentRelationships),
    knownParentPeople: clonePair(summary.knownParentPeople),
    knownParentCoverage: cloneRate(summary.knownParentCoverage),
    twoKnownParentPeople: clonePair(summary.twoKnownParentPeople),
    twoKnownParentsAmongCovered: cloneRate(summary.twoKnownParentsAmongCovered),
    marriagePeople: clonePair(summary.marriagePeople),
    marriagePairs: clonePair(summary.marriagePairs),
    formalMasterRelationships: clonePair(summary.formalMasterRelationships),
    formalMasterCoverage: cloneRate(summary.formalMasterCoverage),
    brokenReferenceCount: summary.brokenReferenceCount,
    selfReferenceCount: summary.selfReferenceCount,
    parentCycleCount: summary.parentCycleCount,
    masterCycleCount: summary.masterCycleCount,
    warnings: [...summary.warnings],
  };
}

/** Fast clone for already-validated WorldEngineState (no re-validation). */
export function cloneWorldEngineStateUnchecked(state: WorldEngineState): WorldEngineState {
  return {
    schemaVersion: state.schemaVersion,
    simulationSpecVersion: state.simulationSpecVersion,
    nameDataVersion: state.nameDataVersion,
    simulationId: state.simulationId,
    worldId: state.worldId,
    worldDate: {
      year: state.worldDate.year,
      month: state.worldDate.month,
      weekOfMonth: state.worldDate.weekOfMonth,
      absoluteWeek: state.worldDate.absoluteWeek,
    },
    configProfileId: state.configProfileId,
    configHash: state.configHash,
    seed: state.seed,
    rngAlgorithm: state.rngAlgorithm,
    persons: state.persons.map(clonePerson),
    families: state.families.map(cloneFamily),
    lineages: state.lineages.map(cloneLineage),
    relationships: state.relationships.map(cloneRelationship),
    generationSummary: cloneGenerationSummary(state.generationSummary),
  };
}

/** Public clone: validates unknown input, deep-clones, then re-validates. */
export function cloneWorldEngineState(state: unknown): WorldEngineState {
  try {
    validateWorldEngineState(state);
    const cloned = cloneWorldEngineStateUnchecked(state);
    validateWorldEngineState(cloned);
    return cloned;
  } catch (error) {
    throw toWorldEngineError(error, "cloneWorldEngineState failed", { field: "state" });
  }
}
