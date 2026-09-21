# SPRINT3-S03-055-PERSON-DETAIL-REVERSE-DISCIPLE-OBSERVABILITY-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
source-evidence: _handoff-artifacts/results/ROLE2-SPRINT3-PERSON-DETAIL-MENTORSHIP-OBSERVABILITY-AUDIT-20260922-R1/result.md
preparedAt: 2026-09-22T08:01:56+09:00

## Objective
Close the Role2-confirmed Sprint3 Person Detail observability gap: current accepted UI-005 exposes disciple -> formal master but not master -> current formal disciples.

## Required execution
1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, this instruction, the Role2 source-gap result, current Sprint3 status/backlog, and fresh `origin/master`.
2. Claim lane A ACTIVE before changes. Do not read/create/use any Role inbox.
3. Resolve the accepted observer contract contract-first. Do not silently widen/break the existing UI-005 exact25 contract. Use the narrowest compatible contract/versioning/adjacent-view approach supported by existing repository conventions.
4. Derive current formal disciples from canonical mentorship state; do not create a second mutable relationship truth.
5. Render reverse disciple observability on ordinary Person Detail with display names as links while preserving canonical personId in href/data attributes and deterministic fallback for stale/missing person records.
6. Cover zero/one/many disciples plus stale/missing-person fallback with focused server/client/browser acceptance appropriate to the chosen contract.
7. Run focused checks for the changed slice. Do not weaken assertions, increase timeouts, reduce workload, or alter unrelated behavior to obtain green.
8. Publish the implementation to canonical `master`, then publish terminal evidence at `_handoff-artifacts/results/SPRINT3-S03-055-PERSON-DETAIL-REVERSE-DISCIPLE-OBSERVABILITY-A-20260922-R1/result.md` with exact product/master SHA and focused pass counts. Do not label Sprint3 CLOSED.
9. Do not duplicate or interfere with B2 S03-054 current-master root-gate execution. A root gate after this product publication must be reconciled as a separate current-master gate if S03-054 tested a pre-S03-055 SHA.
10. Workspace hygiene: no transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` and correct any root-level transient defect found.

## Acceptance
- Reverse master -> current formal disciple observability exists on ordinary Person Detail.
- Existing disciple -> master behavior remains intact.
- Contract evolution is explicit and does not silently violate UI-005 exact25.
- Reverse relation is derived from canonical mentorship state.
- zero/one/many and stale/missing fallback tests pass.
- Canonical product/result are published and read back from GitHub.
