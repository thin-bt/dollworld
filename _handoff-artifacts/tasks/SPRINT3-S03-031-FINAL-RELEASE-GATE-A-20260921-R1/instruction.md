# SPRINT3-S03-031-FINAL-RELEASE-GATE-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: DEADLINE_CRITICAL_RELEASE_GATE
control-authority: GitHub
authority-ref: thin-bt/dollworld master
predecessor: SPRINT3-S03-030-REBELLION-SIGNAL-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1
parallel-with: SPRINT3-S03-030-FORMAL-CLOSE-RECONCILIATION-B2-20260921-R1

## Purpose

Run the final independent release gate against canonical master after S03-030 published the rebellion signal product behavior. This is verification/release evidence only; B2 owns backlog/formal-close evidence reconciliation.

## Required execution

1. Fresh-read canonical protocol, current A/B2 control, S03-030 A result, current master, and current Sprint3 backlog.
2. Claim A ACTIVE using executor protocol.
3. Verify canonical master contains S03-030 rebellion signal runtime/materialization code and no unpublished product delta is required.
4. Run fresh root `npm run check` on current canonical master. Also run the focused live enrollment special-reason/materialization tests if root check does not make their status explicit.
5. Verify `_handoff-artifacts/` root hygiene; do not create scratch there. Any scratch must be under `_handoff-artifacts/control-tmp/` and cleaned/archived in the same run.
6. Do not edit B2-owned backlog/reconciliation files and do not start Sprint4.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-031-FINAL-RELEASE-GATE-A-20260921-R1/result.md` with exact canonical master SHA and exact gate counts. Return A to IDLE.

## Acceptance

READY only if canonical master after S03-030 passes the fresh required root release gate and focused rebellion/special-reason behavior is present. Otherwise publish FIX_REQUIRED/BLOCKED with exact failure evidence for immediate PM dispatch.