# SPRINT3-S03-072-PRISTINE-ROOT-CHECK-WORKSPACE-RESOLUTION-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Why this task exists

S03-069 proved a pristine `npm ci` root `npm run check` cannot load 30 app test suites because `@shared-world/simulation-core` exports built `dist/**`, while root `check` executes `test` before `build`. S03-071 separately repaired the two LWT-003 product assertions and published product SHA `ae416818cfec795812989d9f371bdc7a0fb34b1f`. The remaining pristine-gate harness defect must be repaired before another release gate can be meaningful.

## Required work

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, both sprint status artifacts, this instruction, S03-069 result, S03-071 result, root `package.json`, relevant workspace package manifests/config, and current `origin/master` before editing.
2. Claim B2 ACTIVE before product changes.
3. Reproduce/confirm the pristine dependency-resolution cause without relying on stale prebuilt `dist/`.
4. Implement the smallest durable repository fix so root `npm run check` is self-contained from a fresh checkout + `npm ci`. Prefer an explicit prerequisite/build step or package/test resolution arrangement that preserves production package exports. Do not weaken assertions, skip tests, reduce workloads, extend timeouts, or depend on untracked/pre-existing build artifacts.
5. Add/update regression evidence sufficient to prevent reintroduction of the ordering/resolution defect where feasible.
6. Verify focused harness behavior plus relevant typecheck/format checks. Then run one bounded root `npm run check` from a clean/pristine-enough state if feasible. Do not use a same-case retry ladder after an exhausted bounded attempt.
7. If the root gate passes, record exact counts and tested SHA. If a different blocker remains, report it precisely; do not mask it.
8. Publish product/control result to canonical master and verify GitHub readback.
9. Keep all transient worktrees/evidence under `_handoff-artifacts/control-tmp/`; correct any root-level transient defect in the same run. Never use broad untracked stash/clean commands prohibited by protocol.

## Acceptance

- Fresh checkout + `npm ci` no longer requires pre-existing `packages/simulation-core/dist/**` merely for root test loading.
- S03-071 LWT-003 repair remains green; no semantic invariant/test weakening.
- Root `npm run check` is self-contained and reaches its intended phases, or a newly discovered blocker is canonically evidenced after the harness defect itself is fixed.
- Terminal result binds exact product SHA, commands/results, publication/readback, and hygiene evidence.
- Do not assign Sprint3 `CLOSED`; binding status remains control authority work.
