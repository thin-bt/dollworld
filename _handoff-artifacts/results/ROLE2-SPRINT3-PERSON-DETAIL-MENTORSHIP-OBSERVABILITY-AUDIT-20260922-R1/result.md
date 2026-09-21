# ROLE2-SPRINT3-PERSON-DETAIL-MENTORSHIP-OBSERVABILITY-AUDIT-20260922-R1

state: TERMINAL
result-class: SOURCE_GAP_CONFIRMED
role: Role2
sprint: Sprint3
control-authority: GitHub
repository: thin-bt/dollworld
branch: master

## Fresh-read prerequisites

- Read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` first.
- Cursor A is PREPARED on `CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1`; do not overwrite.
- Cursor B2 is PREPARED on `SPRINT3-S03-054-POST-S03-052-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1`; do not overwrite.
- Read current `docs/SPRINT_3_BACKLOG.md` and current master source.

## Concrete source gap

Sprint3's observer-facing Person Detail mentorship section is asymmetric. Current UI-005 exact25 exposes `qualifiedMaster` and `formalMasterPersonIds`, so a disciple can see who their formal master is, but the contract contains no reverse disciple list/count field. Consequently a qualified master/person detail cannot show the observer which current formal disciples belong to that master from this accepted view.

This matters to the Sprint3 theme (`師匠・門下・教授`) because master intake/discipleship is implemented in production, but ordinary Person Detail observability only exposes the disciple -> master direction. S03-051/S03-052 improved the master link label to displayName but did not add reverse mentorship observability.

## Evidence

`apps/web/src/client/person-detail/ui005-views.ts` declares the exact25 keys. Mentorship-related accepted fields are only:

- `qualifiedMaster`
- `formalMasterPersonIds`

There is no `formalDisciplePersonIds`, disciple count, or equivalent reverse relation in UI-005. Widening UI-005 ad hoc is forbidden by its exact25 contract, so this is not safe to patch opportunistically while A/B2 are occupied.

## Required implementation follow-up

When a non-conflicting implementation lane is free, prepare a dedicated contract-first slice that:

1. resolves the accepted observer contract for reverse formal-discipleship without silently breaking UI-005 exact25;
2. derives current formal disciples from canonical mentorship state rather than duplicating mutable relationship truth;
3. renders disciple display names as links while preserving canonical personId in href/data attributes;
4. covers zero/one/many disciples and stale/missing-person fallback behavior;
5. adds focused server/client/browser acceptance and then current-master root gate evidence.

Do not dispatch now: A and B2 are both PREPARED on unrelated recovery/release work, so overwriting either would violate the lane-state contract.

## Terminal

`SOURCE_GAP_CONFIRMED` — reverse master -> disciple observability is absent from current accepted Person Detail contract/source; canonical follow-up evidence is now recorded without conflicting with active lanes.
