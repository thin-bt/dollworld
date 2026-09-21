# SPRINT3-S03-042-ORDINARY-SESSION-ACTIVATION-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_S03_042_ORDINARY_SESSION_ACTIVATION_B2_READY_LOCAL
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T22:46:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
local-head-at-completion: ed123ca5763172184458db67af602efc6629f878
origin-master-head-at-completion: f68bb63aad7daf0b0d74689c4cbb7e401baea117
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — single bounded verification pass per check family; finalized on first green run
production-change: YES
test-change: YES
predecessor: SPRINT3-S03-040-SPRINT2-REPAIR-GUARD-CANONICAL-PUBLICATION-B2-20260921-R1

## Summary

**Ordinary-start activation finding:** Before this slice, public `POST /api/s1_5/simulation/start` created a Sprint1 run session **without** `context.sprint3Config` or persisted Sprint3 mentorship/OTL runtime. S03-040 regression guard compensated via **post-start test injection** (`attachSprint3WeeklyRegressionGuard`). That gap is closed by production wiring on the start/reset commit path.

**Production wiring (minimal):** `bindAcceptedProductionSprint3RunSession` validates canonical accepted balance-0.9.0-class Sprint3 config and initializes `mentorshipEntrypointRuntime` + `originalTechniqueLifecycleRuntime` at session creation. Invoked from `routes-simulation.ts` on simulation **start** and **reset** before persisting `worldEngineRuntime`.

**New production-boundary test:** `sprint3-ordinary-session-activation.test.ts` uses only public session + simulation/start + simulation/step (no post-start store mutation) and proves Sprint3 is bound at start and OTL weekly processing runs once on an ordinary non-tournament week.

S03-040 guard tests were updated to rely on the same production start binding (test-only attach removed).

## Changed paths

| Path | Role |
|------|------|
| `apps/web/src/server/production-sprint3-run-session-binding.ts` | Canonical production Sprint3 config + runtime binding |
| `apps/web/src/server/routes-simulation.ts` | Apply binding on start/reset |
| `apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts` | Ordinary-session production-boundary regression |
| `apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | Remove post-start injection; use production binding |

## Verification (CURSOR-B2-001)

| Check | Command | Result |
|-------|---------|--------|
| Focused ordinary-session + S03-040 guard | `npx vitest run apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts apps/web/src/server/ui009/sprint2-repair-sprint3-weekly-regression-guard.test.ts` | **PASS** — 2 files, **5/5** tests (~55s) |
| Web typecheck | `npm run typecheck -w @shared-world/web` | **PASS** |

## GitHub master readback (at completion)

| Path | `origin/master` |
|------|-------------------|
| `apps/web/src/server/production-sprint3-run-session-binding.ts` | **absent** (exists locally only) |
| `apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts` | **absent** (exists locally only) |
| `apps/web/src/server/routes-simulation.ts` | local delta unpushed vs canonical master |

**Disposition:** Product/test evidence **PASS** locally @ `ed123ca` working tree. **Canonical READY** awaits executor publication + fresh GitHub master readback of changed production/test files (per instruction §7).
