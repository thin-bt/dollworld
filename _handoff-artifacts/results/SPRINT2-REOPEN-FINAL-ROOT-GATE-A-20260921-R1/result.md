# SPRINT2-REOPEN-FINAL-ROOT-GATE-A-20260921-R1

state: TERMINAL
terminal: SUPERSEDED
resultClass: SUPERSEDED_BY_CURRENT_MASTER_SPRINT3_GATE
lane: A
updatedAt: 2026-09-22T04:04:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
production-change: NO

## Control disposition

This PREPARED task is consumed without execution because its original Sprint2 status-transition dependency is no longer live: canonical `_handoff-artifacts/control/SPRINT2_STATUS.md` is `CLOSED` and explicitly classifies this old A root gate as non-blocking release hygiene.

A newer, stricter current-master release-gate chain now owns the same release-hygiene concern for Sprint3. `SPRINT3-S03-048-CURRENT-MASTER-TIMEOUT-CLASSIFICATION-B2-20260922-R1` classified the remaining root-gate failures as load/concurrency, and active B2 task `SPRINT3-S03-049-ROOT-GATE-CONCURRENCY-CLOSURE-B2-20260922-R1` is the canonical current-master closure task. Running this stale Sprint2 gate in parallel would duplicate the root gate and compete for the same executor resources that S03-048 identified as the failure mechanism.

## Evidence

- Sprint2 canonical status: `CLOSED`; this A task is release hygiene and not a Sprint2 reopen blocker.
- Sprint3 canonical status: `READY_FOR_FORMAL_CLOSE`, pending current-master root-gate evidence before PM formal close.
- S03-048: isolated ST-012/CHK-009 green; full root gate timeout-only failures under load.
- S03-049: active B2 task for minimal repository-level runner scheduling/concurrency correction followed by exactly one bounded root `npm run check`.
- Role1 S03-049 precondition audit: `READY / PRECONDITION_CONFIRMED` on canonical master.

## Non-conflict / hygiene

No product files changed. No B2 control state changed. No transient scratch was created. No root-level `_handoff-artifacts/` temp path was introduced.

## Terminal

**SUPERSEDED** — consume the stale A PREPARED item rather than repeatedly redispatching or rewriting its timestamp. Current-master release-gate authority remains with S03-049 B2; this result does not authorize Sprint3 `CLOSED`.