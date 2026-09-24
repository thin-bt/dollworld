# ROLE3-S03-TRANSMISSION-EXACT26-BINDING-GAP-20260925-R41

state: COMPLETE
role: Role3
sprint: Sprint3
control-authority: GitHub `thin-bt/dollworld` / `master`
date: 2026-09-25

## Concrete current-master gap

Fresh source inspection after dispatch of `SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1` proves the task has not landed on current master yet.

- Server `apps/web/src/server/ui005/build-person-detail.ts` still declares PersonDetailView as exact26 and its key set ends with `trainingHistory`; no transmission-lineage projection exists.
- Client mirror `apps/web/src/client/person-detail/ui005-views.ts` is still exact26 and likewise has no transmission-lineage field.
- `apps/web/src/client/person-detail/PersonDetailView.tsx` still renders `師弟関係` and `技` independently and has no ordinary `技の伝承・系譜` section.
- Therefore the canonical READY implementation remains necessary; do not treat A pickup/invocation as implementation completion.

## Acceptance binding

The implementation must change server and client exact-key contracts atomically. A server-only addition will intentionally fail `loadPersonDetail()` because `fetch-ui005.ts` uses `hasExactKeys(..., PERSON_DETAIL_VIEW_KEYS)`; a client-only addition cannot be populated by the API. Required terminal evidence must therefore bind:
1. server PersonDetailView key-set update,
2. client mirror key-set update,
3. projection from persisted Sprint3 teaching/founding history,
4. ordinary normal-view rendering,
5. focused exact-key/render tests and production web build,
6. browser evidence or an explicit browser residual result class.

## Lane observation

At inspection time A Inbox is PREPARED for the transmission task and the fresh A executor heartbeat is INVOKING that exact task. Under GITHUB_CONTROL_PLANE this lane is executing and must not be overwritten. B2 is also INVOKING its existing screenshot task and must not be overwritten.

No new gameplay semantics are authorized by this evidence.
