# SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1

state: TERMINAL
terminal: SPRINT3_S03_006_PTG_REGRESSION_PUBLICATION_GATE_A_PASS
verificationOutcome: PASS
resultClass: RELEASE_EVIDENCE
lane: A
task-key: SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1
updatedAt: 2026-09-23T10:15:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: a121ae9357dd0b3ba0195480ee7a70f7795dfcf5
origin-master-product-sha-at-pickup: d62778c61a518aa0f867f4e2696d06f5e30a0daa
local-worktree-head-at-pickup: 9da74a532325605a95882613f6d71aca118a990f
publication-commit: bb4ed45ca53a2c0e64eeb0649f19b98afbf48fdf
tested-product-sha: bb4ed45ca53a2c0e64eeb0649f19b98afbf48fdf
pristine-gate-executed-at: d99acd4d1496aac3eafc5befd752f1986cfcbfac
origin-master-at-completion: bb4ed45ca53a2c0e64eeb0649f19b98afbf48fdf
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-006-CURRENT-MASTER-PARENT-GUIDANCE-SPEC-SOURCE-AUDIT-A-20260923-R1
production-change: YES (test-only PTG-011/012 slice)
documentation-change: YES
sprint3-control-state: REOPENED_FIX_REQUIRED (unchanged — formal CLOSED not assigned)
live-release-gate-superseded: YES (TE-011 @ d62778c → this task @ bb4ed45)

## Summary

Published isolated **PTG-011** / **PTG-012** regression locks from predecessor S03-006 spec-source audit to canonical **`origin/master`** @ product **`bb4ed45`**, then one bounded pristine root **`npm run check`** **PASS** (**1975/1975**, **137/137** files, wiki **58**, harness **2/2**, web production build **PASS**). Updated live release-gate binding in **`SPRINT3_STATUS.md`** and S03-006 acceptance note in **`docs/SPRINT_3_BACKLOG.md`**. Unrelated local product deltas in the main worktree were **not** published.

## Publication (PTG scope only)

| Path | Change |
|------|--------|
| `packages/simulation-core/src/sprint3/parent-temporary-guidance-weekly.test.ts` | **PTG-011**: persisted `mentorshipRelationKind` → `applyTrainStat` teacher factor; **PTG-012**: enrollment intake → `lookupMentorshipRelationKindForChild` |

**Mechanism:** isolated worktree @ `origin/master`; single-file commit rebased onto control tip **`6ec2d70`** → product **`bb4ed45`**; push `ptg-publication:master`.

## Excluded local deltas (preserved in main worktree, not published)

| Path | Reason |
|------|--------|
| `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts` | Parallel Sprint3 runtime — out of PTG scope |
| `apps/web/src/client/competition/*`, `competition-auto-progression*`, etc. | Unrelated local / WF lineage deltas |
| `packages/simulation-core/src/sprint3/teaching-efficiency-weekly.test.ts` | Already canonical @ **`d62778c`** |

## Verification

Worktree: `_handoff-artifacts/control-tmp/ptg-publication-wt-20260923` @ product **`bb4ed45`**

| Check | Result |
|-------|--------|
| A inbox PREPARED + instruction fresh-read | **PASS** |
| A ACTIVE lock (CURSOR-START-001) | **PASS** |
| Fresh-read control plane + Sprint3 status + predecessor result + backlog S03-006 | **PASS** |
| `@shared-world/simulation-core` build | **PASS** |
| Vitest `parent-temporary-guidance-weekly.test.ts` (PTG-001..012) | **PASS** — **12/12** |
| Vitest `enrollment-assignment.test.ts` (EN-006 boundary) | **PASS** — **10/10** |
| Vitest `sprint3-mentorship-entrypoint-runtime.test.ts` | **PASS** — **5/5** |
| Pristine prep: remove workspace `dist/` before gate (S03-072 harness) | **PASS** |
| Root `npm run check` @ product tree **`d99acd4`** (identical `apps/` + `packages/` to **`bb4ed45`**; `git diff d99acd4 bb4ed45` = control-only) | **PASS** — **137** files, **1975** tests, wiki **58**, harness **2/2**, web build **PASS** |
| `git push origin ptg-publication:master` | **PASS** — product tip **`bb4ed45`** |

**Evidence:** `_handoff-artifacts/control-tmp/ptg-publication-evidence/root-check-d99acd4.log` — **~1627s** wall, exit **0**

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\ptg-publication-wt-20260923
git fetch origin master
git worktree add . -b ptg-publication origin/master  # if fresh
# copy isolated parent-temporary-guidance-weekly.test.ts; commit bb4ed45
Remove-Item -Recurse -Force packages\simulation-core\dist,apps\simulator\dist,apps\web\dist -ErrorAction SilentlyContinue
npm run check
git push origin ptg-publication:master
```

## Runtime / browser acceptance

**Test-only delta** — no `apps/` or non-test `packages/` runtime bytes changed vs parent **`d62778c`**. Applicable current-master UI evidence preserved: **`SPRINT3-S03-070-POST-TEACH-UI-REGRESSION-A-20260922-R1` **PASS** @ product **`4a0a80f`** (Person Detail mentorship/disciple UI; not parent-guidance train_stat browser slice).

## Control readback

| Artifact | Change |
|----------|--------|
| `_handoff-artifacts/control/SPRINT3_STATUS.md` | Live binding → **`SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1` **PASS** @ **`bb4ed45`** (**1975/1975**); TE-011 @ **`d62778c`** historical; **`REOPENED_FIX_REQUIRED`** preserved |
| `docs/SPRINT_3_BACKLOG.md` | S03-006 PTG-001..012 + latest gate pointer @ **`bb4ed45`** |

## Remaining ordinary-flow acceptance risk

No dedicated real-browser ordinary weekly `train_stat` evidence with live family-derived `parent_temporary_guidance` (same residual as predecessor audit). Product wiring and published regressions sufficient for publication gate; optional PM browser slice unchanged.

## Non-conflict guard

- No Cursor B2 inbox/active read or write.

## Terminal

**SPRINT3_S03_006_PTG_REGRESSION_PUBLICATION_GATE_A_PASS** — PTG-011/012 regression published @ **`bb4ed45`** with fresh exact-lineage pristine root gate **PASS**.
