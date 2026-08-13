# Sprint 1.5+ Long-Run Historical Person Architecture

- Document ID: `S1.5-LONG-RUN-HISTORICAL-PERSON-ARCHITECTURE`
- Version: `0.1.0`
- Scope: Sprint 1.5以降 / 1000年級long-run compatibility
- Status: normative architecture boundary; exact persistence schema deferred, minimum long-run framing/integrity properties fixed

## 1. Goal

死亡済み人物を削除せず、家系図・血縁・婚姻・師弟・実績等のhistoryとして保持しながら、通常weekly simulation costを過去全Person総数から切り離す。

```text
weekly hot path cost ~ active/living persons + current-week delta + explicitly touched bounded history frontier
NOT ~ all persons ever existed
```

このdocumentは「死亡者を情報量の少ない別Personへ捨てる」ことを要求しない。Historical Personはlifecycle/storage roleであり、将来表示に必要な情報を保持できる。

## 2. Current / Historical responsibility split

### Current / Active

- simulation進行対象
- strict validation
- weekly mutation/RNG/event対象になり得る
- corruptionがcurrent invariantを壊す場合はsimulation/該当transactionを止め得る

### Historical

- 基本immutable
- normal weekly hot path対象外
- lazy validation可能
- corruptionは局所化
- UIはfield/section単位で可能な限り表示継続
- rule queryではmissing/corruptionを「関係なし」と解釈しない

## 3. Death transition

概念的transition:

```text
validated Current Person
  -> freeze historical payload
  -> active hot-set membership remove
  -> historical directory membership add
  -> relationship/index/counter update
  -> atomic commit
```

payload freeze後も、別人物の出生等により新しいrelationship edgeが追加される可能性がある。そのためreverse link indexをHistorical Person payload内のmutable childIds/spouseIdsとして正本化しない。

death transitionのstrict validationは「全祖先archiveを再検証する」という意味ではない。新規freeze対象Personと、そのtransactionで直接変更するdirectory/relationship/index/counterの整合へboundedする。既存Historical payloadはHIST-018/055によりrecursive full revalidationしない。

## 4. Relationship / genealogy indexing

`fatherId` / `motherId` / `spouseIds` / `childIds`は検索形として有用だが、現行canonical `parent_child`等と二重正本を作らない。

推奨:

```text
canonical relationship records = semantic authority
adjacency indexes              = validated derived acceleration structure
```

必要index例:

```text
parentIdsByChild
childIdsByParent
spouseIdsByPerson
masterIdsByDisciple
discipleIdsByMaster
```

## 5. Historical integrity / quarantine semantics

保存schemaの具体形は未確定だが、**logical person existence / physical payload availability / integrity**を混同しない。

PersonDirectoryのlocationは概念上:

```text
active
historical
absent
```

を区別する。

- `historical`: logical PersonIdは世界に存在する。payloadの一部/全部が壊れていてもPerson自体を不存在へ落とさない。
- `absent`: logical PersonDirectoryにそのPersonIdが存在しない。relationshipがこのIDを参照するならbroken reference。

Historical payload/section integrityは概念上:

```text
unchecked
valid
corrupted
missing
```

を区別する。ここで`missing`は**known historical Person/sectionのexpected payloadが予期せず欠けている**状態。PersonDirectoryの`absent`とは別。

さらにcanonical retention policyにより意図的に保持対象外となった詳細履歴は:

```text
not_retained_by_policy
```

として`missing/corrupted`と区別する。保存期間外をデータ破損として扱わない。

この状態をHistorical Person payloadに直接書き込む必要はなく、integrity/quarantine/availability metadata等の別metadataでよい。record-level coarse stateだけでなくsection/fragment単位のdiagnosticを保持できる設計にする。


schema/decoder compatibilityはintegrityと別軸で扱う。

```text
supported
migration_required
unsupported_schema
```

等の概念状態を持てるようにし、decoderが理解できないversionを`corrupted`へ偽装しない。独立decode可能なidentity/routing fragmentが読めるなら、unsupported heavy sectionがあってもそのidentityは利用可能。rule-required fragmentがunsupportedなら`cannot_determine`相当でfail-closedする。

### 5A. Partial-readを成立させるminimum physical boundary

exact DB/table/file/chunk形式は後続taskで選べるが、partial degradation要件を無効化する物理形式は選べない。

少なくとも:

```text
identity / routing material
heavy mutable-at-life sections (stats/techniques/history summaries etc.)
optional large historical sections
```

を**独立decode/integrity-check可能なframing**へできる必要がある。

例えばstats sectionの1-byte corruptionで、別に正常な`personId` / `displayName` / relationship routing materialまで必ずdecode不能になる単一all-or-nothing blobだけを唯一保存形式にする設計は禁止。

これは「壊れた任意byte列から魔法のように復元する」要求ではない。**正常に独立保存・decodeできるfragmentを、他fragmentのfailureだけで捨てないためのstorage boundary**である。

### 5B. Historical control-plane failure is not an empty archive

PersonDirectory root / segment manifest / lookup index root等のcontrol metadataがcorruptな場合、archiveを「0件」「全員missing」と解釈しない。

概念的に:

```text
historical subsystem availability = degraded/unavailable
```

とし、家系/履歴UIは利用不能範囲を明示、history-dependent ruleは`cannot_determine`、unrelated Current/Active weekly processingはそのcontrol metadataを必要としない限り継続可能にする。

ただしPersonId新規割当等、global historical namespaceの安全性へ依存するoperationは、必要control metadataを検証できなければ個別にfail-closedする。

## 6. Partial read / UI degradation

Historical readerはfull-object strict decode成功だけを表示条件にしない。独立validation可能なfield/sectionは個別に利用できる。

例:

```text
father relationship edge = valid
father.displayName        = valid
father.stats              = corrupted

=> 父名は表示
=> 能力欄だけ「履歴データを読み取れません」
=> PersonDetail/家系図全体をerrorにしない
```

完全に読めないPersonは「不明な人物」placeholderでgraph nodeを維持できる。

このpartial-read表現のwire/persistence schemaは将来API versionで確定し、現0.2.0 exact25へ場当たり的optional fieldを追加しない。

## 7. Rule query fail-closed semantics

血縁rule queryは三値:

```text
related
not_related
cannot_determine
```

判定規則:

1. valid pathで対象血縁を証明できれば`related`。
2. **そのruleが必要とするevidenceだけ**でbounded frontierを完全に探索でき、対象pathがなければ`not_related`。
3. rule-required directory/relationship/identity evidenceがmissing/corrupted/unsupportedで否定を安全に証明できなければ`cannot_determine`。

重要:

- kinshipが必要としないstats/techniques/display sectionのcorruptionだけで`cannot_determine`へ落とさない。
- known Historical Personのheavy payload全体がmissingでも、PersonDirectory identity + canonical parent_child edge frontierがvalid/completedなら、そのgraph evidenceだけで`related/not_related`を判定してよい。
- 逆にrule-required edge/identity completenessが不明なら、payloadの別fieldが読めても`not_related`へは進めない。

`cannot_determine`は「血縁なし」ではない。婚姻等のその個別処理をfail-closedし、無関係なsimulationは継続する。

## 8. Validation cadence

```text
death transition      -> strict archive validation
normal weekly step    -> historical full validationなし
normal save/load      -> active strict + historical root/generation/segment manifest + 必要index metadata validation
historical access     -> unknown/needed record/sectionをlazy validation可
explicit full audit   -> archive全件validation可
migration/repair      -> weekly外maintenance transaction / new historical generation publish
```

normal loadで`Historical Person 10,000件`を1件ずつdeserialize/validateすることや、全relationship/index entryを毎回full-scanすることを必須にしない。segmented manifest/root hash/generation metadata等でcoarse integrityを確認し、payload/entryの詳細validationは必要時またはfull auditへ遅延できる。

Historical root/control-plane validationが失敗しても、Active stateを独立にstrict loadできるならworld全体を「履歴0件」として正常扱いしたり即座に全payload scanへ逃げたりしない。Historical subsystemをdegraded/unavailableとして開き、history-dependent capabilityだけをfail-closedできる。

## 9. Performance instrumentation target

将来long-run performance acceptanceではwall-clockだけでなく構造counterを持つ。最低候補:

```text
activePersonVisits
historicalPersonPayloadVisits
historicalPersonPayloadClones
historicalFullValidations
historicalRuleQueryVisitedNodes
deathTransitions
```

通常history queryなしの週は:

```text
historicalPersonPayloadVisits = 0
historicalPersonPayloadClones = 0
historicalFullValidations = 0
```

を目標ではなくacceptance可能なarchitecture invariantとする。

normal autosave/checkpointも同じ目的を持ち、immutable archive全体を毎週rewriteせずdelta/new archive record中心で永続化できる構造とする（HIST-056）。


## 9A. Resumable checkpoint / generation consistency

再開可能save/checkpointはCurrent stateだけを単独保存せず、最低限:

```text
historicalGenerationId / root identity
Person/Relationship/Event allocation namespace state
Current state generation/reference evidence
```

を同一logical checkpointとしてbindする。

load時にCurrent checkpoint Cと、Cが参照していない新旧別Historical generationを無言で組み合わせない。対応generationが利用不能なら、そのsaveはhistory capability degradedとして通常継続できる範囲を明示するか、rule/write capabilityをfail-closedする。**最新版historyを勝手に接続して正常restore扱いしない。**

old Historical generationのreclaim条件はlive requestだけではない。retained save/checkpoint/backupが参照するgeneration/segmentはdurable pinとして扱い、それらの保存物が有効な間はreclaimしない。save削除/retention expiry等でdurable pinが消え、live readerもいなくなって初めて安全に回収できる。

古いsaveを再開する場合、post-save future historyを同じworldへ無言attachしない。後続future generationに既に存在するPersonId等と衝突し得るstorageでcontinuationするなら、exact historical generationを復元するか、明示fork/branch namespace等でID衝突を防ぐ。allocatorを単純に古いhigh-waterへ巻き戻して既存logical IDを再利用しない。

## 9B. History-dependent write fail-closed boundary

Historical control-planeがdegradedでも無関係なCurrent weekly処理は継続できるが、**Historical consistencyへ書込み依存するtransaction**は別。

例:

```text
death transition archive commit
posthumous parent_child append
kinship判定を前提にするmarriage commit
new PersonId allocation
```

必要directory/generation/allocation/relationship authorityを検証できなければ、その個別transactionをatomicに拒否/rollbackする。死亡を「archiveへ書けないのでaliveのまま成功扱い」、出生を「parent relationなしで成功扱い」等へ変換しない。

既存weekly transactionが1週atomicなら、その週の該当commit boundaryで既存failure semanticsに従う。local degradationは**rule/history非依存処理まで常時停止させない**という意味であり、必要history writeを欠落させて成功させる意味ではない。

## 9C. Maintenance correction does not silently rewrite committed gameplay

Historical repair/admin correctionでnew generationをpublishしても、それだけで過去にcommit済みの:

```text
battle result
marriage/birth/death event
RNG history
achievement/result
```

を自動巻戻し・再実行しない。future read/rule queryはnew generationを使うが、retroactive gameplay correctionが必要なら別の明示maintenance/migration workflowとしてaudit可能に行う。

## 9D. Integrity evidence trust boundary

fragment hash/fingerprint/length等でbitrotを検出する場合、**検証対象fragment自身の未検証内容だけを使って自分自身をvalid判定しない**。

expected content identityは、別に検証されたgeneration manifest/root/checksum metadata等から辿れるか、同等のtrusted validation chainへanchorする。exact hash algorithm/layoutはdeferredだが、`payload + payload内の書換え可能なhash`だけを同じunchecked sourceとして比較してvalidにする構造は禁止。

## 9E. Death effective boundary inside a week

death transitionがcommitされた時点以後、そのPersonを同じweekの後続processor/action queueへ残して:

```text
training
state growth
person-target weekly event
person-origin RNG
```

を実行しない。deathより前に既にcommit済みの同週actionを遡及取消する必要はないが、**death transition自身がcommitするdeath event/recordを除き、death commit後のpost-death mutation/RNG/person-week-eventは禁止**。processorがweek-start active listをsnapshotする場合も、execution時にlifecycle/hot-set membershipを再確認できる構造にする。

## 9F. Hot-path hash / canonicalization boundary

Historical payloadをweekly processorから外しても、weekly commit/hash/determinism用canonicalizationがarchive全件をserialize/hashするならlong-run costは結局`O(all history)`へ戻る。

normal weekly mutation/read validationでHistorical全payloadをflatten/canonical JSON化/full hashしない。Current stateがHistorical subsystemを表す必要がある場合は、validated logical Historical root/content identity・generation-bound metadata・incrementally maintained digest等の**bounded representation**を参照できる。

```text
allowed:
  current delta + changed historical segment/root update
  unchanged historical logical root identity reuse

forbidden:
  every week serialize 100,000 historical payloads
  every week recompute archive root by scanning all segments
```

explicit full export/full audit/one-time migrationは全件処理してよいが、normal weekly transactionの必須処理へしない。

## 9G. Logical history identity vs physical storage identity

compaction/repacking/cache eviction/read-cache hit率等、**logical Historical contentを変えないstorage maintenance**だけでgameplay決定性を変えてはならない。

区別する:

```text
logicalHistoryIdentity
  -> Person/Relationship/Event/Result等のcanonical logical content

physicalHistoricalGeneration
  -> segment layout / packing / file/chunk placement / storage generation
```

physical generationはreader/cursor/GC整合には利用できるが、logical content不変のcompactionだけを理由に:

- game RNG consumption
- battle/training outcome
- PersonId/MatchId等のcanonical allocation
- deterministic simulation comparison result

を変えない。

repairでlogical ancestry等を実際に修正した場合はfuture rule resultが変わり得るが、HIST-084どおりpast committed gameplayを暗黙replayしない。

## 9H. Historical semantic dependency / catalog provenance

Historical Person payloadを非lossyに保持しても、`TechniqueId`等のIDが将来別意味へ変更・削除されると当時の情報を誤表示し得る。

Historical fieldの意味解釈に外部definition/catalog/rule taxonomyが必要な場合、次のいずれかで当時の意味へbindできるようにする。

- stable immutable definition ID + backward-compatible definition history
- versioned catalog/snapshot identity
- deterministic migration mapping
- equivalent provenance reference

対象例:

```text
TechniqueId / technique category/range/traits
rank/tournament/battle kind definition
affiliation/style/school taxonomy
schema enum whose semantics may evolve
```

latest catalogを無条件に当ててold historyを別意味へreinterpretしない。必要definitionがretained policy上存在すべきなのにmissing/corruptedなら該当field/sectionをunavailableにし、rule-requiredならcannot_determine/fail-closed。unsupported versionはHIST-082どおりcorruptionとは区別する。

## 9I. Checkpoint publication / durable pin crash boundary

resumable checkpointはlogical bindだけでなく**publish ordering**もdangling referenceを作らない。

新checkpoint CがHistorical generation/root Gを参照する場合、Cを「利用可能」とpublishする前にGと必要allocator/reference evidenceがdurable/validatedであることを保証する。crash後は:

```text
old checkpoint remains valid
OR
new checkpoint + referenced historical state is complete
```

のどちらかであり、published checkpointだけ残って参照Gが未永続/欠落というhalf-stateを正常saveとして扱わない。

save/checkpoint/backupを削除・retention expiryするときも、durable pin解除とsave metadata削除のcrash orderでlive saveがdanglingしない。crash時に安全側でpinが余分に残る一時leakは許容できるが、saveが残るのに必要generationをreclaimする順序は禁止。

explicit fork/branch/timeline rootもretained world rootである間は共有Historical segment/generationのdurable referenceとしてGCへ含める。fork後のpost-fork ID allocationはHIST-081のnamespace safetyを満たす。

## 9J. Degraded-display cache is not rule authority

Historical control-planeが一時degradedでも、以前validatedしたdisplayName/date/portrait等のcached fragmentを**stale/degraded表示としてUIだけ**に使うことは許容できる。

ただし、そのcacheに対応するdirectory/generation/reference completenessを現在authorityとして検証できない場合:

- `not_related` negative proof
- marriage eligibility
- ID allocation safety
- history-dependent write authority

へ流用しない。

UI salvage cacheとrule authority cacheを同一扱いしない。last-known displayは「読める情報を残す」ためのbest effortであり、game ruleの存在/不存在証明ではない。

## 9K. Explicit audit is read-only unless repair is requested

明示full history validation/auditは、診断・integrity cache更新を除きcanonical Historical bytes/relationship/gameplay resultを暗黙変更しない。

```text
full audit
  -> report / diagnostics / advisory cache update

repair/migration/admin correction
  -> separate explicit maintenance transaction
```

「validationしたら自動修復してhistory内容が変わる」挙動を避け、audit結果の再現性とmaintenanceの監査可能性を保つ。

## 9L. Relationship temporal lifecycle consistency

過去婚姻等を保持するだけでなく、current-active viewとhistory viewが時間的に矛盾しないよう、relationship lifecycleは開始/終了または同等のtemporal evidenceを保持できる。

- ended relationをactiveとして扱わない
- relation endでhistory recordを削除しない
- active index/viewはcanonical lifecycleからderivable/rebuildable
- repair/migration以外で同一relationのpast intervalを黙って書換えない

同一Personの複数婚姻履歴等を表示するとき、payload corruptionで1relationのend metadataだけ読めなくても他relationを隠さず、そのrelationのstatusだけ`unknown/unavailable`相当に局所化する。

## 9M. Defensive Historical decode/resource boundary

local degradationはparser自体がprocessを落とさないことも含む。Historical fragment/headerがcorruptでlength/compression/count/depth等を異常値へした場合、1 record accessでunbounded memory allocation / decompression / CPU recursionを許さない。

exact byte上限は後続storage specで決めてよいが、readerはsection type/schemaに応じたbounded decode/resource budgetを持ち、上限超過は該当fragmentを`corrupted/unavailable`相当に局所化する。

```text
corrupt declaredLength = 2^63
zip/decompression bomb
array count = huge
nested object depth = huge
```

をwhole process OOM/stack overflowへ変換しない。rule-required fragmentがbudget failureならcannot_determine/fail-closed。

## 9N. Duplicate logical identity is ambiguity, not last-write-wins

同一logical generation内に同じPersonId / RelationshipId / EventId / ResultId等のcanonical recordが複数競合して存在する場合、storage順・mtime・最後に読んだrecordで黙ってwinnerを選ばない。

- exact duplicate bytesでdedupe可能な場合を除き、identity conflict/ambiguous corruptionとして診断
- UIはstable identityを保ったplaceholder/diagnosticへ局所化可能
- rule queryがどちらをauthorityとすべきか決められなければcannot_determine
- allocatorはduplicateを「空きID」とみなして再利用しない

repairで解決するまでlast-write-winsでcanonical historyを書換えない。

## 9O. Semantic dependency retention / GC

HIST-093でHistorical payloadをcatalog/version provenanceへbindしても、そのdefinition snapshot/migration mapping自体をGC/retentionで先に消せば意味復元不能になる。

retained Historical record/save/checkpointが参照するsemantic dependencyは、必要な期間durable retention/GC rootまたはequivalent migration resultとして保持する。obsolete catalogを削除する場合は、参照historyが新provenanceへdeterministically migrated済みであることを保証する。

semantic dependency missingをlatest catalog fallbackで補わない。

## 9P. Concurrent maintenance publish must not lose gameplay writes

repair/migration/compactionがbase Historical generation G1からnew G2を作成している間に、death archive / posthumous relationship / Event append等がG1系へcommitし得る。

maintenance publishはbase generation/rootのcompare-and-swap、exclusive maintenance/write serialization、rebase等で**concurrent committed writeをlost updateしない**。

```text
maintenance built from G1
current canonical root became G1a due gameplay append
publish old-base G2 blindly
  -> forbidden
```

base mismatchならpublishをabort/retry/rebaseし、G1aのcommitted recordを消さない。

## 9Q. Checkpoint capture uses one committed boundary

checkpoint/saveのCurrent state、Historical root/generation、allocator/reference evidenceは同じcommitted logical boundaryからcaptureする。

save取得中にweekly mutationまたはmaintenance generation publishが走る場合、fixed read generation/transaction lock/retry等で一貫した組を取得し、Current=after / Historical=before等の無言mixを作らない。

in-progress uncommitted Historical writeをcheckpoint authorityへ含めない。

## 9R. Orphan bytes are not logical records

crash-safe copy-on-write/appendではpublish前のunreferenced segment/chunkがstorageへ残り得る。PersonDirectory/root/manifestからreachableでないorphan bytesを「存在するHistorical Person/Relationship」として自動復活させない。

orphan cleanupはGC/maintenanceで行えるが、current/durable save/branch rootsからunreachableであることを証明してから削除する。単なるfile presence/segment scanをlogical existence authorityにしない。

## 10. Sprint 1.5 compatibility boundary

現Sprint 1.5 API 0.2.0はHistorical archive subsystemそのものを実装するtaskではない。UI-001～010を膨張させない。

ただしSprint 1.5実装は次を将来不可能にする設計をしてはいけない。

- deceasedをhard-deleteする
- PersonIdを再利用する
- `UiReadSnapshot`生成でarchive全件cloneを前提化する
- `WorldSummary.personCount`算出で全Historical payload scanをAPI契約化する
- childIds/spouseIds等をimmutable Historical Person payload内の唯一正本にする
- historical corruptionを常にwhole-detail/whole-tree 500へ固定する
- kinship missing/corruptionをnot-relatedへ変換する

現0.2.0のstrict `PersonDetailView` / relationship 500契約は、archive activation前のcurrent monolithic sourceにだけ適用するlegacy/current-path契約。Historical reader導入時は新API schema/versionまたは専用read contractで本documentが優先する。

## 11. Normative contracts

| HIST | Contract | Normative rule |
|---|---|---|
| HIST-001 | normal gameplay hard-delete禁止 | 死亡済みPersonは削除せず、PersonIdを永久参照可能なlogical person namespaceに残す。 |
| HIST-002 | PersonId再利用禁止 | active/historicalを跨いでPersonIdを再利用しない。Family/Lineage/Relationship/Event/Resultから同じIDを参照できる。 |
| HIST-003 | death transition strict | 死亡transition直前/commit時にPerson本体と必須cross-referenceをstrict validateし、archive candidateを確定してからatomicにcurrent hot setから外す。 |
| HIST-004 | historical payload immutable | 死亡時点で確定したHistorical Person payloadは通常gameplayでは原則immutable。週次処理で書換えない。 |
| HIST-005 | weekly hot path exclusion | 死亡済みPerson payloadを通常weekly processor iteration対象へ含めない。 |
| HIST-006 | no deceased training/state/RNG | 死亡者について修行、技成長、temporary state/currentMental更新、本人向け週次event生成、本人起点RNG消費を行わない。 |
| HIST-007 | post-death references allowed | 死亡後に発生する別人物/世界eventがHistorical PersonIdを参照してよいが、参照のためにHistorical Person payloadをmutationしない。 |
| HIST-008 | explicit maintenance only | schema migration、repair、administrative correction等でHistorical payloadを変更する場合はweekly path外の明示maintenance transaction/version migrationとする。 |
| HIST-009 | logical PersonDirectory | PersonIdから`active / historical / absent` locationを解決できるlogical directoryを持つ。known historical Personのpayload missing/corruptedを`absent`へ落とさない。物理store分離方法は後続実装で決めてよい。 |
| HIST-010 | global reference validity | Family/Lineage/Relationship/親子/婚姻/師弟/実績からactiveとhistoricalの双方を同一PersonId namespaceで参照できる。 |
| HIST-011 | canonical relationship authority | 親子・婚姻・師弟等の正本はcanonical relationship/lineage records。検索高速化indexを独立した第二の意味論正本にしない。 |
| HIST-012 | adjacency index | parentIdsByChild / childIdsByParent / spouseIdsByPerson等のadjacency indexを持てる。fatherId/motherId等を追加する場合もcanonical relationとtransactional一致必須。 |
| HIST-013 | reverse index outside immutable person | childIds/spouseIds等の将来増え得るreverse referenceをimmutable Historical Person payloadの必須mutable fieldにしない。index/relationship store側で更新可能にする。 |
| HIST-014 | posthumous-child safe | 死亡後に子relationが追加されるcaseでもHistorical Person payload自体は変更せず、relationship/indexだけをtransactionalに追加できる。 |
| HIST-015 | no all-person kinship scan | 血縁/家系照会で全Personを毎回走査しない。PersonId adjacency/indexから必要なgraph frontierだけ辿る。 |
| HIST-016 | bounded kinship traversal | 近親判定はruleが必要とする最大depth/degreeへbounded traversalし、死亡祖先を通常nodeとして含める。 |
| HIST-017 | archive-time validation | Historical化するpayloadはtransition時に正常性を確認し、validation version/integrity evidenceを関連付けられる設計とする。 |
| HIST-018 | no weekly historical full validation | 一度validation済みでimmutableなHistorical payloadを毎週全文再validationしない。 |
| HIST-019 | normal load boundary | 通常save/loadではCurrent/Active stateをstrict validateし、Historical側はroot/generation/segment manifestと必要index metadataを検証する。全payloadまたは全index entryのdeserialize/full-scanを毎load必須にしない。 |
| HIST-020 | lazy payload validation | Historical payloadが未確認ならアクセス時に必要record/field/sectionをvalidationできる。 |
| HIST-021 | explicit full audit | 明示的な全履歴validation/repair auditをweekly simulationと別command/maintenance modeで実行可能にする。 |
| HIST-022 | integrity state conceptual | Historical payload/section integrityは概念上 unchecked / valid / corrupted / missing を区別する。PersonDirectoryの`absent`とpayload `missing`を分離し、canonical retentionで意図的に非保持の履歴は`not_retained_by_policy`としてcorruption/missingと区別する。 |
| HIST-023 | integrity metadata separate | corrupted等の診断状態はimmutable Historical Person payload自体を書換えず、integrity/quarantine index等の別metadataとして保持可能にする。 |
| HIST-024 | repeat-failure quarantine | 同一recordの既知corruptionを毎回同じ例外として再発生させず、fingerprint/schema versionに結び付けて診断結果をcache可能にする。repair/version変更時はinvalidateできる。 |
| HIST-025 | local degradation | Historical data corruptionは可能な限り該当Person/field/section/referenceへ局所化し、simulation全体や家系図全体を停止させない。 |
| HIST-026 | field-level salvage | 一部fieldが独立validation可能なら、他field/sectionがcorruptでも読めるfieldを返せる。全record strict failureを理由に読めるprimitiveまで隠さない。 |
| HIST-027 | no false defaults | corrupted/missing fieldを0、空配列、血縁なし、技なし等の正常値へ変換しない。unavailable理由を保持する。 |
| HIST-028 | placeholder scope | record全体が読めなければ「不明な人物」、sectionだけ読めなければそのsectionだけ「履歴データを読み取れません」等のplaceholderにし、他sectionは表示継続する。 |
| HIST-029 | readable identity survives | 父Personのstats等がcorruptでもrelationship edgeと父displayNameが独立validationできるなら父名表示を維持する。 |
| HIST-030 | no historical 500 cascade | Historical readerは1件のcorruptionをgeneric whole-page/whole-tree 500へ昇格させない。Current/Active strict corruptionとはerror boundaryを分ける。 |
| HIST-031 | kinship tri-state | ルール判定用血縁queryは related / not_related / cannot_determine の三値を持つ。 |
| HIST-032 | positive proof wins | 禁止/特別扱い対象の血縁pathをvalid dataだけでpositively証明できた場合は、他の無関係なhistory corruptionがあってもrelatedを返せる。 |
| HIST-033 | not-related requires complete frontier | not_relatedはrule上必要なbounded frontierを欠落/corruptionなく探索完了できた場合だけ返す。 |
| HIST-034 | cannot-determine fail closed | rule-required frontierのdirectory identity / canonical relationship edge等にmissing/corrupted/unsupported evidenceがあり安全に否定できない場合はcannot_determine。rule無関係payload corruptionはHIST-077に従い判定不能理由にしない。missingを「存在しない祖先」と解釈しない。 |
| HIST-035 | rule action local reject | cannot_determine時はその婚姻等の個別rule-dependent処理だけ安全側で拒否し、rule-dependent mutation/RNG/ID allocationをcommitしない。simulationの無関係な処理は継続可能。 |
| HIST-036 | diagnostic without payload mutation | cannot_determine/corruptionはvalidation/diagnosticへ記録可能だがHistorical Person payload自体を更新しない。 |
| HIST-037 | weekly cost target | 通常weekly simulation costは主としてactive/living person数 + 当週変更量へ依存し、全historical person数へ線形依存しない構造を目標ではなく設計制約とする。 |
| HIST-038 | weekly historical scan zero | historyを必要とするrule query/death transitionがない週はHistorical Person payload full-scan count=0を将来instrumentationで検証する。 |
| HIST-039 | weekly historical clone zero | 通常weekly stepでHistorical Person payload clone count=0。Current read snapshot構築のためにarchive全体をdeep cloneしない。 |
| HIST-040 | weekly historical revalidation zero | 通常weekly stepで既valid immutable Historical payloadのfull revalidation count=0。 |
| HIST-041 | on-demand browsing may scale | 家系図/全人物一覧/全履歴audit等の明示read operationは要求範囲に応じてHistorical dataを読むことを許すが、weekly hot pathへ波及させない。 |
| HIST-042 | maintained counts | WorldSummary等の全人物件数はactive+historicalのlogical countを返せるが、その算出のために毎GET archive全payloadをmaterialize/scanしない。validated maintained counter/index利用可。 |
| HIST-043 | immutable read handle | UiReadSnapshot等がHistorical storeへアクセスする場合、immutable generation handle/read token/reference-safe viewを保持してよく、Historical payload全件deep cloneを要求しない。 |
| HIST-044 | non-lossy retention | Historical Personを表示専用の極端な簡易recordへ不可逆変換しない。能力、技、流派、師弟、戦績、婚姻、所属、過去実績等を将来参照可能な情報量を保持できる。 |
| HIST-045 | immutable historical prefixes | validation済みappend-only Event/Result/achievement等のhistorical prefixも、変更されていない限り通常weekly stepで全文再validationしない。 |
| HIST-046 | historical record local degradation | 過去Event/Result/achievementの1record corruptionも、UI/history browsingでは可能な限り該当record/sectionへ局所化し、simulation全体を停止させない。 |
| HIST-047 | derived summary is acceleration not authority replacement | historical summary/index/cacheを高速化に使ってよいが、将来詳細表示に必要なcanonical source/historyを不可逆削除しない。 |
| HIST-048 | rule-critical historical record fail closed | Person以外のhistorical recordがgame rule判定に必要でcorrupted/missingなら、正常値/不存在へ補完せずcannot_determine相当で個別処理を安全側拒否する。 |
| HIST-049 | derived index rebuildable | adjacency/search indexはsemantic authorityではないため、破損・staleを検出した場合はcanonical relationship/storeからweekly hot path外でrebuild可能にする。index corruptionをcanonical history corruptionへ変換しない。 |
| HIST-050 | quarantine cache advisory | integrity/quarantine cache自体はadvisory metadata。cache corruption/old fingerprintを理由にvalid payloadを永久corrupted/missing扱いせず、cacheを破棄して再validation/rebuild可能にする。 |
| HIST-051 | coarse corrupted does not hide valid fields | Person-level integrityが`corrupted`でも、partial readerは独立validation可能なfield/sectionを再利用できる。粗いstateだけで全fieldをunavailableにしない。 |
| HIST-052 | graph cycle/depth safety | 家系図/kinship traversalはvisited-set + bounded depthでcycle/duplicate edge corruptionによる無限巡回を防ぐ。UIは該当branchを局所placeholder/diagnostic化し、rule queryは必要frontier不完備ならcannot_determine。 |
| HIST-053 | stale index cannot prove not-related | relationship indexとcanonical relationの整合を保証できない場合、そのindexだけを根拠に`not_related`を返さない。rule-critical queryはrepair済みvalid indexまたはcanonical traversalを使い、不整合時はcannot_determine。 |
| HIST-054 | death transition validation is bounded | death transitionのstrict validationは新たにfreeze/commitするPerson payloadと直接書換えるrecord/index整合へ限定し、全historical ancestry/prefixのrecursive full validationを要求しない。古い無関係なcorruptionで死亡transition全体を止めない。 |
| HIST-055 | active validation does not recursively validate history | normal weekly Current/Active validationはactive stateと必要なreference/index invariantをstrict確認するが、参照先Historical payload全体を毎週recursive validationしない。rule-specific historical completenessはそのqueryでrelated/not_related/cannot_determineを判定する。 |
| HIST-056 | incremental persistence | normal autosave/checkpointはimmutable historical payload/chunk全体を毎週rewriteする設計を避け、current changed data + new historical records/index deltaを主に永続化できる。explicit full export/compactionは別operation。 |
| HIST-057 | independently decodable historical framing | exact保存形式は後続で選べるが、identity/routing materialとheavy/optional sectionを独立decode/integrity-check可能にできるstorage framingを必須とする。1 section corruptionが他の正常fieldを必ず全滅させる単一all-or-nothing blobだけを唯一正本にしない。 |
| HIST-058 | fragment-level integrity diagnostics | integrity/quarantine metadataはrecord全体だけでなく独立section/fragment単位のvalid/corrupted/missingを表現できる。coarse Person=`corrupted`はaggregate diagnosticであり、正常fragmentを非表示にするauthorityではない。 |
| HIST-059 | directory location vs payload integrity | PersonDirectoryの`historical`はlogical existenceを表す。directory entryは存在するがpayloadがmissing/corruptedなら`historical + integrity missing/corrupted`であり`absent`へ変換しない。`absent`はlogical PersonId自体がdirectoryにない場合だけ。 |
| HIST-060 | bounded normal-load metadata work | normal load/openはHistorical root/generation/segment manifest等のcoarse integrityから開始でき、全Historical payload/relationship/index entryを毎回deserialize/full-validateすることを要求しない。full per-entry validationはexplicit audit/repairへ分離する。 |
| HIST-061 | no hot-path full-scan fallback | adjacency/indexがinvalid/staleなrule-critical queryで、weekly hot pathから全Person/全relationship archive scanへfallbackしない。valid keyed canonical lookupがboundedに可能なら使用し、そうでなければ`cannot_determine`で個別拒否しweekly外rebuildを要求する。 |
| HIST-062 | traversal budget exhaustion is unknown | safety node/time/edge budgetがrule-required frontier完了前に尽きた場合、path未発見だけを根拠に`not_related`を返さない。valid positive pathが未証明なら`cannot_determine`。UI truncationは「続き未確認」を明示する。 |
| HIST-063 | maintenance creates new historical generation | repair/migration/admin correctionでHistorical payloadを変更する場合、既存read generationのbytesをin-place mutationせず、new record/version/generationを作成してatomic publishする。integrity/quarantine fingerprintもnew generationへ更新する。 |
| HIST-064 | historical read-generation isolation | UiReadSnapshot/家系図readがhistorical generation handleを固定した後にrepair/migrationがpublishされても、そのrequestは旧generationを一貫して読み続ける。new requestだけがnew generationを見る。payload/index/directoryの世代混在を禁止する。 |
| HIST-065 | crash-recoverable death transition | death transitionのpersistent commitはpayload/archive registration、PersonDirectory、active hot-set removal、relationship/index/counter更新をrecovery上も1 logical transactionとして扱う。crash後は旧active状態または新historical状態のどちらかへ復旧し、Personが両方/どちらにも存在しないhalf-stateを残さない。 |
| HIST-066 | historical append cursor/index | append-only Event/Result/achievement/relationship historyへ新recordを追加するために毎回old prefix全件をscan/cloneしてnext sequence/hash/rootを再計算しない。validated append cursor/segment metadataを維持し、append metadata corruption時は該当appendを止めてrepairへ回す。 |
| HIST-067 | retention policy is not corruption | canonical retention policyで期限切れ/非保持となった詳細履歴は`not_retained_by_policy`でありmissing/corruptedではない。UIは保存期間外として区別し、既存retention policyをHistorical化だけで無限保持へ上書きしない。一方、将来のgame rule判定に必須なancestry/relationship/identity materialはretention expiry対象にしてはならない。 |
| HIST-068 | no weekly wholesale supporting-history clone | Person payloadだけでなくHistorical relationship/Event/Result/achievement等のimmutable prefix/chunkも通常weekly clone/full-validation対象へ含めない。当週deltaと必要bounded frontierだけを扱えるstorage/read modelとする。 |
| HIST-069 | bounded corruption blast radius | archive物理形式はrecord/section/segmentのfailure domainをboundedにし、1 record/section/chunk corruptionだけで全Historical archiveが必然的にdecode不能になるmonolithic sole containerを避ける。directory/rootがvalidなら無関係segmentを継続参照できる。 |
| HIST-070 | historical control-plane degraded mode | PersonDirectory root / manifest / lookup-root corruptionを「archive empty」へ補正しない。Historical subsystemをdegraded/unavailableとして隔離し、history-dependent UI/ruleを局所劣化/cannot_determineへし、無関係Current processingは可能なら継続する。全Person count等のhistory-dependent aggregateもactive-only値へ偽装せずunavailable/degraded扱いにする。control-plane repair/rebuildをweekly外で行う。 |
| HIST-071 | allocation namespace without archive scan | PersonId等のglobal logical identity再利用を防ぐallocation state/high-water materialをstrict保持し、新Person作成のたび全Historical PersonIdをscanしない。allocation metadata integrityを保証できない場合は新ID allocationだけをfail-closedし、推測/再利用しない。 |
| HIST-072 | integrity cache bound to content identity | `valid/corrupted` quarantine cacheはrecord/fragment generation + content hash/fingerprint/length等のcontent identityへ結び付ける。保存後bitrot/外部変更でcontent identityが変わればcached validを信用せず再validationする。 |
| HIST-073 | retention tombstone/identity continuity | retention policyでdetail payloadを削除しても、そのrecordがlogicalに存在したこと・必要なstable ID/sequence/summary availability reasonを区別でき、EventId/sequence/Result identity等を再利用しない。`not_retained_by_policy`は正常なtombstone/availability stateとして扱える。 |
| HIST-074 | historical generation reclamation safety | repair/migration/compactionでold generationを置換しても、old generationを参照中のlive read handle/requestがなくなるまで必要segmentをreclaim/deleteしない。reader終了後にrefcount/lease等で安全に回収でき、generationを永久保持してmemory/disk leakさせない。 |
| HIST-075 | multi-request historical read generation binding | 将来Historical list/tree paging/cursorが複数requestへ跨る場合、cursor/read tokenはHistorical generation identityへbindする。generation publish後のold cursorはold generationを明示継続できる設計またはSTALEとして再読込させ、page間で新旧generationを無言混在させない。 |
| HIST-076 | validated historical reference evidence | unchanged Current/Active recordがHistorical PersonIdを参照するだけの場合、そのreference existence/invariantを毎週payloadまで再解決せず、validated directory generation/reference evidenceを利用できる。evidence generationがinvalid/degradedになったとき初めて必要capabilityをfail-closedし、全Historical payload recursive validationへfallbackしない。 |

| HIST-077 | rule-query dependency minimality | Historical corruptionはそのruleが実際に必要とするevidenceだけへ影響させる。kinshipに不要なstats/techniques/display section corruptionだけでcannot_determineへ落とさず、valid directory identity + canonical relationship frontierが完全ならheavy payload missingでもrelated/not_relatedを判定できる。 |
| HIST-078 | placeholder identity/topology preservation | known/missing/corrupted PersonのUI placeholderは元PersonIdまたはstable opaque node keyを保持し、複数の「不明な人物」を1nodeへcollapseしない。valid relationship edge/topologyはplaceholder越しにも維持する。 |
| HIST-079 | resumable checkpoint binds historical generation | 再開可能save/checkpointはCurrent stateとhistorical generation/root identity・必要allocation/reference evidenceを同一logical checkpointへbindする。load時に別generationを無言mixして正常restore扱いしない。 |
| HIST-080 | durable checkpoint pins historical generation | old generation reclaimはlive readerだけでなくretained save/checkpoint/backupのdurable referenceも考慮する。durable pinまたはlive readerがあるgeneration/segmentを削除せず、両方なくなってから安全reclaim可能。 |
| HIST-081 | old-save restore/fork identity safety | 古いcheckpointを再開するときpost-checkpoint future historyを無言attachせず、exact generation restoreまたは明示fork/branch等でidentity namespace衝突を防ぐ。allocatorを単純巻戻しして既存PersonId等を再利用しない。 |
| HIST-082 | schema incompatibility is not corruption | decoderが理解できないHistorical schema/versionは`unsupported_schema`/`migration_required`相当としてcorrupted/missingと区別する。独立可読fragmentはsalvageし、rule-required fragmentがunsupportedならcannot_determine/fail-closed。 |
| HIST-083 | history-dependent writes fail closed atomically | death archive、posthumous relationship、kinship前提marriage、新ID allocation等のhistory-dependent mutationは必要authority/control metadataが利用不能なら個別transactionをrollback/rejectし、必要history writeを欠落させた成功状態をcommitしない。 |
| HIST-084 | repair is non-retroactive by default | Historical repair/new generation publishはfuture read/ruleへ反映するが、既commitのbattle/marriage/birth/death/result/RNGを自動巻戻し・再実行しない。retroactive correctionは別の明示maintenance workflowで行う。 |
| HIST-085 | integrity evidence anchored outside unchecked fragment | fragment content identity/hash等のexpected値は別に検証されたgeneration manifest/root/checksum chain等へanchorし、未検証fragment内の自己申告hashだけでそのfragmentをvalid判定しない。 |
| HIST-086 | relationship index binds canonical generation | adjacency/search indexでcompleteness/negative proofを行う場合、indexはexact canonical relationship generation/root identityへbindする。unbound/old/new mismatch indexはstaleでありnot_related証明に使用しない。 |
| HIST-087 | no post-death same-week mutation | death transition commit後、そのPersonへ同week後続training/state/person-week-event/RNGを実行しない。death transition自身がcommitするdeath event/recordは対象外。week-start iteration snapshotに残っていてもexecution時lifecycle/hot-setを確認し、death後mutationを防ぐ。 |

| HIST-088 | relationship lifecycle history preservation | marriage/master-disciple等がcurrentでなくなっても、過去関係を家系図/履歴から辿るためcanonical relationship historyをhard-delete/上書き消失させない。current-active relation viewとhistorical relation historyを区別し、終了/死亡/離婚等はlifecycle/end metadataまたはappend historyで表現できる。 |
| HIST-089 | bounded death archive materialization | death transitionでHistorical Personをfreezeするために、その人物の全生涯Event/Result/achievement detailを全scan/deep-clone/materializeしない。current final Person payload + direct required references/summary/index deltaへboundedし、既存append-only historyは参照/segmentとして継続利用する。 |

| HIST-090 | bounded historical payload residency | normal simulation runtimeは全Historical Person payloadをRAM常駐させることを要求しない。payloadはlazy/on-demand load + bounded/evictable cacheを利用でき、cache evictionはcanonical history deletionではない。history queryなし時のresident payload count/bytesがall historical populationへ必然的に線形増加する設計を避ける。 |

| HIST-091 | bounded hot-path hash/canonicalization | normal weekly commit/state hash/determinism preparationのためにHistorical payload/segment全件を毎回serialize/full-hashしない。unchanged archiveはvalidated logical root/content identity等のbounded representationを再利用し、changed segment/root deltaだけ更新できる構造とする。explicit full export/auditは別operation。 |
| HIST-092 | logical history determinism independent of storage layout | logical Historical contentが同一ならcompaction/repacking/cache residency/physical generation IDだけでgame RNG・canonical allocation・battle/training outcome・deterministic comparison結果を変えない。reader/cursor用physical generationとgameplay用logical content identityを区別する。 |
| HIST-093 | versioned semantic/catalog provenance | Historical fieldの解釈にTechniqueDefinition等の外部catalog/taxonomyが必要なら、stable definition history・catalog version/snapshot・migration mapping等で当時の意味へbindする。latest catalogでold historyを無言reinterpretしない。必要provenanceが読めなければ該当sectionだけunavailable、rule-requiredならfail-closed。 |
| HIST-094 | checkpoint publish after referenced history durability | checkpoint/save manifestを利用可能としてpublishする前に、参照Historical generation/rootと必要allocator/reference evidenceがdurable/validatedであることを保証する。crash後にpublished checkpointだけ残り参照historyが未永続/欠落となるhalf-stateを正常saveとして残さない。 |
| HIST-095 | durable pin release is crash-safe | save/checkpoint/backup削除・expiryとHistorical durable pin解除は、crashしてもlive saveがdanglingしない順序/transactionにする。安全側の一時pin leakは許容できるが、saveが残る間に必要generationをreclaimしない。 |
| HIST-096 | branch/fork roots participate in historical GC and ID safety | explicit fork/branch/timeline rootがretainedである間、そのrootが参照するshared Historical generation/segmentをGC rootとして扱う。post-fork ID allocationはnamespace衝突を防ぎ、pre-fork PersonId等のlogical identityを勝手にrewriteしない。 |
| HIST-097 | degraded UI salvage cache is non-authoritative | control-plane degraded時に以前validatedしたdisplay fragmentをstale/degraded表示へ利用してよいが、current authority/completenessを確認できないcacheをnot_related証明・marriage rule・ID allocation・history-dependent writeへ使用しない。 |
| HIST-098 | full audit is read-only by default | explicit full Historical validation/auditはreport/diagnostic/advisory integrity cache更新を除きcanonical historyを自動変更しない。repair/migration/admin correctionは別の明示maintenance transactionとして実行する。 |
| HIST-099 | relationship temporal lifecycle consistency | historical relationshipはcurrent-active状態と過去履歴を時間的に区別できるstart/end等のlifecycle evidenceを保持可能にし、active view/indexはcanonical lifecycleからderivable/rebuildableとする。1 relationのlifecycle corruptionを他relationの表示失敗へ拡大しない。 |
| HIST-100 | stable historical query identity/order under partial reads | Historical list/tree/pagingのnode identity/tie-break/orderはstable PersonId/relationship identity/index metadata等へ基づき、payload missing/corruptedやplaceholder化だけでnodeをcollapse/reorder/重複させない。読めないdisplay fieldをsort keyに必須化する場合はstable fallback keyを定義する。 |

| HIST-101 | bounded defensive Historical decoding | Historical fragment/headerのcorrupt length/count/compression/depth等でunbounded allocation/decompression/CPU recursionを起こさない。section/schemaごとのbounded decode/resource budgetを持ち、limit超過は該当fragmentをcorrupted/unavailableへ局所化し、rule-requiredならfail-closedする。 |
| HIST-102 | duplicate logical identity is not last-write-wins | 同一logical generationに同じPersonId/RelationshipId/EventId/ResultId等の競合recordが複数ある場合、storage順で黙ってwinnerを選ばない。exact duplicate以外はambiguous identity conflictとして局所診断し、rule-requiredならcannot_determine。IDを空き扱いして再利用しない。 |
| HIST-103 | semantic dependency retention | retained Historical record/save/checkpointが参照するdefinition catalog/version/migration provenanceを必要期間保持し、dependencyを削除するなら参照historyが新provenanceへdeterministically migrated済みであることを保証する。missing dependencyをlatest catalog fallbackで補わない。 |
| HIST-104 | concurrent maintenance publish is lost-update safe | repair/migration/compactionのnew generation publishはbase generation/root CAS・serialization・rebase等でconcurrent death/relationship/Event等のcommitted Historical writeを上書き消失させない。base mismatchはabort/retry/rebaseする。 |
| HIST-105 | checkpoint capture is one committed boundary | save/checkpointのCurrent state・Historical generation/root・allocator/reference evidenceを同一committed boundaryからcaptureする。weekly mutation/maintenance publishと競合してbefore/after世代を無言mixせず、uncommitted historyをsave authorityへ含めない。 |
| HIST-106 | orphan storage bytes are non-authoritative | crash等で残ったunreferenced segment/chunkはPersonDirectory/root/manifestからreachableでない限りlogical Person/Relationship/Eventとして復活させない。cleanupはcurrent/durable save/branch rootsからunreachableを確認して行う。 |

## 12. Deferred physical decisions

この段階では次を固定しない。

- Historical Person専用DB table/file/chunk形式
- integrity stateを永続化する具体schema
- compression/archive file format
- field-level partial-read wire schema
- exact cache implementation
- exact benchmark hardware/time threshold

これらの**exact形式**はHIST-001～106を満たす範囲で後続spec/taskが選べる。ただしHIST-057のindependent framing、HIST-063/064のgeneration isolation、HIST-065のcrash atomicity等の性質自体はdeferredではない。

## 13. Long-run acceptance direction

1000年級runを正式にacceptする前に、少なくとも:

```text
large historical population fixture
same active population with small vs large archive
weekly historical scan/clone/full-validation counters
bounded kinship traversal incl. deceased ancestors
corrupted/missing ancestor -> cannot_determine
partial field corruption -> partial UI read
known historical + missing payload vs absent PersonId distinction
normal load without all-history payload/index scan
stale index without all-history hot-path fallback
traversal budget exhaustion -> cannot_determine
repair generation + concurrent read isolation
death-transition crash recovery
append without historical prefix scan
retention expiry != corruption
control-plane corruption != empty archive
PersonId allocation without archive scan/reuse
bitrot invalidates cached-valid integrity
retention tombstone keeps IDs/sequences non-reusable
old generation reclamation waits for live readers
historical paging/cursor binds generation
unchanged active->historical references reuse validated evidence
rule query ignores irrelevant payload corruption
placeholder keeps stable PersonId/topology
checkpoint binds exact historical generation
retained saves pin historical generations
old-save restore/fork prevents identity collision
unsupported schema != corruption
history-dependent writes fail closed atomically
repair does not silently rewrite committed gameplay
integrity evidence anchored outside unchecked fragment
relationship index binds canonical generation
no post-death same-week mutation/RNG
historical relationship lifecycle preserved after end/death/divorce
weekly state hash/canonicalization does not flatten full archive
logical-equivalent compaction/cache layout does not change gameplay determinism
historical semantic/catalog provenance remains interpretable
checkpoint publish/pin release crash ordering is safe
branch/fork roots participate in GC and ID safety
degraded UI cache is non-authoritative for rules
explicit audit is read-only unless repair requested
relationship lifecycle temporal metadata stays consistent
partial reads keep stable query identity/order
defensive Historical decoding is resource-bounded
duplicate logical IDs never silently last-write-win
semantic catalog dependencies remain retained/migrated
maintenance publish cannot lose concurrent gameplay history writes
checkpoint capture uses one committed Current+Historical boundary
orphan bytes never become logical records by file presence alone
death archive does not materialize lifetime history
normal runtime does not require all historical payloads resident in RAM
full archive audit / repair workflow
```

を専用long-run taskで受入する。
