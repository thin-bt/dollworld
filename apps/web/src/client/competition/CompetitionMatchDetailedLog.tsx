import { BattleLogViewPanel } from "../battle-log/BattleLogView.js";
import type { BattleLogItemView } from "../battle-log/ui007-views.js";
import type { CompetitionMatchDetailView, CompetitionTurnOrderLogView } from "./ui009-views.js";

function sideLabel(side: unknown, detail: CompetitionMatchDetailView): string {
  if (side === "sideA") {
    return detail.participantADisplayName;
  }
  if (side === "sideB") {
    return detail.participantBDisplayName;
  }
  return typeof side === "string" ? side : "—";
}

function unavailableMessage(
  reason: CompetitionMatchDetailView["detailedLogUnavailableReason"],
): string {
  if (reason === "pruned") {
    return "詳細ログは保持期間を過ぎたため削除されています。";
  }
  if (reason === "not_retained") {
    return "詳細ログはこの試合では保持されていません。";
  }
  return "詳細ログは利用できないか、保持期間外です。";
}

export type CompetitionMatchDetailedLogProps = {
  detail: CompetitionMatchDetailView;
};

export function CompetitionMatchDetailedLog(props: CompetitionMatchDetailedLogProps) {
  const { detail } = props;
  const personNameById: Record<string, string> = {
    [detail.participantAId]: detail.participantADisplayName,
    [detail.participantBId]: detail.participantBDisplayName,
  };

  if (!detail.detailedLogAvailable) {
    return (
      <section data-testid="competition-match-log-availability" data-log-state="unavailable">
        <h3 className="competition-section-heading">詳細戦闘ログ</h3>
        <p data-testid="competition-match-log-unavailable">
          {unavailableMessage(detail.detailedLogUnavailableReason)}
        </p>
      </section>
    );
  }

  const logItems = detail.logItems as BattleLogItemView[];

  return (
    <section data-testid="competition-match-log-availability" data-log-state="available">
      <h3 className="competition-section-heading">詳細戦闘ログ</h3>
      {detail.turnOrderLogs.length > 0 ? (
        <div className="competition-match-turn-order" data-testid="competition-match-turn-order">
          <h4 className="competition-section-heading">ターン行動順</h4>
          <table className="data-table">
            <thead>
              <tr>
                <th>ターン</th>
                <th>先手</th>
                <th>A優先度</th>
                <th>B優先度</th>
              </tr>
            </thead>
            <tbody>
              {detail.turnOrderLogs.map((row: CompetitionTurnOrderLogView, index) => (
                <tr
                  key={`turn-order-${String(row.turnNumber ?? index)}`}
                  data-testid={`competition-match-turn-order-${String(row.turnNumber ?? index)}`}
                >
                  <td>{String(row.turnNumber ?? "—")}</td>
                  <td>{sideLabel(row.resolvedFirstSide, detail)}</td>
                  <td>{String(row.sideAPriority ?? "—")}</td>
                  <td>{String(row.sideBPriority ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <BattleLogViewPanel
        summaryStatus="empty"
        summary={null}
        summaryError={null}
        summaryErrorCode={null}
        logStatus={logItems.length > 0 ? "success" : "empty"}
        logItems={logItems}
        logTotalCount={detail.detailedLogActionCount}
        logError={null}
        logErrorCode={null}
        canNext={false}
        onNext={() => undefined}
        personNameById={personNameById}
      />
    </section>
  );
}
