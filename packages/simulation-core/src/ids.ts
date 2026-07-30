/**
 * Branded identifier types for Sprint 0 entities.
 * Brands prevent accidental mixing of ID kinds at compile time.
 */

declare const WorldIdBrand: unique symbol;
declare const PersonIdBrand: unique symbol;
declare const FamilyIdBrand: unique symbol;
declare const LineageIdBrand: unique symbol;
declare const RelationshipIdBrand: unique symbol;
declare const EventIdBrand: unique symbol;
declare const SimulationIdBrand: unique symbol;
declare const RunIdBrand: unique symbol;
declare const TournamentIdBrand: unique symbol;
declare const MatchIdBrand: unique symbol;

export type WorldId = string & { readonly [WorldIdBrand]: "WorldId" };
export type PersonId = string & { readonly [PersonIdBrand]: "PersonId" };
export type FamilyId = string & { readonly [FamilyIdBrand]: "FamilyId" };
export type LineageId = string & { readonly [LineageIdBrand]: "LineageId" };
export type RelationshipId = string & { readonly [RelationshipIdBrand]: "RelationshipId" };
export type EventId = string & { readonly [EventIdBrand]: "EventId" };
export type SimulationId = string & { readonly [SimulationIdBrand]: "SimulationId" };
export type RunId = string & { readonly [RunIdBrand]: "RunId" };
/** Reserved for future event envelopes; not generated in Sprint 0. */
export type TournamentId = string & { readonly [TournamentIdBrand]: "TournamentId" };
/** Reserved for future event envelopes; not generated in Sprint 0. */
export type MatchId = string & { readonly [MatchIdBrand]: "MatchId" };

export function asWorldId(value: string): WorldId {
  return value as WorldId;
}

export function asPersonId(value: string): PersonId {
  return value as PersonId;
}

export function asFamilyId(value: string): FamilyId {
  return value as FamilyId;
}

export function asLineageId(value: string): LineageId {
  return value as LineageId;
}

export function asRelationshipId(value: string): RelationshipId {
  return value as RelationshipId;
}

export function asEventId(value: string): EventId {
  return value as EventId;
}

export function asSimulationId(value: string): SimulationId {
  return value as SimulationId;
}

export function asRunId(value: string): RunId {
  return value as RunId;
}

export function asTournamentId(value: string): TournamentId {
  return value as TournamentId;
}

export function asMatchId(value: string): MatchId {
  return value as MatchId;
}
