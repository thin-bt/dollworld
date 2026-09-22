# SPRINT3-S03-072-PRISTINE-ROOT-CHECK-WORKSPACE-RESOLUTION-B2-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_072_PRISTINE_ROOT_CHECK_WORKSPACE_RESOLUTION_B2_PASS
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: B2
updatedAt: 2026-09-22T18:20:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 66922aeefc001a45da68511f389c072469a04dfc
origin-master-at-completion: fdeed366e394436696c273487c15d585534aac16
product-sha: fdeed366e394436696c273487c15d585534aac16
predecessor: SPRINT3-S03-071-LWT003-FIXTURE-SEMANTIC-REPAIR-B2-20260922-R1
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — single bounded verification attempt per check family; no same-case retry ladder
production-change: YES
documentation-change: NO

## Summary

Repaired the S03-069 pristine root-gate harness defect: root `npm run test` now runs a `pretest` workspace build so `@shared-world/simulation-core` (and other dist-exporting workspaces) resolve before Vitest, while the root `check` script still finishes with `npm run build` after test/wiki gates. Added `scripts/root-check-workspace-resolution.test.mjs` and wired it into `wiki:check` to prevent reorder regression. Published **`fdeed36`** to **`origin/master`** with GitHub readback verified. One bounded root **`npm run check`** after fresh **`npm ci`** and with workspace **`dist/`** removed **PASS** (**133/133** files, **1953/1953** tests).

## Product change

| File | Change |
|------|--------|
| `package.json` | Add `pretest` workspace build; extend `wiki:check` with harness regression tests |
| `scripts/root-check-workspace-resolution.test.mjs` | Assert `pretest` builds workspaces and `check` still ends with `build` after `test` |

## Verification (CURSOR-B2-001)

Worktree: `_handoff-artifacts/control-tmp/s03-072-publish-wt` @ pickup **`66922ae`**, publish **`fdeed36`**

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read inbox, instruction, GITHUB_CONTROL_PLANE, S03-069/071 results | 1 | **PASS** |
| B2 ACTIVE lock before implementation | 1 | **PASS** |
| Reproduce failure: `npm ci`, remove `dist/`, vitest app suite load | 1 | **PASS** — `Failed to resolve entry for package "@shared-world/simulation-core"` |
| Harness fix + regression node tests | 1 | **PASS** — **2/2** |
| `npm run test` with `dist/` removed (pretest path) | 1 | **PASS** — sample app suite loads |
| LWT-003 targeted vitest (S03-071 regression) | 1 | **PASS** — **2/2** |
| `npm run format:check` | 1 | **PASS** |
| Root `npm run check` (bounded, pristine-enough: post-`npm ci`, `dist/` removed) | 1 | **PASS** — **133/133** files, **1953/1953** tests; wiki:check **58** files |
| Same-case root-gate retry | — | **not run** (bounded attempt exhausted on PASS) |
| `git push origin HEAD:master` + fetch readback | 1 | **PASS** — tip **`fdeed36`** |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\s03-072-publish-wt
Remove-Item -Recurse -Force node_modules; npm ci
Remove-Item -Recurse -Force packages\simulation-core\dist,apps\simulator\dist,apps\web\dist
npm run check
git push origin HEAD:master
git fetch origin master
git rev-parse origin/master
```

**Root gate evidence:** `_handoff-artifacts/control-tmp/s03-072-evidence/root-check-bounded.log`  
**Wall:** `_handoff-artifacts/control-tmp/s03-072-evidence/root-check-wall.txt` — **2224s** total

### Root gate step detail @ harness fix (pre-push worktree)

| Step | Result |
|------|--------|
| `format:check` | **PASS** |
| `lint` | **PASS** |
| `typecheck` (all workspaces) | **PASS** |
| `pretest` → workspace `build` | **PASS** |
| `test` (`vitest run`) | **PASS** — **133** files, **1953** tests |
| `wiki:check` (+ harness regression) | **PASS** |
| `build` | **PASS** |

## Acceptance

- Fresh checkout + `npm ci` no longer requires pre-existing `packages/simulation-core/dist/**` merely for root test loading (**PASS** — `pretest` builds workspaces).
- S03-071 LWT-003 repair remains green; no semantic invariant/test weakening (**PASS**).
- Root `npm run check` self-contained through all intended phases on pristine-enough tree (**PASS**).
- Terminal result binds product SHA, commands/results, publication/readback, hygiene evidence (**PASS**).
- Sprint3 **`CLOSED` not assigned** — control authority work remains.
