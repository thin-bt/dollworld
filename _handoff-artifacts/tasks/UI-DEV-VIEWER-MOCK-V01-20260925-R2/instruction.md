# UI-DEV-VIEWER-MOCK-V01-20260925-R2

status: READY
owner: Role2
scope: 15 Dev Viewer implementation
authority: GitHub thin-bt/dollworld master

## Visual blueprint

Use the canonical mock exactly at:
- `_handoff-artifacts/mocks/15_dev_viewer_mock_v01.html`
- required blob SHA: `4c097e4aef04427537475e09d4b617c15c1f98c4`

This supersedes any prior Dev Viewer handoff or local copy bound to blob `1ab1337b...`.

## Implementation contract

Implement the Dev Viewer against current master contracts, using the mock as layout/visual blueprint without inventing product semantics.

- Preserve existing simulation mutation behavior and session/request semantics.
- People must retain the current contract-backed name filter, career/state filter, sort, paging, and page-size choices 5/10/25.
- Mock Battle Candidates may present only contract-backed `personId`, `displayName`, `age`, and `careerStatus`.
- Do not add `Primary discipline` or any discipline field that is not in the current candidate DTO.
- Do not add a standalone candidate Refresh action. Candidate refresh follows the real existing viewer/session lifecycle.
- Loading, empty, API-error, and session-error states must remain explicit and truthful.
- Request/session/raw transport diagnostics are secondary disclosure only and must not replace ordinary viewer content.
- Keep UI-005/UI-006 or other unsupported semantics inspection-only; do not create new API fields, mutations, or product behavior to make the mock look populated.

## Responsive/layout requirements

Match the canonical mock's hierarchy and density on desktop and narrow widths. Improve only obvious implementation defects that do not change product meaning. Do not fork a second Dev Viewer presentation when existing shared primitives can be reused.

## Completion gate

PASS requires all of:
1. implementation is on current master-compatible source and identifies the blueprint blob above;
2. focused Dev Viewer tests pass;
3. production web build passes;
4. app starts;
5. real browser comparison is performed against the canonical mock at desktop and narrow widths;
6. People filtering/sort/paging/page-size interactions are exercised in-browser;
7. simulation mutation refresh behavior is exercised in-browser;
8. candidate rendering is verified to use only current DTO fields;
9. material browser/mock differences are fixed or recorded as FIX_REQUIRED with exact evidence;
10. result is published canonically under `_handoff-artifacts/results/UI-DEV-VIEWER-MOCK-V01-20260925-R2/result.md`.

Do not claim completion from static inspection, mock publication, or tests alone.
