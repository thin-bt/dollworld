# Sprint 1.5 Base Authority Gate

- Document ID: `S1.5-BASE-AUTHORITY-GATE`
- Version: `0.1.0`
- Amendment target: `S1.5-SPEC-0.1.14`
- Required base authority: `SPRINT_1_5_SIMPLE_SIMULATION_UI.md` containing `S1.5-SPEC-0.1.13`

## 1. Why this gate exists

`S1.5-SPEC-0.1.14` is not standalone authority.

Authoritative meaning is:

```text
S1.5-SPEC-0.1.13 base
+ S1.5-SPEC-0.1.14 amendment
```

Therefore a package-only static audit cannot prove that the repository contains the correct base authority.

さらに、`specs/proposed` はGit反映前にはauthorityではないため、real UI-000は
**baseだけでなく、実装意味論を与えるcurrent `S1.5-SPEC-0.1.14` amendmentもGit管理下へ反映済み**
であることを確認する。

UI-000 must bind the actual tracked base file and Git-reflected amendment before any DB/BRIDGE interpretation.

## 2. Required repository evidence

From the fixed project repository:

```text
git ls-files "*SPRINT_1_5_SIMPLE_SIMULATION_UI.md"
```

must return exactly one tracked file.

That file must contain:

```text
S1.5-SPEC-0.1.13
```

Current amendment authorityも確認する。

```text
git ls-files "*SPRINT_1_5_SIMPLE_SIMULATION_UI_S1.5-SPEC-0.1.14_AMENDMENT.md"
```

must return exactly one tracked file.
そのfileは`S1.5-SPEC-0.1.14`を含み、package内のcurrent amendmentとbyte/hash一致すること。

Record:

```text
repo root
base tracked path
base git blob hash
base last modifying commit
base document version
base working-tree dirty status

amendment tracked path
amendment git blob hash
amendment last modifying commit
amendment document version
amendment working-tree dirty status
package amendment SHA-256
git amendment SHA-256
amendment package/git byte match
```

## 2A. Additional R12 authority adoption boundary

Base/amendment exact1 checks alone do not authorize proposal-only control text.
Before P00 PASS, the Role 2 proposal→Git mapping must classify **every R12 artifact exactly once** into one of:

```text
git_authority_required
git_supporting_control_required
non_authoritative_evidence
generated_package_or_tool
```

For each artifact record exactly:

```text
artifactName:
proposalPath:
classification:
gitPath: null | exact tracked relative path
gitBlobHash: null | exact blob hash
lastCommit: null | full commit hash
dirty: null | false
specsCurrentMirrorPath: null | exact mirror path
packageSha256: exact SHA-256 when packaged
gitSha256: null | exact SHA-256
packageGitByteMatch: n/a | true
notes:
```

Rules:

- `git_authority_required` / `git_supporting_control_required`: `gitPath/blob/lastCommit/dirty=false/specsCurrentMirrorPath/gitSha256/packageGitByteMatch=true` are mandatory.
- `non_authoritative_evidence` / `generated_package_or_tool`: `gitPath` may be null, but they must not define new implementation semantics.
- every package/bundle member classified as Git authority/supporting control must byte/hash match its tracked counterpart.
- unclassified=0, duplicate artifact record=0, proposal-only semantic/control input=0.

This mapping is separate evidence from the base/amendment exact-one check and must be hash-addressed by the UI-000/freeze record.

## 3. Failure classification

```text
0 tracked matches
  -> dependency_blocker

2+ tracked matches
  -> spec_fix_required

tracked file version != S1.5-SPEC-0.1.13
  -> spec_fix_required

tracked base file has unreviewed working-tree modification
  -> dependency_blocker

0 tracked current amendment matches
  -> dependency_blocker

2+ tracked current amendment matches
  -> spec_fix_required

tracked amendment version != S1.5-SPEC-0.1.14
  -> spec_fix_required

tracked amendment dirty
  -> dependency_blocker

package amendment != Git-tracked amendment bytes/hash
  -> spec_fix_required

base document content contradicts the amendment and no amendment override exists
  -> spec_fix_required
```

Do not silently choose a similarly named copy outside Git.

## 4. UI-000 PASS condition

```text
base tracked match count = 1
base version = S1.5-SPEC-0.1.13
base blob hash recorded
base modifying commit recorded
base dirty = false
amendment tracked match count = 1
amendment version = S1.5-SPEC-0.1.14
amendment blob/hash recorded
amendment dirty = false
package amendment == Git amendment bytes/hash
repo-bound static audit = PASS
```

Package-only static audit is necessary but not sufficient for UI-000.

## 5. Evidence record

```text
baseAuthority:
  repoRoot:
  trackedPath:
  version:
  blobHash:
  lastCommit:
  dirty:
  result: matched

amendmentAuthority:
  trackedPath:
  version:
  blobHash:
  lastCommit:
  dirty:
  packageSha256:
  gitSha256:
  packageGitByteMatch:
  result: matched
```
