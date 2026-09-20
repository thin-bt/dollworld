# SPRINT3-BASELINE-EVIDENCE-B2-20260920-R1

state: PREPARED
priority: IMMEDIATE
lane: B2
sprint: Sprint3
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Purpose

Sprint2 visual/formal acceptance is complete and Sprint3 is active. A currently owns S03-001 product/planning implementation. B2 must independently prepare Sprint3 release-gate evidence without colliding with A product files.

## Required work

- Fresh-read GitHub canonical Sprint3 protocol/control/task/result state and the accepted Sprint2 terminal evidence.
- Fresh-read existing SPEC/preparation/spec files relevant to Sprint3 and current canonical master.
- Do not modify production code, docs owned by A's active S03-001 task, or Cursor A control.
- Establish an independent Sprint3 baseline evidence inventory: identify the exact existing automated checks and public/runtime surfaces that must remain green while S03-001 lands, plus the concrete evidence commands/paths B2 can execute after A publishes.
- Where executable without colliding with A, run current canonical baseline checks now and record results.
- Publish terminal result at `_handoff-artifacts/results/SPRINT3-BASELINE-EVIDENCE-B2-20260920-R1/result.md` with baseline SHA, checks/evidence obtained, release-gate checklist for S03-001, and any unique concrete gap. READY means the evidence gate is prepared and current baseline evidence is recorded; FIX_REQUIRED must name a concrete blocker and next executable action.

## Collision rules

B2 is evidence/release-gate only. Do not implement S03-001, do not edit A-owned Sprint3 backlog/mini-spec/product files, and do not undo Sprint2 accepted fixes. No Sprint4 work.
