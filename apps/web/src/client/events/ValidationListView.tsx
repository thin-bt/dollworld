/**
 * Presentational Validation list — human-observer hierarchy (FIX2).
 */

import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import { validationStatusLabel } from "../presentation/display-labels.js";
import type { ValidationResultViewItem } from "./ui008-views.js";

export type ValidationListViewProps = {
  status: "loading" | "success" | "empty" | "error" | "stale";
  items: readonly ValidationResultViewItem[];
  totalCount: number;
  errorText: string | null;
  errorCode: string | null;
  statusFilter: string;
  canNext: boolean;
  loading: boolean;
  onStatusFilterChange: (value: string) => void;
  onApplyQuery: () => void;
  onNext: () => void;
  onFreshReload: () => void;
};

export function ValidationListView(props: ValidationListViewProps) {
  return (
    <section data-testid="validation-list-panel" className="dw-validation-pane">
      <h3>システム検証（開発者向け）</h3>
      <p className="dw-dev-banner" data-testid="validation-dev-banner">
        これは世界の正史ではなく、シミュレーション検証の実行記録です。一般の観察者向けの出来事一覧ではありません。
      </p>
      <form
        className="dw-toolbar"
        data-testid="validation-query-controls"
        onSubmit={(event) => {
          event.preventDefault();
          if (!props.loading) {
            props.onApplyQuery();
          }
        }}
      >
        <label htmlFor="validation-status-filter">結果</label>
        <select
          id="validation-status-filter"
          data-testid="validation-status-filter"
          value={props.statusFilter}
          disabled={props.loading}
          onChange={(event) => props.onStatusFilterChange(event.target.value)}
        >
          <option value="">（指定なし）</option>
          <option value="success">{validationStatusLabel("success")}</option>
          <option value="failure">{validationStatusLabel("failure")}</option>
        </select>
        <button type="submit" data-testid="validation-apply-query" disabled={props.loading}>
          絞り込み
        </button>
      </form>
      <p className="dw-sub" data-testid="validation-meta">
        全 {props.totalCount} 件
      </p>

      {props.status === "loading" ? (
        <p className="dw-status" data-testid="validation-status" data-status="loading">
          読み込み中…
        </p>
      ) : null}
      {props.status === "empty" ? (
        <p className="dw-status" data-testid="validation-status" data-status="empty">
          該当する検証結果はありません
        </p>
      ) : null}
      {props.status === "error" ? (
        <p
          className="dw-status"
          data-testid="validation-status"
          data-status="error"
          data-error-code={props.errorCode ?? ""}
        >
          取得に失敗しました: {props.errorText}
        </p>
      ) : null}
      {props.status === "stale" ? (
        <div
          className="dw-status"
          data-testid="validation-status"
          data-status="stale"
          data-error-code="STALE_CURSOR"
        >
          <p>ページ情報が古くなりました: {props.errorText}</p>
          <button type="button" data-testid="validation-fresh-reload" onClick={props.onFreshReload}>
            先頭から再読み込み
          </button>
        </div>
      ) : null}

      {props.status === "success" ? (
        <div data-testid="validation-status" data-status="success">
          <ol data-testid="validation-items" className="dw-validation-list">
            {props.items.map((item) => (
              <li
                key={String(item.validationOccurrence)}
                data-validation-occurrence={String(item.validationOccurrence)}
                data-validation-item-status={item.status}
                className="dw-validation-item"
              >
                <header>
                  <strong>検証 #{String(item.validationOccurrence)}</strong>
                  <span className="dw-badge">{validationStatusLabel(item.status)}</span>
                  <span className="dw-sub"> 指摘 {String(item.issueCount)} 件</span>
                </header>
                {item.issues.length === 0 ? (
                  <p data-empty="true">指摘なし</p>
                ) : (
                  <ul data-testid={`validation-issues-${String(item.validationOccurrence)}`}>
                    {item.issues.map((issue, index) => (
                      <li key={`${issue.path}-${String(index)}`}>
                        <span>{issue.path}</span>: <span>{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <DeveloperDetails testId="developer-details-validation">
                  <dl className="dw-dl">
                    <div>
                      <dt>validationOccurrence</dt>
                      <dd>{String(item.validationOccurrence)}</dd>
                    </div>
                    <div>
                      <dt>status</dt>
                      <dd>{item.status}</dd>
                    </div>
                    <div>
                      <dt>issueCount</dt>
                      <dd>{String(item.issueCount)}</dd>
                    </div>
                  </dl>
                  <pre>{JSON.stringify(item)}</pre>
                </DeveloperDetails>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <button
        type="button"
        data-testid="validation-next"
        disabled={!props.canNext || props.loading}
        onClick={props.onNext}
      >
        次へ
      </button>

      <DeveloperDetails testId="validation-meta-dev">
        <p data-testid="validation-meta-dev">totalCount={props.totalCount}</p>
      </DeveloperDetails>
    </section>
  );
}
