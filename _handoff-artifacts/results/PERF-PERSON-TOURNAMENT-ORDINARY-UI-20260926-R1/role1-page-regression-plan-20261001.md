# Role1 Person Detail page-level regression patch plan — 2026-10-01

Authority reviewed on master:
- apps/web/src/client/person-detail/PersonDetailPage.tsx
- apps/web/src/client/person-detail/fetch-person-identities.ts
- apps/web/src/client/person-detail/person-detail-request-count.test.ts
- PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/role1.md

## Concrete source/test delta

Current page code calls loadPersonIdentities directly after the selected detail succeeds. The existing request-count test instead exercises loadRelatedPersonNames, so it cannot prove the production page path. Keep the helper tests, but add page-level coverage against PersonDetailPage with a fetch spy.

### Exact test cases

1. R=0: detail response contains empty formalMasterPersonIds/formalDisciplePersonIds. Assert selected full-detail GET exactly 1, identities GET 0, related full-detail GET 0.
2. R>0 duplicate: detail contains duplicate ids across master/disciple arrays. Assert selected full-detail=1, identities=1, query ids deduplicated, related full-detail=0, returned names visible.
3. identity transport failure: identities fetch throws. Assert one identity attempt, no retry, personId fallback remains visible.
4. revision mismatch: detail uiRevision=7 and identities envelope uiRevision=8. Assert names do not commit and personId fallback remains.
5. empty displayName: returned identity has empty displayName. Assert fallback remains.
6. stale A->B: hold A identities promise, rerender page with personId B, complete B, then resolve A. Assert A names never appear in B and B remains authoritative.
7. missing identity row: request two ids, response contains one. Assert known name renders and omitted id falls back to personId.

### Harness mechanics

Use PersonDetailPage with injected fetchImpl. Classify requests by URL:
- selected full-detail: /api/s1_5/people/{selected-id}
- identity batch: /api/s1_5/people/identities
- related full-detail: /api/s1_5/people/{related-id}

Do not assert call order beyond the required dependency that identities begins only after selected detail success. For stale navigation use deferred Promise responses rather than timers.

## Browser measurement handoff clarification

The existing 80-sample contract remains unchanged. For the normal after-side R>0 population every successful open must show selected full-detail=1, identity-batch=1, related-full-detail=0. The targeted failure matrix may use identity-batch<=1. This document does not claim browser PASS.

Cursor A/B2 are intentionally paused by user; this is GPT-only preparation, not an executor failure.
