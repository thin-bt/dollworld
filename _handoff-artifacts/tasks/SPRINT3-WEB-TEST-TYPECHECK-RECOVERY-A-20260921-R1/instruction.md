# SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: IMPLEMENTATION_VERIFICATION
priority: DEADLINE_CRITICAL
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Why this task exists

Fresh canonical post-S03-014 release-gate evidence reports `apps/web` test-project typecheck at 273 errors, with representative TS6059 `rootDir` failures caused by simulation-core source pull-through. Canonical `apps/web/tsconfig.test.json` is currently identical to `apps/web/tsconfig.json`: it sets `rootDir: src`, while web tests/imports can resolve workspace simulation-core TypeScript outside `apps/web/src`. This is a concrete release-gate configuration gap, independent of B2 S03-009 product wiring.

## Execute now

1. Fresh-read `master`, this instruction, and current A/B2 control state; claim this exact task ACTIVE before changes.
2. Reproduce `npx tsc -p apps/web/tsconfig.test.json --noEmit` and classify the errors. Record counts/codes before editing.
3. Repair the web *test-project* TypeScript configuration/import boundary mechanically so workspace dependencies used by tests are typechecked without TS6059/rootDir leakage. Prefer a test-only tsconfig correction or project-reference/package boundary consistent with the repository's existing workspace model. Do not weaken `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, or other base safety flags merely to turn the gate green.
4. Fix any remaining web-test typing defects only when mechanical and behavior-preserving. Do not alter gameplay semantics or Sprint3 simulation-core product behavior.
5. Verify at minimum: `npx tsc -p apps/web/tsconfig.test.json --noEmit`, `npm run typecheck`, and the web-focused tests affected by any edited source. Run broader root gates where feasible and report remaining unrelated failures exactly.
6. Commit/push the bounded repair to canonical `master`, then read back changed files from GitHub master.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-WEB-TEST-TYPECHECK-RECOVERY-A-20260921-R1/result.md`, then return A to IDLE.

## Collision guard

- B2 owns `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`; do not touch its control/task/result artifacts or implement S03-009.
- Do not publish/reconstruct S03-011 in this task; it remains dependency-blocked until S03-009 reaches canonical master.
- Do not absorb repo-wide Prettier cleanup into this task.

## Terminal criteria

READY only with canonical-master publication/readback and a green `apps/web` test-project typecheck. If the remaining errors require semantic product changes or collide with B2, publish BLOCKED with exact files/error classes and evidence; do not mask them by weakening compiler options.
