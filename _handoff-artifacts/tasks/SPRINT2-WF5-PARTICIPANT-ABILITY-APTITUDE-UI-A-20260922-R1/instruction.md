# SPRINT2-WF5-PARTICIPANT-ABILITY-APTITUDE-UI-A-20260922-R1
state: PREPARED
lane: A
sprint: Sprint2
mode: PRODUCT_FIX
priority: HIGH
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
source-audit: SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1
blocker: WF-5-01

## Objective
Close WF-5-01 on current master: the ordinary tournament participant list must provide dense player-facing comparison of the canonical six abilities and three aptitudes, without browser-side domain reconstruction or a competing person-stat contract.

## Required execution
- Fresh-read GITHUB_CONTROL_PLANE.md, Sprint2 status, current A/B2 lane state, the wireframe audit terminal, the tournament wireframe/gap-map authority already present in the repository, and current master source.
- Claim A ACTIVE before product changes.
- Fetch current origin/master and bind the newest applicable product lineage. Do not conflict with B2's release-evidence gate; if B2 publishes a control-only result, rebase/fetch as needed without broad stash/clean.
- Reuse the accepted browser-safe person/participant presentation source if one exists. Do not invent new gameplay calculations, stat semantics, or UI-only derived strength scores.
- On the ordinary tournament participants surface, render the six canonical abilities (stamina/strength/skill/speed/spirit/magic) and three aptitudes (unarmed/sword/magic) as a dense comparison block/table consistent with the wireframe. Preserve person navigation, rank, age, and existing official-record information.
- Do not expose internal IDs as part of this task and do not broaden into WF-13/WF-12/WF-9 repairs.
- Add/update focused tests that prove all 6+3 fields reach the player-facing participant UI through the accepted projection. Include ordinary browser evidence if the current harness can reach the participant list without test-only domain shortcuts.
- Run focused typecheck/tests plus production web build for touched lineage. A later full root gate may remain a separate B2 responsibility if product bytes change.
- Publish production changes to canonical master, then publish terminal result to `_handoff-artifacts/results/SPRINT2-WF5-PARTICIPANT-ABILITY-APTITUDE-UI-A-20260922-R1/result.md` and verify GitHub readback.
- Keep transient scratch only under `_handoff-artifacts/control-tmp/`. No broad untracked stash/clean. Do not assign Sprint2 CLOSED.

## Acceptance
PASS requires current-master source + tests/evidence showing the ordinary tournament participant UI presents all six abilities and all three aptitudes for participants using canonical/read-projection data, with production web build passing on the published product lineage.
