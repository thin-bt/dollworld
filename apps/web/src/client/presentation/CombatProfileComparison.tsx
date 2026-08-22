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
import { presentTechniqueView } from "./technique-presentation.js";
import type { CombatProfileStatus } from "./CombatProfileSummary.js";

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
        <p className="dw-sub" data-testid={`${testId}-pending`}>
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
      <table className="dw-compare-table" data-testid={`${testId}-table`}>
        <thead>
          <tr>
            <th scope="col">項目</th>
            <th scope="col">{props.labelA}</th>
            <th scope="col">{props.labelB}</th>
          </tr>
        </thead>
        <tbody>
          <tr data-row="rank">
            <th scope="row">段位</th>
            <td data-testid={`${testId}-a-rank`}>{rankText(a.currentRank)}</td>
            <td data-testid={`${testId}-b-rank`}>{rankText(b.currentRank)}</td>
          </tr>
          {APTITUDE_KEYS.map((key) => (
            <tr key={`apt-${key}`} data-row={`aptitude-${key}`}>
              <th scope="row">{aptitudeLabel(key)}</th>
              <td>{displayNull(a.aptitudes[key] ?? null)}</td>
              <td>{displayNull(b.aptitudes[key] ?? null)}</td>
            </tr>
          ))}
          {STAT_KEYS.map((key) => (
            <tr key={`stat-${key}`} data-row={`stat-${key}`}>
              <th scope="row">{statLabel(key)}</th>
              <td>{displayNull(a.stats[key] ?? null)}</td>
              <td>{displayNull(b.stats[key] ?? null)}</td>
            </tr>
          ))}
          <tr data-row="techniques">
            <th scope="row">習得技</th>
            <td data-testid={`${testId}-a-techniques`}>
              {techA.length === 0 ? "なし" : techA.map((t) => t.primaryLabel).join("、")}
            </td>
            <td data-testid={`${testId}-b-techniques`}>
              {techB.length === 0 ? "なし" : techB.map((t) => t.primaryLabel).join("、")}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
