# SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: DEADLINE_CRITICAL
mode: PRODUCT_IMPLEMENTATION
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Objective
Close the next explicit Sprint3 product gap after canonical S03-010 READY: persist the generated/original technique's first-use battle MatchId exactly once, without conflicting with B2-owned S03-009 weekly runtime wiring.

## Fresh-read requirements
Before editing, read current master, protocol, Cursor A/B2 control state, latest S03-009/S03-010 results, Sprint3 source/config/tests, and existing battle/MatchId persistence types. Claim Cursor A ACTIVE before product changes.

## Scope
- Identify the canonical generated/original-technique state that survives world progression and the battle completion/handoff boundary that has authoritative MatchId.
- Add the narrow S03-011 wiring so first qualifying battle use records that MatchId on the technique lifecycle/registration state.
- First-use semantics: unset -> current authoritative MatchId; once set, later battles must not overwrite it.
- Do not synthesize a MatchId and do not change battle identity semantics.
- Preserve deterministic replay/serialization behavior and existing Sprint1/Sprint2 battle contracts.
- Add focused regression tests for first qualifying use, repeated use/no overwrite, non-use/no write, and deterministic/serialization behavior where applicable.
- Run simulation-core typecheck/build and the relevant Sprint3 focused regression bundle; run broader root check if feasible.
- Publish product changes to canonical master and publish terminal result under `_handoff-artifacts/results/SPRINT3-S03-011-FIRST-USE-MATCHID-PERSISTENCE-A-20260921-R1/result.md` with exact commands/results and published SHA.

## Collision guard
- B2 owns `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`; do not edit B2 control/task/result artifacts or broaden into its weekly accumulation/generation wiring.
- Rebase/fresh-read before publish if B2 lands changes first; adapt to canonical interfaces rather than reverting them.

## Terminal
READY requires real canonical master publication/readback plus evidence. BLOCKED must name the exact missing canonical dependency and leave no speculative product commit.