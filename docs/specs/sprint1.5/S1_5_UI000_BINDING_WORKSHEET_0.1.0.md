# Sprint 1.5 UI-000 Binding Worksheet

- Version: `0.1.0`
- Target DB registry: `DB-001～022`
- Fill only against final accepted Sprint 1 / CAL-JAN-SYNC code.

## Rules

- `matched` requires final symbol/module/type/test/commit evidence.
- pre-completion evidence is not a match.
- semantic difference is never `binding_update`.
- all `dependency_blocker | environment_blocker | code_fix_required | spec_fix_required` are STOP.

## Worksheet

| DB | Final symbol/export | Module | Exact type/schema | Production test | Accepted commit | Class/status | Notes |
|---|---|---|---|---|---|---|---|
| DB-001 |  |  |  |  |  |  | final S01-007 accepted commit + package root exports + execution-abort tests |
| DB-002 |  |  |  |  |  |  | final S01-008 runtime type/API/export + clone/validation tests |
| DB-003 |  |  |  |  |  |  | CAL-JAN-SYNC accepted files/tests + runtime WorldDate shape |
| DB-004 |  |  |  |  |  |  | final WorldEngine state/read API + Person collection validator |
| DB-005 |  |  |  |  |  |  | final operation receipt/result types and WorldEngine integration tests |
| DB-006 |  |  |  |  |  |  | final runtime Person temporary condition storage/read path |
| DB-007 |  |  |  |  |  |  | final runtime Person type + validator + age consistency test |
| DB-008 |  |  |  |  |  |  | final public eligibility/participant validation export and tests |
| DB-009 |  |  |  |  |  |  | final package-root export + schemaVersion + 31-key registry unchanged |
| DB-010 |  |  |  |  |  |  | final TechniqueDefinition nested types/validators for rangeShiftAfterUse etc. |
| DB-011 |  |  |  |  |  |  | final weekly processor registration + EventEnvelope sourceProcessor test |
| DB-012 |  |  |  |  |  |  | S01-008 Event Stream state/query/export + ordering tests |
| DB-013 |  |  |  |  |  |  | S01-008 operation validation receipts/result union + tests |
| DB-014 |  |  |  |  |  |  | final S01-006/S01-007 package-root type exports and validators; do not invent enum |
| DB-015 |  |  |  |  |  |  | final BattleResult/summary validator/type/tests |
| DB-016 |  |  |  |  |  |  | final checkpoint/export/rebuild public API + hash/cross-bind tests |
| DB-017 |  |  |  |  |  |  | final candidate types/validators + commit plan event ordering |
| DB-018 |  |  |  |  |  |  | S01-008/009 deterministic snapshot exporter + verify:sprint0 normalizer registry |
| DB-019 |  |  |  |  |  |  | accepted CAL-JAN-SYNC boundary tests |
| DB-020 |  |  |  |  |  |  | final runtime snapshot fields + RunRuleSnapshot/SimulationIdentity package exports |
| DB-021 |  |  |  |  |  |  | final public payload validator/type + sourceProcessor integration |
| DB-022 |  |  |  |  |  |  | final WorldEngine relationship collection/read API + existing counterpart fields/validator cross-check |

## Completion

```text
row count = 22
matched = 22
binding_update pending recheck = 0
dependency_blocker = 0
environment_blocker = 0
code_fix_required = 0
spec_fix_required = 0
unresolved = 0
```
