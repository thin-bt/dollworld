import { describe, expect, it } from "vitest";
import { selectUi009TournamentFormat, type Ui009TournamentFormatConfig } from "./competition-format-selection.js";

const canonicalFormat: Ui009TournamentFormatConfig = {
  roundRobinMinimum: 2,
  roundRobinMaximum: 4,
  singleEliminationMinimum: 5,
  singleEliminationMaximum: 16,
  groupKnockoutMinimum: 17,
  groupKnockoutMaximum: 32,
  promotionAlwaysSingleElimination: true,
};

describe("UI-009 accepted tournament format selection", () => {
  it.each([
    [2, "round_robin", "round_robin"],
    [4, "round_robin", "round_robin"],
    [5, "single_elimination", "knockout"],
    [16, "single_elimination", "knockout"],
    [17, "group_plus_knockout", "group_round_robin_knockout"],
    [32, "group_plus_knockout", "group_round_robin_knockout"],
  ] as const)(
    "selects the canonical boundary for %i entrants",
    (participantCount, acceptedFormat, structuralFormatKind) => {
      expect(selectUi009TournamentFormat(participantCount, "normal", canonicalFormat)).toEqual({
        acceptedFormat,
        structuralFormatKind,
      });
    },
  );

  it("forces promotion tournaments into single elimination when configured", () => {
    expect(selectUi009TournamentFormat(2, "promotion", canonicalFormat)).toEqual({
      acceptedFormat: "single_elimination",
      structuralFormatKind: "knockout",
    });
    expect(selectUi009TournamentFormat(16, "promotion", canonicalFormat)).toEqual({
      acceptedFormat: "single_elimination",
      structuralFormatKind: "knockout",
    });
  });

  it.each([0, 1, 33, Number.NaN, 2.5])(
    "fails closed instead of inventing a format for %s entrants",
    (participantCount) => {
      expect(selectUi009TournamentFormat(participantCount, "normal", canonicalFormat)).toBeNull();
    },
  );
});
