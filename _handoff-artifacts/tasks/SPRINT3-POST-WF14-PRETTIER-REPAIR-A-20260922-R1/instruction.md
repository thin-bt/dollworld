# SPRINT3-POST-WF14-PRETTIER-REPAIR-A-20260922-R1

state: PREPARED
lane: A
sprint: Sprint3
mode: PRODUCT_GAP_CLOSURE
priority: DEADLINE_CRITICAL
authority-ref: thin-bt/dollworld master
control-authority: GitHub

## Trigger

Fresh canonical B2 root-gate result `SPRINT3-POST-WF14-CURRENT-MASTER-ROOT-GATE-B2-20260922-R1` bound WF-14 product SHA `134d27ef5da53f73aea91fde57ddc7411cde35c0` and failed at `format:check` only, naming `apps/web/src/server/ui009/map-competition-view.ts`. The result classifies this as a PRODUCT_GAP and prescribes Prettier-only repair before a separate fresh root gate.

## Required implementation

1. Fresh-read protocol, this instruction, B2 failure result, current master, and target source before edits.
2. Claim A ACTIVE using canonical lane protocol.
3. Make the minimum formatting-only change required for `apps/web/src/server/ui009/map-competition-view.ts` to satisfy repository Prettier/format rules. Do not alter behavior, types, UI semantics, tournament logic, or unrelated files.
4. Verify the target diff is formatting-only. Run the narrow formatter/check needed to prove the file is clean; if feasible run `npm run format:check`. Do not consume the separate post-repair root-gate phase by repeatedly rerunning a failing full root gate.
5. Publish the product repair to canonical `master`; local-only commit is not terminal evidence.
6. Publish a terminal result under `_handoff-artifacts/results/SPRINT3-POST-WF14-PRETTIER-REPAIR-A-20260922-R1/result.md` binding exact product SHA and verification evidence, then return A to IDLE.
7. Read back canonical master source/result after publication.

## Acceptance

- target file passes repository formatting check;
- diff is formatting-only and behavior-preserving;
- product commit is present on GitHub canonical master;
- terminal result binds exact published SHA and readback evidence;
- no Sprint2/Sprint3 CLOSED assignment from this task alone;
- a fresh post-repair current-master root gate remains required after this product delta.
