# SPRINT3-S03-052-S03-051-CANONICAL-PUBLICATION-RECOVERY-A-20260922-R1

state: READY
terminal: S03_052_S03_051_CANONICAL_PUBLICATION_RECOVERY_READY
verificationOutcome: PASS
resultClass: PRODUCT_PUBLICATION_RECOVERY
lane: A
updatedAt: 2026-09-22T06:30:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: a9e5e91
origin-master-at-ready: 95c1e49
published-commit-message: fix(web): show formal master displayName on person detail (S03-051 recovery)
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-S03-051-PERSON-DETAIL-MASTER-NAME-VISIBILITY-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Recovered the S03-051 **Person Detail formal-master displayName** product delta onto canonical **GitHub master**. Pre-recovery readback showed raw `{masterId}` labels; post-push readback shows `personDisplayLabel` wiring and `PersonDetailPage` master-name loading. No UI-005 contract or unrelated product paths changed. No B2 control files read or edited.

## Published paths (canonical master)

| Path | Delta |
|------|--------|
| `apps/web/src/client/presentation/person-display-label.ts` | Shared personId → observer label helper |
| `apps/web/src/client/person-detail/PersonDetailView.tsx` | Formal-master link labels use `personNameById` |
| `apps/web/src/client/person-detail/PersonDetailPage.tsx` | Loads master display names after primary detail |
| `apps/web/src/client/person-detail/person-detail.test.tsx` | Named masters, fallback ID, empty state preserved |

## GitHub readback verification

| Check | Result |
|-------|--------|
| `PersonDetailView.tsx` on `origin/master` uses `personDisplayLabel(...)` not raw `{masterId}` for visible link text | **PASS** |
| `PersonDetailPage.tsx` on `origin/master` contains `personNameById` / `setPersonNameById` master fetch wiring | **PASS** |
| `person-display-label.ts` present on `origin/master` | **PASS** |

```powershell
git fetch origin master
git show origin/master:apps/web/src/client/person-detail/PersonDetailView.tsx | Select-String personDisplayLabel
git show origin/master:apps/web/src/client/person-detail/PersonDetailPage.tsx | Select-String personNameById
```

## Local verification (pre-push, same file contents as commit 95c1e49)

| Check | Result |
|-------|--------|
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx` | **PASS** (13 tests) |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `prettier --check` (four changed paths) | **PASS** |
| `eslint` (four changed paths) | **PASS** |

## Publication

- Commit: `95c1e49` on `thin-bt/dollworld` `master`
- Push: `origin/master` updated `a9e5e91..95c1e49`

## Terminal

**S03_052_S03_051_CANONICAL_PUBLICATION_RECOVERY_READY** — S03-051 product delta is canonical on GitHub master with readback-verified formal-master displayName presentation.
