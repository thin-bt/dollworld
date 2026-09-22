# dollworld Project Roadmap

authority: coordination-only
owner: PM / ChatGPT
updatedAt: 2026-09-07T16:47:00+09:00

## 目的

このファイルは、dollworld を複数の ChatGPT スレッド、Role 1 / 2 / 3、Cursor、Claude 等で並行して進める際に、**プロジェクト全体の大目的・大工程・順序・依存関係・現在地・Sprint 完了条件を共有し、局所作業だけを見て全体目的を失わないための固定ロードマップ**である。

このファイルは人間にも読めるが、主用途は **PM / エージェントの上位工程判断** である。

詳細仕様、受入条件、実装内容、Git 状態、live task state の正本ではない。

- 実装・Git 管理契約の正本: Git + accepted current spec/freeze
- Role の現在仕事/結果: `audit/assignments/ROLE*_CURRENT.md` / `ROLE*_OUTBOX.md`
- Cursor の現在仕事/結果: Cursor Inbox / Active controls
- 運用ルール: `AUDIT_HANDOFF_PROTOCOL.md` -> `protocol/CONTROL_RULE_INDEX.md` -> Rule ID owner
- thread 再開用 snapshot: `audit/handoff/*.md`

**CURRENT / OUTBOX は「今何をするか」を示す。**  
**PROJECT_ROADMAP.md は「なぜそれをするか・その先どこへ進むか」を示す。**  
**HANDOFF は「スレッドを再開するために直前の状態を復元する」ための snapshot であり、Roadmap の代用品ではない。**

## 運用上の位置づけ

このRoadmapの単一性、参照タイミング、更新境界、Sprint completion alignment の正本は `protocol/CONTROL_CORE.md` の `CORE-ROADMAP-001`。
ここにはその運用ルール本文を複製せず、**現在のプロジェクト目的・大工程・依存・scope gap・completion meaning** だけを保持する。

---

## Sprint 0〜4 大目的

### Sprint 0 — シミュレーション基盤

**目的:** ゲーム世界を安全・再現可能に動かせる土台を作る。

主対象:
- workspace / package / CLI
- 人物・ID・家系・親子・婚姻・師弟等の基本データ
- WorldEngine / 週・年進行
- seeded RNG / canonical JSON / hash
- config / schema / validation
- 固定出力
- 再現性・不変条件・長期実行・性能

**到達点:** 同じ seed なら同じ世界を再現し、検証しながら長期間シミュレーションできる。

Status: **COMPLETE**

### Sprint 1 — 能力・修行・技・戦闘

**目的:** 人物が成長し、技を覚え、戦う主要ゲームロジックを成立させる。

主対象:
- 6能力 / 3適性
- 技・技状態・習得・熟練
- 週次修行
- 戦闘開始・ターン・間合い・命中・ダメージ
- 戦闘終了・判定・BattleResult・戦後影響
- replay / determinism / failure validation
- WorldEngine / CLI / 出力統合

**到達点:** 人物の成長から戦闘結果までを再現可能な内部処理として動かせる。

Status: **COMPLETE**

### Sprint 1.5 — 簡易シミュレーション確認画面

**大目的:** Sprint 1 までの内部処理を、CLI / JSON だけでなく **ブラウザ上で人が操作・確認できる状態にする**。

これは本番ゲーム UI ではなく、開発・監査・受入確認用 UI。

必要な完成像:
- 共通 browser shell / runtime / session
- simulation start / step / reset / home
- 人物一覧をブラウザ表示し、人物詳細へ遷移できる
- 人物詳細で stats / aptitudes / techniques / history を確認できる
- mock battle の候補選択・実行・replay・latest をブラウザから扱える
- battle log をブラウザ表示できる
- Event / Validation を適切に分離して表示できる
- determinism / final traceability / evidence acceptance が閉じる

**重要:** Backend/API 完了と Frontend/Browser UI 完了を混同しない。

現行 S1.5-SPEC-0.1.15 / implementation plan の UI-001〜010 は、UI-001 の static React shell 以降、UI-002〜008 が主に server/API domain contract に割り当てられている。UI-004 の `people list`、UI-005 の `PersonDetail` 等は現状 **API/server-side scope** であり、それだけでは browser feature page 完成を意味しない。

一方、Frontend の見た目・情報階層そのものは未定ではない。`S1_5_UI_PRESENTATION_DIRECTION_IMPLEMENTATION_BIND_20260814.md` が downstream implementation input として既に bind 済みで、`S1_5_UI_WIREFRAME_DRAFT_UPDATED.md` を provenance、`specs/proposed/sprint1.5/S1_5_UI_MOOD_REFERENCE.html` を non-normative visual mood reference として持つ。既存 bind には dark/quiet・observation/readability-first の visual tone、normal view と developer details の二層情報階層、および UI-001〜UI-008 各画面の presentation mapping がある。したがって現在の不足は visual design definition ではなく、**その既存 presentation direction を実際の React domain feature pages に落とす implementation task ownership / acceptance** である。

現在確認済みの implementation ownership gap:
- React common/static shell: あり
- People list React feature page: 明示 owner なし
- Person detail React feature page: 明示 owner なし
- Mock battle browser page: 明示 owner なし
- Battle log browser page: 明示 owner なし
- Event / Validation browser pages: 明示 owner なし
- domain navigation: 明示 owner なし

**Sprint 1.5 completion gate:** Backend/API の UI-001〜010 closure だけでは COMPLETE にしない。既存の presentation-direction bind を実装入力として使い、上記 Frontend/Browser UI feature pages の implementation task ownership / acceptance を current authority に正本化し、実装・独立 acceptance まで閉じて初めて「簡易シミュレーション確認画面 COMPLETE」とする。

Status: **COMPLETE — tag `sprint1.5-complete` at `b1f44603046834f8b4bab8c44cc0c792eb261f07`; Role1 transition certificate issued and Sprint2 gate CERTIFIED**

### Sprint 2 — 大会・ランキング・競技進行

**目的:** 個々の戦闘を継続する競技世界・大会システムにつなげる。

主対象:
- 大会
- ranking
- 昇格
- group stage / elimination
- BattleResult の大会側保持
- checkpoint / restart / output 統合
- 長期決定性 verification

**到達点:** 選手が大会へ参加し、結果が ranking / 昇格へつながる競技サイクルを回せる。

Status: **IN PROGRESS — current critical path is S02-012 long-horizon determinism / canonical event-stream hash repair verification and independent re-acceptance. Earlier accepted Sprint2 items remain governed by their own exact acceptance evidence; S02-012 remains open until post-repair V10/V11/V12 evidence and Role3 re-adjudication close.**

### Sprint 3 — 師弟・技継承・流派

**目的:** 人物同士のつながりを通じて、強さや技が次の人物へ伝わる世界を作る。

主対象:
- 師匠・弟子
- 指導
- 技の教示・継承
- 独自技
- 流派・系譜

**到達点:** 強い人物が引退して終わらず、知識・技が次世代へ伝わる。

Status: **FUTURE**

### Sprint 4 — 人生・家系・世代継承

**目的:** 人物を一代限りの選手ではなく、人生と家系を持つ存在として長期世界へ組み込む。

主対象:
- 年齢進行
- デビュー / 引退
- 結婚 / 出産
- 親子 / 家系
- 世代交代
- 家系・競技史の長期継続

**到達点:** 数十年・数百年進めても人物が入れ替わり、家系・師弟・競技史が積み重なる。

Status: **FUTURE**

---

## NOW — current critical path

current-phase: **Sprint 2 — 大会・ランキング・競技進行**
current-major-step: **S02-012 long-horizon determinism / canonical event-stream hash repair verification and independent re-acceptance**
current-gate: **Sprint1.5 COMPLETE / Sprint2 transition CERTIFIED; S02-012 exact-target verification at `1dc56b4bf54c6b2163ab2308e3d0b0a44726fcba` exposed a production-scale canonical event-stream hashing failure in V10 LONG-100; repair commit `f35f256a38ae2d6fe4f7affe2bd266136cc67657` exists and requires independent post-repair V10/V11/V12 evidence before Role3 re-adjudication**
last-formally-accepted: **Earlier Sprint2 items remain accepted under their own exact evidence; S02-012 is not yet accepted because its long-horizon/performance gate remains open after the V10 failure.**
next-gate: **materialize the exact B2 post-repair instruction on the B2 SDK host -> run independent G296 V10/V11/V12 against `f35f256a38ae2d6fe4f7affe2bd266136cc67657` with required performance/runtime-memory evidence -> Role3 exact-commit re-adjudication -> continue Sprint2 closure**
material-project-gap: **S02-012 independent post-repair evidence is the active Sprint2 completion gap. Canonical Drive publication is complete, but the B2 SDK host local instruction mirror is missing, so the verification lane is not locally claimable yet. This is an execution-transport gap, not a user gameplay/spec decision. Sprint3 semantic-neutral readiness/preflight may continue in parallel only where it does not displace this Sprint2 critical path.**

Frontend/Browser closure evidence:
- FE-01 + FE-02 implementation: `PASS / FRONTEND_FE01_FE02_IMPLEMENTATION_COMPLETE` (People list/navigation + Person detail).
- FE-03 + FE-04 implementation: `PASS / FRONTEND_FE03_FE04_IMPLEMENTATION_COMPLETE` (Mock battle + Battle log).
- FE-05 implementation: `PASS / FRONTEND_FE05_IMPLEMENTATION_COMPLETE` (Event / Validation browser views).
- FE-06 integration closure: `PASS / FRONTEND_FE06_INTEGRATION_CLOSURE_COMPLETE`, including FE-01..05 regression coverage.
- Role3 independent FE-06 browser integration verification: `PASS / FRONTEND_FE06_BROWSER_INTEGRATION_VERIFICATION_PASS`.
- Sprint1.5 later reached formal completion at `b1f44603046834f8b4bab8c44cc0c792eb261f07`; tag `sprint1.5-complete` and Role1 transition certification are complete, so this former finalization note is historical context only.

The old 2026-08-15 Backend/API `UI-005 ACTIVE` / missing-Frontend-owner snapshot is superseded as coordination state. It is retained by revision history, not as a live material completion gap.

---

## Major dependency map

```text
Sprint 0 COMPLETE
-> Sprint 1 COMPLETE
-> T01 / T02 / T03-A COMPLETE
-> T04 UI-000 PASS
-> Sprint 1.5
     Backend/API lane UI-001..010
     + Frontend/Browser UI closure
-> Sprint 1.5 COMPLETE
-> Sprint 2
-> Sprint 3
-> Sprint 4
```

Sprint3 semantic-neutral preparation may proceed only when current authority permits it and it does not displace the active Sprint2 S02-012 verification/re-acceptance critical path.

---

## Current-project alignment checklist

`CORE-ROADMAP-001` に従ってこのRoadmapを参照した際、現在のdollworldでは次を照合する:

1. What Sprint objective does this work advance?
2. Is it on the current critical path, a blocker-removal action, or safe reusable preparation?
3. Are predecessor gates actually satisfied?
4. Does the work close a real completion requirement, or only improve an internal layer while leaving the user-visible objective unfulfilled?
5. Is there a known scope gap that must be carried forward explicitly?
6. Is a different live CURRENT/Inbox already consuming the target lane?
7. Will this task cause the project to drift from the stated Sprint completion gate?

新しい仕事がRoadmap上のobjective / gap / dependencyに対応しない場合は、laneを埋めるためだけの仕事になっていないかを再確認する。

---

## Maintenance

読み時・更新境界・第二Roadmap禁止・Sprint完了時のobjective alignmentは `CORE-ROADMAP-001` に従う。
このファイル自体はlive-state mirrorではなく、local taskが全体目的から逸脱しないためのstable project-intent / execution-direction mapとして保つ。


## Key references

- `AUDIT_HANDOFF_PROTOCOL.md`
- `protocol/CONTROL_RULE_INDEX.md`
- `protocol/CONTROL_CORE.md` (`CORE-ROADMAP-001`)
- `protocol/ASSIGNMENT_QUEUE_PROTOCOL.md`
- current accepted Git/spec authority
- `audit/assignments/ROLE*_CURRENT.md` / `ROLE*_OUTBOX.md`
- Cursor Inbox / Active controls
- `audit/handoff/PM_HANDOFF.md` — continuity snapshot only, not Roadmap replacement
