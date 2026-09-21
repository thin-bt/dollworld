# SPRINT3-S03-042-ORDINARY-SESSION-ACTIVATION-B2-20260921-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master

## Gap
Canonical Sprint3 production/integration evidence accepts runtime entrypoint integration and weekly mentorship/teaching/OTL processing, but the existing Sprint2-repair regression guard has relied on test-side runtime/config preparation. We still need an ordinary-session proof that a normal user-facing simulation start followed by weekly step activates the accepted Sprint3 runtime without test-only post-start mutation/injection.

## Task
1. Fresh-read master, protocol, Sprint3 backlog/status, and current A/B2 state before editing.
2. Inspect the real `/simulation/start` -> persisted session/world -> `/simulation/step` production path and the accepted Sprint3 runtime entrypoint/config initialization.
3. Add a focused production-boundary regression test that starts an ordinary session using the same public start boundary as the app, does NOT mutate/inject `sprint3Config`, mentorship runtime, teaching runtime, or OTL runtime after start, advances through the normal weekly step boundary, and proves the accepted Sprint3 weekly runtime is initialized/reachable and executes exactly once when canonical inputs make work due.
4. If ordinary start currently omits required Sprint3 initialization, implement the smallest production wiring needed to initialize it from canonical config/state. Do not invent gameplay rules or broaden Sprint3 scope.
5. Preserve Sprint2 tournament/weekly progression semantics, determinism/replay, existing S03-040 regression guard, and backward-compatible load behavior.
6. Run the focused new test, relevant Sprint3/Sprint2 weekly regression tests, and `npm run typecheck -w @shared-world/web` (or canonical equivalent if workspace naming changed). Record exact commands/results.
7. Publish source/test changes and terminal result to canonical GitHub master. READY requires GitHub master readback of changed production/test files; local-only SHA is not sufficient.

## Constraints
- Sprint3 formal close remains blocked by Sprint2 reopen; do not change SPRINT2_STATUS or SPRINT3_STATUS.
- Do not touch A's active Sprint2 final-root-gate work unless a shared source edit is strictly required; if conflict is detected, stop before conflicting edit and publish concrete BLOCKED evidence.
- No transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` locally if needed and clean it.
- Do not consume or wait for ROLE3_INBOX.md.

## Terminal result
Write `_handoff-artifacts/results/SPRINT3-S03-042-ORDINARY-SESSION-ACTIVATION-B2-20260921-R1/result.md` with result class, changed files/SHAs, exact test evidence, ordinary-start activation finding, and master readback evidence. Then return B2 lane to IDLE.