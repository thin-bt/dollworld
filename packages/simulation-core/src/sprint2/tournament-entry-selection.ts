/**
 * S02-003 entrant eligibility, deterministic entry-choice policy seam,
 * simultaneous single-choice behavior, lifecycle-aware participant lists,
 * and minimal S02-004 handoff.
 */
import { toCanonicalJson } from "../canonical-json.js";
import { RANK_ORDER, type Rank } from "../enums.js";
import type { PersonId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import {
  DERIVED_TIE_KEY_POLICY_VERSION,
  ENTRY_CHOICE_POLICY_VERSION,
  NORMAL_RANK_KEYS,
  PLANNED_PARTICIPANT_LIST_SCHEMA_VERSION,
} from "./constants.js";
import { computeDerivedTieKey } from "./derived-tie-key.js";
import {
  OFFICIAL_BATTLE_MAXIMUM_AGE,
  OFFICIAL_BATTLE_MINIMUM_AGE,
} from "../sprint1/battle-participant.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import type {
  EntrantCandidateFacts,
  EntrantEligibilityRejectionReason,
  EntrantEligibilityResult,
  EntryChoiceDecisionInput,
  EntryChoicePolicy,
  EntryChoicePolicyIdentity,
  EntryChoicePolicyResult,
  EntrySelectionHandoff,
  PlannedParticipantList,
  ScheduleLifecycleIdentity,
  Sprint2Config,
  TournamentScheduleReadModelEntry,
} from "./types.js";

export const OFFICIAL_COMPETITION_MINIMUM_AGE = OFFICIAL_BATTLE_MINIMUM_AGE;
export const OFFICIAL_COMPETITION_MAXIMUM_AGE = OFFICIAL_BATTLE_MAXIMUM_AGE;

const LIMITED_MINIMUM_RANK_INDEX = RANK_ORDER.indexOf("C");

type TournamentChoiceCandidate = {
  joinTournamentId: TournamentId;
  effectiveEntry: TournamentScheduleReadModelEntry;
  sourceEntry: TournamentScheduleReadModelEntry;
};

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function requiresChampionshipEntrantQualification(
  tournament: TournamentScheduleReadModelEntry,
): boolean {
  return (
    tournament.championshipCycleClassification === "championship_year" &&
    tournament.kind === "open"
  );
}

export function evaluateEntrantEligibility(
  candidate: EntrantCandidateFacts,
  tournament: TournamentScheduleReadModelEntry,
): EntrantEligibilityResult {
  if (tournament.lifecycleState === "cancelled") {
    return { eligible: false, reason: "cancelled_tournament" };
  }
  if (tournament.lifecycleState === "merged") {
    return { eligible: false, reason: "terminal_merged_lifecycle" };
  }
  if (candidate.lifeStatus !== "living") {
    return { eligible: false, reason: "not_living" };
  }
  if (candidate.participationStatus !== "active") {
    return { eligible: false, reason: "not_active_participation" };
  }
  if (candidate.careerStatus !== "active_competitor") {
    return { eligible: false, reason: "not_active_competitor" };
  }
  if (candidate.currentAge < OFFICIAL_COMPETITION_MINIMUM_AGE) {
    return { eligible: false, reason: "age_below_minimum" };
  }
  if (candidate.currentAge > OFFICIAL_COMPETITION_MAXIMUM_AGE) {
    return { eligible: false, reason: "age_above_maximum" };
  }
  if (candidate.currentRank === undefined) {
    return { eligible: false, reason: "no_current_rank" };
  }

  const currentRank = candidate.currentRank;

  switch (tournament.kind) {
    case "normal": {
      if (tournament.targetRank === undefined) {
        return { eligible: false, reason: "normal_rank_mismatch" };
      }
      if (currentRank !== tournament.targetRank) {
        return { eligible: false, reason: "normal_rank_mismatch" };
      }
      break;
    }
    case "open": {
      if (currentRank !== "A" && currentRank !== "S") {
        return { eligible: false, reason: "open_rank_ineligible" };
      }
      if (
        requiresChampionshipEntrantQualification(tournament) &&
        candidate.acceptedChampionshipEntrantQualification !== true
      ) {
        return { eligible: false, reason: "championship_qualification_missing" };
      }
      break;
    }
    case "limited": {
      if (rankIndex(currentRank) < LIMITED_MINIMUM_RANK_INDEX) {
        return { eligible: false, reason: "limited_rank_below_minimum" };
      }
      break;
    }
    case "promotion": {
      if (!NORMAL_RANK_KEYS.includes(currentRank as (typeof NORMAL_RANK_KEYS)[number])) {
        return { eligible: false, reason: "promotion_qualification_missing" };
      }
      if (candidate.acceptedPromotionQualification !== true) {
        return { eligible: false, reason: "promotion_qualification_missing" };
      }
      break;
    }
    default: {
      return { eligible: false, reason: "no_current_rank" };
    }
  }

  return { eligible: true };
}

export function createNeutralEntryChoicePolicy(config: Sprint2Config): EntryChoicePolicy {
  const identity: EntryChoicePolicyIdentity = {
    policyVersion: ENTRY_CHOICE_POLICY_VERSION,
    configVersion: config.configVersion,
  };
  return {
    identity,
    evaluatePreference(input: EntryChoiceDecisionInput): ValidationResult<EntryChoicePolicyResult> {
      const kind = input.tournament.kind;
      const baseScores = config.entry.baseScoresHundredths;
      const score =
        kind === "normal"
          ? baseScores.normal
          : kind === "open"
            ? baseScores.open
            : kind === "limited"
              ? baseScores.limited
              : baseScores.promotion;
      return success({
        preferenceScoreHundredths: score,
        policyVersion: ENTRY_CHOICE_POLICY_VERSION,
      });
    },
  };
}

function absoluteWorldMonth(entry: TournamentScheduleReadModelEntry): number {
  return (entry.worldYear - 1) * 12 + (entry.month - 1);
}

function kindPriorityIndex(config: Sprint2Config, kind: TournamentScheduleReadModelEntry["kind"]): number {
  const index = config.execution.tournamentKindPriority.indexOf(kind);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function compareTournamentChoiceCandidates(
  left: { tournamentId: TournamentId; score: number; kind: TournamentScheduleReadModelEntry["kind"] },
  right: { tournamentId: TournamentId; score: number; kind: TournamentScheduleReadModelEntry["kind"] },
  config: Sprint2Config,
): number {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  const kindDiff = kindPriorityIndex(config, left.kind) - kindPriorityIndex(config, right.kind);
  if (kindDiff !== 0) {
    return kindDiff;
  }
  if (left.tournamentId < right.tournamentId) {
    return -1;
  }
  if (left.tournamentId > right.tournamentId) {
    return 1;
  }
  return 0;
}

function computeEntryChoiceTieKey(
  simulationId: string,
  runSeed: number,
  personId: PersonId,
  absoluteMonth: number,
  tournamentId: TournamentId,
  provider: Sha256Provider,
): ValidationResult<string> {
  return computeDerivedTieKey(
    {
      simulationId,
      runSeed,
      tiePolicyVersion: DERIVED_TIE_KEY_POLICY_VERSION,
      purpose: "entry_choice",
      scopeId: {
        absoluteWorldMonth: absoluteMonth,
        personId,
        allocationRound: 0,
      },
      candidateStableId: tournamentId,
    },
    provider,
  );
}

function computeParticipantOrderTieKey(
  simulationId: string,
  runSeed: number,
  tournamentId: TournamentId,
  absoluteMonth: number,
  personId: PersonId,
  provider: Sha256Provider,
): ValidationResult<string> {
  return computeDerivedTieKey(
    {
      simulationId,
      runSeed,
      tiePolicyVersion: DERIVED_TIE_KEY_POLICY_VERSION,
      purpose: "entry_capacity",
      scopeId: {
        absoluteWorldMonth: absoluteMonth,
        tournamentId,
        allocationRound: 0,
      },
      candidateStableId: personId,
    },
    provider,
  );
}

export function selectSimultaneousTournamentForPerson(input: {
  candidateFacts: EntrantCandidateFacts;
  competingCandidates: readonly TournamentChoiceCandidate[];
  policy: EntryChoicePolicy;
  config: Sprint2Config;
  simulationId: string;
  runSeed: number;
  provider: Sha256Provider;
}): ValidationResult<TournamentId | null> {
  const scored: Array<{
    joinTournamentId: TournamentId;
    score: number;
    kind: TournamentScheduleReadModelEntry["kind"];
    effectiveEntry: TournamentScheduleReadModelEntry;
  }> = [];

  for (const candidate of input.competingCandidates) {
    const eligibility = evaluateEntrantEligibility(input.candidateFacts, candidate.effectiveEntry);
    if (!eligibility.eligible) {
      continue;
    }
    const preference = input.policy.evaluatePreference({
      personId: input.candidateFacts.personId,
      candidateFacts: input.candidateFacts,
      tournament: candidate.effectiveEntry,
    });
    if (!preference.ok) {
      return preference;
    }
    scored.push({
      joinTournamentId: candidate.joinTournamentId,
      score: preference.value.preferenceScoreHundredths,
      kind: candidate.effectiveEntry.kind,
      effectiveEntry: candidate.effectiveEntry,
    });
  }

  if (scored.length === 0) {
    return success(null);
  }

  scored.sort((left, right) =>
    compareTournamentChoiceCandidates(
      {
        tournamentId: left.joinTournamentId,
        score: left.score,
        kind: left.kind,
      },
      {
        tournamentId: right.joinTournamentId,
        score: right.score,
        kind: right.kind,
      },
      input.config,
    ),
  );

  const bestScore = scored[0]!.score;
  const bestKindPriority = kindPriorityIndex(input.config, scored[0]!.kind);
  const tied = scored.filter(
    (entry) =>
      entry.score === bestScore && kindPriorityIndex(input.config, entry.kind) === bestKindPriority,
  );
  if (tied.length === 1) {
    return success(tied[0]!.joinTournamentId);
  }

  const absoluteMonth = absoluteWorldMonth(tied[0]!.effectiveEntry);
  const tieKeys: Array<{ joinTournamentId: TournamentId; tieKey: string }> = [];
  for (const entry of tied) {
    const tieKey = computeEntryChoiceTieKey(
      input.simulationId,
      input.runSeed,
      input.candidateFacts.personId,
      absoluteMonth,
      entry.joinTournamentId,
      input.provider,
    );
    if (!tieKey.ok) {
      return tieKey;
    }
    tieKeys.push({ joinTournamentId: entry.joinTournamentId, tieKey: tieKey.value });
  }
  tieKeys.sort((left, right) => {
    if (left.tieKey < right.tieKey) {
      return -1;
    }
    if (left.tieKey > right.tieKey) {
      return 1;
    }
    return 0;
  });
  return success(tieKeys[0]!.joinTournamentId);
}

function resolveEffectiveEntry(
  entry: TournamentScheduleReadModelEntry,
  entriesById: ReadonlyMap<TournamentId, TournamentScheduleReadModelEntry>,
): TournamentScheduleReadModelEntry | null {
  if (entry.lifecycleState === "cancelled") {
    return null;
  }
  if (entry.lifecycleState === "merged") {
    if (entry.mergeTargetId === undefined) {
      return null;
    }
    const target = entriesById.get(entry.mergeTargetId);
    if (target === undefined) {
      return null;
    }
    return resolveEffectiveEntry(target, entriesById);
  }
  return entry;
}

export function buildTournamentChoiceCandidates(
  scheduleEntries: readonly TournamentScheduleReadModelEntry[],
): readonly TournamentChoiceCandidate[] {
  const entriesById = new Map(scheduleEntries.map((entry) => [entry.tournamentId, entry]));
  const candidates: TournamentChoiceCandidate[] = [];

  for (const sourceEntry of scheduleEntries) {
    if (sourceEntry.lifecycleState === "cancelled") {
      continue;
    }
    const effectiveEntry = resolveEffectiveEntry(sourceEntry, entriesById);
    if (effectiveEntry === null) {
      continue;
    }
    candidates.push({
      joinTournamentId: sourceEntry.tournamentId,
      effectiveEntry,
      sourceEntry,
    });
  }

  return candidates.sort((left, right) => {
    if (left.effectiveEntry.absoluteWeek !== right.effectiveEntry.absoluteWeek) {
      return left.effectiveEntry.absoluteWeek - right.effectiveEntry.absoluteWeek;
    }
    if (left.joinTournamentId < right.joinTournamentId) {
      return -1;
    }
    if (left.joinTournamentId > right.joinTournamentId) {
      return 1;
    }
    return 0;
  });
}

export function computeScheduleLifecycleIdentity(
  entry: TournamentScheduleReadModelEntry,
  provider: Sha256Provider,
): ValidationResult<ScheduleLifecycleIdentity> {
  const mergeSourceIds = [...entry.mergeSourceIds].sort();
  const payload: Record<string, unknown> = {
    tournamentId: entry.tournamentId,
    lifecycleState: entry.lifecycleState,
    absoluteWeek: entry.absoluteWeek,
    scheduleOrdinal: entry.scheduleOrdinal,
    mergeSourceIds,
  };
  if (entry.mergeTargetId !== undefined) {
    payload["mergeTargetId"] = entry.mergeTargetId;
  }
  const hash = safeHashUtf8(provider, toCanonicalJson(payload), "/scheduleLifecycleIdentity");
  if (!hash.ok) {
    return hash;
  }
  const identity: ScheduleLifecycleIdentity = {
    tournamentId: entry.tournamentId,
    lifecycleState: entry.lifecycleState,
    absoluteWeek: entry.absoluteWeek,
    scheduleOrdinal: entry.scheduleOrdinal,
    mergeSourceIds,
    identityHash: hash.value,
  };
  if (entry.mergeTargetId !== undefined) {
    identity.mergeTargetId = entry.mergeTargetId;
  }
  return success(identity);
}

function buildParticipantListHashInput(list: {
  tournamentId: TournamentId;
  scheduleLifecycleIdentityHash: string;
  selectedPersonIds: readonly PersonId[];
  policyIdentity: EntryChoicePolicyIdentity;
}): Record<string, unknown> {
  return {
    schemaVersion: PLANNED_PARTICIPANT_LIST_SCHEMA_VERSION,
    tournamentId: list.tournamentId,
    scheduleLifecycleIdentityHash: list.scheduleLifecycleIdentityHash,
    selectedPersonIds: [...list.selectedPersonIds],
    policyIdentity: list.policyIdentity,
  };
}

export function computeParticipantListHash(
  list: {
    tournamentId: TournamentId;
    scheduleLifecycleIdentityHash: string;
    selectedPersonIds: readonly PersonId[];
    policyIdentity: EntryChoicePolicyIdentity;
  },
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(
    provider,
    toCanonicalJson(buildParticipantListHashInput(list)),
    "/participantListHash",
  );
}

function tournamentCapacityMaximum(config: Sprint2Config, kind: TournamentScheduleReadModelEntry["kind"]): number {
  return config.tournamentCapacity[kind].maximum;
}

function orderSelectedPersonIds(input: {
  tournamentId: TournamentId;
  tournament: TournamentScheduleReadModelEntry;
  personIds: readonly PersonId[];
  personScores: ReadonlyMap<PersonId, number>;
  config: Sprint2Config;
  simulationId: string;
  runSeed: number;
  provider: Sha256Provider;
}): ValidationResult<readonly PersonId[]> {
  const absoluteMonth = absoluteWorldMonth(input.tournament);
  const scored = input.personIds.map((personId) => ({
    personId,
    score: input.personScores.get(personId) ?? 0,
  }));
  scored.sort((left, right) => {
    if (left.score !== right.score) {
      return right.score - left.score;
    }
    if (left.personId < right.personId) {
      return -1;
    }
    if (left.personId > right.personId) {
      return 1;
    }
    return 0;
  });

  const groups: Array<{ score: number; personIds: PersonId[] }> = [];
  for (const entry of scored) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.score === entry.score) {
      last.personIds.push(entry.personId);
      continue;
    }
    groups.push({ score: entry.score, personIds: [entry.personId] });
  }

  const ordered: PersonId[] = [];
  for (const group of groups) {
    if (group.personIds.length === 1) {
      ordered.push(group.personIds[0]!);
      continue;
    }
    const tieKeys: Array<{ personId: PersonId; tieKey: string }> = [];
    for (const personId of group.personIds) {
      const tieKey = computeParticipantOrderTieKey(
        input.simulationId,
        input.runSeed,
        input.tournamentId,
        absoluteMonth,
        personId,
        input.provider,
      );
      if (!tieKey.ok) {
        return tieKey;
      }
      tieKeys.push({ personId, tieKey: tieKey.value });
    }
    tieKeys.sort((left, right) => {
      if (left.tieKey < right.tieKey) {
        return -1;
      }
      if (left.tieKey > right.tieKey) {
        return 1;
      }
      return 0;
    });
    for (const entry of tieKeys) {
      ordered.push(entry.personId);
    }
  }

  return success(ordered);
}

export function canProduceParticipantList(entry: TournamentScheduleReadModelEntry): boolean {
  return entry.lifecycleState !== "cancelled";
}

export function assertScheduleLifecycleIdentityFresh(
  expected: ScheduleLifecycleIdentity,
  current: ScheduleLifecycleIdentity,
): ValidationResult<null> {
  if (expected.identityHash === current.identityHash) {
    return success(null);
  }
  return failure([
    {
      path: "/scheduleLifecycleIdentity",
      message: "stale schedule/lifecycle identity requires recomputation",
      actual: current.identityHash,
      expected: expected.identityHash,
    },
  ]);
}

export function buildPlannedParticipantList(input: {
  tournamentId: TournamentId;
  scheduleEntries: readonly TournamentScheduleReadModelEntry[];
  candidateFactsByPersonId: ReadonlyMap<PersonId, EntrantCandidateFacts>;
  policy: EntryChoicePolicy;
  config: Sprint2Config;
  simulationId: string;
  runSeed: number;
  provider: Sha256Provider;
  expectedScheduleLifecycleIdentity?: ScheduleLifecycleIdentity;
}): ValidationResult<PlannedParticipantList | null> {
  const entriesById = new Map(input.scheduleEntries.map((entry) => [entry.tournamentId, entry]));
  const sourceEntry = entriesById.get(input.tournamentId);
  if (sourceEntry === undefined) {
    return failure([
      {
        path: "/tournamentId",
        message: "tournamentId not found in schedule read-model",
        actual: input.tournamentId,
        expected: "existing TournamentId",
      },
    ]);
  }
  if (!canProduceParticipantList(sourceEntry)) {
    return success(null);
  }

  const lifecycleIdentity = computeScheduleLifecycleIdentity(sourceEntry, input.provider);
  if (!lifecycleIdentity.ok) {
    return lifecycleIdentity;
  }
  if (input.expectedScheduleLifecycleIdentity !== undefined) {
    const fresh = assertScheduleLifecycleIdentityFresh(
      input.expectedScheduleLifecycleIdentity,
      lifecycleIdentity.value,
    );
    if (!fresh.ok) {
      return fresh;
    }
  }

  const choiceCandidates = buildTournamentChoiceCandidates(input.scheduleEntries);
  const candidatesByEffectiveWeek = new Map<number, TournamentChoiceCandidate[]>();
  for (const candidate of choiceCandidates) {
    const week = candidate.effectiveEntry.absoluteWeek;
    const bucket = candidatesByEffectiveWeek.get(week) ?? [];
    bucket.push(candidate);
    candidatesByEffectiveWeek.set(week, bucket);
  }

  const effectiveEntry =
    resolveEffectiveEntry(sourceEntry, entriesById) ?? sourceEntry;
  const relevantWeek = effectiveEntry.absoluteWeek;
  const weekCandidates = candidatesByEffectiveWeek.get(relevantWeek) ?? [];

  const selectedForTournament = new Set<PersonId>();
  const personScores = new Map<PersonId, number>();

  for (const [personId, facts] of input.candidateFactsByPersonId) {
    const competing = weekCandidates.filter((candidate) => {
      const eligibility = evaluateEntrantEligibility(facts, candidate.effectiveEntry);
      return eligibility.eligible;
    });
    if (competing.length === 0) {
      continue;
    }
    const selected = selectSimultaneousTournamentForPerson({
      candidateFacts: facts,
      competingCandidates: competing,
      policy: input.policy,
      config: input.config,
      simulationId: input.simulationId,
      runSeed: input.runSeed,
      provider: input.provider,
    });
    if (!selected.ok) {
      return selected;
    }
    if (selected.value !== input.tournamentId) {
      continue;
    }
    if (selectedForTournament.has(personId)) {
      return failure([
        {
          path: "/selectedPersonIds",
          message: "duplicate effective participation for one Person/TournamentId",
          actual: personId,
          expected: "unique PersonId",
        },
      ]);
    }
    const preference = input.policy.evaluatePreference({
      personId,
      candidateFacts: facts,
      tournament: effectiveEntry,
    });
    if (!preference.ok) {
      return preference;
    }
    personScores.set(personId, preference.value.preferenceScoreHundredths);
    selectedForTournament.add(personId);
  }

  const ordered = orderSelectedPersonIds({
    tournamentId: input.tournamentId,
    tournament: effectiveEntry,
    personIds: [...selectedForTournament],
    personScores,
    config: input.config,
    simulationId: input.simulationId,
    runSeed: input.runSeed,
    provider: input.provider,
  });
  if (!ordered.ok) {
    return ordered;
  }

  const capacity = tournamentCapacityMaximum(input.config, effectiveEntry.kind);
  const truncated = ordered.value.slice(0, capacity);
  const participantListHash = computeParticipantListHash(
    {
      tournamentId: input.tournamentId,
      scheduleLifecycleIdentityHash: lifecycleIdentity.value.identityHash,
      selectedPersonIds: truncated,
      policyIdentity: input.policy.identity,
    },
    input.provider,
  );
  if (!participantListHash.ok) {
    return participantListHash;
  }

  return success({
    schemaVersion: PLANNED_PARTICIPANT_LIST_SCHEMA_VERSION,
    tournamentId: input.tournamentId,
    scheduleLifecycleIdentity: lifecycleIdentity.value,
    selectedPersonIds: truncated,
    policyIdentity: input.policy.identity,
    participantListHash: participantListHash.value,
  });
}

export function toEntrySelectionHandoff(list: PlannedParticipantList): EntrySelectionHandoff {
  return {
    tournamentId: list.tournamentId,
    selectedPersonIds: list.selectedPersonIds,
    participantListHash: list.participantListHash,
    scheduleLifecycleIdentity: list.scheduleLifecycleIdentity,
    policyIdentity: list.policyIdentity,
  };
}

export function collectEligibilityRejections(
  candidates: readonly EntrantCandidateFacts[],
  tournament: TournamentScheduleReadModelEntry,
): Partial<Record<EntrantEligibilityRejectionReason, PersonId[]>> {
  const rejections: Partial<Record<EntrantEligibilityRejectionReason, PersonId[]>> = {};
  for (const candidate of candidates) {
    const result = evaluateEntrantEligibility(candidate, tournament);
    if (result.eligible) {
      continue;
    }
    const bucket = rejections[result.reason] ?? [];
    bucket.push(candidate.personId);
    rejections[result.reason] = bucket;
  }
  return rejections;
}
