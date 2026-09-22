# CLAUDE_INBOX

task-key: CLAUDE-INBOX-001
status: READY_FOR_INDEPENDENT_REVIEW
scope: Sprint2/Sprint3 completion-audit and docs/specs change-audit
independence-rule: Review scope and evidence only. Do not adopt prior GPT conclusions as findings.

## Review scope

1. Verify whether historical completion evidence for Sprint2/Sprint3 actually demonstrated the completion criteria below, or only demonstrated narrower automated/test-path success.
2. Statically reconcile `TOURNAMENT_UI_WIREFRAME_DRAFT.md` against CURRENT MASTER UI/source and determine whether every required Sprint2 user-visible surface/transition is implemented and connected.
3. Audit the 34 changed files under `docs/specs/` and determine whether those changes were explicitly authorized or not, and whether the semantic content previously represented by §§33-35 is preserved.

## Completion criteria to use

Sprint2 is complete only if CURRENT MASTER:
- production web build succeeds;
- app starts;
- ordinary real UI/browser path works end-to-end:
  `週進行 -> 大会予定 -> 参加者確定 -> 開催 -> 戦闘 -> 大会終了 -> 結果保存 -> ランキング更新 -> UI反映`;
- Ranking screen works through ordinary navigation;
- battle presentation works through ordinary navigation;
- persisted tournament result and ranking update are observable through the ordinary UI-backed flow.

Historical CLOSED/status labels, focused unit tests, Playwright subsets, or result summaries are evidence to inspect, not completion by themselves.

## Input package

Read:
`_handoff-artifacts/review-input/CLAUDE-INBOX-001/INPUT_MANIFEST.md`

Do not treat any prior GPT conclusion as a finding. Produce your own evidence-backed assessment.
