import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnualRankingTable } from "../competition/AnnualRankingTable.js";
import type { CompetitionProgressView } from "../competition/ui009-views.js";

function sampleView(): CompetitionProgressView {
  return {
    schemaVersion: "0.1.0",
    lifecyclePhase: "finished",
    tournamentId: "t1",
    tournamentKind: "normal",
    targetRank: "F",
    participantIds: ["p1"],
    matchesCompleted: 1,
    lastMatch: null,
    finalResultSummary: null,
    rankingRows: [
      {
        personId: "p1",
        displayName: "Alpha",
        displayOrder: 1,
        annualRank: 1,
        yearlyCumulativeEarnings: 1000,
        yearlyCumulativeEarningsLabel: "1,000",
        currentRank: "F",
        currentRankLabel: "F",
        tournamentWins: 1,
        tournamentAppearances: 1,
        officialWins: 0,
        officialLosses: 0,
        officialRecordLabel: "0-0",
      },
    ],
    tournamentKindLabel: "通常",
    targetRankLabel: "F",
    participantDisplayNames: ["Alpha"],
    preStartPreview: null,
    lastMatchPlayerLabels: null,
    championDisplayName: "Alpha",
    roundRobinProgress: null,
    knockoutBracket: null,
    bracketFormatKind: null,
    scheduleOverview: {
      currentWorldYear: 21,
      activeSelectionKey: null,
      playableSelectionKey: null,
      entries: [],
    },
    wireframeObservation: {
      annualRankingYearOptions: [
        { worldYear: 21, label: "21年", isCurrentWorldYear: true, hasData: true },
      ],
      selectedRankingYear: 21,
      tournamentSeriesHistory: [],
      promotionResults: [],
      personRankHistory: [],
    },
  } as unknown as CompetitionProgressView;
}

describe("RankingPage annual table", () => {
  it("renders standalone ranking table with ranking test ids", () => {
    const html = renderToStaticMarkup(
      <AnnualRankingTable view={sampleView()} testIdPrefix="ranking" />,
    );
    expect(html).toContain('data-testid="ranking-annual-ranking-table"');
    expect(html).toContain('data-testid="ranking-ranking-year-nav"');
    expect(html).toContain("年間獲得金");
    expect(html).toContain('href="/people/p1"');
  });
});
