/**
 * Relationship projection: parentPersonIds / formalMasterPersonIds / formalDisciplePersonIds.
 * (BRIDGE-044/093, TX-064; Sprint3 reverse observability via UI-005 0.2.1 exact26.)
 * All matching records; no active/current/first/latest filter.
 * Do not encode Historical whole-detail-500 generalizations here.
 */

import { compareUnicodeCodePoints } from "@shared-world/simulation-core";
import { fail, ok, type PureResult } from "./result.js";

export type RelationshipRecord =
  | {
      kind: "parent_child";
      parentId: string;
      childId: string;
    }
  | {
      kind: "master_disciple";
      masterId: string;
      discipleId: string;
    }
  | {
      kind: "marriage";
    };

export type RelationshipProjection = {
  parentPersonIds: string[];
  formalMasterPersonIds: string[];
  formalDisciplePersonIds: string[];
};

export function projectRelationships(input: {
  personId: string;
  relationships: readonly RelationshipRecord[];
}): PureResult<RelationshipProjection> {
  const parents: string[] = [];
  const masters: string[] = [];
  const disciples: string[] = [];
  const seenParent = new Set<string>();
  const seenMaster = new Set<string>();
  const seenDisciple = new Set<string>();

  for (const rel of input.relationships) {
    if (rel.kind === "parent_child") {
      if (rel.childId === input.personId) {
        if (seenParent.has(rel.parentId)) {
          return fail(`duplicate parent relationship: ${rel.parentId}`);
        }
        seenParent.add(rel.parentId);
        parents.push(rel.parentId);
      }
      continue;
    }
    if (rel.kind === "master_disciple") {
      if (rel.discipleId === input.personId) {
        if (seenMaster.has(rel.masterId)) {
          return fail(`duplicate master relationship: ${rel.masterId}`);
        }
        seenMaster.add(rel.masterId);
        masters.push(rel.masterId);
      }
      if (rel.masterId === input.personId) {
        if (seenDisciple.has(rel.discipleId)) {
          return fail(`duplicate disciple relationship: ${rel.discipleId}`);
        }
        seenDisciple.add(rel.discipleId);
        disciples.push(rel.discipleId);
      }
    }
  }

  parents.sort(compareUnicodeCodePoints);
  masters.sort(compareUnicodeCodePoints);
  disciples.sort(compareUnicodeCodePoints);
  return ok({
    parentPersonIds: parents,
    formalMasterPersonIds: masters,
    formalDisciplePersonIds: disciples,
  });
}
