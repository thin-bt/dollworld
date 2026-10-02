# Role1 GPT-only Person Detail page-level test execution plan

state: GPT_ONLY_TEST_DESIGN_READY
source-lineage: thin-bt/dollworld master
source-head: cb4601ef7872bb3760614031117536df9d2cbc11
scope: PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2
date: 2026-10-02

## Material finding

The current repository cannot implement the previously proposed `PersonDetailPage` effect regression as an ordinary Vitest DOM mount without first changing test infrastructure.

Fresh source review:
- `vitest.config.ts` has no DOM environment declaration, so Vitest uses its normal Node environment.
- root `package.json` has no `jsdom`, `happy-dom`, React Testing Library, or equivalent DOM-mount dependency.
- `person-detail.test.tsx` uses `renderToStaticMarkup`; this does not execute `useEffect`.
- `PersonDetailPage.tsx` performs selected-detail and identity loading inside `useEffect`.

Therefore a new static-render or helper-only Vitest case cannot close A2's page-level request/navigation acceptance. Do not label such a test as page-level evidence.

## Canonical executable path

Use the existing Playwright browser lane for page-level deterministic regressions. This avoids introducing a new DOM-test dependency solely for this acceptance task.

For each case, intercept the existing Person Detail API routes and count requests by pathname before fulfilling/rejecting/delaying them. Open the real Person Detail route and assert the rendered terminal state.

### Exact deterministic cases

| id | setup | network control | required visible result | exact request gate |
|---|---|---|---|---|
| PD-PAGE-01 | R=0 | selected detail success, no related ids | selected detail success | selected=1, identity=0, related-full-detail=0 |
| PD-PAGE-02 | duplicate related id in master/disciple arrays | selected success; identity success | related display name renders | selected=1, identity=1 with deduped ids, related-full-detail=0 |
| PD-PAGE-03 | missing one identity row | identity returns only one of two requested ids | known name + missing id fallback | selected=1, identity=1, related-full-detail=0 |
| PD-PAGE-04 | identity transport failure | abort identity route | selected detail remains; personId fallback remains | selected=1, identity=1, no retry |
| PD-PAGE-05 | identity uiRevision mismatch | detail revision=7; identity revision=8 | returned names never commit; personId fallback remains | selected=1, identity=1 |
| PD-PAGE-06 | empty displayName | identity row displayName="" | empty name not committed; personId fallback remains | selected=1, identity=1 |
| PD-PAGE-07 | stale A->B | hold A identity; navigate to B; complete B; then release A | A names never appear in B; B remains authoritative | each open attributed separately; no related full-detail |
| PD-PAGE-08 | selected body read/network failure | abort selected route | Person Detail error state; no identity request | selected=1, identity=0 |

## Stale A->B ordering

The stale-navigation case must use this exact order:
1. open person A;
2. fulfill A selected detail with R>0;
3. observe A identity request and keep it pending;
4. navigate to person B;
5. fulfill B selected detail and B identity;
6. assert B terminal display;
7. only then fulfill A identity with a unique sentinel name;
8. assert the A sentinel never appears and B remains unchanged.

A test that resolves A before B navigation does not exercise cancellation.

## Measurement separation

PD-PAGE-01..08 are deterministic regression gates, not samples in the 80-success before/after performance population. Their mocked/aborted responses must never enter wall-time or byte percentiles.

The 80-sample harness may reuse the same request classifier, but it must run against the fixed production build/data rather than intercepted synthetic payloads.

## Infrastructure decision

Preferred for A2: Playwright route interception because Playwright is already canonical and exercises the real page effect.

Alternative only if a broader test-infrastructure change is independently approved: add a DOM-capable Vitest environment and a React mount library. Do not add those dependencies merely to satisfy this task when the existing browser lane can prove the contract.
