# ROLE2-SPRINT3-TEACH-DISCIPLE-LIVENESS-AUDIT-20260922-R1

state: TERMINAL
terminal: SOURCE_GAP_CONFIRMED
resultClass: IMPLEMENTATION_ANALYSIS
role: Role2
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master

## Unique source-gap finding

`deriveLiveExplicitWeeklyTeachDiscipleRequests` derives the master's active disciple set exclusively from persisted mentorship entries whose `enrollmentOutcomeKind` is `formal_master_assigned` or `parent_master_assigned`, selectedMasterPersonId matches, and mentorshipRelationKind exists. It does not independently check that the disciple is still an active/current disciple at the evaluated week.

The Sprint3 contract describes `currentFormalDiscipleCount` / current mentorship and teaching allocation as current-state semantics. A persisted historical assignment can therefore continue to participate in weekly teach request derivation unless another writer removes/replaces that mentorship entry. This is a liveness boundary that must be proven or closed before formal completion: either canonical runtime mutation guarantees historical/non-current assignments are removed/replaced before weekly teach derivation, or this derivation needs an explicit current-relationship predicate/state.

## Required next implementation/evidence

1. Trace every canonical writer of `mentorshipByChildPersonId` and prove the invariant that each child has at most one current assignment and that ended/non-current mentorship cannot remain eligible for `listDisciplesForMaster`.
2. Add a focused regression covering relationship replacement/end across weeks and assert the former master receives no weekly teach request.
3. If the invariant is not already enforced, implement the smallest runtime-state/current-relationship guard; do not invent retirement/lineage Sprint4 behavior.
4. Preserve deterministic disciple ordering and existing persisted teaching-selection semantics.
5. Run focused Sprint3 mentorship/explicit-teach tests and simulation-core typecheck.

## Non-conflict

A currently owns S03-061 final product-gap reconciliation and B2 owns S03-060 current-master root gate. This audit does not dispatch over either PREPARED lane and does not duplicate the root gate. It is canonical evidence for S03-061 to consume or for the next free lane if the invariant is not already proven.
