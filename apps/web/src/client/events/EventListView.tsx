/**
 * Presentational Event list — in-world history hierarchy (FIX6 / FIX8).
 * Ordinary list uses human-grouped cards; technical/contentless stay in Developer Info.
 */

import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import { eventGroupLabel, formatWorldDateValue } from "../presentation/display-labels.js";
import { buildHumanEventCards } from "./event-groups.js";
import type { EventListItemView } from "./ui008-views.js";

export type EventListViewProps = {
  status: "loading" | "success" | "empty" | "error" | "stale";
  items: readonly EventListItemView[];
  /** Next-page peek envelopes used only to complete page-edge lifecycle clusters (FIX11). */
  boundaryContext?: readonly EventListItemView[];
  /** Lifecycle keys already shown on a prior page (FIX11). */
  suppressLifecycleKeys?: ReadonlySet<string>;
  totalCount: number;
  errorText: string | null;
  errorCode: string | null;
  personIdFilter: string;
  eventGroupFilter: string;
  yearFilter: string;
  monthFilter: string;
  weekFilter: string;
  /** Inclusive max world year for the year selector (from simulation summary). */
  yearOptionsMax: number | null;
  filterHint: string | null;
  canNext: boolean;
  loading: boolean;
  personNameById?: ReadonlyMap<string, string> | Record<string, string>;
  onPersonIdFilterChange: (value: string) => void;
  onEventGroupFilterChange: (value: string) => void;
  onYearFilterChange: (value: string) => void;
  onMonthFilterChange: (value: string) => void;
  onWeekFilterChange: (value: string) => void;
  onApplyQuery: () => void;
  onResetToNewest: () => void;
  onNext: () => void;
  onFreshReload: () => void;
  onRecoverSession?: () => void;
};

export function EventListView(props: EventListViewProps) {
  const grouped =
    props.status === "success"
      ? buildHumanEventCards(props.items, props.personNameById, {
          ...(props.boundaryContext !== undefined
            ? { boundaryContext: props.boundaryContext }
            : {}),
          ...(props.suppressLifecycleKeys !== undefined
            ? { suppressLifecycleKeys: props.suppressLifecycleKeys }
            : {}),
        })
      : { cards: [], technical: [], hiddenContentless: [], emittedLifecycleKeys: [] };

  const yearMax =
    props.yearOptionsMax !== null && props.yearOptionsMax >= 1 ? props.yearOptionsMax : null;
  const yearChoices =
    yearMax !== null ? Array.from({ length: yearMax }, (_, i) => yearMax - i) : [];

  return (
    <section data-testid="events-list-panel" className="dw-events-pane">
      <h3>出来事（正史）</h3>
      <form
        className="dw-toolbar"
        data-testid="events-query-controls"
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.loading) {
            props.onApplyQuery();
          }
        }}
      >
        <label htmlFor="events-person-id">人物（任意）</label>
        <input
          id="events-person-id"
          data-testid="events-person-id"
          value={props.personIdFilter}
          disabled={props.loading}
          onChange={(event) => props.onPersonIdFilterChange(event.target.value)}
        />
        <label htmlFor="events-event-group">グループ</label>
        <select
          id="events-event-group"
          data-testid="events-event-group"
          value={props.eventGroupFilter}
          disabled={props.loading}
          onChange={(event) => props.onEventGroupFilterChange(event.target.value)}
        >
          <option value="">（指定なし）</option>
          <option value="training">{eventGroupLabel("training")}</option>
          <option value="technique_learning">{eventGroupLabel("technique_learning")}</option>
        </select>
        <label htmlFor="events-year">年</label>
        <select
          id="events-year"
          data-testid="events-year"
          value={props.yearFilter}
          disabled={props.loading}
          onChange={(event) => props.onYearFilterChange(event.target.value)}
        >
          <option value="">（指定なし）</option>
          {yearChoices.map((y) => (
            <option key={y} value={String(y)}>
              {y}年
            </option>
          ))}
        </select>
        <label htmlFor="events-month">月</label>
        <select
          id="events-month"
          data-testid="events-month"
          value={props.monthFilter}
          disabled={props.loading}
          onChange={(event) => props.onMonthFilterChange(event.target.value)}
        >
          <option value="">（指定なし）</option>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
            <option key={m} value={String(m)}>
              {m}月
            </option>
          ))}
        </select>
        <label htmlFor="events-week">週</label>
        <select
          id="events-week"
          data-testid="events-week"
          value={props.weekFilter}
          disabled={props.loading}
          onChange={(event) => props.onWeekFilterChange(event.target.value)}
        >
          <option value="">（指定なし）</option>
          {[1, 2, 3, 4].map((w) => (
            <option key={w} value={String(w)}>
              第{w}週
            </option>
          ))}
        </select>
        <button type="submit" data-testid="events-apply-query" disabled={props.loading}>
          絞り込み
        </button>
        <button
          type="button"
          data-testid="events-reset-newest"
          disabled={props.loading}
          onClick={props.onResetToNewest}
        >
          最新へ戻す
        </button>
      </form>
      <p className="dw-sub">
        一覧は新しい出来事から表示します（sequence 降順）。年・月・週は世界暦の週（各月4週）です。
      </p>
      {props.filterHint !== null ? (
        <p className="dw-status" data-testid="events-filter-hint" data-status="hint">
          {props.filterHint}
        </p>
      ) : null}
      <p className="dw-sub" data-testid="events-meta">
        このページ {grouped.cards.length} 件
      </p>

      {props.status === "loading" ? (
        <p className="dw-status" data-testid="events-status" data-status="loading">
          読み込み中…
        </p>
      ) : null}
      {props.status === "empty" ? (
        <p className="dw-status" data-testid="events-status" data-status="empty">
          該当する出来事はありません
        </p>
      ) : null}
      {props.status === "error" ? (
        <div
          className="dw-status"
          data-testid="events-status"
          data-status="error"
          data-error-code={props.errorCode ?? ""}
        >
          {props.errorCode === "SESSION_REQUIRED" ? (
            <>
              <p>閲覧セッションがありません。再接続してからもう一度お試しください。</p>
              {props.onRecoverSession !== undefined ? (
                <button
                  type="button"
                  data-testid="events-recover-session"
                  onClick={props.onRecoverSession}
                >
                  セッションを再接続
                </button>
              ) : null}
            </>
          ) : (
            <p>取得に失敗しました。しばらくしてから再度お試しください。</p>
          )}
          <DeveloperDetails compact={true}>
            <p data-testid="events-error-dev">
              {props.errorCode ?? "unknown"}: {props.errorText}
            </p>
          </DeveloperDetails>
        </div>
      ) : null}
      {props.status === "stale" ? (
        <div
          className="dw-status"
          data-testid="events-status"
          data-status="stale"
          data-error-code="STALE_CURSOR"
        >
          <p>ページ情報が古くなりました。先頭から読み直してください。</p>
          <button type="button" data-testid="events-fresh-reload" onClick={props.onFreshReload}>
            先頭から再読み込み
          </button>
          <DeveloperDetails compact={true}>
            <p>{props.errorText}</p>
          </DeveloperDetails>
        </div>
      ) : null}

      {props.status === "success" ? (
        <div data-testid="events-status" data-status="success">
          {grouped.cards.length === 0 ? (
            <p className="dw-status" data-empty="true">
              観察向けの出来事はありません（技術記録は開発者情報を参照）
            </p>
          ) : (
            <ol data-testid="events-items" className="dw-event-list">
              {grouped.cards.map((card) => {
                const item = card.primary;
                return (
                  <li
                    key={card.key}
                    data-event-id={item.eventId}
                    data-sequence={String(item.sequence)}
                    className="dw-event-item"
                  >
                    <time className="dw-event-when">{formatWorldDateValue(item.worldDate)}</time>
                    <div className="dw-event-body">
                      <p className="dw-event-who" data-testid={`events-who-${item.eventId}`}>
                        {card.who}
                      </p>
                      <strong className="dw-event-what">{card.what}</strong>
                      <p className="dw-event-result" data-testid={`events-result-${item.eventId}`}>
                        {card.result}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <DeveloperDetails testId="events-technical-dev">
            <p data-testid="events-meta-dev">totalCount={props.totalCount}</p>
            <p data-testid="events-technical-count">
              technical={grouped.technical.length} contentlessHidden=
              {grouped.hiddenContentless.length}
            </p>
            {grouped.cards.length > 0 ? (
              <pre data-testid="events-cards-dev-aggregate">
                {JSON.stringify(
                  grouped.cards.map((card) => ({
                    what: card.what,
                    eventId: card.primary.eventId,
                    sequence: card.primary.sequence,
                    eventType: card.primary.eventType,
                    personIds: card.primary.entities?.personIds ?? [],
                    primary: card.primary,
                    related: card.related,
                  })),
                  null,
                  2,
                )}
              </pre>
            ) : null}
            <pre>
              {JSON.stringify(
                {
                  technical: grouped.technical.map((e) => ({
                    eventId: e.eventId,
                    eventType: e.eventType,
                    personIds: e.entities?.personIds ?? [],
                  })),
                  contentless: grouped.hiddenContentless.map((e) => ({
                    eventId: e.eventId,
                    eventType: e.eventType,
                    personIds: e.entities?.personIds ?? [],
                  })),
                },
                null,
                2,
              )}
            </pre>
          </DeveloperDetails>
        </div>
      ) : null}

      <button
        type="button"
        data-testid="events-next"
        disabled={!props.canNext || props.loading}
        onClick={props.onNext}
      >
        次へ
      </button>
    </section>
  );
}
