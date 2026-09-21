import { useCallback, useEffect, useState } from "react";
import type { FetchLike } from "../session-client.js";
import { AnnualRankingTable } from "../competition/AnnualRankingTable.js";
import { loadCompetitionState } from "../competition/fetch-ui009.js";
import type { CompetitionProgressView } from "../competition/ui009-views.js";

export type RankingPageProps = {
  fetchImpl?: FetchLike;
};

export function RankingPage(props: RankingPageProps) {
  const [view, setView] = useState<CompetitionProgressView | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rankingViewYear, setRankingViewYear] = useState<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoadStatus((current) => (current === "ready" ? "ready" : "loading"));
    setLoadError(null);
    const fetchOpts = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};
    const loadOpts = { ...fetchOpts };
    if (rankingViewYear !== undefined) {
      Object.assign(loadOpts, { rankingYear: rankingViewYear });
    }
    const page = await loadCompetitionState(loadOpts);
    if (page.kind === "failure") {
      setLoadStatus("error");
      setLoadError(page.message || "ランキング情報の読み込みに失敗しました。");
      return;
    }
    setView(page.data);
    setLoadStatus("ready");
  }, [props.fetchImpl, rankingViewYear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loadStatus === "loading") {
    return (
      <section className="panel" data-testid="ranking-page">
        <p className="panel-status" data-testid="ranking-load-status" data-status="loading">
          ランキングを読み込み中…
        </p>
      </section>
    );
  }

  if (loadStatus === "error" || view === null) {
    return (
      <section className="panel" data-testid="ranking-page">
        <header>
          <h2 id="ranking-heading">ランキング</h2>
        </header>
        <div className="panel-status panel-error" data-testid="ranking-load-status" data-status="error">
          <p>{loadError ?? "ランキングを読み込めませんでした。"}</p>
          <p>
            <button type="button" onClick={() => void refresh()}>
              再読み込み
            </button>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="ranking-heading" data-testid="ranking-page">
      <header>
        <h2 id="ranking-heading">ランキング</h2>
        <p className="panel-lead">
          年間獲得金順位と公式戦通算を確認できます。大会の詳細は「大会」画面からも参照できます。
        </p>
      </header>
      <AnnualRankingTable
        view={view}
        testIdPrefix="ranking"
        onRankingYearChange={(year) => setRankingViewYear(year)}
      />
      <p className="competition-detail-back">
        <a href="/competition">大会画面を開く</a>
      </p>
    </section>
  );
}
