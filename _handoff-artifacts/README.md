# dollworld GitHub Control Plane

status: ACTIVE
switched-at: 2026-09-17T15:00:00+09:00
repository: thin-bt/dollworld
default-branch: master

## Authority

From this migration forward, GitHub is the canonical control plane for dollworld operational communication between GPT/PM/Role/Cursor coordination artifacts.

Canonical paths:
- `_handoff-artifacts/protocol/`
- `_handoff-artifacts/control/`
- `_handoff-artifacts/tasks/`
- `_handoff-artifacts/results/`

Google Drive is no longer authoritative for new control-plane writes. It may be read during migration/recovery and may temporarily mirror compatibility data for the existing local Cursor executor until GitHub polling/materialization is completed.

## Non-stop rule

Missing local folders, missing local mirrors, Drive search misses, stale Drive paths, connector misses, or absent compatibility mirrors are never permission to stop, pause, disable, or end a dollworld loop.

If GitHub canonical state is readable, continue from GitHub. Only an explicit user PAUSE/STOP may disable loops.

## Progress invariant

While Sprint2 is unfinished, a free implementation lane must not remain idle when a unique executable non-conflicting task exists.

Every terminal result must be consumed into the next executable task or into formal Sprint completion.
