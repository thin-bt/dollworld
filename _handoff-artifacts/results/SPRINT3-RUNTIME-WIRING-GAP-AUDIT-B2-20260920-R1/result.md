# SPRINT3-RUNTIME-WIRING-GAP-AUDIT-B2-20260920-R1

state: TERMINAL
result-class: BLOCKED
lane: B2
sprint: Sprint3
mode: PRODUCT_GAP_AUDIT
completedAt: 2026-09-20T23:23:53+09:00

## Verdict
Sprint3 formal acceptance is BLOCKED by a product/runtime gap. The current `docs/SPRINT_3_BACKLOG.md` labels three S03-008 wiring items as post-Sprint3, but that label is not sufficient authority to remove them from Sprint3: `docs/SPEC_PREPARATION_PLAN.md` explicitly places 技継承・独自技・失伝 in the Sprint 3 preparation scope and defines mini-spec completion as including state update and processing order. The canonical SPEC also defines autonomous world progression as a core product principle and records original-technique generation as future design rather than an already integrated runtime behavior. Therefore a pure evaluator alone cannot close the Sprint3 original-technique product requirement.

## Spec-to-source matrix

| Item | Canonical requirement | Current source boundary | Missing boundary | Classification |
|---|---|---|---|---|
| Weekly original-technique research accumulation + world-step wiring | `SPEC_PREPARATION_PLAN.md` Sprint 3前 includes 独自技; mini-spec completion requires 状態更新/処理順. `SPEC.md` core principle requires autonomous progression. | `packages/simulation-core/src/sprint3/evaluate-original-technique-lifecycle.ts` exposes pure generation/loss evaluation only. | No production weekly action/state mutation/world-step processor invokes lifecycle research/generation. | **Sprint3 BLOCKER** |
| Generated-technique stat synthesis + school/catalog registration | Sprint 3前 includes 技継承・独自技・失伝; a successful generation must produce a usable inherited technique, not only a success outcome. | `evaluateOriginalTechniqueGenerationAttempt` returns tier, initial mastery and founding history, but does not construct/register a TechniqueCatalog entry or school lineage. | Deterministic generated-technique construction and registration transaction. | **Sprint3 BLOCKER after wiring** |
| First-use match runtime persistence | Lifecycle source accepts optional `firstUseMatchId` when founding history is built, but generation occurs before a future first use. | `buildOriginalTechniqueFoundingHistoryRecord` merely copies an already supplied `firstUseMatchId`; no battle-result hook updates it later. | Battle-result/technique-use hook that persists first-use MatchId exactly once. | **Sprint3 BLOCKER after registration** |

## Evidence
- `docs/SPEC_PREPARATION_PLAN.md`: Sprint 3前 = 師匠資格、門下受入、指導効率、親指導、教授技選択、技継承・独自技・失伝; mini-spec completion requires 入力/出力/状態更新/処理順/設定/不変条件/対象外/受入テスト.
- `docs/SPRINT_3_BACKLOG.md`: S03-008 purpose explicitly says 教授技選択・独自技研究/生成/失伝, while its current tail labels runtime wiring as Sprint3外. This conflicts with the broader Sprint3 preparation authority and cannot by itself waive product behavior.
- `docs/SPEC.md`: autonomous progression is a core pillar; current-binding text says 独自技生成 was not implemented in Sprint1/T01, so later Sprint3 work must actually integrate it to claim the feature.
- `packages/simulation-core/src/sprint3/evaluate-original-technique-lifecycle.ts`: current implementation is explicitly a pure processor. It evaluates thresholds/RNG/cooldown/loss and builds a history record, but contains no WeeklyAction/world-step mutation, TechniqueCatalog/school registration, or post-battle first-use persistence.

## Smallest non-conflicting recovery sequence
1. **S03-009 — original-technique weekly/runtime wiring**: add the minimal persisted research/cooldown state, deterministic weekly accumulation boundary, and world-step invocation of `evaluateOriginalTechniqueGenerationAttempt`; tests must prove deterministic accumulation, threshold attempt, failed-retention/cooldown, and successful state commit. Do not redesign generation math.
2. **S03-010 — generated technique registration**: deterministic stat synthesis from the already-classified tier/source techniques, TechniqueId allocation, TechniqueCatalog/school registration, founder mastery initialization, and founding-history commit in one transaction; rollback on validation failure.
3. **S03-011 — first-use persistence**: on completed battle result, detect first actual use of a generated technique and persist `firstUseMatchId` once; replay/idempotence tests required.
4. Re-run focused Sprint3 regressions, simulation-core build/typecheck, and root `npm run check` before formal READY.

## Non-conflict note
Lane A currently owns `SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1`; this audit made no gameplay-source or lane-A changes. The follow-up implementation must not be dispatched onto A until that lane returns IDLE, and must not overwrite any newer B2 task if one appears.
