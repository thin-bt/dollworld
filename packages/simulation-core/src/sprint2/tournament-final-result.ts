/**
 * S02-007 immutable deterministic final tournament result / placement projection.
 */
import { toCanonicalJson } from "../canonical-json.js";
import type { PersonId, SimulationId, TournamentId } from "../ids.js";
import type { Sha256Provider } from "../sha256-provider.js";
import { failure, success } from "../validation.js";
import type { ValidationIssue, ValidationResult } from "../validation.js";
import { deepFreezePlainJson } from "../sprint1/plain-data.js";
import { safeHashUtf8 } from "../sprint1/safe-sha256.js";
import {
  TOURNAMENT_AWARD_TIERS,
  TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION,
  type TournamentAwardTier,
} from "./constants.js";

export type TournamentFinalPlacement = {
  personId: PersonId;
  placementOrdinal: number;
  awardTier: TournamentAwardTier;
  placementBandKind: string;
  placementBandOrdinal: number;
};

export type TournamentFinalResult = {
  schemaVersion: typeof TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION;
  simulationId: SimulationId;
  tournamentId: TournamentId;
  structuralSourceIdentityHash: string;
  completionApplicationIdentityHash: string;
  completionKind: "winner_determined" | "no_winner";
  placements: readonly TournamentFinalPlacement[];
  winnerPersonId?: PersonId;
  resultHash: string;
};

export type BuildTournamentFinalResultInput = {
  simulationId: SimulationId;
  tournamentId: TournamentId;
  structuralSourceIdentityHash: string;
  completionApplicationIdentityHash: string;
  completionKind: "winner_determined" | "no_winner";
  placements: readonly TournamentFinalPlacement[];
};

export type ValidateTournamentFinalResultSource = {
  tournamentId: TournamentId;
  structuralSourceIdentityHash: string;
  completionApplicationIdentityHash: string;
};

function buildResultHashMaterial(
  result: Omit<TournamentFinalResult, "resultHash">,
): Record<string, unknown> {
  return {
    schemaVersion: result.schemaVersion,
    simulationId: result.simulationId,
    tournamentId: result.tournamentId,
    structuralSourceIdentityHash: result.structuralSourceIdentityHash,
    completionApplicationIdentityHash: result.completionApplicationIdentityHash,
    completionKind: result.completionKind,
    placements: result.placements.map((p) => ({
      personId: p.personId,
      placementOrdinal: p.placementOrdinal,
      awardTier: p.awardTier,
      placementBandKind: p.placementBandKind,
      placementBandOrdinal: p.placementBandOrdinal,
    })),
    winnerPersonId: result.winnerPersonId,
  };
}

export function computeTournamentFinalResultHash(
  result: Omit<TournamentFinalResult, "resultHash">,
  provider: Sha256Provider,
): ValidationResult<string> {
  return safeHashUtf8(provider, toCanonicalJson(buildResultHashMaterial(result)), "/resultHash");
}

function validatePlacements(
  placements: readonly TournamentFinalPlacement[],
  completionKind: "winner_determined" | "no_winner",
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (placements.length === 0) {
    issues.push({
      path: "/placements",
      message: "placements must not be empty",
      expected: "at least one placement",
    });
    return issues;
  }

  const seenPersonIds = new Set<string>();
  for (let i = 0; i < placements.length; i += 1) {
    const p = placements[i]!;
    const path = `/placements/${String(i)}`;
    if (p.placementOrdinal !== i + 1) {
      issues.push({
        path: `${path}/placementOrdinal`,
        message: "placements must be canonically ordered by placementOrdinal starting at 1",
        actual: p.placementOrdinal,
        expected: String(i + 1),
      });
    }
    if (!TOURNAMENT_AWARD_TIERS.includes(p.awardTier)) {
      issues.push({
        path: `${path}/awardTier`,
        message: "awardTier must be a known TournamentAwardTier",
        actual: p.awardTier,
        expected: TOURNAMENT_AWARD_TIERS.join("|"),
      });
    }
    if (seenPersonIds.has(p.personId)) {
      issues.push({
        path: `${path}/personId`,
        message: "duplicate PersonId in placements",
        actual: p.personId,
      });
    }
    seenPersonIds.add(p.personId);
  }

  const first = placements[0]!;
  if (completionKind === "winner_determined") {
    if (first.awardTier !== "champion") {
      issues.push({
        path: "/placements/0/awardTier",
        message: "winner_determined requires placement #1 awardTier champion",
        actual: first.awardTier,
        expected: "champion",
      });
    }
  } else if (first.awardTier === "champion") {
    issues.push({
      path: "/placements/0/awardTier",
      message: "no_winner must not assign champion awardTier to placement #1",
      actual: first.awardTier,
      expected: "non-champion",
    });
  }

  return issues;
}

export function buildTournamentFinalResult(
  input: BuildTournamentFinalResultInput,
  provider: Sha256Provider,
): ValidationResult<TournamentFinalResult> {
  const placementIssues = validatePlacements(input.placements, input.completionKind);
  if (placementIssues.length > 0) {
    return failure(placementIssues);
  }

  const winnerPersonId =
    input.completionKind === "winner_determined" ? input.placements[0]!.personId : undefined;

  const withoutHashBase = {
    schemaVersion: TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION,
    simulationId: input.simulationId,
    tournamentId: input.tournamentId,
    structuralSourceIdentityHash: input.structuralSourceIdentityHash,
    completionApplicationIdentityHash: input.completionApplicationIdentityHash,
    completionKind: input.completionKind,
    placements: input.placements,
  };
  const withoutHash: Omit<TournamentFinalResult, "resultHash"> =
    winnerPersonId !== undefined
      ? { ...withoutHashBase, winnerPersonId }
      : withoutHashBase;

  const hash = computeTournamentFinalResultHash(withoutHash, provider);
  if (!hash.ok) {
    return hash;
  }

  return success(
    deepFreezePlainJson({
      ...withoutHash,
      resultHash: hash.value,
    }),
  );
}

export function validateTournamentFinalResult(
  result: TournamentFinalResult,
  provider: Sha256Provider,
): ValidationResult<TournamentFinalResult> {
  const issues: ValidationIssue[] = [];
  if (result.schemaVersion !== TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION) {
    issues.push({
      path: "/schemaVersion",
      message: "tournament final result schemaVersion mismatch",
      actual: result.schemaVersion,
      expected: TOURNAMENT_FINAL_RESULT_SCHEMA_VERSION,
    });
  }

  const placementIssues = validatePlacements(result.placements, result.completionKind);
  issues.push(...placementIssues);

  if (result.completionKind === "winner_determined") {
    if (result.winnerPersonId === undefined) {
      issues.push({
        path: "/winnerPersonId",
        message: "winner_determined requires winnerPersonId",
        expected: "PersonId",
      });
    } else if (result.winnerPersonId !== result.placements[0]!.personId) {
      issues.push({
        path: "/winnerPersonId",
        message: "winnerPersonId must equal placement #1 personId",
        actual: result.winnerPersonId,
        expected: result.placements[0]!.personId,
      });
    }
  } else if (result.winnerPersonId !== undefined) {
    issues.push({
      path: "/winnerPersonId",
      message: "no_winner must not set winnerPersonId",
      actual: result.winnerPersonId,
    });
  }

  if (issues.length > 0) {
    return failure(issues);
  }

  const { resultHash, ...withoutHash } = result;
  const expected = computeTournamentFinalResultHash(withoutHash, provider);
  if (!expected.ok) {
    return expected;
  }
  if (expected.value !== resultHash) {
    return failure([
      {
        path: "/resultHash",
        message: "tournament final result hash mismatch",
        actual: resultHash,
        expected: expected.value,
      },
    ]);
  }

  return success(result);
}

export function validateTournamentFinalResultSource(
  result: TournamentFinalResult,
  source: ValidateTournamentFinalResultSource,
): ValidationResult<TournamentFinalResult> {
  const issues: ValidationIssue[] = [];
  if (result.tournamentId !== source.tournamentId) {
    issues.push({
      path: "/tournamentId",
      message: "stale or mismatched tournamentId",
      actual: result.tournamentId,
      expected: source.tournamentId,
    });
  }
  if (result.structuralSourceIdentityHash !== source.structuralSourceIdentityHash) {
    issues.push({
      path: "/structuralSourceIdentityHash",
      message: "stale or mismatched structural source identity",
      actual: result.structuralSourceIdentityHash,
      expected: source.structuralSourceIdentityHash,
    });
  }
  if (result.completionApplicationIdentityHash !== source.completionApplicationIdentityHash) {
    issues.push({
      path: "/completionApplicationIdentityHash",
      message: "stale or mismatched completion application identity",
      actual: result.completionApplicationIdentityHash,
      expected: source.completionApplicationIdentityHash,
    });
  }
  if (issues.length > 0) {
    return failure(issues);
  }
  return success(result);
}

export function tournamentPlacementContributionKey(tournamentId: TournamentId): string {
  return `${tournamentId}:placement`;
}
