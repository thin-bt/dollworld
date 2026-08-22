/**
 * Presentational simulation panel — testable without a DOM async harness.
 * Human-observer-first hierarchy (FIX2) + visual-quality home (FIX3).
 */

import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import { displayNull, formatWorldDate } from "../presentation/display-labels.js";
import {
  STEP_WEEKS_FOUR_WEEKS,
  STEP_WEEKS_ONE_WEEK,
  STEP_WEEKS_ONE_YEAR,
  type AcceptedStepWeeks,
  type SimulationSummaryView,
} from "./fetch-simulation.js";

export type SimulationPanelViewProps = {
  status: "loading" | "success" | "error";
  summary: SimulationSummaryView | null;
  uiRevision: number | null;
  isUpdating: boolean;
  sessionState: string | null;
  errorText: string | null;
  mutating: boolean;
  feedback: { kind: "success" | "failure"; text: string } | null;
  onStep: (weeks: AcceptedStepWeeks) => void;
  onReset: () => void;
};

const STEP_BUTTONS: { weeks: AcceptedStepWeeks; label: string }[] = [
  { weeks: STEP_WEEKS_ONE_WEEK, label: "1週進める" },
  { weeks: STEP_WEEKS_FOUR_WEEKS, label: "4週進める" },
  { weeks: STEP_WEEKS_ONE_YEAR, label: "1年進める (48週)" },
];

export function SimulationPanelView(props: SimulationPanelViewProps) {
  const controlsDisabled =
    props.mutating || props.status !== "success" || props.uiRevision === null;
  const worldDate = props.summary?.worldDate ?? null;

  const controls = (
    <div className="dw-advance">
      <h3 className="dw-section-title">世界を進める</h3>
      <div
        className="dw-btnrow"
        data-testid="simulation-controls"
        data-mutating={props.mutating ? "true" : "false"}
      >
        {STEP_BUTTONS.map((button) => (
          <button
            key={button.weeks}
            type="button"
            className={button.weeks === STEP_WEEKS_ONE_WEEK ? "dw-btn-primary" : undefined}
            data-testid={`simulation-step-${String(button.weeks)}`}
            data-weeks={String(button.weeks)}
            disabled={controlsDisabled}
            onClick={() => {
              props.onStep(button.weeks);
            }}
          >
            {button.label}
          </button>
        ))}
        <button
          type="button"
          data-testid="simulation-reset"
          disabled={controlsDisabled}
          onClick={props.onReset}
        >
          初期状態からやり直す
        </button>
      </div>
    </div>
  );

  return (
    <section className="dw-card dw-home-card" data-testid="dev-viewer-simulation">
      <div className="dw-eyebrow">現在の世界</div>
      <h2>世界の現況</h2>

      {props.status === "loading" ? (
        <p className="dw-status" data-testid="simulation-status" data-status="loading">
          読み込み中…
        </p>
      ) : null}
      {props.status === "error" ? (
        <p className="dw-status" data-testid="simulation-status" data-status="error">
          取得に失敗しました{props.errorText !== null ? `: ${props.errorText}` : ""}
        </p>
      ) : null}

      {props.status === "success" && worldDate !== null ? (
        <div className="dw-home-hero" data-testid="simulation-status" data-status="success">
          <div>
            <div className="dw-worldtime">
              <p
                data-testid="simulation-year"
                data-year={String(worldDate.year)}
                data-month={String(worldDate.month)}
                data-week={String(worldDate.week)}
              >
                <strong data-testid="simulation-week">
                  {formatWorldDate(worldDate.year, worldDate.month, worldDate.week)}
                </strong>
              </p>
            </div>
            <div className="dw-stats">
              <div className="dw-stat">
                <small>経過週</small>
                <b data-testid="simulation-elapsed-weeks">
                  {props.summary === null ? "—" : String(props.summary.elapsedWeeks)}
                </b>
              </div>
              <div className="dw-stat">
                <small>登録人物</small>
                <b data-testid="simulation-person-count">
                  {props.summary === null ? "—" : `${String(props.summary.personCount)}人`}
                </b>
              </div>
            </div>
          </div>
          {controls}
        </div>
      ) : (
        controls
      )}

      {props.mutating ? <p data-testid="simulation-mutating">更新処理中…</p> : null}
      {props.feedback !== null ? (
        <section className="dw-section dw-last-operation">
          <h3 className="dw-section-title">直前の操作</h3>
          <p data-testid="simulation-feedback" data-kind={props.feedback.kind}>
            {props.feedback.text}
          </p>
        </section>
      ) : null}

      <DeveloperDetails>
        {worldDate !== null ? (
          <p data-testid="simulation-calendar-code">
            Y{String(worldDate.year)} M{String(worldDate.month)} W{String(worldDate.week)}
          </p>
        ) : null}
        <p data-testid="simulation-session-state" data-session-state={props.sessionState ?? ""}>
          sessionState: {displayNull(props.sessionState)}
        </p>
        <p data-testid="simulation-ui-revision" data-ui-revision={props.uiRevision ?? ""}>
          uiRevision: {props.uiRevision === null ? "unknown" : String(props.uiRevision)}
          {props.isUpdating ? " (isUpdating)" : ""}
        </p>
        <p data-testid="simulation-elapsed-weeks-dev">
          elapsedWeeks: {props.summary === null ? "unknown" : String(props.summary.elapsedWeeks)}
        </p>
        <p data-testid="simulation-world-year-start-month">
          worldYearStartMonth:{" "}
          {props.summary === null ? "unknown" : String(props.summary.worldYearStartMonth)}
        </p>
        <p>simulationId: {props.summary === null ? "unknown" : props.summary.simulationId}</p>
      </DeveloperDetails>
    </section>
  );
}
