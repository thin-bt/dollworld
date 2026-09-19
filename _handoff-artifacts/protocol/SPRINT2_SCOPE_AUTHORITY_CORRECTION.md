# SPRINT2_SCOPE_AUTHORITY_CORRECTION

status: ACTIVE
sprint: Sprint2
control-authority: GitHub
updatedAt: 2026-09-19T17:03:00+09:00

## Authority correction

Sprint2 UI completion must be judged against the user-defined observation UI requirements in `docs/SPEC.md`, especially **§6 観察画面の構成** and **第2段階：観察用Web画面**.

The following requirements may NOT be downgraded to FUTURE_RESERVE or OUT_OF_SCOPE solely by handoff artifacts, source-evidence manifests, existing tests, current implementation shape, or a narrower UI009/F-slot acceptance path:

- 世界ニュース
- ランキング: 共通ランク別一覧、総合戦王者、各限定戦王者、勝率、連勝、世代別比較
- 人物一覧・人物詳細
- 家系図
- 師弟系譜
- 歴代王者
- 大会履歴
- 総当たり順位表
- トーナメント表
- 対戦概要
- 詳細戦闘ログ
- 人物・家系・師系の検索とフォロー
- the navigation/state needed to reach and use those surfaces

Prior artifacts such as `SPRINT2-WIREFRAME-SOURCE-EVIDENCE-REPAIR-A-20260914/source-evidence-manifest.txt` and `SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1/result.md` are evidence of what was tested at that time, but they are **not authority to narrow the user's specification**.

In particular, prior classifications of knockout browser UI and competition-history -> battle-log navigation as FUTURE_RESERVE are superseded for Sprint2 completion unless an explicit user-approved specification change says otherwise.

## Completion rule

Sprint2 is not complete merely because the reduced mandatory Chrome set passes. Completion requires a repository-backed specification-to-implementation ledger covering all user-defined Sprint2 UI requirements, with each requirement implemented and browser-accepted, or explicitly deferred by a user-approved spec change.

No Sprint3/4 production before this corrected Sprint2 completion gate is satisfied.
