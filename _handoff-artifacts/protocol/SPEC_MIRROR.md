# Spec Mirror and Proposal Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-BLOCK-001, CORE-HISTORY-001
scope: spec authority / mirror semantics / proposal adoption / spec status

This file owns semantic authority and proposal/status meaning only. Mechanical mirror refresh/manifest rules belong to `SPEC_SYNC.md`.

## SPEC-AUTH-001 — authoritative spec vs Drive mirror
Git-managed specification/design/acceptance/task/schema/config files are authoritative where they define the project contract.
Drive `specs/current` is a read-only reflection of Git state for Drive consumers and never overrides Git. Editing `specs/current` does not itself change project authority.
When mirror and task evidence disagree, reconcile branch/HEAD/manifest and the actual authoritative files; old chat memory or archived evidence does not override current authority.
Human-readable specification/design/Wiki/acceptance meaning is normally authored or approved by ChatGPT/user authority; Cursor may mechanically apply approved text/patches when the current task authorizes it.

## SPEC-PROPOSAL-001 — proposal class / routing / adoption
Unadopted product/game/implementation-contract proposals belong under `specs/proposed/<scope-path>/...`.
Unadopted operational/audit/verification/control-plane proposals belong under `protocol/proposed/`.
Presence in either proposal location does not grant authority. Adoption requires an explicit decision and an update to the responsible Git-managed specification or active protocol owner; root changes only when routing itself changes.
Preserve useful scope/task hierarchy and separate author outputs where needed. Browser Claude-specific proposal write behavior follows `CLAUDE-OUTPUT-001`.
A proposal should identify enough target/problem/change/impact/check/version-or-decision information for the responsible authority to adopt or reject it without treating the proposal itself as current authority.

## SPEC-STATUS-001 — status / unresolved authority
Statuses such as `DRAFT`, `IN DESIGN`, `READY FOR IMPLEMENTATION`, `IMPLEMENTING`, `ACCEPTANCE REVIEW`, `ACCEPTED`, `SUPERSEDED`, and `DEPRECATED` describe actual project state; they are not changed merely for workflow convenience.
Ground status in authoritative files, backlog/roadmap, acceptance records, or explicit user decision. Presence in `specs/current` does not imply accepted/frozen/implementation-ready status.
For draft/design work, do not silently resolve user-choice alternatives and do not promote an unadopted proposal by inference.
If current authority or adoption status is materially ambiguous with multiple plausible outcomes, classify under `CORE-BLOCK-001`; uniquely determined stale mirror/status/reference drift follows bounded correction rather than speculative promotion.
