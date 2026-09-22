# SPRINT2-REOPEN-RECOVERY-CANONICAL-PUBLISH-B2-20260922-R1

state: PREPARED
lane: B2
sprint: Sprint2
mode: canonical-publication+verification
priority: DEADLINE_CRITICAL
control-authority: GitHub
authority-ref: 0f266d679e264463ccf65c3ef49727d3ac94acc1

## Why this task exists

The terminal result for `SPRINT2-REOPEN-CURRENT-MASTER-WEB-BUILD-UI-RECOVERY-B2-20260922-R1` reports PASS at local/worktree head `628c2a3821cf2028b58578baadb0cac22abcaeed`, but that SHA is not resolvable in canonical GitHub and the result explicitly says the repaired product files and targeted E2E spec still require publication. Therefore the binding Sprint2/Sprint3 status cannot be closed from the terminal result alone.

## Required execution

1. Fresh-read protocol, Sprint2/Sprint3 status, prior recovery result, and current GitHub master.
2. Preserve all persistent operator/control tooling; obey workspace-preservation rules. Use `_handoff-artifacts/control-tmp/` only for transient scratch.
3. Recover the exact already-verified repair from the prior B2 worktree/local state. Publish to canonical `thin-bt/dollworld` `master` the five repaired product files named in the prior result plus `tests/e2e/s2-reopen-targeted-browser-reacceptance-b2.spec.ts` if it is the exact spec used for PASS. Do not invent/reconstruct different behavior if the verified bytes are unavailable; in that case publish a terminal BLOCKED result naming the missing bytes/source.
4. Ensure publication is based on fresh current master and does not overwrite A-owned S03-068 work. Rebase/reconcile if A publishes first.
5. After publication, verify the canonical GitHub commit/readback contains every intended file. Then run, on the published/current-master bytes, at minimum: `apps/web npm run build`, `apps/web npm run typecheck`, and the targeted Sprint2 browser reacceptance spec. If production bytes changed after the prior evidence, this fresh verification is mandatory.
6. Publish terminal result under `_handoff-artifacts/results/SPRINT2-REOPEN-RECOVERY-CANONICAL-PUBLISH-B2-20260922-R1/result.md` with exact canonical commit SHA(s), commands, pass/fail counts, and readback evidence.
7. Do NOT mark Sprint2 or Sprint3 CLOSED yourself. Control status transition is a separate Role/PM action after canonical publication + current-master evidence.

## Non-goals

- No timeout extension, assertion weakening, workload reduction, or unrelated feature work.
- Do not rerun the full root gate unless a newly observed failure makes it necessary.
- Do not consume or modify A's S03-068 task/inbox.
