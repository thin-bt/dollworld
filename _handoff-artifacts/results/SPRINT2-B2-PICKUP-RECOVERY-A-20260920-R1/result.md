# SPRINT2-B2-PICKUP-RECOVERY-A-20260920-R1

state: READY
terminal: SPRINT2_B2_PICKUP_RECOVERY_READY
lane: A
updatedAt: 2026-09-20T06:00:00+09:00
control-authority: GitHub
canonical-repository: thin-bt/dollworld
canonical-branch: master
paired-b2-task: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4
pickup: REDISPATCH_SAME_TASK / SDK_EXECUTOR / CURSOR-START-001
production-change: NO
b2-github-publish-commit: 7992e83ebbca6479481a434cfd8dafe4823bfd4c

## Summary

B2 R4 stayed **PREPARED** on GitHub although local **`result.md`** was **READY** (12/12 Chrome evidence). Root cause: **`publishTerminalToGitHub`** required Active terminal metadata (`last-completed-task-key` + terminal class), but B2 Active was bare **IDLE** with no completed-key fields — publish returned **`NO_LOCAL_TERMINAL`**, so GitHub never received R4 `result.md` and the B2 executor looped **REDISPATCH → COOLDOWN → re-invoke** without consuming PREPARED.

Lane A repaired the control plane only (no product edits, no browser re-run):

1. **`result.md` terminal fallback** in `publish-terminal-github.mjs` when Active metadata is missing but `results/<task-key>/result.md` carries `state: READY|FIX_REQUIRED|…`.
2. **Orphan publish on poll** in `cursor-inbox-executor.mjs`: PREPARED + consumable local terminal `result.md` publishes to GitHub without another Agent invoke.
3. Regression tests **14/14 PASS** in `_handoff-artifacts/audit/cursor-inbox-executor`.

**Readback:** `origin/master` @ **`7992e83`** now has canonical B2 R4 **`result.md`** and **`CURSOR_B2_INBOX.md` → IDLE** (`last-consumed-task-key: SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4`, `last-terminal: READY / SPRINT2_WIREFRAME_BROWSER_ACCEPTANCE_B2_READY`). B2 pickup path is unblocked for future tasks; R4 terminal is consumable for Sprint2 formal close.

## Diagnosis evidence

| Signal | Observation |
|--------|-------------|
| GitHub B2 inbox (pre-repair) | **PREPARED** / R4 / recovery `ROLE1_R4_CANONICAL_RESULT_MISSING_0453_RETRIGGER` |
| GitHub B2 R4 `result.md` (pre-repair) | **missing** on `origin/master` |
| Local B2 R4 `result.md` | **READY** / 12/12 (audit logs under `audit/current/...R4/`) |
| `publishTerminalToGitHub` dry-run (pre-fix) | **`NO_LOCAL_TERMINAL`** |
| B2 executor heartbeat | **`NOOP_COOLDOWN`** after repeated R4 invokes |
| B2 Active (parsed fields only) | `state: IDLE`, no `last-completed-task-key` / terminal |

## Control-plane changes

| File | Change |
|------|--------|
| `audit/cursor-inbox-executor/lib/consume-inbox.mjs` | `resultFieldsHaveTerminal`, `readResultTerminalLabel` |
| `audit/cursor-inbox-executor/lib/publish-terminal-github.mjs` | Publish gate accepts terminal `result.md`; tracks `terminalSource` |
| `audit/cursor-inbox-executor/cursor-inbox-executor.mjs` | PREPARED orphan publish before Agent invoke |
| `audit/cursor-inbox-executor/tests/publish-terminal.test.mjs` | Result-md fallback test |

## Verification

```powershell
cd D:\xampp\htdocs\dollworld\_handoff-artifacts\audit\cursor-inbox-executor
npm test
```

Result: **14/14 PASS**.

```powershell
cd D:\xampp\htdocs\dollworld
git fetch origin master
git rev-parse origin/master
git show origin/master:_handoff-artifacts/control/CURSOR_B2_INBOX.md
git show origin/master:_handoff-artifacts/results/SPRINT2-WIREFRAME-BROWSER-ACCEPTANCE-B2-20260920-R4/result.md
```

| Check | Result |
|-------|--------|
| `origin/master` tip | **`7992e83`** (includes B2 consume commit) |
| B2 inbox on GitHub | **IDLE** / last-consumed R4 |
| B2 R4 result on GitHub | **READY** / 12/12 summary present |
| Product delta `92f2a09..origin/master` (`apps/`, `tests/`) | **empty** |
| Local product `apps/` / `tests/` vs HEAD | **clean** |

## Next executable action

- **PM / Role lanes:** Sprint2 formal close may proceed using GitHub-canonical B2 R4 **READY** @ binding product SHA **`92f2a09`**.
- **Executor daemon:** Next poll should **`NOOP_INBOX_IDLE`** on B2 (no PREPARED stall). Publish this A recovery **`result.md`** + executor fix commit via normal A terminal GitHub push (executor post-invoke).

## Non-goals honored

No Sprint3/4. No product file edits. No Chrome harness re-run from lane A. B2 control files were not manually edited by this A agent (orphan publish used existing local R4 `result.md` only).
