# SPRINT3-SCOPE-CLOSURE-CONTRADICTION-ROLE3-20260920-R1

status: FINDING_CONFIRMED
owner: Role3
date: 2026-09-20
priority: DEADLINE_CRITICAL
authority: GitHub `thin-bt/dollworld` / `master`

## Finding

`docs/SPRINT_3_BACKLOG.md` currently labels the remaining original-technique runtime wiring as `Sprint 3 外・後続 wiring`, while `docs/SPEC_PREPARATION_PLAN.md` explicitly places `技継承・独自技・失伝` in `Sprint 3前` and requires input/output/state update/process order for mini-spec completion.

Therefore Sprint3 formal completion must not rely on the backlog's `Sprint 3 外` label alone. The runtime gap needs either implementation in Sprint3 or an explicit authoritative scope correction that reconciles `SPEC_PREPARATION_PLAN.md` before formal READY.

## Current bounded recovery

B2 already owns `SPRINT3-S03-009-ORIGINAL-TECHNIQUE-RUNTIME-WIRING-B2-20260920-R1`, covering persisted research state, deterministic weekly accumulation, generation attempt/cooldown/founding outcome, and production world-step invocation. Do not duplicate or steal that authority.

Lane A already owns `SPRINT3-ROOT-TYPECHECK-RECOVERY-A-20260920-R1`; do not collide with its release-gate work.

## Next product boundaries after S03-009

If S03-009 reaches READY, the remaining concrete product gaps named by the backlog are:

1. S03-010: generated technique stat synthesis plus TechniqueCatalog/school registration.
2. S03-011: first-use match/runtime persistence for the generated technique.

These must be checked against SPEC/Sprint3 authority before Sprint3 formal READY. They may be deferred only by an explicit canonical scope decision that reconciles the preparation plan; absence of implementation is not itself evidence of deferral.

## Formal acceptance guard

Until the contradiction is resolved, a Sprint3 formal acceptance result must distinguish:
- product/test gate health (`npm run check`, focused tests, build), from
- scope completeness for `技継承・独自技・失伝`.

A green typecheck/check does not by itself close this scope finding.
