# SPRINT3-S03-051-PERSON-DETAIL-MASTER-NAME-VISIBILITY-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
authority-ref: master

## Gap

Canonical `PersonDetailViewPanel` now exposes Sprint3 mentorship, but each formal master is rendered as the raw `personId`. That makes the accepted mentorship relation technically visible but not human-observer usable. Close this without changing mentorship domain semantics or competing with B2 S03-049 root-gate concurrency work.

## Required execution

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, this instruction, current A/B2 control state, `docs/SPRINT_3_BACKLOG.md`, and current master before edits.
2. Claim A ACTIVE using the canonical execution contract.
3. Inspect the accepted UI-005 person-detail server/view contract and existing people/name projection. Prefer reusing an existing display-name projection/resolver; do not introduce a second person naming authority.
4. Make the smallest production change so formal masters in ordinary Person Detail render a human-readable display name while preserving a working link to `/people/<personId>`. Raw ID may remain only as developer/secondary metadata if useful, not as the sole observer label.
5. Preserve the empty `formalMasterPersonIds` behavior (`なし`) and master qualification display.
6. Add/update focused tests covering: named formal master, multiple masters if the contract permits them, empty formal-master state, and correct target person navigation. Do not weaken existing mentorship tests.
7. Run focused Person Detail tests and `npm run typecheck -w @shared-world/web`; run relevant format/lint gate used by the repository. Do not run or alter the B2-owned root concurrency experiment unless B2 has already terminalized and canonical instructions explicitly make it safe.
8. Publish product/test changes and canonical terminal result to GitHub `master`; verify fresh GitHub readback of changed production source, test, result, and final A lane state.
9. Return A to IDLE only after terminal result publication.

## Constraints

- No Sprint3 config/domain semantic changes.
- No timeout increases, skips, assertion weakening, or root-suite concurrency changes.
- No changes to B2 S03-049 files unless independently required for a merge conflict; if conflict exists, reconcile against fresh master rather than overwriting.
- No transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` locally and clean it.
- Do not assign formal Sprint3 `CLOSED`; PM/control owns that transition.

## READY criteria

- Formal master is observer-readable by display name in ordinary Person Detail.
- Link navigation remains bound to the exact master person ID.
- Empty/no-master state remains explicit.
- Focused tests + web typecheck + relevant formatting/lint checks PASS.
- Product/test/result are canonical on GitHub master and fresh-read verified.
