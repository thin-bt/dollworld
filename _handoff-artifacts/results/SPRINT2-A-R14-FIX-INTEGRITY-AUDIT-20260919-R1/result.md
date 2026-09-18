# SPRINT2-A-R14-FIX-INTEGRITY-AUDIT-20260919-R1

state: READY
terminal: SPRINT2_A_R14_FIX_INTEGRITY_AUDIT_READY
lane: A
updatedAt: 2026-09-19T05:50:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
commit-status: DIRTY_NO_COMMIT
worktree-head: aa500b60e2c041548b42909fea23a6ae59f3373e
predecessor-task: SPRINT2-B2-ACCEPTANCE-UNBLOCK-A-20260919-R1
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR
production-change: NO

## Summary

Independent integrity audit of the A-side acceptance-unblock fix confirms the **minimal core slice** is coherent and regression-covered. The predecessor’s two product guards remain the right answer for the original **false-finished 0/0** bootstrap defect. B2’s concurrent **FIX_REQUIRED** (missing `competition-step-cta` while UI shows **終了**) was triaged: it is a **separate acceptance tension** with simulation-integrated auto-finish on `simulation/start`, not a regression of the 0/0 mapping fix. No additional A product edits in this pickup (audit-only; attempted start-hook removal reverted after vitest proved it breaks the auto-progression contract).

## Predecessor fix — diff evidence

| Surface | Role | Evidence |
|---------|------|----------|
| `apps/web/src/server/ui009/competition-participant-preview.ts` | After roster supplement, cap to `config.format.roundRobinMaximum` (4) so F-slot integration stays **round_robin** | `selectedPersonIds.slice(0, config.format.roundRobinMaximum)` post-supplement |
| `apps/web/src/server/ui009/map-competition-view.ts` | `effectiveLifecyclePhase` / `tournamentCompletionCoherent` block terminal **finished** when projected RR is **0/0** or RR incomplete; gate champion/final summary on `presentAsFinished` | New helpers + lifecycle/champion mapping |
| `apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts` | Regression: RR incomplete matrix; knockout **0/0** projection | Untracked in worktree; 2 cases PASS |
| `apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts` | Knockout auto-path threshold aligned with capped roster | Untracked; PASS |
| `apps/web/src/server/ui009.competition.test.ts` | Integration progression + `resetCompetitionStore` on bootstrap | Modified; PASS |

**Integrity checks (instruction §2)**

- F-slot integration round-robin (≤4 entrants): preview cap enforces format selection RR band; integration fallback still selects up to 16 but preview truncates before plan build — **coherent**.
- Terminal lifecycle cannot expose false **finished** at projected **0/0**: `tournamentCompletionCoherent` returns false for `matchesTotal === 0 && matchesCompleted === 0`; knockout-with-empty-RR case covered by lifecycle test — **PASS**.
- Future-reserve / knockout promotion paths: `competition-format-selection.ts` unchanged; engine dirty diff adds format selection but does not delete group/knockout thresholds — **not accidentally removed** (no future-reserve symbols in ui009; knockout remains structural vocabulary).

## Collateral dirty paths (not reverted)

Report only — do not treat as part of the minimal R13 unblock slice:

| Path | Δ (insert/delete) | Note |
|------|-------------------|------|
| `apps/web/src/server/ui009/competition-engine.ts` | +146/−28 | Bracket/format engine expansion beyond view-layer guard |
| `apps/web/src/server/ui009/routes-competition.ts` | +40/−2 | POST step finalization path |
| `apps/web/src/server/routes-simulation.ts` | +4/0 | `syncCompetitionAutoProgressionForWeek` on start/reset/step |
| `packages/simulation-core/src/sprint1/sprint1-weekly-step.ts` | +91/0 | simulation-core collateral |
| `apps/web/src/server/ui009/competition-store.ts` | +1/0 | minor |
| `apps/web/src/server/ui009/competition-participant-integration-fallback.ts` | +11/−1 | `UI009_INTEGRATION_PARTICIPANT_CAP` rename |
| `tests/e2e/s2-full-product-browser-closure.spec.ts` | +4/0 | B2 harness — not edited this pickup |
| `tests/e2e/s2-ui009-round-robin-competition.spec.ts` | +6/−7 | B2 harness — not edited this pickup |
| `_handoff-artifacts/control/*`, `audit/CURSOR_*` | handoff | lane control |

## B2 FIX_REQUIRED triage (consumed, not fixed here)

Source: `_handoff-artifacts/results/SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1/result.md` (`FIX_REQUIRED`, prep test 2: CTA absent, UI **終了**).

- Prep test 1 (false-finished GET) **passes** on current HEAD — confirms R13 guard.
- Primary failure: after `simulation/start` (`sprint1-tiny-accepted`, seed 42), `/competition` renders **closed** footer (`lifecyclePhase === "finished"`) because `syncCompetitionAutoProgressionForWeek` on **start** runs `runCompetitionThroughFinish` when the playable slot matches the bootstrap week.
- A-owned vitest **requires** that behavior when `weeksUntilTournament === 0` at start (`competition-auto-progression.test.ts` “GET … immediately after simulation start”).
- Removing start-hook sync alone breaks all three auto-progression tests (reverted in-session); it does not reconcile B2 manual-CTA prep without a broader acceptance decision (auto-finish on start vs manual competition POST loop).

**Route:** dispatch a follow-on A task to align simulation auto-progression with browser manual-step acceptance (or adjust A-owned vitest contract after wireframe authority), then re-bind B2 7/7.

## Verification (bounded)

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/server/ui009/competition-auto-progression.test.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts apps/web/src/server/ui009.competition.test.ts apps/web/src/server/ui009/competition-knockout-auto-progression.test.ts
npx eslint apps/web/src/server/ui009/competition-participant-preview.ts apps/web/src/server/ui009/map-competition-view.ts apps/web/src/server/ui009/map-competition-view-lifecycle.test.ts
npm run typecheck -w @shared-world/web
```

| When | Result |
|------|--------|
| 2026-09-19T05:49:13+09:00 | **vitest 8/8 PASS** (4 files) @ HEAD `aa500b60…` |
| 2026-09-19T05:47:00+09:00 | eslint: 4 pre-existing issues in dirty files (`ui009.competition.test.ts` unused vars; `competition-participant-integration-fallback.ts` unused `worldYear`) — not introduced by this audit pickup |
| 2026-09-19T05:47:00+09:00 | typecheck `@shared-world/web`: **FAIL** pre-existing `fetch-ui009.ts` Response typing (client surface; outside audited server slice) |

No Playwright.full browser suite run (forbidden overlap while B2 reacceptance lane owns 7/7).

## Additional coverage

No new tests added: lifecycle + auto-progression + competition integration already cover the audited edges; no concrete uncovered gap beyond documented B2 CTA / auto-finish tension.
