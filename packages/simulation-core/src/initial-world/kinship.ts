import type { PersonId } from "../ids.js";
import type { ParentRelationshipDraft } from "./draft.js";

export type ParentMaps = {
  fathers: Map<PersonId, PersonId>;
  mothers: Map<PersonId, PersonId>;
  children: Map<PersonId, PersonId[]>;
  siblings: Map<PersonId, Set<PersonId>>;
};

export function buildParentMaps(relationships: readonly ParentRelationshipDraft[]): ParentMaps {
  const fathers = new Map<PersonId, PersonId>();
  const mothers = new Map<PersonId, PersonId>();
  const children = new Map<PersonId, PersonId[]>();

  for (const rel of relationships) {
    if (rel.parentRole === "father") {
      fathers.set(rel.childId, rel.parentId);
    } else {
      mothers.set(rel.childId, rel.parentId);
    }
    const list = children.get(rel.parentId) ?? [];
    list.push(rel.childId);
    children.set(rel.parentId, list);
  }

  const siblings = new Map<PersonId, Set<PersonId>>();
  const childToParents = new Map<PersonId, PersonId[]>();
  for (const rel of relationships) {
    const parents = childToParents.get(rel.childId) ?? [];
    parents.push(rel.parentId);
    childToParents.set(rel.childId, parents);
  }

  for (const [childId, parents] of childToParents) {
    for (const parentId of parents) {
      const sibs = children.get(parentId) ?? [];
      for (const sib of sibs) {
        if (sib === childId) {
          continue;
        }
        const set = siblings.get(childId) ?? new Set<PersonId>();
        set.add(sib);
        siblings.set(childId, set);
        const reverse = siblings.get(sib) ?? new Set<PersonId>();
        reverse.add(childId);
        siblings.set(sib, reverse);
      }
    }
  }

  return { fathers, mothers, children, siblings };
}

export function isAncestor(
  ancestorId: PersonId,
  descendantId: PersonId,
  parentRels: readonly ParentRelationshipDraft[],
): boolean {
  const parentOf = new Map<PersonId, PersonId[]>();
  for (const rel of parentRels) {
    const list = parentOf.get(rel.childId) ?? [];
    list.push(rel.parentId);
    parentOf.set(rel.childId, list);
  }

  const visited = new Set<PersonId>();
  const stack = [descendantId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === ancestorId) {
      return true;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    const parents = parentOf.get(current) ?? [];
    for (const parent of parents) {
      stack.push(parent);
    }
  }
  return false;
}

export function areSiblings(a: PersonId, b: PersonId, maps: ParentMaps): boolean {
  return maps.siblings.get(a)?.has(b) ?? false;
}

export function isAuntUncleOf(
  auntUncle: PersonId,
  nieceNephew: PersonId,
  maps: ParentMaps,
): boolean {
  const parents = [maps.fathers.get(nieceNephew), maps.mothers.get(nieceNephew)].filter(
    (id): id is PersonId => id !== undefined,
  );

  for (const parent of parents) {
    const auntsUncles = maps.siblings.get(parent) ?? new Set<PersonId>();
    if (auntsUncles.has(auntUncle)) {
      return true;
    }
  }
  return false;
}

export function isMarriageProhibited(
  a: PersonId,
  b: PersonId,
  parentRels: readonly ParentRelationshipDraft[],
  maps: ParentMaps,
): boolean {
  if (a === b) {
    return true;
  }
  if (isAncestor(a, b, parentRels) || isAncestor(b, a, parentRels)) {
    return true;
  }
  if (areSiblings(a, b, maps)) {
    return true;
  }
  if (isAuntUncleOf(a, b, maps) || isAuntUncleOf(b, a, maps)) {
    return true;
  }
  return false;
}

export function countParentCycles(parentRels: readonly ParentRelationshipDraft[]): number {
  let cycles = 0;
  for (const rel of parentRels) {
    if (isAncestor(rel.childId, rel.parentId, parentRels)) {
      cycles += 1;
    }
  }
  return cycles;
}

export function countMasterCycles(
  masterRels: readonly { masterId: PersonId; discipleId: PersonId }[],
): number {
  const masterOf = new Map<PersonId, PersonId>();
  for (const rel of masterRels) {
    masterOf.set(rel.discipleId, rel.masterId);
  }

  let cycles = 0;
  for (const rel of masterRels) {
    const visited = new Set<PersonId>();
    let current: PersonId | undefined = rel.masterId;
    while (current !== undefined) {
      if (current === rel.discipleId) {
        cycles += 1;
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
