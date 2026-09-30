# ROLE3-S03-006-PARENT-GUIDANCE-ORDINARY-BROWSER-20260930-R1

state: GPT_ONLY_ACCEPTANCE_SPEC_READY
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
sprint: Sprint3
mode: GPT_ONLY_CURSOR_INTENTIONALLY_PAUSED
scope: parent_temporary_guidance ordinary-user weekly train_stat acceptance

## Authority boundary

This closes no Sprint and claims no browser PASS. It converts the binding S03-006 ordinary-flow residual into an executable acceptance contract while Cursor A/B2 are intentionally paused by user authority.

Binding residual source: `SPRINT3_STATUS.md` and `ROLE1-S03-006-ORDINARY-FLOW-ACCEPTANCE-RESIDUAL-20260923-R14`.

## Required ordinary-flow fixture/preconditions

Use production web flow and current exact product lineage. Do not inject the mentorship relation directly.

Create/select an eligible child such that:
- child has a persisted live biological parent resolvable through ordinary family data;
- parent is eligible to guide the child;
- child has no applicable formal master at intake;
- the tested weekly action is ordinary `train_stat`;
- capture the child's target stat immediately before the week and all teacher/efficiency inputs needed to recompute the expected delta.

The selected parent id must be proven equal to the biological parent id from persisted family state.

## Scenario A — parent temporary guidance selected

1. Enter the child through the ordinary enrollment/intake path.
2. Read the persisted mentorship/training state through the ordinary UI/API surface used by production.
3. Assert relation kind = `parent_temporary_guidance`.
4. Assert teacher id = the real biological parent id; no synthetic/test-only teacher id.
5. Preserve pre-week target stat and the effective parent teacher factor.

FAIL if the test seeds the relation directly or calls a helper that bypasses enrollment selection.

## Scenario B — one ordinary train_stat week applies exactly once

1. From Scenario A state, choose/advance exactly one ordinary weekly `train_stat` action.
2. Record pre-value, post-value and all ordinary modifiers.
3. Recompute the expected delta using the same accepted balance contract, with the parent teacher factor included once.
4. Assert observed post-value - pre-value equals the expected one-application delta.
5. Assert it does not equal a double-applied teacher-factor result.
6. Reload/re-read persisted state and assert the same post-value; refresh/navigation must not apply the week again.

Evidence must include the ordinary action request/step identity and before/after values, not only UI text saying a parent is guiding.

## Scenario C — formal master replaces temporary parent guidance

Starting from a valid parent-guidance child:
1. Make a formal master applicable using the ordinary product flow.
2. Advance/re-enter the normal selection point required by current authority.
3. Assert active teacher/relation resolves to the formal master, not the parent temporary guidance.
4. Run one ordinary `train_stat` week.
5. Assert the formal-master factor is applied once and the former parent factor contributes zero.

Do not accept coexistence that causes both factors to affect the same stat delta.

## Scenario D — explicit teach does not double apply

With an eligible active teacher state:
1. Exercise the ordinary explicit-teach path for the same child/week boundary allowed by product rules.
2. Capture the resulting training/development effect.
3. Assert the ordinary `train_stat` teacher contribution is not applied a second time because explicit teach occurred.
4. Reload and verify persisted values remain single-applied.

## Scenario E — disciple-count efficiency remains orthogonal

Use a teacher with the S03-005 disciple-count efficiency condition observable:
1. Record disciple count / efficiency input.
2. Run one ordinary `train_stat` week.
3. Recompute expected delta with disciple-count efficiency and exactly one selected teacher factor.
4. Assert parent/formal teacher selection does not duplicate the disciple-count multiplier and vice versa.

## Minimum evidence schema

For each scenario retain:
- exact tested product SHA;
- seed/preset and child/person id;
- child biological parent id;
- selected relation kind and teacher id;
- formal-master id when applicable;
- week number and ordinary action/step identity;
- target stat, pre-value, post-value, observed delta;
- expected single-application delta and double-application counterfactual;
- disciple-count/efficiency inputs when applicable;
- request/response or persisted-state evidence sufficient to prove reload stability;
- desktop browser trace/screenshot paths when execution resumes.

## Acceptance

PASS requires A+B+C+D+E on one current product lineage, with no test-only direct relation injection. A helper/unit PASS may support diagnosis but cannot replace ordinary-flow evidence.

Hard failures:
- selected parent id is not the persisted biological parent;
- relation is manually injected;
- one weekly step mutates the stat more than once;
- formal master and parent factor both contribute after replacement;
- explicit teach causes duplicate teacher contribution;
- disciple-count efficiency duplicates the teacher factor;
- reload/navigation changes the already-applied weekly result.

## GPT-only source-review delta

Current canonical status already proves the residual is acceptance evidence, not a request to reopen the consumed tournament server work. The predecessor records spec-to-source closure for live enrollment/family parent identity -> persisted mentorship relation kind -> `applyTrainStat` teacher-factor selection. Therefore the next execution should implement/execute the ordinary-flow harness above rather than redesign parent-guidance semantics unless execution exposes a mismatch.

next-action: when browser execution is intentionally resumed, implement this contract in a Role3-owned Sprint3 ordinary-flow browser spec and execute it against current production lineage. Until then continue GPT-only source/test review for fixture determinism and observable value fields without routing to Cursor.
