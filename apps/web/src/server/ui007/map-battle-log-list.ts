/**
 * exact4 BattleLogListDataView mapping (§10F.1 / PAGE-014 / ACC-167).
 */

import { fail, ok, type PureResult } from "./result.js";
import {
  BATTLE_LOG_LIST_DATA_KEYS,
  type BattleLogItemView,
  type BattleLogListDataView,
} from "./types.js";

export function mapBattleLogListDataView(input: {
  items: BattleLogItemView[];
  totalCount: number;
  nextCursor: string | null;
  resultUiRevision: number;
}): PureResult<BattleLogListDataView> {
  if (!Number.isInteger(input.resultUiRevision) || input.resultUiRevision < 0) {
    return fail("resultUiRevision must be non-negative safe integer");
  }
  if (input.totalCount < 0 || !Number.isInteger(input.totalCount)) {
    return fail("totalCount invalid");
  }

  const view: BattleLogListDataView = {
    items: input.items,
    totalCount: input.totalCount,
    nextCursor: input.nextCursor,
    resultUiRevision: input.resultUiRevision,
  };

  const keys = Object.keys(view);
  if (keys.length !== BATTLE_LOG_LIST_DATA_KEYS.length) {
    return fail(`BattleLogListDataView must be exact4, got ${keys.length}`);
  }
  for (const key of BATTLE_LOG_LIST_DATA_KEYS) {
    if (!(key in view)) {
      return fail(`missing exact4 key: ${key}`);
    }
  }
  for (const forbidden of ["matchId", "sourceWorldUiRevision", "dataIdentity", "page", "hasMore"]) {
    if (forbidden in view) {
      return fail(`forbidden wrapper key: ${forbidden}`);
    }
  }
  return ok(view);
}
