# Sprint 3 バックログ：師匠・門下・教授

- バックログバージョン: `S3-BACKLOG-0.1.0`
- 対象ゲーム仕様: `SPEC-0.1.3`（師匠・門下テーマ）
- 対象 Sprint 3 ミニ仕様: `S3-SPEC-0.3.0-draft`（`docs/specs/15-sprint3-config-schema.md`）
- 実装状態:
  - **S03-001 implemented**（`SPRINT3-FIRST-SLICE-AUTHORITY-AND-IMPLEMENTATION-A-20260920-R1`）
  - **S03-002 implemented**（`SPRINT3-S03-002-MASTER-QUALIFICATION-A-20260920-R1`）
  - **S03-003 implemented**（`SPRINT3-S03-003-ENROLLMENT-A-20260920-R1`）
  - **S03-004 implemented**（`SPRINT3-S03-004-INTAKE-A-20260920-R1`）
  - **S03-005 implemented**（`SPRINT3-S03-005-TEACHING-EFFICIENCY-A-20260920-R1`）
  - **S03-006 implemented**（`SPRINT3-S03-006-PARENT-TEMP-GUIDANCE-A-20260920-R1`）
  - S03-007 **implemented**（`master` product）
  - S03-008 **教授技選択 slice published**（`master` product）— **独自技研究・生成・失伝 remaining**
- 実装順序の正本: S03-001 → S03-002 → S03-003 → …（下表）

## 目的

`docs/SPEC_PREPARATION_PLAN.md` §Sprint 3前（師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝）を、Sprint 1/2 と同様の受入可能なタスク列へ分解する。Sprint 2 視覚・大会 product baseline は維持する。

## 固定完了条件（Sprint 3 全体・将来）

- S03-001〜最終受入タスクが accepted
- Sprint3Config／師弟ドメイン validation／canonical hash 契約が正本どおり
- 師匠資格閾値は config 化され、SPEC 本文にない数値をコードへ硬编码しない
- 週間 `teach`・入門 AI・Sprint 4 引退/遺伝 scope を混在させない
- `npm run check` が成功する

## タスク一覧

| ID | タスク | 依存 |
|---|---|---|
| S03-001 | Sprint 3 設定・師弟ドメイン validation 基盤 | なし |
| S03-002 | 師匠資格評価（config 閾値・引退後判定） | S03-001 |
| S03-003 | 8歳入門・師匠決定 AI / processor 契約 | S03-001、S03-002 |
| S03-004 | 門下受入上限・師匠自律判断 | S03-001 |
| S03-005 | 門下人数係数の週間訓練パイプライン接続 | S03-001、S01-004 既存契約 |
| S03-006 | 親一時指導（正式師匠不在） | S03-001、S03-003 |
| S03-007 | 明示的週間 `teach` 行動・教授拒否 | S03-001、09/10 契約 — **implemented** |
| S03-008 | 教授技選択（published）・技継承・独自技/失伝（**remaining**） | S03-007 |

## S03-001 Sprint 3 設定・師弟ドメイン validation 基盤

### 目的

後続の師匠資格・入門・教授実装が参照する `Sprint3Config`、validation、canonical hash、および師弟関係・`teach` 境界型を最小限で公開する。

### スコープ

- `docs/specs/15-sprint3-config-schema.md`
- `packages/simulation-core/src/sprint3/**`
- 公開 export（`@dollworld/simulation-core` index）

### 入力

- JSON オブジェクト（Sprint3ConfigInput 形状）
- `Sha256Provider`（hash 計算時）

### 出力

- 検証済み frozen `Sprint3Config`
- `configHash`（canonical JSON SHA-256）

### 非目標

- 師匠資格のランク/戦績閾値の数値定義
- 8歳師匠決定ロジック、WorldEngine 統合
- 週間 `teach` planner/processor 実装
- SimulationIdentity / RunRuleSnapshot への Sprint3 hash バインド（後続）

### 受入チェック

- 既定 `sprint3-balance-0.1.0` が validate され stable hash を返す
- 未知 root キー・bracket 非連続・ enrollment 年齢不整合を拒否
- `mentorshipFeatures` の deferred 機能を `true` にできない
- `npm run check` 成功

---

## S03-002 師匠資格評価（config 閾値・引退後判定）

### 目的

`docs/SPEC.md` の「一定以上の公式成績」を config 閾値として表現し、引退後の師匠資格付与判定 pure 関数を実装する。

### 非目標

- 門下受入 AI、週間教授

### 受入チェック（概要）

- 閾値変更は新 `configVersion` のみ
- 閾値未設定 config を受理しない（S03-001 deferred policy からの移行）
- `sprint3-balance-0.2.0` + `evaluateMasterQualificationEligibility` テスト（MQ-001〜010）

---

## S03-003 8歳入門・師匠決定

### 目的

`docs/SPEC.md` world step 4 / §8歳時の師匠決定の processor I/O と決定的 AI 規則。

### 依存

S03-002（師匠資格フラグ）、S03-004（受入上限）と整合。

### 受入チェック（概要）

- `formalEnrollmentMinAge` 到達時のみ評価（それ以外は `not_at_enrollment_boundary`）
- S03-002 合格かつ `intakeAcceptance=accept` の師匠のみ選択候補（世界共通固定上限なし）
- 親デフォルト / 特別理由時の非親師匠 / 親一時指導 / 割当不能を outcome kind で明示
- `sprint3-balance-0.3.0` + `evaluateEnrollmentAssignment` テスト（EN-001〜010）

---

## S03-004 門下受入上限

### 目的

師匠ごとの自律的上限設定・拒否/保留の状態機械（世界共通固定上限なし）。

### 受入チェック（概要）

- `sprint3-balance-0.4.0` + `masterIntake` 自律上限 formula（config 保持、コード直書きなし）
- Pure 関数 `evaluateMasterIntakeDecision` → `accept` / `reject` / `defer`（S03-003 `intakeAcceptance` へ供給）
- 師匠ごとに上限が異なり、世界共通固定門下上限は導入しない
- `evaluateMasterIntakeDecision` テスト（IN-001〜010）および CFG-009

---

## S03-005 門下人数係数の週間接続

### 目的

S03-001 `teachingEfficiency` を Sprint 1 週間訓練成果計算へ接続（既存 Sprint 1 係数契約を破壊しない）。

### 受入チェック（概要）

- `sprint3-balance-0.5.0` + `weeklyTrainingDiscipleCountTeachingEfficiencyEnabled: true`
- `processWeeklyTrainingWeek` / `applyTrainStat` / `applyLearnTechniqueProgressing` が optional `sprint3Config` 绑定時に `teachingEfficiency.discipleCountFactorBrackets` を門下人数係数として適用（未绑定時は Sprint1 `growth.discipleCountFactors` 維持）
- Pure 関数 `selectDiscipleCountTeachingEfficiencyFactor`、binding id `sprint3-weekly-training-disciple-count-0.1.0`
- `teaching-efficiency-weekly` テスト（TE-001〜010）および CFG-010

---

## S03-006 親一時指導

### 目的

正式師匠不在時の親指導と、後の正式入門への移行境界。

### 受入チェック（概要）

- `sprint3-balance-0.6.0` + `weeklyTrainingParentTemporaryGuidanceEnabled: true`
- `mentorshipRelationKind=parent_temporary_guidance` かつ正式師匠なしの週間 `train_stat` で `teachingEfficiency.parentTemporaryGuidanceFactorTenThousandths` を師匠係数として適用（正式師匠 kind では Sprint1 `teacherFactorKey` 優先）
- 未绑定時は Sprint1 師匠係数契約を維持
- Pure 関数 `selectWeeklyTrainingTeacherFactorBasisPoints`、binding id `sprint3-weekly-training-parent-temporary-guidance-0.1.0`
- `parent-temporary-guidance-weekly` テスト（PTG-001〜010）および CFG-011

---

## S03-007 明示的週間 `teach`

### 受入チェック（概要）

- `sprint3-balance-0.7.0` + `explicitWeeklyTeachActionEnabled: true` + `weeklyTeachAction` policy body
- Pure 関数 `evaluateExplicitWeeklyTeachAction` / `evaluateWeeklyTeachRefusal` / `computeWeeklyTeachingAllocationSlots`（processor id `sprint3-explicit-weekly-teach-0.1.0`）
- 09 §8.1 静的 `teacherCanTeach`、docs/SPEC.md 教授評価配点・段階閾値を config 保持（コード直書きなし）
- 親一時指導は `basic` tier のみ（正式伝承境界）
- `explicit-weekly-teach` テスト（WT-001〜010）および CFG-012

---

## S03-008 教授技選択・継承・独自技/失伝

### 目的

SPEC 本文の教授方針・技段階・独自技研究値の Sprint 3 実装残（Sprint 4 引退/遺伝は対象外）。

### 受入チェック（教授技選択 slice — published）

- `sprint3-balance-0.8.0` + `techniqueTeachingSelectionEnabled: true` + config-held `teachingSelection` policy
- Pure 関数 `evaluateTechniqueTeachingSelection` / `rankTeachableTechniqueCandidates` / `evaluateTeachingSelectionReEvaluationDue`（processor id `sprint3-technique-teaching-selection-0.1.0`）
- `teacherCanTeach`・前提技・S03-007 tier/refusal・`parent_temporary_guidance => basic only` を gate 境界で維持
- SPEC 評価配点・段階閾値・再評価トリガーを config 保持（コード直書きなし）
- `technique-teaching-selection` テスト（TS-001〜010）および CFG-013

### 残スコープ（未実装・Sprint 3 内 follow-up）

- 独自技研究・生成・失伝（研究 180/320/550、生成成功率 20..80%、失敗時 80% 保持、24 週 cooldown、履歴要件）
