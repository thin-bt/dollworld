import { useCallback, useEffect, useMemo, useState } from "react";
import { loadUiSession } from "../session-client.js";
import type { FetchLike } from "../session-client.js";
import { AnnualRankingTable } from "./AnnualRankingTable.js";
import { CompetitionScheduleMatrix } from "./competition-schedule-matrix.js";
import { loadCompetitionState, postCompetitionStep } from "./fetch-ui009.js";
import {
  APTITUDE_KEYS,
  aptitudeLabel,
  STAT_KEYS,
  statLabel,
} from "../presentation/display-labels.js";
import type { CompetitionProgressView, CompetitionScheduleEntry } from "./ui009-views.js";

export type CompetitionPageProps = {
  fetchImpl?: FetchLike;
};

function phaseLabel(phase: CompetitionProgressView["lifecyclePhase"]): string {
  if (phase === "idle") {
    return "未開始";
  }
  if (phase === "awaiting_match") {
    return "試合待ち";
  }
  if (phase === "round_robin_complete") {
    return "総当たり戦終了";
  }
  return "終了";
}

function defaultSelectedKey(view: CompetitionProgressView): string | null {
  const overview = view.scheduleOverview;
  if (overview.activeSelectionKey !== null) {
    return overview.activeSelectionKey;
  }
  if (overview.playableSelectionKey !== null) {
    return overview.playableSelectionKey;
  }
  return overview.entries[0]?.selectionKey ?? null;
}

function findEntry(
  view: CompetitionProgressView,
  selectionKey: string | null,
): CompetitionScheduleEntry | null {
  if (selectionKey === null) {
    return null;
  }
  return view.scheduleOverview.entries.find((entry) => entry.selectionKey === selectionKey) ?? null;
}

function TournamentDetailPanel(props: {
  view: CompetitionProgressView;
  entry: CompetitionScheduleEntry | null;
  detailPane: "overview" | "participants";
  onDetailPane: (pane: "overview" | "participants") => void;
  onBackToSchedule: () => void;
  onRankingYearChange?: (worldYear: number) => void;
}) {
  const { view, entry, detailPane, onDetailPane, onBackToSchedule, onRankingYearChange } = props;
  const showProgress =
    entry !== null &&
    (entry.isActiveCompetition || entry.isPlayable) &&
    view.lifecyclePhase !== "idle";
  const finished = view.lifecyclePhase === "finished" && entry?.isActiveCompetition === true;
  const roundRobinComplete =
    view.lifecyclePhase === "round_robin_complete" && entry?.isActiveCompetition === true;
  const canShowParticipants =
    entry !== null &&
    entry.participantLinks.length > 0 &&
    (entry.isPlayable || entry.isActiveCompetition);

  if (entry === null) {
    return (
      <aside className="competition-detail" data-testid="competition-detail-empty">
        <p>日程表から大会を選択してください。</p>
      </aside>
    );
  }

  return (
    <aside className="competition-detail" aria-label="大会詳細" data-testid="competition-detail">
      <div className="competition-detail-tabs" role="tablist" aria-label="大会詳細タブ">
        <button
          type="button"
          role="tab"
          aria-selected={detailPane === "overview"}
          data-testid="competition-detail-tab-overview"
          onClick={() => onDetailPane("overview")}
        >
          大会詳細
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={detailPane === "participants"}
          disabled={!canShowParticipants}
          data-testid="competition-detail-tab-participants"
          onClick={() => onDetailPane("participants")}
        >
          参加者
        </button>
      </div>

      {detailPane === "overview" ? (
        <div className="competition-detail-body" data-testid="competition-detail-overview">
          <h3
            className="competition-section-heading"
            data-testid="competition-tournament-display-name"
          >
            {entry.tournamentDisplayName}
          </h3>
          <p className="competition-detail-meta">
            {entry.timingLabel} · {entry.rankOrCategoryLabel} · {entry.kindLabel} ·{" "}
            {entry.lifecycleStateLabel}
            {entry.participantCountLabel !== null ? ` · 参加 ${entry.participantCountLabel}` : ""}
          </p>
          {entry.isPlayable && view.lifecyclePhase === "idle" ? (
            <p className="competition-detail-hint">
              この大会が次に進行できます。下のボタンで開始し、1試合を進行します。
            </p>
          ) : null}
          {!entry.isPlayable && !entry.isActiveCompetition ? (
            <p className="competition-detail-hint">
              日程と種別のみ表示しています。参加者確定前の大会は詳細データがありません。
            </p>
          ) : null}

          {showProgress && view.tournamentKindLabel !== null ? (
            <p className="competition-meta">
              {view.tournamentKindLabel}
              {view.targetRankLabel !== null ? ` · ${view.targetRankLabel}` : ""}
              {view.participantDisplayNames.length > 0
                ? ` · 参加者 ${view.participantDisplayNames.join(" · ")}`
                : ""}
              {view.roundRobinProgress !== null
                ? ` · ${view.roundRobinProgress.matchesCompleted}/${view.roundRobinProgress.matchesTotal}試合`
                : view.matchesCompleted > 0
                  ? ` · 消化試合数 ${view.matchesCompleted}`
                  : ""}
            </p>
          ) : null}

          {roundRobinComplete ? (
            <div className="competition-result-hero" data-testid="competition-round-robin-complete">
              <p className="competition-result-hero-kicker">総当たり戦</p>
              <p className="competition-result-hero-title">全試合終了</p>
              <p className="competition-detail-hint">順位・優勝者はまだ確定していません。</p>
            </div>
          ) : null}

          {finished && view.championDisplayName !== null ? (
            <div className="competition-result-hero" data-testid="competition-champion">
              <p className="competition-result-hero-kicker">
                {view.tournamentDisplayName ?? entry.tournamentDisplayName} — 大会結果
              </p>
              <p className="competition-result-hero-title">優勝</p>
              <p className="competition-result-hero-name">{view.championDisplayName}</p>
            </div>
          ) : null}

          {showProgress && view.lastMatchPlayerLabels !== null ? (
            <section
              className="competition-match-result"
              aria-labelledby="competition-last-match"
              data-testid="competition-match-result"
            >
              <h4 id="competition-last-match" className="competition-section-heading">
                最新試合
              </h4>
              <p>
                勝者 <strong>{view.lastMatchPlayerLabels.winnerDisplayName}</strong>
                {" · "}
                敗者 {view.lastMatchPlayerLabels.loserDisplayName}
              </p>
            </section>
          ) : null}

          {showProgress && view.roundRobinProgress !== null ? (
            <section
              className="competition-ranking"
              aria-labelledby="competition-round-robin-heading"
            >
              <h4 id="competition-round-robin-heading" className="competition-section-heading">
                総当たり戦績
              </h4>
              <table className="data-table" data-testid="competition-round-robin-matrix">
                <thead>
                  <tr>
                    <th>選手</th>
                    <th>勝</th>
                    <th>敗</th>
                    <th>試合</th>
                  </tr>
                </thead>
                <tbody>
                  {view.roundRobinProgress.matrix.map((row) => (
                    <tr key={row.personId}>
                      <td>
                        <a href={`/people/${encodeURIComponent(row.personId)}`}>
                          {row.displayName}
                        </a>
                      </td>
                      <td>{row.wins}</td>
                      <td>{row.losses}</td>
                      <td>{row.played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="competition-section-heading">対戦マトリクス</h4>
              <table className="data-table" data-testid="competition-round-robin-pair-matrix">
                <thead>
                  <tr>
                    <th>選手</th>
                    {view.roundRobinProgress.matrix.map((col) => (
                      <th key={col.personId}>{col.displayName}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.roundRobinProgress.matrix.map((row) => (
                    <tr key={row.personId}>
                      <th scope="row">{row.displayName}</th>
                      {row.cells.map((cell) => (
                        <td key={cell.opponentPersonId}>
                          {cell.outcome === "pending" ? "—" : cell.outcome === "win" ? "勝" : "敗"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              <h4 className="competition-section-heading">対戦履歴</h4>
              <table className="data-table" data-testid="competition-round-robin-history">
                <thead>
                  <tr>
                    <th>試合</th>
                    <th>対戦</th>
                    <th>結果</th>
                  </tr>
                </thead>
                <tbody>
                  {view.roundRobinProgress.history.map((row) => {
                    const winnerName =
                      row.winnerPersonId === row.participantAId
                        ? row.participantADisplayName
                        : row.winnerPersonId === row.participantBId
                          ? row.participantBDisplayName
                          : null;
                    return (
                      <tr key={row.pairIndex}>
                        <td>{row.pairIndex + 1}</td>
                        <td>
                          {row.participantADisplayName} vs {row.participantBDisplayName}
                        </td>
                        <td>
                          {winnerName === null ? "未消化" : `${winnerName} 勝利`}
                          {row.matchId !== null ? (
                            <>
                              {" · "}
                              <a
                                href={`/competition/matches/${encodeURIComponent(row.matchId)}`}
                                data-testid="competition-history-match-link"
                              >
                                試合詳細
                              </a>
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : null}

          {showProgress && (view.knockoutBracket !== null || finished) ? (
            <section
              className="competition-knockout"
              aria-labelledby="competition-knockout-heading"
              data-testid="competition-knockout-bracket"
            >
              <h4 id="competition-knockout-heading" className="competition-section-heading">
                トーナメント表
              </h4>
              {view.knockoutBracket === null ? (
                <p className="competition-detail-hint">
                  本大会は総当たり形式のためトーナメント表はありません。
                </p>
              ) : null}
              {view.knockoutBracket !== null ? (
                <p className="competition-detail-meta">
                  {view.knockoutBracket.matchesCompleted}/{view.knockoutBracket.matchesTotal}{" "}
                  試合消化
                </p>
              ) : null}
              {view.knockoutBracket?.rounds.map((round) => (
                <div key={round.roundIndex} className="competition-knockout-round">
                  <h5>{round.label}</h5>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>対戦</th>
                        <th>状態</th>
                        <th>詳細</th>
                      </tr>
                    </thead>
                    <tbody>
                      {round.matches.map((match) => (
                        <tr key={match.slotId}>
                          <td>
                            {match.participantADisplayName} vs {match.participantBDisplayName}
                          </td>
                          <td>
                            {match.status === "completed"
                              ? "終了"
                              : match.status === "ready"
                                ? "未消化"
                                : "待機"}
                          </td>
                          <td>
                            {match.matchId !== null ? (
                              <a href={`/competition/matches/${encodeURIComponent(match.matchId)}`}>
                                試合詳細
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )) ?? null}
            </section>
          ) : null}

          {showProgress ? (
            <AnnualRankingTable
              view={view}
              testIdPrefix="competition"
              {...(onRankingYearChange !== undefined ? { onRankingYearChange } : {})}
            />
          ) : null}

          {view.wireframeObservation.tournamentSeriesHistory.length > 0 ? (
            <section
              className="competition-series-history"
              data-testid="competition-series-history"
              aria-labelledby="competition-series-history-heading"
            >
              <h4 id="competition-series-history-heading" className="competition-section-heading">
                大会シリーズ履歴 / 歴代王者
              </h4>
              {view.wireframeObservation.tournamentSeriesHistory.map((group) => (
                <div key={group.seriesKey} className="competition-series-group">
                  <h5>{group.seriesDisplayLabel}</h5>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>開催</th>
                        <th>優勝</th>
                        <th>参加</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.editions.map((edition) => (
                        <tr key={edition.tournamentId}>
                          <td>
                            {edition.worldYear}年 {edition.timingLabel}
                          </td>
                          <td>
                            <a href={`/people/${encodeURIComponent(edition.winnerPersonId)}`}>
                              {edition.winnerDisplayName}
                            </a>
                          </td>
                          <td>{edition.participantCount}名</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </section>
          ) : null}

          {finished ? (
            <section
              data-testid="competition-promotion-results"
              aria-labelledby="competition-promotion-heading"
            >
              <h4 id="competition-promotion-heading" className="competition-section-heading">
                昇格結果
              </h4>
              {view.wireframeObservation.promotionResults.length === 0 ? (
                <p className="competition-detail-hint">昇格大会の確定結果はまだありません。</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>選手</th>
                      <th>昇格</th>
                      <th>大会</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.wireframeObservation.promotionResults.map((row) => (
                      <tr key={row.promotionResultHash}>
                        <td>
                          <a href={`/people/${encodeURIComponent(row.personId)}`}>
                            {row.personDisplayName}
                          </a>
                        </td>
                        <td>
                          {row.previousRank} → {row.newRank}
                        </td>
                        <td>{row.sourceTournamentId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ) : null}

          {finished ? (
            <section
              data-testid="competition-person-rank-history"
              aria-labelledby="competition-rank-history-heading"
            >
              <h4 id="competition-rank-history-heading" className="competition-section-heading">
                人物ランク履歴
              </h4>
              {view.wireframeObservation.personRankHistory.length === 0 ? (
                <p className="competition-detail-hint">ランク変動履歴はまだありません。</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>選手</th>
                      <th>変動</th>
                      <th>時期</th>
                      <th>由来大会</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.wireframeObservation.personRankHistory.map((row, index) => (
                      <tr key={`${row.personId}-${index}`}>
                        <td>
                          <a href={`/people/${encodeURIComponent(row.personId)}`}>
                            {row.personDisplayName}
                          </a>
                        </td>
                        <td>
                          {row.previousRank} → {row.newRank}
                        </td>
                        <td>
                          {row.worldYear}年 {row.timingLabel}
                        </td>
                        <td>{row.sourceTournamentId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="competition-detail-body" data-testid="competition-participants">
          {canShowParticipants ? (
            <table
              className="data-table competition-participant-table"
              data-testid="competition-participant-comparison"
            >
              <thead>
                <tr>
                  <th>選手</th>
                  <th>ランク</th>
                  <th>年齢</th>
                  <th>公式戦</th>
                  {STAT_KEYS.map((key) => (
                    <th key={key}>{statLabel(key)}</th>
                  ))}
                  {APTITUDE_KEYS.map((key) => (
                    <th key={key}>{aptitudeLabel(key)}</th>
                  ))}
                  <th>詳細</th>
                </tr>
              </thead>
              <tbody>
                {entry.participantLinks.map((link) => (
                  <tr key={link.personId} data-testid={`competition-participant-row-${link.personId}`}>
                    <td>{link.displayName}</td>
                    <td>{link.currentRankLabel ?? "—"}</td>
                    <td>{link.ageLabel ?? "—"}</td>
                    <td>{link.officialRecordLabel ?? "—"}</td>
                    {STAT_KEYS.map((key) => (
                      <td
                        key={key}
                        data-testid={`competition-participant-stat-${key}-${link.personId}`}
                      >
                        {link.stats?.[key] ?? "—"}
                      </td>
                    ))}
                    {APTITUDE_KEYS.map((key) => (
                      <td
                        key={key}
                        data-testid={`competition-participant-aptitude-${key}-${link.personId}`}
                      >
                        {link.aptitudes?.[key] ?? "—"}
                      </td>
                    ))}
                    <td>
                      <a href={`/people/${encodeURIComponent(link.personId)}`}>人物詳細</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="competition-schedule-empty">参加者情報はまだありません。</p>
          )}
        </div>
      )}

      <p className="competition-detail-back">
        <button type="button" onClick={onBackToSchedule}>
          日程表に戻る
        </button>
      </p>
    </aside>
  );
}

export function CompetitionPage(props: CompetitionPageProps) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [uiRevision, setUiRevision] = useState(0);
  const [view, setView] = useState<CompetitionProgressView | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailPane, setDetailPane] = useState<"overview" | "participants">("overview");
  const [scheduleFocus, setScheduleFocus] = useState(true);
  const [scheduleViewYear, setScheduleViewYear] = useState<number | undefined>(undefined);
  const [rankingViewYear, setRankingViewYear] = useState<number | undefined>(undefined);

  const refresh = useCallback(async () => {
    setLoadStatus((current) => (current === "ready" ? "ready" : "loading"));
    setLoadError(null);
    const fetchOpts = props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {};
    const session = await loadUiSession(fetchOpts);
    if (session.kind !== "success") {
      setLoadStatus("error");
      setLoadError(
        session.message === "transport_error"
          ? "通信に失敗しました。ネットワークを確認して再試行してください。"
          : "セッションを取得できませんでした。",
      );
      return;
    }
    setCsrfToken(session.csrfToken);
    setUiRevision(session.uiRevision);
    const loadOpts = { ...fetchOpts };
    if (scheduleViewYear !== undefined) {
      Object.assign(loadOpts, { scheduleYear: scheduleViewYear });
    }
    if (rankingViewYear !== undefined) {
      Object.assign(loadOpts, { rankingYear: rankingViewYear });
    }
    const page = await loadCompetitionState(loadOpts);
    if (page.kind === "failure") {
      setLoadStatus("error");
      setLoadError(page.message || "大会情報の読み込みに失敗しました。");
      return;
    }
    setView(page.data);
    setSelectedKey((prev) => prev ?? defaultSelectedKey(page.data));
    setUiRevision(page.uiRevision);
    setLoadStatus("ready");
  }, [props.fetchImpl, rankingViewYear, scheduleViewYear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (view === null) {
      return;
    }
    setSelectedKey((prev) => {
      if (prev !== null && view.scheduleOverview.entries.some((e) => e.selectionKey === prev)) {
        return prev;
      }
      return defaultSelectedKey(view);
    });
  }, [view]);

  const selectedEntry = useMemo(
    () => (view === null ? null : findEntry(view, selectedKey)),
    [view, selectedKey],
  );

  const onStep = useCallback(async () => {
    if (csrfToken === null || actionPending) {
      return;
    }
    setActionPending(true);
    setActionError(null);
    const result = await postCompetitionStep({
      csrfToken,
      expectedUiRevision: uiRevision,
      requestId: crypto.randomUUID(),
      ...(props.fetchImpl !== undefined ? { fetchImpl: props.fetchImpl } : {}),
    });
    if (result.kind === "failure") {
      setActionPending(false);
      setActionError(
        result.message || "試合の進行に失敗しました。しばらくしてから再試行してください。",
      );
      return;
    }
    setView(result.data.competition);
    setUiRevision(result.uiRevision);
    setActionPending(false);
    setScheduleFocus(false);
    if (result.data.competition.scheduleOverview.activeSelectionKey !== null) {
      setSelectedKey(result.data.competition.scheduleOverview.activeSelectionKey);
    }
  }, [actionPending, csrfToken, props.fetchImpl, uiRevision]);

  const canStep =
    view !== null &&
    selectedEntry !== null &&
    ((view.lifecyclePhase === "idle" && selectedEntry.isPlayable) ||
      (view.lifecyclePhase === "awaiting_match" && selectedEntry.isActiveCompetition)) &&
    !actionPending;

  if (loadStatus === "loading") {
    return (
      <p className="panel-status" data-testid="competition-load-status" data-status="loading">
        大会情報を読み込み中…
      </p>
    );
  }
  if (loadStatus === "error" || view === null) {
    return (
      <div
        className="panel-status panel-error"
        data-testid="competition-load-status"
        data-status="error"
      >
        <p>{loadError ?? "大会情報を読み込めませんでした。"}</p>
        <p>
          <button type="button" onClick={() => void refresh()}>
            再読み込み
          </button>
        </p>
      </div>
    );
  }

  const closed =
    view.lifecyclePhase === "finished" || view.lifecyclePhase === "round_robin_complete";
  const primaryCtaLabel =
    view.lifecyclePhase === "idle" ? "大会を開始して1試合進める" : "次の試合を進める";

  return (
    <section className="panel competition-panel" aria-labelledby="competition-heading">
      <header className="competition-header">
        <h2 id="competition-heading">大会</h2>
        <p className="competition-phase">
          進行状態: <strong>{phaseLabel(view.lifecyclePhase)}</strong>
        </p>
      </header>

      <div className="competition-layout">
        {scheduleFocus ? (
          <CompetitionScheduleMatrix
            overview={view.scheduleOverview}
            selectedKey={selectedKey}
            onSelect={(key) => {
              setSelectedKey(key);
              setDetailPane("overview");
            }}
            onViewYear={(year) => {
              setScheduleViewYear(year);
            }}
          />
        ) : null}

        <TournamentDetailPanel
          view={view}
          entry={selectedEntry}
          detailPane={detailPane}
          onDetailPane={setDetailPane}
          onBackToSchedule={() => setScheduleFocus(true)}
          onRankingYearChange={(year) => setRankingViewYear(year)}
        />
      </div>

      <footer className="competition-actions">
        {!closed ? (
          <p
            className="competition-auto-progression-note"
            data-testid="competition-auto-progression-note"
          >
            通常プレイでは「シミュレーション」画面で週を進めると、予定週の大会が自動で進行・確定します。
            年間順位は <a href="/ranking">ランキング</a> 画面でも確認できます。
          </p>
        ) : null}
        {closed ? (
          <div className="competition-finished-actions" data-testid="competition-finished">
            <p className="competition-finished-message">
              {view.lifecyclePhase === "round_robin_complete"
                ? "総当たり戦の全試合を消化しました。"
                : "この大会は終了しました。"}
            </p>
            <p>
              <button
                type="button"
                className="competition-next-link"
                onClick={() => setScheduleFocus(true)}
              >
                日程表を見る
              </button>
              {" · "}
              <a className="competition-next-link" href="/">
                シミュレーションへ戻る
              </a>
            </p>
          </div>
        ) : (
          <p className="competition-manual-step">
            <button
              type="button"
              data-testid="competition-step-cta"
              disabled={!canStep}
              aria-busy={actionPending}
              onClick={() => void onStep()}
            >
              {actionPending ? "試合を処理中…" : primaryCtaLabel}
            </button>
            <span className="competition-step-hint">
              {" "}
              手動操作は自動進行の補助です。週進行で進まない場合のみ使用してください。
            </span>
            {!canStep &&
            selectedEntry !== null &&
            !selectedEntry.isPlayable &&
            !selectedEntry.isActiveCompetition ? (
              <span className="competition-step-hint"> 進行できる大会を選択してください。</span>
            ) : null}
          </p>
        )}
        {actionError !== null ? (
          <div className="panel-error" data-testid="competition-action-error">
            <p>{actionError}</p>
            <p>
              <button type="button" disabled={actionPending} onClick={() => void onStep()}>
                再試行
              </button>
            </p>
          </div>
        ) : null}
      </footer>
    </section>
  );
}
