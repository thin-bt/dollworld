# CLAUDE-INBOX-001-LOCAL-REVIEW-PACKAGE-20260922-R1

state: PREPARED
priority: IMMEDIATE
purpose: materialize local-only evidence for independent Claude review
destination: _handoff-artifacts/review-input/CLAUDE-INBOX-001/

## Required output

Without modifying product/spec content, publish review-only evidence containing:

1. exact `git status --short` for the current dollworld working tree;
2. exact changed-file list under `docs/specs/`;
3. a complete diff bundle for all changed `docs/specs/` files, preserving old/new text and file paths;
4. explicit count of changed `docs/specs/` files;
5. identify the previous committed/base version used for each diff;
6. extract the old and new text corresponding to §§33-35, or explicitly state how those sections map after file restructuring;
7. snapshot/index of current local `apps/web/**`, and identify any local files differing from `origin/master`;
8. copy any local-only Sprint2/Sprint3 completion-evidence files relevant to the audit.

## Safety constraints

- Do not edit `docs/specs/`.
- Do not normalize/reformat files while packaging.
- Do not run stash/apply/pop/drop or broad clean operations.
- Do not commit product changes.
- Review package may be committed only as evidence under `_handoff-artifacts/review-input/CLAUDE-INBOX-001/`.
- Record exact HEAD and origin/master SHAs.

## Terminal requirement

Publish a package index in:
`_handoff-artifacts/review-input/CLAUDE-INBOX-001/LOCAL_PACKAGE_INDEX.md`

It must enumerate every captured artifact and exact SHA/base used.
