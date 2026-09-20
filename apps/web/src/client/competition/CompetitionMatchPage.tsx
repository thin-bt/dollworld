import { useCallback, useEffect, useState } from "react";
import { loadCompetitionMatch } from "./fetch-ui009.js";
import type { CompetitionMatchDetailView } from "./ui009-views.js";
import type { FetchLike } from "../session-client.js";
import { CompetitionMatchDetailedLog } from "./CompetitionMatchDetailedLog.js";

export type CompetitionMatchPageProps = {
  matchId: string;
  fetchImpl?: FetchLike;
};

export function CompetitionMatchPage(props: CompetitionMatchPageProps) {
  const [detail, setDetail] = useState<CompetitionMatchDetailView | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    const fetchOpts = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};
    const result = await loadCompetitionMatch(props.matchId, fetchOpts);
    if (result.kind === "failure") {
      setStatus("error");
      setError(result.message || "試合詳細の読み込みに失敗しました。");
      return;
    }
    setDetail(result.data);
    setStatus("ready");
  }, [props.fetchImpl, props.matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (status === "loading") {
    return (
      <p className="panel-status" data-testid="competition-match-status" data-status="loading">
        試合詳細を読み込み中…
      </p>
    );
  }
  if (status === "error" || detail === null) {
    return (
      <div className="panel-status" data-testid="competition-match-status" data-status="error">
        <p>{error ?? "試合が見つかりません。"}</p>
        <p>
          <a href="/competition">大会画面に戻る</a>
        </p>
      </div>
    );
  }

  return (
    <article className="competition-match-page" data-testid="competition-match-page">
      <h2 className="competition-section-heading">大会試合詳細</h2>
      <p className="competition-detail-meta" data-testid="competition-match-id">
        試合ID: {detail.matchId}
      </p>
      <table className="data-table">
        <tbody>
          <tr>
            <th>対戦</th>
            <td>
              <a href={`/people/${encodeURIComponent(detail.participantAId)}`}>
                {detail.participantADisplayName}
              </a>
              {" vs "}
              <a href={`/people/${encodeURIComponent(detail.participantBId)}`}>
                {detail.participantBDisplayName}
              </a>
            </td>
          </tr>
          <tr>
            <th>結果</th>
            <td>{detail.resultKind}</td>
          </tr>
          <tr>
            <th>勝者</th>
            <td>
              {detail.winnerDisplayName === null ? (
                "—"
              ) : detail.winnerPersonId === null ? (
                detail.winnerDisplayName
              ) : (
                <a href={`/people/${encodeURIComponent(detail.winnerPersonId)}`}>
                  {detail.winnerDisplayName}
                </a>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      <CompetitionMatchDetailedLog detail={detail} />
      <p>
        <a href="/competition">大会画面に戻る</a>
      </p>
    </article>
  );
}
