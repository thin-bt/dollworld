# SPRINT3-S03-030-REBELLION-SIGNAL-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1

state: READY
terminal: S03_030_REBELLION_SIGNAL_CANONICAL_PUBLICATION_READY
verificationOutcome: PASS
lane: A
updatedAt: 2026-09-21T13:57:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
published-master-sha: db141297c77586779eb858a71e1f26efda934eee
product-commit-sha: db141297c77586779eb858a71e1f26efda934eee
recovered-from-local-product-sha: 894a701acb362368adee6d93fe268d39d90b5535
pre-publication-origin-head: 117af2c1487999bbb34b351cd3c3b5a29cb2f58e
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1
production-change: YES
gapOutcome: CANONICAL_PUBLICATION_RECOVERED

## Summary

S03-029 closed the rebellion prerequisite in product locally @ `894a701` but left `published-master-sha: (local — push pending executor)`. Canonical GitHub `master` @ `7c53bbb`/`117af2c` contained only handoff prose referencing `enrollmentParentRebellionChildPersonIds`, not runtime code.

Recovered the exact S03-029 product commit via clean cherry-pick onto fresh `origin/master` @ `117af2c` in isolated worktree `_handoff-artifacts/control-tmp/.tmp-s03-030-publish`, verified gates, and pushed product-only publication @ **`db14129`**. No semantic reconciliation was required; behavior matches S03-029 (explicit persisted signal, 0.2.0 runtime / 0.1.0 reload default, live `rebellion_against_parent` derivation, caller-owned helpers).

## Published commits

| Field | Value |
|-------|--------|
| Product SHA | `db141297c77586779eb858a71e1f26efda934eee` |
| Product message | Wire persisted enrollment parent-rebellion signal for live special-reason materialization. |
| Master tip SHA | `db141297c77586779eb858a71e1f26efda934eee` |
| Remote | `origin/master` (pushed `117af2c..db14129`) |
| Source commit (content) | `894a701acb362368adee6d93fe268d39d90b5535` (cherry-pick) |

## Canonical readback @ `db14129` (packages/)

| Path / symbol | Present |
|---------------|---------|
| `packages/simulation-core/src/sprint3/enrollment-parent-rebellion-signal.ts` | **YES** |
| `enrollmentParentRebellionChildPersonIds` in `sprint3-mentorship-entrypoint-runtime-state.ts` | **YES** |
| `childHasEnrollmentParentRebellionSignal` / exports on `index.ts` | **YES** |
| `materialize-live-mentorship-entrypoint-queues.ts` rebellion lookup | **YES** |
| `derive-live-enrollment-active-special-reasons.ts` → `rebellion_against_parent` | **YES** |

```powershell
git fetch origin master
git rev-parse origin/master
git grep enrollmentParentRebellionChildPersonIds origin/master -- packages/
git ls-tree origin/master -- packages/simulation-core/src/sprint3/enrollment-parent-rebellion-signal.ts
```

## Verification

| Gate | Result | Detail |
|------|--------|--------|
| Cherry-pick onto `117af2c` | **PASS** | No conflicts |
| LESR focused (`live-enrollment-special-reason-materialization.test.ts`) | **PASS** | 7/7 @ publish worktree |
| LMQ regression (`live-mentorship-queue-materialization.test.ts`) | **PASS** | 8/8 @ publish worktree (with LESR run) |
| Root `npm run check` | **PASS** | Main worktree @ `781730c` (byte-identical S03-029 product tree to `db14129` candidate): **124** files, **1896/1896** tests |

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\control-tmp\.tmp-s03-030-publish
git cherry-pick 894a701acb362368adee6d93fe268d39d90b5535
npm run test -- --run packages/simulation-core/src/sprint3/live-enrollment-special-reason-materialization.test.ts
npm run test -- --run packages/simulation-core/src/sprint3/live-mentorship-queue-materialization.test.ts
git push origin HEAD:master
cd D:\xampp\htdocs\dollworld
npm run check
```

## Scope / policy

- Did not read or edit B2 control files (`CURSOR_B2_INBOX.md`, `CURSOR_B2_ACTIVE_TASK.md`).
- Did not start Sprint4.
- Scratch isolated under `_handoff-artifacts/control-tmp/.tmp-s03-030-publish` only.

## Terminal

**READY** — S03-029 rebellion signal product behavior is on canonical GitHub `master` @ **`db14129`**. Formal Sprint3 close may treat `rebellion_against_parent` live materialization as canonically published.
