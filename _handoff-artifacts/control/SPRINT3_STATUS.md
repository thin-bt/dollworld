# SPRINT3_STATUS

state: REOPENED_FIX_REQUIRED
sprint: Sprint3
control-authority: GitHub
updatedAt: 2026-09-23
previous-state: CLOSED
reopen-trigger: CURRENT_MASTER_WEB_BUILD_FAILURE
reopen-trigger-status: SUPERSEDED_BY_TERMINAL_EVIDENCE
superseded-blocking-recovery-task: SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1

## Reopen reason (historical)

Sprint3 was reopened when **current master** was reported failing web production build/start, blocking real user-facing UI verification. The prior S03-064 **1925/1925** root gate @ `c0c9754` remains **historical** evidence only for pre-delta lineage; it does not by itself prove post-delta current-master playability or a pristine root gate on later product bytes.

## Terminal evidence (current-master build / UI / root gate)

| Layer | Terminal result | Binding |
|-------|-----------------|--------|
| Web production build + start + bounded Sprint2/Sprint3 non-regression | `SPRINT23-CURRENT-MASTER-WEB-PLAYABILITY-REACCEPTANCE-B2-20260922-R1` **PASS** | `5fad321` |
| Ordinary Sprint3 Person Detail mentorship/disciple UI (real Chrome) | `SPRINT3-S03-070-POST-TEACH-UI-REGRESSION-A-20260922-R1` **PASS** | product @ `4a0a80f` |
| Post–completed-teach root gate attempt (bounded) | `SPRINT3-S03-069-POST-COMPLETED-TEACH-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1` **FAIL** | `d6b41eb` — LWT-003 + pristine `dist/` resolution |
| LWT-003 product repair | `SPRINT3-S03-071-LWT003-FIXTURE-SEMANTIC-REPAIR-B2-20260922-R1` **PASS** | published `ae41681` |
| Pristine root `npm run check` harness (self-contained after `npm ci`) | `SPRINT3-S03-072-PRISTINE-ROOT-CHECK-WORKSPACE-RESOLUTION-B2-20260922-R1` **PASS** | **`1953/1953`** @ product **`fdeed36`** (historical superseded gate evidence) |
| Post–WF-14 Prettier repair pristine root gate + production web build | `SPRINT3-POST-WF14-PRETTIER-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1` **PASS** | **`1967/1967`** (**136/136** files), wiki **58**, harness **2/2**, web build **PASS** @ product **`7004411`** — historical; superseded for current product lineage |
| Post–WF-5 comparison UI current product pristine root gate | `SPRINT3-POST-E2A9-CURRENT-PRODUCT-ROOT-GATE-A-20260922-R1` **PASS** | **`1969/1969`** (**137/137** files), wiki **58**, harness **2/2**, web build **PASS** @ product **`a3776c1`** (hygiene repair after **`e2a9e08`**) — historical; superseded by post–F-02 lineage |
| Post–F-02 local delta publication pristine root gate + production web build | `SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1` **PASS** | **`1972/1972`** (**137/137** files), wiki **58**, harness **2/2**, web build **PASS** @ product **`ae23fb9`** (Sprint2 F-02 multi-tournament yearly progression) — historical; superseded by post–TE-011 lineage |
| S03-005 TE-011 regression publication pristine root gate + production web build | `SPRINT3-S03-005-TE011-PUBLICATION-GATE-A-20260923-R1` **PASS** | **`1973/1973`** (**137/137** files), wiki **58**, harness **2/2**, web build **PASS** @ product **`d62778c`** — historical; superseded by S03-006 PTG publication |
| S03-006 PTG-011/012 regression publication pristine root gate + production web build | `SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1` **PASS** | **`1975/1975`** (**137/137** files), wiki **58**, harness **2/2**, web build **PASS** @ product **`bb4ed45`** — **live release-gate binding** |

**Current-master product bytes on canonical `origin/master`:** latest accepted `apps/` + `packages/` product lineage is **`bb4ed45`** (S03-006 PTG-011/PTG-012 test-only regression publication; parent product `d62778c`). Control-only commits may advance tip without changing product SHA. Any later product publication must establish a fresh exact-lineage gate before replacing this binding.

## Current disposition

- Sprint3: **REOPENED_FIX_REQUIRED** — formal **`CLOSED` not assigned**.
- Sprint2: **REOPENED_FIX_REQUIRED** (see `SPRINT2_STATUS.md`).
- **Superseded shared blocker pointer:** web-build recovery task `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1` — **not active**; terminal B2/A playability and S03-070 UI evidence supersede it.
- **Live release-gate binding:** terminal pristine root gate **`SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1` PASS** @ product **`bb4ed45`** (**1975/1975**, **137/137** files, web production build **PASS**). TE-011 @ **`d62778c`**, post–F-02 @ **`ae23fb9`**, post–E2A9 @ **`a3776c1`**, **S03-072** @ **`fdeed36`**, and post-WF14 @ **`7004411`** remain historical evidence only for earlier lineages.
- **S03-006 PTG publication (terminal):** `SPRINT3-S03-006-PTG-REGRESSION-PUBLICATION-GATE-A-20260923-R1` **PASS** → PTG-011/PTG-012 canonical @ **`bb4ed45`**; test-only product delta, no formal **CLOSED** assignment.
- **S03-006 ordinary-flow residual:** no dedicated real-browser ordinary weekly `train_stat` evidence with live family-derived `parent_temporary_guidance`; see `ROLE1-S03-006-ORDINARY-FLOW-ACCEPTANCE-RESIDUAL-20260923-R14`. Do not relabel unrelated Person Detail browser evidence as this slice.
- **S03-005 spec-source audit (historical predecessor):** `SPRINT3-S03-005-CURRENT-MASTER-EFFICIENCY-SPEC-SOURCE-AUDIT-A-20260923-R1` **PASS** → TE-011 @ **`d62778c`**.
- **S03-073 B2 verification (terminal, no new product SHA):** `SPRINT3-S03-073-COMPLETED-TEACH-OUTCOME-SEMANTIC-INVARIANT-B2-20260922-R1` **PASS** — completed-teach semantic invariant already on **`4a0a80f`**.
- Do not return Sprint3 to **CLOSED** until PM/control assigns formal closure with independently proven applicable current-master gates and UI acceptance.
