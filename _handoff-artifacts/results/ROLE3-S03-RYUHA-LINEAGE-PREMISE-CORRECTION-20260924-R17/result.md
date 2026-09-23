# ROLE3-S03-RYUHA-LINEAGE-PREMISE-CORRECTION-20260924-R17

result: CORRECTED_INVALID_PREMISE
date: 2026-09-24
role: Role3
sprint: Sprint3
authority: GitHub `thin-bt/dollworld` / `master`

## Fresh canonical finding

A fresh read of `docs/SPEC_PREPARATION_PLAN.md` shows that Sprint 3 preparation is exactly:

`師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝。`

The canonical plan does not name `流派`, `系譜`, `流派・系譜`, or a separate school/lineage product surface as a Sprint3 target. The current `docs/SPRINT_3_BACKLOG.md` is aligned to the actual preparation scope by mapping mentorship/teaching/technique inheritance/original-technique/loss semantics into S03-001..011, while explicitly excluding Sprint4 retirement/genetics/family-lineage schema expansion.

## Correction

The prior Role3 result `ROLE3-S03-ROADMAP-RYUHA-LINEAGE-SCOPE-GAP-20260923-R16` is **SUPERSEDED_INVALID_PREMISE**. Its claim that the stable roadmap explicitly listed `流派・系譜` as a Sprint3 primary target is not supported by the canonical preparation plan and must not be used as a closure blocker or product requirement.

The derived task `SPRINT3-RYUHA-LINEAGE-SCOPE-RECONCILIATION-20260924-R1` has been changed from `READY_FOR_DISPATCH_WHEN_LANE_FREE` to `CANCELLED_INVALID_PREMISE` so A/B2 cannot consume it later.

## Current control impact

- No product bytes changed.
- No new Sprint3 product requirement is introduced.
- Sprint3 remains `REOPENED_FIX_REQUIRED` under `_handoff-artifacts/control/SPRINT3_STATUS.md`.
- Live release gate remains S03-010 production activation at product `37d6ed4`, root `1986/1986`, unless a later canonical status supersedes it.
- Existing residuals remain: S03-010 dedicated long-run real-browser OTL founding/registration/battle-catalog evidence and S03-006 ordinary weekly parent-guidance browser evidence.
- Cursor A and B2 were already PREPARED for other work, so neither lane was overwritten.

## Hygiene

No transient scratch was created under `_handoff-artifacts/`. This correction is canonical GitHub-only control evidence.
