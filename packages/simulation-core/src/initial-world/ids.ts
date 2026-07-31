import { asFamilyId, asLineageId, asPersonId, asRelationshipId } from "../ids.js";
import type { FamilyId, LineageId, PersonId, RelationshipId } from "../ids.js";
import { InitialWorldGenerationError } from "./errors.js";

const ID_PAD = 6;
const ID_MAX = 999_999;

function formatId(prefix: string, n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new InitialWorldGenerationError("ID sequence must be a positive integer", {
      prefix,
      n,
    });
  }
  if (n > ID_MAX) {
    throw new InitialWorldGenerationError("ID sequence exceeds 6-digit limit", {
      prefix,
      n,
      max: ID_MAX,
    });
  }
  return `${prefix}${String(n).padStart(ID_PAD, "0")}`;
}

export function formatPersonId(n: number): PersonId {
  return asPersonId(formatId("person_", n));
}

export function formatFamilyId(n: number): FamilyId {
  return asFamilyId(formatId("family_", n));
}

export function formatLineageId(n: number): LineageId {
  return asLineageId(formatId("lineage_", n));
}

export function formatRelationshipId(n: number): RelationshipId {
  return asRelationshipId(formatId("relationship_", n));
}
