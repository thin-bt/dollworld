# Role2 evidence — 20260930

authority: GitHub thin-bt/dollworld/master
generation: 20260929-P0-01
assignment-id: 20260929-P0-01-R2
state: RUNNER_HANDOFF_READY
scope: CompetitionPage client and ordinary tournament browser
source-assignment: _handoff-artifacts/control/ROLE_ASSIGNMENTS.md
source-instruction: _handoff-artifacts/tasks/PERF-PERSON-TOURNAMENT-ORDINARY-UI-20260926-R1/instruction.md
reused-regression: 6933d9e9ce2acee82a3e136bba6f49777971b926

## Current execution boundary

This ChatGPT execution container has Node/npm but no dollworld checkout or browser runner. The canonical assignment explicitly requires an exact executable capable-lane handoff when the runner is absent. This file is that one-time handoff. Do not repeat it unless assignment generation or measurement contract changes.

## Exact capable-lane action

Run on a capable lane with Chrome installed and a clean checkout of current master. Do not edit Person Detail or tournament server/projection source.

1. Confirm:
   - `node >=24.18.0 <27`
   - `npm >=11.16.0 <12`
   - Chrome available to Playwright.
2. Install existing lockfile dependencies without modifying the lockfile:
   - `npm ci`
3. Build production workspaces:
   - `npm run build -w @shared-world/simulation-core`
   - `npm run build -w @shared-world/web`
4. Use fixed accepted dataset seed `42` / preset `sprint1-tiny-accepted`.
5. Extend only `tests/e2e/s2-ui009-round-robin-competition.spec.ts` (or add a Role2-owned tournament browser measurement spec) to capture real browser/network measurements from `/api/s1_5/competition`.

## Required measurement harness

For every matching competition GET, record:
- request URL and action label;
- response status;
- `(await response.body()).byteLength` as actual response body bytes;
- request start -> response finished wall time in milliseconds.

Collect these operation groups on the same seeded session:
- initial CompetitionPage cold load: cold >= 1;
- schedule-year navigation: warm >= 20;
- ranking-year navigation: warm >= 20;
- detail overview -> participants -> overview: warm >= 20 round trips and assert zero competition/session GETs for each local tab transition;
- loaded schedule selection/back-to-schedule: warm >= 20 and assert zero additional network where current behavior is local-state only.

For schedule-year and ranking-year warm transitions assert, per action:
- session GET delta = 0;
- competition GET delta = 1.

For each warm group compute sorted-sample p50 and p95 for browser action wall time and competition response bytes, and record total transferred competition bytes. Do not substitute Content-Length for decoded body bytes.

## Ordinary-flow value correctness

Reuse the existing real-browser path in `tests/e2e/s2-full-product-browser-closure.spec.ts` rather than reimplementing it. On latest lineage verify:
- weekly progression reaches a due tournament;
- tournament step produces visible round-robin matrix/history/match result;
- persisted match link opens a match page with matchId;
- returning restores tournament history;
- Ranking page renders successfully;
- returning to tournament preserves the persisted history;
- participant navigation and subsequent weekly progression remain successful.

No PASS from request-count-only evidence.

## Commands

Targeted Role2 measurement:
`npx playwright test tests/e2e/s2-ui009-round-robin-competition.spec.ts --project=chrome --workers=1`

Ordinary-flow acceptance:
`npx playwright test tests/e2e/s2-full-product-browser-closure.spec.ts --project=chrome --workers=1`

Production build/type gate:
`npm run typecheck && npm run build -w @shared-world/simulation-core && npm run build -w @shared-world/web`

## Evidence to append here after capable-lane execution

Record:
- exact product/test commit SHA;
- exact tested master/base SHA;
- Chrome/Playwright versions;
- fixed seed/preset;
- per operation request count;
- per-response and total competition bytes;
- cold sample(s);
- warm n (must be >=20), p50, p95;
- ordinary-flow regression result;
- trace/report paths;
- any measured dominant remaining client cost.

Only if a client-side cost is measured as dominant may Role2 repair it. Re-run the identical dataset and append before/after evidence. Otherwise leave product source unchanged and report the measured result.

Full P0 PASS remains forbidden until the parent acceptance is proven.


## Lane route check — 2026-09-30 17:51 JST

- Cursor A: not available for Role2. A Inbox is PREPARED for `PERF-PERSON-DETAIL-BROWSER-MEASURE-20260930-A2`; executor heartbeat is INVOKING that task.
- Cursor B2: not available for Role2. Active task is `SPRINT3-S03-010-LONG-RUN-OTL-BROWSER-ACCEPTANCE-20260924-R1`.
- Result: no free browser-capable lane this run. Preserve the executable CompetitionPage measurement handoff above and retry dispatch only after a lane becomes free.
- No shared result or out-of-boundary product source changed.
