---
title: 週間訓練・習得の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/10-training-and-learning.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/09-technique-system.md
  - commit:530e3f88d054eec11840e2e54743bf4c9a705654
last_verified: 2026-08-22
related:
  - character-growth.md
  - ../glossary/techniques-and-mastery.md
  - ../architecture/sprint1-processing-flow.md
  - ../tasks/S01-004.md
---

# 週間訓練・習得の不変条件

## 概要

10・14（および関連する 09）を根拠とする週間行動の索引。

## 現在確定している内容

- 週間行動の対象と種類（訓練・技習得・技練習・休養など。列挙の正本は 10）
- 行動選択と処理の順序は 10 に従う
- 同一入力・同一 RNG 状態で決定的に一致する
- 入力改ざんや不正値を暗黙補正しない
- Sprint 1 で扱わない大会日程等を週間処理へ混入しない（10 の対象外）
- `S1-SPEC-0.1.12`で明文化: 強制休養は`severe_injury`／`fatigue_threshold`のみ（`unableToContinueThreshold`は戦闘専用）
- rest fallback reasons・scoreHundredths整数式・TrainingProcessorRuntimeState・event責務順は 10／14 を正とする
- S01-004で週間処理を実装済み。Sprint1 transactional adapterへのproduction配線はS01-008でimplemented / accepted。legacy WorldProcessor配列へweekly-trainingは登録しない

### S01-004実装で固定された不変条件

- 行動scoreと目標scoreは整数 `scoreHundredths`。丸めは常に `Math.floor`（−∞方向）
- 係数積は `multiplyBasisPointsFloor` による BigInt 厳密積で、`10000^n` による一括 floor を1回だけ行う
- 効果乱数は `drawInclusiveBasisPoints`（`nextInt(minBp, maxBp + 1)`）でBP整数のみを引く
- RNG消費: 強制休養・休養・inactive・acquirable習得は 0 回。tie発生時のみ選択で 1 回。訓練／学習進捗／練習の効果で 1 回
- 週開始スナップショットを凍結し、`teacherCanTeach` や弟子参照は同一週内の更新結果を見ない
- 1人でも hard failure なら週全体を失敗させ、入力・runtimeState・RNG状態を変更しない
- 同一週再処理と週番号逆行を拒否する（`absoluteWeek <= lastProcessedAbsoluteWeek` は failure）
- inactive人物は更新もイベントもカウントも行わない
- イベントはcandidateのみで、`eventId`／`simulationId`／`sequence` を持たない
- inactiveを含む全人物に有効な`Sprint1PersonState`を必須（欠落は週全体failure）
- 週開始時に`normalizeWeeklyLearningFocus`でfocus維持条件を評価し、不成立なら解除（RNG・独立イベントなし）
- effect適用後に`validateProcessedWeeklyPersonRecord`で人物構造／一時状態／remainder／Sprint1PersonState／catalog意味整合を再検証
- `rngState`は`validateSeededRngState`でdescriptor-safeに検証してからimportする
- 正式訓練対象は`isFormalTrainingEligible`（年齢8..41）。年齢0..7／`child`／`retired`／42歳以上は `10-training-and-learning.md` §3.0 の**週間行動パイプライン非適格**（週間rest参加者ではない。Planner／候補／RNG／`training.action_selected`／通常週間訓練action履歴へ入らない）
- `TechniqueTargetContext.teacherCanTeachContext.masterCareerStatus`は`teacherCanTeach`と同一のCareerStatus列挙（`child`／`trainee`／`active_competitor`／`retired`）で検証する
- package rootは`processWeeklyTrainingWeek`／RuntimeState／選択APIを公開し、内部draft・effect・commit前validatorは公開しない
- `technique.learning_progressed`は`unit: "tenths"`、`technique.mastery_increased`は`unit: "hundredths"`を必須で持つ。`technique.acquired`にはunit／before／afterを付けない

詳細なスコア式・係数は 10・14 を読むこと。

## 関連する正本

- [`docs/specs/10-training-and-learning.md`](../../specs/10-training-and-learning.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/09-technique-system.md`](../../specs/09-technique-system.md)

## 関連するコード

S01-003で実装した純粋候補判定入口（これら自身は週間更新・RNG・イベントを行わない。週間production処理はS01-004、WorldEngine接続はS01-008でaccepted）:

- `evaluateTechniqueAcquisitionConditions`
- `deriveLearningTargetStatus`
- `deriveRequiredStatsFactor`
- `selectMasteryCurrentValueFactor`
- `teacherCanTeach`

実装ファイル: `packages/simulation-core/src/sprint1/technique-*.ts`

S01-004の週間Planner・progress／mastery実更新・RNG・訓練イベントcandidate:

- `packages/simulation-core/src/sprint1/weekly-actions.ts`
- `packages/simulation-core/src/sprint1/weekly-planner-context.ts`
- `packages/simulation-core/src/sprint1/weekly-training-types.ts`
- `packages/simulation-core/src/sprint1/weekly-action-scores.ts`
- `packages/simulation-core/src/sprint1/weekly-target-selection.ts`
- `packages/simulation-core/src/sprint1/weekly-training-effects.ts`
- `packages/simulation-core/src/sprint1/training-processor-runtime-state.ts`
- `packages/simulation-core/src/sprint1/multiply-basis-points.ts`
- `packages/simulation-core/src/sprint1/weekly-person-structure.ts`
- `packages/simulation-core/src/sprint1/validate-seeded-rng-state.ts`
- `packages/simulation-core/src/sprint1/process-weekly-training-week.ts`

## 関連するテスト

- `packages/simulation-core/src/sprint1-technique-catalog.test.ts`（習得条件・derived status 等）
- `packages/simulation-core/src/sprint1-weekly-training.test.ts`（週間行動・目標選択・効果・週処理）

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)

## 未解決事項

EventEnvelope化とSprint1 transactional weekly adapter配線はS01-008でproduction実装済み（accepted）。S01-009はimplemented / accepted（実装commit `5616f5f`、status docs `5a80268`）。Sprint 1: **COMPLETE**。clean master final verify: PASSED on `5a80268`。completion tag: `sprint1-complete` (annotated) → `5a80268`。本docs更新は tag 作成後の post-completion status synchronization（tagは動かさない）。

## 関連Wikiページ

- [character-growth.md](character-growth.md)
- [../glossary/techniques-and-mastery.md](../glossary/techniques-and-mastery.md)
- [../architecture/sprint1-processing-flow.md](../architecture/sprint1-processing-flow.md)
- [../tasks/S01-004.md](../tasks/S01-004.md)
