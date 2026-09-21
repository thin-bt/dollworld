# Sprint 3 バックログ：師匠・門下・教授

- バックログバージョン: `S3-BACKLOG-0.1.3`
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
  - S03-008 **implemented**（教授技選択 + OTL **pure processor** published on `master` product；週次 runtime 閉ループは S03-009〜S03-011 および下記 **証跡表** の production/integration slices で canonical 受理済み）
  - **S03-010 implemented on canonical `master`**（生成技 materialization / catalog overlay — `SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1`）
  - **S03-009 implemented on canonical `master`**（OTL 週次 runtime 配線 — `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1` @ `b81df17`）
  - **S03-011 implemented on canonical `master`**（初使用 MatchId 永続化 — `SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1` @ `fbb83b1`）
- 実装順序の正本: S03-001 → S03-002 → … → S03-008 → S03-009 → S03-010 → S03-011（下表）
- **canonical product 受理**（独立監査 `SPRINT3-S03-026-FORMAL-CLOSE-EVIDENCE-AUDIT-B2-20260921-R1` @ `47bdb9b`）: 入門/資格、persisted 教授技選択 **consumption**、生成技 battle consumption、独自技 **loss** の production チェーンに **残存 product gap なし**（Sprint 4 着手不可）
- **formal release gate**（A-owned `SPRINT3-S03-025-ROOT-CHECK-TIMEOUT-CLOSURE-A-20260921-R1` **READY**）: root `npm run check` 全緑（`1889/1889`）；S03-024 の executor-timeout 差分は **環境/load 由来** と分類済み。**正式クローズラベル**は PM/制御面の次遷移待ち；本ファイル単独では Sprint 3 を `CLOSED` としない

## 目的

`docs/SPEC_PREPARATION_PLAN.md` §Sprint 3前（師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝）を、Sprint 1/2 と同様の受入可能なタスク列へ分解する。Sprint 2 視覚・大会 product baseline は維持する。

## スコープ正本（`技継承・独自技・失伝`）

- **権威**: `docs/SPEC_PREPARATION_PLAN.md` §Sprint 3前 は `技継承・独自技・失伝` を Sprint 3 準備対象とし、ミニ仕様完了条件（入力／出力／**状態更新**／処理順／設定／不変条件／対象外／受入テスト）を要求する。
- **解釈**: S03-008 pure processor に加え、週次研究値の **runtime 永続化**（S03-009）、生成技 **catalog 登録**（S03-010）、初使用 **MatchId**（S03-011）、および S03-012 以降の **integration/recovery 証跡**で production 閉ループが canonical `master` 上で受理されている（`docs/specs/15-sprint3-config-schema.md` §5 参照）。主表 S03-001..011 の **順序・スコープは拡張しない**。
- **Sprint 4 外**: 引退・遺伝・家系 lineage schema の拡張は Sprint 3 非目標（従来どおり）。
- **未完了の正本表現**: canonical `master` に実装が無い **主表 slice** のみ **pending / blocked** と記す。S03-012 以降 ID は **受入済み証跡**として下表に列挙し、新仕様の暗黙追加としない。

## 固定完了条件（Sprint 3 全体・将来）

- S03-001〜S03-011（主表）および受理済み production 証跡が canonical result と整合
- Sprint3Config／師弟ドメイン validation／canonical hash 契約が正本どおり
- 師匠資格閾値は config 化され、SPEC 本文にない数値をコードへ硬编码しない
- 週間 `teach`・入門 AI・Sprint 4 引退/遺伝 scope を混在させない
- root `npm run check` が成功する（release gate 証跡: S03-025）

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
| S03-008 | 教授技選択・OTL pure processor（published） | S03-007 |
| S03-009 | 独自技研究 runtime 永続化・週次蓄積・生成試行 production 配線 | S03-008 OTL slice — **implemented**（canonical `master` @ `b81df17`） |
| S03-010 | 生成技 stat 合成・TechniqueCatalog overlay 登録 | S03-008 — **canonical `master` implemented** |
| S03-011 | 初使用試合 MatchId の founding history 永続化 | S03-009 + S03-010 — **implemented**（canonical `master` @ `fbb83b1`） |

## Production / integration 受理証跡（主表外・S03-012 以降）

S03-001..011 の **計画順序を変更しない**。以下は canonical `master` 上で **result 証跡により accepted** とされた recovery/integration 作業のみ（S03-026 監査と整合）。

| ID | ドメイン（要約） | 代表 result（lane） | 受理 |
|---|---|---|---|
| S03-012 | Runtime entrypoint 統合 | `SPRINT3-S03-012-RUNTIME-ENTRYPOINT-INTEGRATION-A-20260921-R1` | **ACCEPT** |
| S03-013 | Live mentorship queue materialization | `SPRINT3-S03-013-LIVE-MENTORSHIP-QUEUE-MATERIALIZATION-A-20260921-R1` | **ACCEPT** |
| S03-014 | Live enrollment candidate materialization | `SPRINT3-S03-014-LIVE-ENROLLMENT-CANDIDATE-MATERIALIZATION-A-20260921-R1` | **ACCEPT** |
| S03-015 | 生成技 battle consumption（catalog overlay） | `SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1` | **ACCEPT** |
| S03-016 | Live master qualification 永続化/derivation | `SPRINT3-S03-016-LIVE-MASTER-QUALIFICATION-PERSISTENCE-ROLE3-20260921-R1` | **ACCEPT** |
| S03-017 | Sprint2 competitive record production 配線 | `SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1` | **ACCEPT** |
| S03-020 | OTL loss production 配線（週次） | `SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1` | **ACCEPT** |
| S03-021..022 | 教授技選択 persistence + live wiring | `SPRINT3-S03-022-LIVE-TEACHING-SELECTION-WIRING-A-20260921-R1` 他 | **ACCEPT** |
| S03-023 | Persisted selection **consumption**（explicit teach） | `SPRINT3-S03-023-LIVE-TEACHING-SELECTION-CONSUMPTION-A-20260921-R1` @ `47bdb9b` | **ACCEPT** |
| S03-024 | OTL loss production 境界 regression 完結 | `SPRINT3-S03-024-LIVE-TECHNIQUE-LOSS-CLOSURE-B2-20260921-R1` | **ACCEPT** |
| S03-025 | Root check timeout **分類**（product 変更なし） | `SPRINT3-S03-025-ROOT-CHECK-TIMEOUT-CLOSURE-A-20260921-R1`（**A-owned**） | **READY** — gate 証跡 |
| S03-026 | Formal-close 独立証跡監査 | `SPRINT3-S03-026-FORMAL-CLOSE-EVIDENCE-AUDIT-B2-20260921-R1` | **READY_FOR_FORMAL_CLOSE** |

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

SPEC 本文の教授方針・技段階・独自技研究値の **pure/config slice**（Sprint 4 引退/遺伝は対象外）。**状態を変える runtime 閉ループ**は S03-009〜S03-011（主表）および上記 **証跡表**（S03-012 以降）で追跡する；本 ID の受入は pure 関数契約が正本。

### 受入チェック（教授技選択 slice — published）

- `sprint3-balance-0.8.0` + `techniqueTeachingSelectionEnabled: true` + config-held `teachingSelection` policy
- Pure 関数 `evaluateTechniqueTeachingSelection` / `rankTeachableTechniqueCandidates` / `evaluateTeachingSelectionReEvaluationDue`（processor id `sprint3-technique-teaching-selection-0.1.0`）
- `teacherCanTeach`・前提技・S03-007 tier/refusal・`parent_temporary_guidance => basic only` を gate 境界で維持
- SPEC 評価配点・段階閾値・再評価トリガーを config 保持（コード直書きなし）
- `technique-teaching-selection` テスト（TS-001〜010）および CFG-013

### 受入チェック（独自技ライフサイクル slice — published）

- `sprint3-balance-0.9.0` + `originalTechniqueLifecycleEnabled: true` + config-held `originalTechniqueLifecycle` policy
- Pure 関数 `evaluateOriginalTechniqueGenerationAttempt` / `evaluateOriginalTechniqueLoss` / `buildOriginalTechniqueFoundingHistoryRecord`（processor id `sprint3-original-technique-lifecycle-0.1.0`）
- SPEC 研究閾値 180/320/550、生成成功率 20..80%、失敗時 80% 保持、24 週 cooldown、創始履歴・失伝判定を config 保持（コード直書きなし）
- `original-technique-lifecycle` テスト（OTL-001〜009）および CFG-014
- 既存 `technique-teaching-selection`（TS-001〜010）regression 維持

---

## S03-009 独自技研究 runtime 配線（B2 専任）

### 目的

S03-008 OTL pure processor を production 週次/world-step へ接続し、研究値・cooldown・生成試行 outcome を **run 永続状態**として更新する。ユーザー操作の追加はしない（自律進行維持）。

### 依存

S03-008 `originalTechniqueLifecycle` policy / `evaluateOriginalTechniqueGenerationAttempt` 契約。生成技 stat 合成・catalog 登録本体は **S03-010**（lane A）。本 slice では founding outcome の emit/record のみ（S03-009 task 正本どおり）。

### 実装状態

- **canonical `master`**: **implemented**（`original-technique-lifecycle-runtime-state.ts`、`processOriginalTechniqueLifecycleWeek`、`runSprint1WeeklyStep` 配線 — 証跡 `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1` @ `b81df17`）

### 受入チェック（概要）

- 決定的週次研究蓄積、閾値未満 no-attempt、試行成功/失敗と cooldown、founding history outcome、production world-step 呼び出しの focused テスト
- S03-008 OTL / Sprint1/Sprint2 regression 維持

---

## S03-010 生成技 materialization・catalog overlay

### 目的

S03-008/009 の生成成功 outcome から **config-held stat 合成**で `TechniqueDefinition` を materialize し、immutable base catalog を壊さず **runtime overlay** へ登録する。

### 依存

S03-008 founding history / generation outcome 型。**S03-009** 週次 runtime 配線は canonical `master` @ `b81df17` で公開済み。

### 実装状態

- **canonical `master`**: **implemented**（`sprint3-balance-0.10.0`、`materializeGeneratedTechniqueDefinition`、GTR-001..008 — 証跡 `SPRINT3-S03-010-PUBLICATION-RECOVERY-A-20260921-R1`）

### 受入チェック（published 証跡）

- `sprint3-balance-0.10.0` + `generatedTechniqueMaterialization` policy
- Pure 関数 `materializeGeneratedTechniqueDefinition`、overlay register/lookup、narrow `adapt-original-technique-generation-registration`
- `generated-technique-registration` テスト（GTR-001..008）および CFG-015
- 専用 school/lineage テーブル拡張・初使用 MatchId は **S03-011**

---

## S03-011 初使用試合 MatchId 永続化

### 目的

`OriginalTechniqueFoundingHistoryRecord` へ **初使用試合 MatchId** を battle-commit 経路で決定的に永続化する（SPEC 創始履歴の runtime 完結）。

### 依存

**S03-009** が canonical `master` に存在すること（`Sprint1RunRuntimeState` / weekly processor / `sprint3Config` 配線）。**S03-010** catalog overlay は前提。

### 実装状態

- **canonical `master`**: **implemented**（`persist-original-technique-first-use-match-id.ts`、`commitRunBattlePlan` hook — 証跡 `SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1` @ `fbb83b1`）

### 受入チェック（概要）

- `persist-original-technique-first-use-match-id` + `commitRunBattlePlan` hook
- `original-technique-first-use-match-id` テスト（FUM-001..005）
