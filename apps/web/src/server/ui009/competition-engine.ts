/**
 * Sprint2 competition progression via accepted domain surfaces (session-isolated clone).
 *
 * This adapter intentionally stops at factual round-robin completion. Tournament
 * ranking/tie-break/finalization is not fabricated here; it must be supplied by
 * an accepted domain contract before finalResult/earnings/ranking are committed.
 */
import {
  buildStructuralBracketDefinition,
  computeParticipantListHash,
  createEmptyAnnualEarningsLedger,
  createEmptyCompetitiveRecord,
  createEmptyDetailedLogPayloadStore,
  toCanonicalJson,
  validateSprint1RunSession,
  type AnnualRankingDisplayFacts,
  type Person,
  type PersonId,
  type Rank,
  type Sha256Provider,
  type Sprint1RunSession,
  type TournamentBracketDefinition,
  type ValidationIssue,
} from "@shared-world/simulation-core";
import { createNodeSha256Provider } from "../presets.js";
import {
  buildAcceptedCompetitionParticipantPlan,
  plannedCompetitionParticipantIdsForPreview,
} from "./competition-participant-preview.js";
import { persistDetailedLogPayloadStore } from "./competition-payload-store.js";
import { executeNextRoundRobinMatch } from "./competition-round-robin-execution.js";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import { COMPETITION_STORE_SCHEMA_VERSION } from "./competition-store.js";

export type CompetitionEngineOutcome =
  | {
      kind: "ok";
      store: CompetitionSessionStore;
      stepKind: "initialized" | "match_played" | "already_finished";
    }
  | { kind: "insufficient_participants"; message: string }
  | { kind: "domain_failure"; issues: readonly ValidationIssue[] }
  | { kind: "corrupt" };

const STRUCTURAL_POLICY = {
  formatSelection: {
    formatKind: "round_robin" as const,
    policyIdentity: {
      policyVersion: "ui009-format-selection-0.1.0",
      configVersion: "ui009-format-config-a",
    },
  },
  knockoutSeedByePolicyIdentity: {
    policyVersion: "ui009-knockout-seed-bye-0.1.0",
    configVersion: "ui009-knockout-seed-bye-config-a",
  },
  standingsTieBreakPolicyIdentity: {
    policyVersion: "ui009-standings-tie-break-0.1.0",
    configVersion: "ui009-standings-tie-break-config-a",
  },
};

function cloneSessionJson(session: Sprint1RunSession): Sprint1RunSession {
  return JSON.parse(toCanonicalJson(session)) as Sprint1RunSession;
}

function parseStoredSession(
  json: Record<string, unknown>,
  provider: Sha256Provider,
): Sprint1RunSession | null {
  const validated = validateSprint1RunSession(json as Sprint1RunSession, provider);
  return validated.ok ? validated.value : null;
}

function competitiveRecordRank(person: Person, fallbackRank: Rank): Rank {
  return person.careerStatus === "active_competitor" ? (person.currentRank as Rank) : fallbackRank;
}

function personDisplayName(person: Person | undefined): string {
  if (person === undefined) {
    return "不明";
  }
  return person.displayName.length > 0 ? person.displayName : "不明";
}

export function displayNameForPersonIdInSession(
  session: Sprint1RunSession,
  personId: string,
): string {
  const person = session.runtimeState.worldState.persons.find((row) => row.personId === personId);
  return personDisplayName(person as Person | undefined);
}

/** Backward-compatible helper retained for callers that only need a pair preview. */
export function pickTwoParticipantIdsForPreview(session: Sprint1RunSession): PersonId[] | null {
  const planned = plannedCompetitionParticipantIdsForPreview(session, createNodeSha256Provider());
  if (planned.length < 2) {
    return null;
  }
  return [planned[0]!, planned[1]!];
}

/** Idle-state preview for player-facing pre-start context (no competition store mutation). */
export function buildIdleCompetitionPreStartPreview(session: Sprint1RunSession): {
  tournamentKindLabel: string;
  targetRankLabel: string;
  participantDisplayNames: readonly string[];
} | null {
  const participantIds = plannedCompetitionParticipantIdsForPreview(
    session,
    createNodeSha256Provider(),
  );
  if (participantIds.length < 2) {
    return null;
  }
  const personsById = new Map(
    session.runtimeState.worldState.persons.map((person) => [person.personId, person as Person]),
  );
  return {
    tournamentKindLabel: "通常大会",
    targetRankLabel: "Fランク",
    participantDisplayNames: participantIds.map((id) => personDisplayName(personsById.get(id))),
  };
}

function initializeCompetitionState(
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): CompetitionEngineOutcome {
  const isolatedSession = cloneSessionJson(worldSession);
  const acceptedPlan = buildAcceptedCompetitionParticipantPlan(isolatedSession, provider);
  if (acceptedPlan === null || acceptedPlan.selectedPersonIds.length < 2) {
    return {
      kind: "insufficient_participants",
      message: "公式戦可能な参加者が2名未満です。シミュレーションを進めてから再試行してください。",
    };
  }

  const participantIds = [...acceptedPlan.selectedPersonIds];
  const participantAId = participantIds[0]!;
  const participantBId = participantIds[1]!;
  const participantListHash = computeParticipantListHash(
    {
      tournamentId: acceptedPlan.tournament.tournamentId,
      scheduleLifecycleIdentityHash: acceptedPlan.lifecycle.identityHash,
      selectedPersonIds: participantIds,
      policyIdentity: acceptedPlan.policy.identity,
    },
    provider,
  );
  if (!participantListHash.ok) {
    return { kind: "domain_failure", issues: participantListHash.issues };
  }

  const built = buildStructuralBracketDefinition(
    {
      tournamentId: acceptedPlan.tournament.tournamentId,
      orderedPersonIds: participantIds,
      participantListHash: participantListHash.value,
      scheduleLifecycleIdentity: acceptedPlan.lifecycle,
      entryChoicePolicyIdentity: acceptedPlan.policy.identity,
      policy: STRUCTURAL_POLICY,
    },
    provider,
  );
  if (!built.ok) {
    return { kind: "domain_failure", issues: built.issues };
  }

  const competitiveRecordByPersonId: Record<string, Record<string, unknown>> = {};
  for (const personId of participantIds) {
    const person = isolatedSession.runtimeState.worldState.persons.find(
      (row) => row.personId === personId,
    ) as Person | undefined;
    if (person === undefined) {
      return { kind: "corrupt" };
    }
    const empty = createEmptyCompetitiveRecord(
      person.personId,
      competitiveRecordRank(person, acceptedPlan.tournament.targetRank ?? "F"),
      provider,
    );
    if (!empty.ok) {
      return { kind: "domain_failure", issues: empty.issues };
    }
    competitiveRecordByPersonId[personId] = JSON.parse(toCanonicalJson(empty.value)) as Record<
      string,
      unknown
    >;
  }

  const state: CompetitionPersistedState = {
    schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
    phase: "awaiting_match",
    tournamentId: acceptedPlan.tournament.tournamentId,
    tournamentKind: acceptedPlan.tournament.kind,
    targetRank: acceptedPlan.tournament.targetRank ?? "F",
    participantAId,
    participantBId,
    bracketDefinitionHash: built.value.definition.bracketDefinitionHash,
    structuralSourceIdentityHash: built.value.definition.bracketDefinitionHash,
    scheduleLifecycleIdentityHash: acceptedPlan.lifecycle.identityHash,
    scheduleLifecycleIdentity: JSON.parse(toCanonicalJson(acceptedPlan.lifecycle)) as Record<
      string,
      unknown
    >,
    participantListHash: participantListHash.value,
    bracketDefinition: JSON.parse(toCanonicalJson(built.value.definition)) as Record<string, unknown>,
    bracketRuntimeState: JSON.parse(toCanonicalJson(built.value.runtimeState)) as Record<string, unknown>,
    isolatedSession: JSON.parse(toCanonicalJson(isolatedSession)) as Record<string, unknown>,
    payloadStore: persistDetailedLogPayloadStore(createEmptyDetailedLogPayloadStore()),
    storedRecords: [],
    matchesCompleted: 0,
    lastMatch: null,
    competitiveRecordByPersonId,
    earningsLedger: JSON.parse(toCanonicalJson(createEmptyAnnualEarningsLedger())) as Record<
      string,
      unknown
    >,
    finalResult: null,
    worldYear: isolatedSession.runtimeState.worldState.worldDate.year,
    rankingDisplayFacts: [],
  };

  return {
    kind: "ok",
    store: { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state },
    stepKind: "initialized",
  };
}

function playNextMatch(
  state: CompetitionPersistedState,
  provider: Sha256Provider,
): CompetitionEngineOutcome {
  const session = parseStoredSession(state.isolatedSession, provider);
  if (session === null) {
    return { kind: "corrupt" };
  }

  const executed = executeNextRoundRobinMatch({ state, session, provider });
  if (executed.kind === "complete") {
    return {
      kind: "ok",
      store: {
        schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
        state: { ...state, phase: "round_robin_complete" },
      },
      stepKind: "already_finished",
    };
  }
  if (executed.kind === "domain_failure") {
    return { kind: "domain_failure", issues: executed.issues };
  }

  const atomic = executed.atomic;
  if (atomic.kind !== "completed") {
    const issues =
      "issues" in atomic && atomic.issues !== undefined
        ? atomic.issues
        : "validation" in atomic && atomic.validation !== undefined && !atomic.validation.ok
          ? atomic.validation.issues
          : [{ path: "", message: atomic.kind }];
    return { kind: "domain_failure", issues };
  }

  const winnerPersonId = atomic.applicationFact.handoffResult.winnerPersonId;
  const loserPersonId = atomic.applicationFact.handoffResult.loserPersonId;
  if (winnerPersonId === null || loserPersonId === null) {
    return {
      kind: "domain_failure",
      issues: [{ path: "", message: "round-robin match produced no winner" }],
    };
  }

  const progress = projectRoundRobinProgress({
    bracketDefinition: state.bracketDefinition as unknown as TournamentBracketDefinition,
    storedRecords: atomic.storedRecords,
  });
  const roundRobinComplete = progress.nextPairIndex === null;
  const nextState: CompetitionPersistedState = {
    ...state,
    phase: roundRobinComplete ? "round_robin_complete" : "awaiting_match",
    isolatedSession: JSON.parse(toCanonicalJson(atomic.session)) as Record<string, unknown>,
    payloadStore: persistDetailedLogPayloadStore(atomic.payloadStore),
    storedRecords: atomic.storedRecords.map(
      (row) => JSON.parse(toCanonicalJson(row)) as Record<string, unknown>,
    ),
    matchesCompleted: progress.matchesCompleted,
    lastMatch: {
      matchId: atomic.applicationFact.handoffResult.matchId,
      winnerPersonId,
      loserPersonId,
    },
    // No finalResult/earnings/ranking mutation here. Accepted standings and
    // tie-break semantics have not yet been identified for Sprint2.
    finalResult: null,
    rankingDisplayFacts: [],
  };

  return {
    kind: "ok",
    store: { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state: nextState },
    stepKind: "match_played",
  };
}

export function runCompetitionProgressionStep(
  store: CompetitionSessionStore,
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): CompetitionEngineOutcome {
  if (store.state?.phase === "finished" || store.state?.phase === "round_robin_complete") {
    return { kind: "ok", store, stepKind: "already_finished" };
  }
  if (store.state === null) {
    const initialized = initializeCompetitionState(worldSession, provider);
    if (initialized.kind !== "ok" || initialized.store.state === null) {
      return initialized;
    }
    return playNextMatch(initialized.store.state, provider);
  }
  if (store.state.phase === "awaiting_match") {
    return playNextMatch(store.state, provider);
  }
  return { kind: "corrupt" };
}

export function rankingFactsForStore(
  store: CompetitionSessionStore,
): readonly AnnualRankingDisplayFacts[] {
  if (store.state === null) {
    return [];
  }
  return store.state.rankingDisplayFacts as unknown as AnnualRankingDisplayFacts[];
}
