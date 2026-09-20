# SPRINT3-PRE-S03-015-CANONICAL-EVIDENCE-MANIFEST-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Context

Canonical master has recovered the root release gate: `SPRINT3-ROOT-FORMAT-LINT-RECOVERY-A-20260921-R1` reports `npm run check` PASS at product commit `bfdb9f230f6d0eef030fd78c88f174365ff53e6b` with 1848/1848 tests. `docs/SPRINT_3_BACKLOG.md` now records S03-009 and S03-011 implemented on canonical master. Cursor B2 independently owns `SPRINT3-S03-015-GENERATED-TECHNIQUE-BATTLE-CONSUMPTION-B2-20260921-R1`; do not duplicate or edit that product area.

## Required work

1. Fresh-read GitHub canonical protocol, A/B2 control, current `docs/SPRINT_3_BACKLOG.md`, `docs/specs/15-sprint3-config-schema.md`, newest Sprint3 results, and current master before changes.
2. Claim this exact task ACTIVE before work.
3. Build a concrete canonical Sprint3 release-evidence manifest from master for completed scope through S03-014, excluding B2-owned S03-015. For each S03-001..S03-014, identify the canonical result/task evidence and at least one authoritative source/test anchor on master. Do not infer local-only work.
4. Re-run or directly verify the minimum bounded gates needed to prove the post-format-recovery master remains releasable: root `npm run check` plus focused Sprint3 tests if the current master tip differs materially from `bfdb9f2`. Record exact commands, counts, SHA and failures.
5. Verify backlog/spec truth against source for S03-001..014. If a stale documentation statement is found and it is not B2/S03-015-owned, make only the bounded documentation correction and re-run relevant docs/wiki gate. Do not change gameplay semantics.
6. Explicitly leave S03-015 final closure pending B2 terminal evidence. Do not declare full Sprint3 READY while S03-015 is PREPARED/ACTIVE or lacks canonical terminal READY evidence.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-PRE-S03-015-CANONICAL-EVIDENCE-MANIFEST-A-20260921-R1/result.md` containing the evidence matrix, current master SHA, gate outputs, any bounded docs commit SHA, and exact remaining blockers/dependencies.
8. READY for this task means the pre-S03-015 evidence manifest itself is complete and canonical; it does not mean Sprint3 final release acceptance.
9. Return Cursor A to IDLE after terminal result publication and verify canonical GitHub readback.

## Non-conflict guard

- B2 exclusively owns S03-015 generated-technique production battle consumption verification/integration and its tests/result.
- Do not edit B2 control/task/result paths.
- No Sprint4 work.
- No gameplay-semantic changes unless a newly discovered release regression is both outside B2 ownership and can be repaired safely and boundedly in this run; if not, publish precise BLOCKED evidence instead.
