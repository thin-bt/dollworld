# Sprint完了手順

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-STORAGE-001, CORE-ROADMAP-001, AUDIT-EVIDENCE-001, TASK-STATUS-001
scope: sprint-completion

## Governing principle — user authority / proportional completion gate

- このプロジェクトの最終意思決定者は user / higher authority である。AI/PM/Role/Cursor が生成した運用プロトコルは、品質・再現性・誤進行防止のための補助制御であり、user の明示判断より上位ではない。
- Sprint完了判定は **product / implementation correctness と再現可能な完成snapshotの識別** を主目的とする。監査手順そのものを目的化して、機能的に完成したSprintを運用ファイルだけで長時間停止させてはならない。
- user が明示的に completion requirement を緩和・除外・defer した場合、その指示を current authority として扱い、AI生成の過剰な監査条件を理由に拒否・再追加しない。
- PM/Role は「品質に直結する blocker」と「監査・運用上の non-blocking hygiene」を分離して判定する。

## SPRINT-TRANSITION-001 — independent Sprint transition certificate / fixed production gate

`audit/SPRINT_TRANSITION_GATE.md` (stable Drive ID `1CnbdZOvywT-KmFMUdb8ZJxvIB-y_1il9`) is the fixed fail-closed control for which Sprint may receive production implementation work. Its semantic owner is **Role1**. PM, Cursor A/B2, Role2, Role3, automation prompts, handoffs, and task instructions are read-only consumers of this gate and MUST NOT advance or rewrite its release state.

### Gate bootstrap / baseline
- The fixed gate may be created once when this rule is adopted, with the then-current Roadmap phase as `allowed-production-sprint` and `gate-mode: BASELINE`.
- `BASELINE` is not evidence that the next Sprint is complete or released. It only preserves the already-current production phase and blocks advancement beyond it.
- After bootstrap, advancing `allowed-production-sprint`, changing certificate identity, or changing `gate-mode` is Role1-owned transition output only.

### Transition certificate
Before `allowed-production-sprint` may advance from outgoing Sprint A to incoming Sprint B, Role1 performs an independent transition certification after the outgoing Sprint's required acceptance and `SPRINT-FINAL-001` completion evidence are available.

Role1 MUST read the current `PROJECT_ROADMAP.md` in that certification run and reconcile every **material product / implementation completion requirement** recorded for Sprint A against current authority and fresh implementation / independent-acceptance evidence. Operational hygiene, archive order, mirror timing, or generated audit artifacts are not material Roadmap gaps unless user/higher authority explicitly makes them material.

If any material product/implementation Roadmap gap is unresolved, stale, ambiguous, merely inferred closed, or explicitly still `IN PROGRESS`, Role1 returns a blocking result and MUST NOT advance the fixed gate.

On PASS, Role1 writes a raw immutable certificate at:
`audit/current/<sprint-completion-task>/SPRINT_TRANSITION_CERTIFICATE.md`

Minimum certificate fields:
- `outgoing-sprint`
- `incoming-sprint`
- `verdict: TRANSITION_ALLOWED`
- `roadmap-file-id`
- `roadmap-sha256`
- `completion-snapshot-sha`
- `completion-tag`
- `role1-assignment-key` / generation / terminal result
- required independent-audit result identity
- `unresolved-material-roadmap-gaps: 0`
- certificate content SHA-256

After writing and readback-verifying that certificate, Role1 alone may update `audit/SPRINT_TRANSITION_GATE.md` to:
- `gate-mode: CERTIFIED`
- `allowed-production-sprint: <incoming-sprint>`
- exact certificate file ID / SHA-256
- exact Roadmap file ID / SHA-256 used by the certificate
- outgoing/incoming Sprint identities
- completion snapshot/tag identities

The fixed gate update and certificate are one logical release. If either is missing, unreadable, mismatched, or partially written, the transition is not released.

### Invalidation / re-certification
A transition certificate is invalid for production release when:
- `PROJECT_ROADMAP.md` materially changes the outgoing Sprint completion meaning;
- the gate's certificate ID/SHA does not match the Role1 certificate;
- the certificate does not state `unresolved-material-roadmap-gaps: 0`;
- the outgoing Sprint completion snapshot/tag identity no longer matches formal completion evidence;
- newer user/higher authority reopens or materially changes the outgoing Sprint completion meaning.

Non-material documentation, mirror, archive, handoff, generated evidence-file, or operational control changes do not by themselves invalidate a completed Sprint or transition certificate.

PM may coordinate, request certification, update Roadmap only within `CORE-ROADMAP-001`, and publish work only after the gate allows it. PM never self-issues the transition certificate.

## SPRINT-FINAL-001 — proportional completion snapshot / final verify / tag

### 1. 前提
- Sprint内の required product/implementation task が current authority に従って accepted。
- 必要なcommit/checkpointが completion candidateへ統合済み。
- `CORE-ROADMAP-001` のcompletion alignmentを確認し、materialな product/implementation gap が未解決でないこと。
- この時点のmaster commitを completion snapshot候補とする。

### 2. completion snapshotを固定する
必須:
1. completion candidate branch / HEAD full SHAを記録する。
2. **tracked staged/unstaged product/spec/config差分が0**であること、または差分が意図されたcompletion candidateへcommit済みであること。
3. completion tag targetを同じcompletion snapshot SHAへ固定できること。

非blocking:
- `.cursor/`, `_handoff-artifacts/`, screenshots, traces, logs, JSON probes, test reports, temp files 等の **declared/generated untracked operational evidence**。
- これらは存在していてよく、archive / delete / move / cleanupをverify後に行ってよい。
- generated evidenceだけを理由に新しいproduct commitを作ったり、completion snapshot SHAを変更したり、full verifyをやり直してはならない。

禁止:
- tracked product/spec/configの意図しない変更を「証跡だから」と誤分類すること。
- required test failureをartifact hygieneで隠すこと。
- verify対象SHAとtag対象SHAをずらすこと。

### 3. 最終検証
原則は exact completion snapshot SHA で required Sprint verify を1回通す。

**repo-external clean clone / clean checkout verification is mandatory for Sprint formal close.**
- completion snapshot SHA を repository 外の clean clone / clean checkout に materialize する。
- dependency install / production build / required verification を、その clean environment で current canonical command により実行する。
- 元 working tree の untracked files、local-only tooling、stale build output、cache、未追跡設定に依存していないことを証明する。
- clean clone / clean checkout で production build または required verify が再現しない場合、その Sprint は CLOSED にしてはならない。

**User-facing product flow requirement.**
Sprint scope に user-facing application / UI が含まれる、または Sprint の機能が通常ユーザー経路で利用される場合、formal close には同じ completion snapshot の current production build と app startup の成功、および ordinary real user-facing flow の end-to-end acceptance が必要。
- test-only API bootstrap、固定seed直注入、専用step/hidden/manual bypass、内部関数直呼びは、その機能自体の単体/統合証跡には使えても ordinary user-facing acceptance の代替にはならない。
- required flow は実際のユーザー入口から開始し、Sprint authority が要求する状態変化・永続化・画面反映まで確認する。
- UI 非対象 Sprint では N/A と根拠を completion evidence に明記する。

既に同一SHAで有効なrequired verify PASSがあり、その後product/spec/config tracked bytesが変わっていなければ、operational evidence output path / archive / control-file整備だけを理由にfull verifyを再実行しない。ただし上記 clean clone / production build / startup / ordinary real user-facing acceptance の必須証跡が未実施・欠落・無効なら、その欠落は operational-only ではなく completion blocker である。

### 4. 最終verify合格条件
**Blocking requirements:**
- repo-external clean clone / clean checkout 上で current completion snapshot の production build / required verify が再現可能。
- user-facing application / UI が対象の場合、同一snapshotで app startup と ordinary real user-facing end-to-end flow がPASSし、test-only bypass で代替されていない。
- required functional/unit/integration/browser/determinism checks が current Sprint authority の必要範囲でPASS。
- verify exit code = 0（current canonical commandがexit codeを持つ場合）。
- completion reportの `overallPassed = true` / `failures = []` 等、current report schemaが持つfunctional PASS fieldsがPASS。
- report / execution対象の gitCommit が completion snapshot SHA と一致。
- verify前後で **tracked product/spec/config bytesに意図しない変更がない**。
- unresolved material Roadmap completion gap = 0。

**Non-blocking observations:**
- `git status --porcelain` に generated untracked evidenceだけが出る。
- `workingTreeDirty=true` が generated untracked evidenceだけを理由に立つ。
- screenshots / traces / JSON / logs / audit artifacts の生成・未archive・未cleanup。
- status mirror / specs mirror / handoff / archive の後処理が未完了。

Non-blocking observationは記録してよいが、Sprint functional completionをFAILへ昇格しない。

### 5. 再verifyが必要になる条件
full verifyをやり直すのは次の場合だけ:
- completion snapshot SHAが変わった。
- product/spec/config tracked contentが変わった。
- required test自体に失敗があった。
- test discovery / matcher / harnessの不具合により、required testが実際には実行されていなかった、または結果が信用できない。
- user/higher authorityが明示要求した。

次は再verify理由にしない:
- generated evidenceの出力先変更だけ。
- artifact cleanup / archive / mirror / handoff / control metadataだけ。
- generated untracked filesの存在または削除。

### 6. completion tag
最終verifyが同一HEADでfunctional PASSした後にtagを作成する。
- tag名/形式はSprint正本に従う。
- tag targetは検証済みcompletion snapshot SHAに固定。
- 既存tagをforce moveしない。

### 7. post-completion status / mirror / archive
以下は **Sprint COMPLETE後に続けてよい後処理** とし、それ自体をcompletion blockerにしない:
- post-completion status synchronization
- `specs/current` mirror
- evidence archive / Drive archive確認
- handoff更新
- temporary verify workspace cleanup

ただし後処理の失敗・中断は記録し、次runで継続する。Sprint COMPLETEやcompletion tagを巻き戻さない。

### 8. evidence最低限
Sprint COMPLETE時点で最低限残す:
- completion snapshot SHA
- completion tag target
- required verify command / result identity
- functional PASS summary
- material Roadmap gap = 0 のRole1確認

詳細screenshots/logs/archiveは有用だが、user/higher authorityが明示的に必須化しない限りcompletion gateではない。

### 9. idempotent recovery
- 同一completion snapshotで既に正しく完了したfunctional verify/tag stepを繰り返さない。
- infra / archive / Drive / mirror / cleanup失敗は該当後処理だけ再試行する。
- snapshot自体のtracked product/spec/config内容が変わった場合だけ、新しいsnapshotとして必要なverifyを行う。

### 10. Sprint正式完了
Sprint COMPLETEに必要なのは次だけ:
- current authority上の required product/implementation task accepted
- unresolved material Roadmap completion gap = 0
- completion snapshot SHA確定
- repo-external clean clone / clean checkout で同snapshotの production build / required verify が再現可能
- user-facing application / UI が対象の場合、同snapshotで app startup と ordinary real user-facing end-to-end acceptance PASS
- 同一snapshotの required functional final verify PASS
- completion tagが同snapshotを指す

status/mirror/archive/handoff/cleanupは後処理であり、Sprint COMPLETEを遅延・取消ししない。
