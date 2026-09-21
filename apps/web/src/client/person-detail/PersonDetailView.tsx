/**
 * Pure presentation of accepted UI-005 PersonDetail — human-observer hierarchy (FIX2).
 */

import type { PersonDetailView } from "./ui005-views.js";
import { DeveloperDetails } from "../presentation/DeveloperDetails.js";
import {
  APTITUDE_KEYS,
  aptitudeLabel,
  careerStatusLabel,
  currentMentalLabel,
  displayNull,
  formatWorldDateValue,
  lifeStatusLabel,
  sexLabel,
  spiritAbilityLabel,
  statLabel,
  STAT_KEYS,
  trainingHistoryItemLabel,
} from "../presentation/display-labels.js";
import {
  abilityValueClassName,
  abilityValueTier,
  abilityValueToneLabel,
} from "../presentation/ability-value-presentation.js";
import { presentTechniqueView } from "../presentation/technique-presentation.js";

export type PersonDetailViewProps = {
  status: "loading" | "success" | "error";
  personId: string;
  detail: PersonDetailView | null;
  errorText: string | null;
  errorCode: string | null;
  uiRevision: number | null;
  peopleListHref?: string;
};

function renderStatGrid(record: Record<string, number>, testId: string) {
  return (
    <div className="dw-stat-grid" data-testid={testId}>
      {STAT_KEYS.map((key) => {
        const value = record[key];
        const n = typeof value === "number" ? value : Number.NaN;
        const tier = abilityValueTier(n);
        const tone = abilityValueToneLabel(tier);
        return (
          <div
            key={key}
            className={`dw-stat dw-stat--${Number.isFinite(n) ? tier : "mid"}`}
            data-stat={key}
            data-ability-tier={Number.isFinite(n) ? tier : "mid"}
          >
            <small>{key === "spirit" ? spiritAbilityLabel() : statLabel(key)}</small>
            <b className={Number.isFinite(n) ? abilityValueClassName(n) : undefined}>
              {String(value ?? "—")}
            </b>
            {tone !== null ? <span className="dw-ability-tone">{tone}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function renderAptitudeGrid(record: Record<string, number>, testId: string) {
  return (
    <div className="dw-stat-grid" data-testid={testId}>
      {APTITUDE_KEYS.map((key) => {
        const value = record[key];
        const n = typeof value === "number" ? value : Number.NaN;
        const tier = abilityValueTier(n);
        const tone = abilityValueToneLabel(tier);
        return (
          <div
            key={key}
            className={`dw-stat dw-stat--${Number.isFinite(n) ? tier : "mid"}`}
            data-aptitude={key}
            data-ability-tier={Number.isFinite(n) ? tier : "mid"}
          >
            <small>{aptitudeLabel(key)}</small>
            <b className={Number.isFinite(n) ? abilityValueClassName(n) : undefined}>
              {String(value ?? "—")}
            </b>
            {tone !== null ? <span className="dw-ability-tone">{tone}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function renderStatHistory(history: Record<string, unknown> | null) {
  if (history === null) {
    return (
      <section data-testid="person-detail-statHistory">
        <h3>能力の推移</h3>
        <p data-empty="true">能力の推移はまだありません</p>
      </section>
    );
  }
  return (
    <section data-testid="person-detail-statHistory">
      <h3>能力の推移</h3>
      <table className="dw-table dw-compact-table">
        <thead>
          <tr>
            <th>能力</th>
            <th>初期</th>
            <th>48週差</th>
            <th>直近週差</th>
          </tr>
        </thead>
        <tbody>
          {STAT_KEYS.filter((key) => key in history).map((key) => {
            const entry = history[key];
            if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
              return null;
            }
            const fields = entry as Record<string, unknown>;
            return (
              <tr key={key} data-stat-history-key={key}>
                <td data-stat={key}>{statLabel(key)}</td>
                <td>{displayNull(fields.initial as number | null)}</td>
                <td>{displayNull(fields.last48WeeksDelta as number | null)}</td>
                <td>{displayNull(fields.lastWeekDelta as number | null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

export function PersonDetailViewPanel(props: PersonDetailViewProps) {
  const backHref = props.peopleListHref ?? "/people";
  const detail = props.detail;

  return (
    <section className="dw-card" data-testid="person-detail-page" data-person-id={props.personId}>
      <p>
        <a href={backHref} data-testid="person-detail-back">
          ← 人物一覧へ
        </a>
      </p>

      {props.status === "loading" ? (
        <p className="dw-status" data-testid="person-detail-status" data-status="loading">
          読み込み中…
        </p>
      ) : null}
      {props.status === "error" ? (
        <p
          className="dw-status"
          data-testid="person-detail-status"
          data-status="error"
          data-error-code={props.errorCode ?? ""}
        >
          取得に失敗しました: {props.errorText}
        </p>
      ) : null}
      {props.status === "error" || props.status === "loading" ? (
        <DeveloperDetails>
          <p className="dw-sub" data-testid="person-detail-requested-id">
            personId={props.personId}
          </p>
        </DeveloperDetails>
      ) : null}

      {props.status === "success" && detail !== null ? (
        <div data-testid="person-detail-status" data-status="success">
          <header
            className="dw-person-hero dw-person-hero--rich"
            data-testid="person-detail-identity"
          >
            <div className="dw-person-top">
              <div>
                <h2>{detail.displayName}</h2>
                <p className="dw-sub">
                  <span data-testid="person-detail-sex">{sexLabel(detail.sex)}</span>
                  {" · "}
                  {displayNull(detail.age)}歳 · {lifeStatusLabel(detail.lifeStatus)} ·{" "}
                  {careerStatusLabel(detail.careerStatus)}
                </p>
              </div>
              <div className="dw-rankbox">
                <small>現在段位</small>
                <b>{displayNull(detail.currentRank)}</b>
              </div>
            </div>
            <ul className="dw-badge-row" data-testid="person-detail-status-chips">
              {/* FIX15: avoid duplicating 生存/引退 already shown in the hero subtitle. */}
            </ul>
          </header>

          <section className="dw-section" data-testid="person-detail-current-state">
            <h3>現在状態</h3>
            <dl className="dw-dl" data-testid="person-detail-current-mental">
              <div>
                <dt>{currentMentalLabel()}</dt>
                <dd>
                  {String(detail.currentMental)}
                  {" / "}
                  {typeof detail.stats.spirit === "number" ? String(50 + detail.stats.spirit) : "—"}
                </dd>
              </div>
              <div>
                <dt>調子</dt>
                <dd data-testid="person-detail-condition">
                  {String(detail.temporaryCondition.condition ?? "—")}
                </dd>
              </div>
              <div>
                <dt>自信</dt>
                <dd data-testid="person-detail-confidence">
                  {String(detail.temporaryCondition.confidence ?? "—")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="dw-section" data-testid="person-detail-mentorship">
            <h3>師弟関係</h3>
            <dl className="dw-dl" data-testid="person-detail-mentorship-dl">
              <div>
                <dt>師範資格</dt>
                <dd
                  data-testid="person-detail-qualified-master"
                  data-qualified-master={detail.qualifiedMaster ? "true" : "false"}
                >
                  {detail.qualifiedMaster ? "あり" : "なし"}
                </dd>
              </div>
              <div>
                <dt>正式師</dt>
                <dd data-testid="person-detail-formal-masters">
                  {detail.formalMasterPersonIds.length === 0 ? (
                    <span data-empty="true">なし</span>
                  ) : (
                    <ul>
                      {detail.formalMasterPersonIds.map((masterId) => (
                        <li key={masterId}>
                          <a
                            href={`/people/${encodeURIComponent(masterId)}`}
                            data-testid="person-detail-formal-master-link"
                            data-person-id={masterId}
                          >
                            {masterId}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="dw-section" data-testid="person-detail-stats">
            <h3>六能力</h3>
            {renderStatGrid(detail.stats, "person-detail-stats-grid")}
          </section>

          <section className="dw-section" data-testid="person-detail-aptitudes">
            <h3>三適性</h3>
            {renderAptitudeGrid(detail.aptitudes, "person-detail-aptitudes-grid")}
          </section>

          <section className="dw-section" data-testid="person-detail-techniques">
            <h3>技</h3>
            {detail.techniques.length === 0 ? (
              <p data-empty="true">習得した技はまだありません</p>
            ) : (
              <ul className="dw-technique-list">
                {detail.techniques.map((tech, index) => {
                  const presented = presentTechniqueView(tech as Record<string, unknown>);
                  const techniqueId =
                    presented.techniqueId.length > 0
                      ? presented.techniqueId
                      : `tech-${String(index)}`;
                  return (
                    <li key={techniqueId} data-technique-id={techniqueId}>
                      <div className="dw-technique-heading">
                        <strong data-testid="technique-primary-label">
                          {presented.primaryLabel}
                        </strong>
                        {presented.categoryLabel !== null ? (
                          <span className="dw-badge" data-testid="technique-category-label">
                            {" "}
                            {presented.categoryLabel}
                          </span>
                        ) : null}
                        {presented.learnedStateLabel !== null ? (
                          <span className="dw-badge" data-testid="technique-learned-state">
                            {" "}
                            {presented.learnedStateLabel}
                          </span>
                        ) : null}
                      </div>
                      {presented.description !== null ? (
                        <p className="dw-sub" data-testid="technique-description">
                          {presented.description}
                        </p>
                      ) : null}
                      <dl className="dw-dl dw-technique-meta">
                        {presented.usableRangesLabel !== null ? (
                          <div>
                            <dt>使用距離</dt>
                            <dd data-testid="technique-usable-ranges">
                              {presented.usableRangesLabel}
                            </dd>
                          </div>
                        ) : null}
                        {presented.mentalCostLabel !== null ? (
                          <div>
                            <dt>精神消費</dt>
                            <dd data-testid="technique-mental-cost">{presented.mentalCostLabel}</dd>
                          </div>
                        ) : null}
                        {presented.masteryLabel !== null ? (
                          <div>
                            <dt>熟練度</dt>
                            <dd data-testid="technique-mastery">{presented.masteryLabel}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {renderStatHistory(detail.statHistory)}

          <section className="dw-section" data-testid="person-detail-trainingHistory">
            <h3>修行履歴</h3>
            {detail.trainingHistory === null ? (
              <p data-empty="true">修行履歴はありません</p>
            ) : detail.trainingHistory.items.length === 0 ? (
              <p data-empty="true">修行の記録はまだありません</p>
            ) : (
              <ol className="dw-training-list">
                {detail.trainingHistory.items.map((item, index) => (
                  <li key={`training-${String(index)}`} className="dw-training-item">
                    <time className="dw-event-when">{formatWorldDateValue(item.worldDate)}</time>
                    <div
                      className="dw-training-result"
                      data-testid={`person-detail-training-result-${String(index)}`}
                    >
                      {trainingHistoryItemLabel(item)}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <DeveloperDetails testId="person-detail-developer-details">
            <p className="dw-sub" data-testid="person-detail-requested-id">
              personId={props.personId}
            </p>
            {props.uiRevision !== null ? (
              <p className="dw-sub" data-testid="person-detail-meta">
                uiRevision={String(props.uiRevision)}
              </p>
            ) : null}
            <dl className="dw-dl">
              <div>
                <dt>maxMental</dt>
                <dd>
                  {typeof detail.stats.spirit === "number"
                    ? `50 + spirit(${String(detail.stats.spirit)}) = ${String(50 + detail.stats.spirit)}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>durability note</dt>
                <dd>
                  戦闘中の耐久は試合開始時に算出される。人物に常時の currentDurability はない。
                </dd>
              </div>
              <div>
                <dt>personId</dt>
                <dd>{detail.personId}</dd>
              </div>
              <div>
                <dt>displayName</dt>
                <dd>{detail.displayName}</dd>
              </div>
              <div>
                <dt>lifeStatus</dt>
                <dd>{detail.lifeStatus}</dd>
              </div>
              <div>
                <dt>participationStatus</dt>
                <dd>{displayNull(detail.participationStatus)}</dd>
              </div>
              <div>
                <dt>careerStatus</dt>
                <dd>{detail.careerStatus}</dd>
              </div>
              <div>
                <dt>birthYear</dt>
                <dd>{String(detail.birthYear)}</dd>
              </div>
              <div>
                <dt>familyId</dt>
                <dd>{detail.familyId}</dd>
              </div>
              <div>
                <dt>lineageId</dt>
                <dd>{displayNull(detail.lineageId)}</dd>
              </div>
              <div>
                <dt>currentRank</dt>
                <dd>{displayNull(detail.currentRank)}</dd>
              </div>
              <div>
                <dt>highestRank</dt>
                <dd>{displayNull(detail.highestRank)}</dd>
              </div>
              <div>
                <dt>retirementRank</dt>
                <dd>{displayNull(detail.retirementRank)}</dd>
              </div>
              <div>
                <dt>learningFocusTechniqueId</dt>
                <dd>{displayNull(detail.learningFocusTechniqueId)}</dd>
              </div>
            </dl>
            <section data-testid="person-detail-techniques-dev">
              <h4>techniques (raw)</h4>
              <pre data-testid="developer-details-technique">
                {JSON.stringify(detail.techniques)}
              </pre>
            </section>
            <section data-testid="person-detail-trainingHistory-dev">
              <h4>trainingHistory (raw)</h4>
              <pre>{JSON.stringify(detail.trainingHistory)}</pre>
            </section>
            <section data-testid="person-detail-parentPersonIds">
              <h4>parentPersonIds</h4>
              {detail.parentPersonIds.length === 0 ? (
                <p data-empty="true">なし</p>
              ) : (
                <ul>
                  {detail.parentPersonIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              )}
            </section>
            <section data-testid="person-detail-formalMasterPersonIds">
              <h4>formalMasterPersonIds</h4>
              {detail.formalMasterPersonIds.length === 0 ? (
                <p data-empty="true">なし</p>
              ) : (
                <ul>
                  {detail.formalMasterPersonIds.map((id) => (
                    <li key={id}>{id}</li>
                  ))}
                </ul>
              )}
            </section>
            <section data-testid="person-detail-temporaryCondition">
              <h4>temporaryCondition</h4>
              <pre>{JSON.stringify(detail.temporaryCondition)}</pre>
            </section>
          </DeveloperDetails>
        </div>
      ) : null}
    </section>
  );
}
