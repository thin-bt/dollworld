import type {
  Person,
  PersonId,
  Relationship,
  WorldEngineState,
} from "@shared-world/simulation-core";
import { isLivingPerson } from "@shared-world/simulation-core";
import type {
  AgeViolation,
  BrokenReferenceViolation,
  CycleViolation,
  ReferenceIntegrityResult,
  SelfReferenceViolation,
  StatusViolation,
} from "./types.js";

function isAncestor(
  ancestorId: PersonId,
  descendantId: PersonId,
  parentOf: Map<PersonId, PersonId[]>,
  visiting: Set<PersonId>,
): boolean {
  const parents = parentOf.get(descendantId);
  if (parents === undefined) {
    return false;
  }
  for (const parentId of parents) {
    if (parentId === ancestorId) {
      return true;
    }
    if (visiting.has(parentId)) {
      continue;
    }
    visiting.add(parentId);
    if (isAncestor(ancestorId, parentId, parentOf, visiting)) {
      return true;
    }
    visiting.delete(parentId);
  }
  return false;
}

function collectBrokenReferences(state: WorldEngineState): BrokenReferenceViolation[] {
  const personIds = new Set(state.persons.map((p) => p.personId));
  const familyIds = new Set(state.families.map((f) => f.familyId));
  const lineageIds = new Set(state.lineages.map((l) => l.lineageId));
  const violations: BrokenReferenceViolation[] = [];

  for (const person of state.persons) {
    if (!familyIds.has(person.familyId)) {
      violations.push({
        targetIds: [person.personId, person.familyId],
        reason: "person.familyId does not exist",
        severity: "error",
      });
    }
    if (person.lineageId !== undefined && !lineageIds.has(person.lineageId)) {
      violations.push({
        targetIds: [person.personId, person.lineageId],
        reason: "person.lineageId does not exist",
        severity: "error",
      });
    }
  }

  for (const lineage of state.lineages) {
    if (!personIds.has(lineage.founderPersonId)) {
      violations.push({
        targetIds: [lineage.lineageId, lineage.founderPersonId],
        reason: "lineage.founderPersonId does not exist",
        severity: "error",
      });
    }
    if (!familyIds.has(lineage.founderFamilyId)) {
      violations.push({
        targetIds: [lineage.lineageId, lineage.founderFamilyId],
        reason: "lineage.founderFamilyId does not exist",
        severity: "error",
      });
    }
  }

  for (const rel of state.relationships) {
    if (rel.kind === "parent_child") {
      if (!personIds.has(rel.parentId) || !personIds.has(rel.childId)) {
        violations.push({
          targetIds: [rel.relationshipId, rel.parentId, rel.childId],
          reason: "parent_child person reference does not exist",
          severity: "error",
        });
      }
    } else if (rel.kind === "marriage") {
      if (!personIds.has(rel.personAId) || !personIds.has(rel.personBId)) {
        violations.push({
          targetIds: [rel.relationshipId, rel.personAId, rel.personBId],
          reason: "marriage person reference does not exist",
          severity: "error",
        });
      }
    } else if (!personIds.has(rel.masterId) || !personIds.has(rel.discipleId)) {
      violations.push({
        targetIds: [rel.relationshipId, rel.masterId, rel.discipleId],
        reason: "master_disciple person reference does not exist",
        severity: "error",
      });
    }
  }

  return violations;
}

function collectSelfReferences(relationships: readonly Relationship[]): SelfReferenceViolation[] {
  const violations: SelfReferenceViolation[] = [];
  for (const rel of relationships) {
    if (rel.kind === "parent_child" && rel.parentId === rel.childId) {
      violations.push({
        relationshipId: rel.relationshipId,
        personIds: [rel.parentId],
        reason: "parent_child self-reference (parentId=childId)",
        severity: "error",
      });
    } else if (rel.kind === "marriage" && rel.personAId === rel.personBId) {
      violations.push({
        relationshipId: rel.relationshipId,
        personIds: [rel.personAId],
        reason: "marriage self-reference (personAId=personBId)",
        severity: "error",
      });
    } else if (rel.kind === "master_disciple" && rel.masterId === rel.discipleId) {
      violations.push({
        relationshipId: rel.relationshipId,
        personIds: [rel.masterId],
        reason: "master_disciple self-reference (masterId=discipleId)",
        severity: "error",
      });
    }
  }
  return violations;
}

function collectParentCycles(relationships: readonly Relationship[]): CycleViolation[] {
  const parentOf = new Map<PersonId, PersonId[]>();
  const parentRels = relationships.filter(
    (r) => r.kind === "parent_child" && r.parentId !== r.childId,
  );
  for (const rel of parentRels) {
    if (rel.kind !== "parent_child") {
      continue;
    }
    const list = parentOf.get(rel.childId);
    if (list === undefined) {
      parentOf.set(rel.childId, [rel.parentId]);
    } else {
      list.push(rel.parentId);
    }
  }

  const cycles: CycleViolation[] = [];
  for (const rel of parentRels) {
    if (rel.kind !== "parent_child") {
      continue;
    }
    if (isAncestor(rel.childId, rel.parentId, parentOf, new Set())) {
      cycles.push({
        kind: "parent_child",
        targetIds: [rel.relationshipId, rel.parentId, rel.childId],
        reason: "parent_child cycle detected",
        severity: "error",
      });
    }
  }
  return cycles;
}

function collectMasterCycles(relationships: readonly Relationship[]): CycleViolation[] {
  const masterOf = new Map<PersonId, PersonId>();
  const masterRels = relationships.filter(
    (r) => r.kind === "master_disciple" && r.masterId !== r.discipleId,
  );
  for (const rel of masterRels) {
    if (rel.kind === "master_disciple") {
      masterOf.set(rel.discipleId, rel.masterId);
    }
  }

  const cycles: CycleViolation[] = [];
  for (const rel of masterRels) {
    if (rel.kind !== "master_disciple") {
      continue;
    }
    const visited = new Set<PersonId>();
    let current: PersonId | undefined = rel.masterId;
    while (current !== undefined) {
      if (current === rel.discipleId) {
        cycles.push({
          kind: "master_disciple",
          targetIds: [rel.relationshipId, rel.masterId, rel.discipleId],
          reason: "master_disciple cycle detected",
          severity: "error",
        });
        break;
      }
      if (visited.has(current)) {
        break;
      }
      visited.add(current);
      current = masterOf.get(current);
    }
  }
  return cycles;
}

function collectAgeViolations(persons: readonly Person[], worldYear: number): AgeViolation[] {
  const violations: AgeViolation[] = [];
  for (const person of persons) {
    if (!isLivingPerson(person)) {
      continue;
    }
    const expectedAge = worldYear - person.birthYear;
    if (person.currentAge !== expectedAge) {
      violations.push({
        personId: person.personId,
        reason: `currentAge ${String(person.currentAge)} does not match worldYear-birthYear ${String(expectedAge)}`,
        severity: "error",
      });
    }
    if (person.currentAge >= 42 && person.careerStatus !== "retired") {
      violations.push({
        personId: person.personId,
        reason: "living person aged 42+ must be retired",
        severity: "error",
      });
    }
    if (person.currentAge < 16 && person.careerStatus === "active_competitor") {
      violations.push({
        personId: person.personId,
        reason: "person under 16 must not be active_competitor",
        severity: "error",
      });
    }
  }
  return violations;
}

function collectStatusViolations(persons: readonly Person[]): StatusViolation[] {
  const violations: StatusViolation[] = [];
  for (const person of persons) {
    if (!isLivingPerson(person)) {
      continue;
    }
    if (person.careerStatus === "retired") {
      const retired = person;
      if ("currentRank" in retired && retired.currentRank !== undefined) {
        violations.push({
          personId: retired.personId,
          reason: "retired person must not have currentRank",
          severity: "error",
        });
      }
    } else if (person.careerStatus === "child" || person.careerStatus === "trainee") {
      const nonRanked = person;
      if ("currentRank" in nonRanked && nonRanked.currentRank !== undefined) {
        violations.push({
          personId: nonRanked.personId,
          reason: `${nonRanked.careerStatus} must not have currentRank`,
          severity: "error",
        });
      }
    }
  }
  return violations;
}

/**
 * Evaluate reference integrity and selected domain invariants for a world state.
 * Broken references and cycles are always failures.
 */
export function evaluateReferenceIntegrity(state: WorldEngineState): ReferenceIntegrityResult {
  const brokenReferences = collectBrokenReferences(state);
  const selfReferences = collectSelfReferences(state.relationships);
  const parentCycles = collectParentCycles(state.relationships);
  const masterCycles = collectMasterCycles(state.relationships);
  const cycles = [...parentCycles, ...masterCycles];
  const ageViolations = collectAgeViolations(state.persons, state.worldDate.year);
  const statusViolations = collectStatusViolations(state.persons);

  const invariantViolationCount =
    selfReferences.length + cycles.length + ageViolations.length + statusViolations.length;

  const passed = brokenReferences.length === 0 && invariantViolationCount === 0;

  return {
    brokenReferenceCount: brokenReferences.length,
    brokenReferences,
    selfReferenceCount: selfReferences.length,
    selfReferences,
    parentCycleCount: parentCycles.length,
    masterCycleCount: masterCycles.length,
    cycles,
    ageViolations,
    statusViolations,
    invariantViolationCount,
    passed,
  };
}
