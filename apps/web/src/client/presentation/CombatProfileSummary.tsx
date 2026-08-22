/**
 * Compact combat profile from PersonDetail + optional battle-start resources.
 * Presentation-only; shared by Mock Battle selection and battle detail log.
 */

import type { PersonDetailView } from "../person-detail/ui005-views.js";
import {
  APTITUDE_KEYS,
  aptitudeLabel,
  displayNull,
  STAT_KEYS,
  statLabel,
} from "../presentation/display-labels.js";
import { formatResourcePair } from "../presentation/battle-state-display.js";
import { presentTechniqueView } from "../presentation/technique-presentation.js";

export type CombatProfileStatus = "idle" | "loading" | "success" | "error";

export type CombatProfileSummaryProps = {
  testId: string;
  status: CombatProfileStatus;
  detail: PersonDetailView | null;
  errorText: string | null;
  /** Battle-start durability/mental when known from finalState / log befores. */
  initialDurability?: number | null;
  initialMental?: number | null;
  maxDurability?: number | null;
  maxMental?: number | null;
  startRangeLabel?: string | null;
};

function rankLabel(currentRank: string | null): string {
  if (currentRank === null || currentRank === "") {
    return "段位なし";
  }
  return currentRank;
}

export function CombatProfileSummary(props: CombatProfileSummaryProps) {
  const testId = props.testId;

  if (props.status === "idle") {
    return null;
  }

  if (props.status === "loading") {
    return (
      <div className="dw-participant-summary" data-testid={testId} data-status="loading">
        <p className="dw-sub">比較情報を読み込み中…</p>
      </div>
    );
  }

  if (props.status === "error" || props.detail === null) {
    return (
      <div className="dw-participant-summary" data-testid={testId} data-status="error">
        <p className="dw-sub">
          比較情報を取得できませんでした
          {props.errorText ? `: ${props.errorText}` : ""}
        </p>
      </div>
    );
  }

  const detail = props.detail;
  const techniques = detail.techniques.map((tech) => presentTechniqueView(tech));
  const hasStartResources =
    props.initialDurability !== undefined ||
    props.initialMental !== undefined ||
    props.maxDurability !== undefined ||
    props.maxMental !== undefined ||
    (props.startRangeLabel !== undefined &&
      props.startRangeLabel !== null &&
      props.startRangeLabel.length > 0);

  return (
    <div className="dw-participant-summary" data-testid={testId} data-status="success">
      <dl className="dw-dl dw-participant-summary-rank">
        <div>
          <dt>段位</dt>
          <dd data-testid={`${testId}-rank`}>{rankLabel(detail.currentRank)}</dd>
        </div>
        {hasStartResources ? (
          <>
            {props.startRangeLabel !== undefined &&
            props.startRangeLabel !== null &&
            props.startRangeLabel.length > 0 ? (
              <div>
                <dt>開始間合い</dt>
                <dd data-testid={`${testId}-start-range`}>{props.startRangeLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt>開始耐久</dt>
              <dd data-testid={`${testId}-start-durability`}>
                {formatResourcePair(
                  props.initialDurability ?? props.maxDurability ?? null,
                  props.maxDurability ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt>開始精神</dt>
              <dd data-testid={`${testId}-start-mental`}>
                {formatResourcePair(props.initialMental ?? null, props.maxMental ?? null)}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <h5>三適性</h5>
      <ul className="dw-summary-chips" data-testid={`${testId}-aptitudes`}>
        {APTITUDE_KEYS.map((key) => (
          <li key={key} data-aptitude={key}>
            <span>{aptitudeLabel(key)}</span>
            <strong>{displayNull(detail.aptitudes[key] ?? null)}</strong>
          </li>
        ))}
      </ul>

      <h5>六能力</h5>
      <ul className="dw-summary-chips" data-testid={`${testId}-stats`}>
        {STAT_KEYS.map((key) => (
          <li key={key} data-stat={key}>
            <span>{statLabel(key)}</span>
            <strong>{displayNull(detail.stats[key] ?? null)}</strong>
          </li>
        ))}
      </ul>

      <h5>習得技</h5>
      <p className="dw-sub" data-testid={`${testId}-technique-count`}>
        習得数 {String(techniques.length)}
      </p>
      {techniques.length === 0 ? (
        <p className="dw-sub" data-empty="true" data-testid={`${testId}-techniques-empty`}>
          習得した技はまだありません
        </p>
      ) : (
        <ul className="dw-technique-summary-list" data-testid={`${testId}-techniques`}>
          {techniques.map((tech) => (
            <li key={tech.techniqueId.length > 0 ? tech.techniqueId : tech.primaryLabel}>
              <strong data-testid={`${testId}-technique-label`}>{tech.primaryLabel}</strong>
              {tech.categoryLabel !== null ? (
                <span className="dw-badge"> {tech.categoryLabel}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
