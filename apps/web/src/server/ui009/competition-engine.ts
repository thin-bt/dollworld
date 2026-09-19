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
import { executeNextBracketMatch } from "./competition-bracket-match-execution.js";
import {
  isBracketStructurallyComplete,
  projectBracketProgress,
} from "./competition-bracket-progress.js";
import { selectUi009GroupAdvancers } from "./competition-group-advancers.js";
import { selectUi009TournamentFormat } from "./competition-format-selection.js";
import { buildUi009StructuralPolicy } from "./competition-structural-policy.js";
import { resolveKnockoutByeAdvancements } from "./competition-bracket-runtime.js";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import { COMPETITION_STORE_SCHEMA_VERSION } from "./competition-store.js";
import { EMPTY_OBSERVATION_PERSISTENCE } from "./competition-wireframe-observation.js";

export type CompetitionEngineOutcome =
  | {
      kind: "ok";
      store: CompetitionSessionStore;
      stepKind: "initialized" | "match_played" | "already_finished";
    }
  | { kind: "insufficient_participants"; message: string }
  | { kind: "domain_failure"; issues: readonly ValidationIssue[] }
  | { kind: "corrupt" };


function groupAdvanceCount(
  participantCount: number,
  config: {
    format: { groupAdvanceCount17to24: number; groupAdvanceCount25to32: number };
  },
): number {
  if (participantCount >= 25) {
    return config.format.groupAdvanceCount25to32;
  }
  if (participantCount >= 17) {
    return config.format.groupAdvanceCount17to24;
  }
  return 1;
}

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
  const resolved = buildAcceptedCompetitionParticipantPlan(worldSession, provider);
  if (resolved === null || resolved.plan.selectedPersonIds.length < 2) {
    return {
      kind: "insufficient_participants",
      message: "公式戦可能な参加者が2名未満です。シミュレーションを進めてから再試行してください。",
    };
  }
  const acceptedPlan = resolved.plan;
  const isolatedSession = cloneSessionJson(resolved.planningSession);

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

  const formatSelection = selectUi009TournamentFormat(
    participantIds.length,
    acceptedPlan.tournament.kind,
    acceptedPlan.config.format,
  );
  if (formatSelection === null) {
    return {
      kind: "domain_failure",
      issues: [
        {
          path: "/formatSelection",
          message: "participant count is outside accepted Sprint2 format thresholds",
          actual: participantIds.length,
        },
      ],
    };
  }
  const structuralPolicy = buildUi009StructuralPolicy(
    formatSelection,
    participantIds,
    acceptedPlan.config,
  );

  const built = buildStructuralBracketDefinition(
    {
      tournamentId: acceptedPlan.tournament.tournamentId,
      orderedPersonIds: participantIds,
      participantListHash: participantListHash.value,
      scheduleLifecycleIdentity: acceptedPlan.lifecycle,
      entryChoicePolicyIdentity: acceptedPlan.policy.identity,
      policy: structuralPolicy,
    },
    provider,
  );
  if (!built.ok) {
    return { kind: "domain_failure", issues: built.issues };
  }

  const seededRuntime = resolveKnockoutByeAdvancements(
    built.value.definition,
    built.value.runtimeState,
  );

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
    bracketRuntimeState: JSON.parse(toCanonicalJson(seededRuntime)) as Record<string, unknown>,
    isolatedSession: JSON.parse(toCanonicalJson(isolatedSession)) as Record<string, unknown>,
    payloadStore: persistDetailedLogPayloadStore(createEmptyDetailedLogPayloadStore()),
    storedRecords: [],
    slotBindings: [],
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
    ...EMPTY_OBSERVATION_PERSISTENCE,
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

  const bracketDefinition = state.bracketDefinition as unknown as TournamentBracketDefinition;
  const storedRecords = state.storedRecords as unknown as import("@shared-world/simulation-core").StoredBattleResultRecord[];
  const slotBindings = (state.slotBindings ?? []) as unknown as import("@shared-world/simulation-core").TournamentSlotMatchBinding[];

  let knockoutSeedPersonIds: readonly PersonId[] | undefined;
  if (bracketDefinition.formatKind === "group_round_robin_knockout") {
    const groupProgress = projectBracketProgress({
      bracketDefinition,
      bracketRuntimeState: state.bracketRuntimeState as unknown as import("@shared-world/simulation-core").BracketRuntimeSlotState,
      storedRecords,
      slotBindings,
    });
    if (groupProgress.groupPhaseComplete && !groupProgress.knockoutPhaseComplete) {
      const resolved = buildAcceptedCompetitionParticipantPlan(session, provider);
      const advanceCount =
        resolved === null
          ? 1
          : groupAdvanceCount(resolved.plan.selectedPersonIds.length, resolved.plan.config);
      knockoutSeedPersonIds = selectUi009GroupAdvancers(
        bracketDefinition,
        storedRecords,
        advanceCount,
      );
    }
  }

  const executed = executeNextBracketMatch({
    state: {
      tournamentId: state.tournamentId,
      scheduleLifecycleIdentity: state.scheduleLifecycleIdentity,
      bracketDefinition: state.bracketDefinition,
      bracketRuntimeState: state.bracketRuntimeState,
      payloadStore: state.payloadStore,
      storedRecords: state.storedRecords,
      slotBindings,
    },
    session,
    provider,
    ...(knockoutSeedPersonIds !== undefined ? { knockoutSeedPersonIds } : {}),
  });
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
  const winnerPersonId = atomic.applicationFact.handoffResult.winnerPersonId;
  const loserPersonId = atomic.applicationFact.handoffResult.loserPersonId;
  if (winnerPersonId === null || loserPersonId === null) {
    return {
      kind: "domain_failure",
      issues: [{ path: "", message: "tournament match produced no winner" }],
    };
  }

  const progress = projectBracketProgress({
    bracketDefinition,
    bracketRuntimeState: executed.bracketRuntimeState,
    storedRecords: atomic.storedRecords,
    slotBindings: executed.slotBindings,
  });
  const structurallyComplete = isBracketStructurallyComplete(progress);
  const nextState: CompetitionPersistedState = {
    ...state,
    phase: structurallyComplete ? "round_robin_complete" : "awaiting_match",
    bracketRuntimeState: JSON.parse(toCanonicalJson(executed.bracketRuntimeState)) as Record<
      string,
      unknown
    >,
    slotBindings: executed.slotBindings.map(
      (row) => JSON.parse(toCanonicalJson(row)) as Record<string, unknown>,
    ),
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
