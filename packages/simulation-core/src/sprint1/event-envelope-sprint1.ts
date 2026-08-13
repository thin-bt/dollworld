/**
 * Sprint 1 EventEnvelope 0.2.0 allocation and promotion (03 mini-spec §7 / S01-008).
 *
 * Sprint 0 `EventEnvelope` (`schemaVersion=0.1.0`, matchIds omitted) stays unchanged.
 * Fresh Sprint 1 runs promote provisional 0.1.0 initial events and allocate new
 * 0.2.0 envelopes from processor candidates via the shared global sequence allocator.
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import { assertEventIdMatchesSequence, eventIdFromSequence } from "../events/event-id.js";
import { validateEventEnvelope, validateEventSequence } from "../events/validate.js";
import {
  emptyEventEntities,
  isEventImportance,
  isEventOrigin,
  type EventEnvelope,
  type EventImportance,
  type EventOrigin,
} from "../events/types.js";
import type {
  EventId,
  FamilyId,
  LineageId,
  MatchId,
  PersonId,
  RelationshipId,
  SimulationId,
} from "../ids.js";
import {
  asFamilyId,
  asLineageId,
  asMatchId,
  asPersonId,
  asRelationshipId,
  asEventId,
} from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateWorldDate, type WorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import type { BattleFinishedEventCandidate } from "./battle-finished-event.js";
import { BATTLE_SIMULATION_SOURCE_PROCESSOR } from "./battle-started-event.js";
import type { BattleStartedEventCandidate } from "./battle-started-event.js";
import { WEEKLY_TRAINING_PROCESSOR_ID } from "./constants.js";
import { MATCH_ID_FORMAT_PATTERN } from "./match-id-generator.js";
import {
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  hasOwn,
  rejectUnknownKeys,
  requireNonEmptyString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "./plain-data.js";
import type { WeeklyTrainingEventCandidate } from "./weekly-training-types.js";

/** Fixed Sprint 1 EventEnvelope schemaVersion (03 mini-spec §7). */
export const EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1 = "0.2.0" as const;

/** Back-compat alias used by create-sprint1-run-session clarifier code. */
export const SPRINT1_EVENT_ENVELOPE_SCHEMA_VERSION = EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1;

export const SPRINT1_EVENT_ENVELOPE_KEYS = [
  "schemaVersion",
  "eventId",
  "simulationId",
  "sequence",
  "eventType",
  "importance",
  "worldDate",
  "origin",
  "sourceProcessor",
  "entities",
  "payload",
] as const;

export const SPRINT1_EVENT_ENTITIES_KEYS = [
  "personIds",
  "familyIds",
  "lineageIds",
  "relationshipIds",
  "matchIds",
] as const;

export type Sprint1EventEntities = {
  personIds: PersonId[];
  familyIds: FamilyId[];
  lineageIds: LineageId[];
  relationshipIds: RelationshipId[];
  matchIds: MatchId[];
};

export type Sprint1EventEnvelope = {
  schemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1;
  eventId: EventId;
  simulationId: SimulationId;
  sequence: number;
  eventType: string;
  importance: EventImportance;
  worldDate: WorldDate;
  origin: EventOrigin;
  sourceProcessor: string;
  entities: Sprint1EventEntities;
  payload: Readonly<Record<string, unknown>>;
};

export type AllocateSprint1EventEnvelopeInput = {
  sequence: number;
  simulationId: SimulationId;
  importance: EventImportance;
  worldDate: WorldDate;
  origin: EventOrigin;
  sourceProcessor: string;
  eventType: string;
  entities: Sprint1EventEntities;
  payload: Readonly<Record<string, unknown>>;
};

export type AllocateWeeklyTrainingEventCandidatesInput = {
  candidates: readonly WeeklyTrainingEventCandidate[];
  startSequence: number;
  simulationId: SimulationId;
  worldDate: WorldDate;
  sourceProcessor: typeof WEEKLY_TRAINING_PROCESSOR_ID;
};

export type AllocateBattleEventCandidatesInput = {
  candidates: readonly [BattleStartedEventCandidate, BattleFinishedEventCandidate];
  startSequence: number;
  simulationId: SimulationId;
};

function issueFromThrownError(path: string, error: unknown): ValidationIssue {
  return {
    path,
    message: error instanceof Error ? error.message : String(error),
  };
}

function sortIdsAscending<T extends string>(ids: readonly T[]): T[] {
  return [...ids].sort(compareUnicodeCodePoints);
}

function normalizeSprint1EventEntities(entities: Sprint1EventEntities): Sprint1EventEntities {
  return {
    personIds: sortIdsAscending(entities.personIds),
    familyIds: sortIdsAscending(entities.familyIds),
    lineageIds: sortIdsAscending(entities.lineageIds),
    relationshipIds: sortIdsAscending(entities.relationshipIds),
    matchIds: sortIdsAscending(entities.matchIds),
  };
}

function assertPlainObjectPayload(payload: unknown, path: string, issues: ValidationIssue[]): void {
  if (payload === null) {
    issues.push({
      path,
      message: "payload must not be null",
      actual: null,
      expected: "plain object",
    });
    return;
  }
  if (Array.isArray(payload)) {
    issues.push({
      path,
      message: "payload must not be an array",
      actual: "array",
      expected: "plain object",
    });
    return;
  }
  if (payload instanceof Date) {
    issues.push({
      path,
      message: "payload must not be a Date",
      actual: "Date",
      expected: "plain object",
    });
    return;
  }
  if (typeof payload !== "object") {
    issues.push({
      path,
      message: "payload must be a plain object",
      actual: typeof payload,
      expected: "plain object",
    });
    return;
  }
  const proto = Object.getPrototypeOf(payload);
  if (proto !== Object.prototype && proto !== null) {
    issues.push({
      path,
      message: "payload must be a plain object",
      expected: "Object.prototype or null prototype",
    });
  }
}

function parseWorldDate(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): WorldDate | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  const year = requireSafeIntegerAtLeast(object, "year", path, 1, issues);
  const month = requireSafeIntegerAtLeast(object, "month", path, 1, issues);
  const weekOfMonth = requireSafeIntegerAtLeast(object, "weekOfMonth", path, 1, issues);
  const absoluteWeek = requireSafeIntegerAtLeast(object, "absoluteWeek", path, 0, issues);
  if (
    year === undefined ||
    month === undefined ||
    weekOfMonth === undefined ||
    absoluteWeek === undefined
  ) {
    return undefined;
  }
  const worldDate = {
    year,
    month,
    weekOfMonth,
    absoluteWeek,
  } as WorldDate;
  try {
    validateWorldDate(worldDate, DEFAULT_WORLD_CALENDAR_CONFIG);
  } catch (error) {
    issues.push(issueFromThrownError(path, error));
    return undefined;
  }
  return worldDate;
}

function parseIdArray<T extends string>(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
  asId: (raw: string) => T,
  label: string,
): T[] | undefined {
  const items = snapshotDenseArrayOrFail(value, path, issues);
  if (items === undefined) {
    return undefined;
  }
  const ids: T[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const itemPath = childPath(path, index);
    const item = items[index];
    if (typeof item !== "string" || item.length === 0) {
      issues.push({
        path: itemPath,
        message: `${label} entries must be non-empty strings`,
        actual: item,
        expected: label,
      });
      return undefined;
    }
    ids.push(asId(item));
  }
  return ids;
}

function assertCanonicalAscendingIds(
  ids: readonly string[],
  path: string,
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index]!;
    if (seen.has(id)) {
      issues.push({
        path,
        message: `${path} must not contain duplicate IDs`,
        actual: id,
        expected: "unique IDs",
      });
      return;
    }
    seen.add(id);
    if (index > 0) {
      const order = compareUnicodeCodePoints(ids[index - 1]!, id);
      if (order > 0) {
        issues.push({
          path,
          message: `${path} must be sorted in canonical ascending order`,
          actual: `${ids[index - 1]!} before ${id}`,
          expected: "canonical ascending",
        });
        return;
      }
    }
  }
}

function assertMatchIdFormat(matchId: string, path: string, issues: ValidationIssue[]): void {
  if (!MATCH_ID_FORMAT_PATTERN.test(matchId)) {
    issues.push({
      path,
      message: "matchIds entries must match match-id-generator format",
      actual: matchId,
      expected: MATCH_ID_FORMAT_PATTERN.source,
    });
  }
}

function parseSprint1EventEntities(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint1EventEntities | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, SPRINT1_EVENT_ENTITIES_KEYS, path, issues);
  if ("tournamentIds" in object) {
    issues.push({
      path: childPath(path, "tournamentIds"),
      message: "Sprint 1 EventEnvelope must omit tournamentIds",
      actual: object["tournamentIds"],
      expected: "omitted",
    });
  }
  if (!hasOwn(object, "matchIds")) {
    issues.push({
      path: childPath(path, "matchIds"),
      message: "entities.matchIds is required for schemaVersion 0.2.0",
      expected: "MatchId[]",
    });
    return undefined;
  }

  const personIds = parseIdArray(
    object["personIds"],
    childPath(path, "personIds"),
    issues,
    asPersonId,
    "PersonId",
  );
  const familyIds = parseIdArray(
    object["familyIds"],
    childPath(path, "familyIds"),
    issues,
    asFamilyId,
    "FamilyId",
  );
  const lineageIds = parseIdArray(
    object["lineageIds"],
    childPath(path, "lineageIds"),
    issues,
    asLineageId,
    "LineageId",
  );
  const relationshipIds = parseIdArray(
    object["relationshipIds"],
    childPath(path, "relationshipIds"),
    issues,
    asRelationshipId,
    "RelationshipId",
  );
  const matchIds = parseIdArray(
    object["matchIds"],
    childPath(path, "matchIds"),
    issues,
    asMatchId,
    "MatchId",
  );
  if (
    personIds === undefined ||
    familyIds === undefined ||
    lineageIds === undefined ||
    relationshipIds === undefined ||
    matchIds === undefined
  ) {
    return undefined;
  }

  assertCanonicalAscendingIds(personIds, childPath(path, "personIds"), issues);
  assertCanonicalAscendingIds(familyIds, childPath(path, "familyIds"), issues);
  assertCanonicalAscendingIds(lineageIds, childPath(path, "lineageIds"), issues);
  assertCanonicalAscendingIds(relationshipIds, childPath(path, "relationshipIds"), issues);
  assertCanonicalAscendingIds(matchIds, childPath(path, "matchIds"), issues);
  for (let index = 0; index < matchIds.length; index += 1) {
    assertMatchIdFormat(matchIds[index]!, childPath(childPath(path, "matchIds"), index), issues);
  }

  return { personIds, familyIds, lineageIds, relationshipIds, matchIds };
}

/**
 * Validate Sprint 1 EventEnvelope 0.2.0 structure (03 mini-spec §7).
 */
export function validateSprint1EventEnvelope(
  event: unknown,
): ValidationResult<Sprint1EventEnvelope> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(event, "", issues);
  if (object === undefined) {
    return failure(
      issues.length > 0
        ? issues
        : [
            {
              path: "",
              message: "Sprint1EventEnvelope must be a plain object",
              actual: event,
              expected: "object",
            },
          ],
    );
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SPRINT1_EVENT_ENVELOPE_KEYS, "", issues);

  const schemaVersion = object["schemaVersion"];
  if (schemaVersion !== EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1) {
    issues.push({
      path: "/schemaVersion",
      message: `schemaVersion must be ${EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1}`,
      actual: schemaVersion,
      expected: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    });
  }

  const eventId = requireNonEmptyString(object, "eventId", "", issues);
  const simulationId = requireNonEmptyString(object, "simulationId", "", issues);
  const sequence = requireSafeIntegerAtLeast(object, "sequence", "", 0, issues);
  const eventType = requireNonEmptyString(object, "eventType", "", issues);
  const importanceRaw = object["importance"];
  if (typeof importanceRaw !== "string" || !isEventImportance(importanceRaw)) {
    issues.push({
      path: "/importance",
      message: "importance must be a defined EventImportance",
      actual: importanceRaw,
      expected: "minor | normal | major | historic",
    });
  }
  const originRaw = object["origin"];
  if (typeof originRaw !== "string" || !isEventOrigin(originRaw)) {
    issues.push({
      path: "/origin",
      message: "origin must be a defined EventOrigin",
      actual: originRaw,
      expected: "initialization | simulation | validation",
    });
  }
  const sourceProcessor = requireNonEmptyString(object, "sourceProcessor", "", issues);
  const worldDate = parseWorldDate(object["worldDate"], "/worldDate", issues);
  const entities = parseSprint1EventEntities(object["entities"], "/entities", issues);
  assertPlainObjectPayload(object["payload"], "/payload", issues);

  if (
    eventId === undefined ||
    simulationId === undefined ||
    sequence === undefined ||
    eventType === undefined ||
    sourceProcessor === undefined ||
    worldDate === undefined ||
    entities === undefined ||
    typeof importanceRaw !== "string" ||
    !isEventImportance(importanceRaw) ||
    typeof originRaw !== "string" ||
    !isEventOrigin(originRaw) ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  try {
    assertEventIdMatchesSequence(eventId, sequence);
  } catch (error) {
    issues.push(issueFromThrownError("/eventId", error));
    return failure(issues);
  }

  return success(
    deepFreezePlainJson({
      schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
      eventId: asEventId(eventId),
      simulationId: simulationId as SimulationId,
      sequence,
      eventType,
      importance: importanceRaw,
      worldDate,
      origin: originRaw,
      sourceProcessor,
      entities,
      payload: object["payload"] as Readonly<Record<string, unknown>>,
    }),
  );
}

/**
 * Allocate one Sprint 1 EventEnvelope 0.2.0 from fully specified input.
 * EventId is derived from sequence via {@link eventIdFromSequence}.
 */
export function allocateSprint1EventEnvelope(
  input: AllocateSprint1EventEnvelopeInput,
): ValidationResult<Sprint1EventEnvelope> {
  const issues: ValidationIssue[] = [];
  if (!Number.isSafeInteger(input.sequence) || input.sequence < 0) {
    issues.push({
      path: "/sequence",
      message: "sequence must be a non-negative safe integer",
      actual: input.sequence,
    });
  }
  if (typeof input.simulationId !== "string" || input.simulationId.length === 0) {
    issues.push({
      path: "/simulationId",
      message: "simulationId must be a non-empty string",
      actual: input.simulationId,
    });
  }
  if (typeof input.sourceProcessor !== "string" || input.sourceProcessor.length === 0) {
    issues.push({
      path: "/sourceProcessor",
      message: "sourceProcessor must be a non-empty string",
      actual: input.sourceProcessor,
    });
  }
  if (typeof input.eventType !== "string" || input.eventType.length === 0) {
    issues.push({
      path: "/eventType",
      message: "eventType must be a non-empty string",
      actual: input.eventType,
    });
  }
  if (!isEventImportance(input.importance)) {
    issues.push({
      path: "/importance",
      message: "importance must be a defined EventImportance",
      actual: input.importance,
    });
  }
  if (!isEventOrigin(input.origin)) {
    issues.push({
      path: "/origin",
      message: "origin must be a defined EventOrigin",
      actual: input.origin,
    });
  }

  let worldDate: WorldDate | undefined;
  try {
    validateWorldDate(input.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG);
    worldDate = input.worldDate;
  } catch (error) {
    issues.push(issueFromThrownError("/worldDate", error));
  }

  if (
    !Number.isSafeInteger(input.sequence) ||
    input.sequence < 0 ||
    typeof input.simulationId !== "string" ||
    input.simulationId.length === 0 ||
    typeof input.sourceProcessor !== "string" ||
    input.sourceProcessor.length === 0 ||
    typeof input.eventType !== "string" ||
    input.eventType.length === 0 ||
    worldDate === undefined ||
    !isEventImportance(input.importance) ||
    !isEventOrigin(input.origin) ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const envelope: Sprint1EventEnvelope = {
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    eventId: eventIdFromSequence(input.sequence),
    simulationId: input.simulationId,
    sequence: input.sequence,
    eventType: input.eventType,
    importance: input.importance,
    worldDate,
    origin: input.origin,
    sourceProcessor: input.sourceProcessor,
    entities: normalizeSprint1EventEntities(input.entities),
    payload: input.payload,
  };
  return validateSprint1EventEnvelope(envelope);
}

/**
 * Promote one provisional Sprint 0 EventEnvelope to Sprint 1 0.2.0.
 * Preserves sequence, eventId, worldDate, eventType, origin, sourceProcessor,
 * payload, existing entity refs, and ordering. Sets matchIds to [].
 */
export function promoteProvisionalEventToSprint1(
  event: EventEnvelope,
  simulationId: SimulationId,
): ValidationResult<Sprint1EventEnvelope> {
  try {
    validateEventEnvelope(event);
  } catch (error) {
    return failure([issueFromThrownError("", error)]);
  }
  if (typeof simulationId !== "string" || simulationId.length === 0) {
    return failure([
      {
        path: "/simulationId",
        message: "simulationId must be a non-empty string",
        actual: simulationId,
      },
    ]);
  }
  if ("matchIds" in event.entities && event.entities.matchIds !== undefined) {
    return failure([
      {
        path: "/entities/matchIds",
        message: "provisional Sprint 0 events must omit matchIds before promotion",
        actual: event.entities.matchIds,
        expected: "absent",
      },
    ]);
  }

  const promoted: Sprint1EventEnvelope = {
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    eventId: event.eventId,
    simulationId,
    sequence: event.sequence,
    eventType: event.eventType,
    importance: event.importance,
    worldDate: event.worldDate,
    origin: event.origin,
    sourceProcessor: event.sourceProcessor,
    entities: {
      personIds: [...event.entities.personIds],
      familyIds: [...event.entities.familyIds],
      lineageIds: [...event.entities.lineageIds],
      relationshipIds: [...event.entities.relationshipIds],
      matchIds: [],
    },
    payload: event.payload,
  };
  return validateSprint1EventEnvelope(promoted);
}

/**
 * Promote a contiguous provisional Sprint 0 event stream to Sprint 1 0.2.0.
 */
export function promoteProvisionalEventStreamToSprint1(
  events: readonly EventEnvelope[],
  simulationId: SimulationId,
  expectedProvisionalSimulationId: SimulationId,
): ValidationResult<Sprint1EventEnvelope[]> {
  try {
    validateEventSequence(events, { expectedStartSequence: 0 });
  } catch (error) {
    return failure([issueFromThrownError("/events", error)]);
  }

  const promoted: Sprint1EventEnvelope[] = [];
  for (let index = 0; index < events.length; index += 1) {
    if (events[index]!.simulationId !== expectedProvisionalSimulationId) {
      return failure([
        {
          path: `/${String(index)}/simulationId`,
          message:
            "provisional event simulationId must equal the expected provisional simulationId",
          actual: events[index]!.simulationId,
          expected: expectedProvisionalSimulationId,
        },
      ]);
    }
    const result = promoteProvisionalEventToSprint1(events[index]!, simulationId);
    if (!result.ok) {
      return failure(
        result.issues.map((issue) => ({
          ...issue,
          path: issue.path === "" ? `/${String(index)}` : `/${String(index)}${issue.path}`,
        })),
      );
    }
    promoted.push(result.value);
  }
  return success(deepFreezePlainJson(promoted));
}

/**
 * Allocate Sprint 1 EventEnvelopes for weekly-training candidates (10 §7 / §11).
 */
export function allocateWeeklyTrainingEventCandidates(
  input: AllocateWeeklyTrainingEventCandidatesInput,
): ValidationResult<{ envelopes: Sprint1EventEnvelope[]; nextSequence: number }> {
  const issues: ValidationIssue[] = [];
  if (input.sourceProcessor !== WEEKLY_TRAINING_PROCESSOR_ID) {
    issues.push({
      path: "/sourceProcessor",
      message: `sourceProcessor must be ${WEEKLY_TRAINING_PROCESSOR_ID}`,
      actual: input.sourceProcessor,
      expected: WEEKLY_TRAINING_PROCESSOR_ID,
    });
  }
  if (!Number.isSafeInteger(input.startSequence) || input.startSequence < 0) {
    issues.push({
      path: "/startSequence",
      message: "startSequence must be a non-negative safe integer",
      actual: input.startSequence,
    });
  }
  if (typeof input.simulationId !== "string" || input.simulationId.length === 0) {
    issues.push({
      path: "/simulationId",
      message: "simulationId must be a non-empty string",
      actual: input.simulationId,
    });
  }
  let worldDate: WorldDate | undefined;
  try {
    validateWorldDate(input.worldDate, DEFAULT_WORLD_CALENDAR_CONFIG);
    worldDate = input.worldDate;
  } catch (error) {
    issues.push(issueFromThrownError("/worldDate", error));
  }
  if (!Array.isArray(input.candidates)) {
    issues.push({
      path: "/candidates",
      message: "candidates must be an array",
      actual: input.candidates,
      expected: "array",
    });
  }
  if (
    !Number.isSafeInteger(input.startSequence) ||
    input.startSequence < 0 ||
    typeof input.simulationId !== "string" ||
    input.simulationId.length === 0 ||
    worldDate === undefined ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const envelopes: Sprint1EventEnvelope[] = [];
  let sequence = input.startSequence;
  for (let index = 0; index < input.candidates.length; index += 1) {
    const candidate = input.candidates[index]!;
    if (candidate.absoluteWeek !== worldDate.absoluteWeek) {
      return failure([
        {
          path: `/candidates/${String(index)}/absoluteWeek`,
          message: "candidate.absoluteWeek must equal worldDate.absoluteWeek",
          actual: candidate.absoluteWeek,
          expected: String(worldDate.absoluteWeek),
        },
      ]);
    }
    const allocated = allocateSprint1EventEnvelope({
      sequence,
      simulationId: input.simulationId,
      importance: "normal",
      worldDate,
      origin: "simulation",
      sourceProcessor: WEEKLY_TRAINING_PROCESSOR_ID,
      eventType: candidate.eventType,
      entities: {
        ...emptyEventEntities(),
        personIds: [candidate.personId],
        matchIds: [],
      },
      payload: candidate.payload,
    });
    if (!allocated.ok) {
      return failure(
        allocated.issues.map((issue) => ({
          ...issue,
          path:
            issue.path === ""
              ? `/candidates/${String(index)}`
              : `/candidates/${String(index)}${issue.path}`,
        })),
      );
    }
    envelopes.push(allocated.value);
    sequence += 1;
  }

  return success(
    deepFreezePlainJson({
      envelopes,
      nextSequence: sequence,
    }),
  );
}

function allocateBattleEventCandidate(
  candidate: BattleStartedEventCandidate | BattleFinishedEventCandidate,
  sequence: number,
  simulationId: SimulationId,
): ValidationResult<Sprint1EventEnvelope> {
  if (candidate.sourceProcessor !== BATTLE_SIMULATION_SOURCE_PROCESSOR) {
    return failure([
      {
        path: "/sourceProcessor",
        message: `sourceProcessor must be ${BATTLE_SIMULATION_SOURCE_PROCESSOR}`,
        actual: candidate.sourceProcessor,
        expected: BATTLE_SIMULATION_SOURCE_PROCESSOR,
      },
    ]);
  }
  return allocateSprint1EventEnvelope({
    sequence,
    simulationId,
    importance: "normal",
    worldDate: candidate.worldDate,
    origin: "simulation",
    sourceProcessor: BATTLE_SIMULATION_SOURCE_PROCESSOR,
    eventType: candidate.eventType,
    entities: {
      ...emptyEventEntities(),
      personIds: sortIdsAscending([...candidate.entities.personIds]),
      matchIds: [...candidate.entities.matchIds],
    },
    payload: candidate.payload,
  });
}

/**
 * Allocate Sprint 1 EventEnvelopes for battle.started / battle.finished candidates.
 */
export function allocateBattleEventCandidates(
  input: AllocateBattleEventCandidatesInput,
): ValidationResult<{ envelopes: Sprint1EventEnvelope[]; nextSequence: number }> {
  const issues: ValidationIssue[] = [];
  if (!Number.isSafeInteger(input.startSequence) || input.startSequence < 0) {
    issues.push({
      path: "/startSequence",
      message: "startSequence must be a non-negative safe integer",
      actual: input.startSequence,
    });
  }
  if (typeof input.simulationId !== "string" || input.simulationId.length === 0) {
    issues.push({
      path: "/simulationId",
      message: "simulationId must be a non-empty string",
      actual: input.simulationId,
    });
  }
  if (!Array.isArray(input.candidates)) {
    issues.push({
      path: "/candidates",
      message: "candidates must be an array",
      actual: input.candidates,
      expected: "array",
    });
  }
  if (
    !Number.isSafeInteger(input.startSequence) ||
    input.startSequence < 0 ||
    typeof input.simulationId !== "string" ||
    input.simulationId.length === 0 ||
    issues.length > 0
  ) {
    return failure(issues);
  }

  const envelopes: Sprint1EventEnvelope[] = [];
  let sequence = input.startSequence;
  for (let index = 0; index < input.candidates.length; index += 1) {
    const allocated = allocateBattleEventCandidate(
      input.candidates[index]!,
      sequence,
      input.simulationId,
    );
    if (!allocated.ok) {
      return failure(
        allocated.issues.map((issue) => ({
          ...issue,
          path:
            issue.path === ""
              ? `/candidates/${String(index)}`
              : `/candidates/${String(index)}${issue.path}`,
        })),
      );
    }
    envelopes.push(allocated.value);
    sequence += 1;
  }

  return success(
    deepFreezePlainJson({
      envelopes,
      nextSequence: sequence,
    }),
  );
}
