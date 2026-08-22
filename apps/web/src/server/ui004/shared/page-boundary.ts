/**
 * Shared §10C exclusive page boundary helpers.
 * Future production owner: UI-004 (PAGE-001 / PAGE-002) + shared list semantics.
 * Does NOT sign nextCursor.
 */

export type ExclusivePageInput<T> = {
  sortedFiltered: readonly T[];
  limit: number;
  /** Index of first item to include (0-based). Exclusive cursor advances past matched item. */
  startIndex: number;
};

export type ExclusivePageOutput<T> = {
  items: readonly T[];
  totalCount: number;
  hasNext: boolean;
  /** Index after the last returned item; useful for building nextPosition from that item. */
  endIndexExclusive: number;
};

export function pageExclusiveSlice<T>(input: ExclusivePageInput<T>): ExclusivePageOutput<T> {
  const { sortedFiltered, limit, startIndex } = input;
  const totalCount = sortedFiltered.length;
  const safeStart = Math.max(0, Math.min(startIndex, totalCount));
  const endIndexExclusive = Math.min(safeStart + limit, totalCount);
  const items = sortedFiltered.slice(safeStart, endIndexExclusive);
  const hasNext = endIndexExclusive < totalCount;
  return { items, totalCount, hasNext, endIndexExclusive };
}

/**
 * Find exclusive start index: first item strictly after the cursor item according to `isAfterCursor`.
 * If cursor item is not found, returns -1 (caller / route layer maps to STALE_CURSOR).
 */
export function findExclusiveStartIndex<T>(
  sortedFiltered: readonly T[],
  cursorItem: T,
  isSameItem: (a: T, b: T) => boolean,
): number {
  const index = sortedFiltered.findIndex((item) => isSameItem(item, cursorItem));
  if (index < 0) {
    return -1;
  }
  return index + 1;
}
