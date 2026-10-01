# PTG-017 ordinary-flow reachability correction

state: GPT_ONLY_SOURCE_RECONCILED
assignment-generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R3
source-lineage: thin-bt/dollworld master
supersedes-only: PTG-013/PTG-014 claims that require a second ordinary enrollment for an already-completed child

## Source finding

`materializeLiveEnrollmentQueueBoundaries()` calls `childAlreadyEnrolled()`, which returns true whenever `completedEnrollmentOutcomes` already contains the child. Therefore a completed PTG enrollment is not naturally materialized again merely because the parent later becomes formal-master-qualified.

A manually injected second `pendingEnrollmentBoundaries` record remains useful as an adapter/replacement regression, but it is not ordinary-flow acceptance evidence.

## PTG-017 reachable ordinary-flow acceptance

Week N preconditions:
- child is exactly at `formalEnrollmentMinAge` and otherwise live/enrollment eligible;
- biological parent is living/participating but not formal-master-qualified;
- no eligible non-parent formal master is available;
- parent temporary guidance is enabled and allowed;
- runtime has no completed/pending enrollment for the child;
- parent sidecar `discipleCount=0`.

Week N actions:
1. materialize the live enrollment queue;
2. process the materialized intake boundary;
3. retain the returned runtime and weekly-training sidecars without rebuilding them.

Week N assertions:
- exactly one completed enrollment outcome exists for the child;
- exactly one mentorship exists for the child;
- relation is `parent_temporary_guidance`;
- selected master is the biological parent;
- parent `discipleCount=0`.

Week N+1 mutation:
- preserve the returned runtime/sidecars;
- change only facts needed to make the same parent formal-master-qualified;
- run live enrollment materialization again.

Week N+1 assertions:
- zero new pending enrollment records for the child;
- completed enrollment outcome count for the child remains one;
- mentorship cardinality remains one;
- relation remains `parent_temporary_guidance`;
- selected parent remains unchanged;
- parent `discipleCount` remains zero.

## Regression classification

| case | source reachability | evidence class |
|---|---|---|
| initial PTG enrollment | ordinary live flow | acceptance |
| next-week parent qualification after completed PTG | ordinary live flow; no re-enrollment | acceptance/non-rematerialization |
| manually injected PTG -> formal second intake | synthetic adapter input | replacement/cardinality regression only |
| formal weekly multiplier | use independently reachable first formal enrollment | native-unit regression |
| explicit teach control | use independently reachable formal mentorship | negative/control regression |
| disciple-count efficiency | use independently reachable formal mentorship with controlled count | multiplier-isolation regression |

## Consequence for PTG-014/015/016

Do not consume a synthetic PTG-013 second intake as proof of ordinary-flow formal mentorship. PTG weekly exactly-once may consume the persisted initial PTG state. Formal weekly, explicit-teach, and disciple-efficiency controls must start from an independently reachable first formal enrollment fixture.

## Acceptance guard

A future source change may intentionally permit re-enrollment/replacement. Until such an entrypoint is source-proven and covered by ordinary-flow tests, tests must not label a manually inserted second pending enrollment as ordinary-flow evidence.
