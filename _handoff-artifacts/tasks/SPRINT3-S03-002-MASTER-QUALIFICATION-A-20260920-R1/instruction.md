# SPRINT3-S03-002-MASTER-QUALIFICATION-A-20260920-R1

state: PREPARED
lane: A
sprint: Sprint3
priority: IMMEDIATE
mode: S03_002_IMPLEMENTATION
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
predecessor: SPRINT3-FIRST-SLICE-AUTHORITY-AND-IMPLEMENTATION-A-20260920-R1

## Objective
Implement canonical backlog S03-002 — 師匠資格評価（config 閾値・引退後判定） on top of S03-001.

## Required work
1. Fresh-read docs/SPRINT_3_BACKLOG.md, docs/specs/15-sprint3-config-schema.md, docs/SPEC.md mentorship/master qualification requirements, current packages/simulation-core/src/sprint3/**, and newest canonical master before edits.
2. Define config-driven master qualification threshold schema and validation. Do not hard-code balance numbers that are not authoritative in SPEC; if a numeric policy remains genuinely undefined, represent the authority gap explicitly rather than inventing a value.
3. Implement deterministic pure qualification evaluation including post-retirement eligibility boundary required by S03-002.
4. Enforce configVersion/content immutability rules established by S03-001; threshold changes require a new configVersion.
5. Add focused tests for qualifying/non-qualifying records, boundary values, retired/active eligibility as specified, malformed/missing thresholds, and deterministic behavior.
6. Preserve Sprint2 visual/product baseline and do not implement S03-003+ behavior, weekly teach, enrollment AI, or Sprint4 retirement/genetics scope.
7. Run the strongest relevant build/tests/checks. If root npm run check is blocked only by pre-existing unrelated drift, record exact evidence and still run touched-scope checks to green.
8. Publish product changes to canonical master, then publish terminal result at _handoff-artifacts/results/SPRINT3-S03-002-MASTER-QUALIFICATION-A-20260920-R1/result.md.

## Terminal
READY only when canonical master contains the tested S03-002 implementation and the next unique Sprint3 gap is named. FIX_REQUIRED only for a concrete authority/implementation blocker with exact evidence; do not idle if an executable non-conflicting continuation exists.
