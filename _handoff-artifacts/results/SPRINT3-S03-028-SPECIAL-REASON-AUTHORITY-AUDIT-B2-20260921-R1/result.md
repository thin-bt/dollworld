# SPRINT3-S03-028-SPECIAL-REASON-AUTHORITY-AUDIT-B2-20260921-R1

state: TERMINAL
terminal: SPRINT3_S03_028_SPECIAL_REASON_AUTHORITY_AUDIT_B2_READY
verificationOutcome: PASS
lane: B2
updatedAt: 2026-09-21T13:10:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-verify: 916a1cf7ff4bf9508f6617d5f17d88abb7258af1
canonical-product-sha: 8e9b825be269a6660cdd36a74fc55cd2ed138240
local-worktree-head-at-verify: 2674b9ff682d9ffc8d93e71755463135d59b1cdb
pickup: ACTIVE_IDLE / SDK_EXECUTOR
recovery: CURSOR-B2-001 — bounded attempt1 per check family; no same-case retry after exhaust
production-change: NO
parallel-with: SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1 (A; closed READY)
successor-a-track: SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1 (A; READY_FOR_PICKUP on canonical master handoff)

## Summary

Independent authority audit for enrollment `EnrollmentSpecialReason` / live `activeSpecialReasons` materialization on canonical product **`8e9b825`**. After **S03-028**, four of five supported reasons are **derivable YES** from canonical live-world facts at `materializeLiveEnrollmentQueueBoundaries()` time. **`rebellion_against_parent` remains derivable NO** — no persisted child↔parent rebellion/attitude fact exists in `Person`/world/runtime schema; evaluator-only (EN-008). **S03-026 “no product gap” is superseded** for this slice: the live `activeSpecialReasons: []` gap was real pre-**8e9b825** and is now **mostly closed**; Sprint3 **must not** be labeled formally **CLOSED** while rebellion live path is unreachable and **S03-029** is not terminal.

## Authority matrix (supported `EnrollmentSpecialReason`)

| Reason | Normative spec | Required live fact | Canonical source field/path | Live derivable | Evidence anchor |
|--------|----------------|--------------------|-----------------------------|----------------|-----------------|
| `parent_intake_limit_reached` | `docs/SPEC.md` §8歳時の師匠決定 item 3 — 親の受入上限 | Qualified biological parent with autonomous intake **reject** or **defer** | `EnrollmentMasterCandidate.intakeAcceptance` from `resolveLiveMaterializedIntakeAcceptance` → S03-004 `evaluateMasterIntakeDecision` + `weeklyTrainingSidecars` disciple counts | **YES** | `derive-live-enrollment-active-special-reasons.ts` L44–58; LESR-004 |
| `aptitude_lineage_mismatch` | Same § — 適性と親の流派が合わない | Child and qualified accepting parent both have `lineageId` and values **differ** | `Person.lineageId` (`domain.ts`) via `parentPersonById` + materialized parent candidates | **YES** | Derivation L61–80; types `EnrollmentSpecialReason` @ `types.ts` L456–461 |
| `superior_master_invitation` | Same § — 格上の師匠から勧誘 | Among qualified **accept** candidates, some non-parent `highestRank` strictly exceeds all qualified accepting parents | `MasterQualificationEvaluationRecord.highestRank` on materialized candidates; compare via `RANK_ORDER` | **YES** | Derivation L93–106; LESR-002/003 |
| `poor_parent_child_compatibility` | Same § — 親子相性が悪い | Max `parentChildCompatibilityScore` among qualified accepting non-parents **>** parents' max | `buildMasterCandidate` → `parentChildCompatibilityScore` from mean surface aptitude delta (`materialize-live-mentorship-entrypoint-queues.ts` L88–90) | **YES** | Derivation L108–116; LESR-002 |
| `rebellion_against_parent` | Same § — 本人が親へ反発している | Canonical persisted rebellion/attitude toward biological parent | **None** — not on `Person`, sidecar, or enrollment runtime; derivation never adds this reason | **NO** | A S03-028 result prerequisite gap; LESR asserts `not.toContain("rebellion_against_parent")`; EN-008 injects reason only in pure tests |

**Live wiring (post-S03-028):** `runSprint1WeeklyStep` → `materializeLiveEnrollmentQueueBoundaries` → `deriveLiveEnrollmentActiveSpecialReasons` → boundary record → `processSprint3EnrollmentIntakeBoundary` → `evaluateEnrollmentAssignment` (`allowsAlternateFormalMaster` @ `evaluate-enrollment-assignment.ts` L81–88, L251–260).

**Pre-S03-028 @ `47bdb9b` (S03-026 baseline):** `activeSpecialReasons` was hardcoded `[]` for every live boundary — all five reasons were **live-unreachable** even when canonical facts existed; only pure evaluator tests could exercise alternate-master paths.

## S03-026 `no product gap` classification (current master)

| Question | Disposition | Canonical evidence |
|----------|-------------|-------------------|
| Was S03-026 still valid at **`47bdb9b`** for enrollment special reasons? | **Superseded (slice-specific gap)** | S03-028 A instruction + pre-fix `materialize-live-mentorship-entrypoint-queues.ts` always `activeSpecialReasons: []`; S03-026 chain table did not assert special-reason materialization |
| Is there a real S03-028 gap on **`8e9b825`**? | **Closed for 4/5 reasons** | A terminal **READY**; `derive-live-enrollment-active-special-reasons.ts` on product; LESR-001..005 **PASS** |
| Remaining product authority gap? | **YES — one reason** | `rebellion_against_parent` live-unreachable until persisted signal exists; **S03-029** dispatched on `origin/master` (`916a1cf`) for A closure |
| Sprint3 formal **CLOSED** label? | **NO** | Rebellion path unreachable; A **S03-029** not terminal; `docs/SPRINT_3_BACKLOG.md` has no S03-028 row yet (S03-027 reconciliation predates S03-028) |

## Verification (CURSOR-B2-001)

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read `origin/master` + product tree diff (`packages docs apps`) | 1 | **PASS** — local HEAD **`2674b9f`** vs **`916a1cf`**: **empty product diff**; product tip for S03-028 code = **`8e9b825`** |
| `@shared-world/simulation-core` typecheck | 1 | **PASS** |
| Focused enrollment authority vitest (LESR + EN) | 1 | **PASS** — **15/15** (`live-enrollment-special-reason-materialization.test.ts`, `enrollment-assignment.test.ts`) |
| Root `npm run check` | — | **not run** (instruction §6 — avoid duplicating A implementation gate) |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master HEAD
git diff HEAD origin/master -- packages docs apps
git rev-list -1 origin/master -- packages/simulation-core/src/sprint3/derive-live-enrollment-active-special-reasons.ts
npm run typecheck -w @shared-world/simulation-core
npx vitest run packages/simulation-core/src/sprint3/live-enrollment-special-reason-materialization.test.ts packages/simulation-core/src/sprint3/enrollment-assignment.test.ts
```

## Non-conflict guard

- **No** Cursor A control files read or written (`CURSOR_INBOX.md`, `CURSOR_ACTIVE_TASK.md`).
- **No** A-owned S03-028 production/tests/task/result edits.
- **No** `docs/SPRINT_3_BACKLOG.md` edit (await A/S03-029 terminal + PM reconciliation).
- **No** Sprint4 work.

## GitHub canonical readback

```text
origin/master @ 916a1cf7ff4bf9508f6617d5f17d88abb7258af1
product S03-028 commit @ 8e9b825be269a6660cdd36a74fc55cd2ed138240
packages/docs/apps: identical @ local 2674b9f and origin 916a1cf
result path: local publish pending executor push to thin-bt/dollworld master
```

## Terminal

**READY** — Reason-by-reason authority matrix and S03-026 closure reclassification complete. Formal Sprint3 close remains **deferred**: one supported special reason lacks live canonical source; follow **S03-029** A terminal before PM formal-close.
