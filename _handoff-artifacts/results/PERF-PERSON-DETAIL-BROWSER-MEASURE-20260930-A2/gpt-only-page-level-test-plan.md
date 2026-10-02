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

## Loader boundary prerequisite discovered by fresh source review

The page-level matrix above assumes malformed selected-detail payloads are rejected by `loadPersonDetail`. Current master does not yet guarantee that: `isPersonDetailView` in `fetch-ui005.ts` checks only the exact 27 top-level keys and does not validate their runtime value types. `PersonDetailPage` immediately spreads `formalMasterPersonIds` and `formalDisciplePersonIds`, so an exact-key payload with either field non-array can escape the loader and throw inside the async effect.

Before treating PD-PAGE-01..08 as sufficient page-level acceptance, add this deterministic loader gate (not part of the 80-sample performance population):

| id | mutated selected-detail field | required loader result | forbidden downstream behavior |
|---|---|---|---|
| PD-LOAD-01 | `formalMasterPersonIds: null` | `failure/data_shape` | identity request; async-effect exception |
| PD-LOAD-02 | `formalDisciplePersonIds: {}` | `failure/data_shape` | identity request; async-effect exception |
| PD-LOAD-03 | `formalMasterPersonIds: [123]` | `failure/data_shape` | malformed identity query |
| PD-LOAD-04 | `displayName: 42` | `failure/data_shape` | malformed value rendered as success |

Repair boundary: strengthen `isPersonDetailView` (or a dedicated decoder it calls) so the runtime checks match the declared `PersonDetailView` contract. Do not paper over malformed success data in `PersonDetailPage` with `?? []` or casts. The array fields must be arrays of strings; scalar/null fields must match their declared primitive/nullability; numeric maps must be records whose values are numbers; array/object container fields must at minimum enforce their declared container shape. This is a deterministic correctness gate, not a percentile sample.


## Playwright invocation and server-lifecycle guard

Fresh review of the canonical root `playwright.config.ts` exposes two execution hazards that must be controlled explicitly for A2.

1. The root config defines both `chrome` and `edge` projects. Running the A2 spec without a project selector executes every case twice and can accidentally turn a 20-sample population into 40 observations or mix browser engines in one percentile.
2. The root config sets `webServer.reuseExistingServer: !process.env.CI`. A normal local invocation may therefore attach to an already-running port 8787 process instead of creating the clean side-level production-server instance required by the measurement contract.

### Required invocation contract

For deterministic `PD-PAGE-*` regression, use exactly one named browser project per evidence run. Chrome is the canonical A2 browser unless a separate cross-browser check is explicitly requested:

```text
npx playwright test <A2-spec-path> --project=chrome
```

Do not aggregate Chrome and Edge observations into one result.

For the 80-sample performance measurement, do **not** rely on the root config's default local `reuseExistingServer` behavior. The harness must own the production-server lifecycle for each before/after side, or use a dedicated A2 Playwright config whose webServer policy guarantees the same lifecycle. Before accepting sample 1, record the side's `serverInstanceId`; all 20 accepted samples in that side must retain that value.

### Exact harness preflight gates

| id | check | required result |
|---|---|---|
| PD-HARNESS-01 | selected Playwright projects | exactly one: `chrome` |
| PD-HARNESS-02 | browser engine in all accepted samples | Chromium/Chrome only; no Edge sample mixed |
| PD-HARNESS-03 | server at side start | harness-created clean production instance, not an inherited port-8787 process |
| PD-HARNESS-04 | server identity during one side | exactly one `serverInstanceId` across all 20 accepted samples |
| PD-HARNESS-05 | before/after symmetry | same project, viewport, production start command, seed/week/person fixture, classifier version, and lifecycle version |
| PD-HARNESS-06 | observed sample count | 20 accepted observations per declared side/population; project fan-out must not multiply it |

If PD-HARNESS-01..06 fails, discard that side population rather than filtering the unexpected observations after percentile calculation.

This is a harness/test-design correction only. It does not require changing the shared root Playwright configuration and must not alter unrelated Sprint3 browser acceptance.


## Browser binary/version symmetry guard

Fresh review of `playwright.config.ts` and root `package.json` shows that A2's canonical `chrome` project uses `channel: "chrome"` while `@playwright/test` is pinned to `1.55.0`. The Playwright package version therefore does **not** pin the branded Chrome binary used by the measurement. A host Chrome update between the before and after side can create a browser-version confound even when `--project=chrome` is identical.

Do not replace the accepted `chrome` project with bundled Chromium solely for A2. Instead, make browser identity part of the measurement preflight/evidence and reject asymmetric sides.

### Additional exact preflight gates

| id | check | required result |
|---|---|---|
| PD-HARNESS-07 | Playwright package identity | both sides report `@playwright/test=1.55.0` from the checked-out lock/package state |
| PD-HARNESS-08 | browser identity | record `browser.browserType().name()`, `browser.version()`, and the selected project name before sample 1 |
| PD-HARNESS-09 | before/after browser symmetry | project name, browser type, and full `browser.version()` string are byte-for-byte equal |
| PD-HARNESS-10 | browser drift during a side | the browser version recorded for accepted sample 1 and accepted sample 20 is identical |

If PD-HARNESS-09 or PD-HARNESS-10 fails, discard the affected before/after comparison. Do not normalize, statistically adjust, or merge observations across browser versions.

Evidence header for each side must therefore include at minimum: `projectName`, `browserType`, `browserVersion`, `playwrightVersion`, and the already-required `serverInstanceId`. These are environment provenance fields, not performance metrics.

This closes a reproducibility gap without changing the shared Playwright config or overlapping Role3 cross-browser acceptance.


## Measurement clock and terminal-state contract

Fresh reconciliation of the A2 plan found one remaining reproducibility gap: the document fixes request classification, browser/server provenance, and accepted-sample counts, but does not yet define the wall-time clock boundary precisely enough for two independent harness implementations to produce comparable latency samples. A Playwright `page.goto()` duration, a `load` event duration, and the time until related identities are committed are not equivalent for Person Detail because identity loading is an asynchronous page effect.

Use one monotonic browser-side clock contract for every before/after latency observation. Do not substitute navigation timing or server request duration.

### Exact clock gates

| id | check | required result |
|---|---|---|
| PD-CLOCK-01 | clock source | `performance.now()` in the page's browser context; never `Date.now()` or host wall clock |
| PD-CLOCK-02 | t0 | immediately before the harness initiates the Person Detail navigation/open action for that `openId` |
| PD-CLOCK-03 | R=0 terminal t1 | first observation after selected-detail success has committed the required Person Detail terminal UI |
| PD-CLOCK-04 | R>0 terminal t1 | first observation after selected-detail success **and** the matching-revision identity outcome has committed names/fallbacks for that open; merely receiving the identity HTTP response is insufficient |
| PD-CLOCK-05 | sample latency | `t1 - t0`; record raw milliseconds without rounding before percentile calculation |
| PD-CLOCK-06 | navigation event isolation | `domcontentloaded`, `load`, network-idle, and individual API response durations may be retained as diagnostics but must not replace t1 |
| PD-CLOCK-07 | failure/timeout | no t1 means no accepted latency sample; preserve the attempt with `acceptedSampleIndex=null` and explicit `failurePhase` |
| PD-CLOCK-08 | stale A->B | A and B have independent t0/t1 keyed by `openId`; an A completion observed after B starts can never close B's clock |

For R>0, the terminal assertion must be derived from the same fixture used to calculate R, so the harness knows the expected final related-name/fallback state before opening the page. A generic selector such as “Person Detail container visible” is not a terminal condition.

### Percentile reproducibility

After exactly 20 accepted raw latencies exist for a declared population, sort ascending and use nearest-rank indexing: `rank = ceil(p * N)` with 1-based rank. Therefore for N=20, p50 is sorted item 10 and p95 is sorted item 19. Do not interpolate. Persist all 20 raw values alongside the reported p50/p95 so the aggregate is independently recomputable.

These clock gates apply symmetrically to before and after. They do not alter PD-PAGE deterministic interception cases and do not overlap Role2 UI/mock or Role3 Sprint3 acceptance.
