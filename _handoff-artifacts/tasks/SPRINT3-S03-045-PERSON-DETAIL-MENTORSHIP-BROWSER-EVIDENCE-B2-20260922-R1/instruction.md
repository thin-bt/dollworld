# SPRINT3-S03-045-PERSON-DETAIL-MENTORSHIP-BROWSER-EVIDENCE-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint3
mode: RELEASE_EVIDENCE
priority: DEADLINE_CRITICAL
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
authority-ref: master

## Objective

Produce browser-level release evidence for the newly published S03-044 ordinary Person Detail mentorship presentation. This is evidence/verification only unless an actual product defect is reproduced.

## Fresh-read requirements

Before execution, fresh-read:
- `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`
- `_handoff-artifacts/control/CURSOR_B2_INBOX.md`
- `_handoff-artifacts/control/SPRINT3_STATUS.md`
- `_handoff-artifacts/results/SPRINT3-S03-044-PERSON-DETAIL-MENTORSHIP-VISIBILITY-B2-20260922-R1/result.md`
- `docs/SPRINT_3_BACKLOG.md`
- `apps/web/src/client/person-detail/PersonDetailView.tsx`
- existing browser/e2e harnesses relevant to ordinary Person Detail

Claim B2 ACTIVE before changes. Scratch/worktrees must be under `_handoff-artifacts/control-tmp/`, never directly under `_handoff-artifacts/`.

## Required execution

1. Start from fresh canonical `master`; do not use unpublished local product state as authority.
2. Exercise an ordinary user-visible Person Detail path in a real browser/Playwright-compatible harness.
3. Verify the S03-044 `師弟関係` presentation is actually visible through the ordinary route and that at least the following accepted states are represented where fixtures permit:
   - `qualifiedMaster` rendered as 師範資格 あり/なし.
   - non-empty `formalMasterPersonIds` rendered as navigable `/people/{id}` master link(s), or empty state rendered as なし.
4. Prefer extending an existing bounded e2e/browser harness. Do not invent test-only production behavior solely to make the assertion pass.
5. Run the smallest relevant browser check plus focused Person Detail tests/typecheck for any touched product/test path.
6. If a genuine browser-visible product defect is reproduced, make only a bounded non-conflicting fix, verify it, and publish it to canonical `master` with exact SHA/readback. Otherwise publish evidence only.
7. Publish terminal result at `_handoff-artifacts/results/SPRINT3-S03-045-PERSON-DETAIL-MENTORSHIP-BROWSER-EVIDENCE-B2-20260922-R1/result.md`, including exact commands, test counts/outcomes, master SHA, changed paths, and browser-visible assertions.
8. Return B2 inbox to IDLE only after terminal GitHub result publication/readback.

## Acceptance

READY only if browser-level evidence proves the ordinary Person Detail mentorship presentation from canonical master. BLOCKED must name the exact environment/product gap and evidence; do not report status-only progress.

Do not modify Cursor A control state or collide with A's current Sprint2 final-root-gate work.