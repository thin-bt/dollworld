/**
 * personId filter: EventEnvelope.entities.personIds only (FI-063 / ACC-093 / §10).
 */

export function matchesPersonIdFilter(
  event: { entities: { personIds: readonly string[] } },
  personId: string | null,
): boolean {
  if (personId === null) {
    return true;
  }
  return event.entities.personIds.includes(personId);
}

/** True when payload appears to contain personId but entities do not (spoof negative). */
export function payloadPersonIdMustNotAffectFilter(
  event: { entities: { personIds: readonly string[] }; payload: Record<string, unknown> },
  personId: string,
): boolean {
  const payloadHas =
    event.payload.personId === personId ||
    (typeof event.payload.personId === "string" && event.payload.personId === personId);
  const entitiesHas = event.entities.personIds.includes(personId);
  return payloadHas && !entitiesHas;
}
