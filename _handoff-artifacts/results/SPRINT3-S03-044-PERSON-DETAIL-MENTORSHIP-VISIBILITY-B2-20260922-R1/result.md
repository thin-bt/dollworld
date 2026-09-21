# SPRINT3-S03-044-PERSON-DETAIL-MENTORSHIP-VISIBILITY-B2-20260922-R1

state: TERMINAL
terminal: SPRINT3_S03_044_PERSON_DETAIL_MENTORSHIP_VISIBILITY_B2_READY
verificationOutcome: PASS
resultClass: PRODUCT_GAP_CLOSURE
lane: B2
updatedAt: 2026-09-22T00:45:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
origin-master-at-pickup: af3bcc978d290108874b1a6ab398b435d293d6d6
publication-commit: 4884107dcf1326ad538cfbe3729dd7a713bc9aae
publication-parent: af3bcc978d290108874b1a6ab398b435d293d6d6
origin-master-at-completion: 4884107dcf1326ad538cfbe3729dd7a713bc9aae
pickup: SDK_EXECUTOR / PREPARED
recovery: CURSOR-B2-001 — single bounded attempt per check family; no same-case retry after exhaust
production-change: YES
documentation-change: NO

## Summary

Closed the Sprint3 person-detail product gap: ordinary **Person Detail** now presents accepted UI-005 **`qualifiedMaster`** and **`formalMasterPersonIds`** in a compact **師弟関係** section (師範資格 あり/なし, 正式師 links to `/people/{id}` or なし). Developer-details raw sections unchanged. Published to GitHub `master`. Did not read or edit Cursor A control files.

## Changed paths

| Path | Delta |
|------|--------|
| `apps/web/src/client/person-detail/PersonDetailView.tsx` | Observer-facing mentorship section |
| `apps/web/src/client/person-detail/person-detail.test.tsx` | Focused visibility tests (qualified master + empty case) |

## Verification (CURSOR-B2-001)

Worktree: `_handoff-artifacts/control-tmp/s03-044-publish-wt` @ pickup tip **`af3bcc9`**.

| Check family | Attempt | Result |
|--------------|---------|--------|
| Fresh-read B2 inbox + instruction | 1 | **PASS** |
| B2 ACTIVE lock before edits | 1 | **PASS** |
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx` | 1 | **PASS** (12 tests) |
| `npm run typecheck -w @shared-world/web` | 1 | **PASS** |
| `prettier --check` (changed paths) | 1 | **PASS** |
| `eslint` (changed paths) | 1 | **PASS** |
| Canonical push + GitHub readback | 1 | **PASS** |
| Same-case retries | — | **not run** |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
# pickup tip: af3bcc978d290108874b1a6ab398b435d293d6d6

git worktree add _handoff-artifacts/control-tmp/s03-044-publish-wt af3bcc978d290108874b1a6ab398b435d293d6d6
# copy PersonDetailView.tsx + person-detail.test.tsx from implementation workspace
cd _handoff-artifacts/control-tmp/s03-044-publish-wt
npx vitest run apps/web/src/client/person-detail/person-detail.test.tsx
npm run typecheck -w @shared-world/web
git add apps/web/src/client/person-detail/PersonDetailView.tsx apps/web/src/client/person-detail/person-detail.test.tsx
git commit -m "feat(web): expose mentorship fields on ordinary person detail"
git push origin HEAD:refs/heads/master
git fetch origin master
git rev-parse origin/master
git show origin/master:apps/web/src/client/person-detail/PersonDetailView.tsx
```

## Canonical GitHub readback

- **Pickup tip:** `af3bcc978d290108874b1a6ab398b435d293d6d6`
- **Publication SHA:** `4884107dcf1326ad538cfbe3729dd7a713bc9aae`
- **Post-push `origin/master`:** matches publication commit
- **Readback:** `person-detail-mentorship` section present on canonical `PersonDetailView.tsx`

## Non-conflict guard

- **No** Cursor A control files read or written.
- Scratch confined to `_handoff-artifacts/control-tmp/s03-044-publish-wt`.
- UI-005 exact-key contract unchanged; presentation-only client delta.

## Terminal

**SPRINT3_S03_044_PERSON_DETAIL_MENTORSHIP_VISIBILITY_B2_READY** — Ordinary person detail exposes master qualification and formal-master relationships with focused regression coverage on canonical `master`.
