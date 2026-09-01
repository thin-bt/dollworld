/**
 * S02-008 annual earnings ranking projection (shared rank for equal earnings).
 */
import { compareUnicodeCodePoints } from "../canonical-json.js";
import type { Rank } from "../enums.js";
import type { PersonId } from "../ids.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import type { CompetitiveRecord } from "./competitive-record-update.js";
import {
  computeYearlyCumulativeEarnings,
  listAnnualEarningsApplicationsForYear,
  type AnnualEarningsLedger,
} from "./annual-earnings.js";

export type AnnualRankingDisplayFacts = {
  worldYear: number;
  personId: PersonId;
  annualRank: number;
  yearlyCumulativeEarnings: number;
  currentRank: Rank;
  tournamentAppearances: number;
  tournamentWins: number;
  officialWins: number;
  officialLosses: number;
  displayOrder: number;
};

export type ProjectAnnualRankingInput = {
  worldYear: number;
  ledger: AnnualEarningsLedger;
  competitiveRecords: ReadonlyMap<PersonId, CompetitiveRecord>;
};

type CandidateAccumulator = {
  personId: PersonId;
  yearlyCumulativeEarnings: number;
  currentRank: Rank;
  tournamentAppearances: number;
  tournamentWins: number;
  officialWins: number;
  officialLosses: number;
};

function collectCandidates(input: ProjectAnnualRankingInput): CandidateAccumulator[] {
  const yearApplications = listAnnualEarningsApplicationsForYear(input.ledger, input.worldYear);
  const personIds = new Set<PersonId>();
  for (const application of yearApplications) {
    personIds.add(application.personId);
  }

  const candidates: CandidateAccumulator[] = [];
  for (const personId of personIds) {
    const record = input.competitiveRecords.get(personId);
    if (record === undefined) {
      continue;
    }
    candidates.push({
      personId,
      yearlyCumulativeEarnings: computeYearlyCumulativeEarnings(
        input.ledger,
        input.worldYear,
        personId,
      ),
      currentRank: record.currentRank,
      tournamentAppearances: record.tournamentEntries,
      tournamentWins: record.tournamentTitles,
      officialWins: record.officialWins,
      officialLosses: record.officialLosses,
    });
  }

  candidates.sort((a, b) => {
    if (b.yearlyCumulativeEarnings !== a.yearlyCumulativeEarnings) {
      return b.yearlyCumulativeEarnings - a.yearlyCumulativeEarnings;
    }
    return compareUnicodeCodePoints(a.personId, b.personId);
  });

  return candidates;
}

export function projectAnnualRanking(
  input: ProjectAnnualRankingInput,
): ValidationResult<readonly AnnualRankingDisplayFacts[]> {
  const issues: ValidationIssue[] = [];
  if (!Number.isSafeInteger(input.worldYear) || input.worldYear < 1) {
    issues.push({
      path: "/worldYear",
      message: "worldYear must be a safe integer >= 1",
      actual: input.worldYear,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }

  const candidates = collectCandidates(input);
  if (candidates.length === 0) {
    return success(deepFreezePlainJson([]));
  }

  const rows: AnnualRankingDisplayFacts[] = [];
  let index = 0;
  while (index < candidates.length) {
    const earnings = candidates[index]!.yearlyCumulativeEarnings;
    let groupEnd = index + 1;
    while (
      groupEnd < candidates.length &&
      candidates[groupEnd]!.yearlyCumulativeEarnings === earnings
    ) {
      groupEnd += 1;
    }

    const sharedRank = index + 1;
    const group = candidates.slice(index, groupEnd).sort((a, b) =>
      compareUnicodeCodePoints(a.personId, b.personId),
    );

    for (let order = 0; order < group.length; order += 1) {
      const candidate = group[order]!;
      rows.push({
        worldYear: input.worldYear,
        personId: candidate.personId,
        annualRank: sharedRank,
        yearlyCumulativeEarnings: candidate.yearlyCumulativeEarnings,
        currentRank: candidate.currentRank,
        tournamentAppearances: candidate.tournamentAppearances,
        tournamentWins: candidate.tournamentWins,
        officialWins: candidate.officialWins,
        officialLosses: candidate.officialLosses,
        displayOrder: rows.length,
      });
    }

    index = groupEnd;
  }

  return success(deepFreezePlainJson(rows));
}

export function projectAnnualRankingForBrowser(
  facts: readonly AnnualRankingDisplayFacts[],
): readonly AnnualRankingDisplayFacts[] {
  return deepFreezePlainJson([...facts]);
}
