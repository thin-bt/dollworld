# SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1

state: READY
terminal: S03_029_REBELLION_SIGNAL_PREREQUISITE_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T13:18:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: (local — push pending executor)
product-commit-sha: 894a701acb362368adee6d93fe268d39d90b5535
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1
production-change: YES
gapOutcome: PRODUCT_GAP_CLOSED

## Summary

S03-028 documented that `rebellion_against_parent` was evaluator-only because no canonical persisted child↔parent rebellion fact existed in live world/runtime. Fresh-read of `docs/SPEC.md` §8歳時の師匠決定 authorizes the special reason conceptually but does **not** define an existing world field, threshold, or autonomous generation rule—so inferring rebellion from personality, compatibility, or other unrelated fields was rejected.

Added the smallest explicit persisted signal on Sprint3 mentorship entrypoint runtime:

| Artifact | Role |
|----------|------|
| `enrollmentParentRebellionChildPersonIds` | Sorted explicit child ids with declared parent-rebellion at enrollment (runtime schema **0.2.0**, accepts **0.1.0** reload with empty default) |
| `enrollment-parent-rebellion-signal.ts` | `childHasEnrollmentParentRebellionSignal` / `withEnrollmentParentRebellionSignalForChild` (caller-owned; no autonomous derivation) |
| `deriveLiveEnrollmentActiveSpecialReasons` | Emits `rebellion_against_parent` when signal active and at least one qualified accepting biological parent exists |
| `materializeLiveEnrollmentQueueBoundaries` | Reads persisted runtime signal at materialization time |

**Live call chain:** `runSprint1WeeklyStep` → `materializeLiveEnrollmentQueueBoundaries` → runtime rebellion lookup → `deriveLiveEnrollmentActiveSpecialReasons` → `processSprint3EnrollmentIntakeBoundary` → `evaluateEnrollmentAssignment`.

**Out of scope (explicit):** Autonomous rebellion probability, childhood-influence generation, and inferring rebellion from unrelated person fields. Population of the signal remains caller/explicit-state responsibility until a future accepted source defines generation.

## Authority evidence

| Source | Finding |
|--------|---------|
| `docs/SPEC.md` L610, L672–673 | Lists 「親への反発が強い / 本人が親へ反発している」 as enrollment special reasons |
| `Parent` / `Person` / `parent_child` relationship schemas | No rebellion or attitude field |
| S03-028 result | Prerequisite gap explicitly deferred rebellion materialization |
| Prior sprint3 runtime (0.1.0) | No rebellion signal keys |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld
npm run test -- --run packages/simulation-core/src/sprint3/live-enrollment-special-reason-materialization.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts
npm run check
```

| Gate | Result | Detail |
|------|--------|--------|
| LESR-001..007 | **PASS** | `live-enrollment-special-reason-materialization.test.ts` (7 tests; LESR-006/007 rebellion positive/negative + reload) |
| LEC regression | **PASS** | `live-mentorship-queue-materialization.test.ts` |
| `npm run check` | **PASS** | **124** files, **1896/1896** tests |

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- Did not modify B2-owned S03-028 authority-audit artifacts.
- No Sprint4 work.

## Product commit

| SHA | Message |
|-----|---------|
| `894a701` | Wire persisted enrollment parent-rebellion signal for live special-reason materialization. |

## Terminal

**READY** — `rebellion_against_parent` is live-materializable from explicit persisted runtime facts with validation/reload and end-to-end enrollment boundary tests; autonomous rebellion generation remains a future authority decision.
