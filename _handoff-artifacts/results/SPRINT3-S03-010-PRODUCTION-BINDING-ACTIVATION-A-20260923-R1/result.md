# SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1

state: TERMINAL
terminal: SPRINT3_S03_010_PRODUCTION_BINDING_ACTIVATION_A_PASS
verificationOutcome: PASS
resultClass: SPEC_TO_SOURCE_CLOSURE
lane: A
task-key: SPRINT3-S03-010-PRODUCTION-BINDING-ACTIVATION-A-20260923-R1
updatedAt: 2026-09-23T17:38:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: RECOVERY_SAME_TASK_ACTIVE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-010-WEEKLY-AUTO-REGISTRATION-INTEGRATION-A-20260923-R1
local-worktree-head-at-pickup: 9da74a532325605a95882613f6d71aca118a990f
origin-master-head-at-pickup: 950fec239cbb94811ba4e0dcd73c8db1f1691388
origin-master-at-completion: 37d6ed47dc885342f35138553395d62682a745f3
publication-commit: 37d6ed47dc885342f35138553395d62682a745f3
tested-product-sha: 37d6ed47dc885342f35138553395d62682a745f3
pristine-gate-executed-at: 37d6ed47dc885342f35138553395d62682a745f3
production-change: YES
documentation-change: YES
sprint3-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)
live-release-gate-superseded: YES (S03-010 weekly registration @ 3c82d3a → this task @ 37d6ed4)

## Summary

Closed the **S03-010 production reachability gap**: accepted ordinary web Sprint3 sessions now bind **`createSprint3Balance100ConfigInput()`** (`generatedTechniqueRegistrationEnabled` + `generatedTechniqueMaterialization`) instead of the manual balance-0.8.0 OTL pack. **`sprint3-balance-0.10.0`** weekly-training / explicit-teach / teaching-selection gates were extended so production-bound weekly steps validate. Product published on canonical **`origin/master`** @ **`37d6ed4`**. Fresh exact-lineage pristine root **`npm run check`** **PASS** (**1986/1986**, **139/139** files, wiki **58**, harness **2/2**, web production build **PASS**).

## Recovery disposition

Active already held this task-key. Reconciled WIP in `_handoff-artifacts/control-tmp/s03-010-pba-publication-wt-20260923` against **`origin/master`**, repaired balance-1.0.0 adapter gaps surfaced by PBA regressions, published product, and re-ran pristine root gate on exact published SHA (no silent lock clear).

## Changed paths (product publication @ 37d6ed4)

| Path | Change |
|------|--------|
| `apps/web/src/server/production-sprint3-run-session-binding.ts` | Accepted production config → `createSprint3Balance100ConfigInput()` |
| `apps/web/src/server/production-sprint3-run-session-binding.test.ts` | **NEW** — PBA-001..004 production binding regressions |
| `apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts` | Assert balance-1.0.0 config at start; overlay when OTL founding occurs |
| `packages/simulation-core/src/sprint3/evaluate-explicit-weekly-teach.ts` | Allow `sprint3-balance-0.10.0` for explicit weekly teach |
| `packages/simulation-core/src/sprint3/evaluate-technique-teaching-selection.ts` | Allow `sprint3-balance-0.10.0` for teaching selection |
| `packages/simulation-core/src/sprint3/resolve-weekly-parent-temporary-guidance.ts` | Weekly-training Sprint3 config binding accepts balance-1.0.0 |

## Acceptance mapping

| Requirement | Evidence |
|-------------|----------|
| Accepted production config enables `generatedTechniqueRegistrationEnabled` | PBA-001, PBA-003 |
| Generated-technique materialization config present/valid | PBA-001 |
| Prior S03-001..009 production feature gates remain enabled | PBA-002 |
| Production-bound weekly step succeeds with registration config | PBA-004 |
| Ordinary web start/simulation path uses balance-1.0.0 binding | `sprint3-ordinary-session-activation.test.ts` |
| OTL founding → overlay on production HTTP weekly step (when founding occurs) | ordinary session activation test conditional |
| Weekly registration processor remains on `runSprint1WeeklyStep` | WAR suite @ **`3c82d3a`** lineage (unchanged) |
| Fresh exact-lineage release gate for changed product bytes | root check @ **`37d6ed4`** (**1986/1986**) |

## Verification

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (recovery, CURSOR-START-001) | **PASS** |
| Focused Vitest (PBA + ordinary session activation) | **PASS** — **5/5** |
| Pristine prep: remove workspace `dist/` before gate (S03-072 harness) | **PASS** |
| Root `npm run check` @ product tree **`37d6ed4`** | **PASS** — **139** files, **1986** tests, wiki **58**, harness **2/2**, web build **PASS** |

**Evidence log:** `_handoff-artifacts/control-tmp/s03-010-pba-root-check-37d6ed4.log` — **~1716s** wall, exit **0**

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s03-010-pba-publication-wt-20260923
Remove-Item -Recurse -Force packages\simulation-core\dist,apps\simulator\dist,apps\web\dist -ErrorAction SilentlyContinue
npm run check
```

## Control readback

| Artifact | Change |
|----------|--------|
| `_handoff-artifacts/control/SPRINT3_STATUS.md` | Live binding → this task **PASS** @ **`37d6ed4`** (**1986/1986**); weekly registration @ **`3c82d3a`** historical |
| `docs/SPRINT_3_BACKLOG.md` | S03-010 production web binding + live gate pointer @ **`37d6ed4`** |

## Runtime / browser acceptance risk

- **Ordinary web OTL → battle catalog**: production binding now live-reaches balance-1.0.0 registration; ordinary session activation integration test covers HTTP start/step with registration config and conditional overlay on founding. Dedicated long-run real-browser OTL founding + battle slice not expanded in this task.
- Preserved applicable UI evidence: **`SPRINT3-S03-070-POST-TEACH-UI-REGRESSION-A-20260922-R1` **PASS** @ product **`4a0a80f`** (Person Detail; not OTL founding browser slice).

## Non-conflict guard

- No Cursor B2 inbox/active read or write.

## Terminal

**SPRINT3_S03_010_PRODUCTION_BINDING_ACTIVATION_A_PASS** — ordinary production web Sprint3 binding activates S03-010 auto-registration config; exact-lineage pristine root gate **PASS** @ product **`37d6ed4`**.
