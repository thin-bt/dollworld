/**
 * Project retained detailed battle logs into UI-007 item views + canonical turn order logs.
 */

import { validateBattleTurnOrderLog } from "@shared-world/simulation-core";
import type { BattleDetailedLog } from "@shared-world/simulation-core";
import { mapBattleActionLogToItemView } from "../ui007/map-battle-log-item.js";
import type { BattleLogItemView } from "../ui007/types.js";
import { fail, ok, type PureResult } from "../ui007/result.js";

export type CompetitionTurnOrderLogView = Record<string, unknown>;

export type CompetitionMatchLogProjection = {
  turnOrderLogs: CompetitionTurnOrderLogView[];
  logItems: BattleLogItemView[];
  actionCount: number;
};

export function projectCompetitionMatchDetailedLog(
  detailedLog: BattleDetailedLog,
): PureResult<CompetitionMatchLogProjection> {
  const actionLogs = detailedLog.actionLogs;
  const turnOrderLogs: CompetitionTurnOrderLogView[] = [];
  for (let index = 0; index < detailedLog.turnOrderLogs.length; index += 1) {
    const validated = validateBattleTurnOrderLog(detailedLog.turnOrderLogs[index]);
    if (!validated.ok) {
      return fail(`turnOrderLogs[${String(index)}] validation failed`);
    }
    turnOrderLogs.push(validated.value as unknown as CompetitionTurnOrderLogView);
  }

  const logItems: BattleLogItemView[] = [];
  for (let sourceIndex = 0; sourceIndex < actionLogs.length; sourceIndex += 1) {
    const mapped = mapBattleActionLogToItemView(actionLogs[sourceIndex], sourceIndex);
    if (!mapped.ok) {
      return mapped;
    }
    logItems.push(mapped.value);
  }

  return ok({
    turnOrderLogs,
    logItems,
    actionCount: actionLogs.length,
  });
}
