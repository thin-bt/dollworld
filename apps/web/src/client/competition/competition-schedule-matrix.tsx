import type { CompetitionScheduleEntry, CompetitionScheduleOverview } from "./ui009-views.js";

const ROW_LABELS: Record<string, string> = {
  F: "F",
  E: "E",
  D: "D",
  C: "C",
  B: "B",
  OPEN: "A/S",
  unarmed: "格闘",
  sword: "剣",
  magic: "魔",
  PROMO: "昇格",
};

const WEEKS_PER_YEAR = 48;

function weekColumnIndex(month: number, weekOfMonth: number): number {
  return (month - 1) * 4 + weekOfMonth;
}

function entriesByRowAndWeek(
  entries: readonly CompetitionScheduleEntry[],
): Map<string, Map<number, CompetitionScheduleEntry>> {
  const map = new Map<string, Map<number, CompetitionScheduleEntry>>();
  for (const entry of entries) {
    let row = map.get(entry.matrixRowKey);
    if (row === undefined) {
      row = new Map();
      map.set(entry.matrixRowKey, row);
    }
    row.set(weekColumnIndex(entry.month, entry.weekOfMonth), entry);
  }
  return map;
}

export type CompetitionScheduleMatrixProps = {
  overview: CompetitionScheduleOverview;
  selectedKey: string | null;
  onSelect: (selectionKey: string) => void;
  onViewYear?: (worldYear: number) => void;
};

export function CompetitionScheduleMatrix(props: CompetitionScheduleMatrixProps) {
  const { overview, selectedKey, onSelect, onViewYear } = props;
  if (overview.entries.length === 0) {
    return (
      <p className="competition-schedule-empty" data-testid="competition-schedule-empty">
        今年度の大会日程を表示できませんでした。
      </p>
    );
  }

  const byRow = entriesByRowAndWeek(overview.entries);
  const monthHeaders = Array.from({ length: 12 }, (_, monthIndex) => {
    const month = monthIndex + 1;
    return { month, label: `${month}月` };
  });

  return (
    <section className="competition-schedule" aria-labelledby="competition-schedule-heading">
      <div className="competition-schedule-header">
        <h3
          id="competition-schedule-heading"
          className="competition-section-heading"
          data-testid="competition-schedule-heading"
        >
          {overview.worldYear}年 大会日程
        </h3>
        <div className="competition-schedule-year-nav" data-testid="competition-schedule-year-nav">
          <button
            type="button"
            disabled={overview.prevViewYear === null || onViewYear === undefined}
            data-testid="competition-schedule-prev-year"
            onClick={() => {
              if (overview.prevViewYear !== null && onViewYear !== undefined) {
                onViewYear(overview.prevViewYear);
              }
            }}
          >
            前年
          </button>
          <button
            type="button"
            disabled={overview.isViewingCurrentWorldYear || onViewYear === undefined}
            data-testid="competition-schedule-current-year"
            onClick={() => {
              if (onViewYear !== undefined) {
                onViewYear(overview.currentWorldYear);
              }
            }}
          >
            今年
          </button>
          <button
            type="button"
            disabled={overview.nextViewYear === null || onViewYear === undefined}
            data-testid="competition-schedule-next-year"
            onClick={() => {
              if (overview.nextViewYear !== null && onViewYear !== undefined) {
                onViewYear(overview.nextViewYear);
              }
            }}
          >
            翌年
          </button>
        </div>
      </div>
      <p className="competition-schedule-time" data-testid="competition-world-time">
        現在: <strong>{overview.worldTimeLabel}</strong>
      </p>
      <div className="competition-schedule-scroll" data-testid="competition-annual-schedule">
        <table className="competition-schedule-table">
          <thead>
            <tr>
              <th scope="col" className="competition-schedule-row-label">
                帯
              </th>
              {monthHeaders.map((header) => (
                <th key={header.month} scope="colgroup" colSpan={4} className="competition-schedule-month">
                  {header.label}
                </th>
              ))}
            </tr>
            <tr>
              <th scope="col" />
              {Array.from({ length: WEEKS_PER_YEAR }, (_, index) => (
                <th key={index} scope="col" className="competition-schedule-week">
                  {(index % 4) + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {overview.matrixRowOrder.map((rowKey) => {
              const rowEntries = byRow.get(rowKey);
              return (
                <tr key={rowKey}>
                  <th scope="row" className="competition-schedule-row-label">
                    {ROW_LABELS[rowKey] ?? rowKey}
                  </th>
                  {Array.from({ length: WEEKS_PER_YEAR }, (_, index) => {
                    const columnWeek = index + 1;
                    const entry = rowEntries?.get(columnWeek);
                    if (entry === undefined) {
                      const isNow =
                        overview.isViewingCurrentWorldYear &&
                        columnWeek === overview.currentWeekColumn;
                      return (
                        <td
                          key={columnWeek}
                          className={
                            isNow
                              ? "competition-schedule-cell competition-schedule-cell--now"
                              : "competition-schedule-cell"
                          }
                        />
                      );
                    }
                    const selected = entry.selectionKey === selectedKey;
                    const temporal = entry.temporalState;
                    return (
                      <td
                        key={columnWeek}
                        className={[
                          "competition-schedule-cell",
                          temporal === "past" ? "competition-schedule-cell--past" : "",
                          temporal === "current" ? "competition-schedule-cell--current-week" : "",
                          entry.isPlayable ? "competition-schedule-cell--playable" : "",
                          entry.isActiveCompetition ? "competition-schedule-cell--active" : "",
                          selected ? "competition-schedule-cell--selected" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <button
                          type="button"
                          className="competition-schedule-marker"
                          data-testid="competition-schedule-cell"
                          data-selection-key={entry.selectionKey}
                          aria-pressed={selected}
                          title={`${entry.timingLabel} ${entry.rankOrCategoryLabel} ${entry.lifecycleStateLabel}`}
                          onClick={() => onSelect(entry.selectionKey)}
                        >
                          ◆
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
