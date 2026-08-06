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
- S01-005実装は未着手（契約テストのみ）

### 初期リソース

```text
baseMaxDurability = 100 + stamina
maxMental = 50 + spirit
```

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

## 関連する正本

- [`docs/specs/11-battle-state.md`](../../specs/11-battle-state.md)
- [`docs/specs/08-character-growth.md`](../../specs/08-character-growth.md)
- [`docs/specs/14-sprint1-config-schema.md`](../../specs/14-sprint1-config-schema.md)
- [`docs/specs/00-domain-glossary.md`](../../specs/00-domain-glossary.md)

## 関連するコード

該当なし（戦闘開始Processorは未実装。MatchId生成器production実装も未着手。S01-001〜004は実装済み）。

## 関連するテスト

- `packages/simulation-core/src/sprint1-spec-0.1.13-match-id-generator-contracts.test.ts`（仕様契約のみ）

## 関連する判断

- [../decisions/sprint1-spec-baseline.md](../decisions/sprint1-spec-baseline.md)
- [../decisions/sprint1-identity-and-config.md](../decisions/sprint1-identity-and-config.md)

## 未解決事項

該当なし。

## 関連Wikiページ

- [battle-turn-resolution.md](battle-turn-resolution.md)
- [../architecture/battle-lifecycle.md](../architecture/battle-lifecycle.md)
- [../glossary/abilities-and-aptitudes.md](../glossary/abilities-and-aptitudes.md)
