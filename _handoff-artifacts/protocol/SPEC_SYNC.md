# Spec Sync Protocol

authority: normative
rule-index: CONTROL_RULE_INDEX.md
inherits: CORE-BLOCK-001, CORE-STORAGE-001, SPEC-AUTH-001
scope: mechanical spec mirror synchronization

Read this file only when creating, refreshing, validating, or troubleshooting `specs/current` or `SPEC_MIRROR_MANIFEST.txt`.

## SYNC-REFRESH-001 — mirror refresh
Refresh when authoritative Git-managed spec/design/acceptance/Wiki material changed, a consuming audit/acceptance needs a current mirror, an explicit refresh is requested, or currentness validation shows the mirror stale.
Rebuild from the current authoritative Git state; do not preserve files deleted from the authoritative source merely because they remain in an old mirror.
Include only material needed for spec/audit decisions, normally relevant `SPEC.md`/`docs`/Wiki source and required schemas/config/manifests. Do not copy dependencies, build products, large generated outputs, or audit artifacts into `specs/current`.
Local mirror: `D:\xampp\htdocs\dollworld\_handoff-artifacts\specs\current\`.
Drive mirror: `dollworld-audit/specs/current/`.

## SYNC-MANIFEST-001 — manifest / currentness
`SPEC_MIRROR_MANIFEST.txt` records at least: generatedAt, branch, HEAD, applicable spec/version/status when known, source path/range, mirrored file list or scope, relevant git status, and SHA256 when required by the active task.
Do not invent project status; status meaning follows `SPEC-STATUS-001`.
A mirror is current only when manifest identity and authoritative source state are compatible with the task being reviewed. Branch/HEAD/spec-context conflicts make the mirror stale until refreshed or reconciled.
After an approved spec proposal is applied to Git, run required checks, refresh the mirror, regenerate the manifest, sync to Drive, and reconcile the result when the consuming workflow requires it.

## SYNC-OWNERSHIP-001 — mechanical ownership / failure classification
Cursor may perform mechanical copy, mirror generation, manifest generation, and verification when the current task authorizes it. Semantic specification meaning remains governed by `SPEC-AUTH-001`.
A uniquely determined stale mirror, deleted-file cleanup, hash refresh, or manifest refresh is a non-blocking mechanical correction under `CORE-BLOCK-001`.
A Drive/local mirror transport or refresh failure is scoped to consumers that actually require that mirror. It does not block implementation or an audit/review that can independently read the authoritative Git files and establish the required identity directly. Preserve/mark the stale mirror and retry the mechanical sync; never treat mirror transport failure as loss of Git authority.
BLOCK/clarify only when source authority, branch/HEAD, mirror scope, or contract meaning remains materially ambiguous with multiple plausible authoritative outcomes after bounded reconciliation. Do not guess in that case.
