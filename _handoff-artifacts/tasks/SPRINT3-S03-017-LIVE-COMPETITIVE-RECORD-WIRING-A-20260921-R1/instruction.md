# SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1

state: READY_FOR_PICKUP
lane: A
sprint: Sprint3
mode: PRODUCT_IMPLEMENTATION
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor: SPRINT3-S03-016-LIVE-MASTER-QUALIFICATION-PERSISTENCE-ROLE3-20260921-R1

## Objective

Close the concrete residual gap recorded by S03-016: live weekly qualification currently accepts optional Sprint2 competitive records, but the production weekly path does not yet supply the authoritative Sprint2 record maps.

Implement the smallest correct production wiring so live master qualification derivation can consume the authoritative competitive record data when available, without changing qualification rules.

## Required work

1. Fresh-read S03-016 result and current Sprint3 qualification/runtime source on canonical master.
2. Locate the authoritative Sprint2 competitive-record state/map used by the live world/runtime.
3. Thread that data into the existing S03-016 qualification derivation/refresh/materialization path.
4. Preserve deterministic behavior when records are absent.
5. Do not modify generated-technique battle-consumption code owned by completed S03-015.
6. Add/update focused regression coverage for live qualification with and without competitive records.
7. Run the relevant focused tests plus the strongest practical release gate; record exact results.
8. Publish product changes to canonical master.
9. Write terminal result to _handoff-artifacts/results/SPRINT3-S03-017-LIVE-COMPETITIVE-RECORD-WIRING-A-20260921-R1/result.md and return A to IDLE.

## Terminal

READY only if the production live weekly path actually supplies authoritative competitive records where available and verification passes. Otherwise publish the exact BLOCKED/FIX_REQUIRED evidence.
