/**
 * S02-011 Sprint2 EventEnvelope 0.2.0 extension with tournamentIds and ordering validation.
 */
import { compareUnicodeCodePoints, toCanonicalJson } from "../canonical-json.js";
import { assertEventIdMatchesSequence, eventIdFromSequence } from "../events/event-id.js";
import {
  isEventImportance,
  isEventOrigin,
  type EventImportance,
  type EventOrigin,
} from "../events/types.js";
import type { EventId, SimulationId, TournamentId } from "../ids.js";
import {
  asEventId,
  asFamilyId,
  asLineageId,
  asMatchId,
  asPersonId,
  asRelationshipId,
  asTournamentId,
} from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { validateWorldDate, type WorldDate, DEFAULT_WORLD_CALENDAR_CONFIG } from "../world-date.js";
import { BATTLE_FINISHED_EVENT_TYPE } from "../sprint1/battle-finished-event.js";
import { BATTLE_STARTED_EVENT_TYPE } from "../sprint1/battle-started-event.js";
import {
  EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
  SPRINT1_EVENT_ENVELOPE_KEYS,
  SPRINT1_EVENT_ENTITIES_KEYS,
  type Sprint1EventEntities,
  validateSprint1EventEnvelope,
} from "../sprint1/event-envelope-sprint1.js";
import { MATCH_ID_FORMAT_PATTERN } from "../sprint1/match-id-generator.js";
import {
  assertNoAccessors,
  childPath,
  deepFreezePlainJson,
  rejectUnknownKeys,
  requireNonEmptyString,
  requireSafeIntegerAtLeast,
  snapshotDenseArrayOrFail,
  snapshotPlainObjectOrFail,
} from "../sprint1/plain-data.js";
import { TOURNAMENT_ID_FORMAT_PATTERN } from "./constants.js";
import {
  isSprint2TournamentEventType,
  PERSON_RANK_PROMOTED_EVENT_TYPE,
  PERSON_S_RANK_PROMOTED_EVENT_TYPE,
  PERSON_S_RANK_QUALIFIED_EVENT_TYPE,
  TOURNAMENT_FINISHED_EVENT_TYPE,
  TOURNAMENT_MATCH_BYE_EVENT_TYPE,
  TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
  TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE,
  validateSprint2TournamentEventPayload,
} from "./tournament-event-payloads.js";

export const SPRINT2_EVENT_ENTITIES_KEYS = [
  ...SPRINT1_EVENT_ENTITIES_KEYS,
  "tournamentIds",
] as const;

export type Sprint2EventEntities = Sprint1EventEntities & {
  tournamentIds: TournamentId[];
};

export type Sprint2EventEnvelope = {
  schemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1;
  eventId: EventId;
  simulationId: SimulationId;
  sequence: number;
  eventType: string;
  importance: EventImportance;
  worldDate: WorldDate;
  origin: EventOrigin;
  sourceProcessor: string;
  entities: Sprint2EventEntities;
  payload: Readonly<Record<string, unknown>>;
};

export type AllocateSprint2EventEnvelopeInput = {
  sequence: number;
  simulationId: SimulationId;
  importance: EventImportance;
  worldDate: WorldDate;
  origin: EventOrigin;
  sourceProcessor: string;
  eventType: string;
  entities: Sprint2EventEntities;
  payload: Readonly<Record<string, unknown>>;
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

function normalizeSprint2EventEntities(entities: Sprint2EventEntities): Sprint2EventEntities {
  return {
    personIds: sortIdsAscending(entities.personIds),
    familyIds: sortIdsAscending(entities.familyIds),
    lineageIds: sortIdsAscending(entities.lineageIds),
    relationshipIds: sortIdsAscending(entities.relationshipIds),
    matchIds: sortIdsAscending(entities.matchIds),
    tournamentIds: sortIdsAscending(entities.tournamentIds),
  };
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
      });
      return;
    }
    seen.add(id);
    if (index > 0 && compareUnicodeCodePoints(ids[index - 1]!, id) > 0) {
      issues.push({
        path,
        message: `${path} must be sorted in canonical ascending order`,
        actual: `${ids[index - 1]!} before ${id}`,
      });
      return;
    }
  }
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
      });
      return undefined;
    }
    ids.push(asId(item));
  }
  return ids;
}

function parseSprint2EventEntities(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): Sprint2EventEntities | undefined {
  const object = snapshotPlainObjectOrFail(value, path, issues);
  if (object === undefined) {
    return undefined;
  }
  assertNoAccessors(object, path, issues);
  rejectUnknownKeys(object, SPRINT2_EVENT_ENTITIES_KEYS, path, issues);

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
  const tournamentIds = parseIdArray(
    object["tournamentIds"],
    childPath(path, "tournamentIds"),
    issues,
    asTournamentId,
    "TournamentId",
  );

  if (
    personIds === undefined ||
    familyIds === undefined ||
    lineageIds === undefined ||
    relationshipIds === undefined ||
    matchIds === undefined ||
    tournamentIds === undefined
  ) {
    return undefined;
  }

  assertCanonicalAscendingIds(personIds, childPath(path, "personIds"), issues);
  assertCanonicalAscendingIds(familyIds, childPath(path, "familyIds"), issues);
  assertCanonicalAscendingIds(lineageIds, childPath(path, "lineageIds"), issues);
  assertCanonicalAscendingIds(relationshipIds, childPath(path, "relationshipIds"), issues);
  assertCanonicalAscendingIds(matchIds, childPath(path, "matchIds"), issues);
  assertCanonicalAscendingIds(tournamentIds, childPath(path, "tournamentIds"), issues);

  for (let index = 0; index < matchIds.length; index += 1) {
    if (!MATCH_ID_FORMAT_PATTERN.test(matchIds[index]!)) {
      issues.push({
        path: childPath(childPath(path, "matchIds"), index),
        message: "matchIds entries must match match-id-generator format",
        actual: matchIds[index],
      });
    }
  }
  for (let index = 0; index < tournamentIds.length; index += 1) {
    if (!TOURNAMENT_ID_FORMAT_PATTERN.test(tournamentIds[index]!)) {
      issues.push({
        path: childPath(childPath(path, "tournamentIds"), index),
        message: "tournamentIds entries must match tournament-id format",
        actual: tournamentIds[index],
      });
    }
  }

  return { personIds, familyIds, lineageIds, relationshipIds, matchIds, tournamentIds };
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
  const worldDate = { year, month, weekOfMonth, absoluteWeek } as WorldDate;
  try {
    validateWorldDate(worldDate, DEFAULT_WORLD_CALENDAR_CONFIG);
  } catch (error) {
    issues.push(issueFromThrownError(path, error));
    return undefined;
  }
  return worldDate;
}

export function validateSprint2EventEnvelope(
  event: unknown,
): ValidationResult<Sprint2EventEnvelope> {
  const issues: ValidationIssue[] = [];
  const object = snapshotPlainObjectOrFail(event, "", issues);
  if (object === undefined) {
    return failure(issues);
  }
  assertNoAccessors(object, "", issues);
  rejectUnknownKeys(object, SPRINT1_EVENT_ENVELOPE_KEYS, "", issues);

  const schemaVersion = object["schemaVersion"];
  if (schemaVersion !== EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1) {
    issues.push({
      path: "/schemaVersion",
      message: `schemaVersion must be ${EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1}`,
      actual: schemaVersion,
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
    });
  }
  const originRaw = object["origin"];
  if (typeof originRaw !== "string" || !isEventOrigin(originRaw)) {
    issues.push({
      path: "/origin",
      message: "origin must be a defined EventOrigin",
      actual: originRaw,
    });
  }
  const sourceProcessor = requireNonEmptyString(object, "sourceProcessor", "", issues);
  const worldDate = parseWorldDate(object["worldDate"], "/worldDate", issues);
  const entities = parseSprint2EventEntities(object["entities"], "/entities", issues);

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

  if (isSprint2TournamentEventType(eventType)) {
    const payloadValidation = validateSprint2TournamentEventPayload(eventType, object["payload"]);
    if (!payloadValidation.ok) {
      return failure(payloadValidation.issues);
    }
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

export function allocateSprint2EventEnvelope(
  input: AllocateSprint2EventEnvelopeInput,
): ValidationResult<Sprint2EventEnvelope> {
  const envelope: Sprint2EventEnvelope = {
    schemaVersion: EVENT_ENVELOPE_SCHEMA_VERSION_SPRINT1,
    eventId: eventIdFromSequence(input.sequence),
    simulationId: input.simulationId,
    sequence: input.sequence,
    eventType: input.eventType,
    importance: input.importance,
    worldDate: input.worldDate,
    origin: input.origin,
    sourceProcessor: input.sourceProcessor,
    entities: normalizeSprint2EventEntities(input.entities),
    payload: input.payload,
  };
  return validateSprint2EventEnvelope(envelope);
}

export function validateSprint2EventSequence(
  events: readonly Sprint2EventEnvelope[],
  options: { expectedStartSequence?: number } = {},
): ValidationResult<readonly Sprint2EventEnvelope[]> {
  const expectedStart = options.expectedStartSequence ?? 0;
  const issues: ValidationIssue[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const expectedSequence = expectedStart + index;
    if (event.sequence !== expectedSequence) {
      issues.push({
        path: `/${String(index)}/sequence`,
        message: "sequence gap or out-of-order event",
        actual: event.sequence,
        expected: String(expectedSequence),
      });
    }
    const validated = validateSprint2EventEnvelope(event);
    if (!validated.ok) {
      return failure(
        validated.issues.map((issue) => ({
          ...issue,
          path: issue.path === "" ? `/${String(index)}` : `/${String(index)}${issue.path}`,
        })),
      );
    }
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(events);
}

export function computeSprint2EventCandidateIdentity(event: Sprint2EventEnvelope): string {
  return toCanonicalJson({
    eventType: event.eventType,
    sourceProcessor: event.sourceProcessor,
    entities: event.entities,
    payload: event.payload,
  });
}

export function rejectDuplicateSprint2EventCandidate(
  existingEvents: readonly Sprint2EventEnvelope[],
  candidate: Sprint2EventEnvelope,
): ValidationResult<Sprint2EventEnvelope> {
  const validated = validateSprint2EventEnvelope(candidate);
  if (!validated.ok) {
    return validated;
  }
  const identity = computeSprint2EventCandidateIdentity(validated.value);
  for (const existing of existingEvents) {
    if (computeSprint2EventCandidateIdentity(existing) === identity) {
      return failure([
        {
          path: "/eventType",
          message: "duplicate event candidate rejected",
          actual: validated.value.eventType,
        },
      ]);
    }
  }
  return validated;
}

function findNextIndex(
  events: readonly Sprint2EventEnvelope[],
  start: number,
  predicate: (e: Sprint2EventEnvelope) => boolean,
): number {
  for (let index = start; index < events.length; index += 1) {
    if (predicate(events[index]!)) {
      return index;
    }
  }
  return -1;
}

export function validateSprint2TournamentEventOrdering(
  events: readonly Sprint2EventEnvelope[],
): ValidationResult<true> {
  const sequenceValidation = validateSprint2EventSequence(events);
  if (!sequenceValidation.ok) {
    return sequenceValidation as ValidationResult<true>;
  }

  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;

    if (event.eventType === BATTLE_STARTED_EVENT_TYPE) {
      const finishedIndex = findNextIndex(
        events,
        index + 1,
        (e) => e.eventType === BATTLE_FINISHED_EVENT_TYPE,
      );
      if (finishedIndex === -1) {
        return failure([
          {
            path: `/${String(index)}`,
            message: "battle.started must be followed by battle.finished",
          },
        ]);
      }
      const recordedIndex = findNextIndex(
        events,
        finishedIndex + 1,
        (e) => e.eventType === TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
      );
      if (recordedIndex === -1) {
        return failure([
          {
            path: `/${String(finishedIndex)}`,
            message:
              "battle.finished must be followed by tournament.match_recorded for completed battle",
          },
        ]);
      }
      if (finishedIndex !== index + 1) {
        return failure([
          {
            path: `/${String(index + 1)}`,
            message:
              "EVT-001 requires battle.started -> battle.finished -> tournament.match_recorded order",
            actual: events[index + 1]?.eventType,
            expected: BATTLE_FINISHED_EVENT_TYPE,
          },
        ]);
      }
      if (recordedIndex !== finishedIndex + 1) {
        return failure([
          {
            path: `/${String(finishedIndex + 1)}`,
            message:
              "EVT-001 requires battle.started -> battle.finished -> tournament.match_recorded order",
            actual: events[finishedIndex + 1]?.eventType,
            expected: TOURNAMENT_MATCH_RECORDED_EVENT_TYPE,
          },
        ]);
      }
    }

    if (event.eventType === TOURNAMENT_MATCH_RECORDED_EVENT_TYPE) {
      const roundIndex = findNextIndex(
        events,
        index + 1,
        (e) => e.eventType === TOURNAMENT_ROUND_COMPLETED_EVENT_TYPE,
      );
      const finishedIndex = findNextIndex(
        events,
        index + 1,
        (e) => e.eventType === TOURNAMENT_FINISHED_EVENT_TYPE,
      );
      if (roundIndex !== -1 && finishedIndex !== -1 && roundIndex < finishedIndex) {
        if (roundIndex !== index + 1 || finishedIndex !== roundIndex + 1) {
          return failure([
            {
              path: `/${String(index + 1)}`,
              message:
                "EVT-002 requires tournament.match_recorded -> round_completed -> tournament.finished order",
            },
          ]);
        }
      }
    }

    if (event.eventType === TOURNAMENT_FINISHED_EVENT_TYPE) {
      const next = events[index + 1];
      if (next !== undefined) {
        const promotionTypes = new Set([
          PERSON_RANK_PROMOTED_EVENT_TYPE,
          "person.promotion_qualified",
          PERSON_S_RANK_QUALIFIED_EVENT_TYPE,
          PERSON_S_RANK_PROMOTED_EVENT_TYPE,
        ]);
        if (promotionTypes.has(next.eventType)) {
          if (next.eventType === PERSON_S_RANK_QUALIFIED_EVENT_TYPE) {
            const promoted = events[index + 2];
            if (promoted?.eventType !== PERSON_S_RANK_PROMOTED_EVENT_TYPE) {
              return failure([
                {
                  path: `/${String(index + 2)}`,
                  message: "EVT-006 requires person.s_rank_qualified -> person.s_rank_promoted",
                  actual: promoted?.eventType,
                  expected: PERSON_S_RANK_PROMOTED_EVENT_TYPE,
                },
              ]);
            }
          }
        }
      }
    }

    if (event.eventType === TOURNAMENT_MATCH_BYE_EVENT_TYPE) {
      const priorBattle = events
        .slice(Math.max(0, index - 2), index)
        .some(
          (e) =>
            e.eventType === BATTLE_STARTED_EVENT_TYPE || e.eventType === BATTLE_FINISHED_EVENT_TYPE,
        );
      if (priorBattle) {
        return failure([
          {
            path: `/${String(index)}`,
            message: "EVT-004 bye must emit zero battle events",
          },
        ]);
      }
    }
  }

  return success(true);
}

export function toSprint1CompatibleEnvelope(
  event: Sprint2EventEnvelope,
): ValidationResult<
  ReturnType<typeof validateSprint1EventEnvelope> extends ValidationResult<infer T> ? T : never
> {
  if (event.entities.tournamentIds.length > 0) {
    return failure([
      {
        path: "/entities/tournamentIds",
        message: "Sprint1 envelope must omit tournamentIds",
        actual: event.entities.tournamentIds,
      },
    ]);
  }
  return validateSprint1EventEnvelope({
    ...event,
    entities: {
      personIds: event.entities.personIds,
      familyIds: event.entities.familyIds,
      lineageIds: event.entities.lineageIds,
      relationshipIds: event.entities.relationshipIds,
      matchIds: event.entities.matchIds,
    },
  });
}

export function sprint2EventsToJsonl(events: readonly Sprint2EventEnvelope[]): string {
  return `${events.map((event) => toCanonicalJson(event)).join("\n")}\n`;
}
