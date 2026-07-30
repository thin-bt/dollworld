import type { SimulationId } from "../ids.js";
import {
  createInitialWorldDate,
  createWorldDate,
  validateWorldDate,
  type WorldDate,
} from "../world-date.js";
import { assertNonNegativeSafeInteger, eventIdFromSequence } from "./event-id.js";
import {
  EVENT_ENVELOPE_SCHEMA_VERSION,
  emptyEventEntities,
  isEventImportance,
  type EventEnvelope,
  type EventImportance,
  type EventOrigin,
  type FamilyInitializedPayload,
  type LineageInitializedPayload,
  type PersonInitializedPayload,
  type RelationshipInitializedPayload,
  type SimulationCompletedPayload,
  type ValidationFailedPayload,
  type WorldStartedPayload,
} from "./types.js";
import { validateEventEnvelope } from "./validate.js";

/** Shared factory fields without origin / worldDate overrides. */
export type EventFactoryCommon = {
  simulationId: SimulationId;
  sequence: number;
  importance: EventImportance;
  sourceProcessor: string;
};

export type SimulationCompletedFactoryInput = EventFactoryCommon & {
  worldDate: WorldDate;
  payload?: SimulationCompletedPayload;
};

export type ValidationFailedFactoryInput = EventFactoryCommon & {
  worldDate: WorldDate;
  payload: ValidationFailedPayload;
};

function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${name} must be a non-empty string`);
  }
}

function assertFactoryCommon(input: EventFactoryCommon): void {
  assertNonEmptyString(input.simulationId, "simulationId");
  assertNonEmptyString(input.sourceProcessor, "sourceProcessor");
  assertNonNegativeSafeInteger(input.sequence, "sequence");
  if (!isEventImportance(input.importance)) {
    throw new Error(
      `importance must be a defined EventImportance (got ${String(input.importance)})`,
    );
  }
}

function buildBase(
  input: EventFactoryCommon,
  origin: EventOrigin,
  worldDate: WorldDate,
): Omit<EventEnvelope, "eventType" | "payload"> {
  assertFactoryCommon(input);
  validateWorldDate(worldDate);
  return {
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION,
    eventId: eventIdFromSequence(input.sequence),
    simulationId: input.simulationId,
    sequence: input.sequence,
    importance: input.importance,
    worldDate,
    origin,
    sourceProcessor: input.sourceProcessor,
    entities: emptyEventEntities(),
  };
}

function finalize(event: EventEnvelope): EventEnvelope {
  validateEventEnvelope(event);
  return event;
}

export function createWorldStartedEvent(
  input: EventFactoryCommon & { payload?: WorldStartedPayload },
): EventEnvelope {
  return finalize({
    ...buildBase(input, "initialization", createInitialWorldDate()),
    eventType: "world.started",
    payload: input.payload ?? {},
  });
}

export function createFamilyInitializedEvent(
  input: EventFactoryCommon & { payload: FamilyInitializedPayload },
): EventEnvelope {
  assertNonEmptyString(input.payload.familyId, "payload.familyId");
  return finalize({
    ...buildBase(input, "initialization", createInitialWorldDate()),
    eventType: "family.initialized",
    entities: {
      ...emptyEventEntities(),
      familyIds: [input.payload.familyId],
    },
    payload: input.payload,
  });
}

export function createLineageInitializedEvent(
  input: EventFactoryCommon & { payload: LineageInitializedPayload },
): EventEnvelope {
  assertNonEmptyString(input.payload.lineageId, "payload.lineageId");
  return finalize({
    ...buildBase(input, "initialization", createInitialWorldDate()),
    eventType: "lineage.initialized",
    entities: {
      ...emptyEventEntities(),
      lineageIds: [input.payload.lineageId],
    },
    payload: input.payload,
  });
}

export function createPersonInitializedEvent(
  input: EventFactoryCommon & { payload: PersonInitializedPayload },
): EventEnvelope {
  assertNonEmptyString(input.payload.personId, "payload.personId");
  return finalize({
    ...buildBase(input, "initialization", createInitialWorldDate()),
    eventType: "person.initialized",
    entities: {
      ...emptyEventEntities(),
      personIds: [input.payload.personId],
    },
    payload: input.payload,
  });
}

export function createRelationshipInitializedEvent(
  input: EventFactoryCommon & { payload: RelationshipInitializedPayload },
): EventEnvelope {
  assertNonEmptyString(input.payload.relationshipId, "payload.relationshipId");
  return finalize({
    ...buildBase(input, "initialization", createInitialWorldDate()),
    eventType: "relationship.initialized",
    entities: {
      ...emptyEventEntities(),
      relationshipIds: [input.payload.relationshipId],
    },
    payload: input.payload,
  });
}

export function createSimulationCompletedEvent(
  input: SimulationCompletedFactoryInput,
): EventEnvelope {
  validateWorldDate(input.worldDate);
  const payload = input.payload ?? {};
  if (payload.finalAbsoluteWeek !== undefined) {
    assertNonNegativeSafeInteger(payload.finalAbsoluteWeek, "finalAbsoluteWeek");
    if (payload.finalAbsoluteWeek !== input.worldDate.absoluteWeek) {
      throw new Error(
        `finalAbsoluteWeek must equal worldDate.absoluteWeek (got ${String(payload.finalAbsoluteWeek)} vs ${String(input.worldDate.absoluteWeek)})`,
      );
    }
  }
  return finalize({
    ...buildBase(input, "simulation", input.worldDate),
    eventType: "simulation.completed",
    payload,
  });
}

export function createValidationFailedEvent(input: ValidationFailedFactoryInput): EventEnvelope {
  validateWorldDate(input.worldDate);
  assertNonEmptyString(input.payload.reason, "payload.reason");
  return finalize({
    ...buildBase(input, "validation", input.worldDate),
    eventType: "validation.failed",
    payload: input.payload,
  });
}

export function createWorldDateForYearStatsFinalized(worldYear: number): WorldDate {
  if (!Number.isSafeInteger(worldYear) || worldYear < 1) {
    throw new Error(`worldYear must be a safe integer >= 1 (got ${String(worldYear)})`);
  }
  const absoluteWeek = worldYear * 48 - 1;
  if (!Number.isSafeInteger(absoluteWeek) || absoluteWeek < 0) {
    throw new Error(
      `absoluteWeek must be a non-negative safe integer (got ${String(absoluteWeek)})`,
    );
  }
  const date = createWorldDate({ year: worldYear, month: 3, weekOfMonth: 4 });
  if (date.absoluteWeek !== absoluteWeek) {
    throw new Error(
      `year-stats WorldDate absoluteWeek mismatch: expected ${String(absoluteWeek)}, got ${String(date.absoluteWeek)}`,
    );
  }
  return date;
}
