# SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1

state: READY_FOR_PICKUP
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-028-LIVE-ENROLLMENT-SPECIAL-REASON-MATERIALIZATION-A-20260921-R1

## Objective

Close the concrete prerequisite gap recorded by S03-028: `rebellion_against_parent` is evaluator-only because live world/runtime currently has no canonical persisted child-parent rebellion/attitude signal available to enrollment materialization.

## Required work

1. Fresh-read S03-028 result, Sprint3 source/spec/backlog evidence, current Person/world/runtime schemas, enrollment evaluator and live materialization on canonical master.
2. Determine whether an existing canonical persisted fact can authoritatively represent `rebellion_against_parent`. Do not infer or fabricate rebellion from unrelated fields.
3. If authority exists, wire the smallest deterministic persisted/live signal through world/runtime into `deriveLiveEnrollmentActiveSpecialReasons()` and cover persistence/reload plus positive/negative materialization tests.
4. If no authority exists but Sprint3 accepted source clearly requires the reason to be live-reachable, add the smallest explicit persisted schema/state representation consistent with existing versioning/migration contracts, then wire it end-to-end. Do not invent probability or autonomous generation rules not present in accepted source.
5. If accepted source does not authorize creating such state in Sprint3, publish BLOCKED_SCOPE_AUTHORITY with exact evidence and a precise next decision/task rather than fabricating semantics.
6. Do not modify B2-owned S03-028 authority-audit files/control/result.
7. Run focused tests and strongest practical root release gate; publish product changes to canonical master when applicable.
8. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-029-REBELLION-SIGNAL-PREREQUISITE-A-20260921-R1/result.md` and return A Inbox to IDLE.

## Terminal

READY only with an authoritative end-to-end live signal and passing verification. Otherwise terminal must state the exact authority blocker and evidence.