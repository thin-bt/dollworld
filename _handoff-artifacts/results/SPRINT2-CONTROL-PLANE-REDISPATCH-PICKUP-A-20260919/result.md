# SPRINT2-CONTROL-PLANE-REDISPATCH-PICKUP-A-20260919

state: READY
terminal: SPRINT2_CONTROL_PLANE_REDISPATCH_PICKUP_READY
test-result: 10/10 PASS

## Summary

PM redispatched same task-keys (A R13 / B2 R4) after local READY. Executor correctly reported NOOP_ALREADY_COMPLETE_SAME_TASK, which looked like "Cursor stopped" on GitHub PREPARED view. Cursor had already run; results were local-only and not consumed on GitHub.

## Fix

`isExplicitSameTaskRedispatch`: newer Inbox `recovery`/`REDISPATCH`/`FAILOVER` with updatedAt > Active completion allows same-key re-invoke (`REDISPATCH_SAME_TASK`). Plain same-key PREPARED without redispatch marker still blocked (no loop).

## Live

A/B2 evaluatePickup => invoke=true / REDISPATCH_SAME_TASK
