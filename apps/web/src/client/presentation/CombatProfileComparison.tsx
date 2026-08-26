/**
 * Compact aligned A/B combat profile comparison (FIX15 presentation).
 * Avoids duplicate names / start endurance·mental·range / redundant VS markers.
 */

import type { PersonDetailView } from "../person-detail/ui005-views.js";
import {
  APTITUDE_KEYS,
  aptitudeLabel,
  displayNull,
  STAT_KEYS,
  statLabel,
} from "./display-labels.js";
import {
  abilityValueClassName,
  abilityValueTier,
  abilityValueToneLabel,
} from "./ability-value-presentation.js";
import { presentTechniqueView } from "./technique-presentation.js";
import type { CombatProfileStatus } from "./CombatProfileSummary.js";

function renderAbilityCompareValue(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return <span className="dw-compare-val">{displayNull(value ?? null)}</span>;
  }
  const tier = abilityValueTier(value);
  const tone = abilityValueToneLabel(tier);
  return (
    <span className={`dw-compare-val ${abilityValueClassName(value)}`} data-ability-tier={tier}>
      <b>{String(value)}</b>
      {tone !== null ? <small className="dw-ability-tone">{tone}</small> : null}
    </span>
  );
}

export type CombatProfileComparisonProps = {
  testId: string;
  labelA: string;
  labelB: string;
  statusA: CombatProfileStatus;
  statusB: CombatProfileStatus;
  detailA: PersonDetailView | null;
  detailB: PersonDetailView | null;
  errorA?: string | null;
  errorB?: string | null;
};

function rankText(rank: string | null | undefined): string {
  if (rank === null || rank === undefined || rank === "") {
    return "段位なし";
  }
  return rank;
}

function sideStatus(
  status: CombatProfileStatus,
  detail: PersonDetailView | null,
  errorText: string | null | undefined,
): string {
  if (status === "loading") return "読み込み中…";
  if (status === "error" || (status === "success" && detail === null)) {
    return errorText && errorText.length > 0 ? `取得失敗: ${errorText}` : "取得失敗";
  }
  if (status === "idle") return "—";
  return "";
}

export function CombatProfileComparison(props: CombatProfileComparisonProps) {
  const { testId } = props;
  const ready =
    props.statusA === "success" &&
    props.statusB === "success" &&
    props.detailA !== null &&
    props.detailB !== null;

  if (props.statusA === "idle" && props.statusB === "idle") {
    return null;
  }

  if (!ready) {
    return (
      <div className="dw-profile-compare" data-testid={testId} data-status="pending">
        <h4 className="dw-compare-title">戦闘プロファイル比較</h4>
        <p className="dw-compare-pending dw-sub" data-testid={`${testId}-pending`}>
          <span className="dw-compare-spinner" aria-hidden="true" />
          {sideStatus(props.statusA, props.detailA, props.errorA)}
          {" / "}
          {sideStatus(props.statusB, props.detailB, props.errorB)}
        </p>
      </div>
    );
  }

  const a = props.detailA!;
  const b = props.detailB!;
  const techA = a.techniques.map((t) => presentTechniqueView(t));
  const techB = b.techniques.map((t) => presentTechniqueView(t));

  return (
    <div className="dw-profile-compare" data-testid={testId} data-status="success">
      <div className="dw-compare-head">
        <h4 className="dw-compare-title">戦闘プロファイル比較</h4>
        <p className="dw-compare-vs" aria-hidden="true">
          <span className="dw-compare-vs-side" data-side="a">
            {props.labelA}
          </span>
          <span className="dw-compare-vs-mark">VS</span>
          <span className="dw-compare-vs-side" data-side="b">
            {props.labelB}
          </span>
        </p>
      </div>
      <div className="dw-compare-table-wrap">
        <table className="dw-compare-table" data-testid={`${testId}-table`}>
          <thead>
            <tr>
              <th scope="col">項目</th>
              <th scope="col" data-side="a">
                {props.labelA}
              </th>
              <th scope="col" data-side="b">
                {props.labelB}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="dw-compare-section-row">
              <th colSpan={3} scope="colgroup">
                段位
              </th>
            </tr>
            <tr className="dw-compare-rank-row" data-row="rank">
              <th scope="row">現在</th>
              <td data-side="a" data-testid={`${testId}-a-rank`}>
                <span className="dw-compare-rank-badge">{rankText(a.currentRank)}</span>
              </td>
              <td data-side="b" data-testid={`${testId}-b-rank`}>
                <span className="dw-compare-rank-badge">{rankText(b.currentRank)}</span>
              </td>
            </tr>
            <tr className="dw-compare-section-row">
              <th colSpan={3} scope="colgroup">
                適性
              </th>
            </tr>
            {APTITUDE_KEYS.map((key) => (
              <tr key={`apt-${key}`} data-row={`aptitude-${key}`}>
                <th scope="row">{aptitudeLabel(key)}</th>
                <td>{renderAbilityCompareValue(a.aptitudes[key] ?? null)}</td>
                <td>{renderAbilityCompareValue(b.aptitudes[key] ?? null)}</td>
              </tr>
            ))}
            <tr className="dw-compare-section-row">
              <th colSpan={3} scope="colgroup">
                能力
              </th>
            </tr>
            {STAT_KEYS.map((key) => (
              <tr key={`stat-${key}`} data-row={`stat-${key}`}>
                <th scope="row">{statLabel(key)}</th>
                <td>{renderAbilityCompareValue(a.stats[key] ?? null)}</td>
                <td>{renderAbilityCompareValue(b.stats[key] ?? null)}</td>
              </tr>
            ))}
            <tr className="dw-compare-section-row">
              <th colSpan={3} scope="colgroup">
                習得技
              </th>
            </tr>
            <tr data-row="techniques">
              <th scope="row">一覧</th>
              <td data-testid={`${testId}-a-techniques`} className="dw-compare-tech">
                {techA.length === 0 ? "なし" : techA.map((t) => t.primaryLabel).join("、")}
              </td>
              <td data-testid={`${testId}-b-techniques`} className="dw-compare-tech">
                {techB.length === 0 ? "なし" : techB.map((t) => t.primaryLabel).join("、")}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
