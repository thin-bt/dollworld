/**
 * Sprint2 competition progression via accepted domain surfaces (session-isolated clone).
 */
import {
  applyTournamentFinalResultEarnings,
  applyTournamentFinalResultToCompetitiveRecord,
  buildPlannedParticipantList,
  buildStructuralBracketDefinition,
  buildTournamentFinalResult,
  buildTournamentMatchPlan,
  commitSchedulePlan,
  createDefaultStrategyActionSourceIdentity,
  createDefaultTournamentPayoutConfig,
  buildTournamentScheduleReadModel,
  createEmptyAnnualEarningsLedger,
  createEmptyCompetitiveRecord,
  createEmptyDetailedLogPayloadStore,
  type DetailedLogPayloadStore,
  createInitialTournamentIdGeneratorState,
  createNeutralEntryChoicePolicy,
  computeParticipantListHash,
  computeScheduleLifecycleIdentity,
  DEFAULT_WORLD_CALENDAR_CONFIG,
  executeTournamentBattleAtomic,
  formatTournamentSlotId,
  isEligibleForBattleKind,
  projectAnnualRanking,
  projectAnnualRankingForBrowser,
  toCanonicalJson,
  validateSprint1RunSession,
  validateStoredBattleResultRecord,
  type AnnualRankingDisplayFacts,
  type BattleActionsSource,
  type CompetitiveRecord,
  type EntrantCandidateFacts,
  type Person,
  type PersonId,
  type ParticipationStatus,
  type Rank,
  type StoredBattleResultRecord,
  type Sha256Provider,
  type Sprint1RunSession,
  type ScheduleLifecycleIdentity,
  type TournamentBracketDefinition,
  type TournamentId,
  type ValidationIssue,
} from "@shared-world/simulation-core";
import { buildMockCandidateSourceRows } from "../ui004/source-from-runtime.js";
import { mockCandidateEligible } from "../ui004/mock-candidates/mock-candidate-eligible.js";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import { COMPETITION_STORE_SCHEMA_VERSION } from "./competition-store.js";
import {
  defaultCompetitionRuleHash,
  defaultTournamentBattleActionIdentity,
} from "./competition-engine-helpers.js";
import { tinyScheduleConfig } from "./competition-engine-schedule-config.js";

export type CompetitionEngineOutcome =
  | { kind: "ok"; store: CompetitionSessionStore; stepKind: "initialized" | "match_played" | "already_finished" }
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
  if (!validated.ok) {
    return null;
  }
  return validated.value;
}

function competitiveRecordRank(person: Person, fallbackRank: Rank): Rank {
  if (person.careerStatus === "active_competitor") {
    return person.currentRank as Rank;
  }
  return fallbackRank;
}

function entrantFacts(person: Person, worldYear: number): EntrantCandidateFacts {
  const currentAge =
    person.lifeStatus === "living" ? person.currentAge : worldYear - person.birthYear;
  const participationStatus: ParticipationStatus =
    person.lifeStatus === "living" ? person.participationStatus : "stopped";
  const currentRank: Rank =
    person.careerStatus === "active_competitor" ? (person.currentRank as Rank) : "F";
  return {
    personId: person.personId,
    currentAge,
    lifeStatus: person.lifeStatus,
    participationStatus,
    careerStatus: person.careerStatus,
    currentRank,
  };
}

function isOfficialBattleEligiblePerson(person: Person, worldYear: number): boolean {
  if (person.lifeStatus !== "living" || person.participationStatus !== "active") {
    return false;
  }
  const age = person.currentAge;
  return isEligibleForBattleKind("official", person.careerStatus, age);
}

export function pickTwoParticipantIdsForPreview(session: Sprint1RunSession): PersonId[] | null {
  return pickTwoParticipantIds(session);
}

function pickTwoParticipantIds(session: Sprint1RunSession): PersonId[] | null {
  const worldYear = session.runtimeState.worldState.worldDate.year;
  const source = buildMockCandidateSourceRows(session);
  if (!source.ok) {
    return null;
  }
  const personsById = new Map(
    session.runtimeState.worldState.persons.map((person) => [person.personId, person as Person]),
  );
  const eligible = source.rows
    .filter((row) => row.sourceValidationOk && row.eligibleInput !== undefined)
    .filter((row) => mockCandidateEligible(row.eligibleInput!))
    .filter((row) => {
      const person = personsById.get(row.personId as PersonId);
      return person !== undefined && isOfficialBattleEligiblePerson(person, worldYear);
    })
    .map((row) => row.personId as PersonId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (eligible.length >= 2) {
    return [eligible[0]!, eligible[1]!];
  }
  const fallback = session.runtimeState.worldState.persons
    .filter((person) => isOfficialBattleEligiblePerson(person as Person, worldYear))
    .map((person) => person.personId)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (fallback.length < 2) {
    return null;
  }
  return [fallback[0]!, fallback[1]!];
}

function personDisplayName(person: Person | undefined): string {
  if (person === undefined) {
    return "不明";
  }
  return person.displayName.length > 0 ? person.displayName : "不明";
}

/** Idle-state preview for player-facing pre-start context (no competition store mutation). */
export function buildIdleCompetitionPreStartPreview(session: Sprint1RunSession): {
  tournamentKindLabel: string;
  targetRankLabel: string;
  participantDisplayNames: readonly string[];
} | null {
  const participantIds = pickTwoParticipantIds(session);
  if (participantIds === null) {
    return null;
  }
  const personsById = new Map(
    session.runtimeState.worldState.persons.map((person) => [person.personId, person as Person]),
  );
  return {
    tournamentKindLabel: "通常大会",
    targetRankLabel: "Fランク",
    participantDisplayNames: participantIds.map((id) =>
      personDisplayName(personsById.get(id)),
    ),
  };
}

export function displayNameForPersonIdInSession(
  session: Sprint1RunSession,
  personId: string,
): string {
  const person = session.runtimeState.worldState.persons.find((p) => p.personId === personId);
  return personDisplayName(person as Person | undefined);
}

function expectOk<T>(result: { ok: boolean; issues?: readonly ValidationIssue[]; value?: T }): T {
  if (!result.ok) {
    throw new Error(`domain step failed: ${JSON.stringify(result.issues ?? [])}`);
  }
  return result.value as T;
}

function initializeCompetitionState(
  worldSession: Sprint1RunSession,
  provider: Sha256Provider,
): CompetitionEngineOutcome {
  const participantIds = pickTwoParticipantIds(worldSession);
  if (participantIds === null) {
    return {
      kind: "insufficient_participants",
      message: "公式戦可能な参加者が2名未満です。シミュレーションを進めてから再試行してください。",
    };
  }
  const participantAId = participantIds[0]!;
  const participantBId = participantIds[1]!;
  const isolatedSession = cloneSessionJson(worldSession);

  const config = tinyScheduleConfig();
  const generator = createInitialTournamentIdGeneratorState();
  if (!generator.ok) {
    return { kind: "domain_failure", issues: generator.issues };
  }
  const committed = commitSchedulePlan(
    config,
    DEFAULT_WORLD_CALENDAR_CONFIG,
    isolatedSession.runtimeState.worldState.worldDate.year,
    generator.value,
  );
  if (committed.kind !== "success") {
    return { kind: "domain_failure", issues: [{ path: "", message: "schedule commit failed" }] };
  }

  const schedule = buildTournamentScheduleReadModel(committed.scheduleState);
  const tournament = schedule.find((entry) => entry.kind === "normal" && entry.targetRank === "F");
  if (tournament === undefined) {
    return { kind: "domain_failure", issues: [{ path: "", message: "F-rank normal tournament missing" }] };
  }

  const policy = createNeutralEntryChoicePolicy(config);
  const facts = new Map<PersonId, EntrantCandidateFacts>();
  for (const personId of participantIds) {
    const person = isolatedSession.runtimeState.worldState.persons.find((p) => p.personId === personId);
    if (person === undefined) {
      return { kind: "corrupt" };
    }
    facts.set(personId, entrantFacts(person as Person, isolatedSession.runtimeState.worldState.worldDate.year));
  }

  const list = buildPlannedParticipantList({
    tournamentId: tournament.tournamentId,
    scheduleEntries: schedule,
    candidateFactsByPersonId: facts,
    policy,
    config,
    simulationId: isolatedSession.context.simulationId,
    runSeed: isolatedSession.context.simulationIdentity.seed,
    provider,
  });
  if (!list.ok) {
    return { kind: "domain_failure", issues: list.issues };
  }
  if (list.value === null) {
    return { kind: "insufficient_participants", message: "大会参加者リストを確定できませんでした。" };
  }

  const lifecycle = computeScheduleLifecycleIdentity(tournament, provider);
  if (!lifecycle.ok) {
    return { kind: "domain_failure", issues: lifecycle.issues };
  }

  const participantListHash = expectOk(
    computeParticipantListHash(
      {
        tournamentId: tournament.tournamentId,
        scheduleLifecycleIdentityHash: lifecycle.value.identityHash,
        selectedPersonIds: participantIds,
        policyIdentity: policy.identity,
      },
      provider,
    ),
  );

  const built = buildStructuralBracketDefinition(
    {
      tournamentId: tournament.tournamentId,
      orderedPersonIds: participantIds,
      participantListHash,
      scheduleLifecycleIdentity: lifecycle.value,
      entryChoicePolicyIdentity: policy.identity,
      policy: STRUCTURAL_POLICY,
    },
    provider,
  );
  if (!built.ok) {
    return { kind: "domain_failure", issues: built.issues };
  }

  const competitiveRecordByPersonId: Record<string, Record<string, unknown>> = {};
  for (const personId of participantIds) {
    const person = isolatedSession.runtimeState.worldState.persons.find((p) => p.personId === personId)!;
    const empty = createEmptyCompetitiveRecord(
      person.personId,
      competitiveRecordRank(person as Person, tournament.targetRank ?? "F"),
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

  const payloadStore = createEmptyDetailedLogPayloadStore();
  const state: CompetitionPersistedState = {
    schemaVersion: COMPETITION_STORE_SCHEMA_VERSION,
    phase: "awaiting_match",
    tournamentId: tournament.tournamentId,
    tournamentKind: tournament.kind,
    targetRank: tournament.targetRank ?? "F",
    participantAId: participantAId as string,
    participantBId: participantBId as string,
    bracketDefinitionHash: built.value.definition.bracketDefinitionHash,
    structuralSourceIdentityHash: built.value.definition.bracketDefinitionHash,
    scheduleLifecycleIdentityHash: lifecycle.value.identityHash,
    scheduleLifecycleIdentity: JSON.parse(toCanonicalJson(lifecycle.value)) as Record<string, unknown>,
    participantListHash,
    bracketDefinition: JSON.parse(toCanonicalJson(built.value.definition)) as Record<string, unknown>,
    bracketRuntimeState: JSON.parse(toCanonicalJson(built.value.runtimeState)) as Record<string, unknown>,
    isolatedSession: JSON.parse(toCanonicalJson(isolatedSession)) as Record<string, unknown>,
    payloadStore: JSON.parse(toCanonicalJson(payloadStore)) as Record<string, unknown>,
    storedRecords: [],
    matchesCompleted: 0,
    lastMatch: null,
    competitiveRecordByPersonId,
    earningsLedger: JSON.parse(toCanonicalJson(createEmptyAnnualEarningsLedger())) as Record<string, unknown>,
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

function playMatch(state: CompetitionPersistedState, provider: Sha256Provider): CompetitionEngineOutcome {
  const session = parseStoredSession(state.isolatedSession, provider);
  if (session === null) {
    return { kind: "corrupt" };
  }
  const payloadStore = createEmptyDetailedLogPayloadStore();
  const storedRecords = state.storedRecords.map((row) => {
    const validated = validateStoredBattleResultRecord(row as StoredBattleResultRecord, provider);
    if (!validated.ok) {
      throw new Error("stored record corrupt");
    }
    return validated.value;
  });
  const tournamentId = state.tournamentId as TournamentId;
  const participantAId = state.participantAId as PersonId;
  const participantBId = state.participantBId as PersonId;

  const lifecycle = state.scheduleLifecycleIdentity as unknown as ScheduleLifecycleIdentity;
  const rebuilt = buildStructuralBracketDefinition(
    {
      tournamentId,
      orderedPersonIds: [participantAId, participantBId],
      participantListHash: state.participantListHash,
      scheduleLifecycleIdentity: lifecycle,
      entryChoicePolicyIdentity: createNeutralEntryChoicePolicy(tinyScheduleConfig()).identity,
      policy: STRUCTURAL_POLICY,
    },
    provider,
  );
  if (!rebuilt.ok) {
    return { kind: "domain_failure", issues: rebuilt.issues };
  }
  const plan = buildTournamentMatchPlan(
    {
      tournamentId,
      bracketDefinition: rebuilt.value.definition,
      runtimeState: rebuilt.value.runtimeState,
      structuralSlot: { kind: "round_robin", pairIndex: 0 },
      scheduleLifecycleIdentity: lifecycle,
      slotBindings: [],
      matchIdGeneratorState: session.runtimeState.matchIdGeneratorState,
    },
    provider,
  );
  if (!plan.ok) {
    return { kind: "domain_failure", issues: plan.issues };
  }

  const actionIdentity = defaultTournamentBattleActionIdentity(session);
  const actionsSource = { identity: actionIdentity } as BattleActionsSource;

  const atomic = executeTournamentBattleAtomic(
    {
      handoff: {
        matchPlan: plan.value,
        session,
        participantAActionSourceIdentity: actionIdentity,
        participantBActionSourceIdentity: actionIdentity,
        participantAActionsSource: actionsSource,
        participantBActionsSource: actionsSource,
        slotBindings: [],
      },
      matchPlan: plan.value,
      slotIdentity: { slotId: formatTournamentSlotId(0), matchOrdinal: 0 },
      competitionRuleHash: defaultCompetitionRuleHash(session),
      payloadStore,
      storedRecords,
    },
    provider,
  );

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
    return { kind: "domain_failure", issues: [{ path: "", message: "match produced no winner" }] };
  }

  const placements = [
    {
      personId: winnerPersonId,
      placementOrdinal: 1,
      awardTier: "champion" as const,
      placementBandKind: "champion",
      placementBandOrdinal: 1,
    },
    {
      personId: loserPersonId,
      placementOrdinal: 2,
      awardTier: "runner_up" as const,
      placementBandKind: "runner_up",
      placementBandOrdinal: 1,
    },
  ];

  const completionApplicationIdentityHash =
    atomic.applicationFact.handoffResult.executionPlanIdentityHash;
  const simulationId = session.context.simulationId;
  const structuralSourceIdentityHash = state.structuralSourceIdentityHash;
  if (
    typeof simulationId !== "string" ||
    typeof state.tournamentId !== "string" ||
    typeof structuralSourceIdentityHash !== "string" ||
    typeof completionApplicationIdentityHash !== "string"
  ) {
    return {
      kind: "domain_failure",
      issues: [{ path: "", message: "tournament finalize source identity incomplete" }],
    };
  }

  const finalBuilt = buildTournamentFinalResult(
    {
      simulationId,
      tournamentId,
      structuralSourceIdentityHash,
      completionApplicationIdentityHash,
      completionKind: "winner_determined",
      placements,
    },
    provider,
  );
  if (!finalBuilt.ok) {
    return { kind: "domain_failure", issues: finalBuilt.issues };
  }
  const finalResult = finalBuilt.value;

  const competitiveRecordByPersonId = { ...state.competitiveRecordByPersonId };
  for (const personId of [participantAId, participantBId]) {
    const record = competitiveRecordByPersonId[personId] as unknown as CompetitiveRecord;
    const applied = applyTournamentFinalResultToCompetitiveRecord(
      {
        record,
        finalResult,
        source: {
          tournamentId,
          structuralSourceIdentityHash: state.structuralSourceIdentityHash,
          completionApplicationIdentityHash: atomic.applicationFact.handoffResult.executionPlanIdentityHash,
        },
      },
      provider,
    );
    if (applied.kind !== "applied") {
      return { kind: "domain_failure", issues: [{ path: "", message: applied.kind }] };
    }
    competitiveRecordByPersonId[personId] = JSON.parse(toCanonicalJson(applied.record)) as Record<
      string,
      unknown
    >;
  }

  const payoutConfig = expectOk(createDefaultTournamentPayoutConfig(provider));

  let earningsLedger = JSON.parse(toCanonicalJson(state.earningsLedger)) as ReturnType<
    typeof createEmptyAnnualEarningsLedger
  >;
  const earningsApplied = applyTournamentFinalResultEarnings(
    {
      ledger: earningsLedger,
      finalResult,
      source: {
        tournamentId,
        structuralSourceIdentityHash: state.structuralSourceIdentityHash,
        completionApplicationIdentityHash: atomic.applicationFact.handoffResult.executionPlanIdentityHash,
      },
      worldYear: state.worldYear,
      tournamentKind: "normal",
      payoutConfig,
    },
    provider,
  );
  if (earningsApplied.kind !== "applied") {
    return { kind: "domain_failure", issues: [{ path: "", message: earningsApplied.kind }] };
  }
  earningsLedger = earningsApplied.ledger;

  const recordsMap = new Map<PersonId, CompetitiveRecord>();
  for (const personId of [participantAId, participantBId]) {
    recordsMap.set(personId, competitiveRecordByPersonId[personId] as unknown as CompetitiveRecord);
  }
  const ranking = projectAnnualRanking({
    worldYear: state.worldYear,
    ledger: earningsLedger,
    competitiveRecords: recordsMap,
  });
  if (!ranking.ok) {
    return { kind: "domain_failure", issues: ranking.issues };
  }
  const rankingDisplay = projectAnnualRankingForBrowser(ranking.value);

  const nextState: CompetitionPersistedState = {
    ...state,
    phase: "finished",
    isolatedSession: JSON.parse(toCanonicalJson(atomic.session)) as Record<string, unknown>,
    payloadStore: JSON.parse(toCanonicalJson(atomic.payloadStore)) as Record<string, unknown>,
    storedRecords: atomic.storedRecords.map(
      (row) => JSON.parse(toCanonicalJson(row)) as Record<string, unknown>,
    ),
    matchesCompleted: state.matchesCompleted + 1,
    lastMatch: {
      matchId: atomic.applicationFact.handoffResult.matchId,
      winnerPersonId,
      loserPersonId,
    },
    competitiveRecordByPersonId,
    earningsLedger: JSON.parse(toCanonicalJson(earningsLedger)) as Record<string, unknown>,
    finalResult: JSON.parse(toCanonicalJson(finalResult)) as Record<string, unknown>,
    rankingDisplayFacts: rankingDisplay.map((row) => JSON.parse(toCanonicalJson(row)) as Record<string, unknown>),
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
  if (store.state?.phase === "finished") {
    return { kind: "ok", store, stepKind: "already_finished" };
  }
  if (store.state === null) {
    const initialized = initializeCompetitionState(worldSession, provider);
    if (initialized.kind !== "ok") {
      return initialized;
    }
    return playMatch(initialized.store.state!, provider);
  }
  if (store.state.phase === "awaiting_match") {
    return playMatch(store.state, provider);
  }
  return { kind: "corrupt" };
}

export function rankingFactsForStore(store: CompetitionSessionStore): readonly AnnualRankingDisplayFacts[] {
  if (store.state === null) {
    return [];
  }
  return store.state.rankingDisplayFacts as unknown as AnnualRankingDisplayFacts[];
}
