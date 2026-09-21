# ROLE1-CONTROL-PROTOCOL-STATUS-DRIFT-AUDIT-20260922-R1

state: TERMINAL
result-class: CONTROL_PROTOCOL_DRIFT_CONFIRMED
role: Role1
sprint: Sprint3
control-authority: GitHub
repository: thin-bt/dollworld
branch: master

## Finding

Fresh canonical read found a control-plane contradiction: `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md` operational rule 7 still states Sprint2 is `REOPENED / FIX_REQUIRED` and Sprint3 formal close is blocked by Sprint2, while the binding status files now state Sprint2 `CLOSED` and Sprint3 `READY_FOR_FORMAL_CLOSE`.

Binding status files remain authoritative. This protocol sentence is stale descriptive text and must not be used to reopen Sprint2 or re-block Sprint3.

## Evidence

- `_handoff-artifacts/control/SPRINT2_STATUS.md`: `state: CLOSED`, previous state `REOPENED_FIX_REQUIRED`.
- `_handoff-artifacts/control/SPRINT3_STATUS.md`: `state: READY_FOR_FORMAL_CLOSE`, predecessor block explicitly lifted.
- `_handoff-artifacts/protocol/GITHUB_CONTROL_PLANE.md`: rule 7 retains the superseded reopen/block statement.
- A is already PREPARED on S03-051 and B2 is already PREPARED on S03-049; neither lane was overwritten.
- `_handoff-artifacts/` root contains canonical structure only (`README.md`, `audit/`, `control/`, `protocol/`, `results/`, `tasks/`); no root-level transient scratch defect was observed.

## Correction attempted

Role1 attempted an in-place protocol correction in this run so rule 7 would defer dynamically to the binding status files and record the current CLOSED / READY_FOR_FORMAL_CLOSE state. The GitHub write was blocked by the connector safety layer before repository mutation, so no protocol content was changed.

## Release interpretation

This drift is a control-document consistency defect, not product evidence against Sprint2 closure. Current Sprint3 formal-close eligibility remains governed by `SPRINT3_STATUS.md` plus the active current-master root-gate recovery (B2 S03-049). Do not assign Sprint3 `CLOSED` from this audit.
