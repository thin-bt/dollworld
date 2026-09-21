/**
 * Presentation-only personId → observer label (UI-005 displayName projection on the client).
 */

export function personDisplayLabel(
  personId: string,
  personNameById: ReadonlyMap<string, string> | Record<string, string> | undefined,
): string {
  if (personId.length === 0) {
    return "—";
  }
  if (personNameById instanceof Map && personNameById.has(personId)) {
    const named = personNameById.get(personId);
    if (typeof named === "string" && named.length > 0) {
      return named;
    }
  }
  if (personNameById !== undefined && Object.hasOwn(personNameById, personId)) {
    const named = (personNameById as Record<string, string>)[personId];
    if (typeof named === "string" && named.length > 0) {
      return named;
    }
  }
  return personId;
}
