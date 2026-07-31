import type {
  MarriageRelationship,
  MasterDiscipleRelationship,
  ParentChildRelationship,
  Relationship,
} from "../domain.js";
import { formatRelationshipId } from "./ids.js";
import type { InitialWorldDraftState } from "./draft.js";

export function assembleRelationships(state: InitialWorldDraftState): Relationship[] {
  const parentSorted = [...state.parentRelationships].sort((a, b) => {
    const childCompare = a.childId.localeCompare(b.childId);
    if (childCompare !== 0) {
      return childCompare;
    }
    if (a.parentRole === b.parentRole) {
      return a.parentId.localeCompare(b.parentId);
    }
    return a.parentRole === "father" ? -1 : 1;
  });

  const marriageSorted = [...state.marriageRelationships].sort((a, b) => {
    const aCompare = a.personAId.localeCompare(b.personAId);
    if (aCompare !== 0) {
      return aCompare;
    }
    return a.personBId.localeCompare(b.personBId);
  });

  const masterSorted = [...state.masterRelationships].sort((a, b) => {
    const discipleCompare = a.discipleId.localeCompare(b.discipleId);
    if (discipleCompare !== 0) {
      return discipleCompare;
    }
    return a.masterId.localeCompare(b.masterId);
  });

  const relationships: Relationship[] = [];
  let id = 1;

  for (const rel of parentSorted) {
    const relationship: ParentChildRelationship = {
      relationshipId: formatRelationshipId(id),
      kind: "parent_child",
      parentId: rel.parentId,
      childId: rel.childId,
      parentRole: rel.parentRole,
    };
    relationships.push(relationship);
    id += 1;
  }

  for (const rel of marriageSorted) {
    const relationship: MarriageRelationship = {
      relationshipId: formatRelationshipId(id),
      kind: "marriage",
      personAId: rel.personAId,
      personBId: rel.personBId,
    };
    relationships.push(relationship);
    id += 1;
  }

  for (const rel of masterSorted) {
    const relationship: MasterDiscipleRelationship = {
      relationshipId: formatRelationshipId(id),
      kind: "master_disciple",
      masterId: rel.masterId,
      discipleId: rel.discipleId,
    };
    relationships.push(relationship);
    id += 1;
  }

  return relationships;
}
