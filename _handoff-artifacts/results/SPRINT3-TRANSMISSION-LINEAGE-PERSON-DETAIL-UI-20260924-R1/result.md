# SPRINT3-TRANSMISSION-LINEAGE-PERSON-DETAIL-UI-20260924-R1

state: TERMINAL
terminal: SPRINT3_TRANSMISSION_LINEAGE_PERSON_DETAIL_UI_IMPLEMENTED_BROWSER_RESIDUAL
verificationOutcome: IMPLEMENTED_BROWSER_RESIDUAL
resultClass: PRODUCT_UI_IMPLEMENTATION
lane: A
updatedAt: 2026-09-25T12:35:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
pickup: SDK_EXECUTOR / CURSOR-START-001
product-commit-base: a90ac02c200fff19b94691e8e0da5d2fd08c47aa
product-commit: uncommitted-local (transmission-lineage delta on working tree atop base above)
documentation-change: NO

## Summary

Ordinary Person Detail now exposes read-only **技の伝承・系譜** from persisted Sprint3 data: accepted explicit weekly teach outcomes (`master → technique → disciple`, week included) and OTL founding provenance when `foundingHistories` exist. Refused/skipped teach decisions are excluded from projection. **師弟関係** and technique sections unchanged. Focused unit/integration tests and production web build **PASS**. Playwright browser evidence **did not complete** in this lane (Kaspersky-injected fetch failure during seed discovery + test timeout); residual remains for pristine-root / clean-browser gate. No Cursor B2 control files read or written.

## Changed paths (product)

| Path | Role |
|------|------|
| `apps/web/src/server/ui005/transmission-lineage-projection.ts` | Server read projection (new) |
| `apps/web/src/server/ui005/transmission-lineage-projection.test.ts` | Projection + ordering + client key sync (new) |
| `apps/web/src/server/ui005/build-person-detail.ts` | Wire `transmissionLineage` into PersonDetailView exact27 |
| `apps/web/src/client/person-detail/ui005-views.ts` | Client mirror types/keys |
| `apps/web/src/client/person-detail/PersonDetailView.tsx` | Normal-view section + empty state + links |
| `apps/web/src/client/person-detail/person-detail.test.tsx` | Empty state + rendering tests |
| `apps/web/src/client/integration/frontend-integration.test.tsx` | Fixture includes `transmissionLineage` |
| `apps/web/src/client/mock-battle/mock-battle.test.tsx` | Fixture includes `transmissionLineage` |
| `apps/web/src/server/sprint3-transmission-lineage-browser-fixture-probe.test.ts` | Seed discovery helper (new, heavy) |
| `tests/e2e/s3-transmission-lineage-person-detail-browser-evidence-a.spec.ts` | Browser evidence spec (new) |

## Verification

| Check | Result |
|-------|--------|
| A ACTIVE lock before work (CURSOR-START-001) | **PASS** |
| `npm run build -w @shared-world/web` | **PASS** |
| `vitest run apps/web/src/server/ui005/transmission-lineage-projection.test.ts` | **PASS** — 5/5 |
| `vitest run apps/web/src/client/person-detail/person-detail.test.tsx` | **PASS** — 17/17 (incl. transmission lineage) |
| `vitest run apps/web/src/server/ui005.person-detail.test.ts` | **PASS** — 10/10 (API includes `transmissionLineage` key) |
| `vitest run apps/web/src/server/sprint3-transmission-lineage-browser-fixture-probe.test.ts` | **NOT COMPLETED** (long-running seed scan; stopped after ~5m) |
| Playwright `s3-transmission-lineage-person-detail-browser-evidence-a.spec.ts` (chrome) | **FAIL** — `Failed to fetch` via Kaspersky script injection during `page.evaluate` fetch; 360s timeout in discovery loop |

```powershell
cd D:\xampp\htdocs\dollworld
npm run build -w @shared-world/web
npx vitest run apps/web/src/server/ui005/transmission-lineage-projection.test.ts
npx vitest run apps/web/src/client/person-detail/person-detail.test.tsx
npx vitest run apps/web/src/server/ui005.person-detail.test.ts
# Browser (residual):
# $env:S03_TRANSMISSION_SEED_SCAN_MAX='24'; $env:S03_TRANSMISSION_DISCOVERY_MAX_WEEKS='160'
# npx playwright test tests/e2e/s3-transmission-lineage-person-detail-browser-evidence-a.spec.ts --project=chrome
```

## Browser evidence status

**IMPLEMENTED_BROWSER_RESIDUAL** — Implementation and API contract verified by tests; ordinary `/people/:id` UI not proven in this run. Retry Playwright on a host without AV fetch interception, or run exact-lineage pristine-root gate per Sprint3 release binding.

## Residual

- Publish product delta to GitHub canonical `master` (currently local uncommitted atop `a90ac02c`).
- Complete Playwright browser evidence (or successor exact-lineage gate) before treating transmission-lineage UI as fully release-evidenced.
- Full root `npm run check` not run (out of scope for smallest relevant verification).

## Terminal

**SPRINT3_TRANSMISSION_LINEAGE_PERSON_DETAIL_UI_IMPLEMENTED_BROWSER_RESIDUAL** — Person Detail transmission-lineage surface implemented and unit/integration verified; browser acceptance residual remains.
