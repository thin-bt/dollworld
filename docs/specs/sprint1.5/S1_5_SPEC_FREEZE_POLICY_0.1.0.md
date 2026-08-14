# Sprint 1.5 Specification Freeze Policy

- Document ID: `S1.5-SPEC-FREEZE-POLICY`
- Version: `0.1.0`
- Current amendment label: `S1.5-SPEC-0.1.15`

## 1. Pre-freeze audit revisions

Before UI-000 begins, package revisions such as R2/R3/R4 may replace draft artifacts while retaining the same amendment label.

They are not implementation baselines until a freeze record is created.
また、`specs/proposed`の存在だけではreal UI-000のsemantic authorityにならない。
real UI-000前に、実装意味論・task/acceptance controlとして使用するR12文書は
`SPEC_MIRROR.md`のproposal adoption flowに従ってGit管理下へ反映し、
P00-fixed HEADから再生成された`specs/current`で反映を確認する。

pure evidence / generated package / verification toolは非authority artifactとして分類してよいが、
**proposal-onlyのsemantic/control textをUI-000またはUI-001の実装根拠にしない。**

## 2. Freeze point

Real UI-000 runs against the current **pre-freeze Git-reflected semantic/control revision** plus its
byte-matched audit/package inputs.
Drive `specs/proposed` is preparation staging only and cannot substitute for Git authority.
UI-000 may update **evidence-only physical binding records** while resolving DEFERRED_BINDING, but it must not silently change semantic spec text.

Immediately **after UI-000 PASS and before UI-001 release**:

1. confirm package-only static audit PASS from UI-000
2. confirm base-authority repo gate PASS from UI-000
3. confirm repo-bound static audit PASS from UI-000
4. confirm `DEFERRED_BINDING matched / unresolved / STOP / SPEC_UNDEFINED` release conditions are satisfied
5. record SHA-256 for all current Sprint 1.5 implementation-preparation files, including final UI-000 evidence/binding records that belong to the frozen baseline
6. record final accepted Sprint 1 commit
7. record CAL-JAN-SYNC accepted commit
8. create one freeze record
9. re-run package-only static audit and repo-bound static audit against the exact frozen bytes; both must PASS

Only after this freeze record exists may UI-001 be released.
UI-001～010 must cite the freeze record/hash set.
UI-000 itself does **not** require a pre-existing freeze record.

## 3. No in-place semantic changes after freeze

After freeze, any change to:

- success/failure semantics
- DTO field/key set
- ordering/null rules
- persistence/rollback/commit behavior
- cursor/journal/replay meaning
- task ownership affecting implementation
- DB subject meaning/count

requires a new Sprint 1.5 spec version.

For the current label that means the next semantic revision is not another silent `0.1.15` replacement; it must become a new version such as `S1.5-SPEC-0.1.16`.

Pure evidence binding updates during UI-000 may update evidence records without changing semantic spec text.

## 4. Freeze record exact fields

```text
specVersion:
gitAuthorityHead:
specMirrorManifestHead:
proposalAdoptionEvidence:
proposalAdoptionEvidenceSha256:
gitAuthorityMappingPath:
gitAuthorityMappingSha256:
packageRevision:
packageSha256:
baseSpecPath:
baseSpecBlobHash:
baseSpecLastCommit:
amendmentSpecPath:
amendmentSpecBlobHash:
amendmentSpecLastCommit:
amendmentSpecSha256:
sprint1AcceptedCommit:
calJanSyncAcceptedCommit:
checkerSha256:
checklistSha256:
implementationPlanSha256:
ownershipManifestSha256:
createdAt:
result: frozen
```

## 5. Task start rule

UI-000 follows `S1_5_UI000_EXECUTION_RUNBOOK_0.1.0.md` and creates no production implementation.
The freeze record is created only after UI-000 PASS as defined in §2.

UI-001～010 must reject:

- missing freeze record
- hash mismatch
- spec file changed after freeze without version bump
- base authority changed after freeze
