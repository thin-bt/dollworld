/**
 * Battle log sourceIndex paging (PAGE-005 / FIX-008 / §10C).
 */

import { fail, ok, type PureResult } from "./result.js";
import { mapBattleActionLogToItemView } from "./map-battle-log-item.js";
import type { BattleLogItemView, BattleLogNextPosition, BattleLogQuery } from "./types.js";
import { pageExclusiveSlice } from "./page-boundary.js";

export type BattleLogPageResult = {
  items: BattleLogItemView[];
  totalCount: number;
  nextPosition: BattleLogNextPosition | null;
};

export function buildBattleLogPage(input: {
  actionLogs: readonly unknown[];
  query: BattleLogQuery;
  cursorNextPosition: BattleLogNextPosition | null;
}): PureResult<BattleLogPageResult> {
  const { actionLogs, query, cursorNextPosition } = input;
  const totalCount = actionLogs.length;

  let startIndex = 0;
  if (cursorNextPosition !== null) {
    const { sourceIndex } = cursorNextPosition;
    if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= totalCount) {
      return fail("cursor sourceIndex out of range", "STALE_CURSOR");
    }
    startIndex = sourceIndex + 1; // exclusive
  }

  const sliced = pageExclusiveSlice({
    sortedFiltered: actionLogs,
    limit: query.limit,
    startIndex,
  });

  const items: BattleLogItemView[] = [];
  for (let i = 0; i < sliced.items.length; i += 1) {
    const absoluteIndex = startIndex + i;
    const mapped = mapBattleActionLogToItemView(sliced.items[i], absoluteIndex);
    if (!mapped.ok) {
      return mapped;
    }
    items.push(mapped.value);
  }

  const lastAbsoluteIndex = sliced.endIndexExclusive - 1;
  const nextPosition =
    sliced.hasNext && lastAbsoluteIndex >= 0 ? { sourceIndex: lastAbsoluteIndex } : null;

  return ok({ items, totalCount, nextPosition });
}
