import type { FamilyId, LineageId, PersonId, RelationshipId } from "../ids.js";
import { toCanonicalJson } from "../canonical-json.js";
import { WorldEngineError } from "./errors.js";
import type { WorldEngineState } from "./types.js";

const canonicalCache = new WeakMap<object, string>();

export type OrderedEntityIds = {
  personIds: readonly PersonId[];
  familyIds: readonly FamilyId[];
  lineageIds: readonly LineageId[];
  relationshipIds: readonly RelationshipId[];
};

export function extractOrderedEntityIds(state: WorldEngineState): OrderedEntityIds {
  return {
    personIds: state.persons.map((p) => p.personId),
    familyIds: state.families.map((f) => f.familyId),
    lineageIds: state.lineages.map((l) => l.lineageId),
    relationshipIds: state.relationships.map((r) => r.relationshipId),
  };
}

export function assertProcessorDidNotMutateFixedFields(
  before: WorldEngineState,
  after: WorldEngineState,
  processorId: string,
  weekContext?: {
    absoluteWeek: number;
    worldDate: WorldEngineState["worldDate"];
    startSequence: number;
  },
): void {
  if (before === after) {
    return;
  }
  const ctx = {
    processorId,
    absoluteWeek: weekContext?.absoluteWeek ?? before.worldDate.absoluteWeek,
    worldDate: weekContext?.worldDate ?? before.worldDate,
    ...(weekContext !== undefined ? { startSequence: weekContext.startSequence } : {}),
  };

  assertMetaFieldEqual(before, after, "schemaVersion", ctx);
  assertMetaFieldEqual(before, after, "simulationSpecVersion", ctx);
  assertMetaFieldEqual(before, after, "nameDataVersion", ctx);
  assertMetaFieldEqual(before, after, "simulationId", ctx);
  assertMetaFieldEqual(before, after, "worldId", ctx);
  assertMetaFieldEqual(before, after, "configProfileId", ctx);
  assertMetaFieldEqual(before, after, "configHash", ctx);
  assertMetaFieldEqual(before, after, "seed", ctx);
  assertMetaFieldEqual(before, after, "rngAlgorithm", ctx);
  assertCanonicalEqual(before.worldDate, after.worldDate, "worldDate", ctx);
  assertCanonicalEqual(before.generationSummary, after.generationSummary, "generationSummary", ctx);
  assertCanonicalEqual(before.families, after.families, "families", ctx);
  assertCanonicalEqual(before.lineages, after.lineages, "lineages", ctx);
  assertCanonicalEqual(before.relationships, after.relationships, "relationships", ctx);

  const beforeIds = extractOrderedEntityIds(before);
  const afterIds = extractOrderedEntityIds(after);
  assertOrderedIdsEqual(beforeIds.personIds, afterIds.personIds, "persons", ctx);
}

type FixedMetaField =
  | "schemaVersion"
  | "simulationSpecVersion"
  | "nameDataVersion"
  | "simulationId"
  | "worldId"
  | "configProfileId"
  | "configHash"
  | "seed"
  | "rngAlgorithm";

type GuardContext = {
  processorId: string;
  absoluteWeek: number;
  worldDate: WorldEngineState["worldDate"];
  startSequence?: number;
};

function assertMetaFieldEqual(
  before: WorldEngineState,
  after: WorldEngineState,
  field: FixedMetaField,
  ctx: GuardContext,
): void {
  if (before[field] !== after[field]) {
    throw new WorldEngineError(`processor must not change ${field}`, {
      ...ctx,
      field,
    });
  }
}

function assertCanonicalEqual(
  before: unknown,
  after: unknown,
  field: string,
  ctx: GuardContext,
): void {
  if (before === after) {
    return;
  }
  let beforeCanonical: string;
  let afterCanonical: string;
  try {
    beforeCanonical = cachedCanonical(before);
    afterCanonical = cachedCanonical(after);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new WorldEngineError(`processor ${field} comparison failed`, {
      ...ctx,
      field,
      detail,
    });
  }
  if (beforeCanonical !== afterCanonical) {
    throw new WorldEngineError(`processor must not change ${field}`, {
      ...ctx,
      field,
    });
  }
}

function cachedCanonical(value: unknown): string {
  if (typeof value !== "object" || value === null) {
    return toCanonicalJson(value);
  }
  const cached = canonicalCache.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const canonical = toCanonicalJson(value);
  canonicalCache.set(value, canonical);
  return canonical;
}

function assertOrderedIdsEqual(
  before: readonly string[],
  after: readonly string[],
  label: string,
  ctx: GuardContext,
): void {
  if (before.length !== after.length) {
    throw new WorldEngineError(`processor must not change ${label} ID set size`, {
      ...ctx,
      field: label,
      detail: `before=${String(before.length)} after=${String(after.length)}`,
    });
  }
  for (let i = 0; i < before.length; i += 1) {
    if (before[i] !== after[i]) {
      throw new WorldEngineError(`processor must not change ${label} ID set or order`, {
        ...ctx,
        field: label,
        detail: `index=${String(i)} before=${String(before[i])} after=${String(after[i])}`,
      });
    }
  }
}
