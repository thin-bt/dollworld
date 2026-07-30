import type { CareerStatus, Rank } from "../enums.js";
import { RANK_ORDER } from "../enums.js";
import type {
  EventId,
  FamilyId,
  LineageId,
  MatchId,
  PersonId,
  RelationshipId,
  SimulationId,
  TournamentId,
} from "../ids.js";
import type { WorldDate } from "../world-date.js";

/** Fixed EventEnvelope schemaVersion (03 mini-spec example). */
export const EVENT_ENVELOPE_SCHEMA_VERSION = "0.1.0" as const;

export const EVENT_IMPORTANCES = ["minor", "normal", "major", "historic"] as const;
export type EventImportance = (typeof EVENT_IMPORTANCES)[number];

export const EVENT_ORIGINS = ["initialization", "simulation", "validation"] as const;
export type EventOrigin = (typeof EVENT_ORIGINS)[number];

export const CAREER_STATUSES = ["child", "trainee", "active_competitor", "retired"] as const;

export const SPRINT0_EVENT_TYPES = [
  "world.started",
  "world.year_stats_finalized",
  "world.year_started",
  "family.initialized",
  "lineage.initialized",
  "person.initialized",
  "relationship.initialized",
  "person.aged",
  "person.career_status_changed",
  "person.debuted",
  "person.force_retired",
  "simulation.completed",
  "validation.failed",
] as const;

export type Sprint0EventType = (typeof SPRINT0_EVENT_TYPES)[number];

export type EventEntities = {
  personIds: PersonId[];
  familyIds: FamilyId[];
  lineageIds: LineageId[];
  relationshipIds: RelationshipId[];
  tournamentIds?: TournamentId[];
  matchIds?: MatchId[];
};

export type EventEnvelopeBase = {
  schemaVersion: typeof EVENT_ENVELOPE_SCHEMA_VERSION;
  eventId: EventId;
  simulationId: SimulationId;
  sequence: number;
  importance: EventImportance;
  worldDate: WorldDate;
  origin: EventOrigin;
  sourceProcessor: string;
  entities: EventEntities;
};

export type WorldStartedPayload = {
  worldId?: string;
};

export type WorldYearStatsFinalizedPayload = {
  worldYear: number;
};

export type WorldYearStartedPayload = {
  worldYear: number;
};

export type FamilyInitializedPayload = {
  familyId: FamilyId;
};

export type LineageInitializedPayload = {
  lineageId: LineageId;
};

export type PersonInitializedPayload = {
  personId: PersonId;
};

export type RelationshipInitializedPayload = {
  relationshipId: RelationshipId;
};

export type PersonAgedPayload = {
  previousAge: number;
  nextAge: number;
  birthYear: number;
  worldYear: number;
};

export type PersonCareerStatusChangedPayload = {
  previousCareerStatus: CareerStatus;
  nextCareerStatus: CareerStatus;
};

export type PersonDebutedPayload = {
  previousCareerStatus: "child" | "trainee";
  nextCareerStatus: "active_competitor";
  rank: Rank;
};

export type PersonForceRetiredPayload = {
  previousCareerStatus: "active_competitor";
  nextCareerStatus: "retired";
  retirementRank: Rank;
  highestRank: Rank;
};

export type SimulationCompletedPayload = {
  finalAbsoluteWeek?: number;
};

export type ValidationFailedPayload = {
  reason: string;
};

export type WorldStartedEvent = EventEnvelopeBase & {
  eventType: "world.started";
  payload: WorldStartedPayload;
};

export type WorldYearStatsFinalizedEvent = EventEnvelopeBase & {
  eventType: "world.year_stats_finalized";
  payload: WorldYearStatsFinalizedPayload;
};

export type WorldYearStartedEvent = EventEnvelopeBase & {
  eventType: "world.year_started";
  payload: WorldYearStartedPayload;
};

export type FamilyInitializedEvent = EventEnvelopeBase & {
  eventType: "family.initialized";
  payload: FamilyInitializedPayload;
};

export type LineageInitializedEvent = EventEnvelopeBase & {
  eventType: "lineage.initialized";
  payload: LineageInitializedPayload;
};

export type PersonInitializedEvent = EventEnvelopeBase & {
  eventType: "person.initialized";
  payload: PersonInitializedPayload;
};

export type RelationshipInitializedEvent = EventEnvelopeBase & {
  eventType: "relationship.initialized";
  payload: RelationshipInitializedPayload;
};

export type PersonAgedEvent = EventEnvelopeBase & {
  eventType: "person.aged";
  payload: PersonAgedPayload;
};

export type PersonCareerStatusChangedEvent = EventEnvelopeBase & {
  eventType: "person.career_status_changed";
  payload: PersonCareerStatusChangedPayload;
};

export type PersonDebutedEvent = EventEnvelopeBase & {
  eventType: "person.debuted";
  payload: PersonDebutedPayload;
};

export type PersonForceRetiredEvent = EventEnvelopeBase & {
  eventType: "person.force_retired";
  payload: PersonForceRetiredPayload;
};

export type SimulationCompletedEvent = EventEnvelopeBase & {
  eventType: "simulation.completed";
  payload: SimulationCompletedPayload;
};

export type ValidationFailedEvent = EventEnvelopeBase & {
  eventType: "validation.failed";
  payload: ValidationFailedPayload;
};

export type EventEnvelope =
  | WorldStartedEvent
  | WorldYearStatsFinalizedEvent
  | WorldYearStartedEvent
  | FamilyInitializedEvent
  | LineageInitializedEvent
  | PersonInitializedEvent
  | RelationshipInitializedEvent
  | PersonAgedEvent
  | PersonCareerStatusChangedEvent
  | PersonDebutedEvent
  | PersonForceRetiredEvent
  | SimulationCompletedEvent
  | ValidationFailedEvent;

export function isSprint0EventType(value: string): value is Sprint0EventType {
  return (SPRINT0_EVENT_TYPES as readonly string[]).includes(value);
}

export function isEventImportance(value: string): value is EventImportance {
  return (EVENT_IMPORTANCES as readonly string[]).includes(value);
}

export function isEventOrigin(value: string): value is EventOrigin {
  return (EVENT_ORIGINS as readonly string[]).includes(value);
}

export function isCareerStatus(value: string): value is CareerStatus {
  return (CAREER_STATUSES as readonly string[]).includes(value);
}

export function isRank(value: string): value is Rank {
  return (RANK_ORDER as readonly string[]).includes(value);
}

export function emptyEventEntities(): EventEntities {
  return {
    personIds: [],
    familyIds: [],
    lineageIds: [],
    relationshipIds: [],
  };
}
