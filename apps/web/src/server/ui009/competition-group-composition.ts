import type { PersonId } from "@shared-world/simulation-core";

/**
 * Deterministic group split for UI009 group_plus_knockout integration.
 * Participants are distributed round-robin across fixed groupCount buckets.
 */
export function buildUi009GroupComposition(
  orderedPersonIds: readonly PersonId[],
  groupCount: number,
): readonly (readonly PersonId[])[] {
  if (!Number.isSafeInteger(groupCount) || groupCount < 1) {
    return [];
  }
  const buckets: PersonId[][] = Array.from({ length: groupCount }, () => []);
  for (let index = 0; index < orderedPersonIds.length; index += 1) {
    buckets[index % groupCount]!.push(orderedPersonIds[index]!);
  }
  return buckets
    .map((personIds, groupIndex) => ({ groupIndex, personIds: [...personIds].sort() }))
    .filter((row) => row.personIds.length > 0)
    .sort((left, right) => left.groupIndex - right.groupIndex)
    .map((row) => row.personIds);
}
