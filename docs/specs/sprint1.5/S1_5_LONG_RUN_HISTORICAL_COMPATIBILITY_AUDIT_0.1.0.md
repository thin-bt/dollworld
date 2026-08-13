# Sprint 1.5 Long-Run Historical Compatibility Audit

- Document ID: `S1.5-LONG-RUN-HISTORICAL-COMPATIBILITY-AUDIT`
- Version: `0.1.0`
- Target package: `S1.5-SPEC-0.1.14` R12 preparation
- Architecture authority: `S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`

## 1. Verdict

```text
new long-run requirements reviewed = 8 groups
existing direct conflicts found = 5
existing ambiguity/gap found = 7
scenario edge hardening found = 8
second deep-pass latent gaps found = 10
third deep-pass control-plane/integrity gaps found = 5
fourth deep-pass read-lifecycle gaps found = 3
fifth deep-pass checkpoint/rule/write gaps found = 14
resolved in R11 preparation = 52
sixth deep-pass hashing/durability/provenance gaps found = 10
resolved in R12 preparation = 62
seventh deep-pass hostile-decode/concurrent-publish gaps found = 6
resolved in R12 final = 68
open semantic blocker for current UI-001..010 = 0
historical archive physical implementation required in UI-001..010 = no
```

The architecture is normative for Sprint 1.5+ compatibility, but the physical archive subsystem is not added to the current simple-UI task chain.

## 2. Direct conflicts found and resolution

| CA | Existing contract/problem | Conflict | R9 resolution |
|---|---|---|---|
| CA-001 | §7.3 + TX-064 + FI-039/040: one broken relationship => whole PersonDetail 500 | Historical partial degradation requires readable parent/name/sections to survive unrelated corruption | Narrow whole-detail 500 to current/active monolithic 0.2.0 path; Historical reader must use HIST-025..035 and a future versioned wire contract |
| CA-002 | §6F.4: statHistory corruption => whole PersonDetail 500 | A historical stats section failure must not suppress readable identity/relationship data | Keep strict behavior for current 0.2.0 active path only; Historical section-level unavailable is future versioned behavior |
| CA-003 | §5B: `deep immutable clone/reference-safe snapshot` could be read as clone every historical Person | 1000-year archive would make GET/weekly snapshots O(all historical) | Explicitly allow immutable historical generation handle/read token; prohibit full archive clone for normal GET/weekly |
| CA-004 | §6A personCount says all canonical Person collection count | Could force materializing/scanning all historical Persons per summary GET | Redefine logical count as active+historical; maintained validated counter/PersonDirectory count allowed; full payload scan forbidden for normal GET |
| CA-005 | Person/relationship strict current DTO rules could become future archive storage rules by accident | Would force immutable Person to contain mutable reverse lists or all-or-nothing decode | State explicitly that 0.2.0 wire schema is not Historical persistence/read schema; relationship adjacency index is acceleration outside immutable payload |

## 3. Gaps found and filled

| CA | Gap | R9 contract |
|---|---|---|
| CA-006 | No explicit death transition/hot-set removal boundary | HIST-003..008 |
| CA-007 | No global active/historical PersonId directory/index boundary | HIST-009..016 |
| CA-008 | No historical validation cadence / quarantine model | HIST-017..024 |
| CA-009 | No field-level partial corruption semantics | HIST-025..030 |
| CA-010 | No fail-closed kinship result for incomplete ancestry | HIST-031..036 |
| CA-011 | No structural performance invariant separating weekly cost from archive size | HIST-037..043 |
| CA-012 | Historical Event/Result/achievement prefixes not covered by the Person-only idea | HIST-045..048 |

## 3A. Scenario hardening

`S1_5_LONG_RUN_HISTORICAL_SCENARIO_AUDIT_0.1.0.md`で追加edge caseを逆監査し、次をHIST-049～053へ固定した。

| CA | Latent edge gap | Resolution |
|---|---|---|
| CA-013 | derived adjacency index自体が壊れたとき、それをsemantic truthとして誤判定し得る | indexはrebuildable acceleration。canonical relationがauthority |
| CA-014 | quarantine/integrity cache corruptionがvalid payloadを永久隔離し得る | cacheはadvisory。fingerprint/version不整合時は破棄/revalidate可能 |
| CA-015 | Person-level `corrupted`が読めるfieldまで全部隠す恐れ | coarse stateでも独立valid field/sectionはsalvage |
| CA-016 | corrupt genealogy cycleで無限再帰/stack overflow | visited-set + bounded depth + branch-local diagnostic |
| CA-017 | stale/incomplete indexだけで`not_related`を証明する恐れ | valid/repaired indexまたはcanonical traversalが必要。不整合はcannot_determine |
| CA-018 | death transition strict validationが全祖先archive再validationへ膨張する恐れ | 新規freeze対象 + transaction直接変更record/indexへbounded |
| CA-019 | Current strict validatorがhistorical reference payloadを毎週recursive validationする恐れ | active invariant strict / historical completenessはrule query時だけ |
| CA-020 | weekly simulationは軽くてもautosaveがimmutable archive全件rewriteしてO(history)化する恐れ | normal persistenceはdelta/new record中心、full export/compactionは別operation |

## 3B. Second deep-pass hardening

R9完成後にさらに「物理実装が別経路で要件を破れるか」を逆監査し、次の10 gapをHIST-057～068 / HSC-015～024へ固定した。

| CA | Latent gap | R10 resolution |
|---|---|---|
| CA-021 | partial readを要求しているのに、全fieldを1個のall-or-nothing blobへ保存して1 section corruptionで全Personを失える | identity/routingとheavy/optional sectionsを独立decode/integrity-check可能にできるminimum storage framingを要求 |
| CA-022 | PersonDirectoryの「PersonId自体が未知」と「known Historical Personだがpayload missing」を同じmissingで潰せる | directory location=`active/historical/absent`とpayload integrity=`missing/corrupted/...`を分離 |
| CA-023 | normal loadでpayloadはscanしなくても全Historical index entryを毎回deserialize/validateしてO(history)化できる | root/generation/segment manifest + necessary metadataへboundedし、full per-entry scanはexplicit auditへ分離 |
| CA-024 | stale adjacency index fallbackとしてweekly中にcanonical relationship全件scanできる | bounded keyed canonical lookupがなければcannot_determine + maintenance rebuild。hot-path full scan禁止 |
| CA-025 | safety traversal budgetに達しただけで「pathなし」としてnot_relatedを返せる | required frontier未完了のbudget exhaustionはcannot_determine |
| CA-026 | repair/migrationが既存Historical bytesをin-place変更し、open中read snapshotが世代混在し得る | copy-on-write/new generation + atomic publish + old read handle isolation |
| CA-027 | logical death transitionはatomicでもpersistent crashでactive/historical二重・消失half-stateを残し得る | crash-recoverable logical transactionを要求 |
| CA-028 | Event/Result/relationship appendでnext sequence/root計算のためold historical prefix全件scan/cloneし得る | maintained append cursor/segment metadata、prefix全scanなし |
| CA-029 | canonical retentionで正常に期限切れした詳細履歴をmissing/corruptedと誤診断、またはHistorical化を理由に全詳細を永久保持し得る | `not_retained_by_policy`を分離し、既存retention尊重。rule-critical ancestry/relationshipはexpiry禁止 |
| CA-030 | Personだけhot pathから外してもrelationship/Event/Result/achievement prefixを毎週whole-clone/full-validateし得る | supporting historical prefixもweekly wholesale clone/validation禁止 |

## 3C. Third deep-pass control-plane / integrity hardening

R10 second-pass後、archive control-planeとlong-term bitrot/identity continuityをさらに逆監査した。

| CA | Latent gap | R10 resolution |
|---|---|---|
| CA-031 | 1 segment/chunk corruptionが単一巨大container設計により全history不可読へ波及し得る | corruption blast radiusをrecord/section/segmentへbounded化し、unrelated segmentsを継続参照可能にする |
| CA-032 | PersonDirectory/manifest root破損を「archive empty」と誤補正し、血縁なし/履歴0件にできる | historical subsystem degraded/unavailable state。history ruleはcannot_determine、unrelated active processingは可能なら継続 |
| CA-033 | PersonId再利用防止のため新人物作成ごとにHistorical PersonId全scanするか、allocator破損時にID再利用し得る | strict allocation/high-water stateを維持。integrity不明ならID allocationだけfail-closed |
| CA-034 | quarantine cacheが`valid`になった後のbitrot/外部変更を見逃し得る | cacheをgeneration + content identity/hash/fingerprintへbindし、変化時revalidate |
| CA-035 | retention削除後にEventId/sequence/Result identityを再利用し得る | tombstone/summary availability metadataでlogical identity continuityを保持し、pruned IDs/sequencesを再利用しない |

## 3D. Fourth deep-pass read lifecycle hardening

control-plane degraded modeとgeneration repairを同時に考えると、さらに3 gapが残る。

| CA | Latent gap | R10 resolution |
|---|---|---|
| CA-036 | old readerを保護するためold generationを永遠に残しmemory/disk leak、または早期削除でuse-after-free | live handleがある間だけretainし、終了後refcount/lease等で安全reclaim |
| CA-037 | Historical pagination/tree traversal中にrepair generationが切替わり、page間で新旧dataが混在 | cursor/read tokenをHistorical generationへbind。old generation継続またはSTALE/restart |
| CA-038 | Current strict validationが「historical control-plane degraded」を理由に変更されていない親参照を毎週再解決し、unrelated weeklyを停止 | validated directory-generation/reference evidenceを再利用し、history-dependent capabilityだけfail-closed |

## 3E. Fifth deep-pass checkpoint / rule-dependency / write-consistency hardening

R10再監査で、partial corruptionの局所化をrule queryへ正しく適用する境界と、save/checkpoint世代整合・durable GC・history-dependent write semanticsに14 gapを確認した。

| CA | Latent gap | R11 resolution |
|---|---|---|
| CA-039 | stats等のrule無関係payload corruptionだけでkinshipまでcannot_determineへ落ち得る | rule-specific dependency setを固定。valid directory/relationship frontierが完全ならheavy payload missing/corruptでもrelated/not_related可能 |
| CA-040 | unreadable Personを全て同じ「不明な人物」nodeへcollapseしgraph topologyを失い得る | placeholderはknown PersonId/stable node identityを保持 |
| CA-041 | Current save/checkpointとHistorical generationの対応が未固定で、old Current + latest Historyを混ぜ得る | resumable checkpointへhistorical generation/root + allocation/reference evidenceをbind |
| CA-042 | old generation GCがlive readerだけを見て、retained saveが必要なgenerationを削除し得る | durable save/checkpoint/backup pinをreclamation条件へ追加 |
| CA-043 | old save再開でallocatorだけ巻戻し、future historyに存在するIDを再利用し得る | exact generation restoreまたはexplicit fork/namespaceでcollision防止 |
| CA-044 | unknown/old schema versionをcorruption扱いし得る | unsupported_schema / migration_requiredをintegrityと分離しpartial salvage |
| CA-045 | Historical control degraded時にdeath等をhistory write欠落のまま成功commitし得る | history-dependent mutationは必要authorityがなければatomic fail-closed |
| CA-046 | repairが過去gameplayを暗黙にrollback/replayし得る | maintenance generation publishはfuture readへ反映、retroactive gameplay correctionは別explicit workflow |
| CA-047 | payload内自己申告hashだけで同payloadをvalid判定し、corruptionを見逃し得る | integrity evidenceをvalidated manifest/root等の外部trust chainへanchor |
| CA-048 | stale adjacency indexのgenerationがcanonical relationshipと不一致でもnegative proofへ使い得る | indexをcanonical relationship generation/rootへbindし、不一致はstale/cannot_determine |
| CA-049 | week-start active listに死亡者が残り、death commit後も同週training/RNGを実行し得る | death effective boundary後のpost-death processor/actionを禁止 |
| CA-050 | marriage等のcurrent relation終了時にcanonical relationをdelete/overwriteして過去婚姻を失い得る | current-active viewとhistorical lifecycleを分離し、過去relationship historyを保持 |
| CA-051 | death archive作成時にその人物の全生涯Event/Resultをmaterialize/cloneし得る | freeze対象をcurrent final payload + direct metadata/index deltaへboundedしappend history全scan禁止 |
| CA-052 | weekly CPUは軽くても全Historical payloadをRAM常駐してmemoryがO(all history)になり得る | heavy Historical payloadはlazy/on-demand + bounded evictable cache。normal runtimeのpayload residencyをall-history必須にしない |

## 3F. Sixth deep-pass hashing / durability / provenance hardening

R11再監査で、weekly processor外しだけでは長期costを保証できない経路と、save durability・semantic provenance・UI cache authorityに10 gapを確認した。

| CA | Latent gap | R12 resolution |
|---|---|---|
| CA-053 | weekly state hash/canonicalizationがarchive全件をserialize/hashしてO(all history)へ戻り得る | unchanged Historical logical root/content identityをreuseし、normal weekly hash/canonicalizationをchanged deltaへbounded |
| CA-054 | compaction/cache/segment layoutのphysical差がgame determinismへ混入し得る | logical history identityとphysical storage generationを分離。logical同一ならgame RNG/outcome/ID allocation不変 |
| CA-055 | old TechniqueId等をlatest catalog意味で誤解釈し得る | versioned catalog/definition provenanceまたはmigration mappingへbindし、無言reinterpret禁止 |
| CA-056 | checkpoint manifestが参照historyより先にpublishされcrashでdangling saveを作り得る | referenced history/root/allocation evidence durable後にcheckpoint publish |
| CA-057 | save deletionとpin release crashでlive saveが必要generationを失い得る | live save保護優先のcrash-safe release。余分なpin leakは可、dangling saveは禁止 |
| CA-058 | fork/branch rootをGC referenceへ含めずshared generationを削除し得る | retained branch/timeline rootもdurable GC root、post-fork ID namespace safety維持 |
| CA-059 | degraded時のlast-known UI cacheをrule authorityへ流用し得る | stale UI salvageとrule/current authorityを分離 |
| CA-060 | full auditが自動repairしcanonical historyを暗黙変更し得る | audit read-only by default、repairは別explicit maintenance |
| CA-061 | relationship historyを保持してもstart/end temporal semantics不整合でcurrent spouse viewが壊れ得る | lifecycle temporal evidence + derivable current-active view、局所corruption |
| CA-062 | missing display payloadでHistorical list/tree identity/orderがcollapse/reorderし得る | stable PersonId/relationship identity + stable fallback tie-breakでpartial-read中もquery identity/order維持 |

## 3G. Seventh deep-pass hostile decode / concurrent publication hardening

R12の追加再監査で、local corruptionをprocess crashへ変換し得るdecode resource問題と、maintenance/save並行性に6 gapを確認した。

| CA | Latent gap | R12 resolution |
|---|---|---|
| CA-063 | corrupt length/compression/countで1 record accessがOOM/CPU爆発しlocal degradationを破る | Historical decodeへsection/schema別resource budget。limit超過はfragment-local corruption |
| CA-064 | duplicate PersonId等をstorage-order last-write-winsで選びruleを誤判定し得る | exact duplicate以外をidentity conflict/ambiguousとして扱い、rule-requiredならcannot_determine |
| CA-065 | Historical semantic catalog provenanceをrecordより先にGCし意味復元不能 | referenced definition/catalog/mappingをretainまたはdeterministic migration完了後にGC |
| CA-066 | repair/compaction publishが並行death/relationship appendを上書きしlost update | base generation CAS/serialization/rebaseでstale publishを拒否 |
| CA-067 | checkpoint capture中のweekly/maintenance commitでCurrent/History世代が混在 | one committed boundary capture。before/after mixはretry/reject |
| CA-068 | crashで残ったunpublished segmentをfile scanでlogical historyとして復活 | root/manifest reachabilityのみauthority。orphan bytesはnon-authoritative |

## 4. Important design decisions

### 4.1 Historical Person is a lifecycle/storage role, not a lossy mini-person

Do not replace a deceased Person with only:

```text
name + parent IDs + dates
```

as the sole retained record.

Future genealogy/history UI may need:

```text
stats
aptitudes
techniques
style/school
master/disciple
battle records
marriage
family/lineage
achievements
```

Canonical or reconstructible history must remain available.

### 4.2 Reverse links do not belong as mandatory mutable fields on immutable Historical Person

`childIds` is the clearest example.

A child may be linked after the parent's death (e.g. posthumous birth timing). If `childIds` were the only truth inside an immutable Historical Person, the system would have to mutate the archive.

Therefore:

```text
canonical relationship records = authority
adjacency indexes = mutable/transactional acceleration
Historical Person payload = immutable
```

### 4.3 Partial readability is field/section based

Example:

```text
father relationship edge valid
father.displayName valid
father.stats corrupt
```

Required user-visible result:

```text
father name shown
stats section placeholder
family tree continues
no whole-page error
```

This does not mean arbitrary byte-level salvage from an undecodable file is guaranteed. It means independently decoded/validated data must not be discarded merely because another section fails.

### 4.4 Rule queries and display queries are deliberately different

Display may degrade:

```text
unavailable / unknown placeholder
```

Rule evaluation may not guess:

```text
related
not_related
cannot_determine
```

If the bounded relevant ancestry frontier is incomplete, `not_related` is illegal.

### 4.5 `cannot_determine` is local fail-closed, not global crash

A marriage/eligibility action depending on damaged ancestry is refused without treating the ancestor as absent.

Unrelated weekly processing continues.

### 4.6 Logical existence and payload availability are separate

A `PersonId` may remain a known historical person even if one payload/chunk is missing.

```text
PersonDirectory[P] = historical
payload integrity  = missing
```

is not the same as:

```text
PersonDirectory[P] = absent
```

This prevents a broken file from erasing the person's genealogical existence.

### 4.7 Retention expiry is not corruption

Historical architecture does not override canonical retention policy. A detailed record intentionally removed by policy is `not_retained_by_policy`, not `missing/corrupted`.

Rule-critical identity/ancestry/relationship material must remain retained as long as future game rules can depend on it.

### 4.8 Maintenance is generation-based

Repair/migration publishes a new historical generation instead of mutating bytes already visible through an open read handle. This is required for stable genealogy/history reads and cached integrity evidence.

### 4.9 Historical control-plane degradation is capability-scoped

A corrupt directory/manifest root is more serious than one Person record, but it still must not be silently interpreted as an empty world. Historical capabilities become degraded/unavailable, history-dependent actions fail closed, and unrelated Current processing may continue where independent.

Identity allocation is one such dependent capability: if global PersonId allocation state cannot be trusted, creation is blocked rather than scanning the entire archive or reusing an ID.

### 4.10 Read generations have a lifecycle

Generation isolation alone is insufficient. Old generations must stay alive while readers use them, then become reclaimable. Multi-request Historical cursors/tokens must either remain bound to a retained generation or be rejected as stale after publish; they may not silently switch generations.

Unchanged Current->Historical references may use validated generation-bound reference evidence so ordinary weekly validation does not re-resolve ancient history every week.

## 5. Current Sprint 1.5 scope boundary

The current UI-001..010 implementation remains a simple simulation UI and does not need to build:

- Historical database/storage format
- genealogy page
- quarantine UI
- integrity repair tool
- migration tool
- long-run benchmark harness

However it must not create incompatible assumptions such as:

- hard-delete deceased Persons
- reuse PersonId
- clone all history into every UiReadSnapshot
- compute summary counts by scanning all archived payloads
- make mutable reverse references part of immutable Historical Person truth
- define historical corruption as permanently whole-detail 500
- interpret missing/corrupt ancestry as no relation
- require all-or-nothing historical blob decoding
- perform hot-path full-history fallback scans when an index is stale
- classify policy-expired records as corruption
- in-place repair a Historical generation visible to open readers
- treat Historical control-plane corruption as empty archive
- scan all archived PersonIds to guess next PersonId during normal creation
- trust cached-valid data after content identity changes
- reuse Event/Result IDs or sequence after retention pruning
- reclaim an old Historical generation while a live reader still uses it, or retain old generations forever
- mix Historical generations across paging/tree requests
- force unchanged Current->Historical references to re-resolve/full-validate every weekly step

## 6. Future implementation ordering recommendation

```text
HIST-ARCH-001 storage/directory/death-transition/crash recovery
-> HIST-ARCH-002 relationship keyed lookup + adjacency + kinship tri-state
-> HIST-ARCH-003 historical framing/integrity/lazy validation/quarantine
-> HIST-ARCH-004 generation-based repair + incremental persistence/append
-> HIST-ARCH-005 partial historical read API/UI
-> HIST-ARCH-006 long-run instrumentation + 1000-year benchmark
```

Exact Sprint/task numbers are intentionally not assigned here.

## 7. Compatibility result

```text
Current Sprint 1.5 UI schema version bump required now = no
Current API 0.2.0 exact25 modified = no
Historical partial-read API version required when archive feature lands = yes
Current UI-001..010 new production scope = none
Long-run architecture constraints fixed now = HIST-001..106
```
