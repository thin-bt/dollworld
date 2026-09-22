# SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1

state: PREPARED
task-key: SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1
lane: A
sprint: Sprint2
mode: PRODUCT_FIX_AND_UI_EVIDENCE
authority-ref: thin-bt/dollworld master
priority: DEADLINE_CRITICAL

## Objective

Resolve the first blocker from `SPRINT2-WIREFRAME-CURRENT-MASTER-AUDIT-A-20260922-R1`: WF-14-01 player-facing deterministic tournament display name is absent from schedule/detail/result surfaces.

## Required execution

1. Fresh-read GitHub canonical protocol, Sprint2 status, wireframe audit terminal, A/B2 lane state, and current master before execution.
2. Claim A ACTIVE before changes under the executor contract.
3. Implement the smallest canonical product change that provides a deterministic player-facing tournament display name from accepted tournament identity/schedule semantics. Do not generate random browser-only names and do not create a competing tournament identity.
4. Project/render the display name on the ordinary schedule/detail/result surfaces required by `TOURNAMENT_UI_WIREFRAME_DRAFT.md` §14 while preserving TournamentId as internal identity.
5. Add/adjust focused tests proving same canonical tournament input yields stable name and ordinary UI renders it. Do not expose raw internal IDs as substitute display names.
6. Run applicable focused tests plus web typecheck/build. Because this publishes product bytes, explicitly record that a fresh post-publication root gate is required before formal closure.
7. Publish terminal result to `_handoff-artifacts/results/SPRINT2-WF14-TOURNAMENT-DISPLAY-NAME-A-20260922-R1/result.md` with exact product SHA, commands/counts, UI evidence, and remaining wireframe blockers.
8. Fresh-read result and return A to IDLE/terminal-consumed according to lane contract.

## Non-conflict / safety

- B2 owns S03-075 root release gate; do not modify its control files or duplicate that gate.
- Do not assign Sprint2 CLOSED.
- Never use prohibited broad untracked stash/clean operations.
- All transient scratch must be under `_handoff-artifacts/control-tmp/`.
