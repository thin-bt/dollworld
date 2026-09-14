/** Session-scoped Sprint2 competition state (isolated from canonical world mutation). */

export const COMPETITION_STORE_SCHEMA_VERSION = "0.1.0" as const;

export type CompetitionPersistedState = {
  readonly schemaVersion: typeof COMPETITION_STORE_SCHEMA_VERSION;
  readonly phase: "awaiting_match" | "round_robin_complete" | "finished";
  readonly tournamentId: string;
  readonly tournamentKind: string;
  readonly targetRank: string;
  readonly participantAId: string;
  readonly participantBId: string;
  readonly bracketDefinitionHash: string;
  readonly structuralSourceIdentityHash: string;
  readonly scheduleLifecycleIdentityHash: string;
  readonly scheduleLifecycleIdentity: Record<string, unknown>;
  readonly participantListHash: string;
  readonly bracketDefinition: Record<string, unknown>;
  readonly bracketRuntimeState: Record<string, unknown>;
  readonly isolatedSession: Record<string, unknown>;
  readonly payloadStore: Record<string, unknown>;
  readonly storedRecords: readonly Record<string, unknown>[];
  readonly matchesCompleted: number;
  readonly lastMatch: {
    matchId: string;
    winnerPersonId: string;
    loserPersonId: string;
  } | null;
  readonly competitiveRecordByPersonId: Record<string, Record<string, unknown>>;
  readonly earningsLedger: Record<string, unknown>;
  readonly finalResult: Record<string, unknown> | null;
  readonly worldYear: number;
  readonly rankingDisplayFacts: readonly Record<string, unknown>[];
};

export type CompetitionSessionStore = {
  readonly schemaVersion: typeof COMPETITION_STORE_SCHEMA_VERSION;
  readonly state: CompetitionPersistedState | null;
};

export function createEmptyCompetitionStore(): CompetitionSessionStore {
  return { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state: null };
}

export function cloneCompetitionStore(store: CompetitionSessionStore): CompetitionSessionStore {
  if (store.state === null) {
    return { schemaVersion: store.schemaVersion, state: null };
  }
  return {
    schemaVersion: store.schemaVersion,
    state: {
      ...store.state,
      storedRecords: [...store.state.storedRecords],
      competitiveRecordByPersonId: { ...store.state.competitiveRecordByPersonId },
    },
  };
}
