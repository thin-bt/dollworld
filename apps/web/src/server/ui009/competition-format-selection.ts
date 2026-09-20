import type { StructuralFormatKind } from "@shared-world/simulation-core";

type Ui009TournamentKind = "normal" | "open" | "limited" | "promotion";

export interface Ui009TournamentFormatConfig {
  readonly roundRobinMinimum: number;
  readonly roundRobinMaximum: number;
  readonly singleEliminationMinimum: number;
  readonly singleEliminationMaximum: number;
  readonly groupKnockoutMinimum: number;
  readonly groupKnockoutMaximum: number;
  readonly promotionAlwaysSingleElimination: boolean;
}

export type Ui009AcceptedTournamentFormat =
  "round_robin" | "single_elimination" | "group_plus_knockout";

export interface Ui009TournamentFormatSelection {
  readonly acceptedFormat: Ui009AcceptedTournamentFormat;
  readonly structuralFormatKind: StructuralFormatKind;
}

/**
 * Maps the accepted Sprint2 format thresholds onto the structural bracket vocabulary.
 * The caller supplies the already-validated Sprint2 config; this helper deliberately
 * does not invent fallback thresholds or silently clamp unsupported participant counts.
 */
export function selectUi009TournamentFormat(
  participantCount: number,
  tournamentKind: Ui009TournamentKind,
  format: Ui009TournamentFormatConfig,
): Ui009TournamentFormatSelection | null {
  if (!Number.isSafeInteger(participantCount) || participantCount < 0) {
    return null;
  }

  if (
    tournamentKind === "promotion" &&
    format.promotionAlwaysSingleElimination &&
    participantCount >= format.roundRobinMinimum &&
    participantCount <= format.singleEliminationMaximum
  ) {
    return {
      acceptedFormat: "single_elimination",
      structuralFormatKind: "knockout",
    };
  }

  if (
    participantCount >= format.roundRobinMinimum &&
    participantCount <= format.roundRobinMaximum
  ) {
    return {
      acceptedFormat: "round_robin",
      structuralFormatKind: "round_robin",
    };
  }

  if (
    participantCount >= format.singleEliminationMinimum &&
    participantCount <= format.singleEliminationMaximum
  ) {
    return {
      acceptedFormat: "single_elimination",
      structuralFormatKind: "knockout",
    };
  }

  if (
    participantCount >= format.groupKnockoutMinimum &&
    participantCount <= format.groupKnockoutMaximum
  ) {
    return {
      acceptedFormat: "group_plus_knockout",
      structuralFormatKind: "group_round_robin_knockout",
    };
  }

  return null;
}
