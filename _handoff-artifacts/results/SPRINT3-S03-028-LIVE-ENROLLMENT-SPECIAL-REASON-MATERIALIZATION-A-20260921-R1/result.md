# SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1

state: READY
terminal: S03_028_LIVE_ENROLLMENT_SPECIAL_REASON_MATERIALIZATION_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T13:01:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: f8891d6a7281369a0da26a0cea88d69e772f62ae
product-commit-sha: 8e9b825be269a6660cdd36a74fc55cd2ed138240
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-020-LIVE-TECHNIQUE-LOSS-WIRING-ROLE3-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

Closed the live enrollment gap where `materializeLiveEnrollmentQueueBoundaries()` always emitted `activeSpecialReasons: []`, making the S03-003 **special reason → alternate formal master** branch unreachable whenever a qualified, intake-accepting biological parent existed.

Added `deriveLiveEnrollmentActiveSpecialReasons()` and wired it into live enrollment boundary materialization. Derivation uses only canonical facts already present at materialization time:

| Reason | Canonical source fact |
|--------|------------------------|
| `parent_intake_limit_reached` | Qualified biological parent with S03-004 intake `reject` or `defer` (autonomous limit) |
| `aptitude_lineage_mismatch` | Child and qualified accepting parent both have `lineageId` and they differ |
| `superior_master_invitation` | Qualified accepting non-parent `highestRank` strictly exceeds all qualified accepting parents |
| `poor_parent_child_compatibility` | Max materialized `parentChildCompatibilityScore` among qualified accepting non-parents exceeds parents' max |
| `rebellion_against_parent` | **Not materialized** — no canonical live-world state/schema for parent rebellion (prerequisite gap documented below) |

**Live call chain:** `runSprint1WeeklyStep` → `materializeLiveEnrollmentQueueBoundaries` → `deriveLiveEnrollmentActiveSpecialReasons` → `processSprint3EnrollmentIntakeBoundary` → `evaluateEnrollmentAssignment`.

## Prerequisite gap (not fabricated)

`rebellion_against_parent` remains evaluator-only until a canonical persisted child↔parent attitude or rebellion signal exists in world/runtime schema (outside S03-028 scope).

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-enrollment-special-reason-materialization.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| LESR-001..005 | **PASS** | `live-enrollment-special-reason-materialization.test.ts` (5 tests) |
| LEC regression | **PASS** | `live-mentorship-queue-materialization.test.ts` |
| `npm run check` | **PASS** | **124** files, **1894/1894** tests |

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- Did not modify B2-owned S03-027 backlog reconciliation.
- No Sprint4 work.

## Terminal

**READY** — live enrollment boundaries now materialize deterministic `activeSpecialReasons` from canonical facts, enabling alternate formal master selection under S03-003 when parents remain qualified and accepting.
