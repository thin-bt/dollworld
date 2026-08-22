/**
 * Presentational mock-candidates panel.
 */

import type { MockBattleCandidateView } from "./ui004-views.js";

export type MockCandidatesViewerViewProps = {
  status: "loading" | "success" | "empty" | "error";
  items: readonly MockBattleCandidateView[];
  totalCount: number;
  uiRevision: number | null;
  errorText: string | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function MockCandidatesViewerView(props: MockCandidatesViewerViewProps) {
  return (
    <section data-testid="dev-viewer-candidates">
      <h2>Mock Battle Candidates</h2>
      <p data-testid="candidates-meta">
        totalCount={props.totalCount}
        {props.uiRevision !== null ? ` · uiRevision=${String(props.uiRevision)}` : ""}
      </p>
      {props.status === "loading" ? (
        <p data-testid="candidates-status" data-status="loading">
          loading…
        </p>
      ) : null}
      {props.status === "error" ? (
        <p data-testid="candidates-status" data-status="error">
          error: {props.errorText}
        </p>
      ) : null}
      {props.status === "empty" ? (
        <p data-testid="candidates-status" data-status="empty">
          empty (0 items)
        </p>
      ) : null}
      {props.status === "success" ? (
        <div data-testid="candidates-status" data-status="success">
          <table data-testid="candidates-table">
            <thead>
              <tr>
                <th>personId</th>
                <th>displayName</th>
                <th>age</th>
                <th>careerStatus</th>
              </tr>
            </thead>
            <tbody>
              {props.items.map((row) => (
                <tr key={row.personId} data-person-id={row.personId}>
                  <td>{row.personId}</td>
                  <td>{row.displayName}</td>
                  <td>{row.age}</td>
                  <td>{row.careerStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <div data-testid="candidates-paging">
        <button
          type="button"
          data-testid="candidates-prev"
          disabled={!props.canPrev}
          onClick={props.onPrev}
        >
          Prev
        </button>
        <button
          type="button"
          data-testid="candidates-next"
          disabled={!props.canNext}
          onClick={props.onNext}
        >
          Next
        </button>
      </div>
    </section>
  );
}
