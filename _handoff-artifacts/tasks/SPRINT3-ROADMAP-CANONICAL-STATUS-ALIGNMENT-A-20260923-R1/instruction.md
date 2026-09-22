# SPRINT3-ROADMAP-CANONICAL-STATUS-ALIGNMENT-A-20260923-R1

priority: DEADLINE_CRITICAL
class: CANONICAL_COORDINATION_REPAIR
lane: A
sprint: Sprint3
control-authority: GitHub `thin-bt/dollworld` / `master`

## Problem

`_handoff-artifacts/PROJECT_ROADMAP.md` is coordination-only, but its live-looking status/NOW prose is materially stale: it still says Sprint3 `FUTURE`, Sprint2 S02-012 is the current phase, and a missing local B2 mirror is a material execution gap. Current binding `_handoff-artifacts/control/SPRINT3_STATUS.md` instead says Sprint3 is `REOPENED_FIX_REQUIRED`, with current terminal evidence and a live shared ordinary-flow release blocker; `GITHUB_CONTROL_PLANE.md` explicitly says mirror failure is recovery work, not terminal state, and fresh status artifacts govern.

## Required implementation

1. Fresh-read `GITHUB_CONTROL_PLANE.md`, `SPRINT2_STATUS.md`, `SPRINT3_STATUS.md`, A/B2 inboxes, and this instruction before editing.
2. Update only stale coordination prose in `PROJECT_ROADMAP.md` needed to align it with current canonical authority:
   - Sprint2 status must reflect current binding `SPRINT2_STATUS.md`, not old S02-012/mirror language.
   - Sprint3 must no longer say `FUTURE`; represent its current `REOPENED_FIX_REQUIRED` disposition without independently assigning CLOSED.
   - NOW/current critical-path prose must not treat Drive/local mirror absence as terminal/blocking authority and must point readers to binding status/control artifacts for live state.
   - Remove/replace obsolete Role CURRENT/OUTBOX authority wording where it conflicts with the direct-execution/no-ROLE-inbox protocol.
3. Preserve stable roadmap objectives/dependency intent. Do not rewrite specs, product source, or sprint completion policy.
4. Publish the roadmap repair to canonical master and read it back from GitHub.
5. Publish `_handoff-artifacts/results/SPRINT3-ROADMAP-CANONICAL-STATUS-ALIGNMENT-A-20260923-R1/result.md` with exact commit SHA, changed sections, and readback evidence; terminalize A then return A to IDLE per protocol.

## Acceptance

- No `Sprint3 Status: FUTURE` remains as current state.
- No old S02-012/local-mirror paragraph remains presented as the current critical path.
- Roadmap explicitly defers live sprint disposition to fresh canonical `SPRINT2_STATUS.md` / `SPRINT3_STATUS.md`.
- No Sprint3 CLOSED assignment is invented.
- Product source is untouched.
