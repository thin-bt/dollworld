# UI-BATTLE-SHARED-MOCK-V03-20260923-R2

state: TERMINAL
terminal: UI_BATTLE_SHARED_MOCK_V03_PASS
verificationOutcome: PASS
resultClass: UI_IMPLEMENTATION_BROWSER_VERIFY
lane: A
task-key: UI-BATTLE-SHARED-MOCK-V03-20260923-R2
updatedAt: 2026-09-23T19:58:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1
local-worktree-head-at-pickup: 9da74a532325605a95882613f6d71aca118a990f
origin-master-head-at-pickup: 37d6ed47dc885342f35138553395d62682a745f3
tested-product-sha: 9da74a532325605a95882613f6d71aca118a990f (local WIP product bytes; publication pending)
visual-blueprint: _handoff-artifacts/audit/ui-page-mocks-20260922/00_html_mocks/11-12_mock_battle_result_log_mock_v03.html
production-change: YES (local worktree)
test-harness-change: YES — `tests/e2e/ui-battle-shared-mock-v03-browser-a.spec.ts`

## Summary

Refactored mock-battle, mock-battle result, and tournament match detail onto shared presentation components aligned with mock v03 hierarchy: **profile comparison → execution/range context → result summary → final participant state → chronological log**. Tournament routes keep only contextual chrome (match identity, back navigation); detailed battle UI reuses `BattleLogViewPanel` / `SharedBattleOutcomePresentation` / `BattleChronologicalLog`. Browser evidence covers desktop and narrow viewports on `/mock-battle`, `/mock-battle/result`, and a competition match detail path after weekly + tournament progression.

## Recovery disposition

Active already held this task-key. Reconciled partial WIP (shared components + refactors), completed competition-path browser harness (prior probe had `competitionMatchVerified: false` because the spec did not advance the simulation to a played match), re-ran verification, and wrote terminal evidence.

## Changed paths (local worktree)

| Path | Change |
|------|--------|
| `apps/web/src/client/presentation/SharedBattleOutcomePresentation.tsx` | **NEW** — shared outcome hierarchy |
| `apps/web/src/client/presentation/BattleChronologicalLog.tsx` | **NEW** — shared chronological log block |
| `apps/web/src/client/presentation/shared-battle-person-labels.ts` | **NEW** — shared person labels |
| `apps/web/src/client/presentation/shared-battle-presentation.test.tsx` | **NEW** — hierarchy order regression |
| `apps/web/src/client/battle-log/BattleLogView.tsx` | Refactor to shared components + `presentationMode` |
| `apps/web/src/client/mock-battle/MockBattleView.tsx` | Reuse shared outcome presentation on setup result |
| `apps/web/src/client/competition/CompetitionMatchPage.tsx` | Tournament wrapper chrome only |
| `apps/web/src/client/competition/CompetitionPage.tsx` | Match history → `/competition/matches/{id}` links |
| `apps/web/src/client/competition/ui009-views.ts` | View typing for battle summary wiring |
| `apps/web/src/client/presentation.css` | Shared battle spacing/readability |
| `tests/e2e/ui-battle-shared-mock-v03-browser-a.spec.ts` | **NEW** — browser hierarchy + competition progression evidence |

## Acceptance mapping

| Requirement | Evidence |
|-------------|----------|
| Shared reusable battle UI across mock + tournament | `SharedBattleOutcomePresentation`, `BattleChronologicalLog`, `CompetitionMatchDetailedLog` → `BattleLogViewPanel` |
| mock v03 reading order preserved | Vitest hierarchy test; `hierarchy-probe.json` desktop probe indices |
| No tournament-only duplicate presentation | Single log/outcome stack; tournament adds context wrapper only |
| Chronological log readable (desktop + narrow) | Playwright screenshots `04-*`, `06-*`; log items visible assertions |
| Tournament route into battle detail/log | `competition-history-match-link` → match page + shared panel |
| Focused tests | Vitest **12/12** on touched UI files |
| web typecheck + production build | `@shared-world/web` typecheck + vite build **PASS** |
| Real browser compare vs mock v03 | Playwright Chrome **PASS**; PNG evidence under `browser-evidence/` |

## Verification

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (recovery, CURSOR-START-001) | **PASS** |
| Focused Vitest | **PASS** — **12/12** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| Playwright `ui-battle-shared-mock-v03-browser-a.spec.ts` (Chrome) | **PASS** — **1/1** (~17s test, ~28s wall incl. webServer) |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/client/presentation/shared-battle-presentation.test.tsx apps/web/src/client/battle-log/battle-log.test.tsx apps/web/src/client/competition/competition-match-page.test.tsx
npm run typecheck -w @shared-world/web
npm run build -w @shared-world/web
$env:DOLLWORLD_EVIDENCE_OUTPUT_ROOT = "D:\xampp\htdocs\dollworld"
npx playwright test tests/e2e/ui-battle-shared-mock-v03-browser-a.spec.ts --project=chrome
```

### Browser routes exercised

| Route | Viewports |
|-------|-----------|
| `/mock-battle` | 1280×900, 390×844 |
| `/mock-battle/result` | 1280×900, 390×844 |
| `/competition` → first `competition-history-match-link` → match detail | 1280×900, 390×844 |

Bootstrap: API reset + `sprint1-tiny-accepted` seed **77**, mock battle via UI, one weekly step + competition step until history link exists.

### Terminal browser evidence

| Artifact | Path |
|----------|------|
| Hierarchy probe | `_handoff-artifacts/results/UI-BATTLE-SHARED-MOCK-V03-20260923-R2/browser-evidence/hierarchy-probe.json` |
| Screenshots | `browser-evidence/01-mock-battle-desktop.png` … `06-competition-match-narrow.png` |

`hierarchy-probe.json`: mock result hierarchy ordered; `competitionMatchVerified: true`.

## Intentional semantic notes

- Tournament match pages omit mock-battle-specific back copy; they use competition context + shared battle panel (`presentationMode="competition"`).
- Profile comparison on tournament match detail uses shared block when summary is present; participant detail fetches remain route-specific (no new battle semantics).

## Continuation (01–15 UI workstream)

Next safe screen after this task: continue wireframe-aligned implementation on remaining 01–15 mocks per backlog (outside this task’s terminal scope).
