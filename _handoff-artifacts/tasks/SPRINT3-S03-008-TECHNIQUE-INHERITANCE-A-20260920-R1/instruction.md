# SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1

state: PREPARED
sprint: Sprint3
lane: A
priority: IMMEDIATE
mode: S03_008_TECHNIQUE_INHERITANCE
control-authority: GitHub
required-repository: thin-bt/dollworld
required-branch: master

## Objective
Implement the remaining Sprint3 technique-teaching/inheritance slice after S03-007. Do not start Sprint4.

## Canonical source findings
- `docs/SPRINT_3_BACKLOG.md` marks S03-008 as the remaining Sprint3 item: 教授技選択・継承・独自技/失伝, dependent on S03-007.
- `docs/SPEC.md` defines 4-week / new-enrollment / acquisition-complete re-evaluation, candidate scoring, tier thresholds, teaching policies, and parent temporary-guidance cap.
- `docs/specs/09-technique-system.md` already supplies TechniqueDefinition learningTier, prerequisite/sourceTechniqueIds, secrecy, teacherCanTeach and canonical invariants.
- S03-007 master product provides explicit weekly teach/refusal/allocation; S03-008 must build on it rather than duplicate its policy.

## Implementation boundary for this task
Implement the deterministic **教授技選択・継承 selection contract** first, as a production slice of S03-008:
1. Add a new Sprint3 config version after `sprint3-balance-0.7.0` and config-held teaching-selection policy. Do not hardcode the SPEC score weights/tier thresholds.
2. Add pure processor(s) that take a master/disciple context plus TechniqueDefinition/catalog/state inputs and deterministically rank teachable candidate techniques.
3. Candidate gate must preserve existing `teacherCanTeach`, prerequisites/requirements, S03-007 refusal/tier constraints, and `parent_temporary_guidance => basic only`.
4. Selection scoring must represent canonical SPEC dimensions: style/aptitude match 0..25, requirements/prereqs 0..20, trust/compatibility 0..20, weakness/next-event need 0..15, successor/lineage priority 0..20, secrecy/overcapacity/disloyalty penalty 0..-40. Inputs may be normalized upstream scores; do not infer absent values from IDs/names/order.
5. Tier eligibility thresholds: basic 30, standard 45, advanced 65 + trust>=40 + master mastery>=70, secret 85 + trust>=70 + master mastery>=85, with all numeric thresholds held in config.
6. Deterministic tie-break: total score descending then TechniqueId ascending; no RNG.
7. Expose explicit re-evaluation trigger contract for four-week cadence, new enrollment, and current-technique acquisition completion. Keep world mutation/adapters separate if needed.
8. Preserve canonical ordering/hash/version validation and existing Sprint1/S03-001..007 behavior.

## Explicitly defer from this slice
Do not invent underspecified generation/loss semantics merely to close S03-008. Independent-technique research/generation and loss require their own bounded follow-up implementation slices using the canonical SPEC values (research 180/320/550, generation success 20..80%, failure retains 80%, 24-week cooldown) and history requirements. Record remaining gap precisely in terminal result.

## Verification
- Add focused tests for candidate gating, each tier threshold boundary, parent temporary guidance cap, score/penalty boundaries, deterministic tie-break, and re-evaluation triggers.
- Run relevant Sprint3 + Sprint1 regression suites and typecheck/build used by this repository.
- Publish product to master and terminal result at `_handoff-artifacts/results/SPRINT3-S03-008-TECHNIQUE-INHERITANCE-A-20260920-R1/result.md` with exact product SHA and tests.
- Return A to IDLE only after terminal publication.
