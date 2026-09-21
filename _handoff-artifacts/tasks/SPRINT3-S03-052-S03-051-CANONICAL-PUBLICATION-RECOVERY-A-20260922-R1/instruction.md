# SPRINT3-S03-052-S03-051-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_PUBLICATION_RECOVERY
priority: DEADLINE_CRITICAL
authority: GitHub thin-bt/dollworld master
predecessor: SPRINT3-S03-051-PERSON-DETAIL-MASTER-NAME-VISIBILITY-A-20260922-R1

## Fresh gap evidence

S03-051 terminal says Person Detail formal-master labels were changed to accepted displayName and lists four changed product/test paths. Fresh GitHub master readback after that terminal shows the canonical files still contain the pre-S03-051 implementation: PersonDetailView renders `{masterId}` directly and PersonDetailPage has no master-name loading state. Therefore S03-051 is terminal locally but its product delta is not canonical on master.

## Required implementation

1. Fresh-read S03-051 result and current master.
2. Recover/reconcile only the S03-051 product/test delta onto current master:
   - apps/web/src/client/presentation/person-display-label.ts
   - apps/web/src/client/person-detail/PersonDetailView.tsx
   - apps/web/src/client/person-detail/PersonDetailPage.tsx
   - apps/web/src/client/person-detail/person-detail.test.tsx
3. Preserve canonical master personId for href/data-person-id; visible label uses accepted displayName with deterministic ID fallback.
4. Do not alter UI-005 response contract, Sprint3 domain/config, or unrelated files.
5. Run focused person-detail tests, web typecheck, prettier/eslint on changed paths.
6. Commit/push product delta to master.
7. Verify by GitHub readback from master that PersonDetailView no longer renders raw masterId as the ordinary visible label and PersonDetailPage contains the corresponding master-name loading/wiring.
8. Publish terminal result under _handoff-artifacts/results/SPRINT3-S03-052-S03-051-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1/result.md.

READY is forbidden unless the product files themselves are present on canonical GitHub master.