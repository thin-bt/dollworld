# SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1

state: PREPARED
lane: A
sprint: Sprint2
priority: IMMEDIATE
mode: ACCEPTED_SCOPE_CLOSURE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master
predecessor-task: SPRINT2-BROWSER-FIX-A-20260918-R13
paired-b2-task: SPRINT2-FULL-BROWSER-REACCEPTANCE-B2-20260919-R1

## Objective

Consume the READY A R13 source repair and the prior B2 FIX_REQUIRED result, then close the remaining Sprint2 acceptance-definition gap without interfering with B2's fresh browser reacceptance.

## Required work

1. Fresh-read GitHub canonical protocol, A R13 result, B2 R4 result, accepted Sprint2 wireframe/source-evidence authority, and current repository/worktree evidence.
2. Reconcile the remaining documented browser gaps:
   - knockout/group bracket progression in real browser UI
   - competition history row -> battle-log / match-detail navigation
   - larger-bracket/non-tiny standings browser fixture
3. For each gap classify only from accepted authority as:
   - SPRINT2_MANDATORY
   - ALREADY_SATISFIED
   - FUTURE_RESERVE
   - AUTHORITY_MISSING
4. Do not import requirements from unrelated chats/projects and do not promote FUTURE_RESERVE into Sprint2.
5. Do not modify the product/lifecycle surfaces while B2 is executing the paired reacceptance. This task is non-overlap evidence/closure planning only.
6. If any SPRINT2_MANDATORY gap remains, identify exact route/component/server/data/test surface and produce the smallest executable next A task slice.
7. If no mandatory gap remains outside the paired browser acceptance, publish READY stating that Sprint2 is gated only by B2 reacceptance / any failure it reports.
8. No Sprint3/4.

## Terminal output

Publish:
_handoff-artifacts/results/SPRINT2-ACCEPTED-SCOPE-CLOSURE-A-20260919-R1/result.md

READY requires repository-backed accepted-scope disposition for every remaining documented gap and an exact next executable slice for every mandatory unresolved item.
