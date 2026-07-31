import type { InitialWorldConfig } from "../config/types.js";
import type { PersonId } from "../ids.js";
import type { SeededRng } from "../rng.js";
import { deriveSeed } from "../rng.js";
import { RNG_LABELS } from "./constants.js";
import type { InitialWorldDraftState, ParentRelationshipDraft, PersonDraft } from "./draft.js";
import { livingDrafts } from "./draft.js";
import { isAncestor } from "./kinship.js";

/** Age of parent at child's birth year (birthYear difference; never ageAtDeath). */
function ageAtChildbirth(parent: PersonDraft, child: PersonDraft): number {
  return child.birthYear - parent.birthYear;
}

function isValidParentCandidate(
  parent: PersonDraft,
  child: PersonDraft,
  role: "father" | "mother",
  minParentAge: number,
): boolean {
  if (parent.personId === child.personId) {
    return false;
  }
  if (parent.sex !== (role === "father" ? "male" : "female")) {
    return false;
  }
  if (ageAtChildbirth(parent, child) < minParentAge) {
    return false;
  }
  if (parent.lifeStatus === "deceased") {
    if (parent.deathYear === undefined || parent.deathYear < child.birthYear) {
      return false;
    }
  }
  return true;
}

function parentsOf(
  childId: PersonId,
  relationships: readonly ParentRelationshipDraft[],
): PersonId[] {
  return relationships.filter((r) => r.childId === childId).map((r) => r.parentId);
}

function ancestorDepth(
  personId: PersonId,
  relationships: readonly ParentRelationshipDraft[],
  visiting: Set<PersonId> = new Set(),
): number {
  if (visiting.has(personId)) {
    return Number.POSITIVE_INFINITY;
  }
  visiting.add(personId);
  const parents = parentsOf(personId, relationships);
  if (parents.length === 0) {
    visiting.delete(personId);
    return 0;
  }
  let maxDepth = 0;
  for (const parentId of parents) {
    const depth = ancestorDepth(parentId, relationships, visiting);
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  }
  visiting.delete(personId);
  return 1 + maxDepth;
}

function descendantsOf(
  personId: PersonId,
  relationships: readonly ParentRelationshipDraft[],
): PersonId[] {
  const children = relationships.filter((r) => r.parentId === personId).map((r) => r.childId);
  const result: PersonId[] = [];
  for (const childId of children) {
    result.push(childId);
    result.push(...descendantsOf(childId, relationships));
  }
  return result;
}

function wouldViolateDepthOrCycle(
  parentId: PersonId,
  childId: PersonId,
  relationships: readonly ParentRelationshipDraft[],
  maximumGenerationDepth: number,
): boolean {
  if (parentId === childId) {
    return true;
  }
  if (isAncestor(childId, parentId, relationships)) {
    return true;
  }
  const tentative: ParentRelationshipDraft[] = [
    ...relationships,
    { parentId, childId, parentRole: "father" },
  ];
  const affected = [childId, ...descendantsOf(childId, relationships)];
  for (const id of affected) {
    if (ancestorDepth(id, tentative) > maximumGenerationDepth) {
      return true;
    }
  }
  return false;
}

function pickParent(
  persons: PersonDraft[],
  child: PersonDraft,
  role: "father" | "mother",
  minParentAge: number,
  maximumGenerationDepth: number,
  existing: readonly ParentRelationshipDraft[],
  rng: SeededRng,
  excludeIds: ReadonlySet<PersonId>,
): PersonId | undefined {
  const candidates = persons
    .filter(
      (p) => !excludeIds.has(p.personId) && isValidParentCandidate(p, child, role, minParentAge),
    )
    .map((p) => p.personId)
    .sort((a, b) => a.localeCompare(b));

  const shuffled = rng.shuffle(candidates);
  for (const parentId of shuffled) {
    if (!wouldViolateDepthOrCycle(parentId, child.personId, existing, maximumGenerationDepth)) {
      return parentId;
    }
  }
  return undefined;
}

export function generateParentRelationships(
  state: InitialWorldDraftState,
  config: InitialWorldConfig,
  seed: number,
  rngFactory: (seed: number) => SeededRng,
): void {
  if (!config.history.createExistingRelationships) {
    state.parentRelationships = [];
    return;
  }

  const parentRng = rngFactory(deriveSeed(seed, RNG_LABELS.relationshipsParent));
  const living = livingDrafts(state);
  const totalLiving = living.length;
  const coveredTarget = Math.floor(totalLiving * config.relationships.knownParentCoverage);
  const twoParentTarget = Math.floor(
    coveredTarget * config.relationships.twoKnownParentsCoverageAmongCovered,
  );
  const oneParentTarget = coveredTarget - twoParentTarget;

  const childIdsSorted = living.map((p) => p.personId).sort((a, b) => a.localeCompare(b));
  const shuffledChildren = parentRng.shuffle(childIdsSorted);
  const twoParentChildren = [...shuffledChildren.slice(0, twoParentTarget)].sort((a, b) =>
    a.localeCompare(b),
  );
  const oneParentChildren = [
    ...shuffledChildren.slice(twoParentTarget, twoParentTarget + oneParentTarget),
  ].sort((a, b) => a.localeCompare(b));

  const relationships: ParentRelationshipDraft[] = [];
  const minParentAge = config.relationships.minimumParentAgeAtChildbirth;
  const maxDepth = config.history.maximumGenerationDepth;

  let actualTwoParent = 0;
  let actualOneParent = 0;

  for (const childId of twoParentChildren) {
    const child = state.persons.find((p) => p.personId === childId)!;
    const father = pickParent(
      state.persons,
      child,
      "father",
      minParentAge,
      maxDepth,
      relationships,
      parentRng,
      new Set(),
    );
    if (father === undefined) {
      state.warnings.push(
        `skipped two-parent assignment for ${childId}: insufficient father candidates`,
      );
      continue;
    }
    const withFather: ParentRelationshipDraft[] = [
      ...relationships,
      { parentId: father, childId, parentRole: "father" },
    ];
    const mother = pickParent(
      state.persons,
      child,
      "mother",
      minParentAge,
      maxDepth,
      withFather,
      parentRng,
      new Set([father]),
    );
    if (mother === undefined) {
      state.warnings.push(
        `skipped two-parent assignment for ${childId}: insufficient mother candidates`,
      );
      continue;
    }
    relationships.push({ parentId: father, childId, parentRole: "father" });
    relationships.push({ parentId: mother, childId, parentRole: "mother" });
    actualTwoParent += 1;
  }

  for (const childId of oneParentChildren) {
    const child = state.persons.find((p) => p.personId === childId)!;
    const roles = parentRng.shuffle(["father", "mother"] as const);
    let chosen: { role: "father" | "mother"; parentId: PersonId } | undefined;
    for (const role of roles) {
      const parentId = pickParent(
        state.persons,
        child,
        role,
        minParentAge,
        maxDepth,
        relationships,
        parentRng,
        new Set(),
      );
      if (parentId !== undefined) {
        chosen = { role, parentId };
        break;
      }
    }
    if (chosen === undefined) {
      state.warnings.push(
        `skipped one-parent assignment for ${childId}: insufficient parent candidates`,
      );
      continue;
    }
    relationships.push({
      parentId: chosen.parentId,
      childId,
      parentRole: chosen.role,
    });
    actualOneParent += 1;
  }

  if (actualTwoParent < twoParentTarget || actualOneParent < oneParentTarget) {
    state.warnings.push(
      `parent coverage below target: two-parent ${String(actualTwoParent)}/${String(twoParentTarget)}, one-parent ${String(actualOneParent)}/${String(oneParentTarget)}`,
    );
  }

  state.parentRelationships = relationships;
}

export function roundDownToEven(value: number): number {
  return value - (value % 2);
}
