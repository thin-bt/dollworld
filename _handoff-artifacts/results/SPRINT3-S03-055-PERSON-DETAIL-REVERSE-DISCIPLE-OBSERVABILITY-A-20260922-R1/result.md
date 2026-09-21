# SPRINT3-S03-055-PERSON-DETAIL-REVERSE-DISCIPLE-OBSERVABILITY-A-20260922-R1

state: TERMINAL
terminal: S03_055_PERSON_DETAIL_REVERSE_DISCIPLE_OBSERVABILITY_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: A
updatedAt: 2026-09-22T08:32:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: 896377b4807dc45392a410d2b19bcf8414875a73
publication-commit: ffad8126c863bd625fc3f80c1dace1e26de70749
publication-parent: 896377b4807dc45392a410d2b19bcf8414875a73
origin-master-at-completion: ffad8126c863bd625fc3f80c1dace1e26de70749
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: CONTROL-RECOVER-STASHED-HANDOFF-UNTRACKED-A-20260922-R1
production-change: YES
documentation-change: NO

## Summary

Closed Role2-confirmed Sprint3 Person Detail observability gap: **UI-005 PersonDetailView 0.2.1 exact26** adds canonical **`formalDisciplePersonIds`**, derived from the same **`master_disciple`** relationship collection as **`formalMasterPersonIds`** (no second truth). Ordinary **師弟関係** now shows **正式門下** with display-name links and **`data-person-id`** / `/people/{personId}` href; zero/one/many and stale-name (personId fallback) covered. Existing disciple → master behavior unchanged. Did not read or edit Cursor B2 control files.

## Contract evolution

| Item | Detail |
|------|--------|
| Version | PersonDetailView **0.2.1 exact26** (+1 key) |
| New field | `formalDisciplePersonIds: string[]` |
| Source | `projectRelationships` reverse projection on canonical `master_disciple` records |
| Integrity | Broken disciple counterpart → PersonDetail **500** (FI-039 parity) |

## Changed paths

| Path | Delta |
|------|--------|
| `apps/web/src/server/ui005/relationship-projection.ts` | Reverse formal-disciple projection + duplicate guard |
| `apps/web/src/server/ui005/build-person-detail.ts` | exact26 key set + integrity check |
| `apps/web/src/client/person-detail/ui005-views.ts` | Client mirror exact26 |
| `apps/web/src/client/person-detail/PersonDetailView.tsx` | **正式門下** observer section |
| `apps/web/src/client/person-detail/PersonDetailPage.tsx` | Load display names for masters + disciples |
| `apps/web/src/client/person-detail/person-detail.test.tsx` | zero/one/many + fallback tests |
| `apps/web/src/server/ui005.person-detail.test.ts` | Projection + duplicate-disciple pure tests |
| `apps/web/src/client/mock-battle/mock-battle.test.tsx` | Fixture key |
| `apps/web/src/client/integration/frontend-integration.test.tsx` | Fixture key |
| `apps/web/src/client/battle-log/battle-log.test.tsx` | Fixture key |

## Verification

Worktree: `_handoff-artifacts/control-tmp/s03-055-publish-wt` @ pickup tip **`896377b`**.

| Check | Result |
|-------|--------|
| Fresh-read A inbox + instruction + Role2 gap evidence | **PASS** |
| A ACTIVE lock before edits (CURSOR-START-001) | **PASS** |
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/server/ui005.person-detail.test.ts` | **PASS** (25 tests) |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `prettier --check` (changed paths) | **PASS** (after PersonDetailPage format) |
| `eslint` (changed paths) | **PASS** |
| Canonical push + GitHub readback | **PASS** |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
# pickup tip: 896377b4807dc45392a410d2b19bcf8414875a73

git worktree add _handoff-artifacts/control-tmp/s03-055-publish-wt 896377b4807dc45392a410d2b19bcf8414875a73
cd _handoff-artifacts/control-tmp/s03-055-publish-wt
npx vitest run apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/server/ui005.person-detail.test.ts
npm run typecheck -w @shared-world/web
git push origin HEAD:refs/heads/master
git fetch origin master
git rev-parse origin/master
git show origin/master:apps/web/src/client/person-detail/PersonDetailView.tsx
```

## Canonical GitHub readback

- **Pickup tip:** `896377b4807dc45392a410d2b19bcf8414875a73`
- **Publication SHA:** `ffad8126c863bd625fc3f80c1dace1e26de70749`
- **Post-push `origin/master`:** matches publication commit
- **Readback:** `person-detail-formal-disciples` / `person-detail-formal-disciple-link` present on canonical `PersonDetailView.tsx`

## Non-conflict guard

- No Cursor B2 control files read or written.
- Scratch confined to `_handoff-artifacts/control-tmp/s03-055-publish-wt`.
- B2 S03-054 root-gate lane not interfered with; post-S03-055 current-master gate is a separate reconciliation if S03-054 tested pre-055 SHA.

## Terminal

**S03_055_PERSON_DETAIL_REVERSE_DISCIPLE_OBSERVABILITY_READY** — Master → current formal disciple observability on ordinary Person Detail with explicit UI-005 exact26 contract evolution and focused server/client regression coverage on canonical `master`.
