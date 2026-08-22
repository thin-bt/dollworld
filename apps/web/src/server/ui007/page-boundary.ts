/**
 * §10C exclusive page boundary (shared pattern with UI-004).
 */

export type ExclusivePageInput<T> = {
  sortedFiltered: readonly T[];
  limit: number;
  startIndex: number;
};

export type ExclusivePageOutput<T> = {
  items: readonly T[];
  totalCount: number;
  hasNext: boolean;
  endIndexExclusive: number;
};

export function pageExclusiveSlice<T>(input: ExclusivePageInput<T>): ExclusivePageOutput<T> {
  const { sortedFiltered, limit, startIndex } = input;
  const totalCount = sortedFiltered.length;
  const safeStart = Math.max(0, Math.min(startIndex, totalCount));
  const endIndexExclusive = Math.min(safeStart + limit, totalCount);
  const items = sortedFiltered.slice(safeStart, endIndexExclusive);
  return {
    items,
    totalCount,
    hasNext: endIndexExclusive < totalCount,
    endIndexExclusive,
  };
}
