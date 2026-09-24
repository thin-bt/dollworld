# UI-BATTLE-SHARED-PRESENTATION-PUBLISH-RECOVERY-20260924-R2

status: READY
owner-role: Role2
sprint: cross-sprint UI
mode: IMPLEMENT_PUBLISH_BROWSER_COMPARE
createdAt: 2026-09-24
control-authority: GitHub master

## Finding

Fresh current-master code search does not contain `SharedBattleOutcomePresentation`. The previously reported shared-result presentation therefore must not be treated as published merely from local/WIP evidence.

## Intent

Finish the already-established 11/12 battle UI direction on current master without inventing new battle semantics. Mock battle and tournament battle must use one shared result presentation for the common outcome hierarchy while retaining their surface-specific controls/context.

## Required execution

1. Fresh-read the canonical 11/12 mock and current `MockBattleViewPanel` / tournament battle-log presentation before editing.
2. Recover a safe existing local implementation only if its lineage is demonstrably compatible with current master; otherwise implement from current master.
3. Commonize the shared outcome presentation used by both mock battle and tournament battle. At minimum preserve the established hierarchy: winner -> finish reason/judgement/range context -> final participant state -> turn timeline/log entry point. Do not fabricate fields unavailable from accepted contracts.
4. Do not fork separate visual implementations for mock and tournament outcomes. Surface-specific controls may remain outside the shared presentation.
5. Run focused tests for both consumers and the web production build.
6. Publish the implementation to canonical master. A local commit/WIP result is not terminal success.
7. On the published SHA, compare ordinary real browser output against the canonical 11/12 mock at desktop and narrow widths for both mock-battle and tournament-battle result paths. Fix material hierarchy, spacing, overflow, contradictory-state, or duplicated-presentation differences in the same task.
8. Publish a canonical terminal result with exact published SHA, test/build evidence, browser routes/widths, and any intentional mock deviations.

## PASS gate

PASS requires all of:
- the shared outcome presentation exists on canonical master;
- both mock and tournament battle consume the shared presentation rather than duplicate the common result hierarchy;
- focused tests pass;
- web production build passes;
- desktop+narrow ordinary-browser comparison is complete for both consumers;
- material differences are fixed or explicitly justified by canonical semantics.

Do not mark PASS for a local-only commit, documentation-only update, or mock-only change.
