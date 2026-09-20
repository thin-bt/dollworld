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

### 2.4 mentorshipFeatures

後続スライスの機能ゲート。S03-001 では両方 `false` のみ受理する。

| キー | 意味 |
|---|---|
| explicitWeeklyTeachActionEnabled | 週間 `teach` 行動（09/10 Sprint 3 予約） |
| enrollmentAssignmentAiEnabled | 8歳師匠決定 AI（`docs/SPEC.md` world step 4） |

## 3. ドメイン型境界（config 外）

`MentorshipRelationKind` および `ExplicitWeeklyTeachActionContract` は `packages/simulation-core` の公開型として S03-001 で固定する。永続化・processor I/O は後続タスク。

## 4. 参照

- `docs/SPEC.md` §師匠資格と門下制度
- `docs/specs/09-technique-system.md` §教授（Sprint 3 予約）
- `docs/specs/10-training-and-learning.md`（`teach` / `retired` 週間パイプライン予約）
- `docs/SPRINT_3_BACKLOG.md` S03-001
