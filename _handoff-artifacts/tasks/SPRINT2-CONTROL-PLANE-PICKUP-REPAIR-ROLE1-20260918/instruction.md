# SPRINT2-CONTROL-PLANE-PICKUP-REPAIR-ROLE1-20260918

state: PREPARED
sprint: Sprint2
owner: Role1
priority: CRITICAL
control-authority: GitHub
createdAt: 2026-09-18T16:02:24+09:00

## Confirmed repository defect
Fresh PM source evidence confirms two control-plane defects in `_handoff-artifacts/audit/cursor-inbox-executor/cursor-inbox-executor.mjs`:

1. `pollLane()` fetches the GitHub canonical inbox only when the local inbox is NOT PREPARED and has no task-key. A stale local PREPARED therefore shadows a newer GitHub-canonical PREPARED indefinitely.
2. After resolving `instruction-path`, pickup still requires a pre-existing local instruction file and falls back to old local/Drive mirror recovery. GitHub-canonical task instructions are not materialized/read as the primary source.

This is now the highest-priority Sprint2 blocker. Do not retrigger R numbers as a substitute.

## Required repair
1. In `pollLane()`, attempt GitHub canonical inbox read first on every reachable poll. When valid remote control fields exist, use them as authoritative regardless of stale local PREPARED/task-key. Fall back to local only when GitHub fetch is unavailable/invalid.
2. For a GitHub-canonical `instruction-path`, fetch the instruction from GitHub first. Materialize it to a safe executor-local path or otherwise pass an executable local copy to Cursor Agent without requiring Drive/local prepopulation. Preserve offline local compatibility fallback only when GitHub is unavailable.
3. Add regression coverage proving:
   - stale local PREPARED/task A + newer GitHub PREPARED/task B => task B is selected;
   - local instruction missing + GitHub instruction present => pickup proceeds, not INSTRUCTION_MISSING;
   - GitHub unavailable => existing local fallback remains usable.
4. Run targeted executor tests plus existing control-plane migration verification.
5. After repair, verify at least one current canonical lane can progress PREPARED -> invoke/ACTIVE using the repaired path, or publish the exact external runtime blocker if Cursor API/runtime itself prevents invocation.
6. Publish terminal result at `_handoff-artifacts/results/SPRINT2-CONTROL-PLANE-PICKUP-REPAIR-ROLE1-20260918/result.md` with changed files, tests, pass/fail counts, commit/head evidence and observed pickup transition.
7. If repair exposes a separate executable blocker, DIRECT-DISPATCH the next non-conflicting repair instead of leaving it for PM narration.

No Sprint3/4 work. Do not modify A/B2 product implementation surfaces.