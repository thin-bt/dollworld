# SPRINT3-CURRENT-MASTER-ORDINARY-UI-PLAYABILITY-A-20260922-R1

state: READY
terminal: SPRINT3_CURRENT_MASTER_ORDINARY_UI_PLAYABILITY_A_PASS
verificationOutcome: PASS
resultClass: RELEASE_EVIDENCE
finding: ORDINARY_SPRINT3_UI_PLAYABLE_ON_CURRENT_PRODUCT_SHA
lane: A
updatedAt: 2026-09-22T16:36:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
canonical-product-sha: 788342efb644623c2101e7aa7a3c410a3f79b627
origin-master-head-at-close: 42b6d1d1be513ba6ae1c6cf807ab31b0debb28c8
pickup: ACTIVE_IDLE / SDK_EXECUTOR / CURSOR-START-001
predecessor: SPRINT3-MENTORSHIP-REAL-UI-GAP-CLOSURE-A-20260922-R1
production-change: NO
documentation-change: NO

## Summary

Fresh **current-master product bytes** (`788342e`; `apps/web` + `packages/` identical to `origin/master` tip `42b6d1d`) were verified for **ordinary** Sprint3 user-facing playability on the A-owned surface set: production **typecheck/build**, **simulation/start → Sprint3 runtime binding**, and **real Chrome navigation** to Person Detail **師弟関係** (qualified master, formal masters, formal disciples). No product defect required repair. Sprint3 remains **REOPENED_FIX_REQUIRED** in binding status; this run does **not** grant formal `CLOSED` or re-run full root `npm run check` as completion (historical S03-064 gate is evidence-only per instruction). B2 control files were not read or edited.

## Player-observable Sprint3 surfaces (canonical master)

| Surface | Route / action | Observed UI | Runtime binding |
|---------|----------------|-------------|-----------------|
| Ordinary session + Sprint3 activation | `GET /` → `POST /api/s1_5/simulation/start` (`presetId: sprint1-tiny-accepted`, seed scan) | `data-session-state=ready`, `ui001-shell` | `bindAcceptedProductionSprint3RunSession` → `context.sprint3Config`, `runtimeState.mentorshipEntrypointRuntime` (vitest production-boundary proof) |
| Person Detail mentorship | Menu **人物** → `/people` → `/people/{personId}` | `person-detail-mentorship`, `person-detail-qualified-master`, `person-detail-formal-masters`, `person-detail-formal-disciples`, display names + `なし` empty states | UI-005 `build-person-detail` + `relationship-projection` from accepted runtime relationship records (`master_disciple`) |
| Weekly teach / enrollment / OTL processors | Ordinary week step via simulation API (no dedicated Sprint3-only nav screen) | **Not player-visible as standalone pages** on current master | Processors run inside weekly simulation step (`mentorshipEntrypointRuntime` counters); accepted per backlog S03-012+ integration evidence — **backend-observable**, not ordinary UI routes |

## Browser evidence (real navigation)

| Spec | Routes / actions | Result |
|------|------------------|--------|
| `s3-person-detail-mentorship-browser-evidence-b2.spec.ts` | `/` bootstrap → start tiny preset → **人物** → `/people/{id}` | **PASS** — 師資格あり/なし, 正式師匠 なし/リンク+displayName |
| `s3-person-detail-reverse-disciple-browser-evidence-a.spec.ts` | Same ordinary bootstrap → `/people/{id}` | **PASS** — 正式門下 list + navigation |

Artifacts: `output/playwright/playwright-report.json`, `output/playwright/playwright-html/`.

## Verification commands

| Check | Result |
|-------|--------|
| A ACTIVE lock before work (CURSOR-START-001) | **PASS** |
| `npm run typecheck -w @shared-world/web` | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| `vitest run apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts` | **PASS** |
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/server/ui005.person-detail.test.ts` | **PASS** (25 tests) |
| Playwright chrome — both S03 person-detail specs | **PASS** (2 tests, ~1.2m; webServer build/start) |

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse HEAD
git diff --stat HEAD origin/master -- apps/web packages
npm run typecheck -w @shared-world/web
npm run build -w @shared-world/web
npx vitest run apps/web/src/server/ui009/sprint3-ordinary-session-activation.test.ts apps/web/src/client/person-detail/person-detail.test.tsx apps/web/src/server/ui005.person-detail.test.ts
npx playwright test tests/e2e/s3-person-detail-mentorship-browser-evidence-b2.spec.ts tests/e2e/s3-person-detail-reverse-disciple-browser-evidence-a.spec.ts --project=chrome
```

## Backlog fixed completion conditions (`docs/SPRINT_3_BACKLOG.md`)

| Condition | This run |
|-----------|----------|
| S03-001..S03-011 + accepted production evidence aligned with canonical results | **PASS** (no product delta; prior ACCEPT rows unchanged) |
| Sprint3Config / domain validation / hash contracts | **PASS** (typecheck + ordinary-start binding test) |
| Config thresholds not hard-coded outside SPEC | **PASS** (no code change; existing production binding unchanged) |
| Scope separation (teach / enrollment / Sprint4 retirement) | **PASS** (verification scoped to Sprint3 ordinary UI + start binding) |
| Root `npm run check` success (S03-025 release gate) | **NOT RE-RUN** — instruction: historical root gates are evidence only; latest historical binding S03-064 @ `c0c9754` **1925/1925** remains cited in backlog |

## Non-conflict guard

- No edits to `CURSOR_B2_INBOX.md` or `CURSOR_B2_ACTIVE_TASK.md`.
- Did not duplicate B2 Sprint2 competition-flow/build/start reacceptance scope.
- Did not change `SPRINT3_STATUS.md` or mark Sprint3 `CLOSED`.

## Remaining blocker (control / formal closure)

- Binding `SPRINT3_STATUS.md`: **REOPENED_FIX_REQUIRED** until PM/control reconciles current-master formal closure with full applicable gates (root check re-run and cross-lane recovery remain outside this A evidence task).
- `origin/master` tip `42b6d1d` carries control-only commits after product SHA `788342e`; local merge of control deltas was not required for product verification.

## Terminal

**SPRINT3_CURRENT_MASTER_ORDINARY_UI_PLAYABILITY_A_PASS** — Current-master ordinary Sprint3 UI (session start binding + Person Detail mentorship/disciple surfaces) verified with fresh typecheck, production build, integration tests, and Chrome Playwright; no production repair required.
