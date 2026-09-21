import type { CompetitionProgressView } from "./ui009-views.js";

export type AnnualRankingTableProps = {
  view: CompetitionProgressView;
  onRankingYearChange?: ((year: number) => void) | undefined;
  testIdPrefix?: "competition" | "ranking";
};

export function AnnualRankingTable(props: AnnualRankingTableProps) {
  const prefix = props.testIdPrefix ?? "competition";
  const observation = props.view.wireframeObservation;

  if (props.view.rankingRows.length === 0) {
    return (
      <p className="panel-status" data-testid={`${prefix}-ranking-empty`}>
        表示できる年間順位データがまだありません。大会が確定すると順位が反映されます。
      </p>
    );
  }

  return (
    <section
      className="competition-ranking"
      aria-labelledby={`${prefix}-ranking-heading`}
      data-testid={`${prefix}-ranking-section`}
    >
      <h3 id={`${prefix}-ranking-heading`} className="competition-section-heading">
        年間順位
      </h3>
      <p className="competition-ranking-note">公式戦戦績は本大会の結果を含まない通算記録です。</p>
      <div className="competition-ranking-year" data-testid={`${prefix}-ranking-year-nav`}>
        {observation.annualRankingYearOptions.map((option) => (
          <button
            key={option.worldYear}
            type="button"
            data-testid={`${prefix}-ranking-year-option`}
            data-year={option.worldYear}
            aria-pressed={option.worldYear === observation.selectedRankingYear}
            disabled={
              !option.hasData && option.worldYear !== props.view.scheduleOverview.currentWorldYear
            }
            onClick={() => props.onRankingYearChange?.(option.worldYear)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <table className="data-table" data-testid={`${prefix}-annual-ranking-table`}>
        <thead>
          <tr>
            <th>順位</th>
            <th>選手</th>
            <th>年間獲得金</th>
            <th>ランク</th>
            <th>出場</th>
            <th>優勝</th>
            <th>公式戦戦績（本大会除く）</th>
          </tr>
        </thead>
        <tbody>
          {props.view.rankingRows.map((row) => (
            <tr key={row.personId}>
              <td>{row.annualRank}</td>
              <td>
                <a href={`/people/${encodeURIComponent(row.personId)}`}>{row.displayName}</a>
              </td>
              <td>{row.yearlyCumulativeEarningsLabel}</td>
              <td>{row.currentRankLabel}</td>
              <td>{row.tournamentAppearances}</td>
              <td>{row.tournamentWins}</td>
              <td>{row.officialRecordLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
