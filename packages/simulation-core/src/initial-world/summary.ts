import type { InitialWorldConfig } from "../config/types.js";
import { allocateByLargestRemainder } from "../config/validate-config.js";
import type { Person, Relationship, Family, Lineage } from "../domain.js";
import { RANK_ORDER, type CareerStatus, type Rank } from "../enums.js";
import { computeCurrentAge } from "../age-status.js";
import type { InitialGenerationSummary, InitialWorldValidationSummary } from "./types.js";
import {
  buildParentMaps,
  countMasterCycles,
  countParentCycles,
  isMarriageProhibited,
} from "./kinship.js";
import { roundDownToEven } from "./relationships-parents.js";

const CURRENT_WORLD_YEAR = 1;

function countByCareer(persons: readonly Person[]): Record<CareerStatus, number> {
  const counts: Record<CareerStatus, number> = {
    child: 0,
    trainee: 0,
    active_competitor: 0,
    retired: 0,
  };
  for (const person of persons) {
    counts[person.careerStatus] += 1;
  }
  return counts;
}

function countActiveRanks(persons: readonly Person[]): Record<Rank, number> {
  const counts = Object.fromEntries(RANK_ORDER.map((rank) => [rank, 0])) as Record<Rank, number>;
  for (const person of persons) {
    if (person.lifeStatus === "living" && person.careerStatus === "active_competitor") {
      counts[person.currentRank] += 1;
    }
  }
  return counts;
}

function countRetiredRanks(persons: readonly Person[]): Record<Rank, number> {
  const counts = Object.fromEntries(RANK_ORDER.map((rank) => [rank, 0])) as Record<Rank, number>;
  for (const person of persons) {
    if (
      person.lifeStatus === "living" &&
      person.careerStatus === "retired" &&
      person.retirementRank
    ) {
      counts[person.retirementRank] += 1;
    }
  }
  return counts;
}

function ageBandCount(config: InitialWorldConfig, minAge: number, maxAge: number): number {
  return config.population.ageBands
    .filter((band) => band.minAge >= minAge && band.maxAge <= maxAge)
    .reduce((sum, band) => sum + band.count, 0);
}

function countBrokenReferences(
  persons: readonly Person[],
  families: readonly Family[],
  lineages: readonly Lineage[],
  relationships: readonly Relationship[],
): number {
  const personIds = new Set(persons.map((p) => p.personId));
  const familyIds = new Set(families.map((f) => f.familyId));
  const lineageIds = new Set(lineages.map((l) => l.lineageId));
  let broken = 0;

  for (const person of persons) {
    if (!familyIds.has(person.familyId)) {
      broken += 1;
    }
    if (person.lineageId !== undefined && !lineageIds.has(person.lineageId)) {
      broken += 1;
    }
  }

  for (const lineage of lineages) {
    if (!personIds.has(lineage.founderPersonId)) {
      broken += 1;
    }
    if (!familyIds.has(lineage.founderFamilyId)) {
      broken += 1;
    }
  }

  for (const rel of relationships) {
    if (rel.kind === "parent_child") {
      if (!personIds.has(rel.parentId) || !personIds.has(rel.childId)) {
        broken += 1;
      }
    } else if (rel.kind === "marriage") {
      if (!personIds.has(rel.personAId) || !personIds.has(rel.personBId)) {
        broken += 1;
      }
    } else if (!personIds.has(rel.masterId) || !personIds.has(rel.discipleId)) {
      broken += 1;
    }
  }

  return broken;
}

function countSelfReferences(relationships: readonly Relationship[]): number {
  let count = 0;
  for (const rel of relationships) {
    if (rel.kind === "parent_child" && rel.parentId === rel.childId) {
      count += 1;
    } else if (rel.kind === "marriage" && rel.personAId === rel.personBId) {
      count += 1;
    } else if (rel.kind === "master_disciple" && rel.masterId === rel.discipleId) {
      count += 1;
    }
  }
  return count;
}

export function computeSexTargets(config: InitialWorldConfig): { male: number; female: number } {
  const sexRatio = config.population.sexRatioMale;
  let maleLiving = 0;
  for (const band of config.population.ageBands) {
    maleLiving += Math.floor(band.count * sexRatio);
  }
  const maleDeceased = Math.floor(config.history.initialDeceasedAncestors * sexRatio);
  const maleTarget = maleLiving + maleDeceased;
  const totalPersons = config.population.totalLiving + config.history.initialDeceasedAncestors;
  return { male: maleTarget, female: totalPersons - maleTarget };
}

export function buildGenerationSummary(
  config: InitialWorldConfig,
  persons: readonly Person[],
  families: readonly Family[],
  lineages: readonly Lineage[],
  relationships: readonly Relationship[],
  warnings: readonly string[],
): InitialGenerationSummary {
  const living = persons.filter((p) => p.lifeStatus === "living");
  const deceased = persons.filter((p) => p.lifeStatus === "deceased");
  const parentRels = relationships.filter((r) => r.kind === "parent_child");
  const parentDrafts = parentRels.map((r) => ({
    parentId: r.parentId,
    childId: r.childId,
    parentRole: r.parentRole,
  }));

  const livingWithKnownParent = new Set<string>();
  for (const rel of parentRels) {
    if (living.some((p) => p.personId === rel.childId)) {
      livingWithKnownParent.add(rel.childId);
    }
  }

  const livingWithTwoParents = living.filter((child) => {
    const parents = parentRels.filter((r) => r.childId === child.personId);
    return parents.length >= 2;
  });

  const childTarget = ageBandCount(config, 0, 7);
  const traineeTarget = ageBandCount(config, 8, 15);
  const activeTarget = ageBandCount(config, 16, 41);
  const livingRetiredTarget = ageBandCount(config, 42, 70);
  const retiredTarget = livingRetiredTarget + config.history.initialDeceasedAncestors;

  const retiredRankTargets = allocateByLargestRemainder(
    config.population.activeRankDistribution,
    livingRetiredTarget,
  );

  const sexTargets = computeSexTargets(config);
  const createRels = config.history.createExistingRelationships;

  const coveredTarget = createRels
    ? Math.floor(config.population.totalLiving * config.relationships.knownParentCoverage)
    : 0;
  const twoParentTarget = createRels
    ? Math.floor(coveredTarget * config.relationships.twoKnownParentsCoverageAmongCovered)
    : 0;
  const parentLinkTarget = createRels ? coveredTarget + twoParentTarget : 0;

  const marriagePeopleTarget = createRels
    ? roundDownToEven(Math.floor(livingRetiredTarget * config.relationships.retiredSpouseCoverage))
    : 0;
  const marriagePairsTarget = marriagePeopleTarget / 2;
  const marriagePairs = relationships.filter((r) => r.kind === "marriage");
  const masterRels = relationships.filter((r) => r.kind === "master_disciple");

  const disciplePoolActual = living.filter((p) => p.currentAge >= 8 && p.currentAge <= 41).length;
  const disciplePoolTarget = ageBandCount(config, 8, 15) + ageBandCount(config, 16, 41);
  const formalMasterTarget = createRels
    ? Math.floor(disciplePoolTarget * config.relationships.formalMasterCoverageAge8To41)
    : 0;

  const disciplesWithMaster = new Set(masterRels.map((r) => r.discipleId)).size;

  const knownParentPeopleActual = livingWithKnownParent.size;
  const twoKnownParentPeopleActual = livingWithTwoParents.length;
  const parentRelationshipsActual = parentRels.length;

  const marriagePersonIds = new Set<string>();
  for (const rel of marriagePairs) {
    marriagePersonIds.add(rel.personAId);
    marriagePersonIds.add(rel.personBId);
  }
  const marriagePeopleActual = marriagePersonIds.size;
  const marriagePairsActual = marriagePairs.length;
  const formalMasterRelationshipsActual = masterRels.length;

  const knownParentCoverageActual = living.length > 0 ? knownParentPeopleActual / living.length : 0;
  const twoKnownParentsAmongCoveredActual =
    knownParentPeopleActual > 0 ? twoKnownParentPeopleActual / knownParentPeopleActual : 0;
  const formalMasterCoverageActual =
    disciplePoolActual > 0 ? disciplesWithMaster / disciplePoolActual : 0;

  const careerCounts = countByCareer(persons);
  const activeRankCounts = countActiveRanks(persons);
  const retiredRankCounts = countRetiredRanks(persons);

  const ageBandTargets = config.population.ageBands.map((band) => ({
    target: band.count,
    actual: living.filter((p) => p.currentAge >= band.minAge && p.currentAge <= band.maxAge).length,
  }));

  return {
    livingCount: { target: config.population.totalLiving, actual: living.length },
    deceasedCount: {
      target: config.history.initialDeceasedAncestors,
      actual: deceased.length,
    },
    ageBands: ageBandTargets,
    sex: {
      male: {
        target: sexTargets.male,
        actual: persons.filter((p) => p.sex === "male").length,
      },
      female: {
        target: sexTargets.female,
        actual: persons.filter((p) => p.sex === "female").length,
      },
    },
    careerStatus: {
      child: { target: childTarget, actual: careerCounts.child },
      trainee: { target: traineeTarget, actual: careerCounts.trainee },
      active_competitor: { target: activeTarget, actual: careerCounts.active_competitor },
      retired: { target: retiredTarget, actual: careerCounts.retired },
    },
    activeRanks: Object.fromEntries(
      RANK_ORDER.map((rank) => [
        rank,
        {
          target: config.population.activeRankDistribution[rank],
          actual: activeRankCounts[rank],
        },
      ]),
    ) as InitialGenerationSummary["activeRanks"],
    retiredRanks: Object.fromEntries(
      RANK_ORDER.map((rank) => [
        rank,
        { target: retiredRankTargets[rank], actual: retiredRankCounts[rank] },
      ]),
    ) as InitialGenerationSummary["retiredRanks"],
    families: { target: config.families.initialFamilyCount, actual: families.length },
    lineages: { target: config.lineages.initialLineageCount, actual: lineages.length },
    qualifiedMasters: {
      target: config.lineages.initialQualifiedMasters,
      actual: living.filter((p) => p.careerStatus === "retired" && p.qualifiedMaster).length,
    },
    parentRelationships: {
      target: parentLinkTarget,
      actual: parentRelationshipsActual,
    },
    knownParentPeople: {
      target: coveredTarget,
      actual: knownParentPeopleActual,
    },
    knownParentCoverage: {
      target: createRels ? config.relationships.knownParentCoverage : 0,
      actual: knownParentCoverageActual,
    },
    twoKnownParentPeople: {
      target: twoParentTarget,
      actual: twoKnownParentPeopleActual,
    },
    twoKnownParentsAmongCovered: {
      target: createRels ? config.relationships.twoKnownParentsCoverageAmongCovered : 0,
      actual: twoKnownParentsAmongCoveredActual,
    },
    marriagePeople: {
      target: marriagePeopleTarget,
      actual: marriagePeopleActual,
    },
    marriagePairs: { target: marriagePairsTarget, actual: marriagePairsActual },
    formalMasterRelationships: {
      target: formalMasterTarget,
      actual: formalMasterRelationshipsActual,
    },
    formalMasterCoverage: {
      target: createRels ? config.relationships.formalMasterCoverageAge8To41 : 0,
      actual: formalMasterCoverageActual,
    },
    brokenReferenceCount: countBrokenReferences(persons, families, lineages, relationships),
    selfReferenceCount: countSelfReferences(relationships),
    parentCycleCount: countParentCycles(parentDrafts),
    masterCycleCount: countMasterCycles(
      masterRels.map((r) => ({ masterId: r.masterId, discipleId: r.discipleId })),
    ),
    warnings: [...warnings],
  };
}

export function buildValidationSummary(
  summary: InitialGenerationSummary,
): InitialWorldValidationSummary {
  return {
    passed:
      summary.brokenReferenceCount === 0 &&
      summary.selfReferenceCount === 0 &&
      summary.parentCycleCount === 0 &&
      summary.masterCycleCount === 0,
    brokenReferenceCount: summary.brokenReferenceCount,
    selfReferenceCount: summary.selfReferenceCount,
    parentCycleCount: summary.parentCycleCount,
    masterCycleCount: summary.masterCycleCount,
    warnings: summary.warnings,
  };
}

export function validateMarriageProhibitions(relationships: readonly Relationship[]): number {
  const parentRels = relationships
    .filter((r) => r.kind === "parent_child")
    .map((r) => ({
      parentId: r.parentId,
      childId: r.childId,
      parentRole: r.parentRole,
    }));
  const maps = buildParentMaps(parentRels);
  let violations = 0;
  for (const rel of relationships) {
    if (rel.kind !== "marriage") {
      continue;
    }
    if (isMarriageProhibited(rel.personAId, rel.personBId, parentRels, maps)) {
      violations += 1;
    }
  }
  return violations;
}

export function validatePersonAges(persons: readonly Person[]): void {
  for (const person of persons) {
    if (person.lifeStatus === "living") {
      const age = computeCurrentAge(CURRENT_WORLD_YEAR, person.birthYear);
      if (age !== person.currentAge) {
        throw new Error(
          `currentAge mismatch for ${person.personId}: expected ${String(age)}, got ${String(person.currentAge)}`,
        );
      }
    } else if (person.ageAtDeath !== person.deathYear - person.birthYear) {
      throw new Error(`ageAtDeath mismatch for ${person.personId}`);
    }
  }
}
