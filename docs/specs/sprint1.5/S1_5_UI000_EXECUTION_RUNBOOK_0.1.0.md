# Sprint 1.5 UI-000 Execution Runbook

- Document ID: `S1.5-UI000-RUNBOOK`
- Version: `0.1.0`
- Target spec: `S1.5-SPEC-0.1.15`
- Target checklist: `UI-000-CHECKLIST 0.2.5`
- Purpose: Sprint 1完成後、UI production codeへ触れる前に物理bindingと実装可能性を確定する。

## 1. Non-implementation rule

UI-000はproduction UI実装taskではない。

UI-000中に禁止:

- React feature page実装
- API-001～015 handler実装
- UI adapterでsemantic gapを仮埋め
- IsolatedMockBattleRunner実装
- future fixture/testを「実装済み」と偽記
- Sprint 1 public contractを都合よく変更

許可:

- current Sprint 1 code/spec/testのread/search
- audit/report/manifest更新
- static verification command
- spec/code mismatch STOP report

## 2. Fixed repository rule

作業場所:

```text
D:\xampp\htdocs\dollworld
```

禁止:

```text
git worktree add
別clone
一時repo
コピー開発folder
```

Cursorはcommitしない。

## 3. Phase order

順番を変更しない。

```text
P00 repository/predecessor gate
P01 static spec package audit
P02 Sprint 1 completion/version/public export inventory
P03 CAL-JAN-SYNC verification
P04 DB-001..022 physical binding
P05 BRIDGE upstream physical binding and semantic compatibility
P06 ability/event/calendar/runtime maps
P07 API-001..015 owner/DTO/source/error/test-plan readiness
P08 MIG-001..036 production old-contract absence + owner/test plan
P09 TX/PAGE/DET/FIX/BRIDGE ownership-plan verification
P10 ACC-001..174 ownership/traceability-plan verification
P11 SPEC_UNDEFINED/STOP consolidation
P12 final static audit + UI-000 report
```

P00～P12の途中でSTOP条件が出たら、後続phaseの「PASS」を推測記入しない。

## 4. P00 repository/predecessor gate

確認:

```text
git rev-parse --show-toplevel
git branch --show-current
git log -1 --oneline
git status --short
git worktree list
```

必須:

- toplevel == fixed repository
- Sprint 1 accepted completion commitが明示済み
- CAL-JAN-SYNC completion commitが明示済み
- latest `PROJECT_ROADMAP.md` 上のT02 completion evidenceが明示済み
- T03-A completion evidenceが明示済み
- T03-BのUI-000-required common-spec residual = 0 evidenceが明示済み
- 上記predecessor完了後のfixed repository HEAD / branchをUI-000 baselineとして記録
- P00-fixed HEADから生成されたlatest `SPEC_MIRROR_MANIFEST.txt` のHEADがbaseline HEADと一致
- `SPEC_MIRROR.md` のproposal adoption flowが完了し、actual proposal→Git mapping evidenceが存在する
- `R12_PROPOSAL_MANIFEST.md` はproposal-stage provenanceとして参照可能だが、P00のauthority/adoption resultそのものには使わない
- UI-000のsemantic/control判断に使用するR12文書がGit管理下へ反映済みで、proposal-only semantic/control inputが0
- `S1_5_BASE_AUTHORITY_GATE_0.1.0.md` §2A exact schemaでproposal→Git mappingを作成し、artifact全件exact1・未分類0・duplicate0
- proposal-adoption / Git-authority mapping evidenceのpath + SHA-256を記録
- `git_authority_required` / `git_supporting_control_required` に分類されたpackage/bundle内文書は、Git tracked counterpartとbyte/hash一致
- `S1_5_BASE_AUTHORITY_GATE_0.1.0.md`を実行
- tracked `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` exact1
- base document version `S1.5-SPEC-0.1.13`
- base file dirty=false
- base blob hash / last modifying commitを記録
- Git-tracked current `S1.5-SPEC-0.1.15` amendment exact1 / dirty=false
- package amendment == Git amendment bytes/hash
- amendment blob hash / last modifying commitを記録

P00で次のbase GATEを**実値化して判定**する。単に別資料に値があるだけではPASS扱いしない。

```text
GATE-001 Sprint 1完了commit
  - sprint1-complete history anchor / accepted completion snapshot commitを記録
  - P00-fixed current repository HEADとは別物として記録する

GATE-003 Sprint 1全受入監査
  - completion/acceptance report・実行command・結果へのactual evidenceを記録

GATE-007 working tree
  - task開始時の不要なtracked dirty stateなし
  - worktreeはfixed repositoryだけ

GATE-008 Node/npm
  - actual `node --version` / `npm --version`を記録

GATE-009 workspace package graph
  - actual workspace definition / package graph / relevant package names・pathsを記録
```

`CAL-JAN-SYNC completion commit`の存在はP00 predecessor確認でも記録するが、
GATE-004～006のcalendar受入内容自体はP03で実値化・判定する。

authority adoption / mirror / package↔Git semantic file一致が不成立の場合:

```text
proposal-only semantic/control input
  -> dependency_blocker

proposal↔Git semantic content mismatch
  -> spec_fix_required

classified Git-authority/supporting-control package copy != tracked counterpart
  -> spec_fix_required

proposal-adoption / Git-authority mapping evidence SHA mismatch
  -> dependency_blocker

specs/current manifest HEAD != P00-fixed repository HEAD
  -> dependency_blocker
```

不成立 -> STOP。

## 5. P01 static spec package audit

package-only precheck:

```text
node verify-s1-5-spec-package.mjs <spec-package-directory>
```

repo-bound UI-000 gate:

```text
node verify-s1-5-spec-package.mjs <spec-package-directory> <fixed-repository-root>
```

両方exit 0必須。

UI-000のGATE-015は**repo-bound mode**だけをPASS evidenceとして使用する。
package-only PASSをbase authority確認済みと誤認しない。

checker failureを「docsだけなので無視」しない。

## 6. P02 Sprint 1 inventory

列挙:

- current Sprint 1 spec version
- public package entry points
- exported types/functions/classes
- schemaVersion literals
- WorldEngine public APIs
- battle public APIs
- canonical snapshot/restore APIs
- event/validation query APIs
- relevant test files/names
- UI-001で採用するReact / Vite / Fastify exact versionsと選定根拠

P02で次を**実値化して判定**する。

```text
GATE-002 Sprint 1正本仕様版
  - P00-fixed current repository上のactual spec version/pathを記録

GATE-010 UI採用dependency版
  - base S1.5-SPEC-0.1.13の「実装時にNode対応範囲を満たす安定版へ固定」に従い、
    React / Vite / Fastifyの採用exact versionとcompatibility evidenceを記録
  - UI-000ではproduction install/lockfile editを行わない
  - UI-001実装時にそのexact選定値をlockfileへ反映する
```

成果物:

```text
UI-000-UPSTREAM-INVENTORY.md
```

このinventoryにはP00で固定したUI-000 baseline HEADを記録し、S01-008等のhistorical accepted commitだけをcurrent baselineの代用にしない。

推測symbol名を書かない。

## 7. P03 calendar gate

GATE-004～006の証跡を実値化。

- CAL-JAN-SYNC commit
- calendar acceptance tests
- active old-April-contract production search

must_fix/unclassified > 0 -> STOP。

## 8. P04 DB binding

DB-001～022を1件ずつ、**P00で固定した全predecessor完了後のfixed repository state**へ接続する。

`S1_5_S01_008_ACCEPTED_PREBINDING_AUDIT_0.1.0.md` / `audit-s1-5-repo-bindings.mjs` が収集する`7c47847` evidenceはcandidate/provenance補助であり、final P04の`matched`を単独では満たさない。
T01または後続predecessorで物理path/type/schema/runtime ownerが変化した可能性があるrowは必ずcurrent baselineへ再照合する。unchangedと主張する場合もcurrent baselineで不変を確認する。

```text
bindingId
spec subject
actual symbol
actual module
actual type/schema
actual test
source commit
status
```

へ接続。

完了条件:

```text
row count 22
matched 22
blank 0
unregistered uncertainty 0
SPEC_UNDEFINED disguised as DB 0
```

新しいphysical binding subjectを見つけてもDB-023をその場追加しない。`spec_fix_required`。

## 9. P05 BRIDGE binding

BRIDGE-001～119について:

UI-000でactual Sprint 1 physical evidenceが必要な行は実symbol/module/testへ接続する。

future UI behaviorは`S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md`のowner/test planへ接続し、UI-000中に実装しない。

特に確認:

- public-only completion possible
- RNG source/order/non-consumption
- snapshot/restore completeness
- event/validation ordering
- battle pre-start/resolution/abort separation
- run initialization/reset semantics
- cursor/session security bindings
- isolatedMockRunnerDecision: `not_required` | `implement_in_UI_006`
  - `implement_in_UI_006`ならexact facade type/symbol/module/test planをUI-000 reportへ固定

## 10. P06 mutation/event maps

最低限:

```text
UI-000-ABILITY-MUTATION-MAP
UI-000-EVENT-PERSON-MAP
CAL-SCHEMA-MAP
runtime clone completeness map
```

未分類producer/event/schema writer/reader 0件。

expected producer以外が見つかったらUIで無視せずSTOP。

## 11. P07 API readiness

API-001～015はcanonical ID/pathを変更しない。

各row:

```text
API ID
method/path
production ownerTask
success DTO contract
error status/code matrix
public source plan
planned integration test ID
required fixtures
required DB bindings
consumerEvidence requirements
isolatedRunnerDecision  // API-012～014 relevant rows
readinessStatus
```

owner/pathは`S1_5_IMPLEMENTATION_PLAN_0.1.0.md`とexact一致。

endpoint実装はしない。

## 12. P08 MIG readiness

MIG-001～036:

```text
production old-contract hit = 0
ownerTask != blank
planned negative test != blank
planned evidence kind != blank
readinessStatus=ready_to_implement
implementationStatus=not_started
```

future implementation evidenceをUI-000で捏造しない。

## 13. P09 contract ownership

`S1_5_CONTRACT_OWNERSHIP_MANIFEST_0.1.0.md`を正本に:

```text
BRIDGE 119
TX 90
PAGE 14
DET 7
MIG 36
FIX 104
```

全370 row exact once。

owner変更をUI-000で思いつき変更しない。証明不能ならSTOP。

## 14. P10 acceptance ownership

`S1_5_ACCEPTANCE_OWNERSHIP_MANIFEST_0.1.0.md`:

```text
ACC-001..ACC-174 exact once
owner blank 0
```

`UI-010-TRACEABILITY-PLAN`へ174 row展開し:

```text
acceptanceId
ownerTask
planned test id
fixture ids
command category
readinessStatus
```

を埋める。

actual future test path/commitを捏造しない。

## 15. P11 finding / STOP consolidation

正本:

```text
S1_5_UI000_FINDING_RESOLUTION_MATRIX_0.1.0.md
```

UI-000 finding class:

```text
binding_update
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

`binding_update`だけはsemantic一致を証明できるphysical差異で、actual DB/BRIDGE evidenceへ更新・再検証後`matched`ならUI-000を継続可能。

STOP exact4:

```text
dependency_blocker
environment_blocker
code_fix_required
spec_fix_required
```

例:

- symbol/module/test locationだけ変更、meaning/type一致 -> binding_update
- semantic undefined -> spec_fix_required
- specとaccepted Sprint1 codeのmeaning mismatch -> code_fix_requiredまたはhigher-authority再判定後spec_fix_required
- required public operation impossible -> code_fix_required
- predecessor/binding source未確定 -> dependency_blocker
- test plan not executable because accepted dependency不足 -> dependency_blocker
- runtime/tool/browser不足 -> environment_blocker
- owner/semantic mismatch -> spec_fix_required

禁止:

- semantic差をbinding_updateで隠す
- dependency/environmentをproduction workaroundで隠す
- code_fix_requiredをprivate import/adapter補正で回避
- spec_fix_required後に仮決めで継続

STOPが1件でもopenならUI-001開始禁止。

## 16. P12 final UI-000 acceptance

再実行:

```text
node verify-s1-5-spec-package.mjs <spec-package-directory>
npm.cmd run check
npm.cmd run wiki:check
git diff --check
```

P12では、GATEのphase ownershipを取りこぼさず**GATE-001～015が全件PASS**であることを
gate table / evidence参照付きで再確認する。

```text
P00 actualized: GATE-001, GATE-003, GATE-007, GATE-008, GATE-009
P01 actualized: GATE-015
P02 actualized: GATE-002, GATE-010
P03 actualized: GATE-004, GATE-005, GATE-006
P04/P11/P12 finalization: GATE-011, GATE-012, GATE-013
P08 finalization: GATE-014
```

UI-000 reportには:

```text
GATE-001..015 PASS table + actual evidence references
P00-fixed Git authority HEAD
matching SPEC_MIRROR_MANIFEST HEAD
proposal adoption evidence / proposal-only semantic-control input count=0
base + amendment Git blob/hash / package byte match
Sprint 1 completion commit
Sprint 1 spec version/path
Sprint 1 all-acceptance evidence
CAL-JAN-SYNC commit
Node/npm
workspace package graph
React/Vite/Fastify adopted exact versions
spec versions
DB matched count
BRIDGE readiness count
API readiness count
MIG readiness count
contract ownership count
acceptance ownership count
binding_update count / all matched recheck
open STOP count
SPEC_UNDEFINED count
code_fix_required count
spec_fix_required count
dependency_blocker count
environment_blocker count
commands/results
working tree status
worktree list
```

を含める。

finding resolution matrix: `S1_5_UI000_FINDING_RESOLUTION_MATRIX_0.1.0.md`

`S1_5_SPEC_FREEZE_POLICY_0.1.0.md`に従い、UI-000開始時点ではpre-existing freezeを要求しない。
P12でUI-000 PASSを確定した後、UI-001 release前にfinal spec/package/base authorityとfrozen-baseline evidenceのhashをfreezeし、exact frozen bytesでpackage-only / repo-bound static auditを再PASSさせる。

UI-000 PASSはUI production implementation PASSではない。

## 17. Cross-cutting owner audit

UI-000で各contractについて、ownerTaskより前に必要となるconsumer scopeがあるかを確認する。

readiness manifestへ:

```text
contractId
consumerTask
covered API/branch
required predecessor
planned test/evidence
```

を列挙する。

ownerTaskを理由にcurrent taskで必要な共通契約を遅延させない。一方future endpoint/feature先行実装は不可。

最低確認:

- UI-003 -> mutation common rules (lastOperation/capacity/commitState/errorReference/isUpdating)
- UI-004 -> People/Candidate common paging/query/cursor branches
- UI-005 -> DB-012 committed Event Stream internal read, API-009 route dependencyなし
- UI-006 -> UI-003 mutation consumerEvidence aggregate + isolatedRunnerDecision
- UI-007 -> BattleLog common paging/cursor branch
- UI-008 -> remaining common GET/paging/cursor aggregate

## 18. UI-001 release gate

UI-001開始条件:

```text
UI-000 accepted
static spec audit PASS
DB matched=22
SPEC_UNDEFINED=0
open STOP=0
API readiness=15
MIG readiness=36
contract ownership=370
acceptance ownership=174
dependency_blocker=0
environment_blocker=0
isolatedRunnerDecision resolved
post-UI-000 freeze record exists
proposal-adoption / Git-authority mapping evidence path+SHA recorded in freeze
frozen spec/package/base/evidence hashes match current exact files
exact frozen bytes package-only static audit PASS
exact frozen bytes repo-bound static audit PASS
```

freeze record / hash一致 / frozen-bytes再監査は `S1_5_SPEC_FREEZE_POLICY_0.1.0.md` §2 の必須release gateである。
どれか欠ければUI-001を開始しない。


## 19. Long-run HIST non-regression check

UI-000は`S1_5_LONG_RUN_HISTORICAL_PERSON_ARCHITECTURE_0.1.0.md`を読み、current Sprint1/S1.5実装が少なくとも次を新規に固定していないことを確認する。

- deceased hard-delete / PersonId reuse
- weekly all-historical scan/clone/full-validation dependency
- historical whole-page 500を将来不可避にする共通read primitive
- missing/corrupted ancestryをnot-relatedへ補正するrule helper
- lossy mini-personへの不可逆変換
- all-or-nothing historical blob / normal-load all-history scan requirement
- stale index時のweekly full-history fallback
- traversal budget exhaustionをnot-related扱い
- in-place Historical repairでread generation混在
- retention期限切れをcorruption扱い
- Historical control-plane corruptionをarchive empty扱い
- PersonId allocationの全archive scan/ID再利用
- content identity変化後もcached validを信用
- retention pruning後のEvent/Result ID/sequence再利用
- live reader中のold Historical generation早期reclaim / old generation永久保持
- Historical paging/tree cursorの世代混在
- unchanged Current->Historical referenceのweekly再解決/full-validation
- rule無関係Historical payload corruptionでkinshipを判定不能化
- checkpoint/history generation無言mix
- retained save参照generation早期reclaim
- unsupported schemaをcorruption扱い
- required Historical write欠落のsuccess commit
- stale/unbound relationship indexでnot-related証明
- death commit後のsame-week training/state/event/RNG
- current relationship終了時のhistorical relation hard-delete/上書き消失
- death freeze時の生涯Event/Result全scan/clone
- 全Historical heavy payloadのRAM常駐必須化
- Historical relationship/Event/Result prefixのweekly wholesale clone/full-validation
- weekly hash/canonicalizationのall-history flatten/full-hash
- physical storage layout/cache stateのgame determinism混入
- historical catalog provenance欠落によるlatest semantics再解釈
- referenced history durability前checkpoint publish
- live saveより先にdurable pin release/reclaim
- retained fork/branch rootのGC root漏れ
- stale UI cacheのrule/ID authority流用
- full auditのimplicit repair
- relationship temporal lifecycle/current-history混同
- partial-read時のHistorical node/order/cursor identity不安定化
- corrupt Historical length/count/compressionのunbounded decode/OOM
- duplicate logical IDのlast-write-wins
- referenced semantic catalog/provenanceの早期GC
- stale maintenance publishによるconcurrent history lost update
- checkpoint Current/Historical mixed committed boundary
- orphan segment file presenceのlogical authority化

Historical archive subsystemが未実装であること自体はUI-000 STOP理由ではない。
