import {
  applyTournamentFinalResultEarnings,
  applyTournamentFinalResultToCompetitiveRecord,
  buildTournamentFinalResult,
  createDefaultTournamentPayoutConfig,
  projectAnnualRanking,
  toAnnualRankingDisplayFacts,
  toCanonicalJson,
  compareUnicodeCodePoints,
  validateSprint1RunSession,
  type CompetitiveRecord,
  type PersonId,
  type Sha256Provider,
  type StoredBattleResultRecord,
  type TournamentBracketDefinition,
  type Sprint1RunSession,
  type TournamentFinalPlacement,
} from "@shared-world/simulation-core";
import type { AnnualEarningsLedger } from "@shared-world/simulation-core";
import { findFinalKnockoutBattleSlot } from "./competition-bracket-runtime.js";
import { projectRoundRobinProgress } from "./competition-round-robin-progress.js";
import { canonicalStructuralSlotKey } from "@shared-world/simulation-core";
import type { CompetitionPersistedState, CompetitionSessionStore } from "./competition-store.js";
import { COMPETITION_STORE_SCHEMA_VERSION } from "./competition-store.js";
import { buildAnnualSchedule } from "./competition-schedule-overview.js";
import {
  appendTournamentHistorySummary,
  buildTournamentHistorySummaryOnFinalize,
  findScheduleEntryForTournament,
  upsertAnnualRankingHistoryForFinalize,
} from "./competition-wireframe-observation.js";

const UI009_STANDINGS_TIE_BREAK_POLICY = {
  policyVersion: "ui009-standings-tie-break-0.1.0",
  configVersion: "ui009-standings-tie-break-config-a",
} as const;

const UI009_ROUND_ROBIN_COMPLETION_RECIPE = "ui009-round-robin-standings-v1" as const;

export type RoundRobinFinalizeOutcome =
  | { kind: "ok"; store: CompetitionSessionStore }
  | { kind: "not_ready" }
  | { kind: "domain_failure"; issues: readonly { path: string; message: string }[] }
  | { kind: "corrupt" };

function completionApplicationIdentityHash(provider: Sha256Provider): string {
  return provider.hashUtf8(
    toCanonicalJson({
      recipe: UI009_ROUND_ROBIN_COMPLETION_RECIPE,
      standingsTieBreakPolicyIdentity: UI009_STANDINGS_TIE_BREAK_POLICY,
      tieBreakOrder: ["wins_desc", "losses_asc", "person_id"],
    }),
  );
}

function awardMetaForPlacementOrdinal(ordinal: number): {
  awardTier: "champion" | "runner_up" | "top_four" | "completed";
  placementBandKind: string;
  placementBandOrdinal: number;
} {
  if (ordinal === 1) {
    return { awardTier: "champion", placementBandKind: "champion", placementBandOrdinal: 1 };
  }
  if (ordinal === 2) {
    return { awardTier: "runner_up", placementBandKind: "runner_up", placementBandOrdinal: 1 };
  }
  if (ordinal <= 4) {
    return { awardTier: "top_four", placementBandKind: "semifinal", placementBandOrdinal: ordinal - 2 };
  }
  return { awardTier: "completed", placementBandKind: "completed", placementBandOrdinal: ordinal - 4 };
}

function buildRoundRobinPlacements(
  state: CompetitionPersistedState,
): readonly TournamentFinalPlacement[] | null {
  const bracketDefinition = state.bracketDefinition as unknown as TournamentBracketDefinition;
  if (bracketDefinition.formatKind !== "round_robin") {
    return null;
  }
  const storedRecords = state.storedRecords as unknown as readonly StoredBattleResultRecord[];
  const progress = projectRoundRobinProgress({ bracketDefinition, storedRecords });
  if (progress.nextPairIndex !== null) {
    return null;
  }
  const ranked = [...progress.matrix].sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    if (a.losses !== b.losses) {
      return a.losses - b.losses;
    }
    return compareUnicodeCodePoints(a.personId, b.personId);
  });
  return ranked.map((row, index) => {
    const ordinal = index + 1;
    const bands = awardMetaForPlacementOrdinal(ordinal);
    return {
      personId: row.personId as PersonId,
      placementOrdinal: ordinal,
      awardTier: bands.awardTier,
      placementBandKind: bands.placementBandKind,
      placementBandOrdinal: bands.placementBandOrdinal,
    };
  });
}

function buildKnockoutPlacements(
  state: CompetitionPersistedState,
): readonly TournamentFinalPlacement[] | null {
  const bracketDefinition = state.bracketDefinition as unknown as TournamentBracketDefinition;
  if (bracketDefinition.formatKind === "round_robin") {
    return null;
  }
  const finalSlot = findFinalKnockoutBattleSlot(bracketDefinition);
  if (finalSlot === null) {
    return null;
  }
  const slotKey = canonicalStructuralSlotKey({ kind: "knockout", slotId: finalSlot.slotId });
  const slotBindings = (state.slotBindings ?? []) as unknown as {
    structuralSlotKey: string;
  }[];
  if (!slotBindings.some((binding) => binding.structuralSlotKey === slotKey)) {
    return null;
  }
  if (state.lastMatch === null) {
    return null;
  }
  const champion = state.lastMatch.winnerPersonId as PersonId;
  const runnerUp = state.lastMatch.loserPersonId as PersonId;
  const participantIds = bracketDefinition.orderedPersonIds as PersonId[];
  const placements: TournamentFinalPlacement[] = [
    {
      personId: champion,
      placementOrdinal: 1,
      awardTier: "champion",
      placementBandKind: "champion",
      placementBandOrdinal: 1,
    },
    {
      personId: runnerUp,
      placementOrdinal: 2,
      awardTier: "runner_up",
      placementBandKind: "runner_up",
      placementBandOrdinal: 1,
    },
  ];
  let ordinal = 3;
  for (const personId of participantIds) {
    if (personId === champion || personId === runnerUp) {
      continue;
    }
    const bands = awardMetaForPlacementOrdinal(ordinal);
    placements.push({
      personId,
      placementOrdinal: ordinal,
      awardTier: bands.awardTier,
      placementBandKind: bands.placementBandKind,
      placementBandOrdinal: bands.placementBandOrdinal,
    });
    ordinal += 1;
  }
  return placements;
}

function buildCompetitionPlacements(
  state: CompetitionPersistedState,
): readonly TournamentFinalPlacement[] | null {
  return buildRoundRobinPlacements(state) ?? buildKnockoutPlacements(state);
}

function parseCompetitiveRecordMap(
  state: CompetitionPersistedState,
): Map<PersonId, CompetitiveRecord> | null {
  const map = new Map<PersonId, CompetitiveRecord>();
  for (const [personId, json] of Object.entries(state.competitiveRecordByPersonId)) {
    map.set(personId as PersonId, json as unknown as CompetitiveRecord);
  }
  return map;
}

export function finalizeRoundRobinCompetitionStore(
  store: CompetitionSessionStore,
  provider: Sha256Provider,
): RoundRobinFinalizeOutcome {
  if (store.state === null || store.state.phase !== "round_robin_complete") {
    return { kind: "not_ready" };
  }
  const state = store.state;
  const placements = buildCompetitionPlacements(state);
  if (placements === null || placements.length === 0) {
    return { kind: "corrupt" };
  }

  const completionHash = completionApplicationIdentityHash(provider);
  const isolatedValidated = validateSprint1RunSession(
    state.isolatedSession as Sprint1RunSession,
    provider,
  );
  if (!isolatedValidated.ok) {
    return { kind: "corrupt" };
  }

  const finalResultBuilt = buildTournamentFinalResult(
    {
      simulationId: isolatedValidated.value.context.simulationId,
      tournamentId: state.tournamentId as never,
      structuralSourceIdentityHash: state.structuralSourceIdentityHash,
      completionApplicationIdentityHash: completionHash,
      completionKind: "winner_determined",
      placements,
    },
    provider,
  );
  if (!finalResultBuilt.ok) {
    return { kind: "domain_failure", issues: finalResultBuilt.issues };
  }
  const finalResult = finalResultBuilt.value;

  const payoutConfig = createDefaultTournamentPayoutConfig(provider);
  if (!payoutConfig.ok) {
    return { kind: "domain_failure", issues: payoutConfig.issues };
  }

  let ledger = state.earningsLedger as unknown as AnnualEarningsLedger;
  const recordMap = parseCompetitiveRecordMap(state);
  if (recordMap === null) {
    return { kind: "corrupt" };
  }

  const source = {
    tournamentId: state.tournamentId as never,
    structuralSourceIdentityHash: state.structuralSourceIdentityHash,
    completionApplicationIdentityHash: completionHash,
  };

  for (const placement of placements) {
    const record = recordMap.get(placement.personId);
    if (record === undefined) {
      return { kind: "corrupt" };
    }
    const appliedRecord = applyTournamentFinalResultToCompetitiveRecord(
      { record, finalResult, source },
      provider,
    );
    if (appliedRecord.kind === "validation_failure") {
      return { kind: "domain_failure", issues: appliedRecord.issues };
    }
    if (appliedRecord.kind !== "applied" && appliedRecord.kind !== "idempotent_skip") {
      return { kind: "corrupt" };
    }
    if (appliedRecord.kind === "applied") {
      recordMap.set(placement.personId, appliedRecord.record);
    }
  }

  const earnings = applyTournamentFinalResultEarnings(
    {
      ledger,
      finalResult,
      source,
      worldYear: state.worldYear,
      tournamentKind: state.tournamentKind as "normal",
      payoutConfig: payoutConfig.value,
    },
    provider,
  );
  if (earnings.kind === "validation_failure") {
    return { kind: "domain_failure", issues: earnings.issues };
  }
  if (earnings.kind !== "applied" && earnings.kind !== "idempotent_skip") {
    return { kind: "corrupt" };
  }
  if (earnings.kind === "applied") {
    ledger = earnings.ledger;
  }

  const ranking = projectAnnualRanking({
    worldYear: state.worldYear,
    ledger,
    competitiveRecords: recordMap,
  });
  if (!ranking.ok) {
    return { kind: "domain_failure", issues: ranking.issues };
  }

  const competitiveRecordByPersonId: Record<string, Record<string, unknown>> = {};
  for (const [personId, record] of recordMap.entries()) {
    competitiveRecordByPersonId[personId] = JSON.parse(toCanonicalJson(record)) as Record<
      string,
      unknown
    >;
  }

  const winnerPersonId =
    finalResult.winnerPersonId ?? finalResult.placements[0]?.personId ?? placements[0]!.personId;
  const scheduleEntry = findScheduleEntryForTournament(
    state.tournamentId,
    state.worldYear,
    buildAnnualSchedule,
  );
  const historySummary = buildTournamentHistorySummaryOnFinalize({
    state,
    winnerPersonId,
    participantCount: placements.length,
    scheduleEntry,
  });
  const priorSummaries = state.tournamentHistorySummaries ?? [];
  const rankingHistoryStore = upsertAnnualRankingHistoryForFinalize(
    (state.annualRankingHistoryStore ?? { entries: [] }) as import("@shared-world/simulation-core").AnnualRankingHistoryStore,
    {
      worldYear: state.worldYear,
      ledger,
      competitiveRecords: recordMap,
    },
    provider,
  );

  const nextState: CompetitionPersistedState = {
    ...state,
    phase: "finished",
    earningsLedger: JSON.parse(toCanonicalJson(ledger)) as Record<string, unknown>,
    competitiveRecordByPersonId,
    finalResult: JSON.parse(toCanonicalJson(finalResult)) as Record<string, unknown>,
    rankingDisplayFacts: ranking.value.map(
      (row) => JSON.parse(toCanonicalJson(row)) as Record<string, unknown>,
    ),
    tournamentHistorySummaries: appendTournamentHistorySummary(priorSummaries, historySummary),
    annualRankingHistoryStore: JSON.parse(toCanonicalJson(rankingHistoryStore)) as Record<
      string,
      unknown
    >,
    promotionResultSummaries: state.promotionResultSummaries ?? [],
    personRankHistoryBundles: state.personRankHistoryBundles ?? [],
  };

  return {
    kind: "ok",
    store: { schemaVersion: COMPETITION_STORE_SCHEMA_VERSION, state: nextState },
  };
}

export function rankingDisplayFactsFromStore(
  store: CompetitionSessionStore,
): ReturnType<typeof toAnnualRankingDisplayFacts> {
  if (store.state === null || store.state.rankingDisplayFacts.length === 0) {
    return [];
  }
  return store.state.rankingDisplayFacts as unknown as ReturnType<typeof toAnnualRankingDisplayFacts>;
}
