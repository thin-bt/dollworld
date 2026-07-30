import { MINIMUM_RANK } from "../enums.js";
import type { FamilyId, LineageId, PersonId, RelationshipId } from "../ids.js";
import {
  createInitialWorldDate,
  isAprilWeek1,
  isMarchWeek4,
  validateWorldDate,
} from "../world-date.js";
import { assertEventIdMatchesSequence, assertNonNegativeSafeInteger } from "./event-id.js";
import {
  CAREER_STATUSES,
  EVENT_ENVELOPE_SCHEMA_VERSION,
  isCareerStatus,
  isEventImportance,
  isEventOrigin,
  isRank,
  isSprint0EventType,
  type EventEnvelope,
  type Sprint0EventType,
} from "./types.js";

export type KnownEntityIds = {
  personIds: ReadonlySet<PersonId> | readonly PersonId[];
  familyIds: ReadonlySet<FamilyId> | readonly FamilyId[];
  lineageIds: ReadonlySet<LineageId> | readonly LineageId[];
  relationshipIds: ReadonlySet<RelationshipId> | readonly RelationshipId[];
};

export type ValidateEventSequenceOptions = {
  /** When validating a partial run, the expected first sequence (default 0). */
  expectedStartSequence?: number;
  knownIds?: KnownEntityIds;
};

const PAYLOAD_KEY_RULES: Record<
  Sprint0EventType,
  { required: readonly string[]; optional: readonly string[] }
> = {
  "world.started": { required: [], optional: ["worldId"] },
  "world.year_stats_finalized": { required: ["worldYear"], optional: [] },
  "world.year_started": { required: ["worldYear"], optional: [] },
  "family.initialized": { required: ["familyId"], optional: [] },
  "lineage.initialized": { required: ["lineageId"], optional: [] },
  "person.initialized": { required: ["personId"], optional: [] },
  "relationship.initialized": { required: ["relationshipId"], optional: [] },
  "person.aged": {
    required: ["previousAge", "nextAge", "birthYear", "worldYear"],
    optional: [],
  },
  "person.career_status_changed": {
    required: ["previousCareerStatus", "nextCareerStatus"],
    optional: [],
  },
  "person.debuted": {
    required: ["previousCareerStatus", "nextCareerStatus", "rank"],
    optional: [],
  },
  "person.force_retired": {
    required: ["previousCareerStatus", "nextCareerStatus", "retirementRank", "highestRank"],
    optional: [],
  },
  "simulation.completed": { required: [], optional: ["finalAbsoluteWeek"] },
  "validation.failed": { required: ["reason"], optional: [] },
};

function toSet<T extends string>(values: ReadonlySet<T> | readonly T[]): ReadonlySet<T> {
  return values instanceof Set ? values : new Set(values);
}

function assertNoDuplicateIds(ids: readonly string[], label: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || id.length === 0) {
      throw new Error(`${label} must not contain empty IDs`);
    }
    if (seen.has(id)) {
      throw new Error(`${label} must not contain duplicate ID ${id}`);
    }
    seen.add(id);
  }
}

function assertIdsExist(ids: readonly string[], known: ReadonlySet<string>, label: string): void {
  for (const id of ids) {
    if (!known.has(id)) {
      throw new Error(`${label} references unknown ID ${id}`);
    }
  }
}

function assertIsArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
}

function assertPlainObjectPayload(event: EventEnvelope): void {
  const payload: unknown = event.payload;
  if (payload === null) {
    throw new Error("payload must not be null");
  }
  if (Array.isArray(payload)) {
    throw new Error("payload must not be an array");
  }
  if (payload instanceof Date) {
    throw new Error("payload must not be a Date");
  }
  if (typeof payload !== "object") {
    throw new Error("payload must be a plain object");
  }
  const proto = Object.getPrototypeOf(payload);
  if (proto !== Object.prototype && proto !== null) {
    throw new Error("payload must be a plain object");
  }

  const rules = PAYLOAD_KEY_RULES[event.eventType];
  const allowed = new Set<string>([...rules.required, ...rules.optional]);
  const keys = Object.keys(payload as object);
  for (const key of keys) {
    if (!allowed.has(key)) {
      throw new Error(`${event.eventType} payload must not include key ${key}`);
    }
  }
  for (const required of rules.required) {
    if (!Object.prototype.hasOwnProperty.call(payload, required)) {
      throw new Error(`${event.eventType} payload requires key ${required}`);
    }
  }

  if (
    event.eventType === "world.started" &&
    Object.prototype.hasOwnProperty.call(payload, "worldId")
  ) {
    const worldId = (payload as { worldId?: unknown }).worldId;
    if (typeof worldId !== "string" || worldId.length === 0) {
      throw new Error("world.started payload.worldId must be a non-empty string when present");
    }
  }
}

function assertEmptyEntitiesExcept(
  event: EventEnvelope,
  allowed: "personIds" | "familyIds" | "lineageIds" | "relationshipIds" | null,
): void {
  const { personIds, familyIds, lineageIds, relationshipIds } = event.entities;
  if (allowed !== "personIds" && personIds.length !== 0) {
    throw new Error(`${event.eventType} requires empty entities.personIds`);
  }
  if (allowed !== "familyIds" && familyIds.length !== 0) {
    throw new Error(`${event.eventType} requires empty entities.familyIds`);
  }
  if (allowed !== "lineageIds" && lineageIds.length !== 0) {
    throw new Error(`${event.eventType} requires empty entities.lineageIds`);
  }
  if (allowed !== "relationshipIds" && relationshipIds.length !== 0) {
    throw new Error(`${event.eventType} requires empty entities.relationshipIds`);
  }
}

function assertInitialWorldDate(event: EventEnvelope): void {
  const expected = createInitialWorldDate();
  const d = event.worldDate;
  if (
    d.year !== expected.year ||
    d.month !== expected.month ||
    d.weekOfMonth !== expected.weekOfMonth ||
    d.absoluteWeek !== expected.absoluteWeek
  ) {
    throw new Error(`${event.eventType} requires world year 1 April week 1`);
  }
}

function assertSafeIntegerAtLeast(
  value: unknown,
  name: string,
  min: number,
): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) {
    throw new Error(`${name} must be a safe integer >= ${String(min)} (got ${String(value)})`);
  }
}

function assertEventTypeSpecific(event: EventEnvelope): void {
  switch (event.eventType) {
    case "world.started": {
      if (event.origin !== "initialization") {
        throw new Error("world.started origin must be initialization");
      }
      assertInitialWorldDate(event);
      assertEmptyEntitiesExcept(event, null);
      break;
    }
    case "family.initialized": {
      if (event.origin !== "initialization") {
        throw new Error("family.initialized origin must be initialization");
      }
      assertInitialWorldDate(event);
      if (event.entities.familyIds.length !== 1) {
        throw new Error("family.initialized requires exactly one familyId in entities");
      }
      if (event.payload.familyId !== event.entities.familyIds[0]) {
        throw new Error("family.initialized payload.familyId must match entities.familyIds[0]");
      }
      assertEmptyEntitiesExcept(event, "familyIds");
      break;
    }
    case "lineage.initialized": {
      if (event.origin !== "initialization") {
        throw new Error("lineage.initialized origin must be initialization");
      }
      assertInitialWorldDate(event);
      if (event.entities.lineageIds.length !== 1) {
        throw new Error("lineage.initialized requires exactly one lineageId in entities");
      }
      if (event.payload.lineageId !== event.entities.lineageIds[0]) {
        throw new Error("lineage.initialized payload.lineageId must match entities.lineageIds[0]");
      }
      assertEmptyEntitiesExcept(event, "lineageIds");
      break;
    }
    case "person.initialized": {
      if (event.origin !== "initialization") {
        throw new Error("person.initialized origin must be initialization");
      }
      assertInitialWorldDate(event);
      if (event.entities.personIds.length !== 1) {
        throw new Error("person.initialized requires exactly one personId in entities");
      }
      if (event.payload.personId !== event.entities.personIds[0]) {
        throw new Error("person.initialized payload.personId must match entities.personIds[0]");
      }
      assertEmptyEntitiesExcept(event, "personIds");
      break;
    }
    case "relationship.initialized": {
      if (event.origin !== "initialization") {
        throw new Error("relationship.initialized origin must be initialization");
      }
      assertInitialWorldDate(event);
      if (event.entities.relationshipIds.length !== 1) {
        throw new Error("relationship.initialized requires exactly one relationshipId in entities");
      }
      if (event.payload.relationshipId !== event.entities.relationshipIds[0]) {
        throw new Error(
          "relationship.initialized payload.relationshipId must match entities.relationshipIds[0]",
        );
      }
      assertEmptyEntitiesExcept(event, "relationshipIds");
      break;
    }
    case "world.year_stats_finalized": {
      if (event.origin !== "simulation") {
        throw new Error("world.year_stats_finalized origin must be simulation");
      }
      assertSafeIntegerAtLeast(event.payload.worldYear, "payload.worldYear", 1);
      if (!isMarchWeek4(event.worldDate) || event.worldDate.year !== event.payload.worldYear) {
        throw new Error("world.year_stats_finalized requires March week 4 of payload.worldYear");
      }
      if (event.worldDate.absoluteWeek !== event.payload.worldYear * 48 - 1) {
        throw new Error("world.year_stats_finalized absoluteWeek must equal worldYear * 48 - 1");
      }
      assertEmptyEntitiesExcept(event, null);
      break;
    }
    case "world.year_started": {
      if (event.origin !== "simulation") {
        throw new Error("world.year_started origin must be simulation");
      }
      assertSafeIntegerAtLeast(event.payload.worldYear, "payload.worldYear", 2);
      if (!isAprilWeek1(event.worldDate)) {
        throw new Error("world.year_started requires April week 1");
      }
      if (event.payload.worldYear !== event.worldDate.year) {
        throw new Error("world.year_started payload.worldYear must equal worldDate.year");
      }
      assertEmptyEntitiesExcept(event, null);
      break;
    }
    case "person.aged": {
      if (event.origin !== "simulation") {
        throw new Error("person.aged origin must be simulation");
      }
      if (!isAprilWeek1(event.worldDate)) {
        throw new Error("person.aged requires April week 1");
      }
      if (event.entities.personIds.length !== 1) {
        throw new Error("person.aged requires exactly one personId");
      }
      assertEmptyEntitiesExcept(event, "personIds");
      const p = event.payload;
      if (!Number.isSafeInteger(p.previousAge) || p.previousAge < 0) {
        throw new Error("person.aged previousAge must be a non-negative safe integer");
      }
      if (!Number.isSafeInteger(p.nextAge) || p.nextAge < 0) {
        throw new Error("person.aged nextAge must be a non-negative safe integer");
      }
      if (!Number.isSafeInteger(p.birthYear)) {
        throw new Error("person.aged birthYear must be a safe integer");
      }
      if (!Number.isSafeInteger(p.worldYear) || p.worldYear < 1) {
        throw new Error("person.aged worldYear must be a safe integer >= 1");
      }
      if (p.nextAge < p.previousAge) {
        throw new Error("person.aged nextAge must be >= previousAge");
      }
      if (p.nextAge !== p.worldYear - p.birthYear) {
        throw new Error("person.aged nextAge must equal worldYear - birthYear");
      }
      if (p.worldYear !== event.worldDate.year) {
        throw new Error("person.aged worldYear must equal worldDate.year");
      }
      break;
    }
    case "person.career_status_changed": {
      if (event.origin !== "simulation") {
        throw new Error("person.career_status_changed origin must be simulation");
      }
      if (event.entities.personIds.length !== 1) {
        throw new Error("person.career_status_changed requires exactly one personId");
      }
      assertEmptyEntitiesExcept(event, "personIds");
      const p = event.payload;
      if (!isCareerStatus(p.previousCareerStatus) || !isCareerStatus(p.nextCareerStatus)) {
        throw new Error(
          `person.career_status_changed requires defined CareerStatus values (${CAREER_STATUSES.join(", ")})`,
        );
      }
      if (p.previousCareerStatus === p.nextCareerStatus) {
        throw new Error("person.career_status_changed previous and next status must differ");
      }
      break;
    }
    case "person.debuted": {
      if (event.origin !== "simulation") {
        throw new Error("person.debuted origin must be simulation");
      }
      if (event.entities.personIds.length !== 1) {
        throw new Error("person.debuted requires exactly one personId");
      }
      assertEmptyEntitiesExcept(event, "personIds");
      const p = event.payload;
      if (p.previousCareerStatus !== "child" && p.previousCareerStatus !== "trainee") {
        throw new Error("person.debuted previousCareerStatus must be child or trainee");
      }
      if (p.nextCareerStatus !== "active_competitor") {
        throw new Error("person.debuted nextCareerStatus must be active_competitor");
      }
      if (p.rank !== MINIMUM_RANK) {
        throw new Error("person.debuted rank must equal MINIMUM_RANK");
      }
      break;
    }
    case "person.force_retired": {
      if (event.origin !== "simulation") {
        throw new Error("person.force_retired origin must be simulation");
      }
      if (event.entities.personIds.length !== 1) {
        throw new Error("person.force_retired requires exactly one personId");
      }
      assertEmptyEntitiesExcept(event, "personIds");
      const p = event.payload;
      if (p.previousCareerStatus !== "active_competitor") {
        throw new Error("person.force_retired previousCareerStatus must be active_competitor");
      }
      if (p.nextCareerStatus !== "retired") {
        throw new Error("person.force_retired nextCareerStatus must be retired");
      }
      if (!isRank(p.retirementRank) || !isRank(p.highestRank)) {
        throw new Error("person.force_retired ranks must be defined Rank values");
      }
      break;
    }
    case "simulation.completed": {
      if (event.origin !== "simulation") {
        throw new Error("simulation.completed origin must be simulation");
      }
      assertEmptyEntitiesExcept(event, null);
      if (event.payload.finalAbsoluteWeek !== undefined) {
        assertNonNegativeSafeInteger(event.payload.finalAbsoluteWeek, "finalAbsoluteWeek");
        if (event.payload.finalAbsoluteWeek !== event.worldDate.absoluteWeek) {
          throw new Error(
            "simulation.completed finalAbsoluteWeek must equal worldDate.absoluteWeek",
          );
        }
      }
      break;
    }
    case "validation.failed": {
      if (event.origin !== "validation") {
        throw new Error("validation.failed origin must be validation");
      }
      if (typeof event.payload.reason !== "string" || event.payload.reason.length === 0) {
        throw new Error("validation.failed reason must be a non-empty string");
      }
      assertEmptyEntitiesExcept(event, null);
      break;
    }
  }
}

export function validateEventEnvelope(event: EventEnvelope, knownIds?: KnownEntityIds): void {
  if (event.schemaVersion !== EVENT_ENVELOPE_SCHEMA_VERSION) {
    throw new Error(
      `schemaVersion must be ${EVENT_ENVELOPE_SCHEMA_VERSION} (got ${event.schemaVersion})`,
    );
  }
  if (typeof event.eventId !== "string" || event.eventId.length === 0) {
    throw new Error("eventId must be a non-empty string");
  }
  if (typeof event.simulationId !== "string" || event.simulationId.length === 0) {
    throw new Error("simulationId must be a non-empty string");
  }
  assertNonNegativeSafeInteger(event.sequence, "sequence");
  assertEventIdMatchesSequence(event.eventId, event.sequence);

  if (!isSprint0EventType(event.eventType)) {
    throw new Error(`unsupported eventType ${event.eventType}`);
  }
  if (!isEventImportance(event.importance)) {
    throw new Error(
      `importance must be a defined EventImportance (got ${String(event.importance)})`,
    );
  }
  if (!isEventOrigin(event.origin)) {
    throw new Error(`origin must be a defined EventOrigin (got ${String(event.origin)})`);
  }
  if (typeof event.sourceProcessor !== "string" || event.sourceProcessor.length === 0) {
    throw new Error("sourceProcessor must be a non-empty string");
  }

  validateWorldDate(event.worldDate);

  if (event.entities === null || typeof event.entities !== "object") {
    throw new Error("entities must be an object");
  }
  assertIsArray(event.entities.personIds, "entities.personIds");
  assertIsArray(event.entities.familyIds, "entities.familyIds");
  assertIsArray(event.entities.lineageIds, "entities.lineageIds");
  assertIsArray(event.entities.relationshipIds, "entities.relationshipIds");

  if ("tournamentIds" in event.entities && event.entities.tournamentIds !== undefined) {
    throw new Error("Sprint 0 EventEnvelope must omit tournamentIds");
  }
  if ("matchIds" in event.entities && event.entities.matchIds !== undefined) {
    throw new Error("Sprint 0 EventEnvelope must omit matchIds");
  }

  assertNoDuplicateIds(event.entities.personIds, "entities.personIds");
  assertNoDuplicateIds(event.entities.familyIds, "entities.familyIds");
  assertNoDuplicateIds(event.entities.lineageIds, "entities.lineageIds");
  assertNoDuplicateIds(event.entities.relationshipIds, "entities.relationshipIds");

  assertPlainObjectPayload(event);
  assertEventTypeSpecific(event);

  if (knownIds !== undefined) {
    assertIdsExist(event.entities.personIds, toSet(knownIds.personIds), "entities.personIds");
    assertIdsExist(event.entities.familyIds, toSet(knownIds.familyIds), "entities.familyIds");
    assertIdsExist(event.entities.lineageIds, toSet(knownIds.lineageIds), "entities.lineageIds");
    assertIdsExist(
      event.entities.relationshipIds,
      toSet(knownIds.relationshipIds),
      "entities.relationshipIds",
    );
  }
}

/**
 * Validate a contiguous event sequence (full run or partial with expectedStartSequence).
 */
export function validateEventSequence(
  events: readonly EventEnvelope[],
  options: ValidateEventSequenceOptions = {},
): void {
  const expectedStart = options.expectedStartSequence ?? 0;
  assertNonNegativeSafeInteger(expectedStart, "expectedStartSequence");

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    const expectedSequence = expectedStart + i;
    if (event.sequence !== expectedSequence) {
      throw new Error(
        `sequence gap or out-of-order at index ${String(i)}: expected ${String(expectedSequence)}, got ${String(event.sequence)}`,
      );
    }
    validateEventEnvelope(event, options.knownIds);
  }
}

export type { Sprint0EventType };
