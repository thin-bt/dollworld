# ROLE3-S03-006-PARENT-GUIDANCE-ORDINARY-BROWSER-20260930-R1

state: GPT_ONLY_ACCEPTANCE_SPEC_RECONCILED
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

## Scenario C — [SUPERSEDED BY PTG-017] same-child formal replacement diagnostic only

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

PASS is governed by the reconciled machine verdict below: PTG-014A and PTG-015 must use production-reachable independent lineages; PTG-016 must use a legal controlled contrast when reachable. Legacy A+B+C+D+E same-child continuity is superseded by PTG-017.

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

## GPT-only deterministic regression matrix — 2026-10-01

This matrix narrows execution so a resumed browser run cannot pass on labels alone.

| Phase | Preconditions | Ordinary action | Required persisted assertion | Forbidden result |
|---|---|---|---|---|
| PTG select | eligible child; live biological parent; no applicable formal master | normal intake/selection | relation=parent_temporary_guidance; teacherId=biologicalParentId | direct relation injection or synthetic teacher |
| PTG week | prior PTG state; captured pre-stat | exactly one train_stat week | one stat-growth mutation; teacher factor contributes exactly once; reload is stable | second mutation or double teacher-factor counterfactual |
| replacement | same child; formal master becomes applicable through ordinary product state | next normal selection/reconciliation point | active relation/teacher becomes formal master; old PTG no longer contributes | PTG remains an effective concurrent teacher |
| formal week | replacement persisted | exactly one train_stat week | formal teacher factor exactly once; former PTG contribution=0 | formal+PTG combined contribution |
| explicit teach | active teacher; explicit-teach path legal at tested boundary | explicit teach plus permitted weekly progression | teach effect remains distinguishable from the single train_stat teacher contribution | teach causes train_stat teacher contribution to execute twice |
| disciple efficiency | observable disciple-count efficiency input | one train_stat week | disciple efficiency and selected teacher factor each occupy their own single factor role | either factor is duplicated by the other |

### Identity and event-key assertions

For every measured weekly mutation, capture a composite identity of child/person id + absolute week + target stat + ordinary action/step identity. Evidence is invalid if two stat-growth mutations share that identity. Replacement must be proven by persisted relation/teacher identity before the post-replacement week; a UI label change after the mutation is insufficient.

### Arithmetic assertions

Record observedDelta = postValue - preValue, expectedSingle using the production factor breakdown, and an explicit expectedDouble counterfactual where the selected teacher contribution is duplicated. Require observedDelta == expectedSingle and observedDelta != expectedDouble. For replacement, recompute expectedSingle with the formal teacher factor and zero PTG contribution. Disciple-count efficiency is retained as its independent production input; do not fold it into teacher-factor evidence.

### Fixture strategy

SUPERSEDED by PTG-017: do not require one continuous PTG-to-formal same-child scenario. Use the persisted initial ordinary PTG lineage for PTG-014A and a separate independently reachable first-formal lineage for PTG-015. If deterministic setup cannot make a formal master applicable without bypassing ordinary flow, use bounded seed/preset discovery only to select the world; after selection, all relation transitions and weekly actions must occur through production paths. Preserve the selected seed/preset in evidence so the run is reproducible.

### Execution stop conditions

Stop and classify as product/spec mismatch rather than weakening assertions when: formal applicability is reached but PTG remains effective; the factor breakdown cannot distinguish teacher and disciple-count contributions; explicit teach and weekly train_stat share an indistinguishable duplicate mutation; or reload changes an already-applied week. These are diagnostic failures, not acceptable fixture variance.


## GPT-only executable oracle contract — 2026-10-01

The resumed Role3 browser harness must derive PASS from captured production values, not labels. For each measured train_stat step emit one oracle row with: productSha, world/seed, childId, biologicalParentId, relationBefore, teacherIdBefore, absoluteWeek, targetStat, preValue, postValue, factorBreakdown.teacherFactor, factorBreakdown.discipleCountFactor, expectedSingle, expectedTeacherDuplicated, mutationIdentity, reloadValue. mutationIdentity is childId + absoluteWeek + targetStat + ordinary action identity and must be unique.

PTG row preconditions: relationBefore=parent_temporary_guidance, teacherIdBefore=biologicalParentId, no applicable formal master. Require observedDelta=postValue-preValue=expectedSingle and observedDelta!=expectedTeacherDuplicated; reloadValue=postValue.

Replacement row must be captured before the post-replacement stat mutation. Require the persisted active mentorship for the same child to contain exactly one effective teacher relation, the formal relation; no effective parent_temporary_guidance entry may remain. The subsequent train_stat oracle row must use the formal teacher factor once and assign zero contribution to the former PTG factor. This proves cessation semantically rather than from changed UI text.

Explicit-teach negative control: retain the explicit-teach effect/event identity separately from the train_stat mutationIdentity. A legal teach at the tested boundary must not create a second stat-growth mutation with the train_stat identity and must not cause teacherFactor to be multiplied twice.

Disciple-efficiency negative control: capture discipleCountFactor independently from teacherFactor. Compute expectedSingle with each production factor in its own slot, then construct a duplicated-factor counterfactual for each. PASS requires observedDelta to equal the production single-application result and differ from both duplication counterfactuals whenever rounding makes them distinguishable. If rounding collapses a counterfactual to the same numeric delta, that row is insufficient evidence; select another target stat/week/fixture rather than infer non-duplication.

### Deterministic fixture search bounds

Fixture discovery may vary seed/preset only before the accepted scenario starts. Once PTG selection is captured, freeze productSha, world/seed and childId through replacement and all negative controls. Prefer a child whose biological parent can become a formal master through ordinary state transition; this keeps teacher identity constant across PTG -> formal replacement and isolates relation semantics. If no such case is found in the bounded discovery set, record EVIDENCE_GAP rather than injecting mentorship state.

### Machine verdict

SUPERSEDED by the reconciled machine verdict below. Same-child persisted formal replacement is not an ordinary-flow PASS prerequisite. Missing observable values => EVIDENCE_GAP. Arithmetic/identity mismatch => PRODUCT_OR_SPEC_MISMATCH. Interrupted execution => EXECUTION_INCOMPLETE. Unit/helper evidence may diagnose a mismatch but cannot upgrade these verdicts to browser PASS.


## GPT-only canonical reconciliation — PTG-017 reachability correction (2026-10-03)

This section supersedes the earlier Scenario C, continuous same-child replacement fixture strategy, replacement oracle, and Machine verdict wherever they require an ordinary completed PTG child to become a persisted formal replacement merely because the parent later becomes formal-master-qualified.

Canonical PTG-017 establishes that this same-child rematerialization is not an ordinary reachable transition. Acceptance is therefore split into independent production-reachable lanes:

1. **PTG-014A — initial ordinary PTG weekly.** Consume the persisted initial ordinary PTG state directly. Require one native `weekly_train_stat` application, PTG teacher factor exactly once, formal contribution zero, count-0 disciple factor exactly once, and reload/persisted-state stability.
2. **PTG-015 — independent first-formal enrollment.** Use a separate child whose first ordinary enrollment directly yields `parent_master_disciple`. Explicit teach must not duplicate mentorship/cardinality or cause the subsequent weekly teacher contribution to execute twice.
3. **PTG-016 — legal disciple-count contrast.** Counts must arise from legal persisted mentorship transitions through production entrypoints. Direct sidecar/count mutation is forbidden as acceptance evidence. If the required controlled contrast cannot be source-proven/reached, verdict is `NOT_REACHABLE`, not PASS.
4. **Synthetic adapter replacement.** A manually injected second pending boundary after completed PTG may test replacement/cardinality mechanics only and must be labelled `SYNTHETIC_ADAPTER_REPLACEMENT`. It cannot satisfy an ordinary-flow acceptance lane.

### Reconciled arithmetic admissibility

For every weekly oracle row, recompute native production units and production flooring for `EXPECTED_SINGLE`, `PTG_DOUBLE`, `FORMAL_LEAK`, and `DISCIPLE_DOUBLE` as relevant. PASS evidence is admissible only when `EXPECTED_SINGLE` differs from each guarded counterfactual after production flooring. Otherwise classify `FIXTURE_INSUFFICIENT` and select another legal target/week/base/remainder.

### Reconciled machine verdict

Browser PASS no longer requires same-child PTG -> formal replacement. PASS requires the production-reachable PTG-014A and PTG-015 lanes plus the applicable negative controls/reload stability. PTG-016 must PASS when a legal controlled contrast is reachable; a source-proven `NOT_REACHABLE` result is a specification/evidence outcome and must not be replaced by synthetic count mutation. Any synthetic replacement result remains diagnostic only.

This reconciliation does not claim browser execution. It makes the canonical acceptance specification consistent with PTG-014 and PTG-017 while Cursor execution remains intentionally paused.
