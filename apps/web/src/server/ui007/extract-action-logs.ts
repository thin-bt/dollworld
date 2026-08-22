/**
 * actionLogs-only source extraction (BRIDGE-046 / ACC-094 / MIG-010).
 * Never joins turnOrderLogs into paging source.
 */

import { fail, ok, type PureResult } from "./result.js";

export type ActionLogsExtraction = {
  actionLogs: readonly unknown[];
  totalCount: number;
  /** Observability only — must NOT affect totalCount or paging. */
  turnOrderLogsLength: number;
};

export function extractActionLogs(detailedLog: unknown): PureResult<ActionLogsExtraction> {
  if (typeof detailedLog !== "object" || detailedLog === null || Array.isArray(detailedLog)) {
    return fail("detailedLog must be an object");
  }
  const row = detailedLog as Record<string, unknown>;
  if (!Array.isArray(row.actionLogs) || !Array.isArray(row.turnOrderLogs)) {
    return fail("detailedLog must expose actionLogs and turnOrderLogs arrays");
  }
  // MIG-010: never use detailedLog.length or turnOrderLogs.length as totalCount
  return ok({
    actionLogs: row.actionLogs,
    totalCount: row.actionLogs.length,
    turnOrderLogsLength: row.turnOrderLogs.length,
  });
}
