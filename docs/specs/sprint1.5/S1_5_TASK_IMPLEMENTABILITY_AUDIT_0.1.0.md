# Sprint 1.5 Task Implementability Audit

- Document ID: `S1.5-TASK-IMPLEMENTABILITY-AUDIT`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Scope: UI-001～UI-010をimmediate predecessorだけで単独実装・受入可能か逆監査

## 1. Verdict

| Task | Verdict | Runtime gate still required | Main dependency closure |
|---|---|---|---|
| UI-001 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | numbered ownership 0をtask acceptance cardで明示 |
| UI-002 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | cursor codecはunit-onlyでfuture endpoint不要 |
| UI-003 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | later-owner mutation contractをconsumerEvidence化 |
| UI-004 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | DB-008 candidate helperでmock execution不要 |
| UI-005 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | DB-012 internal Event Stream read、API-009不要 |
| UI-006 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | isolatedRunnerDecisionをUI-000で事前確定 |
| UI-007 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | UI-006 latestを消費、Event/Validation不要 |
| UI-008 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | 既存list/log evidenceをaggregate可能 |
| UI-009 | READY_AFTER_PREDECESSOR_GATE | UI-000 actual DB/public binding | 全production API accepted後test-only |
| UI-010 | READY_AFTER_PREDECESSOR_GATE | UI-009 accepted + E2E environment | production fix禁止、environment blocker分離 |

`READY_AFTER_PREDECESSOR_GATE`は「Sprint 1完成コードを見なくても今決められるtask構造に未解決依存がない」という意味。UI-000 actual bindingやpredecessor acceptanceを省略できる意味ではない。

## 2. Findings fixed in this audit

- UI-000 Runbookの重複`## 15`/章順崩れを修正対象化。
- STOPをspec/codeだけでなくdependency/environmentへ分離。
- UI-005 historyがfuture API-009へ依存しないようDB-012 internal committed Event Stream readを明示。
- UI-006 `IsolatedMockBattleRunner`要否をUI-006実装時判断からUI-000事前決定へ移動。
- cross-cutting later-owner contractを前段APIが必要とする場合のconsumerEvidence対象をtask別に具体化。
- UI-001 numbered ownership 0件でも受入可能なtask acceptance cardを専用instructionへ固定。
- UI-010のbrowser/runtime不足をspec/code不具合へ誤分類しない。

## 3. Task-by-task dependency proof

### UI-001

- Predecessor: `UI-000 accepted + post-UI-000 freeze/hash一致 + exact frozen bytes package-only/repo-bound re-audit PASS`
- Owned APIs: none
- Final evidence-owned numbered contracts: 0
- Acceptance evidence rows: 0
- Critical DB bindings: none
- Scope: React/Vite/Fastify scaffold、same-origin proxy、Host/Origin primitive、common transport/envelope/client primitive、static shell。live session/domain APIなし。
- Forbidden forward work: session store、sessionId/CSRF生成、simulation-core adapter、API-001～015 handler、domain page。
- Required cross-cutting consumer evidence:
  - ACC-051 Host/Origin primitive部分をsupporting evidenceとして残す（owner UI-002、implemented化しない）
- Release-preflight note: common task template §2のfreeze record/hash一致確認をUI-001ではpost-UI-000 release gateとして必ず満たす。
- Independent acceptance tests available with predecessor only:
  - workspace/build/lint
  - Fastify loopback boot/Host-Origin primitive unit
  - React shell render/build
  - client transport/envelope primitive unit
  - no domain route snapshot
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-002

- Predecessor: `UI-001 accepted`
- Owned APIs: `API-001`, `API-002`
- Final evidence-owned numbered contracts: 25
- Acceptance evidence rows: 12
- Critical DB bindings: `DB-002`
- Scope: API-001/002、session cookie/CSRF、process keys、UiSession/UiReadSnapshot、journal/updateControl/uiRevision、common adapter/cursor codec、presets。
- Forbidden forward work: API-003以降、world mutation、People/Mock/Event feature route、IsolatedMockBattleRunner。
- Required cross-cutting consumer evidence:
  - TX-078/BRIDGE-107のAPI-001/002 GET failure=none branchをconsumerEvidence化
  - BRIDGE-115のsession/common envelopeに関係するbranchだけconsumerEvidence化
- Independent acceptance tests available with predecessor only:
  - session create/reuse/CSPRNG collision
  - CSRF/Origin/Host/no-store
  - journal/updateControl/uiRevision unit
  - cursor HMAC/schema unit（future endpoint不要）
  - API-001/002 integration
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-003

- Predecessor: `UI-002 accepted`
- Owned APIs: `API-003`, `API-004`, `API-005`, `API-006`
- Final evidence-owned numbered contracts: 60
- Acceptance evidence rows: 15
- Critical DB bindings: `DB-002`, `DB-003`, `DB-005`, `DB-013`, `DB-020`
- Scope: API-003～006、start/step/reset/simulation、WorldSummary、week commit、ValidationStore integration。
- Forbidden forward work: People/PersonDetail/Mock/Event/Validation route。
- Required cross-cutting consumer evidence:
  - TX-070/072/073/077/078/085/086のstart/step/reset/API-006 branch
  - BRIDGE-099/101/102/106/107/114/115の同branch
  - ACC-149/151/152/156のmutation branch
- Independent acceptance tests available with predecessor only:
  - start empty/ready
  - 1/4/48/multi-week step
  - reset exact snapshot semantics
  - none/partial/complete step failure
  - WorldSummary/ValidationStore
  - updating GET/read snapshot
  - request replay
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-004

- Predecessor: `UI-003 accepted`
- Owned APIs: `API-007`, `API-011`
- Final evidence-owned numbered contracts: 10
- Acceptance evidence rows: 1
- Critical DB bindings: `DB-002`, `DB-004`, `DB-008`
- Scope: API-007/011、People list、Mock candidates、People/Candidate paging/query/cursor branches。
- Forbidden forward work: PersonDetail、new mock/replay/latest、battle execution、Event/Validation route。
- Required cross-cutting consumer evidence:
  - PAGE-007/008/009のPeople/Candidate branch
  - TX-041/043/055/058/078のPeople/Candidate branch
  - BRIDGE-067/107のPeople/Candidate GET branch
- Independent acceptance tests available with predecessor only:
  - People filtering/sort/paging
  - candidate exact predicate/corruption distinction
  - cursor stale/default query branches
  - no mock execution assertion
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-005

- Predecessor: `UI-004 accepted`
- Owned APIs: `API-008`
- Final evidence-owned numbered contracts: 60
- Acceptance evidence rows: 24
- Critical DB bindings: `DB-004`, `DB-006`, `DB-007`, `DB-009`, `DB-010`, `DB-011`, `DB-012`, `DB-021`, `DB-022`
- Scope: API-008 PersonDetail、stats/aptitudes/techniques/statHistory/trainingHistory。DB-012 internal Event Stream read可、Events route実装禁止。
- Forbidden forward work: API-009 Event route、mock execution、battle log route。
- Required cross-cutting consumer evidence:
  - TX-078/BRIDGE-107のPersonDetail GET branch
  - DB-012 Event Stream sourceを内部readするがAPI-009 routeは作らない
- Independent acceptance tests available with predecessor only:
  - Person exact DTOs
  - TechniqueDefinition/TechniqueView
  - statHistory 48-week chain
  - trainingHistory aggregation/sourceProcessor
  - relationships/age/temp condition
  - DB-012 direct source without Event API route
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-006

- Predecessor: `UI-005 accepted`
- Owned APIs: `API-012`, `API-013`, `API-014`
- Final evidence-owned numbered contracts: 93
- Acceptance evidence rows: 24
- Critical DB bindings: `DB-001`, `DB-008`, `DB-015`, `DB-016`, `DB-017`
- Scope: API-012～014、new mock/replay/latest、world isolation、UI-000決定済みならIsolatedMockBattleRunner facade。
- Forbidden forward work: API-015 battle log route、API-009/010 Event/Validation route。
- Required cross-cutting consumer evidence:
  - UI-003 consumerEvidenceを再検証しmutation common contractのmock branchを追加
  - BRIDGE-114/TX-085 atomic responseのmock/replay branch
  - BRIDGE-115/TX-086 isUpdating mock/replay branch
- Independent acceptance tests available with predecessor only:
  - new mock/replay/latest
  - A/B order
  - world/RNG/MatchId unchanged
  - checkpoint exact replay
  - execution abort/fallback/serializer
  - candidate -> POST pre-start revalidation
  - isolatedRunnerDecision assertion
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-007

- Predecessor: `UI-006 accepted`
- Owned APIs: `API-015`
- Final evidence-owned numbered contracts: 21
- Acceptance evidence rows: 6
- Critical DB bindings: `DB-014`
- Scope: API-015 battle log paging/presentation。UI-006 latest/detailedLogをread-only消費。
- Forbidden forward work: API-009/010 Event/Validation route、new production mock semantics。
- Required cross-cutting consumer evidence:
  - PAGE-007/008/009のBattleLog branch
  - TX-041/043/055/058/078のBattleLog branch
  - BRIDGE-067/107のBattleLog GET branch
- Independent acceptance tests available with predecessor only:
  - actionLogs-only source
  - BattleLog exact40
  - wrapper exact4 resultUiRevision
  - sourceIndex cursor
  - step-retained latest old cursor stale
  - large log paging
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-008

- Predecessor: `UI-007 accepted`
- Owned APIs: `API-009`, `API-010`
- Final evidence-owned numbered contracts: 69
- Acceptance evidence rows: 11
- Critical DB bindings: `DB-012`, `DB-013`
- Scope: API-009/010 Events/Validation、common GET/paging/cursor matrixの最終集約。
- Forbidden forward work: determinism専用production bypass、new endpoint/schema。
- Required cross-cutting consumer evidence:
  - People/Candidate/BattleLogの既存consumerEvidenceを含めcommon GET/paging/cursor matrixをaggregate
- Independent acceptance tests available with predecessor only:
  - EventEnvelope exact11
  - personId/eventGroup filter
  - Validation exact mapping
  - common totalCount/nextCursor/query/dataIdentity matrix
  - reset/ready-start old cursor behavior
  - GET error precedence
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-009

- Predecessor: `UI-008 accepted`
- Owned APIs: none
- Final evidence-owned numbered contracts: 14
- Acceptance evidence rows: 8
- Critical DB bindings: `DB-018`, `DB-019`
- Scope: DET-001～007 test harness、CLI/UI determinism。production endpoint/schema変更なし。
- Forbidden forward work: production endpoint/schema/normalization exception。
- Required cross-cutting consumer evidence:
  - なし。production behaviorを変更せずDET evidenceだけ追加
- Independent acceptance tests available with predecessor only:
  - DET-001～007
  - CLI/UI normalized canonical comparison
  - boundary seed
  - year boundary
  - same-source mock replay/new mock determinism
  - no production diff
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

### UI-010

- Predecessor: `UI-009 accepted`
- Owned APIs: none
- Final evidence-owned numbered contracts: 8
- Acceptance evidence rows: 63
- Critical DB bindings: `DB-001`, `DB-002`, `DB-003`, `DB-004`, `DB-005`, `DB-006`, `DB-007`, `DB-008`, `DB-009`, `DB-010`, `DB-011`, `DB-012`, `DB-013`, `DB-014`, `DB-015`, `DB-016`, `DB-017`, `DB-018`, `DB-019`, `DB-020`, `DB-021`, `DB-022`
- Scope: final acceptance/traceability/full quality/E2E/artifact auditのみ。production feature変更なし。
- Forbidden forward work: production feature/fix。問題は元ownerへ戻す。
- Required cross-cutting consumer evidence:
  - 全consumerEvidence/owner evidenceをaggregate。missing evidenceをUI-010内でproduction fixしない
- Independent acceptance tests available with predecessor only:
  - full npm check/wiki/static audit
  - Chrome/Edge E2E
  - 544 ownership/evidence coverage
  - MIG/FIX/TX/PAGE/DET complete
  - artifact/SHA/staged diff audit
  - no production feature diff
- Verdict: `READY_AFTER_PREDECESSOR_GATE`

## 4. No dependency inversion conclusion

UI-001～010について、future production endpoint/featureがないとcurrent taskのowner APIを実装・試験できない構造は本監査後0件。

UI-005のEvent StreamとUI-006のisolated runnerだけは実装時に誤解しやすいため、task-specific instructionとUI-000 outputへ特別gateを設ける。

## 5. Remaining unavoidable gate

`DB-001～022`のactual symbol/module/type/test/commit bindingとSprint 1 final public API shapeはSprint 1完成後のUI-000でしか確定できない。ここで不一致ならUI-001へ流さずSTOPする。

## 6. Static checker self-test

Final checker self-test:

```text
baseline current package -> PASS
mutation: UI-005 DB-012 rule removal -> FAIL
mutation: API-011 owner UI-004 -> UI-006 -> FAIL
mutation: UI-000 Runbook duplicate section number -> FAIL
```

3/3 intentional drift cases rejected。


## 7. Long-run Historical scope impact

`HIST-001～106`はSprint 1.5+ architecture compatibility boundary。

```text
UI-001..010 archive implementation dependency = none
UI-001..010 new API schema due HIST = none
current task blockers added = 0
future incompatible assumptions prohibited = yes
future HSC acceptance source = HSC-001～062
```

Current 0.2.0 PersonDetail strict behaviorはcurrent/active monolithic sourceに限定されるため、UI-005 implementabilityは維持する。Historical partial-read wire schemaは後続task/API versionで定義する。
