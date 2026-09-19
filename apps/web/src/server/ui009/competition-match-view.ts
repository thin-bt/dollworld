import type { StoredBattleResultRecord } from "@shared-world/simulation-core";
import { materializeStoredBattleResultView } from "@shared-world/simulation-core";
import type { Sha256Provider } from "@shared-world/simulation-core";
import type { Sprint1RunSession } from "@shared-world/simulation-core";
import type { BattleLogItemView } from "../ui007/types.js";
import type { CompetitionPersistedState } from "./competition-store.js";
import { restoreDetailedLogPayloadStore } from "./competition-payload-store.js";
import { displayNameForPersonIdInSession } from "./competition-engine.js";
import {
  projectCompetitionMatchDetailedLog,
  type CompetitionTurnOrderLogView,
} from "./competition-match-log-projection.js";

export type CompetitionMatchDetailUnavailableReason =
  | "not_retained"
  | "pruned"
  | "missing_payload"
  | null;

export type CompetitionMatchDetailView = {
  matchId: string;
  participantAId: string;
  participantBId: string;
  participantADisplayName: string;
  participantBDisplayName: string;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  winnerDisplayName: string | null;
  loserDisplayName: string | null;
  resultKind: string;
  tournamentId: string | null;
  detailedLogAvailable: boolean;
  detailedLogUnavailableReason: CompetitionMatchDetailUnavailableReason;
  detailedLogActionCount: number;
  turnOrderLogs: readonly CompetitionTurnOrderLogView[];
  logItems: readonly BattleLogItemView[];
};

export function findStoredBattleRecord(
  state: CompetitionPersistedState,
  matchId: string,
): StoredBattleResultRecord | null {
  for (const raw of state.storedRecords) {
    const record = raw as unknown as StoredBattleResultRecord;
    if (record.matchId === matchId) {
      return record;
    }
  }
  return null;
}

export function mapCompetitionMatchDetailView(input: {
  state: CompetitionPersistedState;
  matchId: string;
  provider: Sha256Provider;
}):
  | { kind: "found"; view: CompetitionMatchDetailView }
  | { kind: "not_found" }
  | { kind: "log_projection_failed"; message: string } {
  const record = findStoredBattleRecord(input.state, input.matchId);
  if (record === null) {
    return { kind: "not_found" };
  }
  const payloadStore = restoreDetailedLogPayloadStore(input.state.payloadStore);
  let detailedLogAvailable = false;
  let detailedLogUnavailableReason: CompetitionMatchDetailUnavailableReason = "missing_payload";
  let detailedLogActionCount = 0;
  let turnOrderLogs: readonly CompetitionTurnOrderLogView[] = [];
  let logItems: readonly BattleLogItemView[] = [];

  if (record.detailedLogRetentionStatus === "pruned") {
    detailedLogUnavailableReason = "pruned";
  } else if (payloadStore !== null) {
    const materialized = materializeStoredBattleResultView(record, payloadStore, input.provider);
    if (!materialized.ok) {
      detailedLogUnavailableReason = "missing_payload";
    } else if (materialized.value.detailedLog === null) {
      detailedLogUnavailableReason = "not_retained";
    } else {
      const projected = projectCompetitionMatchDetailedLog(materialized.value.detailedLog);
      if (!projected.ok) {
        return { kind: "log_projection_failed", message: projected.reason };
      }
      detailedLogAvailable = true;
      detailedLogUnavailableReason = null;
      detailedLogActionCount = projected.value.actionCount;
      turnOrderLogs = projected.value.turnOrderLogs;
      logItems = projected.value.logItems;
    }
  }

  const session = input.state.isolatedSession as unknown as Sprint1RunSession;
  const nameFor = (personId: string) => displayNameForPersonIdInSession(session, personId);
  return {
    kind: "found",
    view: {
      matchId: record.matchId,
      participantAId: record.participantAId,
      participantBId: record.participantBId,
      participantADisplayName: nameFor(record.participantAId),
      participantBDisplayName: nameFor(record.participantBId),
      winnerPersonId: record.winnerPersonId,
      loserPersonId: record.loserPersonId,
      winnerDisplayName: record.winnerPersonId === null ? null : nameFor(record.winnerPersonId),
      loserDisplayName: record.loserPersonId === null ? null : nameFor(record.loserPersonId),
      resultKind: record.resultKind,
      tournamentId: record.tournamentId ?? null,
      detailedLogAvailable,
      detailedLogUnavailableReason,
      detailedLogActionCount,
      turnOrderLogs,
      logItems,
    },
  };
}
