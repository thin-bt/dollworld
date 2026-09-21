# SPRINT3-S03-051-PERSON-DETAIL-MASTER-NAME-VISIBILITY-A-20260922-R1

state: READY
terminal: S03_051_PERSON_DETAIL_MASTER_NAME_VISIBILITY_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T06:14:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: bb8dd300e2d83e0ac9f82f17d8b5c32b58109441
worktree-head-at-pickup: ed123ca5763172184458db67af602efc6629f878
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-050-POST030-EVIDENCE-LEDGER-RECONCILIATION-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Ordinary **Person Detail** **正式師** links now show each master’s accepted UI-005 **`displayName`** (via the same person-detail GET used elsewhere, e.g. battle log) while **`href`** / **`data-person-id`** remain bound to the canonical master **`personId`**. UI-005 exact25 contract unchanged; developer-details raw **`formalMasterPersonIds`** unchanged. No B2 control files read or edited.

## Changed paths

| Path | Delta |
|------|--------|
| `apps/web/src/client/presentation/person-display-label.ts` | Shared personId → observer label helper |
| `apps/web/src/client/person-detail/PersonDetailView.tsx` | Formal-master link labels use `personNameById` |
| `apps/web/src/client/person-detail/PersonDetailPage.tsx` | Loads master display names after primary detail |
| `apps/web/src/client/person-detail/person-detail.test.tsx` | Named masters, fallback ID, empty state preserved |

## Verification

| Check | Result |
|-------|--------|
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx` | **PASS** (13 tests) |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `prettier --check` (changed paths) | **PASS** |
| `eslint` (changed paths) | **PASS** |

```powershell
cd D:\xampp\htdocs\dollworld
npx vitest run apps/web/src/client/person-detail/person-detail.test.tsx
npm run typecheck -w @shared-world/web
npx prettier --check apps/web/src/client/person-detail/PersonDetailView.tsx apps/web/src/client/person-detail/PersonDetailPage.tsx apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/client/presentation/person-display-label.ts
npx eslint apps/web/src/client/person-detail/PersonDetailView.tsx apps/web/src/client/person-detail/PersonDetailPage.tsx apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/client/presentation/person-display-label.ts
```

## Non-conflict guard

- No UI-005 exact-key drift; no Sprint3 domain/config changes.
- No B2 S03-049 root-gate files touched.
- No Cursor B2 control artifacts read or written.

## Terminal

**S03_051_PERSON_DETAIL_MASTER_NAME_VISIBILITY_READY** — Formal masters are observer-readable by display name with correct `/people/{personId}` navigation and focused regression coverage.
