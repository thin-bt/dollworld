# SPRINT3-S03-046-MENTORSHIP-BROWSER-EVIDENCE-CANONICAL-PUBLISH-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: CANONICAL_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
authority-ref: master
control-authority: GitHub
repository: thin-bt/dollworld
branch: master

## Gap
S03-045 passed browser verification for the Person Detail mentorship UI, but its result says `tests/e2e/s3-person-detail-mentorship-browser-evidence-b2.spec.ts` is not yet on canonical master. The accepted behavior therefore lacks a canonical executable browser regression.

## Objective
Publish the S03-045 Playwright evidence spec on fresh master without changing accepted product behavior.

## Required work
- Read current protocol, B2 state, S03-045 result, Sprint3 status/backlog, and fresh master.
- Reconcile the S03-045 E2E spec with current master and add it under `tests/e2e/`.
- Preserve assertions for visible 師弟関係, 師範資格, empty 正式師, and formal-master link/navigation when present.
- Run the focused Chrome Playwright spec, `npx vitest run apps/web/src/client/person-detail/person-detail.test.tsx`, and `npm run typecheck -w @shared-world/web`.
- Do not change product behavior unless fresh verification demonstrates a real regression; report that as blocked evidence instead of broadening scope.
- Confirm GitHub master readback contains the E2E spec.
- Publish the terminal result under the matching canonical result path and return B2 to IDLE according to protocol.

## Guards
Do not modify A-owned Sprint2 work. Do not assign Sprint3 CLOSED or infer Sprint4 started. Temporary work belongs only under `_handoff-artifacts/control-tmp/`. READY requires the canonical E2E spec, all focused checks passing, GitHub readback, and exact published SHA in the result.