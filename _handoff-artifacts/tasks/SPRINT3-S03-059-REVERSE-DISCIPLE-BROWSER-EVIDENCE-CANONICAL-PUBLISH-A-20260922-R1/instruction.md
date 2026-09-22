# SPRINT3-S03-059-REVERSE-DISCIPLE-BROWSER-EVIDENCE-CANONICAL-PUBLISH-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
authority-ref: _handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md
predecessor: SPRINT3-S03-057-PERSON-DETAIL-REVERSE-DISCIPLE-BROWSER-EVIDENCE-A-20260922-R1
non-conflict: B2 owns S03-058 mentorship runtime relation-kind validation; do not touch its files/control state.

## Gap

S03-057 proved the S03-055 reverse formal-disciple Person Detail behavior in Chrome/Playwright, but its terminal result explicitly records the regression harness as `LOCAL_ONLY` and not published to canonical master. That leaves browser-level reverse-disciple observability evidence non-reproducible from the repository even though the product behavior is accepted.

## Objective

Publish the already-proven S03-057 browser regression as a canonical repository test, reconcile it against fresh `origin/master`, rerun it against canonical production bytes, and bind a terminal result to the exact publication/readback SHA.

## Required work

1. Fresh-read this instruction, `GITHUB_CONTROL_PLANE.md`, A/B2 lane state, S03-057 result, Sprint3 status/backlog, and current master before editing.
2. Claim A ACTIVE before product/test changes according to executor protocol.
3. Recover/recreate `tests/e2e/s3-person-detail-reverse-disciple-browser-evidence-a.spec.ts` from the S03-057 proven harness. Do not weaken assertions merely to make it pass.
4. Keep assertions covering ordinary 人物 navigation/detail, 師弟関係 / 正式門下 visibility, zero-disciple `なし`, display-name links rather than raw IDs, `data-person-id`, `/people/{personId}` href/click navigation, and bounded 正式師 regression where fixture data exposes it.
5. Run the focused Chrome Playwright spec and `apps/web/src/client/person-detail/person-detail.test.tsx`. Run any repository-required formatting/typecheck gate for the changed test file. Do not duplicate B2 S03-058 work or its focused validator tests.
6. Publish the E2E spec to canonical `master`, then fresh-read GitHub canonical content to prove the file exists at the resulting master lineage.
7. Publish `_handoff-artifacts/results/SPRINT3-S03-059-REVERSE-DISCIPLE-BROWSER-EVIDENCE-CANONICAL-PUBLISH-A-20260922-R1/result.md` with exact publication SHA, commands/results, assertion coverage, and GitHub readback evidence.
8. Return A to IDLE only after terminal result publication/readback.

## Guards

- Do not alter Sprint3 formal status to `CLOSED`; PM/control transition only.
- Do not change mentorship product semantics unless the focused browser test exposes a real regression; if it does, record the defect and make only the smallest non-conflicting fix.
- Do not touch S03-058-owned files/control state.
- No timeout inflation, skip, assertion weakening, or fixture hard-coding that bypasses production APIs.
- Scratch only under `_handoff-artifacts/control-tmp/`; never create transient root-level `_handoff-artifacts/*` scratch.

## READY contract

READY requires the reverse-disciple browser E2E spec to exist on canonical `master`, focused Chrome Playwright PASS, Person Detail unit PASS, repository-required changed-file checks PASS, terminal result on GitHub, and fresh GitHub readback binding the exact publication lineage.