/**
 * Presentational people panel — human-observer-first hierarchy (FIX2).
 */

import {
  PEOPLE_PAGE_SIZES,
  PEOPLE_PAGE_SIZES_BLOCKED,
  PEOPLE_PAGE_SIZE_BLOCKED_REASON,
  isPeoplePageSize,
  type PeoplePageSize,
} from "./people-paging.js";
import type { PersonListItemView } from "./ui004-views.js";
import { personDetailPath } from "./fetch-ui004.js";
import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import {
  APTITUDE_KEYS,
  aptitudeLabel,
  careerStatusLabel,
  displayNull,
  lifeStatusLabel,
  sortByLabel,
  stateFilterLabel,
  statLabel,
  STAT_KEYS,
} from "../presentation/display-labels.js";

export const PEOPLE_STATE_FILTER_OPTIONS = [
  "",
  "life:living",
  "life:deceased",
  "career:child",
  "career:trainee",
  "career:active_competitor",
  "career:retired",
] as const;

export const PEOPLE_SORT_BY_OPTIONS = [
  "personId",
  "stamina",
  "strength",
  "skill",
  "speed",
  "spirit",
  "magic",
  "unarmed",
  "sword",
  "magicAptitude",
] as const;

export type PeopleViewerViewProps = {
  status: "loading" | "success" | "empty" | "error" | "stale";
  items: readonly PersonListItemView[];
  totalCount: number;
  uiRevision: number | null;
  errorText: string | null;
  errorCode: string | null;
  pageSize: PeoplePageSize;
  rangeText: string;
  pageNumber: number;
  canPrev: boolean;
  canNext: boolean;
  nameFilter: string;
  stateFilter: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onPageSizeChange: (pageSize: PeoplePageSize) => void;
  onPrev: () => void;
  onNext: () => void;
  onNameFilterChange: (name: string) => void;
  onStateFilterChange: (state: string) => void;
  onSortByChange: (sortBy: string) => void;
  onSortOrderChange: (sortOrder: "asc" | "desc") => void;
  onApplyQuery: () => void;
  onFreshReload: () => void;
  enablePersonNavigation?: boolean;
  personHref?: (personId: string) => string;
};

export function PeopleViewerView(props: PeopleViewerViewProps) {
  const hrefFor = props.personHref ?? personDetailPath;
  const navEnabled = props.enablePersonNavigation === true;
  const controlsDisabled = props.status === "loading";

  return (
    <section className="dw-card" data-testid="dev-viewer-people">
      <h2>人物一覧</h2>
      <p className="dw-sub" data-testid="people-meta">
        全 {props.totalCount} 人
      </p>

      <form
        className="dw-toolbar"
        data-testid="people-query-controls"
        onSubmit={(event) => {
          event.preventDefault();
          if (!controlsDisabled) {
            props.onApplyQuery();
          }
        }}
      >
        <label htmlFor="people-name-filter">名前</label>
        <input
          id="people-name-filter"
          data-testid="people-name-filter"
          type="search"
          value={props.nameFilter}
          disabled={controlsDisabled}
          onChange={(event) => props.onNameFilterChange(event.target.value)}
        />
        <label htmlFor="people-state-filter">状態</label>
        <select
          id="people-state-filter"
          data-testid="people-state-filter"
          value={props.stateFilter}
          disabled={controlsDisabled}
          onChange={(event) => props.onStateFilterChange(event.target.value)}
        >
          {PEOPLE_STATE_FILTER_OPTIONS.map((state) => (
            <option key={state === "" ? "none" : state} value={state}>
              {stateFilterLabel(state)}
            </option>
          ))}
        </select>
        <label htmlFor="people-sort-by">並び</label>
        <select
          id="people-sort-by"
          data-testid="people-sort-by"
          value={props.sortBy}
          disabled={controlsDisabled}
          onChange={(event) => props.onSortByChange(event.target.value)}
        >
          {PEOPLE_SORT_BY_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {sortByLabel(key)}
            </option>
          ))}
        </select>
        <label htmlFor="people-sort-order">順序</label>
        <select
          id="people-sort-order"
          data-testid="people-sort-order"
          value={props.sortOrder}
          disabled={controlsDisabled}
          onChange={(event) =>
            props.onSortOrderChange(event.target.value === "desc" ? "desc" : "asc")
          }
        >
          <option value="asc">昇順</option>
          <option value="desc">降順</option>
        </select>
        <button type="submit" data-testid="people-apply-query" disabled={controlsDisabled}>
          絞り込み
        </button>
      </form>

      <div className="dw-toolbar-row" data-testid="people-page-size-control">
        <label htmlFor="people-page-size">表示件数</label>
        <select
          id="people-page-size"
          data-testid="people-page-size"
          data-page-size={String(props.pageSize)}
          value={props.pageSize}
          disabled={controlsDisabled}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (isPeoplePageSize(next)) {
              props.onPageSizeChange(next);
            }
          }}
        >
          {PEOPLE_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}件
            </option>
          ))}
        </select>
        <span className="dw-sub" data-testid="people-range">
          表示 {props.rangeText}
        </span>
        <span
          className="dw-sub"
          data-testid="people-page-number"
          data-page={String(props.pageNumber)}
        >
          ページ {props.pageNumber}
        </span>
      </div>

      {props.status === "loading" ? (
        <p className="dw-status" data-testid="people-status" data-status="loading">
          読み込み中…
        </p>
      ) : null}
      {props.status === "error" ? (
        <p
          className="dw-status"
          data-testid="people-status"
          data-status="error"
          data-error-code={props.errorCode ?? ""}
        >
          取得に失敗しました: {props.errorText}
        </p>
      ) : null}
      {props.status === "stale" ? (
        <div
          className="dw-status"
          data-testid="people-status"
          data-status="stale"
          data-error-code="STALE_CURSOR"
        >
          <p>ページ情報が古くなりました: {props.errorText}</p>
          <button type="button" data-testid="people-fresh-reload" onClick={props.onFreshReload}>
            先頭から再読み込み
          </button>
        </div>
      ) : null}
      {props.status === "empty" ? (
        <p className="dw-status" data-testid="people-status" data-status="empty">
          該当する人物はいません
        </p>
      ) : null}

      {props.status === "success" ? (
        <div className="dw-table-wrap" data-testid="people-status" data-status="success">
          <table className="dw-table dw-people-table" data-testid="people-table">
            <thead>
              <tr>
                <th>人物</th>
                <th>年齢</th>
                <th>生死</th>
                <th>キャリア</th>
                <th>段位</th>
                {STAT_KEYS.map((key) => (
                  <th key={key} data-stat={key}>
                    {statLabel(key)}
                  </th>
                ))}
                {APTITUDE_KEYS.map((key) => (
                  <th key={key} data-aptitude={key}>
                    {aptitudeLabel(key)}
                  </th>
                ))}
                <th>習得技</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((row) => (
                <tr key={row.personId} data-person-id={row.personId}>
                  <td>
                    <div className="dw-person-cell">
                      {navEnabled ? (
                        <a
                          href={hrefFor(row.personId)}
                          data-testid={`people-open-${row.personId}`}
                          data-person-nav={row.personId}
                        >
                          {row.displayName}
                        </a>
                      ) : (
                        <b>{row.displayName}</b>
                      )}
                    </div>
                  </td>
                  <td>{displayNull(row.age)}</td>
                  <td data-life-status={row.lifeStatus}>{lifeStatusLabel(row.lifeStatus)}</td>
                  <td data-career-status={row.careerStatus}>
                    {careerStatusLabel(row.careerStatus)}
                  </td>
                  <td>{displayNull(row.currentRank)}</td>
                  {STAT_KEYS.map((key) => (
                    <td key={key} data-stat={key}>
                      {String(row.stats[key])}
                    </td>
                  ))}
                  {APTITUDE_KEYS.map((key) => (
                    <td key={key} data-aptitude={key}>
                      {String(row.aptitudes[key])}
                    </td>
                  ))}
                  <td>{row.learnedTechniqueCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="dw-paging" data-testid="people-paging">
        <button
          type="button"
          data-testid="people-prev"
          disabled={!props.canPrev}
          onClick={props.onPrev}
        >
          前へ
        </button>
        <button
          type="button"
          data-testid="people-next"
          disabled={!props.canNext}
          onClick={props.onNext}
        >
          次へ
        </button>
      </div>

      <DeveloperDetails testId="people-page-developer-details">
        <p className="dw-sub" data-testid="people-meta-dev">
          totalCount={props.totalCount}
          {props.uiRevision !== null ? ` · uiRevision=${String(props.uiRevision)}` : ""}
        </p>
        <p
          data-testid="people-page-size-blocked"
          data-blocked-page-sizes={PEOPLE_PAGE_SIZES_BLOCKED.join(",")}
        >
          {PEOPLE_PAGE_SIZE_BLOCKED_REASON}
        </p>
        {props.items.length > 0 ? (
          <section data-testid="people-row-ids-dev">
            <h4>行の識別子</h4>
            <ul>
              {props.items.map((row) => (
                <li key={row.personId} data-person-id={row.personId}>
                  <span data-testid={`developer-details-person-${row.personId}`}>
                    {row.displayName}: personId={row.personId}; familyId={row.familyId}; lineageId=
                    {row.lineageId === null ? "null" : row.lineageId}; participationStatus=
                    {displayNull(row.participationStatus)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </DeveloperDetails>
    </section>
  );
}
