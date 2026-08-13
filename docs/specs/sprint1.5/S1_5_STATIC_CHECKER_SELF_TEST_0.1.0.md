# Sprint 1.5 Static Checker Self-Test

- Version: `0.1.0`
- Target checker: `verify-s1-5-spec-package.mjs`
- Target spec: `S1.5-SPEC-0.1.14` R12

## Actual result

```text
baseline package-only R12 package -> PASS

Package/document corruption:
 1. remove FI-046 matrix row -> DETECTED
 2. remove UI-006 required FI-053 -> DETECTED
 3. remove environment_blocker from Cursor acceptance STOP schema -> DETECTED
 4. remove DB-014 from current mock-audit table -> DETECTED
 5. re-add StableErrorCode as DEFERRED_BINDING DB row -> DETECTED
 6. duplicate UI-010 DB-001 critical binding -> DETECTED
 7. duplicate implementation-plan exact numeric heading -> DETECTED
 8. remove UI-005 DB-012 only from task instruction -> DETECTED
 9. remove Implementation Plan from execution-bundle manifest -> DETECTED

Repo-bound base authority:
10. valid exact-one clean S1.5-SPEC-0.1.13 -> PASS
11. wrong base version -> DETECTED
12. dirty tracked base -> DETECTED
13. duplicate tracked base file -> DETECTED

API state-transition / retry semantics:
14. reintroduce GET /session.lastOperation -> DETECTED
15. remove ST-013 state-transition row -> DETECTED
16. remove UI-006 ST-013 assignment -> DETECTED
17. reintroduce atomic ready-start complete-error case -> DETECTED
18. remove journal-lookup / running-acceptance distinction -> DETECTED
19. remove corrupt-session no-self-heal contract -> DETECTED
20. reintroduce noncanonical FORBIDDEN_CSRF -> DETECTED

Cross-API / lifetime semantics:
21. remove SCN-007 owner row -> DETECTED
22. remove UI-006 SCN-010 assignment -> DETECTED
23. allow running/completed journal eviction -> DETECTED
24. allow revision-only snapshot cache across K=0 partial -> DETECTED
25. classify old-process cursor as STALE_CURSOR 409 after new run -> DETECTED
26. reintroduce status/header/body exact replay -> DETECTED
27. remove client-disconnect no-cancel rule -> DETECTED
28. make requestId namespace process-global across UiSessions -> DETECTED
29. allow saved replay before security/strict DTO -> DETECTED
30. remove UI-003 SCN-015 assignment -> DETECTED

self-test actual = 30/30
```

## Purpose

Checker and documents can share the same mistaken assumption. These deliberate mutations verify that the current validator rejects drift in:

- FI ownership
- STOP taxonomy
- DB registry / task DB dependency
- execution-bundle completeness
- external base authority
- API/ST ownership
- bootstrap session behavior
- request-journal acceptance order
- atomic mutation failure semantics
- corrupt server-side session handling
- stable HTTP error codes
- cross-endpoint requestId namespace
- cross-session namespace isolation
- journal no-eviction lifetime
- K=0 same-revision metadata generation
- process-restart cookie/cursor precedence
- response-body vs transport-header replay equality
- client disconnect/reload/AbortSignal semantics
- SCN ownership

The first R6 self-test intentionally exposed one checker weakness: changing the normative §6N.2 `evictしない` rule could still pass because another section contained the same words. The checker was corrected to validate the exact §6N.2 section, and the full 30-case suite was rerun successfully.

This is validator self-test evidence, not production game-behavior acceptance.


## R7 returned-doc / DB-018 additions

The R6 suite was previously completed at 30/30. After integrating returned S01-008/S01-009 documents, the current R7 checker was additionally mutation-tested:

```text
31. remove DB-012 prebinding row -> DETECTED
32. falsely promote a prebinding DB row to matched -> DETECTED
33. reintroduce same-seed simulationId exclusion -> DETECTED
34. require shared normalizer implementation again -> DETECTED
35. make DB-018 wait for S01-009 production comparator/helper -> DETECTED
36. reintroduce TX-075 eventId normalized-equal rule -> DETECTED

R7 added tests actual = 6/6
```

During the first R7 added-test run, test 36 exposed a checker weakness: TX-075 checklist regression was not independently locked. The checker was narrowed to the TX-075 section and the full six R7-added mutations were rerun at 6/6.

This does not claim that all historical 30 mutations were rerun after every R7 edit; it records the prior R6 30/30 plus the current R7 incremental 6/6.


## R8 repo-binding runner additions

R8 adds an immutable-commit physical-binding evidence runner:

```text
audit-s1-5-repo-bindings.mjs
audit-s1-5-repo-bindings.ps1  // thin PowerShell wrapper
```

Static checker mutation tests:

```text
37. remove Node/PowerShell binding runner from execution manifest -> DETECTED
38. make runner claim normativeMatchedClaimed=1 -> DETECTED
39. replace accepted S01-008 default 7c47847 with HEAD -> DETECTED
40. remove worktreeUnchanged assertion -> DETECTED
41. duplicate Implementation Plan heading 22/23 -> DETECTED

R8 static additions = 5/5
```

Runtime smoke tests actually executed against temporary Git repositories:

```text
Smoke A:
  empty/minimal source fixture
  runner exit = 0
  DB rows = 22
  machine_evidence_incomplete = 20
  dependency_pending = 2
  worktreeUnchanged = true
  normativeMatchedClaimed = 0

Smoke B:
  synthetic accepted-code anchors for DB-008/009/010
  DB-008 = machine_evidence_complete
  DB-009 = machine_evidence_complete
  DB-010 = machine_evidence_complete
  worktreeUnchanged = true
  normativeMatchedClaimed = 0
```

The runtime smoke uses overridden test commit IDs only inside temporary fixture repositories. Production defaults remain:

```text
S01-008 = 7c47847
S01-007 = a39e476
```

The runner never promotes machine evidence to normative `matched`.


## R9 Historical architecture additions

R9 adds `HIST-001..056` and `HSC-001..014`. Current UI-001..010 scope remains unchanged; the checker locks future compatibility semantics.

Incremental mutation suite actually executed:

```text
42. remove HIST-025 local-degradation row -> DETECTED
43. change missing ancestry into not_related -> DETECTED
44. move reverse childIds truth back into immutable Historical Person -> DETECTED
45. restore Historical whole-detail 500 -> DETECTED
46. require archive full scan for personCount -> DETECTED
47. require Historical full clone in UiReadSnapshot -> DETECTED
48. remove active-validation non-recursion HIST-055 -> DETECTED
49. remove incremental persistence HIST-056 -> DETECTED
50. remove father-name partial display HSC-004 -> DETECTED
51. remove active-week/corrupt-ancestor HSC-013 -> DETECTED

R9 Historical incremental = 10/10
```

The first R9 mutation run exposed one checker gap: changing missing ancestry to `not_related` was not independently rejected. The checker was hardened with an exact HIST-034 no-absence assertion, and all ten mutations were rerun at 10/10.


## R10 Historical deep-pass additions

R10 extends the future long-run Historical compatibility contracts from R9 `HIST-001..056 / HSC-001..014` to:

```text
HIST-001..076
HSC-001..032
CA-001..038
```

Actual checker-hardening history during the repeated audit:

```text
Deep-pass series A (HIST-057..068):
  initial mutation run = 4/12 detected
  checker was tightened to exact HIST-row semantics
  rerun = 12/12 detected

Deep-pass series B (HIST-069..073):
  mutation run = 5/5 detected

Deep-pass series C (HIST-074..076):
  initial mutation run = 2/3 detected
  HIST-075 generation-binding assertion was tightened
  rerun = 3/3 detected
```

After all R10 edits, the final checker was tested again from a clean R10 copy by reversing every contract from `HIST-057` through `HIST-076` one at a time.

The first consolidated run exposed three remaining checker weaknesses:

```text
HIST-057 all-or-nothing sole truth regression -> initially MISSED
HIST-058 coarse corruption hides valid fragments -> initially MISSED
HIST-066 append rescans historical prefix -> initially MISSED

consolidated initial = 17/20
```

The checker was then changed to inspect the exact normative row meaning for HIST-057/058/066 and the full consolidated suite was rerun:

```text
HIST-057..076 consolidated = 20/20 DETECTED
```

Two additional control-plane mutations were then run against the final checker:

```text
21. HIST-070 history-dependent total Person count falls back to active-only normal value -> DETECTED
22. normal-load Historical control-plane failure is treated as empty history / full-payload-scan fallback -> DETECTED

R10 final current-checker mutation set = 22/22 DETECTED
```

The R10 tests specifically lock:

- independently decodable historical framing
- fragment-level partial salvage
- known-historical payload missing vs absent PersonId
- bounded normal-load metadata work
- no hot-path all-history fallback
- traversal budget exhaustion => cannot_determine
- copy-on-write/new-generation maintenance
- read-generation isolation
- crash-recoverable death transition
- append cursor/segment metadata instead of prefix rescan
- retention expiry != corruption
- no weekly wholesale clone of supporting history
- bounded corruption blast radius
- control-plane degraded != empty archive / active-only fake aggregate
- ID allocator fail-closed without archive scan/reuse
- cached-valid invalidation after content identity change
- retention tombstone ID/sequence continuity
- live-reader-safe generation reclamation
- multi-request Historical cursor generation binding
- validated unchanged Current->Historical reference evidence

This section records only the R10 incremental/deep-pass tests actually run. It does not claim that every earlier R6-R9 legacy mutation was rerun after the final R10 edit.


## R11 fifth-pass Historical/checkpoint/memory additions

R11 extends R10 to:

```text
HIST-001..090
HSC-001..046
CA-001..052
```

New semantics added during repeated review:

- rule-query dependency minimality: irrelevant stats/technique corruption does not poison kinship
- stable placeholder PersonId/topology
- resumable Current checkpoint ↔ Historical generation binding
- durable save/checkpoint/backup generation pinning
- old-save restore/fork identity collision safety
- unsupported schema != corruption
- history-dependent writes fail closed atomically
- repair/admin correction is non-retroactive by default
- integrity evidence anchored outside the unchecked fragment
- relationship index bound to canonical relationship generation/root
- no same-week post-death mutation/RNG after death commit
- ended marriage/relationship history is preserved
- death transition does not materialize the Person's whole lifetime Event/Result history
- normal runtime does not require every Historical heavy payload resident in RAM

### Checker-hardening result

The first R11 15-case mutation run detected 12/15.

The three misses changed explanatory normative prose while leaving the HIST table row correct:

```text
HIST-084 repair prose auto-replays committed gameplay -> initially MISSED
HIST-085 integrity prose trusts self-reported checksum -> initially MISSED
HIST-087 same-week death prose allows post-death processing -> initially MISSED
```

The checker was strengthened to inspect the exact `9C / 9D / 9E` prose sections as well as the HIST rows. `HSC-001` was also clarified from ambiguous `full historical payload` to `full final Person payload`, explicitly excluding lifetime Event/Result materialization.

The full R11 mutation set was then rerun:

```text
01 HIST-077 irrelevant corruption poisons kinship -> DETECTED
02 HIST-078 placeholder identities collapse -> DETECTED
03 HIST-079 checkpoint silently mixes another Historical generation -> DETECTED
04 HIST-080 durable-save generation reclaimed early -> DETECTED
05 HIST-081 old-save allocator reuses future-used IDs -> DETECTED
06 HIST-082 unsupported schema classified as corruption -> DETECTED
07 HIST-083 incomplete Historical write commits success -> DETECTED
08 HIST-084 repair auto-replays gameplay -> DETECTED
09 HIST-085 self-reported checksum trusted -> DETECTED
10 HIST-086 stale relationship index proves not_related -> DETECTED
11 HIST-087 post-death same-week processing allowed -> DETECTED
12 HIST-088 ended relationship history hard-deleted -> DETECTED
13 HIST-089 death transition scans/clones lifetime history -> DETECTED
14 HIST-090 all Historical payloads required resident in RAM -> DETECTED
15 Implementation Plan reverted to R10 Historical ranges -> DETECTED
16 Cursor template reverted to stale shared-comparator wording -> DETECTED

R11 final incremental mutation suite = 16/16 DETECTED
```

This is an incremental R11 suite. Earlier R10 deep-pass results remain recorded above; this section does not claim every legacy mutation was rerun after every R11 edit.


## R12 sixth/seventh-pass Historical additions

R12 extends the long-run architecture to:

```text
HIST-001..106
HSC-001..062
CA-001..068
```

Newly fixed semantic classes:

- weekly state hash/canonicalization must not flatten/full-hash all Historical payloads
- logical gameplay determinism is independent of physical compaction/cache/storage generation
- Historical Technique/catalog semantics retain versioned provenance
- checkpoint publication occurs only after referenced Historical state is durable
- save deletion / durable-pin release is crash-safe
- retained fork/branch roots participate in Historical GC and ID namespace safety
- stale/degraded UI salvage cache is not rule/ID-allocation authority
- explicit full audit is read-only unless repair/migration is separately requested
- relationship active/history views retain temporal lifecycle evidence
- partial-read placeholders keep stable Historical query identity/order
- corrupted length/count/compression/depth is resource-bounded and fragment-local
- duplicate logical IDs are ambiguous conflicts, never silent storage-order last-write-wins
- semantic provenance catalogs/mappings cannot be GC'd while retained history still references them
- maintenance/compaction publish cannot lose concurrent committed Historical writes
- checkpoint capture uses one committed Current+Historical+allocator/reference boundary
- unpublished orphan segment bytes are not logical-history authority

### Checker-hardening sequence actually run

First R12 14-case mutation pass:

```text
initial = 11/14 detected
misses:
  HIST-096 fork GC-root negative wording
  9F prose full-archive serialization allowance
  Implementation Plan one-location old range regression
```

Checker was strengthened to inspect positive/negative polarity and exact current plan range, then the same 14 cases were rerun:

```text
R12 sixth-pass rerun = 14/14 DETECTED
```

Seventh-pass hostile-decode/concurrent-publish mutations:

```text
HIST-101..106 + 9M/9P/9R + HSC-060 + Runbook guard
= 11/11 DETECTED
```

A subsequent consistency rescan found one document-count defect:

```text
Compatibility Audit CA-039..052 = 14 rows
3E prose incorrectly said 11 gaps
```

The prose was corrected to 14 and the checker now locks that count.

Final consolidated current-R12 mutation suite:

```text
HIST-091..106 reversed one-by-one
9F / 9M / 9P / 9R prose regressions
HSC-060 row deletion
Implementation Plan range regression
Cursor template checkpoint-durability guard removal
Compatibility 14->11 prose count regression

R12 final consolidated = 24/24 DETECTED
```

This section records the R12 incremental/consolidated tests actually run. It does not claim every historical R6-R11 mutation was rerun after every final R12 edit.


## R12 post-review consistency refresh

Role 2の再監査で、current DB registryが22件なのにChecklist machine conditionだけ24件の残存値を持つこと、
およびFreeze Policyだけが`real UI-000直前freeze`を要求し、Runbook / Implementation Planの`UI-000 PASS後・UI-001前freeze`と衝突することを検出した。

R12はpre-freeze / proposed状態のため、外部gameplay契約やDB subjectを増減せず、次へ同期した。

```text
DB machine count: 22 / unique22 / matched22
freeze point: UI-000 PASS後、UI-001 release前
UI-000: pre-existing freeze不要
UI-001..010: post-UI-000 freeze record必須
```

Checkerへmachine countとfreeze sequencingの独立assertを追加した。
以下のincremental mutationを実行する。

```text
R12 consistency-A. checklist machine count 22 -> 24 -> DETECTED
  checker errors:
  - checklist machine row count must be 22
  - checklist unique bindingId count must be 22
  - checklist machine matched count must be 22
  - stale checklist DB24 machine counts remain

R12 consistency-B. freeze point post-UI000 -> immediately-before-UI000 -> DETECTED
  checker errors:
  - freeze point must be post-UI-000 / pre-UI-001
  - stale pre-UI-000 freeze point remains

R12 post-review consistency incremental = 2/2 DETECTED
```

Baseline package-only checkerも修正後に再実行しPASS。
この2件はcurrent R12 checkerに対して実際に実行したincremental mutation結果である。

## R12 consistency-C — UI-000 P00/P01 order and UI-001 freeze release gate

Role 2の再々監査で、freeze位置自体はpost-UI-000へ同期済みだったが、次の2つの残存不整合を検出した。

1. Runbook §18の`UI-001開始条件`列挙に、Freeze Policy §2が要求するfreeze record/hash一致・frozen-bytes再監査PASSが明示されていなかった。
2. Role 2準備資料のsingle sequenceが`package-only -> base-authority -> repo-bound`となっていた一方、Runbookは`順番を変更しない`として`P00 repository/base-authority -> P01 package-only + repo-bound`を要求していた。

current R12 proposalではRunbookを次へ固定する。

```text
P00 repository/predecessor + base-authority gate
-> P01 package-only precheck + repo-bound UI-000 gate
-> P02..P12
-> UI-000 PASS
-> freeze record/hash
-> exact frozen bytes package-only + repo-bound re-audit PASS
-> UI-001 release
```

Checkerへsection-scope assertを追加し、以下のincremental mutationを実行する。

```text
R12 consistency-C1. UI-001 release gateから post-UI-000 freeze record exists を除去 -> DETECTED
R12 consistency-C2. P00から base-authority gate markerを除去してP01以降へ依存 -> DETECTED

R12 consistency-C incremental = 2/2 DETECTED
```

この2件はcurrent R12 checkerに対して実際に実行したincremental mutation結果である。
## R12 consistency-D — historical S01-008 prebinding vs final post-T01 baseline

Role 2 zero-base監査で、R8時点のaccepted-S01-008 prebinding資料がcurrent execution bundle内に残り、`S01-009 pending` / `7c47847` evidenceがfinal UI-000 P04のcurrent bindingと混同され得ることを検出した。

current R12 proposalでは:

```text
R8/S01-008 7c47847 runner = historical/supplemental candidate evidence only
P00 = latest roadmap predecessors (T02/T03-A/T03-B requirement含む) + fixed current repository baseline記録
P04 = P00-fixed current repository stateへDB-001..022をfinal binding
7c47847 evidence alone != matched
```

へ固定する。

Checkerへsection-scope assertを追加し、以下のincremental mutationを実行する。

```text
R12 consistency-D1. P00からT03-A predecessor evidenceを除去 -> DETECTED
R12 consistency-D2. P04から7c47847 supplemental-only/current-baseline rebind ruleを除去 -> DETECTED
R12 consistency-D3. S01-008 prebinding auditのhistorical statusを除去 -> DETECTED

R12 consistency-D incremental = 3/3 DETECTED
```

## R12 consistency-E — complete base GATE ownership and UI-001 release inheritance

Role 2の反復再監査で、base `UI_000_BRIDGE_AUDIT_CHECKLIST.md` のGATE-001～010と
current Runbook P00～P12を逆向きに照合した結果、次のorchestration gapを検出した。

1. P00/P02/P03が実質的に確認していた情報のうち、GATE-002/003/008/009/010等について
   **どのphaseがactual evidenceを記録してPASS判定するか** がRunbookに明示されていなかった。
2. P12 reportは個別countを要求していたが、`GATE-001..015 all PASS` tableを必須としていなかった。
3. common task template §2にはfreeze record/hash確認がある一方、UI-001専用task・Implementation Plan・
   Implementability Auditのpredecessor表記は`UI-000 accepted`だけで、post-UI-000 release gateを
   専用task側から読み落とせる余地があった。

current proposalではphase ownershipを次へ固定した。

```text
P00: GATE-001,003,007,008,009
P01: GATE-015
P02: GATE-002,010
P03: GATE-004,005,006
P04/P11/P12: GATE-011,012,013
P08: GATE-014
P12: GATE-001..015 all PASS table required
```

GATE-010はbase S1.5-SPEC-0.1.13がUI-000でactual repository/Node互換性へ照合して
React/Vite/Fastify exact versionsを固定することを明示しているため、SPEC_UNDEFINEDではない。
UI-000でversion選定evidenceを記録し、production install/lockfile editはUI-001で行う。

UI-001は:

```text
UI-000 accepted
+ post-UI-000 freeze/hash一致
+ exact frozen bytes package-only/repo-bound re-audit PASS
```

をdedicated predecessor gateとしても明示する。

Checkerへsection-scope assertを追加し、以下のincremental mutationを実行する。

```text
R12 consistency-E1. P00からGATE-003 ownershipを除去 -> DETECTED
R12 consistency-E2. P02からGATE-010 ownershipを除去 -> DETECTED
R12 consistency-E3. P12からGATE-001..015 all PASS要求を除去 -> DETECTED
R12 consistency-E4. UI-001 dedicated taskからpost-UI-000 frozen re-audit gateを除去 -> DETECTED
```

R12 consistency-E incremental = 4/4 DETECTED

これは外部gameplay/API/storage semantics、DB subject、API owner、calendar契約を変更しない
pre-freeze orchestration consistency correctionである。

## R12 consistency-F — proposal staging vs Git authority adoption

`SPEC_MIRROR.md`との上位規範照合で、R12 Freeze Policyの
`current pre-freeze proposal revision -> UI-000 -> freeze -> UI-001`
だけを読むと、Drive `specs/proposed` の0.1.14をGit反映前のまま
implementation baselineへ昇格できる余地を検出した。

current proposalでは次を固定する。

```text
specs/proposed
= preparation staging only

real UI-000 P00
= all predecessor complete
+ P00-fixed Git HEAD
+ matching specs/current manifest HEAD
+ R12 semantic/control proposal adoption complete
+ proposal-only semantic/control input count = 0
+ tracked base 0.1.13 exact1
+ tracked current amendment 0.1.14 exact1
+ package amendment == Git amendment bytes/hash

UI-000 evidence-only records
= audit/package evidenceとして更新可能
= semantic authorityをproposal-onlyで作らない
```

Gitへ反映するexact path mappingはpost-T01/T02/T03 repositoryを見て確定する。
pure evidence / generated ZIP / checker tool等はnon-authoritative artifact分類を許容するが、
実装意味論・task/acceptance controlとして使うMarkdownを未分類のままproposal-onlyで使用しない。

Checkerへauthority-boundary assertを追加し、以下のincremental mutationを実行する。

```text
R12 consistency-F1. Base Authority GateからGit-tracked amendment companion gateを除去 -> DETECTED
R12 consistency-F2. P00からproposal-only semantic/control input=0を除去 -> DETECTED
R12 consistency-F3. Freeze Policyをpre-freeze proposal-only baselineへ戻す -> DETECTED
```

R12 consistency-F incremental = 3/3 DETECTED

外部gameplay/API/storage/calendar semantics自体は変更しない。


## R12 consistency-G — execution bundle authority / UI-001 release inheritance

Repeated Role 2 review found three remaining control-plane gaps after consistency-F:

1. UI-001 instruction header had the full post-UI-000 freeze gate, but its final handoff summary still said only `predecessor: UI-000 accepted`.
2. Runbook P00 referenced proposal-stage provenance, while the real authority decision must use repository-specific proposal→Git mapping evidence; putting the proposal manifest into the execution bundle would carry stale proposal status into the runtime baseline.
3. Freeze/task preflight required Git-authority/package byte matching, while the freeze record did not hash-address the proposal-adoption mapping or current amendment authority details.

Current checker must reject regressions that:

- remove the full freeze/re-audit predecessor from the UI-001 handoff summary;
- add `R12_PROPOSAL_MANIFEST.md` to the execution bundle or remove the explicit provenance-only/runtime-evidence boundary;
- remove proposal-adoption / Git-authority mapping evidence SHA from the freeze policy;
- remove package↔Git byte/hash matching for classified authority/supporting-control files from P00.

These are pre-freeze proposal consistency corrections only; they do not claim PREP-009 actual Git path mapping is complete.

Executed against the updated checker/package:

```text
R12 consistency-G1 UI-001 handoff predecessor freeze/re-audit removed -> DETECTED
R12 consistency-G2 R12_PROPOSAL_MANIFEST incorrectly added to execution bundle -> DETECTED
R12 consistency-G3 freeze gitAuthorityMappingSha256 field removed -> DETECTED
R12 consistency-G4 P00 classified package↔Git byte-match rule removed -> DETECTED
R12 consistency-G5 proposal manifest pre-adoption non-authority status removed -> DETECTED
R12 consistency-G6 bundle file count 38 -> 39 -> DETECTED
R12 consistency-G7 bundle execution-copy/non-authority boundary reversed -> DETECTED
R12 consistency-G8 base authority additional adoption boundary removed -> DETECTED

R12 consistency-G incremental = 8/8 DETECTED
```

This is an incremental consistency-G suite. Historical R6–F results remain recorded above; this section does not claim every historical mutation was rerun after this edit.

## R12 consistency-H — proposal→Git mapping schema determinism

Repeated review found that PREP-009 correctly deferred actual Git paths until predecessor completion, but the R12 core did not yet define one exact record shape for the mapping evidence.

Current proposal fixes the mapping schema to four exact classifications and records artifact/proposal path/Git path/blob/commit/dirty/mirror path/package+Git SHA/byte-match/notes. Git authority/supporting-control rows require non-null tracked evidence and byte-match; evidence/tool rows may remain non-Git but cannot define implementation semantics. Completeness requires unclassified=0 and duplicate=0.

The checker locks the four classification labels, exact field set, and P00 use of Base Authority Gate §2A. Actual Git path values remain PREP-009 post-predecessor work.

Initial H mutation run detected 3/4; deleting one classification from the primary classification fence was missed because the checker saw the same token later in rule prose. The checker was hardened to parse the §2A first `text` fence as an exact four-line ordered classification block.

Rerun result:

```text
H1 remove generated_package_or_tool from classification fence -> DETECTED
H2 remove specsCurrentMirrorPath field -> DETECTED
H3 weaken duplicate artifact record=0 -> DETECTED
H4 remove Runbook §2A exact-schema requirement -> DETECTED

R12 consistency-H final incremental = 4/4 DETECTED
```

## R12 consistency-I — UI-001..010 predecessor chain exactness

Current documents already agreed on the serial chain, but the checker previously special-cased only UI-001. The checker now validates each task across three surfaces: Implementation Plan row, dedicated task `Predecessor gate`, and final handoff `predecessor:` summary.

Expected chain is UI-001 after UI-000+freeze/re-audit, then UI-002 after UI-001, continuing serially through UI-010 after UI-009.

Mutation run: changed UI-005 dedicated predecessor from UI-004 to UI-003 -> DETECTED.

R12 consistency-I incremental = 1/1 DETECTED
