/**
 * Presentational battle result + log — human-observer combat sequence (FIX7 / FIX8).
 */

import type { MockBattleView } from "../mock-battle/ui006-views.js";
import type { PersonDetailView } from "../person-detail/ui005-views.js";
import {
  battleActionEffectLines,
  formatResourcePair,
  groupLogItemsByTurn,
  readFinalParticipant,
  readFinalRange,
  readInitialRange,
  readSourceLogEntry,
} from "../presentation/battle-state-display.js";
import {
  BattleVersusStatus,
  resourcesFromActionAfter,
} from "../presentation/BattleVersusStatus.js";
import {
  battleEndReasonLabel,
  battleHitLabel,
  battleJudgeLabel,
  battleOrderNote,
  battleRangeLabel,
  battleReplacementReasonLabel,
  formatActivationDiagnostic,
  formatBattleAction,
  mockOutcomeSentence,
} from "../presentation/battle-display.js";
import { CombatProfileComparison } from "../presentation/CombatProfileComparison.js";
import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import { displayNull } from "../presentation/display-labels.js";
import type { BattleLogItemView } from "./ui007-views.js";

export type BattleLogViewProps = {
  summaryStatus: "loading" | "success" | "empty" | "error";
  summary: MockBattleView | null;
  summaryError: string | null;
  summaryErrorCode: string | null;
  logStatus: "loading" | "success" | "empty" | "error";
  logItems: readonly BattleLogItemView[];
  logTotalCount: number;
  logError: string | null;
  logErrorCode: string | null;
  canNext: boolean;
  onNext: () => void;
  /** Optional personId → displayName map for actor labels. */
  personNameById?: ReadonlyMap<string, string> | Record<string, string>;
  participantADetail?: PersonDetailView | null;
  participantBDetail?: PersonDetailView | null;
  participantADetailStatus?: "idle" | "loading" | "success" | "error";
  participantBDetailStatus?: "idle" | "loading" | "success" | "error";
  participantADetailError?: string | null;
  participantBDetailError?: string | null;
};

function displayRaw(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function personName(
  personId: unknown,
  map: BattleLogViewProps["personNameById"],
  summary: MockBattleView | null,
): string {
  if (typeof personId !== "string" || personId.length === 0) {
    return "—";
  }
  if (map instanceof Map && map.has(personId)) {
    return map.get(personId) ?? personId;
  }
  if (map !== undefined && Object.hasOwn(map, personId)) {
    const named = (map as Record<string, string>)[personId];
    if (typeof named === "string") {
      return named;
    }
  }
  if (summary !== null) {
    if (personId === summary.participantAPersonId) {
      return `参加者A`;
    }
    if (personId === summary.participantBPersonId) {
      return `参加者B`;
    }
    if (personId === summary.winnerPersonId) {
      return "勝者";
    }
    if (personId === summary.loserPersonId) {
      return "敗者";
    }
  }
  return personId;
}

function actionsDiffer(requested: unknown, resolved: unknown): boolean {
  return JSON.stringify(requested) !== JSON.stringify(resolved);
}

function opponentPersonId(summary: MockBattleView | null, actorPersonId: unknown): string | null {
  if (summary === null || typeof actorPersonId !== "string") {
    return null;
  }
  if (actorPersonId === summary.participantAPersonId) {
    return typeof summary.participantBPersonId === "string" ? summary.participantBPersonId : null;
  }
  if (actorPersonId === summary.participantBPersonId) {
    return typeof summary.participantAPersonId === "string" ? summary.participantAPersonId : null;
  }
  return null;
}

function sideOrPersonName(
  value: unknown,
  map: BattleLogViewProps["personNameById"],
  summary: MockBattleView | null,
): string {
  if (value === "sideA" && summary !== null) {
    return personName(summary.participantAPersonId, map, summary);
  }
  if (value === "sideB" && summary !== null) {
    return personName(summary.participantBPersonId, map, summary);
  }
  return personName(value, map, summary);
}

function resolvedKindOf(value: unknown): string | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const kind = (value as Record<string, unknown>).kind;
  return typeof kind === "string" ? kind : null;
}

function formatStrategyCandidateScores(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "null";
  }
  return value
    .map((entry) => {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        return displayRaw(entry);
      }
      const record = entry as Record<string, unknown>;
      return `${formatBattleAction(record.action)}=${displayRaw(record.score)}`;
    })
    .join(" · ");
}

function localizeRangeChangeLine(line: string): string {
  const match = /^間合い変更:(.+)→(.+)$/.exec(line);
  if (match === null) {
    return line;
  }
  return `間合い ${battleRangeLabel(match[1])} → ${battleRangeLabel(match[2])}`;
}

export function BattleLogViewPanel(props: BattleLogViewProps) {
  const summary = props.summary;
  const partA = summary !== null ? readFinalParticipant(summary.finalState, "participantA") : null;
  const partB = summary !== null ? readFinalParticipant(summary.finalState, "participantB") : null;
  const initialRange = summary !== null ? readInitialRange(summary.finalState) : null;
  const finalRange = summary !== null ? readFinalRange(summary.finalState) : null;
  const turnGroups = groupLogItemsByTurn(props.logItems);

  return (
    <section className="dw-card" data-testid="battle-log-page">
      <p>
        <a href="/mock-battle" data-testid="battle-log-back">
          ← 模擬戦選択へ
        </a>
      </p>
      <h2>模擬戦結果 / 詳細ログ</h2>

      {props.summaryStatus === "loading" ? (
        <p className="dw-status" data-testid="battle-summary-status" data-status="loading">
          結果概要を読み込み中…
        </p>
      ) : null}
      {props.summaryStatus === "empty" ? (
        <p className="dw-status" data-testid="battle-summary-status" data-status="empty">
          信頼できる最新結果はありません
        </p>
      ) : null}
      {props.summaryStatus === "error" ? (
        <p
          className="dw-status"
          data-testid="battle-summary-status"
          data-status="error"
          data-error-code={props.summaryErrorCode ?? ""}
        >
          結果概要の取得に失敗しました: {props.summaryError}
        </p>
      ) : null}

      {props.summaryStatus === "success" && summary !== null ? (
        <div data-testid="battle-summary-status" data-status="success">
          <div className="dw-mock-result">
            <p className="dw-winner-banner" data-testid="battle-summary-winner">
              {personName(summary.winnerPersonId, props.personNameById, summary)}
            </p>
            <p className="dw-lead" data-testid="battle-summary-outcome">
              {mockOutcomeSentence({
                winnerName: personName(summary.winnerPersonId, props.personNameById, summary),
                loserName: personName(summary.loserPersonId, props.personNameById, summary),
                endReason: summary.endReason,
                resultKind: summary.resultKind,
              })}
            </p>
          </div>

          <p className="dw-battle-range-banner" data-testid="battle-range-summary">
            開始間合い {battleRangeLabel(initialRange)}
            {finalRange !== null ? ` · 終了時 ${battleRangeLabel(finalRange)}` : ""}
          </p>

          <BattleVersusStatus
            testId="battle-participant-status"
            sideATestId="battle-status-a"
            sideBTestId="battle-status-b"
            nameA={personName(summary.participantAPersonId, props.personNameById, summary)}
            nameB={personName(summary.participantBPersonId, props.personNameById, summary)}
            partA={partA}
            partB={partB}
            showFinalFlags={true}
          />

          {(() => {
            return (
              <section
                className="dw-section dw-battle-start-profiles"
                data-testid="battle-start-profiles"
              >
                <h3>試合開始時の戦闘プロフィール比較</h3>
                <p className="dw-sub">
                  開始時の耐久・精神・間合いは上部の対戦状態を参照。ここでは適性・能力・習得技を揃えて比較します。
                </p>
                <CombatProfileComparison
                  testId="battle-start-profile-comparison"
                  labelA={personName(summary.participantAPersonId, props.personNameById, summary)}
                  labelB={personName(summary.participantBPersonId, props.personNameById, summary)}
                  statusA={props.participantADetailStatus ?? "idle"}
                  statusB={props.participantBDetailStatus ?? "idle"}
                  detailA={props.participantADetail ?? null}
                  detailB={props.participantBDetail ?? null}
                  errorA={props.participantADetailError ?? null}
                  errorB={props.participantBDetailError ?? null}
                />
              </section>
            );
          })()}

          <dl className="dw-dl dw-result-summary" data-testid="battle-summary">
            <div>
              <dt>勝者</dt>
              <dd>{personName(summary.winnerPersonId, props.personNameById, summary)}</dd>
            </div>
            <div>
              <dt>敗者</dt>
              <dd>{personName(summary.loserPersonId, props.personNameById, summary)}</dd>
            </div>
            <div>
              <dt>終了理由</dt>
              <dd>{battleEndReasonLabel(summary.endReason)}</dd>
            </div>
            <div>
              <dt>判定</dt>
              <dd>{battleJudgeLabel(summary.judgeScore)}</dd>
            </div>
            <div>
              <dt>ログ件数</dt>
              <dd>{String(summary.logTotalCount)}</dd>
            </div>
          </dl>
          <DeveloperDetails>
            <dl className="dw-dl">
              <div>
                <dt>resultKind</dt>
                <dd>{displayRaw(summary.resultKind)}</dd>
              </div>
              <div>
                <dt>endReason</dt>
                <dd>{displayRaw(summary.endReason)}</dd>
              </div>
              <div>
                <dt>winnerPersonId</dt>
                <dd>{displayRaw(summary.winnerPersonId)}</dd>
              </div>
              <div>
                <dt>loserPersonId</dt>
                <dd>{displayRaw(summary.loserPersonId)}</dd>
              </div>
              <div>
                <dt>matchId</dt>
                <dd>{displayRaw(summary.matchId)}</dd>
              </div>
              <div>
                <dt>battleSeed</dt>
                <dd>{displayRaw(summary.battleSeed)}</dd>
              </div>
              <div>
                <dt>finalRngState</dt>
                <dd>{displayRaw(summary.finalRngState)}</dd>
              </div>
              <div>
                <dt>logTotalCount</dt>
                <dd>{displayRaw(summary.logTotalCount)}</dd>
              </div>
            </dl>
            <pre>{JSON.stringify(summary)}</pre>
          </DeveloperDetails>
        </div>
      ) : null}

      {props.logStatus === "loading" ? (
        <p className="dw-status" data-testid="battle-log-status" data-status="loading">
          ログを読み込み中…
        </p>
      ) : null}
      {props.logStatus === "empty" ? (
        <p className="dw-status" data-testid="battle-log-status" data-status="empty">
          ログは空です
        </p>
      ) : null}
      {props.logStatus === "error" ? (
        <p
          className="dw-status"
          data-testid="battle-log-status"
          data-status="error"
          data-error-code={props.logErrorCode ?? ""}
        >
          ログの取得に失敗しました: {props.logError}
        </p>
      ) : null}

      {props.logStatus === "success" ? (
        <div data-testid="battle-log-status" data-status="success">
          <h3 className="dw-section-title">戦闘経過</h3>
          <p className="dw-sub" data-testid="battle-log-meta">
            全 {props.logTotalCount} 件
          </p>
          <div className="dw-combat-log" data-testid="battle-log-items">
            {turnGroups.map((group) => {
              const first = group.items[0]!;
              const turnRangeBefore = battleRangeLabel(first.rangeBefore);
              const last = group.items[group.items.length - 1]!;
              const turnRangeAfter = battleRangeLabel(last.rangeAfter);
              return (
                <section
                  className="dw-combat-turn"
                  key={`turn-${String(group.turnNumber)}`}
                  data-turn={String(group.turnNumber)}
                  data-testid={`battle-log-turn-${String(group.turnNumber)}`}
                >
                  <header className="dw-combat-turn-header">
                    <strong>ターン {String(group.turnNumber)}</strong>
                    <span className="dw-combat-turn-range">
                      間合い {turnRangeBefore}
                      {turnRangeAfter !== turnRangeBefore && turnRangeAfter !== "—"
                        ? ` → ${turnRangeAfter}`
                        : ""}
                    </span>
                  </header>
                  <ol className="dw-combat-turn-actions">
                    {group.items.map((item, indexInTurn) => {
                      const globalIndex = props.logItems.indexOf(item);
                      const key = `${String(item.sequenceInBattle)}-${String(globalIndex)}`;
                      const actorLabel = personName(
                        item.actorPersonId,
                        props.personNameById,
                        summary,
                      );
                      const targetId = opponentPersonId(summary, item.actorPersonId);
                      const targetLabel = personName(targetId, props.personNameById, summary);
                      const requestedLabel = formatBattleAction(item.requestedAction);
                      const resolvedLabel = formatBattleAction(item.resolvedAction);
                      const differ = actionsDiffer(item.requestedAction, item.resolvedAction);
                      const sourceLog = readSourceLogEntry(item);
                      const kind = resolvedKindOf(item.resolvedAction);
                      const effectLines = battleActionEffectLines({
                        sourceLog,
                        actorName: actorLabel,
                        targetName: targetLabel,
                        damage: item.damage,
                        hit: item.hit,
                        actionLabel: resolvedLabel,
                        activationSucceeded: item.activationSucceeded,
                        activationFailureReason: item.activationFailureReason,
                        activationChance: item.activationChance,
                        activationRoll: item.activationRoll,
                        resolvedKind: kind,
                        activationDiagnostic: formatActivationDiagnostic({
                          activationSucceeded: item.activationSucceeded,
                          activationFailureReason: item.activationFailureReason,
                          activationChance: item.activationChance,
                          activationRoll: item.activationRoll,
                        }),
                      }).map(localizeRangeChangeLine);
                      const hitLabel = battleHitLabel(item.hit);
                      const orderNote = battleOrderNote({
                        priority: item.priority,
                        isFirstInTurn: indexInTurn === 0,
                      });
                      const replacementLabel = battleReplacementReasonLabel(item.replacementReason);
                      return (
                        <li
                          className="dw-combat-row"
                          key={key}
                          data-sequence={String(item.sequenceInBattle)}
                        >
                          <div className="dw-combat-seq" aria-hidden="true">
                            {String(item.sequenceInBattle)}
                          </div>
                          <div className="dw-combat-body">
                            <header
                              className="dw-log-header"
                              data-testid={`battle-log-actor-${String(globalIndex)}`}
                            >
                              {orderNote !== null ? (
                                <span className="dw-combat-order">{orderNote}</span>
                              ) : null}
                              <strong>{actorLabel}</strong>
                              <span className="dw-combat-action">{resolvedLabel}</span>
                              <span className="dw-combat-range-chip">
                                {battleRangeLabel(item.rangeBefore)}
                              </span>
                              {hitLabel !== "—" ? (
                                <span
                                  className="dw-badge"
                                  data-testid={`battle-log-hit-${String(globalIndex)}`}
                                >
                                  {hitLabel}
                                </span>
                              ) : null}
                            </header>
                            <div
                              className="dw-combat-effects"
                              data-testid={`battle-log-outcome-${String(globalIndex)}`}
                            >
                              {effectLines.map((line) => (
                                <p key={line}>{line}</p>
                              ))}
                              {differ ? (
                                <p
                                  className="dw-sub"
                                  data-testid={`battle-log-requested-resolved-${String(globalIndex)}`}
                                >
                                  要求は「{requestedLabel}」だったが「{resolvedLabel}」を実行
                                  {replacementLabel !== "—" ? `（${replacementLabel}）` : ""}
                                </p>
                              ) : (
                                <span
                                  className="dw-visually-hidden"
                                  data-testid={`battle-log-requested-resolved-${String(globalIndex)}`}
                                >
                                  {resolvedLabel}
                                </span>
                              )}
                              {item.advantageTurnAwardedTo !== null &&
                              item.advantageTurnAwardedTo !== undefined ? (
                                <p className="dw-sub">
                                  有利ターン付与:{" "}
                                  {sideOrPersonName(
                                    item.advantageTurnAwardedTo,
                                    props.personNameById,
                                    summary,
                                  )}
                                </p>
                              ) : null}
                            </div>
                            <DeveloperDetails testId="developer-details-log-item">
                              <dl className="dw-dl">
                                <div>
                                  <dt>actorSide</dt>
                                  <dd>{displayRaw(item.actorSide)}</dd>
                                </div>
                                <div>
                                  <dt>actorPersonId</dt>
                                  <dd>{displayRaw(item.actorPersonId)}</dd>
                                </div>
                                <div>
                                  <dt>priority</dt>
                                  <dd>{displayRaw(item.priority)}</dd>
                                </div>
                                <div>
                                  <dt>actionOrderScore</dt>
                                  <dd>{displayRaw(item.actionOrderScore)}</dd>
                                </div>
                                <div>
                                  <dt>requestedAction</dt>
                                  <dd>{displayRaw(item.requestedAction)}</dd>
                                </div>
                                <div>
                                  <dt>resolvedAction</dt>
                                  <dd>{displayRaw(item.resolvedAction)}</dd>
                                </div>
                                <div>
                                  <dt>replacementReason</dt>
                                  <dd>{displayNull(item.replacementReason as string | null)}</dd>
                                </div>
                                <div>
                                  <dt>activationSucceeded</dt>
                                  <dd>{displayRaw(item.activationSucceeded)}</dd>
                                </div>
                                <div>
                                  <dt>activationChance</dt>
                                  <dd>{displayRaw(item.activationChance)}</dd>
                                </div>
                                <div>
                                  <dt>activationRoll</dt>
                                  <dd>{displayRaw(item.activationRoll)}</dd>
                                </div>
                                <div>
                                  <dt>activationFailureReason</dt>
                                  <dd>{displayRaw(item.activationFailureReason)}</dd>
                                </div>
                                <div>
                                  <dt>strategyCandidateScores</dt>
                                  <dd
                                    data-testid={`battle-log-strategy-scores-${String(globalIndex)}`}
                                  >
                                    {formatStrategyCandidateScores(item.strategyCandidateScores)}
                                  </dd>
                                </div>
                                <div>
                                  <dt>strategyTieBreakUsed</dt>
                                  <dd>{displayRaw(item.strategyTieBreakUsed)}</dd>
                                </div>
                                <div>
                                  <dt>hit</dt>
                                  <dd>{displayRaw(item.hit)}</dd>
                                </div>
                                <div>
                                  <dt>damage</dt>
                                  <dd>{displayRaw(item.damage)}</dd>
                                </div>
                                <div>
                                  <dt>injuryResult</dt>
                                  <dd>{displayRaw(item.injuryResult)}</dd>
                                </div>
                                <div>
                                  <dt>rangeBefore</dt>
                                  <dd>{displayRaw(item.rangeBefore)}</dd>
                                </div>
                                <div>
                                  <dt>rangeAfter</dt>
                                  <dd>{displayRaw(item.rangeAfter)}</dd>
                                </div>
                                <div>
                                  <dt>sourceLogEntry</dt>
                                  <dd>{displayRaw(item.sourceLogEntry)}</dd>
                                </div>
                              </dl>
                              <pre>{JSON.stringify(item)}</pre>
                            </DeveloperDetails>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {(() => {
                    const lastItem = group.items[group.items.length - 1]!;
                    const lastLog = readSourceLogEntry(lastItem);
                    if (lastLog === null || summary === null) {
                      return null;
                    }
                    const lastActorIsA = lastItem.actorPersonId === summary.participantAPersonId;
                    const turned = resourcesFromActionAfter({
                      sourceLog: lastLog,
                      actorIsA: lastActorIsA,
                      maxA: partA,
                      maxB: partB,
                    });
                    return (
                      <BattleVersusStatus
                        testId={`battle-log-turn-state-${String(group.turnNumber)}`}
                        nameA={personName(
                          summary.participantAPersonId,
                          props.personNameById,
                          summary,
                        )}
                        nameB={personName(
                          summary.participantBPersonId,
                          props.personNameById,
                          summary,
                        )}
                        partA={turned.partA}
                        partB={turned.partB}
                        showFinalFlags={false}
                        rangeLabel={`間合い ${turnRangeAfter}`}
                        compact={true}
                      />
                    );
                  })()}
                </section>
              );
            })}
          </div>
          {!props.canNext && summary !== null ? (
            <aside className="dw-battle-terminal" data-testid="battle-log-terminal">
              {summary.endReason === "max_turns_reached" ||
              summary.endReason === "judge_decision" ? (
                <>
                  <p>
                    <strong>20ターン終了</strong>
                  </p>
                  <p>規定ターンに到達したため判定へ</p>
                </>
              ) : (
                <>
                  <p>
                    <strong>試合終了</strong>
                  </p>
                  <p>{battleEndReasonLabel(summary.endReason)}</p>
                </>
              )}
              <p className="dw-sub">
                終了時 間合い {battleRangeLabel(finalRange)} ·{" "}
                {personName(summary.participantAPersonId, props.personNameById, summary)}: 耐久{" "}
                {formatResourcePair(partA?.currentDurability ?? null, partA?.maxDurability ?? null)}{" "}
                / 精神力{" "}
                {formatResourcePair(partA?.currentMental ?? null, partA?.maxMental ?? null)} ·{" "}
                {personName(summary.participantBPersonId, props.personNameById, summary)}: 耐久{" "}
                {formatResourcePair(partB?.currentDurability ?? null, partB?.maxDurability ?? null)}{" "}
                / 精神力{" "}
                {formatResourcePair(partB?.currentMental ?? null, partB?.maxMental ?? null)}
              </p>
              <p className="dw-sub" data-testid="battle-log-terminal-outcome">
                {mockOutcomeSentence({
                  winnerName: personName(summary.winnerPersonId, props.personNameById, summary),
                  loserName: personName(summary.loserPersonId, props.personNameById, summary),
                  endReason: summary.endReason,
                  resultKind: summary.resultKind,
                })}
              </p>
            </aside>
          ) : null}
          <div className="dw-paging" data-testid="battle-log-paging">
            <button
              type="button"
              data-testid="battle-log-next"
              disabled={!props.canNext}
              aria-disabled={!props.canNext}
              onClick={props.onNext}
            >
              次のログページ
            </button>
          </div>
        </div>
      ) : null}

      <DeveloperDetails testId="battle-log-meta-dev">
        <p data-testid="battle-log-meta-dev-count">totalCount={props.logTotalCount}</p>
      </DeveloperDetails>
    </section>
  );
}
