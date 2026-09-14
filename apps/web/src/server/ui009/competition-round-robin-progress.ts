import type { StoredBattleResultRecord, TournamentBracketDefinition } from "@shared-world/simulation-core";

export type RoundRobinMatchHistoryRow = {
  pairIndex: number;
  participantAId: string;
  participantBId: string;
  matchId: string | null;
  winnerPersonId: string | null;
  loserPersonId: string | null;
  resultKind: string | null;
};

export type RoundRobinParticipantRecord = {
  personId: string;
  wins: number;
  losses: number;
  played: number;
};

export type RoundRobinMatrixCell = {
  opponentPersonId: string;
  pairIndex: number;
  matchId: string | null;
  outcome: "pending" | "win" | "loss";
};

export type RoundRobinParticipantMatrixRow = RoundRobinParticipantRecord & {
  cells: readonly RoundRobinMatrixCell[];
};

function recordKey(participantAId: string, participantBId: string): string {
  return participantAId < participantBId
    ? `${participantAId}\u0000${participantBId}`
    : `${participantBId}\u0000${participantAId}`;
}

function tournamentRecords(
  tournamentId: string,
  records: readonly StoredBattleResultRecord[],
): Map<string, StoredBattleResultRecord> {
  const byPair = new Map<string, StoredBattleResultRecord>();
  for (const record of records) {
    if (record.tournamentId !== tournamentId) {
      continue;
    }
    byPair.set(recordKey(record.participantAId, record.participantBId), record);
  }
  return byPair;
}

/**
 * Accepted-bracket-backed round-robin progress projection.
 *
 * This intentionally does not rank or tie-break participants. Decision C says
 * tie-break semantics are caller supplied, so UI009 only exposes factual
 * played/win/loss counts and the match matrix until an accepted standings
 * policy is wired into tournament finalization.
 */
export function projectRoundRobinProgress(input: {
  bracketDefinition: TournamentBracketDefinition;
  storedRecords: readonly StoredBattleResultRecord[];
}): {
  participantIds: readonly string[];
  matchesTotal: number;
  matchesCompleted: number;
  nextPairIndex: number | null;
  history: readonly RoundRobinMatchHistoryRow[];
  matrix: readonly RoundRobinParticipantMatrixRow[];
} {
  const { bracketDefinition, storedRecords } = input;
  const recordsByPair = tournamentRecords(bracketDefinition.tournamentId, storedRecords);

  const history: RoundRobinMatchHistoryRow[] = bracketDefinition.roundRobinPairs.map((pair) => {
    const record = recordsByPair.get(recordKey(pair.personIdA, pair.personIdB));
    return {
      pairIndex: pair.pairIndex,
      participantAId: pair.personIdA,
      participantBId: pair.personIdB,
      matchId: record?.matchId ?? null,
      winnerPersonId: record?.winnerPersonId ?? null,
      loserPersonId: record?.loserPersonId ?? null,
      resultKind: record?.resultKind ?? null,
    };
  });

  const matrix = bracketDefinition.orderedPersonIds.map((personId) => {
    let wins = 0;
    let losses = 0;
    let played = 0;
    const cells: RoundRobinMatrixCell[] = [];
    for (const pair of bracketDefinition.roundRobinPairs) {
      if (pair.personIdA !== personId && pair.personIdB !== personId) {
        continue;
      }
      const opponentPersonId = pair.personIdA === personId ? pair.personIdB : pair.personIdA;
      const record = recordsByPair.get(recordKey(pair.personIdA, pair.personIdB));
      let outcome: RoundRobinMatrixCell["outcome"] = "pending";
      if (record !== undefined && record.winnerPersonId !== null && record.loserPersonId !== null) {
        played += 1;
        if (record.winnerPersonId === personId) {
          wins += 1;
          outcome = "win";
        } else if (record.loserPersonId === personId) {
          losses += 1;
          outcome = "loss";
        }
      }
      cells.push({
        opponentPersonId,
        pairIndex: pair.pairIndex,
        matchId: record?.matchId ?? null,
        outcome,
      });
    }
    return { personId, wins, losses, played, cells };
  });

  const nextPending = history.find((row) => row.matchId === null);
  const matchesCompleted = history.length - history.filter((row) => row.matchId === null).length;
  return {
    participantIds: bracketDefinition.orderedPersonIds,
    matchesTotal: bracketDefinition.roundRobinPairs.length,
    matchesCompleted,
    nextPairIndex: nextPending?.pairIndex ?? null,
    history,
    matrix,
  };
}
