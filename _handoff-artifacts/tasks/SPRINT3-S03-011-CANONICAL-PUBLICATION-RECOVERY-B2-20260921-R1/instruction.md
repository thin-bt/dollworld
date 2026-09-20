# SPRINT3-S03-011-CANONICAL-PUBLICATION-RECOVERY-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: PRODUCT_PUBLICATION_RECOVERY
control-authority: GitHub thin-bt/dollworld master

## Gap
Canonical `docs/SPRINT_3_BACKLOG.md` states S03-011 first-use MatchId founding-history persistence is locally implemented but blocked only on canonical S03-009 publication. Cursor A now owns the unique S03-009 canonical-publication recovery. B2 is IDLE after releasing stale S03-009 authority. Prepare the non-conflicting S03-011 publication recovery now; do not modify or publish S03-009-owned files/deltas.

## Required execution
1. Fresh-read canonical master, this instruction, A/B2 controls, latest S03-009/S03-011 results, backlog and relevant source before claiming.
2. Claim B2 ACTIVE for this exact task.
3. Locate the already reported local S03-011 implementation/evidence. Reconcile it against latest master without consuming S03-009 local authority.
4. If S03-011 can be cleanly published without S03-009 source publication, publish only its independent source/test deltas and verify focused tests/build.
5. If compile/runtime dependency strictly requires S03-009 canonical symbols, do not fabricate completion: publish a terminal BLOCKED result containing exact missing symbol/file dependencies and a ready-to-apply publication boundary. Return B2 IDLE so it can be immediately redispatched when A lands S03-009.
6. If A has landed S03-009 by execution time, rebase/reconcile S03-011 immediately, run focused tests + simulation-core build/check as applicable, commit/push product source/tests to canonical master, and verify GitHub readback.
7. READY requires product source/test publication on canonical master plus real master SHA/readback; local-only READY is forbidden.

## Non-conflict boundary
- A exclusively owns `SPRINT3-S03-009-CANONICAL-PUBLICATION-RECOVERY-A-20260921-R1` and all S03-009 publication/reconciliation.
- B2 owns only S03-011 first-use MatchId founding-history persistence/publication.
- Do not change S03-010 behavior except minimal compile adaptation strictly required by already-published contracts.

## Acceptance evidence
Terminal result must record result class, product commit SHA when READY, exact source/test paths, commands/results, canonical GitHub readback, and any dependency blocker if not READY.