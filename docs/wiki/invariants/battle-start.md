---
title: 戦闘開始の不変条件
status: current
authority: explanatory
scope: sprint1
sources:
  - docs/specs/11-battle-state.md
  - docs/specs/08-character-growth.md
  - docs/specs/14-sprint1-config-schema.md
  - docs/specs/00-domain-glossary.md
  - commit:3b313a5ea690351d062e751bc724e5530b835872
  - commit:60d5b6b821983b047debd51bccc43389d363f953
last_verified: 2026-08-07
related:
  - battle-turn-resolution.md
  - ../architecture/battle-lifecycle.md
  - ../glossary/abilities-and-aptitudes.md
---

# 戦闘開始の不変条件

## 概要

11 を根拠とする戦闘開始前検証と初期リソースの索引。

## 現在確定している内容

### MatchId（S1-SPEC-0.1.13）

- 形式: `match_<12桁の0埋め10進数>`（`^match_[0-9]{12}$`、数値 `1..999999999999`）
- `MatchIdGeneratorState.schemaVersion` `0.1.0`（schemaVersion／generatorVersion／namespace／seed／nextSequence）
- fresh `nextSequence=1`、枯渇sentinel `1000000000000`
- seedはstate hashへ使用し、MatchId文字列へは混ぜない
- 一意性は `(simulationId, matchId)`。異なるrunで同じ文字列を許可
- MatchId操作でRNGを消費しない。構造不正なstateではSha256Providerを1回も呼ばない
- S01-005でproduction実装済み。`reserveNextMatchId` はpackage rootへ公開しない

### 初期リソース

```text
baseMaxDurability = 100 + stamina
maxDurability     = baseMaxDurability
maxMental         = 50 + spirit
```

開始耐久補正は基準点整数で計算し、`startDurabilityPercentBasisPoints`（percent × 10000）として保持する。`currentDurability` は下限1で切り捨てる。

### currentMental

- 整数必須
- `0..maxMental` 必須
- 範囲外・非整数・欠落は `StartBattleResult` failure
- 正常値は変更せず BattleParticipantSnapshot へコピーする
- clamp による補正は禁止
- failure 時に World RNG と MatchIdGeneratorState を消費しない

### その他の開始不可・拒否例（11）

- deceased／waiting／stopped 等
- 年齢整合性・戦闘種別の年齢条件外
- 負傷度が続行不能閾値以上
- 重複 TechniqueId
- 不正間合い
- 同一 PersonId
- 元 World 人物を変更せず snapshot 化すること

列挙の完全な正本は 11 の入力検証節である。

負傷の続行不能判定は `config.battle.injury.unableToContinueThreshold` を使用する。週次強制休養の閾値とは別物であり、混同しない。

### 未commit開始計画

- 成功時のみ World RNG を `battleSeed` 取得の1回だけ進める
- 進行後の World RNG 状態と MatchIdGeneratorState は1つの `StartBattleRuntimeTransition`（schemaVersion `0.1.0`）に封入する
- `transitionHash` は自身を除く全項目のcanonical JSON SHA-256
- expected state hash 不一致、片方だけのcommit、二重適用は拒否する
- 失敗時は `battleState`／`runtimeTransition`／イベント候補をすべて `null` とし、両runtime状態を入力と完全一致させる

## 関連する正本

- [`docs/specs/11-battle-state.md`](../../specs/11-battle-state.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

- `packages/simulation-core/src/sprint1/match-id-generator.ts`
- `packages/simulation-core/src/sprint1/battle-participant.ts`
- `packages/simulation-core/src/sprint1/battle-state.ts`
- `packages/simulation-core/src/sprint1/start-battle-runtime-transition.ts`
- `packages/simulation-core/src/sprint1/start-battle-transaction.ts`（内部）

## 関連するテスト

- `packages/simulation-core/src/sprint1-battle-start.test.ts`
- `packages/simulation-core/src/sprint1-spec-0.1.13-match-id-generator-contracts.test.ts`（仕様契約）

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

`BattleFailureInfo.severity` と `code` の語彙は11仕様が固定していない。実装は非空文字列として受理する。

## 関連Wikiページ

- [battle-turn-resolution.md](battle-turn-resolution.md)
- [../architecture/battle-lifecycle.md](../architecture/battle-lifecycle.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
