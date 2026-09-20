/**
 * S02-007 committed display-safe CompetitiveRecord source facts (no annual ranking calculation).
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { Rank } from "../enums.js";
import type { PersonId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  COMPETITIVE_RECORD_SCHEMA_VERSION,
  COMPETITION_DOMAIN_KEYS,
  PROMOTION_PROGRESS_SCHEMA_VERSION,
  PROMOTION_QUALIFICATION_STATUSES,
  S_QUALIFICATION_CONTRIBUTION_SCHEMA_VERSION,
  S_QUALIFICATION_STATE_SCHEMA_VERSION,
  TOURNAMENT_KINDS,
  type CompetitionDomainKey,
  type PromotionQualificationStatus,
  type SQualificationSourceKind,
  type TournamentKind,
} from "./constants.js";
import {
  tournamentPlacementContributionKey,
  type TournamentFinalResult,
  validateTournamentFinalResultSource,
  type ValidateTournamentFinalResultSource,
} from "./tournament-final-result.js";

export type WinsByDomain = Record<CompetitionDomainKey, number>;
export type WinsByTournamentKind = Record<TournamentKind, number>;

export type PromotionProgress = {
  schemaVersion: typeof PROMOTION_PROGRESS_SCHEMA_VERSION;
  sourceRank: Rank;
  targetRank: Rank;
  points: number;
  qualifyingWins: number;
  qualificationStatus: PromotionQualificationStatus;
  qualificationActivatedByTournamentId?: string;
  progressHash: string;
};

export type SQualificationContribution = {
  schemaVersion: typeof S_QUALIFICATION_CONTRIBUTION_SCHEMA_VERSION;
  contributionKey: string;
  absoluteWorldWeek: number;
  sourceKind: SQualificationSourceKind;
  sourceMatchId?: string;
  sourceTournamentId: string;
  openPointDelta: number;
  openWinDelta: number;
  openTitleDelta: number;
  openFinalDelta: number;
  contributionHash: string;
};

export type SQualificationState = {
  schemaVersion: typeof S_QUALIFICATION_STATE_SCHEMA_VERSION;
  contributions: readonly SQualificationContribution[];
  openPoints: number;
  openWins: number;
  openTitles: number;
  openFinals: number;
  stateHash: string;
};

export type CompetitiveRecord = {
  schemaVersion: typeof COMPETITIVE_RECORD_SCHEMA_VERSION;
  personId: PersonId;
  currentRank: Rank;
  officialMatches: number;
  officialWins: number;
  officialLosses: number;
  winsByTournamentKind: WinsByTournamentKind;
  lossesByTournamentKind: WinsByTournamentKind;
  winsByDomain: WinsByDomain;
  tournamentEntries: number;
  tournamentTitles: number;
  runnerUpFinishes: number;
  openWinsAgainstS: number;
  annualRankingPoints: number;
  promotionProgress?: PromotionProgress;
  sQualificationState?: SQualificationState;
  appliedContributionKeys: readonly string[];
  recordHash: string;
};

function emptyWinsByDomain(): WinsByDomain {
  return {
    unarmed: 0,
    sword: 0,
    magic: 0,
  };
}

function emptyWinsByTournamentKind(): WinsByTournamentKind {
  return {
    normal: 0,
    open: 0,
    limited: 0,
    promotion: 0,
  };
}

function emptyLossesByTournamentKind(): WinsByTournamentKind {
  return emptyWinsByTournamentKind();
}

export function createEmptyCompetitiveRecord(
  personId: PersonId,
  currentRank: Rank,
  provider: Sha256Provider,
): ValidationResult<CompetitiveRecord> {
  const withoutHash = {
    schemaVersion: COMPETITIVE_RECORD_SCHEMA_VERSION,
    personId,
    currentRank,
    officialMatches: 0,
    officialWins: 0,
    officialLosses: 0,
    winsByTournamentKind: emptyWinsByTournamentKind(),
    lossesByTournamentKind: emptyLossesByTournamentKind(),
    winsByDomain: emptyWinsByDomain(),
    tournamentEntries: 0,
    tournamentTitles: 0,
    runnerUpFinishes: 0,
    openWinsAgainstS: 0,
    annualRankingPoints: 0,
    appliedContributionKeys: [] as readonly string[],
  } satisfies Omit<CompetitiveRecord, "recordHash">;
  const hash = computeCompetitiveRecordHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }
  return success(
    deepFreezePlainJson({
      ...withoutHash,
      recordHash: hash.value,
    }),
  );
}

function buildRecordHashMaterial(
  record: Omit<CompetitiveRecord, "recordHash">,
): Record<string, unknown> {
  const material: Record<string, unknown> = {
    schemaVersion: record.schemaVersion,
    personId: record.personId,
    currentRank: record.currentRank,
    officialMatches: record.officialMatches,
    officialWins: record.officialWins,
    officialLosses: record.officialLosses,
    winsByTournamentKind: record.winsByTournamentKind,
    lossesByTournamentKind: record.lossesByTournamentKind,
    winsByDomain: record.winsByDomain,
    tournamentEntries: record.tournamentEntries,
    tournamentTitles: record.tournamentTitles,
    runnerUpFinishes: record.runnerUpFinishes,
    openWinsAgainstS: record.openWinsAgainstS,
    annualRankingPoints: record.annualRankingPoints,
    appliedContributionKeys: [...record.appliedContributionKeys].sort(),
  };
  if (record.promotionProgress !== undefined) {
    material.promotionProgress = record.promotionProgress;
  }
  if (record.sQualificationState !== undefined) {
    material.sQualificationState = record.sQualificationState;
  }
  return material;
}

export function computeCompetitiveRecordHash(
  record: Omit<CompetitiveRecord, "recordHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildRecordHashMaterial(record)), "/recordHash");
}

export type ApplyTournamentFinalResultToCompetitiveRecordInput = {
  record: CompetitiveRecord;
  finalResult: TournamentFinalResult;
  source: ValidateTournamentFinalResultSource;
};

export type ApplyTournamentFinalResultToCompetitiveRecordOutput =
  | { kind: "applied"; record: CompetitiveRecord }
  | { kind: "idempotent_skip"; record: CompetitiveRecord }
  | { kind: "validation_failure"; issues: readonly ValidationIssue[] };

export function applyTournamentFinalResultToCompetitiveRecord(
  input: ApplyTournamentFinalResultToCompetitiveRecordInput,
  provider: Sha256Provider,
): ApplyTournamentFinalResultToCompetitiveRecordOutput {
  const sourceValidation = validateTournamentFinalResultSource(input.finalResult, input.source);
  if (!sourceValidation.ok) {
    return { kind: "validation_failure", issues: sourceValidation.issues };
  }

  const contributionKey = tournamentPlacementContributionKey(input.finalResult.tournamentId);
  if (input.record.appliedContributionKeys.includes(contributionKey)) {
    return { kind: "idempotent_skip", record: input.record };
  }

  const placement = input.finalResult.placements.find((p) => p.personId === input.record.personId);
  if (placement === undefined) {
    return {
      kind: "validation_failure",
      issues: [
        {
          path: "/placements",
          message: "participant missing from tournament final result placements",
          actual: input.record.personId,
        },
      ],
    };
  }

  let tournamentTitles = input.record.tournamentTitles;
  let runnerUpFinishes = input.record.runnerUpFinishes;
  if (input.finalResult.completionKind === "winner_determined") {
    if (placement.awardTier === "champion") {
      tournamentTitles += 1;
    } else if (placement.awardTier === "runner_up") {
      runnerUpFinishes += 1;
    }
  }

  const withoutHashBase = {
    schemaVersion: input.record.schemaVersion,
    personId: input.record.personId,
    currentRank: input.record.currentRank,
    officialMatches: input.record.officialMatches,
    officialWins: input.record.officialWins,
    officialLosses: input.record.officialLosses,
    winsByTournamentKind: input.record.winsByTournamentKind,
    lossesByTournamentKind: input.record.lossesByTournamentKind,
    winsByDomain: input.record.winsByDomain,
    tournamentEntries: input.record.tournamentEntries + 1,
    tournamentTitles,
    runnerUpFinishes,
    openWinsAgainstS: input.record.openWinsAgainstS,
    annualRankingPoints: input.record.annualRankingPoints,
    appliedContributionKeys: [...input.record.appliedContributionKeys, contributionKey],
  };
  const withoutHash: Omit<CompetitiveRecord, "recordHash"> = {
    ...withoutHashBase,
    ...(input.record.promotionProgress !== undefined
      ? { promotionProgress: input.record.promotionProgress }
      : {}),
    ...(input.record.sQualificationState !== undefined
      ? { sQualificationState: input.record.sQualificationState }
      : {}),
  };

  const hash = computeCompetitiveRecordHash(withoutHash, provider);
  if (!hash.ok) {
    return { kind: "validation_failure", issues: hash.issues };
  }

  return {
    kind: "applied",
    record: deepFreezePlainJson({
      ...withoutHash,
      recordHash: hash.value,
    }),
  };
}

export function validateCompetitiveRecordShape(record: CompetitiveRecord): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (record.schemaVersion !== COMPETITIVE_RECORD_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "competitive record schemaVersion mismatch",
      actual: record.schemaVersion,
      expected: COMPETITIVE_RECORD_SCHEMA_VERSION,
    });
  }
  for (const kind of TOURNAMENT_KINDS) {
    if (typeof record.winsByTournamentKind[kind] !== "number") {
      issues.push({
        path: `/winsByTournamentKind/${kind}`,
        message: "missing winsByTournamentKind counter",
        expected: "number",
      });
    }
  }
  for (const domain of COMPETITION_DOMAIN_KEYS) {
    if (typeof record.winsByDomain[domain] !== "number") {
      issues.push({
        path: `/winsByDomain/${domain}`,
        message: "missing winsByDomain counter",
        expected: "number",
      });
    }
  }
  if (record.promotionProgress !== undefined) {
    if (record.promotionProgress.schemaVersion !== PROMOTION_PROGRESS_SCHEMA_VERSION) {
      issues.push({
        path: "/promotionProgress/schemaVersion",
        message: "promotion progress schemaVersion mismatch",
        actual: record.promotionProgress.schemaVersion,
        expected: PROMOTION_PROGRESS_SCHEMA_VERSION,
      });
    }
    if (!PROMOTION_QUALIFICATION_STATUSES.includes(record.promotionProgress.qualificationStatus)) {
      issues.push({
        path: "/promotionProgress/qualificationStatus",
        message: "invalid promotion qualification status",
        actual: record.promotionProgress.qualificationStatus,
      });
    }
  }
  return issues;
}
