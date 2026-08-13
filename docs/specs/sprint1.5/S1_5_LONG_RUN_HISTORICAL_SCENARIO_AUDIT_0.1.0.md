# Sprint 1.5+ Long-Run Historical Scenario Audit

- Document ID: `S1.5-LONG-RUN-HISTORICAL-SCENARIO-AUDIT`
- Version: `0.1.0`
- Authority: `S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`
- Purpose: architecture semanticsを連続scenarioで逆監査する。current UI-001..010 runtime testではなくfuture HIST implementation acceptance source。

## 1. Scenario matrix

| HSC | Scenario | Required result |
|---|---|---|
| HSC-001 | death transition | strict-valid PersonをHistorical化するとpayload freeze + active hot-set remove + directory/index/count updateがatomic。翌週training/state/RNG/person-week eventなし |
| HSC-002 | posthumous child | parent死亡後にchild relation追加。Historical parent payload hash/value不変、canonical relationship + childIdsByParent等indexだけ更新 |
| HSC-003 | 100 active + 0 vs 10,000 historical | history query/death transitionなしの同一weekly fixtureでhistorical payload visits/clones/full validationsはいずれも0 |
| HSC-004 | father name valid / stats corrupt | relationship edgeとdisplayNameがvalidなら父名表示。stats sectionだけunavailable。whole person/tree/page errorなし |
| HSC-005 | referenced Person missing | graph nodeは「不明な人物」placeholderで継続。missingをno-parent/no-relationへ補正しない |
| HSC-006 | kinship positive proof + unrelated corruption | relevant valid pathでrelatedを証明できればrelated。無関係branch corruptionでcannot_determineへ落とさない |
| HSC-007 | kinship negative proof incomplete | prohibited/special relation pathは見つからないが必要frontierにmissing/corrupt nodeあり -> cannot_determine。not_related禁止 |
| HSC-008 | derived index stale | indexとcanonical relationship不一致。indexだけでnot_relatedを返さずcannot_determine/rebuild path。weekly中に全archive rebuildしない |
| HSC-009 | corrupt quarantine cache | cacheを捨ててpayloadを再validation可能。cacheだけを理由にvalid recordをmissing/corrupted固定しない |
| HSC-010 | Person-level corrupted but field readable | coarse state=corruptedでもdisplayName/date等の独立valid fieldをpartial read可能。全field unavailableへ短絡しない |
| HSC-011 | corrupted cycle in genealogy | visited-set/depth boundで無限巡回なし。UIはbranch局所placeholder、rule queryは必要frontier不完備ならcannot_determine |
| HSC-012 | old Event/Result one-record corruption | history browsingで該当record/sectionだけunavailable。normal weekly simulationは既valid historical prefixを再走査せず継続 |
| HSC-013 | active weekly + corrupt ancient ancestor not queried | living/current stateはvalid、300年前ancestor payloadはcorrupt、当週kinship queryなし -> weekly continues。ancestor payload full validation/clone/visit 0 |
| HSC-014 | autosave with large immutable archive | active/current deltaは小、historical=10,000 unchanged -> normal autosave writes delta/new records/index changes without rewriting every historical payload; explicit full exportは別operation |
| HSC-015 | partial-framed historical storage | identity/displayName fragment valid、stats/techniques fragment corrupt -> identity/nameは表示、heavy sectionsだけunavailable。single-section corruptionでrecord全体decode不能となる唯一blob設計はFAIL |
| HSC-016 | known historical payload missing vs absent PersonId | directory=historicalだがpayload missingならlogical node/PersonIdは維持しintegrity missing。directory自体にIDなしはabsent/broken reference。両者を同じ「存在しない人物」判定へ潰さない |
| HSC-017 | normal load with 10,000 historical | active strict + root/generation/segment manifest確認でopen可能。Historical payload read/full-validation=0、全index entry deserialize/full-scanを必須にしない。explicit full auditだけ全件可 |
| HSC-018 | stale adjacency index on rule query | index不整合時に全relationship/archive scanへhot-path fallbackしない。bounded keyed canonical lookupが使えなければcannot_determine + repair要求 |
| HSC-019 | kinship traversal safety budget exhausted | required frontier完了前にnode/edge/time budget exhaustion -> cannot_determine。未発見だけでnot_related禁止。UIはtruncated/未確認を表示 |
| HSC-020 | repair while historical reader is open | reader Aはold generation固定、repairはnew generationをatomic publish、reader Bはnew generation。Aの途中でpayload/index/directory世代が混ざらない |
| HSC-021 | crash during death persistence | payload write / directory switch / hot-set removal / index-counter更新の各phaseでcrash注入。recovery後はold activeまたはnew historicalのどちらかexact、duplicate/missing half-stateなし |
| HSC-022 | append to long historical prefix | historical Event/Result/achievement/relationship prefix=100,000でもnew appendでold prefix全scan/cloneなし。validated append cursor/segment metadataだけ更新 |
| HSC-023 | retention expiry is not corruption | retention policyで詳細logが正常期限切れ -> `not_retained_by_policy`表示、corrupted/missing diagnosticなし。rule-critical ancestry/relationship materialはretention expiry禁止 |
| HSC-024 | huge supporting history during weekly step | active fixture同一、Historical relationship/Event/Result/achievement prefixだけ0 vs large。history queryなし週はsupporting historical full clone/full validation/scanなし |
| HSC-025 | one corrupted archive segment | one Historical segment/chunk corrupt、directory/root + unrelated segments valid -> affected nodes/sections only unavailable、unrelated historical branches remain readable。whole archive lossは禁止 |
| HSC-026 | control-plane root corruption | PersonDirectory/manifest root corrupt -> archive empty扱い禁止。Historical UI=degraded/unavailable、kinship=create `cannot_determine`、unrelated current weekly can continue; repair outside weekly |
| HSC-027 | PersonId allocator metadata corrupt | historical=10,000でallocation metadata invalid -> new PersonId allocationだけfail-closed、全archive scanして推測next ID/既存ID再利用禁止。unrelated operations continue |
| HSC-028 | cached valid then payload bitrot | record generation/hash cached valid後にpayload bit flip -> content identity mismatch検出、cached-validを破棄してrevalidate/corrupted。古いcacheのまま表示しない |
| HSC-029 | retention tombstone and identity continuity | detailed Event/Result payload期限切れ後もstable ID/sequence/tombstone/availability reasonを維持。new Event/Resultがold ID/sequenceを再利用せず、UIは保存期間外と表示 |
| HSC-030 | old reader during repeated repair/compaction | reader AがG1を保持中にG2/G3 publish。A終了前にG1 segmentをdelete/reclaimしない。A終了後は安全にreclaim可能で、old generationsが永久リークしない |
| HSC-031 | historical paging across generation publish | page1 cursor issued at G1、repair publishes G2 before page2 -> page2 must stay explicitly on G1 or return STALE/restart。G1/G2 itemsを無言mix禁止 |
| HSC-032 | unchanged active reference during control-plane degradation | living PersonのparentId referenceは以前G1でvalidated、payload未参照週にmanifest root degraded -> ordinary weekly does not recursive scan/archive validate。history-dependent actionだけfail-closed |
| HSC-033 | irrelevant payload corruption during kinship | parent-child directory/edges complete valid、ancestor stats/techniques payload corrupt/missing -> kinshipはgraph evidenceでrelated/not_related判定可能。irrelevant payload corruptionだけでcannot_determine禁止 |
| HSC-034 | multiple unknown placeholders | known PersonId P/Qのpayloadが別々にunreadable -> P/Qは別placeholder nodeとしてstable identity/topology維持。1つの「不明」nodeへcollapse禁止 |
| HSC-035 | save/checkpoint historical generation binding | checkpoint C created with historical G1、later G2 publish -> C loadがcurrent=C + history=G2を無言正常扱いしない。G1 restore/pinまたは明示degraded/migration/fork path |
| HSC-036 | durable save pins old generation | live reader 0でもretained save SがG1参照 -> compaction/GCはG1必要segmentをreclaimしない。S削除/expiry後かつreader0で初めて回収可 |
| HSC-037 | old save continued after future IDs exist | save C後にfuture branchでPersonIds生成、その後C再開 -> allocator巻戻しだけでfuture-used IDsを同namespace再利用しない。exact history restoreまたはexplicit fork/namespace |
| HSC-038 | unsupported historical schema | identity fragment supported、heavy section version unsupported -> identity表示可、section=migration_required/unsupported、corruption扱いなし。ruleがunsupported sectionを必要ならcannot_determine |
| HSC-039 | history control unavailable during required write | death/posthumous relation/new-ID mutation中にHistorical control metadata unavailable -> required history writeを落としてsuccess禁止。transaction rollback/reject、unrelated capabilityだけ継続可能 |
| HSC-040 | repair changes ancestry after committed gameplay | G1で過去marriage/result commit済み、repair G2でancestry correction -> future queryはG2、既commit resultを自動rollback/replayしない。retroactive correctionはexplicit maintenanceのみ |
| HSC-041 | corrupted fragment plus self-reported checksum | payload bytesと同じunchecked fragment内checksumを一緒に変更 -> integrity validと判定禁止。trusted manifest/root expected identity不一致で検出 |
| HSC-042 | stale relationship index generation | canonical relationship=G2、index=G1 or unbound -> indexだけでnot_related禁止。generation/root一致を検証してからnegative proofへ使用 |
| HSC-043 | death committed mid-week | P death commit後もweek-start processor listにPが残るfixture -> 後続training/state/event/RNG call count 0。death前commit済みactionだけ維持 |
| HSC-044 | ended marriage remains in historical genealogy | spouse relationがdeath/divorceでcurrent-active終了 -> current spouse viewからは外れてよいがcanonical historical relationは保持され、後世の家系図/婚姻履歴から両PersonIdを辿れる。hard-delete/上書き消失禁止 |
| HSC-045 | death after long lifetime history | PにEvent/Result history=100,000件あるfixtureでdeath -> freeze/commitが全100,000 detail scan/cloneを要求せず、current final payload + bounded direct metadata/index delta中心。existing append historyはそのまま参照 |
| HSC-046 | historical payload residency with huge archive | active=100、historical=100,000、history queryなし -> normal runtimeが100,000 payload objectを全常駐必須にしない。bounded cache/resident payload countersはquery/cache policyへ依存し、all-history countへ必然線形ではない |
| HSC-047 | weekly hash/canonicalization with huge archive | active=100、historical=100,000、history変更0 -> weekly state hash/canonicalizationが100,000 payload/segmentをfull serialize/hashしない。unchanged logical root再利用、history full-hash visit=0相当 |
| HSC-048 | compaction/cache layout determinism | logical history同一のG1をrepack/compactしてphysical G2へ変更、cache residencyも差異 -> same next-week gameplay/RNG/canonical allocation/deterministic projection。physical layout差だけで結果差禁止 |
| HSC-049 | historical catalog provenance | old Historical PersonがTechniqueId=Tを保持、latest catalogでTの意味変更/削除 -> old recordをlatest semanticsへ無言reinterpretしない。当時catalog/versionで表示、読めなければtechnique sectionだけunsupported/unavailable |
| HSC-050 | crash during checkpoint publication | new Historical G2 write途中/allocator evidence途中/checkpoint manifest publish直前直後でcrash -> recovery後はold valid checkpointまたはcomplete new checkpoint+G2。published C2 -> missing G2のdangling save禁止 |
| HSC-051 | crash during save deletion and pin release | save S pins G1。S deletion/pin release各phaseでcrash -> Sが残るならG1も残る。pinだけ余分に残る一時leakはrepairable。S存在+G1 reclaimed禁止 |
| HSC-052 | fork shares old history | checkpoint C/G1からbranch A/B生成、双方retained -> shared G1 segmentはどちらかが必要な間GC禁止。post-fork new IDsはnamespace collisionせず、pre-fork PersonIdsは両branchで同じancestor identity |
| HSC-053 | degraded display cache vs kinship authority | last-known father displayName cacheあり、current Historical control-plane unverifiable -> UIは「stale/degraded」父名表示可。ただしそのcacheだけでkinship not_related/related・marriage可否・new ID allocationを決めない |
| HSC-054 | explicit full audit does not repair implicitly | corrupt Historical fragmentへfull audit -> report/corrupted diagnostic可、canonical bytes/hash/generationは不変。repair commandを別実行したときだけnew generation publish |
| HSC-055 | multiple marriage lifecycle intervals | spouse relation R1 ended後R2 current。genealogyはR1/R2両方保持、current spouse viewはR2。R1 end metadataだけcorrupt -> R1 status unavailableでもR2/他履歴表示継続、whole person failure禁止 |
| HSC-056 | stable paging with corrupted display payload | Historical list page orderをPersonId tie-breakで固定。途中PersonのdisplayName payload missing/corruptでplaceholder化してもnode identity/count/orderがcollapse/duplicate/reorderせず、cursor continuationが同generation内で安定 |
| HSC-057 | malicious length/decompression fragment | one Historical section header declares huge length/count/decompression ratio -> bounded reader marks section corrupted/unavailable without OOM/stack overflow/process crash。other independent fields remain readable |
| HSC-058 | duplicate PersonId conflict | same generationにPersonId=Pのdifferent canonical records 2件 -> storage orderでlast-write-wins禁止。P identity conflict diagnostic、UI placeholder/partial、kinship authorityが必要ならcannot_determine、allocator再利用なし |
| HSC-059 | referenced old catalog GC attempt | Historical P references Technique catalog V1。GC tries delete V1 while P/save remains -> V1 or equivalent migrated provenance retained。delete後latest V2 fallbackで表示を続けるのは禁止 |
| HSC-060 | maintenance vs concurrent death append | repair built from G1 while death transaction commits record D and root becomes G1a -> repair publish must detect base mismatch and retry/rebase/abort。published history never loses D |
| HSC-061 | checkpoint captured during weekly/repair publish | save starts around weekly commit or Historical G1->G2 publish -> checkpoint is entirely one committed boundary。Current-after+History-before or uncommitted segment inclusion禁止 |
| HSC-062 | orphan pre-publish segment after crash | crash leaves new segment bytes but root/manifest publish never occurred -> normal load does not resurrect its Person/Event records by scanning files。orphan cleanup may delete only after root/save/branch reachability proof |

## 2. HSC-001 death transition ledger

Before:

```text
Person P in active hot set
PersonDirectory[P] = active
historical payload absent
```

Commit boundary:

```text
strict validate current P + required references
freeze full final Person payload (外部append-only lifetime Event/Result detailの全materializeではない)
register historical location
remove active processing membership
update logical all-person/living counters
update relationship/index generation if needed
commit as one transaction
```

After:

```text
PersonId P unchanged
PersonDirectory[P] = historical
historical payload immutable
next normal weekly processor does not visit P payload
```

Any archive-candidate validation failure before commit => old active/current state remains; no half-move.

## 3. HSC-002 reverse-index mutability

A father dies while a child relation may still be created later.

Forbidden design:

```text
HistoricalPerson.childIds = only truth
```

because adding the child requires mutating immutable payload.

Required:

```text
Historical payload unchanged
canonical parent_child edge append
childIdsByParent index update transactionally
```

## 4. HSC-003 structural performance proof

Do not rely only on noisy wall-clock thresholds.

Compare fixtures with identical active set/current-week actions:

```text
A: active=100, historical=0
B: active=100, historical=10_000
```

No history-dependent rule query/death transition in the measured week.

Required structural counters for both:

```text
historicalPersonPayloadVisits = 0
historicalPersonPayloadClones = 0
historicalFullValidations = 0
```

Wall-clock/memory benchmark may additionally show archive-size independence but does not replace counters.

## 5. HSC-004 / 010 partial readability

Historical integrity state is not an all-or-nothing UI switch.

```text
Person integrity = corrupted
relationship to father = valid
father.displayName = valid
father.stats = corrupt
father.techniques = unchecked
```

Valid display:

```text
父: <displayName>
能力: 履歴データを読み取れません
技: 未確認/必要時読込
```

Invalid display:

```text
Person全体を500
父名を隠す
statsを0として表示
techniques=[]を「技なし」と表示
```

Arbitrary recovery from completely undecodable raw bytes is not required; the contract applies when fields/sections are independently decodable/validatable.

## 6. HSC-006 / 007 kinship completeness

For a bounded rule-specific ancestry frontier:

```text
positive valid path found
  -> related

no path + complete valid frontier
  -> not_related

no path + incomplete/corrupt/missing required frontier
  -> cannot_determine
```

`cannot_determine` blocks only the rule-dependent action. It does not stop unrelated weekly simulation.

## 7. HSC-008 / 009 metadata corruption

Derived acceleration metadata is not the historical semantic authority.

```text
stale adjacency index
corrupt quarantine cache
```

must be rebuildable/discardable outside the normal weekly hot path.

Neither may silently convert canonical history into:

```text
missing
not_related
empty history
```

## 8. HSC-011 graph corruption

All genealogy/kinship traversal needs:

```text
visited-set
bounded depth / rule frontier
branch-local diagnostic
```

A cycle/duplicate-edge corruption must not cause recursion overflow/infinite loop.

UI may cut the affected branch and keep the rest of the tree visible.

## 9. HSC-012 historical prefix

Validated append-only Event/Result/achievement history follows the same principle as Historical Person payload:

```text
unchanged validated prefix != weekly validation workload
```

A damaged old record discovered during browsing is locally unavailable unless a current rule explicitly depends on it. If a rule depends on it, use cannot_determine/fail-closed semantics.

## 10. HSC-013 active strict vs historical recursion boundary

A current Person can safely reference historical ancestry without causing weekly recursive archive validation.

```text
current active state valid
old ancestor payload corrupted
no rule this week needs ancestor content

=> normal weekly continues
=> historical payload full validation = 0
```

If a later marriage/kinship rule needs that branch, the rule query returns `cannot_determine` as required rather than retroactively making every ordinary week fail.

## 11. HSC-014 incremental persistence

Normal autosave/checkpoint is not an explicit full export.

```text
historical unchanged = 10_000
current changed = small delta
new deaths = K

normal persistence work ~ current delta + K + index/manifest delta
```

Rewriting/serializing all 10,000 Historical Person payloads every week would violate the long-run cost boundary even if simulation processors themselves skip them.

Explicit full export, compaction, migration, or audit may scale with archive size.

## 12. HSC-015 partial-framed storage

A future persistence schema must make partial degradation physically possible.

```text
identity/displayName fragment = valid
stats fragment = corrupt
techniques fragment = unchecked
```

Expected:

```text
identity/name survives
stats unavailable only
techniques may lazy-load later
whole record is not forced unreadable merely by stats corruption
```

This does not require arbitrary byte recovery. It requires independently framed/validated sections in the normal storage design.

## 13. HSC-016 directory location vs payload integrity

Two cases must remain distinct.

```text
A: PersonDirectory[P] = historical, expected payload missing
   -> logical Person exists
   -> node/PersonId remains
   -> integrity = missing

B: PersonDirectory has no P
   -> location = absent
   -> a relationship pointing to P is a broken reference
```

A must not be converted to B. This distinction is required for genealogy continuity and diagnostics.

## 14. HSC-017 bounded normal load

Fixture:

```text
active = 100
historical = 10_000
```

Normal load/open may validate:

```text
active strict state
historical root/generation/segment manifest
necessary current index metadata
```

It must not require deserializing or validating every Historical Person or every relationship/index entry. Explicit full audit remains allowed to scale with archive size.

## 15. HSC-018 stale-index hot-path fallback

When a kinship rule detects stale/inconsistent adjacency metadata:

```text
bounded keyed canonical lookup available
  -> use it

not available / integrity uncertain
  -> cannot_determine
  -> local action reject
  -> schedule/require maintenance rebuild
```

Forbidden:

```text
scan all relationships ever created inside the weekly rule path
```

## 16. HSC-019 traversal budget exhaustion

Operational safety budgets are not semantic proof of absence.

```text
required cousin frontier not complete
node/time/edge budget reached
no related path found yet
```

Result:

```text
cannot_determine
```

Never `not_related`. UI browsing may truncate the branch but must mark it as not fully checked.

## 17. HSC-020 maintenance generation isolation

Reader A fixes Historical generation G1.

A repair/migration creates G2 and atomically publishes it.

Required:

```text
reader A -> G1 payload + G1 directory/index for entire request
reader B after publish -> G2
no request mixes G1 payload with G2 index/directory
```

Quarantine/integrity cache fingerprints are generation-bound and invalidated/recomputed for G2.

## 18. HSC-021 death-transition crash recovery

Inject process/storage failure after each persistent phase:

```text
archive candidate write
directory update
active hot-set removal
relationship/index/counter update
commit marker/publish
```

Recovery must yield exactly one valid state:

```text
old Current/Active state
OR
new Historical state
```

Never:

```text
Person in both stores
Person in neither store
directory says historical but committed payload does not exist without an integrity diagnostic/recovery decision
double-decrement/double-count
```

## 19. HSC-022 append without prefix scan

With 100,000 immutable historical Event/Result/achievement/relationship records, append one new record.

Required work is bounded by:

```text
new record
current append cursor/sequence
current segment/root metadata
changed index delta
```

Not by re-reading/cloning/re-hashing every old payload. If append metadata itself is corrupt, fail/repair that append path rather than silently scanning the full archive.

## 20. HSC-023 retention expiry classification

If canonical retention policy intentionally expires a detailed record:

```text
availability = not_retained_by_policy
```

UI may show e.g. "詳細記録は保存期間外です". This is not data corruption.

Conversely ancestry/relationship/identity material required for future rules may not be placed under a retention policy that makes a valid kinship decision impossible solely due to normal expiry.

Historical architecture also does not override existing policy by forcing every detailed log to be retained forever.

## 21. HSC-024 supporting-history weekly scaling

Compare identical active/current-week fixtures with:

```text
A: historical relationship/event/result/achievement prefixes small
B: same logical current state + very large immutable prefixes
```

No history query in the week. Required:

```text
whole-prefix clone = 0
whole-prefix full validation = 0
whole-prefix scan for weekly mutation = 0
```

Only current delta and bounded explicitly needed metadata may be touched.

## 22. HSC-025 bounded corruption blast radius

Corrupt one historical segment/chunk while directory/root and other segments remain valid.

Expected:

```text
affected record/section/segment -> unavailable diagnostic
unrelated segments -> still readable
whole archive -> not automatically unavailable
```

A single monolithic container whose local corruption necessarily destroys all historical reads fails this scenario.

## 23. HSC-026 control-plane degraded mode

Corrupt the PersonDirectory/manifest lookup root.

Forbidden:

```text
archive count = 0
all historical persons silently absent
kinship = not_related
```

Required:

```text
historical subsystem = degraded/unavailable
history UI = explicit degraded state
history-dependent rule = cannot_determine
unrelated Current/Active weekly processing continues when independent
repair/rebuild = weekly outside maintenance
```

## 24. HSC-027 allocator integrity

With 10,000 historical PersonIds, corrupt the persistent identity allocation/high-water metadata.

Required:

```text
new Person creation / PersonId allocation -> fail-closed
existing PersonIds unchanged
no scan-all-history to guess next ID
no ID reuse
unrelated non-creation processing may continue
```

## 25. HSC-028 cached-valid bitrot detection

Sequence:

```text
validate Historical fragment -> cache valid with generation/content identity
physical payload changes/bit flips without generation metadata intentionally updated
next access compares content identity
```

Expected:

```text
cache mismatch -> cached valid discarded -> revalidate -> corrupted/missing as appropriate
```

A stale `valid` cache must not mask content change.

## 26. HSC-029 retention tombstone identity continuity

After canonical retention removes a detailed Event/Result payload:

```text
stable record identity/sequence remains non-reusable
availability = not_retained_by_policy
summary/tombstone metadata retained as policy requires
new appended records continue with new IDs/sequences
```

Intentional retention pruning is not corruption and must not cause identifier reuse.

## 27. HSC-030 generation reclamation safety

Reader A opens Historical generation G1. A maintenance cycle publishes G2 and then G3.

Required:

```text
while A is live -> G1 resources needed by A remain readable
A completes     -> G1 may be reclaimed when no other live handle needs it
G2/G3 publish   -> does not mutate G1 bytes
```

The implementation must avoid both use-after-free and unbounded old-generation retention.

## 28. HSC-031 multi-request generation binding

A future genealogy/history page issues page1 on G1 and receives a cursor/read token. Before page2, repair publishes G2.

Allowed:

```text
continue explicitly on still-retained G1
OR
reject old token as stale and restart on G2
```

Forbidden:

```text
page1 from G1 + page2 silently from G2 in one logical traversal
```

## 29. HSC-032 unchanged Current->Historical reference evidence

A living/current Person has parentId=P. The reference was validated against Historical directory generation G1 and has not changed. Later the historical control plane becomes degraded, but this week's ordinary training/battle processing does not need ancestry.

Expected:

```text
normal unrelated weekly processing continues
no recursive parent payload validation
no all-history fallback scan
```

If a marriage/kinship/new-ID capability later needs unavailable historical control data, that capability fails closed.

## 30. HSC-033 rule-specific evidence minimality

Kinship needs directory identity + canonical ancestry edges, not unrelated heavy payload.

```text
ancestor stats = corrupted
ancestor techniques = missing
PersonDirectory/parent_child frontier = complete valid
```

Expected: graph evidence alone may produce `related` or `not_related`. `cannot_determine` is required only when rule-required evidence is incomplete.

## 31. HSC-034 placeholder identity stability

P and Q are two distinct known Historical PersonIds whose display/heavy payloads are unreadable.

Expected: two stable placeholder nodes remain distinct and existing valid edges point to the correct node. A generic label may be the same, but internal identity/topology must not collapse P/Q.

## 32. HSC-035 resumable checkpoint generation binding

Create resumable checkpoint C while Historical generation=G1. Publish G2 later.

Loading C must not silently combine Current(C) with G2 and call it an exact restore. It must use/pin G1 or explicitly enter a migration/degraded/fork path.

## 33. HSC-036 durable generation pin

No live readers remain, but retained save S references G1.

GC/compaction must retain G1 resources needed by S. Once S is deleted/expires and no live reader/pin remains, G1 may be reclaimed.

## 34. HSC-037 old-save continuation identity safety

After save C, later history allocates new PersonIds. Reopen C.

Forbidden: simply restore old allocator high-water in the same logical namespace and reuse IDs that already exist in retained future history.

Allowed: exact old generation restore or explicit fork/branch/namespace semantics that prevent collision.

## 35. HSC-038 unsupported schema classification

Identity fragment is readable, heavy section has an unsupported schema version.

Expected:

```text
identity -> readable
heavy section -> unsupported_schema / migration_required
corruption diagnostic -> no
rule requiring heavy section -> cannot_determine/fail-closed
```

## 36. HSC-039 required historical write while control-plane unavailable

Inject Historical control failure during death transition/posthumous relationship/new-ID allocation.

Expected: transaction does not commit a semantically incomplete success. Required history write + Current mutation remain atomic/rejected according to owner transaction semantics.

## 37. HSC-040 repair non-retroactivity

Repair publishes G2 with corrected ancestry after old gameplay results were committed under G1.

Future queries use G2. Old battle/marriage/birth/result/RNG history is not automatically replayed or deleted. Any retroactive correction is a separate explicit auditable maintenance operation.

## 38. HSC-041 integrity evidence anchoring

Corrupt a fragment and also modify a checksum stored only inside that same unchecked fragment.

The system must not accept the fragment as valid merely because the two self-reported values agree. Validation uses expected identity anchored in separately validated generation/root/checksum metadata.

## 39. HSC-042 relationship index canonical-generation binding

```text
canonical relationship generation = G2
adjacency index generation = G1 / unbound
```

The index cannot prove `not_related`. Exact generation/root consistency must be verified before using index completeness for negative proof.

## 40. HSC-043 same-week post-death exclusion

P is in a week-start active iteration snapshot. An earlier processor commits P's death.

Expected for all later processors in that same week:

```text
training calls for P = 0
state-growth calls for P = 0
person-target weekly events for P = 0
person-origin RNG calls for P = 0
```

Already committed pre-death action is not retroactively erased.

## 41. HSC-044 relationship lifecycle preservation

Create a marriage relation A-B, then end its current-active status by death/divorce.

Expected:

```text
current spouse view may no longer list active spouse
historical genealogy/marriage history still resolves the A-B relation
canonical historical relationship is not hard-deleted or overwritten away
```

## 42. HSC-045 bounded death materialization

P dies after a long lifetime with 100,000 Event/Result/achievement detail records.

Death archive transition must not read/clone/materialize all 100,000 historical details merely to freeze P. It uses the current final Person payload + direct required summary/reference/index delta and leaves existing append-only history in place.

## 43. HSC-046 bounded payload residency

Fixture:

```text
active = 100
historical = 100_000
no genealogy/history query
```

Normal simulation must not require materializing all 100,000 Historical Person payloads into RAM. PersonDirectory/index metadata may scale as required, but heavy payload residency uses lazy loading and a bounded/evictable cache. Eviction does not delete canonical history.

Future instrumentation should expose resident Historical payload count/bytes or equivalent structural proof.

## 44. HSC-047 bounded weekly hash/canonicalization

Fixture:

```text
active = 100
historical = 100_000
historical changes this week = 0
```

Weekly commit/determinism preparation must not deserialize/serialize/full-hash all 100,000 Historical payloads or all archive segments. It may reuse a validated logical Historical root/content identity. Full export/audit remains allowed to scan everything.

## 45. HSC-048 logical determinism across physical maintenance

Take the same logical Historical content and produce a storage-only repack/compaction generation with different segment boundaries/file placement/cache state.

Run the same next-week simulation input from equivalent logical Current+Historical state. Gameplay RNG consumption, canonical ID allocation, training/battle outcomes and deterministic comparison projection must be identical. Storage generation/cursor identity may differ.

## 46. HSC-049 historical semantic provenance

Historical Person P learned TechniqueId T under catalog/version V1. Later V2 changes/removes the current definition.

The history reader must either resolve T through V1-compatible provenance/migration or mark only the technique section unsupported/unavailable. It must not show V2 meaning as if it were P's historical V1 technique. Other P fields remain readable.

## 47. HSC-050 checkpoint publication crash ordering

Inject crash after each phase:

```text
write G2 data
write/validate G2 root + allocator/reference evidence
publish checkpoint C2 manifest
```

A recoverable published C2 must never reference unavailable/non-durable G2. Recovery chooses old valid C1 or complete C2+G2.

## 48. HSC-051 save deletion / pin release crash ordering

Save S pins G1. Delete S and release pin with crash injection around each persistent phase.

Safety rule:

```text
S exists => required G1 remains reclaim-protected
```

An orphan pin after S deletion is a leak/reconciliation issue, not data loss. Dangling live save is forbidden.

## 49. HSC-052 fork roots / shared generation GC

Create branches A/B from checkpoint C/G1. Keep both branch roots, then advance each independently.

GC must retain G1/shared segments while either branch/checkpoint references them. Post-fork allocations must not collide within any namespace that can coexist/export together. Pre-fork PersonIds remain stable identities rather than being rewritten per branch.

## 50. HSC-053 stale display salvage is non-authoritative

Cache a previously validated father displayName, then make current Historical control-plane unavailable.

UI may display the cached name with stale/degraded provenance. A kinship/marriage/ID-allocation rule that requires current authority must not treat that cache as proof of relationship absence/presence or namespace completeness.

## 51. HSC-054 audit / repair separation

Run explicit full audit on a corrupted Historical fragment.

Audit may update advisory diagnostics/quarantine metadata but canonical content/generation must stay unchanged. Only a separately requested repair/migration transaction may publish corrected canonical content.

## 52. HSC-055 temporal relationship history

Fixture:

```text
R1 spouse relation ended
R2 spouse relation current-active
```

Historical genealogy returns both. Current spouse view derives only R2. Corrupt R1 end metadata and confirm R1 lifecycle status is unavailable/localized while R2 and unrelated relationships remain usable.

## 53. HSC-056 stable paging identity under partial reads

Issue Historical page1/cursor in one generation. Corrupt/miss only a displayName fragment for an item that remains logically present.

On re-read within the same generation, the item becomes a placeholder but keeps its PersonId/stable key. Stable tie-break/order/count/cursor progression must not collapse two unknown nodes, duplicate an item or reorder solely because display payload became unavailable.

## 54. HSC-057 bounded malicious decode

Use a Historical record whose independent identity fragment is valid and whose optional heavy fragment declares pathological length/count/compression/depth.

The reader must stop at a configured structural/resource budget and mark only that fragment unavailable/corrupted. The process must not allocate/expand according to attacker/corruption-controlled unbounded sizes. Identity remains readable if independently valid.

## 55. HSC-058 duplicate logical identity conflict

Create two different canonical payloads under the same PersonId P in one logical generation.

No storage-order/last-write winner may become silently canonical. Directory/read diagnostics identify ambiguity; UI can keep P as one stable ambiguous node with partial safe fields only when independently provable. Rule queries depending on conflicting material return cannot_determine and allocator never treats P as reusable.

## 56. HSC-059 semantic dependency retention

P's historical technique section references V1 provenance. Attempt catalog GC while P or a retained checkpoint still needs V1.

GC must keep V1/equivalent provenance or first perform a deterministic migration that changes references consistently. Missing V1 cannot be masked by resolving the same TechniqueId against V2.

## 57. HSC-060 maintenance/gameplay publish race

Start maintenance from G1. Before it publishes, commit a legitimate Historical write D and advance canonical root to G1a.

Maintenance publish based on stale G1 must fail CAS/serialization or rebase to include D. A successful maintenance result that omits D is a lost-update failure.

## 58. HSC-061 checkpoint concurrent capture

Inject save capture around:

```text
weekly current-state commit
Historical maintenance generation publish
history-dependent death/relationship commit
```

Each persisted checkpoint resolves to one committed Current+Historical+allocator/reference tuple. Mixed before/after components and uncommitted History are rejected/retried, not published as normal save.

## 59. HSC-062 orphan segment non-authority

Write a new copy-on-write segment then crash before root/manifest publication.

Normal load follows trusted root reachability and ignores the orphan as logical history. Recovery/GC may discover and remove it, but file presence alone never creates PersonDirectory entries or resurrects Event/Relationship records.

## 60. Scenario verdict

```text
HSC rows = 62
known semantic ambiguity after scenario pass = 0
current UI-001..010 scope expansion required = 0
future HIST implementation tests materialized = 62
```
