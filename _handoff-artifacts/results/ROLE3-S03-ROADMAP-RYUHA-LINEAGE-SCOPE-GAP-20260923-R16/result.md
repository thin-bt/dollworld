# ROLE3-S03-ROADMAP-RYUHA-LINEAGE-SCOPE-GAP-20260923-R16

result: GAP_CONFIRMED
date: 2026-09-23
role: Role3
sprint: Sprint3
authority: GitHub `thin-bt/dollworld` / `master`

## Finding

The stable project roadmap defines Sprint3 as `師弟・技継承・流派`, explicitly lists `流派・系譜` as a Sprint3 primary target, and defines the destination as knowledge/techniques passing to the next generation.

The canonical Sprint3 backlog, however, defines S03-001..011 around mentorship, teaching, original-technique runtime/materialization, and first-use MatchId, while explicitly stating `引退・遺伝・家系 lineage schema の拡張` is Sprint4-out. No main-table Sprint3 task is assigned to a distinct `流派` product representation or a user-visible lineage/school surface.

This is not proof that Sprint3 must implement Sprint4 family/genetic lineage. It is a scope-accounting gap: the roadmap names `流派・系譜` as a Sprint3 objective but the backlog does not currently say whether that objective is (a) satisfied by existing mentorship/technique provenance, (b) intentionally deferred/renamed, or (c) still missing product work.

## Product risk

Closing Sprint3 solely from S03-001..011 plus current residual browser gates can silently leave a roadmap-level user-facing objective unaccounted for. Existing generated-technique founding history and mentorship relationships may contain enough data to satisfy the intent, but that must be demonstrated against the roadmap objective rather than inferred.

## Required closure

Before formal Sprint3 CLOSED, perform one bounded spec-to-source reconciliation:

1. Trace the roadmap terms `流派` and `系譜` to accepted Sprint3 spec/backlog semantics and current product source/UI.
2. If existing mentorship + technique provenance/founding history fully satisfies the objective, record the exact source/UI/evidence mapping and amend canonical backlog wording so the objective is explicitly accounted for without adding new semantics.
3. If no ordinary product surface exposes the intended school/lineage meaning, define the smallest Sprint3 product slice needed; do not pull Sprint4 retirement/genetics/family-lineage schema into Sprint3.
4. Preserve current `REOPENED_FIX_REQUIRED` and the live S03-010 release-gate binding until PM/control performs formal closure.

## Lane decision

Cursor A is PREPARED for `SPRINT3-S03-006-ORDINARY-PARENT-GUIDANCE-BROWSER-A-20260923-R1` and Cursor B2 is PREPARED for `UI-PAGE-MOCK-CURRENT-SCREENSHOTS-B2-20260922-R1`; this run does not overwrite either lane. The reconciliation is canonicalized here for dispatch when a lane is genuinely free, unless Role3 can close it directly from source/evidence first.

## Control hygiene

`_handoff-artifacts/` top-level listing contains canonical structure only; no root-level transient scratch defect was observed in this run. No `ROLE3_INBOX.md` was read or consumed.
