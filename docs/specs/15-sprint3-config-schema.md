# 15 Sprint 3共通設定スキーマ付録（S03-001）

- 仕様版: `S3-SPEC-0.3.0-draft`
- 状態: 師匠・門下・教授の後続スライスが参照する型付き設定の最小固定構造
- 対象: 入門年齢境界、門下人数係数、師匠資格ポリシー識別、後続機能フラグ
- 非対象: 師匠資格のランク／戦績閾値、8歳入門AI、週間`teach`行動、技継承処理本体

## 1. 目的

`docs/SPEC.md` §師匠資格と門下制度および `docs/specs/09-technique-system.md`／`docs/specs/10-training-and-learning.md` の Sprint 3 予約事項について、実装者が独自キー・単位・既定値を作らないよう S03-001 で共通構造を固定する。

```text
Sprint3Config
- schemaVersion
- configVersion
- enrollment
- teachingEfficiency
- masterQualification
- mentorshipFeatures
```

- 未知キーは拒否する
- 必須キー欠落を暗黙補完しない
- 師匠資格の**具体的合格基準**（ランク・勝数・王座等）は `docs/SPEC.md` どおりバランス調整項目のため、S03-001 では `masterQualification.evaluationPolicyVersion` のみを保持し、数値閾値フィールドを設けない（S03-002 で `master-qualification-rank-and-records-0.1.0` ポリシーと `eligibilityThresholds` を追加）
- 同じ `configVersion` の canonical 内容は不変（Sprint1/2 と同契約）

### 1.1 設定識別

`configHash` は完全な Sprint3Config を canonical JSON 化した SHA-256 とする（実装: `computeSprint3ConfigHash`）。

### 1.2 Sprint 3 版レジストリ（S03-001 初期値）

| 対象 | 初期値 |
|---|---|
| Sprint3Config.schemaVersion | `0.1.0` |
| Sprint3Config.configVersion | `sprint3-balance-0.1.0` |
| masterQualification.evaluationPolicyVersion | `master-qualification-deferred-0.1.0`（`sprint3-balance-0.1.0`） |
| Sprint3Config.configVersion（S03-002 資格閾値付き） | `sprint3-balance-0.2.0` |
| masterQualification.evaluationPolicyVersion（0.2.0） | `master-qualification-rank-and-records-0.1.0` |
| Sprint3Config.configVersion（S03-003 入門 AI 有効） | `sprint3-balance-0.3.0` |
| Sprint3Config.configVersion（S03-004 門下受入自律上限） | `sprint3-balance-0.4.0` |
| masterIntake.evaluationPolicyVersion（0.4.0） | `master-intake-autonomous-limit-0.1.0` |
| Sprint3Config.configVersion（S03-005 週間門下人数係数） | `sprint3-balance-0.5.0` |
| Sprint3Config.configVersion（S03-006 親一時指導週間係数） | `sprint3-balance-0.6.0` |

## 2. セクション定義

### 2.1 enrollment

`docs/SPEC.md` の幼少期影響（0〜7歳）と正式入門（8歳〜）境界。

| キー | 意味 |
|---|---|
| childhoodInfluenceMaxAge | 親による幼少期影響の上限年齢（含む） |
| formalEnrollmentMinAge | 正式入門・師匠決定の下限年齢 |
| parentTemporaryGuidanceAllowed | 正式師匠不在時の親一時指導を許可するか |

不変条件: `formalEnrollmentMinAge === childhoodInfluenceMaxAge + 1`。

### 2.2 teachingEfficiency

`docs/SPEC.md` の門下人数係数表および「資格なし親」係数（0.75）を固定小数 `factorTenThousandths`（10000 = 1.00）で保持する。

- `discipleCountFactorBrackets` は `minDisciplesInclusive` 昇順で隙間・重複なく連続すること
- 先頭 bracket の `minDisciplesInclusive` は 1

### 2.3 masterQualification

| evaluationPolicyVersion | 意味 |
|---|---|
| `master-qualification-deferred-0.1.0` | S03-001 互換。`sprint3-balance-0.1.0` のみ。閾値オブジェクトなし。評価関数は fail-closed。 |
| `master-qualification-rank-and-records-0.1.0` | S03-002。`eligibilityThresholds` 必須。 |

`eligibilityThresholds`（`master-qualification-rank-and-records-0.1.0` のみ）:

| キー | 意味 |
|---|---|
| minimumRetirementRank | 引退時ランクの下限（含む）。`docs/SPEC.md` の最高到達ランク要素。 |
| minimumOfficialWins | 公式戦勝利数下限（総合・通常大会等の集計）。 |
| minimumLimitedOfficialWins | 限定戦勝利数下限（`winsByTournamentKind.limited` 相当）。 |
| minimumTournamentTitles | 優勝・王座相当タイトル数下限。 |

数値はすべて config 保持。評価 pure 関数 `evaluateMasterQualificationEligibility` は引退後（`careerStatus=retired`）かつ存命のみ合格し得る。

### 2.4 masterIntake（S03-004、`sprint3-balance-0.4.0` のみ必須）

| evaluationPolicyVersion | 意味 |
|---|---|
| `master-intake-deferred-0.1.0` | S03-001〜003 互換。`masterIntake` キーなし。評価関数は fail-closed。 |
| `master-intake-autonomous-limit-0.1.0` | S03-004。`limitFormula` と `deferApplicantAptitudeThreshold` 必須。 |

`limitFormula` は師匠 traits から **師匠ごと** の `autonomousMaxDisciples` を決定的に算出する（世界共通固定上限なし）。`currentFormalDiscipleCount` が上限未満なら `accept`、上限到達かつ高適性 applicant なら `defer`、それ以外は `reject`。

### 2.5 mentorshipFeatures

後続スライスの機能ゲート。S03-001 では `explicitWeeklyTeachActionEnabled=true` を拒否。S03-003 以降 `enrollmentAssignmentAiEnabled=true` を受理（`sprint3-balance-0.3.0`）。S03-007 で `explicitWeeklyTeachActionEnabled=true` を `sprint3-balance-0.7.0` のみ受理。

| キー | 意味 |
|---|---|
| explicitWeeklyTeachActionEnabled | 週間 `teach` 行動（09/10 Sprint 3 予約） |
| enrollmentAssignmentAiEnabled | 8歳師匠決定 AI（`docs/SPEC.md` world step 4） |
| weeklyTrainingDiscipleCountTeachingEfficiencyEnabled | S03-005。`true` のとき週間訓練成果へ `teachingEfficiency` 門下人数 bracket を適用（`sprint3-balance-0.5.0`〜`0.7.0` のみ `true` 可） |
| weeklyTrainingParentTemporaryGuidanceEnabled | S03-006。`true` のとき `parent_temporary_guidance` 週間 `train_stat` へ `parentTemporaryGuidanceFactorTenThousandths` を適用（`sprint3-balance-0.6.0` / `0.7.0` のみ `true` 可） |

### 2.6 weeklyTeachAction（S03-007、`sprint3-balance-0.7.0` のみ必須）

| evaluationPolicyVersion | 意味 |
|---|---|
| `weekly-teach-action-explicit-0.1.0` | S03-007。教授評価 weight・段階別 refusal 閾値・週間指導人数 `allocationFormula` を config 保持。 |

Pure 関数 `evaluateExplicitWeeklyTeachAction` は師匠が週間 `teach` を選択した週のみ受理し、門下リクエストを allocation 上限まで決定的に処理する（世界状態 mutation は後続 adapter）。

### 3.5 S03-007 explicit weekly teach processor I/O

- Processor id: `sprint3-explicit-weekly-teach-0.1.0`
- Pure 関数: `evaluateExplicitWeeklyTeachAction(config, record, techniqueDefinitionsById)` → `ExplicitWeeklyTeachActionOutcome`
- Refusal 補助: `evaluateWeeklyTeachRefusal`（09 §8.1 `teacherCanTeach` + config tier 閾値 + 親一時指導 tier cap）
- Allocation: `computeWeeklyTeachingAllocationSlots`（config `allocationFormula` のみ）

### 3.3 S03-005 weekly training teachingEfficiency binding

- Binding id: `sprint3-weekly-training-disciple-count-0.1.0`
- Optional input: `processWeeklyTrainingWeek` / Sprint1 weekly adapter `sprint3Config`
- `discipleCount === 0` は Sprint1 同様 neutral 1.00（10000 basis points）
- `discipleCount >= 1` は validated `discipleCountFactorBrackets` から決定的に factor を選択

### 3.4 S03-006 parent temporary guidance weekly binding

- Binding id: `sprint3-weekly-training-parent-temporary-guidance-0.1.0`
- Optional input: `processWeeklyTrainingWeek` / Sprint1 weekly adapter `sprint3Config` + person record `mentorshipRelationKind`
- `parent_temporary_guidance` かつ `enrollment.parentTemporaryGuidanceAllowed` のとき `train_stat` 師匠係数に `parentTemporaryGuidanceFactorTenThousandths` を使用
- `formal_master_disciple` / `parent_master_disciple` では Sprint1 `teacherFactorKey` を優先（一時指導を正式師匠関係と混同しない）

## 3. ドメイン型境界（config 外）

`MentorshipRelationKind` および `ExplicitWeeklyTeachActionContract` は `packages/simulation-core` の公開型として S03-001 で固定する。

### 3.1 S03-003 enrollment assignment processor I/O

- Processor id: `sprint3-enrollment-assignment-0.1.0`
- Pure 関数: `evaluateEnrollmentAssignment(config, record)` → `EnrollmentAssignmentOutcome`
- 入力 `EnrollmentAssignmentRecord`: 子の年齢、特別理由、師匠候補（資格 record + スコア + **S03-004 境界** `intakeAcceptance`）
- 出力 kind: `not_at_enrollment_boundary` / `parent_master_assigned` / `formal_master_assigned` / `parent_temporary_guidance` / `no_eligible_or_accepted_master`
- 世界状態は変更しない（師弟関係の永続化は後続 WorldEngine 統合）

### 3.2 S03-004 master intake processor I/O

- Processor id: `sprint3-master-intake-0.1.0`
- Pure 関数: `evaluateMasterIntakeDecision(config, record)` → `MasterIntakeEvaluationOutcome`
- 出力 `acceptance` は S03-003 候補 `intakeAcceptance` へそのまま渡せる
- 世界状態は変更しない

## 4. 独自技 runtime 閉ループ境界（Sprint 3 正本）

`docs/SPEC_PREPARATION_PLAN.md` §Sprint 3前 の `技継承・独自技・失伝` は、pure processor だけでなく **週次/world-step による状態更新**まで Sprint 3 完了境界に含む。Sprint 4 引退・遺伝 processor は対象外。

| Backlog | configVersion（代表） | 役割 | canonical `master` |
|---|---|---|---|
| S03-008 OTL pure | `sprint3-balance-0.9.0` | 閾値・RNG 試行・失伝・創始履歴 **pure** | published |
| S03-009 runtime wiring | （B2 task 正本） | 研究値/cooldown **永続**、週次蓄積、production 配線 | published（`b81df17`） |
| S03-010 materialization | `sprint3-balance-0.10.0` | 生成技 stat 合成・catalog **overlay** | published |
| S03-011 first-use MatchId | （S03-011 task 正本） | battle-commit 経路の初使用試合 ID | published（`fbb83b1`） |

S03-001〜007 の `mentorshipFeatures` ゲート契約は変更しない。S03-010 `generatedTechniqueMaterialization` は S03-008 OTL と同様 config-held 数値のみ（SPEC 本文数値の硬编码禁止）。

## 5. 参照

- `docs/SPEC.md` §師匠資格と門下制度
- `docs/specs/09-technique-system.md` §教授（Sprint 3 予約）
- `docs/specs/10-training-and-learning.md`（`teach` / `retired` 週間パイプライン予約）
- `docs/SPRINT_3_BACKLOG.md` S03-001、S03-008〜S03-011
