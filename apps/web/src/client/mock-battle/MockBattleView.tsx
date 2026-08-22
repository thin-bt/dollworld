/**
 * Presentational mock-battle panel — human-observer hierarchy (FIX2).
 */

import type { MockBattleCandidateView } from "../dev-viewer/ui004-views.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import {
  battleEndReasonLabel,
  battleJudgeLabel,
  mockOutcomeSentence,
} from "../presentation/battle-display.js";
import { readFinalParticipant } from "../presentation/battle-state-display.js";
import { BattleVersusStatus } from "../presentation/BattleVersusStatus.js";
import { careerStatusLabel, displayNull } from "../presentation/display-labels.js";
import { CombatProfileComparison } from "../presentation/CombatProfileComparison.js";
import type { MockBattleView } from "./ui006-views.js";
import type { ParticipantSummaryStatus } from "./MockParticipantSummary.js";

export type MockBattleViewProps = {
  candidatesStatus: "loading" | "success" | "empty" | "error";
  candidatesLoadingText?: string;
  candidates: readonly MockBattleCandidateView[];
  candidatesError: string | null;
  participantAId: string;
  participantBId: string;
  participantASummaryStatus: ParticipantSummaryStatus;
  participantBSummaryStatus: ParticipantSummaryStatus;
  participantADetail: PersonDetailView | null;
  participantBDetail: PersonDetailView | null;
  participantASummaryError: string | null;
  participantBSummaryError: string | null;
  samePersonBlocked: boolean;
  actionPending: boolean;
  actionError: string | null;
  actionErrorCode: string | null;
  latestStatus: "idle" | "loading" | "success" | "empty" | "error";
  latestError: string | null;
  trustedResult: MockBattleView | null;
  replayAvailable: boolean;
  onParticipantAChange: (personId: string) => void;
  onParticipantBChange: (personId: string) => void;
  onRun: () => void;
  onReplay: () => void;
  onLatest: () => void;
};

function display(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function candidateLabel(row: MockBattleCandidateView): string {
  return `${row.displayName} · ${String(row.age)}歳 · ${careerStatusLabel(row.careerStatus)}`;
}

function findCandidateName(
  candidates: readonly MockBattleCandidateView[],
  personId: string,
): string {
  const row = candidates.find((c) => c.personId === personId);
  return row === undefined ? personId : row.displayName;
}

export function MockBattleViewPanel(props: MockBattleViewProps) {
  const runDisabled =
    props.actionPending ||
    props.samePersonBlocked ||
    props.participantAId.length === 0 ||
    props.participantBId.length === 0 ||
    props.candidatesStatus !== "success";

  return (
    <section className="dw-card" data-testid="mock-battle-page">
      <p className="dw-eyebrow">確認専用</p>
      <h2>確認専用模擬戦</h2>
      <p className="dw-lead" data-testid="mock-battle-isolation">
        正史の世界とイベントは変更されません。観察・確認専用の模擬実行です。
      </p>
      <p className="dw-sub" data-testid="mock-battle-coverage-hint">
        選択した参加者の適性・能力・習得技は、下の比較サマリーで確認できます。
      </p>

      {props.candidatesStatus === "loading" ? (
        <p className="dw-status" data-testid="mock-candidates-status" data-status="loading">
          {props.candidatesLoadingText ?? "候補を読み込み中…"}
        </p>
      ) : null}
      {props.candidatesStatus === "error" ? (
        <p className="dw-status" data-testid="mock-candidates-status" data-status="error">
          候補の取得に失敗しました: {props.candidatesError}
        </p>
      ) : null}
      {props.candidatesStatus === "empty" ? (
        <p className="dw-status" data-testid="mock-candidates-status" data-status="empty">
          現在の世界日時では模擬戦候補がいません（世界は自動では進みません）
        </p>
      ) : null}

      {props.candidatesStatus === "success" && props.candidates.length === 1 ? (
        <p className="dw-status" data-testid="mock-candidates-one-only" data-status="one">
          現在の候補は1人だけです。もう1人の候補が出るまで、世界は自動では進みません。
        </p>
      ) : null}

      {props.candidatesStatus === "success" ? (
        <div data-testid="mock-candidates-status" data-status="success">
          <div className="dw-participant-selectors" data-testid="mock-participant-selectors">
            <div className="dw-fighter">
              <label htmlFor="mock-participant-a">参加者 A</label>
              {props.participantAId.length > 0 ? (
                <h4>{findCandidateName(props.candidates, props.participantAId)}</h4>
              ) : null}
              <select
                id="mock-participant-a"
                data-testid="mock-participant-a"
                value={props.participantAId}
                disabled={props.actionPending}
                onChange={(event) => props.onParticipantAChange(event.target.value)}
              >
                <option value="">（選択）</option>
                {props.candidates.map((row) => (
                  <option key={`a-${row.personId}`} value={row.personId}>
                    {candidateLabel(row)}
                  </option>
                ))}
              </select>
            </div>
            <div className="dw-fighter">
              <label htmlFor="mock-participant-b">参加者 B</label>
              {props.participantBId.length > 0 ? (
                <h4>{findCandidateName(props.candidates, props.participantBId)}</h4>
              ) : null}
              <select
                id="mock-participant-b"
                data-testid="mock-participant-b"
                value={props.participantBId}
                disabled={props.actionPending}
                onChange={(event) => props.onParticipantBChange(event.target.value)}
              >
                <option value="">（選択）</option>
                {props.candidates.map((row) => (
                  <option key={`b-${row.personId}`} value={row.personId}>
                    {candidateLabel(row)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {props.candidatesStatus === "success" &&
      (props.participantAId.length > 0 || props.participantBId.length > 0) ? (
        <section className="dw-section" data-testid="mock-profile-comparison">
          <h3>参加者比較</h3>
          <CombatProfileComparison
            testId="mock-combat-profile-comparison"
            labelA={
              props.participantAId.length > 0
                ? findCandidateName(props.candidates, props.participantAId)
                : "A"
            }
            labelB={
              props.participantBId.length > 0
                ? findCandidateName(props.candidates, props.participantBId)
                : "B"
            }
            statusA={props.participantAId.length === 0 ? "idle" : props.participantASummaryStatus}
            statusB={props.participantBId.length === 0 ? "idle" : props.participantBSummaryStatus}
            detailA={props.participantADetail}
            detailB={props.participantBDetail}
            errorA={props.participantASummaryError}
            errorB={props.participantBSummaryError}
          />
        </section>
      ) : null}

      {props.samePersonBlocked ? (
        <p data-testid="mock-same-person-validation" role="alert" data-validation="same-person">
          同一人物を両方に選ぶことはできません。
        </p>
      ) : null}
      {props.candidatesStatus === "success" &&
      !props.samePersonBlocked &&
      (props.participantAId.length === 0 || props.participantBId.length === 0) ? (
        <p className="dw-sub" data-testid="mock-select-two-hint">
          参加者を2人、別々に選ぶと模擬戦を開始できます。
        </p>
      ) : null}

      <div className="dw-btnrow dw-btnrow-center" data-testid="mock-battle-actions">
        <button
          type="button"
          className="dw-btn-primary"
          data-testid="mock-battle-run"
          disabled={runDisabled}
          aria-busy={props.actionPending}
          onClick={props.onRun}
        >
          模擬戦を開始
        </button>
        <button
          type="button"
          data-testid="mock-battle-replay"
          disabled={props.actionPending || !props.replayAvailable}
          aria-busy={props.actionPending}
          onClick={props.onReplay}
        >
          同じseedで再現
        </button>
        <button
          type="button"
          data-testid="mock-battle-latest"
          disabled={props.actionPending}
          aria-busy={props.actionPending}
          onClick={props.onLatest}
        >
          最新結果
        </button>
      </div>

      {props.actionError !== null ? (
        <p
          className="dw-status"
          data-testid="mock-battle-action-status"
          data-status="error"
          data-error-code={props.actionErrorCode ?? ""}
        >
          操作に失敗しました: {props.actionError}
        </p>
      ) : null}
      {props.actionPending ? (
        <p className="dw-status" data-testid="mock-battle-action-status" data-status="pending">
          処理中…
        </p>
      ) : null}

      {props.latestStatus === "loading" ? (
        <p className="dw-status" data-testid="mock-latest-status" data-status="loading">
          最新結果を読み込み中…
        </p>
      ) : null}
      {props.latestStatus === "empty" ? (
        <p className="dw-status" data-testid="mock-latest-status" data-status="empty">
          信頼できる最新結果はありません
        </p>
      ) : null}
      {props.latestStatus === "error" ? (
        <p className="dw-status" data-testid="mock-latest-status" data-status="error">
          最新結果の取得に失敗しました: {props.latestError}
        </p>
      ) : null}

      {props.trustedResult !== null ? (
        <div
          className="dw-section dw-mock-result"
          data-testid="mock-battle-result"
          data-status="success"
        >
          <h3>模擬戦結果</h3>
          {(() => {
            const winnerName = findCandidateName(
              props.candidates,
              String(props.trustedResult.winnerPersonId ?? ""),
            );
            const loserName = findCandidateName(
              props.candidates,
              String(props.trustedResult.loserPersonId ?? ""),
            );
            return (
              <>
                <p className="dw-winner-banner" data-testid="mock-battle-winner-banner">
                  {winnerName}
                </p>
                <p className="dw-lead" data-testid="mock-battle-outcome">
                  {mockOutcomeSentence({
                    winnerName,
                    loserName,
                    endReason: props.trustedResult.endReason,
                    resultKind: props.trustedResult.resultKind,
                  })}
                </p>
                <dl className="dw-dl dw-result-summary" data-testid="mock-battle-summary">
                  <div>
                    <dt>勝者</dt>
                    <dd>{winnerName}</dd>
                  </div>
                  <div>
                    <dt>敗者</dt>
                    <dd>{loserName}</dd>
                  </div>
                  <div>
                    <dt>終了理由</dt>
                    <dd>{battleEndReasonLabel(props.trustedResult.endReason)}</dd>
                  </div>
                  <div>
                    <dt>判定</dt>
                    <dd>{battleJudgeLabel(props.trustedResult.judgeScore)}</dd>
                  </div>
                </dl>
                {(() => {
                  const partA = readFinalParticipant(
                    props.trustedResult.finalState,
                    "participantA",
                  );
                  const partB = readFinalParticipant(
                    props.trustedResult.finalState,
                    "participantB",
                  );
                  const nameA = findCandidateName(
                    props.candidates,
                    String(props.trustedResult.participantAPersonId ?? ""),
                  );
                  const nameB = findCandidateName(
                    props.candidates,
                    String(props.trustedResult.participantBPersonId ?? ""),
                  );
                  if (partA === null && partB === null) {
                    return null;
                  }
                  return (
                    <BattleVersusStatus
                      testId="mock-battle-final-state"
                      sideATestId="mock-final-a"
                      sideBTestId="mock-final-b"
                      nameA={nameA}
                      nameB={nameB}
                      partA={partA}
                      partB={partB}
                      showFinalFlags={true}
                      compact={true}
                    />
                  );
                })()}
              </>
            );
          })()}
          <p>
            <a href="/mock-battle/result" data-testid="mock-battle-open-result">
              詳細ログを見る
            </a>
          </p>
          <DeveloperDetails>
            <dl className="dw-dl">
              <div>
                <dt>resultKind</dt>
                <dd>{String(props.trustedResult.resultKind)}</dd>
              </div>
              <div>
                <dt>endReason</dt>
                <dd>{String(props.trustedResult.endReason)}</dd>
              </div>
              <div>
                <dt>winnerPersonId</dt>
                <dd>{display(props.trustedResult.winnerPersonId)}</dd>
              </div>
              <div>
                <dt>loserPersonId</dt>
                <dd>{display(props.trustedResult.loserPersonId)}</dd>
              </div>
              <div>
                <dt>participantAPersonId</dt>
                <dd>{display(props.trustedResult.participantAPersonId)}</dd>
              </div>
              <div>
                <dt>participantBPersonId</dt>
                <dd>{display(props.trustedResult.participantBPersonId)}</dd>
              </div>
              <div>
                <dt>matchId</dt>
                <dd>{display(props.trustedResult.matchId)}</dd>
              </div>
              <div>
                <dt>battleSeed</dt>
                <dd>{display(props.trustedResult.battleSeed)}</dd>
              </div>
              <div>
                <dt>finalRngState</dt>
                <dd>{display(props.trustedResult.finalRngState)}</dd>
              </div>
              <div>
                <dt>simulationId</dt>
                <dd>{display(props.trustedResult.simulationId)}</dd>
              </div>
              <div>
                <dt>runRuleSnapshotHash</dt>
                <dd>{display(props.trustedResult.runRuleSnapshotHash)}</dd>
              </div>
              <div>
                <dt>battleInputHash</dt>
                <dd>{display(props.trustedResult.battleInputHash)}</dd>
              </div>
              <div>
                <dt>sprint1ConfigHash</dt>
                <dd>{display(props.trustedResult.sprint1ConfigHash)}</dd>
              </div>
              <div>
                <dt>techniqueCatalogHash</dt>
                <dd>{display(props.trustedResult.techniqueCatalogHash)}</dd>
              </div>
              <div>
                <dt>participantAActionSourceIdentity</dt>
                <dd>{display(props.trustedResult.participantAActionSourceIdentity)}</dd>
              </div>
              <div>
                <dt>participantBActionSourceIdentity</dt>
                <dd>{display(props.trustedResult.participantBActionSourceIdentity)}</dd>
              </div>
              <div>
                <dt>sourceWorldDate</dt>
                <dd>{display(props.trustedResult.sourceWorldDate)}</dd>
              </div>
              <div>
                <dt>sourceWorldUiRevision</dt>
                <dd>{displayNull(props.trustedResult.sourceWorldUiRevision as number | null)}</dd>
              </div>
            </dl>
            <pre>{JSON.stringify(props.trustedResult)}</pre>
          </DeveloperDetails>
        </div>
      ) : null}
    </section>
  );
}
