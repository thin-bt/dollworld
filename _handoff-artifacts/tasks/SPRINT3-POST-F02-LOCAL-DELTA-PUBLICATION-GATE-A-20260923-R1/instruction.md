# SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PUBLICATION_AND_RELEASE_GATE_RECOVERY
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master

## Why this task exists

Fresh canonical result `SPRINT2-F02-MULTI-TOURNAMENT-YEARLY-PROGRESSION-A-20260923-R1` reports a verified product delta still local/uncommitted, including `apps/web/**` F-02 changes and a co-located Sprint3 runtime change at `packages/simulation-core/src/sprint3/sprint3-mentorship-entrypoint-runtime-state.ts`. Canonical Sprint3 live release gate remains bound to product `a3776c1` (1969/1969), so any legitimate publication of these later product bytes requires a fresh current-product Sprint3 gate.

## Required execution

1. Fresh-read `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`, `control/SPRINT3_STATUS.md`, `control/SPRINT2_STATUS.md`, the F-02 terminal result, this instruction, and fresh `origin/master` before touching product bytes.
2. Inspect the current A worktree delta. Attribute every changed `apps/**` / `packages/**` path. Do not discard, stash-out, overwrite, or silently absorb unrelated work. Preserve `_handoff-artifacts/tools/**` and `_handoff-artifacts/specs/**` absolutely.
3. Reconcile the reported local F-02 delta with fresh `origin/master`. If the verified F-02 product delta is still present locally and unpublished, publish only attributable verified product changes to canonical `master` using a safe non-destructive publication path. If publication would collide with newer canonical product work, stop product mutation and publish terminal BLOCKED evidence identifying exact conflicting paths/SHAs.
4. For the co-located Sprint3 runtime-state change, determine whether it is an already-authorized/verified Sprint3 delta or unrelated unfinished work. Publish it only if provenance and focused verification are sufficient; otherwise leave it intact locally and explicitly exclude it from publication. Never delete or reset it.
5. After any product publication, fresh-read canonical master and identify the latest `apps/**` + `packages/**` product SHA. Run a pristine/self-contained bounded root `npm run check` for that exact lineage (fresh install/build assumptions as required by S03-072 harness), plus production web build. Do not reuse `a3776c1` evidence for changed bytes.
6. If the root gate fails on a small, clearly attributable non-conflicting hygiene defect, repair and rerun in this same task. Do not weaken tests/assertions/timeouts/workload to manufacture green.
7. If PASS, update Sprint3 canonical release-gate binding/backlog evidence only as necessary to the exact tested product SHA and exact totals. Keep Sprint3 `REOPENED_FIX_REQUIRED`; do not assign formal CLOSED. If no product publication occurs, do not rewrite the live binding merely for status churn.
8. Publish terminal result under `_handoff-artifacts/results/SPRINT3-POST-F02-LOCAL-DELTA-PUBLICATION-GATE-A-20260923-R1/result.md`, including origin/master pickup SHA, publication SHA(s), exact changed paths, test totals, web build result, remaining local excluded deltas, and readback evidence. Return A to IDLE only after terminal result is canonical.

## Non-conflict guard

- B2 currently owns `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; do not edit its inbox/task/result or browser evidence artifacts.
- This task owns publication/release-gate reconciliation of the already-reported A local product delta; do not invent unrelated Sprint2/Sprint3 feature scope.
- No transient scratch directly under `_handoff-artifacts/`; use `_handoff-artifacts/control-tmp/` only.

## Acceptance

Terminal PASS requires either (A) safe canonical publication of attributable verified product bytes followed by fresh exact-lineage root gate + production web build PASS and canonical binding readback, or (B) proof that the reported local delta was already canonically published by another actor and a fresh exact-lineage gate is already applicable. Conflicts/unattributed local bytes require terminal BLOCKED with concrete evidence, never destructive cleanup.
