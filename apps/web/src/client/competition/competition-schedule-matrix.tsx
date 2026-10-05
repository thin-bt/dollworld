import { useCallback, useEffect, useRef, useState } from "react";
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
  const scheduleScrollRef = useRef<HTMLDivElement>(null);
  const [atScrollStart, setAtScrollStart] = useState(true);
  const [atScrollEnd, setAtScrollEnd] = useState(false);

  const syncScrollEdges = useCallback(() => {
    const element = scheduleScrollRef.current;
    if (element === null) return;
    const maxScrollLeft = Math.max(0, element.scrollWidth - element.clientWidth);
    setAtScrollStart(element.scrollLeft <= 2);
    setAtScrollEnd(element.scrollLeft >= maxScrollLeft - 2);
  }, []);

  useEffect(() => {
    const element = scheduleScrollRef.current;
    if (element === null) return;
    syncScrollEdges();
    const resizeObserver = new ResizeObserver(syncScrollEdges);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [overview.entries, overview.worldYear, syncScrollEdges]);

  const scrollByWeeks = (direction: -1 | 1) => {
    const element = scheduleScrollRef.current;
    if (element === null) return;
    const headers = element.querySelectorAll<HTMLElement>(".competition-schedule-week");
    const firstHeader = headers.item(0);
    const fifthHeader = headers.item(4);
    const distance =
      firstHeader !== null && fifthHeader !== null
        ? fifthHeader.offsetLeft - firstHeader.offsetLeft
        : (firstHeader?.offsetWidth ?? 0) * 4;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * distance,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  };

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
      <div className="competition-schedule-tools">
        <p id="competition-schedule-scroll-help" className="competition-schedule-scroll-help">
          横にスクロールして1〜12月の日程を確認できます。
          キーボードでは日程表にフォーカスして左右の矢印キーを使用します。
        </p>
        <div className="competition-schedule-scroll-actions" aria-label="日程表の横移動">
          <button
            type="button"
            aria-controls="competition-annual-schedule-region"
            aria-label="4週間戻る"
            data-testid="competition-schedule-scroll-prev"
            disabled={atScrollStart}
            onClick={() => scrollByWeeks(-1)}
          >
            ← 4週戻る
          </button>
          <button
            type="button"
            aria-controls="competition-annual-schedule-region"
            aria-label="4週間進む"
            data-testid="competition-schedule-scroll-next"
            disabled={atScrollEnd}
            onClick={() => scrollByWeeks(1)}
          >
            4週進む →
          </button>
        </div>
      </div>
      <div
        className="competition-schedule-frame"
        data-testid="competition-schedule-frame"
        data-at-start={atScrollStart}
        data-at-end={atScrollEnd}
      >
        <div
          id="competition-annual-schedule-region"
          ref={scheduleScrollRef}
          className="competition-schedule-scroll"
          data-testid="competition-annual-schedule"
          tabIndex={0}
          role="region"
          aria-label={`${overview.worldYear}年 大会日程の横スクロール領域`}
          aria-describedby="competition-schedule-scroll-help"
          onScroll={syncScrollEdges}
        >
          <table className="competition-schedule-table">
            <caption className="dw-visually-hidden">{overview.worldYear}年 大会日程表</caption>
            <thead>
              <tr>
                <th scope="col" className="competition-schedule-row-label">
                  帯
                </th>
                {monthHeaders.map((header) => (
                  <th
                    key={header.month}
                    scope="colgroup"
                    colSpan={4}
                    className="competition-schedule-month"
                  >
                    {header.label}
                  </th>
                ))}
              </tr>
              <tr>
                <th scope="col" />
                {Array.from({ length: WEEKS_PER_YEAR }, (_, index) => {
                  const weekNumber = index + 1;
                  const month = Math.floor(index / 4) + 1;
                  const weekOfMonth = (index % 4) + 1;
                  const isCurrentWeek =
                    overview.isViewingCurrentWorldYear && weekNumber === overview.currentWeekColumn;
                  return (
                    <th
                      key={index}
                      scope="col"
                      className="competition-schedule-week"
                      aria-label={`${month}月 第${weekOfMonth}週${isCurrentWeek ? " 現在週" : ""}`}
                      aria-current={isCurrentWeek ? "date" : undefined}
                    >
                      {weekOfMonth}
                    </th>
                  );
                })}
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
                            title={`${entry.tournamentDisplayName}（${entry.timingLabel} ${entry.rankOrCategoryLabel}）`}
                            aria-label={`${entry.tournamentDisplayName} ${entry.timingLabel}`}
                            onClick={() => onSelect(entry.selectionKey)}
                          >
                            <span className="competition-schedule-marker-label">
                              {entry.tournamentDisplayName}
                            </span>
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
      </div>
    </section>
  );
}
