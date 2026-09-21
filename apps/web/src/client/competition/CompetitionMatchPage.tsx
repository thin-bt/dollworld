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
    <article className="competition-match-page dw-card" data-testid="competition-match-page">
      <p>
        <a href="/competition" data-testid="competition-match-back">
          ← 大会画面へ
        </a>
      </p>
      <h2 className="competition-section-heading">大会試合結果 / 詳細ログ</h2>
      <p className="competition-detail-meta" data-testid="competition-match-id">
        試合ID: {detail.matchId}
        {detail.tournamentId !== null ? ` · 大会: ${detail.tournamentId}` : ""}
      </p>
      <CompetitionMatchDetailedLog detail={detail} />
    </article>
  );
}
